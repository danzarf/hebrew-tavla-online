const MODE_LABELS_HE = Object.freeze({
  local: 'מקומי',
  online: 'אונליין',
  ai: 'מול מחשב',
});

const COLOR_LABELS_HE = Object.freeze({
  white: 'לבן',
  black: 'שחור',
});

const STATUS_LABELS_HE = Object.freeze({
  completed: 'המשחק הסתיים',
});

function cleanDisplayText(value, maxLength = 40) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
    .trim();
}

function winnerDisplayName(matchResult) {
  const winnerColor = matchResult?.winnerColor;
  const winner = Array.isArray(matchResult?.players)
    ? matchResult.players.find(player => player?.color === winnerColor)
    : null;

  return cleanDisplayText(winner?.displayName, 32);
}

export function getMatchResultSummaryRows(matchResult) {
  if (!matchResult || typeof matchResult !== 'object') return [];

  const rows = [];
  const winnerName = winnerDisplayName(matchResult);
  const winnerColor = COLOR_LABELS_HE[matchResult.winnerColor];
  const mode = MODE_LABELS_HE[matchResult.mode];
  const roomCode = matchResult.mode === 'online' ? cleanDisplayText(matchResult.roomCode, 16) : '';
  const status = STATUS_LABELS_HE[matchResult.finalStatus] || cleanDisplayText(matchResult.finalStatus, 24);

  if (winnerName) rows.push({ label: 'מנצח', value: winnerName });
  if (winnerColor) rows.push({ label: 'צבע', value: winnerColor });
  if (mode) rows.push({ label: 'מצב', value: mode });
  if (roomCode) rows.push({ label: 'חדר', value: roomCode });
  if (status) rows.push({ label: 'סטטוס', value: status });

  return rows;
}
