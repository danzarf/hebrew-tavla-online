import { createMatchResult } from './matchResult.js';

const MATCH_RESULT_SOURCE_BY_MODE = Object.freeze({
  ai: 'client-game-end',
  local: 'client-game-end',
  online: 'online-game-end',
});

let lastMatchResult = null;

function normalizeMode(gameMode) {
  if (gameMode === 'online') return 'online';
  if (gameMode === 'ai' || gameMode === 'computer') return 'ai';
  return 'local';
}

function colorForActor(state, actor) {
  return actor === 'human' ? state?.humanColor : state?.computerColor;
}

function actorForColor(state, color) {
  if (state?.humanColor === color) return 'human';
  if (state?.computerColor === color) return 'computer';
  return null;
}

function playerIdForActor({ state, actor, mode, localActor, currentPlayerId }) {
  if (actor === localActor && currentPlayerId) return currentPlayerId;
  if (state?.playerIds?.[actor]) return state.playerIds[actor];
  if (mode === 'ai' && actor === 'computer') return 'ai-computer';
  return null;
}

function playerUidForActor({ state, actor, localActor, currentUid }) {
  if (actor === localActor && currentUid) return currentUid;
  return state?.playerUids?.[actor] || null;
}

function buildMatchPlayers({ state, mode, localActor, currentPlayerId, currentUid }) {
  return ['human', 'computer'].map(actor => ({
    id: playerIdForActor({ state, actor, mode, localActor, currentPlayerId }),
    uid: playerUidForActor({ state, actor, localActor, currentUid }),
    displayName: state?.playerNames?.[actor],
    color: colorForActor(state, actor),
    isAnonymous: !playerUidForActor({ state, actor, localActor, currentUid }),
  }));
}

export function buildGameEndMatchResult({
  state = {},
  winnerColor = state?.winnerColor,
  matchId = state?.victoryId,
  endedAt,
  localActor = state?.localActor || 'human',
  currentPlayerId = state?.playerId,
  currentUid = null,
  resultSource,
  now = Date.now,
  idFactory,
} = {}) {
  const mode = normalizeMode(state?.gameMode);
  const safeEndedAt = endedAt || now();
  const winnerActor = actorForColor(state, winnerColor);
  const loserActor = winnerActor ? (winnerActor === 'human' ? 'computer' : 'human') : null;
  const players = buildMatchPlayers({ state, mode, localActor, currentPlayerId, currentUid });

  return createMatchResult({
    matchId,
    roomCode: state?.roomCode,
    mode,
    players,
    winnerColor,
    loserColor: winnerColor === 'white' ? 'black' : 'white',
    endedAt: safeEndedAt,
    resultSource: resultSource || MATCH_RESULT_SOURCE_BY_MODE[mode],
    clientSubmittedBy: currentUid || currentPlayerId,
    idFactory,
    now: () => safeEndedAt,
    winnerId: winnerActor ? playerIdForActor({ state, actor: winnerActor, mode, localActor, currentPlayerId }) : null,
    winnerUid: winnerActor ? playerUidForActor({ state, actor: winnerActor, localActor, currentUid }) : null,
    loserId: loserActor ? playerIdForActor({ state, actor: loserActor, mode, localActor, currentPlayerId }) : null,
    loserUid: loserActor ? playerUidForActor({ state, actor: loserActor, localActor, currentUid }) : null,
  });
}

export function recordGameEndMatchResult(options = {}) {
  lastMatchResult = buildGameEndMatchResult(options);
  return lastMatchResult;
}

export function getLastMatchResult() {
  return lastMatchResult;
}

export function clearLastMatchResult() {
  lastMatchResult = null;
}
