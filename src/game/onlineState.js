export function createSharedGameState(state) {
  return {
    board: state.board,
    bar: state.bar,
    off: state.off,
    humanColor: state.humanColor,
    computerColor: state.computerColor,
    currentActor: state.currentActor,
    status: state.status,
    difficulty: state.difficulty,
    diceMode: state.diceMode,
    dice: state.dice,
    remaining: state.remaining,
    freeMode: state.freeMode,
    doubleExtra: state.doubleExtra,
    chosenDouble: state.chosenDouble,
    log: state.log,
    doubleStreak: state.doubleStreak,
    gameOver: state.gameOver,
    lastChance: state.lastChance,
    pendingVictory: state.pendingVictory || null,
    lastMove: state.lastMove || null,
    winnerColor: state.winnerColor || null,
    stolen: !!state.stolen,
    victoryId: state.victoryId || null,
    updatedAt: Date.now(),
  };
}

export function normalizeBoard(b) {
  const arr = Array(25).fill(0);
  if (Array.isArray(b)) {
    for (let i = 0; i < Math.min(25, b.length); i++) arr[i] = b[i] || 0;
  } else if (b) {
    Object.keys(b).forEach(k => { arr[+k] = b[k] || 0; });
  }
  return arr;
}

function isDicePairWithValues(dice) {
  return Array.isArray(dice) && dice.length === 2 && Number.isInteger(dice[0]) && Number.isInteger(dice[1]) && dice[0] > 0 && dice[1] > 0;
}

function latestRollLogEntry(log = []) {
  if (!Array.isArray(log) || log.length === 0) return null;
  for (let i = log.length - 1; i >= 0; i -= 1) {
    const entry = log[i];
    if (typeof entry?.text !== 'string') continue;
    if (/גלגל: \d+–\d+/.test(entry.text)) return entry;
  }
  return null;
}

export function getRemoteRollFeedbackId(shared = {}) {
  const dice = shared?.dice;
  if (!isDicePairWithValues(dice)) return null;
  const rollEntry = latestRollLogEntry(shared?.log);
  if (!rollEntry) return null;
  return `${shared.currentActor || ''}|${rollEntry.time || ''}|${rollEntry.text}|${dice[0]}-${dice[1]}`;
}

export function shouldTriggerRemoteRollFeedback({
  shared,
  localActor,
  lastSeenFeedbackId,
}) {
  if (!shared || !localActor) return { shouldTrigger: false, feedbackId: null };
  if (shared.currentActor === localActor) return { shouldTrigger: false, feedbackId: null };
  const feedbackId = getRemoteRollFeedbackId(shared);
  if (!feedbackId || feedbackId === lastSeenFeedbackId) return { shouldTrigger: false, feedbackId };
  return { shouldTrigger: true, feedbackId };
}
