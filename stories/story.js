(function(){
'use strict';

/* ============================================================
   Content: letters, worlds and words
   ============================================================ */
var LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

var SOUNDS = {A:'/a/',B:'/b/',C:'/k/',D:'/d/',E:'/e/',F:'/f/',G:'/g/',H:'/h/',I:'/i/',J:'/j/',K:'/k/',L:'/l/',M:'/m/',
  N:'/n/',O:'/o/',P:'/p/',Q:'/kw/',R:'/r/',S:'/s/',T:'/t/',U:'/u/',V:'/v/',W:'/w/',X:'/ks/',Y:'/y/',Z:'/z/'};

var PAL_NAMES = {A:'Ally',B:'Benny',C:'Coco',D:'Dotty',E:'Ellie',F:'Fizz',G:'Gigi',H:'Hugo',I:'Izzy',J:'Jojo',K:'Kiki',L:'Lulu',M:'Milo',
  N:'Nino',O:'Ollie',P:'Pip',Q:'Quincy',R:'Rosie',S:'Sunny',T:'Tilly',U:'Uma',V:'Vinnie',W:'Wally',X:'Xavi',Y:'Yoyo',Z:'Ziggy'};

// word + emoji, "|" between letters
var UNIVERSAL =
 'A:apple🍎,ant🐜,airplane✈️,alligator🐊,anchor⚓,avocado🥑,ambulance🚑,arrow🏹|' +
 'B:ball⚽,banana🍌,bear🐻,bee🐝,bus🚌,butterfly🦋,balloon🎈,bell🔔|' +
 'C:cat🐱,car🚗,cake🍰,cow🐮,crab🦀,carrot🥕,cookie🍪,crown👑|' +
 'D:dog🐶,duck🦆,drum🥁,dolphin🐬,donut🍩,door🚪,dinosaur🦕,diamond💎|' +
 'E:elephant🐘,egg🥚,eagle🦅,ear👂,envelope✉️,eye👁️,earth🌍,elf🧝|' +
 'F:fish🐟,frog🐸,flower🌸,fox🦊,fire🔥,flag🚩,foot🦶,fork🍴|' +
 'G:goat🐐,grapes🍇,giraffe🦒,guitar🎸,gift🎁,ghost👻,gorilla🦍,gloves🧤|' +
 'H:horse🐴,hat🎩,house🏠,heart❤️,hamburger🍔,hippo🦛,helicopter🚁,hand✋|' +
 'I:ice cream🍦,iguana🦎,insect🐛,island🏝️,ice🧊,ice skate⛸️|' +
 'J:juice🧃,jeans👖,jacket🧥,jigsaw🧩,jet🛩️,joystick🕹️,jaguar🐆|' +
 'K:kite🪁,key🔑,kangaroo🦘,koala🐨,king🤴,kiwi🥝,kitten🐈|' +
 'L:lion🦁,lemon🍋,leaf🍃,ladybug🐞,lizard🦎,lock🔒,lollipop🍭,light💡|' +
 'M:moon🌙,monkey🐵,mouse🐭,milk🥛,mushroom🍄,mango🥭,map🗺️,magnet🧲|' +
 'N:nose👃,nut🥜,necklace📿,newspaper📰,notebook📓,noodles🍜|' +
 'O:octopus🐙,orange🍊,owl🦉,onion🧅,otter🦦,ocean🌊,olive🫒|' +
 'P:pig🐷,pizza🍕,pear🍐,penguin🐧,pumpkin🎃,parrot🦜,piano🎹,pineapple🍍|' +
 'Q:queen👸,question mark❓,quill🪶,quiet🤫,quail🐦|' +
 'R:rabbit🐰,rainbow🌈,rocket🚀,robot🤖,ring💍,rose🌹,rain🌧️,rhino🦏|' +
 'S:sun☀️,star⭐,snake🐍,sock🧦,strawberry🍓,ship🚢,snail🐌,spider🕷️|' +
 'T:tiger🐯,tree🌳,turtle🐢,train🚂,tomato🍅,tent⛺,truck🚚,tooth🦷|' +
 'U:umbrella☂️,unicorn🦄,UFO🛸,up arrow⬆️,ukulele🎸|' +
 'V:van🚐,violin🎻,volcano🌋,vase🏺,vest🦺,valentine💌|' +
 'W:whale🐳,watermelon🍉,watch⌚,wolf🐺,web🕸️,worm🪱,window🪟,wand🪄|' +
 'X:xylophone🎹,Xmas tree🎄,X mark❌,fox🦊,box📦,ox🐂|' +
 'Y:yo-yo🪀,yak🐂,yarn🧶,yacht🛥️,yellow💛,yawn🥱|' +
 'Z:zebra🦓,zap⚡,zoo🦒,zucchini🥒,zipper🤐,zigzag〰️';

function parseBank(str){
  var out = {};
  str.split('|').forEach(function(seg){
    var i = seg.indexOf(':');
    out[seg.slice(0, i)] = seg.slice(i + 1).split(',').map(function(p){
      var m = p.match(/^([A-Za-z][A-Za-z \-]*?)([^\x00-\x7F].*)$/);
      return m ? [m[1].trim(), m[2]] : null;
    }).filter(Boolean);
  });
  return out;
}
var UNI = parseBank(UNIVERSAL);

var THEMES = {
  ocean: {
    title:'Under the Sea', place:'the Blue Sea', creature:'Seahorse', creatureEmoji:'🐠',
    container:'treasure chest', containerEmoji:'💎', deco:'🌊🐠🐙🐚', draw:'fish', plural:'sea',
    words: parseBank('A:angelfish🐠,anchor⚓|B:boat⛵,beach🏖️|C:crab🦀,clam🦪|D:dolphin🐬,diver🤿|F:fish🐟|I:island🏝️|L:lobster🦞|M:mermaid🧜|O:octopus🐙,ocean🌊,otter🦦|P:pufferfish🐡,penguin🐧|S:shark🦈,shell🐚,starfish⭐,seal🦭|T:turtle🐢,treasure💎|W:whale🐳,wave🌊,walrus🦭|Y:yacht🛥️')
  },
  dinosaurs: {
    title:'Dinosaur', place:'Dino Valley', creature:'Dino', creatureEmoji:'🦕',
    container:'picnic basket', containerEmoji:'🧺', deco:'🌋🦕🌴🥚', draw:'dino', plural:'dino',
    words: parseBank('B:brachiosaurus🦕,bone🦴|D:dinosaur🦕,dragon🐉|E:egg🥚|F:fern🌿,footprint🐾|L:leaf🍃|M:meteor☄️,mountain⛰️|P:palm tree🌴|R:rock🪨|S:sun☀️|T:T-rex🦖,tree🌳|V:volcano🌋')
  },
  space: {
    title:'Space', place:'Space', creature:'Alien', creatureEmoji:'👽',
    container:'rocket', containerEmoji:'🚀', deco:'🚀🪐⭐👽', draw:'rocket', plural:'space',
    words: parseBank('A:alien👽,astronaut🧑‍🚀|C:comet☄️|E:earth🌍|M:moon🌙,Mars🔴,meteor☄️|P:planet🪐|R:rocket🚀|S:star⭐,sun☀️,satellite🛰️,Saturn🪐|T:telescope🔭|U:UFO🛸')
  },
  safari: {
    title:'Safari', place:'the Sunny Safari', creature:'Lion', creatureEmoji:'🦁',
    container:'explorer backpack', containerEmoji:'🎒', deco:'🦁🐘🦒🌳', draw:'lion', plural:'safari',
    words: parseBank('C:camel🐫|E:elephant🐘|F:flamingo🦩|G:giraffe🦒,gorilla🦍|H:hippo🦛|J:jaguar🐆,jeep🚙|L:lion🦁,leopard🐆|M:monkey🐵|R:rhino🦏|S:snake🐍|Z:zebra🦓')
  },
  robots: {
    title:'Robot', place:'Robot City', creature:'Robot', creatureEmoji:'🤖',
    container:'toy box', containerEmoji:'🧸', deco:'🤖⚙️🔋🚀', draw:'robot', plural:'robot',
    words: parseBank('A:antenna📡|B:battery🔋,bolt🔩|C:computer💻,camera📷|G:gear⚙️|K:keyboard⌨️|L:light💡|M:magnet🧲|P:phone📱|R:robot🤖,radio📻,rocket🚀|S:satellite🛰️|T:tool🔧,telephone☎️|W:wrench🔧')
  },
  fairy: {
    title:'Fairy Tale', place:'Fairy Kingdom', creature:'Pixie', creatureEmoji:'🧚',
    container:'magic basket', containerEmoji:'🧺', deco:'🧚🏰✨🌈', draw:'castle', plural:'fairy',
    words: parseBank('B:butterfly🦋|C:castle🏰,crown👑|D:dragon🐉,diamond💎|F:fairy🧚,flower🌸|G:glitter✨|K:king🤴|M:magic🪄|P:princess👸,pumpkin🎃|Q:queen👸|R:rainbow🌈,rose🌹|S:star⭐|U:unicorn🦄|W:wand🪄')
  }
};
var THEME_ORDER = ['ocean','dinosaurs','space','safari','robots','fairy'];
var THEME_EMOJI = {ocean:'🐠',dinosaurs:'🦕',space:'🚀',safari:'🦁',robots:'🤖',fairy:'🧚'};

var SWATCHES = [
  ['Red','#E5484D'],['Orange','#F76B15'],['Yellow','#F5C518'],['Green','#30A46C'],
  ['Teal','#12A594'],['Blue','#3E63DD'],['Purple','#8E4EC6'],['Pink','#E93D82']
];

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
function hexToRgb(h){ var n = parseInt(h.slice(1), 16); return [(n>>16)&255, (n>>8)&255, n&255]; }
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
function startsWith(word, L){ return word.charAt(0).toUpperCase() === L; }

/* Words for a letter in a world: world words first, then everyday words. */
function wordsFor(L, themeKey){
  var seen = {}, out = [];
  var lists = [(THEMES[themeKey].words[L] || []), (UNI[L] || [])];
  lists.forEach(function(list){
    list.forEach(function(p){
      var k = p[0].toLowerCase();
      if(!seen[k]){ seen[k] = 1; out.push(p); }
    });
  });
  return out;
}

/* Pictures that do NOT start with the letter, for decoys. */
function decoyPool(L, themeKey, rnd){
  var world = [], everyday = [], seen = {};
  var add = function(list){ return function(p){ if(!startsWith(p[0], L) && !seen[p[1]]){ seen[p[1]] = 1; list.push(p); } }; };
  Object.keys(THEMES[themeKey].words).forEach(function(k){ if(k !== L){ THEMES[themeKey].words[k].forEach(add(world)); } });
  LETTERS.forEach(function(k){ if(k !== L){ (UNI[k] || []).slice(0, 3).forEach(add(everyday)); } });
  return shuffled(world, rnd).concat(shuffled(everyday, rnd));
}

/* ============================================================
   Puzzles
   ============================================================ */
function makeWordSearch(words, size, level, rnd){
  var grid = [], r, c;
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
  for(r = 0; r < size; r++){ for(c = 0; c < size; c++){ if(grid[r][c] === '') grid[r][c] = LETTERS[Math.floor(rnd() * 26)]; } }
  return {grid:grid, placed:placed};
}

function otherLetter(L, rnd, mixedCase){
  var ch;
  do { ch = LETTERS[Math.floor(rnd() * 26)]; } while(ch === L);
  return (mixedCase && rnd() < 0.5) ? ch.toLowerCase() : ch;
}

/* A monotone path of the target letter from top-left to bottom-right. */
function makeMaze(n, L, level, rnd){
  var path = [[0,0]], r = 0, c = 0;
  while(r < n - 1 || c < n - 1){
    if(r === n - 1) c++; else if(c === n - 1) r++; else if(rnd() < 0.5) r++; else c++;
    path.push([r, c]);
  }
  var grid = [], i, j;
  for(i = 0; i < n; i++){ grid.push(new Array(n).fill(null)); }
  path.forEach(function(p){ grid[p[0]][p[1]] = (level >= 1 && rnd() < 0.4) ? L.toLowerCase() : L; });
  for(i = 0; i < n; i++){ for(j = 0; j < n; j++){ if(grid[i][j] === null) grid[i][j] = otherLetter(L, rnd, level >= 1); } }
  return {grid:grid, path:path};
}

function makeDetective(cols, rows, L, count, rnd){
  var total = cols * rows, cells = new Array(total).fill(null), idx = [], i;
  for(i = 0; i < total; i++){ idx.push(i); }
  shuffled(idx, rnd).slice(0, count).forEach(function(p){ cells[p] = rnd() < 0.5 ? L : L.toLowerCase(); });
  for(i = 0; i < total; i++){ if(cells[i] === null) cells[i] = otherLetter(L, rnd, true); }
  return cells;
}

/* ============================================================
   Build the workbook
   ============================================================ */
var TOTAL_MISSIONS = 10;

function buildModel(f){
  var t = THEMES[f.theme], L = f.letter;
  var rnd = makeRng(f.name.toLowerCase() + '|' + L + '|' + f.theme + '|' + f.age);
  var level = f.age <= 5 ? 0 : (f.age <= 8 ? 1 : 2);
  var all = wordsFor(L, f.theme);
  var targets = all.slice(0, 5);
  var pal = PAL_NAMES[L];
  return {
    f:f, t:t, L:L, l:L.toLowerCase(), level:level, rnd:rnd, all:all, targets:targets,
    pal:pal, palFull:pal + ' the ' + t.creature
  };
}

function vars(f){ return '--accent:' + f.color + ';--tint:' + mix(f.color, 0.86) + ';--on:' + onColor(f.color) + ';'; }
function photoHtml(f, cls, emoji){ return '<div class="round-photo ' + cls + '">' + (f.photo ? '<img src="' + f.photo + '" alt="">' : emoji) + '</div>'; }
function sheet(m, cls, inner){ return '<section class="sheet ' + cls + '" style="' + vars(m.f) + '">' + inner + '</section>'; }

var MISSION_NAMES = ['Meet the letter','Treasure hunt','Trace the words','The maze','Word match','Letter detective','Word search','Color it','Picture story','You did it!'];
var MISSION_ICONS = ['👋','🔎','✏️','🌀','🔗','🕵️','🧩','🖍️','📖','🏆'];

function teaser(m, n){
  var L = m.L, t = m.t;
  var tx = [
    'a treasure hunt for ' + L + ' things!',
    'trace your very first ' + L + ' words!',
    'can you find your way through the ' + L + ' maze?',
    'match the pictures to their words!',
    'become a ' + L + ' letter detective!',
    'a secret word search!',
    'color your ' + t.title.toLowerCase() + ' picture!',
    'read a story made of pictures!',
    'a surprise and your champion certificate!'
  ];
  return tx[n - 1] || '';
}

function missionSheet(m, n, cls, body){
  var f = m.f, t = m.t;
  var dots = '';
  for(var i = 1; i <= TOTAL_MISSIONS; i++){
    dots += '<span class="dot ' + (i < n ? 'done' : (i === n ? 'now' : '')) + '">' + (i === n ? t.creatureEmoji : '') + '</span>';
  }
  var next = n < TOTAL_MISSIONS
    ? '<div class="m-next"><b>Next mission:</b> ' + teaser(m, n) + '</div>'
    : '<div class="m-next"><b>Great job!</b> Show someone your certificate.</div>';
  return sheet(m, 'mission ' + cls,
    '<div class="m-head"><div><span class="m-pill">Mission ' + n + ' of ' + TOTAL_MISSIONS + '</span><h2>' + MISSION_ICONS[n - 1] + ' ' + MISSION_NAMES[n - 1] + '</h2></div>' +
    '<div class="m-player">' + photoHtml(f, 'm-photo', t.creatureEmoji) + '<div class="m-name">' + esc(f.name) + '</div></div></div>' +
    '<div class="m-track">' + dots + '</div>' +
    body +
    '<div class="m-foot"><div class="m-star"><span>Color your star when done:</span><i>☆</i></div>' + next + '</div>');
}

/* ---- cover ---- */
function coverSheet(m){
  var f = m.f, t = m.t;
  return sheet(m, 'cover',
    '<div class="cover-top" aria-hidden="true">' + t.deco + '</div>' +
    photoHtml(f, 'cover-photo', t.creatureEmoji) +
    '<h1>' + esc(f.name) + '\'s<br>' + t.title + ' Adventure</h1>' +
    '<div class="cover-letter"><span class="cl-big">' + m.L + m.l + '</span><span class="cl-text">Letter ' + m.L + ' mission</span></div>' +
    '<ul class="cover-includes"><li>🗺️ 10 missions</li><li>⭐ 10 stars to collect</li><li>🏆 A certificate</li></ul>' +
    '<p class="cover-foot">hogthehedgehog.com</p>');
}

/* ---- map ---- */
function mapSheet(m){
  var f = m.f, t = m.t;
  var stop = function(i){
    return '<div class="stop"><div class="stop-circle">' + MISSION_ICONS[i] + '</div>' +
      '<div class="stop-num">' + (i + 1) + '</div><div class="stop-name">' + MISSION_NAMES[i].replace('You did it!', 'Certificate') + '</div><div class="stop-star">☆</div></div>';
  };
  var row1 = '', row2 = '';
  for(var i = 0; i < 5; i++){ row1 += stop(i); }
  for(var j = 5; j < 10; j++){ row2 += stop(j); }
  return sheet(m, 'map',
    '<div class="sh-head"><span>' + t.creatureEmoji + ' ' + esc(f.name) + '\'s ' + t.title + ' Adventure</span><span>hogthehedgehog.com</span></div>' +
    '<h2 class="map-title">Your adventure map</h2>' +
    '<p class="lead">Hi ' + esc(f.name) + '! I am ' + esc(m.palFull) + '. Today we are learning the letter <b>' + m.L + '</b>. Will you help me fill my ' + t.container + '?</p>' +
    '<div class="map-deco" aria-hidden="true">' + t.deco + '</div>' +
    '<div class="map-flag">START ➜</div>' +
    '<div class="map-row">' + row1 + '</div>' +
    '<div class="map-turn">⬇</div>' +
    '<div class="map-row rev">' + row2 + '</div>' +
    '<div class="map-flag end">🏆 FINISH</div>' +
    '<div class="how"><h3>How to play</h3><ol><li>Do a mission. Do one a day or a few at once.</li><li>Color the star when you finish.</li><li>Collect all 10 stars to win your certificate!</li></ol></div>');
}

/* ---- mission 1: meet the letter ---- */
function meetSheet(m){
  var f = m.f, t = m.t, L = m.L;
  var ex = m.targets[0];
  var rows = '<div class="trace-row tall"><span>' + L + ' ' + m.l + ' ' + L + ' ' + m.l + ' ' + L + '</span></div>' +
             '<div class="trace-row tall blank"></div>';
  return missionSheet(m, 1, 'meet',
    '<div class="meet-top"><div class="big-letter">' + L + m.l + '</div>' +
    '<div class="meet-card"><div class="mc-say">' + L + ' says <b>' + SOUNDS[L] + '</b></div>' +
    '<div class="mc-ex"><span class="mc-emoji">' + ex[1] + '</span><span class="mc-word"><b>' + esc(ex[0].charAt(0)) + '</b>' + esc(ex[0].slice(1)) + '</span></div>' +
    '<div class="mc-for">' + L + ' is for ' + esc(ex[0]) + '!</div></div></div>' +
    '<div class="bubble"><div class="b-pal">' + t.creatureEmoji + '</div><div class="b-text">Hi ' + esc(f.name) + '! I am ' + esc(m.palFull) + '. Help me fill my ' + t.container + ' ' + t.containerEmoji + ' with things that start with <b>' + L + '</b>!</div></div>' +
    '<p class="instr">Say <b>' + SOUNDS[L] + '</b> three times. Write ' + L + ' in the air. Then trace it!</p>' +
    rows +
    '<div class="today"><div class="today-title">Today\'s ' + L + ' words</div><div class="today-row">' +
    m.targets.map(function(p){ return '<div class="today-item"><div class="ti-emoji">' + p[1] + '</div><div class="ti-word"><b>' + esc(p[0].charAt(0)) + '</b>' + esc(p[0].slice(1)) + '</div></div>'; }).join('') +
    '</div></div>');
}

/* ---- mission 2: treasure hunt ---- */
function huntSheet(m){
  var L = m.L, rnd = m.rnd;
  var isX = L === 'X';
  var decoys = decoyPool(L, m.f.theme, rnd).slice(0, 4);
  var cells = shuffled(m.targets.map(function(p){ return {p:p, yes:true}; }).concat(decoys.map(function(p){ return {p:p, yes:false}; })), rnd);
  var grid = cells.map(function(c){
    return '<div class="hunt-cell"><div class="hc-emoji">' + c.p[1] + '</div><div class="hc-word">' + esc(c.p[0]) + '</div></div>';
  }).join('');
  var note = isX ? 'X is tricky! Circle the pictures that <b>start</b> or <b>end</b> with X.' : 'Circle every picture that starts with <b>' + L + '</b>. Say each word out loud!';
  return missionSheet(m, 2, 'hunt',
    '<p class="instr big">' + note + '</p>' +
    '<div class="hunt-grid">' + grid + '</div>' +
    '<div class="count-line">I found <span class="blank sm"></span> out of 5 ' + L + ' things!</div>');
}

/* ---- mission 3: trace the words ---- */
function wordsSheet(m){
  var L = m.L;
  var cand = m.targets.slice().sort(function(a, b){ return a[0].length - b[0].length; });
  var take = 3;
  var rows = cand.slice(0, take).map(function(p){
    var w = p[0];
    return '<div class="tw"><div class="tw-emoji">' + p[1] + '</div><div class="tw-col">' +
      '<div class="trace-row med"><span class="word-trace"><b>' + esc(w.charAt(0)) + '</b>' + esc(w.slice(1)) + '</span></div>' +
      '<div class="trace-row med blank"></div></div></div>';
  }).join('');
  return missionSheet(m, 3, 'words',
    '<p class="instr big">Trace each word, then write it by yourself. Every word starts with <b>' + L + '</b>!</p>' + rows);
}

/* ---- mission 4: maze ---- */
function mazeSheet(m){
  var L = m.L, rnd = m.rnd;
  var n = m.level === 0 ? 5 : 7;
  var mz = makeMaze(n, L, m.level, rnd);
  var cell = n === 5 ? 96 : 76;
  var table = '<table class="maze" style="--cell:' + cell + 'px">' + mz.grid.map(function(row, r){
    return '<tr>' + row.map(function(ch, c){
      var cls = (r === 0 && c === 0) ? ' start' : ((r === n - 1 && c === n - 1) ? ' end' : '');
      return '<td class="' + cls.trim() + '">' + ch + '</td>';
    }).join('') + '</tr>';
  }).join('') + '</table>';
  return missionSheet(m, 4, 'maze',
    '<p class="instr big">Help ' + esc(m.pal) + ' reach the ' + m.t.container + '! Draw a line that only steps on <b>' + L + '</b> and <b>' + m.l + '</b>. Go right or down.</p>' +
    '<div class="maze-wrap"><div class="maze-flag">🏁 START</div>' + table + '<div class="maze-flag end">' + m.t.containerEmoji + ' ' + m.t.container.toUpperCase() + '</div></div>');
}

/* ---- mission 5: word match ---- */
function matchSheet(m){
  var rnd = m.rnd;
  var take = 4;
  var left = m.targets.slice(0, take);
  var right = shuffled(left, rnd);
  var guard = 0;
  while(right.every(function(p, i){ return p === left[i]; }) && guard++ < 10){ right = shuffled(left, rnd); }
  var rows = left.map(function(p, i){
    return '<div class="mrow"><div class="mpic">' + p[1] + '</div><i class="mdot"></i><span class="mgap"></span><i class="mdot"></i><div class="mword"><b>' + esc(right[i][0].charAt(0)) + '</b>' + esc(right[i][0].slice(1)) + '</div></div>';
  }).join('');
  return missionSheet(m, 5, 'match',
    '<p class="instr big">Draw a line from each picture to its word. Look at the first letter!</p>' +
    '<div class="match">' + rows + '</div>');
}

/* ---- mission 6: letter detective ---- */
function detectiveSheet(m){
  var L = m.L, rnd = m.rnd;
  var count = m.level === 0 ? 8 : (m.level === 1 ? 10 : 12);
  var cells = makeDetective(7, 6, L, count, rnd);
  m.detectiveCount = count;
  var table = '<table class="det">';
  for(var r = 0; r < 6; r++){
    table += '<tr>' + cells.slice(r * 7, r * 7 + 7).map(function(ch){ return '<td>' + ch + '</td>'; }).join('') + '</tr>';
  }
  table += '</table>';
  return missionSheet(m, 6, 'detective',
    '<p class="instr big">Be a letter detective! Circle every <b>' + L + '</b> and <b>' + m.l + '</b> you can find.</p>' + table +
    '<div class="count-line">I found <span class="blank sm"></span> letters!</div>');
}

/* ---- mission 7: word search ---- */
function searchSheet(m){
  var f = m.f, rnd = m.rnd;
  var words = m.all.map(function(p){ return p[0].toUpperCase().replace(/[^A-Z]/g, ''); })
    .filter(function(w){ return w.length >= 3 && w.length <= 9; });
  words = shuffled(words, rnd).slice(0, 5);
  var nameWord = f.name.toUpperCase().replace(/[^A-Z]/g, '');
  if(nameWord.length >= 2 && nameWord.length <= 9 && words.indexOf(nameWord) < 0){ words.push(nameWord); }
  var ws = makeWordSearch(words, 10, m.level, rnd);
  var table = '<table class="ws-grid">' + ws.grid.map(function(row){
    return '<tr>' + row.map(function(ch){ return '<td>' + ch + '</td>'; }).join('') + '</tr>';
  }).join('') + '</table>';
  var list = '<ul class="ws-words">' + ws.placed.map(function(w){ return '<li>' + w + '</li>'; }).join('') + '</ul>';
  var dir = m.level >= 1 ? 'Words go across, down and diagonally.' : 'Words go across and down.';
  return missionSheet(m, 7, 'search',
    '<p class="instr big">Find all the words. ' + dir + ' Can you spot ' + esc(f.name) + '\'s name?</p>' +
    '<div class="ws-wrap">' + table + list + '</div>');
}

/* ---- mission 8: coloring ---- */
function colorSheet(m){
  var t = m.t;
  var letterSvg = '<svg viewBox="0 0 400 110" class="color-letter" role="img" aria-label="Letter to color"><text x="200" y="92" text-anchor="middle" font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900" font-size="104" fill="#fff" stroke="#222" stroke-width="4" stroke-linejoin="round">' + m.L + ' ' + m.l + '</text></svg>';
  return missionSheet(m, 8, 'color',
    '<p class="instr big">Color ' + esc(m.pal) + '\'s ' + t.title.toLowerCase() + ' picture. Then color the big letter!</p>' +
    '<div class="color-art"><svg viewBox="0 0 400 300" role="img" aria-label="Coloring picture">' + DRAW[t.draw] + '</svg></div>' +
    '<div class="color-art letter">' + letterSvg + '</div>');
}

/* ---- mission 9: picture story ---- */
function storySheet(m){
  var f = m.f, nm = esc(f.name), pal = esc(m.pal);
  var w = m.targets;
  var lines;
  if(m.level === 0){
    lines = w.slice(0, 4).map(function(p){ return nm + ' sees <span class="rb">' + p[1] + '</span>.'; });
    lines.push(nm + ' and ' + pal + ' say <b>' + m.L + '</b>, <b>' + m.L + '</b>, <b>' + m.L + '</b>!');
  } else {
    lines = [
      nm + ' and ' + pal + ' go to ' + esc(m.t.place) + '.',
      'They look for ' + m.t.containerEmoji + '. They see <span class="rb">' + w[0][1] + '</span> and <span class="rb">' + w[1][1] + '</span>.',
      '"Look!" says ' + nm + '. "I see <span class="rb">' + w[2][1] + '</span>!"',
      pal + ' finds <span class="rb">' + w[3][1] + '</span> and <span class="rb">' + (w[4] || w[0])[1] + '</span>.',
      'They put them in the ' + m.t.container + '. All the things start with <b>' + m.L + '</b>!'
    ];
  }
  var body = lines.map(function(l){ return '<p class="rebus">' + l + '</p>'; }).join('');
  return missionSheet(m, 9, 'story' + (m.level === 0 ? ' big' : ''),
    '<p class="instr big">Read the story. Say the picture words out loud!</p>' + body +
    '<div class="draw-box"><div>Draw your favorite ' + m.L + ' thing here:</div></div>');
}

/* ---- mission 10: certificate ---- */
function certSheet(m){
  var f = m.f, t = m.t, L = m.L;
  var stickers = m.targets.map(function(p){ return '<div class="sticker"><span>' + p[1] + '</span></div>'; }).join('');
  var nextIdx = LETTERS.indexOf(L) + 1;
  var nextTxt = nextIdx < 26 ? 'Next adventure: letter ' + LETTERS[nextIdx] + '! Make a new book at hogthehedgehog.com/stories' : 'You finished the whole alphabet! Make another adventure at hogthehedgehog.com/stories';
  return missionSheet(m, 10, 'cert',
    '<div class="cert-box"><div class="cert-trophy">🏆</div>' +
    '<div class="cert-title">Letter ' + L + ' Champion</div>' +
    photoHtml(f, 'cert-photo', t.creatureEmoji) +
    '<div class="cert-name">' + esc(f.name) + '</div>' +
    '<p class="cert-text">found ' + L + ' things, traced ' + L + ' words and finished all 10 missions in the ' + esc(t.title) + ' adventure!</p>' +
    '<div class="cert-lines"><span>Date: ____________</span><span>Signed: ______________</span></div></div>' +
    '<p class="instr">Stick or draw your 5 ' + L + ' things in the ' + t.container + ' ' + t.containerEmoji + ':</p>' +
    '<div class="stickers">' + stickers + '</div>' +
    '<div class="next-adv">' + esc(nextTxt) + '</div>');
}

/* ---- parent guide ---- */
function parentSheet(m){
  var f = m.f, nm = esc(f.name), L = m.L;
  var skills = [
    'Says the letter name: ' + L,
    'Says the sound ' + SOUNDS[L],
    'Finds ' + L + ' things in pictures',
    'Traces and writes ' + L + ' and ' + m.l,
    'Reads the picture story'
  ];
  var cols = '<td class="star">○</td><td class="star">○</td><td class="star">○</td>';
  var rows = skills.map(function(s){ return '<tr><td>' + s + '</td>' + cols + '</tr>'; }).join('');
  var key = '<p>🕵️ Letter detective: there are <b>' + (m.detectiveCount || '') + '</b> ' + L + 's and ' + m.l + 's to find.</p>' +
            '<p>🔎 Treasure hunt: the ' + L + ' pictures are ' + m.targets.map(function(p){ return esc(p[0]); }).join(', ') + '.</p>' +
            '<p>🌀 Maze: the path only steps on ' + L + ' or ' + m.l + ', moving right or down.</p>';
  return sheet(m, 'parent',
    '<div class="sh-head"><span>' + m.t.creatureEmoji + ' ' + nm + '\'s ' + m.t.title + ' Adventure</span><span>hogthehedgehog.com</span></div>' +
    '<h2>Parent guide</h2>' +
    '<div class="how"><h3>How to use this book</h3><ol>' +
    '<li>Do one mission a day, about 10 minutes. Short and happy works best.</li>' +
    '<li>Say the letter <b>sound</b> (' + SOUNDS[L] + '), not just the name.</li>' +
    '<li>Let ' + nm + ' color the star after each mission, and celebrate!</li></ol></div>' +
    '<table class="track"><tr><th>Skill</th><th>Not yet</th><th>Getting there</th><th>Got it!</th></tr>' + rows + '</table>' +
    '<p class="lead" style="margin-top:12px;font-size:18px">Color in the circle that fits ' + nm + ' best.</p>' +
    '<h2 style="font-size:28px;margin-top:10px">Answer key</h2><div class="tips">' + key + '</div>' +
    '<h2 style="font-size:28px;margin-top:10px">Extra practice</h2><div class="tips">' +
    '<p>• Look for ' + L + ' on signs, food and toys. Say the word and its first sound.</p>' +
    '<p>• Play the free ABC Animal Safari game at hogthehedgehog.com to keep practicing.</p></div>');
}

function buildSheets(m){
  var out = [coverSheet(m), mapSheet(m), meetSheet(m), huntSheet(m), wordsSheet(m), mazeSheet(m), matchSheet(m)];
  out.push(detectiveSheet(m), searchSheet(m), colorSheet(m), storySheet(m), certSheet(m), parentSheet(m));
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
  for(var a = 3; a <= 12; a++){ var o = document.createElement('option'); o.value = a; o.textContent = a; if(a === 5) o.selected = true; age.appendChild(o); }

  $('letterChips').innerHTML = LETTERS.map(function(L){
    return '<label class="lchip"><input type="radio" name="letter" value="' + L + '" aria-label="Letter ' + L + '"><span>' + L + '</span></label>';
  }).join('');
  $('themeChips').innerHTML = THEME_ORDER.map(function(k, i){
    return '<label class="chip"><input type="radio" name="theme" value="' + k + '"' + (i === 0 ? ' checked' : '') + '><span>' + THEME_EMOJI[k] + ' ' + THEMES[k].title + '</span></label>';
  }).join('');
  $('colorSwatches').innerHTML = SWATCHES.map(function(c, i){
    return '<label class="swatch" title="' + c[0] + '"><input type="radio" name="color" value="' + c[1] + '" aria-label="' + c[0] + '"' + (i === 5 ? ' checked' : '') + '><span style="background:' + c[1] + '"></span></label>';
  }).join('');
})();

function readForm(){
  var name = $('childName').value.replace(/\s+/g, ' ').trim();
  name = name.charAt(0).toUpperCase() + name.slice(1);
  var letterEl = document.querySelector('input[name="letter"]:checked');
  return {
    name: name,
    age: parseInt($('childAge').value, 10),
    letter: letterEl ? letterEl.value : '',
    theme: document.querySelector('input[name="theme"]:checked').value,
    color: document.querySelector('input[name="color"]:checked').value,
    photo: finalPhoto()
  };
}

/* ============================================================
   Show the result
   ============================================================ */
var current = null;

function fitSheets(){
  var frames = document.querySelectorAll('.sheet-frame');
  if(!frames.length) return;
  var avail = Math.min(794, $('book').clientWidth || 794);
  var scale = avail / 794;
  [].forEach.call(frames, function(fr){
    fr.style.width = (794 * scale) + 'px';
    fr.style.height = (1123 * scale) + 'px';
    fr.firstElementChild.style.transform = 'scale(' + scale + ')';
  });
}
window.addEventListener('resize', fitSheets);

function render(m){
  current = m;
  var sheets = buildSheets(m);
  var total = sheets.length;
  var book = $('book');
  book.innerHTML = '';
  sheets.forEach(function(html, i){
    var block = document.createElement('div'); block.className = 'page-block';
    var frame = document.createElement('div'); frame.className = 'sheet-frame';
    frame.innerHTML = html;
    var sh = frame.firstElementChild;
    var foot = document.createElement('div'); foot.className = 'sh-foot';
    foot.innerHTML = '<span></span><span>' + (i + 1) + ' / ' + total + '</span>';
    if(i > 0) sh.appendChild(foot);
    block.appendChild(frame);
    book.appendChild(block);
  });
  $('resultTitle').textContent = m.f.name + '\'s Letter ' + m.L + ' adventure is ready';
  $('included').innerHTML = ['🗺️ Adventure map', '👋 Meet the letter', '🔎 Treasure hunt', '✏️ Trace words', '🌀 Maze', '🔗 Word match', '🕵️ Letter detective', '🧩 Word search', '🖍️ Coloring', '📖 Picture story', '🏆 Certificate', '👪 Parent guide']
    .map(function(x){ return '<li>' + x + '</li>'; }).join('');
  $('results').hidden = false;
  $('pdfStatus').textContent = '';
  fitSheets();
  $('results').scrollIntoView({behavior:'smooth', block:'start'});
}

$('storyForm').addEventListener('submit', function(ev){
  ev.preventDefault();
  var err = $('formError');
  err.textContent = '';
  var f = readForm();
  if(!f.name){ err.textContent = 'Please enter your child\'s name.'; $('childName').focus(); return; }
  if(!/^[A-Za-zÀ-ɏ֐-׿؀-ۿ' \-]+$/.test(f.name)){ err.textContent = 'Please use letters only for the name.'; $('childName').focus(); return; }
  if(!f.letter){ err.textContent = 'Please pick the letter your child is learning.'; return; }
  render(buildModel(f));
});

$('btnAgain').addEventListener('click', function(){
  $('results').hidden = true;
  $('book').innerHTML = '';
  $('intro').scrollIntoView({behavior:'smooth'});
});
$('btnPrint').addEventListener('click', function(){ window.print(); });

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
function safeFile(name, letter, title){
  return (name + '-Letter-' + letter + '-' + title).replace(/[^A-Za-z0-9À-ɏ֐-ۿ]+/g, '-').replace(/^-+|-+$/g, '') + '.pdf';
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
  pdf.save(safeFile(current.f.name, current.L, current.t.title));
  status.textContent = 'Done! Your PDF has been downloaded. You can also print it.';
}

$('btnPdf').addEventListener('click', async function(){
  if(!current) return;
  var btn = $('btnPdf');
  btn.disabled = true;
  try{
    $('pdfStatus').textContent = 'Getting ready...';
    await makePdf();
  } catch(e){
    $('pdfStatus').textContent = 'Sorry, the PDF could not be made here. Please use Print and choose "Save as PDF" instead.';
  } finally {
    btn.disabled = false;
  }
});

window.StoryGen = {makePdf:makePdf, buildModel:buildModel, buildSheets:buildSheets, render:render, wordsFor:wordsFor, LETTERS:LETTERS, THEME_ORDER:THEME_ORDER, THEMES:THEMES};

})();
