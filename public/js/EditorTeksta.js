let EditorTeksta = function (divRef) {
    // Validacija
    if (!divRef || divRef.tagName !== 'DIV') {
        throw new Error("Pogresan tip elementa!");
    }
    if (!divRef.hasAttribute('contenteditable')) {
        throw new Error("Neispravan DIV, ne posjeduje contenteditable atribut!");
    }

    let editor = divRef;

    // --- Pomoćne funkcije ---

    // Čitanje teksta
    let getText = function () {
        return editor.innerText || '';
    };

    // Parsiranje linija 
    let getLines = function () {
        const html = editor.innerHTML || '';
        const normalized = html.replace(/<br\s*\/?>/gi, '\n');
        const temp = document.createElement('div');
        temp.innerHTML = normalized;
        const text = temp.textContent || temp.innerText || '';
        // trim po liniji da se riješimo suvišnih razmaka sa krajeva
        return text.split('\n').map(l => l.trim());
    };

    // Linija koja je samo u zagradama: (ovo je napomena)
    let isLinijaUZagradama = function (line) {
        const trimmed = (line || '').trim();
        return /^\(.*\)$/.test(trimmed) && trimmed.length > 2;
    };

    // Naslov scene: INT./EXT. ... - DAY/NIGHT/...
    let isNaslovScene = function (line) {
        const trimmed = (line || '').trim();
        // Npr: "INT. - DAY" ili "EXT. KUHINJA - NIGHT"
        const regex = /^(INT\.|EXT\.)[^-]*-\s+(DAY|NIGHT|AFTERNOON|MORNING|EVENING)$/i;
        return regex.test(trimmed);
    };

    // Linija izgleda kao potencijalni naziv uloge (samo velika slova i razmaci)
    let isPotentialUlogaLine = function (line) {
        const trimmed = (line || '').trim();
        if (trimmed === '') return false;
        if (!/^[A-ZČĆŽŠĐ\s]+$/.test(trimmed)) return false;
        return /[A-ZČĆŽŠĐ]/.test(trimmed);
    };

    // Provjera da li je linija zaista ULOGA (ima makar jednu liniju govora ispod)
    let isUloga = function (index, lines) {
        const line = lines[index];
        if (!isPotentialUlogaLine(line)) return false;

        // Mora postojati barem jedna linija govora ispod nje.
        // Preskačemo prazne linije i scenske napomene u zagradama.
        for (let j = index + 1; j < lines.length; j++) {
            const next = lines[j];
            const trimmed = (next || '').trim();

            if (trimmed === '') {
                // prazna linija – preskoči
                continue;
            }
            if (isLinijaUZagradama(next)) {
                // čista scenska napomena – dozvoljeno prije govora
                continue;
            }
            if (isNaslovScene(next)) {
                // nova scena prije ikakvog govora -> nije validna uloga
                return false;
            }
            if (isPotentialUlogaLine(next)) {
                // nova uloga prije govora -> ova gore nema govor
                return false;
            }

            // Prva "normalna" linija ispod – tretiramo kao govor
            return true;
        }

        // Nema više linija ispod
        return false;
    };

    // Pomoćna funkcija: prikupi linije govora za ulogu od indexa nadalje
    let prikupiGovorneLinije = function (startIndex, lines) {
        const linijeGovora = [];
        let i = startIndex + 1;

        while (i < lines.length) {
            const line = lines[i];
            const trimmed = (line || '').trim();

            // kraj govora: prazna, nova scena ili nova uloga
            if (
                trimmed === '' ||
                isNaslovScene(line) ||
                isUloga(i, lines)
            ) {
                break;
            }

            // preskačemo linije koje su samo u zagradama
            if (!isLinijaUZagradama(line)) {
                linijeGovora.push(line);
            }

            i++;
        }

        return { linijeGovora, nextIndex: i };
    };

    // --- 1. dajBrojRijeci ---
    let dajBrojRijeci = function () {
        let ukupno = 0;
        let boldiranih = 0;
        let italic = 0;

        const walkNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent || '';
                // riječi: slova + opciono '-' ili apostrof unutar riječi
                const words = text.match(/[a-zčćžšđA-ZČĆŽŠĐ]+(?:['-][a-zčćžšđA-ZČĆŽŠĐ]+)*/g) || [];
                ukupno += words.length;

                let parent = node.parentElement;
                let isBold = false;
                let isItalic = false;

                while (parent && parent !== editor) {
                    const tag = parent.tagName;
                    if (tag === 'B' || tag === 'STRONG') isBold = true;
                    if (tag === 'I' || tag === 'EM') isItalic = true;
                    parent = parent.parentElement;
                }

                if (isBold) boldiranih += words.length;
                if (isItalic) italic += words.length;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                for (let child of node.childNodes) {
                    walkNode(child);
                }
            }
        };

        walkNode(editor);

        return { ukupno, boldiranih, italic };
    };

    // --- 2. dajUloge ---
    let dajUloge = function () {
        const lines = getLines();
        const uloge = [];
        const seen = new Set();

        for (let i = 0; i < lines.length; i++) {
            if (isUloga(i, lines)) {
                const ime = lines[i];
                if (!seen.has(ime)) {
                    seen.add(ime);
                    uloge.push(ime);
                }
            }
        }

        return uloge;
    };

    // --- Levenshtein za pogresnaUloga ---
    let levenshteinDistance = function (a, b) {
        const matrix = [];

        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    };

    // --- 3. pogresnaUloga ---
    let pogresnaUloga = function () {
        const lines = getLines();
        const frekvencija = {};
        const uloge = [];

        // prebroj uloge i skupi listu
        for (let i = 0; i < lines.length; i++) {
            if (isUloga(i, lines)) {
                const ime = lines[i];
                frekvencija[ime] = (frekvencija[ime] || 0) + 1;
                if (!uloge.includes(ime)) {
                    uloge.push(ime);
                }
            }
        }

        const pogresne = [];

        for (const ulogaA of uloge) {
            for (const ulogaB of uloge) {
                if (ulogaA === ulogaB) continue;

                const dist = levenshteinDistance(ulogaA, ulogaB);
                const lenA = ulogaA.length;
                const lenB = ulogaB.length;

                let slicni = false;

                if (lenA <= 5 && lenB <= 5 && dist === 1) {
                    slicni = true;
                } else if (lenA > 5 && lenB > 5 && dist <= 2) {
                    slicni = true;
                }

                if (slicni) {
                    const freqA = frekvencija[ulogaA] || 0;
                    const freqB = frekvencija[ulogaB] || 0;

                    if (freqB >= 4 && freqB >= freqA + 3) {
                        if (!pogresne.includes(ulogaA)) {
                            pogresne.push(ulogaA);
                        }
                    }
                }
            }
        }

        return pogresne;
    };

    // --- 4. brojLinijaTeksta(uloga) ---
    let brojLinijaTeksta = function (uloga) {
        const lines = getLines();
        let count = 0;
        let trenutnaUloga = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (isUloga(i, lines)) {
                trenutnaUloga = lines[i];
                continue;
            }

            if (
                trenutnaUloga &&
                trenutnaUloga.toUpperCase() === uloga.toUpperCase()
            ) {
                if (
                    line.trim() !== '' &&
                    !isLinijaUZagradama(line) &&
                    !isNaslovScene(line)
                ) {
                    count++;
                }
            }

            if (line.trim() === '' || isNaslovScene(line)) {
                trenutnaUloga = null;
            }
        }

        return count;
    };

    // --- 5. scenarijUloge(uloga) ---
    let scenarijUloge = function (uloga) {
        const lines = getLines();
        const sveReplike = [];

        let trenutnaScena = '';
        let pozicijaUTekstu = 0;

        // prvo izgradimo listu svih replika po redoslijedu
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (isNaslovScene(line)) {
                trenutnaScena = line;
                pozicijaUTekstu = 0;
                continue;
            }

            if (isUloga(i, lines)) {
                const imeUloge = lines[i];
                const { linijeGovora, nextIndex } = prikupiGovorneLinije(i, lines);

                if (linijeGovora.length > 0) {
                    pozicijaUTekstu++;
                    sveReplike.push({
                        scena: trenutnaScena,
                        pozicija: pozicijaUTekstu,
                        uloga: imeUloge,
                        linije: linijeGovora
                    });
                }

                i = nextIndex - 1; // -1 jer će for petlja uraditi i++
            }
        }

        const rezultat = [];
        const trazena = (uloga || '').toUpperCase();

        for (let k = 0; k < sveReplike.length; k++) {
            const r = sveReplike[k];
            if (r.uloga.toUpperCase() !== trazena) continue;

            const prev = (k > 0 && sveReplike[k - 1].scena === r.scena)
                ? {
                    uloga: sveReplike[k - 1].uloga,
                    linije: sveReplike[k - 1].linije
                }
                : null;

            const next = (k < sveReplike.length - 1 && sveReplike[k + 1].scena === r.scena)
                ? {
                    uloga: sveReplike[k + 1].uloga,
                    linije: sveReplike[k + 1].linije
                }
                : null;

            rezultat.push({
                scena: r.scena,
                pozicijaUTekstu: r.pozicija,
                prethodni: prev,
                trenutni: {
                    uloga: r.uloga,
                    linije: r.linije
                },
                sljedeci: next
            });
        }

        return rezultat;
    };

    // --- 6. grupisiUloge() ---
    let grupisiUloge = function () {
        const lines = getLines();
        const rezultat = [];

        let trenutnaScena = '';
        let segmentBroj = 0;
        let ulogeUSegmentu = [];
        let seenUloge = new Set();
        let prvaScenaDetektovana = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // nova scena
            if (isNaslovScene(line)) {
                if (ulogeUSegmentu.length > 0) {
                    rezultat.push({
                        scena: trenutnaScena,
                        segment: segmentBroj,
                        uloge: ulogeUSegmentu
                    });
                }

                trenutnaScena = line;
                prvaScenaDetektovana = true;
                segmentBroj = 0;
                ulogeUSegmentu = [];
                seenUloge = new Set();
                continue;
            }

            // uloga
            if (isUloga(i, lines)) {
                const imeUloge = lines[i];

                if (!prvaScenaDetektovana) {
                    // default scena ako ne postoji nijedna
                    trenutnaScena = 'INT. STARSHIP BRIDGE - NIGHT';
                    prvaScenaDetektovana = true;
                }

                if (ulogeUSegmentu.length === 0) {
                    segmentBroj++;
                }

                if (!seenUloge.has(imeUloge)) {
                    ulogeUSegmentu.push(imeUloge);
                    seenUloge.add(imeUloge);
                }

                const { nextIndex } = prikupiGovorneLinije(i, lines);
                i = nextIndex - 1;
                continue;
            }

            // akcijski tekst – prekida segment
            if (
                line.trim() !== '' &&
                !isLinijaUZagradama(line) &&
                !isNaslovScene(line)
            ) {
                if (ulogeUSegmentu.length > 0) {
                    rezultat.push({
                        scena: trenutnaScena,
                        segment: segmentBroj,
                        uloge: ulogeUSegmentu
                    });
                    ulogeUSegmentu = [];
                    seenUloge = new Set();
                }
            }
        }

        if (ulogeUSegmentu.length > 0) {
            rezultat.push({
                scena: trenutnaScena,
                segment: segmentBroj,
                uloge: ulogeUSegmentu
            });
        }

        return rezultat;
    };

    // --- 7. formatirajTekst(komanda) ---
    let formatirajTekst = function (komanda) {
        const dozvoljeneKomande = ['bold', 'italic', 'underline'];
        if (!dozvoljeneKomande.includes(komanda)) {
            return false;
        }

        const selection = window.getSelection && window.getSelection();
        if (!selection || !selection.rangeCount || selection.isCollapsed) {
            return false;
        }

        const range = selection.getRangeAt(0);
        let node = range.commonAncestorContainer;
        let inEditor = false;

        while (node) {
            if (node === editor) {
                inEditor = true;
                break;
            }
            node = node.parentNode;
        }

        if (!inEditor) return false;

        document.execCommand(komanda, false, null);
        return true;
    };

    // --- javni API ---
    return {
        dajBrojRijeci: dajBrojRijeci,
        dajUloge: dajUloge,
        pogresnaUloga: pogresnaUloga,
        brojLinijaTeksta: brojLinijaTeksta,
        scenarijUloge: scenarijUloge,
        grupisiUloge: grupisiUloge,
        formatirajTekst: formatirajTekst
    };
};
