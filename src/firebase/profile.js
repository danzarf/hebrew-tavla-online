export const PROFILE_COLLECTION_PATH = 'profiles';
export const DEFAULT_AVATAR_PREFERENCE = 'default';
export const AVATAR_PREFERENCE_OPTIONS = Object.freeze([
  Object.freeze({ value: 'default', label: '👤' }),
  Object.freeze({ value: 'dice', label: '🎲' }),
  Object.freeze({ value: 'trophy', label: '🏆' }),
  Object.freeze({ value: 'star', label: '⭐' }),
  Object.freeze({ value: 'crown', label: '👑' }),
  Object.freeze({ value: 'evil-eye', label: '🧿' }),
  Object.freeze({ value: 'wolf', label: '🐺' }),
  Object.freeze({ value: 'fox', label: '🦊' }),
  Object.freeze({ value: 'lion', label: '🦁' }),
  Object.freeze({ value: 'dragon', label: '🐉' }),
  Object.freeze({ value: 'fire', label: '🔥' }),
  Object.freeze({ value: 'swords', label: '⚔️' }),
  Object.freeze({ value: 'shield', label: '🛡️' }),
  Object.freeze({ value: 'gem', label: '💎' }),
  Object.freeze({ value: 'hamsa', label: '🪬' }),
  Object.freeze({ value: 'joystick', label: '🕹️' }),
  Object.freeze({ value: 'target', label: '🎯' }),
  Object.freeze({ value: 'cards', label: '🃏' }),
  Object.freeze({ value: 'bow', label: '🏹' }),
  Object.freeze({ value: 'snake', label: '🐍' }),
  Object.freeze({ value: 'eagle', label: '🦅' }),
]);
export const RECOMMENDED_AVATAR_PREFERENCE_COUNT = 8;
export const SAFE_PROFILE_FIELDS = Object.freeze([
  'uid',
  'displayName',
  'isAnonymous',
  'avatarPreference',
  'createdAt',
  'updatedAt',
  'lastSeenAt',
]);

const MAX_DISPLAY_NAME_LENGTH = 18;
const FALLBACK_DISPLAY_NAME_PREFIX = 'אורח';
const ALLOWED_AVATAR_PREFERENCES = new Set(AVATAR_PREFERENCE_OPTIONS.map(option => option.value));

export function createGuestDisplayName(randomValue = Math.random()) {
  const guestNumber = Math.floor(100 + randomValue * 900);
  return `${FALLBACK_DISPLAY_NAME_PREFIX} ${guestNumber}`;
}

export function sanitizeDisplayName(displayName, { fallbackName = createGuestDisplayName() } = {}) {
  const normalizedName = String(displayName || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_DISPLAY_NAME_LENGTH)
    .trim();

  return normalizedName || fallbackName;
}

export function sanitizeAvatarPreference(avatarPreference) {
  const normalizedAvatarPreference = String(avatarPreference || DEFAULT_AVATAR_PREFERENCE).trim();
  return ALLOWED_AVATAR_PREFERENCES.has(normalizedAvatarPreference)
    ? normalizedAvatarPreference
    : DEFAULT_AVATAR_PREFERENCE;
}

export function getAvatarPreferenceLabel(avatarPreference) {
  const safeAvatarPreference = sanitizeAvatarPreference(avatarPreference);
  return AVATAR_PREFERENCE_OPTIONS.find(option => option.value === safeAvatarPreference)?.label || '👤';
}

export function profilePath(uid) {
  return `${PROFILE_COLLECTION_PATH}/${uid}`;
}

export function profileRef(database, ref, uid) {
  if (!database || !ref || !uid) return null;
  return ref(database, profilePath(uid));
}

export function buildProfilePayload({
  uid,
  displayName,
  isAnonymous = true,
  avatarPreference = DEFAULT_AVATAR_PREFERENCE,
  now = Date.now,
  existingProfile = null,
} = {}) {
  if (!uid) return null;

  const timestamp = now();
  const payload = {
    uid,
    displayName: sanitizeDisplayName(displayName),
    isAnonymous: Boolean(isAnonymous),
    avatarPreference: sanitizeAvatarPreference(avatarPreference),
    updatedAt: timestamp,
    lastSeenAt: timestamp,
  };

  if (!existingProfile?.createdAt) {
    payload.createdAt = timestamp;
  }

  return payload;
}

export async function syncPlayerProfile({
  database,
  ref,
  get,
  set,
  update,
  uid,
  displayName,
  isAnonymous = true,
  avatarPreference = DEFAULT_AVATAR_PREFERENCE,
  now = Date.now,
  logger = console,
} = {}) {
  if (!uid) return { skipped: true, reason: 'missing-uid' };

  try {
    const currentRef = profileRef(database, ref, uid);
    if (!currentRef || !get || !set || !update) {
      return { skipped: true, reason: 'missing-database-dependency' };
    }

    const snapshot = await get(currentRef);
    const existingProfile = snapshot?.exists?.() ? snapshot.val() : null;
    const payload = buildProfilePayload({
      uid,
      displayName,
      isAnonymous,
      avatarPreference,
      now,
      existingProfile,
    });

    if (!existingProfile) {
      await set(currentRef, payload);
    } else {
      await update(currentRef, payload);
    }

    return { skipped: false, path: profilePath(uid), payload };
  } catch (error) {
    logger?.warn?.('Player profile sync failed; continuing with guest/local gameplay fallback.', error);
    return { skipped: true, reason: 'write-failed', error };
  }
}

export async function getPlayerProfile({
  database,
  ref,
  get,
  uid,
  logger = console,
} = {}) {
  if (!uid) return { skipped: true, reason: 'missing-uid', profile: null };

  try {
    const currentRef = profileRef(database, ref, uid);
    if (!currentRef || !get) {
      return { skipped: true, reason: 'missing-database-dependency', profile: null };
    }

    const snapshot = await get(currentRef);
    if (!snapshot?.exists?.()) return { skipped: false, profile: null };

    const rawProfile = snapshot.val() || {};
    return {
      skipped: false,
      profile: {
        displayName: sanitizeDisplayName(rawProfile.displayName),
        avatarPreference: sanitizeAvatarPreference(rawProfile.avatarPreference),
        isAnonymous: rawProfile.isAnonymous !== false,
      },
    };
  } catch (error) {
    logger?.warn?.('Player profile load failed; continuing with guest/local gameplay fallback.', error);
    return { skipped: true, reason: 'read-failed', error, profile: null };
  }
}
