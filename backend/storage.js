const { sequelize } = require("./db");
const { Scenario, Line, Delta } = require("./models");

console.log("USING DB STORAGE FILE:", __filename);


async function ensureData() {
  // POSTAVKA spirale 4:
  await sequelize.sync({ force: true });


 // SEED kao u Spirali 3 (da testovi mogu odmah lock/update bez POST /api/scenarios)
  const title = "Seed scenario";
  const content = [];

  // Napravi bar 10 linija (testovi koriste 1,2,3,6)
  for (let i = 1; i <= 10; i++) {
    content.push({
      lineId: i,
      nextLineId: i === 10 ? null : i + 1,
      text: i === 1 ? "ALICE ulazi u sobu." : "" // da char rename test ima šta promijeniti
    });
  }

  const scn = await Scenario.create({
    title,
    initialSnapshot: JSON.stringify({ title, content })
  });

  await Line.bulkCreate(
    content.map(l => ({
      scenarioId: scn.id, // ovo će biti 1 jer je baza prazna nakon force:true
      lineId: l.lineId,
      nextLineId: l.nextLineId,
      text: l.text
    }))
  );

  // Deltas i Checkpoints mogu ostati prazni — testovi to ne zahtijevaju.
}


async function nextScenarioId() {
  const maxId = await Scenario.max("id");
  return (maxId || 0) + 1;
}

async function writeScenario(scn) {
  // scn: { id?, title, content:[{lineId,nextLineId,text}] }
    console.log("DB writeScenario called");
  let dbScenario = null;

  if (scn.id) dbScenario = await Scenario.findByPk(scn.id);

  if (!dbScenario) {
    dbScenario = await Scenario.create({
      title: scn.title,
      initialSnapshot: JSON.stringify({
        title: scn.title,
        content: scn.content
      })
    });
    scn.id = dbScenario.id;
  } else {
    if (typeof scn.title === "string") {
      dbScenario.title = scn.title;
      await dbScenario.save();
    }
  }

  await Line.destroy({ where: { scenarioId: dbScenario.id } });

  const rows = (scn.content || []).map(l => ({
    scenarioId: dbScenario.id,
    lineId: l.lineId,
    nextLineId: l.nextLineId,
    text: l.text ?? ""
  }));

  if (rows.length) await Line.bulkCreate(rows);

  return dbScenario.id;
}

async function readScenario(id) {
  const scn = await Scenario.findByPk(id);
  if (!scn) return null;

  const lines = await Line.findAll({
    where: { scenarioId: id },
    order: [["lineId", "ASC"]]
  });

  return {
    id: scn.id,
    title: scn.title,
    content: lines.map(l => ({
      lineId: l.lineId,
      nextLineId: l.nextLineId,
      text: l.text
    }))
  };
}

async function readDeltas() {
  const all = await Delta.findAll({ order: [["timestamp", "ASC"], ["id", "ASC"]] });
  return all.map(d => d.toJSON());
}

async function appendDelta(deltaObj) {
  await Delta.create(deltaObj);
}

module.exports = {
  ensureData,
  nextScenarioId,
  readScenario,
  writeScenario,
  readDeltas,
  appendDelta
};
