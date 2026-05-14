const PIP_POS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

export function createRenderHelpers({
  els,
  state,
  callbacks,
  dependencies,
}) {
  const {
    onPointClick,
    onBarClick,
    onOffClick,
  } = callbacks;
  const {
    canHumanRoll,
    canEndCurrentTurn,
    isOnline,
    localActor,
    actorName,
    actorColor,
    otherActor,
    getLegalMovesForSource,
    pipCount,
    escapeHtml,
    HEB_COLOR,
    HEB_DIFF,
    HEB_MODE,
    WHITE,
    BLACK,
    TOP_POINTS,
    BOTTOM_POINTS,
  } = dependencies;

  function buildBoard() {
    [...TOP_POINTS, ...BOTTOM_POINTS].forEach((p, idx) => {
      const div = document.createElement('div'); div.className = 'point ' + (TOP_POINTS.includes(p) ? 'top' : 'bottom') + ' ' + (idx % 2 ? 'green' : 'red'); div.dataset.point = p;
      const top = TOP_POINTS.includes(p); const order = top ? TOP_POINTS.indexOf(p) : BOTTOM_POINTS.indexOf(p); let col = order < 6 ? order + 1 : order + 2;
      div.style.gridColumn = col; div.style.gridRow = top ? '1' : '3';
      div.innerHTML = `<span class="pointLabel">${p}</span>`;
      div.addEventListener('click', () => onPointClick(p));
      els.inner.appendChild(div);
    });
    els.bar.addEventListener('click', onBarClick);
    els.offWhite.addEventListener('click', () => onOffClick(WHITE));
    els.offBlack.addEventListener('click', () => onOffClick(BLACK));
    [els.die1, els.die2].forEach(renderEmptyDie);
  }

  function renderEmptyDie(el) { el.innerHTML = ''; for (let i = 0; i < 9; i++) { const p = document.createElement('span'); p.className = 'pip'; el.appendChild(p); } }
  function setDie(el, n) {
    if (!el.children.length) renderEmptyDie(el);
    [...el.children].forEach((c, i) => c.classList.toggle('on', (PIP_POS[n] || []).includes(i)));
  }
  function setDice(d) { setDie(els.die1, d[0] || 0); setDie(els.die2, d[1] || 0); }

  function renderBoard() {
    document.querySelectorAll('.point').forEach(pt => {
      pt.classList.remove('highlight', 'selected');
      [...pt.querySelectorAll('.piece,.countBadge')].forEach(n => n.remove());
      const p = +pt.dataset.point; const v = state.board[p]; if (!v) return;
      const color = v > 0 ? WHITE : BLACK; const count = Math.abs(v); const max = Math.min(count, 5);
      for (let i = 0; i < max; i++) {
        const piece = document.createElement('div'); piece.className = 'piece ' + color; piece.dataset.color = color; piece.dataset.p = p; piece.style.setProperty('--i', i); piece.addEventListener('click', e => { e.stopPropagation(); onPointClick(p); }); pt.appendChild(piece);
      }
      if (count > 5) { const badge = document.createElement('div'); badge.className = 'countBadge'; badge.textContent = count; pt.appendChild(badge); }
    });
    state.legalChoices.forEach(m => {
      if (m.to === 'off') { (m.color === WHITE ? els.offWhite : els.offBlack).classList.add('highlight'); } else { const pt = document.querySelector(`.point[data-point="${m.to}"]`); if (pt) pt.classList.add('highlight'); }
    });
    document.querySelectorAll('.point').forEach(pt => {
      const p = +pt.dataset.point; if (state.selected && state.selected.type === 'point' && state.selected.p === p) pt.classList.add('selected');
    });
    els.bar.classList.toggle('selected', state.selected && state.selected.type === 'bar');
    els.bar.classList.toggle('highlight', state.legalChoices.some(m => m.to === 'bar'));
    els.offWhite.classList.remove('highlight'); els.offBlack.classList.remove('highlight');
    state.legalChoices.forEach(m => { if (m.to === 'off') (m.color === WHITE ? els.offWhite : els.offBlack).classList.add('highlight'); });
    renderBar(); renderOff(); setDice(state.dice);
    els.diceDock.classList.toggle('clickable', canHumanRoll());
    const dice = state.dice || [];
    const sortedDice = [...dice].sort((a, b) => a - b).join('-');
    els.diceDock.classList.remove('rollFxFree', 'rollFxChoice', 'rollFxBad', 'rollFxDouble');
    if (state.freeMode) els.diceDock.classList.add('rollFxFree');
    else if (state.chosenDouble) els.diceDock.classList.add('rollFxChoice');
    else if (state.status === 'blocked' && sortedDice === '1-2') els.diceDock.classList.add('rollFxBad');
    else if (state.doubleExtra) els.diceDock.classList.add('rollFxDouble');
  }

  function renderBar() {
    function stack(el, color, count) {
      el.innerHTML = ''; const mini = Math.min(count, 3); for (let i = 0; i < mini; i++) { const m = document.createElement('div'); m.className = 'barMini ' + color; el.appendChild(m); }
      if (count > 0) { const c = document.createElement('div'); c.className = 'barCount'; c.textContent = count; el.appendChild(c); }
    }
    stack(els.barWhite, WHITE, state.bar.white); stack(els.barBlack, BLACK, state.bar.black);
  }

  function renderOff() {
    els.offWhite.querySelector('.num').textContent = state.off.white;
    els.offBlack.querySelector('.num').textContent = state.off.black;
    if (els.pipWhite) els.pipWhite.textContent = pipCount(state, WHITE);
    if (els.pipBlack) els.pipBlack.textContent = pipCount(state, BLACK);
  }

  function renderUI() {
    const local = localActor(); const localTurn = state.currentActor === local;
    let turnText = '';
    if (state.status === 'setup') turnText = 'בחר משחק חדש';
    else if (state.status === 'opening') turnText = 'גלגולת פתיחה';
    else if (state.status === 'lobby') turnText = 'מחכים לשחקנים';
    else if (state.status === 'lastChance') turnText = 'הזדמנות אחרונה';
    else if (state.gameOver) turnText = 'המשחק הסתיים';
    else if (isOnline()) turnText = localTurn ? (state.status === 'waitingRoll' ? 'תורך — גלגל' : 'תורך') : `תור של ${actorName(state.currentActor)}`;
    else if (state.currentActor === 'human') turnText = state.status === 'waitingRoll' ? 'תורך — גלגל' : 'תורך';
    else turnText = state.status === 'waitingRoll' ? 'תור המחשב — מגלגל' : 'תור המחשב';
    els.turnPill.textContent = turnText;
    if (isOnline()) {
      const mine = actorColor(local), opp = actorColor(otherActor(local));
      els.colorPill.textContent = `אתה: ${actorName(local)} (${HEB_COLOR[mine]}) | יריב: ${actorName(otherActor(local))} (${HEB_COLOR[opp]})`;
    } else els.colorPill.textContent = `אתה: ${HEB_COLOR[state.humanColor]} | מחשב: ${HEB_COLOR[state.computerColor]}`;
    els.dicePill.textContent = state.dice[0] && state.dice[1] ? `קוביות: ${state.dice[0]}–${state.dice[1]}` : 'קוביות: —';
    let sp = 'מצב רגיל'; if (state.freeMode) sp = '5–6: שתי תנועות חופשיות'; else if (state.chosenDouble) sp = '4–5: דאבל נבחר'; else if (state.doubleExtra) sp = 'דאבל רגיל: תור נוסף';
    if (isOnline()) sp += ` | חדר ${state.roomCode}`; els.specialPill.textContent = sp;
    els.difficultyInfo.textContent = isOnline() ? 'חבר אונליין' : HEB_DIFF[state.difficulty]; els.modeInfo.textContent = HEB_MODE[state.diceMode];
    els.barInfo.textContent = `לבן: ${state.bar.white} | שחור: ${state.bar.black}`;
    els.offInfo.textContent = `לבן: ${state.off.white}/15 | שחור: ${state.off.black}/15`;
    els.remainingMoves.innerHTML = state.remaining.length ? state.remaining.map(m => `<span class="moveChip ${m === 'free' ? 'free' : ''}">${m === 'free' ? 'חופשי' : m}</span>`).join('') : '<span style="opacity:.75">—</span>';
    els.rollBtn.disabled = !canHumanRoll(); els.undoBtn.disabled = !(state.currentActor === local && state.status === 'humanMoving' && state.undoStack.length > 0 && !state.gameOver);
    els.endBtn.disabled = !canEndCurrentTurn();
    if (els.reactionCard) els.reactionCard.style.display = isOnline() ? 'block' : 'none';
    if (state.countdown > 0) { els.countdownInfo.style.display = 'block'; els.countdownText.textContent = `התור יסתיים בעוד ${state.countdown}...`; } else { els.countdownInfo.style.display = 'none'; }
  }

  return {
    buildBoard,
    renderEmptyDie,
    setDie,
    setDice,
    renderBoard,
    renderBar,
    renderOff,
    renderUI,
  };
}
