import {
  AVATAR_PREFERENCE_OPTIONS,
  DEFAULT_AVATAR_PREFERENCE,
  getAvatarPreferenceLabel,
  sanitizeAvatarPreference,
} from '../firebase/profile.js';
import { getProfileStatusText, resolveProfileDisplayName } from './profileStatus.js';

export const PROFILE_PANEL_PROGRESS_PLACEHOLDERS = Object.freeze([
  Object.freeze({ label: 'משחקים', value: 'בקרוב' }),
  Object.freeze({ label: 'ניצחונות', value: 'בקרוב' }),
  Object.freeze({ label: 'הפסדים', value: 'בקרוב' }),
  Object.freeze({ label: 'רמה', value: 'בקרוב' }),
  Object.freeze({ label: 'מטבעות', value: 'בקרוב' }),
]);

export const PROFILE_PANEL_SAFE_EDIT_FIELDS = Object.freeze([
  'displayName',
  'avatarPreference',
]);

export function getProfilePanelAuthLabel({ authStatus = 'initializing', hasAuthenticatedUid = false } = {}) {
  if (hasAuthenticatedUid || authStatus === 'authenticated') return 'מחובר כאורח';
  if (authStatus === 'fallback') return 'אורח מקומי';
  if (authStatus === 'signedOut') return 'מתחבר כאורח';
  return 'מתחבר כאורח';
}

export function buildSafeProfileEditView({
  displayName = '',
  avatarPreference = DEFAULT_AVATAR_PREFERENCE,
} = {}) {
  const safeAvatarPreference = sanitizeAvatarPreference(avatarPreference);

  return {
    displayName: resolveProfileDisplayName({ typedName: displayName }),
    avatarPreference: safeAvatarPreference,
    avatarText: getAvatarPreferenceLabel(safeAvatarPreference),
  };
}

export function buildProfilePanelViewModel({
  typedName = '',
  stateName = '',
  authStatus = 'initializing',
  hasAuthenticatedUid = false,
  avatarPreference = DEFAULT_AVATAR_PREFERENCE,
} = {}) {
  const displayName = resolveProfileDisplayName({ typedName, stateName });
  const statusText = getProfileStatusText({ authStatus, hasAuthenticatedUid });
  const authLabel = getProfilePanelAuthLabel({ authStatus, hasAuthenticatedUid });
  const safeAvatarPreference = sanitizeAvatarPreference(avatarPreference);

  return {
    displayName,
    statusText,
    authLabel,
    avatarPreference: safeAvatarPreference,
    avatarText: getAvatarPreferenceLabel(safeAvatarPreference),
    avatarOptions: AVATAR_PREFERENCE_OPTIONS.map(option => ({ ...option })),
    note: 'כדי לשמור התקדמות מכל מכשיר, התחברות מלאה תתווסף בהמשך.',
    placeholderNote: 'נתוני התקדמות הם מצייני מקום בלבד ולא נשמרים עדיין.',
    saveHint: hasAuthenticatedUid
      ? 'אפשר לעדכן כרגע רק שם תצוגה ואווטאר בטוחים.'
      : 'אם החיבור לא זמין, השינוי יישמר רק מקומית למשחק הזה.',
    progressPlaceholders: PROFILE_PANEL_PROGRESS_PLACEHOLDERS.map(item => ({ ...item })),
  };
}
