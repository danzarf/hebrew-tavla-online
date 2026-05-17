import { getProfileStatusText, resolveProfileDisplayName } from './profileStatus.js';

export const PROFILE_PANEL_PROGRESS_PLACEHOLDERS = Object.freeze([
  Object.freeze({ label: 'משחקים', value: 'בקרוב' }),
  Object.freeze({ label: 'ניצחונות', value: 'בקרוב' }),
  Object.freeze({ label: 'הפסדים', value: 'בקרוב' }),
  Object.freeze({ label: 'רמה', value: 'בקרוב' }),
  Object.freeze({ label: 'מטבעות', value: 'בקרוב' }),
]);

export function getProfilePanelAuthLabel({ authStatus = 'initializing', hasAuthenticatedUid = false } = {}) {
  if (hasAuthenticatedUid || authStatus === 'authenticated') return 'מחובר כאורח';
  if (authStatus === 'fallback') return 'אורח מקומי';
  if (authStatus === 'signedOut') return 'מתחבר כאורח';
  return 'מתחבר כאורח';
}

export function buildProfilePanelViewModel({
  typedName = '',
  stateName = '',
  authStatus = 'initializing',
  hasAuthenticatedUid = false,
} = {}) {
  const displayName = resolveProfileDisplayName({ typedName, stateName });
  const statusText = getProfileStatusText({ authStatus, hasAuthenticatedUid });
  const authLabel = getProfilePanelAuthLabel({ authStatus, hasAuthenticatedUid });

  return {
    displayName,
    statusText,
    authLabel,
    avatarText: '👤',
    note: 'כדי לשמור התקדמות מכל מכשיר, התחברות מלאה תתווסף בהמשך.',
    placeholderNote: 'נתוני התקדמות הם מצייני מקום בלבד ולא נשמרים עדיין.',
    progressPlaceholders: PROFILE_PANEL_PROGRESS_PLACEHOLDERS.map(item => ({ ...item })),
  };
}
