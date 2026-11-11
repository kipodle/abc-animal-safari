/* Color Splash: Pop the Balloon, Paint Mixer, Paint the Animal.
   Everything runs in the browser. A parent's account is asked for once, when a game starts. */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var stage = document.getElementById('cs-stage');
  var picks = [].slice.call(document.querySelectorAll('.cs-pick'));
  var current = null;      // game id shown in the stage
  var token = 0;           // bumps whenever the stage changes, so old timers stop themselves
  var timers = [];

  /* ---------- tiny helpers ---------- */
  function el(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }
  function svg(tag, attrs, kids) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { n.appendChild(c); });
    return n;
  }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function later(fn, ms) { var my = token; var id = setTimeout(function () { if (my === token) fn(); }, ms); timers.push(id); return id; }
  function clearStage() { token++; timers.forEach(clearTimeout); timers = []; stopSpeech(); stage.replaceChildren(); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem('hog-cs-' + k); localStorage.setItem('hog-cs-' + k, v); } catch (e) { /* storage may be blocked */ } return null; }

  /* ---------- sound and voice ---------- */
  var soundOn = store('sound') !== 'off', voiceOn = store('voice') !== 'off', actx = null;
  function audio() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = false; } }
    if (actx && actx.state === 'suspended') { try { actx.resume(); } catch (e) { /* ignore */ } }
    return actx || null;
  }
  function tone(freq, start, dur, type, vol) {
    var a = audio(); if (!a || !soundOn) return;
    var o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + start;
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.15, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  var sfx = {
    good: function () { tone(523, 0, .14, 'triangle'); tone(659, .1, .14, 'triangle'); tone(784, .2, .24, 'triangle'); },
    pop: function () { tone(880, 0, .08, 'square', .08); tone(1320, .04, .1, 'triangle', .1); },
    bad: function () { tone(220, 0, .2, 'sine', .12); tone(185, .12, .25, 'sine', .1); },
    add: function () { tone(440 + Math.random() * 120, 0, .1, 'sine', .12); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * .12, .22, 'triangle', .16); }); },
    paint: function () { tone(600 + Math.random() * 300, 0, .09, 'sine', .1); }
  };
  function speak(text) {
    if (!voiceOn || !('speechSynthesis' in window)) return;
    try { window.speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(text); u.rate = .9; u.pitch = 1.15; u.lang = 'en-US'; window.speechSynthesis.speak(u); } catch (e) { /* voice is optional */ }
  }
  function stopSpeech() { try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } }

  function toggleBtn(label, getOn, setOn) {
    var b = el('button', 'btn btn-light cs-small'); b.type = 'button';
    function paint() { b.textContent = label + ': ' + (getOn() ? 'on' : 'off'); b.setAttribute('aria-pressed', getOn() ? 'true' : 'false'); }
    b.onclick = function () { setOn(!getOn()); paint(); if (!getOn()) stopSpeech(); };
    paint(); return b;
  }
  var soundBtn = function () { return toggleBtn('Sound', function () { return soundOn; }, function (v) { soundOn = v; store('sound', v ? 'on' : 'off'); if (v) sfx.add(); }); };
  var voiceBtn = function () { return toggleBtn('Voice', function () { return voiceOn; }, function (v) { voiceOn = v; store('voice', v ? 'on' : 'off'); }); };

  /* confetti burst from a screen point */
  function burst(x, y, colors, n) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    n = n || 16;
    for (var i = 0; i < n; i++) {
      var s = el('span', 'cs-spark'); s.style.background = colors[i % colors.length]; document.body.appendChild(s);
      var ang = Math.random() * Math.PI * 2, dist = 50 + Math.random() * 90, dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - 30;
      var anim = s.animate([
        { transform: 'translate(' + x + 'px,' + y + 'px) rotate(0deg) scale(1)', opacity: 1 },
        { transform: 'translate(' + (x + dx) + 'px,' + (y + dy + 60) + 'px) rotate(' + (Math.random() * 540 - 270) + 'deg) scale(.4)', opacity: 0 }
      ], { duration: 650 + Math.random() * 350, easing: 'cubic-bezier(.2,.7,.3,1)' });
      anim.onfinish = (function (n) { return function () { n.remove(); }; })(s);
    }
  }
  function centerOf(node) { var r = node.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }

  /* ---------- gate: a parent's account is asked for once ---------- */
  function begin(fn) {
    var A = window.HogAuth;
    if (!A || !A.requireJoin) { fn(); return; }
    A.requireJoin('play').then(function (ok) { if (ok) fn(); });
  }

  /* ---------- game picker ---------- */
  var GAMES = {
    catch: { intro: introCatch },
    mix: { intro: introMix },
    paint: { intro: introPaint }
  };
  function mark(id) { current = id; picks.forEach(function (p) { p.setAttribute('aria-pressed', p.dataset.game === id ? 'true' : 'false'); }); }
  function select(id, scroll) {
    mark(id);
    clearStage();
    GAMES[id].intro();
    if (scroll) { try { stage.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { /* ignore */ } }
  }
  picks.forEach(function (p) { p.addEventListener('click', function () { select(p.dataset.game, true); }); });

  function introCard(title, text, art, btnText, onGo) {
    var box = el('div', 'cs-intro');
    var a = el('div', 'cs-art'); a.appendChild(art);
    box.appendChild(a); box.appendChild(el('h2', null, title)); box.appendChild(el('p', null, text));
    var b = el('button', 'btn cs-big', btnText); b.type = 'button'; b.onclick = function () { begin(onGo); };
    box.appendChild(b);
    stage.appendChild(box);
  }
  function otherGames(except) {
    var row = el('div', 'cs-actions');
    [['catch', 'Pop the Balloon'], ['mix', 'Paint Mixer'], ['paint', 'Paint the Animal']].forEach(function (g) {
      if (g[0] === except) return;
      var b = el('button', 'btn btn-light', 'Try ' + g[1]); b.type = 'button'; b.onclick = function () { begin(function () { mark(g[0]); begin2(g[0]); try { stage.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { /* ignore */ } }); }; row.appendChild(b);
    });
    return row;
  }
  function begin2(id) { if (id === 'catch') startCatch(); else if (id === 'mix') startMix(); else startPaint(); }

  function starRow(n, of) {
    var row = el('div', 'cs-stars'); row.setAttribute('role', 'img'); row.setAttribute('aria-label', n + ' out of ' + of + ' stars');
    for (var i = 0; i < of; i++) {
      var s = svg('svg', { viewBox: '0 0 64 64', 'aria-hidden': 'true' }, [svg('path', { d: 'M32 5l7.6 17.3 18.8 1.7-14.2 12.4 4.2 18.4L32 45.2 15.6 55.8l4.2-18.4L5.6 24l18.8-1.7z', fill: '#F4B740', stroke: '#D99A1F', 'stroke-width': 3, 'stroke-linejoin': 'round' })]);
      var w = el('span', i < n ? 'on' : 'off'); w.appendChild(s); row.appendChild(w);
    }
    return row;
  }

  /* =====================================================================
     1. POP THE BALLOON
     ===================================================================== */
  var COLORS = [
    ['Red', '#E53935'], ['Orange', '#FB8C00'], ['Yellow', '#FDD835'], ['Green', '#43A047'], ['Blue', '#1E88E5'], ['Purple', '#8E24AA'],
    ['Pink', '#F48FB1'], ['Brown', '#795548'], ['Black', '#212121'], ['White', '#FFFFFF'], ['Gray', '#9E9E9E']
  ];
  var ROUNDS = 10;

  function balloonSVG(hex, name) {
    var white = hex.toUpperCase() === '#FFFFFF';
    return svg('svg', { viewBox: '0 0 100 140', 'aria-hidden': 'true' }, [
      svg('path', { d: 'M50 134c-4-12 6-20 0-30', fill: 'none', stroke: '#9a8a74', 'stroke-width': 2, 'stroke-linecap': 'round' }),
      svg('path', { d: 'M50 100l-7 9h14z', fill: hex, stroke: white ? '#b9b2a4' : 'rgba(0,0,0,.25)', 'stroke-width': 2, 'stroke-linejoin': 'round' }),
      svg('path', { d: 'M50 102C20 92 6 66 6 46 6 22 26 4 50 4s44 18 44 42c0 20-14 46-44 56z', fill: hex, stroke: white ? '#b9b2a4' : 'rgba(0,0,0,.25)', 'stroke-width': 3 }),
      svg('ellipse', { cx: 33, cy: 32, rx: 9, ry: 15, fill: '#fff', opacity: white ? 0.0 : 0.38, transform: 'rotate(28 33 32)' })
    ]);
  }

  function introCatch() {
    var art = el('div'); var row = el('div', 'cs-sky'); row.style.minHeight = '0';
    ['Red', 'Yellow', 'Blue'].forEach(function (n) { var c = COLORS.filter(function (x) { return x[0] === n; })[0]; var b = el('div', 'cs-balloon'); b.style.pointerEvents = 'none'; b.appendChild(balloonSVG(c[1], n)); row.appendChild(b); });
    art.appendChild(row);
    introCard('Pop the Balloon', 'You will see a color name. Tap the balloon with that color to pop it. Ten balloons, ten chances to be a color champion!', art, 'Start popping', startCatch);
  }

  function startCatch() {
    clearStage();
    var round = 0, score = 0, wrong = 0, locked = false;
    var basic = COLORS.slice(0, 6);
    var a = shuffle(basic).slice(0, 5), b = shuffle(COLORS.filter(function (c) { return c[0] !== a[4][0]; })).slice(0, 5), order = a.concat(b);

    var bar = el('div', 'cs-bar'), chip = el('span', 'cs-chip'), tools = el('div', 'cs-tools');
    tools.appendChild(voiceBtn()); tools.appendChild(soundBtn());
    bar.appendChild(chip); bar.appendChild(tools);
    var prompt = el('div', 'cs-prompt'), h = el('h2'), say = el('button', 'btn btn-light cs-small', 'Say it again'); say.type = 'button';
    prompt.appendChild(h); prompt.appendChild(say);
    var sky = el('div', 'cs-sky'), msg = el('p', 'cs-msg'); msg.setAttribute('role', 'status');
    stage.append(bar, prompt, sky, msg);

    var target = null;
    function fixSpeech() { speak('Find the ' + target[0].toLowerCase() + ' balloon'); }
    say.onclick = fixSpeech;

    function next() {
      if (round >= ROUNDS) return done();
      round++; wrong = 0; locked = false; msg.textContent = ''; msg.className = 'cs-msg';
      chip.textContent = 'Balloon ' + round + ' of ' + ROUNDS + '  ·  Stars ' + score;
      target = order[round - 1];
      var pool = round <= 5 ? basic : COLORS, n = round <= 5 ? 4 : 6;
      var opts = shuffle(pool.filter(function (c) { return c[0] !== target[0]; })).slice(0, n - 1).concat([target]);
      opts = shuffle(opts);
      h.replaceChildren(document.createTextNode('Pop the '), el('em', null, target[0]), document.createTextNode(' balloon!'));
      sky.replaceChildren();
      opts.forEach(function (c) {
        var b = el('button', 'cs-balloon'); b.type = 'button'; b.setAttribute('aria-label', c[0] + ' balloon'); b.dataset.name = c[0];
        b.appendChild(balloonSVG(c[1], c[0]));
        b.onclick = function () { pick(b, c); };
        sky.appendChild(b);
      });
      later(fixSpeech, 250);
    }
    function pick(b, c) {
      if (locked) return;
      if (c[0] === target[0]) {
        locked = true; var p = centerOf(b);
        sfx.pop(); later(sfx.good, 120);
        burst(p[0], p[1] - 20, [c[1], '#F4B740', '#4D7CFE', '#3F8F52', '#F0714A'], 22);
        b.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.35)', opacity: 0 }], { duration: 260, fill: 'forwards' });
        if (wrong === 0) score++;
        msg.textContent = wrong === 0 ? 'Yes! That is ' + c[0].toLowerCase() + '!' : 'You found it! That is ' + c[0].toLowerCase() + '.';
        chip.textContent = 'Balloon ' + round + ' of ' + ROUNDS + '  ·  Stars ' + score;
        speak(wrong === 0 ? 'Yes! ' + c[0] : c[0]);
        later(next, 1100);
      } else {
        wrong++; sfx.bad();
        b.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-10px)' }, { transform: 'translateX(10px)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(0)' }], { duration: 350 });
        b.disabled = true; b.style.opacity = '.45';
        msg.textContent = 'That one is ' + c[0].toLowerCase() + '. Try again!'; msg.className = 'cs-msg bad';
        if (wrong >= 2) { var right = [].slice.call(sky.children).filter(function (x) { return x.dataset.name === target[0]; })[0]; if (right) right.classList.add('hint'); }
      }
    }
    function done() {
      stage.replaceChildren(); sfx.win();
      var stars = score >= 9 ? 3 : score >= 6 ? 2 : 1;
      var box = el('div', 'cs-intro');
      box.appendChild(starRow(stars, 3));
      box.appendChild(el('h2', null, stars === 3 ? 'Color champion!' : stars === 2 ? 'Great job!' : 'Nice try!'));
      box.appendChild(el('p', null, 'You got ' + score + ' of ' + ROUNDS + ' balloons on the first try.'));
      var again = el('button', 'btn cs-big', 'Play again'); again.type = 'button'; again.onclick = startCatch;
      box.appendChild(again); box.appendChild(otherGames('catch'));
      stage.appendChild(box);
      burst(window.innerWidth / 2, window.innerHeight / 3, ['#E53935', '#FDD835', '#1E88E5', '#43A047', '#8E24AA', '#FB8C00'], 40);
      speak(stars === 3 ? 'You are a color champion!' : 'Great job!');
    }
    next();
  }

  /* =====================================================================
     2. PAINT MIXER
     ===================================================================== */
  var POTS = { R: ['Red', '#E53935'], Y: ['Yellow', '#FDD835'], B: ['Blue', '#1E88E5'], W: ['White', '#FFFFFF'] };
  var MIXES = {
    RY: ['Orange', '#FB8C00'], BY: ['Green', '#43A047'], BR: ['Purple', '#8E24AA'], RW: ['Pink', '#F8A5C2'], BW: ['Light blue', '#8EC5FC'],
    WY: ['Light yellow', '#FFF4A3'], BRY: ['Brown', '#795548'], BRW: ['Light purple', '#C9A7E8'], RWY: ['Peach', '#FFCC9E'], BWY: ['Mint green', '#A8E6B0'], BRWY: ['Tan', '#C8A98A']
  };
  var MIX_ROUNDS = ['RY', 'BY', 'BR', 'RW', 'BW', 'WY', 'BRY'];

  function mixKey(list) { var seen = {}; list.forEach(function (k) { seen[k] = 1; }); return Object.keys(seen).sort().join(''); }
  function recipeText(key) { return key.split('').map(function (k) { return POTS[k][0]; }).join(' + '); }
  function averageHex(list) {
    var r = 0, g = 0, b = 0; list.forEach(function (k) { var h = POTS[k][1]; r += parseInt(h.slice(1, 3), 16); g += parseInt(h.slice(3, 5), 16); b += parseInt(h.slice(5, 7), 16); });
    var n = list.length; function x(v) { return ('0' + Math.round(v / n).toString(16)).slice(-2); } return '#' + x(r) + x(g) + x(b);
  }
  function potSVG(hex) {
    var white = hex.toUpperCase() === '#FFFFFF';
    return svg('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true' }, [
      svg('ellipse', { cx: 50, cy: 90, rx: 34, ry: 7, fill: 'rgba(0,0,0,.12)' }),
      svg('path', { d: 'M18 40h64l-6 46c-1 5-6 8-11 8H35c-5 0-10-3-11-8z', fill: '#E8D5B0', stroke: '#B79A66', 'stroke-width': 3, 'stroke-linejoin': 'round' }),
      svg('ellipse', { cx: 50, cy: 40, rx: 33, ry: 11, fill: '#F6E9CC', stroke: '#B79A66', 'stroke-width': 3 }),
      svg('ellipse', { cx: 50, cy: 41, rx: 27, ry: 8, fill: hex, stroke: white ? '#b9b2a4' : 'rgba(0,0,0,.2)', 'stroke-width': 2 }),
      svg('ellipse', { cx: 42, cy: 39, rx: 9, ry: 2.6, fill: '#fff', opacity: white ? 0 : .4 })
    ]);
  }

  function introMix() {
    var art = svg('svg', { viewBox: '0 0 320 130', role: 'img', 'aria-label': 'Red and yellow make orange' });
    [['#E53935', 20], ['#FDD835', 120]].forEach(function (p) { var g = svg('g', { transform: 'translate(' + p[1] + ',15)' }); g.appendChild(potSVG(p[0])); art.appendChild(g); });
    var eq = svg('text', { x: 100, y: 78, 'font-size': 44, 'font-family': 'Baloo 2, sans-serif', 'font-weight': 800, fill: '#7D6A54', 'text-anchor': 'middle' }); eq.textContent = '+';
    art.appendChild(eq);
    var eq2 = svg('text', { x: 235, y: 78, 'font-size': 44, 'font-family': 'Baloo 2, sans-serif', 'font-weight': 800, fill: '#7D6A54', 'text-anchor': 'middle' }); eq2.textContent = '=';
    art.appendChild(eq2); art.appendChild(svg('circle', { cx: 285, cy: 66, r: 28, fill: '#FB8C00', stroke: 'rgba(0,0,0,.2)', 'stroke-width': 3 }));
    introCard('Paint Mixer', 'Mix the paints in the bowl to make the color you are asked for. Red and yellow make orange. What do you think blue and yellow make?', art, 'Start mixing', startMix);
  }

  function startMix() {
    clearStage();
    var targets = shuffle(MIX_ROUNDS.slice(0, 6)).concat([MIX_ROUNDS[6]]);
    var round = 0, score = 0, wrong = 0, bowl = [], locked = false, found = {};

    var bar = el('div', 'cs-bar'), chip = el('span', 'cs-chip'), tools = el('div', 'cs-tools');
    tools.appendChild(voiceBtn()); tools.appendChild(soundBtn()); bar.append(chip, tools);

    var grid = el('div', 'cs-mixgrid');
    var tgt = el('div', 'cs-target'), sw = el('div', 'cs-swatch'), tx = el('div'), th = el('h2'), ts = el('small', null, 'Make this color');
    tx.append(th, ts); tgt.append(sw, tx);
    var bw = el('div', 'cs-bowlwrap'), bowlEl = el('div', 'cs-bowl'), paint = el('div', 'paint');
    bowlEl.append(el('div', 'rim'), paint);
    var scoop = el('div', 'cs-scoop'); scoop.setAttribute('aria-hidden', 'true');
    bw.append(bowlEl, scoop);
    grid.append(tgt, bw);

    var sum = el('p', 'cs-sum'); sum.setAttribute('role', 'status');
    var msg = el('p', 'cs-msg'); msg.setAttribute('role', 'status');
    var pots = el('div', 'cs-pots');
    Object.keys(POTS).forEach(function (k) {
      var b = el('button', 'cs-pot'); b.type = 'button'; b.dataset.k = k; b.setAttribute('aria-label', 'Add ' + POTS[k][0].toLowerCase() + ' paint');
      b.appendChild(potSVG(POTS[k][1])); b.appendChild(el('span', null, POTS[k][0]));
      b.onclick = function () { add(k); };
      pots.appendChild(b);
    });
    var acts = el('div', 'cs-actions');
    var mixBtn = el('button', 'btn cs-big', 'Mix!'); mixBtn.type = 'button'; mixBtn.onclick = doMix;
    var clearBtn = el('button', 'btn btn-light', 'Empty the bowl'); clearBtn.type = 'button'; clearBtn.onclick = function () { if (!locked) empty(); };
    var nextBtn = el('button', 'btn cs-big', 'Next color'); nextBtn.type = 'button'; nextBtn.hidden = true; nextBtn.onclick = nextRound;
    acts.append(mixBtn, clearBtn, nextBtn);
    var foundBox = el('div', 'cs-found'); foundBox.hidden = true;
    foundBox.append(el('h3', null, 'Colors you have made'), el('ul'));
    stage.append(bar, grid, sum, msg, pots, acts, foundBox);

    function bowlLook() {
      if (!bowl.length) { paint.style.background = '#f2ead8'; }
      else if (bowl.length === 1) { paint.style.background = POTS[bowl[0]][1]; }
      else {
        var n = bowl.length, stops = bowl.map(function (k, i) { return POTS[k][1] + ' ' + (i * 360 / n) + 'deg ' + ((i + 1) * 360 / n) + 'deg'; });
        paint.style.background = 'conic-gradient(' + stops.join(',') + ')';
      }
      scoop.replaceChildren();
      bowl.forEach(function (k) { var i = el('i'); i.style.background = POTS[k][1]; scoop.appendChild(i); });
      mixBtn.disabled = bowl.length < 2 || locked;
      mixBtn.style.opacity = mixBtn.disabled ? '.5' : '1';
    }
    function empty() { bowl = []; paint.classList.remove('spin'); bowlLook(); sum.textContent = ''; }
    function add(k) {
      if (locked) return;
      if (bowl.length >= 4) { msg.textContent = 'The bowl is full. Tap Mix!'; msg.className = 'cs-msg'; return; }
      bowl.push(k); sfx.add(); sum.textContent = ''; msg.textContent = ''; bowlLook();
    }
    function nextRound() {
      if (round >= targets.length) return finish();
      var key = targets[round]; round++; wrong = 0; locked = false; nextBtn.hidden = true; mixBtn.hidden = false; clearBtn.hidden = false;
      [].forEach.call(pots.children, function (p) { p.disabled = false; p.classList.remove('hint'); });
      empty(); msg.textContent = ''; msg.className = 'cs-msg';
      var m = MIXES[key]; sw.style.background = m[1]; th.textContent = m[0];
      chip.textContent = 'Color ' + round + ' of ' + targets.length + '  ·  Stars ' + score;
      stage.dataset.target = key; speak('Can you make ' + m[0] + '?');
    }
    function doMix() {
      if (locked || bowl.length < 2) return;
      var key = mixKey(bowl), want = stage.dataset.target, res = MIXES[key];
      var hex = res ? res[1] : averageHex(bowl), name = res ? res[0] : 'a mystery color';
      locked = true; mixBtn.disabled = true; sfx.add(); later(sfx.add, 150); later(sfx.add, 300);
      paint.classList.remove('spin'); void paint.offsetWidth; paint.classList.add('spin');
      later(function () { paint.style.background = hex; }, 450);
      later(function () {
        sum.textContent = recipeText(key) + ' = ' + name;
        if (res && !found[key]) { found[key] = 1; renderFound(); }
        if (key === want) {
          sfx.good(); var c = centerOf(bowlEl); burst(c[0], c[1], [hex, '#F4B740', '#4D7CFE', '#3F8F52'], 26);
          if (wrong === 0) score++;
          chip.textContent = 'Color ' + round + ' of ' + targets.length + '  ·  Stars ' + score;
          msg.textContent = wrong === 0 ? 'You did it! First try!' : 'You made it!'; msg.className = 'cs-msg';
          speak('You made ' + name + '!');
          mixBtn.hidden = true; clearBtn.hidden = true; nextBtn.hidden = false; nextBtn.textContent = round >= targets.length ? 'See my stars' : 'Next color';
          [].forEach.call(pots.children, function (p) { p.disabled = true; });
        } else {
          wrong++; sfx.bad(); locked = false; bowlLook();
          msg.textContent = 'That made ' + name.toLowerCase() + ', not ' + MIXES[want][0].toLowerCase() + '. Empty the bowl and try again!'; msg.className = 'cs-msg bad';
          if (wrong >= 2) {
            msg.textContent += ' Hint: ' + MIXES[want][0] + ' is ' + recipeText(want) + '.';
            want.split('').forEach(function (k) { var p = pots.querySelector('[data-k="' + k + '"]'); if (p) p.classList.add('hint'); });
          }
        }
      }, 950);
    }
    function renderFound() {
      var ul = foundBox.querySelector('ul'); ul.replaceChildren(); foundBox.hidden = false;
      Object.keys(found).forEach(function (k) { var li = el('li'), i = el('i'); i.style.background = MIXES[k][1]; li.append(i, document.createTextNode(MIXES[k][0])); ul.appendChild(li); });
    }
    function finish() {
      stage.replaceChildren(); sfx.win();
      var stars = score >= 6 ? 3 : score >= 4 ? 2 : 1;
      var box = el('div', 'cs-intro');
      box.appendChild(starRow(stars, 3));
      box.appendChild(el('h2', null, stars === 3 ? 'Master color mixer!' : stars === 2 ? 'Great mixing!' : 'Nice mixing!'));
      box.appendChild(el('p', null, 'You made ' + score + ' of ' + targets.length + ' colors on the first try. You discovered ' + Object.keys(found).length + ' different colors.'));
      var again = el('button', 'btn cs-big', 'Mix again'); again.type = 'button'; again.onclick = startMix;
      box.appendChild(again); box.appendChild(otherGames('mix')); stage.appendChild(box);
      burst(window.innerWidth / 2, window.innerHeight / 3, ['#FB8C00', '#43A047', '#8E24AA', '#F8A5C2', '#8EC5FC'], 40);
      speak('Master color mixer!');
    }
    nextRound();
  }

  /* =====================================================================
     3. PAINT THE ANIMAL  (tap a color, tap a part of the picture)
     ===================================================================== */
  var ANIMALS = [['hedgehog', 'Hedgehog', 'animals'], ['lion', 'Lion', 'animals'], ['frog', 'Frog', 'animals'], ['owl', 'Owl', 'animals'], ['whale', 'Whale', 'sea'], ['octopus', 'Octopus', 'sea'], ['turtle', 'Sea turtle', 'sea'], ['fish', 'Fish', 'sea']];
  var PALETTE = [['Red', '#E53935'], ['Orange', '#FB8C00'], ['Yellow', '#FDD835'], ['Lime', '#9CCC3C'], ['Green', '#2E9E52'], ['Teal', '#1AA7A0'], ['Sky blue', '#5BC0F8'], ['Blue', '#1E5FD8'],
    ['Purple', '#8E24AA'], ['Pink', '#F06292'], ['Light pink', '#F8BBD0'], ['Brown', '#795548'], ['Tan', '#D2A679'], ['Gray', '#9E9E9E'], ['Black', '#222222'], ['White', '#FFFFFF']];
  var SIZE = 800;

  function introPaint() {
    var art = el('div'); var row = el('div', 'cs-animals');
    ANIMALS.slice(0, 4).forEach(function (a) { var i = el('img'); i.src = '/assets/coloring/' + a[2] + '/' + a[0] + '.svg'; i.alt = ''; i.width = 90; i.height = 90; i.style.cssText = 'width:22%;height:auto;border-radius:12px;border:3px solid var(--card-edge);background:#fff'; row.appendChild(i); });
    art.appendChild(row);
    introCard('Paint the Animal', 'Pick an animal and a color, then tap any part of the picture to paint it. Make a rainbow hedgehog or a purple lion. It is your picture!', art, 'Start painting', startPaint);
  }

  function startPaint() {
    clearStage();
    var animal = ANIMALS[0], color = PALETTE[0][1], labels = null, nLabels = 0, lineImg = null, buf = null, fills = {}, history = [], busy = true;
    var cv = el('canvas'); cv.width = cv.height = SIZE; cv.setAttribute('role', 'img');
    var ctx = cv.getContext('2d', { willReadFrequently: true });
    var paintCv = document.createElement('canvas'); paintCv.width = paintCv.height = SIZE; var pctx = paintCv.getContext('2d');
    var imgData = pctx.createImageData(SIZE, SIZE); buf = new Uint32Array(imgData.data.buffer);
    var WHITE = 0xFFFFFFFF;

    var picker = el('div', 'cs-animals'); picker.setAttribute('role', 'group'); picker.setAttribute('aria-label', 'Choose an animal');
    ANIMALS.forEach(function (a) {
      var b = el('button', 'cs-animal'); b.type = 'button'; b.setAttribute('aria-label', a[1]); b.setAttribute('aria-pressed', a === animal ? 'true' : 'false');
      var i = el('img'); i.src = '/assets/coloring/' + a[2] + '/' + a[0] + '.svg'; i.alt = ''; b.appendChild(i);
      b.onclick = function () { if (busy || a === animal) return; animal = a; [].forEach.call(picker.children, function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); }); load(); };
      picker.appendChild(b);
    });
    var side = el('div', 'cs-paintside'), pal = el('div', 'cs-palette'); pal.setAttribute('role', 'group'); pal.setAttribute('aria-label', 'Colors');
    PALETTE.forEach(function (c) {
      var b = el('button', 'cs-color'); b.type = 'button'; b.style.background = c[1]; b.setAttribute('aria-label', c[0]); b.title = c[0]; b.setAttribute('aria-pressed', c[1] === color ? 'true' : 'false');
      b.onclick = function () { color = c[1]; [].forEach.call(pal.children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); sfx.add(); };
      pal.appendChild(b);
    });
    var btns = el('div', 'cs-paintbtns');
    var undo = el('button', 'btn btn-light cs-small', 'Undo'); undo.type = 'button';
    var clear = el('button', 'btn btn-light cs-small', 'Start over'); clear.type = 'button';
    var save = el('button', 'btn cs-small', 'Save picture'); save.type = 'button';
    btns.append(undo, clear, save);
    var status = el('p', 'note'); status.setAttribute('role', 'status');
    side.append(el('h3', null, 'Pick a color'), pal, btns, status);
    var wrap = el('div', 'cs-canvaswrap'); wrap.appendChild(cv);
    var layout = el('div', 'cs-paint'); layout.append(wrap, side);
    var bar = el('div', 'cs-bar'), chip = el('span', 'cs-chip', 'Tap a part of the picture to paint it'), tools = el('div', 'cs-tools'); tools.appendChild(soundBtn()); bar.append(chip, tools);
    stage.append(bar, picker, layout);

    function render() {
      pctx.putImageData(imgData, 0, 0);
      ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.drawImage(paintCv, 0, 0);
      ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(lineImg, 0, 0, SIZE, SIZE);
      ctx.globalCompositeOperation = 'source-over';
    }
    function packed(hex) { var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16); return (0xFF000000 | (b << 16) | (g << 8) | r) >>> 0; }
    function setRegion(L, hex) { var v = hex ? packed(hex) : WHITE; for (var i = 0, n = labels.length; i < n; i++) if (labels[i] === L) buf[i] = v; }
    function refreshBtns() { undo.disabled = !history.length; clear.disabled = !history.length; }

    function label(data) {
      var n = SIZE * SIZE; labels = new Int32Array(n).fill(-1);
      var open = new Uint8Array(n);
      for (var i = 0; i < n; i++) { var p = i * 4; open[i] = (data[p] * 0.299 + data[p + 1] * 0.587 + data[p + 2] * 0.114) > 110 ? 1 : 0; }
      var stack = new Int32Array(n), cur = 0;
      for (var s = 0; s < n; s++) {
        if (!open[s] || labels[s] !== -1) continue;
        var sp = 0; stack[sp++] = s; labels[s] = cur;
        while (sp) {
          var q = stack[--sp], x = q % SIZE;
          if (x > 0 && open[q - 1] && labels[q - 1] === -1) { labels[q - 1] = cur; stack[sp++] = q - 1; }
          if (x < SIZE - 1 && open[q + 1] && labels[q + 1] === -1) { labels[q + 1] = cur; stack[sp++] = q + 1; }
          if (q >= SIZE && open[q - SIZE] && labels[q - SIZE] === -1) { labels[q - SIZE] = cur; stack[sp++] = q - SIZE; }
          if (q < n - SIZE && open[q + SIZE] && labels[q + SIZE] === -1) { labels[q + SIZE] = cur; stack[sp++] = q + SIZE; }
        }
        cur++;
      }
      nLabels = cur;
    }
    function load() {
      busy = true; fills = {}; history = []; refreshBtns(); status.textContent = 'Getting the ' + animal[1].toLowerCase() + ' ready…';
      cv.setAttribute('aria-label', 'Coloring picture of a ' + animal[1].toLowerCase());
      var my = token, img = new Image();
      img.onload = function () {
        if (my !== token) return;
        try {
          var tmp = document.createElement('canvas'); tmp.width = tmp.height = SIZE; var tc = tmp.getContext('2d', { willReadFrequently: true });
          tc.fillStyle = '#fff'; tc.fillRect(0, 0, SIZE, SIZE); tc.drawImage(img, 0, 0, SIZE, SIZE);
          label(tc.getImageData(0, 0, SIZE, SIZE).data);
        } catch (e) { status.textContent = 'Sorry, this picture would not load. Please try another animal.'; return; }
        lineImg = img; buf.fill(WHITE); render(); busy = false; status.textContent = ''; refreshBtns();
      };
      img.onerror = function () { if (my === token) status.textContent = 'Sorry, this picture would not load. Please try another animal.'; };
      img.src = '/assets/coloring/' + animal[2] + '/' + animal[0] + '.svg';
    }
    function regionAt(x, y) {
      var L = labels[y * SIZE + x]; if (L >= 0) return L;
      for (var r = 1; r <= 10; r++) {   // a tap on a black line paints the nearest part
        for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          var xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= SIZE || yy >= SIZE) continue;
          var l = labels[yy * SIZE + xx]; if (l >= 0) return l;
        }
      }
      return -1;
    }
    cv.addEventListener('pointerdown', function (ev) {
      if (busy || !labels) return; ev.preventDefault();
      var r = cv.getBoundingClientRect(), x = Math.floor((ev.clientX - r.left) / r.width * SIZE), y = Math.floor((ev.clientY - r.top) / r.height * SIZE);
      if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
      var L = regionAt(x, y); if (L < 0) return;
      if (fills[L] === color) return;
      history.push([L, fills[L] || null]); fills[L] = color; setRegion(L, color); render(); refreshBtns(); sfx.paint();
      burst(ev.clientX, ev.clientY, [color, '#fff', '#F4B740'], 8);
    });
    undo.onclick = function () {
      var h = history.pop(); if (!h) return; if (h[1]) fills[h[0]] = h[1]; else delete fills[h[0]];
      setRegion(h[0], h[1]); render(); refreshBtns();
    };
    clear.onclick = function () { if (!history.length) return; fills = {}; history = []; buf.fill(WHITE); render(); refreshBtns(); };
    save.onclick = function () {
      if (busy) return;
      var A = window.HogAuth;
      var go = function () {
        var name = 'Hog-the-Hedgehog-' + animal[0] + '-painting.png';
        cv.toBlob(function (blob) {
          if (!blob) { status.textContent = 'Sorry, saving did not work. Please try again.'; return; }
          var u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
          if (A && A.logDownload) A.logDownload({ kind: 'color-splash-picture', file: name });
          status.textContent = 'Your picture is saved. Check your Downloads folder.';
        }, 'image/png');
      };
      if (A && A.gateDownload) A.gateDownload({ kind: 'color-splash-picture', label: 'your painting' }).then(function (ok) { if (ok) go(); }); else go();
    };
    load();
  }

  /* ---------- start ---------- */
  var first = (location.hash || '').replace('#', '');
  select(GAMES[first] ? first : 'catch', false);
})();
