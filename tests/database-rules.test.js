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
