/* TT Darts: the 3D room and the board. Two looks:
   - KIDS: a playroom with a big soft board with fat rings and a big bull, for suction-cup darts.
   - CLASSIC: a games room with a real dartboard (regulation rings, black and cream, red and green) in a wooden
     cabinet, with a lamp over it.
   The board's face is drawn on a canvas with the same ring sizes the rules score with (DT.rules.BOARDS).
   Two cameras: AIM looks straight at the board from the throwing line (the board fills the screen, your hand and
   dart at the bottom right); SIDE shows the players, for turns, the brother popping in and the winner's dance.
   Board coordinates: metres from the middle of the board, y up; the board's face is the plane z = 0. */
(function () {
  'use strict';
  const T = THREE, G = Kit.gfx, DT = window.DT, R = DT.rules;

  const SC = {};
  let renderer, scene, camera, room = null, board = null, glow = null, style = 'kids';
  const LOOK = {
    kids: { BH: 1.3, D: 1.8, bg: '#bfe6ff' },
    classic: { BH: 1.45, D: 2.0, bg: '#1d2b24' },
  };
  SC.look = () => LOOK[style];
  SC.BH = () => LOOK[style].BH;
  SC.D = () => LOOK[style].D;

  function init(canvas) {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(40, 1, 0.05, 60);
    SC.scene = scene;
    SC.camera = camera;
    resize();
    window.addEventListener('resize', resize);
  }
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------- the board's face, painted
  const PAL = {
    kids: { rim: '#6a4cff', single: ['#ffe066', '#8fd8ff'], ring: ['#ff5d8f', '#4fd67a'], outerBull: '#ff9f1c', bull: '#ff3d3d', wire: '#ffffff', num: '#ffffff' },
    classic: { rim: '#121212', single: ['#1b1b1b', '#f1dfb3'], ring: ['#d0312d', '#1f8a4c'], outerBull: '#1f8a4c', bull: '#d0312d', wire: '#c9ccd2', num: '#f4f4f4' },
  };
  SC.PAL = PAL;
  // geo: the ring sizes to paint (the rules' own by default; the page check paints a wrong one to prove it can fail)
  function paintBoard(st, size, geo) {
    const B = geo || R.BOARDS[st], P = PAL[st];
    const [c, g] = G.makeCanvas(size, size);
    const mid = size / 2, k = mid / B.face; // pixels per R
    const deg = Math.PI / 180;
    g.fillStyle = P.rim;
    g.beginPath(); g.arc(mid, mid, mid, 0, Math.PI * 2); g.fill();
    // a sector from r0 to r1 (fractions of R) for segment i (clockwise from the top)
    const sector = (i, r0, r1, col) => {
      const a0 = (-90 + i * 18 - 9) * deg, a1 = a0 + 18 * deg;
      g.fillStyle = col;
      g.beginPath();
      g.arc(mid, mid, r1 * k, a0, a1);
      g.arc(mid, mid, r0 * k, a1, a0, true);
      g.closePath();
      g.fill();
    };
    for (let i = 0; i < 20; i++) {
      const e = i % 2; // the 20 (i = 0) is the dark single and the red ring on a real board
      sector(i, B.outer, B.trebleIn, P.single[e]);
      sector(i, B.trebleIn, B.trebleOut, P.ring[e]);
      sector(i, B.trebleOut, B.doubleIn, P.single[e]);
      sector(i, B.doubleIn, 1, P.ring[e]);
    }
    g.fillStyle = P.outerBull; g.beginPath(); g.arc(mid, mid, B.outer * k, 0, Math.PI * 2); g.fill();
    g.fillStyle = P.bull; g.beginPath(); g.arc(mid, mid, B.bull * k, 0, Math.PI * 2); g.fill();
    if (st === 'kids') {
      // a star in the bull, white gaps between the soft segments
      g.fillStyle = '#fff6b0';
      g.beginPath();
      for (let j = 0; j < 10; j++) { const r = (j % 2 ? 0.45 : 1) * B.bull * k * 0.8, a = (-90 + j * 36) * deg; g.lineTo(mid + Math.cos(a) * r, mid + Math.sin(a) * r); }
      g.closePath(); g.fill();
      g.strokeStyle = P.wire; g.lineWidth = size * 0.006;
    } else {
      g.strokeStyle = P.wire; g.lineWidth = Math.max(1.5, size * 0.0022);
    }
    // the wires: the ring edges and the spokes between numbers
    for (const r of [B.bull, B.outer, B.trebleIn, B.trebleOut, B.doubleIn, 1]) { g.beginPath(); g.arc(mid, mid, r * k, 0, Math.PI * 2); g.stroke(); }
    for (let i = 0; i < 20; i++) {
      const a = (-90 + i * 18 + 9) * deg;
      g.beginPath();
      g.moveTo(mid + Math.cos(a) * B.outer * k, mid + Math.sin(a) * B.outer * k);
      g.lineTo(mid + Math.cos(a) * k, mid + Math.sin(a) * k);
      g.stroke();
    }
    // the numbers around the outside, upright
    const nr = (1 + B.face) / 2;
    g.fillStyle = P.num;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `${Math.round((B.face - 1) * k * (st === 'kids' ? 0.62 : 0.55))}px ${G.FONT}`;
    R.ORDER.forEach((n, i) => {
      const a = (-90 + i * 18) * deg;
      g.fillText(String(n), mid + Math.cos(a) * nr * k, mid + Math.sin(a) * nr * k + size * 0.004);
    });
    if (st === 'classic') { g.strokeStyle = '#9aa0a8'; g.lineWidth = size * 0.004; g.beginPath(); g.arc(mid, mid, (1 + (B.face - 1) * 0.12) * k, 0, Math.PI * 2); g.stroke(); }
    return c;
  }
  SC.paintBoard = paintBoard;

  function makeBoard(st) {
    const B = R.BOARDS[st], F = B.R * B.face;
    const grp = new T.Group();
    const tex = G.toTexture(paintBoard(st, 2048));
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const face = new T.Mesh(new T.CircleGeometry(F, 128), new T.MeshStandardMaterial({ map: tex, roughness: st === 'kids' ? 0.55 : 0.85 }));
    face.position.z = 0.001;
    face.receiveShadow = true;
    grp.add(face);
    const depth = st === 'kids' ? 0.05 : 0.04;
    const body = new T.Mesh(new T.CylinderGeometry(F * 1.01, F * 1.01, depth, 96, 1, true), G.std(st === 'kids' ? '#5a3fd6' : '#101010', { roughness: 0.6 }));
    body.rotation.x = Math.PI / 2;
    body.position.z = -depth / 2;
    grp.add(body);
    if (st === 'kids') {
      // a soft rounded rim
      const rim = new T.Mesh(new T.TorusGeometry(F * 1.01, 0.022, 12, 96), G.std('#ff8a1f', { roughness: 0.5 }));
      rim.position.z = -0.01;
      grp.add(rim);
    } else {
      // the black foam ring that catches wild darts
      const surround = new T.Mesh(new T.RingGeometry(F * 1.0, F * 1.45, 96), G.std('#191919', { roughness: 0.95 }));
      surround.position.z = -0.02;
      grp.add(surround);
    }
    grp.traverse((o) => { if (o.isMesh) o.castShadow = o !== face; });
    return grp;
  }

  // the zone to light up: a number's whole segment (Around the Clock), one ring of it (a checkout double), or a bull
  function setGlow(num, ring) {
    if (glow) { board.remove(glow); glow.geometry.dispose(); glow = null; }
    if (!num) return;
    const B = R.BOARDS[style];
    let geo;
    if (num === 25) geo = new T.CircleGeometry(B.R * (ring === 'bull' ? B.bull : B.outer), 48);
    else {
      const i = R.ORDER.indexOf(num);
      const [r0, r1] = ring === 'double' ? [B.doubleIn, 1] : ring === 'treble' ? [B.trebleIn, B.trebleOut] : [B.outer, 1];
      geo = new T.RingGeometry(B.R * r0, B.R * r1, 12, 1, ((81 - i * 18) * Math.PI) / 180, (18 * Math.PI) / 180);
    }
    glow = new T.Mesh(geo, new T.MeshBasicMaterial({ color: '#fff6a0', transparent: true, opacity: 0.4, depthWrite: false }));
    glow.position.z = 0.004;
    glow.renderOrder = 2;
    board.add(glow);
  }
  SC.setGlow = setGlow;

  // ---------------------------------------------------------------- the rooms
  const tiled = (c, rx, ry) => { const t = G.toTexture(c, true); t.repeat.set(rx, ry); return t; };
  function stripes(w, h, a, b, n, extra) {
    const [c, g] = G.makeCanvas(w, h);
    for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect((i * w) / n, 0, w / n + 1, h); }
    if (extra) extra(g, w, h);
    return c;
  }
  function planks(w, h, base, n) {
    const [c, g] = G.makeCanvas(w, h);
    for (let i = 0; i < n; i++) {
      g.fillStyle = G.shade(base, (Math.sin(i * 12.9) * 0.5) * 0.12);
      g.fillRect(0, (i * h) / n, w, h / n);
      g.fillStyle = 'rgba(0,0,0,0.18)';
      g.fillRect(0, (i * h) / n, w, 2);
      g.fillRect(((i * 37) % 10) * (w / 10), (i * h) / n, 2, h / n);
    }
    return c;
  }

  function buildRoom(st) {
    const L = LOOK[st];
    const grp = new T.Group();
    const W = 7, Dp = L.D + 5;
    scene.background = new T.Color(L.bg);
    // lights
    grp.add(new T.HemisphereLight(st === 'kids' ? '#ffffff' : '#ffe9c8', st === 'kids' ? '#d9c7a8' : '#3a2a1a', st === 'kids' ? 0.85 : 0.45));
    const sun = new T.DirectionalLight('#ffffff', st === 'kids' ? 0.65 : 0.25);
    sun.position.set(2.5, 4, L.D + 2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -1, near: 0.5, far: 12 });
    grp.add(sun);
    const spot = new T.SpotLight(st === 'kids' ? '#ffffff' : '#fff1d6', st === 'kids' ? 0.5 : 1.6, 6, 0.55, 0.6, 1);
    spot.position.set(0, L.BH + 1.3, 1.4);
    spot.target.position.set(0, L.BH, 0);
    grp.add(spot, spot.target);
    // walls and floor
    const wallTex = st === 'kids'
      ? tiled(stripes(512, 512, '#bfe6ff', '#d7f0ff', 16, (g) => { g.font = `40px ${G.EMOJI_FONT}`; g.textAlign = 'center'; ['⭐', '🌙', '⭐', '☁️'].forEach((e, i) => g.fillText(e, 64 + i * 128, 120 + (i % 2) * 220)); }), 5, 2.2)
      : tiled(stripes(256, 256, '#20362b', '#1d3127', 8), 8, 3);
    const wallMat = new T.MeshStandardMaterial({ map: wallTex, roughness: 0.9 });
    const back = new T.Mesh(new T.PlaneGeometry(W, 3.2), wallMat);
    back.position.set(0, 1.6, -0.04);
    back.receiveShadow = true;
    grp.add(back);
    for (const sx of [-1, 1]) {
      const side = new T.Mesh(new T.PlaneGeometry(Dp, 3.2), wallMat);
      side.position.set(sx * W / 2, 1.6, Dp / 2 - 0.04);
      side.rotation.y = -sx * Math.PI / 2;
      side.receiveShadow = true;
      grp.add(side);
    }
    const floorTex = tiled(planks(512, 512, st === 'kids' ? '#e4b878' : '#6b4424', 8), W / 1.6, Dp / 1.6);
    const floor = new T.Mesh(new T.PlaneGeometry(W, Dp), new T.MeshStandardMaterial({ map: floorTex, roughness: 0.8 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, Dp / 2 - 0.04);
    floor.receiveShadow = true;
    grp.add(floor);
    // the throwing line
    if (st === 'kids') {
      const [c, g] = G.makeCanvas(512, 64);
      g.fillStyle = '#ffd400'; g.fillRect(0, 0, 512, 64);
      g.font = `40px ${G.EMOJI_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let i = 0; i < 6; i++) g.fillText('⭐', 42 + i * 86, 34);
      const tape = new T.Mesh(new T.PlaneGeometry(1.6, 0.12), new T.MeshStandardMaterial({ map: G.toTexture(c), roughness: 0.6 }));
      tape.rotation.x = -Math.PI / 2;
      tape.position.set(0, 0.004, L.D);
      tape.receiveShadow = true;
      grp.add(tape);
      // a rug, a toy chest and some balls
      const rug = new T.Mesh(new T.CircleGeometry(1.1, 48), G.std('#ff9db0', { roughness: 1 }));
      rug.rotation.x = -Math.PI / 2;
      rug.position.set(0, 0.003, L.D + 1.4);
      rug.receiveShadow = true;
      grp.add(rug);
      const chest = G.mesh(new T.BoxGeometry(0.9, 0.5, 0.5), G.std('#3fbf8a', { roughness: 0.7 }), -2.3, 0.25, 0.6, grp);
      G.mesh(new T.BoxGeometry(0.94, 0.08, 0.54), G.std('#ffd400', { roughness: 0.6 }), 0, 0.27, 0, chest);
      [['#ff3d7f', -1.7, 0.18], ['#18d4ff', 1.9, 0.14], ['#ffd400', 2.4, 0.12]].forEach(([col, x, r], i) => G.mesh(new T.SphereGeometry(r, 20, 14), G.std(col, { roughness: 0.4 }), x, r, 0.4 + i * 0.5, grp));
      // a window with a sunny sky
      const [wc, wg] = G.makeCanvas(256, 256);
      const sky = wg.createLinearGradient(0, 0, 0, 256); sky.addColorStop(0, '#6cc8ff'); sky.addColorStop(1, '#d9f4ff');
      wg.fillStyle = sky; wg.fillRect(0, 0, 256, 256);
      wg.font = `60px ${G.EMOJI_FONT}`; wg.fillText('☁️', 30, 90); wg.fillText('☀️', 160, 70);
      wg.fillStyle = '#ffffff'; wg.fillRect(124, 0, 8, 256); wg.fillRect(0, 124, 256, 8);
      const win = new T.Mesh(new T.PlaneGeometry(1.1, 1.1), new T.MeshBasicMaterial({ map: G.toTexture(wc) }));
      win.position.set(-W / 2 + 0.01, 1.6, L.D + 0.8);
      win.rotation.y = Math.PI / 2;
      grp.add(win);
    } else {
      // a raised wooden strip to stand behind, and wood panelling under a dado rail
      G.mesh(new T.BoxGeometry(1.4, 0.04, 0.05), G.std('#b8864a', { roughness: 0.6 }), 0, 0.02, L.D, grp);
      const panel = new T.Mesh(new T.PlaneGeometry(W, 0.95), new T.MeshStandardMaterial({ map: tiled(planks(256, 256, '#5a3519', 6), 6, 1), roughness: 0.7 }));
      panel.position.set(0, 0.475, -0.03);
      grp.add(panel);
      G.mesh(new T.BoxGeometry(W, 0.05, 0.04), G.std('#8a5a2b', { roughness: 0.5 }), 0, 0.97, -0.02, grp);
      // the cabinet: a wooden box behind the board with its doors open
      const cab = new T.Group();
      cab.position.set(0, L.BH, -0.03);
      const wood = G.std('#7a4a22', { roughness: 0.55 }), inside = G.std('#2b1a0e', { roughness: 0.9 });
      const cw = 0.78, ch = 0.82, cd = 0.12;
      G.mesh(new T.BoxGeometry(cw, ch, 0.02), inside, 0, 0, 0, cab);
      G.mesh(new T.BoxGeometry(cw, 0.04, cd), wood, 0, ch / 2, cd / 2, cab);
      G.mesh(new T.BoxGeometry(cw, 0.04, cd), wood, 0, -ch / 2, cd / 2, cab);
      G.mesh(new T.BoxGeometry(0.04, ch, cd), wood, -cw / 2, 0, cd / 2, cab);
      G.mesh(new T.BoxGeometry(0.04, ch, cd), wood, cw / 2, 0, cd / 2, cab);
      for (const sx of [-1, 1]) {
        const hinge = new T.Group();
        hinge.position.set(sx * cw / 2, 0, cd);
        hinge.rotation.y = sx * -1.9;
        cab.add(hinge);
        const door = G.mesh(new T.BoxGeometry(cw / 2, ch, 0.025), wood, -sx * cw / 4, 0, 0, hinge);
        // chalk scoreboard lines inside the doors
        const [dc, dg] = G.makeCanvas(128, 256);
        dg.fillStyle = '#1e2a24'; dg.fillRect(0, 0, 128, 256);
        dg.strokeStyle = 'rgba(255,255,255,0.7)'; dg.lineWidth = 3;
        dg.beginPath(); dg.moveTo(64, 20); dg.lineTo(64, 236); dg.moveTo(10, 50); dg.lineTo(118, 50); dg.stroke();
        const slate = new T.Mesh(new T.PlaneGeometry(cw / 2 - 0.06, ch - 0.08), new T.MeshStandardMaterial({ map: G.toTexture(dc), roughness: 1 }));
        slate.position.z = 0.014;
        door.add(slate);
      }
      grp.add(cab);
      // a lamp over the board
      const lamp = new T.Mesh(new T.ConeGeometry(0.22, 0.18, 24, 1, true), G.std('#2c5e3f', { roughness: 0.4, side: T.DoubleSide }));
      lamp.position.set(0, L.BH + 0.95, 0.7);
      grp.add(lamp);
      const bulb = new T.Mesh(new T.SphereGeometry(0.06, 12, 10), new T.MeshBasicMaterial({ color: '#fff2c4' }));
      bulb.position.set(0, L.BH + 0.9, 0.7);
      grp.add(bulb);
      G.mesh(new T.CylinderGeometry(0.006, 0.006, 1.2, 6), G.std('#222'), 0, L.BH + 1.6, 0.7, grp);
      // a little table with a lamp glow, so the room isn't empty
      const tbl = new T.Group();
      tbl.position.set(2.3, 0, 0.9);
      G.mesh(new T.CylinderGeometry(0.4, 0.4, 0.04, 24), G.std('#5a3519', { roughness: 0.5 }), 0, 0.75, 0, tbl);
      G.mesh(new T.CylinderGeometry(0.04, 0.06, 0.75, 10), G.std('#3a2210'), 0, 0.375, 0, tbl);
      grp.add(tbl);
    }
    return grp;
  }

  function setStyle(st) {
    if (style === st && room) return;
    style = st;
    if (room) { scene.remove(room); disposeTree(room); }
    if (board) { scene.remove(board); disposeTree(board); glow = null; }
    room = buildRoom(st);
    scene.add(room);
    board = makeBoard(st);
    board.position.set(0, LOOK[st].BH, 0);
    scene.add(board);
    SC.board = board;
    DT.sfx.setStyle(st);
    if (SC.onStyle) SC.onStyle(st);
  }
  function disposeTree(o) {
    o.traverse((m) => {
      if (m.geometry) m.geometry.dispose();
      if (m.material) [].concat(m.material).forEach((mt) => { if (mt.map) mt.map.dispose(); mt.dispose(); });
    });
  }
  SC.style = () => style;

  // ---------------------------------------------------------------- the cameras
  // AIM: from the throwing line, straight at the board, zoomed so the board's face fills most of the screen whatever
  // its shape. SIDE: from behind and to the right, so you see the players and the board.
  const cam = { mode: 'aim', from: new T.Vector3(), look: new T.Vector3(), fov: 40, t: 1, a: null, b: null };
  function aimView() {
    const L = LOOK[style], B = R.BOARDS[style];
    const F = B.R * B.face * (style === 'classic' ? 1.12 : 1.04);
    const z = L.D - 0.15;
    const aspect = camera.aspect || 1;
    // fit F (plus room for the HUD) vertically, and horizontally on tall phones
    // the board's edge stays at least 60 px in from the sides, clear of the kit's round buttons on the left edge
    const halfW = Math.max(120, window.innerWidth / 2);
    const fitV = F * 1.32, fitH = (F * halfW) / Math.max(60, halfW - 60) / aspect;
    const half = Math.atan(Math.max(fitV, fitH) / z);
    return { pos: new T.Vector3(0, L.BH - F * 0.06, z), look: new T.Vector3(0, L.BH - F * 0.06, 0), fov: (half * 360) / Math.PI };
  }
  function sideView(focus) {
    const L = LOOK[style];
    const f = focus || { x: 0, z: L.D };
    const aspect = camera.aspect || 1;
    const back = aspect < 0.8 ? 1.6 : 1;
    return { pos: new T.Vector3(f.x + 1.5 * back, 1.5, f.z + 2.1 * back), look: new T.Vector3(f.x - 0.3, 0.9, f.z - 0.9), fov: 46 };
  }
  // TITLE: the board on the wall and the players standing to the left of it, facing you
  function titleView() {
    const L = LOOK[style];
    const aspect = camera.aspect || 1;
    const back = aspect < 0.8 ? 1.7 : 1;
    return { pos: new T.Vector3(1.1 * back, 1.4, L.D + 2.6 * back), look: new T.Vector3(-0.95, 1.0, L.D * 0.3), fov: 50 };
  }
  // FRONT: from between the board and the line, looking back at the players (hellos, high fives, the winner's dance)
  function frontView(focus) {
    const L = LOOK[style];
    const f = focus || { x: 0, z: L.D + 0.15 };
    const aspect = camera.aspect || 1;
    const back = aspect < 0.8 ? 0.7 : 0;
    return { pos: new T.Vector3(f.x + 0.3, 0.95, Math.max(0.35, f.z - 1.75 + back * -0.1)), look: new T.Vector3(f.x, 0.68, f.z), fov: aspect < 0.8 ? 66 : 52 };
  }
  function boardView() {
    // a close look at the board after a turn: the darts where they landed
    const v = aimView();
    v.fov *= 0.92;
    return v;
  }
  function setCamera(mode, opts) {
    const v = mode === 'aim' ? aimView() : mode === 'board' ? boardView() : mode === 'front' ? frontView(opts && opts.focus) : mode === 'title' ? titleView() : sideView(opts && opts.focus);
    cam.mode = mode;
    cam.a = { pos: camera.position.clone(), look: cam.look.clone(), fov: camera.fov };
    cam.b = v;
    cam.t = opts && opts.snap ? 1 : 0;
    cam.dur = (opts && opts.dur) || 0.7;
    if (cam.t >= 1) { applyCam(1); camera.updateMatrixWorld(); }
  }
  function applyCam(u) {
    const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    camera.position.lerpVectors(cam.a.pos, cam.b.pos, e);
    cam.look.lerpVectors(cam.a.look, cam.b.look, e);
    camera.fov = cam.a.fov + (cam.b.fov - cam.a.fov) * e;
    camera.updateProjectionMatrix();
    camera.lookAt(cam.look);
  }
  function updateCamera(dt) {
    if (!cam.b) return;
    // keep the target fresh (the window may have changed shape)
    if (cam.t >= 1) {
      const v = cam.mode === 'aim' ? aimView() : cam.mode === 'board' ? boardView() : cam.mode === 'title' ? titleView() : null;
      if (v) { cam.a = cam.b = v; applyCam(1); }
      return;
    }
    cam.t = Math.min(1, cam.t + dt / cam.dur);
    applyCam(cam.t);
  }
  SC.setCamera = setCamera;
  SC.camMode = () => cam.mode;
  SC.camSettled = () => cam.t >= 1;

  // ---------------------------------------------------------------- from the screen to the board and back
  const ray = new T.Raycaster(), ndc = new T.Vector2(), plane = new T.Plane(new T.Vector3(0, 0, 1), 0), hitP = new T.Vector3();
  function boardPoint(clientX, clientY) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (!ray.ray.intersectPlane(plane, hitP)) return null;
    return { x: hitP.x, y: hitP.y - LOOK[style].BH };
  }
  const V = new T.Vector3();
  function toScreen(x, y, z) {
    V.set(x, y + LOOK[style].BH, z || 0).project(camera);
    return { x: (V.x + 1) / 2 * window.innerWidth, y: (1 - V.y) / 2 * window.innerHeight };
  }
  // metres on the board per CSS pixel, in the aim view (for dragging the aim with a finger)
  function metresPerPixel() {
    const dist = Math.abs(camera.position.z);
    return (2 * dist * Math.tan((camera.fov * Math.PI) / 360)) / window.innerHeight;
  }
  SC.boardPoint = boardPoint;
  SC.toScreen = toScreen;
  SC.metresPerPixel = metresPerPixel;

  function render() { renderer.render(scene, camera); }
  function update(dt) { updateCamera(dt); if (SC.updateProps) SC.updateProps(dt); }

  Object.assign(SC, { init, resize, setStyle, render, update, renderer: () => renderer });
  DT.scene = SC;
})();
