/* TT Darts: the game's own sounds, built on Kit.sound.tone / hiss (Web Audio, no files). DT.sfx(name, arg) plays one
   of these or, failing that, a kit sound of that name (click, coin, swish...). The board decides the flavour: KIDS is
   plastic and boingy (a suction cup's "thwop"), CLASSIC is a steel dart going "thunk" into the board. */
(function () {
  'use strict';
  const DT = window.DT, S = Kit.sound;
  const { tone, hiss } = S;
  let style = 'kids';

  const OWN = {
    // the dart leaves the hand: a whoosh
    throw() {
      hiss({ filter: 'bandpass', f: 1400, to: 3200, q: 1.2, dur: 0.22, vol: 0.12, attack: 0.03 });
      if (style === 'kids') tone({ type: 'sine', f: 380, to: 620, dur: 0.1, vol: 0.06 });
    },
    // it lands on the board: a suction cup's wet "thwop", or a steel point's "thunk"
    stick() {
      if (style === 'kids') {
        tone({ type: 'sine', f: 440, to: 150, dur: 0.12, vol: 0.28 });
        hiss({ filter: 'lowpass', f: 900, dur: 0.06, vol: 0.12 });
        [0.09, 0.17, 0.24].forEach((at, i) => tone({ type: 'sine', f: 300 - i * 30, to: 360 - i * 30, at, dur: 0.07, vol: 0.06 - i * 0.015 }));
      } else {
        tone({ type: 'sine', f: 190, to: 90, dur: 0.09, vol: 0.3 });
        hiss({ filter: 'bandpass', f: 2200, q: 1.2, dur: 0.05, vol: 0.16 });
        tone({ type: 'triangle', f: 980, to: 940, at: 0.01, dur: 0.16, vol: 0.025 }); // the barrel humming
      }
    },
    // off the board: it bounces off the wall and drops
    wall() {
      tone({ type: 'triangle', f: 520, to: 300, dur: 0.07, vol: 0.12 });
      tone({ type: 'triangle', f: 380, to: 240, at: 0.22, dur: 0.05, vol: 0.06 });
      tone({ type: 'triangle', f: 330, to: 220, at: 0.33, dur: 0.04, vol: 0.04 });
    },
    treble() { [784, 988, 1175].forEach((f, i) => tone({ type: 'triangle', f, at: i * 0.06, dur: 0.14, vol: 0.07 })); },
    double() { [659, 880].forEach((f, i) => tone({ type: 'triangle', f, at: i * 0.07, dur: 0.14, vol: 0.07 })); },
    bull() {
      [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'square', f, at: i * 0.07, dur: 0.16, vol: 0.05, lp: 2400 }));
      tone({ type: 'sine', f: 1568, at: 0.3, dur: 0.6, vol: 0.08 });
    },
    // the right number in Around the Clock
    next() { tone({ type: 'triangle', f: 880, to: 1320, dur: 0.12, vol: 0.08 }); },
    bust() {
      tone({ type: 'sawtooth', f: 220, to: 110, dur: 0.45, vol: 0.09, lp: 900 });
      tone({ type: 'sawtooth', f: 165, to: 82, at: 0.05, dur: 0.45, vol: 0.07, lp: 700 });
    },
    // the darts come out of the board for the next player
    pull() {
      if (style === 'kids') [0, 0.12, 0.24].forEach((at) => tone({ type: 'sine', f: 260, to: 520, at, dur: 0.06, vol: 0.07 }));
      else [0, 0.12, 0.24].forEach((at) => hiss({ filter: 'bandpass', f: 3000, q: 2, at, dur: 0.04, vol: 0.06 }));
    },
    turn() { tone({ type: 'triangle', f: 660, dur: 0.08, vol: 0.06 }); tone({ type: 'triangle', f: 990, at: 0.08, dur: 0.1, vol: 0.06 }); },
    poof() { hiss({ filter: 'bandpass', f: 900, to: 300, q: 0.8, dur: 0.3, vol: 0.14 }); },
    treat() { tone({ type: 'triangle', f: 988, to: 1480, dur: 0.12, vol: 0.08 }); tone({ type: 'triangle', f: 1319, at: 0.1, dur: 0.12, vol: 0.06 }); },
    steady() { tone({ type: 'sine', f: 392, to: 523, dur: 0.4, vol: 0.06 }); tone({ type: 'sine', f: 523, to: 784, at: 0.15, dur: 0.4, vol: 0.05 }); },
    five() { hiss({ filter: 'highpass', f: 1500, dur: 0.06, vol: 0.3 }); tone({ type: 'square', f: 1200, to: 600, dur: 0.05, vol: 0.05 }); },
    cheer() {
      for (let i = 0; i < 8; i++) hiss({ filter: 'bandpass', f: 900 + i * 180, q: 2, at: i * 0.05, dur: 0.6, vol: 0.04 });
      [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone({ type: 'square', f, at: 0.1 + i * 0.12, dur: 0.18, vol: 0.05, lp: 2600 }));
    },
  };

  function sfx(name, arg) {
    if (OWN[name]) return OWN[name](arg);
    if (typeof S[name] === 'function') S[name](arg);
  }
  sfx.setStyle = (s) => { style = s; };
  DT.sfx = sfx;
})();
