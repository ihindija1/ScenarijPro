const express = require("express");
const path = require("path");

const {
  ensureData,
  nextScenarioId,
  readScenario,
  writeScenario,
  readDeltas,
  appendDelta
} = require("./storage");

const {
  tryLockLine,
  getLineLockOwner,
  isLineLockedByUser,
  isLineLockedByOther,
  unlockLineIfOwned,
  tryLockCharacter,
  isCharacterLockedByUser,
  unlockCharacterIfOwned
} = require("./locks");

const { wrap20Words, nowUnixSeconds } = require("./wrap");

const app = express();
app.use(express.json());

// Frontend iz istog origin-a (NEMA CORS)
app.use(express.static(path.join(__dirname, "..", "public")));

// ---- helperi ----
function orderedContent(content) {
  if (!Array.isArray(content) || content.length === 0) return [];

  const nextSet = new Set(content.map(l => l.nextLineId).filter(x => x !== null));
  const head = content.find(l => !nextSet.has(l.lineId)) || content[0];

  const byId = new Map(content.map(l => [l.lineId, l]));
  const out = [];
  let cur = head;
  const visited = new Set();

  while (cur && !visited.has(cur.lineId)) {
    visited.add(cur.lineId);
    out.push(cur);
    cur = cur.nextLineId === null ? null : byId.get(cur.nextLineId);
  }
  return out;
}

function findLine(scn, lineId) {
  return scn.content.find(l => l.lineId === lineId) || null;
}

function maxLineId(scn) {
  return scn.content.reduce((m, l) => Math.max(m, l.lineId), 0);
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function replaceWholeWord(text, oldName, newName) {
  const letters = "A-Za-zČĆŽŠĐčćžšđ";
  const re = new RegExp(`(^|[^${letters}])(${escapeRegExp(oldName)})(?=$|[^${letters}])`, "g");
  return String(text).replace(re, (m, p1) => `${p1}${newName}`);
}

// ---- 1) POST scenario ----
app.post("/api/scenarios", async (req, res) => {
  await ensureData();

  let title = (req.body && typeof req.body.title === "string") ? req.body.title.trim() : "";
  if (!title) title = "Neimenovani scenarij";

  const id = await nextScenarioId();
  const scenario = {
    id,
    title,
    content: [{ lineId: 1, nextLineId: null, text: "" }]
  };

  await writeScenario(scenario);
  res.status(200).json(scenario);
});

// ---- 2) lock line ----
app.post("/api/scenarios/:scenarioId/lines/:lineId/lock", async (req, res) => {
  const scenarioId = parseInt(req.params.scenarioId, 10);
  const lineId = parseInt(req.params.lineId, 10);
  const userId = req.body?.userId;

  const scn = await readScenario(scenarioId);
  if (!scn) return res.status(404).json({ message: "Scenario ne postoji!" });

  const line = findLine(scn, lineId);
  if (!line) return res.status(404).json({ message: "Linija ne postoji!" });

  const r = tryLockLine(scenarioId, lineId, userId);
  if (!r.ok) return res.status(409).json({ message: "Linija je vec zakljucana!" });

  res.status(200).json({ message: "Linija je uspjesno zakljucana!" });
});

// ---- 3) update line ----
app.put("/api/scenarios/:scenarioId/lines/:lineId", async (req, res) => {
  const scenarioId = parseInt(req.params.scenarioId, 10);
  const lineId = parseInt(req.params.lineId, 10);
  const userId = req.body?.userId;
  const newText = req.body?.newText;

  


  const scn = await readScenario(scenarioId);
  if (!scn) return res.status(404).json({ message: "Scenario ne postoji!" });

  const line = findLine(scn, lineId);
  if (!line) return res.status(404).json({ message: "Linija ne postoji!" });

  if (!Array.isArray(newText) || newText.length === 0) {
    return res.status(400).json({ message: "Niz new_text ne smije biti prazan!" });

  }
  console.log("NEW TEXT:", newText);
 console.log("LEN:", newText.length);

  if (isLineLockedByOther(scenarioId, lineId, userId)) {
    return res.status(409).json({ message: "Linija je vec zakljucana!" });
  }
  if (!isLineLockedByUser(scenarioId, lineId, userId)) {
    return res.status(409).json({ message: "Linija nije zakljucana!" });
  }

  const oldNext = line.nextLineId;
  let nextId = maxLineId(scn) + 1;

  const produced = [];
  for (const s of newText) {
    for (const w of wrap20Words(s)) produced.push(w);
  }

  line.text = produced[0] ?? "";

  if (produced.length > 1) {
    const insertedIds = [];

    for (let i = 1; i < produced.length; i++) {
      const id = nextId++;
      insertedIds.push(id);
      scn.content.push({ lineId: id, nextLineId: null, text: produced[i] });
    }

    line.nextLineId = insertedIds[0];

    for (let i = 0; i < insertedIds.length; i++) {
      const curId = insertedIds[i];
      const curLine = scn.content.find(l => l.lineId === curId);
      curLine.nextLineId = (i === insertedIds.length - 1) ? oldNext : insertedIds[i + 1];
    }
  }

  await writeScenario(scn);

  const ts = nowUnixSeconds();

  // delta za update-anu liniju
  await appendDelta({
    scenarioId,
    type: "line_update",
    lineId: line.lineId,
    nextLineId: line.nextLineId,
    content: line.text,
    timestamp: ts
  });

  // delta za nove linije (ako su dodane)
  if (produced.length > 1) {
    const newLines = scn.content.filter(l => l.lineId >= (nextId - (produced.length - 1)) && l.lineId < nextId);
    for (const nl of newLines) {
      await appendDelta({
        scenarioId,
        type: "line_update",
        lineId: nl.lineId,
        nextLineId: nl.nextLineId,
        content: nl.text,
        timestamp: ts
      });
    }
  }

  unlockLineIfOwned(scenarioId, lineId, userId);

  res.status(200).json({ message: "Linija je uspjesno azurirana!" });
});

// ---- 4) lock character ----
app.post("/api/scenarios/:scenarioId/characters/lock", async (req, res) => {
  const scenarioId = parseInt(req.params.scenarioId, 10);
  const userId = req.body?.userId;
  const characterName = req.body?.characterName;

  const scn = await readScenario(scenarioId);
  if (!scn) return res.status(404).json({ message: "Scenario ne postoji!" });

  const r = tryLockCharacter(scenarioId, characterName, userId);
  if (!r.ok) return res.status(409).json({ message: "Konflikt! Ime lika je vec zakljucano!" });

  res.status(200).json({ message: "Ime lika je uspjesno zakljucano!" });
});

// ---- 5) update character (konflikt ako je linija zaključana od drugog) ----
app.post("/api/scenarios/:scenarioId/characters/update", async (req, res) => {
  const scenarioId = parseInt(req.params.scenarioId, 10);
  const userId = req.body?.userId;
  const oldName = req.body?.oldName;
  const newName = req.body?.newName;

  const scn = await readScenario(scenarioId);
  if (!scn) return res.status(404).json({ message: "Scenario ne postoji!" });

 

  if (!isCharacterLockedByUser(scenarioId, oldName, userId)) {
    return res.status(409).json({ message: "Konflikt! Ime lika je vec zakljucano!" });
    
  }

  // konflikt ako bi promjena zahvatila liniju koju je drugi zaključao
  for (const l of scn.content) {
    const wouldChange = replaceWholeWord(l.text, oldName, newName) !== l.text;
    if (wouldChange) {
      const owner = getLineLockOwner(scenarioId, l.lineId);
      if (owner && owner !== userId) {
        return res.status(409).json({ message: "Konflikt! Ime lika je vec zakljucano!" });
      }
    }
  }

  for (const l of scn.content) {
    l.text = replaceWholeWord(l.text, oldName, newName);
  }

  await writeScenario(scn);

  const ts = nowUnixSeconds();
  await appendDelta({
    scenarioId,
    type: "char_rename",
    oldName,
    newName,
    timestamp: ts
  });

  unlockCharacterIfOwned(scenarioId, oldName, userId);

  res.status(200).json({ message: "Ime lika je uspjesno promijenjeno!" });
});

// ---- 6) get deltas ----
app.get("/api/scenarios/:scenarioId/deltas", async (req, res) => {
  const scenarioId = parseInt(req.params.scenarioId, 10);
  const since = parseInt(req.query.since ?? "0", 10);

  const scn = await readScenario(scenarioId);
  if (!scn) return res.status(404).json({ message: "Scenario ne postoji!" });

  const all = await readDeltas();
  const deltas = all
    .filter(d => d.scenarioId === scenarioId && d.timestamp > since)
    .sort((a, b) => a.timestamp - b.timestamp);

  res.status(200).json({ deltas });
});

// ---- 7) get scenario ----
app.get("/api/scenarios/:scenarioId", async (req, res) => {
  const scenarioId = parseInt(req.params.scenarioId, 10);
  const scn = await readScenario(scenarioId);
  if (!scn) return res.status(404).json({ message: "Scenario ne postoji!" });

  res.status(200).json({
    id: scn.id,
    title: scn.title,
    content: orderedContent(scn.content)
  });
});

const PORT = 3000;
app.listen(PORT, async () => {
  await ensureData();
  console.log(`API radi na http://localhost:${PORT}`);
});
