import test from 'node:test';
import assert from 'node:assert/strict';

import { createLobbyHelpers } from '../src/ui/lobby.js';

function createLobbyHarness({ stateRoomCode = null } = {}) {
  const els = {
    playerNameInput: { value: 'Host' },
    roomLobby: { style: { display: 'none' } },
    roomCodeDisplay: { textContent: '' },
    roomPlayers: { innerHTML: '' },
    readyBtn: { textContent: '', hidden: false },
    roomStatusText: { textContent: '' },
  };
  const state = {
    roomCode: stateRoomCode,
    localActor: 'human',
    playerNames: {},
    onlineReady: {},
  };
  const helpers = createLobbyHelpers({
    els,
    state,
    escapeHtml: (value) => String(value),
    getAuthenticatedUid: () => null,
  });

  return { els, state, ...helpers };
}

test('renderLobby shows a generated room code from room data before subscription state catches up', () => {
  const { els, renderLobby } = createLobbyHarness();
  els.readyBtn.hidden = true;

  renderLobby({
    roomCode: '2218',
    players: { human: { name: 'Host' }, computer: null },
    ready: { human: false, computer: false },
  });

  assert.equal(els.roomLobby.style.display, 'block');
  assert.equal(els.readyBtn.hidden, false);
  assert.equal(els.roomCodeDisplay.textContent, '2218');
  assert.notEqual(els.roomCodeDisplay.textContent, '----');
});

test('renderLobby keeps the placeholder only before a room code exists', () => {
  const { els, renderLobby } = createLobbyHarness();

  renderLobby({
    players: { human: { name: 'Host' }, computer: null },
    ready: { human: false, computer: false },
  });

  assert.equal(els.roomCodeDisplay.textContent, '----');
});

test('renderLobby prefers the subscribed state room code when available', () => {
  const { els, renderLobby } = createLobbyHarness({ stateRoomCode: '3344' });

  renderLobby({
    roomCode: '2218',
    players: { human: { name: 'Host' }, computer: null },
    ready: { human: false, computer: false },
  });

  assert.equal(els.roomCodeDisplay.textContent, '3344');
});

test('renderRoomCreating shows a visible loading state without a fake room code', () => {
  const { els, renderRoomCreating } = createLobbyHarness();

  renderRoomCreating();

  assert.equal(els.roomLobby.style.display, 'block');
  assert.equal(els.roomCodeDisplay.textContent, '');
  assert.equal(els.roomPlayers.innerHTML, '');
  assert.equal(els.readyBtn.hidden, true);
  assert.equal(els.roomStatusText.textContent, 'פותח חדר...');
});

test('renderRoomCreateError shows a visible retry error without a placeholder code', () => {
  const { els, renderRoomCreateError } = createLobbyHarness();

  renderRoomCreateError();

  assert.equal(els.roomLobby.style.display, 'block');
  assert.equal(els.roomCodeDisplay.textContent, '');
  assert.equal(els.roomPlayers.innerHTML, '');
  assert.equal(els.readyBtn.hidden, true);
  assert.equal(els.roomStatusText.textContent, 'בעיה בפתיחת חדר. נסה שוב.');
  assert.notEqual(els.roomCodeDisplay.textContent, '----');
});
