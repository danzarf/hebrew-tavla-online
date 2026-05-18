const FRIENDLY_GOOGLE_LINK_ERROR = 'לא הצלחנו להתחבר כרגע, אפשר להמשיך כאורח.';
const LINKED_GOOGLE_MESSAGE = 'החשבון נשמר.';
const ALREADY_LINKED_MESSAGE = 'החשבון כבר שמור.';

export function isLinkedAuthUser(user) {
  return Boolean(user?.uid && user?.isAnonymous === false);
}

export function canLinkGuestToGoogle({ auth, user } = {}) {
  const currentUser = user || auth?.currentUser || null;
  return Boolean(auth && currentUser?.uid && currentUser.isAnonymous !== false);
}

export function getGoogleLinkFriendlyMessage(error) {
  const code = String(error?.code || '');

  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'החיבור בוטל, אפשר להמשיך כאורח.';
  }

  if (code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') {
    return 'חשבון Google הזה כבר מחובר לשחקן אחר. נשארים כאורח כדי לא לאבד את הפרופיל הנוכחי.';
  }

  if (code === 'auth/operation-not-allowed' || code === 'auth/configuration-not-found') {
    return 'התחברות Google עדיין לא זמינה כאן. אפשר להמשיך כאורח.';
  }

  return FRIENDLY_GOOGLE_LINK_ERROR;
}

export async function linkGuestToGoogle({
  auth,
  user = auth?.currentUser || null,
  GoogleAuthProvider,
  linkWithPopup,
  logger = console,
} = {}) {
  if (isLinkedAuthUser(user)) {
    return { ok: true, alreadyLinked: true, user, message: ALREADY_LINKED_MESSAGE };
  }

  if (!canLinkGuestToGoogle({ auth, user }) || !GoogleAuthProvider || !linkWithPopup) {
    return {
      ok: false,
      reason: 'unavailable',
      message: 'שמירת חשבון Google תהיה זמינה בקרוב. בינתיים אפשר להמשיך כאורח.',
    };
  }

  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters?.({ prompt: 'select_account' });
    const credential = await linkWithPopup(user, provider);
    const linkedUser = credential?.user || auth.currentUser || user;

    return { ok: true, user: linkedUser, message: LINKED_GOOGLE_MESSAGE };
  } catch (error) {
    logger?.warn?.('Google account linking failed; continuing with the anonymous guest account.', error);
    return {
      ok: false,
      reason: 'link-failed',
      error,
      message: getGoogleLinkFriendlyMessage(error),
    };
  }
}
