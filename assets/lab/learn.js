(function () {
  'use strict';
  const LL = window.LetterLab;
  const $ = (s) => document.querySelector(s);
  const el = LL.el;
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const PRAISE = ['Great job', 'Wow', 'Super', 'Awesome', 'Well done', 'You did it', 'Fantastic'];

  const state = { letter: '', soundOn: true, play: null };

  /* ---------- setup screen ---------- */
  const nameInput = $('#name'), letterInput = $('#letter-input'), picker = $('#picker');
  const btnPlay = $('#btn-play'), btnPdf = $('#btn-pdf'), preview = $('#preview'), msg = $('#setup-msg');
  const getName = () => (nameInput.value.trim() || 'friend').slice(0, 20);

  try { const saved = localStorage.getItem('hog-lab-name'); if (saved) nameInput.value = saved; } catch (e) { /* storage is optional */ }

  ALPHA.forEach((L) => {
    const b = el('button', 'letter-chip', L); b.type = 'button'; b.dataset.l = L;
    b.setAttribute('aria-label', 'Letter ' + L);
    b.onclick = () => setLetter(L);
    picker.append(b);
  });

  function setLetter(L) {
    state.letter = L;
    letterInput.value = L;
    picker.querySelectorAll('.letter-chip').forEach((c) => c.classList.toggle('on', c.dataset.l === L));
    const D = ALPHABET_DATA[L];
    preview.replaceChildren(
      el('span', 'pe', D.emoji),
      (() => {
        const d = el('div');
        d.append(el('b', '', `Meet ${D.name} the ${D.animal}!`));
        const s = el('small', '', `“Hello ${getName()}, I'm ${D.name} the ${D.animal}!” ${D.note || ''}`);
        d.append(s); return d;
      })()
    );
    btnPlay.disabled = btnPdf.disabled = false;
    msg.textContent = ''; msg.classList.remove('err');
  }

  letterInput.addEventListener('input', () => {
    const ch = (letterInput.value.match(/[a-z]/i) || [''])[0].toUpperCase();
    if (ch) setLetter(ch);
    else { letterInput.value = ''; state.letter = ''; btnPlay.disabled = btnPdf.disabled = true; picker.querySelectorAll('.on').forEach((c) => c.classList.remove('on')); }
  });
  letterInput.addEventListener('focus', () => letterInput.select());
  nameInput.addEventListener('input', () => { if (state.letter) setLetter(state.letter); });

  try {
    const q = new URLSearchParams(location.search).get('letter');
    if (q && /^[a-z]$/i.test(q)) setLetter(q.toUpperCase());
  } catch (e) { /* ignore */ }

  const lang = (navigator.language || '').toLowerCase();
  if (/^en-(us|ca|ph)|^es-mx/.test(lang)) $('#paper').value = 'letter';

  function rememberName() { try { localStorage.setItem('hog-lab-name', nameInput.value.trim()); } catch (e) { /* ignore */ } }

  /* ---------- player ---------- */
  const stage = $('#stage'), finish = $('#finish'), pips = $('#pips');
  const bar = $('#p-bar'), count = $('#p-count'), prev = $('#p-prev'), next = $('#p-next'), toast = $('#toast');

  const Auth = () => window.HogAuth;

  async function startPlay() {
    if (Auth() && !(await Auth().requireJoin('play'))) return;
    rememberName();
    const ctx = LL.makeCtx(state.letter, getName(), 'play', (Date.now() ^ (Math.random() * 1e9)) | 0);
    ctx.soundOn = state.soundOn;
    const P = { ctx, cards: [], done: new Set(), saved: new Set(), i: 0, letter: state.letter };
    state.play = P;
    if (Auth()) {
      Auth().ready.then(() => Auth().getProgress(P.letter)).then((arr) => {
        if (state.play !== P || !arr.length) return;
        arr.forEach((n) => { if (n >= 0 && n < LL.EX.length) P.saved.add(n); });
        refresh();
      });
    }
    document.documentElement.style.setProperty('--accent', ctx.accent);
    $('#setup').hidden = true; $('#player').hidden = false; $('#p-nav').hidden = false;
    $('#p-emoji').textContent = ctx.D.emoji;
    $('#p-greeting').textContent = ctx.greeting;
    pips.replaceChildren();
    LL.EX.forEach((d, k) => {
      const b = el('button', 'pip', String(k + 1)); b.type = 'button';
      b.setAttribute('aria-label', `Game ${k + 1}: ${d.title}`);
      b.onclick = () => show(k);
      pips.append(b);
    });
    finish.hidden = true; stage.hidden = false;
    show(0);
    ctx.speak(ctx.greeting);
  }

  function show(i) {
    const P = state.play, total = LL.EX.length;
    finish.hidden = true; stage.hidden = false; next.disabled = false;
    P.i = i;
    if (!P.cards[i]) P.cards[i] = LL.buildCard(LL.EX[i], i, P.ctx, { done: () => complete(i) });
    P.cards[i].style.setProperty('--accent', P.ctx.accent);
    stage.replaceChildren(P.cards[i]);
    stage.style.setProperty('--accent', P.ctx.accent);
    refresh();
    scrollToStage();
  }

  function refresh() {
    const P = state.play, total = LL.EX.length;
    [...pips.children].forEach((b, k) => {
      b.classList.toggle('done', P.done.has(k));
      b.classList.toggle('saved', !P.done.has(k) && P.saved.has(k));
      b.classList.toggle('cur', k === P.i && finish.hidden);
    });
    const cur = pips.children[P.i];
    if (cur && cur.scrollIntoView) { try { pips.scrollTo({ left: cur.offsetLeft - 80, behavior: 'smooth' }); } catch (e) { /* ignore */ } }
    bar.style.width = (union(P).size / total * 100) + '%';
    count.textContent = `Game ${P.i + 1} of ${total}`;
    prev.disabled = P.i === 0;
    next.textContent = P.i === total - 1 ? 'Finish 🏆' : 'Next ▶';
    next.classList.toggle('pulse', P.done.has(P.i));
  }
  const union = (P) => new Set([...P.done, ...P.saved]);

  function scrollToStage() {
    const top = $('#player').getBoundingClientRect().top + window.scrollY - 70;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  function complete(i) {
    const P = state.play;
    if (!P || P.done.has(i)) return;
    P.done.add(i);
    refresh();
    if (Auth()) Auth().saveProgress(P.letter, union(P));
    const phrase = `${PRAISE[Math.floor(Math.random() * PRAISE.length)]}, ${P.ctx.name}!`;
    say(`⭐ ${phrase}`); burst();
    setTimeout(() => P.ctx.speak(phrase, 0.95), 450);
  }

  let toastT = null;
  function say(text) {
    toast.textContent = text; toast.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('show'), 1800);
  }
  function burst() {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const icons = ['🎉', '⭐', '✨', '🎈', '🌟'];
    for (let k = 0; k < 14; k++) {
      const s = el('span', 'confetti', icons[k % icons.length]);
      s.style.left = (30 + Math.random() * 40) + 'vw'; s.style.top = '50vh';
      s.style.setProperty('--dx', (Math.random() * 360 - 180) + 'px');
      s.style.setProperty('--dy', (Math.random() * -300 - 40) + 'px');
      s.style.setProperty('--rot', (Math.random() * 360) + 'deg');
      document.body.append(s); setTimeout(() => s.remove(), 1400);
    }
  }

  prev.onclick = () => {
    const P = state.play;
    show(finish.hidden ? Math.max(0, P.i - 1) : LL.EX.length - 1);
  };
  next.onclick = () => {
    const P = state.play;
    if (P.i === LL.EX.length - 1) showFinish(); else show(P.i + 1);
  };

  function showFinish() {
    const P = state.play;
    stage.hidden = true; finish.hidden = false;
    finish.style.setProperty('--accent', P.ctx.accent);
    const cert = LL.buildCertificate(P.ctx, union(P).size);
    const row = el('div', 'btn-row');
    const b1 = el('button', 'btn btn-green', '📄 Download the PDF workbook'); b1.type = 'button'; b1.onclick = () => buildPdf();
    const b2 = el('button', 'btn btn-secondary', '🔁 Play again'); b2.type = 'button'; b2.onclick = () => startPlay();
    const b3 = el('button', 'btn btn-secondary', '🔤 Pick another letter'); b3.type = 'button'; b3.onclick = backToSetup;
    row.append(b1, b2, b3);
    finish.replaceChildren(cert, row);
    count.textContent = 'All done!'; next.disabled = true; next.classList.remove('pulse');
    prev.disabled = false;
    burst(); P.ctx.speak(`You did it, ${P.ctx.name}! You learned the letter ${P.ctx.U}!`);
    scrollToStage();
  }

  function backToSetup() {
    if ('speechSynthesis' in window) try { speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    $('#player').hidden = true; $('#p-nav').hidden = true; $('#setup').hidden = false;
    next.disabled = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  $('#p-quit').onclick = backToSetup;
  $('#p-pdf').onclick = () => buildPdf();
  $('#p-sound').onclick = () => {
    state.soundOn = !state.soundOn;
    if (state.play) state.play.ctx.soundOn = state.soundOn;
    $('#p-sound').textContent = state.soundOn ? '🔊 Sound on' : '🔇 Sound off';
    $('#p-sound').setAttribute('aria-pressed', String(state.soundOn));
    if (!state.soundOn && 'speechSynthesis' in window) try { speechSynthesis.cancel(); } catch (e) { /* ignore */ }
  };
  btnPlay.onclick = startPlay;
  btnPdf.onclick = () => buildPdf();

  /* ---------- PDF ---------- */
  const loaded = {};
  function loadScript(src) {
    if (!loaded[src]) loaded[src] = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src));
      document.head.append(s);
    });
    return loaded[src];
  }
  const nextFrame = () => new Promise((r) => setTimeout(r, 40));
  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const t = new Promise((r) => setTimeout(r, 2500));
    return Promise.race([Promise.all([
      document.fonts.load('800 80px "Baloo 2"'), document.fonts.load('700 20px "Nunito"'), document.fonts.load('800 20px "Nunito"'),
    ]).catch(() => {}), t]);
  }

  const overlay = $('#pdf-overlay'), ovBar = $('#ov-bar'), ovTitle = $('#ov-title'), ovText = $('#ov-text'), ovClose = $('#ov-close');
  ovClose.onclick = () => { overlay.hidden = true; };
  let busy = false;

  async function buildPdf() {
    if (busy || !state.letter) return;
    if (!Auth()) { msg.textContent = 'The sign-in part of the page did not load. Please refresh and try again.'; msg.classList.add('err'); return; }
    {
      const D = ALPHABET_DATA[state.letter];
      const ok = await Auth().gateDownload({ kind: 'workbook', label: `${D.name} the ${D.animal}'s Letter ${state.letter} workbook` });
      if (!ok) return;
    }
    if (busy) return;
    busy = true; rememberName();
    overlay.hidden = false; ovClose.hidden = true; ovBar.style.width = '4%';
    ovTitle.textContent = 'Making your workbook…'; ovText.textContent = 'Drawing the pages. This takes a few seconds.';
    try {
      const name = getName();
      const paper = $('#paper').value;
      const P = paper === 'letter' ? { w: 816, h: 1056, pt: [612, 792], fmt: 'letter' } : { w: 794, h: 1123, pt: [595.28, 841.89], fmt: 'a4' };
      await Promise.all([loadScript('/assets/vendor/html2canvas.min.js'), loadScript('/assets/vendor/jspdf.umd.min.js'), fontsReady()]);
      const ctx = LL.makeCtx(state.letter, name, 'print', (Date.now() ^ (Math.random() * 1e9)) | 0);
      const root = $('#ws-root'); root.replaceChildren();
      root.style.setProperty('--accent', ctx.accent);

      const meas = el('div', 'ws-measure mode-print'); root.append(meas);
      const cards = LL.EX.map((d, i) => LL.buildCard(d, i, ctx));
      cards.forEach((c) => meas.append(c));
      await nextFrame(); await fontsReady(); await nextFrame();

      const avail = P.h - 26 - 62 - 14 - 46;
      const groups = []; let cur = [], used = 0;
      cards.forEach((c) => {
        const h = c.offsetHeight + 14;
        if (cur.length && used + h > avail) { groups.push(cur); cur = []; used = 0; }
        cur.push(c); used += h;
      });
      if (cur.length) groups.push(cur);

      const pages = [];
      const frame = (cls) => { const pg = el('div', 'ws-page mode-print ' + (cls || '')); pg.style.width = P.w + 'px'; pg.style.height = P.h + 'px'; pg.style.setProperty('--accent', ctx.accent); return pg; };
      const total = groups.length + 2;
      const foot = (n) => el('div', 'ws-foot', `Hog the Hedgehog fan hub  ·  Letter ${ctx.U} workbook  ·  page ${n} of ${total}`);

      const cover = frame(); cover.style.paddingTop = '40px';
      cover.append(LL.buildCover(ctx), foot(1)); pages.push(cover);

      groups.forEach((g, k) => {
        const pg = frame();
        const head = el('div', 'ws-head'); head.style.margin = `0 ${(P.w - 700) / 2}px 14px`;
        head.append(el('span', 'e', ctx.D.emoji), el('span', 't', `${ctx.mascot}’s Letter ${ctx.U}`), el('span', 'who', `Name: ${name}`));
        const main = el('div', 'ws-main'); g.forEach((c) => main.append(c));
        pg.append(head, main, foot(k + 2)); pages.push(pg);
      });

      const certPg = frame('ws-cert-page');
      certPg.append(LL.buildCertificate(ctx, null));
      const sign = el('div', 'cert-sign'); sign.append(el('span', '', 'Date: ____________'), el('span', '', 'Signed: ____________'));
      certPg.querySelector('.cert').append(sign);
      certPg.append(foot(total)); pages.push(certPg);

      meas.remove();
      pages.forEach((p) => root.append(p));
      await nextFrame();

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: 'pt', format: P.fmt, orientation: 'portrait', compress: true });
      const scale = (window.matchMedia && matchMedia('(pointer:coarse)').matches) ? 1.5 : 2;
      for (let k = 0; k < pages.length; k++) {
        ovText.textContent = `Page ${k + 1} of ${pages.length}`;
        ovBar.style.width = (8 + 90 * k / pages.length) + '%';
        await nextFrame();
        const canvas = await window.html2canvas(pages[k], { scale, backgroundColor: '#ffffff', logging: false, useCORS: true, width: P.w, height: P.h, windowWidth: P.w });
        if (k > 0) pdf.addPage(P.fmt, 'portrait');
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, P.pt[0], P.pt[1], undefined, 'FAST');
        canvas.width = canvas.height = 0;
      }
      const safe = (s) => s.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const fileName = `${safe(ctx.D.name)}-the-${safe(ctx.D.animal)}-Letter-${ctx.U}-for-${safe(name) || 'you'}.pdf`;
      pdf.save(fileName);
      if (Auth()) Auth().logDownload({ kind: 'workbook', letter: ctx.U, file: fileName });
      ovBar.style.width = '100%';
      ovTitle.textContent = 'Your workbook is ready! 🎉';
      ovText.textContent = `${pages.length} pages saved. Check your Downloads folder.`;
      ovClose.hidden = false;
      root.replaceChildren();
      msg.textContent = `✅ Workbook for ${name} downloaded — letter ${ctx.U} with ${ctx.mascot}.`;
    } catch (err) {
      console.error(err);
      ovTitle.textContent = 'Oops, that didn’t work';
      ovText.textContent = 'We could not build the PDF. Please try again, or use Play now instead.';
      ovClose.hidden = false;
      msg.textContent = 'PDF could not be created. Please try again.'; msg.classList.add('err');
    } finally { busy = false; }
  }
})();
