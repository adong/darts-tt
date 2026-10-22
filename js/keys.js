/* The keys the ? panel shows. Press ? (Shift + /) in the game, or tap the round ? button.
   The panel and the freeze live in the shared kit: kit/help.js (Kit.help). */
Kit.help.setup({
  title: window.DT_TITLE || 'TT Darts',
  keys: [
    ['aim', '← → ↑ ↓'],
    ['throw', 'Space or Enter'],
    ['call your brother (2 players: high five)', 'T'],
    ['pick your player (title)', '← →'],
    ['easy or normal (title)', 'E'],
    ['kids board or classic board (title)', 'C'],
    ['1 or 2 players (title)', '1 2'],
    ['301 or Around the Clock', '1 2'],
    ['pause', 'P or Esc'],
    ['sound on / off', 'M'],
  ],
  note: 'Mouse: move to aim and click to throw. The aim wobbles a little: throw when the dot is on your number. 2 players take turns on the same keys.',
  touch: 'Slide your finger anywhere to move the aim, and let go to throw (a quick tap throws too). Tap your brother\'s face (bottom right) to call him.',
});
