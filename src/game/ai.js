import { applyMove, cloneState, getAllLegalMoves } from "./moves.js";
import { WHITE, countColorAt, otherColor } from "./rules.js";

export function chooseAiSequence(state, rnd) {
  const color = state.computerColor;
  if (state.difficulty === 'easy') {
    const seqs = generateSequences(cloneState(state), color, state.remaining.slice(), state.freeMode, 900, 20);
    if (!seqs.length) return [];
    return seqs[rnd(0, seqs.length - 1)];
  }
  return chooseBestSequenceFor(state, color, state.remaining, state.freeMode, false);
}

export function chooseBestSequenceFor(state, color, remaining, freeMode, quiet) {
  const limit = state.difficulty === 'hard' ? 4200 : 2200;
  const cap = state.difficulty === 'hard' ? 42 : 30;
  const seqs = generateSequences(cloneState(state), color, remaining.slice(), freeMode, limit, cap);
  if (!seqs.length) return [];
  let best = seqs[0], bestScore = -Infinity;
  for (const seq of seqs) {
    const st = simulateSequence(state, color, seq);
    let sc = evaluate(st, color, seq);
    if (state.difficulty === 'medium') sc += Math.random() * 24;
    if (sc > bestScore) { bestScore = sc; best = seq; }
  }
  return best;
}

export function generateSequences(st, color, remaining, freeMode, limit = 3000, cap = 38) {
  const result = [];
  function rec(cur, rem, seq) {
    if (result.length >= limit) return;
    if (!rem.length) { result.push(seq.slice()); return; }
    let moves = getAllLegalMoves(cur, color, rem, freeMode);
    if (!moves.length) { result.push(seq.slice()); return; }
    moves = dedupeMoves(moves);
    moves.sort((a, b) => quickMoveScore(cur, b, color) - quickMoveScore(cur, a, color));
    if (freeMode && moves.length > cap) moves = moves.slice(0, cap);
    if (!freeMode && moves.length > cap) moves = moves.slice(0, cap);
    for (const m of moves) {
      const next = cloneState(cur);
      const nm = { ...m };
      applyMove(next, nm);
      const nr = rem.slice();
      const idx = nr.indexOf(m.die);
      if (idx >= 0) nr.splice(idx, 1); else nr.shift();
      seq.push(nm);
      rec(next, nr, seq);
      seq.pop();
      if (result.length >= limit) return;
    }
  }
  rec(st, remaining.slice(), []);
  return result;
}

export function dedupeMoves(moves) {
  const seen = new Set(), out = [];
  for (const m of moves) {
    const k = `${m.from}|${m.to}|${m.die}`;
    if (!seen.has(k)) { seen.add(k); out.push(m); }
  }
  return out;
}

export function quickMoveScore(st, m, color) {
  let s = 0;
  if (m.to === 'off') s += 90;
  if (m.from === 'bar') s += 50;
  if (m.hit) s += 65;
  if (m.to !== 'off') {
    const own = countColorAt(st, m.to, color);
    if (own === 1) s += 36;
    if (own >= 2) s += 10;
    if (own >= 5) s -= 18;
  }
  if (m.from !== 'bar') {
    const left = countColorAt(st, m.from, color) - 1;
    if (left === 1) s -= 18;
    if (left === 0) s += 4;
  }
  return s + Math.random() * 3;
}

export function simulateSequence(globalState, color, seq) {
  const st = cloneState(globalState);
  for (const m of seq) {
    const nm = { ...m };
    applyMove(st, nm);
  }
  return st;
}

export function evaluate(st, color, seq) {
  const opp = otherColor(color);
  let score = 0;
  score += (st.off[color] - st.off[opp]) * 150;
  score += (st.bar[opp] - st.bar[color]) * 90;
  score -= pipCount(st, color) * 1.35;
  score += pipCount(st, opp) * .55;
  for (let p = 1; p <= 24; p++) {
    const own = countColorAt(st, p, color), op = countColorAt(st, p, opp);
    if (own) {
      if (own >= 2) score += 16 + Math.min(own, 5) * 2;
      if (own === 1) score -= blotPenalty(st, p, color);
      if (own > 5) score -= (own - 5) * 12;
      if (isHomePoint(p, color)) score += own * 2;
    }
    if (op >= 2) score -= 5;
  }
  for (const m of seq) {
    if (m.hit) score += 65;
    if (m.to === 'off') score += 90;
    if (m.from === 'bar') score += 45;
    if (m.to !== 'off' && countColorAt(st, m.to, color) >= 2) score += 18;
  }
  score += distributionScore(st, color);
  return score;
}

export function pipCount(st, color) {
  let sum = 0;
  for (let p = 1; p <= 24; p++) {
    const c = countColorAt(st, p, color);
    if (c) sum += c * (color === WHITE ? p : 25 - p);
  }
  sum += st.bar[color] * 25;
  return sum;
}

export function isHomePoint(p, color) {
  return color === WHITE ? p <= 6 : p >= 19;
}

export function blotPenalty(st, p, color) {
  let pen = 20;
  const opp = otherColor(color);
  for (let d = 1; d <= 6; d++) {
    const src = color === WHITE ? p - d : p + d;
    if (src >= 1 && src <= 24 && countColorAt(st, src, opp) > 0) pen += 8;
  }
  return pen;
}

export function distributionScore(st, color) {
  let occupied = 0, points = 0;
  for (let p = 1; p <= 24; p++) {
    const c = countColorAt(st, p, color);
    if (c) {
      occupied++;
      if (c >= 2) points++;
    }
  }
  return occupied * 2 + points * 8;
}
