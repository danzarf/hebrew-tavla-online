import {
  AVATAR_PREFERENCE_OPTIONS,
  DEFAULT_AVATAR_PREFERENCE,
  RECOMMENDED_AVATAR_PREFERENCE_COUNT,
  getAvatarPreferenceLabel,
  sanitizeAvatarPreference,
} from '../firebase/profile.js';
import { getProfileStatusText, resolveProfileDisplayName } from './profileStatus.js';
import { formatPlayerStatsForProfile } from '../product/playerStats.js';

export const PROFILE_PANEL_PROGRESS_PLACEHOLDERS = Object.freeze(
  formatPlayerStatsForProfile(undefined, { showComingSoon: true }).items.map(item => Object.freeze({ ...item })),
);

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
  googleLinkingEnabled = false,
  avatarPreference = DEFAULT_AVATAR_PREFERENCE,
  trustedStats = null,
  hasTrustedStats = false,
  statsRefreshMessage = '',
  statsRefreshTone = '',
  statsLastCheckedAt = null,
  statsRefreshBusy = false,
} = {}) {
  const displayName = resolveProfileDisplayName({ typedName, stateName });
  const statusText = getProfileStatusText({ authStatus, hasAuthenticatedUid, isAnonymous });
  const authLabel = getProfilePanelAuthLabel({ authStatus, hasAuthenticatedUid, isAnonymous });
  const isLinkedAccount = Boolean((hasAuthenticatedUid || authStatus === 'linked') && isAnonymous === false);
  const canTryGoogleLink = Boolean(googleLinkingEnabled && hasAuthenticatedUid && authStatus !== 'fallback' && !isLinkedAccount);
  const safeAvatarPreference = sanitizeAvatarPreference(avatarPreference);
  const formattedTrustedStats = formatPlayerStatsForProfile(trustedStats || undefined, {
    showComingSoon: !hasTrustedStats,
  });

  return {
    displayName,
    statusText,
    authLabel,
    avatarPreference: safeAvatarPreference,
    avatarText: getAvatarPreferenceLabel(safeAvatarPreference),
    avatarOptions: AVATAR_PREFERENCE_OPTIONS.map(option => ({ ...option })),
    recommendedAvatarOptions: AVATAR_PREFERENCE_OPTIONS.slice(0, RECOMMENDED_AVATAR_PREFERENCE_COUNT).map(option => ({ ...option })),
    expandedAvatarOptions: AVATAR_PREFERENCE_OPTIONS.slice(RECOMMENDED_AVATAR_PREFERENCE_COUNT).map(option => ({ ...option })),
    hasMoreAvatars: AVATAR_PREFERENCE_OPTIONS.length > RECOMMENDED_AVATAR_PREFERENCE_COUNT,
    note: isLinkedAccount
      ? 'החשבון מחובר. בהמשך התקדמות תוכל להישמר בין מכשירים.'
      : 'כרגע אתה משחק כאורח. ההתקדמות קשורה לדפדפן או למכשיר הזה.',
    accountUpgradeTitle: 'שמור התקדמות',
    accountUpgradeBody: isLinkedAccount
      ? 'החשבון מחובר ל-Google. פרופיל האורח נשמר תחת אותו משתמש.'
      : 'חיבור מלא יאפשר בהמשך לשמור התקדמות בין מכשירים בלי לאבד את פרופיל האורח.',
    googleButtonText: isLinkedAccount
      ? 'חשבון Google מחובר'
      : googleLinkingEnabled ? 'שמור אורח עם Google' : 'Google יופעל בקרוב',
    googleButtonDisabled: !canTryGoogleLink,
    googleSetupNote: isLinkedAccount
      ? 'אין צורך בפעולה נוספת כרגע.'
      : googleLinkingEnabled
        ? 'אם החיבור נכשל, אפשר להמשיך כאורח והמשחק לא ייחסם.'
        : 'התחברות Google תופעל אחרי הגדרת Firebase והדומיין המורשה.',
    placeholderNote: formattedTrustedStats.note,
    statsRefreshActionText: statsRefreshBusy ? 'מרענן...' : 'רענן סטטיסטיקות',
    statsRefreshDisabled: statsRefreshBusy,
    statsRefreshMessage,
    statsRefreshTone: statsRefreshTone === 'warning' ? 'warning' : (statsRefreshTone === 'success' ? 'success' : ''),
    statsLastCheckedText: statsLastCheckedAt ? `בדיקה אחרונה: ${statsLastCheckedAt}` : '',
    saveHint: hasAuthenticatedUid
      ? 'נשמרים רק שם ואווטאר בטוחים.'
      : 'בלי חיבור, השינוי נשמר מקומית.',
    progressPlaceholders: formattedTrustedStats.items.map(item => ({ ...item })),
  };
}
