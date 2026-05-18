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

export function getProfilePanelAuthLabel({ authStatus = 'initializing', hasAuthenticatedUid = false, isAnonymous = true } = {}) {
  if ((hasAuthenticatedUid || authStatus === 'linked') && isAnonymous === false) return 'חשבון שמור';
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
  isAnonymous = true,
  avatarPreference = DEFAULT_AVATAR_PREFERENCE,
} = {}) {
  const displayName = resolveProfileDisplayName({ typedName, stateName });
  const statusText = getProfileStatusText({ authStatus, hasAuthenticatedUid, isAnonymous });
  const authLabel = getProfilePanelAuthLabel({ authStatus, hasAuthenticatedUid, isAnonymous });
  const isLinkedAccount = Boolean((hasAuthenticatedUid || authStatus === 'linked') && isAnonymous === false);
  const safeAvatarPreference = sanitizeAvatarPreference(avatarPreference);

  return {
    displayName,
    statusText,
    authLabel,
    avatarPreference: safeAvatarPreference,
    avatarText: getAvatarPreferenceLabel(safeAvatarPreference),
    avatarOptions: AVATAR_PREFERENCE_OPTIONS.map(option => ({ ...option })),
    note: isLinkedAccount
      ? 'החשבון מחובר. בהמשך התקדמות תוכל להישמר בין מכשירים.'
      : 'כרגע אתה משחק כאורח. ההתקדמות קשורה לדפדפן או למכשיר הזה.',
    accountUpgradeTitle: 'שמור התקדמות',
    accountUpgradeBody: isLinkedAccount
      ? 'החשבון מחובר ל-Google. פרופיל האורח נשמר תחת אותו משתמש.'
      : 'חיבור מלא יאפשר בהמשך לשמור התקדמות בין מכשירים בלי לאבד את פרופיל האורח.',
    googleButtonText: isLinkedAccount ? 'חשבון Google מחובר' : 'חבר חשבון Google',
    googleButtonDisabled: isLinkedAccount || !hasAuthenticatedUid || authStatus === 'fallback',
    googleSetupNote: isLinkedAccount
      ? 'אין צורך בפעולה נוספת כרגע.'
      : 'אם החיבור לא זמין, אפשר להמשיך כאורח והמשחק לא ייחסם.',
    placeholderNote: 'הנתונים כאן הם מצייני מקום ולא נשמרים עדיין.',
    saveHint: hasAuthenticatedUid
      ? 'נשמרים רק שם ואווטאר בטוחים.'
      : 'בלי חיבור, השינוי נשמר מקומית.',
    progressPlaceholders: PROFILE_PANEL_PROGRESS_PLACEHOLDERS.map(item => ({ ...item })),
  };
}
