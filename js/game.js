/* TT Darts: the game. The title (the board's look, 1 or 2 players, who's playing, EASY / NORMAL, the CPU friend),
   the two games (301 and Around the Clock), turns of three darts, aiming against the wobble (mouse, finger or keys),
   the CPU friends' throws, the brother's help, the HUD, the winner's dance, the results card, best scores, and
   window.game for tests. Load order: kit, title.js, rules.js, checks.js, friends.js, sfx.js, scene.js, props.js,
   buddy.js, game.js, keys.js, zh.js. */
(function () {
  'use strict';
  const DT = window.DT, R = DT.rules, SC = DT.scene, sfx = DT.sfx, buddy = DT.buddy, Snd = Kit.sound;
  const $ = (id) => document.getElementById(id);
  const store = {
    get(k, d) { try { const v = localStorage.getItem('ttDarts.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('ttDarts.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
  };
  const COLOR = { teddy: '#2a7bd6', tommy: '#ff8a1f', zoom: '#ff3d7f', luna: '#9b6bff', bolt: '#18d4ff', bruno: '#a0662b', zombie: '#6abf4b', foxy: '#ff5a1f', froggy: '#2fae4a' };
  const MODES = [
    { id: 'x01', name: '301', ic: '🎯', ds: 'Start at 301 and count down to 0.' },
    { id: 'atc', name: 'AROUND THE CLOCK', ic: '🕐', ds: 'Hit 1, 2, 3 … all the way to 20, then the bull!' },
  ];
  const CPUS = ['froggy', 'foxy', 'none'];
  const BASE = 0.62; // the players are drawn at about 62 % of the kit's 2 m
  const scaleOf = (id) => BASE * (id === 'tommy' ? 0.88 : 1);

  const G = {
    state: 'loading', style: 'kids', n: 1, slots: [{ id: 'teddy', level: 'easy' }, { id: 'tommy', level: 'easy' }], cpu: 'froggy', mode: 'x01',
    players: [], turn: 0, dart: 0, xt: null, aim: { x: 0, y: 0 }, swayT: 0, steady: false, held: false, autoPause: true, stateT: 0,
    wait: 0, glide: null, ptr: null, keys: {}, cast: {}, hinted: false, round: 1, wins: {}, cpuPlan: null, lastHit: null, fiveT: 0, celebT: 0,
    rand: R.rng(Date.now() & 0xffff), titleT: 0,
  };

  // ---------------------------------------------------------------- boot
  let ROSTER, thumbs;
  function boot() {
    SC.init($('game'));
    ROSTER = Kit.roster.list.filter((e) => !e.cpu && !e.scare);
    thumbs = Kit.portraits(Kit.roster.list);
    G.style = store.get('style', 'kids') === 'classic' ? 'classic' : 'kids';
    G.n = store.get('n', 1) === 2 ? 2 : 1;
    const sl = store.get('slots', null);
    if (Array.isArray(sl)) sl.forEach((s, i) => { if (s && Kit.roster.get(s.id) && i < 2) G.slots[i] = { id: s.id, level: s.level === 'normal' ? 'normal' : 'easy' }; });
    G.cpu = CPUS.includes(store.get('cpu', 'froggy')) ? store.get('cpu', 'froggy') : 'froggy';
    G.mode = store.get('mode', 'x01') === 'atc' ? 'atc' : 'x01';
    G.wins = store.get('wins', {}) || {};
    SC.setStyle(G.style);
    buddy.init({ toast, sfx, thrower: ochePos, base: () => BASE, help: buddyHelps });
    buildLogo();
    bindUi();
    bindInput();
    Kit.lang.onChange(() => { buildSlots(); buildModeCards(); updateHud(true); });
    toTitle();
    $('loading').classList.add('hidden');
    requestAnimationFrame(loop);
  }

  function buildLogo() {
    const t = window.DT_TITLE || 'TT Darts';
    const i = t.indexOf(' ');
    const l1 = i > 0 ? t.slice(0, i) : t, l2 = i > 0 ? t.slice(i + 1) : '';
    const tt = (s) => s.toUpperCase().replace(/TT/g, '<em>T</em><em>T</em>');
    $('logo').innerHTML = `<span class="l1">${tt(l1)}</span>` + (l2 ? `<span class="l2">${tt(l2)}</span>` : '');
  }

  // ---------------------------------------------------------------- where people stand
  const ochePos = () => ({ x: 0, z: SC.D() + 0.2 });
  const waitPos = (k) => ({ x: [-0.95, -1.55, -2.1][k % 3], z: SC.D() + [0.75, 0.55, 0.8][k % 3] });
  function personFor(id) {
    if (!G.cast[id]) G.cast[id] = SC.makePerson(Kit.roster.get(id), scaleOf(id));
    return G.cast[id];
  }
  function setCast(ids) {
    for (const id of Object.keys(G.cast)) if (!ids.includes(id)) { SC.removePerson(G.cast[id]); delete G.cast[id]; }
    ids.forEach(personFor);
  }

  // ---------------------------------------------------------------- the title
  const slotIds = () => (G.n === 2 ? [G.slots[0].id, G.slots[1].id] : G.cpu === 'none' ? [G.slots[0].id] : [G.slots[0].id, G.cpu]);
  function toTitle() {
    G.state = 'title';
    G.players = [];
    show('title');
    $('hud').classList.add('hidden');
    $('banner').classList.add('hidden');
    SC.setReticle(false);
    SC.setHand(null);
    SC.setGlow(null);
    SC.clearAll();
    buddy.dismiss(true);
    buildSlots();
    titleCast();
    SC.setCamera('title', { snap: true });
    Snd.music('title');
  }
  function titleCast() {
    const ids = slotIds();
    setCast(ids);
    ids.forEach((id, i) => {
      const pp = G.cast[id];
      pp.holder.visible = true;
      pp.walk = null;
      pp.holder.position.set(i === 0 ? -1.5 : -2.75, 0, SC.D() + (i === 0 ? 0.8 : -0.35));
      pp.mode = 'none';
      SC.facePoint(pp, 2.4, SC.D() + 4.2);
    });
  }
  function buildSlots() {
    const box = $('slots');
    box.innerHTML = '';
    const mk = (i) => {
      const cpu = G.n === 1 && i === 1;
      const id = cpu ? G.cpu : G.slots[i].id;
      const e = id === 'none' ? null : Kit.roster.get(id);
      const d = document.createElement('div');
      d.className = 'slot';
      d.dataset.id = id;
      d.innerHTML = `<div class="who">${cpu ? 'CPU FRIEND' : `PLAYER ${i + 1}`}</div>
        <div class="face"><button class="arrow" data-dir="-1" aria-label="${cpu ? 'Previous friend' : 'Previous player'}">◀</button>
        ${e ? `<img alt="" src="${thumbs[id] || ''}">` : '<span class="alone">🙂</span>'}
        <button class="arrow" data-dir="1" aria-label="${cpu ? 'Next friend' : 'Next player'}">▶</button></div>
        <div class="nm">${e ? e.name : 'NO ONE'}</div>
        ${cpu ? `<div class="cpu">${e ? (id === 'foxy' ? '🦊 STEADY' : '🐸 WOBBLY') : 'PLAY ALONE'}</div>` : `<div class="seg small" role="group" aria-label="How hard">
          <button data-level="easy" aria-pressed="${G.slots[i].level === 'easy'}">🐣 EASY</button>
          <button data-level="normal" aria-pressed="${G.slots[i].level === 'normal'}">🔥 NORMAL</button></div>`}`;
      d.querySelectorAll('.arrow').forEach((b) => b.addEventListener('click', () => { Snd.init(); sfx('click'); cycle(i, +b.dataset.dir); }));
      d.querySelectorAll('[data-level]').forEach((b) => b.addEventListener('click', () => { Snd.init(); sfx('click'); G.slots[i].level = b.dataset.level; saveSlots(); buildSlots(); }));
      box.appendChild(d);
    };
    mk(0);
    mk(1);
    document.querySelectorAll('#styleSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.style === G.style)));
    document.querySelectorAll('#playersSeg button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.n === G.n)));
  }
  function cycle(i, dir) {
    if (G.n === 1 && i === 1) {
      G.cpu = CPUS[(CPUS.indexOf(G.cpu) + dir + CPUS.length) % CPUS.length];
      store.set('cpu', G.cpu);
    } else {
      const ids = ROSTER.map((e) => e.id);
      let k = ids.indexOf(G.slots[i].id);
      do k = (k + dir + ids.length) % ids.length; while (G.n === 2 && ids[k] === G.slots[1 - i].id);
      G.slots[i].id = ids[k];
      saveSlots();
    }
    buildSlots();
    if (G.state === 'title') titleCast();
  }
  function saveSlots() { store.set('slots', G.slots); }
  function setStyle(st) {
    G.style = st;
    store.set('style', st);
    SC.setStyle(st);
    buildSlots();
    if (G.state === 'title') { titleCast(); SC.setCamera('title', { snap: true }); }
  }
  function setPlayers(n) {
    G.n = n;
    store.set('n', n);
    if (n === 2 && G.slots[1].id === G.slots[0].id) G.slots[1].id = Kit.roster.buddyFor(G.slots[0].id);
    buildSlots();
    if (G.state === 'title') titleCast();
  }

  function buildModeCards() {
    const box = $('modeCards');
    box.innerHTML = '';
    for (const m of MODES) {
      const b = document.createElement('button');
      b.className = 'mode';
      b.dataset.mode = m.id;
      b.innerHTML = `<span class="ic">${m.ic}</span><span class="nm">${m.name}</span><span class="ds">${m.ds}</span><span class="bs">${bestLine(m.id)}</span>`;
      b.addEventListener('click', () => { Snd.init(); sfx('click'); startMode(m.id); });
      box.appendChild(b);
    }
  }
  const bestKey = (mode, id, level) => `best.${G.style}.${mode}.${id}.${level}`;
  function bestLine(mode) {
    const ids = G.n === 2 ? [0, 1] : [0];
    return ids.map((i) => { const s = G.slots[i], b = store.get(bestKey(mode, s.id, s.level), 0); return b ? `${Kit.roster.get(s.id).name}'S BEST ${darts(b)}` : ''; }).filter(Boolean).join(' · ');
  }
  function showModes() { G.state = 'modes'; buildModeCards(); show('modes'); }

  // ---------------------------------------------------------------- starting a game
  function startMode(modeId) {
    G.mode = modeId;
    store.set('mode', modeId);
    const list = G.n === 2 ? [G.slots[0], G.slots[1]] : G.cpu === 'none' ? [G.slots[0]] : [G.slots[0], { id: G.cpu, level: G.slots[0].level, cpu: true }];
    G.players = list.map((s, i) => ({
      entry: Kit.roster.get(s.id), id: s.id, cpu: !!s.cpu, level: s.level, color: COLOR[s.id] || '#2a7bd6',
      left: R.X01.start, target: 1, darts: 0, turns: 0, aim: { x: 0, y: 0 }, i,
    }));
    if (G.players.length === 2 && G.players[0].color === G.players[1].color) G.players[1].color = '#ff3d7f';
    G.turn = 0;
    G.round = 1;
    G.celebT = 0;
    G.lastHit = null;
    G.winner = null;
    G.steady = false;
    G.pendingSteady = false;
    G.fiveT = 0;
    G.hinted = false;
    SC.clearAll();
    SC.setGlow(null);
    setCast(G.players.map((p) => p.id));
    G.players.forEach((p, k) => {
      const pp = G.cast[p.id];
      pp.holder.visible = true;
      pp.mode = 'none';
      const w = k === 0 ? ochePos() : waitPos(k - 1);
      pp.holder.position.set(w.x, 0, w.z);
      SC.facePoint(pp, 0, 0);
    });
    const human = G.players.find((p) => !p.cpu);
    buddy.setEntry(brothersPlaying() ? null : Kit.roster.get(Kit.roster.buddyFor(human.id)));
    show(null);
    $('hud').classList.remove('hidden');
    $('modeName').textContent = MODES.find((m) => m.id === modeId).name;
    buildHud();
    Snd.music('play');
    startTurn(0);
  }
  const darts = (n) => `${n} DART${n === 1 ? '' : 'S'}`;
  const brothersPlaying = () => G.players.some((p) => p.id === 'teddy' && !p.cpu) && G.players.some((p) => p.id === 'tommy' && !p.cpu);
  const cur = () => G.players[G.turn];
  const rulesFor = (p) => R.X01[p.level];

  function startTurn(i) {
    G.turn = i;
    const p = cur();
    G.dart = 0;
    G.xt = R.x01Turn(p.left);
    // the brother came while it wasn't your go: he steadies this turn
    G.steady = !!(G.pendingSteady && !p.cpu);
    if (G.steady) G.pendingSteady = false;
    G.state = 'intro';
    G.stateT = 0;
    SC.pullDarts();
    SC.setReticle(false);
    SC.setHand(null);
    // the thrower steps up to the line, everyone else waits to the side
    let k = 0;
    G.players.forEach((q) => {
      const pp = G.cast[q.id];
      pp.holder.visible = true;
      pp.mode = 'none';
      const w = q === p ? ochePos() : waitPos(k++);
      SC.walkTo(pp, w.x, w.z, 0.6);
    });
    G.wait = G.players.length > 1 || p.turns === 0 ? 1.15 : 0.5;
    SC.setCamera('side', { focus: ochePos(), dur: 0.6 });
    if (G.players.length > 1 || p.turns === 0) banner(`${p.entry.name}'S TURN`, turnLine(p));
    sfx('turn');
    updateHud(true);
  }
  function turnLine(p) {
    if (G.mode === 'atc') return p.target >= R.BULL ? 'NOW HIT THE BULL!' : `HIT THE ${p.target}`;
    return p.level === 'normal' ? 'FINISH ON A DOUBLE' : 'COUNT DOWN TO 0';
  }

  function beginAim() {
    const p = cur();
    $('banner').classList.add('hidden');
    const pp = G.cast[p.id];
    pp.walk = null;
    const o = ochePos();
    pp.holder.position.set(o.x, 0, o.z);
    SC.facePoint(pp, 0, 0);
    pp.holder.visible = false; // the camera is at his eyes now
    buddy.follow();
    SC.setCamera('aim', { dur: 0.55 });
    SC.setHand(p.entry, p.color);
    nextDart(true);
  }
  // get ready for the next dart (the first of a turn too)
  function nextDart(first) {
    const p = cur();
    G.state = p.cpu ? 'cpu' : 'aim';
    G.stateT = 0;
    G.ptr = null;
    SC.showHeld(true);
    const want = suggest(p);
    if (want && (p.level === 'easy' || p.cpu)) G.glide = { from: { ...G.aim }, to: want, t: 0 };
    else if (first) G.aim = { ...p.aim };
    hintGlow(p);
    if (p.cpu) planCpu(p);
    else if (!G.hinted) {
      G.hinted = true;
      const touch = matchMedia('(hover: none) and (pointer: coarse)').matches;
      toast(touch ? 'SLIDE YOUR FINGER TO AIM, LET GO TO THROW!' : 'MOVE THE MOUSE TO AIM, CLICK TO THROW!', 'hint');
    }
    if (first && !p.cpu && G.mode === 'x01' && p.level === 'normal') {
      const co = R.checkout(p.left);
      if (co) toast(co.ring === 'bull' ? `YOU NEED ${p.left}: GO FOR THE BULL!` : `YOU NEED ${p.left}: GO FOR DOUBLE ${co.num}!`, 'hint');
    }
    updateHud(true);
  }
  // where the aim drifts to on EASY (and for the CPU friends): the bull, your Around the Clock number, a checkout
  function suggest(p) {
    if (G.mode === 'atc') return p.target >= R.BULL ? R.spot(G.style, 25, 'bull') : R.spot(G.style, p.target, 'outer');
    if (p.level === 'normal') { const co = R.checkout(G.xt.left); return co ? (co.ring === 'bull' ? R.spot(G.style, 25, 'bull') : R.spot(G.style, co.num, 'double')) : null; }
    return R.spot(G.style, 25, 'bull');
  }
  function hintGlow(p) {
    if (G.mode === 'atc') SC.setGlow(p.target >= R.BULL ? 25 : p.target, p.target >= R.BULL ? 'outerBull' : 'all');
    else if (p.level === 'normal' && R.checkout(G.xt.left)) { const co = R.checkout(G.xt.left); SC.setGlow(co.num, co.ring); }
    else SC.setGlow(null);
  }

  // ---------------------------------------------------------------- the wobble and the throw
  const amp = (p) => (R.SWAY[p.level] || R.SWAY.easy) * (G.steady && !p.cpu ? R.SWAY.steady : 1);
  function wobble(p) { return R.sway(G.swayT, amp(p), p.i * 2.1); }
  // turn an aim and a wobble (fractions of R) into a hit: the same sum for the mouse, a finger, the keys and the checks
  function hitAt(aim, off) {
    const B = R.BOARDS[G.style];
    const x = aim.x + off.x * B.R, y = aim.y + off.y * B.R;
    const h = R.score(G.style, x, y);
    return Object.assign(h, { x, y });
  }
  function clampAim() {
    const B = R.BOARDS[G.style], m = B.R * B.face * 1.08, d = Math.hypot(G.aim.x, G.aim.y);
    if (d > m) { G.aim.x *= m / d; G.aim.y *= m / d; }
  }
  function throwNow(forced) {
    const p = cur();
    if (!p || (G.state !== 'aim' && G.state !== 'cpu')) return null;
    if (G.stateT < 0.25 && !forced) return null; // a beat after the last dart, so a double tap doesn't throw two
    const h = forced || hitAt(G.aim, wobble(p));
    G.state = 'flying';
    G.stateT = 0;
    G.glide = null;
    p.aim = { ...G.aim };
    SC.showHeld(false);
    SC.handThrow();
    sfx('throw');
    SC.throwDart(p.color, h, () => landed(h));
    return h;
  }
  function landed(h) {
    const p = cur();
    p.darts++;
    G.dart++;
    G.lastHit = h;
    const pos = SC.toScreen(h.x, h.y, 0.05);
    let what = 'play';
    if (h.ring === 'wall') sfx('wall'); else sfx('stick');
    if (G.mode === 'x01') {
      const r = R.x01Dart(G.xt, h, rulesFor(p));
      p.left = G.xt.left;
      what = r.win ? 'win' : r.bust ? 'bust' : 'play';
      pop(pos, h.label === 'MISS' ? 'MISS' : h.score === 0 ? 'MISS' : String(h.score), h.label);
    } else {
      const r = R.atcDart(p.target, h);
      if (r.win) what = 'win';
      if (r.moved) { p.target = r.target; sfx('next'); }
      pop(pos, r.win ? 'BULL!' : r.moved ? (r.moved > 1 ? `+${r.moved}!` : 'YES!') : h.label === 'MISS' ? 'MISS' : h.label, r.moved || r.win ? null : 'zero');
      if (r.moved > 1) toast(r.moved === 3 ? 'TREBLE! JUMP 3!' : 'DOUBLE! JUMP 2!');
    }
    if (h.ring === 'bull') { sfx('bull'); SC.sparkle(h.x, h.y, true); if (what !== 'win') toast('BULLSEYE!'); }
    else if (h.mult === 3) { sfx('treble'); SC.sparkle(h.x, h.y, false); }
    else if (h.mult === 2) sfx('double');
    if (G.mode === 'x01' && G.dart === 3 && what === 'play' && G.xt.darts.reduce((s, d) => s + d.score, 0) >= 100) toast(`${G.xt.darts.reduce((s, d) => s + d.score, 0)}!`, 'big');
    updateHud(true);
    if (what === 'win') return win(p);
    if (what === 'bust') {
      sfx('bust');
      banner('BUST!', p.level === 'normal' ? bustWhy(h) : '');
      return endTurn(1.6);
    }
    if (G.dart >= 3) return endTurn(1.0);
    G.state = 'gap';
    G.wait = 0.35;
  }
  function bustWhy(h) {
    const before = G.xt.start - G.xt.darts.slice(0, -1).reduce((s, d) => s + d.score, 0);
    const after = before - h.score;
    if (after < 0) return 'TOO MANY! BACK TO ' + G.xt.start;
    if (after === 1) return '1 LEFT CAN’T BE A DOUBLE! BACK TO ' + G.xt.start;
    return 'FINISH ON A DOUBLE! BACK TO ' + G.xt.start;
  }
  function endTurn(wait) {
    const p = cur();
    p.turns++;
    G.state = 'look';
    G.wait = wait;
    SC.setReticle(false);
    SC.setHand(null);
    if (!p.cpu && buddy.here() && !G.pendingSteady) buddy.goodbye();
    G.steady = false;
  }
  function afterLook() {
    const n = G.players.length;
    const nxt = (G.turn + 1) % n;
    if (nxt === 0) G.round++;
    sfx('pull');
    startTurn(nxt);
  }

  // ---------------------------------------------------------------- the CPU friends
  function planCpu(p) {
    const th = R.cpuThrow(G.style, p.id, G.mode, { left: G.xt.left, target: p.target }, rulesFor(p), G.rand);
    G.cpuPlan = th;
    G.glide = { from: { ...G.aim }, to: th.aim, t: 0 };
  }

  // ---------------------------------------------------------------- the brother
  function callBuddy() {
    if (!['aim', 'cpu', 'gap', 'flying', 'look', 'intro', 'five'].includes(G.state)) return;
    if (brothersPlaying()) return highFive();
    if (buddy.busy()) return;
    Snd.init();
    buddy.call();
    if (G.state === 'aim') {
      // watch him pop in from the front, then back to aiming
      G.state = 'buddy';
      G.stateT = 0;
      const pp = G.cast[cur().id];
      pp.holder.visible = true;
      SC.facePoint(pp, 0.4, SC.D() - 1.4);
      SC.setReticle(false);
      SC.handVisible(false);
      SC.setCamera('front', { focus: { x: 0.3, z: SC.D() + 0.25 }, dur: 0.45 });
    }
  }
  // after his hello: he holds your arm, and the wobble almost goes away for the rest of this turn
  function buddyHelps(name) {
    sfx('steady');
    const p = cur();
    if (p && !p.cpu && ['aim', 'gap', 'flying', 'buddy'].includes(G.state)) {
      G.steady = true;
      toast(`${name} SAYS: I'VE GOT YOUR ARM! NICE AND STEADY!`, 'buddy');
    } else {
      G.pendingSteady = true;
      toast(`${name} SAYS: I'LL STEADY YOUR NEXT GO!`, 'buddy');
    }
    if (G.state === 'buddy') {
      const pp = G.cast[cur().id];
      pp.holder.visible = false;
      SC.handVisible(true);
      SC.setCamera('aim', { dur: 0.45 });
      G.state = 'aim';
      G.stateT = 0.3;
    }
  }
  // both brothers are playing: T is a high five. While you aim, the camera turns round to watch it.
  function highFive() {
    if (G.fiveT > 0) return;
    Snd.init();
    G.fiveT = 1.4;
    sfx('five');
    toast('HIGH FIVE!', 'buddy');
    const me = cur(), other = G.players.find((p) => p !== me && (p.id === 'teddy' || p.id === 'tommy'));
    const a = G.cast[me.id], b = G.cast[other.id];
    a.mode = b.mode = 'wave';
    if (G.state === 'aim') {
      G.fiveFrom = G.state;
      G.state = 'five';
      a.holder.visible = true;
      SC.handVisible(false);
      SC.setReticle(false);
      const o = ochePos();
      SC.walkTo(b, o.x + 0.55, o.z + 0.05, 0.35);
      SC.facePoint(a, o.x + 0.55, o.z);
      SC.setCamera('front', { focus: { x: 0.28, z: o.z }, dur: 0.4 });
    }
  }
  function fiveDone() {
    G.players.forEach((q) => { if (G.state !== 'win') G.cast[q.id].mode = 'none'; });
    if (G.state !== 'five') return;
    const me = cur();
    let k = 0;
    G.players.forEach((q) => { if (q !== me) { const w = waitPos(k++); SC.walkTo(G.cast[q.id], w.x, w.z, 0.5); } });
    G.cast[me.id].holder.visible = false;
    SC.handVisible(true);
    SC.setCamera('aim', { dur: 0.4 });
    G.state = 'aim';
    G.stateT = 0.3;
  }

  // ---------------------------------------------------------------- winning
  function win(p) {
    G.state = 'win';
    G.stateT = 0;
    G.winner = p;
    SC.setReticle(false);
    SC.setHand(null);
    SC.setGlow(null);
    if (buddy.here()) buddy.goodbye();
    G.wins[p.id] = (G.wins[p.id] || 0) + 1;
    store.set('wins', G.wins);
    if (!p.cpu) {
      const k = bestKey(G.mode, p.id, p.level), b = store.get(k, 0);
      G.newBest = !b || p.darts < b;
      if (G.newBest) store.set(k, p.darts);
    } else G.newBest = false;
    const pp = G.cast[p.id];
    pp.holder.visible = true;
    pp.walk = null;
    const o = ochePos();
    pp.holder.position.set(o.x, 0, o.z);
    SC.setCamera('front', { focus: { x: 0, z: o.z }, dur: 0.8 });
    sfx('cheer');
    Snd.music('over');
    banner(G.players.length > 1 ? `${p.entry.name} WINS!` : 'YOU DID IT!', darts(p.darts));
    G.celebT = 0;
  }
  // the winner's signature move: Teddy's boxing or jump shot (taking turns), Tommy's Y, Foxy's wave, Froggy's hop
  function celebrate(dt) {
    const p = G.winner, pp = G.cast[p.id];
    G.celebT += dt;
    SC.facePoint(pp, SC.camera.position.x, SC.camera.position.z);
    if (G.celebT < dt * 1.5) {
      const sigs = p.entry.signature || ['wave'];
      const k = (G.wins[p.id] || 1) % sigs.length;
      pp.mode = sigs[k];
      if (pp.mode === 'jump' || pp.mode === 'jumpshot') pp.jump = 0.7;
      if (pp.mode === 'jumpshot') { const s = SC.emojiSprite('🏀', 0.2); s.position.set(pp.holder.position.x, 1.35 * pp.scale + 0.2, pp.holder.position.z); G.ball = { s, vy: 2.6, t: 0 }; }
      SC.burst(pp.holder.position.clone().setY(1.4), 120, { speed: 2.4, up: 3, size: 0.05, life: 3 });
    }
    if (G.ball) {
      G.ball.vy -= 6 * dt; G.ball.s.position.y += G.ball.vy * dt; G.ball.t += dt;
      if (G.ball.t > 1.4) { SC.removeObj(G.ball.s); G.ball = null; }
    }
    if (pp.mode === 'jump' && pp.jump <= 0 && G.celebT < 2.5) pp.jump = 0.7;
    if (Math.abs(G.celebT - 1.4) < dt) SC.burst(pp.holder.position.clone().setY(1.6), 80, { speed: 2, up: 2.6, size: 0.05, life: 2.6 });
    // the others clap along with a wave
    for (const q of G.players) if (q !== p) { const qq = G.cast[q.id]; qq.mode = 'wave'; SC.facePoint(qq, pp.holder.position.x, pp.holder.position.z); }
    if (G.celebT > 3.4) showCard();
  }

  function showCard() {
    G.state = 'over';
    $('banner').classList.add('hidden');
    const p = G.winner;
    $('cardTitle').textContent = G.players.length > 1 ? `${p.entry.name} WINS!` : 'YOU DID IT!';
    $('cardSub').textContent = MODES.find((m) => m.id === G.mode).name;
    const rows = G.players.map((q) => {
      const where = G.mode === 'x01' ? (q.left === 0 ? '0 ✔' : q.left) : q === p ? 'BULL ✔' : q.target >= R.BULL ? 'BULL' : q.target;
      return `<tr><td><span class="who"><img alt="" src="${thumbs[q.id] || ''}">${q.entry.name}${q === p ? ' 🏆' : ''}</span></td><td>${where}</td><td>${q.darts}</td></tr>`;
    }).join('');
    $('cardTable').innerHTML = `<thead><tr><th>PLAYER</th><th>${G.mode === 'x01' ? 'LEFT' : 'REACHED'}</th><th>DARTS</th></tr></thead><tbody>${rows}</tbody>`;
    $('newBest').classList.toggle('on', !!G.newBest);
    const human = G.players.filter((q) => !q.cpu);
    $('cardBest').textContent = human.map((q) => { const b = store.get(bestKey(G.mode, q.id, q.level), 0); return b ? `${q.entry.name}'S BEST ${darts(b)}` : ''; }).filter(Boolean).join(' · ');
    $('hud').classList.add('hidden');
    $('cardWins').textContent = G.players.length > 1 ? 'WINS: ' + G.players.map((q) => `${q.entry.name} ${G.wins[q.id] || 0}`).join(' · ') : '';
    show('card');
  }

  // ---------------------------------------------------------------- the HUD
  function buildHud() {
    const box = $('players');
    box.innerHTML = '';
    G.players.forEach((p, i) => {
      const d = document.createElement('div');
      d.className = 'pl';
      d.id = 'pl' + i;
      d.innerHTML = `<img alt="" src="${thumbs[p.id] || ''}"><span class="nm">${p.entry.name}</span><span class="dot" style="background:${p.color}"></span><span class="st" id="st${i}"></span><span class="dl" id="dl${i}"></span>`;
      box.appendChild(d);
    });
    const bd = buddy.entryId() ? Kit.roster.get(buddy.entryId()) : null;
    $('buddyBtn').classList.toggle('five', brothersPlaying());
    $('buddyBtn').title = brothersPlaying() ? 'High five (T)' : 'Call your brother (T)';
    if (bd) { $('buddyFace').src = thumbs[bd.id] || ''; $('buddyName').textContent = bd.name; }
    else $('buddyName').textContent = 'HIGH FIVE!';
    $('buddySub').textContent = brothersPlaying() ? '' : 'TAP ME!';
  }
  let hudKey = '';
  function updateHud(force) {
    if (!G.players.length) return;
    const p = cur();
    const k = [G.turn, G.dart, G.players.map((q) => q.left + ':' + q.target).join(','), G.state, G.steady, Kit.lang.get()].join('|');
    if (!force && k === hudKey) return;
    hudKey = k;
    G.players.forEach((q, i) => {
      $('pl' + i).classList.toggle('on', q === p);
      const st = $('st' + i);
      const v = G.mode === 'x01' ? String(q.left) : q.target >= R.BULL ? 'BULL' : String(q.target);
      if (st.textContent !== v) { st.textContent = v; st.classList.remove('bump'); void st.offsetWidth; st.classList.add('bump'); }
      $('dl' + i).textContent = q === p ? '🎯'.repeat(Math.max(0, 3 - G.dart)) : '';
    });
    const spans = $('turnDarts').children;
    for (let i = 0; i < 3; i++) {
      const d = G.xt && G.mode === 'x01' ? G.xt.darts[i] : null;
      spans[i].textContent = G.mode === 'x01' ? (d ? d.label : '–') : i < G.dart ? '●' : '○';
      spans[i].className = d && d.mult > 1 ? 'm' + d.mult : '';
    }
    $('turnTot').textContent = G.mode === 'x01' && G.xt ? (G.xt.bust ? 'BUST!' : String(G.xt.darts.reduce((s, d) => s + d.score, 0))) : p.target >= R.BULL ? 'NOW: BULL' : `NOW: ${p.target}`;
    $('buddyBtn').classList.toggle('here', buddy.here() || G.steady);
  }
  function toast(text, kind) {
    const d = document.createElement('div');
    d.className = 'toast' + (kind ? ' ' + kind : '');
    d.textContent = text;
    $('toasts').appendChild(d);
    while ($('toasts').children.length > 2) $('toasts').firstChild.remove();
    setTimeout(() => d.remove(), kind === 'hint' ? 3300 : 2500);
  }
  function pop(pos, text, kind) {
    const d = document.createElement('div');
    d.className = 'pop' + (kind === 'zero' || text === 'MISS' ? ' zero' : /^T|^BULL|^D/.test(kind || '') ? ' gold' : '');
    d.textContent = text;
    d.style.left = pos.x + 'px';
    d.style.top = pos.y + 'px';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1200);
  }
  function banner(b1, b2) {
    const el = $('banner');
    el.innerHTML = `<div class="b1"></div>${b2 ? '<div class="b2"></div>' : ''}`;
    el.querySelector('.b1').textContent = b1;
    if (b2) el.querySelector('.b2').textContent = b2;
    el.classList.remove('hidden');
  }
  function show(id) {
    for (const s of ['title', 'modes', 'pause', 'card']) $(s).classList.toggle('hidden', s !== id);
  }

  // ---------------------------------------------------------------- pause
  let pausedFrom = null;
  function pause() {
    if (!G.players.length || G.state === 'paused' || G.state === 'over' || G.state === 'title' || G.state === 'modes') return;
    pausedFrom = G.state;
    G.state = 'paused';
    show('pause');
    Snd.music('pause');
  }
  function resume() {
    if (G.state !== 'paused') return;
    G.state = pausedFrom;
    show(null);
    Snd.music('play');
  }

  // ---------------------------------------------------------------- input
  function bindUi() {
    $('playBtn').addEventListener('click', () => { Snd.init(); sfx('click'); showModes(); });
    $('backBtn').addEventListener('click', () => { sfx('click'); toTitle(); });
    document.querySelectorAll('#styleSeg button').forEach((b) => b.addEventListener('click', () => { Snd.init(); sfx('click'); setStyle(b.dataset.style); }));
    document.querySelectorAll('#playersSeg button').forEach((b) => b.addEventListener('click', () => { Snd.init(); sfx('click'); setPlayers(+b.dataset.n); }));
    $('pauseBtn').addEventListener('click', () => { Snd.init(); pause(); });
    $('muteBtn').addEventListener('click', () => { Snd.init(); Snd.toggleMute(); });
    $('resumeBtn').addEventListener('click', resume);
    $('quitBtn').addEventListener('click', () => { sfx('click'); toTitle(); });
    $('againBtn').addEventListener('click', () => { Snd.init(); sfx('click'); startMode(G.mode); });
    $('menuBtn').addEventListener('click', () => { sfx('click'); showModes(); });
    $('buddyBtn').addEventListener('click', (e) => { e.stopPropagation(); callBuddy(); });
    const syncMute = () => { $('muteBtn').textContent = Snd.isMuted() ? '🔇' : '🔊'; };
    Snd.onMute(syncMute);
    syncMute();
    document.addEventListener('visibilitychange', () => { if (document.hidden && G.autoPause) pause(); });
  }

  function bindInput() {
    const cv = $('game');
    cv.addEventListener('pointerdown', (e) => {
      Snd.init();
      if (G.state !== 'aim' || G.ptr) return;
      G.ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, type: e.pointerType, moved: 0 };
      if (e.pointerType === 'mouse') mouseAim(e);
    });
    window.addEventListener('pointermove', (e) => {
      if (G.state !== 'aim') return;
      if (e.pointerType === 'mouse') { if (e.target === cv) mouseAim(e); return; }
      const q = G.ptr;
      if (!q || q.id !== e.pointerId) return;
      // a finger moves the aim like a trackpad, so it never hides the board
      const k = SC.metresPerPixel() * 1.1;
      G.aim.x += (e.clientX - q.x) * k;
      G.aim.y -= (e.clientY - q.y) * k;
      q.moved += Math.hypot(e.clientX - q.x, e.clientY - q.y);
      q.x = e.clientX;
      q.y = e.clientY;
      G.glide = null;
      clampAim();
    });
    const up = (e) => {
      const q = G.ptr;
      if (!q || q.id !== e.pointerId) return;
      G.ptr = null;
      if (G.state === 'aim' && e.type === 'pointerup') throwNow();
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', (e) => { G.keys[e.key] = false; });
  }
  function mouseAim(e) {
    const b = SC.boardPoint(e.clientX, e.clientY);
    if (!b) return;
    G.aim = b;
    G.glide = null;
    clampAim();
  }
  function onKey(e) {
    const k = e.key;
    if (e.repeat && !k.startsWith('Arrow')) return;
    G.keys[k] = true;
    if (k === 'm' || k === 'M') { Snd.init(); Snd.toggleMute(); return; }
    if (k === 'p' || k === 'P' || k === 'Escape') {
      if (G.state === 'paused') resume(); else if (G.state === 'modes') toTitle(); else pause();
      return;
    }
    if (G.state === 'paused') { if (k === 'Enter' || k === ' ') resume(); return; }
    if (G.state === 'title') {
      if (k === 'Enter' || k === ' ') { Snd.init(); showModes(); }
      else if (k === 'ArrowLeft' || k === 'ArrowRight') cycle(0, k === 'ArrowLeft' ? -1 : 1);
      else if (k === 'e' || k === 'E') { G.slots[0].level = G.slots[0].level === 'easy' ? 'normal' : 'easy'; saveSlots(); buildSlots(); }
      else if (k === 'c' || k === 'C') setStyle(G.style === 'kids' ? 'classic' : 'kids');
      else if (k === '1' || k === '2') setPlayers(+k);
      if (e.preventDefault && (k === ' ' || k.startsWith('Arrow'))) e.preventDefault();
      return;
    }
    if (G.state === 'modes') {
      if (k === '1' || k === 'ArrowLeft') startMode('x01');
      else if (k === '2' || k === 'ArrowRight') startMode('atc');
      else if (k === 'Enter' || k === ' ') startMode(G.mode);
      return;
    }
    if (G.state === 'over') {
      if (k === 'Enter' || k === ' ') startMode(G.mode);
      return;
    }
    if (k === 't' || k === 'T') { callBuddy(); return; }
    if ((k === ' ' || k === 'Enter') && G.state === 'aim') { throwNow(); if (e.preventDefault) e.preventDefault(); }
    if (k.startsWith('Arrow') && e.preventDefault) e.preventDefault();
  }
  function keyAim(dt) {
    const B = R.BOARDS[G.style], sp = B.R * 0.7 * dt;
    let moved = false;
    if (G.keys.ArrowLeft) { G.aim.x -= sp; moved = true; }
    if (G.keys.ArrowRight) { G.aim.x += sp; moved = true; }
    if (G.keys.ArrowUp) { G.aim.y += sp; moved = true; }
    if (G.keys.ArrowDown) { G.aim.y -= sp; moved = true; }
    if (moved) { G.glide = null; clampAim(); }
  }

  // ---------------------------------------------------------------- the loop
  function tick(dt) {
    G.stateT += dt;
    const st = G.state;
    if (st === 'paused') return;
    if (st === 'title') {
      G.titleT += dt;
      // the players on the title wave now and then
      Object.values(G.cast).forEach((pp, i) => { pp.mode = Math.sin(G.titleT * 0.9 + i * 2.2) > 0.75 ? 'wave' : 'none'; });
    }
    if (st === 'intro') {
      G.wait -= dt;
      if (G.wait <= 0) beginAim();
    }
    if (st === 'aim' || st === 'cpu' || st === 'gap') {
      const p = cur();
      G.swayT += dt * R.swaySpeed(p.level) * (G.steady && !p.cpu ? 0.6 : 1);
      if (G.glide) {
        G.glide.t = Math.min(1, G.glide.t + dt / (p.cpu ? 0.7 : 0.45));
        const u = G.glide.t, e = u * u * (3 - 2 * u);
        G.aim = { x: G.glide.from.x + (G.glide.to.x - G.glide.from.x) * e, y: G.glide.from.y + (G.glide.to.y - G.glide.from.y) * e };
        if (u >= 1) G.glide = null;
      }
      if (st === 'aim') keyAim(dt);
      const off = st === 'cpu' && G.cpuPlan && !G.glide ? cpuOffset(p) : wobble(p);
      SC.setReticle(true, G.aim, { x: off.x * R.BOARDS[G.style].R, y: off.y * R.BOARDS[G.style].R }, amp(p), p.color, G.steady && !p.cpu);
      if (st === 'cpu' && !G.glide && G.stateT > 1.25) {
        const th = G.cpuPlan, h = R.score(G.style, th.x, th.y);
        G.cpuPlan = null;
        throwNow(Object.assign(h, { x: th.x, y: th.y }));
      }
      if (st === 'gap') { G.wait -= dt; if (G.wait <= 0) nextDart(false); }
    }
    if (st === 'look') { G.wait -= dt; if (G.wait <= 0) afterLook(); }
    if (st === 'win') celebrate(dt);
    if (G.fiveT > 0) {
      G.fiveT -= dt;
      if (G.fiveT <= 0) fiveDone();
    }
    buddy.update(dt);
    SC.update(dt);
    if (G.players.length) updateHud();
  }
  // the CPU's dot slides from the middle of its wobble to where its dart will really go
  function cpuOffset(p) {
    const B = R.BOARDS[G.style], th = G.cpuPlan;
    const u = Math.min(1, Math.max(0, (G.stateT - 0.7) / 0.5));
    const w = R.sway(G.swayT, 0.04, p.i);
    return { x: ((th.x - G.aim.x) / B.R) * u + w.x * (1 - u), y: ((th.y - G.aim.y) / B.R) * u + w.y * (1 - u) };
  }

  let last = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60);
    last = now;
    if (!G.held) tick(dt); // held by a test: only game.step() moves time
    SC.render();
  }

  // ---------------------------------------------------------------- checks in the page: the headless ones, plus the
  // game's own throw path (aim, mouse and screen) and the painted board matching the scoring rings
  function check(opts = {}) {
    const rep = DT.checks.run(opts);
    const sab = !!opts.sabotage;
    const keepStyle = G.style;
    rep.throws = [];
    rep.screen = [];
    rep.paint = [];
    for (const st of ['kids', 'classic']) {
      G.style = st;
      SC.setStyle(st);
      SC.setCamera('aim', { snap: true });
      SC.camera.updateMatrixWorld();
      const B = R.BOARDS[st];
      R.ORDER.forEach((n) => {
        for (const [ring, pre] of [['inner', ''], ['treble', 'T'], ['outer', ''], ['double', 'D']]) {
          const s = R.spot(st, n, ring);
          // straight through the game's sum (no wobble), then through the screen and back (the mouse's path)
          const h = hitAt(s, { x: 0, y: 0 });
          rep.throws.push({ st, want: pre + n, got: h.label, ok: h.label === pre + n });
          const px = SC.toScreen(s.x, s.y), b = SC.boardPoint(px.x, px.y);
          const h2 = b ? R.score(st, b.x, b.y) : { label: 'none' };
          rep.screen.push({ st, want: pre + n, got: h2.label, ok: h2.label === pre + n });
        }
      });
      // the picture: sample the painted board just inside and outside every ring edge along each number
      const geo = sab ? Object.assign({}, B, { trebleIn: B.trebleIn * 0.9, trebleOut: B.trebleOut * 0.9 }) : B;
      const size = 1024, c = SC.paintBoard(st, size, geo), g = c.getContext('2d');
      const P = SC.PAL[st], mid = size / 2, kk = mid / B.face;
      const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
      const cols = { single0: hex(P.single[0]), single1: hex(P.single[1]), ring0: hex(P.ring[0]), ring1: hex(P.ring[1]) };
      const nearest = (rgb) => Object.entries(cols).sort((a, b) => dist(a[1], rgb) - dist(b[1], rgb))[0][0];
      const dist = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
      const e = 0.015;
      R.ORDER.forEach((n, i) => {
        const a = (i * 18 * Math.PI) / 180;
        for (const r of [B.outer + e, B.trebleIn - e, B.trebleIn + e, B.trebleOut - e, B.trebleOut + e, B.doubleIn - e, B.doubleIn + e, 1 - e]) {
          const x = Math.sin(a) * r * B.R, y = Math.cos(a) * r * B.R;
          const h = R.score(st, x, y);
          const want = (h.mult > 1 ? 'ring' : 'single') + (i % 2);
          const px = Math.round(mid + Math.sin(a) * r * kk), py = Math.round(mid - Math.cos(a) * r * kk);
          const d = g.getImageData(px, py, 1, 1).data;
          const got = nearest([d[0], d[1], d[2]]);
          rep.paint.push({ st, n, r: +r.toFixed(3), want, got, ok: got === want });
        }
      });
    }
    G.style = keepStyle;
    SC.setStyle(keepStyle);
    rep.throwsOk = rep.throws.every((t) => t.ok);
    rep.screenOk = rep.screen.every((t) => t.ok);
    rep.paintOk = rep.paint.every((t) => t.ok);
    rep.ok = rep.ok && rep.throwsOk && rep.screenOk && rep.paintOk;
    if (!sab) {
      const f = check({ sabotage: true });
      rep.fail.paintWrong = f.paint.filter((t) => !t.ok).length;
      rep.fail.ok = rep.fail.ok && rep.fail.paintWrong > 0;
      rep.ok = rep.ok && rep.fail.ok;
    }
    if (!sab) toTitle();
    return rep;
  }

  // ---------------------------------------------------------------- testing hooks
  // The Browser pane throttles requestAnimationFrame while hidden, so tests drive time themselves:
  //   game.hold(true); game.autoPause = false; game.start({ mode: 'x01' }); game.step(2); game.throwAt('T20')
  window.game = {
    get autoPause() { return G.autoPause; },
    set autoPause(v) { G.autoPause = !!v; },
    hold(on) { G.held = on !== false; },
    step(sec) {
      const n = Math.max(1, Math.round((sec || 1 / 60) * 60));
      for (let i = 0; i < n; i++) tick(1 / 60);
      SC.render();
      return this.info();
    },
    // opts: { mode, style, players: [{ id, level }], cpu: 'foxy' | 'froggy' | 'none' }
    start(opts = {}) {
      Snd.init();
      if (opts.style) setStyle(opts.style);
      if (opts.players) {
        setPlayers(opts.players.length);
        opts.players.forEach((p, i) => { G.slots[i] = { id: p.id || G.slots[i].id, level: p.level || 'easy' }; });
      }
      if (opts.cpu) G.cpu = opts.cpu;
      buildSlots();
      startMode(opts.mode || G.mode);
      return this.info();
    },
    title() { toTitle(); },
    modes() { showModes(); },
    // wait until it's someone's go (aiming), up to `sec` seconds
    ready(sec) { for (let i = 0; i < (sec || 10) * 60 && G.state !== 'aim' && G.state !== 'over' && G.state !== 'win'; i++) tick(1 / 60); SC.render(); return this.info(); },
    // throw the current human's dart at a zone ('T20', 'D16', '5', 'BULL', '25', 'MISS'), through the real path, no wobble
    throwAt(label, settle) {
      if (G.state !== 'aim') return null;
      const m = /^([TD]?)(\d+)$/.exec(label);
      const s = label === 'BULL' ? R.spot(G.style, 25, 'bull') : label === '25' ? R.spot(G.style, 25, 'outerBull') : label === 'MISS' ? { x: R.BOARDS[G.style].R * 1.6, y: 0 } : R.spot(G.style, +m[2], m[1] === 'T' ? 'treble' : m[1] === 'D' ? 'double' : 'outer');
      G.aim = { x: s.x, y: s.y };
      G.stateT = 1;
      const h = throwNow(hitAt(G.aim, { x: 0, y: 0 }));
      if (settle !== false) this.step(0.8);
      return h && h.label;
    },
    // a throw as the player makes it: aim here (board metres) and let the wobble do the rest
    throwHere(x, y) { if (G.state !== 'aim') return null; G.aim = { x, y }; G.stateT = 1; const h = throwNow(); this.step(0.8); return h && h.label; },
    // a real mouse move and click on the canvas (CSS px)
    click(x, y) {
      const cv = $('game');
      const ev = (type) => new PointerEvent(type, { pointerId: 3, pointerType: 'mouse', clientX: x, clientY: y, bubbles: true, button: 0, isPrimary: true });
      cv.dispatchEvent(ev('pointermove'));
      cv.dispatchEvent(ev('pointerdown'));
      cv.dispatchEvent(ev('pointerup'));
      return this.info();
    },
    // a finger: put it down, slide (dx, dy) CSS px, let go
    swipe(x, y, dx, dy) {
      const cv = $('game');
      const ev = (type, px, py) => new PointerEvent(type, { pointerId: 9, pointerType: 'touch', clientX: px, clientY: py, bubbles: true, isPrimary: true });
      cv.dispatchEvent(ev('pointerdown', x, y));
      cv.dispatchEvent(ev('pointermove', x + dx / 2, y + dy / 2));
      cv.dispatchEvent(ev('pointermove', x + dx, y + dy));
      const aim = { ...G.aim };
      cv.dispatchEvent(ev('pointerup', x + dx, y + dy));
      return aim;
    },
    key(k, down) { if (down === false) G.keys[k] = false; else onKey({ key: k, preventDefault() {}, repeat: false }); },
    buddy() { callBuddy(); return buddy.info(); },
    set(left) { if (cur()) { cur().left = left; G.xt = R.x01Turn(left); updateHud(true); } },
    target(n) { if (cur()) { cur().target = n; updateHud(true); } },
    toScreen: (x, y) => SC.toScreen(x, y),
    check,
    lang(l) { Kit.lang.set(l); },
    get G() { return G; },
    info() {
      const p = cur();
      return {
        state: G.state, style: G.style, mode: G.mode, turn: G.turn, dart: G.dart, round: G.round, thrower: p && p.id, level: p && p.level,
        aim: { x: +G.aim.x.toFixed(4), y: +G.aim.y.toFixed(4) }, steady: G.steady, amp: p ? +amp(p).toFixed(3) : 0, cam: SC.camMode(),
        players: G.players.map((q) => ({ id: q.id, cpu: q.cpu, level: q.level, left: q.left, target: q.target, darts: q.darts, turns: q.turns })),
        turnDarts: G.xt ? G.xt.darts.map((d) => d.label) : [], last: G.lastHit && G.lastHit.label, winner: G.winner && G.winner.id,
        buddy: buddy.info(), scene: SC.counts(),
      };
    },
  };

  window.addEventListener('load', boot);
})();
