import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('lobby v3 uses viewport-bounded responsive shell instead of narrow fixed modal', () => {
  assert.match(html, /\.modal\.homeModal\{[^}]*width:min\(1040px,100%\)/);
  assert.match(html, /\.modal\.homeModal\{[^}]*max-height:calc\(100dvh/);
  assert.match(html, /\.modalOverlay\{[^}]*overflow:auto/);
  assert.match(html, /@media \(max-height:760px\) and \(min-width:760px\)/);
  assert.match(html, /@media \(max-width:760px\)/);
});

test('lobby social center has badges and bounded scrolling', () => {
  assert.match(html, /id="lobbyFriendsBadge"/);
  assert.match(html, /id="lobbyFriendsView"/);
  assert.match(html, /\.socialCenter\{[^}]*grid-template-columns:minmax\(260px,1fr\) minmax\(260px,1fr\)/);
  assert.match(html, /\.socialCenter\{[^}]*max-height:calc\(100dvh - 190px\)/);
  assert.match(html, /\.socialCenter\{[^}]*overflow:auto/);
});
