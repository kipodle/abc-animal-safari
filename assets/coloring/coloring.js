/* Coloring books: the PDF is drawn in the browser only AFTER the visitor is signed up and logged in.
   There is no PDF file on the server to download. */
(function () {
  'use strict';
  var BOOKS = {
    animals: {
      title: 'Animals', kind: 'coloring-animals', file: 'Hog-the-Hedgehog-Animals-Coloring-Book.pdf', folder: '/assets/coloring/animals/',
      pages: [['lion', 'Lion'], ['elephant', 'Elephant'], ['frog', 'Frog'], ['hedgehog', 'Hedgehog'], ['bear', 'Bear'], ['rabbit', 'Rabbit'], ['monkey', 'Monkey'], ['panda', 'Panda'], ['fox', 'Fox'], ['owl', 'Owl']],
      cover: ['lion', 'frog', 'hedgehog', 'panda']
    },
    sea: {
      title: 'Sea Animals', kind: 'coloring-sea', file: 'Hog-the-Hedgehog-Sea-Animals-Coloring-Book.pdf', folder: '/assets/coloring/sea/',
      pages: [['fish', 'Fish'], ['whale', 'Whale'], ['dolphin', 'Dolphin'], ['octopus', 'Octopus'], ['turtle', 'Sea turtle'], ['crab', 'Crab'], ['starfish', 'Starfish'], ['seahorse', 'Seahorse'], ['jellyfish', 'Jellyfish'], ['shark', 'Shark']],
      cover: ['whale', 'octopus', 'turtle', 'fish']
    }
  };
  var PAPER = { letter: { w: 1275, h: 1650, pt: [612, 792], fmt: 'letter' }, a4: { w: 1240, h: 1754, pt: [595.28, 841.89], fmt: 'a4' } };
  var INK = '#222', GREEN = '#2C6B3B';
  var busy = false;

  function $(s) { return document.querySelector(s); }
  function Auth() { return window.HogAuth; }
  function status(msg, err) { var s = $('#cb-status'); if (!s) return; s.textContent = msg || ''; s.classList.toggle('err', !!err); }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      if (document.querySelector('script[data-lib="' + src + '"]')) return res();
      var s = document.createElement('script'); s.src = src; s.dataset.lib = src; s.onload = res; s.onerror = function () { rej(new Error('Could not load ' + src)); }; document.head.appendChild(s);
    });
  }
  function loadImage(src) {
    return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { rej(new Error('Could not load ' + src)); }; i.src = src; });
  }
  function nextFrame() { return new Promise(function (r) { setTimeout(r, 0); }); }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function text(ctx, str, x, y, size, weight, color) {
    ctx.font = (weight || 800) + ' ' + size + 'px "Baloo 2", "Nunito", system-ui, sans-serif'; ctx.fillStyle = color || INK; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(str, x, y);
  }
  function frame(ctx, W, H, m) { ctx.strokeStyle = INK; ctx.lineWidth = 8; rr(ctx, m, m, W - 2 * m, H - 2 * m, 40); ctx.stroke(); }
  function newPage(P) { var c = document.createElement('canvas'); c.width = P.w; c.height = P.h; var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, P.w, P.h); return { c: c, x: x }; }

  function artPage(P, name, art, n, total, bookTitle) {
    var pg = newPage(P), x = pg.x, W = P.w, H = P.h, m = 58;
    frame(x, W, H, m);
    text(x, name, W / 2, m + 150, 112, 800);
    text(x, 'Color me in!', W / 2, m + 205, 40, 700, '#7D6A54');
    var S = W - 2 * (m + 56), y0 = m + 240; x.drawImage(art, m + 56, y0, S, S);
    var yb = H - m - 120;
    text(x, 'Colored by: ______________________', W / 2, yb, 46, 700);
    text(x, 'Hog the Hedgehog  ·  ' + bookTitle + ' Coloring Book  ·  page ' + n + ' of ' + total + '  ·  hogthehedgehog.com', W / 2, H - m - 34, 28, 700, '#7D6A54');
    return pg.c;
  }
  function coverPage(P, book, arts, logo, wordmark) {
    var pg = newPage(P), x = pg.x, W = P.w, H = P.h, m = 58;
    frame(x, W, H, m);
    text(x, 'Hog the Hedgehog presents', W / 2, m + 105, 46, 700, '#7D6A54');
    text(x, book.title, W / 2, m + 255, 190, 800, GREEN);
    text(x, 'Coloring Book', W / 2, m + 350, 100, 800);
    var T = 380, gap = 30, gx = (W - (2 * T + gap)) / 2, gy = m + 410;
    for (var i = 0; i < 4; i++) {
      var tx = gx + (i % 2) * (T + gap), ty = gy + Math.floor(i / 2) * (T + gap);
      x.save(); rr(x, tx, ty, T, T, 30); x.clip(); x.drawImage(arts[i], tx, ty, T, T); x.restore();
      x.strokeStyle = INK; x.lineWidth = 6; rr(x, tx, ty, T, T, 30); x.stroke();
    }
    var ly = gy + 2 * T + gap + 40, lh = 180;
    var lw = logo.width * lh / logo.height, ww = wordmark.width * (lh * 0.85) / wordmark.height, total = lw + 30 + ww, lx = (W - total) / 2;
    x.drawImage(logo, lx, ly, lw, lh); x.drawImage(wordmark, lx + lw + 30, ly + lh * 0.07, ww, lh * 0.85);
    text(x, '10 animals to color  ·  This book belongs to: ____________________', W / 2, H - m - 40, 36, 700);
    return pg.c;
  }
  function certPage(P, book, logo) {
    var pg = newPage(P), x = pg.x, W = P.w, H = P.h, m = 58;
    frame(x, W, H, m); x.lineWidth = 3; rr(x, m + 22, m + 22, W - 2 * (m + 22), H - 2 * (m + 22), 28); x.stroke();
    text(x, 'Great coloring!', W / 2, 360, 140, 800, GREEN);
    text(x, 'Hog the Hedgehog says: well done!', W / 2, 460, 62, 700);
    var lh = 430, lw = logo.width * lh / logo.height; x.drawImage(logo, (W - lw) / 2, 540, lw, lh);
    text(x, 'You finished the ' + book.title + ' Coloring Book.', W / 2, 1090, 54, 700, '#7D6A54');
    text(x, 'Name: ______________________', W / 2, 1240, 50, 700);
    text(x, 'Date: ______________________', W / 2, 1330, 50, 700);
    return pg.c;
  }

  async function renderPages(bookId, paper) {
    var book = BOOKS[bookId], P = PAPER[paper] || PAPER.a4;
    try { if (document.fonts && document.fonts.load) await Promise.all([document.fonts.load('800 80px "Baloo 2"'), document.fonts.load('700 40px "Baloo 2"')]); } catch (e) { /* fall back to system font */ }
    var arts = await Promise.all(book.pages.map(function (p) { return loadImage(book.folder + p[0] + '.svg'); }));
    var byKey = {}; book.pages.forEach(function (p, i) { byKey[p[0]] = arts[i]; });
    var logo = await loadImage('/assets/logo.png'), wordmark = await loadImage('/assets/wordmark.png');
    var pages = [coverPage(P, book, book.cover.map(function (k) { return byKey[k]; }), logo, wordmark)];
    var total = book.pages.length + 2;
    book.pages.forEach(function (p, i) { pages.push(artPage(P, p[1], arts[i], i + 2, total, book.title)); });
    pages.push(certPage(P, book, logo));
    return { pages: pages, P: P, book: book };
  }

  async function build(bookId) {
    if (busy) return;
    var book = BOOKS[bookId]; if (!book) return;
    if (!Auth()) { status('The sign-in part of the page did not load. Please refresh and try again.', true); return; }
    var ok = await Auth().gateDownload({ kind: book.kind, label: 'the ' + book.title.toLowerCase() + ' coloring book' });
    if (!ok) return;
    if (busy) return; busy = true;
    var btns = document.querySelectorAll('[data-book]'); btns.forEach(function (b) { b.disabled = true; });
    try {
      status('Getting your coloring book ready…');
      await loadScript('/assets/vendor/jspdf.umd.min.js');
      var paper = ($('#cb-paper') || {}).value || 'a4';
      var r = await renderPages(bookId, paper), jsPDF = window.jspdf.jsPDF;
      var pdf = new jsPDF({ unit: 'pt', format: r.P.fmt, orientation: 'portrait', compress: true });
      for (var k = 0; k < r.pages.length; k++) {
        status('Adding page ' + (k + 1) + ' of ' + r.pages.length + '…'); await nextFrame();
        if (k > 0) pdf.addPage(r.P.fmt, 'portrait');
        pdf.addImage(r.pages[k].toDataURL('image/png'), 'PNG', 0, 0, r.P.pt[0], r.P.pt[1], undefined, 'FAST');
        r.pages[k].width = r.pages[k].height = 0;
      }
      pdf.save(book.file);
      Auth().logDownload({ kind: book.kind, file: book.file });
      status('Your ' + book.title.toLowerCase() + ' coloring book is ready: ' + r.pages.length + ' pages saved. Check your Downloads folder.');
    } catch (err) {
      console.error(err);
      status('Oops, that did not work. Please try again.', true);
    } finally {
      busy = false; btns.forEach(function (b) { b.disabled = false; });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var sel = $('#cb-paper');
    try { if (sel && /-(us|ca)$/i.test(navigator.language || '')) sel.value = 'letter'; } catch (e) { /* keep A4 */ }
    document.querySelectorAll('[data-book]').forEach(function (b) { b.addEventListener('click', function () { build(b.getAttribute('data-book')); }); });
  });
  window.HogColoring = { build: build, _render: renderPages, kit: { PAPER: PAPER, INK: INK, GREEN: GREEN, rr: rr, text: text, frame: frame, newPage: newPage, loadImage: loadImage, loadScript: loadScript, nextFrame: nextFrame } };
})();
