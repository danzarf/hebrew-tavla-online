export function createAnimationHelpers({
  els,
  state,
  die,
  setDice,
  showMessage,
  actorName,
  actorForColor,
  actorColor,
  localActor,
  otherActor,
  defaultColor,
}) {
  let audioCtx = null;
  let victoryBannerTimer = null;
  let lastChanceResultTimer = null;

  function playSound(type = 'move') {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
      const now = audioCtx.currentTime;
      const freq = { roll: 180, move: 330, hit: 120, win: 520, click: 260, swap: 95 }[type] || 260;
      o.type = type === 'hit' || type === 'swap' ? 'sawtooth' : 'sine'; o.frequency.setValueAtTime(freq, now);
      if (type === 'win') o.frequency.exponentialRampToValueAtTime(880, now + .22);
      g.gain.setValueAtTime(.0001, now); g.gain.exponentialRampToValueAtTime(type === 'hit' ? .12 : .07, now + .02); g.gain.exponentialRampToValueAtTime(.0001, now + (type === 'roll' ? .16 : .25));
      o.connect(g); g.connect(audioCtx.destination); o.start(now); o.stop(now + .3);
    } catch (e) { }
  }

  function getPlaceCenter(place, color, before) {
    let el = null;
    if (place === 'bar' || (place && place.type === 'bar')) el = els.bar;
    else if (place === 'off') el = color === defaultColor ? els.offWhite : els.offBlack;
    else { const p = typeof place === 'number' ? place : place.p; const pieces = [...document.querySelectorAll(`.piece[data-p="${p}"][data-color="${color}"]`)]; el = pieces[pieces.length - 1] || document.querySelector(`.point[data-point="${p}"]`); }
    const r = (el || els.board).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function flyPiece(color, start, end, hit = false) {
    return new Promise(resolve => {
      const f = document.createElement('div'); f.className = 'floatingPiece ' + color; f.style.left = (start.x) + 'px'; f.style.top = (start.y) + 'px'; f.style.transform = 'translate(-50%,-50%) scale(1)'; document.body.appendChild(f);
      requestAnimationFrame(() => { f.style.transform = `translate(${end.x - start.x - 0}px,${end.y - start.y - 0}px) translate(-50%,-50%) scale(1.04)` });
      setTimeout(() => { if (hit) els.board.classList.add('hitFlash'); }, 180);
      setTimeout(() => { f.style.opacity = '0'; if (hit) els.board.classList.remove('hitFlash'); setTimeout(() => { f.remove(); resolve(); }, 110) }, 480);
    });
  }

  function rollDiceVisual(finalDice, duration = 1100) {
    return new Promise(resolve => {
      els.diceDock.classList.add('rolling'); let t = 0; const iv = setInterval(() => { setDice([die(), die()]); t += 90; }, 90);
      setTimeout(() => { clearInterval(iv); setDice(finalDice); state.dice = finalDice; els.diceDock.classList.remove('rolling'); playSound('roll'); resolve(); }, duration);
    });
  }

  function showVictoryBanner(text) {
    if (!els.victoryBanner) return;
    els.victoryBanner.textContent = text;
    els.victoryBanner.classList.remove('show');
    void els.victoryBanner.offsetWidth;
    els.victoryBanner.classList.add('show');
    clearTimeout(victoryBannerTimer);
    victoryBannerTimer = setTimeout(() => els.victoryBanner.classList.remove('show'), 3800);
  }

  function showVictory(winnerColor = state.winnerColor, stolen = state.stolen) {
    if (!winnerColor) return;
    const actor = actorForColor(winnerColor);
    const text = `🏆 ${actorName(actor)} ניצח${stolen ? ' בירושלמי!' : '!'} 🎉`;
    showVictoryBanner(text);
    showMessage(text, 5000);
    playSound('win');
  }

  function flashLastChanceResult(ok) {
    els.diceDock.classList.remove('lcSuccess', 'lcFail');
    void els.diceDock.offsetWidth;
    els.diceDock.classList.add(ok ? 'lcSuccess' : 'lcFail');
    clearTimeout(lastChanceResultTimer);
    lastChanceResultTimer = setTimeout(() => els.diceDock.classList.remove('lcSuccess', 'lcFail'), 1700);
  }

  async function showRemoteLastChanceRolling(lc) {
    if (!lc || !lc.rollingId || state.lastChanceRollingSeen === lc.rollingId) return;
    state.lastChanceRollingSeen = lc.rollingId;
    showMessage(`${actorName(actorForColor(lc.winner))} מגלגל לירושלמי...`, 2200);
    await rollDiceVisual([die(), die()], 2200);
  }

  async function showLastChanceResult(lc) {
    if (!lc || !lc.resultId || state.lastChanceResultSeen === lc.resultId) return;
    state.lastChanceResultSeen = lc.resultId;
    if (lc.roll) state.dice = lc.roll;
    setDice(state.dice);
    const ok = lc.result === 'success';
    flashLastChanceResult(ok);
    const txt = ok ? `ירושלמי הצליח — ${actorName(actorForColor(lc.loser))} ניצח!` : `ירושלמי נכשל — ${actorName(actorForColor(lc.winner))} ניצח!`;
    showMessage(txt, 3800);
  }

  function showReaction(text, fromActor = localActor()) {
    const color = actorColor(fromActor) || defaultColor;
    const target = color === defaultColor ? els.reactionWhite : els.reactionBlack;
    if (!target) return;
    target.textContent = text;
    target.classList.remove('show');
    void target.offsetWidth;
    target.classList.add('show');
    clearTimeout(target._hideTimer);
    target._hideTimer = setTimeout(() => target.classList.remove('show'), 3200);
  }

  return {
    playSound,
    getPlaceCenter,
    flyPiece,
    rollDiceVisual,
    showVictoryBanner,
    showVictory,
    flashLastChanceResult,
    showRemoteLastChanceRolling,
    showLastChanceResult,
    showReaction,
  };
}
