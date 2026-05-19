const ALLOWED_MODES = new Set(['online']);
const ALLOWED_COLORS = new Set(['white', 'black']);

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

function playerByColor(players, color) {
  return players.find((p) => p && p.color === color) || null;
}

export function sanitizeSubmission(raw = {}) {
  const players = Array.isArray(raw.players) ? raw.players.slice(0, 2) : [];
  const safePlayers = players.map((p) => ({
    uid: toSafeString(p?.uid),
    color: toSafeString(p?.color),
  })).filter((p) => p.uid && ALLOWED_COLORS.has(p.color));

  const winnerColor = toSafeString(raw.winnerColor);
  const loserColor = toSafeString(raw.loserColor) || (winnerColor === 'white' ? 'black' : 'white');
  const winner = playerByColor(safePlayers, winnerColor);
  const loser = playerByColor(safePlayers, loserColor);

  return {
    matchId: toSafeString(raw.matchId),
    mode: toSafeString(raw.mode),
    gameType: toSafeString(raw.gameType),
    ruleset: toSafeString(raw.ruleset),
    endedAt: Number(raw.endedAt),
    submittedAt: Number(raw.submittedAt),
    winnerColor,
    loserColor,
    winnerUid: toSafeString(raw.winnerUid) || winner?.uid || null,
    loserUid: toSafeString(raw.loserUid) || loser?.uid || null,
    clientSubmittedBy: toSafeString(raw.clientSubmittedBy),
    serverVerified: raw.serverVerified === true,
    trustedStatsApplied: raw.trustedStatsApplied === true,
  };
}

export function validateSubmissionForTrustedStats(safe) {
  const errors = [];
  if (!safe.matchId) errors.push('missing-matchId');
  if (!ALLOWED_MODES.has(safe.mode)) errors.push('unsupported-mode');
  if (safe.gameType !== 'tavla') errors.push('unsupported-gameType');
  if (safe.ruleset !== 'hebrew-tavla') errors.push('unsupported-ruleset');
  if (!ALLOWED_COLORS.has(safe.winnerColor)) errors.push('invalid-winnerColor');
  if (!ALLOWED_COLORS.has(safe.loserColor)) errors.push('invalid-loserColor');
  if (!isFiniteTimestamp(safe.endedAt)) errors.push('invalid-endedAt');
  if (!safe.winnerUid || !safe.loserUid) errors.push('missing-player-uids');
  if (safe.winnerUid && safe.loserUid && safe.winnerUid === safe.loserUid) errors.push('same-player');
  if (safe.serverVerified) errors.push('client-cannot-server-verify');
  if (safe.trustedStatsApplied) errors.push('client-cannot-mark-stats-applied');
  return { valid: errors.length === 0, errors };
}

export function buildStatsUpdate(previous = {}, outcome, endedAt, now) {
  const wins = Number(previous.wins) || 0;
  const losses = Number(previous.losses) || 0;
  const gamesPlayed = Number(previous.gamesPlayed) || 0;
  const currentStreak = Number(previous.currentStreak) || 0;
  const bestStreak = Number(previous.bestStreak) || 0;

  const nextWins = outcome === 'win' ? wins + 1 : wins;
  const nextLosses = outcome === 'loss' ? losses + 1 : losses;
  const nextGames = gamesPlayed + 1;
  const nextCurrentStreak = outcome === 'win' ? currentStreak + 1 : 0;
  const nextBestStreak = Math.max(bestStreak, nextCurrentStreak);

  return {
    gamesPlayed: nextGames,
    wins: nextWins,
    losses: nextLosses,
    winRate: Number((nextWins / nextGames).toFixed(4)),
    currentStreak: nextCurrentStreak,
    bestStreak: nextBestStreak,
    lastPlayedAt: endedAt,
    updatedAt: now,
  };
}
