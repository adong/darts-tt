// TT Darts: the headless checks in Node, on the same js files the page uses (no browser, no Three.js).
//   node tools/check.js          every check: zones, 301, Around the Clock, CPU games, and that they can fail
//   node tools/check.js --fail   run the sabotaged checks (the board's numbers turned one place, a 301 bust that
//                                doesn't go back, a finish without a double) as if they were the real ones: must FAIL
//   node tools/check.js -v       print every case
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dir = path.join(__dirname, '..', 'js');
const ctx = vm.createContext({ console, Math, Date, JSON });
ctx.globalThis = ctx;
for (const f of ['rules.js', 'checks.js']) vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
const C = ctx.DT.checks;
const args = process.argv.slice(2);
const verbose = args.includes('-v');
const sab = args.includes('--fail');
const mark = (ok) => (ok ? 'ok  ' : 'FAIL');

const rep = C.run({ sabotage: sab });
const show = (name, list, line) => {
  const bad = list.filter((x) => !x.ok);
  console.log(`${mark(!bad.length)} ${name}: ${list.length - bad.length}/${list.length}`);
  for (const x of verbose ? list : bad.slice(0, 12)) console.log(`       ${x.ok ? '' : 'WRONG '}${line(x)}`);
  if (!verbose && bad.length > 12) console.log(`       ... and ${bad.length - 12} more`);
};
show('zones (both boards: every zone, both sides of every wire, every ring edge, bulls, off the board)', rep.zones, (z) => `${z.style} ${z.why}: want ${z.want}, got ${z.got}`);
show('301 (darts, busts that go back, EASY and NORMAL checkouts)', rep.x01, (x) => `${x.level} from ${x.from}: ${x.darts} -> want ${x.want}, got ${x.got}`);
show('Around the Clock (order, double and treble jumps, the bull)', rep.atc, (x) => `${x.why}: ${x.darts} -> want ${x.want}, got ${x.got}`);
show('CPU games (each ends, never below 0, wins obey the rules)', rep.games, (g) => `${g.style} ${g.level} ${g.mode} ${g.who}: ${g.ended}/${g.games} ended, ${g.bad} broken, ${g.avgDarts} darts a game (most ${g.most})`);
if (verbose || true) for (const g of rep.games) if (g.ok && !verbose) { /* summary below */ }
const avg = (f) => rep.games.filter(f).map((g) => `${g.who} ${g.avgDarts}`).join(', ');
console.log(`       darts per game: kids 301 easy ${avg((g) => g.style === 'kids' && g.mode === 'x01' && g.level === 'easy')}; classic 301 normal ${avg((g) => g.style === 'classic' && g.mode === 'x01' && g.level === 'normal')}; kids ATC ${avg((g) => g.style === 'kids' && g.mode === 'atc' && g.level === 'easy')}`);

if (sab) {
  console.log(rep.ok ? '\nThe sabotaged checks PASSED: the checks are broken.' : '\nAs expected, the sabotaged checks FAIL: the checks can fail.');
  process.exit(rep.ok ? 1 : 0);
}
console.log(`${mark(rep.fail.ok)} the checks can fail: numbers turned one place -> ${rep.fail.zonesWrong} zones wrong; 301 without the bust rule and the double -> ${rep.fail.x01Wrong} cases wrong, ${rep.fail.gamesWrong} game sets broken`);
console.log(`\n${rep.ok ? 'ALL CHECKS PASS' : 'SOME CHECKS FAILED'} (${rep.seconds.toFixed(1)} s)`);
process.exit(rep.ok ? 0 : 1);
