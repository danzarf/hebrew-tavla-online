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

  return {
    title: 'ששבש טורקי',
    displayName: safeDisplayName,
    avatarText: safeAvatarText,
    authLabel: String(authLabel || statusText || 'מתחבר כאורח'),
    statusText: String(statusText || authLabel || 'מתחבר כאורח'),
    accountSummary: isLinkedAccount
      ? `חשבון Google מחובר · ${safeDisplayName}`
      : 'אפשר להמשיך כאורח או לחבר Google.',
    guestButtonText: 'המשך כאורח',
    googleButtonText: isLinkedAccount
      ? 'חשבון Google מחובר'
      : googleLinkingEnabled ? 'חבר חשבון Google' : 'Google יופעל בקרוב',
    googleButtonDisabled: isLinkedAccount || !canTryGoogleLink,
    googleStatusClass: isLinkedAccount ? 'connected' : canTryGoogleLink ? 'ready' : 'muted',
    showConnectedBadge: isLinkedAccount,
    shouldSkipAccountChoice: isLinkedAccount,
    profileButtonText: 'הפרופיל שלי',
    progressNote: 'סטטיסטיקות, רמות ומטבעות יתווספו בהמשך.',
  };
}
