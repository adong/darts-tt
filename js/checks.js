/* TT Darts: the headless checks (game.check() in the page, node tools/check.js in Node). No Three.js.
   - zones: every number in every ring on both boards, both sides of every wire (around and across), the bulls, the
     edge of the doubles and the edge of the board.
   - 301: a table of darts with the score each should leave, busts that put the turn back, and the checkout rules
     for EASY and NORMAL.
   - Around the Clock: the order, the jumps for doubles and trebles, and the bull to finish.
   - games: hundreds of seeded CPU games in both modes and both levels; each one ends, the score never goes below 0,
     and every win obeys the rules.
   - can fail: the same checks with a sabotaged board (the numbers turned one place) and sabotaged 301 rules (a bust
     that doesn't go back, a finish without a double) must fail. */
(function (root) {
  'use strict';
  const DT = root.DT, R = DT.rules;

  const hit = (label) => {
    if (label === 'BULL') return { num: 25, mult: 2, score: 50, ring: 'bull', label };
    if (label === '25') return { num: 25, mult: 1, score: 25, ring: 'outerBull', label };
    if (label === 'MISS') return { num: 0, mult: 0, score: 0, ring: 'miss', label };
    const m = /^([TD]?)(\d+)$/.exec(label);
    const mult = m[1] === 'T' ? 3 : m[1] === 'D' ? 2 : 1, num = +m[2];
    return { num, mult, score: num * mult, ring: mult === 3 ? 'treble' : mult === 2 ? 'double' : 'outer', label };
  };

  // ---------------------------------------------------------------- the zones
  function zones(sab) {
    const out = [];
    const opts = sab ? { order: R.ORDER.slice(1).concat(R.ORDER[0]) } : null;
    for (const style of ['kids', 'classic']) {
      const B = R.BOARDS[style], RR = B.R;
      const want = (x, y, label, why) => {
        const got = R.score(style, x, y, opts);
        out.push({ style, why, want: label, got: got.label, ok: got.label === label });
      };
      // the middle of every zone
      R.ORDER.forEach((n, i) => {
        for (const [ring, pre] of [['inner', ''], ['treble', 'T'], ['outer', ''], ['double', 'D']]) {
          const p = R.spot(style, n, ring);
          want(p.x, p.y, pre + n, `${ring} ${n}`);
        }
        // both sides of the wire after this number (clockwise), at three radii
        const next = R.ORDER[(i + 1) % 20];
        for (const r of [(B.outer + B.trebleIn) / 2, (B.trebleIn + B.trebleOut) / 2, (B.doubleIn + 1) / 2]) {
          const pre = r > B.doubleIn ? 'D' : r > B.trebleIn && r < B.trebleOut ? 'T' : '';
          for (const [d, nn] of [[-0.35, n], [0.35, next]]) {
            const a = ((i * 18 + 9 + d) * Math.PI) / 180;
            want(Math.sin(a) * r * RR, Math.cos(a) * r * RR, pre + nn, `wire ${n}|${next} ${d < 0 ? 'before' : 'after'} at ${r.toFixed(3)}R`);
          }
        }
        // across: just inside and just outside every ring edge, along this number's middle
        const a = (i * 18 * Math.PI) / 180, e = 0.004;
        const at = (r, label, why) => want(Math.sin(a) * r * RR, Math.cos(a) * r * RR, label, `${why} ${n}`);
        at(B.outer + e, String(n), 'just outside the 25 ring');
        at(B.trebleIn - e, String(n), 'just inside the trebles');
        at(B.trebleIn + e, 'T' + n, 'just in the trebles');
        at(B.trebleOut - e, 'T' + n, 'trebles, outer edge');
        at(B.trebleOut + e, String(n), 'just outside the trebles');
        at(B.doubleIn - e, String(n), 'just inside the doubles');
        at(B.doubleIn + e, 'D' + n, 'just in the doubles');
        at(1 - e, 'D' + n, 'doubles, outer edge');
        at(1 + e, 'MISS', 'just off the doubles');
        at(B.face + 0.05, 'MISS', 'off the board');
      });
      want(0, 0, 'BULL', 'dead centre');
      want(B.bull * RR * 0.95, 0, 'BULL', 'bull, edge');
      want(0, -B.bull * RR * 1.05, '25', 'just outside the bull');
      want(-B.outer * RR * 0.97, 0, '25', '25 ring, edge');
      if (R.score(style, B.R * B.face * 0.99, 0).ring !== 'miss') out.push({ style, why: 'the number ring is on the board, not the wall', want: 'miss', got: R.score(style, B.R * B.face * 0.99, 0).ring, ok: false });
    }
    return out;
  }

  // ---------------------------------------------------------------- 301
  // [level, left before the turn, darts, left after, what happened]
  const X01_CASES = [
    ['normal', 301, ['T20', 'T20', 'T20'], 121, 'play'],
    ['normal', 301, ['20', '1', '5'], 275, 'play'],
    ['normal', 301, ['MISS', 'MISS', 'MISS'], 301, 'play'],
    ['normal', 32, ['D16'], 0, 'win'],
    ['normal', 32, ['16', 'D8'], 0, 'win'],
    ['normal', 32, ['16', '16'], 32, 'bust'], // 0, but not with a double
    ['normal', 32, ['20', '13'], 32, 'bust'], // past 0
    ['normal', 60, ['20', '20', 'T20'], 60, 'bust'], // the two good darts go back too
    ['normal', 2, ['1'], 2, 'bust'], // leaves 1: can't finish on a double
    ['normal', 3, ['1'], 2, 'play'],
    ['normal', 3, ['1', 'D1'], 0, 'win'],
    ['normal', 50, ['BULL'], 0, 'win'], // the bullseye counts as a double
    ['normal', 25, ['25'], 25, 'bust'], // the outer bull doesn't
    ['normal', 40, ['D20'], 0, 'win'],
    ['normal', 40, ['T20'], 40, 'bust'],
    ['normal', 170, ['T20', 'T20', 'BULL'], 0, 'win'],
    ['easy', 32, ['16', '16'], 0, 'win'],
    ['easy', 32, ['20', '13'], 0, 'win'], // going past 0 wins on EASY
    ['easy', 2, ['1'], 1, 'play'],
    ['easy', 1, ['MISS', '1'], 0, 'win'],
    ['easy', 25, ['25'], 0, 'win'],
    ['easy', 301, ['T20', 'T20', 'T20'], 121, 'play'],
  ];
  function x01(sab) {
    const out = [];
    const opts = sab ? { noRevert: true, anyOut: true } : null;
    for (const [level, left, darts, wantLeft, wantWhat] of X01_CASES) {
      const rules = R.X01[level];
      const t = R.x01Turn(left);
      let what = 'play';
      for (const d of darts) {
        const r = R.x01Dart(t, hit(d), rules, opts);
        if (r.bust) { what = 'bust'; break; }
        if (r.win) { what = 'win'; break; }
      }
      out.push({ level, from: left, darts: darts.join(' '), want: `${wantWhat} ${wantLeft}`, got: `${what} ${t.left}`, ok: what === wantWhat && t.left === wantLeft });
    }
    // every finishing dart a NORMAL checkout suggests really finishes
    for (let left = 2; left <= 50; left++) {
      const co = R.checkout(left);
      if (!co) continue;
      const t = R.x01Turn(left);
      const r = R.x01Dart(t, hit(co.ring === 'bull' ? 'BULL' : 'D' + co.num), R.X01.normal, opts);
      out.push({ level: 'normal', from: left, darts: `checkout ${co.ring === 'bull' ? 'BULL' : 'D' + co.num}`, want: 'win 0', got: `${r.win ? 'win' : r.bust ? 'bust' : 'play'} ${t.left}`, ok: r.win && t.left === 0 });
    }
    return out;
  }

  // ---------------------------------------------------------------- Around the Clock
  function atc() {
    const out = [];
    const run = (darts, wantTarget, wantWin, why) => {
      let target = 1, win = false;
      for (const d of darts) { const r = R.atcDart(target, hit(d)); target = r.target; if (r.win) { win = true; break; } }
      out.push({ why, darts: darts.join(' '), want: `${wantWin ? 'win' : 'target ' + wantTarget}`, got: `${win ? 'win' : 'target ' + target}`, ok: win === wantWin && (win || target === wantTarget) });
    };
    run(['1', '2', '3'], 4, false, 'in order');
    run(['2', '1', '3'], 2, false, 'the wrong number does nothing');
    run(['D1'], 3, false, 'a double jumps 2');
    run(['T1', 'T4'], 7, false, 'a treble jumps 3');
    run(Array.from({ length: 20 }, (_, i) => String(i + 1)), 21, false, '1 to 20: now the bull');
    run(Array.from({ length: 20 }, (_, i) => String(i + 1)).concat(['20', 'BULL']), 0, true, 'then the bull wins');
    run(Array.from({ length: 20 }, (_, i) => String(i + 1)).concat(['25']), 0, true, 'the outer bull wins too');
    run(Array.from({ length: 18 }, (_, i) => String(i + 1)).concat(['T19']), 21, false, 'a treble never jumps past the bull');
    run(['25', 'BULL'], 1, false, 'the bull does nothing before 20');
    return out;
  }

  // ---------------------------------------------------------------- whole CPU games
  function games(sab) {
    const out = [];
    const opts = sab ? { noRevert: true, anyOut: true } : null;
    for (const style of ['kids', 'classic']) {
      for (const level of ['easy', 'normal']) {
        for (const mode of ['x01', 'atc']) {
          for (const who of ['foxy', 'froggy']) {
            let ended = 0, darts = 0, bad = 0, most = 0;
            const N = 60;
            for (let g = 0; g < N; g++) {
              const rand = R.rng(1000 + g * 7 + (level === 'easy' ? 1 : 2) + (mode === 'atc' ? 3 : 0) + (style === 'kids' ? 0 : 5));
              const rules = R.X01[level];
              let left = R.X01.start, target = 1, win = false, n = 0;
              while (!win && n < 600) {
                const t = R.x01Turn(left);
                for (let d = 0; d < 3 && !win; d++) {
                  const th = R.cpuThrow(style, who, mode, { left: t.left, target }, rules, rand);
                  const h = R.score(style, th.x, th.y);
                  n++;
                  if (mode === 'atc') { const r = R.atcDart(target, h); target = r.target; win = r.win; continue; }
                  const r = R.x01Dart(t, h, rules, opts);
                  if (t.left < 0) bad++;
                  if (r.win) {
                    win = true;
                    // a NORMAL win must land exactly on 0 with a double (or the bullseye)
                    if (level === 'normal' && !(t.start - t.darts.reduce((s, x) => s + x.score, 0) === 0 && h.mult === 2)) bad++;
                    if (level === 'easy' && t.start - t.darts.reduce((s, x) => s + x.score, 0) > 0) bad++;
                  }
                  if (r.bust) {
                    if (level !== 'normal') bad++;
                    if (t.left !== t.start) bad++; // a bust puts the whole turn back
                    break;
                  }
                }
                left = t.left;
              }
              if (win) ended++;
              darts += n;
              most = Math.max(most, n);
            }
            out.push({ style, level, mode, who, games: N, ended, bad, avgDarts: +(darts / N).toFixed(1), most, ok: ended === N && bad === 0 });
          }
        }
      }
    }
    return out;
  }

  function run(opts) {
    const t0 = Date.now();
    const sab = !!(opts && opts.sabotage);
    const rep = { zones: zones(sab), x01: x01(sab), atc: atc(), games: games(sab) };
    rep.zonesOk = rep.zones.every((z) => z.ok);
    rep.x01Ok = rep.x01.every((z) => z.ok);
    rep.atcOk = rep.atc.every((z) => z.ok);
    rep.gamesOk = rep.games.every((z) => z.ok);
    rep.ok = rep.zonesOk && rep.x01Ok && rep.atcOk && rep.gamesOk;
    if (!sab) {
      // the same checks, sabotaged, must fail; otherwise they aren't checking anything
      const f = { zones: zones(true), x01: x01(true), games: games(true) };
      rep.fail = {
        zonesWrong: f.zones.filter((z) => !z.ok).length,
        x01Wrong: f.x01.filter((z) => !z.ok).length,
        gamesWrong: f.games.filter((z) => !z.ok).length,
      };
      rep.fail.ok = rep.fail.zonesWrong > 0 && rep.fail.x01Wrong > 0 && rep.fail.gamesWrong > 0;
      rep.ok = rep.ok && rep.fail.ok;
    }
    rep.seconds = (Date.now() - t0) / 1000;
    return rep;
  }

  DT.checks = { run, zones, x01, atc, games, hit };
})(typeof window !== 'undefined' ? window : globalThis);
