export function getEndTurnDelaySeconds({ gameMode, currentActor } = {}) {
  if (gameMode !== 'online' && currentActor === 'computer') return 0;
  return 3;
}

export function createAutoEndState({ seconds, prefix, now = Date.now } = {}) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  if (safeSeconds <= 0) return null;
  return {
    deadline: now() + safeSeconds * 1000,
    prefix: String(prefix || 'התור יסתיים בעוד'),
  };
}
