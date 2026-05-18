import { sanitizeDisplayName } from '../firebase/profile.js';

const DEFAULT_GUEST_NAME = 'אורח';
const LOCAL_HUMAN_LABEL = 'אתה';

export function resolveProfileDisplayName({ typedName = '', stateName = '', fallbackName = DEFAULT_GUEST_NAME } = {}) {
  const preferredName = String(typedName || '').trim() || (stateName === LOCAL_HUMAN_LABEL ? '' : stateName);
  return sanitizeDisplayName(preferredName, { fallbackName });
}

export function getProfileStatusText({ authStatus = 'initializing', hasAuthenticatedUid = false, isAnonymous = true } = {}) {
  if ((hasAuthenticatedUid || authStatus === 'linked') && isAnonymous === false) return 'חשבון שמור';
  if (hasAuthenticatedUid || authStatus === 'authenticated') return 'אורח מחובר';
  if (authStatus === 'initializing' || authStatus === 'signedOut') return 'מתחבר כאורח';
  return 'אורח מקומי';
}

export function getProfileChipTone({ authStatus = 'initializing', hasAuthenticatedUid = false } = {}) {
  if (hasAuthenticatedUid || authStatus === 'authenticated' || authStatus === 'linked') return 'connected';
  if (authStatus === 'fallback') return 'fallback';
  return 'loading';
}
