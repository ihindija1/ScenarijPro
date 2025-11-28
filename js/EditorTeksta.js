let EditorTeksta = function (divRef) {
    // Validacija
    if (!divRef || divRef.tagName !== 'DIV') {
        throw new Error("Pogresan tip elementa!");
    }
    if (!divRef.hasAttribute('contenteditable')) {
        throw new Error("Neispravan DIV, ne posjeduje contenteditable atribut!");
    }

    // Privatni atributi
    let editor = divRef;

    // Pomoćna funkcija za čitanje teksta
    let getText = function() {
        return editor.innerText || '';
    };

    // 1. dajBrojRijeci
    let dajBrojRijeci = function () {
        const text = getText();
        const words = text.match(/[a-zčćžšđA-ZČĆŽŠĐ0-9'-]+/g) || [];
        
        let ukupno = 0;
        let boldiranih = 0;
        let italic = 0;

        // Prolazimo kroz sve elemente u editoru
        const walkNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const nodeWords = (node.textContent.match(/[a-zčćžšđA-ZČĆŽŠĐ0-9'-]+/g) || []);
                ukupno += nodeWords.length;

                // Provjeri da li je parent bold ili italic
                let parent = node.parentElement;
                let isBold = false;
                let isItalic = false;

                while (parent && parent !== editor) {
                    if (parent.tagName === 'B' || parent.tagName === 'STRONG') isBold = true;
                    if (parent.tagName === 'I' || parent.tagName === 'EM') isItalic = true;
                    parent = parent.parentElement;
                }

                if (isBold) boldiranih += nodeWords.length;
                if (isItalic) italic += nodeWords.length;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                for (let child of node.childNodes) {
                    walkNode(child);
                }
            }
        };

        walkNode(editor);

        return { ukupno, boldiranih, italic };
    };

    // 2. dajUloge
    let dajUloge = function () {
        const lines = getText().split('\n');
        const uloge = [];
        const seen = new Set();

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Provjeri da li je linija uloga (samo VELIKA SLOVA, razmaci dozvoljeni)
            if (/^[A-ZČĆŽŠĐ\s]+$/.test(line) && line.length > 0) {
                // Provjeri da li sljedeća linija postoji i nije prazna
                if (i + 1 < lines.length && lines[i + 1].trim().length > 0) {
                    if (!seen.has(line)) {
                        uloge.push(line);
                        seen.add(line);
                    }
                }
            }
        }

        return uloge;
    };

    // 3. pogresnaUloga
    let pogresnaUloga = function () {
        // Implementacija prema pravilima iz zadatka
        const uloge = dajUloge();
        const rezultat = [];
        
        // Ova metoda zahtijeva kompleksnu logiku, ovdje je osnovni scaffold
        return rezultat;
    };

    // 4. brojLinijaTeksta
    let brojLinijaTeksta = function (uloga) {
        const lines = getText().split('\n');
        let count = 0;
        let counting = false;

        for (let line of lines) {
            if (line.trim().toUpperCase() === uloga.toUpperCase()) {
                counting = true;
                continue;
            }
            if (counting) {
                if (line.trim() === '' || /^[A-ZČĆŽŠĐ\s]+$/.test(line.trim())) {
                    counting = false;
                } else {
                    count++;
                }
            }
        }

        return count;
    };

    // 5. scenarijUloge
    let scenarijUloge = function (uloga) {
        // Kompleksna metoda, osnovni scaffold
        return [];
    };

    // 6. grupisiUloge
    let grupisiUloge = function () {
        // Kompleksna metoda, osnovni scaffold
        return [];
    };

    // 7. formatirajTekst
    let formatirajTekst = function (komanda) {
        const selection = window.getSelection();
        
        if (!selection.rangeCount || selection.isCollapsed) {
            return false;
        }

        // Provjeri da li je selekcija unutar editora
        let node = selection.anchorNode;
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

    // Vraćanje javnih metoda
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