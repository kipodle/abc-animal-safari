/* Sign up + log in for hogthehedgehog.com.
   Accounts live in the site's Cloudflare Worker (api.hogthehedgehog.com). A secure cookie keeps people logged in.
   This is a soft gate: the site is static pages, so the pages themselves stay public, but every sign-up and
   download is real, counted, and tied to an account.
   Add  data-wall="game"  to this script tag on a page to cover it until the visitor has signed up or logged in. */
(function () {
  'use strict';

  var SCRIPT = document.currentScript;
  var WALL = SCRIPT && SCRIPT.getAttribute('data-wall');
  var IS_LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var API = IS_LOCAL ? 'http://localhost:8787' : 'https://api.hogthehedgehog.com';
  var ASSETS = '/assets/';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var Countries = window.HogCountries;

  // New sign-ups are also added to the owner's existing Google Form spreadsheet (same one the old game screen used).
  var MIRROR_SIGNUPS = true;
  var SHEET_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScWQktJealsgI9Btzh6-eHsOoHhidq51VVzVRkTsRik4CLfag/formResponse';
  var SHEET_EMAIL = 'entry.1358276712', SHEET_COUNTRY = 'entry.376890493';

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function normEmail(s) { return String(s || '').trim().toLowerCase(); }
  // Hog the hedgehog is the one and only mascot on the sign-up / login screens.
  function parade() {
    return '<div class="hog-main" aria-hidden="true"><img src="' + ASSETS + 'logo.png" alt="" width="146" height="130"></div>';
  }

  var member = null;
  var cfg = { contactEmail: '' };
  var listeners = [];
  function emit(evt) { listeners.forEach(function (fn) { try { fn(member, evt); } catch (e) { console.error(e); } }); }

  function api(method, path, body) {
    return fetch(API + path, {
      method: method, credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined,
    }).catch(function () { throw Object.assign(new Error('We could not reach the website server. Please check your connection and try again.'), { offline: true }); })
      .then(function (r) {
        return r.json().catch(function () { return null; }).then(function (data) {
          if (!r.ok) throw Object.assign(new Error((data && data.error) || 'Something went wrong. Please try again.'), { status: r.status });
          return data;
        });
      });
  }

  var ready = api('GET', '/account/me').then(function (me) { member = me.user || null; cfg.contactEmail = me.contactEmail || ''; })
    .catch(function (e) { console.warn('Sign-in service unavailable:', e.message); });

  function celebrate() {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var icons = ['🎉', '⭐', '✨', '🎈', '🌟', '💛'];
    for (var k = 0; k < 18; k++) {
      var c = el('span', 'hog-confetti', icons[k % icons.length]);
      c.style.left = (25 + Math.random() * 50) + 'vw'; c.style.top = '55vh';
      c.style.setProperty('--dx', (Math.random() * 420 - 210) + 'px'); c.style.setProperty('--dy', (-Math.random() * 360 - 60) + 'px'); c.style.setProperty('--rot', (Math.random() * 540 - 270) + 'deg');
      document.body.appendChild(c);
      (function (n) { setTimeout(function () { n.remove(); }, 1600); })(c);
    }
  }

  function mirrorToSheet(email, country) {
    if (!MIRROR_SIGNUPS || IS_LOCAL) return; // never copy test sign-ups into the real spreadsheet
    try {
      var body = new URLSearchParams();
      body.append(SHEET_EMAIL, email);
      body.append(SHEET_COUNTRY, Countries ? Countries.name(country) : country);
      fetch(SHEET_URL, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() }).catch(function () {});
    } catch (e) { /* the spreadsheet copy is a bonus */ }
  }

  /* ---------------- sign up / log in box ---------------- */
  var overlay = null, modal = null, pending = null, lastFocus = null, ctxMeta = {};

  function build() {
    if (overlay) return;
    overlay = el('div', 'auth-overlay'); overlay.hidden = true;
    modal = el('div', 'auth-modal');
    modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-labelledby', 'auth-title');
    modal.innerHTML =
      '<button type="button" class="auth-x" aria-label="Close">✕</button>' +

      '<form class="auth-pane" data-pane="signup" novalidate>' + parade(['hedgehog', 'frog', 'lion', 'penguin']) +
        '<h2 id="auth-title">Let\'s gooo! 🎉</h2><p class="auth-sub" data-sub></p>' +
        '<label class="auth-field">Parent or guardian email<input type="email" name="email" autocomplete="email" inputmode="email" placeholder="you@example.com"></label>' +
        '<label class="auth-field">Pick a secret password (8+ characters)<input type="password" name="password" autocomplete="new-password" minlength="8"></label>' +
        '<label class="auth-field">Country<select name="country" autocomplete="country"></select></label>' +
        '<label class="auth-chk"><input type="checkbox" name="consent"><span>I\'m a parent or guardian and I agree to the <a href="/privacy/" target="_blank" rel="noopener">Privacy Policy</a>.</span></label>' +
        '<label class="auth-chk"><input type="checkbox" name="marketing"><span>Also send me news about new games and stories (optional). Unsubscribe any time.</span></label>' +
        '<input class="auth-hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
        '<div class="auth-err" role="alert"></div>' +
        '<button class="btn auth-submit" type="submit">Let\'s gooo! 🚀</button>' +
        '<p class="auth-alt">Already one of us? <button type="button" class="auth-link" data-go="login">Log in</button></p>' +
      '</form>' +

      '<form class="auth-pane" data-pane="login" novalidate>' + parade(['octopus', 'elephant', 'frog']) +
        '<h2>Welcome back! 👋</h2><p class="auth-sub">Log in and let\'s keep the fun going!</p>' +
        '<label class="auth-field">Email<input type="email" name="email" autocomplete="username" inputmode="email"></label>' +
        '<label class="auth-field">Password<input type="password" name="password" autocomplete="current-password"></label>' +
        '<div class="auth-err" role="alert"></div>' +
        '<button class="btn auth-submit" type="submit">Let\'s play! ▶</button>' +
        '<p class="auth-alt"><button type="button" class="auth-link" data-go="forgot">Forgot password?</button> · <button type="button" class="auth-link" data-go="signup">New here? Sign up</button></p>' +
      '</form>' +

      '<div class="auth-pane" data-pane="forgot">' + parade(['penguin']) +
        '<h2>Oops, forgot your password?</h2><p class="auth-sub" data-forgot></p>' +
        '<button class="btn btn-light auth-submit" type="button" data-go="login">Back to log in</button>' +
      '</div>' +

      '<div class="auth-pane" data-pane="account">' + parade(['hedgehog', 'lion', 'frog']) +
        '<h2>You\'re in! 🎉</h2><p class="auth-sub">Logged in as <strong data-email></strong><br><span data-country></span></p>' +
        '<ul class="auth-perks"><li>The ABC game is open</li><li>Download your letter adventures</li></ul>' +
        '<div class="auth-err" role="alert"></div>' +
        '<button class="btn btn-light auth-submit" type="button" data-logout>Log out</button>' +
      '</div>';
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    var sel = modal.querySelector('select[name=country]');
    var ph = document.createElement('option'); ph.value = ''; ph.textContent = 'Select your country…'; sel.appendChild(ph);
    (Countries ? Countries.list() : []).forEach(function (c) { var o = document.createElement('option'); o.value = c.code; o.textContent = c.name; sel.appendChild(o); });

    modal.querySelector('.auth-x').onclick = function () { closeModal(false); };
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) closeModal(false); });
    modal.addEventListener('click', function (e) { var g = e.target.closest('[data-go]'); if (g) showPane(g.getAttribute('data-go')); });
    modal.addEventListener('keydown', trapTab);
    modal.querySelector('[data-pane="signup"]').addEventListener('submit', onSignup);
    modal.querySelector('[data-pane="login"]').addEventListener('submit', onLogin);
    modal.querySelector('[data-logout]').onclick = logout;
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && overlay && !overlay.hidden) closeModal(false); });
  }

  function trapTab(e) {
    if (e.key !== 'Tab') return;
    var f = [].slice.call(modal.querySelectorAll('button:not([hidden]), input:not([tabindex="-1"]), select, a[href]')).filter(function (n) { return n.offsetParent !== null && !n.disabled; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function pane(name) { return modal.querySelector('[data-pane="' + name + '"]'); }
  function setErr(name, msg) { var e = pane(name).querySelector('.auth-err'); if (e) e.textContent = msg || ''; }
  function showPane(name) {
    [].forEach.call(modal.querySelectorAll('.auth-pane'), function (p) { p.hidden = p.getAttribute('data-pane') !== name; });
    [].forEach.call(modal.querySelectorAll('.auth-err'), function (e) { e.textContent = ''; });
    var p = pane(name);
    if (name === 'signup') {
      p.querySelector('[data-sub]').textContent = ctxMeta.sub || 'Pop in your email and country, pick a secret password, and the games and letter adventures are yours!';
      var sel = p.querySelector('[name=country]'); if (!sel.value) sel.value = (Countries && Countries.guess()) || '';
    }
    if (name === 'forgot') {
      var c = cfg.contactEmail;
      p.querySelector('[data-forgot]').textContent = c ? 'Email us at ' + c + ' from the address you signed up with, and we will reset it for you.'
        : 'Please contact us through our YouTube channel and we will reset it for you.';
    }
    if (name === 'account' && member) {
      p.querySelector('[data-email]').textContent = member.email;
      p.querySelector('[data-country]').textContent = Countries ? Countries.name(member.country) : member.country;
    }
    var first = p.querySelector('input:not([type=checkbox]):not(.auth-hp)') || p.querySelector('button');
    setTimeout(function () { if (first) first.focus(); }, 30);
  }

  function openModal(mode, meta) {
    build();
    ctxMeta = meta || {};
    if (pending) pending(false);
    lastFocus = document.activeElement;
    [].forEach.call(modal.querySelectorAll('input[type=checkbox]'), function (c) { c.checked = false; }); // consent is asked fresh each time
    [].forEach.call(modal.querySelectorAll('input[type=password]'), function (c) { c.value = ''; });
    overlay.hidden = false; document.body.classList.add('auth-open');
    showPane(mode);
    return new Promise(function (res) { pending = function (ok) { pending = null; res(!!ok); }; });
  }
  function closeModal(ok) {
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true; document.body.classList.remove('auth-open');
    if (pending) pending(ok);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* ignore */ } }
  }
  function busy(form, on) {
    var b = form.querySelector('.auth-submit'); b.disabled = on;
    if (on) { b.setAttribute('data-t', b.textContent); b.textContent = 'One moment…'; } else if (b.getAttribute('data-t')) b.textContent = b.getAttribute('data-t');
  }

  function onSignup(e) {
    e.preventDefault();
    var f = e.currentTarget, email = normEmail(f.email.value), country = f.country.value;
    if (f.website.value) { closeModal(false); return; } // honeypot: real people never fill this
    if (!EMAIL_RE.test(email)) return setErr('signup', 'Please enter a valid email address.');
    if (f.password.value.length < 8) return setErr('signup', 'Please use a password with at least 8 characters.');
    if (!country || !(Countries && Countries.valid(country))) return setErr('signup', 'Please choose your country.');
    if (!f.consent.checked) return setErr('signup', 'Please tick the box to confirm you are a parent or guardian.');
    busy(f, true);
    api('POST', '/account/signup', { email: email, password: f.password.value, country: country, consent: true, marketing: f.marketing.checked })
      .then(function (r) {
        member = r.user; f.password.value = '';
        mirrorToSheet(email, country);
        emit('SIGNED_UP'); closeModal(true); celebrate();
      })
      .catch(function (err) { setErr('signup', err.message); if (err.status === 409) pane('login').querySelector('[name=email]').value = email; })
      .then(function () { busy(f, false); });
  }
  function onLogin(e) {
    e.preventDefault();
    var f = e.currentTarget, email = normEmail(f.email.value);
    if (!EMAIL_RE.test(email)) return setErr('login', 'Please enter a valid email address.');
    if (!f.password.value) return setErr('login', 'Please enter your password.');
    busy(f, true);
    api('POST', '/account/login', { email: email, password: f.password.value })
      .then(function (r) { member = r.user; f.password.value = ''; emit('LOGGED_IN'); closeModal(true); celebrate(); })
      .catch(function (err) { setErr('login', err.message); })
      .then(function () { busy(f, false); });
  }
  function logout() {
    return api('POST', '/account/logout').then(function () { member = null; emit('LOGGED_OUT'); closeModal(false); })
      .catch(function (e) { setErr('account', e.message); });
  }

  /* ---------------- public API ---------------- */
  function requireJoin(reason, label) {
    return ready.then(function () {
      if (member) return true;
      var sub = reason === 'download' ? 'Sign up with your email and country (or log in) and ' + (label || 'your download') + ' is all yours. Let\'s gooo!'
        : reason === 'play' ? 'Sign up with your email and country (or log in) and let the games begin!' : null;
      return openModal('signup', { sub: sub });
    });
  }
  var Auth = {
    ready: ready,
    get member() { return member; },
    get config() { return cfg; },
    onChange: function (fn) { listeners.push(fn); },
    requireJoin: requireJoin, logout: logout,
    openSignup: function () { return openModal('signup', {}); },
    openLogin: function () { return openModal('login', {}); },
    openAccount: function () { return openModal('account', {}); },
    gateDownload: function (meta) { return requireJoin('download', meta && meta.label); },
    // Game stars are kept on this device, per account.
    getProgress: function (letter) {
      if (!member) return Promise.resolve([]);
      try { return Promise.resolve(JSON.parse(localStorage.getItem('hog-progress:' + member.email + ':' + letter) || '[]').filter(Number.isInteger)); } catch (e) { return Promise.resolve([]); }
    },
    saveProgress: function (letter, done) {
      if (!member) return;
      try { localStorage.setItem('hog-progress:' + member.email + ':' + letter, JSON.stringify(Array.from(done).sort(function (a, b) { return a - b; }))); } catch (e) { /* storage may be blocked */ }
    },
    logDownload: function (meta) { if (!member) return; api('POST', '/account/download', { kind: meta.kind, letter: meta.letter || null, file: meta.file || null }).catch(function () {}); },
    admin: { stats: function () { return api('GET', '/account/admin/stats'); }, members: function () { return api('GET', '/account/admin/members'); } },
  };
  window.HogAuth = Auth;

  /* ---------------- page integration ---------------- */
  function mountHeader() {
    var wrap = document.querySelector('.site-header .wrap');
    if (!wrap || wrap.querySelector('.hdr-auth')) return;
    var box = el('div', 'hdr-auth');
    var login = el('button', 'btn btn-light', 'Log in'); login.type = 'button'; login.onclick = function () { openModal('login', {}); };
    var signup = el('button', 'btn', 'Sign up'); signup.type = 'button'; signup.onclick = function () { openModal('signup', {}); };
    var acct = el('button', 'btn btn-light', '👤 Account'); acct.type = 'button'; acct.onclick = function () { openModal('account', {}); };
    box.appendChild(login); box.appendChild(signup); box.appendChild(acct);
    wrap.appendChild(box);
    function render() { login.hidden = signup.hidden = !!member; acct.hidden = !member; }
    render(); Auth.onChange(render); ready.then(render);
  }

  function renderBits() {
    [].forEach.call(document.querySelectorAll('[data-guest-only]'), function (n) { n.hidden = !!member; });
    [].forEach.call(document.querySelectorAll('[data-member-only]'), function (n) { n.hidden = !member; });
    [].forEach.call(document.querySelectorAll('[data-auth-note]'), function (n) {
      n.textContent = '';
      if (member) { n.appendChild(document.createTextNode('✅ Logged in as ')); n.appendChild(el('strong', '', member.email)); n.appendChild(document.createTextNode(' — download as many adventures as you like.')); return; }
      var a = el('button', 'auth-link', "Sign up and let's gooo"); a.type = 'button'; a.onclick = function () { requireJoin('download', 'your letter adventure'); };
      var b = el('button', 'auth-link', 'log in'); b.type = 'button'; b.onclick = function () { openModal('login', {}); };
      n.appendChild(document.createTextNode('🎉 Downloads are free for members! ')); n.appendChild(a); n.appendChild(document.createTextNode(' or ')); n.appendChild(b); n.appendChild(document.createTextNode('.'));
    });
  }

  // Full-page cover (used on the game page) until the visitor has signed up or logged in.
  var wall = null;
  function mountWall() {
    if (!WALL || wall) return;
    wall = el('div', 'hog-wall');
    wall.innerHTML = parade(['hedgehog', 'frog', 'lion']) +
      '<h1>Ready to play? Let\'s gooo!</h1><p>Sign up with your email and country (or log in) and the game is all yours.</p>' +
      '<div class="hog-wall-row"><button class="btn" type="button" data-w="su">Let\'s gooo! 🚀</button><button class="btn btn-light" type="button" data-w="li">Log in</button></div>';
    document.body.appendChild(wall);
    wall.querySelector('[data-w=su]').onclick = function () { requireJoin('play'); };
    wall.querySelector('[data-w=li]').onclick = function () { openModal('login', {}); };
    function sync() { wall.hidden = !!member; }
    Auth.onChange(sync);
    ready.then(function () { sync(); if (!member) requireJoin('play'); });
  }

  // Download and Print on the letter-adventure page: members only. Guests get the sign-up box, then it carries on.
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#btnPdf, #btnPrint');
    if (!b) return;
    if (member) {
      var chk = document.querySelector('input[name="letter"]:checked');
      Auth.logDownload({ kind: b.id === 'btnPdf' ? 'adventure-pdf' : 'adventure-print', letter: chk ? chk.value : null });
      return;
    }
    e.preventDefault(); e.stopImmediatePropagation();
    requireJoin('download', 'your letter adventure').then(function (ok) { if (ok) b.click(); });
  }, true);

  document.addEventListener('click', function (e) {
    var s = e.target.closest && e.target.closest('[data-open-signup]'), l = e.target.closest && e.target.closest('[data-open-login]');
    if (s) { e.preventDefault(); openModal('signup', {}); } else if (l) { e.preventDefault(); openModal('login', {}); }
  });

  function init() { mountHeader(); mountWall(); Auth.onChange(renderBits); ready.then(renderBits); renderBits(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
