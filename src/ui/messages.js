export function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[c]));
}

export function renderLog(logEl, log) {
  logEl.innerHTML = log.map(i => `<div class="logItem ${i.type}">${escapeHtml(i.text)}</div>`).join('');
}

export function addLog(state, logEl, text, type = '') {
  state.log.unshift({ text, type, time: Date.now() });
  if (state.log.length > 120) state.log.length = 120;
  renderLog(logEl, state.log);
}

export function showMessage(messageEl, text, ms = 1700) {
  messageEl.textContent = text;
  messageEl.classList.add('show');
  clearTimeout(showMessage.t);
  showMessage.t = setTimeout(() => messageEl.classList.remove('show'), ms);
}

export function computerMoveText(move) {
  if (move.to === 'off') return move.from === 'bar' ? 'המחשב מוציא אבן' : 'המחשב מוציא אבן מ־' + move.from;
  if (move.from === 'bar') return `המחשב נכנס מהבר ל־${move.to}${move.hit ? ' ואוכל אבן' : ''}`;
  return `המחשב מזיז מ־${move.from} ל־${move.to}${move.hit ? ' ואוכל אבן' : ''}`;
}

export function logMove(addLogFn, who, move) {
  const from = move.from === 'bar' ? 'מהבר' : `מ־${move.from}`;
  const to = move.to === 'off' ? 'להוצאה' : `ל־${move.to}`;
  addLogFn(`${who} הזיז ${from} ${to}${move.die === 'free' ? ' (חופשי)' : ''}`);
  if (move.hit) addLogFn(`${who} אכל אבן`, 'danger');
  if (move.to === 'off') addLogFn(`${who} הוציא אבן`, 'special');
}
