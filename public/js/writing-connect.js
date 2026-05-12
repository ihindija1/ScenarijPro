(function () {
  // Ako je script slučajno učitan 2x, samo izađi.
  if (window.__writingConnectLoaded) return;
  window.__writingConnectLoaded = true;

  const qs = (sel) => document.querySelector(sel);

  const editorDiv = document.getElementById("divEditor");
  const porukeDiv = document.getElementById("poruke");
  const saveBtn = qs(".header-right .save-btn");
  const titleSpan = qs(".project-title");

  if (!editorDiv) {
    console.error("Nema #divEditor u HTML-u.");
    return;
  }

  // userId (simple, bez logina)
  const userId = Number(localStorage.getItem("userId") || (Math.floor(Math.random() * 100000) + 1));
  localStorage.setItem("userId", String(userId));

 

  // scenarioId iz URL-a
  const url = new URL(window.location.href);
  const scenarioId = Number(url.searchParams.get("scenarioId") || 1);
   
   window.__userId = userId;
   window.__scenarioId = scenarioId;


    // --- Učitaj scenarij po ID (bez ručnog URL-a) ---
const scenarioInput = document.getElementById("scenarioInput");
const loadScenarioBtn = document.getElementById("loadScenarioBtn");

if (scenarioInput) scenarioInput.value = String(scenarioId);

function goToScenario(id) {
  const nextId = Number(id);
  if (!Number.isInteger(nextId) || nextId < 1) {
    poruka("Unesi validan ID scenarija (>= 1).");
    return;
  }
  window.location.href = `writing.html?scenarioId=${nextId}`;
}

if (loadScenarioBtn) {
  loadScenarioBtn.addEventListener("click", () => {
    goToScenario(scenarioInput ? scenarioInput.value : "");
  });
}

if (scenarioInput) {
  scenarioInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") goToScenario(scenarioInput.value);
  });
}






  let activeLineId = null;
  let lastTs = 0;

  function poruka(txt) {
    if (!porukeDiv) return;
    porukeDiv.style.display = "block";
    porukeDiv.innerText = txt;
  }

  function renderScenario(scn) {
    if (titleSpan) titleSpan.innerText = `${scn.title} (ID ${scn.id})`;

    editorDiv.innerHTML = "";

    scn.content.forEach((l) => {
      const d = document.createElement("div");
      d.className = "line";
      d.dataset.lineid = String(l.lineId);
      d.contentEditable = "false";
      d.innerText = l.text; // može biti ""
      editorDiv.appendChild(d);
    });

    activeLineId = null;
  }

  function loadScenario() {
    PoziviAjaxFetch.getScenario(scenarioId, (status, data) => {
      if (status !== 200) {
        poruka(data.message || "Greška pri učitavanju scenarija");
        return;
      }
      renderScenario(data);
    });
  }

  // Klik na liniju -> lock
  editorDiv.addEventListener("click", (e) => {
    const lineEl = e.target.closest(".line");
    if (!lineEl) return;

    const lineId = Number(lineEl.dataset.lineid);

    PoziviAjaxFetch.lockLine(scenarioId, lineId, userId, (status, data) => {
      if (status !== 200) {
        poruka(data.message || "Ne mogu zaključati liniju");
        return;
      }

        if (status !== 200) {
    poruka(data.message || "Ne mogu zaključati liniju");
    return;
  }

      // zaključa se - omogući edit samo toj liniji
      editorDiv.querySelectorAll(".line").forEach((x) => {
        x.contentEditable = "false";
        x.classList.remove("active-line");
      });

      activeLineId = lineId;
      lineEl.contentEditable = "true";
      lineEl.classList.add("active-line");
      lineEl.focus();

      // zapamti originalno ime lika (ako postoji prefix ULOGA:)
const originalText = lineEl.innerText || "";
const roleMatch = originalText.match(/^([^:]+):/);
lineEl.dataset.originalRole = roleMatch ? roleMatch[1] : "";


      poruka(`Zaključano: linija ${lineId}. Uredi pa klikni SPASI.`);
    });
  });

  // ⚡ NOVA POPRAVKA: Spriječi browser da pravi nove div-ove van linije na Enter
  editorDiv.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      const activeLine = range.commonAncestorContainer.parentElement?.closest(".line");
      
      if (activeLine && activeLine.contentEditable === "true") {
         e.preventDefault();
         document.execCommand("insertLineBreak");
      }
    }
  });

  // SPASI -> updateLine
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      if (!activeLineId) {
        poruka("Prvo klikni liniju da je zaključaš.");
        return;
      }

      const lineEl = editorDiv.querySelector(`.line[data-lineid="${activeLineId}"]`);

// 1) uzmi innerText jer on najbolje čuva nove redove (\n) iz contenteditable-a
const text = lineEl ? lineEl.innerText : "";

// 2) napravi niz linija (ovo backend očekuje)
const newText = text.split(/\r?\n/).filter(line => line.trim() !== "" || text.length === 0);
if (newText.length === 0) newText.push("");


// 🔒 BLOKADA: zabrani promjenu imena lika kroz SPASI
const currentText = lineEl.innerText || "";
const currentRoleMatch = currentText.match(/^([^:]+):/);
const currentRole = currentRoleMatch ? currentRoleMatch[1] : "";

const originalRole = lineEl.dataset.originalRole || "";

if (originalRole && currentRole && originalRole !== currentRole) {
  poruka(
    "Ime lika se ne može mijenjati kroz uređivanje linije. " +
    "Koristi 'Zaključaj ulogu' i 'Preimenuj ulogu'."
  );
  return;
}











// šalji niz (npr. ["AAA","BBB","CCC"])
PoziviAjaxFetch.updateLine(scenarioId, activeLineId, userId, newText, (status, data) => {


        if (status !== 200) {
          poruka(data.message || "Greška pri spašavanju");
          return;
        }
        poruka("Spašeno! (linija otključana)");
        loadScenario();
      });
    });
  } else {
    console.warn("Nema .save-btn dugmeta u headeru.");
  }

  // Polling deltas (smjernica sa foruma)
  setInterval(() => {
    PoziviAjaxFetch.getDeltas(scenarioId, lastTs, (status, data) => {
      if (status !== 200) return;
      const deltas = data.deltas || [];
      if (!deltas.length) return;
      lastTs = deltas[deltas.length - 1].timestamp;
      loadScenario();
    });
  }, 3000);

  loadScenario();
})();
