export function createLobbyHelpers({ els, state, escapeHtml }) {
  function localPlayerId() {
    let id = localStorage.getItem('tavlaPlayerId');
    if (!id) {
      id = 'p_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('tavlaPlayerId', id);
    }
    return id;
  }

  function localPlayerName() {
    const raw = (els.playerNameInput?.value || '').trim();
    return raw || ('אורח ' + String(Math.floor(100 + Math.random() * 900)));
  }

  function renderLobby(room = {}) {
    const p = room.players || {}, r = room.ready || {};
    state.playerNames = { human: p.human?.name || 'שחקן 1', computer: p.computer?.name || 'מחכה לחבר' };
    state.onlineReady = { human: !!r.human, computer: !!r.computer };
    if (!els.roomLobby) return;
    els.roomLobby.style.display = 'block';
    els.roomCodeDisplay.textContent = state.roomCode || '----';
    els.roomPlayers.innerHTML = `<div class="playerLine"><span>שחקן 1</span><b>${escapeHtml(state.playerNames.human)}</b><span>${r.human ? '✅ מוכן' : '⏳ לא מוכן'}</span></div><div class="playerLine"><span>שחקן 2</span><b>${escapeHtml(state.playerNames.computer)}</b><span>${r.computer ? '✅ מוכן' : '⏳ לא מוכן'}</span></div>`;
    const myReady = !!r[state.localActor];
    els.readyBtn.textContent = myReady ? '✅ מוכן' : '✅ אני מוכן';
    els.roomStatusText.textContent = (p.human && p.computer) ? ((r.human && r.computer) ? 'שניכם מוכנים — מתחילים...' : 'שניכם בחדר. תלחצו אני מוכן.') : 'מחכים לשחקן נוסף...';
  }

  return {
    localPlayerId,
    localPlayerName,
    renderLobby,
  };
}
