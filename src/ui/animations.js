import { createSoundManager } from './sounds.js';

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
  const soundManager = createSoundManager();
  let victoryBannerTimer = null;
  let lastChanceResultTimer = null;
  let rollFeedbackTimer = null;

  function playSound(type = 'move') {
    soundManager.play(type);
  }

  function preloadRollSounds() {
    soundManager.preload(['roll']);
  }

  function isSoundMuted() {
    return soundManager.isMuted();
  }

  function toggleSoundMuted() {
    return soundManager.toggleMuted();
  }

  function getPlaceCenter(place, color, before) {
    let el = null;
    if (place === 'bar' || (place && place.type === 'bar')) el = els.bar;
    else if (place === 'off') el = color === defaultColor ? els.offWhite : els.offBlack;
    else { const p = typeof place === 'number' ? place : place.p; const pieces = [...document.querySelectorAll(`.piece[data-p="${p}"][data-color="${color}"]`)]; el = pieces[pieces.length - 1] || document.querySelector(`.point[data-point="${p}"]`); }
    const r = (el || els.board).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function flyPiece(color, start, end, hit = false, options = {}) {
    return new Promise(resolve => {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const distance = Math.hypot(dx, dy);
      const speedMultiplier = options.speedMultiplier || 1;
      const minMs = options.minMs || 240;
      const maxMs = options.maxMs || 440;
      const baseFlightMs = Math.min(maxMs, Math.max(minMs, 210 + distance * .14));
      const flightMs = Math.round(baseFlightMs * speedMultiplier);
      const f = document.createElement('div');
      f.className = 'floatingPiece ' + color;
      f.style.left = `${start.x}px`;
      f.style.top = `${start.y}px`;
      f.style.setProperty('--dx', `${dx}px`);
      f.style.setProperty('--dy', `${dy}px`);
      f.style.setProperty('--flight-ms', `${flightMs}ms`);
      f.style.transform = 'translate(-50%,-50%) scale(1)';
      document.body.appendChild(f);
      requestAnimationFrame(() => f.classList.add('inFlight'));
      setTimeout(() => { if (hit) els.board.classList.add('hitFlash'); }, Math.max(70, flightMs * .55));
      setTimeout(() => {
        f.style.opacity = '0';
        if (hit) els.board.classList.remove('hitFlash');
        playSound(hit ? 'hit' : 'move');
        setTimeout(() => { f.remove(); resolve(); }, 120);
      }, flightMs + 40);
    });
  }

  function dicePerspectiveClass(actor) {
    if (!actor) return 'dicePerspectiveCenter';
    return actor === localActor() ? 'dicePerspectiveOwn' : 'dicePerspectiveOpponent';
  }

  const DICE_SCRAMBLE_FRAMES = [
    [1, 6], [3, 4], [5, 2], [6, 1], [2, 5], [4, 3],
  ];

  function deterministicRollingDice(finalDice, frame) {
    const a = finalDice?.[0] || 1;
    const b = finalDice?.[1] || 6;
    const preset = DICE_SCRAMBLE_FRAMES[frame % DICE_SCRAMBLE_FRAMES.length];
    return [
      ((preset[0] + a + frame - 2) % 6) + 1,
      ((preset[1] + b + frame * 2 - 2) % 6) + 1,
    ];
  }

  function rollFeedbackClass(finalDice) {
    const sortedDice = [...(finalDice || [])].sort((a, b) => a - b).join('-');
    if (sortedDice === '5-6') return 'rollFxFreeBurst';
    if (sortedDice === '4-5') return 'rollFxChoiceBurst';
    if (sortedDice === '1-2') return 'rollFxBadBurst';
    if (finalDice && finalDice[0] && finalDice[0] === finalDice[1]) return 'rollFxDoubleBurst';
    return '';
  }

  function flashRollFeedback(finalDice) {
    const fx = rollFeedbackClass(finalDice);
    if (!fx || !els.diceDock || !els.board) return;
    const fxClasses = ['rollFxFreeBurst', 'rollFxChoiceBurst', 'rollFxBadBurst', 'rollFxDoubleBurst'];
    els.diceDock.classList.remove(...fxClasses);
    els.board.classList.remove(...fxClasses);
    void els.diceDock.offsetWidth;
    els.diceDock.classList.add(fx);
    els.board.classList.add(fx);
    clearTimeout(rollFeedbackTimer);
    rollFeedbackTimer = setTimeout(() => {
      els.diceDock.classList.remove(fx);
      els.board.classList.remove(fx);
    }, 1250);
  }

  function rollDiceVisual(finalDice, duration = 980, options = {}) {
    return new Promise(resolve => {
      const actor = options.actor || state.currentActor;
      const perspectiveClass = options.perspectiveClass || dicePerspectiveClass(actor);
      const perspectiveClasses = ['dicePerspectiveOwn', 'dicePerspectiveOpponent', 'dicePerspectiveCenter'];
      const clampedDuration = Math.max(720, Math.min(1800, duration));
      const settleAt = Math.max(220, clampedDuration - 230);
      if (options.sound !== false) playSound('roll');
      els.diceDock.classList.remove(...perspectiveClasses, 'settling');
      els.diceDock.style.setProperty('--dice-roll-ms', `${clampedDuration}ms`);
      els.diceDock.classList.add('rolling', perspectiveClass);
      let frame = 0;
      setDice(deterministicRollingDice(finalDice, frame));
      const iv = setInterval(() => {
        frame += 1;
        setDice(deterministicRollingDice(finalDice, frame));
      }, 74);
      const settleTimer = setTimeout(() => {
        els.diceDock.classList.add('settling');
      }, settleAt);
      setTimeout(() => {
        clearInterval(iv);
        clearTimeout(settleTimer);
        setDice(finalDice);
        if (options.commitFinal !== false) state.dice = finalDice;
        els.diceDock.classList.remove('rolling', 'settling');
        flashRollFeedback(finalDice);
        resolve();
      }, clampedDuration);
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
    await rollDiceVisual(state.dice?.[0] && state.dice?.[1] ? state.dice : [1, 1], 1500, { actor: actorForColor(lc.winner), commitFinal: false });
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
    preloadRollSounds,
    isSoundMuted,
    toggleSoundMuted,
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
