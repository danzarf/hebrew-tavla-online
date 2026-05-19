import { createEmptyPlayerStats, sanitizePlayerStats } from '../product/playerStats.js';

export const TRUSTED_PLAYER_STATS_PATH = 'playerStats';

export function trustedPlayerStatsPath(uid) {
  if (!uid) return null;
  return `${TRUSTED_PLAYER_STATS_PATH}/${uid}`;
}

export function trustedPlayerStatsRef(database, ref, uid) {
  const path = trustedPlayerStatsPath(uid);
  if (!database || !ref || !path) return null;
  return ref(database, path);
}

export async function getTrustedPlayerStats({
  database,
  ref,
  get,
  uid,
  timeoutMs = 8000,
  logger = console,
} = {}) {
  if (!uid) {
    return { skipped: true, reason: 'missing-uid', stats: createEmptyPlayerStats(), hasTrustedStats: false };
  }

  try {
    const currentRef = trustedPlayerStatsRef(database, ref, uid);
    if (!currentRef || !get) {
      return { skipped: true, reason: 'missing-database-dependency', stats: createEmptyPlayerStats(), hasTrustedStats: false };
    }

    const readPromise = Promise.resolve(get(currentRef));
    const timeoutPromise = new Promise((_, reject) => {
      const timeoutError = new Error('trusted-stats-read-timeout');
      timeoutError.code = 'trusted-stats/read-timeout';
      setTimeout(() => reject(timeoutError), timeoutMs);
    });
    const snapshot = await Promise.race([readPromise, timeoutPromise]);
    if (!snapshot?.exists?.()) {
      return { skipped: false, stats: createEmptyPlayerStats(), hasTrustedStats: false };
    }

    return {
      skipped: false,
      hasTrustedStats: true,
      stats: sanitizePlayerStats(snapshot.val() || {}),
    };
  } catch (error) {
    logger?.warn?.('Trusted player stats read failed; returning safe empty stats.', error);
    return { skipped: true, reason: 'read-failed', error, stats: createEmptyPlayerStats(), hasTrustedStats: false };
  }
}
