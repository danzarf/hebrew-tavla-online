let messageTimer = null;

export function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export function renderLog(state, els) {
  els.log.innerHTML = state.log.map(i => `<div class="logItem ${i.type}">${escapeHtml(i.text)}</div>`).join('');
}

export function addLog(state, els, text, type = '') {
  state.log.unshift({ text, type, time: Date.now() });
  if (state.log.length > 120) state.log.length = 120;
  renderLog(state, els);
}

export function showMessage(els, text, ms = 1700) {
  els.msg.textContent = text;
  els.msg.classList.add('show');
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => els.msg.classList.remove('show'), ms);
}

export function logMove(state, els, who, move) {
  let from = move.from === 'bar' ? 'מהבר' : `מ־${move.from}`;
  let to = move.to === 'off' ? 'להוצאה' : `ל־${move.to}`;
  addLog(state, els, `${who} הזיז ${from} ${to}${move.die === 'free' ? ' (חופשי)' : ''}`);
  if (move.hit) addLog(state, els, `${who} אכל אבן`, 'danger');
  if (move.to === 'off') addLog(state, els, `${who} הוציא אבן`, 'special');
}

export function computerMoveText(move) {
  if (move.to === 'off') return move.from === 'bar' ? 'המחשב מוציא אבן' : 'המחשב מוציא אבן מ־' + move.from;
  if (move.from === 'bar') return `המחשב נכנס מהבר ל־${move.to}${move.hit ? ' ואוכל אבן' : ''}`;
  return `המחשב מזיז מ־${move.from} ל־${move.to}${move.hit ? ' ואוכל אבן' : ''}`;
}
