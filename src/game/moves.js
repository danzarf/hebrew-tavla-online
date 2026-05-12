import { BLACK, SIGN, WHITE, countColorAt, isBlocked, oppCountAt, otherColor } from "./rules.js";

export function applyMove(st, move) {
  const color = move.color, opp = otherColor(color), sgn = SIGN[color];
  if (move.from === 'bar') st.bar[color]--; else st.board[move.from] -= sgn;
  if (move.to === 'off') { st.off[color]++; return; }
  const oc = oppCountAt(st, move.to, color);
  move.hit = false;
  if (oc === 1) { st.board[move.to] = 0; st.bar[opp]++; move.hit = true; }
  st.board[move.to] += sgn;
}

export function cloneState(st) { return { board: st.board.slice(), bar: { white: st.bar.white, black: st.bar.black }, off: { white: st.off.white, black: st.off.black } }; }

export function allInHome(st, color) {
  if (st.bar[color] > 0) return false;
  for (let p = 1; p <= 24; p++) { if (countColorAt(st, p, color) > 0) { if (color === WHITE && p > 6) return false; if (color === BLACK && p < 19) return false; } }
  return true;
}

export function canBearOff(st, color, from, dieVal) {
  if (!allInHome(st, color)) return false;
  if (color === WHITE) {
    if (from - dieVal === 0) return true;
    if (from - dieVal < 0) { for (let p = from + 1; p <= 6; p++) if (countColorAt(st, p, color) > 0) return false; return true; }
  } else {
    if (from + dieVal === 25) return true;
    if (from + dieVal > 25) { for (let p = 19; p < from; p++) if (countColorAt(st, p, color) > 0) return false; return true; }
  }
  return false;
}

export function barDest(color, dieVal) { return color === WHITE ? 25 - dieVal : dieVal; }

export function legalMovesForToken(st, color, token) {
  const free = token === 'free'; const moves = [];
  if (st.bar[color] > 0) {
    if (free) {
      const entryPoints = color === WHITE ? [24, 23, 22, 21, 20, 19] : [1, 2, 3, 4, 5, 6];
      for (const p of entryPoints) { if (!isBlocked(st, p, color)) moves.push({ color, from: 'bar', to: p, die: token, hit: oppCountAt(st, p, color) === 1, fromBar: true }); }
    }
    else { const p = barDest(color, token); if (!isBlocked(st, p, color)) moves.push({ color, from: 'bar', to: p, die: token, hit: oppCountAt(st, p, color) === 1, fromBar: true }); }
    return moves;
  }
  for (let p = 1; p <= 24; p++) {
    if (countColorAt(st, p, color) <= 0) continue;
    if (free) {
      for (let to = 1; to <= 24; to++) { if (to !== p && !isBlocked(st, to, color)) moves.push({ color, from: p, to, die: token, hit: oppCountAt(st, to, color) === 1 }); }
      if (allInHome(st, color)) moves.push({ color, from: p, to: 'off', die: token, bearOff: true });
    } else {
      const to = color === WHITE ? p - token : p + token;
      if (to >= 1 && to <= 24) { if (!isBlocked(st, to, color)) moves.push({ color, from: p, to, die: token, hit: oppCountAt(st, to, color) === 1 }); }
      else if (canBearOff(st, color, p, token)) moves.push({ color, from: p, to: 'off', die: token, bearOff: true });
    }
  }
  return moves;
}

export function uniqueTokens(remaining) { return [...new Set(remaining)]; }

export function getAllLegalMoves(st, color, remaining, freeMode) {
  let out = []; for (const t of uniqueTokens(remaining)) { out = out.concat(legalMovesForToken(st, color, t)); }
  return out;
}

export function getLegalMovesForSource(st, color, remaining, freeMode, src) {
  const all = getAllLegalMoves(st, color, remaining, freeMode);
  if (src.type === 'bar') return all.filter(m => m.from === 'bar');
  return all.filter(m => m.from === src.p);
}

export function sameMove(a, b) { return a.from === b.from && a.to === b.to && a.die === b.die; }
