/* Personalized coloring book: every letter of the child's name is an animal.
   Paying happens on Stripe. The letter drawings are fetched from the website server only after payment,
   and the PDF is drawn in this browser. */
(function () {
  'use strict';
  var ANIMALS = { A: 'Alligator', B: 'Bear', C: 'Cat', D: 'Dog', E: 'Elephant', F: 'Frog', G: 'Giraffe', H: 'Hedgehog', I: 'Iguana', J: 'Jellyfish', K: 'Koala', L: 'Lion', M: 'Monkey', N: 'Narwhal', O: 'Owl', P: 'Panda', Q: 'Quail', R: 'Rabbit', S: 'Snake', T: 'Tiger', U: 'Urchin', V: 'Vulture', W: 'Whale', X: 'X-ray fish', Y: 'Yak', Z: 'Zebra' };
  var K = null, cfg = { enabled: false, price_cents: 799, currency: 'usd' }, busy = false;
  function $(s) { return document.querySelector(s); }
  function Auth() { return window.HogAuth; }
  function msg(t, err) { var m = $('#pz-msg'); if (!m) return; m.textContent = t || ''; m.classList.toggle('err', !!err); }

  /** The A to Z letters of a typed name (accents are simplified), or null if it has anything else. */
  function lettersOf(raw) {
    var name = String(raw || '').normalize('NFC').trim().replace(/\s+/g, ' ');
    if (!name || name.length > 20 || !/^[\p{L}\p{M}' \-]+$/u.test(name)) return null;
    var letters = name.normalize('NFD').replace(/[^A-Za-z]/g, '').toUpperCase();
    var base = name.normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}]/gu, '');
    if (letters.length < 1 || letters.length > 12 || base.length !== letters.length) return null;
    return { name: name, letters: letters };
  }
  function money(cents, cur) { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur.toUpperCase() }).format(cents / 100); } catch (e) { return (cents / 100).toFixed(2) + ' ' + cur.toUpperCase(); } }

  /* ---------- live preview of the name ---------- */
  function renderChips() {
    var box = $('#pz-chips'), hint = $('#pz-hint'), raw = $('#pz-name').value, r = lettersOf(raw);
    box.replaceChildren();
    if (!raw.trim()) { hint.textContent = 'Type a first name to see its animals.'; hint.classList.remove('err'); return; }
    if (!r) { hint.textContent = 'Please use 1 to 12 letters from A to Z (accents are fine).'; hint.classList.add('err'); return; }
    hint.classList.remove('err'); hint.textContent = r.letters.length + ' letter' + (r.letters.length > 1 ? 's' : '') + ' = ' + r.letters.length + ' animal pages.';
    r.letters.split('').forEach(function (ch) {
      var li = document.createElement('li'); li.className = 'pz-chip';
      var b = document.createElement('b'); b.textContent = ch; var s = document.createElement('span'); s.textContent = ANIMALS[ch];
      li.append(b, s); box.appendChild(li);
    });
  }

  /* ---------- buy ---------- */
  async function buy() {
    if (busy) return;
    var r = lettersOf($('#pz-name').value);
    if (!r) { msg('Please type a first name with 1 to 12 letters (A to Z).', true); $('#pz-name').focus(); return; }
    if (!Auth()) { msg('The sign-in part of the page did not load. Please refresh and try again.', true); return; }
    var ok = await Auth().requireJoin('download', 'your personalized coloring book');
    if (!ok) return;
    busy = true; $('#pz-buy').disabled = true; msg('Taking you to the secure payment page…');
    try {
      var d = await Auth().api('POST', '/account/coloring/checkout', { name: r.name });
      if (!d || !d.url) throw new Error('We could not open the payment page. Please try again.');
      window.location.href = d.url;
    } catch (e) { msg(e.message || 'Something went wrong. Please try again.', true); busy = false; $('#pz-buy').disabled = false; }
  }

  /* ---------- the PDF ---------- */
  async function fetchArt(orderId, letter) {
    var r = await fetch(Auth().apiBase + '/account/coloring/art?order=' + encodeURIComponent(orderId) + '&letter=' + letter, { credentials: 'include' });
    if (!r.ok) { var e = await r.json().catch(function () { return null; }); throw new Error((e && e.error) || 'Could not get the artwork.'); }
    var url = URL.createObjectURL(new Blob([await r.text()], { type: 'image/svg+xml' }));
    try { return await K.loadImage(url); } finally { setTimeout(function () { URL.revokeObjectURL(url); }, 4000); }
  }
  function tiles(x, arts, letters, gx, gy, cols, T, gap) {
    for (var i = 0; i < letters.length; i++) {
      var tx = gx + (i % cols) * (T + gap), ty = gy + Math.floor(i / cols) * (T + gap);
      x.save(); K.rr(x, tx, ty, T, T, 28); x.clip(); x.drawImage(arts[letters[i]], tx, ty, T, T); x.restore();
      x.strokeStyle = K.INK; x.lineWidth = 6; K.rr(x, tx, ty, T, T, 28); x.stroke();
    }
  }
  function gridFor(P, n, top, bottom) {
    var cols = n <= 4 ? 2 : 3, rows = Math.ceil(n / cols), m = 58, gap = 26;
    var T = Math.min((P.w - 2 * m - 110 - gap * (cols - 1)) / cols, (bottom - top - gap * (rows - 1)) / rows, 400);
    return { cols: cols, T: T, gap: gap, gx: (P.w - (cols * T + gap * (cols - 1))) / 2, gy: top + ((bottom - top) - (rows * T + gap * (rows - 1))) / 2 };
  }
  async function makePages(order, paper, onStep) {
    var P = K.PAPER[paper] || K.PAPER.a4, name = order.name, letters = lettersOf(name).letters.split(''), uniq = Array.from(new Set(letters)), arts = {}, m = 58;
    try { if (document.fonts && document.fonts.load) await Promise.all([document.fonts.load('800 80px "Baloo 2"'), document.fonts.load('700 40px "Baloo 2"')]); } catch (e) { /* system font */ }
    for (var u = 0; u < uniq.length; u++) { onStep('Getting the animals… ' + (u + 1) + ' of ' + uniq.length); arts[uniq[u]] = await fetchArt(order.id, uniq[u]); }
    var logo = await K.loadImage('/assets/logo.png'), wordmark = await K.loadImage('/assets/wordmark.png');
    var pages = [], W = P.w, H = P.h, pg, x;
    // cover
    pg = K.newPage(P); x = pg.x; K.frame(x, W, H, m);
    K.text(x, 'Hog the Hedgehog presents', W / 2, m + 105, 46, 700, '#7D6A54');
    var nameLine = name + '’s'; K.text(x, nameLine, W / 2, m + 250, nameLine.length > 11 ? 120 : 160, 800, K.GREEN);
    K.text(x, 'Animal Letters', W / 2, m + 345, 100, 800); K.text(x, 'Coloring Book', W / 2, m + 430, 70, 800, '#7D6A54');
    var g = gridFor(P, letters.length, m + 470, H - m - 330); tiles(x, arts, letters, g.gx, g.gy, g.cols, g.T, g.gap);
    var lh = 170, lw = logo.width * lh / logo.height, ww = wordmark.width * (lh * 0.85) / wordmark.height, lx = (W - (lw + 30 + ww)) / 2, ly = H - m - 280;
    x.drawImage(logo, lx, ly, lw, lh); x.drawImage(wordmark, lx + lw + 30, ly + lh * 0.07, ww, lh * 0.85);
    K.text(x, 'Made for ' + name, W / 2, H - m - 50, 40, 700); pages.push(pg.c);
    // one page per letter
    letters.forEach(function (ch, i) {
      var q = K.newPage(P), c = q.x; K.frame(c, W, H, m);
      K.text(c, ch + ' is for ' + ANIMALS[ch], W / 2, m + 150, 100, 800); K.text(c, name + '’s letter ' + (i + 1) + ' of ' + letters.length, W / 2, m + 205, 40, 700, '#7D6A54');
      var S = W - 2 * (m + 56); c.drawImage(arts[ch], m + 56, m + 240, S, S);
      K.text(c, 'Colored by: ______________________', W / 2, H - m - 120, 46, 700);
      K.text(c, 'Hog the Hedgehog  ·  ' + name + '’s Animal Letters Coloring Book  ·  page ' + (i + 2), W / 2, H - m - 34, 28, 700, '#7D6A54');
      pages.push(q.c);
    });
    // the whole name
    pg = K.newPage(P); x = pg.x; K.frame(x, W, H, m);
    K.text(x, name, W / 2, m + 170, name.length > 10 ? 120 : 160, 800, K.GREEN); K.text(x, 'All together, in animals!', W / 2, m + 235, 50, 700, '#7D6A54');
    var g2 = gridFor(P, letters.length, m + 290, H - m - 90); tiles(x, arts, letters, g2.gx, g2.gy, g2.cols, g2.T, g2.gap);
    K.text(x, 'Color the whole name!', W / 2, H - m - 40, 40, 700); pages.push(pg.c);
    // certificate
    pg = K.newPage(P); x = pg.x; K.frame(x, W, H, m); x.lineWidth = 3; K.rr(x, m + 22, m + 22, W - 2 * (m + 22), H - 2 * (m + 22), 28); x.stroke();
    K.text(x, 'Great coloring!', W / 2, 360, 140, 800, K.GREEN); K.text(x, name + ', Hog the Hedgehog says: well done!', W / 2, 460, name.length > 10 ? 46 : 58, 700);
    var ch2 = 430, cw2 = logo.width * ch2 / logo.height; x.drawImage(logo, (W - cw2) / 2, 540, cw2, ch2);
    K.text(x, 'You finished your Animal Letters Coloring Book.', W / 2, 1090, 50, 700, '#7D6A54');
    K.text(x, 'Name: ______________________', W / 2, 1240, 50, 700); K.text(x, 'Date: ______________________', W / 2, 1330, 50, 700); pages.push(pg.c);
    return { pages: pages, P: P };
  }
  async function download(order) {
    if (busy) return; busy = true; setBusy(true);
    try {
      msg('Getting your book ready…');
      K = window.HogColoring.kit; await K.loadScript('/assets/vendor/jspdf.umd.min.js');
      var paper = ($('#pz-paper') || {}).value || 'a4';
      var r = await makePages(order, paper, function (t) { msg(t); }), pdf = new window.jspdf.jsPDF({ unit: 'pt', format: r.P.fmt, orientation: 'portrait', compress: true });
      for (var k = 0; k < r.pages.length; k++) {
        msg('Adding page ' + (k + 1) + ' of ' + r.pages.length + '…'); await K.nextFrame();
        if (k > 0) pdf.addPage(r.P.fmt, 'portrait');
        pdf.addImage(r.pages[k].toDataURL('image/png'), 'PNG', 0, 0, r.P.pt[0], r.P.pt[1], undefined, 'FAST'); r.pages[k].width = r.pages[k].height = 0;
      }
      var file = 'Hog-the-Hedgehog-' + order.name.normalize('NFD').replace(/[^A-Za-z]+/g, '-').replace(/^-|-$/g, '') + '-Animal-Letters-Coloring-Book.pdf';
      pdf.save(file); Auth().logDownload({ kind: 'coloring-name', file: file });
      msg('Your book for ' + order.name + ' is ready: ' + r.pages.length + ' pages saved. Check your Downloads folder.');
    } catch (e) { console.error(e); msg(e && e.message ? e.message : 'Oops, that did not work. Please try again.', true); }
    finally { busy = false; setBusy(false); }
  }
  function setBusy(b) { document.querySelectorAll('#pz-buy, .pz-dl').forEach(function (x) { x.disabled = b; }); }

  /* ---------- the member's books ---------- */
  var orders = [];
  async function loadOrders() {
    var box = $('#pz-books'), wrap = $('#pz-books-wrap'); if (!Auth() || !Auth().member) { wrap.hidden = true; return; }
    try { orders = (await Auth().api('GET', '/account/coloring/orders')).orders || []; } catch (e) { orders = []; }
    box.replaceChildren(); wrap.hidden = !orders.length;
    orders.forEach(function (o) {
      var li = document.createElement('li'); li.className = 'pz-book';
      var t = document.createElement('div'); var b = document.createElement('b'); b.textContent = o.name + '’s Animal Letters Coloring Book';
      var s = document.createElement('small'); s.textContent = o.status === 'paid' ? 'Paid' : 'Waiting for payment'; t.append(b, s);
      var btn = document.createElement('button'); btn.type = 'button';
      if (o.status === 'paid') { btn.className = 'btn pz-dl'; btn.textContent = 'Download PDF'; btn.onclick = function () { download(o); }; }
      else { btn.className = 'btn btn-light'; btn.textContent = 'Check payment'; btn.onclick = async function () { btn.disabled = true; await confirmOrder(o.id, false); await loadOrders(); }; }
      li.append(t, btn); box.appendChild(li);
    });
  }
  async function confirmOrder(id, retry) {
    for (var i = 0; i < (retry ? 8 : 1); i++) {
      try { var d = await Auth().api('POST', '/account/coloring/confirm', { order: id }); if (d.order && d.order.status === 'paid') return d.order; } catch (e) { msg(e.message, true); return null; }
      if (retry) await new Promise(function (r) { setTimeout(r, 2000); });
    }
    return null;
  }

  /* ---------- page start ---------- */
  document.addEventListener('DOMContentLoaded', async function () {
    K = window.HogColoring && window.HogColoring.kit;
    var name = $('#pz-name'); name.addEventListener('input', renderChips); renderChips();
    $('#pz-buy').addEventListener('click', buy);
    try { var l = (navigator.language || ''); if (/-(us|ca)$/i.test(l)) $('#pz-paper').value = 'letter'; } catch (e) { /* A4 */ }
    if (Auth()) await Auth().ready;
    try { cfg = await Auth().api('GET', '/account/coloring/config'); } catch (e) { /* keep defaults */ }
    $('#pz-price').textContent = money(cfg.price_cents, cfg.currency);
    if (!cfg.enabled) { $('#pz-buy').disabled = true; msg('Ordering is being set up. Please check back soon.'); }
    var q = new URLSearchParams(location.search), id = q.get('order');
    if (q.get('canceled')) msg('No payment was taken. You can try again whenever you like.');
    if (id && /^o_[0-9a-f]{32}$/.test(id) && Auth()) {
      if (!Auth().member) { await Auth().requireJoin('download', 'your coloring book'); }
      if (Auth().member) {
        msg('Checking your payment…'); var paid = await confirmOrder(id, true);
        msg(paid ? 'Thank you! Your payment arrived. Press Download PDF below.' : 'We have not seen the payment yet. If you paid, press Check payment below in a moment.', !paid);
        history.replaceState(null, '', location.pathname);
      }
    }
    await loadOrders();
    if (Auth()) Auth().onChange(function () { loadOrders(); });
  });
})();
