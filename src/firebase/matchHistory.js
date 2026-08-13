import { sanitizePlayerMatchHistory } from '../product/matchHistory.js';

export const PLAYER_MATCH_HISTORY_PATH = 'playerMatchHistory';

export function playerMatchHistoryPath(uid) {
  if (!uid) return null;
  return `${PLAYER_MATCH_HISTORY_PATH}/${uid}`;
}

export function playerMatchHistoryRef(database, ref, uid) {
  const path = playerMatchHistoryPath(uid);
  if (!database || !ref || !path) return null;
  return ref(database, path);
}

export async function getPlayerMatchHistory({
  database,
  ref,
  get,
  uid,
  limit = 20,
  logger = console,
} = {}) {
  if (!uid) return { skipped: true, reason: 'missing-uid', history: [] };

  try {
    const currentRef = playerMatchHistoryRef(database, ref, uid);
    if (!currentRef || !get) return { skipped: true, reason: 'missing-database-dependency', history: [] };
    const snapshot = await get(currentRef);
    if (!snapshot?.exists?.()) return { skipped: false, history: [] };
    return { skipped: false, history: sanitizePlayerMatchHistory(snapshot.val() || {}, { limit }) };
  } catch (error) {
    logger?.warn?.('Player match history read failed; returning safe empty history.', error);
    return { skipped: true, reason: 'read-failed', error, history: [] };
  }
}
