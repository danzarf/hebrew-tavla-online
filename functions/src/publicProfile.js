const DEFAULT_DISPLAY_NAME = 'אורח';
const DEFAULT_AVATAR = 'default';

function safeString(value, { fallback = '', max = 80 } = {}) {
  const cleaned = String(value || fallback)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return (cleaned || fallback).slice(0, max).trim() || fallback;
}

function safeCounter(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.floor(num);
}

function safeTimestamp(value) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function safeWinRate(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  const percent = num <= 1 ? num * 100 : num;
  return Math.min(100, Math.round(percent * 10) / 10);
}

export function buildPublicStatsProjection(rawStats = {}) {
  return {
    gamesPlayed: safeCounter(rawStats.gamesPlayed),
    wins: safeCounter(rawStats.wins),
    winRate: safeWinRate(rawStats.winRate),
    currentStreak: safeCounter(rawStats.currentStreak),
    bestStreak: safeCounter(rawStats.bestStreak),
    lastPlayedAt: safeTimestamp(rawStats.lastPlayedAt),
  };
}

export function buildPublicProfileProjection({
  uid,
  profile = {},
  stats = {},
  existingPublicProfile = {},
  updatedAt = Date.now(),
} = {}) {
  if (!uid) return null;

  return {
    uid,
    displayName: safeString(profile.displayName || existingPublicProfile.displayName, {
      fallback: DEFAULT_DISPLAY_NAME,
      max: 18,
    }),
    avatarPreference: safeString(profile.avatarPreference || existingPublicProfile.avatarPreference, {
      fallback: DEFAULT_AVATAR,
      max: 40,
    }),
    stats: buildPublicStatsProjection(stats || existingPublicProfile.stats || {}),
    updatedAt,
  };
}

export async function updatePublicProfileProjection({ db, uid, profile = null, stats = null, now = Date.now } = {}) {
  if (!db || !uid) return { skipped: true, reason: 'missing-dependency' };
  const publicRef = db.ref(`publicProfiles/${uid}`);
  const [currentSnap, statsSnap] = await Promise.all([
    publicRef.get(),
    stats ? Promise.resolve({ val: () => stats }) : db.ref(`playerStats/${uid}`).get(),
  ]);
  const existing = currentSnap.val() || {};
  const trustedStats = statsSnap.val() || null;
  const projection = buildPublicProfileProjection({
    uid,
    profile: profile || existing,
    stats: trustedStats || existing.stats || {},
    existingPublicProfile: existing,
    updatedAt: now(),
  });
  await publicRef.set(projection);
  return { skipped: false, path: `publicProfiles/${uid}`, projection };
}
