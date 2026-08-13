export const MATCH_HISTORY_EMPTY_TEXT = 'עוד אין סטטיסטיקות. סיים משחק אונליין כדי להתחיל לצבור נתונים.';

function safeCounter(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.floor(num);
}

function safeTimestamp(value) {
  const num = Number(value);
  if (Number.isFinite(num) && num > 0) return num;
  const parsed = Date.parse(String(value || '').trim());
  return Number.isNaN(parsed) ? 0 : parsed;
}

function safeText(value, fallback = '') {
  return String(value || fallback).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim() || fallback;
}

export function sanitizePlayerMatchHistoryEntry(raw = {}) {
  return {
    matchId: safeText(raw.matchId),
    opponentUid: safeText(raw.opponentUid),
    opponentDisplayName: safeText(raw.opponentDisplayName, 'יריב').slice(0, 32),
    playerColor: safeText(raw.playerColor),
    opponentColor: safeText(raw.opponentColor),
    result: raw.result === 'win' ? 'win' : 'loss',
    roomCode: safeText(raw.roomCode),
    capturesMade: safeCounter(raw.capturesMade),
    capturesSuffered: safeCounter(raw.capturesSuffered),
    endedAt: safeTimestamp(raw.endedAt),
    processedAt: safeTimestamp(raw.processedAt),
    statsSchemaVersion: safeCounter(raw.statsSchemaVersion) || 1,
  };
}

export function sanitizePlayerMatchHistory(rawHistory = {}, { limit = 20 } = {}) {
  if (!rawHistory || typeof rawHistory !== 'object') return [];
  return Object.values(rawHistory)
    .map(sanitizePlayerMatchHistoryEntry)
    .filter(entry => entry.matchId && entry.opponentUid)
    .sort((a, b) => (b.endedAt || b.processedAt) - (a.endedAt || a.processedAt))
    .slice(0, limit);
}

export function formatHistoryDate(timestamp, locale = 'he-IL') {
  if (!timestamp) return '';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export function buildMatchHistoryViewModel({
  history = [],
  isLoading = false,
  errorMessage = '',
  emptyText = MATCH_HISTORY_EMPTY_TEXT,
} = {}) {
  if (isLoading) return { state: 'loading', message: 'טוען היסטוריית משחקים...', rows: [] };
  if (errorMessage) return { state: 'error', message: errorMessage, rows: [] };

  const rows = sanitizePlayerMatchHistory(history).map(entry => ({
    matchId: entry.matchId,
    title: `${entry.result === 'win' ? 'ניצחון' : 'הפסד'} מול ${entry.opponentDisplayName}`,
    subtitle: `${entry.capturesMade} אכילות | אכלו אותי ${entry.capturesSuffered}`,
    dateText: formatHistoryDate(entry.endedAt || entry.processedAt),
    result: entry.result,
  }));

  if (!rows.length) return { state: 'empty', message: emptyText, rows: [] };
  return { state: 'populated', message: '', rows };
}
