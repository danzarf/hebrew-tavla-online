export const MATCH_RESULT_MODES = Object.freeze(['local', 'online', 'ai']);
export const MATCH_RESULT_COLORS = Object.freeze(['white', 'black']);
export const DEFAULT_MATCH_RESULT_MODE = 'local';
export const DEFAULT_MATCH_RESULT_SOURCE = 'client-game-end';
export const DEFAULT_GAME_TYPE = 'tavla';
export const DEFAULT_RULESET = 'hebrew-tavla';

export const SAFE_MATCH_RESULT_FIELDS = Object.freeze([
  'matchId',
  'roomCode',
  'mode',
  'players',
  'winnerId',
  'winnerUid',
  'loserId',
  'loserUid',
  'winnerColor',
  'loserColor',
  'startedAt',
  'endedAt',
  'resultSource',
  'gameType',
  'ruleset',
  'finalStatus',
  'clientSubmittedBy',
  'serverVerified',
]);

export const SAFE_MATCH_PLAYER_FIELDS = Object.freeze([
  'id',
  'uid',
  'guestId',
  'displayName',
  'color',
  'isAnonymous',
]);

export const FORBIDDEN_MATCH_RESULT_FIELDS = Object.freeze([
  'coins',
  'coinReward',
  'balance',
  'xp',
  'xpReward',
  'level',
  'rewards',
  'reward',
  'stats',
  'statistics',
  'wins',
  'losses',
  'gamesPlayed',
  'ledger',
  'dailyReward',
]);

const MAX_STRING_LENGTH = 80;
const MAX_DISPLAY_NAME_LENGTH = 32;

function cleanString(value, { maxLength = MAX_STRING_LENGTH } = {}) {
  if (value === null || value === undefined) return null;

  const cleaned = String(value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
    .trim();

  return cleaned || null;
}

function cleanEnum(value, allowedValues, fallback = null) {
  const cleaned = cleanString(value);
  return allowedValues.includes(cleaned) ? cleaned : fallback;
}

function cleanTimestamp(value, fallback) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return fallback;
  return timestamp;
}

function withoutEmptyFields(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== null && fieldValue !== undefined),
  );
}

function derivePlayerId(player, color) {
  return cleanString(player?.uid)
    || cleanString(player?.id)
    || cleanString(player?.playerId)
    || cleanString(player?.guestId)
    || (color ? `guest-${color}` : null);
}

export function sanitizeMatchPlayer(player = {}, fallbackColor = null) {
  const color = cleanEnum(player.color, MATCH_RESULT_COLORS, fallbackColor);
  const uid = cleanString(player.uid);
  const guestId = cleanString(player.guestId || player.playerId);
  const id = derivePlayerId(player, color);

  return withoutEmptyFields({
    id,
    uid,
    guestId,
    displayName: cleanString(player.displayName || player.name, { maxLength: MAX_DISPLAY_NAME_LENGTH }),
    color,
    isAnonymous: Boolean(player.isAnonymous || !uid),
  });
}

export function sanitizeMatchPlayers(players = []) {
  const sourcePlayers = Array.isArray(players) ? players : [];
  const fallbackColors = ['white', 'black'];

  return sourcePlayers
    .slice(0, 2)
    .map((player, index) => sanitizeMatchPlayer(player, fallbackColors[index]))
    .filter(player => player.id && player.color);
}

export function createMatchResult({
  matchId,
  roomCode,
  mode = DEFAULT_MATCH_RESULT_MODE,
  players = [],
  winnerId,
  winnerUid,
  loserId,
  loserUid,
  winnerColor,
  loserColor,
  startedAt,
  endedAt,
  resultSource = DEFAULT_MATCH_RESULT_SOURCE,
  gameType = DEFAULT_GAME_TYPE,
  ruleset = DEFAULT_RULESET,
  finalStatus = 'completed',
  clientSubmittedBy,
  now = Date.now,
  idFactory = () => `match-${now()}`,
} = {}) {
  const timestamp = now();
  const safePlayers = sanitizeMatchPlayers(players);
  const safeWinnerColor = cleanEnum(winnerColor, MATCH_RESULT_COLORS);
  const safeLoserColor = cleanEnum(
    loserColor,
    MATCH_RESULT_COLORS,
    safeWinnerColor ? MATCH_RESULT_COLORS.find(color => color !== safeWinnerColor) : null,
  );
  const winnerPlayer = safePlayers.find(player => player.color === safeWinnerColor);
  const loserPlayer = safePlayers.find(player => player.color === safeLoserColor);

  return withoutEmptyFields({
    matchId: cleanString(matchId) || cleanString(idFactory()),
    roomCode: cleanString(roomCode),
    mode: cleanEnum(mode, MATCH_RESULT_MODES, DEFAULT_MATCH_RESULT_MODE),
    players: safePlayers,
    winnerId: cleanString(winnerId) || winnerPlayer?.id || cleanString(winnerUid),
    winnerUid: cleanString(winnerUid) || winnerPlayer?.uid,
    loserId: cleanString(loserId) || loserPlayer?.id || cleanString(loserUid),
    loserUid: cleanString(loserUid) || loserPlayer?.uid,
    winnerColor: safeWinnerColor,
    loserColor: safeLoserColor,
    startedAt: cleanTimestamp(startedAt, null),
    endedAt: cleanTimestamp(endedAt, timestamp),
    resultSource: cleanString(resultSource) || DEFAULT_MATCH_RESULT_SOURCE,
    gameType: cleanString(gameType) || DEFAULT_GAME_TYPE,
    ruleset: cleanString(ruleset) || DEFAULT_RULESET,
    finalStatus: cleanString(finalStatus) || 'completed',
    clientSubmittedBy: cleanString(clientSubmittedBy),
    serverVerified: false,
  });
}

export function sanitizeMatchResult(input = {}, options = {}) {
  return createMatchResult({ ...input, ...options });
}

export function validateMatchResult(matchResult = {}) {
  const errors = [];
  const keys = Object.keys(matchResult || {});

  for (const key of keys) {
    if (!SAFE_MATCH_RESULT_FIELDS.includes(key)) errors.push(`unexpected-field:${key}`);
    if (FORBIDDEN_MATCH_RESULT_FIELDS.includes(key)) errors.push(`forbidden-field:${key}`);
  }

  if (!matchResult?.matchId) errors.push('missing-matchId');
  if (!MATCH_RESULT_MODES.includes(matchResult?.mode)) errors.push('invalid-mode');
  if (!Array.isArray(matchResult?.players) || matchResult.players.length < 2) errors.push('missing-players');
  if (!MATCH_RESULT_COLORS.includes(matchResult?.winnerColor)) errors.push('missing-winnerColor');
  if (!Number.isFinite(Number(matchResult?.endedAt)) || Number(matchResult?.endedAt) <= 0) errors.push('missing-endedAt');
  if (matchResult?.serverVerified !== false) errors.push('client-cannot-server-verify');

  for (const player of Array.isArray(matchResult?.players) ? matchResult.players : []) {
    for (const key of Object.keys(player)) {
      if (!SAFE_MATCH_PLAYER_FIELDS.includes(key)) errors.push(`unexpected-player-field:${key}`);
      if (FORBIDDEN_MATCH_RESULT_FIELDS.includes(key)) errors.push(`forbidden-player-field:${key}`);
    }
    if (!player.id) errors.push('missing-player-id');
    if (!MATCH_RESULT_COLORS.includes(player.color)) errors.push('invalid-player-color');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
