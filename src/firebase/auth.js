export const LOCAL_GUEST_ID_KEY = 'tavlaPlayerId';

export function buildLocalGuestId(randomValue = Math.random(), nowValue = Date.now()) {
  const randomPart = String(randomValue).replace(/^0\./, '').slice(0, 11) || 'guest';
  return 'p_' + randomPart + Number(nowValue).toString(36);
}

export function readStoredGuestId(storage, key = LOCAL_GUEST_ID_KEY) {
  try {
    return storage?.getItem?.(key) || null;
  } catch {
    return null;
  }
}

export function writeStoredGuestId(storage, id, key = LOCAL_GUEST_ID_KEY) {
  try {
    storage?.setItem?.(key, id);
  } catch {
    // Storage can fail in private browsing or restricted embedded contexts.
  }
  return id;
}

export function getOrCreateLocalGuestId({
  storage = globalThis.localStorage,
  key = LOCAL_GUEST_ID_KEY,
  random = Math.random,
  now = Date.now,
} = {}) {
  const existing = readStoredGuestId(storage, key);
  if (existing) return existing;

  const id = buildLocalGuestId(random(), now());
  return writeStoredGuestId(storage, id, key);
}

export function getAuthenticatedUid(authState) {
  return authState?.uid || authState?.user?.uid || null;
}

export function resolvePlayerId({ authenticatedUid, localGuestId }) {
  return authenticatedUid || localGuestId;
}

export function createAuthFallbackSession(error = null) {
  return {
    ready: Promise.resolve(null),
    getUid: () => null,
    getStatus: () => 'fallback',
    getError: () => error,
    stop: () => {},
  };
}

export function startAnonymousAuth({
  firebaseApp,
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  onReady,
  onError,
  logger = console,
} = {}) {
  if (!firebaseApp || !getAuth || !signInAnonymously) {
    const error = new Error('Firebase Auth dependencies are not available');
    onError?.(error);
    return createAuthFallbackSession(error);
  }

  const state = {
    auth: null,
    user: null,
    uid: null,
    status: 'initializing',
    error: null,
    unsubscribe: null,
  };

  try {
    state.auth = getAuth(firebaseApp);

    if (onAuthStateChanged) {
      state.unsubscribe = onAuthStateChanged(
        state.auth,
        user => {
          state.user = user || null;
          state.uid = user?.uid || null;
          state.status = state.uid ? 'authenticated' : 'signedOut';
          if (state.uid) onReady?.(state.uid, state.user);
        },
        error => {
          state.error = error;
          state.status = 'fallback';
          logger?.warn?.('Firebase anonymous auth state listener failed; using local guest identity fallback.', error);
          onError?.(error);
        },
      );
    }

    const ready = signInAnonymously(state.auth)
      .then(credential => {
        state.user = credential?.user || state.auth.currentUser || null;
        state.uid = state.user?.uid || null;
        state.status = state.uid ? 'authenticated' : 'fallback';
        if (state.uid) onReady?.(state.uid, state.user);
        return state.uid;
      })
      .catch(error => {
        state.error = error;
        state.status = 'fallback';
        logger?.warn?.('Firebase anonymous auth failed; using local guest identity fallback.', error);
        onError?.(error);
        return null;
      });

    return {
      ready,
      getUid: () => state.uid,
      getStatus: () => state.status,
      getError: () => state.error,
      stop: () => {
        if (state.unsubscribe) state.unsubscribe();
        state.unsubscribe = null;
      },
    };
  } catch (error) {
    logger?.warn?.('Firebase anonymous auth could not start; using local guest identity fallback.', error);
    onError?.(error);
    return createAuthFallbackSession(error);
  }
}
