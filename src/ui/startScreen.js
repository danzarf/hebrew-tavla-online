export function buildStartHomeViewModel({
  displayName = 'אורח',
  avatarText = '👤',
  authLabel = 'מתחבר כאורח',
  statusText = 'מתחבר כאורח',
  isLinkedAccount = false,
  canTryGoogleLink = false,
  googleLinkingEnabled = false,
} = {}) {
  const safeDisplayName = String(displayName || '').trim() || 'אורח';
  const safeAvatarText = String(avatarText || '').trim() || '👤';
  const savedCopy = isLinkedAccount
    ? 'החשבון שמור ומחובר ל-Google.'
    : 'אפשר לשחק כאורח עכשיו. חיבור Google ישמור את הפרופיל בהמשך.';

  return {
    title: 'ששבש טורקי',
    displayName: safeDisplayName,
    avatarText: safeAvatarText,
    authLabel: String(authLabel || statusText || 'מתחבר כאורח'),
    statusText: String(statusText || authLabel || 'מתחבר כאורח'),
    saveSummary: savedCopy,
    guestButtonText: isLinkedAccount ? 'המשך למשחק' : 'המשך כאורח',
    googleButtonText: isLinkedAccount
      ? 'חשבון Google מחובר'
      : googleLinkingEnabled ? 'חבר חשבון Google' : 'Google יופעל בקרוב',
    googleButtonDisabled: isLinkedAccount || !canTryGoogleLink,
    googleStatusClass: isLinkedAccount ? 'connected' : canTryGoogleLink ? 'ready' : 'muted',
    showConnectedBadge: isLinkedAccount,
    profileButtonText: 'הפרופיל שלי',
    progressNote: 'סטטיסטיקות, רמות ומטבעות יתווספו בהמשך.',
  };
}
