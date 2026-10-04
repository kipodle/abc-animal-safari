(function(){
'use strict';

/* ============================================================
   Content
   ============================================================ */
var ORDER = ['dinosaurs','space','ocean','safari','robots','fairy'];

// AI story writer (a small Cloudflare Worker that calls Claude). Turned off until the Worker is deployed.
var AI_ENABLED = false;
var AI_URL = 'https://api.hogthehedgehog.com/story';

var THEMES = {
  dinosaurs: {
    label:'Dinosaur', title:'Dinosaur', emoji:'🦕', place:'Dino Valley',
    pal:'Benny', palFull:'Benny the Brachiosaurus', palEmoji:'🦕', letter:'B',
    items:[['bone','🦴','a bone'],['banana','🍌','a banana'],['butterfly','🦋','a butterfly'],['bird','🐦','a bird'],['balloon','🎈','a balloon']],
    scenes:['🌋🌴☀️','🦕🌿🥚','🔍🦕🌴','🦴🍌🦋','🐦🎈🌿','🌈🦕🎉'],
    words:['DINO','EGG','BONE','FERN','ROAR','FOSSIL','TAIL','BENNY'],
    draw:'dino',
    intro:{s:'{n} woke up in Dino Valley.', m:'The sun was warm and the ferns were tall.', l:'Giant footprints led through the trees, and {n} was ready for a big adventure.'},
    meet:{s:'A big, friendly dinosaur said hello.', m:'It was {P}! "Hello, {n}! Will you help me?" asked {p}.', l:'{p} had a long neck and a kind smile, and {p} needed {n}\'s help.'},
    end:{s:'{n} and {p} had so much fun.', m:'{p} gave {n} a big dino hug.', l:'Back in Dino Valley, the sun began to set. {n} was a brave helper, and {p} would never forget this day.'}
  },
  space: {
    label:'Space', title:'Space', emoji:'🚀', place:'Space',
    pal:'Milo', palFull:'Milo the Martian', palEmoji:'👽', letter:'M',
    items:[['moon','🌙','the moon'],['Mars','🔴','Mars'],['meteor','☄️','a meteor'],['Milky Way','🌌','the Milky Way'],['map','🗺️','a map']],
    scenes:['🚀🌍⭐','👽🛸🌟','🔭👽🪐','🌙🔴☄️','🌌🗺️⭐','🚀🏅🎉'],
    words:['MOON','STAR','ROCKET','MARS','SUN','ORBIT','ALIEN','MILO'],
    draw:'rocket',
    intro:{s:'{n} climbed into a shiny rocket.', m:'Three, two, one... blast off!', l:'The rocket zoomed past the clouds, and soon {n} was floating among the twinkling stars.'},
    meet:{s:'A friendly alien waved hello.', m:'It was {P}! "Hi, {n}! I need a helper!" said {p}.', l:'{p} had green skin and big shiny eyes, and {p} was looking for help.'},
    end:{s:'{n} and {p} cheered.', m:'{p} gave {n} a shiny star medal.', l:'Then the rocket flew home. {n} waved goodbye to {p} and promised to come back.'}
  },
  ocean: {
    label:'Ocean', title:'Ocean', emoji:'🐠', place:'the Blue Sea',
    pal:'Sammy', palFull:'Sammy the Seahorse', palEmoji:'🐠', letter:'S',
    items:[['shell','🐚','a shell'],['starfish','⭐','a starfish'],['seaweed','🌿','some seaweed'],['shark','🦈','a shark'],['sailboat','⛵','a sailboat']],
    scenes:['🌊🐠🫧','🐠🐚🌊','🤿🐠🐙','🐚⭐🌿','🦈⛵🌊','🐬🐠🎉'],
    words:['FISH','WAVE','SHELL','CRAB','SEA','WHALE','REEF','SAMMY'],
    draw:'fish',
    intro:{s:'{n} dived into the blue sea.', m:'Bubbles floated up all around.', l:'The water was warm and sparkly, and colorful fish swam by to say hello.'},
    meet:{s:'A tiny seahorse swam up.', m:'It was {P}! "Can you help me, {n}?" asked {p}.', l:'{p} was small but very brave, and {p} had a big problem to solve.'},
    end:{s:'{n} and {p} swam home.', m:'{p} did a happy twirl in the water.', l:'The sea glowed gold in the evening light. {n} gave {p} a big wave, and the fish all cheered.'}
  },
  safari: {
    label:'Safari', title:'Safari', emoji:'🦁', place:'the Sunny Safari',
    pal:'Leo', palFull:'Leo the Lion', palEmoji:'🦁', letter:'L',
    items:[['leaf','🍃','a leaf'],['ladybug','🐞','a ladybug'],['lizard','🦎','a lizard'],['lake','🏞️','a lake'],['log','🪵','a log']],
    scenes:['🌅🦒🌳','🦁🌾🌳','🔍🦁🦓','🍃🐞🦎','🏞️🪵🍃','🦁🐘🎉'],
    words:['LION','ZEBRA','TREE','SUN','GRASS','HERD','LEO','TRUNK'],
    draw:'lion',
    intro:{s:'{n} rode into the safari.', m:'The grass was golden and the sun was bright.', l:'Zebras ran across the plain, and birds sang in the tall, tall trees.'},
    meet:{s:'A big lion came over.', m:'It was {P}! "Hello, {n}! Please help me!" said {p}.', l:'{p} had a fluffy golden mane and a gentle roar, and {p} needed a clever helper.'},
    end:{s:'{n} and {p} did a happy dance.', m:'{p} gave a big, friendly roar.', l:'As the sun went down, all the safari animals cheered for {n}. It was the best day ever.'}
  },
  robots: {
    label:'Robot', title:'Robot', emoji:'🤖', place:'Robot City',
    pal:'Rusty', palFull:'Rusty the Robot', palEmoji:'🤖', letter:'R',
    items:[['radio','📻','a radio'],['rabbit','🐰','a rabbit'],['rainbow','🌈','a rainbow'],['rocket','🚀','a rocket'],['ruler','📏','a ruler']],
    scenes:['🏙️🤖⚙️','🤖🔧⚡','🔍🤖🔋','📻🐰🌈','🚀📏⚙️','🤖🎊🎉'],
    words:['ROBOT','GEAR','BEEP','WIRE','BOLT','CODE','LASER','RUSTY'],
    draw:'robot',
    intro:{s:'{n} walked into Robot City.', m:'Lights blinked and gears went click, click, click.', l:'Little robots rolled along the streets, and everything beeped and buzzed with excitement.'},
    meet:{s:'A shiny robot rolled up.', m:'It was {P}! "Beep boop! Hi, {n}!" said {p}.', l:'{p} had a squeaky wheel and a big blinking smile, and {p} needed some help.'},
    end:{s:'{n} and {p} high-fived.', m:'{p} flashed all the lights, beep beep!', l:'Every robot in the city beeped a big thank you. {n} had saved the day.'}
  },
  fairy: {
    label:'Fairy Tale', title:'Fairy Tale', emoji:'🧚', place:'Fairy Kingdom',
    pal:'Poppy', palFull:'Poppy the Pixie', palEmoji:'🧚', letter:'P',
    items:[['pumpkin','🎃','a pumpkin'],['petal','🌸','a petal'],['pie','🥧','a pie'],['pony','🐴','a pony'],['present','🎁','a present']],
    scenes:['🏰🌈✨','🧚🌸✨','🔍🧚🏰','🎃🌸🥧','🐴🎁🌷','🏰🧚🎉'],
    words:['FAIRY','WAND','CROWN','STAR','CASTLE','MAGIC','GLITTER','POPPY'],
    draw:'castle',
    intro:{s:'{n} stepped into Fairy Kingdom.', m:'Flowers sparkled and tiny lights floated by.', l:'A pink castle shone on the hill, and the whole kingdom was full of magic.'},
    meet:{s:'A tiny pixie flew down.', m:'It was {P}! "Hello, {n}! I need help!" said {p}.', l:'{p} had glittery wings and a giggly laugh, and {p} had a magic problem.'},
    end:{s:'{n} and {p} twirled and twirled.', m:'{p} sprinkled magic glitter in the air.', l:'The castle bells rang out. The fairies thanked {n}, and the whole kingdom sparkled.'}
  }
};

var INTERESTS = [
  ['dinosaurs','🦕','Dinosaurs'], ['space','🚀','Space'], ['ocean','🐠','Ocean'],
  ['safari','🦁','Safari animals'], ['robots','🤖','Robots'], ['fairy','🧚','Fairy tales']
];
var LEVELS = [
  ['0','Just starting','Very short sentences'],
  ['1','Growing reader','A few sentences a page'],
  ['2','Confident reader','Longer sentences']
];
var STRUGGLES = [
  ['reading','Reading words'], ['letters','Letters and sounds'], ['writing','Writing and spelling'], ['focus','Staying focused']
];
var SWATCHES = [
  ['Red','#E5484D'],['Orange','#F76B15'],['Yellow','#F5C518'],['Green','#30A46C'],
  ['Teal','#12A594'],['Blue','#3E63DD'],['Purple','#8E4EC6'],['Pink','#E93D82']
];
var SOUNDS = {B:'/b/',M:'/m/',S:'/s/',L:'/l/',R:'/r/',P:'/p/'};

var DRAW = {
  dino:
    '<g fill="#fff" stroke="#222" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">' +
    '<path d="M118 190 C80 192 48 215 22 250 C48 244 78 238 104 232 Z"/>' +
    '<rect x="130" y="215" width="30" height="58" rx="15"/><rect x="170" y="222" width="30" height="52" rx="15"/>' +
    '<rect x="228" y="222" width="30" height="52" rx="15"/><rect x="266" y="215" width="30" height="58" rx="15"/>' +
    '<ellipse cx="205" cy="195" rx="98" ry="54"/>' +
    '<path d="M255 170 C285 150 288 110 284 80 L326 80 C330 120 326 168 302 208 Z"/>' +
    '<ellipse cx="320" cy="64" rx="36" ry="25"/><circle cx="332" cy="58" r="4.5" fill="#222"/>' +
    '<path d="M332 74 q10 6 20 -2" fill="none"/>' +
    '<circle cx="170" cy="180" r="11"/><circle cx="215" cy="165" r="11"/><circle cx="238" cy="205" r="11"/><circle cx="190" cy="215" r="9"/>' +
    '<circle cx="60" cy="50" r="26"/>' +
    '<path d="M92 50H106M82.6 72.6L92.5 82.5M60 82V96M37.4 72.6L27.5 82.5M28 50H14M37.4 27.4L27.5 17.5M60 18V4M82.6 27.4L92.5 17.5" fill="none"/>' +
    '<path d="M8 276H392" fill="none"/>' +
    '<path d="M345 276 q-8 -26 0 -44 M358 276 q4 -20 -4 -34 M372 276 q8 -26 0 -42" fill="none"/>' +
    '</g>',
  rocket:
    '<g fill="#fff" stroke="#222" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">' +
    '<path d="M130 175 L85 235 L130 225 Z"/><path d="M270 175 L315 235 L270 225 Z"/>' +
    '<path d="M200 25 C255 70 262 150 245 225 L155 225 C138 150 145 70 200 25 Z"/>' +
    '<circle cx="200" cy="105" r="26"/><circle cx="200" cy="105" r="14"/>' +
    '<path d="M170 225 Q200 285 230 225 Z"/><path d="M152 190 H248" fill="none"/>' +
    '<path transform="translate(60 60)" d="M0 -13 L4 -4 L13 -4 L6 2 L8 12 L0 6 L-8 12 L-6 2 L-13 -4 L-4 -4 Z"/>' +
    '<path transform="translate(345 70)" d="M0 -13 L4 -4 L13 -4 L6 2 L8 12 L0 6 L-8 12 L-6 2 L-13 -4 L-4 -4 Z"/>' +
    '<path transform="translate(70 185)" d="M0 -13 L4 -4 L13 -4 L6 2 L8 12 L0 6 L-8 12 L-6 2 L-13 -4 L-4 -4 Z"/>' +
    '<path transform="translate(300 28)" d="M0 -13 L4 -4 L13 -4 L6 2 L8 12 L0 6 L-8 12 L-6 2 L-13 -4 L-4 -4 Z"/>' +
    '<circle cx="335" cy="232" r="24"/><ellipse cx="335" cy="232" rx="42" ry="9" fill="none"/>' +
    '</g>',
  fish:
    '<g fill="#fff" stroke="#222" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">' +
    '<path d="M285 150 L365 92 L365 208 Z"/><path d="M150 92 Q185 30 238 94 Z"/><path d="M165 208 Q190 262 232 208 Z"/>' +
    '<ellipse cx="185" cy="150" rx="105" ry="64"/>' +
    '<circle cx="124" cy="135" r="12"/><circle cx="122" cy="135" r="5" fill="#222"/>' +
    '<path d="M95 176 q18 12 36 0" fill="none"/>' +
    '<path d="M180 120 q-20 18 0 36 M215 118 q-20 18 0 36 M250 122 q-20 16 0 30" fill="none"/>' +
    '<circle cx="62" cy="92" r="9"/><circle cx="42" cy="62" r="6"/><circle cx="80" cy="52" r="7"/>' +
    '<path d="M40 292 q-18 -30 0 -55 q18 -25 0 -50 M70 292 q-16 -26 0 -46 q14 -22 0 -42" fill="none"/>' +
    '<path d="M0 22 q25 -16 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" fill="none"/>' +
    '</g>',
  lion:
    '<g fill="#fff" stroke="#222" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">' +
    '<circle cx="305" cy="150" r="36"/><circle cx="291" cy="203" r="36"/><circle cx="253" cy="241" r="36"/><circle cx="200" cy="255" r="36"/>' +
    '<circle cx="148" cy="241" r="36"/><circle cx="109" cy="203" r="36"/><circle cx="95" cy="150" r="36"/><circle cx="109" cy="97" r="36"/>' +
    '<circle cx="148" cy="59" r="36"/><circle cx="200" cy="45" r="36"/><circle cx="253" cy="59" r="36"/><circle cx="291" cy="97" r="36"/>' +
    '<circle cx="142" cy="88" r="24"/><circle cx="258" cy="88" r="24"/>' +
    '<circle cx="200" cy="150" r="88"/>' +
    '<circle cx="168" cy="132" r="9" fill="#222"/><circle cx="232" cy="132" r="9" fill="#222"/>' +
    '<path d="M186 160 L214 160 L200 178 Z" fill="#222"/>' +
    '<path d="M200 178 V192 M200 192 q-16 14 -32 4 M200 192 q16 14 32 4" fill="none"/>' +
    '<path d="M146 168 H116 M146 180 L120 192 M254 168 H284 M254 180 L280 192" fill="none"/>' +
    '</g>',
  robot:
    '<g fill="#fff" stroke="#222" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">' +
    '<path d="M200 40 V16" fill="none"/><circle cx="200" cy="12" r="8"/>' +
    '<rect x="112" y="68" width="20" height="44" rx="6"/><rect x="268" y="68" width="20" height="44" rx="6"/>' +
    '<rect x="130" y="40" width="140" height="104" rx="16"/>' +
    '<circle cx="170" cy="82" r="16"/><circle cx="230" cy="82" r="16"/><circle cx="170" cy="82" r="6" fill="#222"/><circle cx="230" cy="82" r="6" fill="#222"/>' +
    '<rect x="162" y="112" width="76" height="20" rx="8"/><path d="M181 112 V132 M200 112 V132 M219 112 V132" fill="none"/>' +
    '<rect x="95" y="160" width="32" height="92" rx="16"/><rect x="273" y="160" width="32" height="92" rx="16"/>' +
    '<rect x="143" y="152" width="114" height="108" rx="16"/>' +
    '<rect x="165" y="170" width="70" height="40" rx="8"/><circle cx="178" cy="236" r="9"/><circle cx="200" cy="236" r="9"/><circle cx="222" cy="236" r="9"/>' +
    '<rect x="157" y="260" width="34" height="32" rx="8"/><rect x="209" y="260" width="34" height="32" rx="8"/>' +
    '<path d="M180 190 H220" fill="none"/>' +
    '</g>',
  castle:
    '<g fill="#fff" stroke="#222" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">' +
    '<rect x="115" y="140" width="170" height="130"/>' +
    '<rect x="85" y="95" width="55" height="175"/><path d="M80 95 L112 45 L145 95 Z"/>' +
    '<rect x="260" y="95" width="55" height="175"/><path d="M255 95 L287 45 L320 95 Z"/>' +
    '<rect x="170" y="90" width="60" height="180"/><path d="M165 90 L200 30 L235 90 Z"/>' +
    '<path d="M200 30 V8 L226 17 L200 26" fill="none"/>' +
    '<path d="M180 270 V228 a20 20 0 0 1 40 0 V270 Z"/>' +
    '<rect x="100" y="130" width="25" height="38" rx="12"/><rect x="275" y="130" width="25" height="38" rx="12"/>' +
    '<rect x="188" y="115" width="24" height="36" rx="12"/>' +
    '<path d="M130 275 H270" fill="none"/><path d="M8 276 H392" fill="none"/>' +
    '<path transform="translate(45 60)" d="M0 -13 L4 -4 L13 -4 L6 2 L8 12 L0 6 L-8 12 L-6 2 L-13 -4 L-4 -4 Z"/>' +
    '<path transform="translate(355 60)" d="M0 -13 L4 -4 L13 -4 L6 2 L8 12 L0 6 L-8 12 L-6 2 L-13 -4 L-4 -4 Z"/>' +
    '<path d="M330 276 q-6 -24 0 -40 M345 276 q4 -18 -2 -30 M360 276 q6 -24 0 -38" fill="none"/>' +
    '</g>'
};

/* ============================================================
   Helpers
   ============================================================ */
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

function hexToRgb(h){ var n = parseInt(h.slice(1),16); return [(n>>16)&255,(n>>8)&255,n&255]; }
function mix(h, w){ var c = hexToRgb(h); return 'rgb(' + c.map(function(v){ return Math.round(v + (255 - v) * w); }).join(',') + ')'; }
function onColor(h){ var c = hexToRgb(h); var l = (0.299*c[0] + 0.587*c[1] + 0.114*c[2]) / 255; return l > 0.62 ? '#2d2418' : '#ffffff'; }

function makeRng(seed){
  var h = 2166136261;
  for(var i = 0; i < seed.length; i++){ h = Math.imul(h ^ seed.charCodeAt(i), 16777619); }
  return function(){
    h += 0x6D2B79F5; var t = h;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shuffled(arr, rnd){
  var a = arr.slice();
  for(var i = a.length - 1; i > 0; i--){ var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

function fmt(str, ctx){
  return str.replace(/\{(\w+)\}/g, function(_, k){ return ctx[k] != null ? ctx[k] : ''; });
}
function byLevel(obj, level){
  var out = [obj.s];
  if(level >= 1) out.push(obj.m);
  if(level >= 2) out.push(obj.l);
  return out.join(' ');
}

/* ============================================================
   Word search
   ============================================================ */
function makeWordSearch(words, size, level, rnd){
  var grid = []; var r, c;
  for(r = 0; r < size; r++){ grid.push(new Array(size).fill('')); }
  var dirs = [[0,1],[1,0]];
  if(level >= 1) dirs.push([1,1]);
  var placed = [];
  words.slice().sort(function(a,b){ return b.length - a.length; }).forEach(function(w){
    for(var attempt = 0; attempt < 300; attempt++){
      var d = dirs[Math.floor(rnd() * dirs.length)];
      var r0 = Math.floor(rnd() * size), c0 = Math.floor(rnd() * size);
      var r1 = r0 + d[0] * (w.length - 1), c1 = c0 + d[1] * (w.length - 1);
      if(r1 >= size || c1 >= size) continue;
      var ok = true;
      for(var i = 0; i < w.length; i++){
        var cell = grid[r0 + d[0]*i][c0 + d[1]*i];
        if(cell !== '' && cell !== w[i]){ ok = false; break; }
      }
      if(!ok) continue;
      for(var j = 0; j < w.length; j++){ grid[r0 + d[0]*j][c0 + d[1]*j] = w[j]; }
      placed.push(w);
      return;
    }
  });
  var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for(r = 0; r < size; r++){ for(c = 0; c < size; c++){ if(grid[r][c] === '') grid[r][c] = letters[Math.floor(rnd() * 26)]; } }
  return {grid:grid, placed:placed};
}

/* ============================================================
   Build the book
   ============================================================ */
function buildModel(f){
  var theme = THEMES[f.interests[0]];
  var theme2 = f.interests[1] ? THEMES[f.interests[1]] : null;
  var n = f.name;
  var ctx = {n:esc(n), p:theme.pal, P:theme.palFull, L:theme.letter, place:theme.place};
  theme.items.forEach(function(it, i){ ctx['i' + i] = it[1]; ctx['i' + i + 'a'] = it[2]; ctx['i' + i + 'w'] = it[0]; });

  var lv = f.level;
  var pages = [];
  pages.push({scene:theme.scenes[0], text:byLevel(theme.intro, lv)});
  pages.push({scene:theme.scenes[1], text:byLevel(theme.meet, lv)});
  pages.push({scene:theme.scenes[2], text:byLevel({
    s:'{p} said, "Let us find 5 things that start with {L}!"',
    m:'Each one begins with the letter {L}, just like {p}\'s name.',
    l:'{n} took a deep breath. "{L} is for {p}, so we should look for 5 things that start with {L}. Let us go!"'
  }, lv)});
  pages.push({scene:theme.scenes[3], text:byLevel({
    s:'{n} found {i0a}, {i1a}, and {i2a}.',
    m:'"{i0w}, {i1w}, {i2w}... {L}, {L}, {L}!" sang {n}.',
    l:'{n} looked up and down and all around. First came {i0a}, then {i1a}, and then {i2a}. Three {L} words already!'
  }, lv)});
  pages.push({scene:theme.scenes[4], text:byLevel({
    s:'Then {n} found {i3a} and {i4a}.',
    m:'That makes five! {n} counted: one, two, three, four, five!',
    l:'Next {n} spotted {i3a}, and finally {i4a}. "Five things that start with {L}!" {n} cheered. "We did it!"'
  }, lv)});
  var endText = byLevel(theme.end, lv);
  if(theme2){ endText += ' Far away, ' + theme2.palFull + ' waved hello. Maybe next time!'; }
  pages.push({scene:theme.scenes[5], text:endText});
  pages = pages.map(function(p){ return {scene:p.scene, text:fmt(p.text, ctx)}; });

  var seed = n.toLowerCase() + '|' + f.interests.join(',') + '|' + f.age;
  return {f:f, theme:theme, theme2:theme2, ctx:ctx, pages:pages, rnd:makeRng(seed)};
}

function vars(f){
  return '--accent:' + f.color + ';--tint:' + mix(f.color, 0.86) + ';--on:' + onColor(f.color) + ';';
}

function photoHtml(f, cls, emoji){
  return '<div class="round-photo ' + cls + '">' + (f.photo ? '<img src="' + f.photo + '" alt="">' : emoji) + '</div>';
}

function head(m){
  return '<div class="sh-head"><span>' + m.theme.emoji + ' ' + esc(m.f.name) + '\'s ' + m.theme.title + ' Adventure</span><span>hogthehedgehog.com</span></div>';
}

function sheet(m, cls, inner){
  return '<section class="sheet ' + cls + '" style="' + vars(m.f) + '">' + inner + '</section>';
}

function coverSheet(m){
  var f = m.f, t = m.theme;
  var inc = ['📖 Story','🔤 Letter hunt','🧩 Puzzle','🖍️ Coloring','🏆 Daily challenges','📊 Parent guide'];
  return sheet(m, 'cover',
    '<div class="cover-top" aria-hidden="true">' + t.scenes[0] + '</div>' +
    photoHtml(f, 'cover-photo', t.palEmoji) +
    '<h1>' + esc(f.name) + '\'s<br>' + t.title + ' Adventure</h1>' +
    '<p class="cover-sub">A personalized story for ' + esc(f.name) + ', age ' + f.age + '</p>' +
    '<ul class="cover-includes">' + inc.map(function(x){ return '<li>' + x + '</li>'; }).join('') + '</ul>' +
    '<p class="cover-foot">hogthehedgehog.com</p>');
}

function storySheet(m, i){
  var p = m.pages[i], f = m.f;
  var size = f.age <= 5 ? 46 : (f.age <= 8 ? 42 : 36);
  if(f.level === 0) size += 4;
  var chars = plain(p.text).length;
  while(size > 22 && Math.ceil(chars * 0.57 * size / 682) * size * 1.38 > 350){ size -= 2; }
  return sheet(m, 'story',
    head(m) +
    '<div class="scene-box"><div class="scene" aria-hidden="true">' + p.scene + '</div></div>' +
    '<p class="story-text" style="font-size:' + size + 'px">' + p.text + '</p>' +
    photoHtml(f, 'story-photo', m.theme.palEmoji) +
    '<div class="story-name">' + esc(f.name) + '</div>');
}

function huntSheet(m){
  var t = m.theme, f = m.f, L = t.letter;
  var items = t.items.map(function(it){
    return '<div class="hunt-item"><div class="em">' + it[1] + '</div><div class="wr">' + esc(it[0]) + '</div><div class="line"></div></div>';
  }).join('');
  return sheet(m, 'hunt',
    head(m) +
    '<h2>Letter hunt</h2>' +
    '<p class="lead">' + esc(f.name) + ' and ' + t.palFull + ' are looking for 5 things beginning with ' + L + '. Say each word out loud and listen for the first sound.</p>' +
    '<div class="hunt-letter"><div class="big-letter">' + L + L.toLowerCase() + '</div>' +
    '<div><span class="accent-pill">' + L + ' says ' + (SOUNDS[L] || '') + '</span>' +
    '<p class="lead" style="margin-top:10px">' + L + ' is for <b>' + esc(t.pal) + '</b>!</p></div></div>' +
    '<div class="hunt-items">' + items + '</div>' +
    '<p class="lead" style="margin-top:20px">Trace the letter, then write it on your own:</p>' +
    '<div class="trace-row tall"><span>' + L + ' ' + L.toLowerCase() + ' ' + L + ' ' + L.toLowerCase() + ' ' + L + '</span></div>' +
    '<div class="trace-row tall blank"></div>');
}

function nameSheet(m){
  var f = m.f, nm = esc(f.name);
  var rows = '';
  for(var i = 0; i < 3; i++){ rows += '<div class="trace-row tall"><span>' + nm + '</span></div>'; }
  rows += '<div class="trace-row tall blank"></div><div class="trace-row tall blank"></div>';
  var extra = f.struggles.indexOf('writing') >= 0 || f.struggles.indexOf('letters') >= 0
    ? '<p class="lead" style="margin-top:14px">Tip: trace with a finger first, then with a pencil. Say each letter name as you go.</p>' : '';
  return sheet(m, 'name',
    head(m) +
    '<h2>This is my name</h2>' +
    '<p class="lead">Trace ' + nm + '\'s name, then write it by yourself.</p>' +
    extra + rows);
}

function readingSheet(m){
  var t = m.theme, f = m.f, rnd = m.rnd;
  var words = t.items.map(function(it){ return it[0]; });
  var pickN = 3;
  var choiceRows = '';
  for(var i = 0; i < pickN; i++){
    var correct = words[i];
    var others = shuffled(words.filter(function(w){ return w !== correct; }), rnd).slice(0, 2);
    var opts = shuffled([correct].concat(others), rnd);
    choiceRows += '<div class="ex-row"><div class="em">' + t.items[i][1] + '</div><div class="choices">' +
      opts.map(function(w){ return '<div class="choice">' + esc(w) + '</div>'; }).join('') + '</div></div>';
  }
  var fillN = f.level === 0 ? 3 : 4;
  var order = shuffled(t.items.map(function(it, idx){ return idx; }), rnd).slice(0, fillN);
  var bank = shuffled(order, rnd).map(function(idx){ return '<span>' + esc(t.items[idx][0]) + '</span>'; }).join('');
  var fills = order.map(function(idx){
    return '<div class="ex-row"><div class="em">' + t.items[idx][1] + '</div><div class="fill">' + esc(f.name) + ' found <span class="blank"></span>.</div></div>';
  }).join('');
  var lines = f.level >= 1 ? 3 : 2;
  var wl = '';
  for(var k = 0; k < lines; k++){ wl += '<div class="write-line"></div>'; }
  return sheet(m, 'reading',
    head(m) +
    '<h2>Reading time</h2>' +
    '<div class="ex"><h3>1. Circle the right word</h3>' + choiceRows + '</div>' +
    '<div class="ex"><h3>2. Fill in the blank</h3><div class="bank">' + bank + '</div>' + fills + '</div>' +
    '<div class="ex"><h3>3. Write about ' + esc(t.pal) + ' and ' + esc(f.name) + '</h3>' + wl + '</div>');
}

function searchSheet(m){
  var t = m.theme, f = m.f, rnd = m.rnd;
  var pool = t.words.slice(0, 7).filter(function(w){ return w !== t.pal.toUpperCase(); });
  var words = shuffled(pool, rnd).slice(0, m.theme2 ? 4 : 6);
  if(m.theme2){
    words = words.concat(shuffled(m.theme2.words.filter(function(w){ return words.indexOf(w) < 0; }), rnd).slice(0, 2));
  }
  var nameWord = f.name.toUpperCase().replace(/[^A-Z]/g, '');
  if(nameWord.length >= 2 && nameWord.length <= 9 && words.indexOf(nameWord) < 0){ words.push(nameWord); }
  words = words.filter(function(w){ return w.length <= 9; });
  var ws = makeWordSearch(words, 10, f.level, rnd);
  var table = '<table class="ws-grid">' + ws.grid.map(function(row){
    return '<tr>' + row.map(function(ch){ return '<td>' + ch + '</td>'; }).join('') + '</tr>';
  }).join('') + '</table>';
  var list = '<ul class="ws-words">' + ws.placed.map(function(w){ return '<li>' + w + '</li>'; }).join('') + '</ul>';
  var dir = f.level >= 1 ? 'Words go across, down and diagonally.' : 'Words go across and down.';
  return sheet(m, 'search',
    head(m) +
    '<h2>Word search</h2>' +
    '<p class="lead">Find all the words. ' + dir + ' Can you spot ' + esc(f.name) + '\'s name?</p>' +
    '<div class="ws-wrap">' + table + list + '</div>');
}

function colorSheet(m){
  var t = m.theme;
  return sheet(m, 'color',
    head(m) +
    '<h2>Color ' + esc(t.pal) + '!</h2>' +
    '<p class="lead">Grab your crayons and color ' + esc(m.f.name) + '\'s ' + t.label.toLowerCase() + ' picture.</p>' +
    '<div class="color-art"><svg viewBox="0 0 400 300" role="img" aria-label="Coloring picture">' + DRAW[t.draw] + '</svg></div>' +
    '<p class="lead" style="margin-top:16px">Colored by: ______________________</p>');
}

function dailySheet(m){
  var t = m.theme, f = m.f, nm = esc(f.name);
  var days = [
    'Read the story out loud with a grown-up.',
    'Trace ' + nm + '\'s name three times.',
    'Find 5 things at home that start with ' + t.letter + '.',
    'Play the ABC Animal Safari game for 10 minutes.',
    'Do the word search with ' + esc(t.pal) + '.',
    'Draw ' + nm + ' and ' + esc(t.pal) + ' on a new adventure.',
    'Tell the story in your own words.'
  ];
  if(f.struggles.indexOf('reading') >= 0){ days[0] = 'Read pages 1 to 3 out loud, pointing at each word.'; days[6] = 'Read your favorite page to someone you love.'; }
  var rows = days.map(function(d, i){
    return '<div class="day"><div class="badge">Day ' + (i + 1) + '</div><div class="task">' + d + '</div><div class="check"></div><div class="sticker"></div></div>';
  }).join('');
  return sheet(m, 'daily',
    head(m) +
    '<h2>7-day challenge</h2>' +
    '<p class="lead">Do one challenge a day. Tick the box and add a sticker when ' + nm + ' finishes!</p>' + rows);
}

function parentSheet(m){
  var f = m.f, t = m.theme, nm = esc(f.name);
  var lvlName = LEVELS[f.level][1];
  var interestNames = f.interests.map(function(k){ return INTERESTS.filter(function(i){ return i[0] === k; })[0][2]; }).join(' + ');
  var focus = f.struggles.length ? f.struggles.map(function(k){ return STRUGGLES.filter(function(s){ return s[0] === k; })[0][1]; }).join(', ') : 'General practice';
  var skills = [
    'Recognizes the letter ' + t.letter,
    'Says the sound ' + (SOUNDS[t.letter] || ''),
    'Reads the story words',
    'Writes ' + nm + '\'s name',
    'Finds words that start with ' + t.letter
  ];
  var star = '<td class="star">☆☆☆☆☆</td>';
  var rows = skills.map(function(s){ return '<tr><td>' + s + '</td>' + star + star + star + star + '</tr>'; }).join('');
  var tipMap = {
    reading:'Read together for 10 minutes a day. Point to each word, and let ' + nm + ' read the repeated words ("' + t.letter + '", "' + esc(t.pal) + '") by themselves.',
    letters:'Practice one letter and sound at a time. Use the letter hunt page and look for the letter on signs, food and toys.',
    writing:'Keep writing sessions short. Trace with a finger first, then crayon, then pencil.',
    focus:'Try 5 to 10 minute sessions. Use the daily challenge stickers as a small reward.'
  };
  var tips = f.struggles.map(function(k){ return '<p>• ' + tipMap[k] + '</p>'; });
  tips.push('<p>• Praise effort, not speed. Short, happy sessions work better than long ones.</p>');
  return sheet(m, 'parent',
    head(m) +
    '<h2>Parent guide and progress tracker</h2>' +
    '<div class="profile">' +
      '<div><span>Child: </span>' + nm + '</div><div><span>Age: </span>' + f.age + '</div>' +
      '<div><span>Reading level: </span>' + lvlName + '</div><div><span>Loves: </span>' + interestNames + '</div>' +
      '<div style="grid-column:1/-1"><span>Focus: </span>' + focus + '</div>' +
    '</div>' +
    '<table class="track"><tr><th>Skill</th><th>Week 1</th><th>Week 2</th><th>Week 3</th><th>Week 4</th></tr>' + rows + '</table>' +
    '<p class="lead" style="margin-top:14px;font-size:18px">Color in one star for each skill ' + nm + ' can do (1 = just starting, 5 = does it easily).</p>' +
    '<h2 style="font-size:30px;margin-top:20px">Tips for you</h2><div class="tips">' + tips.join('') + '</div>');
}

function buildSheets(m){
  var out = [coverSheet(m)];
  for(var i = 0; i < m.pages.length; i++){ out.push(storySheet(m, i)); }
  out.push(huntSheet(m), nameSheet(m), readingSheet(m), searchSheet(m), colorSheet(m), dailySheet(m), parentSheet(m));
  return out;
}

/* ============================================================
   Photo handling (stays in the browser)
   ============================================================ */
var photoImg = null;
var photoPrev = $('photoPrev'), pf = $('photoFile'), pz = $('photoZoom'), px = $('photoX'), py = $('photoY');

function drawPhoto(canvas, size){
  canvas.width = size; canvas.height = size;
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);
  var w = photoImg.naturalWidth, h = photoImg.naturalHeight;
  var zoom = parseFloat(pz.value), dx = parseFloat(px.value), dy = parseFloat(py.value);
  var side = Math.min(w, h) / zoom;
  var x0 = (w - side) / 2 * (1 + dx);
  var y0 = (h - side) / 2 * (1 + dy);
  ctx.drawImage(photoImg, x0, y0, side, side, 0, 0, size, size);
}
function refreshPreview(){
  if(!photoImg) return;
  var c = photoPrev.querySelector('canvas');
  if(!c){ photoPrev.textContent = ''; c = document.createElement('canvas'); photoPrev.appendChild(c); }
  drawPhoto(c, 300);
}
function setSlidersEnabled(on){ [pz, px, py].forEach(function(el){ el.disabled = !on; }); }

pf.addEventListener('change', function(){
  var file = pf.files && pf.files[0];
  $('formError').textContent = '';
  if(!file){ photoImg = null; photoPrev.textContent = '📷'; setSlidersEnabled(false); return; }
  if(file.size > 25 * 1024 * 1024){ $('formError').textContent = 'That photo is too large. Please choose one under 25 MB.'; pf.value = ''; return; }
  var url = URL.createObjectURL(file);
  var img = new Image();
  img.onload = function(){
    photoImg = img; pz.value = 1; px.value = 0; py.value = 0;
    setSlidersEnabled(true); refreshPreview();
  };
  img.onerror = function(){
    URL.revokeObjectURL(url); photoImg = null; photoPrev.textContent = '📷'; setSlidersEnabled(false); pf.value = '';
    $('formError').textContent = 'We could not read that photo. Please try a JPG or PNG.';
  };
  img.src = url;
});
[pz, px, py].forEach(function(el){ el.addEventListener('input', refreshPreview); });

function finalPhoto(){
  if(!photoImg) return null;
  var c = document.createElement('canvas');
  drawPhoto(c, 600);
  return c.toDataURL('image/jpeg', 0.9);
}

/* ============================================================
   Form
   ============================================================ */
(function buildForm(){
  var age = $('childAge');
  for(var a = 3; a <= 12; a++){ var o = document.createElement('option'); o.value = a; o.textContent = a; if(a === 6) o.selected = true; age.appendChild(o); }

  $('interestChips').innerHTML = INTERESTS.map(function(it){
    return '<label class="chip"><input type="checkbox" name="interest" value="' + it[0] + '"><span>' + it[1] + ' ' + it[2] + '</span></label>';
  }).join('');
  $('levelChips').innerHTML = LEVELS.map(function(l, i){
    return '<label class="chip"><input type="radio" name="level" value="' + l[0] + '"' + (i === 0 ? ' checked' : '') + '><span>' + l[1] + ' <small>(' + l[2] + ')</small></span></label>';
  }).join('');
  $('struggleChips').innerHTML = STRUGGLES.map(function(s){
    return '<label class="chip"><input type="checkbox" name="struggle" value="' + s[0] + '"><span>' + s[1] + '</span></label>';
  }).join('');
  $('colorSwatches').innerHTML = SWATCHES.map(function(c, i){
    return '<label class="swatch" title="' + c[0] + '"><input type="radio" name="color" value="' + c[1] + '" aria-label="' + c[0] + '"' + (i === 5 ? ' checked' : '') + '><span style="background:' + c[1] + '"></span></label>';
  }).join('');

  $('interestChips').addEventListener('change', function(){
    var boxes = [].slice.call(document.querySelectorAll('input[name="interest"]'));
    var count = boxes.filter(function(b){ return b.checked; }).length;
    boxes.forEach(function(b){ b.disabled = count >= 2 && !b.checked; });
  });
})();

function readForm(){
  var name = $('childName').value.replace(/\s+/g, ' ').trim();
  name = name.charAt(0).toUpperCase() + name.slice(1);
  return {
    name: name,
    age: parseInt($('childAge').value, 10),
    interests: [].slice.call(document.querySelectorAll('input[name="interest"]:checked')).map(function(b){ return b.value; }),
    level: parseInt(document.querySelector('input[name="level"]:checked').value, 10),
    struggles: [].slice.call(document.querySelectorAll('input[name="struggle"]:checked')).map(function(b){ return b.value; }),
    color: document.querySelector('input[name="color"]:checked').value,
    photo: finalPhoto()
  };
}

/* ============================================================
   AI story (optional)
   ============================================================ */
function fetchAiPages(f){
  var ctrl = new AbortController();
  var timer = setTimeout(function(){ ctrl.abort(); }, 45000);
  return fetch(AI_URL, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({name:f.name, age:f.age, level:f.level, theme:f.interests[0], theme2:f.interests[1], struggles:f.struggles}),
    signal: ctrl.signal
  }).then(function(r){
    if(!r.ok) throw new Error('status ' + r.status);
    return r.json();
  }).then(function(d){
    if(!d || !Array.isArray(d.pages) || d.pages.length !== 6) throw new Error('bad response');
    return d.pages.map(function(x){ return String(x).slice(0, 420); });
  }).finally(function(){ clearTimeout(timer); });
}

/* ============================================================
   Show the result
   ============================================================ */
var current = null;
var speakingBtn = null;

function stopSpeaking(){
  if('speechSynthesis' in window){ window.speechSynthesis.cancel(); }
  if(speakingBtn){ speakingBtn.textContent = '🔊 Read aloud'; speakingBtn = null; }
}
function toggleSpeak(btn, text){
  if(!('speechSynthesis' in window)) return;
  var same = speakingBtn === btn;
  stopSpeaking();
  if(same) return;
  var u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US'; u.rate = 0.85;
  u.onend = function(){ if(speakingBtn === btn){ btn.textContent = '🔊 Read aloud'; speakingBtn = null; } };
  speakingBtn = btn; btn.textContent = '⏹ Stop';
  window.speechSynthesis.speak(u);
}

function fitSheets(){
  var frames = document.querySelectorAll('.sheet-frame');
  if(!frames.length) return;
  var avail = Math.min(794, $('book').clientWidth || 794);
  var scale = avail / 794;
  [].forEach.call(frames, function(fr){
    fr.style.width = (794 * scale) + 'px';
    fr.style.height = (1123 * scale) + 'px';
    var s = fr.firstElementChild;
    s.style.transform = 'scale(' + scale + ')';
  });
}
window.addEventListener('resize', fitSheets);

function plain(html){ var d = document.createElement('div'); d.innerHTML = html; return d.textContent; }

function render(m){
  current = m;
  var sheets = buildSheets(m);
  var total = sheets.length;
  var book = $('book');
  book.innerHTML = '';
  sheets.forEach(function(html, i){
    var block = document.createElement('div'); block.className = 'page-block';
    var storyIdx = i - 1;
    if(storyIdx >= 0 && storyIdx < m.pages.length){
      var tools = document.createElement('div'); tools.className = 'page-tools';
      var b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-light'; b.textContent = '🔊 Read aloud';
      b.style.padding = '6px 16px'; b.style.fontSize = '0.95rem';
      if(!('speechSynthesis' in window)) b.hidden = true;
      b.addEventListener('click', function(){ toggleSpeak(b, plain(m.pages[storyIdx].text)); });
      tools.appendChild(b); block.appendChild(tools);
    }
    var frame = document.createElement('div'); frame.className = 'sheet-frame';
    frame.innerHTML = html;
    var sh = frame.firstElementChild;
    var foot = document.createElement('div'); foot.className = 'sh-foot';
    foot.innerHTML = '<span></span><span>' + (i + 1) + ' / ' + total + '</span>';
    if(i > 0) sh.appendChild(foot);
    block.appendChild(frame);
    book.appendChild(block);
  });
  $('resultTitle').textContent = m.f.name + '\'s ' + m.theme.title + ' Adventure is ready';
  $('included').innerHTML = ['📖 6-page story', '🔤 Letter hunt', '✏️ Name tracing', '📚 Reading time', '🧩 Word search', '🖍️ Coloring page', '🏆 7-day challenge', '📊 Parent guide']
    .map(function(x){ return '<li>' + x + '</li>'; }).join('');
  $('results').hidden = false;
  $('pdfStatus').textContent = '';
  fitSheets();
  $('results').scrollIntoView({behavior:'smooth', block:'start'});
}

$('storyForm').addEventListener('submit', async function(ev){
  ev.preventDefault();
  var err = $('formError');
  err.textContent = '';
  var f = readForm();
  if(!f.name){ err.textContent = 'Please enter your child\'s name.'; $('childName').focus(); return; }
  if(!/^[A-Za-z\u00C0-\u024F\u0590-\u05FF\u0600-\u06FF' \-]+$/.test(f.name)){ err.textContent = 'Please use letters only for the name.'; $('childName').focus(); return; }
  if(f.interests.length < 1){ err.textContent = 'Please choose at least one thing they love.'; return; }
  stopSpeaking();
  var m = buildModel(f);
  var note = '';
  var wantAi = AI_ENABLED && $('useAi') && $('useAi').checked;
  var btn = $('makeBtn');
  if(wantAi){
    btn.disabled = true; btn.textContent = 'Writing ' + f.name + '\'s story...';
    try{
      var pages = await fetchAiPages(f);
      m.pages = m.pages.map(function(p, i){ return {scene:p.scene, text:esc(pages[i])}; });
      note = '✨ This story was written just for ' + f.name + ' by AI.';
    } catch(e){
      note = 'The story writer could not be reached, so here is a classic story instead.';
    }
    btn.disabled = false; btn.textContent = 'Make my book';
  }
  render(m);
  if(note){ $('pdfStatus').textContent = note; }
});

$('btnAgain').addEventListener('click', function(){
  stopSpeaking();
  $('results').hidden = true;
  $('book').innerHTML = '';
  $('intro').scrollIntoView({behavior:'smooth'});
});
$('btnPrint').addEventListener('click', function(){ stopSpeaking(); window.print(); });

/* ============================================================
   PDF
   ============================================================ */
function loadScript(src){
  return new Promise(function(resolve, reject){
    var s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = function(){ reject(new Error('load failed: ' + src)); };
    document.head.appendChild(s);
  });
}
var libsPromise = null;
function loadLibs(){
  if(window.html2canvas && window.jspdf) return Promise.resolve();
  if(!libsPromise){
    libsPromise = loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js')
      .then(function(){ return loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'); })
      .catch(function(e){ libsPromise = null; throw e; });
  }
  return libsPromise;
}

function safeFile(name, title){
  return (name + '-' + title + '-Adventure').replace(/[^A-Za-z0-9À-ɏ֐-ۿ]+/g, '-').replace(/^-+|-+$/g, '') + '.pdf';
}

async function makePdf(opts){
  opts = opts || {};
  var status = $('pdfStatus');
  await loadLibs();
  if(document.fonts && document.fonts.ready){ await document.fonts.ready; }
  var jsPDF = window.jspdf.jsPDF;
  var pdf = new jsPDF({unit:'mm', format:'a4', orientation:'portrait', compress:true});
  var holder = document.createElement('div');
  holder.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;pointer-events:none;';
  document.body.appendChild(holder);
  var sheets = [].slice.call(document.querySelectorAll('#book .sheet'));
  try{
    for(var i = 0; i < sheets.length; i++){
      status.textContent = 'Building page ' + (i + 1) + ' of ' + sheets.length + '...';
      var clone = sheets[i].cloneNode(true);
      clone.style.transform = 'none';
      holder.appendChild(clone);
      var canvas = await window.html2canvas(clone, {scale:2, backgroundColor:'#ffffff', useCORS:true, logging:false, width:794, height:1123});
      if(i > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.88), 'JPEG', 0, 0, 210, 297);
      holder.removeChild(clone);
    }
  } finally {
    document.body.removeChild(holder);
  }
  if(opts.asBlob){ return pdf.output('blob'); }
  pdf.save(safeFile(current.f.name, current.theme.title));
  status.textContent = 'Done! Your PDF has been downloaded. You can also print it.';
}

$('btnPdf').addEventListener('click', async function(){
  if(!current) return;
  var btn = $('btnPdf');
  btn.disabled = true;
  stopSpeaking();
  try{
    $('pdfStatus').textContent = 'Getting ready...';
    await makePdf();
  } catch(e){
    $('pdfStatus').textContent = 'Sorry, the PDF could not be made here. Please use Print and choose "Save as PDF" instead.';
  } finally {
    btn.disabled = false;
  }
});

if(AI_ENABLED && $('aiBox')){ $('aiBox').hidden = false; }

window.StoryGen = {makePdf: makePdf, buildModel: buildModel, buildSheets: buildSheets, render: render};

})();
