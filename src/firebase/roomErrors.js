const DEFAULT_ROOM_CREATE_ERROR = 'בעיה בפתיחת חדר. נסה שוב.';
const ROOM_PERMISSION_ERROR = 'בעיה בפתיחת חדר: אין הרשאת Firebase לחדרים.';
const ROOM_NETWORK_ERROR = 'בעיה בחיבור ל-Firebase. נסה שוב.';

export function getFirebaseRoomErrorCode(error) {
  const code = String(error?.code || '').trim();
  if (code) return code;

  const message = String(error?.message || '').toLowerCase();
  if (message.includes('permission_denied') || message.includes('permission denied')) {
    return 'permission-denied';
  }
  if (message.includes('network') || message.includes('failed to fetch')) {
    return 'network-error';
  }
  return '';
}

export function getRoomCreateErrorMessage(error) {
  const code = getFirebaseRoomErrorCode(error).toLowerCase();
  if (code.includes('permission')) return ROOM_PERMISSION_ERROR;
  if (code.includes('network') || code.includes('unavailable')) return ROOM_NETWORK_ERROR;
  return DEFAULT_ROOM_CREATE_ERROR;
}

export function buildRoomFirebaseErrorLog(error, context = {}) {
  return {
    operation: context.operation || 'room',
    databaseURL: context.databaseURL || '',
    authStatus: context.authStatus || 'unknown',
    hasUid: Boolean(context.hasUid),
    code: getFirebaseRoomErrorCode(error),
    message: String(error?.message || ''),
  };
}

