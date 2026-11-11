/* Parents' corner: members-only discussions. All text from members is added with textContent (never as HTML). */
(function () {
  'use strict';
  var CATS = [['motherhood', 'Motherhood'], ['fatherhood', 'Fatherhood'], ['skincare', 'Skincare & self-care'], ['babies', 'Babies & toddlers'], ['school-years', 'School years'], ['health', 'Health & wellbeing'], ['anything', 'Anything parenthood']];
  var label = {}; CATS.forEach(function (c) { label[c[0]] = c[1]; });
  var cat = '', page = 0, me = null, openId = null;
  function $(s) { return document.querySelector(s); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function Auth() { return window.HogAuth; }
  function api(m, p, b) { return Auth().api(m, p, b); }
  function show(id, on) { var n = $(id); if (n) n.hidden = !on; }
  function say(id, t, err) { var n = $(id); if (!n) return; n.textContent = t || ''; n.classList.toggle('err', !!err); }
  function ago(t) {
    var s = Math.max(1, Math.round((Date.now() - t) / 1000));
    if (s < 60) return 'just now'; var m = Math.round(s / 60); if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60); if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
    var d = Math.round(h / 24); if (d < 31) return d + (d === 1 ? ' day ago' : ' days ago');
    return new Date(t).toLocaleDateString();
  }
  function who(nick, team) { var s = el('span', 'pc-who', nick); if (team) s.appendChild(el('em', 'pc-team', 'Hog team')); return s; }

  /* ---------- screens ---------- */
  function screen(name) { show('#pc-gate', name === 'gate'); show('#pc-nick', name === 'nick'); show('#pc-app', name === 'app'); show('#pc-thread', name === 'thread'); }
  async function start() {
    if (!Auth()) { say('#pc-gate-msg', 'The sign-in part of the page did not load. Please refresh.', true); screen('gate'); return; }
    await Auth().ready;
    if (!Auth().member) { screen('gate'); return; }
    try { me = await api('GET', '/account/community/me'); } catch (e) { screen('gate'); say('#pc-gate-msg', e.message, true); return; }
    if (!me.nickname) { screen('nick'); return; }
    screen('app'); buildTabs(); await loadList(true); route();
  }
  async function saveNick(e) {
    e.preventDefault(); var v = $('#pc-nick-input').value.trim(); say('#pc-nick-msg', '');
    try { var d = await api('POST', '/account/community/nickname', { nickname: v }); me.nickname = d.nickname; screen('app'); buildTabs(); await loadList(true); route(); }
    catch (err) { say('#pc-nick-msg', err.message, true); }
  }

  /* ---------- list ---------- */
  function buildTabs() {
    var box = $('#pc-tabs'); if (box.childElementCount) return;
    [['', 'All']].concat(CATS).forEach(function (c) {
      var b = el('button', 'pc-tab', c[1]); b.type = 'button'; b.setAttribute('data-cat', c[0]); b.setAttribute('aria-pressed', String(c[0] === cat));
      b.addEventListener('click', function () { cat = c[0]; Array.prototype.forEach.call(box.children, function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-cat') === cat)); }); loadList(true); });
      box.appendChild(b);
    });
    var sel = $('#pc-cat'); CATS.forEach(function (c) { var o = el('option', '', c[1]); o.value = c[0]; sel.appendChild(o); });
  }
  async function loadList(reset) {
    if (reset) { page = 0; $('#pc-list').replaceChildren(); }
    say('#pc-list-msg', 'Loading…');
    try {
      var d = await api('GET', '/account/community/posts?category=' + encodeURIComponent(cat) + '&page=' + page), list = $('#pc-list');
      d.posts.forEach(function (p) {
        var li = el('li', 'pc-item'), a = el('a', 'pc-link'); a.href = '#post-' + p.id;
        var t = el('b', 'pc-title', p.title), meta = el('span', 'pc-meta'); meta.append(el('span', 'pc-badge', label[p.category] || p.category), who(p.nickname, p.team), el('span', '', ago(p.last_reply_at)), el('span', '', p.replies + (p.replies === 1 ? ' reply' : ' replies')));
        a.append(t, el('span', 'pc-snip', p.snippet), meta); li.appendChild(a); list.appendChild(li);
      });
      say('#pc-list-msg', list.childElementCount ? '' : 'No discussions here yet. Be the first to start one!');
      show('#pc-more', d.has_more);
    } catch (e) { say('#pc-list-msg', e.message, true); }
  }
  async function submitPost(e) {
    e.preventDefault(); var f = $('#pc-form'); say('#pc-form-msg', ''); var btn = f.querySelector('button[type=submit]'); btn.disabled = true;
    try {
      var d = await api('POST', '/account/community/post', { category: $('#pc-cat').value, title: $('#pc-title').value, body: $('#pc-body').value });
      f.reset(); f.hidden = true; location.hash = '#post-' + d.id;
    } catch (err) { say('#pc-form-msg', err.message, true); }
    btn.disabled = false;
  }

  /* ---------- thread ---------- */
  function actions(kind, item, refresh) {
    var box = el('div', 'pc-actions');
    var rep = el('button', 'pc-mini', 'Report'); rep.type = 'button';
    rep.onclick = async function () { rep.disabled = true; try { await api('POST', '/account/community/report', { kind: kind, id: item.id }); rep.textContent = 'Reported, thank you'; } catch (e) { rep.textContent = 'Could not report'; } };
    if (!item.mine) box.appendChild(rep);
    if (item.mine || (me && me.team)) {
      var del = el('button', 'pc-mini', 'Remove'); del.type = 'button';
      del.onclick = async function () { if (!window.confirm('Remove this ' + kind + '?')) return; try { await api('POST', '/account/community/delete', { kind: kind, id: item.id }); refresh(); } catch (e) { window.alert(e.message); } };
      box.appendChild(del);
    }
    return box;
  }
  async function openThread(id) {
    openId = id; screen('thread'); var box = $('#pc-thread-body'); box.replaceChildren(el('p', 'note', 'Loading…'));
    try {
      var d = await api('GET', '/account/community/post?id=' + id); box.replaceChildren();
      var art = el('article', 'pc-post'); art.append(el('span', 'pc-badge', label[d.post.category] || d.post.category), el('h2', '', d.post.title));
      var meta = el('p', 'pc-meta'); meta.append(who(d.post.nickname, d.post.team), el('span', '', ago(d.post.created_at))); art.append(meta, el('p', 'pc-body', d.post.body), actions('post', d.post, function () { location.hash = ''; }));
      box.appendChild(art);
      var h = el('h3', 'pc-h', d.replies.length ? d.replies.length + (d.replies.length === 1 ? ' reply' : ' replies') : 'No replies yet. Say something kind!'); box.appendChild(h);
      var ul = el('ul', 'pc-replies');
      d.replies.forEach(function (r) {
        var li = el('li', 'pc-reply'), m = el('p', 'pc-meta'); m.append(who(r.nickname, r.team), el('span', '', ago(r.created_at)));
        li.append(m, el('p', 'pc-body', r.body), actions('reply', r, function () { openThread(id); })); ul.appendChild(li);
      });
      box.appendChild(ul); window.scrollTo({ top: 0 });
    } catch (e) { box.replaceChildren(el('p', 'pdf-status err', e.message)); }
  }
  async function submitReply(e) {
    e.preventDefault(); say('#pc-reply-msg', ''); var btn = $('#pc-reply-form button[type=submit]'); btn.disabled = true;
    try { await api('POST', '/account/community/reply', { post: openId, body: $('#pc-reply-body').value }); $('#pc-reply-form').reset(); await openThread(openId); }
    catch (err) { say('#pc-reply-msg', err.message, true); }
    btn.disabled = false;
  }
  function route() {
    if (!me || !me.nickname) return;
    var m = /^#post-(\d+)$/.exec(location.hash);
    if (m) openThread(parseInt(m[1], 10)); else { openId = null; screen('app'); }
  }

  document.addEventListener('DOMContentLoaded', function () {
    $('#pc-nick-form').addEventListener('submit', saveNick);
    $('#pc-new').addEventListener('click', function () { var f = $('#pc-form'); f.hidden = !f.hidden; if (!f.hidden) $('#pc-title').focus(); });
    $('#pc-form').addEventListener('submit', submitPost);
    $('#pc-more').addEventListener('click', function () { page += 1; loadList(false); });
    $('#pc-reply-form').addEventListener('submit', submitReply);
    $('#pc-back').addEventListener('click', function () { location.hash = ''; });
    window.addEventListener('hashchange', route);
    if (Auth()) Auth().onChange(function () { start(); });
    start();
  });
})();
