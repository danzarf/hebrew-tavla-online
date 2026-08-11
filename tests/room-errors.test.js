import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRoomFirebaseErrorLog,
  getFirebaseRoomErrorCode,
  getRoomCreateErrorMessage,
} from '../src/firebase/roomErrors.js';

test('getFirebaseRoomErrorCode prefers Firebase error codes', () => {
  assert.equal(getFirebaseRoomErrorCode({ code: 'PERMISSION_DENIED' }), 'PERMISSION_DENIED');
});

test('getFirebaseRoomErrorCode detects permission denied messages', () => {
  assert.equal(getFirebaseRoomErrorCode({ message: 'Permission denied' }), 'permission-denied');
});

test('getRoomCreateErrorMessage exposes permission problems safely', () => {
  assert.equal(
    getRoomCreateErrorMessage({ code: 'permission-denied' }),
    'בעיה בפתיחת חדר: אין הרשאת Firebase לחדרים.',
  );
});

test('buildRoomFirebaseErrorLog keeps only safe diagnostic fields', () => {
  assert.deepEqual(
    buildRoomFirebaseErrorLog(
      { code: 'permission-denied', message: 'Permission denied' },
      {
        operation: 'createRoom',
        databaseURL: 'https://example.firebaseio.com',
        authStatus: 'authenticated',
        hasUid: true,
      },
    ),
    {
      operation: 'createRoom',
      databaseURL: 'https://example.firebaseio.com',
      authStatus: 'authenticated',
      hasUid: true,
      code: 'permission-denied',
      message: 'Permission denied',
    },
  );
});

