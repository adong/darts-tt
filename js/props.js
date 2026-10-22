/* TT Darts: the things in the room. Darts (in your hand, flying, stuck in the board or dropped on the floor), the aim
   ring with its wobble, the players and the brother (kit people), treats, and confetti and sparkles.
   KIDS darts are chunky plastic with a suction cup that goes "thwop" and wobbles; CLASSIC darts are steel with a
   point, a barrel, a shaft and flights. Each player's darts are his colour. */
(function () {
  'use strict';
  const T = THREE, G = Kit.gfx, DT = window.DT, R = DT.rules, SC = DT.scene;

  // ---------------------------------------------------------------- a dart: the tip at the origin, pointing -z
  function makeDart(color, st) {
    const g = new T.Group();
    const col = G.std(color, { roughness: 0.4 });
    if (st === 'kids') {
      const cup = new T.Mesh(new T.CylinderGeometry(0.022, 0.012, 0.016, 18), G.std('#ff8a1f', { roughness: 0.5 }));
      cup.rotation.x = Math.PI / 2; cup.position.z = 0.008;
      const body = new T.Mesh(new T.CylinderGeometry(0.009, 0.011, 0.12, 12), col);
      body.rotation.x = Math.PI / 2; body.position.z = 0.075;
      const band = new T.Mesh(new T.CylinderGeometry(0.0115, 0.0115, 0.02, 12), G.std('#ffffff', { roughness: 0.4 }));
      band.rotation.x = Math.PI / 2; band.position.z = 0.045;
      g.add(cup, body, band);
      addFlights(g, 0.14, 0.05, 0.03, G.shade(color, 0.25));
    } else {
      const steel = G.std('#c8ccd4', { roughness: 0.25, metalness: 0.9 });
      const point = new T.Mesh(new T.ConeGeometry(0.0022, 0.03, 8), steel);
      point.rotation.x = -Math.PI / 2; point.position.z = 0.015;
      const barrel = new T.Mesh(new T.CylinderGeometry(0.0045, 0.004, 0.05, 14), steel);
      barrel.rotation.x = Math.PI / 2; barrel.position.z = 0.055;
      const grip = new T.Mesh(new T.CylinderGeometry(0.0048, 0.0048, 0.018, 14), G.std('#8a8f99', { roughness: 0.6, metalness: 0.8 }));
      grip.rotation.x = Math.PI / 2; grip.position.z = 0.055;
      const shaft = new T.Mesh(new T.CylinderGeometry(0.0025, 0.003, 0.035, 8), G.std('#151515', { roughness: 0.4 }));
      shaft.rotation.x = Math.PI / 2; shaft.position.z = 0.097;
      g.add(point, barrel, grip, shaft);
      addFlights(g, 0.118, 0.035, 0.018, color);
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    if (st === 'kids') g.scale.setScalar(1.6); // big chunky toy darts for the big board
    return g;
  }
  function addFlights(g, z, len, w, color) {
    const m = new T.MeshStandardMaterial({ color, roughness: 0.5, side: T.DoubleSide });
    for (let i = 0; i < 4; i++) {
      const shape = new T.Shape();
      shape.moveTo(0, 0); shape.lineTo(w, len * 0.25); shape.lineTo(w, len); shape.lineTo(0, len * 0.85);
      const f = new T.Mesh(new T.ShapeGeometry(shape), m);
      // the fin lies in a plane through the shaft; turn it round the shaft
      const holder = new T.Group();
      f.rotation.x = Math.PI / 2;
      holder.add(f);
      holder.rotation.z = (i * Math.PI) / 2;
      holder.position.z = z - len * 0.6;
      g.add(holder);
    }
  }

  // ---------------------------------------------------------------- the hand that holds the next dart (aim view)
  const P = { hand: null, held: null, flying: [], stuck: [], dropped: [], reticle: null, people: [], confetti: null };
  // a fist and a forearm coming in from the bottom right, all at about the same depth (nothing reaching toward the
  // camera, so it never looms huge); the dart points into the screen
  function makeHand(look) {
    const g = new T.Group();
    const skin = G.std(look.skin || '#f2c49b', { roughness: 0.7 }), sleeve = G.std(look.top || '#2a7bd6', { roughness: 0.8 });
    const fist = new T.Mesh(new T.BoxGeometry(0.05, 0.05, 0.05), skin);
    const thumb = new T.Mesh(new T.BoxGeometry(0.016, 0.034, 0.018), skin);
    thumb.position.set(-0.028, 0.012, -0.01);
    const arm = new T.Mesh(new T.BoxGeometry(0.05, 0.2, 0.05), skin);
    arm.position.set(0.05, -0.1, 0.012);
    arm.rotation.z = 0.5;
    const cuff = new T.Mesh(new T.BoxGeometry(0.068, 0.16, 0.066), sleeve);
    cuff.position.set(0.12, -0.23, 0.02);
    cuff.rotation.z = 0.5;
    g.add(fist, thumb, arm, cuff);
    return g;
  }
  function setHand(entry, color) {
    if (P.hand) { SC.camera.remove(P.hand); P.hand = null; P.held = null; }
    if (!entry) return;
    if (!SC.camera.parent) SC.scene.add(SC.camera);
    P.hand = new T.Group();
    P.hand.add(makeHand(entry.look));
    P.held = makeDart(color, SC.style());
    P.held.scale.multiplyScalar(SC.style() === 'kids' ? 0.36 : 1.1);
    P.held.position.set(-0.004, 0.026, -0.02);
    P.held.rotation.x = 0.25;
    P.hand.add(P.held);
    P.hand.userData = { throwT: 0 };
    SC.camera.add(P.hand);
    placeHand();
  }
  // keep the hand the same size on screen whatever the camera's zoom: at depth d it is scaled to the view's height
  function placeHand() {
    if (!P.hand) return;
    const d = 0.6, h = d * Math.tan((SC.camera.fov * Math.PI) / 360), a = SC.camera.aspect;
    const k = Math.min(h, h * a * 1.4) / 0.3, t = P.hand.userData.throwT; // narrower on a phone held upright
    // a throw: the hand pulls back a little, then snaps forward and up
    const fwd = t <= 0 ? 0 : t < 0.2 ? -Math.sin((t / 0.2) * Math.PI / 2) * 0.5 : Math.sin(Math.min(1, (t - 0.2) / 0.35) * Math.PI) * 1.2;
    P.hand.position.set(Math.min(0.55 * a, 0.42 + 0.1 * a) * h, (-0.62 + fwd * 0.22) * h, -d);
    P.hand.scale.setScalar(k);
    P.hand.rotation.set(0.15 - fwd * 0.3, 0.12, 0);
  }
  function showHeld(on) { if (P.held) P.held.visible = on; }
  function handVisible(on) { if (P.hand) P.hand.visible = on; }

  // ---------------------------------------------------------------- the aim ring and its wobble circle
  function makeReticle() {
    const g = new T.Group();
    const wob = new T.Mesh(new T.CircleGeometry(1, 48), new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.16, depthWrite: false }));
    const wobEdge = new T.Mesh(new T.RingGeometry(0.96, 1, 48), new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false }));
    const dot = new T.Group();
    const mat = new T.MeshBasicMaterial({ color: '#ffffff', depthWrite: false, transparent: true });
    const ring = new T.Mesh(new T.RingGeometry(0.7, 1, 36), mat);
    const ink = new T.Mesh(new T.RingGeometry(1, 1.25, 36), new T.MeshBasicMaterial({ color: '#14121f', depthWrite: false, transparent: true, opacity: 0.8 }));
    const c1 = new T.Mesh(new T.PlaneGeometry(0.16, 1.1), mat), c2 = new T.Mesh(new T.PlaneGeometry(1.1, 0.16), mat);
    dot.add(ink, ring, c1, c2);
    const wobG = new T.Group();
    wobG.add(wob, wobEdge);
    g.add(wobG, dot);
    g.traverse((o) => { if (o.isMesh) o.renderOrder = 5; });
    g.userData = { wobG, dot, mat, wobMat: wobEdge.material, fill: wob.material };
    return g;
  }
  // aim: the middle of the wobble (board metres); off: where the dart would go right now (metres from aim);
  // amp: the wobble's size (a fraction of R)
  function setReticle(on, aim, off, amp, color, steady) {
    // the ring lives in the scene, not on the board, so it survives the board being rebuilt for the other look
    if (!P.reticle) { P.reticle = makeReticle(); SC.scene.add(P.reticle); }
    P.reticle.position.set(0, SC.look().BH, 0.012);
    P.reticle.visible = !!on;
    if (!on) return;
    const u = P.reticle.userData, B = R.BOARDS[SC.style()];
    u.wobG.position.set(aim.x, aim.y, 0);
    u.wobG.scale.setScalar(Math.max(0.004, amp * B.R * 1.05));
    u.dot.position.set(aim.x + off.x, aim.y + off.y, 0.001);
    u.dot.scale.setScalar(B.R * 0.055);
    u.mat.color.set(steady ? '#ffd400' : color);
    u.wobMat.color.set(steady ? '#ffd400' : '#ffffff');
    u.fill.color.set(steady ? '#fff3a0' : '#ffffff');
  }

  // ---------------------------------------------------------------- flying, stuck and dropped darts
  const tmpA = new T.Vector3(), tmpB = new T.Vector3(), FWD = new T.Vector3(0, 0, -1);
  // throw a dart from the hand (or from near the line when there's no hand) to a board point
  function throwDart(color, to, onLand, from) {
    const st = SC.style(), L = SC.look();
    const m = makeDart(color, st);
    SC.scene.add(m);
    let start;
    if (from) start = from.clone();
    else if (P.held && P.hand && P.hand.visible) { P.held.updateWorldMatrix(true, false); start = P.held.getWorldPosition(new T.Vector3()); }
    else start = new T.Vector3(0.15, L.BH - 0.2, L.D - 0.3);
    const off = to.ring === 'wall';
    const end = new T.Vector3(to.x, to.y + L.BH, off ? -0.02 : 0.0);
    const dur = 0.2 + start.distanceTo(end) * 0.07;
    P.flying.push({ m, start, end, t: 0, dur, onLand, to, color, off });
    return m;
  }
  function stick(f) {
    const st = SC.style();
    const pivot = new T.Group();
    pivot.position.copy(f.end);
    if (st === 'classic') pivot.position.z += 0.012; // the point goes in
    // darts sit a little nose-down and to the side, like real ones
    const tilt = new T.Group();
    tilt.rotation.set(-0.12 + Math.random() * 0.1, (Math.random() - 0.5) * 0.2, 0);
    pivot.add(tilt);
    f.m.position.set(0, 0, 0);
    f.m.rotation.set(0, 0, Math.random() * 6);
    tilt.add(f.m);
    SC.scene.add(pivot);
    P.stuck.push({ pivot, tilt, t: 0, amp: st === 'kids' ? 0.22 : 0.06, ph: Math.random() * 6 });
  }
  function drop(f) {
    // off the board: it bounces off the wall and falls to the floor
    P.dropped.push({ m: f.m, v: new T.Vector3((Math.random() - 0.5) * 0.6, 0.4, 0.5), spin: new T.Vector3(4 + Math.random() * 4, Math.random() * 3, 0), done: false });
  }
  function pullDarts() {
    for (const s of P.stuck) SC.scene.remove(s.pivot);
    for (const d of P.dropped) SC.scene.remove(d.m);
    P.stuck = [];
    P.dropped = [];
  }
  function updateDarts(dt) {
    for (let i = P.flying.length - 1; i >= 0; i--) {
      const f = P.flying[i];
      f.t += dt;
      const u = Math.min(1, f.t / f.dur);
      const arc = 0.06 * f.start.distanceTo(f.end);
      tmpA.lerpVectors(f.start, f.end, u);
      tmpA.y += Math.sin(u * Math.PI) * arc;
      const u2 = Math.min(1, u + 0.02);
      tmpB.lerpVectors(f.start, f.end, u2);
      tmpB.y += Math.sin(u2 * Math.PI) * arc;
      f.m.position.copy(tmpA);
      if (u < 1) { tmpB.sub(tmpA).normalize(); f.m.quaternion.setFromUnitVectors(FWD, tmpB); }
      if (u >= 1) {
        P.flying.splice(i, 1);
        f.m.quaternion.identity();
        if (f.off) drop(f); else stick(f);
        if (f.onLand) f.onLand(f.to);
      }
    }
    for (const s of P.stuck) {
      s.t += dt;
      const a = s.amp * Math.exp(-s.t * 4) * Math.sin(s.t * 26 + s.ph);
      s.pivot.rotation.x = a;
      s.pivot.rotation.y = a * 0.6;
    }
    for (const d of P.dropped) {
      if (d.done) continue;
      d.v.y -= 9.8 * dt;
      d.m.position.addScaledVector(d.v, dt);
      d.m.rotation.x += d.spin.x * dt;
      d.m.rotation.y += d.spin.y * dt;
      if (d.m.position.y < 0.02) { d.m.position.y = 0.02; d.m.rotation.set(Math.PI / 2, d.m.rotation.y, 0); d.done = true; }
    }
  }
  const flyingNow = () => P.flying.length > 0;

  // ---------------------------------------------------------------- people
  function makePerson(entry, scale) {
    const p = Kit.people.build(entry.look);
    const holder = new T.Group();
    holder.add(p.root);
    holder.scale.setScalar(scale);
    p.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    SC.scene.add(holder);
    const pp = { holder, p, entry, scale, ph: Math.random() * 6, mode: 'none', jump: 0, walk: null };
    P.people.push(pp);
    return pp;
  }
  function removePerson(pp) {
    if (!pp) return;
    SC.scene.remove(pp.holder);
    P.people = P.people.filter((q) => q !== pp);
  }
  function walkTo(pp, x, z, dur) { pp.walk = { from: pp.holder.position.clone(), to: new T.Vector3(x, 0, z), t: 0, dur: dur || 0.7 }; }
  function facePoint(pp, x, z) {
    const dx = x - pp.holder.position.x, dz = z - pp.holder.position.z;
    pp.holder.rotation.y = Math.atan2(-dx, -dz);
  }
  function animPerson(pp, dt) {
    pp.ph += dt * 8;
    if (pp.walk) {
      const w = pp.walk;
      w.t += dt;
      const u = Math.min(1, w.t / w.dur);
      pp.holder.position.lerpVectors(w.from, w.to, u);
      if (u < 1 && w.from.distanceTo(w.to) > 0.05) facePoint(pp, w.to.x + (w.to.x - w.from.x) * 10, w.to.z + (w.to.z - w.from.z) * 10);
      if (u >= 1) pp.walk = null;
    }
    const moving = pp.walk && pp.walk.from.distanceTo(pp.walk.to) > 0.05;
    const mode = moving ? 'walk' : pp.mode;
    const k = 1 - Math.exp(-14 * dt);
    Kit.people.pose(pp.p, pp.ph, mode, k);
    if (mode !== 'run' && mode !== 'walk') { pp.p.legL.rotation.x *= 0.2; pp.p.legR.rotation.x *= 0.2; }
    if (pp.jump > 0) {
      pp.jump = Math.max(0, pp.jump - dt);
      const u = 1 - pp.jump / 0.7;
      pp.p.root.position.y = Math.sin(Math.min(1, u) * Math.PI) * 0.7;
    } else pp.p.root.position.y = 0;
  }

  // ---------------------------------------------------------------- treats, emoji sprites
  function emojiSprite(e, size) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: G.emojiTexture(e), transparent: true, depthWrite: false }));
    s.scale.set(size || 0.3, size || 0.3, 1);
    SC.scene.add(s);
    return s;
  }
  function removeObj(o) { if (o && o.parent) o.parent.remove(o); }

  // ---------------------------------------------------------------- confetti and sparkles
  const PMAX = 400;
  const parts = [];
  function ensureConfetti() {
    if (P.confetti && P.confetti.parent) return;
    P.confetti = new T.InstancedMesh(new T.PlaneGeometry(1, 1.5), new T.MeshBasicMaterial({ side: T.DoubleSide }), PMAX);
    P.confetti.frustumCulled = false;
    P.confetti.count = 0;
    const white = new T.Color('#ffffff');
    for (let i = 0; i < PMAX; i++) P.confetti.setColorAt(i, white);
    SC.scene.add(P.confetti);
  }
  const CONF = ['#ff3d7f', '#ffd400', '#18d4ff', '#57d16a', '#ff8a1f', '#9b6bff', '#ffffff'];
  function burst(pos, n, opts) {
    ensureConfetti();
    const o = opts || {};
    for (let i = 0; i < n && parts.length < PMAX; i++) {
      const a = Math.random() * Math.PI * 2, s = (o.speed || 2) * (0.4 + Math.random() * 0.8);
      parts.push({
        p: pos.clone(), v: new T.Vector3(Math.cos(a) * s * 0.7, (o.up || 2.5) * (0.5 + Math.random()), Math.sin(a) * s * 0.5 * (o.flat ? 0.1 : 1) + (o.toward || 0)),
        r: new T.Euler(Math.random() * 6, Math.random() * 6, 0), spin: (Math.random() - 0.5) * 14, life: o.life || 2.6, t: 0,
        size: (o.size || 0.05) * (0.7 + Math.random() * 0.6), col: new T.Color(o.colors ? G.pick(o.colors) : G.pick(CONF)), g: o.g === undefined ? 4 : o.g,
      });
    }
  }
  const M4 = new T.Matrix4(), Q = new T.Quaternion(), S3 = new T.Vector3();
  function updateParts(dt) {
    if (!P.confetti) return;
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i];
      q.t += dt;
      if (q.t > q.life) { parts.splice(i, 1); continue; }
      q.v.y -= q.g * dt;
      q.v.multiplyScalar(1 - 1.6 * dt);
      q.p.addScaledVector(q.v, dt);
      q.r.x += q.spin * dt; q.r.y += q.spin * 0.7 * dt;
    }
    parts.forEach((q, i) => {
      const k = q.t > q.life - 0.4 ? (q.life - q.t) / 0.4 : 1;
      Q.setFromEuler(q.r);
      S3.setScalar(q.size * k);
      M4.compose(q.p, Q, S3);
      P.confetti.setMatrixAt(i, M4);
      P.confetti.setColorAt(i, q.col);
    });
    P.confetti.count = parts.length;
    P.confetti.instanceMatrix.needsUpdate = true;
    if (P.confetti.instanceColor) P.confetti.instanceColor.needsUpdate = true;
  }
  // a little burst on the board for a bull (gold) or a treble, staying flat against the board
  function sparkle(x, y, gold) {
    const L = SC.look(), B = R.BOARDS[SC.style()];
    burst(new T.Vector3(x, y + L.BH, 0.03), 34, { speed: B.R * 3, up: B.R * 2, toward: 0.05, flat: true, life: 0.9, size: B.R * 0.035, g: B.R * 3, colors: gold ? ['#ffd400', '#fff3a0', '#ffffff'] : null });
  }

  function update(dt) {
    if (P.hand) {
      const u = P.hand.userData;
      if (u.throwT > 0) { u.throwT += dt; if (u.throwT > 0.6) u.throwT = 0; }
      placeHand();
    }
    updateDarts(dt);
    for (const pp of P.people) animPerson(pp, dt);
    updateParts(dt);
  }
  function handThrow() { if (P.hand) P.hand.userData.throwT = 0.001; }
  function clearAll() {
    pullDarts();
    for (const f of P.flying) SC.scene.remove(f.m);
    P.flying = [];
    parts.length = 0;
  }
  function counts() { return { stuck: P.stuck.length, dropped: P.dropped.length, flying: P.flying.length, people: P.people.length, confetti: parts.length }; }

  SC.updateProps = update;
  Object.assign(SC, {
    makeDart, setHand, showHeld, handVisible, handThrow, setReticle, throwDart, pullDarts, flyingNow, makePerson, removePerson, walkTo, facePoint,
    emojiSprite, removeObj, burst, sparkle, clearAll, counts, props: P,
  });
})();
