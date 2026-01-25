let div = document.getElementById("divEditor");
let editor = EditorTeksta(div);

const toolbar = document.querySelector(".editor-toolbar");
const porukeDiv = document.getElementById("poruke");

function poruka(txt) {
    porukeDiv.style.display = "block";
    porukeDiv.innerText = txt;
}

toolbar.addEventListener("click", e => {
    if (!e.target.dataset.action) return;

    const action = e.target.dataset.action;

    try {
        switch (action) {
            case "bold":
            case "italic":
            case "underline":
                const success = editor.formatirajTekst(action);
                poruka(success ? "Formatirano!" : "Nije označen tekst ili je selekcija izvan editora.");
                break;

            case "brojRijeci":
                const brojevi = editor.dajBrojRijeci();
                poruka(`Ukupno: ${brojevi.ukupno}, Boldiranih: ${brojevi.boldiranih}, Italic: ${brojevi.italic}`);
                break;

            case "dajUloge":
                const uloge = editor.dajUloge();
                poruka("Pronađene uloge:\n" + uloge.join("\n"));
                break;

            case "pogresnaUloga":
                const wrong = editor.pogresnaUloga();
                poruka(wrong.length ? "Pogrešne uloge:\n" + wrong.join("\n") : "Nema pogrešnih uloga.");
                break;

            case "brojLinijaTeksta": {
                const uloga = prompt("Unesi ime uloge (npr. CAPTAIN KIRA):");
                if (!uloga) return;
                poruka(`Broj linija za ${uloga}: ${editor.brojLinijaTeksta(uloga)}`);
                break;
            }

            case "scenarijUloge": {
                const uloga = prompt("Unesi ime uloge:");
                if (!uloga) return;
                const scenarij = editor.scenarijUloge(uloga);
                poruka(JSON.stringify(scenarij, null, 2));
                break;
            }

            case "grupisiUloge": {
                const grupe = editor.grupisiUloge();
                poruka(JSON.stringify(grupe, null, 2));
                break;
            }
            case "lockUloga": {
  const uloga = prompt("Unesi ime uloge za zaključavanje (npr. ALICIA):");
  if (!uloga) return;

  // scenarioId i userId već postoje u writing-connect.js, ali ovdje ih nema.
  // Najlakše: spremi scenarioId i userId globalno u writing-connect.js:
  // window.__scenarioId = scenarioId; window.__userId = userId;
  const scenarioId = window.__scenarioId;
  const userId = window.__userId;

  PoziviAjaxFetch.lockCharacter(scenarioId, uloga, userId, (status, data) => {
    if (status !== 200) return poruka(data.message || "Ne mogu zaključati ulogu");
    poruka(`Uloga zaključana: ${uloga}`);
  });
  break;
}

case "renameUloga": {
  const oldName = prompt("Staro ime uloge (npr. ALICIA):");
  if (!oldName) return;
  const newName = prompt("Novo ime uloge (npr. ALICE):");
  if (!newName) return;

  const scenarioId = window.__scenarioId;
  const userId = window.__userId;

  PoziviAjaxFetch.updateCharacter(scenarioId, userId, oldName, newName, (status, data) => {
    if (status !== 200) return poruka(data.message || "Ne mogu preimenovati ulogu");
    poruka(`Preimenovano: ${oldName} -> ${newName}`);
  });
  break;
}

case "prikaziPromjene": {
  const scenarioId = window.__scenarioId;
  // uzmi lastTs ako ga držiš globalno, ili traži od korisnika:
  const since = Number(prompt("Timestamp od kojeg želiš promjene (0 za sve):", "0") || 0);

  PoziviAjaxFetch.getDeltas(scenarioId, since, (status, data) => {
    if (status !== 200) return poruka(data.message || "Ne mogu dohvatiti promjene");
    poruka(JSON.stringify(data, null, 2));
  });
  break;
}

        }
    } catch (err) {
        poruka("Greška: " + err.message);
    }
});