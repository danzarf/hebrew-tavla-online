export function canOfferRematch({ matchResult = null, gameMode = '', roomCode = '', playerUids = {} } = {}) {
  return Boolean(
    matchResult?.mode === 'online'
    && matchResult.matchId
    && gameMode === 'online'
    && roomCode
    && playerUids?.human
    && playerUids?.computer,
  );
}

export function buildRematchRoomSeed({
  previousMatchId,
  roomCode,
  requesterUid,
  targetUid,
  requesterName,
  targetName,
  now = Date.now,
} = {}) {
  if (!previousMatchId || !requesterUid || !targetUid || requesterUid === targetUid) return null;
  return {
    rematchOf: previousMatchId,
    invitedFromRoom: roomCode || null,
    requestedBy: requesterUid,
    requestedFor: targetUid,
    requestedAt: now(),
    requesterName: String(requesterName || 'שחקן').trim().slice(0, 32),
    targetName: String(targetName || 'יריב').trim().slice(0, 32),
  };
}

export function getRematchButtonText({ busy = false } = {}) {
  return busy ? 'פותח משחק נוסף...' : 'משחק נוסף';
}
