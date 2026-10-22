/* 中文 for TT Darts: the words on the page, the toasts, the banners, the results card and the ? panel (Kit.lang, from
   kit/lang.js). The kids' names and the game's name stay in English on purpose. The only canvas text is the numbers
   round the board, which are digits in both languages. */
(function () {
  const L = Kit.lang;
  L.keep(['TT Darts', 'TEDDY', 'TOMMY', 'FOXY', 'FROGGY', 'ZOOM', 'LUNA', 'BOLT', 'BRUNO', 'Teddy', 'Tommy', 'Claude Code', 'P · Esc', 'Esc', 'Enter', '301', '–', '●', '○', '25']);

  const TREAT = { 'ICE CREAM': '冰淇淋', WATER: '水', 'JUICE BOX': '果汁', COOKIE: '饼干', WATERMELON: '西瓜', BANANA: '香蕉' };
  L.add({
    // the title screen
    'Aim, wait for the wobble and throw! Count down from 301 or go all the way around the clock, and call your brother for a steady hand.':
      '瞄准，看准晃动的时机，扔飞镖！从 301 分减到 0，或者按顺序把数字打一圈，还可以叫兄弟来帮你稳住手。',
    Board: '飞镖靶', '🐣 KIDS BOARD': '🐣 儿童飞镖靶', '🎯 CLASSIC BOARD': '🎯 经典飞镖靶', 'How many players': '几个人玩',
    '1 PLAYER': '1 个人', '2 PLAYERS': '2 个人', 'CPU FRIEND': '电脑朋友', 'Previous friend': '上一个朋友', 'Next friend': '下一个朋友',
    'Previous player': '上一个玩家', 'Next player': '下一个玩家', 'NO ONE': '没有人', '🦊 STEADY': '🦊 很稳', '🐸 WOBBLY': '🐸 有点晃',
    'PLAY ALONE': '自己玩', 'How hard': '难度', '🐣 EASY': '🐣 简单', '🔥 NORMAL': '🔥 普通', '▶ PLAY': '▶ 开始',
    '🖱️ move to aim, click to throw': '🖱️ 移动鼠标瞄准，点一下扔飞镖', 'aim,': '瞄准，', throw: '扔飞镖', 'call your brother': '叫兄弟来帮忙',
    '👆 slide your finger to aim, let go to throw': '👆 手指滑动来瞄准，松手就扔飞镖', 'built with': '制作工具', 'LOADING…': '加载中…',
    // the two games
    'PICK A GAME': '选一个玩法', '← BACK': '← 返回', 'AROUND THE CLOCK': '数字转一圈',
    'Start at 301 and count down to 0.': '从 301 分开始，一直减到 0。',
    'Hit 1, 2, 3 … all the way to 20, then the bull!': '按顺序打 1、2、3……一直打到 20，最后打靶心！',
    // the HUD
    'Pause (P)': '暂停 (P)', 'Sound (M)': '声音 (M)', 'Call your brother (T)': '叫兄弟来帮忙 (T)', 'High five (T)': '击掌 (T)',
    'TAP ME!': '点我！', 'HIGH FIVE!': '击掌！', BULL: '靶心', 'NOW: BULL': '现在：靶心', MISS: '没中', 'BULL!': '靶心！', 'YES!': '打中了！',
    // banners and toasts
    'NOW HIT THE BULL!': '现在打靶心！', 'FINISH ON A DOUBLE': '最后一镖要打进双倍区', 'COUNT DOWN TO 0': '分数减到 0 就赢',
    'BUST!': '爆分啦！', 'YOU DID IT!': '你做到啦！', 'BULLSEYE!': '正中靶心！', 'TREBLE! JUMP 3!': '三倍区！跳 3 个数！',
    'DOUBLE! JUMP 2!': '双倍区！跳 2 个数！', 'SLIDE YOUR FINGER TO AIM, LET GO TO THROW!': '手指滑动来瞄准，松手就扔！',
    'MOVE THE MOUSE TO AIM, CLICK TO THROW!': '移动鼠标瞄准，点一下就扔！',
    // pause and the results card
    '▶ RESUME': '▶ 继续', '🏠 MENU': '🏠 菜单', PLAYER: '玩家', LEFT: '还剩', REACHED: '打到', DARTS: '飞镖数',
    '0 ✔': '0 ✔', 'BULL ✔': '靶心 ✔', '★ NEW BEST! ★': '★ 新纪录！★', '↻ PLAY AGAIN': '↻ 再玩一次', '🎯 PICK A GAME': '🎯 换个玩法',
    // the ? panel (js/keys.js)
    aim: '瞄准', 'call your brother (2 players: high five)': '叫兄弟来帮忙（两个人玩：击掌）', 'pick your player (title)': '选玩家（标题页）',
    'easy or normal (title)': '简单或普通（标题页）', 'kids board or classic board (title)': '儿童飞镖靶或经典飞镖靶（标题页）',
    '1 or 2 players (title)': '1 个人或 2 个人玩（标题页）', '301 or Around the Clock': '301 或数字转一圈',
    'Space or Enter': '空格 或 Enter',
    'Mouse: move to aim and click to throw. The aim wobbles a little: throw when the dot is on your number. 2 players take turns on the same keys.':
      '鼠标：移动来瞄准，点一下扔飞镖。瞄准点会轻轻晃动：等它晃到你要的数字上再扔。两个人轮流用同一套按键。',
    "Slide your finger anywhere to move the aim, and let go to throw (a quick tap throws too). Tap your brother's face (bottom right) to call him.":
      '手指在屏幕上随便哪里滑动来移动瞄准点，松手就扔（轻点一下也能扔）。点右下角兄弟的头像，叫他来帮忙。',
  });

  const name = (w) => L.t(w);
  L.rule(/^T(\d+)$/, '三倍 $1');
  L.rule(/^D(\d+)$/, '双倍 $1');
  L.rule(/^\+(\d)!$/, '跳 $1 个！');
  L.rule(/^(\d+)!$/, '$1 分！');
  L.rule(/^PLAYER (\d)$/, '玩家 $1');
  L.rule(/^NOW: (\d+)$/, '现在：$1');
  L.rule(/^HIT THE (\d+)$/, '打 $1');
  L.rule(/^(\d+) DARTS$/, '$1 支飞镖');
  L.rule(/^TOO MANY! BACK TO (\d+)$/, '打多啦！回到 $1');
  L.rule(/^1 LEFT CAN’T BE A DOUBLE! BACK TO (\d+)$/, '剩 1 分没法用双倍打完！回到 $1');
  L.rule(/^FINISH ON A DOUBLE! BACK TO (\d+)$/, '最后一镖要打双倍区！回到 $1');
  L.rule(/^YOU NEED (\d+): GO FOR THE BULL!$/, '还差 $1 分：打靶心！');
  L.rule(/^YOU NEED (\d+): GO FOR DOUBLE (\d+)!$/, '还差 $1 分：打双倍 $2！');
  L.rule(/^(.+)'S TURN$/, (m, who) => `轮到 ${name(who)} 啦`);
  L.rule(/^(.+) WINS!$/, (m, who) => `${name(who)} 赢啦！`);
  L.rule(/^(.+) IS HERE!$/, (m, who) => `${name(who)} 来啦！`);
  L.rule(/^(.+) 🏆$/, (m, who) => `${name(who)} 🏆`);
  L.rule(/^(.+) SAYS: I'VE GOT YOUR ARM! NICE AND STEADY!$/, (m, who) => `${name(who)} 说：我扶着你的手！稳稳的！`);
  L.rule(/^(.+) SAYS: I'LL STEADY YOUR NEXT GO!$/, (m, who) => `${name(who)} 说：下一轮我帮你稳住手！`);
  L.rule(/^(\S+) (.+) FROM (.+)!$/, (m, e, item, who) => `${e} ${name(who)} 送来的${TREAT[item] || item}！`);
  L.rule(/^WINS: (.+)$/, (m, list) => '赢的次数：' + list.split(' · ').map((s) => { const i = s.lastIndexOf(' '); return `${name(s.slice(0, i))} ${s.slice(i + 1)}`; }).join(' · '));
  // "TEDDY'S BEST 12 DARTS · TOMMY'S BEST 20 DARTS"
  L.rule(/^(.+'S BEST \d+ DARTS)( · .+'S BEST \d+ DARTS)*$/, (m) => m.split(' · ').map((s) => { const k = /^(.+)'S BEST (\d+) DARTS$/.exec(s); return `${name(k[1])} 的最好成绩 ${k[2]} 支飞镖`; }).join(' · '));
})();
