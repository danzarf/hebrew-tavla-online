import { buildRecentOpponents, sanitizePublicProfile } from '../product/social.js';

export const PUBLIC_PROFILES_PATH = 'publicProfiles';
export const FRIENDS_PATH = 'friends';
export const FRIEND_REQUESTS_PATH = 'friendRequests';
export const OUTGOING_FRIEND_REQUESTS_PATH = 'outgoingFriendRequests';
export const GAME_INVITES_PATH = 'gameInvites';
export const OUTGOING_GAME_INVITES_PATH = 'outgoingGameInvites';
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
    const [incomingGameInvites, outgoingGameInvites] = await Promise.all([
      readPath({ database, ref, get, path: `${GAME_INVITES_PATH}/${uid}` }).catch(error => {
        logger?.warn?.('Incoming game invites read failed.', error);
        return {};
      }),
      readPath({ database, ref, get, path: `${OUTGOING_GAME_INVITES_PATH}/${uid}` }).catch(error => {
        logger?.warn?.('Outgoing game invites read failed.', error);
        return {};
      }),
    ]);
    const profileUids = new Set([
      ...Object.keys(friends || {}),
      ...Object.values(incomingRequests || {}).map(request => request?.requesterUid).filter(Boolean),
      ...Object.values(incomingGameInvites || {}).map(invite => invite?.senderUid).filter(Boolean),
      ...Object.values(outgoingGameInvites || {}).map(invite => invite?.targetUid).filter(Boolean),
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
        incomingGameInvites: incomingGameInvites || {},
        outgoingGameInvites: outgoingGameInvites || {},
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
  inviteId = '',
  inviteKind = '',
  previousMatchId = '',
  now = Date.now,
} = {}) {
  if (!uid || !targetUid || !type) return { skipped: true, reason: 'missing-fields' };
  const id = actionId(now);
  const path = `${SOCIAL_ACTIONS_PATH}/${uid}/${id}`;
  const payload = {
    actorUid: uid,
    type,
    targetUid,
    createdAt: now(),
    clientStatus: 'pending',
  };
  if (inviteId) payload.inviteId = inviteId;
  if (inviteKind) payload.inviteKind = inviteKind;
  if (previousMatchId) payload.previousMatchId = previousMatchId;
  await set(ref(database, path), payload);
  return { skipped: false, path };
}

export function subscribeSocialPaths({
  database,
  ref,
  onValue,
  uid,
  onChange,
  onError,
} = {}) {
  if (!database || !ref || !onValue || !uid) return () => {};
  const paths = [
    `${FRIENDS_PATH}/${uid}`,
    `${FRIEND_REQUESTS_PATH}/${uid}`,
    `${OUTGOING_FRIEND_REQUESTS_PATH}/${uid}`,
    `${GAME_INVITES_PATH}/${uid}`,
    `${OUTGOING_GAME_INVITES_PATH}/${uid}`,
  ];
  const unsubs = paths.map(path => onValue(
    ref(database, path),
    snapshot => onChange?.({ path, value: snapshot.val() || {} }),
    error => onError?.(error, path),
  ));
  return () => unsubs.forEach(unsub => {
    try { unsub?.(); } catch {}
  });
}
