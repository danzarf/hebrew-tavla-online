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

export function chooseBestDoubleFor(state, color = state.computerColor) {
  let bestDouble = 1;
  let bestScore = -Infinity;
  for (let die = 1; die <= 6; die++) {
    const remaining = [die, die, die, die];
    const seq = chooseBestSequenceFor(state, color, remaining, false, true);
    const st = simulateSequence(state, color, seq);
    const score = evaluate(st, color, seq) + doubleChoiceScore(state, st, color, seq, die);
    if (score > bestScore) {
      bestScore = score;
      bestDouble = die;
    }
  }
  return bestDouble;
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
  if (m.die === 6 || m.die === 'free') s += moveProgress(st, m, color) * 4;
  s += backCheckerMoveBonus(st, m, color);
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
  return s;
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
  if (st.off[color] >= 15) score += 100000;
  if (st.off[opp] >= 15) score -= 100000;
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
    if (m.hit) score += 65 + tacticalHitScore(st, m, color);
    if (m.to === 'off') score += 90;
    if (m.from === 'bar') score += 45;
    if (m.to !== 'off' && countColorAt(st, m.to, color) >= 2) score += 18;
  }
  score += sequenceTempoScore(st, color, seq);
  score += distributionScore(st, color);
  return score;
}

export function doubleChoiceScore(before, after, color, seq, die) {
  let score = 0;
  if (after.off[color] >= 15) score += 200000;
  score += seq.length * 12;
  score += die === 6 ? escapedBackCheckers(before, after, color) * 55 : 0;
  score += escapedBackCheckers(before, after, color) * 18;
  score += madePointDelta(before, after, color) * 28;
  score += (pipCount(before, color) - pipCount(after, color)) * 2.2;
  return score;
}

export function sequenceTempoScore(st, color, seq) {
  let score = 0;
  for (const m of seq) {
    const progress = moveProgress(st, m, color);
    score += progress * 5;
    if (m.die === 6 || m.die === 'free') score += Math.max(0, progress) * 2;
    score += backCheckerMoveBonus(st, m, color);
    if (progress < 0) score += progress * 18;
  }
  if (seq.length >= 4 && seq.every((m) => m.die === 6)) score += 35;
  return score;
}

export function moveProgress(st, move, color) {
  if (move.from === 'bar') return 25 - pipDistanceFromPoint(move.to, color);
  if (move.to === 'off') return pipDistanceFromPoint(move.from, color);
  if (move.from < 1 || move.from > 24 || move.to < 1 || move.to > 24) return 0;
  return pipDistanceFromPoint(move.from, color) - pipDistanceFromPoint(move.to, color);
}

export function pipDistanceFromPoint(point, color) {
  return color === WHITE ? point : 25 - point;
}

export function backCheckerMoveBonus(st, move, color) {
  if (move.from === 'bar') return 38;
  if (move.from < 1 || move.from > 24) return 0;
  const fromBack = isBackPoint(move.from, color);
  const toBack = move.to !== 'off' && isBackPoint(move.to, color);
  if (!fromBack) return 0;
  let score = 35;
  if (!toBack) score += 45;
  if (move.die === 6) score += 22;
  if (countColorAt(st, move.from, color) === 1) score += 18;
  return score;
}

export function isBackPoint(point, color) {
  return color === WHITE ? point >= 19 : point <= 6;
}

export function escapedBackCheckers(before, after, color) {
  let beforeBack = 0, afterBack = 0;
  for (let p = 1; p <= 24; p++) {
    if (!isBackPoint(p, color)) continue;
    beforeBack += countColorAt(before, p, color);
    afterBack += countColorAt(after, p, color);
  }
  return beforeBack - afterBack;
}

export function madePointDelta(before, after, color) {
  let delta = 0;
  for (let p = 1; p <= 24; p++) {
    const was = countColorAt(before, p, color) >= 2;
    const is = countColorAt(after, p, color) >= 2;
    if (!was && is) delta++;
    if (was && !is) delta--;
  }
  return delta;
}

export function tacticalHitScore(st, move, color) {
  if (!move.hit || move.to === 'off') return 0;
  let score = 90;
  const madePoint = countColorAt(st, move.to, color) >= 2;
  if (madePoint) score += 150;
  else score -= 45;
  if (isHomePoint(move.to, color)) score += 30;
  if (move.from !== 'bar' && countColorAt(st, move.from, color) === 0) score -= 15;
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
