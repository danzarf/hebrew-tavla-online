export function resolvePendingVictoryDoubleRoll({ pending, dice, nextStreak } = {}) {
  if (!pending || !Array.isArray(dice) || dice.length < 2) return { action: 'none' };
  if (dice[0] !== dice[1]) return { action: 'confirm-victory', winner: pending.winner, loser: pending.loser };
  if (Number(nextStreak) >= 3) return { action: 'penalty-win', winner: pending.loser, loser: pending.winner };
  return { action: 'continue-pending', streak: nextStreak };
}
