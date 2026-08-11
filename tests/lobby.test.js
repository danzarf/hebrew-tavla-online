import test from 'node:test';
import assert from 'node:assert/strict';

import { createLobbyHelpers } from '../src/ui/lobby.js';

function createLobbyHarness({ stateRoomCode = null } = {}) {
  const els = {
    playerNameInput: { value: 'Host' },
    roomLobby: { style: { display: 'none' } },
    roomCodeDisplay: { textContent: '' },
    roomPlayers: { innerHTML: '' },
    readyBtn: { textContent: '' },
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

  renderLobby({
    roomCode: '2218',
    players: { human: { name: 'Host' }, computer: null },
    ready: { human: false, computer: false },
  });

  assert.equal(els.roomLobby.style.display, 'block');
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
