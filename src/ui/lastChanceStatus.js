export function buildLastChanceStatus({
  lastChance,
  gameOver = false,
  localActor = null,
  actorForColor = () => null,
  actorName = (actor) => actor || '',
} = {}) {
  if (!lastChance || gameOver) return { statusText: '', waitingText: '', modalRole: 'hidden' };

  const winnerActor = actorForColor(lastChance.winner);
  const loserActor = actorForColor(lastChance.loser);
  const winnerName = actorName(winnerActor);
  const loserName = actorName(loserActor);

  if (lastChance.phase === 'choose') {
    if (loserActor === localActor) {
      return {
        statusText: 'ירושלמי: בחר שני מספרים',
        waitingText: '',
        modalRole: 'choose',
      };
    }
    return {
      statusText: `${loserName} בוחר מספרים לירושלמי...`,
      waitingText: 'השחקן השני בוחר מספרים לירושלמי...',
      modalRole: 'waiting-for-choice',
    };
  }

  if (lastChance.phase === 'roll') {
    const choice = lastChance.choice || ['?', '?'];
    if (winnerActor === localActor) {
      return {
        statusText: `הירושלמי נבחר: ${choice[0]}-${choice[1]} - זרוק קוביות`,
        waitingText: '',
        modalRole: 'roll',
      };
    }
    return {
      statusText: `מחכים ש${winnerName} יזרוק לירושלמי`,
      waitingText: `מחכים ש${winnerName} יזרוק לירושלמי...`,
      modalRole: 'waiting-for-roll',
    };
  }

  if (lastChance.phase === 'rolling') {
    return {
      statusText: `${winnerName} מגלגל לירושלמי...`,
      waitingText: `${winnerName} מגלגל לירושלמי...`,
      modalRole: 'rolling',
    };
  }

  return { statusText: '', waitingText: '', modalRole: 'hidden' };
}
