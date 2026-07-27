/* ============================================================================
 * Salmon CRM — app orchestrator: auth (A01/A02/A03), shell, nav + gate,
 * ⌘K search (A09), notifications (A10), profile menu (A11), dev toolbar.
 * ==========================================================================*/
(function (root) {
  'use strict';
  var C = root.C, Perm = root.Perm, Audit = root.Audit, CRM = root.CRM, Router = root.Router, Dashboards = root.Dashboards, DevToolbar = root.DevToolbar;

  root.CRM_NOW = '2026-07-15T10:00:00Z';       // audit clock authority for the prototype
  var App = { authed: false, role: (function () { try { return localStorage.getItem('crm_role') || Perm.ROLES.SUPER_ADMIN; } catch (e) { return Perm.ROLES.SUPER_ADMIN; } })(), state: 'data' };
  var rootEl;

  function staff() { return CRM.staff[App.role]; }

  /* ===================== auth screens ===================== */
  function showLogin() {
    App.authed = false;
    try { sessionStorage.removeItem('crm_authed'); } catch (e) {}
    rootEl.innerHTML =
      '<div class="authwrap"><div class="authcard"><div class="mark">S</div>' +
      '<h1>Salmon Admin</h1><p>Sign in to the operations console.</p>' +
      '<label>Work email</label><input id="li-email" type="email" value="fatima.ahmed@salmondevelopers.bd" autocomplete="username">' +
      '<label>Password</label><input id="li-pass" type="password" value="••••••••" autocomplete="current-password">' +
      '<button class="btn primary" id="li-go">Continue</button>' +
      '<div class="alt">Staff access only · <a id="li-help">Trouble signing in?</a></div>' +
      '<div class="alt muted" style="margin-top:14px;font-size:11px">Placeholder — SSO/MFA method is undefined (see OPEN_QUESTIONS #1).</div>' +
      '</div></div>';
    document.getElementById('li-go').onclick = showMFA;
    document.getElementById('li-help').onclick = function () { C.toast({ type: 'info', title: 'Contact IT', text: 'Password resets go through Salmon IT.' }); };
    document.getElementById('li-pass').addEventListener('keydown', function (e) { if (e.key === 'Enter') showMFA(); });
  }

  function showMFA() {
    rootEl.innerHTML =
      '<div class="authwrap"><div class="authcard"><div class="mark">S</div>' +
      '<h1>Enter your code</h1><p>We sent a 6-digit verification code to your registered device. <b>Demo code: 481920</b>.</p>' +
      '<div class="otp" id="otp">' + Array(6).fill(0).map(function (_, i) { return '<input maxlength="1" inputmode="numeric" data-i="' + i + '">'; }).join('') + '</div>' +
      '<button class="btn primary" id="mfa-go">Verify &amp; sign in</button>' +
      '<div class="alt"><a id="mfa-back">← Back</a></div></div></div>';
    var inputs = Array.prototype.slice.call(document.querySelectorAll('#otp input'));
    inputs[0].focus();
    inputs.forEach(function (inp, i) {
      inp.addEventListener('input', function () { if (inp.value && i < 5) inputs[i + 1].focus(); });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Backspace' && !inp.value && i > 0) inputs[i - 1].focus(); if (e.key === 'Enter') signIn(); });
    });
    document.getElementById('mfa-go').onclick = signIn;
    document.getElementById('mfa-back').onclick = showLogin;
  }

  function signIn() {
    App.authed = true;
    try { sessionStorage.setItem('crm_authed', '1'); } catch (e) {}   // remember auth across module round-trips
    Audit.audit({ actor: staff(), action: 'SIGN_IN', target: 'admin console' });
    mountShell();
    if (!location.hash || location.hash === '#/login') location.hash = '#/dashboard';
    else renderMain();
  }

  function showSessionExpired() {
    App.authed = false;
    try { sessionStorage.removeItem('crm_authed'); } catch (e) {}
    rootEl.innerHTML =
      '<div class="authwrap"><div class="authcard"><div class="mark">S</div>' +
      '<h1>Session expired</h1><p>For your security you’ve been signed out after a period of inactivity. Sign in again to continue where you left off.</p>' +
      '<button class="btn primary" id="se-go">Sign in again</button>' +
      '<div class="alt muted" style="margin-top:12px;font-size:11px">Timeout policy is undefined (see OPEN_QUESTIONS #2).</div></div></div>';
    document.getElementById('se-go').onclick = showLogin;
  }

  /* ===================== shell ===================== */
  function mountShell() {
    rootEl.innerHTML =
      '<div class="app" id="app">' +
      '<div class="brandcorner"><span class="mark">S</span><span class="name">SALMON</span><button class="collapse" id="collapse" title="Collapse">⇤</button></div>' +
      '<div class="topbar" id="topbar"></div>' +
      '<nav class="sidebar" id="sidebar"></nav>' +
      '<div class="main"><div class="maininner" id="main"></div><div class="appfooter" id="footer"></div></div>' +
      '</div>';
    document.getElementById('collapse').onclick = function () { document.getElementById('app').classList.toggle('collapsed'); };
    renderTopbar(); renderSidebar(); renderMain(); renderFooter();
  }

  function renderTopbar() {
    var tb = document.getElementById('topbar'); if (!tb) return;
    var res = Router.resolve(location.hash);
    var crumbs = Router.breadcrumbFor(App.role, res, Dashboards.TITLES[App.role]);
    var bc = crumbs.map(function (c, i) { return (i ? '<span class="sep">›</span>' : '') + (c.cur ? '<span class="cur">' + C.esc(c.label) + '</span>' : '<a href="' + (c.route || '#') + '">' + C.esc(c.label) + '</a>'); }).join('');
    var unread = CRM.notifications.filter(function (n) { return n.unread; }).length;
    var s = staff();
    tb.innerHTML =
      '<div class="breadcrumb">' + bc + '</div><span class="spacer"></span>' +
      '<button class="searchbtn" id="searchbtn">🔎 <span>Search…</span><kbd>⌘K</kbd></button>' +
      '<span id="devmount"></span>' +
      '<button class="icobtn" id="bell">🔔' + (unread ? '<span class="badge">' + unread + '</span>' : '') + '</button>' +
      '<div class="user" id="user"><span class="avatar">' + s.initials + '</span><span class="who"><span class="nm">' + C.esc(s.name) + '</span><span class="rl">' + Perm.ROLE_LABEL[App.role] + '</span></span></div>';
    document.getElementById('devmount').appendChild(DevToolbar.render({
      role: App.role, state: App.state,
      onRole: function (r) { App.role = r; try { localStorage.setItem('crm_role', r); } catch (e) {} renderTopbar(); renderSidebar(); renderMain(); renderFooter(); },
      onState: function (st) { App.state = st; renderMain(); },
      onReset: function () { C.toast({ type: 'info', title: 'Mock data reset', text: 'Queues restored to seed.' }); renderMain(); }
    }));
    document.getElementById('searchbtn').onclick = openSearch;
    document.getElementById('bell').onclick = function (e) { e.stopPropagation(); toggleNotif(); };
    document.getElementById('user').onclick = function (e) { e.stopPropagation(); toggleProfile(); };
  }

  function renderSidebar() {
    var sb = document.getElementById('sidebar'); if (!sb) return;
    var groups = Router.getSidebarFor(App.role);
    var cur = Router.resolve(location.hash);
    var curId = cur.kind === 'dashboard' ? 'dashboard' : cur.id;
    sb.innerHTML = groups.map(function (g) {
      return '<div class="navgroup"><div class="gl">' + C.esc(g.title) + '</div>' + g.items.map(function (it) {
        return '<a class="navitem' + (it.id === curId ? ' active' : '') + '" href="' + it.route + '"><span class="ic">' + it.icon + '</span><span class="lb">' + C.esc(it.label) + '</span>' + (it.count ? '<span class="count">' + it.count + '</span>' : '') + '</a>';
      }).join('') + '</div>';
    }).join('');
  }

  function renderFooter() {
    var ft = document.getElementById('footer'); if (!ft) return;
    var s = staff();
    ft.innerHTML = '<b style="color:var(--ink-2)">' + C.esc(s.name) + '</b> · ' + Perm.ROLE_LABEL[App.role] + ' · ' + s.office + '<span class="spacer" style="flex:1"></span><span>Salmon Admin · Part 1 prototype</span>';
  }

  function renderMain() {
    if (!App.authed) return;
    var main = document.getElementById('main'); if (!main) return;
    renderTopbar(); renderSidebar();
    var res = Router.resolve(location.hash);

    if (res.kind === 'session') { showSessionExpired(); return; }
    if (res.kind === 'denied') { main.innerHTML = deniedPanel('this page', ''); wireDenied(main); return; }
    if (res.kind === 'dashboard') { Dashboards.render(App.role, App.state, main, { staff: staff() }); return; }

    // module route — gate entry
    if (!Perm.can(App.role, res.nav.perm)) {
      Audit.audit({ actor: staff(), action: 'ACCESS_DENIED', target: res.nav.label });
      main.innerHTML = deniedPanel(res.nav.label, res.nav.perm); wireDenied(main); return;
    }
    // built modules — hand off to their screen files (carry the selected role across)
    var MODULE_ENTRY = { people: 'screens/B02-approval-queue.html', catalogue: 'screens/E01-projects-list.html', pipeline: 'screens/F01-leads-list.html', finance: 'screens/I01-webhook-queue.html', documents: 'screens/N01-document-repository.html', communications: 'screens/O01-ticket-inbox.html', reporting: 'screens/Q01-reports-hub.html', audit: 'screens/S01-audit-log.html', users: 'screens/T01-staff-users.html', settings: 'screens/U01-config-home.html' };
    if (MODULE_ENTRY[res.id]) {
      try { localStorage.setItem('crm_role', App.role); } catch (e) {}
      location.href = MODULE_ENTRY[res.id];
      return;
    }

    // not-yet-built modules → stub
    main.innerHTML = C.PageHeader({ title: res.nav.label, sub: 'Module · gated to ' + Perm.CAN[res.nav.perm].map(function (r) { return Perm.ROLE_LABEL[r]; }).join(', ') }) +
      '<div class="stub"><div class="tag">Coming in Part ' + (res.nav.part || 2) + '</div><h2>' + C.esc(res.nav.label) + '</h2><p>This module is stubbed in Part 1. The shell, navigation, and permission gate are live — the module content ships in a later part.</p></div>';
  }

  function deniedPanel(what, perm) {
    return '<div class="authwrap" style="min-height:auto;padding:40px 0"><div class="authcard denied" style="text-align:center">' +
      '<div class="mark" style="margin:0 auto 14px">⛔</div><h1>Access denied</h1>' +
      '<p>Your role — <b>' + Perm.ROLE_LABEL[App.role] + '</b> — cannot open <b>' + C.esc(what) + '</b>.' + (perm ? ' Required permission: <span class="mono">' + perm + '</span>.' : '') + '<br>Permissions are enforced server-side; this isn’t a UI glitch.</p>' +
      '<button class="btn primary" id="back-dash" style="width:auto;margin:4px auto 0">Back to dashboard</button></div></div>';
  }
  function wireDenied(main) { var b = main.querySelector('#back-dash'); if (b) b.onclick = function () { location.hash = '#/dashboard'; }; }

  /* ===================== ⌘K global search (A09) ===================== */
  var searchState = { open: false, q: '', sel: 0, results: [] };
  function openSearch() {
    if (searchState.open) return; searchState.open = true; searchState.q = ''; searchState.sel = 0;
    var scrim = C.el('<div class="scrim" id="cmdk"><div class="cmdk"><div class="in">🔎 <input id="cmdk-in" placeholder="Search partners, clients, projects, units, leads, tickets…"></div><div class="res" id="cmdk-res"></div><div class="foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span></div></div></div>');
    scrim.addEventListener('click', function (e) { if (e.target === scrim) closeSearch(); });
    document.body.appendChild(scrim);
    var input = document.getElementById('cmdk-in'); input.focus();
    input.addEventListener('input', function () { searchState.q = input.value; searchState.sel = 0; runSearch(); });
    document.addEventListener('keydown', searchKeys);
    runSearch();
  }
  function runSearch() {
    var q = searchState.q.toLowerCase().trim();
    var rows = CRM.searchIndex.filter(function (r) { return !q || (r.title + ' ' + r.sub + ' ' + r.type).toLowerCase().indexOf(q) > -1; });
    searchState.results = rows;
    var res = document.getElementById('cmdk-res'); if (!res) return;
    if (!rows.length) { res.innerHTML = '<div class="empty">No matches for “' + C.esc(searchState.q) + '”.</div>'; return; }
    var groups = {}; rows.forEach(function (r) { (groups[r.type] = groups[r.type] || []).push(r); });
    var idx = 0, html = '';
    Object.keys(groups).forEach(function (type) {
      html += '<div class="grp">' + type + 's</div>';
      groups[type].forEach(function (r) { var i = idx++; html += '<div class="r' + (i === searchState.sel ? ' sel' : '') + '" data-i="' + i + '"><span class="ic">' + r.icon + '</span><div><div class="t">' + C.esc(r.title) + '</div><div class="s">' + C.esc(r.sub) + '</div></div></div>'; });
    });
    res.innerHTML = html;
    Array.prototype.forEach.call(res.querySelectorAll('.r'), function (el) { el.onclick = function () { openResult(+el.getAttribute('data-i')); }; });
  }
  function searchKeys(e) {
    if (!searchState.open) return;
    if (e.key === 'Escape') { closeSearch(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); searchState.sel = Math.min(searchState.results.length - 1, searchState.sel + 1); runSearch(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); searchState.sel = Math.max(0, searchState.sel - 1); runSearch(); }
    else if (e.key === 'Enter') { e.preventDefault(); openResult(searchState.sel); }
  }
  function openResult(i) { var r = searchState.results[i]; if (!r) return; closeSearch(); location.hash = r.link; }
  function closeSearch() { searchState.open = false; var s = document.getElementById('cmdk'); if (s) s.remove(); document.removeEventListener('keydown', searchKeys); }

  /* ===================== notifications (A10) ===================== */
  function toggleNotif() {
    if (closePops()) return;
    var groups = {}; CRM.notifications.forEach(function (n) { (groups[n.cat] = groups[n.cat] || []).push(n); });
    var body = Object.keys(groups).map(function (cat) {
      return '<div class="ng">' + (CRM.NOTIF_CAT[cat] || cat) + '</div>' + groups[cat].map(function (n) {
        return '<div class="nrow ' + (n.unread ? 'unread' : 'read') + '" data-link="' + n.link + '" data-id="' + n.id + '"><span class="dot"></span><div><div class="tx">' + C.esc(n.text) + '</div><div class="tm">' + C.fmt.ago(n.t) + '</div></div></div>';
      }).join('');
    }).join('');
    var pop = C.el('<div class="pop notif" id="_pop"><div class="nh"><h4>Notifications</h4><button class="btn sm ghost" id="mark">Mark all read</button></div><div class="nbody">' + body + '</div></div>');
    place(pop, document.getElementById('bell'));
    pop.querySelector('#mark').onclick = function () { CRM.notifications.forEach(function (n) { n.unread = false; }); closePops(); renderTopbar(); };
    Array.prototype.forEach.call(pop.querySelectorAll('.nrow'), function (el) { el.onclick = function () { var id = el.getAttribute('data-id'); CRM.notifications.forEach(function (n) { if (n.id === id) n.unread = false; }); closePops(); renderTopbar(); location.hash = el.getAttribute('data-link'); }; });
  }

  /* ===================== profile menu (A11) ===================== */
  function toggleProfile() {
    if (closePops()) return;
    var s = staff();
    var pop = C.el('<div class="pop menu" id="_pop"><div class="mhead"><div class="nm">' + C.esc(s.name) + '</div><div class="rl">' + Perm.ROLE_LABEL[App.role] + ' · ' + s.office + '</div></div><div class="msep"></div>' +
      '<div class="mi" data-a="account">👤 My account</div><div class="mi" data-a="prefs">⚙ Preferences</div><div class="msep"></div>' +
      '<div class="mi" data-a="expire">⏲ Simulate session expiry</div><div class="mi danger" data-a="logout">⇤ Log out</div></div>');
    place(pop, document.getElementById('user'));
    pop.querySelectorAll('.mi').forEach(function (mi) {
      mi.onclick = function () { var a = mi.getAttribute('data-a'); closePops();
        if (a === 'logout') { Audit.audit({ actor: s, action: 'SIGN_OUT', target: 'admin console' }); showLogin(); }
        else if (a === 'expire') { showSessionExpired(); }
        else C.toast({ type: 'info', title: a === 'account' ? 'My account' : 'Preferences', text: 'Opens in a later part.' });
      };
    });
  }

  /* ===================== popover placement ===================== */
  function place(pop, anchor) {
    document.body.appendChild(pop);
    var r = anchor.getBoundingClientRect(); var w = pop.offsetWidth;
    pop.style.top = (r.bottom + 6) + 'px';
    pop.style.left = Math.max(8, Math.min(r.right - w, window.innerWidth - w - 10)) + 'px';
    setTimeout(function () { document.addEventListener('mousedown', popOutside); }, 0);
  }
  function popOutside(e) { var p = document.getElementById('_pop'); if (p && !p.contains(e.target)) closePops(); }
  function closePops() { var p = document.getElementById('_pop'); if (p) { p.remove(); document.removeEventListener('mousedown', popOutside); return true; } return false; }

  /* ===================== boot ===================== */
  function init() {
    rootEl = document.getElementById('root');
    Audit.seed(CRM.auditSeed);
    window.addEventListener('hashchange', function () { if (App.authed) renderMain(); });
    document.addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (App.authed) openSearch(); } });
    document.addEventListener('devstate', function (e) { App.state = e.detail; renderMain(); });
    // returning from a built module (screens/*.html) should NOT force a re-login
    var wasAuthed = false; try { wasAuthed = sessionStorage.getItem('crm_authed') === '1'; } catch (e) {}
    if (wasAuthed) {
      App.authed = true;
      mountShell();
      if (!location.hash || location.hash === '#/login') location.hash = '#/dashboard';
      else renderMain();
    } else {
      showLogin();
    }
  }

  document.addEventListener('DOMContentLoaded', init);
  root.App = App;
})(window);
