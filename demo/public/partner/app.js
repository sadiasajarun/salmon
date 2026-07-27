/* ============================================================================
 * Salmon Live Demo — Partner mobile app (Sales Partner ↔ Admin).
 * Same store, same SSE bus, same event feed as the client app. The "logged-in"
 * partner is driven by server session (actor switcher in the shell). Admin
 * actions ripple back here live: approval, commission, settlement, all no-refresh.
 * ==========================================================================*/
(function () {
  'use strict';

  var E = Salmon.esc, BDT = Salmon.bdt, BDTS = Salmon.bdtShort;
  var view = document.getElementById('view');

  var DB = null, CFG = null;
  var me = null;          // current partner (or null)
  var _pendingAttach = null; // Req 6.16 — pending ticket attachment filename
  var applicantId = null; // pending application id (registration flow)
  var nav = { screen: 'welcome', params: {} };
  var otpVerified = false;
  var lang = 'en';        // dashboard is Bengali-capable; toggle in the header
  var online = true;      // SSE connection state — money actions are never optimistic
  var dashPeriod = null;  // selected target period on the dashboard

  // ---- dashboard strings (externalised, Bengali-first verified) -----------
  var STR = {
    en: {
      approved: 'Approved · ready', verifiedSales: 'verified sales', pending: 'Pending', settled: 'Settled', returns: 'Returns',
      requestSettlement: 'Request settlement', emptyHero: 'Your approved earnings will appear here',
      target: 'Target', noTarget: 'No target set for this period', convertedLeads: 'converted leads', daysLeft: 'days left', periodClosed: 'period closed',
      leads: 'leads', meetings: 'meetings', tasks: 'tasks', tickets: 'tickets', training: 'training items',
      quickActions: 'Quick actions', aLead: 'Lead', booking: 'Booking', meeting: 'Meeting', visits: 'Visits', salesKit: 'Sales kit', support: 'Support', settle: 'Settle',
      recent: 'Recent activity', updates: 'updates', offline: 'Offline — figures may be out of date', settleOffline: 'Reconnect to request a settlement', recorded: 'Recorded',
      zeroTitle: 'Zero Investment · Commission', withTitle: 'With Investment', approvedCommission: 'Approved commission', recordedInvestment: 'Recorded investment', salesVolume: 'sales volume', returnPaid: 'Return paid', returnPending: 'Return pending', investEmpty: 'Your investment & return records will appear here', investNow: 'Interest to invest', investment: 'Investment',
      myTeam: 'My team', members: 'members', assignTasks: 'roster · assign tasks'
    },
    bn: {
      approved: 'অনুমোদিত · প্রস্তুত', verifiedSales: 'যাচাইকৃত বিক্রি', pending: 'বকেয়া', settled: 'পরিশোধিত', returns: 'রিটার্ন',
      requestSettlement: 'সেটেলমেন্ট অনুরোধ', emptyHero: 'আপনার অনুমোদিত আয় এখানে দেখা যাবে',
      target: 'লক্ষ্য', noTarget: 'এই সময়ের জন্য কোনো লক্ষ্য নির্ধারিত নেই', convertedLeads: 'রূপান্তরিত লিড', daysLeft: 'দিন বাকি', periodClosed: 'সময়কাল শেষ',
      leads: 'লিড', meetings: 'মিটিং', tasks: 'টাস্ক', tickets: 'টিকিট', training: 'ট্রেনিং আইটেম',
      quickActions: 'দ্রুত অ্যাকশন', aLead: 'লিড', booking: 'বুকিং', meeting: 'মিটিং', visits: 'ভিজিট', salesKit: 'সেলস কিট', support: 'সাপোর্ট', settle: 'সেটেল',
      recent: 'সাম্প্রতিক কার্যক্রম', updates: 'আপডেট', offline: 'অফলাইন — তথ্য পুরনো হতে পারে', settleOffline: 'সেটেলমেন্টের জন্য পুনরায় সংযোগ দিন', recorded: 'রেকর্ডকৃত',
      zeroTitle: 'জিরো ইনভেস্টমেন্ট · কমিশন', withTitle: 'উইথ ইনভেস্টমেন্ট', approvedCommission: 'অনুমোদিত কমিশন', recordedInvestment: 'রেকর্ডকৃত বিনিয়োগ', salesVolume: 'বিক্রির পরিমাণ', returnPaid: 'পরিশোধিত রিটার্ন', returnPending: 'বকেয়া রিটার্ন', investEmpty: 'আপনার বিনিয়োগ ও রিটার্ন রেকর্ড এখানে দেখাবে', investNow: 'বিনিয়োগে আগ্রহ', investment: 'বিনিয়োগ',
      myTeam: 'আমার টিম', members: 'সদস্য', assignTasks: 'রোস্টার · টাস্ক দিন'
    }
  };
  function T(k) { return (STR[lang] && STR[lang][k]) || STR.en[k] || k; }

  var I = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 18l-6-6 6-6"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9.5 12 3l9 6.5V21H3z"/></svg>',
    leads: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3.1a4 4 0 0 1 0 7.8M22 21a6 6 0 0 0-9-5.2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M2 21a7 7 0 0 1 14 0"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M20 6 9 17l-5-5"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M16 13h2M3 10h18"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>',
    team: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5a3 3 0 0 1 0 6M18 20a6 6 0 0 0-3-5"/></svg>',
    invest: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m7 14 3-3 3 3 5-6"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7M12 17h.01"/></svg>',
    card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
    dl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></svg>',
    qr: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h6v6H3zm2 2v2h2V5zM15 3h6v6h-6zm2 2v2h2V5zM3 15h6v6H3zm2 2v2h2v-2zM13 13h3v3h-3zm5 0h3v3h-3v3h-3v-3h3zm0 5h3v3h-3z"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>',
    scale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M7 21h10M5 7h14l-3 6a3 3 0 0 1-8 0z"/></svg>'
  };

  Salmon.toast.mount(document.getElementById('toastHost'));

  function refresh() {
    // 'partner' scope → the server returns leads already passed through
    // partnerView(): the six-state projection, internal fields stripped.
    return Promise.all([Salmon.state('partner'), Salmon.config()]).then(function (r) {
      DB = r[0]; CFG = r[1];
      me = DB.session.partnerId ? DB.partners.find(function (p) { return p.id === DB.session.partnerId; }) : null;
      applicantId = DB.session.applicantId || null;
      return DB;
    });
  }

  refresh().then(function () {
    if (me) nav = { screen: 'dashboard', params: {} };
    else if (applicantId) nav = wallScreenFor(applicantId);
    render();
    Salmon.connect();
  });

  Salmon.onStatus(function (up) { online = up; if (nav.screen === 'dashboard') render(); });

  function wallScreenFor(appId) {
    var a = DB.applications.find(function (x) { return x.id === appId; });
    if (!a) return { screen: 'welcome', params: {} };
    if (a.status === 'rejected') return { screen: 'rejected', params: { appId: appId } };
    if (a.status === 'approved') return { screen: 'dashboard', params: {} };
    return { screen: 'wall', params: { appId: appId } };
  }

  // ---- live wire ----------------------------------------------------------
  Salmon.on('partner.approved', function (m) {
    refresh().then(function () {
      if (applicantId && m.data.application.id === applicantId) {
        me = DB.partners.find(function (p) { return p.id === m.data.partner.id; });
        nav = { screen: 'approved', params: { partnerId: m.data.partner.id } };
      }
      render();
    });
  });
  Salmon.on('partner.rejected', function (m) {
    refresh().then(function () {
      if (applicantId && m.data.application.id === applicantId) {
        nav = { screen: 'rejected', params: { appId: applicantId } };
      }
      render();
    });
  });
  Salmon.on('commission.approved', function (m) {
    refresh().then(function () {
      if (me && m.data.partnerId === me.id) {
        var c = m.data.commission;
        // modest celebration — earned money, traceable to the deal
        Salmon.toast.show('🎉 Commission approved: ' + BDT(c.amountBdt), c.prospectName ? ('for ' + c.prospectName + (c.projectName ? ' · ' + c.projectName : '')) : (c.category || 'Special commission') + ' credited.');
        if (nav.screen === 'dashboard') { render(); bumpHero(); return; }
      }
      render();
    });
  });
  Salmon.on('commission.corrected', function (m) {
    refresh().then(function () { if (me && m.data.partnerId === me.id) Salmon.toast.show('Commission corrected', BDT(m.data.commission.amountBdt) + ' — ' + (m.data.commission.events[0] ? m.data.commission.events[0].detail : ''), { warn: true }); render(); });
  });
  Salmon.on('commission.reversed', function (m) {
    refresh().then(function () { if (me && m.data.partnerId === me.id) Salmon.toast.show('Commission reversed', m.data.commission.reversalReason || '', { warn: true, ttl: 6000 }); render(); });
  });
  Salmon.on('settlement.approved', function (m) {
    refresh().then(function () { if (me && m.data.partnerId === me.id) Salmon.toast.show('Settlement approved', BDT(m.data.settlement.amountBdt) + ' — awaiting payment.'); render(); });
  });
  Salmon.on('settlement.settled', function (m) {
    refresh().then(function () { if (me && m.data.partnerId === me.id) Salmon.toast.show('Settled ' + BDT(m.data.settlement.amountBdt), 'reference ' + m.data.settlement.reference + '.'); render(); });
  });
  Salmon.on('lead.converted', function (m) {
    refresh().then(function () { if (me && m.data.lead.partnerId === me.id) Salmon.toast.show('Lead converted!', m.data.lead.prospectName + ' — commission pending finance.'); render(); });
  });
  Salmon.on('meeting.confirmed', function (m) {
    refresh().then(function () { if (me && m.data.partnerId === me.id) Salmon.toast.show('Meeting confirmed', m.data.meeting.time + ' · link ready.'); render(); });
  });
  Salmon.on('ticket.replied', function (m) {
    refresh().then(function () { if (me && m.data.partnerId === me.id) { var t = m.data.ticket; Salmon.toast.show(t.status === 'resolved' ? 'Ticket resolved' : 'Support replied', t.subject); } render(); });
  });
  Salmon.on('ticket.updated', function (m) {
    refresh().then(function () { if (me && m.data.ticket && m.data.ticket.partnerId === me.id && m.data.source === 'partner') Salmon.toast.show('Ticket updated', (m.data.ticket.subject || '') + ' · ' + (m.data.ticket.status || '').replace('_', ' ')); render(); });
  });
  Salmon.on('construction.published', function (m) {
    refresh().then(function () { Salmon.toast.show('New construction update', (m.data.update && m.data.update.stage) || ''); render(); });
  });
  Salmon.on('doc.published', function (m) {
    refresh().then(function () { if (m.data && m.data.side === 'partner') { Salmon.toast.show('New sales-support document', m.data.document ? m.data.document.name : ''); } render(); });
  });
  Salmon.on('doc.classified', function (m) { refresh().then(render); });
  Salmon.on('task.assigned', function (m) {
    refresh().then(function () {
      var mine = (m.data.tasks || []).filter(function (t) { return me && t.assigneePartnerId === me.id; });
      if (mine.length) Salmon.toast.show('New task from ' + mine[0].assignedBy, mine[0].title);
      if (['tasks', 'dashboard', 'tl-queue'].indexOf(nav.screen) >= 0) render();
    });
  });
  Salmon.on('task.cancelled', function (m) {
    refresh().then(function () { if (me && m.data.task.assigneePartnerId === me.id) Salmon.toast.show('Task cancelled', m.data.task.title, { warn: true }); if (['tasks', 'dashboard'].indexOf(nav.screen) >= 0) render(); });
  });
  Salmon.on('task.overdue', function (m) {
    refresh().then(function () { if (['tasks', 'dashboard'].indexOf(nav.screen) >= 0) render(); });
  });
  Salmon.on('task.completed', function (m) {
    refresh().then(function () { if (['tasks', 'dashboard', 'tl-queue'].indexOf(nav.screen) >= 0) render(); });
  });
  Salmon.on('task.status', function (m) {
    refresh().then(function () {
      var t = m.data.task;
      if (me && t.assigneePartnerId === me.id && m.data.to === 'complete') Salmon.toast.show('Task marked complete', t.title);
      if (['tasks', 'task', 'dashboard', 'tl-queue', 'tl-tasks'].indexOf(nav.screen) >= 0) render();
    });
  });
  Salmon.on('target.updated', function (m) {
    refresh().then(function () {
      var t = m.data.target;
      if (me && t.partnerId === me.id) Salmon.toast.show('Target updated', t.targetValue + ' converted leads (' + t.period + ')');
      if (['targets', 'dashboard'].indexOf(nav.screen) >= 0) render();
    });
  });
  // Program participation ripple (Req 6.3.3) — admin activate / suspend / close.
  Salmon.on('program.participation', function (m) {
    refresh().then(function () {
      if (me && m.data.partnerId === me.id) {
        var nm = m.data.program === 'with' ? 'With Investment' : 'Zero Investment';
        var word = { active: 'activated', suspended: 'suspended', closed: 'closed' }[m.data.to] || m.data.to;
        Salmon.toast.show(nm + ' ' + word, 'Your enrolment status was updated by Salmon.', m.data.to === 'active' ? {} : { warn: true });
      }
      if (['enrolment', 'dashboard', 'investment', 'profile'].indexOf(nav.screen) >= 0) render();
    });
  });
  Salmon.on('program.enrol', function (m) {
    refresh().then(function () { if (me && m.data.partnerId === me.id && ['enrolment', 'dashboard'].indexOf(nav.screen) >= 0) render(); });
  });
  Salmon.on('partner.session', function () { refresh().then(function () { nav = me ? { screen: 'dashboard', params: {} } : (applicantId ? wallScreenFor(applicantId) : { screen: 'welcome', params: {} }); otpVerified = false; render(); }); });
  Salmon.on('demo.reset', function () { location.reload(); });

  Salmon.onAny(function (m) {
    if (['partner.approved', 'partner.rejected', 'commission.approved', 'settlement.approved', 'settlement.settled', 'lead.converted', 'meeting.confirmed', 'ticket.replied', 'ticket.updated', 'construction.published', 'doc.published', 'doc.classified', 'partner.session', 'demo.reset', 'program.participation', 'program.enrol'].indexOf(m.type) >= 0) return;
    refresh().then(function () { if (['dashboard', 'leads', 'lead', 'settlements', 'notifications', 'team', 'meetings', 'support', 'ticket'].indexOf(nav.screen) >= 0) render(); });
  });

  // feed-row highlight from the shell
  window.addEventListener('message', function (ev) {
    var ref = ev.data && ev.data.salmonHighlight;
    if (!ref) return;
    var el = document.querySelector('[data-ref="' + ref + '"]');
    if (el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  });

  function bumpHero() { var h = document.getElementById('heroVal'); if (h) { h.classList.remove('bump'); void h.offsetWidth; h.classList.add('bump'); } }

  // ---- nav ----------------------------------------------------------------
  function go(screen, params) { nav = { screen: screen, params: params || {} }; window.scrollTo(0, 0); render(); }
  // partners only ever see their OWN notifications (pid) or genuinely global ones (no pid)
  function myNotes() { return (DB.notifications.partner || []).filter(function (n) { return !n.pid || (me && n.pid === me.id); }); }
  function unread() { return myNotes().filter(function (n) { return !n.read; }).length; }

  function appbar(title, opts) {
    opts = opts || {};
    var left = opts.back ? '<button class="iconbtn" data-act="back" data-to="' + (opts.to || '') + '">' + I.back + '</button>' : '<div style="width:38px"></div>';
    var bell = opts.noBell ? '' : '<button class="iconbtn bell" data-act="notifs">' + I.bell + (unread() ? '<span class="badge">' + unread() + '</span>' : '') + '</button>';
    return '<div class="appbar">' + left + '<div class="title">' + E(title) + '</div>' + bell + '</div>';
  }
  function tabbar(active) {
    function t(id, label, icon) { return '<button class="' + (active === id ? 'on' : '') + '" data-tab="' + id + '">' + icon + '<span>' + label + '</span></button>'; }
    // With-only partners do no lead work — their middle tab is Investment instead of Leads
    var withOnly = me && me.program === 'with';
    var mid = withOnly ? t('investment', 'Invest', I.card) : t('leads', 'Leads', I.leads);
    return '<div class="tabbar">' + t('dashboard', 'Home', I.home) + mid + t('projects', 'Projects', I.grid) + t('profile', 'Profile', I.user) + '</div>';
  }

  function render() {
    var fn = SCREENS[nav.screen] || SCREENS.welcome;
    view.innerHTML = fn(nav.params);
  }

  var SCREENS = {};

  // ---- registration + approval wall (Flow 1) ------------------------------
  SCREENS.welcome = function () {
    return '<div class="welcome"><div class="wbody">' +
      '<div class="brandwrap"><img class="brandmark" src="/shared/salmon-logo-white.svg" alt="Salmon"/></div>' +
      '<div class="kicker">Salmon Sales Partner</div>' +
      '<h1>Earn with<br/>every referral.</h1>' +
      '<p>Refer buyers to Salmon projects, track your leads, and get paid — all from your phone.</p>' +
      '<div class="wactions">' +
        '<button class="btn" data-act="go-register">Become a sales partner</button>' +
        '<button class="btn line" data-act="demo-hint">I already have an account</button>' +
      '</div></div></div>';
  };

  SCREENS.register = function () {
    return appbar('Become a partner', { back: true, to: 'welcome', noBell: true }) +
      '<div class="screen"><div class="pad">' +
        '<div class="field"><label>Full name</label><input id="r-name" value="Md. Shahin Alam"/></div>' +
        '<div class="field"><label>Phone</label>' +
          '<div class="otp-row"><input id="r-phone" value="+8801812345678"/>' +
          '<button class="btn sm" data-act="send-otp" id="otpBtn">Send OTP</button></div></div>' +
        '<div class="field" id="otpField" style="display:none"><label>Enter OTP (demo: 123456)</label>' +
          '<div class="otp-row"><input id="r-otp" placeholder="123456"/><button class="btn sm" data-act="verify-otp">Verify</button></div>' +
          '<div id="otpMsg" style="font-size:12px;margin-top:6px"></div></div>' +
        '<div class="field"><label>Email</label><input id="r-email" type="email" value="shahin.alam@gmail.com"/></div>' +
        '<div class="field"><label>NID number</label><input id="r-nid" value="1990123456789"/></div>' +
        '<div class="field"><label>Address</label><input id="r-address" value="Kandirpar, Cumilla Sadar"/></div>' +
        // Req: operating territory as configurable Division › District › Upazila/Thana › Union
        geoFieldset({ division: 'Chattogram', district: 'Cumilla', upazila: 'Cumilla Sadar', union: 'Panchthubi' }) +
        '<div class="field"><label>Program</label>' +
          '<select id="r-program"><option value="zero">Zero Investment</option><option value="both">Both programs</option><option value="with">With Investment</option></select></div>' +
        '<div class="field"><label>Referral code (optional)</label><input id="r-referral" placeholder="e.g. KARIM188"/></div>' +
        // Req 6.1.3 — FOUR distinct acceptances, none pre-ticked (not one bundled checkbox)
        '<div class="consent-group" style="margin-bottom:16px">' +
          '<label class="consent"><input type="checkbox" id="r-c-terms"/><span class="ct">I have read and accept the partner <b>Terms of Service</b>.</span></label>' +
          '<label class="consent"><input type="checkbox" id="r-c-privacy"/><span class="ct">I agree to the <b>Privacy Policy</b>.</span></label>' +
          '<label class="consent"><input type="checkbox" id="r-c-program"/><span class="ct">I have read and accept the <b>program conditions</b>.</span></label>' +
          '<label class="consent" style="background:#fbf5f7;border:1px solid #e6cdd5;border-radius:8px;padding:8px"><input type="checkbox" id="r-c-data"/><span class="ct"><b>Data-handling undertaking</b> — when I submit a customer’s information I confirm I have their permission to share it, and I will obtain that permission before every submission.</span></label>' +
        '</div>' +
        '<button class="btn primary" data-act="submit-app">Submit application</button>' +
        '<div class="spacer-24"></div>' +
      '</div></div>';
  };

  SCREENS.wall = function (p) {
    var a = DB.applications.find(function (x) { return x.id === p.appId; });
    return '<div class="result">' +
      '<div class="big-ic wait">' + I.clock + '</div>' +
      '<h2>Application received</h2>' +
      '<p>Thanks' + (a ? ', ' + firstName(a.name) : '') + '. Salmon’s partner team is reviewing your application. Applications are typically reviewed <b>within 24 hours</b>.</p>' +
      (a ? '<div class="ref">' + E(a.id) + ' · ' + E(a.territory) + ' · ' + programLabel(a.program) + '</div>' : '') +
      '<div class="wait-note" style="margin-top:22px;font-size:12px;color:var(--ink-faint)">Questions? Call the partner desk on 09610-SALMON.</div>' +
      '<div style="margin-top:24px;font-size:12px;color:var(--ink-faint)">This screen resolves the moment an admin approves — watch the right pane.</div>' +
      '</div>';
  };

  SCREENS.rejected = function (p) {
    var a = DB.applications.find(function (x) { return x.id === p.appId; });
    return '<div class="result">' +
      '<div class="big-ic fail">' + I.x + '</div>' +
      '<h2>Application not approved</h2>' +
      '<p>Unfortunately your application wasn’t approved at this time. Reason given by the reviewer:</p>' +
      '<div class="banner red" style="margin-top:16px;text-align:left" data-ref="' + E(p.appId) + '">' + I.warn + '<div><b>Reviewer’s reason</b>' + E(a ? a.reason : '') + '</div></div>' +
      '<div class="actions"><button class="btn" data-act="go-register">Re-apply with updated details</button></div>' +
      '</div>';
  };

  SCREENS.approved = function (p) {
    var partner = DB.partners.find(function (x) { return x.id === p.partnerId; }) || me;
    return '<div class="result reveal">' +
      '<div class="big-ic ok">' + I.check + '</div>' +
      '<h2>Welcome to Salmon!</h2>' +
      '<p>You’re now an approved sales partner. Your Partner ID and digital business card are ready.</p>' +
      '<div class="ref" style="font-size:15px;font-weight:800;color:var(--maroon)">' + E(partner.id) + '</div>' +
      '<div class="actions">' +
        '<button class="btn" data-act="go-card">View business card</button>' +
        '<button class="btn primary" data-act="go-dashboard">Go to dashboard</button>' +
      '</div></div>';
  };

  // ---- dashboard ----------------------------------------------------------
  SCREENS.dashboard = function () {
    if (!me) return SCREENS.welcome();
    if (!DB) return dashSkeleton();
    // ---- identity header (maroon brand) ----
    var header =
      '<div class="phead">' +
        '<div class="row between">' +
          '<div class="pmeta">' + E(me.id) + ' · ' + E(Geo.formatShort(me)) + '</div>' +
          '<div class="row" style="gap:8px">' +
            '<span class="rankchip rank-' + E(me.rank) + '">' + E(me.rank) + '</span>' +
            '<button class="langtog" data-act="lang">' + (lang === 'en' ? 'বাং' : 'EN') + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="pname">' + E(me.name) + '</div>' +
        '<div class="pprog" data-act="go-screen" data-screen="enrolment" style="cursor:pointer">' + programLabel(me.program) + ' · ' + statusWord() + ' ›</div>' +
      '</div>';

    // ---- TIER 1 — money, program-aware (Zero commission / With investment / Both) ----
    var hero = moneyBlocks();

    // ---- TIER 2 — target progress bar (selectable period, derived) ----
    var tgt = currentTarget();
    var band;
    if (tgt) {
      var ach = achievementFor(tgt);
      var pct = Math.min(100, Math.round(ach / tgt.targetValue * 100));
      band =
        '<div class="card t2">' +
          '<div class="row between" style="margin-bottom:8px">' +
            '<span class="t2h">' + T('target') + ' · ' + periodSwitcher(tgt.period) + '</span>' +
            '<span class="t2n num">' + ach + ' / ' + tgt.targetValue + '</span>' +
          '</div>' +
          '<div class="progress"><span style="width:' + pct + '%"></span></div>' +
          '<div class="t2sub">' + pct + '% · ' + (tgt.period === CFG_PERIOD() ? daysLeftInPeriod() + ' ' + T('daysLeft') : T('periodClosed')) + ' · ' + T('convertedLeads') + '</div>' +
        '</div>';
    } else {
      band = '<div class="card t2"><div class="row between"><span class="t2h">' + T('target') + '</span>' + periodSwitcher(dashPeriod || CFG_PERIOD()) + '</div><div class="t2empty">' + T('noTarget') + '</div></div>';
    }

    // program gates: leads work is Zero/Both only; investment is With/Both only
    var hasLeads = me.program === 'zero' || me.program === 'both';
    var hasInvest = me.program === 'with' || me.program === 'both';

    // ---- TIER 2 — status counts (2×2) — leads stat only when the partner does leads
    var counts =
      '<div class="statgrid">' +
        (hasLeads
          ? statcell(I.leads, myLeads().filter(function (l) { return l.status !== 'converted' && l.status !== 'rejected'; }).length, T('leads'), 'leads')
          : statcell(I.card, (me.invest && me.invest.investedBdt ? BDTS(me.invest.investedBdt) : '—'), T('investment'), 'investment')) +
        statcell(I.cal, myMeetings().length, T('meetings'), 'meetings') +
        statcell(I.check, openTaskCount(), T('tasks'), 'tasks') +
        statcell(I.help, myTickets().filter(function (t) { return t.status !== 'closed'; }).length, T('tickets'), 'support') +
      '</div>';

    // ---- quick actions — program-aware (no lead/booking/settle for With-only) ----
    var qa = [];
    if (hasLeads) { qa.push(qa2('lead-new', I.leads, T('aLead'))); qa.push(qa2('booking-record', I.doc, T('booking'))); }
    if (hasInvest) { qa.push(qa2('investment', I.card, T('investment'))); }
    qa.push(qa2('meeting-request', I.cal, T('meeting')));
    qa.push(qa2('visits', I.cal, T('visits')));
    qa.push(qa2('projects', I.grid, T('salesKit')));
    qa.push(qa2('ticket-new', I.help, T('support')));
    if (hasLeads) qa.push(qa2('settle-request', I.wallet, T('settle')));
    var actions = '<div class="qtitle">' + T('quickActions') + '</div><div class="quick6">' + qa.join('') + '</div>';

    // ---- TIER 3 — ambient (recessed, quiet, one line) ----
    var notes = myNotes();
    var updCount = Object.keys(DB.constructionUpdates || {}).reduce(function (n, k) { return n + DB.constructionUpdates[k].length; }, 0);
    var ambient =
      '<div class="ambient" data-act="notifs">' +
        '<span class="amic">' + I.bell + '</span>' +
        '<span class="amtext">' + (notes[0] ? E(notes[0].title) : T('recent')) + ' · ' + updCount + ' ' + T('updates') + ' · 2 ' + T('training') + '</span>' +
        '<span class="amchev">›</span>' +
      '</div>';

    // ---- team-lead only: entry to the Team surface (roster + assign tasks) ----
    var teamRow = me.teamLead
      ? '<div class="teamrow" data-act="go-screen" data-screen="team"><span class="tri">' + I.team + '</span>' +
          '<span class="trtext"><b>' + T('myTeam') + '</b><span class="trsub">' + (me.team ? me.team.length : 0) + ' ' + T('members') + ' · ' + T('assignTasks') + '</span></span>' +
          '<span class="amchev">›</span></div>'
      : '';

    return appbar(firstName(me.name)) +
      '<div class="screen"><div class="pad stack dash">' +
        header + hero + band + counts + teamRow + actions + ambient +
        '<div class="spacer-24"></div>' +
      '</div></div>' + tabbar('dashboard');
  };

  function schip(label, val) { return '<div class="schip"><div class="scl">' + E(label) + '</div><div class="scv">' + E(val) + '</div></div>'; }
  // Program-aware money section. Zero → commission/settlement; With → investment/return;
  // Both → both blocks, each labelled. Commission and return balances are NEVER mixed.
  function moneyBlocks() {
    var hasZero = me.program === 'zero' || me.program === 'both';
    var hasWith = me.program === 'with' || me.program === 'both';
    var both = me.program === 'both';
    var offline = online ? '' : '<div class="stale">' + I.warn + ' ' + T('offline') + '</div>';
    var out = '';
    // --- Zero Investment · Commission (verified sales → approved commission → settlement) ---
    if (hasZero) {
      var bal = me.approvedBalanceBdt || 0, hasBal = bal > 0;
      var verified = verifiedSalesBdt(), pending = pendingSettleBdt(), settledAmt = settledBdt();
      out += '<div class="hero t1">' +
        (both ? '<div class="blocklabel">' + T('zeroTitle') + '</div>' : '') +
        '<div class="row between"><span class="hl">' + (both ? T('approvedCommission') : T('approved')) + '</span>' +
          '<span class="hctx">' + T('verifiedSales') + ' ' + (verified ? BDTS(verified) : '—') + '</span></div>' +
        (hasBal ? '<div class="hv" id="heroVal">' + BDT(bal) + '</div>' : '<div class="hempty">' + T('emptyHero') + '</div>') +
        '<div class="schips">' +
          schip(T('pending'), pending ? BDTS(pending) : '—') +
          schip(T('settled'), settledAmt ? BDTS(settledAmt) : '—') +
        '</div>' +
        (online
          ? '<button class="btn hbtn" data-act="go-settle" ' + (hasBal ? '' : 'disabled') + '>' + I.wallet + ' ' + T('requestSettlement') + '</button>'
          : '<button class="btn hbtn" disabled title="' + T('settleOffline') + '">' + I.wallet + ' ' + T('requestSettlement') + '</button>') +
      '</div>';
    }
    // --- With Investment (sales volume invested → recorded investment → returns) ---
    if (hasWith) {
      var iv = me.invest || null;
      var hasInv = iv && iv.investedBdt > 0;
      out += '<div class="hero t1' + (hasZero ? ' stacked' : '') + '">' +
        (both ? '<div class="blocklabel">' + T('withTitle') + '</div>' : '') +
        '<div class="row between"><span class="hl">' + T('recordedInvestment') + '</span>' +
          '<span class="hctx">' + T('salesVolume') + ' ' + (iv && iv.salesVolumeBdt ? BDTS(iv.salesVolumeBdt) : '—') + '</span></div>' +
        (hasInv ? '<div class="hv">' + BDT(iv.investedBdt) + '</div>' : '<div class="hempty">' + T('investEmpty') + '</div>') +
        '<div class="schips">' +
          schip(T('returnPaid'), iv && iv.returnPaidBdt ? BDTS(iv.returnPaidBdt) : '—') +
          schip(T('returnPending'), iv && iv.returnPendingBdt ? BDTS(iv.returnPendingBdt) : '—') +
        '</div>' +
        (iv && iv.schedule ? '<div class="hctx" style="margin-top:8px">' + E(iv.schedule) + '</div>' : '') +
        (hasInv ? '<div class="hctx" style="margin-top:8px;cursor:pointer;color:var(--maroon);font-weight:700" data-act="go-screen" data-screen="investment">View investment &amp; return records ›</div>' : '') +
        (online ? '<button class="btn hbtn" data-act="go-invest">' + I.grid + ' ' + T('investNow') + '</button>' : '') +
      '</div>';
    }
    return out + offline;
  }
  function statcell(icon, n, label, screen) {
    return '<div class="statcell" data-act="go-screen" data-screen="' + screen + '"><span class="sti">' + icon + '</span><span class="stn num">' + n + '</span><span class="stl">' + E(label) + '</span></div>';
  }
  function qa2(screen, icon, title) { return '<div class="qa2" data-act="go-screen" data-screen="' + screen + '"><div class="qi">' + icon + '</div><div class="qt2">' + E(title) + '</div></div>'; }
  function qa(screen, icon, title, desc) {
    return '<div class="qa" data-act="go-screen" data-screen="' + screen + '"><div class="qi">' + icon + '</div><div class="qt">' + title + '</div><div class="qd">' + E(desc) + '</div></div>';
  }
  function periodSwitcher(active) {
    var periods = myTargets().map(function (t) { return t.period; });
    if (!periods.length) periods = [CFG_PERIOD()];
    // unique
    periods = periods.filter(function (p, i) { return periods.indexOf(p) === i; }).sort().reverse();
    return '<span class="pswitch">' + periods.map(function (p) {
      return '<button class="pbtn ' + (p === active ? 'on' : '') + '" data-act="dash-period" data-p="' + p + '">' + E(prettyPeriod(p)) + '</button>';
    }).join('') + '</span>';
  }
  function prettyPeriod(p) {
    var parts = String(p).split('-'); if (parts.length < 2) return p;
    var mo = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(parts[1], 10) - 1] || parts[1];
    return mo + ' ' + parts[0];
  }
  function currentTarget() {
    var per = dashPeriod || CFG_PERIOD();
    return myTargets().find(function (t) { return t.period === per; }) || null;
  }
  function statusWord() { return me.status === 'active' ? (lang === 'bn' ? 'সক্রিয়' : 'active') : E(me.status); }
  function verifiedSalesBdt() {
    // derived: sum of project starting price for each of this partner's converted leads
    return myLeads().filter(function (l) { return l.status === 'converted'; }).reduce(function (n, l) {
      var p = (DB.projects || []).find(function (x) { return x.id === l.projectId; });
      return n + (p ? p.priceFromBdt : 0);
    }, 0);
  }
  function pendingSettleBdt() { return mySettlements().filter(function (s) { return s.status === 'requested' || s.status === 'approved_awaiting_payment'; }).reduce(function (n, s) { return n + s.amountBdt; }, 0); }
  function settledBdt() { return mySettlements().filter(function (s) { return s.status === 'settled'; }).reduce(function (n, s) { return n + s.amountBdt; }, 0); }
  function dashSkeleton() {
    return appbar('…') + '<div class="screen"><div class="pad stack">' +
      '<div class="sk sk-hero"></div><div class="sk sk-band"></div><div class="sk sk-grid"></div><div class="sk sk-actions"></div></div></div>' + tabbar('dashboard');
  }

  // ---- projects / sales kit (Flow 2) --------------------------------------
  // Req: partners browse + filter by type, location, construction status, availability
  var projFilters = { category: '', location: '', status: '', avail: '' };
  var projView = 'list'; // 'list' | 'map' — mirrors the client Explore toggle
  function cityOf(loc) { var parts = String(loc || '').split(','); return parts[parts.length - 1].trim() || (loc || ''); }
  // interactive cluster map (no map library) — one pin per project; tap → detail
  function projMap(shown) {
    if (!shown.length) return '<div class="center-note">No projects match these filters.</div>';
    var pins = shown.map(function (p, i) {
      var top = 12 + ((i * 41 + 7) % 64), left = 7 + ((i * 57 + 11) % 66);
      return '<button class="mappin" data-act="project" data-id="' + p.id + '" style="top:' + top + '%;left:' + left + '%" title="' + E(p.name) + ' · ' + E(p.location) + '">' +
        '<span class="mp-dot ' + (p.status || 'upcoming') + '"></span>' + E(p.name) + '</button>';
    }).join('');
    return '<div class="pmap">' + pins + '<div class="pmap-note">Tap a project pin to open it</div></div>' +
      '<div class="mlegend"><span><i class="ld ongoing"></i>Ongoing</span><span><i class="ld completed"></i>Completed</span><span><i class="ld upcoming"></i>Upcoming</span></div>';
  }
  function projOpts(vals, sel) { return '<option value="">All</option>' + vals.map(function (v) { return '<option value="' + E(v) + '"' + (v === sel ? ' selected' : '') + '>' + E(v) + '</option>'; }).join(''); }
  function uniq(arr) { return arr.filter(function (v, i) { return v && arr.indexOf(v) === i; }); }
  SCREENS.projects = function () {
    var live = DB.projects.filter(function (p) { return p.published !== false; });
    var cats = uniq(live.map(function (p) { return p.category || 'Apartment / Flat'; }));
    var cities = uniq(live.map(function (p) { return cityOf(p.location); }));
    var shown = live.filter(function (p) {
      var avail = (p.units || []).filter(function (u) { return u.status === 'available'; }).length;
      if (projFilters.category && (p.category || 'Apartment / Flat') !== projFilters.category) return false;
      if (projFilters.location && cityOf(p.location) !== projFilters.location) return false;
      if (projFilters.status && p.status !== projFilters.status) return false;
      if (projFilters.avail === 'yes' && avail === 0) return false;
      return true;
    });
    var statusLabel = { ongoing: 'Under construction', completed: 'Ready / Completed', upcoming: 'Upcoming' };
    var statusOpts = '<option value="">Any status</option>' + ['ongoing', 'completed', 'upcoming'].map(function (s) { return '<option value="' + s + '"' + (s === projFilters.status ? ' selected' : '') + '>' + statusLabel[s] + '</option>'; }).join('');
    var filters = '<div class="projfilters">' +
      '<select data-projfilter="category">' + projOpts(cats, projFilters.category) + '</select>' +
      '<select data-projfilter="location">' + projOpts(cities, projFilters.location) + '</select>' +
      '<select data-projfilter="status">' + statusOpts + '</select>' +
      '<select data-projfilter="avail"><option value="">Any availability</option><option value="yes"' + (projFilters.avail === 'yes' ? ' selected' : '') + '>Has available units</option></select>' +
      '</div>';
    var toggle = '<div class="projview-toggle">' +
      '<button data-act="projview" data-view="map" class="' + (projView === 'map' ? 'on' : '') + '">' + I.grid + ' Map</button>' +
      '<button data-act="projview" data-view="list" class="' + (projView === 'list' ? 'on' : '') + '">' + I.doc + ' List</button>' +
      '</div>';
    var listBody = shown.length ? shown.map(function (p) {
      var avail = (p.units || []).filter(function (u) { return u.status === 'available'; }).length;
      return '<div class="card" data-act="project" data-id="' + p.id + '" style="cursor:pointer;margin-bottom:14px">' +
        '<img class="hero-img" src="' + E(p.banner) + '" onerror="this.style.opacity=0"/>' +
        '<div class="pad"><div class="row between"><div style="font-weight:800;font-size:17px">' + E(p.name) + '</div>' + statusPill(p) + '</div>' +
        '<div class="muted" style="font-size:12px;margin-top:2px">' + E(p.category || 'Apartment / Flat') + ' · ' + E(p.location) + '</div>' +
        '<div class="row between" style="margin-top:12px"><div><div class="muted" style="font-size:11px">From</div><div style="font-weight:800">' + BDTS(p.priceFromBdt) + '</div></div>' +
        '<div style="text-align:right"><div class="muted" style="font-size:11px">Available</div><div style="font-weight:800">' + avail + ' units</div></div></div></div></div>';
    }).join('') : '<div class="center-note">No projects match these filters.</div>';
    return appbar('Projects') +
      '<div class="screen"><div class="pad">' +
        '<p class="eyebrow">Sales kit</p>' +
        '<div class="row between" style="margin:2px 0 12px"><h1 class="big">Salmon projects</h1>' + toggle + '</div>' +
        filters +
        '<div class="muted" style="font-size:12px;margin:2px 0 12px">' + shown.length + ' of ' + live.length + ' project(s)</div>' +
        (projView === 'map' ? projMap(shown) : listBody) +
      '</div></div>' + tabbar('projects');
  };

  SCREENS.project = function (p) {
    var proj = DB.projects.find(function (x) { return x.id === p.id; });
    if (!proj) return SCREENS.projects();
    var g = proj.glance;
    var updates = (DB.constructionUpdates && DB.constructionUpdates[proj.id]) || [];
    return appbar(proj.name, { back: true, to: 'projects' }) +
      '<div class="screen">' +
        '<img class="hero-img" src="' + E(proj.banner) + '" onerror="this.style.opacity=0"/>' +
        '<div class="pad stack">' +
          '<div><p class="eyebrow">' + E(proj.siteStatus) + '</p><h1 class="big" style="margin:2px 0">' + E(proj.name) + '</h1>' +
          '<div class="muted">' + E(proj.location) + '</div></div>' +
          '<div class="glance">' + gcell('Building', g.buildingType) + gcell('Floors', g.floors) + gcell('Unit size', g.unitSqft) + gcell('Bed / Bath', g.bed + ' / ' + g.bath) + gcell('Handover', proj.handover) + gcell('From', BDTS(proj.priceFromBdt)) + '</div>' +
          mediaSection(proj) +
          // Sales kit — the brochure is added by Salmon (admin) only. The partner
          // sees a download button ONLY when admin has published one for this project.
          '<div class="card pad"><div class="row between"><div><div style="font-weight:700">Sales kit</div><div class="muted" style="font-size:12.5px">' + ((proj.media && proj.media.brochure) ? E(proj.media.brochure.name || 'Brochure') + ' · inventory · pricing' : 'Inventory · pricing') + '</div></div>' +
            ((proj.media && proj.media.brochure)
              ? '<button class="btn sm primary" data-act="download-brochure" data-id="' + proj.id + '">' + I.dl + ' Brochure</button>'
              : '<span class="muted" style="font-size:12px">No brochure yet</span>') + '</div></div>' +
          // With-Investment / Both: register interest to purchase or invest in this project
          ((me && (me.program === 'with' || me.program === 'both'))
            ? '<button class="btn" data-act="invest-interest" data-id="' + proj.id + '">' + I.grid + ' Interest to Purchase / Invest</button>'
            : '') +
          '<div class="card"><h2 class="sec" style="margin:14px 14px 6px">Live inventory</h2>' + inventoryRows(proj) + '</div>' +
          '<div class="card pad"><h2 class="sec" style="margin:0 0 6px">Construction updates</h2>' +
            (updates.length ? updates.map(function (u) {
              return '<div class="construction" data-ref="' + E(u.id) + '"><div class="cdot"></div><div><div class="cs">' + E(u.stage) + '</div><div class="cc">' + E(u.caption) + '</div><div class="ct">' + new Date(u.date).toLocaleDateString('en-GB') + '</div></div></div>';
            }).join('') : '<div class="muted" style="font-size:13px">No updates yet.</div>') +
          '</div>' +
          partnerDocsSection(proj) +
          '<div class="spacer-24"></div>' +
        '</div></div>';
  };
  // Req 6.7.10 — partners see ONLY explicitly-published legal SUMMARIES, never
  // raw sensitive documents. Sensitive customer docs are restricted by default
  // and never partner-visible. Access is server-enforced; this mirrors it.
  function partnerDocsSection(proj) {
    var docs = (DB.documents || []).filter(function (d) {
      return d.classification === 'partnerVisible' && d.publishedToPartner && d.family === 'legal' && d.scanStatus === 'clean' && d.lifecycleStatus === 'active' && d.isCurrent && (!d.projectId || d.projectId === proj.id);
    });
    if (!docs.length) return '';
    return '<div class="card pad"><h2 class="sec" style="margin:0 0 6px">Sales-support documents</h2>' +
      '<div class="muted" style="font-size:12px;margin-bottom:8px">Published legal summaries for your sales conversations — not raw title deeds or customer records.</div>' +
      docs.map(function (d) {
        return '<div class="list-row" data-act="download-doc" data-id="' + E(d.id) + '" data-name="' + E(d.name) + '" data-ref="' + E(d.id) + '"><div><div class="lr-t">' + E(d.name) + '</div><div class="lr-s">' + E(d.projectName || 'All projects') + '</div></div><div class="lr-r"><span class="pill blue" style="height:20px"><span class="dot"></span>Open</span></div></div>';
      }).join('') + '</div>';
  }
  function inventoryRows(proj) {
    var counts = { available: 0, reserved: 0, booked: 0, sold: 0, locked: 0 };
    proj.units.forEach(function (u) { counts[u.status] = (counts[u.status] || 0) + 1; });
    // list every unit — available first, then reserved, booked, sold
    var order = { available: 0, reserved: 1, locked: 2, booked: 3, sold: 4 };
    var units = (proj.units || []).slice().sort(function (a, b) {
      var d = (order[a.status] || 9) - (order[b.status] || 9);
      return d !== 0 ? d : String(a.unitNo).localeCompare(String(b.unitNo), undefined, { numeric: true });
    });
    var list = units.length ? units.map(function (u) {
      var meta = [u.config, (u.areaSqft ? u.areaSqft + ' sqft' : ''), u.orientation].filter(Boolean).join(' · ');
      return '<div class="unitrow">' +
        '<div class="ur-l"><div class="ur-no">' + E(u.unitNo) + '</div><div class="ur-meta">' + E(meta || '—') + '</div></div>' +
        '<div class="ur-r"><div class="ur-price">' + BDTS(u.priceBdt || 0) + '</div>' + invUnitPill(u.status) + '</div>' +
        '</div>';
    }).join('') : '<div class="muted" style="font-size:12.5px;padding:8px 14px">No units listed yet.</div>';
    return '<div style="padding:4px 14px 8px">' +
        '<div class="row" style="gap:8px;flex-wrap:wrap">' +
          invChip('green', 'Available', counts.available) + invChip('violet', 'Reserved', counts.reserved) +
          invChip('blue', 'Booked', counts.booked + counts.locked) + invChip('grey', 'Sold', counts.sold) +
        '</div></div>' +
      '<div class="unitlist">' + list + '</div>' +
      '<div class="muted" style="font-size:11.5px;padding:10px 14px 14px">One source of truth — this is the same inventory the client app books from.</div>';
  }
  function invChip(c, l, n) { return '<span class="pill ' + c + '" style="height:24px"><span class="dot"></span>' + l + ' ' + n + '</span>'; }
  function invUnitPill(s) {
    var m = { available: ['green', 'Available'], reserved: ['violet', 'Reserved'], locked: ['blue', 'Locked'], booked: ['blue', 'Booked'], sold: ['grey', 'Sold'] };
    var x = m[s] || ['grey', s]; return '<span class="pill ' + x[0] + '"><span class="dot"></span>' + x[1] + '</span>';
  }

  // ---- lead loop (Flow 3) -------------------------------------------------
  SCREENS['lead-new'] = function () {
    return appbar('Submit a lead', { back: true, to: 'dashboard', noBell: true }) +
      '<div class="screen"><div class="pad">' +
        '<div class="field"><label>Interested as</label><select id="l-type"><option value="buyer">Potential buyer</option><option value="investor">Investor</option></select></div>' +
        '<div class="field"><label>Prospect name</label><input id="l-name" value="Karim Uddin"/></div>' +
        '<div class="field"><label>Phone</label><input id="l-phone" value="+8801733445566"/></div>' +
        '<div class="field"><label>Email</label><input id="l-email" type="email" placeholder="name@example.com"/></div>' +
        '<div class="field"><label>Project interest</label><select id="l-project">' +
          DB.projects.map(function (p) { return '<option value="' + p.id + '">' + E(p.name) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label>Notes</label><textarea id="l-notes" rows="3" placeholder="Anything the team should know…">Looking for a 3-bed, ready to visit this month.</textarea></div>' +
        '<label class="consent" style="margin-bottom:8px"><input type="checkbox" id="l-consent" data-act="toggle-consent"/><span class="ct">I confirm the referred person has <b>permitted their details to be shared</b> with Salmon for this enquiry.</span></label>' +
        '<div class="muted" style="font-size:12px;margin:0 4px 16px">Required by Salmon’s privacy policy — the button stays disabled until this is checked.</div>' +
        '<button class="btn primary" data-act="submit-lead" id="leadBtn" disabled>Submit lead</button>' +
        '<div class="spacer-24"></div>' +
      '</div></div>';
  };

  SCREENS['lead-sent'] = function (p) {
    return '<div class="result reveal">' +
      '<div class="big-ic ok">' + I.check + '</div>' +
      '<h2>Lead submitted</h2>' +
      '<p>Salmon’s team will follow up with your prospect. You’ll see the status update here.</p>' +
      (p.ref ? '<div class="ref">' + E(p.ref) + '</div>' : '') +
      '<div class="actions"><button class="btn primary" data-act="go-screen" data-screen="leads">View my leads</button></div></div>';
  };

  SCREENS.leads = function () {
    var leads = myLeads();
    return appbar('My leads') +
      '<div class="screen">' +
        (leads.length ? '<div class="card" style="margin:16px">' + leads.map(function (l) {
          return '<div class="list-row" data-act="lead" data-id="' + l.id + '" data-ref="' + l.id + '"><div><div class="lr-t">' + E(l.prospectName) + '</div><div class="lr-s">' + E(l.projectName) + ' · ' + timeLabel(l.createdAt) + '</div></div><div class="lr-r">' + leadPill(l) + '</div></div>';
        }).join('') + '</div>' : '<div class="center-note">No leads yet.<br/>Submit one from the dashboard.</div>') +
        '<div style="padding:0 16px"><button class="btn primary" data-act="go-screen" data-screen="lead-new">' + I.plus + ' Submit a lead</button></div>' +
      '</div>' + tabbar('leads');
  };

  SCREENS.lead = function (p) {
    var l = DB.leads.find(function (x) { return x.id === p.id; });
    if (!l) return SCREENS.leads();
    var steps = [['new', 'Submitted'], ['contacted', 'Contacted'], ['meeting_scheduled', 'Meeting scheduled'], ['meeting_done', 'Meeting done'], ['visit_scheduled', 'Visit scheduled'], ['visit_done', 'Visit done'], ['converted', 'Converted']];
    var order = steps.map(function (s) { return s[0]; });
    var curIdx = order.indexOf(l.status);
    return appbar('Lead — ' + firstName(l.prospectName), { back: true, to: 'leads' }) +
      '<div class="screen"><div class="pad stack">' +
        '<div class="row between"><h1 class="big">' + E(l.prospectName) + '</h1>' + leadPill(l) + '</div>' +
        '<div class="card pad">' +
          '<div class="kv"><span class="k">Project</span><span class="v">' + E(l.projectName) + '</span></div>' +
          '<div class="kv"><span class="k">Phone</span><span class="v">' + E(l.phone) + '</span></div>' +
          '<div class="kv"><span class="k">Reference</span><span class="v mono">' + E(l.id) + '</span></div>' +
        '</div>' +
        (l.status === 'converted' ? '<div class="banner green">' + I.check + '<div><b>Converted 🎉</b>A commission is being processed for this referral.</div></div>' : '') +
        '<div class="card pad"><h2 class="sec" style="margin:0 0 10px">Status</h2><div class="timeline">' +
          steps.map(function (s, i) {
            var reached = i <= curIdx; var isCurrent = i === curIdx;
            var at = (l.timeline.find(function (t) { return t.status === s[0]; }) || {}).at;
            return '<div class="tl ' + (reached ? 'done' : '') + (isCurrent ? ' current' : '') + '">' +
              '<div class="dot2">' + (reached ? I.check : '') + '</div>' +
              '<div><div class="tll">' + s[1] + '</div>' + (at ? '<div class="tld">' + new Date(at).toLocaleString('en-GB') + '</div>' : '<div class="tld">—</div>') + '</div></div>';
          }).join('') +
        '</div>' +
        '<div class="muted" style="font-size:11.5px;margin-top:4px">You see the simplified status only. Salmon’s internal notes stay private.</div>' +
        '</div>' +
        // partner-facing follow-up notes from Salmon (deliberately shared)
        ((l.followUps && l.followUps.length)
          ? '<div class="card pad"><h2 class="sec" style="margin:0 0 8px">Follow-up from Salmon</h2>' +
            l.followUps.slice().reverse().map(function (f) {
              return '<div class="construction" style="border-bottom:.5px solid var(--line-2)"><div class="cdot"></div><div><div class="cc">' + E(f.text) + '</div><div class="ct">' + new Date(f.at).toLocaleString('en-GB') + '</div></div></div>';
            }).join('') + '</div>'
          : '') +
        '<div class="spacer-24"></div>' +
      '</div></div>';
  };

  // ---- With-Investment: purchase / invest interest ------------------------
  SCREENS['invest-interest'] = function (p) {
    var pre = p && p.projectId ? DB.projects.find(function (x) { return x.id === p.projectId; }) : null;
    var live = DB.projects.filter(function (x) { return x.published !== false; });
    var projectField = pre
      ? '<div class="field"><label>Project / share reference</label><input value="' + E(pre.name) + '" disabled/><input type="hidden" id="iv-project" value="' + E(pre.id) + '"/></div>'
      : '<div class="field"><label>Project / share reference</label><select id="iv-project">' + live.map(function (x) { return '<option value="' + x.id + '">' + E(x.name) + ' · ' + E(x.category || '') + '</option>'; }).join('') + '</select></div>';
    return appbar('Purchase / Invest interest', { back: true, to: pre ? 'projects' : 'dashboard', noBell: true }) +
      '<div class="screen"><div class="pad">' +
        '<div class="field"><label>I’m interested to</label><select id="iv-type"><option value="purchase">Purchase a unit</option><option value="invest">Invest (With Investment)</option></select></div>' +
        projectField +
        '<div class="field"><label>Unit / share reference (optional)</label><input id="iv-unit" placeholder="e.g. B-501 or share lot"/></div>' +
        '<div class="field"><label>Preferred contact time</label><select id="iv-time"><option>Anytime</option><option>Morning (9–12)</option><option>Afternoon (12–5)</option><option>Evening (5–8)</option></select></div>' +
        '<div class="field"><label>Notes</label><textarea id="iv-notes" rows="3" placeholder="Anything Salmon should know before contacting you…"></textarea></div>' +
        '<div class="banner blue">' + I.lock + '<div><b>No money moves here</b>This registers your interest only. Salmon records a confirmed investment offline after documentation and payment verification — the app never calculates or disburses returns.</div></div>' +
        '<button class="btn primary" data-act="submit-invest">Register interest</button>' +
        '<div class="spacer-24"></div>' +
      '</div></div>';
  };
  SCREENS['invest-sent'] = function (p) {
    return '<div class="result reveal">' +
      '<div class="big-ic wait">' + I.clock + '</div>' +
      '<h2>Interest registered</h2>' +
      '<p>Thanks. Salmon’s investment desk will contact you' + (p && p.time ? ' (' + E(p.time) + ')' : '') + ' about your ' + (p && p.type === 'purchase' ? 'purchase' : 'investment') + ' interest.</p>' +
      (p && p.ref ? '<div class="ref">' + E(p.ref) + '</div>' : '') +
      '<div class="actions"><button class="btn primary" data-act="go-dashboard">Back to dashboard</button></div></div>';
  };

  // ---- investment tracking page (With / Both) — records only, never disburses --
  SCREENS.investment = function () {
    if (!me) return SCREENS.welcome();
    var iv = me.invest || null;
    var entries = (iv && iv.entries) || [];
    var body;
    if (!iv || !iv.investedBdt) {
      body = '<div class="card pad"><div class="t1 hempty" style="color:var(--ink-muted);margin:6px 0">' + T('investEmpty') + '</div>' +
        '<button class="btn primary" data-act="go-invest">' + I.grid + ' ' + T('investNow') + '</button></div>';
    } else {
      body = '<div class="hero t1"><div class="row between"><span class="hl">' + T('recordedInvestment') + '</span>' +
          '<span class="hctx">' + T('salesVolume') + ' ' + (iv.salesVolumeBdt ? BDTS(iv.salesVolumeBdt) : '—') + '</span></div>' +
          '<div class="hv">' + BDT(iv.investedBdt) + '</div>' +
          '<div class="schips">' + schip(T('returnPaid'), iv.returnPaidBdt ? BDTS(iv.returnPaidBdt) : '—') +
            schip(T('returnPending'), iv.returnPendingBdt ? BDTS(iv.returnPendingBdt) : '—') +
            schip('On hold', iv.returnOnHoldBdt ? BDTS(iv.returnOnHoldBdt) : '—') + '</div></div>' +
        '<div class="card pad">' +
          '<div class="kv"><span class="k">Effective date</span><span class="v">' + E(iv.effectiveDate || '—') + '</span></div>' +
          '<div class="kv" style="align-items:flex-start"><span class="k">Terms</span><span class="v" style="max-width:62%;text-align:right">' + E(iv.terms || '—') + '</span></div>' +
          '<div class="kv" style="align-items:flex-start"><span class="k">Schedule</span><span class="v" style="max-width:62%;text-align:right">' + E(iv.schedule || '—') + '</span></div>' +
        '</div>' +
        '<div class="card"><h2 class="sec" style="margin:14px 14px 6px">Return records</h2>' +
          (entries.length ? entries.slice().reverse().map(function (en) {
            var st = en.status === 'paid' ? ['green', 'Paid'] : en.status === 'onhold' ? ['grey', 'On hold'] : ['amber', 'Pending'];
            return '<div class="list-row" style="cursor:default"><div><div class="lr-t">' + E(en.period || '—') + '</div><div class="lr-s">' + BDT(en.amountBdt || 0) + (en.at ? ' · ' + new Date(en.at).toLocaleDateString('en-GB') : '') + '</div></div><div class="lr-r"><span class="pill ' + st[0] + '"><span class="dot"></span>' + st[1] + '</span></div></div>';
          }).join('') : '<div class="center-note" style="padding:16px">No return entries yet. Salmon records these after each period.</div>') +
        '</div>' +
        '<button class="btn" data-act="go-invest">' + I.grid + ' ' + T('investNow') + '</button>';
    }
    return appbar(T('investment')) +
      '<div class="screen"><div class="pad stack">' +
        '<div class="banner blue">' + I.lock + '<div><b>Records only</b>Investments and returns are recorded by Salmon after offline documentation. The app never calculates or disburses returns.</div></div>' +
        body +
        '<div class="spacer-24"></div>' +
      '</div></div>' + tabbar('investment');
  };

  // ---- settlement (Flow 5) — NO bank fields anywhere ----------------------
  SCREENS['settle-request'] = function () {
    var bal = me.approvedBalanceBdt || 0;
    return appbar('Request settlement', { back: true, to: 'dashboard', noBell: true }) +
      '<div class="screen"><div class="pad stack">' +
        '<div class="card pad"><div class="muted" style="font-size:12px">Approved balance available</div><div style="font-weight:800;font-size:26px;margin-top:2px">' + BDT(bal) + '</div></div>' +
        '<div class="field"><label>Amount to settle</label><input id="s-amount" type="number" value="' + bal + '" max="' + bal + '"/>' +
          '<div class="muted" style="font-size:12px;margin-top:6px">Capped at your approved balance.</div></div>' +
        '<div class="banner blue">' + I.lock + '<div><b>No bank details needed</b>Salmon’s finance team already knows how to pay you. This request never moves money — it just tells finance you’d like to be paid out.</div></div>' +
        '<button class="btn primary" data-act="submit-settle">Request settlement</button>' +
        '<div class="spacer-24"></div>' +
      '</div></div>';
  };

  SCREENS['settle-sent'] = function (p) {
    return '<div class="result reveal">' +
      '<div class="big-ic wait">' + I.clock + '</div>' +
      '<h2>Settlement requested</h2>' +
      '<p>Finance has received your request for ' + BDT(p.amount) + '. You’ll see the status change here as they approve and pay out.</p>' +
      (p.ref ? '<div class="ref">' + E(p.ref) + '</div>' : '') +
      '<div class="actions"><button class="btn primary" data-act="go-screen" data-screen="settlements">Track settlement</button></div></div>';
  };

  SCREENS.settlements = function () {
    var list = mySettlements();
    return appbar('Settlements', { back: true, to: 'dashboard' }) +
      '<div class="screen">' +
        (list.length ? '<div class="card" style="margin:16px">' + list.map(function (s) {
          return '<div class="list-row" data-act="settlement" data-id="' + s.id + '" data-ref="' + s.id + '"><div><div class="lr-t">' + BDT(s.amountBdt) + '</div><div class="lr-s">' + E(s.id) + ' · ' + timeLabel(s.requestedAt) + '</div></div><div class="lr-r">' + settlePill(s) + '</div></div>';
        }).join('') + '</div>' : '<div class="center-note">No settlement requests yet.</div>') +
      '</div>';
  };

  SCREENS.settlement = function (p) {
    var s = DB.settlements.find(function (x) { return x.id === p.id; });
    if (!s) return SCREENS.settlements();
    return appbar('Settlement', { back: true, to: 'settlements' }) +
      '<div class="screen"><div class="pad stack">' +
        '<div class="row between"><h1 class="big">' + BDT(s.amountBdt) + '</h1>' + settlePill(s) + '</div>' +
        '<div class="card pad">' +
          '<div class="kv"><span class="k">Request ID</span><span class="v mono">' + E(s.id) + '</span></div>' +
          '<div class="kv"><span class="k">Requested</span><span class="v">' + new Date(s.requestedAt).toLocaleString('en-GB') + '</span></div>' +
          (s.status === 'settled' && s.paymentDate ? '<div class="kv"><span class="k">Payment date</span><span class="v">' + E(s.paymentDate) + '</span></div>' : '') +
        '</div>' +
        (s.status === 'settled'
          ? '<div class="banner green">' + I.check + '<div><b>Settled</b>The money is with you. Salmon paid you outside the app, then recorded it here.</div></div>'
          : s.status === 'rejected'
            ? '<div class="banner red">' + I.warn + '<div><b>Not processed</b>This request wasn’t processed. Please contact the partner desk.</div></div>'
            : s.status === 'on_hold'
              ? '<div class="banner amber">' + I.clock + '<div><b>On hold</b>Finance has temporarily paused this request. They’ll be in touch.</div></div>'
              : s.status === 'approved_awaiting_payment'
                ? '<div class="banner amber">' + I.clock + '<div><b>Approved — awaiting payment</b>Finance approved it. Payment happens outside the app.</div></div>'
                : '<div class="banner blue">' + I.clock + '<div><b>Requested</b>Waiting for finance to approve.</div></div>') +
      '</div></div>';
  };

  // ---- earnings (commissions) ---------------------------------------------
  SCREENS.earnings = function () {
    var comms = myCommissions();
    var approved = comms.filter(function (c) { return c.status === 'approved'; }).reduce(function (n, c) { return n + (c.amountBdt || 0); }, 0);
    var pending = comms.filter(function (c) { return c.status === 'pending'; }).length;
    return appbar('Earnings', { back: true, to: 'dashboard' }) +
      '<div class="screen"><div class="pad stack">' +
        // Approved (spendable) vs Pending (not yet) — kept clearly distinct
        '<div class="row" style="gap:10px">' +
          '<div class="card pad" style="flex:1"><div class="muted" style="font-size:12px">Approved · spendable</div><div style="font-weight:800;font-size:22px;color:var(--maroon)">' + BDT(me.approvedBalanceBdt || 0) + '</div></div>' +
          '<div class="card pad" style="flex:1"><div class="muted" style="font-size:12px">Pending · not yet</div><div style="font-weight:800;font-size:22px;color:var(--ink-3)">' + pending + '</div></div>' +
        '</div>' +
        '<div class="card"><h2 class="sec" style="margin:14px 14px 6px">Commission history</h2>' +
          (comms.length ? comms.map(function (c) {
            var trace = c.kind === 'special' ? (c.category || 'Special') : (E(c.prospectName || '—') + (c.projectName ? ' · ' + E(c.projectName) : ''));
            var rev = c.status === 'reversed';
            return '<div class="list-row" style="cursor:default" data-ref="' + c.id + '"><div><div class="lr-t"' + (rev ? ' style="text-decoration:line-through;color:var(--ink-muted)"' : '') + '>' + (c.amountBdt ? BDT(c.amountBdt) : 'Pending amount') + '</div><div class="lr-s">' + trace + '</div></div><div class="lr-r">' + earnPill(c) + '</div></div>';
          }).join('') : '<div class="center-note" style="padding:20px">No commissions yet. Convert a lead to earn.</div>') +
        '</div>' +
        '<div class="muted" style="font-size:11.5px;padding:0 4px">Only <b>Approved</b> is available to request as a settlement. Pending is not yet yours.</div>' +
      '</div></div>';
  };
  function earnPill(c) {
    var m = { pending: ['amber', 'Pending'], approved: ['green', 'Approved'], settlement_requested: ['blue', 'Requested'], settled: ['grey', 'Settled'], reversed: ['red', 'Reversed'] };
    var x = m[c.status] || ['grey', c.status]; return '<span class="pill ' + x[0] + '"><span class="dot"></span>' + x[1] + '</span>';
  }

  // ---- With Investment (Flow 6) — mechanism only --------------------------
  SCREENS.investment = function () {
    var share = myShare();
    return appbar('With Investment', { back: true, to: 'dashboard' }) +
      '<div class="screen"><div class="pad stack">' +
        // 6.3.4 — mandatory, prominent disclaimer. Copy comes from legal counsel.
        '<div class="disclaimer"><div class="dh">' + I.scale + ' Programme disclaimer</div><div class="db"><span class="legal-ph">[LEGAL DISCLAIMER COPY REQUIRED]</span> — the disclaimer is pending legal sign-off and will appear here in full.</div></div>' +
        // required framing line — itself marked for legal confirmation
        '<div class="card pad" style="border-color:var(--line-strong)"><p style="font-size:12.5px;color:var(--ink-2);margin:0">Salmon Developers records participation and returns under your agreed terms. This app does not provide investment advice or guarantee any return. <span class="legal-ph">[EXACT WORDING — LEGAL CONFIRMATION REQUIRED]</span></p></div>' +
        '<div class="card pad"><h2 class="sec" style="margin:0 0 8px">Programme overview (P18)</h2>' +
          '<p style="font-size:13.5px;color:var(--ink-2)">The With Investment programme lets approved partners take a confirmed share in an approved project and receive returns recorded under their agreed terms.</p>' +
          '<div class="kv"><span class="k">Higher-tier commission</span><span class="v"><span class="legal-ph">[CLIENT-APPROVED COPY REQUIRED]</span></span></div>' +
          '<div class="kv"><span class="k">Return frequency</span><span class="v"><span class="legal-ph">[CLIENT-APPROVED COPY REQUIRED — frequency]</span></span></div>' +
          '<div class="kv"><span class="k">Return rate / amount</span><span class="v"><span class="legal-ph">[LEGAL SIGN-OFF REQUIRED]</span></span></div>' +
          '<p class="phelp" style="margin:8px 0 0">No rate, amount, projection or calculator is shown. Any higher-tier commission is entered by hand by Salmon, never computed here.</p>' +
        '</div>' +
        (share ? renderShare(share) : '<button class="btn primary" data-act="go-screen" data-screen="inv-enquire">Express interest</button>') +
        '<button class="btn" data-act="go-screen" data-screen="inv-enquire">New investment enquiry</button>' +
        '<div class="spacer-24"></div>' +
      '</div></div>';
  };
  function renderShare(share) {
    return '<div class="card pad"><h2 class="sec" style="margin:0 0 8px">Your confirmed share (P53)</h2>' +
        '<div class="kv"><span class="k">Status</span><span class="v"><span class="pill green"><span class="dot"></span>Confirmed</span></span></div>' +
        '<div class="kv"><span class="k">Share amount</span><span class="v"><span class="legal-ph">' + E(share.shareLabel) + '</span></span></div>' +
      '</div>' +
      '<div class="card pad"><h2 class="sec" style="margin:0 0 8px">Return schedule (P54)</h2>' +
        share.returnSchedule.map(function (r) {
          var pill = r.status === 'paid' ? '<span class="pill green"><span class="dot"></span>Paid</span>' : r.status === 'pending' ? '<span class="pill amber"><span class="dot"></span>Pending</span>' : '<span class="pill grey"><span class="dot"></span>On hold</span>';
          return '<div class="kv"><span class="k">' + E(r.period) + ' ' + pill + '</span><span class="v"><span class="legal-ph">' + E(r.amount) + '</span></span></div>';
        }).join('') +
      '</div>';
  }

  SCREENS['inv-enquire'] = function () {
    return appbar('Investment enquiry', { back: true, to: 'investment', noBell: true }) +
      '<div class="screen"><div class="pad stack">' +
        '<div class="disclaimer"><div class="dh">' + I.warn + ' Note</div><div class="db">This records your interest only. No commitment is made and no amounts are confirmed until legal sign-off.</div></div>' +
        '<div class="field"><label>Interest amount (indicative)</label><input id="i-amount" placeholder="e.g. 500000"/></div>' +
        '<div class="field"><label>Preferred contact</label><select id="i-contact"><option>Phone</option><option>Email</option><option>In person</option></select></div>' +
        '<div class="field"><label>Notes</label><textarea id="i-notes" rows="3" placeholder="Anything relevant…"></textarea></div>' +
        '<button class="btn primary" data-act="submit-enquiry">Submit enquiry</button>' +
      '</div></div>';
  };

  // ---- Program enrolment & status (P19, Req 6.3.2) ------------------------
  function fmtDateP(iso) { if (!iso) return '—'; try { return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso)); } catch (e) { return iso; } }
  function partOf(key) { return (me.participation && me.participation[key]) || { status: 'notEnrolled', history: [] }; }
  function partStatusPill(st) {
    return st === 'active' ? '<span class="pill green"><span class="dot"></span>Active</span>'
      : st === 'suspended' ? '<span class="pill amber"><span class="dot"></span>Suspended</span>'
      : st === 'closed' ? '<span class="pill grey"><span class="dot"></span>Closed</span>'
      : '<span class="pill grey"><span class="dot"></span>Not enrolled</span>';
  }
  function enrolCard(key, name) {
    var part = partOf(key);
    var st = part.status;
    var last = part.history && part.history.length ? part.history[part.history.length - 1] : null;
    var requested = key === 'with' && st === 'notEnrolled' && part.requestedAt;
    var meta;
    if (st === 'active') meta = 'Enrolled ' + fmtDateP(part.enrolledAt);
    else if (requested) meta = 'Awaiting admin approval · requested ' + fmtDateP(part.requestedAt);
    else if (st === 'suspended') meta = 'Suspended ' + (last ? fmtDateP(last.at) : '');
    else if (st === 'closed') meta = 'Closed ' + (last ? fmtDateP(last.at) : '');
    else meta = 'Not enrolled';
    var reasonLine = (st === 'suspended' || st === 'closed') && last && last.reason
      ? '<p class="phelp" style="margin:6px 0 0">Reason: ' + E(last.reason) + '</p>' : '';
    var action = '';
    if (st === 'notEnrolled' && !requested) {
      if (key === 'zero') action = '<button class="btn primary" data-act="enrol" data-prog="zero">Enrol in Zero Investment</button>';
      else action = '<button class="btn primary" data-act="enrol" data-prog="with">Request With Investment</button>' +
        '<p class="phelp" style="margin:6px 0 0">Available on approval — a Salmon admin reviews eligibility before activation.</p>';
    } else if (requested) {
      action = '<button class="btn" disabled>Awaiting approval</button>';
    } else if (st === 'active' && key === 'with') {
      action = '<button class="btn" data-act="go-screen" data-screen="investment">Open programme</button>';
    } else if (st === 'suspended') {
      action = '<p class="phelp" style="margin:6px 0 0">Program actions are paused while suspended. Contact support if you have questions.</p>';
    } else if (st === 'closed') {
      action = '<p class="phelp" style="margin:6px 0 0">Participation closed. Your history is retained. Re-enrolment is subject to Salmon’s approval.</p>';
    }
    return '<div class="card pad">' +
      '<div class="row between" style="align-items:center"><h2 class="sec" style="margin:0">' + E(name) + '</h2>' + partStatusPill(st) + '</div>' +
      '<div class="pprog" style="color:var(--ink-2);margin:4px 0 0">' + E(meta) + '</div>' + reasonLine +
      (action ? '<div style="margin-top:10px">' + action + '</div>' : '') +
      '</div>';
  }
  SCREENS.enrolment = function () {
    if (!me) return SCREENS.welcome();
    return appbar('Enrolment', { back: true, to: 'dashboard' }) +
      '<div class="screen"><div class="pad stack">' +
        '<p style="font-size:13px;color:var(--ink-2);margin:0">Each program has its own status and enrolment date. You can hold one program or both. These are separate from your account status.</p>' +
        enrolCard('zero', 'Zero Investment') +
        enrolCard('with', 'With Investment') +
        '<div class="spacer-24"></div>' +
      '</div></div>';
  };

  // ---- team (Flow 7) ------------------------------------------------------
  SCREENS.team = function () {
    if (!me.teamLead) return SCREENS.dashboard();
    var t = me.team || [];
    var pct = Math.round((me.teamAchievedBdt || 0) / (me.teamTargetBdt || 1) * 100);
    return appbar('My team', { back: true, to: 'dashboard' }) +
      '<div class="screen"><div class="pad stack">' +
        '<div class="card pad"><h2 class="sec" style="margin:0 0 8px">Team target</h2>' +
          '<div class="row between"><span style="font-weight:800;font-size:20px">' + BDTS(me.teamAchievedBdt) + '</span><span class="muted">of ' + BDTS(me.teamTargetBdt) + '</span></div>' +
          '<div class="progress" style="margin-top:8px"><span style="width:' + pct + '%"></span></div>' +
          '<div class="muted" style="font-size:12px;margin-top:6px">' + pct + '% of monthly target achieved</div>' +
        '</div>' +
        '<div class="card"><h2 class="sec" style="margin:14px 14px 6px">Roster (' + t.length + ')</h2>' +
          t.map(function (m2) {
            return '<div class="member"><div class="mav">' + E(initials(m2.name)) + '</div><div><div class="mn">' + E(m2.name) + '</div><div class="md">' + E(m2.id) + ' · ' + m2.leadsMTD + ' leads · ' + m2.convertedMTD + ' converted</div></div><span class="rankchip rank-' + E(m2.rank) + '">' + E(m2.rank) + '</span></div>';
          }).join('') +
        '</div>' +
        '<div class="row" style="gap:10px">' +
          '<button class="btn primary" data-act="go-screen" data-screen="tl-assign">' + I.plus + ' Assign a task</button>' +
          '<button class="btn" data-act="go-screen" data-screen="tl-queue">Team tasks</button>' +
        '</div>' +
        '<div class="card pad"><h2 class="sec" style="margin:0 0 6px">Referral link</h2>' +
          '<div class="row between"><span class="mono" style="font-size:12.5px">salmon.app/join/' + E(me.referralCode) + '</span><button class="btn sm" data-act="copy-ref">Copy</button></div></div>' +
        '<div class="spacer-24"></div>' +
      '</div></div>';
  };

  // ---- meetings (Flow 8) --------------------------------------------------
  SCREENS.meetings = function () {
    var list = myMeetings();
    return appbar('Meetings', { back: true, to: 'dashboard' }) +
      '<div class="screen"><div class="pad stack">' +
        '<button class="btn primary" data-act="go-screen" data-screen="meeting-request">' + I.plus + ' Request a meeting</button>' +
        '<div class="card">' + (list.length ? list.map(function (m2) {
          var confirmed = m2.status === 'confirmed' || m2.status === 'scheduled';
          var who = m2.withName || m2.staffType;
          var when = m2.time || (m2.date ? m2.date + (m2.timezone ? ' (' + m2.timezone + ')' : '') : 'Awaiting confirmation');
          var link = m2.link || m2.zoomLink;
          return '<div class="list-row" style="cursor:default" data-ref="' + m2.id + '"><div>' +
            '<div class="lr-t">Meeting with ' + E(who) + (m2.platform ? ' · ' + E(m2.platform) : '') + '</div>' +
            '<div class="lr-s">' + (confirmed ? E(when) : 'Awaiting confirmation') + (m2.reason ? ' · ' + E(m2.reason) : '') + '</div>' +
            (link && confirmed ? '<a href="' + E(link) + '" target="_blank" style="font-size:12.5px;color:var(--maroon);font-weight:700">Join link ↗</a>' : '') +
            '</div><div class="lr-r">' + (confirmed ? '<span class="pill green"><span class="dot"></span>' + (m2.status === 'scheduled' ? 'Scheduled' : 'Confirmed') + '</span>' : '<span class="pill amber"><span class="dot"></span>Requested</span>') + '</div></div>';
        }).join('') : '<div class="center-note" style="padding:20px">No meetings yet.</div>') + '</div>' +
      '</div></div>';
  };
  var TZ_LIST = ['Asia/Dhaka', 'Asia/Dubai', 'Asia/Kolkata', 'Europe/London', 'America/New_York'];
  SCREENS['meeting-request'] = function () {
    return appbar('Request a meeting', { back: true, to: 'meetings', noBell: true }) +
      '<div class="screen"><div class="pad stack">' +
        '<div class="field"><label>Meet with</label><select id="m-type"><option>Manager</option><option>Finance Officer</option><option>Legal / Document Controller</option><option>Super Admin</option></select></div>' +
        '<div class="row" style="gap:10px"><div class="field" style="flex:1;margin:0"><label>Date</label><input id="m-date" type="date"/></div><div class="field" style="flex:1;margin:0"><label>Time</label><input id="m-time" type="time"/></div></div>' +
        '<div class="field"><label>Timezone</label><select id="m-tz">' + TZ_LIST.map(function (t) { return '<option>' + t + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label>Reason</label><input id="m-reason" placeholder="What’s it about?" value="Discuss a large prospect in Cumilla."/></div>' +
        '<div class="field"><label>Admin contact email</label><input id="m-email" type="email" placeholder="staff@salmon.dev"/></div>' +
        '<div class="field"><label>Platform</label><select id="m-platform"><option value="zoom">Zoom</option><option value="meet">Google Meet</option></select></div>' +
        '<div class="field"><label>Notes (optional)</label><textarea id="m-notes" rows="2" placeholder="Anything else…"></textarea></div>' +
        '<button class="btn primary" data-act="submit-meeting">Send request</button>' +
        '<div class="muted" style="font-size:12px">You’re requesting a slot — the scheduler confirms it on the web panel.</div>' +
        '<div class="spacer-24"></div>' +
      '</div></div>';
  };
  SCREENS.visits = function () {
    var list = (DB.consultations || []).filter(function (v) { return me && v.partnerId === me.id && v.kind === 'visit'; });
    return appbar('Site visits', { back: true, to: 'dashboard' }) +
      '<div class="screen"><div class="pad stack">' +
        '<div class="card">' + (list.length ? list.map(function (v) {
          var done = v.status === 'completed' || v.status === 'done';
          var when = v.date ? E(v.date) + (v.time ? ' ' + E(v.time) : '') + (v.timezone ? ' (' + E(v.timezone) + ')' : '') : '—';
          return '<div class="list-row" style="cursor:default" data-ref="' + v.id + '"><div><div class="lr-t">Visit · ' + E(v.place || '—') + '</div><div class="lr-s">' + when + (v.prospectName ? ' · ' + E(v.prospectName) : '') + '</div></div><div class="lr-r"><span class="pill ' + (done ? 'green' : 'amber') + '"><span class="dot"></span>' + (done ? 'Done' : 'Scheduled') + '</span></div></div>';
        }).join('') : '<div class="center-note" style="padding:20px">No site visits scheduled yet.</div>') + '</div>' +
      '</div></div>';
  };

  // ---- support (Flow 8) ---------------------------------------------------
  // Req 6.16 — partner ticket status pill (open/in_progress/resolved/reopened).
  function tktStatusPill(s) {
    var m = { open: ['blue', 'Open'], in_progress: ['amber', 'In progress'], resolved: ['green', 'Resolved'], reopened: ['maroon', 'Reopened'], closed: ['grey', 'Closed'] };
    var x = m[s] || ['grey', s]; return '<span class="pill ' + x[0] + '"><span class="dot"></span>' + x[1] + '</span>';
  }
  // P70/P71 list — the partner's support tickets.
  SCREENS.support = function () {
    var list = myTickets();
    return appbar('Support', { back: true, to: 'dashboard' }) +
      '<div class="screen"><div class="pad stack">' +
        '<button class="btn primary" data-act="go-screen" data-screen="ticket-new">' + I.plus + ' Raise a ticket</button>' +
        '<div class="card">' + (list.length ? list.map(function (t) {
          var msgs = (t.thread && t.thread.length) ? t.thread.length : (t.replies.length + 1);
          return '<div class="list-row" data-act="ticket" data-id="' + t.id + '" data-ref="' + t.id + '"><div><div class="lr-t">' + E(t.subject) + '</div><div class="lr-s">' + E(t.category || t.dept) + ' · ' + msgs + ' message' + (msgs === 1 ? '' : 's') + '</div></div><div class="lr-r">' + tktStatusPill(t.status) + '</div></div>';
        }).join('') : '<div class="center-note" style="padding:20px">No tickets yet.</div>') + '</div>' +
        '<div class="card pad"><div style="font-weight:700;font-size:13px;margin-bottom:6px">Need to talk to someone?</div>' +
          '<a class="btn" href="tel:+8809610000000"><span>' + I.help + '</span>Call Salmon support</a>' +
          '<div class="muted" style="font-size:12px;margin-top:8px">Mon–Sat, 9am–6pm · +880 961 000 0000</div></div>' +
      '</div></div>';
  };
  // P70 — raise ticket: category, subject, description, attachment.
  SCREENS['ticket-new'] = function () {
    return appbar('New ticket', { back: true, to: 'support', noBell: true }) +
      '<div class="screen"><div class="pad stack">' +
        '<div class="field"><label>Category</label><select id="t-cat"><option>Customer Care</option><option>Sales</option><option>Accounts</option><option>Administration</option></select></div>' +
        '<div class="field"><label>Priority</label><select id="t-prio"><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option><option value="low">Low</option></select></div>' +
        '<div class="field"><label>Subject</label><input id="t-subject" placeholder="e.g. Settlement query"/></div>' +
        '<div class="field"><label>Description</label><textarea id="t-body" rows="4" placeholder="Describe your issue…"></textarea></div>' +
        '<div class="field"><label>Attachment (optional)</label><button class="btn" data-act="t-attach" id="tAttachBtn"><span>' + I.dl + '</span>Attach a file</button><div id="tFile" style="font-size:12.5px;color:var(--green);font-weight:700;margin-top:8px"></div></div>' +
        '<button class="btn primary" data-act="submit-ticket">Send</button>' +
      '</div></div>';
  };
  // P71 — ticket thread: full history, status, reopen, click-to-call.
  SCREENS.ticket = function (p) {
    var t = DB.tickets.find(function (x) { return x.id === p.id; });
    if (!t) return SCREENS.support();
    var thread = (t.thread && t.thread.length) ? t.thread : ([{ by: me ? me.name : 'You', side: 'requester', at: t.createdAt, text: t.body }].concat((t.replies || []).map(function (r) { return { by: r.by, side: 'staff', at: r.at, text: r.text }; })));
    return appbar(t.subject, { back: true, to: 'support' }) +
      '<div class="screen"><div class="pad stack">' +
        '<div class="row between"><div class="muted">' + E(t.category || t.dept) + ' · ' + E(t.id) + '</div>' + tktStatusPill(t.status) + '</div>' +
        thread.map(function (m) {
          var staffSide = m.side === 'staff';
          if (m.side === 'system' || m.kind === 'note') return '<div class="card pad" style="background:var(--wash,#f6f2ec)"><div class="muted" style="font-size:12.5px">' + E(m.text) + '</div></div>';
          return '<div class="card pad"' + (staffSide ? ' style="background:var(--maroon-tint)"' : '') + '><div style="font-weight:700;font-size:13px;margin-bottom:4px">' + (staffSide ? E(m.by) + ' · Salmon' : 'You') + '<span class="muted" style="font-weight:400;font-size:11.5px;margin-left:6px">' + Salmon.timeAgo(m.at) + '</span></div><div style="font-size:14px">' + E(m.text) + '</div></div>';
        }).join('') +
        (t.status === 'resolved'
          ? '<div class="card pad"><div style="font-weight:700;margin-bottom:6px">Resolved</div><div class="muted" style="font-size:13px;margin-bottom:10px">Still need help? Reopen this ticket and Salmon will pick it back up.</div><button class="btn" data-act="reopen-ticket" data-id="' + t.id + '">Reopen ticket</button></div>'
          : '<div class="field"><label>Add a message</label><textarea id="t-msg" rows="3" placeholder="Reply to Salmon…"></textarea></div>' +
            '<button class="btn primary" data-act="ticket-msg" data-id="' + t.id + '">Send</button>') +
        '<a class="btn" href="tel:+8809610000000" style="margin-top:8px"><span>' + I.help + '</span>Call Salmon support</a>' +
      '</div></div>';
  };

  // ---- profile + card + notifications -------------------------------------
  SCREENS.profile = function () {
    if (!me) return SCREENS.welcome();
    return appbar('Profile') +
      '<div class="screen"><div class="pad stack">' +
        '<div class="card pad row" style="gap:14px"><div style="width:54px;height:54px;border-radius:50%;background:var(--maroon-tint);color:var(--maroon);display:grid;place-items:center;font-weight:800;font-size:20px">' + E(initials(me.name)) + '</div>' +
          '<div><div style="font-weight:800;font-size:17px">' + E(me.name) + '</div><div class="muted" style="font-size:13px">' + E(me.id) + '</div>' +
          '<div style="margin-top:4px"><span class="rankchip rank-' + E(me.rank) + '">' + E(me.rank) + '</span> <span class="pill grey" style="height:20px"><span class="dot"></span>' + programLabel(me.program) + '</span></div></div></div>' +
        '<div class="card pad">' +
          '<div class="kv"><span class="k">Phone</span><span class="v">' + E(me.phone) + '</span></div>' +
          '<div class="kv"><span class="k">Email</span><span class="v">' + E(me.email) + '</span></div>' +
          '<div class="kv" style="align-items:flex-start"><span class="k">Territory</span><span class="v" style="text-align:right;max-width:66%">' + E(Geo.format(me)) + '</span></div>' +
          '<div class="kv"><span class="k">Referral code</span><span class="v mono">' + E(me.referralCode) + '</span></div>' +
        '</div>' +
        '<button class="btn" data-act="go-card">' + I.card + ' Digital business card</button>' +
        '<button class="btn" data-act="go-screen" data-screen="settlements">' + I.wallet + ' Settlements</button>' +
        '<button class="btn" data-act="go-screen" data-screen="support">' + I.help + ' Support</button>' +
        '<div class="spacer-24"></div>' +
      '</div></div>' + tabbar('profile');
  };

  SCREENS.card = function () {
    var c = me.card || { name: me.name, id: me.id, rank: me.rank, territory: me.territory, phone: me.phone };
    return appbar('Business card', { back: true, to: 'profile' }) +
      '<div class="screen"><div class="pad">' +
        '<div class="bizcard"><div class="bn">' + E(c.name) + '</div><div class="bid">' + E(c.id) + '</div>' +
          '<div class="brow"><div><div style="opacity:.6;font-size:10px">RANK</div>' + E(c.rank) + '</div>' +
          '<div><div style="opacity:.6;font-size:10px">TERRITORY</div>' + E(Geo.formatShort(c)) + '</div>' +
          '<div><div style="opacity:.6;font-size:10px">PHONE</div>' + E(c.phone) + '</div></div>' +
          '<div class="qr">' + I.qr + '</div></div>' +
        '<div class="muted" style="font-size:12px;text-align:center;margin-top:14px">Salmon Developers · Authorised Sales Partner</div>' +
      '</div></div>';
  };

  SCREENS.notifications = function () {
    var notes = myNotes();
    Salmon.post('/api/notifications/read', { side: 'partner' });
    return appbar('Notifications', { back: true, noBell: true }) +
      '<div class="screen">' +
        (notes.length ? notes.map(function (n) {
          return '<div class="note ' + (n.read ? '' : 'unread') + '"><div class="nd">' + noteIcon(n.kind) + '</div><div><div class="nt">' + E(n.title) + '</div><div class="nb">' + E(n.body) + '</div><div class="na">' + Salmon.timeAgo(n.ts) + '</div></div></div>';
        }).join('') : '<div class="center-note">No notifications yet.</div>') +
      '</div>';
  };

  // ---- booking record (quick-action stub) --------------------------------
  SCREENS['booking-record'] = function () {
    return appbar('Record a booking', { back: true, to: 'dashboard', noBell: true }) +
      '<div class="screen"><div class="pad stack">' +
        '<div class="banner blue">' + I.doc + '<div><b>Record a booking</b>Log a sale you closed offline. Finance reconciles the payment separately.</div></div>' +
        '<div class="field"><label>Project</label><select id="br-project">' + DB.projects.map(function (p) { return '<option value="' + p.id + '">' + E(p.name) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label>Unit</label><input id="br-unit" placeholder="e.g. B-704"/></div>' +
        '<div class="field"><label>Buyer name</label><input id="br-buyer" placeholder="Full name"/></div>' +
        '<button class="btn primary" data-act="submit-booking">Record booking</button>' +
        '<div class="spacer-24"></div>' +
      '</div></div>';
  };

  // ---- Tasks & Targets (P63–P66, P63b/c) ---------------------------------
  SCREENS.tasks = function () {
    var open = myTasks().filter(function (t) { return t.status !== 'complete' && t.status !== 'cancelled'; });
    var doneList = myTasks().filter(function (t) { return t.status === 'complete'; });
    // overdue first, then by due date
    open.sort(function (a, b) { return (a.status === 'overdue' ? -1 : 0) - (b.status === 'overdue' ? -1 : 0) || new Date(a.dueDate) - new Date(b.dueDate); });
    return appbar('My tasks') +
      '<div class="screen"><div class="pad">' +
        '<h2 class="sec" style="margin-top:4px">Open (' + open.length + ')</h2>' +
        '<div class="card">' + (open.length ? open.map(taskRow).join('') : '<div class="center-note" style="padding:22px">Nothing open — you’re all caught up.</div>') + '</div>' +
        (doneList.length ? '<h2 class="sec" style="margin-top:18px">Completed (' + doneList.length + ')</h2><div class="card">' + doneList.slice(0, 6).map(taskRow).join('') + '</div>' : '') +
        '<div class="spacer-24"></div>' +
      '</div></div>' + tabbar('dashboard');
  };
  function taskRow(t) {
    return '<div class="list-row" data-act="task" data-id="' + t.id + '" data-ref="' + t.id + '"><div><div class="lr-t">' + E(t.title) + '</div><div class="lr-s">' + dueText(t) + (t.evidenceRequired ? ' · 📎 evidence' : '') + '</div></div><div class="lr-r">' + taskPill(t) + '</div></div>';
  }
  SCREENS.task = function (p) {
    var t = myTasks().find(function (x) { return x.id === p.id; });
    if (!t) return SCREENS.tasks();
    var open = t.status !== 'complete' && t.status !== 'cancelled';
    return appbar('Task', { back: true, to: 'tasks' }) +
      '<div class="screen"><div class="pad stack">' +
        '<div class="row between"><h1 class="big" style="font-size:22px">' + E(t.title) + '</h1>' + taskPill(t) + '</div>' +
        '<div class="card pad">' +
          '<div class="kv"><span class="k">Due</span><span class="v">' + dueText(t) + '</span></div>' +
          '<div class="kv"><span class="k">Assigned by</span><span class="v">' + E(t.assignedBy) + (t.assignerType === 'teamlead' ? ' (Team Lead)' : '') + '</span></div>' +
          '<div class="kv"><span class="k">Evidence</span><span class="v">' + (t.evidenceRequired ? 'Required' : 'Not required') + '</span></div>' +
        '</div>' +
        '<div class="card pad"><div class="muted" style="font-size:12px;font-weight:700;margin-bottom:4px">Description</div><div style="font-size:14px">' + E(t.description || '—') + '</div></div>' +
        (t.status === 'complete'
          ? '<div class="banner green">' + I.check + '<div><b>Completed</b>' + E(t.completionNote || '') + (t.evidenceFile ? ' · ' + E(t.evidenceFile) : '') + '</div></div>'
          : t.status === 'cancelled'
            ? '<div class="banner grey">' + I.x + '<div><b>Cancelled</b>This task was cancelled by ' + E(t.assignedBy) + '.</div></div>'
            : '<button class="btn primary" data-act="go-complete" data-id="' + t.id + '">' + I.check + ' Complete task</button>') +
        '<div class="spacer-24"></div>' +
      '</div></div>';
  };
  SCREENS['task-complete'] = function (p) {
    var t = myTasks().find(function (x) { return x.id === p.id; });
    if (!t) return SCREENS.tasks();
    return appbar('Complete task', { back: true, to: 'tasks', noBell: true }) +
      '<div class="screen"><div class="pad stack">' +
        '<div class="card pad"><div style="font-weight:700">' + E(t.title) + '</div><div class="muted" style="font-size:12.5px">' + dueText(t) + '</div></div>' +
        '<div class="field"><label>Completion note</label><textarea id="tc-note" rows="3" placeholder="What did you do?">Called Karim, meeting Thursday 4pm at Bellissimo site.</textarea></div>' +
        (t.evidenceRequired
          ? '<div class="field"><label>Evidence (required)</label><button class="btn" data-act="tc-attach" id="tcAttachBtn">' + I.dl + ' Attach photo / document</button><div id="tcFile" style="font-size:12.5px;color:var(--green);font-weight:700;margin-top:8px"></div></div>'
          : '') +
        '<button class="btn primary" data-act="submit-complete" data-id="' + t.id + '">Mark complete</button>' +
        '<div class="spacer-24"></div>' +
      '</div></div>';
  };
  SCREENS.targets = function () {
    var tgts = myTargets();
    var cur = tgts.filter(function (t) { return t.period === CFG_PERIOD(); });
    var past = tgts.filter(function (t) { return t.period !== CFG_PERIOD(); });
    return appbar('My targets') +
      '<div class="screen"><div class="pad stack">' +
        (cur.length ? cur.map(targetCard).join('') : '<div class="center-note">No target set for this period.</div>') +
        (past.length ? '<h2 class="sec" style="margin-top:8px">Past periods</h2><div class="card">' + past.map(function (t) {
          var ach = t.archivedAchievement != null ? t.archivedAchievement : achievementFor(t);
          return '<div class="list-row" style="cursor:default"><div><div class="lr-t">' + E(t.period) + '</div><div class="lr-s">' + ach + ' of ' + t.targetValue + ' converted leads</div></div><div class="lr-r">' + (ach >= t.targetValue ? '<span class="pill green"><span class="dot"></span>Met</span>' : '<span class="pill grey"><span class="dot"></span>' + Math.round(ach / t.targetValue * 100) + '%</span>') + '</div></div>';
        }).join('') + '</div>' : '') +
        '<div class="spacer-24"></div>' +
      '</div></div>' + tabbar('dashboard');
  };
  function targetCard(t) {
    var ach = achievementFor(t);
    var pct = Math.min(100, Math.round(ach / t.targetValue * 100));
    var days = daysLeftInPeriod();
    return '<div class="card pad">' +
      '<div class="muted" style="font-size:12px">Target · ' + E(t.period) + '</div>' +
      '<div class="row between" style="margin:6px 0 10px"><div><div style="font-weight:800;font-size:30px">' + ach + '<span class="muted" style="font-size:16px;font-weight:600"> / ' + t.targetValue + '</span></div><div class="muted" style="font-size:12px">converted leads</div></div>' +
      '<div style="text-align:right"><div style="font-weight:800;font-size:22px;color:var(--green)">' + pct + '%</div><div class="muted" style="font-size:12px">' + days + ' days left</div></div></div>' +
      '<div class="progress"><span style="width:' + pct + '%"></span></div>' +
      '<div class="muted" style="font-size:11.5px;margin-top:8px">Achievement is derived from your converted leads — nothing is entered by hand.</div>' +
    '</div>';
  }
  // P63b — team lead assigns a task from the phone
  SCREENS['tl-assign'] = function () {
    if (!me.teamLead) return SCREENS.dashboard();
    var team = me.team || [];
    return appbar('Assign a task', { back: true, to: 'team', noBell: true }) +
      '<div class="screen"><div class="pad stack">' +
        '<div class="field"><label>Assign to</label><select id="ta-partner">' + team.map(function (m2) { return '<option value="' + m2.id + '">' + E(m2.name) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label>Task title</label><input id="ta-title" value="Call prospect within 48 hours"/></div>' +
        '<div class="field"><label>Description</label><textarea id="ta-desc" rows="2" placeholder="Short instruction…">Follow up and log the outcome.</textarea></div>' +
        '<div class="field"><label>Due date</label><input id="ta-due" type="date" value="' + tomorrowISO() + '"/></div>' +
        '<label class="consent" style="margin-bottom:8px"><input type="checkbox" id="ta-evi"/><span class="ct">Require evidence (photo / document) on completion</span></label>' +
        '<button class="btn primary" data-act="submit-tl-assign">Assign task</button>' +
        '<div class="spacer-24"></div>' +
      '</div></div>';
  };
  // P63c — team tasks the lead assigned (read-only)
  SCREENS['tl-queue'] = function () {
    if (!me.teamLead) return SCREENS.dashboard();
    var mine = (DB.tasks || []).filter(function (t) { return t.assignerType === 'teamlead' && t.assignedBy === me.name; });
    return appbar('Team tasks', { back: true, to: 'team' }) +
      '<div class="screen"><div class="pad">' +
        '<div class="card">' + (mine.length ? mine.map(function (t) {
          return '<div class="list-row" style="cursor:default" data-ref="' + t.id + '"><div><div class="lr-t">' + E(t.title) + '</div><div class="lr-s">' + E(t.assigneePartnerName) + ' · ' + dueText(t) + '</div></div><div class="lr-r">' + taskPill(t) + '</div></div>';
        }).join('') : '<div class="center-note" style="padding:22px">No tasks assigned yet. Use “Assign a task”.</div>') + '</div>' +
        '<div class="spacer-24"></div>' +
      '</div></div>';
  };

  // ---- helpers ------------------------------------------------------------
  function CFG_PERIOD() { return (DB.meta && DB.meta.currentPeriod) || '2026-07'; }
  function myTasks() { return (DB.tasks || []).filter(function (t) { return me && t.assigneePartnerId === me.id; }); }
  function openTaskCount() { return myTasks().filter(function (t) { return t.status !== 'complete' && t.status !== 'cancelled'; }).length; }
  function myTargets() { return (DB.targets || []).filter(function (t) { return me && (t.partnerId === me.id); }); }
  function achievementFor(t) {
    if (t.scope === 'team') {
      var ids = teamMemberIds(t.teamLeadId);
      return (DB.leads || []).filter(function (l) { return l.status === 'converted' && ids.indexOf(l.partnerId) >= 0; }).length;
    }
    return (DB.leads || []).filter(function (l) { return l.status === 'converted' && l.partnerId === t.partnerId; }).length;
  }
  function teamMemberIds(leadId) {
    var lead = (DB.partners || []).find(function (p) { return p.id === leadId; });
    return lead && lead.team ? lead.team.map(function (m2) { return m2.id; }) : [];
  }
  function tomorrowISO() { var d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); }
  function daysLeftInPeriod() {
    var d = new Date(); var end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return Math.max(0, Math.ceil((end - d) / 86400000));
  }
  function taskPill(t) {
    var m = { assigned: ['blue', 'Assigned'], in_progress: ['amber', 'In progress'], complete: ['green', 'Complete'], overdue: ['red', 'Overdue'], cancelled: ['grey', 'Cancelled'] };
    var x = m[t.status] || ['grey', t.status]; return '<span class="pill ' + x[0] + '"><span class="dot"></span>' + x[1] + '</span>';
  }
  function dueText(t) {
    var days = Math.round((new Date(t.dueDate).getTime() - Date.now()) / 86400000);
    if (t.status === 'complete') return 'Completed';
    if (days < 0) return Math.abs(days) + 'd overdue';
    if (days === 0) return 'Due today';
    return 'Due in ' + days + 'd';
  }
  function gcell(l, v) { return '<div class="g"><div class="gl">' + E(l) + '</div><div class="gv">' + E(v) + '</div></div>'; }

  // ---- property media: gallery + video + 360 + floor plan (Req 6.5) --------
  function g0(proj, k) { return (proj.glance && proj.glance[k] != null) ? proj.glance[k] : ''; }
  function mediaSection(proj) {
    var imgs = [proj.banner].concat(proj.gallery || []).filter(Boolean);
    var m = proj.media || {};
    var tiles = imgs.map(function (src, i) {
      return '<button class="mtile" data-act="media-img" data-src="' + E(src) + '" data-cap="Photo ' + (i + 1) + ' · ' + E(proj.name) + '"><img src="' + E(src) + '" loading="lazy" onerror="this.parentNode.classList.add(\'broken\')" alt=""/></button>';
    }).join('');
    if (m.video) tiles += '<button class="mtile mvid" data-act="media-video" data-src="' + E(m.video.url) + '"' + (m.video.sample ? ' data-sample="1"' : '') + '><span class="mbadge">▶</span><span class="mlabel">Video' + (m.video.sample ? ' · sample' : '') + '</span></button>';
    if (m.tour360) tiles += '<button class="mtile m360" data-act="media-360" data-src="' + E(m.tour360.url) + '"' + (m.tour360.sample ? ' data-sample="1"' : '') + '><span class="mbadge">🧭</span><span class="mlabel">360° tour' + (m.tour360.sample ? ' · sample' : '') + '</span></button>';
    if (m.floorPlan) tiles += '<button class="mtile mfp" data-act="media-floor" data-bed="' + E(g0(proj, 'bed')) + '" data-bath="' + E(g0(proj, 'bath')) + '"><span class="mbadge">▦</span><span class="mlabel">Floor plan</span></button>';
    return '<div class="card pad" style="padding-bottom:8px"><h2 class="sec" style="margin:0 0 8px">Gallery &amp; tours</h2>' +
      '<div class="mediastrip">' + tiles + '</div>' +
      '<p class="muted" style="font-size:11px;margin:6px 0 2px">Photos are project media. Video, 360° tour and floor plan are <b>sample placeholders</b> until Salmon uploads the project’s own.</p></div>';
  }
  function closeLightbox() { var o = document.getElementById('lightbox'); if (o) o.remove(); document.removeEventListener('keydown', escClose); }
  function escClose(e) { if (e.key === 'Escape') closeLightbox(); }
  function openLightbox(inner, cap, sample) {
    closeLightbox();
    var o = document.createElement('div');
    o.id = 'lightbox'; o.className = 'lightbox';
    o.innerHTML = '<div class="lbbox"><button class="lbx" data-lbclose aria-label="Close">×</button>' +
      (sample ? '<div class="lbsample">SAMPLE / PLACEHOLDER — replace with the project’s own asset</div>' : '') +
      '<div class="lbmedia">' + inner + '</div>' + (cap ? '<div class="lbcap">' + cap + '</div>' : '') + '</div>';
    o.addEventListener('click', function (e) { if (e.target === o || e.target.hasAttribute('data-lbclose')) closeLightbox(); });
    document.body.appendChild(o);
    document.addEventListener('keydown', escClose);
  }
  function floorPlanSvg(bed, bath) {
    bed = parseInt(bed, 10) || 3; bath = parseInt(bath, 10) || 2;
    var rooms = [['Living / Dining', 2], ['Kitchen', 1]];
    for (var i = 1; i <= bed; i++) rooms.push([(i === 1 ? 'Master ' : '') + 'Bed ' + i, i === 1 ? 2 : 1]);
    for (var b = 1; b <= bath; b++) rooms.push(['Bath ' + b, 1]);
    rooms.push(['Balcony', 1]);
    var cols = 4, cw = 150, ch = 96, pad = 10, x = 0, y = 0, cells = '';
    rooms.forEach(function (r) {
      var span = Math.min(r[1], cols);
      if (x + span > cols) { x = 0; y += 1; }
      var px = pad + x * cw, py = pad + y * ch, w = span * cw - 8, h = ch - 8;
      cells += '<rect x="' + px + '" y="' + py + '" width="' + w + '" height="' + h + '" rx="6" fill="#faf6f3" stroke="#c9a89a"/>' +
        '<text x="' + (px + w / 2) + '" y="' + (py + h / 2) + '" text-anchor="middle" dominant-baseline="middle" font-size="13" fill="#7a5a4e" font-family="sans-serif">' + r[0] + '</text>';
      x += span;
    });
    var W = pad * 2 + cols * cw, H = pad * 2 + (y + 1) * ch;
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;background:#fff;border-radius:8px" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="4" y="4" width="' + (W - 8) + '" height="' + (H - 8) + '" fill="none" stroke="#b98c7c" stroke-width="2" rx="8"/>' + cells + '</svg>';
  }
  function statusPill(p) { return p.status === 'completed' ? '<span class="pill grey"><span class="dot"></span>Handed over</span>' : '<span class="pill maroon"><span class="dot"></span>Ongoing</span>'; }
  function leadRow(l) { return '<div class="list-row" data-act="lead" data-id="' + l.id + '" data-ref="' + l.id + '"><div><div class="lr-t">' + E(l.prospectName) + '</div><div class="lr-s">' + E(l.projectName) + '</div></div><div class="lr-r">' + leadPill(l) + '</div></div>'; }
  // Req 6.4.5 — the partner only ever sees these SIX states. `partnerStatus`
  // comes from the server projection; internal names (new/rejected) are mapped
  // to the partner labels (Submitted/Closed) and never shown raw.
  function leadPill(l) {
    var ps = l.partnerStatus || PARTNER_STATE[l.status] || 'submitted';
    var m = { submitted: ['blue', 'Submitted'], contacted: ['blue', 'Contacted'], meeting_scheduled: ['amber', 'Meeting scheduled'], meeting_done: ['amber', 'Meeting done'], visit_scheduled: ['amber', 'Visit scheduled'], visit_done: ['amber', 'Visit done'], converted: ['green', 'Converted'], closed: ['grey', 'Closed'] };
    var x = m[ps] || ['grey', ps]; return '<span class="pill ' + x[0] + '"><span class="dot"></span>' + x[1] + '</span>';
  }
  // Client mirror of the server projection (used if a raw status ever arrives).
  var PARTNER_STATE = { new: 'submitted', contacted: 'contacted', meeting_scheduled: 'meeting_scheduled', meeting_done: 'meeting_done', visit_scheduled: 'visit_scheduled', visit_done: 'visit_done', converted: 'converted', rejected: 'closed' };
  function settlePill(s) {
    var m = { requested: ['blue', 'Requested'], approved_awaiting_payment: ['amber', 'Awaiting payment'], settled: ['green', 'Settled'], on_hold: ['amber', 'On hold'], rejected: ['red', 'Not processed'] };
    var x = m[s.status] || ['grey', s.status]; return '<span class="pill ' + x[0] + '"><span class="dot"></span>' + x[1] + '</span>';
  }
  function noteIcon(k) {
    if (k === 'commission.approved') return I.wallet;
    if (k === 'settlement.settled' || k === 'settlement.approved') return I.wallet;
    if (k === 'partner.approved') return I.check;
    if (k === 'lead.converted') return I.leads;
    if (k === 'construction.published') return I.grid;
    return I.bell;
  }
  function myLeads() { return DB.leads.filter(function (l) { return me && l.partnerId === me.id; }); }
  function mySettlements() { return DB.settlements.filter(function (s) { return me && s.partnerId === me.id; }); }
  function myCommissions() { return DB.commissions.filter(function (c) { return me && c.partnerId === me.id; }); }
  function myShare() { return DB.investmentShares.find(function (s) { return me && s.partnerId === me.id; }); }
  function myMeetings() { return DB.meetings.filter(function (m2) { return me && m2.partnerId === me.id; }); }
  function myTickets() { return DB.tickets.filter(function (t) { return me && t.partnerId === me.id; }); }
  function firstName(n) { return String(n || '').replace(/^Md\.?\s+/i, '').split(' ')[0]; }
  function initials(n) { return String(n || '?').replace(/^Md\.?\s+/i, '').split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase(); }
  function programLabel(p) { return p === 'with' ? 'With Investment' : p === 'both' ? 'Both programs' : p === 'none' ? 'No active program' : 'Zero Investment'; }
  function timeLabel(iso) { return Salmon.timeAgo(iso); }
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }

  // ---- operating-territory cascade (Division › District › Upazila › Union) ---
  function geoOpts(items, sel) {
    return (items || []).map(function (x) { var v = (typeof x === 'string') ? x : x.name; return '<option value="' + E(v) + '"' + (v === sel ? ' selected' : '') + '>' + E(v) + '</option>'; }).join('');
  }
  function geoFieldset(path) {
    var g = Geo.complete(path || {});
    return '<div class="field"><label>Operating territory — Division</label><select id="r-division" data-geo="division">' + geoOpts(Geo.divisions, g.division) + '</select></div>' +
      '<div class="field"><label>District</label><select id="r-district" data-geo="district">' + geoOpts(Geo.districtsOf(g.division), g.district) + '</select></div>' +
      '<div class="field"><label>Upazila / Thana</label><select id="r-upazila" data-geo="upazila">' + geoOpts(Geo.upazilasOf(g.division, g.district), g.upazila) + '</select></div>' +
      '<div class="field"><label>Union</label><select id="r-union" data-geo="union">' + geoOpts(Geo.unionsOf(g.division, g.district, g.upazila), g.union) + '</select></div>';
  }
  // repopulate the downstream selects when an upstream level changes
  function rebuildGeo(level) {
    var dv = val('r-division');
    var dSel = document.getElementById('r-district'), uSel = document.getElementById('r-upazila'), nSel = document.getElementById('r-union');
    if (level === 'division' && dSel) dSel.innerHTML = geoOpts(Geo.districtsOf(dv), '');
    var ds = val('r-district');
    if ((level === 'division' || level === 'district') && uSel) uSel.innerHTML = geoOpts(Geo.upazilasOf(dv, ds), '');
    var uz = val('r-upazila');
    if (nSel) nSel.innerHTML = geoOpts(Geo.unionsOf(dv, ds, uz), '');
  }
  // read the four selects into a territory path
  function geoFromForm() { return { division: val('r-division'), district: val('r-district'), upazila: val('r-upazila'), union: val('r-union') }; }

  // ---- actions ------------------------------------------------------------
  view.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act],[data-tab]');
    if (!el) return;
    var tab = el.getAttribute('data-tab');
    if (tab) { go(tab); return; }
    var act = el.getAttribute('data-act');
    ACTIONS[act] && ACTIONS[act](el, e);
  });
  view.addEventListener('change', function (e) {
    if (e.target.id === 'l-consent') {
      var btn = document.getElementById('leadBtn'); if (btn) btn.disabled = !e.target.checked;
    }
    if (e.target.hasAttribute && e.target.hasAttribute('data-geo')) rebuildGeo(e.target.getAttribute('data-geo'));
    if (e.target.hasAttribute && e.target.hasAttribute('data-projfilter')) { projFilters[e.target.getAttribute('data-projfilter')] = e.target.value; render(); }
  });

  var ACTIONS = {
    back: function (el) { var to = el.getAttribute('data-to'); go(to || (me ? 'dashboard' : 'welcome')); },
    notifs: function () { go('notifications'); },
    'media-img': function (el) { openLightbox('<img class="lbimg" src="' + el.getAttribute('data-src') + '" alt=""/>', el.getAttribute('data-cap') || 'Photo', false); },
    'media-video': function (el) { openLightbox('<video class="lbvid" src="' + el.getAttribute('data-src') + '" controls autoplay playsinline></video>', 'Project walkthrough', el.getAttribute('data-sample') === '1'); },
    'media-360': function (el) { var src = el.getAttribute('data-src'); openLightbox('<iframe class="lb360" src="' + src + '" allowfullscreen allow="xr-spatial-tracking; gyroscope; accelerometer; fullscreen"></iframe><a class="lbext" href="' + src + '" target="_blank" rel="noopener">Open 360° tour in a new tab ↗</a>', '360° / virtual tour', el.getAttribute('data-sample') === '1'); },
    'media-floor': function (el) { openLightbox(floorPlanSvg(el.getAttribute('data-bed'), el.getAttribute('data-bath')), 'Floor plan — schematic (' + (el.getAttribute('data-bed') || '?') + ' bed / ' + (el.getAttribute('data-bath') || '?') + ' bath)', true); },
    'go-register': function () { otpVerified = false; go('register'); },
    'go-dashboard': function () { go('dashboard'); },
    'go-card': function () { go('card'); },
    'go-settle': function () { go('settle-request'); },
    'go-invest': function () { go('invest-interest'); }, // With-Investment quick action
    'invest-interest': function (el) { go('invest-interest', { projectId: el.getAttribute('data-id') }); },
    'submit-invest': function () {
      var body = { partnerId: me.id, interestType: val('iv-type'), projectId: val('iv-project'), unitRef: val('iv-unit'), preferredTime: val('iv-time'), notes: val('iv-notes') };
      Salmon.post('/api/investments/interest', body).then(function (r) {
        return refresh().then(function () { go('invest-sent', { ref: r.interest.id, type: r.interest.interestType, time: r.interest.preferredTime }); });
      }).catch(function (err) { Salmon.toast.show('Could not submit', (err.data && err.data.error) || '', { warn: true }); });
    },
    'go-screen': function (el) { go(el.getAttribute('data-screen')); },
    'demo-hint': function () { Salmon.toast.show('Use the actor switcher', 'Pick Shahin / Nasrin / Karim in the shell toolbar to sign in as an existing partner.'); },

    'send-otp': function () {
      document.getElementById('otpField').style.display = 'block';
      document.getElementById('otpBtn').textContent = 'Resent';
      Salmon.toast.show('OTP sent', 'Demo code is 123456.');
    },
    'verify-otp': function () {
      var v = val('r-otp');
      var msg = document.getElementById('otpMsg');
      if (v === '123456') { otpVerified = true; msg.style.color = 'var(--green)'; msg.textContent = '✓ Phone verified'; }
      else { otpVerified = false; msg.style.color = 'var(--red)'; msg.textContent = 'Incorrect code — demo code is 123456'; }
    },
    'submit-app': function () {
      if (!otpVerified) { Salmon.toast.show('Verify your phone first', 'Send and enter the OTP (123456).', { warn: true }); return; }
      var ck = ['r-c-terms', 'r-c-privacy', 'r-c-program', 'r-c-data'];
      if (!ck.every(function (id) { var e = document.getElementById(id); return e && e.checked; })) { Salmon.toast.show('Consent required', 'Please accept all four acceptances to continue.', { warn: true }); return; }
      var now = new Date().toISOString();
      var consents = { terms: { v: '1.0', at: now }, privacy: { v: '1.0', at: now }, program: { v: '1.0', at: now }, dataHandling: { v: '1.0', at: now } };
      var geo = geoFromForm();
      var body = { name: val('r-name'), phone: val('r-phone'), email: val('r-email'), nid: val('r-nid'), address: val('r-address'), territory: geo.district, geo: geo, program: val('r-program'), referralCode: val('r-referral'), consents: consents };
      Salmon.post('/api/partners/apply', body).then(function (r) {
        return refresh().then(function () { go('wall', { appId: r.application.id }); });
      });
    },

    project: function (el) { go('project', { id: el.getAttribute('data-id') }); },
    projview: function (el) { var v = el.getAttribute('data-view'); if (v && v !== projView) { projView = v; render(); } },
    'map-cluster': function (el) { projFilters.location = el.getAttribute('data-city') || ''; projView = 'list'; render(); },
    'download-brochure': function (el) {
      var pid = el.getAttribute('data-id');
      var proj = (DB.projects || []).find(function (x) { return x.id === pid; });
      var br = proj && proj.media && proj.media.brochure;
      if (!br) { Salmon.toast.show('No brochure', 'Salmon hasn’t published a brochure for this project yet.', { warn: true }); return; }
      Salmon.post('/api/docs/access', { partnerId: me.id, projectId: pid, docName: br.name || 'Brochure.pdf' })
        .then(function () {
          // open the admin-uploaded brochure when it's an embedded file; else just log access
          if (br.url && br.url.indexOf('data:') === 0) { try { window.open(br.url, '_blank'); } catch (e) {} }
          Salmon.toast.show('Brochure opened', E(br.name || 'Brochure') + ' · access logged to Salmon’s document activity.');
        });
    },
    // Req 6.7 — open a published sales-support summary via a signed link. The
    // server re-checks canAccessDocument; a partner can only reach published
    // partner-visible summaries, never raw customer or legal documents.
    'download-doc': function (el) {
      Salmon.post('/api/documents/access', { as: 'partner', partnerId: me.id, docId: el.getAttribute('data-id'), purpose: 'download' })
        .then(function (r) {
          Salmon.toast.show('Opening securely', 'Signed link · valid ' + r.ttlSec + 's · access logged to compliance.');
          try { window.open(r.url, '_blank'); } catch (e) {}
        }).catch(function (err) { Salmon.toast.show('Cannot open', (err.data && err.data.error) || 'Access denied.', { warn: true }); });
    },

    'toggle-consent': function () {},
    'submit-lead': function () {
      if (!document.getElementById('l-consent').checked) return;
      var body = { partnerId: me.id, prospectName: val('l-name'), phone: val('l-phone'), email: val('l-email'), leadType: val('l-type') || 'buyer', projectId: val('l-project'), notes: val('l-notes'), consent: true };
      Salmon.post('/api/leads', body).then(function (r) {
        return refresh().then(function () { go('lead-sent', { ref: r.lead.id }); });
      }).catch(function (err) { Salmon.toast.show('Could not submit', (err.data && err.data.error) || '', { warn: true }); });
    },
    lead: function (el) { go('lead', { id: el.getAttribute('data-id') }); },

    'submit-settle': function () {
      var amt = Number(val('s-amount'));
      Salmon.post('/api/settlements/request', { partnerId: me.id, amountBdt: amt }).then(function (r) {
        return refresh().then(function () { go('settle-sent', { amount: amt, ref: r.settlement.id }); });
      }).catch(function (err) { Salmon.toast.show('Could not request', (err.data && err.data.error) || '', { warn: true }); });
    },
    settlement: function (el) { go('settlement', { id: el.getAttribute('data-id') }); },

    'submit-enquiry': function () {
      Salmon.post('/api/investment/enquire', { partnerId: me.id, amount: val('i-amount'), contact: val('i-contact'), notes: val('i-notes') })
        .then(refresh).then(function () { Salmon.toast.show('Enquiry submitted', 'Salmon’s team will follow up.'); go('investment'); });
    },

    'enrol': function (el) {
      var prog = el.getAttribute('data-prog');
      Salmon.post('/api/partners/enrol', { partnerId: me.id, program: prog })
        .then(refresh).then(function () {
          if (prog === 'with') Salmon.toast.show('Request sent', 'Your With Investment enrolment is awaiting review.');
          else Salmon.toast.show('Enrolled', 'You’re now active in Zero Investment.');
          go('enrolment');
        }).catch(function (err) { Salmon.toast.show('Could not enrol', (err.data && err.data.error) || '', { warn: true }); });
    },

    'copy-ref': function () { Salmon.toast.show('Copied', 'Referral link copied to clipboard.'); },

    'submit-meeting': function () {
      Salmon.post('/api/meetings/request', { partnerId: me.id, staffType: val('m-type'), date: val('m-date'), time: val('m-time'), timezone: val('m-tz'), reason: val('m-reason'), adminEmail: val('m-email'), platform: val('m-platform'), notes: val('m-notes') })
        .then(refresh).then(function () { Salmon.toast.show('Meeting requested', 'Awaiting confirmation from Salmon.'); go('meetings'); });
    },
    'go-visits': function () { go('visits'); },
    'submit-ticket': function () {
      var subject = val('t-subject');
      if (!subject) { Salmon.toast.show('Subject required', '', { warn: true }); return; }
      Salmon.post('/api/tickets', { partnerId: me.id, category: val('t-cat'), priority: val('t-prio'), subject: subject, body: val('t-body'), attachment: _pendingAttach || undefined })
        .then(function () { _pendingAttach = null; return refresh(); }).then(function () { Salmon.toast.show('Ticket raised', 'Salmon’s support team will reply.'); go('support'); })
        .catch(function (err) { Salmon.toast.show('Could not send', (err.data && err.data.error) || '', { warn: true }); });
    },
    't-attach': function () {
      _pendingAttach = 'attachment-' + Date.now() + '.jpg';
      var el = document.getElementById('tFile'); if (el) el.textContent = _pendingAttach + ' attached';
    },
    'ticket-msg': function (el) {
      var body = val('t-msg');
      if (!body) { Salmon.toast.show('Type a message first', '', { warn: true }); return; }
      Salmon.post('/api/tickets/message', { ticketId: el.getAttribute('data-id'), body: body })
        .then(refresh).then(function () { Salmon.toast.show('Sent', 'Salmon will see your message.'); render(); })
        .catch(function (err) { Salmon.toast.show('Could not send', (err.data && err.data.error) || '', { warn: true }); });
    },
    'reopen-ticket': function (el) {
      Salmon.post('/api/tickets/reopen', { ticketId: el.getAttribute('data-id') })
        .then(refresh).then(function () { Salmon.toast.show('Reopened', 'Back in Salmon’s support queue.'); render(); })
        .catch(function (err) { Salmon.toast.show('Could not reopen', (err.data && err.data.error) || '', { warn: true }); });
    },
    ticket: function (el) { go('ticket', { id: el.getAttribute('data-id') }); },

    // ---- tasks & targets --------------------------------------------------
    task: function (el) { go('task', { id: el.getAttribute('data-id') }); },
    'go-complete': function (el) { go('task-complete', { id: el.getAttribute('data-id') }); },
    'tc-attach': function () {
      _evidence = 'contactlog-' + Date.now() + '.jpg';
      var f = document.getElementById('tcFile'); if (f) f.textContent = '✓ ' + _evidence + ' attached';
      var b = document.getElementById('tcAttachBtn'); if (b) b.textContent = 'Replace attachment';
    },
    'submit-complete': function (el) {
      var id = el.getAttribute('data-id');
      Salmon.post('/api/tasks/complete', { taskId: id, note: val('tc-note'), evidenceFile: _evidence })
        .then(function () { _evidence = null; return refresh(); })
        .then(function () { Salmon.toast.show('Task completed', 'Your assignor has been notified.'); go('tasks'); })
        .catch(function (err) { Salmon.toast.show('Could not complete', (err.data && err.data.error) || '', { warn: true }); });
    },
    'submit-tl-assign': function () {
      Salmon.post('/api/tasks', { assignerType: 'teamlead', teamLeadId: me.id, assigneePartnerId: val('ta-partner'), title: val('ta-title'), description: val('ta-desc'), dueDate: val('ta-due') ? val('ta-due') + 'T18:00:00Z' : null, evidenceRequired: document.getElementById('ta-evi').checked })
        .then(refresh).then(function () { Salmon.toast.show('Task assigned', 'Pushed to your team member’s phone.'); go('tl-queue'); })
        .catch(function (err) { Salmon.toast.show('Could not assign', (err.data && err.data.error) || '', { warn: true }); });
    },

    // ---- dashboard controls ----------------------------------------------
    lang: function () { lang = lang === 'en' ? 'bn' : 'en'; render(); },
    'dash-period': function (el) { dashPeriod = el.getAttribute('data-p'); render(); },
    'submit-booking': function () {
      Salmon.toast.show('Booking recorded', (val('br-unit') || 'Unit') + ' · ' + (val('br-buyer') || 'buyer') + ' (stub).');
      go('dashboard');
    }
  };
  var _evidence = null;
})();
