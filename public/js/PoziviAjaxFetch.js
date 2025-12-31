const PoziviAjax = (function () {
  async function doFetch(method, url, body, cb) {
    try {
      const opts = { method, headers: { "Content-Type": "application/json" } };
      if (body !== undefined) opts.body = JSON.stringify(body);

      const res = await fetch(url, opts);
      let data = {};
      try { data = await res.json(); } catch { data = {}; }
      cb(res.status, data);
    } catch (e) {
      cb(0, { message: e.message });
    }
  }

  return {
    postScenario: (title, cb) =>
      doFetch("POST", "/api/scenarios", { title }, cb),

    lockLine: (scenarioId, lineId, userId, cb) =>
      doFetch("POST", `/api/scenarios/${scenarioId}/lines/${lineId}/lock`, { userId }, cb),

    updateLine: (scenarioId, lineId, userId, newText, cb) =>
      doFetch("PUT", `/api/scenarios/${scenarioId}/lines/${lineId}`, { userId, newText }, cb),

    lockCharacter: (scenarioId, characterName, userId, cb) =>
      doFetch("POST", `/api/scenarios/${scenarioId}/characters/lock`, { userId, characterName }, cb),

    updateCharacter: (scenarioId, userId, oldName, newName, cb) =>
      doFetch("POST", `/api/scenarios/${scenarioId}/characters/update`, { userId, oldName, newName }, cb),

    getDeltas: (scenarioId, since, cb) =>
      doFetch("GET", `/api/scenarios/${scenarioId}/deltas?since=${since}`, undefined, cb),

    getScenario: (scenarioId, cb) =>
      doFetch("GET", `/api/scenarios/${scenarioId}`, undefined, cb),
  };
})();
