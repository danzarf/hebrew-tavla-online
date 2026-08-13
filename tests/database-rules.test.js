import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const rules = JSON.parse(readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8')).rules;

test('player match history is readable only by owner and client-write blocked', () => {
  const historyRule = rules.playerMatchHistory.$uid;
  assert.equal(historyRule['.read'], 'auth != null && auth.uid == $uid');
  assert.equal(historyRule['.write'], false);
});

test('trusted stats and debug output paths remain client-write blocked', () => {
  for (const path of [
    'recentMatches',
    'readableMatches',
    'debugLatestMatch',
    'debugLatestRealMatch',
    'debugLatestDiagnosticMatch',
    'debugMatchCounter',
  ]) {
    assert.equal(rules[path]['.write'], false, `${path} must remain server-only`);
  }

  assert.equal(rules.playerStats.$uid['.write'], false);
});

test('social derived paths are server-owned and scoped for reads', () => {
  assert.equal(rules.publicProfiles.$uid['.read'], 'auth != null');
  assert.equal(rules.publicProfiles.$uid['.write'], false);
  assert.equal(rules.friends.$uid['.read'], 'auth != null && auth.uid == $uid');
  assert.equal(rules.friends.$uid['.write'], false);
  assert.equal(rules.friendRequests.$targetUid['.read'], 'auth != null && auth.uid == $targetUid');
  assert.equal(rules.outgoingFriendRequests.$requesterUid['.read'], 'auth != null && auth.uid == $requesterUid');
  assert.equal(rules.friendRequests.$targetUid.$requesterUid['.write'], false);
  assert.equal(
    rules.friendRequests.$targetUid.$requesterUid['.read'],
    'auth != null && (auth.uid == $targetUid || auth.uid == $requesterUid)',
  );
});

test('social actions can only be created by the owning authenticated user', () => {
  const actionRule = rules.socialActions.$uid.$actionId;
  assert.match(actionRule['.write'], /auth\.uid == \$uid/);
  assert.match(actionRule['.write'], /newData\.child\('actorUid'\)\.val\(\) == auth\.uid/);
  assert.match(actionRule['.write'], /newData\.child\('targetUid'\)\.val\(\) != auth\.uid/);
  assert.equal(actionRule.actorUid['.validate'], 'newData.isString() && newData.val() == auth.uid');
  assert.match(actionRule.type['.validate'], /sendRequest/);
  assert.match(actionRule.type['.validate'], /removeFriend/);
  assert.match(actionRule.type['.validate'], /sendGameInvite/);
  assert.match(actionRule.type['.validate'], /acceptGameInvite/);
});

test('game invite inbox and outbox are owner-readable and server-written', () => {
  assert.equal(rules.gameInvites.$targetUid['.read'], 'auth != null && auth.uid == $targetUid');
  assert.equal(rules.gameInvites.$targetUid['.write'], false);
  assert.equal(rules.outgoingGameInvites.$senderUid['.read'], 'auth != null && auth.uid == $senderUid');
  assert.equal(rules.outgoingGameInvites.$senderUid['.write'], false);
});
