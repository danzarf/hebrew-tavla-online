export const PROFILE_ROOT = 'profiles';
export const PROFILE_DISPLAY_NAME_MAX_LENGTH = 18;
export const DEFAULT_PROFILE_AVATAR = 'default';

export function sanitizeDisplayName(value, fallback = 'אורח') {
  const normalized = String(value || '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const displayName = normalized || fallback;
  return displayName.slice(0, PROFILE_DISPLAY_NAME_MAX_LENGTH);
}

export function profilePath(uid) {
  if (!uid) throw new Error('Profile uid is required');
  return `${PROFILE_ROOT}/${uid}`;
}

export function buildProfileCreateValues({ uid, displayName, isAnonymous = true, avatarPreference = DEFAULT_PROFILE_AVATAR, timestamp }) {
  const safeDisplayName = sanitizeDisplayName(displayName);
  return {
    uid,
    displayName: safeDisplayName,
    isAnonymous: !!isAnonymous,
    avatarPreference,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastSeenAt: timestamp,
  };
}

export function buildProfileUpdateValues({ displayName, isAnonymous = true, avatarPreference = DEFAULT_PROFILE_AVATAR, timestamp }) {
  const safeDisplayName = sanitizeDisplayName(displayName);
  return {
    displayName: safeDisplayName,
    isAnonymous: !!isAnonymous,
    avatarPreference,
    updatedAt: timestamp,
    lastSeenAt: timestamp,
  };
}

export async function upsertPlayerProfile({
  db,
  ref,
  get,
  set,
  update,
  serverTimestamp,
  uid,
  displayName,
  isAnonymous = true,
  avatarPreference = DEFAULT_PROFILE_AVATAR,
}) {
  if (!uid) return null;
  if (!db || !ref || !get || !set || !update || !serverTimestamp) {
    throw new Error('Profile Firebase database dependencies are required');
  }

  const timestamp = serverTimestamp();
  const targetRef = ref(db, profilePath(uid));
  const snapshot = await get(targetRef);

  if (!snapshot.exists()) {
    const values = buildProfileCreateValues({ uid, displayName, isAnonymous, avatarPreference, timestamp });
    await set(targetRef, values);
    return values;
  }

  const values = buildProfileUpdateValues({ displayName, isAnonymous, avatarPreference, timestamp });
  await update(targetRef, values);
  return values;
}
