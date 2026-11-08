/* Letter Lab activity engine.
   Every activity is built twice from the same code:
     mode 'play'  -> interactive game on screen
     mode 'print' -> static worksheet that gets rendered into the PDF */
(function (global) {
  'use strict';

  const DPR = 2;
  const PALETTE = ['#E85C4A', '#F4B740', '#3F8F52', '#4D7CFE', '#7B5CF0', '#E85C9A', '#4A3B2A'];
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const LETTER_FONT = (px) => `800 ${px}px "Baloo 2","Nunito",system-ui,sans-serif`;
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  /* ---------- tiny helpers ---------- */
  function el(tag, cls, content, attrs) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (content != null) n.append(content);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function btn(cls, content, label) {
    return el('button', cls, content, { type: 'button', ...(label ? { 'aria-label': label } : {}) });
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shake(node) {
    node.classList.remove('shake'); void node.offsetWidth; node.classList.add('shake');
    setTimeout(() => node.classList.remove('shake'), 450);
  }

  /* ---------- context ---------- */
  function makeCtx(letter, name, mode, seed) {
    const U = letter.toUpperCase(), l = letter.toLowerCase();
    const D = ALPHABET_DATA[U];
    const rule = D.rule || 'start';
    const rng = mulberry32(seed);
    const rand = (n) => Math.floor(rng() * n);
    const shuffle = (a) => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = rand(i + 1); [r[i], r[j]] = [r[j], r[i]]; } return r; };
    const matches = (w) => rule === 'has' ? w.toLowerCase().includes(l) : w.toLowerCase().startsWith(l);
    const words = D.words.map(([w, e, s]) => ({ w, e, s }));
    const twins = (SOUND_TWINS[U] || '').toLowerCase();

    const pool = [];
    for (const k in ALPHABET_DATA) {
      for (const [w, e, s] of ALPHABET_DATA[k].words) {
        if (matches(w)) continue;
        if (rule === 'start' && twins.includes(w[0].toLowerCase())) continue;
        if (words.some((x) => x.e === e)) continue;
        if (pool.some((x) => x.e === e || x.w === w)) continue;
        pool.push({ w, e, s });
      }
    }
    const ctx = {
      letter: U, U, l, name, mode, D, rule, rng, rand, shuffle, words, matches,
      play: mode === 'play',
      soundOn: true,
      mascot: `${D.name} the ${D.animal}`,
      greeting: `Hello ${name}, I'm ${D.name} the ${D.animal}!`,
      accent: `hsl(${(ALPHA.indexOf(U) * 14 + 8) % 360}, 62%, 42%)`,
      ph: rule === 'has'
        ? { pos: `has ${U} in it`, neg: `does NOT have ${U} in it` }
        : { pos: `starts with ${U}`, neg: `does NOT start with ${U}` },
      targets(n, exclude) {
        const ex = new Set((exclude || []).map((x) => x.w));
        const fresh = shuffle(words).filter((w) => !ex.has(w.w));
        return fresh.concat(shuffle(words).filter((w) => ex.has(w.w))).slice(0, n);
      },
      distract(n, avoidEmoji) {
        const av = new Set(avoidEmoji || []);
        return shuffle(pool).filter((w) => !av.has(w.e)).slice(0, n);
      },
      simple(min, max) {
        return words.filter((w) => /^[a-z]+$/i.test(w.w) && w.w.length >= min && w.w.length <= max);
      },
      speak(text, rate) {
        if (!ctx.soundOn || !('speechSynthesis' in global)) return;
        try {
          global.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(text);
          u.lang = 'en-US'; u.rate = rate || 0.85; u.pitch = 1.1;
          global.speechSynthesis.speak(u);
        } catch (e) { /* speech is a bonus */ }
      },
    };
    return ctx;
  }

  /* ---------- pictures & rounds ---------- */
  function pic(word, o) {
    o = o || {};
    const p = o.btn ? btn('pic' + (o.hideWord ? ' hide-w' : '')) : el('div', 'pic');
    p.append(el('span', 'pic-e', word.e));
    if (o.label !== false) p.append(el('span', 'pic-w', word.w));
    return p;
  }

  // Play: one round at a time with progress dots. Print: all rounds on the page.
  function sequence(ctx, body, api, makers) {
    if (!ctx.play) { makers.forEach((m) => body.append(m(() => {}))); return; }
    const dots = el('div', 'seq-dots'), holder = el('div', 'seq');
    body.append(dots, holder);
    const dotEls = makers.map(() => dots.appendChild(el('span', 'dot')));
    let i = 0;
    const show = () => {
      dotEls.forEach((d, k) => d.classList.toggle('on', k === i));
      const k = i;
      holder.replaceChildren(makers[k](() => {
        dotEls[k].classList.add('done');
        if (k !== i) return;
        setTimeout(() => { i++; if (i < makers.length) show(); else api.done(); }, 800);
      }));
    };
    show();
  }

  /* ---------- canvas toolkit ---------- */
  function layered(w, h) {
    const wrap = el('div', 'cv-wrap');
    wrap.style.setProperty('--cw', w); wrap.style.setProperty('--ch', h);
    wrap.style.maxWidth = w + 'px';
    const mk = (cls) => {
      const c = document.createElement('canvas');
      c.width = w * DPR; c.height = h * DPR; c.className = cls;
      const g = c.getContext('2d'); g.scale(DPR, DPR);
      return { c, g };
    };
    const guide = mk('cv-guide'), ink = mk('cv-ink');
    wrap.append(guide.c, ink.c);
    return { wrap, w, h, gc: guide.c, g: guide.g, ic: ink.c, i: ink.g };
  }
  function capHeight(g, px) {
    g.font = LETTER_FONT(px);
    return g.measureText('H').actualBoundingBoxAscent || px * 0.7;
  }
  function textOutline(g, text, x, y, px, o) {
    g.save();
    g.font = LETTER_FONT(px); g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.lineJoin = 'round';
    if (o.fill) { g.fillStyle = o.fill; g.fillText(text, x, y); }
    g.lineWidth = o.lw || 3; g.strokeStyle = o.color;
    g.setLineDash(o.dash === false ? [] : [10, 8]);
    g.strokeText(text, x, y);
    g.restore();
  }
  function ruleLines(g, w, base, cap) {
    g.save();
    g.lineWidth = 2; g.strokeStyle = '#d8c9ae'; g.setLineDash([]);
    g.beginPath(); g.moveTo(8, base); g.lineTo(w - 8, base); g.moveTo(8, base - cap); g.lineTo(w - 8, base - cap); g.stroke();
    g.setLineDash([6, 7]); g.strokeStyle = '#e7dbc4';
    g.beginPath(); g.moveTo(8, base - cap / 2); g.lineTo(w - 8, base - cap / 2); g.stroke();
    g.restore();
  }
  function attachInk(L, tool, onInk) {
    const c = L.ic, g = L.i;
    let drawing = false, last = null, total = 0;
    c.style.touchAction = 'none';
    const pt = (e) => { const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) * L.w / r.width, y: (e.clientY - r.top) * L.h / r.height }; };
    const seg = (a, b) => {
      g.save();
      g.globalCompositeOperation = tool.erase ? 'destination-out' : 'source-over';
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.lineWidth = tool.erase ? tool.width * 2.4 : tool.width;
      g.strokeStyle = tool.color;
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
      g.restore();
    };
    c.addEventListener('pointerdown', (e) => {
      e.preventDefault(); drawing = true;
      try { c.setPointerCapture(e.pointerId); } catch (err) { /* synthetic or unsupported pointer */ }
      last = pt(e); seg(last, { x: last.x + 0.1, y: last.y }); total += 4; onInk && onInk(total);
    });
    c.addEventListener('pointermove', (e) => {
      if (!drawing) return;
      const p = pt(e); seg(last, p);
      total += Math.hypot(p.x - last.x, p.y - last.y); last = p; onInk && onInk(total);
    });
    const end = () => { drawing = false; };
    c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
    return { clear() { g.clearRect(0, 0, L.w, L.h); total = 0; } };
  }
  function inkTools(tool, handle, opts) {
    const bar = el('div', 'ink-tools');
    const sw = [];
    PALETTE.forEach((col, k) => {
      const b = btn('swatch' + (k === 0 ? ' on' : ''), '', 'Color ' + (k + 1));
      b.style.background = col;
      b.onclick = () => { tool.color = col; tool.erase = false; sw.forEach((s) => s.classList.remove('on')); b.classList.add('on'); er && er.classList.remove('on'); };
      sw.push(b); bar.append(b);
    });
    let er = null;
    if (!opts || opts.eraser !== false) {
      er = btn('tool-btn', '🧽 Eraser');
      er.onclick = () => { tool.erase = !tool.erase; er.classList.toggle('on', tool.erase); };
      bar.append(er);
    }
    const cl = btn('tool-btn', '🗑️ Start over');
    cl.onclick = () => { handle.clear(); opts && opts.onClear && opts.onClear(); };
    bar.append(cl);
    return bar;
  }

  // Single letter on a tiny canvas: pixel-exact in the PDF (HTML text can sit low in tiles).
  function glyph(ch, w, h, px, color) {
    const c = document.createElement('canvas');
    c.width = w * DPR; c.height = h * DPR; c.className = 'glyph';
    c.style.width = w + 'px'; c.style.height = h + 'px';
    const g = c.getContext('2d'); g.scale(DPR, DPR);
    g.font = LETTER_FONT(px); g.textAlign = 'center'; g.fillStyle = color || '#4A3B2A';
    const cap = g.measureText('H').actualBoundingBoxAscent || px * 0.7;
    g.fillText(ch, w / 2, h / 2 + cap / 2);
    return c;
  }

  function bigLetters(ctx, px, cls) {
    const w = Math.round(px * 2.3), h = Math.round(px * 1.25);
    const c = document.createElement('canvas');
    c.width = w * DPR; c.height = h * DPR; c.className = cls || 'big-letters-cv';
    c.style.width = w + 'px'; c.style.height = h + 'px'; c.style.maxWidth = '100%';
    const g = c.getContext('2d'); g.scale(DPR, DPR);
    g.font = LETTER_FONT(px); g.fillStyle = ctx.accent; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillText(ctx.U, w * 0.3, h * 0.88); g.fillText(ctx.l, w * 0.7, h * 0.88);
    return c;
  }

  /* ---------- letter-cell helpers ---------- */
  function otherLetters(ctx, n, lowerOnly, upperOnly) {
    const look = (LOOKALIKES[ctx.U] || '').split('');
    const rest = ctx.shuffle(ALPHA.filter((c) => c !== ctx.U && !look.includes(c)));
    const src = look.concat(rest);
    const out = [];
    for (let k = 0; out.length < n && k < src.length * 2; k++) {
      const c = src[k % src.length];
      let ch = lowerOnly ? c.toLowerCase() : upperOnly ? c : (ctx.rand(2) ? c : c.toLowerCase());
      if (ch.toLowerCase() === ctx.l) continue;
      if ((ch === 'I' && ctx.l === 'l') || (ch === 'l' && ctx.U === 'I')) continue;
      if (out.includes(ch)) continue;
      out.push(ch);
    }
    return out;
  }

  /* =====================================================================
     THE 20 ACTIVITIES
     ===================================================================== */
  const EX = [];

  // 1 ---------------------------------------------------------------
  EX.push({
    id: 'hello', title: 'Say Hello', emoji: '👋',
    play: (c) => `Say hello to ${c.D.name}! Tap a star each time you say the ${c.U} sound.`,
    print: (c) => `Say hello to ${c.D.name}! Then say the ${c.U} sound three times and color a star each time.`,
    build(ctx, body, api) {
      const w = el('div', 'hello');
      const bubble = el('div', 'bubble');
      bubble.append(el('strong', '', ctx.greeting));
      if (ctx.D.note) bubble.append(el('div', 'note', ctx.D.note));
      const big = ctx.play ? el('div', 'big-letters') : bigLetters(ctx, 84);
      if (ctx.play) big.append(el('span', '', ctx.U), el('span', '', ctx.l));
      w.append(el('div', 'hello-mascot', ctx.D.emoji), bubble, big, el('div', 'sound-line', `The ${ctx.U} sound: “${ctx.D.sound}”`));
      const stars = el('div', 'stars-row');
      let n = 0;
      for (let k = 0; k < 3; k++) {
        const s = ctx.play ? btn('star-btn', '☆', 'Star ' + (k + 1)) : el('span', 'star-btn', '☆');
        if (ctx.play) s.onclick = () => {
          if (s.classList.contains('on')) return;
          s.classList.add('on'); s.textContent = '⭐'; n++;
          ctx.speak(k === 0 ? ctx.D.sound.split(',')[0] : ctx.U, 0.7);
          if (n === 3) api.done();
        };
        stars.append(s);
      }
      w.append(stars);
      if (ctx.play) {
        const hear = btn('tool-btn', `🔊 Hear ${ctx.D.name}`);
        hear.onclick = () => ctx.speak(ctx.greeting);
        w.append(hear);
      }
      body.append(w);
    },
  });

  // 2 ---------------------------------------------------------------
  EX.push({
    id: 'trace', title: 'Trace It', emoji: '✏️',
    play: (c) => `Trace the dotted ${c.U} and ${c.l} with your finger or mouse.`,
    print: (c) => `Trace the dotted ${c.U} and ${c.l} with a pencil. Then trace the little ones!`,
    build(ctx, body, api) {
      const L = layered(660, 250);
      const cap = capHeight(L.g, 200);
      ruleLines(L.g, 660, 215, cap);
      textOutline(L.g, ctx.U, 190, 215, 200, { color: ctx.accent, lw: 4 });
      textOutline(L.g, ctx.l, 470, 215, 200, { color: ctx.accent, lw: 4 });
      body.append(L.wrap);
      if (ctx.play) {
        const tool = { color: PALETTE[0], width: 16, erase: false };
        const h = attachInk(L, tool, (t) => { if (t > 700) api.done(); });
        body.append(inkTools(tool, h, { eraser: false }));
      } else {
        const S = layered(660, 130);
        const cs = capHeight(S.g, 80);
        ruleLines(S.g, 660, 104, cs);
        for (let k = 0; k < 6; k++) textOutline(S.g, k % 2 ? ctx.l : ctx.U, 60 + k * 108, 104, 80, { color: ctx.accent, lw: 3 });
        body.append(S.wrap);
      }
    },
  });

  // 3 ---------------------------------------------------------------
  EX.push({
    id: 'find', title: 'Letter Detective', emoji: '🔍',
    play: (c) => `Find every ${c.U} and ${c.l} hiding in the grid. Tap them all!`,
    print: (c) => `Circle every ${c.U} and ${c.l} you can find. How many are there?`,
    build(ctx, body, api) {
      const nT = 7;
      const targets = [ctx.U, ctx.l, ctx.U, ctx.l];
      while (targets.length < nT) targets.push(ctx.rand(2) ? ctx.U : ctx.l);
      const cells = ctx.shuffle(targets.map((t) => ({ t, hit: true })).concat(otherLetters(ctx, 13).map((t) => ({ t, hit: false }))));
      const grid = el('div', 'letter-grid');
      let found = 0;
      const counter = el('div', 'counter', ctx.play ? `Found 0 of ${nT}` : `I found ____ of them.`);
      cells.forEach((cell) => {
        const b = ctx.play ? btn('lcell', cell.t) : el('div', 'lcell');
        if (!ctx.play) b.append(glyph(cell.t, 60, 60, 40));
        if (ctx.play) b.onclick = () => {
          if (b.classList.contains('ok')) return;
          if (cell.hit) {
            b.classList.add('ok'); found++; counter.textContent = `Found ${found} of ${nT}`;
            if (found === nT) api.done();
          } else shake(b);
        };
        grid.append(b);
      });
      body.append(grid, counter);
    },
  });

  // 4 ---------------------------------------------------------------
  EX.push({
    id: 'partner', title: 'Big & Little Partners', emoji: '👫',
    play: (c) => `Every capital letter has a little partner. Can you match ${c.U} and ${c.l}?`,
    print: (c) => `Circle the partner of each letter: capital ${c.U} goes with little ${c.l}.`,
    build(ctx, body, api) {
      const mk = (shown, answer, opts, qtext) => (done) => {
        const box = el('div', 'round');
        const ps = el('div', 'partner-show'); if (ctx.play) ps.append(shown); else ps.append(glyph(shown, 110, 90, 80, ctx.accent));
        box.append(ps, el('p', 'q', qtext));
        const row = el('div', 'choice-row');
        ctx.shuffle([answer, ...opts]).forEach((o) => {
          const b = ctx.play ? btn('choice', o) : el('div', 'choice');
          if (!ctx.play) b.append(glyph(o, 54, 54, 38));
          if (ctx.play) b.onclick = () => { if (o === answer) { b.classList.add('ok'); done(); } else shake(b); };
          row.append(b);
        });
        box.append(row); return box;
      };
      sequence(ctx, body, api, [
        mk(ctx.U, ctx.l, otherLetters(ctx, 3, true), `Which little letter is the partner of ${ctx.U}?`),
        mk(ctx.l, ctx.U, otherLetters(ctx, 3, false, true), `Which capital letter is the partner of ${ctx.l}?`),
      ]);
    },
  });

  // 5 ---------------------------------------------------------------
  EX.push({
    id: 'startsWith', title: 'Who Starts With It?', emoji: '🎯',
    play: (c) => `Look at the pictures. Which one ${c.ph.pos}? Tap it!`,
    print: (c) => `Say each picture's name out loud. Circle the one that ${c.ph.pos}.`,
    build(ctx, body, api) {
      const ts = ctx.targets(3), seen = [];
      sequence(ctx, body, api, ts.map((t) => (done) => {
        const ds = ctx.distract(3, [t.e, ...seen]); seen.push(...ds.map((d) => d.e));
        const opts = ctx.shuffle([t, ...ds]);
        const box = el('div', 'round');
        box.append(el('p', 'q', `Which one ${ctx.ph.pos}?`));
        const grid = el('div', 'pic-grid');
        opts.forEach((o) => {
          const p = pic(o, { btn: ctx.play, hideWord: ctx.play, label: ctx.play });
          if (ctx.play) p.onclick = () => {
            p.classList.remove('hide-w'); ctx.speak(o.w);
            if (o === t) { p.classList.add('ok'); done(); } else shake(p);
          };
          grid.append(p);
        });
        box.append(grid); return box;
      }));
    },
  });

  // 6 ---------------------------------------------------------------
  EX.push({
    id: 'sort', title: 'Sort the Pictures', emoji: '🧺',
    play: (c) => `Tap a picture, then tap the basket where it belongs.`,
    print: (c) => `Look at each picture. Tick “yes” if it ${c.ph.pos}, or “no” if it doesn't.`,
    build(ctx, body, api) {
      const t = ctx.targets(4), n = ctx.distract(4, t.map((x) => x.e));
      const items = ctx.shuffle(t.map((w) => ({ w, yes: true })).concat(n.map((w) => ({ w, yes: false }))));
      if (!ctx.play) {
        const grid = el('div', 'pic-grid sort-print');
        items.forEach((it) => {
          const cell = el('div', 'sort-cell');
          cell.append(pic(it.w, { label: false }), el('div', 'yn', '☐ yes   ☐ no'));
          grid.append(cell);
        });
        body.append(grid); return;
      }
      const pool = el('div', 'pic-grid');
      const mkBin = (label, yes) => {
        const b = btn('bin', '', label);
        b.append(el('div', 'bin-title', label), el('div', 'bin-items'));
        b.onclick = () => {
          if (!sel) { shake(b); return; }
          if (sel.it.yes === yes) {
            sel.p.classList.remove('sel', 'hide-w'); sel.p.disabled = true;
            b.querySelector('.bin-items').append(sel.p);
            left--; sel = null; if (!left) api.done();
          } else { shake(sel.p); }
        };
        return b;
      };
      let sel = null, left = items.length;
      items.forEach((it) => {
        const p = pic(it.w, { btn: true, hideWord: true });
        p.onclick = () => { if (sel) sel.p.classList.remove('sel'); sel = { p, it }; p.classList.add('sel'); ctx.speak(it.w.w); };
        pool.append(p);
      });
      const bins = el('div', 'bins');
      bins.append(mkBin(`✅ ${ctx.U} basket`, true), mkBin(`🚫 Not ${ctx.U}`, false));
      body.append(pool, bins);
    },
  });

  // 7 ---------------------------------------------------------------
  EX.push({
    id: 'odd', title: 'Odd One Out', emoji: '🕵️',
    play: (c) => `Three pictures belong together. Tap the one that ${c.ph.neg}!`,
    print: (c) => `Three pictures belong together. Cross out the one that ${c.ph.neg}.`,
    build(ctx, body, api) {
      const used = [];
      sequence(ctx, body, api, [0, 1].map(() => (done) => {
        const t = ctx.targets(3, used); used.push(...t);
        const odd = ctx.distract(1, t.map((x) => x.e))[0];
        const box = el('div', 'round'), grid = el('div', 'pic-grid');
        ctx.shuffle([...t, odd]).forEach((o) => {
          const p = pic(o, { btn: ctx.play, hideWord: ctx.play, label: ctx.play });
          if (ctx.play) p.onclick = () => {
            p.classList.remove('hide-w'); ctx.speak(o.w);
            if (o === odd) { p.classList.add('ok'); done(); } else shake(p);
          };
          grid.append(p);
        });
        box.append(grid); return box;
      }));
    },
  });

  // 8 ---------------------------------------------------------------
  EX.push({
    id: 'match', title: 'Match Word & Picture', emoji: '🔗',
    play: () => 'Tap a word, then tap the picture it belongs to.',
    print: () => 'Read each word. Write the number of the matching picture on the line.',
    build(ctx, body, api) {
      const ws = ctx.targets(3), order = ctx.shuffle(ws);
      if (!ctx.play) {
        const row = el('div', 'pic-grid');
        ws.forEach((w, k) => { const p = pic(w, { label: false }); const nb = el('span', 'num-badge'); nb.append(glyph(String(k + 1), 28, 28, 17, '#ffffff')); p.prepend(nb); row.append(p); });
        const list = el('div', 'word-list');
        order.forEach((w) => list.append(el('div', 'word-line', `${w.w}   →   picture # ____`)));
        body.append(row, list); return;
      }
      const row = el('div', 'pic-grid'), list = el('div', 'chip-row');
      let sel = null, left = ws.length;
      const handle = (node, kind, w) => {
        node.onclick = () => {
          if (node.disabled) return;
          if (sel && sel.kind !== kind) {
            if (sel.w === w) {
              [sel.node, node].forEach((x) => { x.classList.remove('sel'); x.classList.add('ok'); x.disabled = true; });
              ctx.speak(w.w); sel = null; left--; if (!left) api.done();
            } else { shake(node); shake(sel.node); sel.node.classList.remove('sel'); sel = null; }
          } else { if (sel) sel.node.classList.remove('sel'); sel = { node, kind, w }; node.classList.add('sel'); }
        };
      };
      ws.forEach((w) => { const p = pic(w, { btn: true, label: false }); handle(p, 'pic', w); row.append(p); });
      order.forEach((w) => { const c = btn('chip', w.w); handle(c, 'word', w); list.append(c); });
      body.append(row, list);
    },
  });

  // 9 ---------------------------------------------------------------
  EX.push({
    id: 'missing', title: 'Missing Letter', emoji: '🧩',
    play: (c) => `Oh no, a letter fell off! Tap the missing letter to finish each word.`,
    print: (c) => `A letter is missing in each word. Write it in the empty box.`,
    build(ctx, body, api) {
      const ws = ctx.shuffle(ctx.simple(3, 8)).slice(0, 3);
      sequence(ctx, body, api, ws.map((w) => (done) => {
        const idx = ctx.rule === 'has' ? w.w.toLowerCase().indexOf(ctx.l) : 0;
        const answer = w.w[idx].toLowerCase();
        const choices = ctx.shuffle([answer, ...otherLetters(ctx, 2, true)]);
        const box = el('div', 'round');
        const word = el('div', 'word-boxes');
        let blank = null;
        [...w.w].forEach((ch, k) => {
          const b = el('span', 'wbox' + (k === idx ? ' blank' : ''));
          if (k !== idx) { if (ctx.play) b.append(ch); else b.append(glyph(ch, 40, 48, 30)); }
          if (k === idx) blank = b;
          word.append(b);
        });
        const top = el('div', 'missing-top');
        top.append(el('span', 'pic-e big', w.e), word);
        box.append(top);
        const row = el('div', 'choice-row');
        choices.forEach((o) => {
          const b = ctx.play ? btn('choice', o) : el('div', 'choice hint');
          if (!ctx.play) b.append(glyph(o, 50, 50, 34));
          if (ctx.play) b.onclick = () => {
            if (o === answer) { blank.textContent = o; blank.classList.add('ok'); ctx.speak(w.w); b.classList.add('ok'); done(); } else shake(b);
          };
          row.append(b);
        });
        if (!ctx.play) box.append(el('div', 'hint-label', 'Letters to pick from:'));
        box.append(row); return box;
      }));
    },
  });

  // 10 --------------------------------------------------------------
  EX.push({
    id: 'build', title: 'Build the Word', emoji: '🧱',
    play: () => 'The letters got jumbled! Tap them in the right order to build the word.',
    print: () => 'The letters got jumbled! Write them in the right order in the boxes.',
    build(ctx, body, api) {
      const cands = ctx.shuffle(ctx.simple(3, 5));
      const ws = (cands.length >= 2 ? cands : ctx.shuffle(ctx.simple(3, 6))).slice(0, 2);
      sequence(ctx, body, api, ws.map((w) => (done) => {
        const letters = [...w.w.toLowerCase()];
        let jumbled = ctx.shuffle(letters), tries = 0;
        while (jumbled.join('') === letters.join('') && tries++ < 8) jumbled = ctx.shuffle(letters);
        const box = el('div', 'round'), slots = el('div', 'word-boxes'), tiles = el('div', 'choice-row');
        const slotEls = letters.map(() => slots.appendChild(el('span', 'wbox blank')));
        let pos = 0;
        jumbled.forEach((ch) => {
          const t = ctx.play ? btn('choice', ch) : el('div', 'choice');
          if (!ctx.play) t.append(glyph(ch, 54, 54, 38));
          if (ctx.play) t.onclick = () => {
            if (t.disabled) return;
            if (ch === letters[pos]) {
              slotEls[pos].textContent = ch; slotEls[pos].classList.add('ok'); t.disabled = true; t.classList.add('used'); pos++;
              if (pos === letters.length) { ctx.speak(w.w); done(); }
            } else shake(t);
          };
          tiles.append(t);
        });
        const top = el('div', 'missing-top'); top.append(el('span', 'pic-e big', w.e), slots);
        box.append(top, tiles); return box;
      }));
    },
  });

  // 11 --------------------------------------------------------------
  EX.push({
    id: 'count', title: 'Count Them', emoji: '🔢',
    play: () => 'Count the pictures. Tap the right number!',
    print: () => 'Count the pictures. Write the number in the box.',
    build(ctx, body, api) {
      const ws = ctx.targets(2);
      const nums = ctx.shuffle([2, 3, 4, 5, 6]).slice(0, 2);
      sequence(ctx, body, api, ws.map((w, k) => (done) => {
        const n = nums[k];
        const box = el('div', 'round'), field = el('div', 'count-field');
        for (let i = 0; i < n; i++) {
          const s = el('span', 'count-item', w.e);
          s.style.transform = `rotate(${ctx.rand(21) - 10}deg)`;
          field.append(s);
        }
        box.append(el('p', 'q', 'How many do you see?'), field);
        if (ctx.play) {
          const opts = new Set([n]);
          while (opts.size < 3) opts.add(Math.max(1, n + ctx.rand(5) - 2));
          const row = el('div', 'choice-row');
          ctx.shuffle([...opts]).forEach((o) => {
            const b = btn('choice', String(o));
            b.onclick = () => { if (o === n) { b.classList.add('ok'); ctx.speak(String(n)); done(); } else shake(b); };
            row.append(b);
          });
          box.append(row);
        } else box.append(el('div', 'answer-box', ''));
        return box;
      }));
    },
  });

  // 12 --------------------------------------------------------------
  EX.push({
    id: 'hunt', title: 'Word Hunt', emoji: '📖',
    play: (c) => `Read the sentence with a grown-up. Tap every word that ${c.ph.pos}.`,
    print: (c) => `Read the sentence with a grown-up. Circle every word that ${c.ph.pos}.`,
    build(ctx, body, api) {
      const toks = ctx.D.sentence.split(' ');
      const total = toks.filter((t) => ctx.matches(t.replace(/[^A-Za-z-]/g, ''))).length;
      let found = 0;
      const line = el('div', 'sentence');
      const counter = el('div', 'counter', ctx.play ? `Found 0 of ${total}` : 'I found ____ words.');
      toks.forEach((t) => {
        const hit = ctx.matches(t.replace(/[^A-Za-z-]/g, ''));
        const w = ctx.play ? btn('tok', t) : el('span', 'tok', t);
        if (ctx.play) w.onclick = () => {
          if (w.classList.contains('ok')) return;
          if (hit) { w.classList.add('ok'); found++; counter.textContent = `Found ${found} of ${total}`; if (found === total) { ctx.speak(ctx.D.sentence, 0.8); api.done(); } } else shake(w);
        };
        line.append(w, ' ');
      });
      body.append(line, counter);
      if (ctx.play) { const r = btn('tool-btn', '🔊 Read it to me'); r.onclick = () => ctx.speak(ctx.D.sentence, 0.8); body.append(r); }
    },
  });

  // 13 --------------------------------------------------------------
  EX.push({
    id: 'twister', title: 'Tongue Twister', emoji: '🗣️',
    play: () => 'Say the words slowly, then faster, then SUPER fast!',
    print: () => 'Say the words slowly, then faster, then SUPER fast! Tick a box each time.',
    build(ctx, body, api) {
      const ws = ctx.targets(3);
      const names = ws.map((w) => w.w);
      const text = `${names.join(', ')}! ${names.join(', ')}!`;
      const row = el('div', 'pic-grid twister-pics');
      ws.concat(ws).forEach((w) => row.append(pic(w, {})));
      body.append(row);
      const speeds = [['🐢', 'Slow', 0.55], ['🐇', 'Medium', 0.9], ['🚀', 'Fast', 1.35]];
      const tools = el('div', 'speed-row');
      let n = 0;
      speeds.forEach(([em, label, rate]) => {
        const b = ctx.play ? btn('speed', '') : el('div', 'speed', '');
        b.append(el('span', 'speed-e', em), el('span', '', label), ...(ctx.play ? [] : [el('span', 'box', '')]));
        if (ctx.play) b.onclick = () => { ctx.speak(text, rate); if (!b.classList.contains('ok')) { b.classList.add('ok'); n++; if (n === 3) api.done(); } };
        tools.append(b);
      });
      body.append(tools);
    },
  });

  // 14 --------------------------------------------------------------
  EX.push({
    id: 'clap', title: 'Clap the Beats', emoji: '👏',
    play: () => 'Clap each word. How many claps does it have? Tap the number.',
    print: () => 'Clap each word and count the beats. Write the number of claps.',
    build(ctx, body, api) {
      const by = {}; ctx.shuffle(ctx.words).forEach((w) => { (by[w.s] = by[w.s] || []).push(w); });
      const picked = [];
      ctx.shuffle(Object.keys(by)).forEach((k) => { if (picked.length < 3) picked.push(by[k][0]); });
      ctx.shuffle(ctx.words).forEach((w) => { if (picked.length < 3 && !picked.includes(w)) picked.push(w); });
      sequence(ctx, body, api, picked.map((w) => (done) => {
        const box = el('div', 'round'), top = el('div', 'missing-top');
        const p = pic(w, { btn: ctx.play });
        if (ctx.play) p.onclick = () => ctx.speak(w.w, 0.6);
        top.append(p); box.append(top);
        if (ctx.play) {
          const row = el('div', 'choice-row');
          [1, 2, 3, 4].forEach((n) => {
            const b = btn('choice', `👏 ${n}`);
            b.onclick = () => { if (n === w.s) { b.classList.add('ok'); done(); } else shake(b); };
            row.append(b);
          });
          box.append(el('p', 'q', 'Tap the picture to hear it. How many claps?'), row);
        } else {
          const dots = el('div', 'clap-dots');
          for (let k = 0; k < 4; k++) dots.append(el('span', 'clap-dot', ''));
          box.append(el('p', 'q', 'Color one circle for each clap:'), dots);
        }
        return box;
      }));
    },
  });

  // 15 --------------------------------------------------------------
  EX.push({
    id: 'dots', title: 'Dot Party', emoji: '🎨',
    play: (c) => `Pick a color, then tap each big ${c.U} or ${c.l} to fill it in!`,
    print: (c) => `Color in every big ${c.U} and ${c.l} with crayons, markers or dot stickers.`,
    build(ctx, body, api) {
      const W = 660, H = 280, cw = W / 4, ch = H / 2, cols = 4;
      const L = layered(W, H);
      const marks = ctx.shuffle([ctx.U, ctx.l, ctx.U, ctx.l, ctx.U, ctx.l, ctx.U, ctx.l]);
      const fills = marks.map(() => null);
      const draw = () => {
        L.g.clearRect(0, 0, W, H);
        marks.forEach((m, k) => {
          const x = (k % cols) * cw + cw / 2, y = Math.floor(k / cols) * ch + ch * 0.8;
          textOutline(L.g, m, x, y, 118, { color: '#4A3B2A', lw: 5, dash: false, fill: fills[k] || '#ffffff' });
        });
      };
      draw();
      body.append(L.wrap);
      if (!ctx.play) return;
      let color = PALETTE[0];
      const bar = el('div', 'ink-tools');
      PALETTE.slice(0, 6).forEach((col, k) => {
        const b = btn('swatch' + (k === 0 ? ' on' : ''), '', 'Color ' + (k + 1));
        b.style.background = col;
        b.onclick = () => { color = col; bar.querySelectorAll('.swatch').forEach((s) => s.classList.remove('on')); b.classList.add('on'); };
        bar.append(b);
      });
      body.append(bar);
      L.ic.style.touchAction = 'manipulation';
      L.ic.addEventListener('pointerdown', (e) => {
        const r = L.ic.getBoundingClientRect();
        const x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
        const k = Math.floor(y / ch) * cols + Math.floor(x / cw);
        if (k >= 0 && k < marks.length) { fills[k] = color; draw(); if (fills.every(Boolean)) api.done(); }
      });
    },
  });

  // 16 --------------------------------------------------------------
  EX.push({
    id: 'stickers', title: 'Sticker Time', emoji: '⭐',
    play: (c) => `Pick a sticker, then tap inside the big ${c.U} to stick it on. Add at least five!`,
    print: (c) => `Draw or stick pictures that ${c.ph.pos} all over the big ${c.U}.`,
    build(ctx, body, api) {
      const W = 660, H = 270;
      const L = layered(W, H);
      textOutline(L.g, ctx.U, W / 2, 250, 280, { color: ctx.accent, lw: 6, dash: true });
      body.append(L.wrap);
      const ws = ctx.targets(6);
      if (!ctx.play) {
        const row = el('div', 'pic-grid ideas');
        ws.forEach((w) => row.append(pic(w, { label: true })));
        body.append(el('div', 'hint-label', 'Ideas to draw:'), row);
        return;
      }
      let cur = ws[0].e; const placed = [];
      const redraw = () => {
        L.i.clearRect(0, 0, W, H);
        placed.forEach((p) => { L.i.font = `56px ${EMOJI_FONT}`; L.i.textAlign = 'center'; L.i.textBaseline = 'middle'; L.i.fillText(p.e, p.x, p.y); });
      };
      const bar = el('div', 'sticker-bar');
      ws.forEach((w, k) => {
        const b = btn('sticker' + (k === 0 ? ' on' : ''), w.e, 'Sticker ' + w.w);
        b.onclick = () => { cur = w.e; bar.querySelectorAll('.sticker').forEach((s) => s.classList.remove('on')); b.classList.add('on'); };
        bar.append(b);
      });
      const undo = btn('tool-btn', '↩️ Undo'); undo.onclick = () => { placed.pop(); redraw(); };
      const clr = btn('tool-btn', '🗑️ Clear'); clr.onclick = () => { placed.length = 0; redraw(); };
      bar.append(undo, clr);
      body.append(bar);
      L.ic.style.touchAction = 'manipulation';
      L.ic.addEventListener('pointerdown', (e) => {
        const r = L.ic.getBoundingClientRect();
        placed.push({ e: cur, x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height });
        redraw(); if (placed.length >= 5) api.done();
      });
    },
  });

  // 17 --------------------------------------------------------------
  EX.push({
    id: 'write', title: 'Write It!', emoji: '📝',
    play: (c) => `Now write ${c.U} and ${c.l} yourself on the lines. Copy the pale letters!`,
    print: (c) => `Now write ${c.U} and ${c.l} yourself on the lines. Copy the pale letters first!`,
    build(ctx, body, api) {
      const W = 660, H = 300;
      const L = layered(W, H);
      const cap = capHeight(L.g, 60);
      [0, 1, 2].forEach((r) => {
        const base = 84 + r * 98;
        ruleLines(L.g, W, base, cap);
        L.g.save();
        L.g.font = LETTER_FONT(60); L.g.textAlign = 'center'; L.g.fillStyle = '#d6cbb6';
        L.g.fillText(ctx.U, 60, base); L.g.fillText(ctx.l, 130, base);
        L.g.restore();
      });
      body.append(L.wrap);
      if (ctx.play) {
        const tool = { color: PALETTE[3], width: 9, erase: false };
        const h = attachInk(L, tool, (t) => { if (t > 450) api.done(); });
        body.append(inkTools(tool, h));
      }
    },
  });

  // 18 --------------------------------------------------------------
  EX.push({
    id: 'memory', title: 'Memory Match', emoji: '🃏',
    play: () => 'Flip two cards. Find each picture and its word!',
    print: () => 'Cut out the cards, turn them face down and play at the table. Find each picture and its word!',
    build(ctx, body, api) {
      let ws = ctx.shuffle(ctx.words.filter((w) => w.w.length <= 9)).slice(0, 4);
      const cards = [];
      ws.forEach((w) => { cards.push({ w, kind: 'pic' }, { w, kind: 'word' }); });
      const order = ctx.shuffle(cards);
      const grid = el('div', 'mem-grid');
      const face = (c) => c.kind === 'pic' ? c.w.e : c.w.w;
      if (!ctx.play) {
        order.forEach((c) => grid.append(el('div', 'mem-card print ' + c.kind, face(c))));
        body.append(grid); return;
      }
      let first = null, lock = false, left = ws.length;
      order.forEach((c) => {
        const b = btn('mem-card ' + c.kind, '', 'Card');
        const back = el('span', 'mem-back', '🦔'), front = el('span', 'mem-front', face(c));
        b.append(back, front);
        b.onclick = () => {
          if (lock || b.classList.contains('flip') || b.classList.contains('ok')) return;
          b.classList.add('flip'); ctx.speak(c.w.w);
          if (!first) { first = { b, c }; return; }
          if (first.c.w === c.w && first.c !== c) {
            [first.b, b].forEach((x) => x.classList.add('ok')); first = null; left--; if (!left) api.done();
          } else {
            lock = true; const a = first; first = null;
            setTimeout(() => { a.b.classList.remove('flip'); b.classList.remove('flip'); lock = false; }, 900);
          }
        };
        grid.append(b);
      });
      body.append(grid);
    },
  });

  // 19 --------------------------------------------------------------
  EX.push({
    id: 'bubbles', title: 'Bubble Pop', emoji: '🫧',
    play: (c) => `Pop every bubble that has a ${c.U} or ${c.l} inside. Watch out for the others!`,
    print: (c) => `Color every bubble that has a ${c.U} or ${c.l} inside.`,
    build(ctx, body, api) {
      const nT = 7;
      const marks = [ctx.U, ctx.l, ctx.U, ctx.l];
      while (marks.length < nT) marks.push(ctx.rand(2) ? ctx.U : ctx.l);
      const cells = ctx.shuffle(marks.map((t) => ({ t, hit: true })).concat(otherLetters(ctx, 8).map((t) => ({ t, hit: false }))));
      const field = el('div', 'bubble-field');
      let left = nT;
      cells.forEach((cell, k) => {
        const b = ctx.play ? btn('bubble-b', '', 'Bubble') : el('div', 'bubble-b', '');
        if (ctx.play) b.append(el('span', 'bubble-t', cell.t)); else b.append(glyph(cell.t, 70, 70, 38, '#2B5B80'));
        b.style.setProperty('--d', (k % 5) * 0.37 + 's');
        b.style.setProperty('--o', (ctx.rand(24) - 12) + 'px');
        if (ctx.play) b.onclick = () => {
          if (b.classList.contains('pop')) return;
          if (cell.hit) {
            b.classList.add('pop'); b.disabled = true; left--;
            const f = el('span', 'poof', '✨'); b.append(f);
            if (!left) api.done();
          } else shake(b);
        };
        field.append(b);
      });
      body.append(field);
    },
  });

  // 20 --------------------------------------------------------------
  EX.push({
    id: 'draw', title: 'Draw & Share', emoji: '🖍️',
    play: (c) => `Draw your favorite thing that ${c.ph.pos}. Then show a grown-up!`,
    print: (c) => `Draw your favorite thing that ${c.ph.pos}. Then show a grown-up!`,
    build(ctx, body, api) {
      const L = layered(660, 300);
      L.g.fillStyle = '#ffffff'; L.g.fillRect(0, 0, 660, 300);
      L.g.save();
      L.g.font = LETTER_FONT(70); L.g.textAlign = 'right'; L.g.fillStyle = '#efe6d3';
      L.g.fillText(ctx.U + ctx.l, 640, 285);
      L.g.restore();
      L.wrap.classList.add('framed');
      body.append(L.wrap);
      if (ctx.play) {
        const tool = { color: PALETTE[2], width: 9, erase: false };
        const h = attachInk(L, tool, (t) => { if (t > 300) api.done(); });
        const bar = inkTools(tool, h);
        const save = btn('tool-btn', '💾 Save my picture');
        save.onclick = () => {
          const out = document.createElement('canvas'); out.width = L.w * DPR; out.height = L.h * DPR;
          const g = out.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, out.width, out.height);
          g.drawImage(L.gc, 0, 0); g.drawImage(L.ic, 0, 0);
          const a = document.createElement('a'); a.download = `${ctx.name}-letter-${ctx.U}-drawing.png`; a.href = out.toDataURL('image/png'); a.click();
        };
        bar.append(save); body.append(bar);
      } else {
        body.append(el('div', 'write-line', `My favorite ${ctx.U} thing is: ______________________________`));
      }
    },
  });

  /* ---------- card wrapper, cover & certificate ---------- */
  function buildCard(def, idx, ctx, api) {
    const sec = el('section', 'ex ex-' + def.id);
    const head = el('div', 'ex-head');
    const numEl = el('span', 'ex-num'); if (ctx.play) numEl.append(String(idx + 1)); else numEl.append(glyph(String(idx + 1), 38, 38, 21, '#ffffff'));
    head.append(numEl, el('h3', 'ex-title', def.title), el('span', 'ex-emoji', def.emoji));
    const text = (ctx.play ? def.play : def.print)(ctx);
    const ins = el('p', 'ex-ins', text);
    if (ctx.play) {
      const s = btn('speak-btn', '🔊', 'Read the instructions aloud');
      s.onclick = () => ctx.speak(text);
      head.append(s);
    }
    const bodyEl = el('div', 'ex-body');
    sec.append(head, ins, bodyEl);
    def.build(ctx, bodyEl, api || { done() {} });
    return sec;
  }

  function buildCover(ctx) {
    const c = el('div', 'ws-cover');
    c.append(el('div', 'cover-mascot', ctx.D.emoji));
    c.append(el('h1', '', `${ctx.D.name} the ${ctx.D.animal}’s Letter ${ctx.U} Workbook`));
    const b = el('div', 'bubble big'); b.append(el('strong', '', ctx.greeting));
    if (ctx.D.note) b.append(el('div', 'note', ctx.D.note));
    c.append(b);
    c.append(el('div', 'cover-letters', bigLetters(ctx, 130)));
    c.append(el('p', 'cover-for', `Made just for ${ctx.name}`));
    const list = el('div', 'cover-list');
    EX.forEach((d, k) => list.append(el('div', 'cover-item', `☐ ${k + 1}. ${d.title}`)));
    c.append(el('h4', '', '20 games to tick off:'), list);
    c.append(el('p', 'cover-tip', '💡 Grown-ups: try 2–3 activities a day. Say the words out loud together, and praise the effort, not just the answers!'));
    return c;
  }

  function buildCertificate(ctx, stars) {
    const c = el('div', 'cert');
    c.append(el('div', 'cert-emoji', '🏆'), el('h2', '', 'Super Letter Star!'));
    c.append(el('p', 'cert-line', `${ctx.name} learned the letter`), el('div', 'cert-letters', bigLetters(ctx, 112)));
    c.append(el('p', 'cert-line', `with ${ctx.D.name} the ${ctx.D.animal}`), el('div', 'cert-mascot', ctx.D.emoji));
    if (stars != null) c.append(el('p', 'cert-stars', `${'⭐'.repeat(Math.min(stars, 20)) || ''}  ${stars} / 20 games finished`));
    return c;
  }

  global.LetterLab = { EX, makeCtx, buildCard, buildCover, buildCertificate, bigLetters, el, btn };
})(window);
