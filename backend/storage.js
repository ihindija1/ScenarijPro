const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const SCENARIOS_DIR = path.join(DATA_DIR, "scenarios");
const DELTAS_PATH = path.join(DATA_DIR, "deltas.json");

async function ensureData() {
  await fsp.mkdir(SCENARIOS_DIR, { recursive: true });
  if (!fs.existsSync(DELTAS_PATH)) {
    await fsp.writeFile(DELTAS_PATH, JSON.stringify([], null, 2), "utf-8");
  }
}

function scenarioPath(id) {
  return path.join(SCENARIOS_DIR, `scenario-${id}.json`);
}

async function listScenarioIds() {
  await ensureData();
  const files = await fsp.readdir(SCENARIOS_DIR);
  return files
    .map((f) => {
      const m = f.match(/^scenario-(\d+)\.json$/);
      return m ? parseInt(m[1], 10) : null;
    })
    .filter((x) => Number.isInteger(x));
}

async function nextScenarioId() {
  const ids = await listScenarioIds();
  return ids.length ? Math.max(...ids) + 1 : 1;
}

async function readScenario(id) {
  await ensureData();
  const p = scenarioPath(id);
  if (!fs.existsSync(p)) return null;
  const raw = await fsp.readFile(p, "utf-8");
  return JSON.parse(raw);
}

async function writeScenario(scn) {
  await ensureData();
  const p = scenarioPath(scn.id);
  await fsp.writeFile(p, JSON.stringify(scn, null, 2), "utf-8");
}

async function readDeltas() {
  await ensureData();
  const raw = await fsp.readFile(DELTAS_PATH, "utf-8");
  return JSON.parse(raw);
}

async function appendDelta(deltaObj) {
  const deltas = await readDeltas();
  deltas.push(deltaObj);
  await fsp.writeFile(DELTAS_PATH, JSON.stringify(deltas, null, 2), "utf-8");
}

module.exports = {
  ensureData,
  nextScenarioId,
  readScenario,
  writeScenario,
  readDeltas,
  appendDelta
};
