(function () {
  'use strict';
  const Auth = window.HogAuth;
  const view = document.getElementById('view');
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const fmt = (n) => Number(n || 0).toLocaleString();
  const country = (c) => (window.HogCountries ? window.HogCountries.name(c) : c);

  function gate(title, text, extra) {
    const g = el('div', 'gate');
    g.append(el('h2', '', title)); if (text) g.append(el('p', '', text));
    if (extra) g.append(extra);
    view.replaceChildren(g);
  }

  function card(title, big, lines) {
    const c = el('div', 'stat');
    c.append(el('h3', '', title), el('div', 'big', fmt(big)));
    const ul = el('ul');
    lines.forEach(([label, val]) => { const li = el('li'); li.append(label + ': ', el('b', '', fmt(val))); ul.append(li); });
    c.append(ul); return c;
  }

  function chart(title, daily, key, cls) {
    const wrap = el('div', 'chart ' + cls);
    const vals = daily.map((d) => Number(d[key] || 0));
    const total = vals.reduce((a, b) => a + b, 0), max = Math.max(1, ...vals);
    const h = el('h4'); h.append(el('span', '', title), el('span', 'muted', fmt(total) + ' in 30 days'));
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 300 64'); svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', `${title}: ${total} in the last 30 days`);
    vals.forEach((v, i) => {
      const bh = v ? Math.max(3, (v / max) * 60) : 1.5;
      const r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', i * 10 + 1); r.setAttribute('width', 8); r.setAttribute('y', 64 - bh); r.setAttribute('height', bh); r.setAttribute('rx', 2);
      if (!v) r.setAttribute('opacity', '.25');
      const t = document.createElementNS(NS, 'title'); t.textContent = `${daily[i].day}: ${v}`; r.append(t);
      svg.append(r);
    });
    const axis = el('div', 'axis'); axis.append(el('span', '', daily[0].day.slice(5)), el('span', '', 'today'));
    wrap.append(h, svg, axis); return wrap;
  }

  function csvCell(v) {
    let s = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // stop spreadsheet formula injection
    return '"' + s.replace(/"/g, '""') + '"';
  }
  async function exportMembers(btn, note) {
    btn.disabled = true; note.textContent = 'Preparing…';
    try {
      const rows = await Auth.admin.members();
      const lines = [['email', 'country', 'country_code', 'agreed_to_updates', 'joined', 'last_login', 'last_seen'].join(',')]
        .concat(rows.map((r) => [r.email, country(r.country), r.country, r.marketing_opt_in ? 'yes' : 'no', r.created_at, r.last_login_at, r.last_seen_at].map(csvCell).join(',')));
      const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'members-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      note.textContent = `${rows.length} members exported.`;
    } catch (e) { note.textContent = 'Export failed. Please try again.'; console.error(e); }
    btn.disabled = false;
  }

  function render(s, who) {
    const out = el('div');
    const bar = el('div', 'tools'); bar.style.marginBottom = '14px';
    const so = el('button', 'btn btn-secondary', 'Log out'); so.type = 'button';
    so.onclick = async () => { await Auth.logout(); location.reload(); };
    bar.append(el('span', 'muted', 'Logged in as ' + who.email), so); out.append(bar);
    const grid = el('div', 'stat-grid');
    grid.append(
      card('Members (signed up)', s.members_total, [['New in 7 days', s.members_7d], ['New in 30 days', s.members_30d], ['Agreed to updates', s.members_marketing]]),
      card('Logins', s.logins_total, [['Last 7 days', s.logins_7d], ['Different members, 30 days', s.login_members_30d]]),
      card('Return visits', s.visits_total, [['Last 7 days', s.visits_7d], ['Active members, 30 days', s.active_30d]]),
      card('PDF downloads', s.downloads_total, [['Last 7 days', s.downloads_7d]])
    );
    out.append(grid);

    const daily = (s.daily && s.daily.length ? s.daily : []).map((d) => ({ ...d, day: String(d.day).slice(0, 10) }));
    if (daily.length) {
      const p = el('div', 'panel'); p.append(el('h2', '', 'Last 30 days'));
      const cs = el('div', 'charts');
      cs.append(chart('New members', daily, 'signups', 'c-green'), chart('Logins', daily, 'logins', 'c-blue'), chart('Return visits', daily, 'visits', 'c-gold'), chart('PDF downloads', daily, 'downloads', 'c-coral'));
      p.append(cs); out.append(p);
    }

    const cp = el('div', 'panel'); cp.append(el('h2', '', 'Where members are from'));
    const rows = el('div', 'countries');
    const tc = s.top_countries || [], maxN = Math.max(1, ...tc.map((c) => Number(c.n)));
    if (tc.length) tc.forEach((c) => {
      const r = el('div', 'crow'); const bar = el('span', 'cbar'); bar.style.width = (Number(c.n) / maxN * 100) + '%';
      const track = el('span', 'ctrack'); track.append(bar);
      r.append(el('span', 'cname', country(c.country)), track, el('b', '', fmt(c.n))); rows.append(r);
    });
    else rows.append(el('span', 'muted', 'No members yet.'));
    cp.append(rows); out.append(cp);

    const tp = el('div', 'panel'); tp.append(el('h2', '', 'Most downloaded letters'));
    const list = el('div', 'toplist');
    if (s.top_letters && s.top_letters.length) s.top_letters.forEach((t) => list.append(el('span', '', `${t.letter}  ·  ${fmt(t.n)}`)));
    else list.append(el('span', 'muted', 'No letter workbooks downloaded yet.'));
    tp.append(list); out.append(tp);

    const ex = el('div', 'panel'); ex.append(el('h2', '', 'Members list'));
    const tools = el('div', 'tools'), b = el('button', 'btn btn-secondary', '⬇ Export members (CSV)'); b.type = 'button';
    const note = el('span', 'muted', 'Emails and countries. Only share with people who need it.');
    b.onclick = () => exportMembers(b, note);
    tools.append(b, note); ex.append(tools); out.append(ex);
    view.replaceChildren(out);
  }

  async function load() {
    if (!Auth) return gate('Something went wrong', 'The sign-in script did not load. Please refresh the page.');
    await Auth.ready;
    if (!Auth.member) {
      const b = el('button', 'btn btn-green', 'Log in'); b.type = 'button'; b.onclick = async () => { if (await Auth.openLogin()) load(); };
      return gate('Owner log in', 'This page is for the site owner. Log in with your admin account.', b);
    }
    try { render(await Auth.admin.stats(), Auth.member); }
    catch (e) {
      if (e && e.status === 403) {
        const box = el('div'); const code = el('p'); code.append('Make your account an admin by running this on the computer or server that hosts the site: ', Object.assign(el('code'), { textContent: 'npm run make-admin -- ' + Auth.member.email }));
        const so = el('button', 'btn btn-secondary', 'Log out'); so.type = 'button'; so.onclick = async () => { await Auth.logout(); location.reload(); };
        box.append(code, so);
        return gate('This account is not an admin', 'Only admins can see these numbers.', box);
      }
      console.error(e);
      gate('Could not load the numbers', 'Please refresh the page and try again.');
    }
  }
  load();
})();
