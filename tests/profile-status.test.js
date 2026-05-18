import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getProfileChipTone,
  getProfileStatusText,
  resolveProfileDisplayName,
} from '../src/ui/profileStatus.js';

test('resolveProfileDisplayName prefers typed nickname and sanitizes it', () => {
  assert.equal(resolveProfileDisplayName({ typedName: '  דנה\nהאלופה  ', stateName: 'אורח 123' }), 'דנה האלופה');
});

test('resolveProfileDisplayName uses room/guest name and avoids the local you label', () => {
  assert.equal(resolveProfileDisplayName({ stateName: 'אורח 456' }), 'אורח 456');
  assert.equal(resolveProfileDisplayName({ stateName: 'אתה' }), 'אורח');
});

test('profile status text never exposes uid details', () => {
  assert.equal(getProfileStatusText({ authStatus: 'authenticated', hasAuthenticatedUid: true }), 'אורח מחובר');
  assert.equal(getProfileStatusText({ authStatus: 'linked', hasAuthenticatedUid: true, isAnonymous: false }), 'חשבון שמור');
  assert.equal(getProfileStatusText({ authStatus: 'initializing' }), 'מתחבר כאורח');
  assert.equal(getProfileStatusText({ authStatus: 'fallback' }), 'אורח מקומי');
});

test('profile chip tone reflects connected, loading, and fallback states', () => {
  assert.equal(getProfileChipTone({ authStatus: 'authenticated' }), 'connected');
  assert.equal(getProfileChipTone({ authStatus: 'linked' }), 'connected');
  assert.equal(getProfileChipTone({ authStatus: 'initializing' }), 'loading');
  assert.equal(getProfileChipTone({ authStatus: 'fallback' }), 'fallback');
});
