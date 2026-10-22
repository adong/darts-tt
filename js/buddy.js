/* TT Darts: the brother who comes to help. Call him (T or his face button) any time, as often as you like.
   He pops in beside the throwing line at his buddy size, says hi with his signature move (Tommy's Y with peace
   fingers, Teddy's boxing or jump shot) and tosses a treat. Then he steadies your aim: he holds your arm, and the
   wobble shrinks to almost nothing for the rest of your turn ("TOMMY SAYS: I'VE GOT YOUR ARM! NICE AND STEADY!").
   When your turn ends he says bye and pops out. The game passes in hooks: toast, sfx, where the thrower is, help(). */
(function () {
  'use strict';
  const DT = window.DT, SC = DT.scene;
  const TREATS = [['🍦', 'ICE CREAM'], ['💧', 'WATER'], ['🧃', 'JUICE BOX'], ['🍪', 'COOKIE'], ['🍉', 'WATERMELON'], ['🍌', 'BANANA']];

  const B = { entry: null, person: null, state: 'away', t: 0, treatN: 0, tossed: 0, hooks: null, treats: [], flying: null, calls: 0, bye: false };

  function init(hooks) { B.hooks = hooks; }
  function setEntry(entry) {
    if (B.entry && entry && B.entry.id === entry.id) return;
    dismiss(true);
    B.entry = entry;
  }
  const nice = () => B.entry.name;
  const sig = (which) => Kit.roster.signature(B.entry, which);

  // He's called. First time: pop in. Already here: say hi again and bring another treat.
  function call() {
    if (!B.entry) return;
    const h = B.hooks;
    const a = h.thrower();
    B.calls++;
    if (B.state === 'away' || B.state === 'bye') {
      if (!B.person) B.person = SC.makePerson(B.entry, (B.entry.buddyScale || 0.85) * h.base());
      B.person.holder.visible = true;
      B.person.holder.position.set(a.x + 0.62, 0, a.z + 0.1);
      SC.burst(B.person.holder.position.clone().setY(0.5), 26, { speed: 1.2, up: 1.4, life: 0.8, size: 0.05, colors: ['#ffffff', '#fff3a0', '#cfe6ff'] });
      h.sfx('poof');
      h.toast(`${nice()} IS HERE!`, 'buddy');
    }
    B.state = 'hello';
    B.t = 0;
    B.bye = false;
    B.person.mode = sig('hello');
    if (B.person.mode === 'jumpshot') { B.person.jump = 0.7; ball(); }
    B.treatN++;
  }
  function ball() {
    const s = SC.emojiSprite('🏀', 0.2);
    s.position.copy(B.person.holder.position);
    s.position.y += 1.4 * B.person.scale;
    B.treats.push({ s, t: 4.2, vy: 2.4 });
  }

  function tossTreat() {
    const h = B.hooks;
    const [emoji, name] = TREATS[(B.treatN - 1) % TREATS.length];
    const s = SC.emojiSprite(emoji, 0.26);
    const from = B.person.holder.position.clone();
    from.y += 1.2 * B.person.scale;
    const a = h.thrower();
    const to = { x: a.x - 0.25 + (B.treats.length % 4) * 0.16, y: 0.14, z: a.z - 0.45 };
    B.flying = { s, from, to, t: 0, emoji, name };
    h.sfx('swish');
  }

  function update(dt) {
    const pp = B.person;
    if (B.flying) {
      const f = B.flying;
      f.t += dt / 0.8;
      const u = Math.min(1, f.t);
      f.s.position.set(f.from.x + (f.to.x - f.from.x) * u, f.from.y + (f.to.y - f.from.y) * u + Math.sin(u * Math.PI) * 0.8, f.from.z + (f.to.z - f.from.z) * u);
      f.s.material.rotation = u * 6;
      if (u >= 1) {
        B.hooks.sfx('treat');
        B.hooks.toast(`${f.emoji} ${f.name} FROM ${nice()}!`, 'buddy');
        f.s.material.rotation = 0;
        B.treats.push({ s: f.s, t: 0 });
        B.flying = null;
      }
    }
    for (let i = B.treats.length - 1; i >= 0; i--) {
      const tr = B.treats[i];
      tr.t += dt;
      if (tr.vy !== undefined) { tr.vy -= 6 * dt; tr.s.position.y += tr.vy * dt; }
      const k = tr.t < 5 ? 1 : Math.max(0, 1 - (tr.t - 5) / 0.6);
      const base = tr.vy !== undefined ? 0.2 : 0.26;
      tr.s.scale.set(base * k, base * k, 1);
      if (k <= 0) { SC.removeObj(tr.s); B.treats.splice(i, 1); }
    }
    if (!pp || B.state === 'away') return;
    B.t += dt;
    const cam = SC.camera.position;
    if (B.state !== 'help') SC.facePoint(pp, cam.x, cam.z);
    if (B.state === 'hello') {
      if (B.t > 0.8 && !B.flying && B.treatN > B.tossed) { B.tossed = B.treatN; tossTreat(); }
      if (B.t > 1.9) {
        // now he helps: turns to his brother and holds his arm
        B.state = 'help';
        B.t = 0;
        pp.mode = 'give';
        const a = B.hooks.thrower();
        SC.facePoint(pp, a.x, a.z - 0.3);
        B.hooks.help(nice());
        if (B.bye) goodbye();
      }
    } else if (B.state === 'bye') {
      if (B.t > 1.3) {
        SC.burst(pp.holder.position.clone().setY(0.5), 22, { speed: 1.2, up: 1.4, life: 0.8, size: 0.05, colors: ['#ffffff', '#fff3a0', '#cfe6ff'] });
        B.hooks.sfx('poof');
        pp.holder.visible = false;
        B.state = 'away';
      }
    }
  }

  function goodbye() {
    if (!B.person || B.state === 'away' || B.state === 'bye') return;
    if (B.state === 'hello') { B.bye = true; return; } // finish the hello first
    B.state = 'bye';
    B.t = 0;
    B.person.mode = sig('goodbye');
    if (B.person.mode === 'jumpshot') { B.person.jump = 0.7; ball(); }
  }

  // keep him beside the thrower (the line moves with the board's look)
  function follow() {
    if (!B.person || B.state === 'away') return;
    const a = B.hooks.thrower();
    B.person.holder.position.set(a.x + 0.62, 0, a.z + 0.1);
  }

  function dismiss(now) {
    if (B.flying) { SC.removeObj(B.flying.s); B.flying = null; }
    for (const tr of B.treats) SC.removeObj(tr.s);
    B.treats = [];
    if (B.person) {
      if (now) { SC.removePerson(B.person); B.person = null; } else B.person.holder.visible = false;
    }
    B.state = 'away';
    B.bye = false;
  }

  const here = () => B.state !== 'away';
  const busy = () => B.state === 'hello';
  const info = () => ({ state: B.state, entry: B.entry && B.entry.id, calls: B.calls, treats: B.treatN, onGround: B.treats.length });

  DT.buddy = { init, setEntry, call, update, goodbye, follow, dismiss, here, busy, info, entryId: () => B.entry && B.entry.id };
})();
