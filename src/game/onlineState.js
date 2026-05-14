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
