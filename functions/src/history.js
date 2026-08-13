import { displayNameForUid, isDiagnosticSubmission } from './verification.js';

function safeCounter(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.floor(num);
}

function colorForUid(safe = {}, uid) {
  return safe.players?.find((player) => player.uid === uid)?.color || null;
}

function opponentUidFor(safe = {}, uid) {
  if (uid === safe.winnerUid) return safe.loserUid;
  if (uid === safe.loserUid) return safe.winnerUid;
  return null;
}

export function buildPlayerMatchHistoryEntry(safe = {}, playerUid, processedAt) {
  const opponentUid = opponentUidFor(safe, playerUid);
  const matchStats = safe.playerMatchStats?.[playerUid] || {};

  if (!playerUid || !opponentUid) return null;

  return {
    matchId: safe.matchId,
    opponentUid,
    opponentDisplayName: displayNameForUid(safe, opponentUid) || 'יריב',
    playerColor: colorForUid(safe, playerUid),
    opponentColor: colorForUid(safe, opponentUid),
    result: playerUid === safe.winnerUid ? 'win' : 'loss',
    roomCode: safe.roomCode || null,
    capturesMade: safeCounter(matchStats.capturesMade),
    capturesSuffered: safeCounter(matchStats.capturesSuffered ?? matchStats.capturesTaken),
    endedAt: Number.isFinite(Number(safe.endedAt)) ? Number(safe.endedAt) : null,
    processedAt,
    statsSchemaVersion: safe.statsSchemaVersion || 1,
  };
}

export function buildPlayerMatchHistoryUpdates(safe = {}, processedAt) {
  if (isDiagnosticSubmission(safe)) return {};

  const winnerEntry = buildPlayerMatchHistoryEntry(safe, safe.winnerUid, processedAt);
  const loserEntry = buildPlayerMatchHistoryEntry(safe, safe.loserUid, processedAt);
  const updates = {};

  if (winnerEntry) updates[`playerMatchHistory/${safe.winnerUid}/${safe.matchId}`] = winnerEntry;
  if (loserEntry) updates[`playerMatchHistory/${safe.loserUid}/${safe.matchId}`] = loserEntry;
  return updates;
}
