export const PLAYER_STATS_FIELDS = Object.freeze([
  'gamesPlayed',
  'wins',
  'losses',
  'winRate',
  'currentStreak',
  'bestStreak',
  'capturesMade',
  'capturesTaken',
  'lastPlayedAt',
  'updatedAt',
]);

function sanitizeCounter(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function sanitizeTimestamp(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

export function calculateWinRate(wins = 0, gamesPlayed = 0) {
  const safeWins = sanitizeCounter(wins);
  const safeGamesPlayed = sanitizeCounter(gamesPlayed);
  if (safeGamesPlayed <= 0) return 0;
  const ratio = (safeWins / safeGamesPlayed) * 100;
  const boundedRatio = Math.max(0, Math.min(100, ratio));
  return Math.round(boundedRatio * 10) / 10;
}

export function createEmptyPlayerStats() {
  return {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    currentStreak: 0,
    bestStreak: 0,
    capturesMade: 0,
    capturesTaken: 0,
    lastPlayedAt: null,
    updatedAt: null,
  };
}

export function sanitizePlayerStats(rawStats = {}) {
  const base = createEmptyPlayerStats();
  const gamesPlayed = sanitizeCounter(rawStats.gamesPlayed);
  let wins = sanitizeCounter(rawStats.wins);
  let losses = sanitizeCounter(rawStats.losses);

  if (wins > gamesPlayed) wins = gamesPlayed;
  if (losses > gamesPlayed) losses = gamesPlayed;
  if (wins + losses > gamesPlayed) {
    losses = Math.max(0, gamesPlayed - wins);
  }

  const currentStreak = sanitizeCounter(rawStats.currentStreak);
  const bestStreak = Math.max(currentStreak, sanitizeCounter(rawStats.bestStreak));

  return {
    ...base,
    gamesPlayed,
    wins,
    losses,
    winRate: calculateWinRate(wins, gamesPlayed),
    currentStreak,
    bestStreak,
    capturesMade: sanitizeCounter(rawStats.capturesMade),
    capturesTaken: sanitizeCounter(rawStats.capturesTaken),
    lastPlayedAt: sanitizeTimestamp(rawStats.lastPlayedAt),
    updatedAt: sanitizeTimestamp(rawStats.updatedAt),
  };
}

export function formatPlayerStatsForProfile(rawStats, { showComingSoon = true } = {}) {
  const stats = sanitizePlayerStats(rawStats);

  return {
    stats,
    isPlaceholder: showComingSoon,
    items: [
      { label: 'משחקים', value: showComingSoon ? 'בקרוב' : String(stats.gamesPlayed) },
      { label: 'ניצחונות', value: showComingSoon ? 'בקרוב' : String(stats.wins) },
      { label: 'הפסדים', value: showComingSoon ? 'בקרוב' : String(stats.losses) },
      { label: 'אחוז ניצחון', value: showComingSoon ? 'בקרוב' : `${stats.winRate}%` },
      { label: 'רצף נוכחי', value: showComingSoon ? 'בקרוב' : String(stats.currentStreak) },
      { label: 'שיא רצף', value: showComingSoon ? 'בקרוב' : String(stats.bestStreak) },
      { label: 'אכלתי', value: showComingSoon ? 'בקרוב' : String(stats.capturesMade) },
      { label: 'אכלו אותי', value: showComingSoon ? 'בקרוב' : String(stats.capturesTaken) },
    ],
    note: showComingSoon
      ? 'סטטיסטיקות יופיעו אחרי משחקים מאומתים.'
      : 'סטטיסטיקות להצגה בלבד. עדכון אמין יתבצע ממקור מאומת בלבד.',
  };
}
