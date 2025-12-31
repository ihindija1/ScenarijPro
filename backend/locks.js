const userLineLock = new Map(); // userId -> { scenarioId, lineId }
const lineLocks = new Map();    // "scenarioId:lineId" -> userId
const charLocks = new Map();    // scenarioId -> Map(characterName -> userId)

function keyLine(scenarioId, lineId) {
  return `${scenarioId}:${lineId}`;
}

function unlockUsersPreviousLine(userId) {
  const prev = userLineLock.get(userId);
  if (!prev) return;

  const k = keyLine(prev.scenarioId, prev.lineId);
  if (lineLocks.get(k) === userId) lineLocks.delete(k);
  userLineLock.delete(userId);
}

function tryLockLine(scenarioId, lineId, userId) {
  const k = keyLine(scenarioId, lineId);
  const owner = lineLocks.get(k);

  if (owner && owner !== userId) return { ok: false, conflict: true };

  unlockUsersPreviousLine(userId);

  lineLocks.set(k, userId);
  userLineLock.set(userId, { scenarioId, lineId });
  return { ok: true };
}

function getLineLockOwner(scenarioId, lineId) {
  return lineLocks.get(keyLine(scenarioId, lineId)) || null;
}

function isLineLockedByUser(scenarioId, lineId, userId) {
  return getLineLockOwner(scenarioId, lineId) === userId;
}

function isLineLockedByOther(scenarioId, lineId, userId) {
  const owner = getLineLockOwner(scenarioId, lineId);
  return owner && owner !== userId;
}

function unlockLineIfOwned(scenarioId, lineId, userId) {
  const k = keyLine(scenarioId, lineId);
  if (lineLocks.get(k) === userId) lineLocks.delete(k);

  const prev = userLineLock.get(userId);
  if (prev && prev.scenarioId === scenarioId && prev.lineId === lineId) {
    userLineLock.delete(userId);
  }
}

// ---- CHARACTER LOCKS ----
function tryLockCharacter(scenarioId, characterName, userId) {
  if (!charLocks.has(scenarioId)) charLocks.set(scenarioId, new Map());
  const m = charLocks.get(scenarioId);

  const owner = m.get(characterName);
  if (owner && owner !== userId) return { ok: false, conflict: true };

  m.set(characterName, userId);
  return { ok: true };
}

function isCharacterLockedByUser(scenarioId, characterName, userId) {
  const m = charLocks.get(scenarioId);
  return m ? m.get(characterName) === userId : false;
}

function unlockCharacterIfOwned(scenarioId, characterName, userId) {
  const m = charLocks.get(scenarioId);
  if (!m) return;
  if (m.get(characterName) === userId) m.delete(characterName);
}

module.exports = {
  tryLockLine,
  getLineLockOwner,
  isLineLockedByUser,
  isLineLockedByOther,
  unlockLineIfOwned,
  tryLockCharacter,
  isCharacterLockedByUser,
  unlockCharacterIfOwned
};
