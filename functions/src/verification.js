const ALLOWED_MODES = new Set(['online']);
const ALLOWED_COLORS = new Set(['white', 'black']);
const TRUSTED_STATS_SCHEMA_VERSION = 2;

function toSafeString(value, max = 80) {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  if (!cleaned) return null;
  return cleaned.slice(0, max);
}

function isFiniteTimestamp(value) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0;
}

function toSafeCounter(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.floor(num);
}

function playerByColor(players, color) {
  return players.find((p) => p && p.color === color) || null;
}

function matchStatsForUid(rawStats, uid) {
  const stats = uid && rawStats && typeof rawStats === 'object' ? rawStats[uid] : null;
  return {
    capturesMade: toSafeCounter(stats?.capturesMade),
    capturesSuffered: toSafeCounter(stats?.capturesSuffered ?? stats?.capturesTaken),
  };
}

function withoutNullish(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== null && fieldValue !== undefined),
  );
}

export function sanitizeSubmission(raw = {}) {
  const players = Array.isArray(raw.players) ? raw.players.slice(0, 2) : [];
  const safePlayers = players.map((p) => ({
    uid: toSafeString(p?.uid),
    color: toSafeString(p?.color),
    displayName: toSafeString(p?.displayName, 32),
  })).filter((p) => p.uid && ALLOWED_COLORS.has(p.color));

  const winnerColor = toSafeString(raw.winnerColor);
  const loserColor = toSafeString(raw.loserColor) || (winnerColor === 'white' ? 'black' : 'white');
  const winner = playerByColor(safePlayers, winnerColor);
  const loser = playerByColor(safePlayers, loserColor);

  const safe = {
    matchId: toSafeString(raw.matchId),
    mode: toSafeString(raw.mode),
    gameType: toSafeString(raw.gameType),
    ruleset: toSafeString(raw.ruleset),
    roomCode: toSafeString(raw.roomCode),
    resultSource: toSafeString(raw.resultSource),
    statsSchemaVersion: toSafeCounter(raw.statsSchemaVersion),
    clientBuildVersion: toSafeString(raw.clientBuildVersion),
    hasPlayerMatchStats: raw.hasPlayerMatchStats === true,
    playerMatchStatsDebugLabel: toSafeString(raw.playerMatchStatsDebugLabel, 160),
    endedAt: Number(raw.endedAt),
    submittedAt: Number(raw.submittedAt),
    winnerColor,
    loserColor,
    players: safePlayers,
    winnerUid: toSafeString(raw.winnerUid) || winner?.uid || null,
    loserUid: toSafeString(raw.loserUid) || loser?.uid || null,
    clientSubmittedBy: toSafeString(raw.clientSubmittedBy),
    playerMatchStats: {},
    serverVerified: raw.serverVerified === true,
    trustedStatsApplied: raw.trustedStatsApplied === true,
  };

  safe.playerMatchStats = Object.fromEntries(
    safe.players.map((player) => [player.uid, matchStatsForUid(raw.playerMatchStats, player.uid)]),
  );

  return safe;
}

export function isDiagnosticSubmission(safe = {}) {
  return String(safe.matchId || '').startsWith('diagnostic-')
    || String(safe.clientSubmittedBy || '').startsWith('diagnostic-')
    || String(safe.resultSource || '').includes('diagnostic');
}

export function displayNameForUid(safe = {}, uid) {
  return safe.players?.find((player) => player.uid === uid)?.displayName || null;
}

export function buildRecentMatchIndexEntry(safe = {}, serverReviewStatus, processedAt) {
  const isDiagnostic = isDiagnosticSubmission(safe);
  const statsVersion = safe.statsSchemaVersion || 1;
  const labelParts = isDiagnostic
    ? ['DIAGNOSTIC', safe.matchId]
    : ['REAL', safe.endedAt ? new Date(safe.endedAt).toISOString() : null, safe.roomCode ? `Room ${safe.roomCode}` : null];

  labelParts.push(`${serverReviewStatus || 'unknown'}`);
  labelParts.push(`V${statsVersion}`);

  return withoutNullish({
    matchId: safe.matchId,
    statsSchemaVersion: statsVersion,
    clientBuildVersion: safe.clientBuildVersion || null,
    roomCode: safe.roomCode || null,
    mode: safe.mode,
    resultSource: safe.resultSource || null,
    submittedAt: Number.isFinite(safe.submittedAt) ? safe.submittedAt : null,
    endedAt: Number.isFinite(safe.endedAt) ? safe.endedAt : null,
    processedAt,
    serverReviewStatus,
    serverVerified: serverReviewStatus === 'applied',
    trustedStatsApplied: serverReviewStatus === 'applied',
    winnerUid: safe.winnerUid,
    loserUid: safe.loserUid,
    winnerDisplayName: displayNameForUid(safe, safe.winnerUid),
    loserDisplayName: displayNameForUid(safe, safe.loserUid),
    winnerColor: safe.winnerColor,
    loserColor: safe.loserColor,
    isDiagnostic,
    hasPlayerMatchStats: safe.hasPlayerMatchStats === true,
    playerMatchStats: safe.playerMatchStats || {},
    debugLabel: safe.playerMatchStatsDebugLabel || labelParts.filter(Boolean).join(' | '),
  });
}

export function validateSubmissionForTrustedStats(safe, { pathUid } = {}) {
  const errors = [];
  if (!safe.matchId) errors.push('missing-matchId');
  if (!ALLOWED_MODES.has(safe.mode)) errors.push('unsupported-mode');
  if (safe.gameType !== 'tavla') errors.push('unsupported-gameType');
  if (safe.ruleset !== 'hebrew-tavla') errors.push('unsupported-ruleset');
  if (!ALLOWED_COLORS.has(safe.winnerColor)) errors.push('invalid-winnerColor');
  if (!ALLOWED_COLORS.has(safe.loserColor)) errors.push('invalid-loserColor');
  if (safe.winnerColor === safe.loserColor) errors.push('same-outcome-color');
  if (!isFiniteTimestamp(safe.endedAt)) errors.push('invalid-endedAt');
  if (!safe.winnerUid || !safe.loserUid) errors.push('missing-player-uids');
  if (!Array.isArray(safe.players) || safe.players.length < 2) errors.push('missing-players');
  if (safe.winnerUid && safe.loserUid && safe.winnerUid === safe.loserUid) errors.push('same-player');

  const knownPlayerUids = new Set((safe.players || []).map((p) => p.uid).filter(Boolean));
  if (safe.winnerUid && !knownPlayerUids.has(safe.winnerUid)) errors.push('winner-not-in-players');
  if (safe.loserUid && !knownPlayerUids.has(safe.loserUid)) errors.push('loser-not-in-players');

  if (pathUid && safe.clientSubmittedBy && safe.clientSubmittedBy !== pathUid) errors.push('submitter-path-mismatch');
  if (pathUid && safe.clientSubmittedBy !== pathUid) errors.push('unrelated-submitter');
  if (safe.serverVerified) errors.push('client-cannot-server-verify');
  if (safe.trustedStatsApplied) errors.push('client-cannot-mark-stats-applied');
  return { valid: errors.length === 0, errors };
}

export function buildStatsUpdate(previous = {}, outcome, endedAt, now, matchStats = {}) {
  const wins = Number(previous.wins) || 0;
  const losses = Number(previous.losses) || 0;
  const gamesPlayed = Number(previous.gamesPlayed) || 0;
  const currentStreak = Number(previous.currentStreak) || 0;
  const bestStreak = Number(previous.bestStreak) || 0;
  const capturesMade = toSafeCounter(previous.capturesMade);
  const previousCapturesSuffered = previous.capturesSuffered ?? previous.capturesTaken;
  const capturesSuffered = toSafeCounter(previousCapturesSuffered);

  const nextWins = outcome === 'win' ? wins + 1 : wins;
  const nextLosses = outcome === 'loss' ? losses + 1 : losses;
  const nextGames = gamesPlayed + 1;
  const nextCurrentStreak = outcome === 'win' ? currentStreak + 1 : 0;
  const nextBestStreak = Math.max(bestStreak, nextCurrentStreak);
  const nextCapturesMade = capturesMade + toSafeCounter(matchStats.capturesMade);
  const nextCapturesSuffered = capturesSuffered + toSafeCounter(matchStats.capturesSuffered ?? matchStats.capturesTaken);

  return {
    gamesPlayed: nextGames,
    wins: nextWins,
    losses: nextLosses,
    winRate: Number((nextWins / nextGames).toFixed(4)),
    currentStreak: nextCurrentStreak,
    bestStreak: nextBestStreak,
    capturesMade: nextCapturesMade,
    capturesSuffered: nextCapturesSuffered,
    averageCapturesMadePerGame: Number((nextCapturesMade / nextGames).toFixed(4)),
    averageCapturesSufferedPerGame: Number((nextCapturesSuffered / nextGames).toFixed(4)),
    lastPlayedAt: endedAt,
    updatedAt: now,
  };
}
