import { buildRecentOpponents, sanitizePublicProfile } from '../product/social.js';

export const PUBLIC_PROFILES_PATH = 'publicProfiles';
export const FRIENDS_PATH = 'friends';
export const FRIEND_REQUESTS_PATH = 'friendRequests';
export const OUTGOING_FRIEND_REQUESTS_PATH = 'outgoingFriendRequests';
export const SOCIAL_ACTIONS_PATH = 'socialActions';

function actionId(now = Date.now) {
  return `${now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function readPath({ database, ref, get, path }) {
  const snap = await get(ref(database, path));
  return snap?.exists?.() ? snap.val() : null;
}

export async function getPublicProfile({ database, ref, get, uid, logger = console } = {}) {
  if (!uid) return { skipped: true, reason: 'missing-uid', profile: null };
  try {
    const raw = await readPath({ database, ref, get, path: `${PUBLIC_PROFILES_PATH}/${uid}` });
    return { skipped: false, profile: sanitizePublicProfile(raw || { uid }, uid) };
  } catch (error) {
    logger?.warn?.('Public profile read failed.', error);
    return { skipped: true, reason: 'read-failed', error, profile: null };
  }
}

export async function getSocialState({ database, ref, get, uid, history = [], logger = console } = {}) {
  if (!uid) return { skipped: true, reason: 'missing-uid', state: null };
  try {
    const [friends, incomingRequests, outgoingRequests] = await Promise.all([
      readPath({ database, ref, get, path: `${FRIENDS_PATH}/${uid}` }),
      readPath({ database, ref, get, path: `${FRIEND_REQUESTS_PATH}/${uid}` }),
      readPath({ database, ref, get, path: `${OUTGOING_FRIEND_REQUESTS_PATH}/${uid}` }),
    ]);
    const profileUids = new Set([
      ...Object.keys(friends || {}),
      ...Object.values(incomingRequests || {}).map(request => request?.requesterUid).filter(Boolean),
      ...history.map(entry => entry.opponentUid).filter(Boolean),
    ]);
    const profilePairs = await Promise.all([...profileUids].map(async (profileUid) => [
      profileUid,
      await readPath({ database, ref, get, path: `${PUBLIC_PROFILES_PATH}/${profileUid}` }),
    ]));
    const publicProfiles = Object.fromEntries(profilePairs.map(([profileUid, raw]) => [
      profileUid,
      sanitizePublicProfile(raw || { uid: profileUid }, profileUid),
    ]));

    return {
      skipped: false,
      state: {
        friends: friends || {},
        incomingRequests: incomingRequests || {},
        outgoingRequests: outgoingRequests || {},
        publicProfiles,
        recentOpponents: buildRecentOpponents(history, publicProfiles),
      },
    };
  } catch (error) {
    logger?.warn?.('Social state read failed.', error);
    return { skipped: true, reason: 'read-failed', error, state: null };
  }
}

export async function submitSocialAction({
  database,
  ref,
  set,
  uid,
  type,
  targetUid,
  now = Date.now,
} = {}) {
  if (!uid || !targetUid || !type) return { skipped: true, reason: 'missing-fields' };
  const id = actionId(now);
  const path = `${SOCIAL_ACTIONS_PATH}/${uid}/${id}`;
  await set(ref(database, path), {
    actorUid: uid,
    type,
    targetUid,
    createdAt: now(),
    clientStatus: 'pending',
  });
  return { skipped: false, path };
}
