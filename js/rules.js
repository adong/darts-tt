/* TT Darts: the rules, with no Three.js, so they also run in Node (tools/check.js).
   - The two boards and where every zone is: score(style, x, y) turns a point on the board face (metres from the
     middle, y up) into a number, a ring and points.
   - 301: what each dart does to the score, busts and the checkout (EASY: reach 0 or go past it; NORMAL: finish
     exactly on 0 with a double or the bullseye).
   - Around the Clock: hit 1, 2, 3 ... 20 in order, then the bull. A double jumps 2 numbers, a treble 3.
   - The aim's wobble, and where the CPU friends aim. */
(function (root) {
  'use strict';
  const DT = (root.DT = root.DT || {});

  // clockwise from the top, the order every dartboard uses
  const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

  // Ring edges as fractions of R, the outside of the double ring. CLASSIC is a regulation board (170 mm to the outside
  // of the doubles, bull 6.35 mm, outer bull 15.9 mm, trebles 99-107 mm, doubles 162-170 mm). KIDS is a big soft board
  // with fat rings and a big bull, for suction-cup darts. face: where the board itself ends (the number ring is on it).
  const BOARDS = {
    classic: { R: 0.17, bull: 6.35 / 170, outer: 15.9 / 170, trebleIn: 99 / 170, trebleOut: 107 / 170, doubleIn: 162 / 170, face: 225.5 / 170 },
    kids: { R: 0.42, bull: 0.08, outer: 0.18, trebleIn: 0.5, trebleOut: 0.62, doubleIn: 0.84, face: 1.2 },
  };

  // where a zone's middle is, as { x, y } in metres: ring 'treble', 'double', 'inner' (single, inside the trebles),
  // 'outer' (single, outside the trebles), 'bull', 'outerBull'
  function spot(style, num, ring) {
    const B = BOARDS[style];
    if (ring === 'bull') return { x: 0, y: 0 };
    if (ring === 'outerBull') return { x: 0, y: B.R * (B.bull + B.outer) / 2 };
    const r = { treble: (B.trebleIn + B.trebleOut) / 2, double: (B.doubleIn + 1) / 2, inner: (B.outer + B.trebleIn) / 2, outer: (B.trebleOut + B.doubleIn) / 2 }[ring];
    const a = (ORDER.indexOf(num) * 18 * Math.PI) / 180;
    return { x: Math.sin(a) * r * B.R, y: Math.cos(a) * r * B.R };
  }

  // What a dart at (x, y) scores. mult is 2 for doubles and the bullseye (the bullseye counts as a double for the
  // 301 checkout). A dart exactly on a wire belongs to the ring inside it.
  function score(style, x, y, opts) {
    const B = BOARDS[style];
    const order = (opts && opts.order) || ORDER;
    const r = Math.hypot(x, y) / B.R;
    if (r > B.face) return { num: 0, mult: 0, score: 0, ring: 'wall', label: 'MISS' };
    if (r > 1) return { num: 0, mult: 0, score: 0, ring: 'miss', label: 'MISS' };
    if (r <= B.bull) return { num: 25, mult: 2, score: 50, ring: 'bull', label: 'BULL' };
    if (r <= B.outer) return { num: 25, mult: 1, score: 25, ring: 'outerBull', label: '25' };
    let deg = (Math.atan2(x, y) * 180) / Math.PI; // clockwise from the top
    deg = (((deg + 9) % 360) + 360) % 360;
    const num = order[Math.min(19, Math.floor(deg / 18))];
    let mult = 1, ring = 'inner';
    if (r >= B.trebleIn && r <= B.trebleOut) { mult = 3; ring = 'treble'; }
    else if (r > B.trebleOut && r < B.doubleIn) ring = 'outer';
    else if (r >= B.doubleIn) { mult = 2; ring = 'double'; }
    return { num, mult, score: num * mult, ring, label: (mult === 3 ? 'T' : mult === 2 ? 'D' : '') + num };
  }

  // ---------------------------------------------------------------- 301
  // The rules for each level. EASY (Tommy): no busts, a dart that reaches 0 or goes past it wins. NORMAL (Teddy): the
  // real rules: finish exactly on 0 with a double or the bullseye; going past 0, leaving 1, or reaching 0 with any
  // other dart is a BUST, and the score goes back to what it was before this turn.
  const X01 = { start: 301, easy: { doubleOut: false, overWins: true }, normal: { doubleOut: true, overWins: false } };

  // one dart. turn = { start, left, darts: [] }; returns { left, bust, win } and updates turn.
  function x01Dart(turn, hit, rules, opts) {
    const sab = opts || {};
    turn.darts.push(hit);
    const after = turn.left - hit.score;
    let bust = false, win = false;
    if (rules.overWins) {
      if (after <= 0) win = true;
    } else if (after < 0 || (rules.doubleOut && after === 1)) bust = true;
    else if (after === 0) {
      if (rules.doubleOut && hit.mult !== 2 && !sab.anyOut) bust = true;
      else win = true;
    }
    if (bust) turn.left = sab.noRevert ? Math.max(0, after) : turn.start;
    else turn.left = Math.max(0, after);
    turn.bust = bust;
    turn.win = win;
    return { left: turn.left, bust, win };
  }
  const x01Turn = (left) => ({ start: left, left, darts: [], bust: false, win: false });

  // what a NORMAL player should aim for to finish from `left` with this dart (null: no single-dart finish)
  function checkout(left) {
    if (left === 50) return { num: 25, ring: 'bull' };
    if (left >= 2 && left <= 40 && left % 2 === 0) return { num: left / 2, ring: 'double' };
    return null;
  }

  // ---------------------------------------------------------------- Around the Clock
  // target 1..20, then 21 = the bull. Hit your number to move on; its double jumps 2, its treble 3 (never past the
  // bull). Either bull finishes.
  const BULL = 21;
  function atcDart(target, hit) {
    if (target >= BULL) return hit.num === 25 ? { target: BULL + 1, moved: 1, win: true } : { target, moved: 0, win: false };
    if (hit.num !== target) return { target, moved: 0, win: false };
    const next = Math.min(BULL, target + hit.mult);
    return { target: next, moved: next - target, win: false };
  }

  // ---------------------------------------------------------------- the aim's wobble
  // A slow, smooth wobble (as a fraction of R) that the player times his throw against. amp: how far it goes.
  function sway(t, amp, seed) {
    const s = seed || 0;
    const x = Math.sin(t * 1.31 + s) * 0.7 + Math.sin(t * 2.17 + s * 1.7) * 0.3;
    const y = Math.sin(t * 1.73 + s * 0.6 + 1.1) * 0.65 + Math.sin(t * 0.83 + s * 2.3) * 0.35;
    return { x: x * amp, y: y * amp };
  }
  // how far the aim wobbles, as a fraction of R, per level; the brother steadying your arm takes most of it away
  const SWAY = { easy: 0.13, normal: 0.2, steady: 0.25 };
  const swaySpeed = (level) => (level === 'normal' ? 1.4 : 1);

  // ---------------------------------------------------------------- the CPU friends
  // Foxy is steady and goes for the treble 20; Froggy wobbles more and goes for the big single 20. Both take the
  // checkout when there is one.
  const CPU = { foxy: { spread: 0.075, greedy: true }, froggy: { spread: 0.15, greedy: false } };
  function cpuTarget(style, who, mode, state, rules) {
    const c = CPU[who] || CPU.froggy;
    if (mode === 'atc') {
      if (state.target >= BULL) return spot(style, 25, 'bull');
      return spot(style, state.target, 'outer');
    }
    const left = state.left;
    if (rules.overWins) {
      if (left <= 20) return spot(style, 20, 'outer');
      if (left <= 50) return spot(style, 25, 'bull');
      return spot(style, 20, c.greedy ? 'treble' : 'outer');
    }
    const co = checkout(left);
    if (co) return co.ring === 'bull' ? spot(style, 25, 'bull') : spot(style, co.num, 'double');
    if (left <= 40) return spot(style, 1, 'outer'); // odd: take 1 to leave an even double
    if (left <= 60) return spot(style, Math.min(20, left - 40) || 20, 'outer'); // leave 40 (double 20)
    return spot(style, 20, c.greedy ? 'treble' : 'outer');
  }
  // a seeded random number source, so tests can replay games
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function gauss(r) { let u = 0, v = 0; while (u === 0) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function cpuThrow(style, who, mode, state, rules, rand) {
    const aim = cpuTarget(style, who, mode, state, rules);
    const s = (CPU[who] || CPU.froggy).spread * BOARDS[style].R;
    return { aim, x: aim.x + gauss(rand) * s, y: aim.y + gauss(rand) * s };
  }

  DT.rules = { ORDER, BOARDS, spot, score, X01, x01Dart, x01Turn, checkout, BULL, atcDart, sway, SWAY, swaySpeed, CPU, cpuTarget, cpuThrow, rng, gauss };
})(typeof window !== 'undefined' ? window : globalThis);
