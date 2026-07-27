/* ============================================================================
 * Salmon Live Demo — Admin panel (staff console).
 * One state object, re-render on change. Subscribes to SSE so the client's
 * actions land here live: a new row appears, a queue count ticks, a toast fires
 * — no refresh. Admin actions ripple back to the phone the same way.
 * ==========================================================================*/
(function () {
  'use strict';

  var E = Salmon.esc, BDT = Salmon.bdt, BDTS = Salmon.bdtShort;
  var root = document.getElementById('admin');

  var DB = null, CFG = null, staff = null;
  var nav = { section: 'dashboard', params: {} };
  var flashRef = null;
  var seenNotes = {};
  var connected = false;

  var I = {
    dash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
    people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.5a3 3 0 0 1 0 5M18 20a6 6 0 0 0-3-5.2"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 4 5v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5z"/><path d="m9 12 2 2 4-4"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
    finance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m7 14 3-3 3 3 5-6"/></svg>',
    hook: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a3 3 0 1 0-6 0v8a4 4 0 0 1-8 0v-1"/></svg>',
    ledger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h14a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6 9 17l-5-5"/></svg>',
    chevr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    tool: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2-2z"/></svg>',
    badge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/><path d="M8 14l-2 7 6-3 6 3-2-7"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5 5h14l3 7v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-6z"/></svg>',
    cash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7M12 17h.01"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>',
    build: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M6 21V8l6-4 6 4v13M10 12h4M10 16h4"/></svg>',
    scale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M7 21h10M5 7h14l-3 6a3 3 0 0 1-8 0z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>'
  };

  Salmon.toast.mount(document.getElementById('toastHost'));

  function refresh() {
    return Promise.all([Salmon.state(), Salmon.config()]).then(function (r) {
      DB = r[0]; CFG = r[1];
      staff = DB.staff.find(function (s) { return s.id === DB.session.staffId; }) || DB.staff[0];
      return DB;
    });
  }

  refresh().then(function () { render(); Salmon.connect(); });

  // ---- live wire ----------------------------------------------------------
  Salmon.onStatus(function (up) { connected = up; var led = document.querySelector('.rh .led'); if (led) led.classList.toggle('live', up); });

  Salmon.on('client.created', function (m) {
    refresh().then(function () {
      var c = m.data.client;
      Salmon.toast.show('New client: ' + c.name, 'registered from ' + (c.country || '—') + ', ' + Salmon.timeAgo(c.createdAt) + '.');
      flashRef = c.id;
      if (nav.section !== 'clients') nav = { section: 'clients', params: {} };
      render();
    });
  });
  Salmon.on('kyc.pending', function (m) {
    refresh().then(function () {
      Salmon.toast.show('KYC awaiting review', m.data.client.name + ' uploaded a passport.');
      flashRef = m.data.client.id;
      render();
    });
  });
  Salmon.on('webhook.received', function (m) {
    refresh().then(function () {
      var w = m.data.webhook;
      Salmon.toast.show('Payment webhook received', BDT(w.amountBdt) + ' · ' + w.reference + ' · ' + w.gateway);
      flashRef = w.id;
      render();
    });
  });
  Salmon.on('payment.pending', function (m) {
    refresh().then(function () {
      var w = m.data.webhook;
      Salmon.toast.show('Installment payment pending', w.clientName + ' · ' + (w.label || '') + ' · ' + BDT(w.amountBdt));
      flashRef = w.id;
      render();
    });
  });
  Salmon.on('booking.expired', function (m) {
    refresh().then(function () { Salmon.toast.show('Lock expired', m.data.booking.unitNo + ' released back to available.', { warn: true }); render(); });
  });

  // ---- partner-side live events ------------------------------------------
  Salmon.on('partner.applied', function (m) {
    refresh().then(function () {
      var a = m.data.application;
      Salmon.toast.show('New application — ' + a.name, a.territory + ', ' + programLabel(a.program) + '.');
      flashRef = a.id;
      if (['approvals', 'application'].indexOf(nav.section) < 0) nav = { section: 'approvals', params: {} };
      render();
    });
  });
  Salmon.on('lead.created', function (m) {
    refresh().then(function () {
      var l = m.data.lead;
      Salmon.toast.show('New lead: ' + l.prospectName, 'interested in ' + l.projectName + ', from ' + l.partnerName + '.');
      flashRef = l.id;
      render();
    });
  });
  Salmon.on('settlement.requested', function (m) {
    refresh().then(function () {
      var s = m.data.settlement;
      Salmon.toast.show('Settlement request: ' + BDT(s.amountBdt), 'from ' + s.partnerName + '.');
      flashRef = s.id;
      render();
    });
  });
  Salmon.on('investment.enquiry', function (m) {
    refresh().then(function () { Salmon.toast.show('Investment enquiry', m.data.enquiry.partnerName + ' — With Investment.'); flashRef = m.data.enquiry.id; render(); });
  });
  Salmon.on('program.enrol', function (m) {
    refresh().then(function () {
      var pt = DB.partners.find(function (x) { return x.id === m.data.partnerId; });
      var name = pt ? pt.name : m.data.partnerId;
      Salmon.toast.show('Program enrolment', name + ' — ' + (m.data.program === 'with' ? 'With Investment (activation requested)' : 'Zero Investment (active)') + '.', m.data.program === 'with' ? { persist: true } : {});
      flashRef = m.data.partnerId; render();
    });
  });
  Salmon.on('program.participation', function () { refresh().then(render); });
  Salmon.on('meeting.requested', function (m) {
    refresh().then(function () { Salmon.toast.show('Meeting request', m.data.meeting.partnerName + ' → ' + m.data.meeting.staffType + '.'); flashRef = m.data.meeting.id; render(); });
  });
  Salmon.on('ticket.created', function (m) {
    refresh().then(function () { var t = m.data.ticket; Salmon.toast.show('New ' + (t.source === 'client' ? 'client chat' : 'support ticket'), t.requesterName + ' · ' + t.category + ' · ' + t.subject + '.'); flashRef = t.id; render(); });
  });
  Salmon.on('ticket.updated', function (m) {
    refresh().then(function () { render(); });
  });
  Salmon.on('doc.accessed', function (m) {
    refresh().then(function () { render(); });
  });
  Salmon.on('doc.quarantined', function (m) {
    refresh().then(function () { Salmon.toast.show('File quarantined', (m.data.document ? m.data.document.name : 'A file') + ' — blocked by the malware scan.', { warn: true, persist: true }); render(); });
  });
  Salmon.on('doc.clean', function (m) {
    refresh().then(function () { Salmon.toast.show('Scan passed', (m.data.document ? m.data.document.name : 'A file') + ' is now accessible.'); render(); });
  });
  Salmon.on('doc.denied', function (m) {
    refresh().then(function () { render(); });
  });
  Salmon.on('task.completed', function (m) {
    refresh().then(function () { var t = m.data.task; Salmon.toast.show('Task completed', t.assigneePartnerName + ' · ' + t.title); flashRef = t.id; render(); });
  });
  Salmon.on('task.overdue', function (m) {
    refresh().then(function () { render(); });
  });
  Salmon.on('task.assigned', function (m) {
    refresh().then(function () { if (m.data.tasks && m.data.tasks[0]) flashRef = m.data.tasks[0].id; render(); });
  });

  Salmon.onAny(function (m) {
    if (['client.created', 'kyc.pending', 'webhook.received', 'payment.pending', 'booking.expired',
      'partner.applied', 'lead.created', 'settlement.requested', 'investment.enquiry', 'meeting.requested',
      'ticket.created', 'ticket.updated', 'doc.accessed', 'doc.quarantined', 'doc.clean', 'doc.denied', 'task.completed', 'task.overdue', 'task.assigned', 'demo.reset',
      'program.enrol', 'program.participation'].indexOf(m.type) >= 0) return;
    // admin-initiated events (verify/confirm/approve) — keep counts + rail fresh
    refresh().then(render);
  });
  Salmon.on('demo.reset', function () { location.reload(); });

  // clicking a feed row in the shell highlights an element here
  window.addEventListener('message', function (ev) {
    var ref = ev.data && ev.data.salmonHighlight;
    if (!ref) return;
    var el = document.querySelector('[data-ref="' + ref + '"]');
    if (el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  });

  // ---- permissions --------------------------------------------------------
  function isSuper() { return staff.role === 'Super Admin'; }
  function canVerifyKyc() { return isSuper() || staff.role === 'Legal / Document Controller'; }
  function canConfirmPay() { return isSuper() || staff.role === 'Finance Officer'; }
  function canApprovePartner() { return isSuper() || staff.role === 'Manager'; }
  function canManageLeads() { return isSuper() || staff.role === 'Manager'; }
  function canApproveCommission() { return isSuper() || staff.role === 'Finance Officer'; }
  function canSettle() { return isSuper() || staff.role === 'Finance Officer'; }
  function canOps() { return isSuper() || staff.role === 'Manager'; }
  function canFinance() { return isSuper() || staff.role === 'Finance Officer'; }
  function canDocs() { return isSuper() || staff.role === 'Legal / Document Controller'; }
  function programLabel(p) { return p === 'with' ? 'With Investment' : p === 'both' ? 'Both programs' : p === 'none' ? 'No active program' : 'Zero Investment'; }
  function roleShort(r) { return { 'Super Admin': 'Super Admin', 'Manager': 'Manager', 'Finance Officer': 'Finance', 'Legal / Document Controller': 'Legal' }[r] || r; }
  function canManageParticipation() { return isSuper() || staff.role === 'Manager'; }
  function canActivateWith() { return isSuper(); } // 6.1 eligibility approval — Super Admin only

  // ---- Program participation (Req 6.3.3) ----------------------------------
  function fmtDate(iso) { if (!iso) return '—'; try { return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso)); } catch (e) { return iso; } }
  function partPill(st) {
    return st === 'active' ? '<span class="pill green"><span class="dot"></span>Active</span>'
      : st === 'suspended' ? '<span class="pill amber"><span class="dot"></span>Suspended</span>'
      : st === 'closed' ? '<span class="pill red"><span class="dot"></span>Closed</span>'
      : '<span class="pill grey"><span class="dot"></span>Not enrolled</span>';
  }
  function progRow(pt, key, name) {
    var part = (pt.participation && pt.participation[key]) || { status: 'notEnrolled', history: [] };
    var st = part.status;
    var requested = key === 'with' && st === 'notEnrolled' && part.requestedAt;
    var last = part.history && part.history.length ? part.history[part.history.length - 1] : null;
    var actions = [];
    // Activate: notEnrolled/suspended → active. With-activate gated to Super Admin.
    if ((st === 'notEnrolled' || st === 'suspended') && canManageParticipation()) {
      var mayActivate = key === 'with' ? canActivateWith() : true;
      if (mayActivate) actions.push('<button class="btn sm primary" data-act="prog-activate" data-id="' + E(pt.id) + '" data-prog="' + key + '">' + (requested ? 'Approve &amp; activate' : (st === 'suspended' ? 'Resume' : 'Activate')) + '</button>');
      else actions.push('<span class="muted" style="font-size:11.5px">Super Admin approval required to activate With Investment</span>');
    }
    if (st === 'active' && canManageParticipation()) {
      actions.push('<button class="btn sm" data-act="prog-suspend" data-id="' + E(pt.id) + '" data-prog="' + key + '">Suspend</button>');
      actions.push('<button class="btn sm danger" data-act="prog-close" data-id="' + E(pt.id) + '" data-prog="' + key + '">Close</button>');
    }
    if (st === 'suspended' && canManageParticipation()) {
      actions.push('<button class="btn sm danger" data-act="prog-close" data-id="' + E(pt.id) + '" data-prog="' + key + '">Close</button>');
    }
    var needReason = st === 'active' || st === 'suspended';
    return '<div style="padding:12px 16px;border-top:.5px solid var(--line)">' +
      '<div class="ract" style="justify-content:space-between;align-items:center;padding:0"><div><div style="font-weight:700">' + E(name) + '</div>' +
      '<div class="muted" style="font-size:11.5px">' + (st === 'active' ? 'Enrolled ' + fmtDate(part.enrolledAt) : requested ? 'Activation requested ' + fmtDate(part.requestedAt) : st === 'notEnrolled' ? 'Not enrolled' : (st.charAt(0).toUpperCase() + st.slice(1)) + (last && last.at ? ' ' + fmtDate(last.at) : '')) + '</div>' +
      (last && (st === 'suspended' || st === 'closed') && last.reason ? '<div class="muted" style="font-size:11.5px">Reason: ' + E(last.reason) + '</div>' : '') +
      '</div>' + partPill(st) + '</div>' +
      (needReason && canManageParticipation() ? '<div class="field2" style="margin:10px 0 0"><input id="pp-reason-' + key + '" placeholder="Reason (required to suspend or close)"/></div>' : '') +
      (actions.length ? '<div class="ract" style="gap:8px;padding:10px 0 0">' + actions.join('') + '</div>' : (st === 'closed' ? '<div class="muted" style="font-size:11.5px;padding-top:8px">Closed — record retained, cannot be re-activated.</div>' : '')) +
      '</div>';
  }
  function participationPanel(pt) {
    return '<div class="card"><div class="ch">Program participation</div>' +
      '<div class="muted" style="font-size:11.5px;padding:8px 16px 0">Per-program status — separate from the partner’s account status. Suspend and close retain history; nothing is deleted.</div>' +
      progRow(pt, 'zero', 'Zero Investment') +
      progRow(pt, 'with', 'With Investment') +
      '</div>';
  }

  // ---- route gating: which sections each role may open --------------------
  var COMMON = ['denied', 'notifications'];
  var ALLOWED = {
    'Super Admin': null, // everything
    'Manager': ['dashboard', 'leads', 'lead', 'approvals', 'application', 'partners', 'partner', 'meetings', 'consultations', 'support', 'ticket', 'support-summary', 'client-chat', 'catalogue', 'taskboard', 'taskassign', 'task', 'teamcompletion', 'missed', 'targets', 'documents', 'document', 'accesslog'].concat(COMMON),
    'Finance Officer': ['finance', 'webhooks', 'webhook', 'wires', 'commissions', 'commission', 'commission-create', 'commissionledger', 'settlements', 'settlement', 'ledger', 'investment', 'investment-detail', 'bookings', 'booking', 'partners', 'partner', 'support', 'ticket', 'support-summary', 'documents', 'document', 'accesslog'].concat(COMMON),
    'Legal / Document Controller': ['dashboard', 'kyc', 'kyc-view', 'documents', 'document', 'accesslog', 'clients', 'client', 'partners', 'partner'].concat(COMMON)
  };
  function canView(section) {
    var a = ALLOWED[staff.role];
    return a === null || a.indexOf(section) >= 0;
  }
  // depth of the current role's primary work queue (for the topbar badge)
  function roleQueueDepth(role, c) {
    if (role === 'Manager') return c.leads + c.approvals + c.meetings + c.consultations + c.tickets;
    if (role === 'Finance Officer') return c.webhooks + c.wires + c.commissions + c.settlements;
    if (role === 'Legal / Document Controller') return c.kyc + c.docsUnclassified;
    return c.kyc + c.webhooks + c.approvals + c.commissions + c.settlements; // Super Admin: everything waiting
  }

  // ---- counts -------------------------------------------------------------
  function counts() {
    return {
      clients: DB.clients.length,
      kyc: DB.clients.filter(function (c) { return c.kycStatus === 'pending'; }).length,
      bookings: DB.bookings.filter(function (b) { return b.status === 'confirmed'; }).length,
      webhooks: DB.webhooks.filter(function (w) { return w.status === 'pending'; }).length,
      partners: DB.partners.length,
      approvals: DB.applications.filter(function (a) { return a.status === 'pending'; }).length,
      leads: DB.leads.filter(function (l) { return l.status !== 'converted' && l.status !== 'rejected'; }).length,
      commissions: DB.commissions.filter(function (c) { return c.status === 'pending'; }).length,
      settlements: DB.settlements.filter(function (s) { return s.status === 'requested' || s.status === 'approved_awaiting_payment'; }).length,
      enquiries: DB.investmentEnquiries.filter(function (e) { return e.status === 'new'; }).length,
      meetings: DB.meetings.filter(function (m) { return m.status === 'requested'; }).length,
      consultations: (DB.consultations || []).filter(function (m) { return m.status === 'requested'; }).length,
      tickets: DB.tickets.filter(function (t) { return t.status !== 'resolved'; }).length,
      wires: (DB.wires || []).filter(function (w) { return w.status === 'pending'; }).length,
      docsUnclassified: (DB.documents || []).filter(function (d) { return d.isCurrent && d.lifecycleStatus === 'active' && (d.verificationStatus === 'uploaded' || d.verificationStatus === 'underReview' || d.scanStatus === 'quarantined'); }).length,
      tasksOpen: (DB.tasks || []).filter(function (t) { return t.status === 'assigned' || t.status === 'in_progress'; }).length,
      tasksOverdue: (DB.tasks || []).filter(function (t) { return t.status === 'overdue'; }).length,
      unread: (DB.notifications.admin || []).filter(function (n) { return !n.read; }).length
    };
  }

  var lastByRole = {};
  function go(section, params) {
    if (!canView(section)) { nav = { section: 'denied', params: { attempted: section } }; render(); return; }
    nav = { section: section, params: params || {} };
    lastByRole[staff.role] = section; // remember where each desk left off
    var m = document.querySelector('.main'); if (m) m.scrollTo(0, 0);
    render();
  }

  // ---- render root --------------------------------------------------------
  function render() {
    var c = counts();
    // preserve the sidebar's scroll offset — the whole shell is rebuilt each
    // render, which would otherwise snap the nav back to the top on every click
    var prevNav = root.querySelector('.side nav');
    var navScroll = prevNav ? prevNav.scrollTop : 0;
    root.innerHTML = topbar(c) + '<div class="body">' + sidebar(c) + '<div class="main">' + main() + '</div>' + rail() + '</div>';
    var newNav = root.querySelector('.side nav');
    if (newNav && navScroll) newNav.scrollTop = navScroll;
    if (flashRef) {
      var el = root.querySelector('[data-ref="' + flashRef + '"]');
      if (el) { el.classList.add('flash'); el.scrollIntoView({ block: 'nearest' }); }
      flashRef = null;
    }
    var led = document.querySelector('.rh .led'); if (led) led.classList.toggle('live', connected);
    if (nav.section === 'taskboard') wireTaskboard();
    // tell the shell which section we're on, so view-switches can restore place
    try { window.parent.postMessage({ salmonAdminSection: nav.section }, '*'); } catch (e) {}
  }

  // landing section for a role (used when the role switches)
  function landingFor(role) {
    if (role === 'Finance Officer') return 'finance';
    if (role === 'Manager') return 'leads';
    if (role === 'Legal / Document Controller') return 'kyc';
    return 'dashboard';
  }

  // shell drives the admin's landing route on a view switch
  window.addEventListener('message', function (ev) {
    var d = ev.data || {};
    if (d.salmonGoSection && SECTIONS[d.salmonGoSection]) {
      go(canView(d.salmonGoSection) ? d.salmonGoSection : landingFor(staff.role), {});
    }
  });

  // ---- topbar -------------------------------------------------------------
  function topbar(c) {
    var titles = {
      dashboard: ['Dashboard', 'Live operations overview'],
      clients: ['Global Clients', 'People · client directory'],
      client: ['Client profile', 'People'],
      kyc: ['KYC review queue', 'Compliance'],
      'kyc-view': ['KYC decision', 'Compliance'],
      bookings: ['Bookings', 'Sales'],
      booking: ['Booking detail', 'Sales'],
      finance: ['Finance dashboard', 'Finance'],
      webhooks: ['Webhook reconciliation', 'Finance'],
      webhook: ['Webhook detail', 'Finance'],
      ledger: ['Customer ledger', 'Finance'],
      partners: ['Sales Partners', 'Partners · directory'],
      partner: ['Partner profile', 'Partners'],
      approvals: ['Partner approval queue', 'Partners'],
      application: ['Application review', 'Partners'],
      leads: ['Leads', 'Pipeline'],
      lead: ['Lead detail', 'Pipeline'],
      commissions: ['Commission queue', 'Finance'],
      commission: ['Commission approval', 'Finance'],
      'commission-create': ['Create commission', 'Finance'],
      commissionledger: ['Commission ledger', 'Finance'],
      settlements: ['Settlement queue', 'Finance'],
      settlement: ['Settlement decision', 'Finance'],
      investment: ['Investment enquiries', 'Finance · stub'],
      'investment-detail': ['Investment enquiry', 'Finance · stub'],
      meetings: ['Meetings', 'Scheduler'],
      consultations: ['Consultation / visit', 'Scheduler'],
      support: ['Support inbox', 'Support'],
      ticket: ['Support ticket', 'Support'],
      'support-summary': ['Support summary', 'Support'],
      'client-chat': ['Client chat console', 'Support'],
      docs: ['Document activity', 'Compliance'],
      documents: ['Document repository', 'Compliance'],
      accesslog: ['Document access log', 'Compliance'],
      wires: ['Wire verification', 'Finance'],
      catalogue: ['Catalogue', 'Projects'],
      taskboard: ['Tasks board', 'Tasks & Targets'],
      taskassign: ['Assign a task', 'Tasks & Targets'],
      task: ['Task detail', 'Tasks & Targets'],
      teamcompletion: ['Team completion', 'Tasks & Targets'],
      missed: ['Missed activities', 'Tasks & Targets'],
      targets: ['Target management', 'Tasks & Targets'],
      orgtasks: ['Org-wide task activity', 'Tasks & Targets'],
      territorytrend: ['Territory trend', 'Tasks & Targets'],
      templates: ['Task templates', 'Tasks & Targets'],
      denied: ['Access denied', 'Permissions']
    };
    var t = titles[nav.section] || titles.dashboard;
    var depth = roleQueueDepth(staff.role, c);
    var opts = DB.staff.map(function (s) { return '<option value="' + s.id + '"' + (s.id === staff.id ? ' selected' : '') + '>' + E(roleShort(s.role)) + ' — ' + E(s.name) + '</option>'; }).join('');
    return '<div class="topbar">' +
      '<img class="logo" src="/shared/salmon-logo.svg" alt="Salmon"/>' +
      '<div class="crumb">' + E(t[0]) + ' <span class="sub">· ' + E(t[1]) + '</span></div>' +
      '<div class="spacer"></div>' +
      // prominent, badged role switcher — the presenter's weapon
      '<div class="roleswitch ' + (isSuper() ? 'super' : '') + '" title="Switch desk — sidebar + queues rebuild instantly">' +
        '<span class="rs-ic">' + I.badge + '</span>' +
        '<select data-act="role">' + opts + '</select>' +
        '<span class="rs-badge ' + (depth ? 'hot' : '') + '">' + depth + ' waiting</span>' +
      '</div>' +
      '<button class="iconbtn" data-act="notifs" title="Notifications">' + I.bell + (c.unread ? '<span class="badge">' + c.unread + '</span>' : '') + '</button>' +
      '<div class="staffchip"><div class="av">' + E(staff.initials) + '</div><div><div class="sn">' + E(staff.name) + '</div><div class="sr">' + E(staff.role) + '</div></div></div>' +
      '</div>';
  }

  // ---- sidebar (rebuilds per role) ---------------------------------------
  var PARENT = { client: 'clients', 'kyc-view': 'kyc', booking: 'bookings', webhook: 'webhooks',
    partner: 'partners', application: 'approvals', lead: 'leads', commission: 'commissions',
    settlement: 'settlements', 'investment-detail': 'investment', ticket: 'support', 'support-summary': 'support', 'client-chat': 'support', task: 'taskboard', document: 'documents',
    'commission-create': 'commissions', commissionledger: 'commissions' };
  function sidebar(c) {
    function item(sec, label, icon, count, hot) {
      var active = nav.section === sec || PARENT[nav.section] === sec;
      return '<div class="navitem ' + (active ? 'on' : '') + '" data-nav="' + sec + '">' + icon + '<span>' + label + '</span>' +
        (count != null ? '<span class="count ' + (hot && count ? 'hot' : '') + '">' + count + '</span>' : '') + '</div>';
    }
    function grp(t) { return '<div class="grp">' + t + '</div>'; }
    var role = staff.role;
    var nn = '';
    if (role === 'Super Admin') {
      nn = grp('Overview') + item('dashboard', 'Dashboard', I.dash) +
        grp('People') + item('clients', 'Global Clients', I.people, c.clients) + item('kyc', 'KYC review', I.shield, c.kyc, true) +
        grp('Partners') + item('partners', 'Sales Partners', I.badge, c.partners) + item('approvals', 'Approvals', I.people, c.approvals, true) + item('leads', 'Leads', I.doc, c.leads, true) +
        grp('Finance') + item('finance', 'Finance dashboard', I.finance) + item('webhooks', 'Reconciliation', I.hook, c.webhooks, true) + item('wires', 'Wire verification', I.cash, c.wires, true) + item('commissions', 'Commissions', I.cash, c.commissions, true) + item('commissionledger', 'Commission ledger', I.ledger) + item('settlements', 'Settlements', I.ledger, c.settlements, true) + item('ledger', 'Ledgers', I.ledger) +
        grp('Tasks &amp; Targets') + item('taskboard', 'Tasks board', I.check, c.tasksOpen) + item('taskassign', 'Assign a task', I.plus) + item('teamcompletion', 'Team completion', I.people) + item('missed', 'Missed activities', I.cal, c.tasksOverdue, true) + item('targets', 'Targets', I.scale) + item('orgtasks', 'Org activity', I.dash) + item('territorytrend', 'Territory trend', I.finance) + item('templates', 'Templates', I.box) +
        grp('Operations') + item('meetings', 'Meetings', I.cal, c.meetings, true) + item('consultations', 'Consultation / visit', I.cal, c.consultations, true) + item('investment', 'Investment', I.scale, c.enquiries) + item('documents', 'Documents', I.box) + item('accesslog', 'Access log', I.box) + item('catalogue', 'Catalogue', I.build) +
        grp('Support') + item('support', 'Support inbox', I.inbox, c.tickets, true) + item('support-summary', 'Summary', I.scale) + item('client-chat', 'Client chat', I.help);
    } else if (role === 'Manager') {
      nn = grp('Overview') + item('dashboard', 'Dashboard', I.dash) +
        grp('Pipeline') + item('leads', 'Leads', I.doc, c.leads, true) + item('approvals', 'Approvals', I.people, c.approvals, true) + item('partners', 'Sales Partners', I.badge, c.partners) +
        grp('Tasks &amp; Targets') + item('taskboard', 'Tasks board', I.check, c.tasksOpen) + item('taskassign', 'Assign a task', I.plus) + item('teamcompletion', 'Team completion', I.people) + item('missed', 'Missed activities', I.cal, c.tasksOverdue, true) + item('targets', 'Targets', I.scale) +
        grp('Scheduling') + item('meetings', 'Meetings', I.cal, c.meetings, true) + item('consultations', 'Consultation / visit', I.cal, c.consultations, true) + item('catalogue', 'Catalogue', I.build) +
        grp('Support') + item('support', 'Support inbox', I.inbox, c.tickets, true) + item('support-summary', 'Summary', I.scale) + item('client-chat', 'Client chat', I.help);
    } else if (role === 'Finance Officer') {
      nn = grp('Overview') + item('finance', 'Finance dashboard', I.finance) +
        grp('Finance') + item('webhooks', 'Reconciliation', I.hook, c.webhooks, true) + item('wires', 'Wire verification', I.cash, c.wires, true) + item('commissions', 'Commissions', I.cash, c.commissions, true) + item('commissionledger', 'Commission ledger', I.ledger) + item('settlements', 'Settlements', I.ledger, c.settlements, true) + item('ledger', 'Ledgers', I.ledger) + item('investment', 'Investment', I.scale, c.enquiries) +
        grp('Support') + item('support', 'Support inbox', I.inbox, c.tickets, true) + item('support-summary', 'Summary', I.scale);
    } else { // Legal / Document Controller
      nn = grp('Overview') + item('dashboard', 'Dashboard', I.dash) +
        grp('Compliance') + item('kyc', 'KYC review', I.shield, c.kyc, true) + item('documents', 'Documents', I.box) + item('accesslog', 'Access log', I.box) +
        grp('People') + item('clients', 'Global Clients', I.people, c.clients) + item('partners', 'Sales Partners', I.badge, c.partners);
    }
    var opts = DB.staff.map(function (s) { return '<option value="' + s.id + '"' + (s.id === staff.id ? ' selected' : '') + '>' + E(s.role) + ' — ' + E(s.name) + '</option>'; }).join('');
    return '<div class="side"><nav>' + nn + '</nav>' +
      '<div class="devbar"><div class="dl">' + I.tool + 'Dev toolbar · role</div>' +
        '<select data-act="role">' + opts + '</select></div>' +
      '</div>';
  }

  // ---- main dispatch ------------------------------------------------------
  function main() {
    if (!canView(nav.section)) return SECTIONS.denied({ attempted: nav.section });
    var fn = SECTIONS[nav.section] || stubSection;
    return fn(nav.params);
  }
  var SECTIONS = {};

  // ---- dashboard trend charts (Req #1) ------------------------------------
  // Illustrative historical series (the live store holds only "now"). Monthly =
  // last 12 months; Yearly = last 5 years. Which metrics show is role-based.
  var dashRange = 'month';
  var SERIES = {
    month: {
      labels: ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
      revenue:     [42, 38, 51, 47, 55, 62, 58, 66, 71, 69, 78, 84],
      sales:       [8, 7, 11, 9, 12, 14, 13, 15, 16, 15, 18, 20],
      profit:      [9, 8, 12, 11, 14, 16, 15, 18, 20, 19, 23, 26],
      leads:       [22, 19, 27, 24, 30, 33, 31, 36, 39, 37, 44, 48],
      conversions: [5, 4, 7, 6, 8, 10, 9, 11, 12, 11, 14, 16],
      reconciled:  [38, 35, 46, 43, 50, 57, 54, 61, 66, 64, 73, 80],
      pending:     [6, 5, 7, 5, 6, 8, 6, 7, 6, 8, 7, 9],
      kyc:         [14, 12, 17, 15, 19, 22, 20, 24, 26, 25, 29, 32],
      docs:        [18, 16, 21, 19, 24, 27, 25, 29, 31, 30, 34, 38]
    },
    year: {
      labels: ['2022', '2023', '2024', '2025', '2026'],
      revenue:     [318, 442, 561, 690, 812],
      sales:       [74, 101, 128, 156, 184],
      profit:      [86, 124, 168, 214, 262],
      leads:       [188, 254, 322, 396, 470],
      conversions: [41, 58, 77, 98, 121],
      reconciled:  [292, 408, 522, 642, 758],
      pending:     [58, 66, 71, 74, 79],
      kyc:         [142, 196, 248, 302, 356],
      docs:        [176, 232, 296, 358, 422]
    }
  };
  // fmt: 'bdt' → ৳NN lakh (values are in lakh BDT); 'num' → plain count
  function chartFmt(v, fmt) { return fmt === 'bdt' ? '৳' + v + 'L' : String(v); }
  var CHART_METRICS = {
    'Super Admin': [
      { key: 'revenue', title: 'Revenue', fmt: 'bdt', color: 'maroon' },
      { key: 'sales', title: 'Units booked', fmt: 'num', color: 'blue' },
      { key: 'profit', title: 'Gross profit', fmt: 'bdt', color: 'green' },
      { key: 'reconciled', title: 'Payments reconciled', fmt: 'bdt', color: 'violet' }
    ],
    'Finance Officer': [
      { key: 'revenue', title: 'Revenue', fmt: 'bdt', color: 'maroon' },
      { key: 'reconciled', title: 'Reconciled', fmt: 'bdt', color: 'green' },
      { key: 'profit', title: 'Gross profit', fmt: 'bdt', color: 'blue' },
      { key: 'pending', title: 'Awaiting reconciliation', fmt: 'bdt', color: 'amber' }
    ],
    'Manager': [
      { key: 'sales', title: 'Units booked', fmt: 'num', color: 'maroon' },
      { key: 'leads', title: 'Leads created', fmt: 'num', color: 'blue' },
      { key: 'conversions', title: 'Conversions', fmt: 'num', color: 'green' },
      { key: 'revenue', title: 'Revenue', fmt: 'bdt', color: 'violet' }
    ],
    'Legal / Document Controller': [
      { key: 'kyc', title: 'KYC decisions', fmt: 'num', color: 'maroon' },
      { key: 'docs', title: 'Documents processed', fmt: 'num', color: 'blue' }
    ]
  };
  function chartRangeToggle() {
    return '<div class="tbtoggle" role="tablist">' +
      '<button data-act="dashrange" data-range="month" class="' + (dashRange === 'month' ? 'on' : '') + '">Monthly</button>' +
      '<button data-act="dashrange" data-range="year" class="' + (dashRange === 'year' ? 'on' : '') + '">Yearly</button>' +
      '</div>';
  }
  function vchart(metric) {
    var s = SERIES[dashRange];
    var vals = s[metric.key] || [];
    var labels = s.labels;
    var max = Math.max.apply(null, vals.concat([1]));
    var last = vals[vals.length - 1] || 0, prev = vals[vals.length - 2] || last;
    var delta = prev ? Math.round((last - prev) / prev * 100) : 0;
    var cols = vals.map(function (v, i) {
      var h = Math.max(3, Math.round(v / max * 100));
      var isLast = i === vals.length - 1;
      return '<div class="vcol"><div class="vbarwrap"><div class="vbar ' + metric.color + (isLast ? ' cur' : '') + '" style="height:' + h + '%" title="' + E(labels[i]) + ': ' + chartFmt(v, metric.fmt) + '">' +
        '<span class="vval">' + chartFmt(v, metric.fmt) + '</span></div></div>' +
        '<div class="vlbl">' + E(labels[i]) + '</div></div>';
    }).join('');
    return '<div class="chartcard">' +
      '<div class="cc-t">' + E(metric.title) + '</div>' +
      '<div class="cc-v">' + chartFmt(last, metric.fmt) +
        ' <span class="cc-d ' + (delta >= 0 ? 'up' : 'down') + '">' + (delta >= 0 ? '▲' : '▼') + ' ' + Math.abs(delta) + '%</span></div>' +
      '<div class="vchart ' + (labels.length <= 6 ? 'few' : '') + '">' + cols + '</div></div>';
  }
  function dashCharts(role) {
    var metrics = CHART_METRICS[role] || CHART_METRICS['Super Admin'];
    return '<div class="card chartpanel">' +
      '<div class="cp-h"><div><div class="cp-t">Performance trend</div>' +
        '<div class="cp-s">' + (dashRange === 'month' ? 'Last 12 months' : 'Last 5 years') + ' · amounts in lakh BDT</div></div>' +
        '<span class="spacer"></span>' + chartRangeToggle() + '</div>' +
      '<div class="charts-grid">' + metrics.map(vchart).join('') + '</div></div>';
  }

  SECTIONS.dashboard = function () {
    if (staff.role === 'Manager') return managerDash();
    if (staff.role === 'Legal / Document Controller') return legalDash();
    if (staff.role === 'Finance Officer') return SECTIONS.finance();
    var c = counts();
    var pendingAmt = DB.webhooks.filter(function (w) { return w.status === 'pending'; }).reduce(function (n, w) { return n + w.amountBdt; }, 0);
    return pageH('Dashboard', 'Everything below updates live as the client acts — no refresh.') +
      '<div class="kpis">' +
        kpi('New clients', c.clients, 'in directory', false) +
        kpi('KYC to review', c.kyc, 'awaiting decision', c.kyc > 0) +
        kpi('To reconcile', c.webhooks, BDT(pendingAmt) + ' pending', c.webhooks > 0) +
        kpi('Confirmed bookings', c.bookings, 'units booked', false) +
      '</div>' +
      dashCharts('Super Admin') +
      '<div class="card"><div class="ch">Live queues<span class="spacer"></span><span class="muted" style="font-weight:500">click through to act</span></div>' +
        '<table><tbody>' +
          queueRow('kyc', I.shield, 'KYC review queue', c.kyc + ' pending', c.kyc > 0) +
          queueRow('webhooks', I.hook, 'Webhook reconciliation', c.webhooks + ' pending', c.webhooks > 0) +
          queueRow('bookings', I.doc, 'Bookings', c.bookings + ' confirmed', false) +
          queueRow('clients', I.people, 'Global clients', c.clients + ' total', false) +
        '</tbody></table>' +
      '</div>' +
      recentCard();
  };
  function queueRow(sec, icon, label, meta, hot) {
    return '<tr class="click" data-nav="' + sec + '"><td style="width:44px">' + '<span class="ract" style="padding:0"><span class="ri ' + (hot ? 'maroon' : 'blue') + '">' + icon + '</span></span>' + '</td>' +
      '<td style="font-weight:700">' + label + '</td>' +
      '<td>' + (hot ? '<span class="pill maroon"><span class="dot"></span>' + meta + '</span>' : '<span class="muted">' + meta + '</span>') + '</td>' +
      '<td style="text-align:right;color:var(--ink-faint)">' + I.chevr + '</td></tr>';
  }
  function recentCard() {
    var evts = (DB.events || []).slice(0, 6);
    return '<div class="card"><div class="ch">Recent events</div><table><tbody>' +
      (evts.length ? evts.map(function (e) {
        return '<tr><td class="mono" style="width:90px;color:var(--ink-faint)">' + new Date(e.ts).toLocaleTimeString('en-GB') + '</td>' +
          '<td class="mono" style="color:var(--blue)">' + E(e.type) + '</td>' +
          '<td class="muted">' + E(eventSummary(e)) + '</td></tr>';
      }).join('') : '<tr><td class="empty" colspan="3">No events yet — act on the client side.</td></tr>') +
      '</tbody></table></div>';
  }
  function eventSummary(e) {
    var d = e.data || {};
    if (d.client) return d.client.name;
    if (d.booking) return d.booking.unitNo + ' · ' + (d.booking.clientName || '');
    if (d.webhook) return d.webhook.reference + ' · ' + BDT(d.webhook.amountBdt);
    return '';
  }

  // ---- clients ------------------------------------------------------------
  SECTIONS.clients = function () {
    var rows = DB.clients.slice().reverse();
    return pageH('Global Clients', DB.clients.length + ' clients · new registrations appear here live') +
      '<div class="card"><table><thead><tr><th>Client</th><th>Country</th><th>KYC</th><th>Registered</th><th></th></tr></thead><tbody>' +
        rows.map(function (c) {
          return '<tr class="click" data-nav="client" data-id="' + c.id + '" data-ref="' + c.id + '">' +
            '<td><div class="ract" style="padding:0;align-items:center"><span class="avatar-lg" style="width:32px;height:32px;font-size:12px">' + E(initials(c.name)) + '</span>' +
              '<div><div style="font-weight:700">' + E(c.name) + '</div><div class="muted" style="font-size:12px">' + E(c.email) + '</div></div></div></td>' +
            '<td>' + E(c.country || '—') + '</td>' +
            '<td>' + kycPill(c.kycStatus) + '</td>' +
            '<td class="muted">' + Salmon.timeAgo(c.createdAt) + '</td>' +
            '<td style="text-align:right;color:var(--ink-faint)">' + I.chevr + '</td></tr>';
        }).join('') +
      '</tbody></table></div>';
  };

  SECTIONS.client = function (p) {
    var c = DB.clients.find(function (x) { return x.id === p.id; });
    if (!c) return SECTIONS.clients();
    var bookings = DB.bookings.filter(function (b) { return b.clientId === c.id; });
    return backH('clients', c.name, c.id) +
      '<div class="detail">' +
        '<div class="card"><div class="ch">Bookings</div>' +
          (bookings.length ? '<table><thead><tr><th>Reference</th><th>Unit</th><th>Token</th><th>Status</th></tr></thead><tbody>' +
            bookings.map(function (b) {
              return '<tr class="click" data-nav="booking" data-id="' + b.id + '"><td class="mono">' + E(b.id) + '</td><td>' + E(b.projectName) + ' · ' + E(b.unitNo) + '</td><td class="tnum">' + BDT(b.amountBdt) + '</td><td>' + bookingPill(b) + '</td></tr>';
            }).join('') + '</tbody></table>' : '<div class="empty">No bookings yet.</div>') +
          '<div class="ch" style="border-top:.5px solid var(--line)">Ledger<span class="spacer"></span><span class="linkish" data-nav="ledger" data-id="' + c.id + '">Open full ledger ' + I.chevr + '</span></div>' +
          ledgerMini(c) +
        '</div>' +
        '<div class="card"><div class="ch">Profile</div><div style="padding:16px">' +
          '<div class="ract" style="padding:0 0 14px;align-items:center"><span class="avatar-lg">' + E(initials(c.name)) + '</span>' +
            '<div><div style="font-weight:800;font-size:16px">' + E(c.name) + '</div><div class="muted">' + E(c.email) + '</div></div></div>' +
          '<div class="kv2"><span class="k">Phone</span><span class="v">' + E(c.phone || '—') + '</span></div>' +
          '<div class="kv2"><span class="k">Country</span><span class="v">' + E(c.country || '—') + '</span></div>' +
          '<div class="kv2"><span class="k">Registered</span><span class="v">' + new Date(c.createdAt).toLocaleString('en-GB') + '</span></div>' +
          '<div class="kv2"><span class="k">KYC status</span><span class="v">' + kycPill(c.kycStatus) + '</span></div>' +
          (c.kycStatus === 'pending' ? '<button class="btn primary" style="margin-top:14px;width:100%" data-nav="kyc-view" data-id="' + c.id + '">Review KYC ' + I.chevr + '</button>' : '') +
        '</div></div>' +
      '</div>';
  };

  // ---- KYC ----------------------------------------------------------------
  SECTIONS.kyc = function () {
    var q = DB.clients.filter(function (c) { return c.kycStatus === 'pending'; });
    return pageH('KYC review queue', q.length + ' document(s) awaiting a decision') +
      '<div class="card"><table><thead><tr><th>Client</th><th>Country</th><th>Document</th><th>Submitted</th><th></th></tr></thead><tbody>' +
        (q.length ? q.map(function (c) {
          return '<tr class="click" data-nav="kyc-view" data-id="' + c.id + '" data-ref="' + c.id + '"><td style="font-weight:700">' + E(c.name) + '</td><td>' + E(c.country || '—') + '</td>' +
            '<td class="mono">' + E(c.kycFile || 'passport.jpg') + '</td><td class="muted">just now</td>' +
            '<td style="text-align:right"><span class="pill amber"><span class="dot"></span>Pending</span></td></tr>';
        }).join('') : '<tr><td class="empty" colspan="5">Queue clear — no KYC pending. Upload a passport on the client side.</td></tr>') +
      '</tbody></table></div>';
  };

  SECTIONS['kyc-view'] = function (p) {
    var c = DB.clients.find(function (x) { return x.id === p.id; });
    if (!c) return SECTIONS.kyc();
    var can = canVerifyKyc();
    var done = c.kycStatus === 'verified';
    var rejected = c.kycStatus === 'rejected';
    var qualityNote = c.kycQuality === 'blurry' ? 'Photo appears low-resolution / blurry.' : c.kycQuality === 'duplicate' ? 'Possible duplicate of an existing document.' : 'Passport · legible';
    return backH('kyc', 'KYC — ' + c.name, c.kycFile || 'passport.jpg') +
      '<div class="detail">' +
        '<div class="card"><div class="ch">Submitted document<span class="spacer"></span><span class="sigbadge" title="Every view of this document is recorded"><span style="width:6px;height:6px;border-radius:50%;background:var(--green);display:inline-block"></span> Viewing logged</span></div><div style="padding:16px">' +
          '<div class="passport">' +
            '<div class="pt">PASSPORT · BANGLADESH / UAE</div>' +
            '<div class="pn">' + E(c.name.toUpperCase()) + '</div>' +
            '<div class="prow"><span>No. A0' + (1000 + (c.id.charCodeAt(3) || 7) * 13) + '</span><span>' + E((c.country || 'BGD').slice(0, 3).toUpperCase()) + '</span></div>' +
            '<div class="prow"><span>DOB 14 MAR 1988</span><span>EXP 09/2031</span></div>' +
            '<div class="mrz">P&lt;' + E((c.country || 'BGD').slice(0, 3).toUpperCase()) + E(c.name.replace(/\s+/g, '&lt;&lt;').toUpperCase()) + '&lt;&lt;&lt;&lt;&lt;&lt;</div>' +
          '</div>' +
          '<div class="muted" style="font-size:12px;margin-top:10px">File: ' + E(c.kycFile || 'passport.jpg') + ' · mock document for demo</div>' +
        '</div></div>' +
        '<div class="card"><div class="ch">Decision</div><div style="padding:16px">' +
          '<div class="kv2"><span class="k">Name match</span><span class="match">' + I.check + ' matches profile</span></div>' +
          '<div class="kv2"><span class="k">Document</span><span class="v">' + E(qualityNote) + '</span></div>' +
          '<div class="kv2"><span class="k">Status</span><span class="v">' + kycPill(c.kycStatus) + '</span></div>' +
          (done
            ? '<div style="margin-top:14px;color:var(--green);font-weight:700;display:flex;gap:8px;align-items:center">' + I.check + ' Verified — client notified live.</div>'
            : rejected
              ? '<div class="banner" style="margin-top:14px;color:var(--red)"><b>Rejected.</b> Reason sent verbatim to the client: “' + E(c.kycReason) + '”.</div>'
              : can
                ? '<button class="btn primary" style="margin-top:16px;width:100%" data-act="kyc-verify" data-id="' + c.id + '">' + I.shield + ' Verify identity</button>' +
                  '<div class="ch" style="margin:16px -16px 0;border-top:.5px solid var(--line)">Or reject</div>' +
                  '<div class="field2" style="margin-top:12px"><label class="fl">Rejection reason (shown verbatim on the client’s phone)</label><textarea id="kyc-reason" rows="2" placeholder="e.g. Photo unclear, please retake."></textarea></div>' +
                  '<button class="btn danger" style="margin-top:10px;width:100%" data-act="kyc-reject" data-id="' + c.id + '">Reject KYC</button>'
                : '<div class="muted" style="margin-top:16px">Your role (' + E(staff.role) + ') can’t decide KYC. Switch to Super Admin or Legal / Document Controller.</div>') +
        '</div></div>' +
      '</div>';
  };

  // ---- bookings -----------------------------------------------------------
  SECTIONS.bookings = function () {
    var rows = DB.bookings.slice().reverse();
    return pageH('Bookings', rows.length + ' booking(s)') +
      '<div class="card"><table><thead><tr><th>Reference</th><th>Client</th><th>Unit</th><th>Token</th><th>Status</th></tr></thead><tbody>' +
        (rows.length ? rows.map(function (b) {
          return '<tr class="click" data-nav="booking" data-id="' + b.id + '" data-ref="' + b.id + '"><td class="mono">' + E(b.id) + '</td><td>' + E(b.clientName) + '</td>' +
            '<td>' + E(b.projectName) + ' · ' + E(b.unitNo) + '</td><td class="tnum">' + BDT(b.amountBdt) + '</td><td>' + bookingPill(b) + '</td></tr>';
        }).join('') : '<tr><td class="empty" colspan="5">No bookings yet.</td></tr>') +
      '</tbody></table></div>';
  };

  SECTIONS.booking = function (p) {
    var b = DB.bookings.find(function (x) { return x.id === p.id; });
    if (!b) return SECTIONS.bookings();
    var wh = DB.webhooks.find(function (w) { return w.bookingId === b.id; });
    return backH('bookings', 'Booking ' + b.id, b.projectName + ' · ' + b.unitNo) +
      '<div class="detail">' +
        '<div class="card"><div class="ch">Booking</div><div style="padding:16px">' +
          '<div class="kv2"><span class="k">Client</span><span class="v linkish" data-nav="client" data-id="' + b.clientId + '">' + E(b.clientName) + '</span></div>' +
          '<div class="kv2"><span class="k">Project · unit</span><span class="v">' + E(b.projectName) + ' · ' + E(b.unitNo) + '</span></div>' +
          '<div class="kv2"><span class="k">Token</span><span class="v">' + BDT(b.amountBdt) + '</span></div>' +
          '<div class="kv2"><span class="k">Payment ref</span><span class="v mono">' + E(b.reference || '—') + '</span></div>' +
          '<div class="kv2"><span class="k">Status</span><span class="v">' + bookingPill(b) + '</span></div>' +
        '</div></div>' +
        '<div class="card"><div class="ch">Reconciliation</div><div style="padding:16px">' +
          (wh
            ? '<div class="kv2"><span class="k">Webhook</span><span class="v mono">' + E(wh.id) + '</span></div>' +
              '<div class="kv2"><span class="k">Signature</span><span class="sigbadge">' + I.check + ' verified</span></div>' +
              '<div class="kv2"><span class="k">Gateway</span><span class="v">' + E(wh.gateway) + '</span></div>' +
              (b.status === 'awaiting_confirmation'
                ? '<button class="btn primary" style="margin-top:14px;width:100%" data-nav="webhook" data-id="' + wh.id + '">Open reconciliation ' + I.chevr + '</button>'
                : b.status === 'confirmed' ? '<div style="margin-top:14px;color:var(--green);font-weight:700;display:flex;gap:8px;align-items:center">' + I.check + ' Confirmed &amp; matched</div>' : '')
            : '<div class="muted">No payment received yet.</div>') +
        '</div></div>' +
      '</div>';
  };

  // ---- finance ------------------------------------------------------------
  SECTIONS.finance = function () {
    var pending = DB.webhooks.filter(function (w) { return w.status === 'pending'; });
    var pendingAmt = pending.reduce(function (n, w) { return n + w.amountBdt; }, 0);
    var matched = DB.webhooks.filter(function (w) { return w.status === 'matched'; });
    var matchedAmt = matched.reduce(function (n, w) { return n + w.amountBdt; }, 0);
    return pageH('Finance dashboard', 'Payments, reconciliation and ledgers') +
      '<div class="kpis">' +
        kpi('To reconcile', pending.length, BDT(pendingAmt) + ' pending', pending.length > 0) +
        kpi('Verified', matched.length, BDT(matchedAmt) + ' cleared', false) +
        kpi('Gateways live', 3, 'Stripe · SSLCommerz · Wire', false) +
        kpi('Clients', DB.clients.length, 'with ledgers', false) +
      '</div>' +
      dashCharts('Finance Officer') +
      '<div class="card"><div class="ch">' + I.hook + ' Webhook reconciliation queue<span class="spacer"></span><span class="linkish" data-nav="webhooks">Open queue ' + I.chevr + '</span></div>' +
        webhookTable(DB.webhooks.slice(0, 6)) +
      '</div>' +
      '<div class="card"><div class="ch">Payment gateways</div><table><thead><tr><th>Gateway</th><th>Enabled for</th><th>Status</th></tr></thead><tbody>' +
        DB.gateways.map(function (g) {
          return '<tr><td style="font-weight:700">' + E(g.name) + '</td><td class="muted">' + E(g.enabledFor.join(', ').replace('*', 'All regions')) + '</td><td><span class="pill green"><span class="dot"></span>Enabled</span></td></tr>';
        }).join('') +
      '</tbody></table></div>';
  };

  // ---- webhook reconciliation --------------------------------------------
  SECTIONS.webhooks = function () {
    return pageH('Webhook reconciliation', DB.webhooks.filter(function (w) { return w.status === 'pending'; }).length + ' awaiting confirmation') +
      '<div class="card">' + webhookTable(DB.webhooks) + '</div>';
  };
  function webhookTable(list) {
    return '<table><thead><tr><th>Reference</th><th>Type</th><th>Client</th><th>Amount</th><th>Signature</th><th>Status</th></tr></thead><tbody>' +
      (list.length ? list.map(function (w) {
        return '<tr class="click" data-nav="webhook" data-id="' + w.id + '" data-ref="' + w.id + '">' +
          '<td class="mono">' + E(w.reference) + '</td>' +
          '<td>' + (w.kind === 'booking' ? 'Booking token' : 'Installment') + '</td>' +
          '<td>' + E(w.clientName) + '</td>' +
          '<td class="tnum">' + BDT(w.amountBdt) + '</td>' +
          '<td><span class="sigbadge">' + I.check + ' verified</span></td>' +
          '<td>' + webhookPill(w) + '</td></tr>';
      }).join('') : '<tr><td class="empty" colspan="6">No webhooks yet — pay something on the client side.</td></tr>') +
    '</tbody></table>';
  }

  SECTIONS.webhook = function (p) {
    var w = DB.webhooks.find(function (x) { return x.id === p.id; });
    if (!w) return SECTIONS.webhooks();
    var isBooking = w.kind === 'booking';
    var booking = isBooking ? DB.bookings.find(function (b) { return b.id === w.bookingId; }) : null;
    var canAct = canConfirmPay();
    var settled = w.status === 'matched';
    var expired = w.status === 'expired' || (booking && booking.status === 'expired');
    var expected = isBooking ? (booking ? booking.amountBdt : w.amountBdt) : w.amountBdt;
    var amountMatch = expected === w.amountBdt && !w.currencyMismatch;
    return backH('webhooks', 'Webhook ' + w.reference, w.id) +
      '<div class="detail">' +
        '<div class="card"><div class="ch">Payload</div><div style="padding:16px">' +
          '<div class="kv2"><span class="k">Reference</span><span class="v mono">' + E(w.reference) + '</span></div>' +
          '<div class="kv2"><span class="k">Type</span><span class="v">' + (isBooking ? 'Booking token' : E(w.label || 'Installment')) + '</span></div>' +
          '<div class="kv2"><span class="k">Client</span><span class="v">' + E(w.clientName) + '</span></div>' +
          '<div class="kv2"><span class="k">Project · unit</span><span class="v">' + E(w.projectName) + ' · ' + E(w.unitNo) + '</span></div>' +
          '<div class="kv2"><span class="k">Amount</span><span class="v tnum">' + BDT(w.amountBdt) + '</span></div>' +
          '<div class="kv2"><span class="k">Gateway</span><span class="v">' + E(w.gateway) + '</span></div>' +
          '<div class="kv2"><span class="k">Signature</span><span class="sigbadge">' + I.check + ' verified</span></div>' +
          '<div class="kv2"><span class="k">Status</span><span class="v">' + webhookPill(w) + '</span></div>' +
        '</div></div>' +
        '<div class="card"><div class="ch">Match &amp; confirm</div><div style="padding:16px">' +
          '<div class="kv2"><span class="k">Expected amount</span><span class="v tnum">' + BDT(expected) + '</span></div>' +
          '<div class="kv2"><span class="k">Received amount</span><span class="v tnum">' + BDT(w.amountBdt) + '</span></div>' +
          '<div class="kv2"><span class="k">Reference match</span><span class="match">' + I.check + ' exact</span></div>' +
          '<div class="kv2"><span class="k">Amount match</span>' + (amountMatch ? '<span class="match">' + I.check + ' exact</span>' : '<span class="pill red"><span class="dot"></span>mismatch</span>') + '</div>' +
          (settled
            ? '<div style="margin-top:16px;color:var(--green);font-weight:700;display:flex;gap:8px;align-items:center">' + I.check + ' Reconciled — ' + (isBooking ? 'booking confirmed' : 'installment verified') + '.</div>'
            : expired
              ? '<div class="banner" style="margin-top:16px;color:var(--red);font-weight:700">Lock expired — this booking can no longer be confirmed.</div>'
              : !amountMatch
                ? '<div class="banner" style="margin-top:16px;background:var(--red-bg);color:var(--red)"><b>Amount mismatch — expected ' + BDT(expected) + ', received ' + BDT(w.amountBdt) + '.</b> Confirmation is blocked until the gateway payload matches. Investigate before confirming.</div>' +
                  '<button class="btn primary" style="margin-top:12px;width:100%" disabled>Confirm booking</button>'
                : canAct
                ? (isBooking
                    ? '<button class="btn primary" style="margin-top:16px;width:100%" data-act="confirm-booking" data-id="' + w.bookingId + '">' + I.check + ' Confirm booking</button>'
                    : '<button class="btn primary" style="margin-top:16px;width:100%" data-act="verify-inst" data-cid="' + w.clientId + '" data-id="' + w.installmentId + '">' + I.check + ' Verify installment</button>')
                : '<div class="muted" style="margin-top:16px">Your role (' + E(staff.role) + ') can’t confirm payments. Switch to Super Admin or Finance Officer.</div>') +
        '</div></div>' +
      '</div>';
  };

  // ---- customer ledger ----------------------------------------------------
  SECTIONS.ledger = function (p) {
    var withLedger = DB.clients.filter(function (c) { return (c.ledger && c.ledger.length) || (c.schedule && c.schedule.length); });
    var c = p.id ? DB.clients.find(function (x) { return x.id === p.id; }) : withLedger[0];
    if (!c) return pageH('Customer ledgers', 'No ledgers yet') + '<div class="card"><div class="empty">No ledgers yet.</div></div>';
    var picker = '<select data-act="ledger-pick" style="height:32px;border:.5px solid var(--line-strong);border-radius:8px;padding:0 8px;font-family:inherit">' +
      withLedger.map(function (x) { return '<option value="' + x.id + '"' + (x.id === c.id ? ' selected' : '') + '>' + E(x.name) + '</option>'; }).join('') + '</select>';
    var sched = c.schedule || [];
    var total = sched.reduce(function (n, i) { return n + i.amountBdt; }, 0);
    var paid = sched.filter(function (i) { return i.status === 'paid'; }).reduce(function (n, i) { return n + i.amountBdt; }, 0);
    var invBtn = canFinance() ? '<button class="btn sm" data-act="generate-invoice" data-id="' + c.id + '">' + I.doc + ' Generate invoice</button>' : '';
    return '<div class="page-h"><div><h1>Customer ledger</h1><div class="desc">' + E(c.name) + ' · ' + E(c.scheduleProjectName || '—') + ' ' + E(c.scheduleUnitNo || '') + '</div></div><span class="hstack" style="gap:8px">' + invBtn + picker + '</span></div>' +
      '<div class="kpis">' +
        kpi('Schedule total', BDT(total), 'incl. token', false) +
        kpi('Verified paid', BDT(paid), 'cleared', false) +
        kpi('Outstanding', BDT(total - paid), 'remaining', true) +
        kpi('Installments', sched.filter(function (i) { return i.status === 'paid'; }).length + '/' + sched.length, 'verified', false) +
      '</div>' +
      '<div class="card"><div class="ch">Ledger entries</div><table><thead><tr><th>Date</th><th>Description</th><th>Method</th><th>Ref</th><th>Amount</th><th>Status</th></tr></thead><tbody>' +
        ((c.ledger || []).length ? c.ledger.map(function (l) {
          return '<tr data-ref="' + E(l.id) + '"><td class="muted">' + new Date(l.ts).toLocaleDateString('en-GB') + '</td><td>' + E(l.desc) + '</td><td>' + E(l.method) + '</td>' +
            '<td class="mono">' + E(l.ref) + '</td><td class="tnum">' + BDT(l.creditBdt) + '</td><td>' + (l.status === 'verified' ? '<span class="pill green"><span class="dot"></span>Verified</span>' : '<span class="pill amber"><span class="dot"></span>Pending</span>') + '</td></tr>';
        }).join('') : '<tr><td class="empty" colspan="6">No entries.</td></tr>') +
      '</tbody></table></div>' +
      '<div class="card"><div class="ch">Installment schedule</div><table><thead><tr><th>#</th><th>Installment</th><th>Due</th><th>Amount</th><th>Status</th></tr></thead><tbody>' +
        (sched.length ? sched.map(function (i) {
          return '<tr data-ref="' + E(i.id) + '"><td class="tnum">' + i.n + '</td><td>' + E(i.label) + '</td><td class="muted">' + new Date(i.dueDate).toLocaleDateString('en-GB') + '</td>' +
            '<td class="tnum">' + BDT(i.amountBdt) + '</td><td>' + instPill(i) + '</td></tr>';
        }).join('') : '<tr><td class="empty" colspan="5">No schedule.</td></tr>') +
      '</tbody></table></div>';
  };
  function ledgerMini(c) {
    var l = (c.ledger || []).slice(0, 3);
    if (!l.length) return '<div class="empty">No ledger entries yet.</div>';
    return '<table><tbody>' + l.map(function (x) {
      return '<tr><td>' + E(x.desc) + '</td><td class="tnum">' + BDT(x.creditBdt) + '</td><td style="text-align:right">' + (x.status === 'verified' ? '<span class="pill green"><span class="dot"></span>Verified</span>' : '<span class="pill amber"><span class="dot"></span>Pending</span>') + '</td></tr>';
    }).join('') + '</tbody></table>';
  }

  // =========================================================================
  // PARTNER-SIDE MODULES
  // =========================================================================

  // ---- Partners directory -------------------------------------------------
  SECTIONS.partners = function () {
    return pageH('Sales Partners', DB.partners.length + ' active partner(s)') +
      '<div class="card"><table><thead><tr><th>Partner</th><th>Territory</th><th>Program</th><th>Rank</th><th>Approved bal.</th><th></th></tr></thead><tbody>' +
        DB.partners.map(function (p) {
          return '<tr class="click" data-nav="partner" data-id="' + p.id + '" data-ref="' + p.id + '">' +
            '<td><div style="font-weight:700">' + E(p.name) + '</div><div class="muted mono" style="font-size:11.5px">' + E(p.id) + (p.teamLead ? ' · Team lead' : '') + '</div></td>' +
            '<td>' + E(p.territory) + '</td><td>' + programLabel(p.program) + '</td><td>' + rankChip(p.rank) + '</td>' +
            '<td class="tnum">' + BDT(p.approvedBalanceBdt || 0) + '</td>' +
            '<td style="text-align:right;color:var(--ink-faint)">' + I.chevr + '</td></tr>';
        }).join('') +
      '</tbody></table></div>';
  };
  SECTIONS.partner = function (p) {
    var pt = DB.partners.find(function (x) { return x.id === p.id; });
    if (!pt) return SECTIONS.partners();
    var leads = DB.leads.filter(function (l) { return l.partnerId === pt.id; });
    var comms = DB.commissions.filter(function (c) { return c.partnerId === pt.id; });
    return backH('partners', pt.name, pt.id) +
      '<div class="detail">' +
        '<div class="card"><div class="ch">Leads</div>' +
          (leads.length ? '<table><tbody>' + leads.map(function (l) { return '<tr class="click" data-nav="lead" data-id="' + l.id + '"><td>' + E(l.prospectName) + '</td><td>' + E(l.projectName) + '</td><td>' + leadPillA(l) + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="empty">No leads.</div>') +
          '<div class="ch" style="border-top:.5px solid var(--line)">Commissions</div>' +
          (comms.length ? '<table><tbody>' + comms.map(function (c) { return '<tr><td>' + E(c.prospectName) + '</td><td class="tnum">' + (c.amountBdt ? BDT(c.amountBdt) : '—') + '</td><td>' + commPill(c) + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="empty">No commissions.</div>') +
        '</div>' +
        '<div class="card"><div class="ch">Profile</div><div style="padding:16px">' +
          '<div class="ract" style="padding:0 0 12px;align-items:center"><span class="avatar-lg">' + E(initials(pt.name)) + '</span><div><div style="font-weight:800;font-size:16px">' + E(pt.name) + '</div><div>' + rankChip(pt.rank) + '</div></div></div>' +
          '<div class="kv2"><span class="k">Partner ID</span><span class="v mono">' + E(pt.id) + '</span></div>' +
          '<div class="kv2"><span class="k">Phone</span><span class="v">' + E(pt.phone) + '</span></div>' +
          '<div class="kv2" style="align-items:flex-start"><span class="k">Territory</span><span class="v" style="text-align:right;max-width:64%">' + E(Geo.format(pt)) + '</span></div>' +
          '<div class="kv2"><span class="k">Active program(s)</span><span class="v">' + programLabel(pt.program) + '</span></div>' +
          '<div class="kv2"><span class="k">Approved balance</span><span class="v tnum">' + BDT(pt.approvedBalanceBdt || 0) + '</span></div>' +
          (pt.teamLead ? '<div class="kv2"><span class="k">Role</span><span class="v">Team lead (' + (pt.team ? pt.team.length : 0) + ')</span></div>' : '') +
        '</div></div>' +
        participationPanel(pt) +
      '</div>';
  };

  // ---- Partner approval queue (Flow 1) ------------------------------------
  SECTIONS.approvals = function () {
    var q = DB.applications.filter(function (a) { return a.status === 'pending'; });
    var decided = DB.applications.filter(function (a) { return a.status !== 'pending'; });
    return pageH('Partner approval queue', q.length + ' application(s) awaiting decision') +
      '<div class="card"><div class="ch">Pending</div><table><thead><tr><th>Applicant</th><th>Territory</th><th>Program</th><th>Age</th><th></th></tr></thead><tbody>' +
        (q.length ? q.map(function (a) {
          return '<tr class="click" data-nav="application" data-id="' + a.id + '" data-ref="' + a.id + '"><td style="font-weight:700">' + E(a.name) + '</td><td>' + E(a.territory) + '</td><td>' + programLabel(a.program) + '</td><td class="muted">' + Salmon.timeAgo(a.createdAt) + '</td><td style="text-align:right;color:var(--ink-faint)">' + I.chevr + '</td></tr>';
        }).join('') : '<tr><td class="empty" colspan="5">Queue clear — register a partner on the phone to populate it.</td></tr>') +
      '</tbody></table>' +
      (decided.length ? '<div class="ch" style="border-top:.5px solid var(--line)">Decided</div><table><tbody>' + decided.map(function (a) {
        return '<tr><td style="font-weight:700">' + E(a.name) + '</td><td>' + E(a.territory) + '</td><td>' + (a.status === 'approved' ? '<span class="pill green"><span class="dot"></span>Approved · ' + E(a.partnerId || '') + '</span>' : '<span class="pill red"><span class="dot"></span>Rejected</span>') + '</td></tr>';
      }).join('') + '</tbody></table>' : '') +
      '</div>';
  };

  SECTIONS.application = function (p) {
    var a = DB.applications.find(function (x) { return x.id === p.id; });
    if (!a) return SECTIONS.approvals();
    var can = canApprovePartner();
    var decided = a.status !== 'pending';
    var previewId = 'SDP-' + terr3(a.territory) + '-' + String((DB.seq.partner || 417) + 1).padStart(5, '0');
    return backH('approvals', 'Application — ' + a.name, a.id) +
      '<div class="detail">' +
        '<div class="card"><div class="ch">Application</div><div style="padding:16px">' +
          '<div class="kv2"><span class="k">Name</span><span class="v">' + E(a.name) + '</span></div>' +
          '<div class="kv2"><span class="k">Phone</span><span class="v">' + E(a.phone) + '</span></div>' +
          '<div class="kv2"><span class="k">Email</span><span class="v">' + E(a.email || '—') + '</span></div>' +
          '<div class="kv2"><span class="k">NID</span><span class="v mono">' + E(a.nid || '—') + '</span></div>' +
          '<div class="kv2"><span class="k">Address</span><span class="v">' + E(a.address || '—') + '</span></div>' +
          '<div class="kv2" style="align-items:flex-start"><span class="k">Requested territory</span><span class="v" style="text-align:right;max-width:64%">' + E(Geo.format(a)) + '</span></div>' +
          '<div class="kv2"><span class="k">Program</span><span class="v">' + programLabel(a.program) + '</span></div>' +
          '<div class="kv2"><span class="k">Referral</span><span class="v mono">' + E(a.referralCode || '—') + '</span></div>' +
        '</div></div>' +
        '<div class="card"><div class="ch">Decision</div><div style="padding:16px">' +
          (decided
            ? (a.status === 'approved'
                ? '<div style="color:var(--green);font-weight:700;display:flex;gap:8px;align-items:center">' + I.check + ' Approved — ' + E(a.partnerId) + '. Partner notified live.</div>'
                : '<div class="banner" style="color:var(--red)"><b>Rejected.</b> Reason sent to the applicant: “' + E(a.reason) + '”.</div>')
            : can
              ? '<div class="kv2"><span class="k">Partner ID (on confirm)</span><span class="v mono" style="color:var(--maroon)">' + previewId + '</span></div>' +
                '<div class="field2" style="margin-top:10px"><label class="fl">Territory</label><input id="ap-terr" value="' + E(a.territory) + '"/></div>' +
                '<div class="field2"><label class="fl">Initial rank</label><select id="ap-rank"><option>Silver</option><option>Gold</option><option>Bronze</option><option>Platinum</option></select></div>' +
                '<div class="field2"><label class="fl">Note (optional)</label><input id="ap-note" placeholder="Internal note"/></div>' +
                '<button class="btn primary" style="margin-top:12px;width:100%" data-act="approve-partner" data-id="' + a.id + '">' + I.check + ' Approve — ' + previewId + '</button>' +
                '<div class="ch" style="margin:16px -16px 0;border-top:.5px solid var(--line)">Or reject</div>' +
                '<div class="field2" style="margin-top:12px"><label class="fl">Rejection reason (shown verbatim to the applicant)</label><textarea id="ap-reason" rows="2" placeholder="e.g. insufficient documentation"></textarea></div>' +
                '<button class="btn danger" style="margin-top:10px;width:100%" data-act="reject-partner" data-id="' + a.id + '">Reject application</button>'
              : '<div class="muted">Your role (' + E(staff.role) + ') can’t decide applications. Switch to Super Admin or Manager.</div>') +
        '</div></div>' +
      '</div>';
  };

  // ---- Leads (Flow 3) -----------------------------------------------------
  SECTIONS.leads = function () {
    var rows = DB.leads.slice();
    return pageH('Leads', rows.length + ' lead(s) · new submissions land here live') +
      '<div class="card"><table><thead><tr><th>Prospect</th><th>Project</th><th>Partner</th><th>Age</th><th>Status</th></tr></thead><tbody>' +
        (rows.length ? rows.map(function (l) {
          return '<tr class="click" data-nav="lead" data-id="' + l.id + '" data-ref="' + l.id + '"><td style="font-weight:700">' + E(l.prospectName) + '</td><td>' + E(l.projectName) + '</td><td>' + E(l.partnerName) + '</td><td class="muted">' + Salmon.timeAgo(l.createdAt) + '</td><td>' + leadPillA(l) + '</td></tr>';
        }).join('') : '<tr><td class="empty" colspan="5">No leads yet — submit one on the partner phone.</td></tr>') +
      '</tbody></table></div>';
  };

  var LEAD_STEPS = [['new', 'Submitted'], ['contacted', 'Contacted'], ['meeting_scheduled', 'Meeting scheduled'], ['meeting_done', 'Meeting done'], ['visit_scheduled', 'Visit scheduled'], ['visit_done', 'Visit done'], ['converted', 'Converted']];
  // vertical status timeline (same shape the partner sees, richer for staff)
  function leadTimeline(l) {
    var order = LEAD_STEPS.map(function (s) { return s[0]; });
    var curIdx = l.status === 'rejected' ? -1 : order.indexOf(l.status);
    return '<div class="vtl">' + LEAD_STEPS.map(function (s, i) {
      var at = (l.timeline.find(function (t) { return t.status === s[0]; }) || {}).at;
      var reached = i <= curIdx, cur = i === curIdx;
      return '<div class="vtl-i ' + (reached ? 'done' : '') + (cur ? ' cur' : '') + '"><div class="vtl-dot">' + (reached ? I.check : '') + '</div>' +
        '<div class="vtl-b"><div class="vtl-t">' + s[1] + '</div><div class="vtl-d">' + (at ? new Date(at).toLocaleString('en-GB') : '—') + '</div></div></div>';
    }).join('') + '</div>' +
      (l.status === 'rejected' ? '<div class="banner" style="color:var(--red);margin-top:10px"><b>Closed / rejected.</b></div>' : '');
  }
  function leadTypeChip(l) {
    return l.leadType === 'investor'
      ? '<span class="pill violet"><span class="dot"></span>Investor</span>'
      : '<span class="pill blue"><span class="dot"></span>Potential buyer</span>';
  }
  SECTIONS.lead = function (p) {
    var l = DB.leads.find(function (x) { return x.id === p.id; });
    if (!l) return SECTIONS.leads();
    var can = canManageLeads();
    var next = { new: 'contacted', contacted: 'meeting_scheduled', meeting_scheduled: 'meeting_done', meeting_done: 'visit_scheduled', visit_scheduled: 'visit_done', visit_done: 'converted' }[l.status];
    var nextLabel = next ? next.replace(/_/g, ' ') : null;
    var converted = l.status === 'converted';
    var staffOpts = '<option value="">— unassigned —</option>' + DB.staff.map(function (s) { return '<option value="' + E(s.name) + '"' + (l.assignedRep === s.name ? ' selected' : '') + '>' + E(roleShort(s.role)) + ' — ' + E(s.name) + '</option>'; }).join('');
    return backH('leads', 'Lead — ' + l.prospectName, l.id) +
      '<div class="detail">' +
        // LEFT — status timeline + advance controls
        '<div class="card"><div class="ch">Status ' + leadTypeChip(l) + '<span class="spacer"></span>' + leadPillA(l) + '</div><div style="padding:16px">' +
          leadTimeline(l) +
          (converted
            ? '<div style="margin-top:14px;color:var(--green);font-weight:700;display:flex;gap:8px;align-items:center">' + I.check + ' Converted — commission ' + E(l.commissionId || '') + ' created.</div>'
            : can
              ? leadAdvanceBtn(l, next) +
                '<button class="btn primary" style="margin-top:8px;width:100%" data-act="verify-conversion" data-id="' + l.id + '">' + I.check + ' Verify conversion</button>' +
                (l.status !== 'rejected' ? '<button class="btn danger sm" style="margin-top:8px" data-act="lead-reject" data-id="' + l.id + '">Close / reject</button>' : '')
              : '<div class="muted" style="margin-top:14px">Your role (' + E(staff.role) + ') can’t manage leads. Switch to Super Admin or Manager.</div>') +
        '</div></div>' +
        // RIGHT — prospect + management
        '<div class="card"><div class="ch">Prospect &amp; management</div><div style="padding:16px">' +
          '<div class="kv2"><span class="k">Prospect</span><span class="v">' + E(l.prospectName) + '</span></div>' +
          '<div class="kv2"><span class="k">Interest</span><span class="v">' + (l.leadType === 'investor' ? 'Investor' : 'Potential buyer') + '</span></div>' +
          '<div class="kv2"><span class="k">Phone</span><span class="v">' + E(l.phone) + '</span></div>' +
          '<div class="kv2"><span class="k">Email</span><span class="v">' + E(l.email || '—') + '</span></div>' +
          '<div class="kv2"><span class="k">Project</span><span class="v">' + E(l.projectName) + '</span></div>' +
          attributionRows(l) +
          '<div class="kv2"><span class="k">Consent (per-lead)</span><span class="match">' + I.check + ' ' + consentLabel(l) + '</span></div>' +
          '<div class="kv2"><span class="k">Prospect note</span><span class="v" style="max-width:60%;text-align:right">' + E(l.notes || '—') + '</span></div>' +
          (can
            ? '<div class="ch" style="margin:16px -16px 0;border-top:.5px solid var(--line)">Assignment &amp; next action <span style="font-weight:500;color:var(--ink-faint)">· internal</span></div>' +
              '<div class="field2" style="margin-top:12px"><label class="fl">Assigned representative</label><select id="ld-rep">' + staffOpts + '</select></div>' +
              '<div class="field2"><label class="fl">Next action (internal)</label><input id="ld-next" value="' + E(l.nextAction || '') + '" placeholder="e.g. Call back Thu · arrange site visit"/></div>' +
              '<button class="btn sm" data-act="lead-save-manage" data-id="' + l.id + '">Save assignment &amp; next action</button>'
            : (l.assignedRep ? '<div class="kv2"><span class="k">Assigned rep</span><span class="v">' + E(l.assignedRep) + '</span></div>' : '')) +
          // partner-facing follow-up notes
          '<div class="ch" style="margin:16px -16px 0;border-top:.5px solid var(--line)">Follow-up to partner <span style="font-weight:500;color:var(--green)">· visible to the partner</span></div>' +
          (l.followUps && l.followUps.length ? l.followUps.map(function (n) {
            return '<div style="padding:9px 0;border-bottom:.5px solid var(--line-2)"><div style="font-size:12px;color:var(--ink-muted)">' + E(n.by || 'Salmon') + ' · ' + new Date(n.at).toLocaleString('en-GB') + '</div><div>' + E(n.text) + '</div></div>';
          }).join('') : '<div class="muted" style="padding:9px 0">None sent to the partner yet.</div>') +
          (can ? '<div class="field2" style="margin-top:10px"><input id="ld-followup" placeholder="Shared with the partner on their lead screen"/></div>' +
            '<button class="btn sm primary" data-act="lead-followup" data-id="' + l.id + '">Send to partner</button>' : '') +
          // internal notes (never shown to partner)
          '<div class="ch" style="margin:16px -16px 0;border-top:.5px solid var(--line)">Internal notes <span style="font-weight:500;color:var(--ink-faint)">· never shown to the partner</span></div>' +
          (l.internalNotes.length ? l.internalNotes.map(function (n) {
            return '<div style="padding:9px 0;border-bottom:.5px solid var(--line-2)"><div style="font-size:12px;color:var(--ink-muted)">' + E(n.by) + ' · ' + new Date(n.at).toLocaleString('en-GB') + '</div><div>' + E(n.text) + '</div></div>';
          }).join('') : '<div class="muted" style="padding:9px 0">No internal notes.</div>') +
          (can ? '<div class="field2" style="margin-top:10px"><input id="ld-note" placeholder="Only staff can see this"/></div>' +
            '<button class="btn sm" data-act="lead-note" data-id="' + l.id + '">Add internal note</button>' : '') +
        '</div></div>' +
        partnerViewPanel(l) +
      '</div>';
  };

  // Req 6.4.3 — the four attributions stamped on the lead (server-derived).
  function attributionRows(l) {
    var a = l.attribution || {};
    return '<div class="kv2"><span class="k">Partner</span><span class="v linkish" data-nav="partner" data-id="' + E(l.partnerId) + '">' + E(l.partnerName) + '</span></div>' +
      '<div class="kv2"><span class="k">Team</span><span class="v">' + E(a.teamLeadName ? a.teamLeadName + '’s team' : '—') + '</span></div>' +
      '<div class="kv2"><span class="k">Territory</span><span class="v">' + E(a.territory || '—') + '</span></div>' +
      '<div class="kv2"><span class="k">Team lead</span><span class="v">' + E(a.teamLeadName || '—') + '</span></div>';
  }
  function consentLabel(l) {
    var c = l.consent;
    if (c && typeof c === 'object') return 'attested · ' + (c.at ? new Date(c.at).toLocaleString('en-GB') : '—');
    return 'confirmed';
  }
  // Req 6.4.4/6.4.5 — the wall made visible. Renders EXACTLY what the partner
  // sees on P30 from this same lead: the six-state projection, nothing internal.
  // A manager can add an internal note above, glance here, and confirm it never
  // appears — the single most important integrity demonstration in the module.
  var PARTNER_PROJECTION_A = { new: 'submitted', contacted: 'contacted', meeting_scheduled: 'meeting_scheduled', meeting_done: 'meeting_done', visit_scheduled: 'visit_scheduled', visit_done: 'visit_done', converted: 'converted', rejected: 'closed' };
  var PARTNER_LABEL_A = { submitted: 'Submitted', contacted: 'Contacted', meeting_scheduled: 'Meeting scheduled', meeting_done: 'Meeting done', visit_scheduled: 'Visit scheduled', visit_done: 'Visit done', converted: 'Converted', closed: 'Closed' };
  function partnerViewPanel(l) {
    var ps = PARTNER_PROJECTION_A[l.status] || 'submitted';
    var steps = ['submitted', 'contacted', 'meeting_scheduled', 'meeting_done', 'visit_scheduled', 'visit_done', 'converted'];
    var curIdx = steps.indexOf(ps);
    var rows = steps.map(function (s) {
      var done = curIdx >= 0 && steps.indexOf(s) <= curIdx;
      return '<div class="kv2"><span class="k">' + (done ? I.check + ' ' : '') + E(PARTNER_LABEL_A[s]) + '</span><span class="v muted">' + (ps === s ? 'current' : done ? 'done' : '') + '</span></div>';
    }).join('');
    return '<div class="card" style="grid-column:1/-1;border:1.5px solid var(--maroon)">' +
      '<div class="ch" style="color:var(--maroon)">📱 What the partner sees (P30) <span style="font-weight:500;color:var(--ink-faint)">· partner projection — the wall</span></div>' +
      '<div style="padding:16px">' + rows +
      '<div class="muted" style="font-size:12px;margin-top:10px">The partner sees only these six statuses. Internal notes, the assigned owner, next action and any stall reason are never projected here. Partner-facing status: <b>' + E(PARTNER_LABEL_A[ps]) + '</b>.</div>' +
      '</div></div>';
  }

  // ---- Commissions (Flow 4) ----------------------------------------------
  // CM01 — commission queue (pending, sortable by age)
  SECTIONS.commissions = function () {
    var pending = DB.commissions.filter(function (c) { return c.status === 'pending'; })
      .sort(function (a, b) { return new Date(a.events && a.events.length ? a.events[a.events.length - 1].at : 0) - new Date(b.events && b.events.length ? b.events[b.events.length - 1].at : 0); });
    return '<div class="page-h"><div><h1>Commission queue</h1><div class="desc">' + pending.length + ' pending approval · oldest first</div></div><span class="hstack" style="gap:8px">' +
        (canApproveCommission() ? '<button class="btn" data-nav="commission-create">' + I.plus + ' Create commission</button>' : '') +
        '<button class="btn" data-nav="commissionledger">' + I.ledger + ' Full ledger</button></span></div>' +
      '<div class="card"><table><thead><tr><th>Commission</th><th>Partner</th><th>Source</th><th>Program</th><th>Age</th><th></th></tr></thead><tbody>' +
        (pending.length ? pending.map(function (c) {
          return '<tr class="click" data-nav="commission" data-id="' + c.id + '" data-ref="' + c.id + '"><td class="mono">' + E(c.id) + '</td><td style="font-weight:700">' + E(c.partnerName) + '</td>' +
            '<td>' + commSource(c) + '</td><td>' + programLabel(c.program) + '</td><td class="muted">' + Salmon.timeAgo(commAge(c)) + '</td>' +
            '<td style="text-align:right"><span class="pill maroon"><span class="dot"></span>Review</span></td></tr>';
        }).join('') : '<tr><td class="empty" colspan="6">Queue clear — no commissions awaiting approval.</td></tr>') +
      '</tbody></table></div>';
  };
  function commSource(c) { return c.kind === 'special' ? ('Special · ' + E(c.category || 'case')) : (E(c.prospectName || '—') + ' · ' + E(c.projectName || '—')); }
  function commAge(c) { return (c.events && c.events.length) ? c.events[c.events.length - 1].at : (c.verifiedAt || new Date().toISOString()); }

  // CM03 (pending) / CM05 (record + source chain + audit) / CM06 (correct/reverse)
  SECTIONS.commission = function (p) {
    var c = DB.commissions.find(function (x) { return x.id === p.id; });
    if (!c) return SECTIONS.commissions();
    var can = canApproveCommission();
    if (c.status === 'pending') return commApproveSurface(c, can);
    return commRecord(c, can);
  };

  // ---- CM03: the visualized-verification approval surface -----------------
  function commApproveSurface(c, can) {
    var partner = DB.partners.find(function (x) { return x.id === c.partnerId; });
    var lead = c.leadId ? DB.leads.find(function (x) { return x.id === c.leadId; }) : null;
    var conv = lead && lead.timeline ? lead.timeline.find(function (t) { return t.status === 'converted'; }) : null;
    // decision (left) — amount is ALWAYS hand-entered; never calculated
    var decision =
      '<div class="card"><div class="ch">' + I.cash + ' Decision</div><div style="padding:16px">' +
        '<div class="field2"><label class="fl">Commission amount (৳) — entered by hand, never calculated</label><input id="cm-amt" type="number" placeholder="enter amount" class="cm-bigamt"/></div>' +
        '<div class="field2"><label class="fl">Program</label><select id="cm-program"><option value="zero"' + (c.program === 'zero' ? ' selected' : '') + '>Zero Investment</option><option value="with"' + (c.program === 'with' ? ' selected' : '') + '>With Investment</option></select></div>' +
        '<div class="field2"><label class="fl">Approval note</label><input id="cm-note" placeholder="e.g. Standard rate applied / Higher tier per agreement" value="Standard rate applied"/></div>' +
        (can
          ? '<button class="btn primary" style="margin-top:12px;width:100%" data-act="approve-commission" data-id="' + c.id + '">' + I.check + ' Confirm &amp; approve</button>' +
            '<div class="muted" style="font-size:11.5px;margin-top:10px">Confirm the amount against the evidence on the right — approval is a verification, not a blank number.</div>'
          : '<div class="muted" style="margin-top:12px">Your role (' + E(staff.role) + ') can’t approve commissions. Switch to Super Admin or Finance Officer.</div>') +
      '</div></div>';
    // context (right) — everything the number should reconcile against
    var context =
      '<div class="card"><div class="ch">' + I.shield + ' Verify against the deal</div><div style="padding:16px">' +
        (c.kind === 'special'
          ? '<div class="kv2"><span class="k">Type</span><span class="v"><span class="pill violet"><span class="dot"></span>Special · ' + E(c.category) + '</span></span></div>' +
            '<div class="kv2"><span class="k">Reason</span><span class="v" style="max-width:60%;text-align:right">' + E(c.reason || '') + '</span></div>'
          : '<div class="cx-block"><div class="cx-h">The lead</div>' +
              '<div class="kv2"><span class="k">Prospect</span><span class="v">' + E(c.prospectName) + '</span></div>' +
              '<div class="kv2"><span class="k">Project · interest</span><span class="v">' + E(c.projectName) + '</span></div>' +
              (lead ? '<div class="kv2"><span class="k">Submitted</span><span class="v">' + new Date(lead.createdAt).toLocaleDateString('en-GB') + '</span></div>' : '') +
            '</div>' +
            '<div class="cx-block"><div class="cx-h">The conversion</div>' +
              '<div class="kv2"><span class="k">Verified</span><span class="v">' + (conv ? new Date(conv.at).toLocaleString('en-GB') : (c.verifiedAt ? new Date(c.verifiedAt).toLocaleString('en-GB') : '—')) + '</span></div>' +
              '<div class="kv2"><span class="k">Verified by</span><span class="match">' + I.check + ' ' + E(c.verifiedBy || lead && lead.partnerName || 'Manager') + '</span></div>' +
            '</div>') +
        '<div class="cx-block"><div class="cx-h">The partner</div>' +
          '<div class="kv2"><span class="k">Name · ID</span><span class="v linkish" data-nav="partner" data-id="' + c.partnerId + '">' + E(c.partnerName) + ' · ' + E(c.partnerId) + '</span></div>' +
          '<div class="kv2"><span class="k">Rank · program</span><span class="v">' + (partner ? E(partner.rank) : '—') + ' · ' + programLabel(c.program) + '</span></div>' +
        '</div>' +
        '<div class="cx-block"><div class="cx-h">Does this reconcile? — recent approved commissions</div>' + reconcileBar(c.partnerId) + '</div>' +
      '</div></div>';
    return backH('commissions', 'Approve ' + c.id, c.partnerName) + '<div class="cm-approve">' + decision + context + '</div>';
  }

  // reconcile mini-bar — this partner's recent commission amounts, so an outlier is obvious
  function reconcileBar(partnerId) {
    var hist = DB.commissions.filter(function (c) { return c.partnerId === partnerId && c.amountBdt && ['approved', 'settlement_requested', 'settled'].indexOf(c.status) >= 0; }).slice(0, 6);
    if (!hist.length) return '<div class="muted" style="font-size:12px">No prior approved commissions for this partner — first one. Sanity-check against the deal size.</div>';
    var max = Math.max.apply(null, hist.map(function (c) { return c.amountBdt; }));
    var avg = Math.round(hist.reduce(function (n, c) { return n + c.amountBdt; }, 0) / hist.length);
    return '<div class="minibar">' + hist.slice().reverse().map(function (c) {
      return '<div class="mb-col" title="' + BDT(c.amountBdt) + '"><div class="mb-fill" style="height:' + Math.round(c.amountBdt / max * 100) + '%"></div><div class="mb-lbl">' + BDTS(c.amountBdt) + '</div></div>';
    }).join('') + '</div><div class="muted" style="font-size:11.5px;margin-top:6px">Recent average ' + BDT(avg) + ' · use this as a sanity range.</div>';
  }

  // CM05/CM06 — the record with its source chain + audit, plus correct/reverse
  function commRecord(c, can) {
    var reversed = c.status === 'reversed';
    return backH('commissions', 'Commission ' + c.id, c.partnerName) +
      '<div class="detail">' +
        '<div class="card"><div class="ch">Record<span class="spacer"></span>' + commPill(c) + '</div><div style="padding:16px">' +
          '<div class="kv2"><span class="k">Amount</span><span class="v tnum" style="font-size:16px' + (reversed ? ';text-decoration:line-through;color:var(--ink-muted)' : '') + '">' + BDT(c.amountBdt) + '</span></div>' +
          '<div class="kv2"><span class="k">Partner</span><span class="v linkish" data-nav="partner" data-id="' + c.partnerId + '">' + E(c.partnerName) + '</span></div>' +
          '<div class="kv2"><span class="k">Program</span><span class="v">' + programLabel(c.program) + '</span></div>' +
          '<div class="kv2"><span class="k">Source</span><span class="v">' + commSource(c) + '</span></div>' +
          (c.leadId ? '<div class="kv2"><span class="k">Related lead</span><span class="v linkish" data-nav="lead" data-id="' + c.leadId + '">' + E(c.leadId) + '</span></div>' : '') +
          '<div class="kv2"><span class="k">Approved by · on</span><span class="v">' + E(c.approver || '—') + (c.approvedAt ? ' · ' + new Date(c.approvedAt).toLocaleDateString('en-GB') : '') + '</span></div>' +
          (c.note ? '<div class="kv2"><span class="k">Note</span><span class="v">' + E(c.note) + '</span></div>' : '') +
          (reversed ? '<div class="banner" style="margin-top:12px;background:var(--red-bg);color:var(--red)"><b>Reversed</b> (' + E(c.reversedFrom) + '). ' + E(c.reversalReason) + '</div>' : '') +
        '</div></div>' +
        '<div class="card"><div class="ch">Audit trail</div><div style="padding:8px 0">' +
          (c.events || []).map(function (e) {
            return '<div style="padding:9px 16px;border-bottom:.5px solid var(--line-2)"><div style="font-size:12px;color:var(--ink-muted)">' + new Date(e.at).toLocaleString('en-GB') + ' · ' + E(e.by) + (e.role ? ' (' + roleShort(e.role) + ')' : '') + '</div><div style="font-size:13px"><b>' + E(e.action) + '</b> — ' + E(e.detail) + '</div></div>';
          }).join('') +
        '</div>' +
        (can && !reversed
          ? '<div style="padding:14px 16px;border-top:.5px solid var(--line)">' +
              '<div class="field2"><label class="fl">Correct amount (৳) — mandatory reason</label><input id="cc-amt" type="number" value="' + (c.amountBdt || '') + '"/></div>' +
              '<div class="field2"><label class="fl">Reason</label><input id="cc-reason" placeholder="Why is this being corrected / reversed?"/></div>' +
              '<div class="hstack" style="gap:8px;margin-top:8px"><button class="btn" data-act="correct-commission" data-id="' + c.id + '">Correct amount</button>' +
              '<button class="btn danger" data-act="reverse-commission" data-id="' + c.id + '">Reverse commission</button></div>' +
            '</div>'
          : '') +
        '</div>' +
      '</div>';
  }

  // CM02 — create a commission (from a verified conversion, or a special case)
  SECTIONS['commission-create'] = function () {
    if (!canApproveCommission()) return SECTIONS.denied({ attempted: 'commission-create' });
    var converts = DB.leads.filter(function (l) { return l.status === 'converted' && !l.commissionId; });
    return backH('commissions', 'Create commission', 'From a verified conversion, or a special case') +
      '<div class="detail">' +
        '<div class="card"><div class="ch">From a verified conversion</div><div style="padding:16px">' +
          (converts.length
            ? '<div class="field2"><label class="fl">Verified converted lead (no commission yet)</label><select id="cc-lead">' + converts.map(function (l) { return '<option value="' + l.id + '">' + E(l.prospectName) + ' · ' + E(l.projectName) + ' · ' + E(l.partnerName) + '</option>'; }).join('') + '</select></div>' +
              '<button class="btn primary" style="margin-top:10px" data-act="create-commission-conv">Create pending record</button>' +
              '<div class="muted" style="font-size:11.5px;margin-top:8px">The amount is entered later at approval — never calculated here.</div>'
            : '<div class="muted">Every verified conversion already has a commission. Nothing to create from conversions.</div>') +
        '</div></div>' +
        '<div class="card"><div class="ch">Special-commission case</div><div style="padding:16px">' +
          '<div class="field2"><label class="fl">Partner</label><select id="cs-partner">' + DB.partners.map(function (pt) { return '<option value="' + pt.id + '">' + E(pt.name) + ' · ' + E(pt.territory) + '</option>'; }).join('') + '</select></div>' +
          '<div class="field2"><label class="fl">Category</label><select id="cs-category"><option>Bonus</option><option>Adjustment</option><option>Goodwill</option></select></div>' +
          '<div class="field2"><label class="fl">Reason (mandatory)</label><input id="cs-reason" placeholder="Why this special commission?"/></div>' +
          '<button class="btn primary" style="margin-top:10px" data-act="create-commission-special">Create pending record</button>' +
          '<div class="muted" style="font-size:11.5px;margin-top:8px">Not tied to a conversion. Amount entered at approval.</div>' +
        '</div></div>' +
      '</div>';
  };

  // CM04 — full commission ledger, all states, filterable
  SECTIONS.commissionledger = function () {
    var f = commLedgerFilter;
    var rows = DB.commissions.filter(function (c) { return f === 'all' || c.status === f; });
    var chip = function (val, label) { return '<button class="pbtn ' + (f === val ? 'on' : '') + '" data-act="comm-filter" data-f="' + val + '">' + label + '</button>'; };
    return '<div class="page-h"><div><h1>Commission ledger</h1><div class="desc">' + DB.commissions.length + ' records · all states · one common ledger</div></div>' +
        (canApproveCommission() ? '<button class="btn" data-nav="commission-create">' + I.plus + ' Create</button>' : '') + '</div>' +
      '<div class="pswitch" style="margin-bottom:12px">' + chip('all', 'All') + chip('pending', 'Pending') + chip('approved', 'Approved') + chip('settlement_requested', 'Settlement req.') + chip('settled', 'Settled') + chip('reversed', 'Reversed') + '</div>' +
      '<div class="card"><table><thead><tr><th>ID</th><th>Partner</th><th>Source</th><th>Amount</th><th>Approver</th><th>Status</th></tr></thead><tbody>' +
        (rows.length ? rows.map(function (c) {
          return '<tr class="click" data-nav="commission" data-id="' + c.id + '" data-ref="' + c.id + '"><td class="mono">' + E(c.id) + '</td><td>' + E(c.partnerName) + '</td><td>' + commSource(c) + '</td>' +
            '<td class="tnum">' + (c.amountBdt ? BDT(c.amountBdt) : '—') + '</td><td class="muted">' + E(c.approver || '—') + '</td><td>' + commPill(c) + '</td></tr>';
        }).join('') : '<tr><td class="empty" colspan="6">No commissions in this filter.</td></tr>') +
      '</tbody></table></div>';
  };
  var commLedgerFilter = 'all';

  // ---- Settlements (Flow 5) ----------------------------------------------
  SECTIONS.settlements = function () {
    var rows = DB.settlements.slice();
    return pageH('Settlement queue', DB.settlements.filter(function (s) { return s.status !== 'settled'; }).length + ' open') +
      '<div class="card"><table><thead><tr><th>Reference</th><th>Partner</th><th>Amount</th><th>Requested</th><th>Status</th></tr></thead><tbody>' +
        (rows.length ? rows.map(function (s) {
          return '<tr class="click" data-nav="settlement" data-id="' + s.id + '" data-ref="' + s.id + '"><td class="mono">' + E(s.id) + '</td><td>' + E(s.partnerName) + '</td><td class="tnum">' + BDT(s.amountBdt) + '</td><td class="muted">' + Salmon.timeAgo(s.requestedAt) + '</td><td>' + settlePillA(s) + '</td></tr>';
        }).join('') : '<tr><td class="empty" colspan="5">No settlement requests yet.</td></tr>') +
      '</tbody></table></div>';
  };

  SECTIONS.settlement = function (p) {
    var s = DB.settlements.find(function (x) { return x.id === p.id; });
    if (!s) return SECTIONS.settlements();
    var partner = DB.partners.find(function (x) { return x.id === s.partnerId; });
    var can = canSettle();
    return backH('settlements', 'Settlement ' + s.id, s.partnerName) +
      '<div class="detail">' +
        '<div class="card"><div class="ch">Request</div><div style="padding:16px">' +
          '<div class="kv2"><span class="k">Partner</span><span class="v linkish" data-nav="partner" data-id="' + s.partnerId + '">' + E(s.partnerName) + '</span></div>' +
          '<div class="kv2"><span class="k">Amount</span><span class="v tnum" style="font-size:16px">' + BDT(s.amountBdt) + '</span></div>' +
          '<div class="kv2"><span class="k">Approved balance</span><span class="v tnum">' + BDT(partner ? partner.approvedBalanceBdt : 0) + '</span></div>' +
          '<div class="kv2"><span class="k">Requested</span><span class="v">' + new Date(s.requestedAt).toLocaleString('en-GB') + '</span></div>' +
          '<div class="kv2"><span class="k">Status</span><span class="v">' + settlePillA(s) + '</span></div>' +
        '</div></div>' +
        '<div class="card"><div class="ch">Decision</div><div style="padding:16px">' +
          (!can
            ? '<div class="muted">Your role (' + E(staff.role) + ') can’t action settlements. Switch to Super Admin or Finance Officer.</div>'
            : s.status === 'settled'
              ? '<div style="color:var(--green);font-weight:700;display:flex;gap:8px;align-items:center">' + I.check + ' Settled.</div>' +
                '<div class="kv2" style="margin-top:10px"><span class="k">Channel</span><span class="v">' + E(s.channel) + '</span></div>' +
                '<div class="kv2"><span class="k">Reference <span class="muted" style="font-weight:400">· staff-only</span></span><span class="v mono">' + E(s.reference) + '</span></div>' +
                '<div class="kv2"><span class="k">Evidence <span class="muted" style="font-weight:400">· staff-only</span></span><span class="v mono">' + E(s.evidence || '—') + '</span></div>' +
                '<div class="kv2"><span class="k">Payment date</span><span class="v">' + E(s.paymentDate) + '</span></div>' +
                '<div class="kv2"><span class="k">Settled by</span><span class="v">' + E(s.settledBy || '—') + '</span></div>'
            : s.status === 'rejected'
              ? '<div class="banner" style="color:var(--red)"><b>Rejected.</b> ' + E(s.rejectReason || '') + ' <span class="muted">(' + E(s.rejectedBy || '') + ')</span></div>'
              : // actionable states: requested | approved_awaiting_payment | on_hold
                (s.status === 'on_hold' ? '<div class="banner" style="background:var(--amber-bg);color:var(--amber);margin-bottom:12px"><b>On hold.</b> ' + E(s.holdReason || '') + ' <span class="muted">(' + E(s.heldBy || '') + ')</span></div>' : '') +
                ((s.status === 'requested' || s.status === 'on_hold')
                  ? '<button class="btn primary" style="width:100%" data-act="approve-settlement" data-id="' + s.id + '">' + I.check + ' Approve settlement</button>' +
                    '<div class="muted" style="font-size:12px;margin:10px 0">Approval authorises payout. The money moves outside the app — no bank details are held here.</div>'
                  : '') +
                (s.status === 'approved_awaiting_payment'
                  ? '<div class="banner" style="background:var(--amber-bg);color:var(--amber)"><b>Approved — awaiting payment.</b> Pay ' + E(s.partnerName) + ' via your external finance process, then record it below.</div>' +
                    '<div class="field2" style="margin-top:12px"><label class="fl">Payment date</label><input id="st-date" type="date"/></div>' +
                    '<div class="field2"><label class="fl">Channel category <span class="muted" style="font-weight:400">· category only, never an account number</span></label><select id="st-channel"><option>Cash</option><option>Bank</option><option>bKash</option><option>Nagad</option><option>Cheque</option><option>Other</option></select></div>' +
                    '<div class="field2"><label class="fl">Non-sensitive reference</label><input id="st-ref" placeholder="e.g. TXN-778211"/></div>' +
                    '<div class="field2"><label class="fl">Evidence (mock upload)</label><input id="st-file" placeholder="receipt.jpg" value="receipt.jpg"/></div>' +
                    '<button class="btn green" style="margin-top:12px;width:100%" data-act="mark-settled" data-id="' + s.id + '">' + I.check + ' Mark as settled</button>'
                  : '') +
                '<div class="ch" style="margin:16px -16px 0;border-top:.5px solid var(--line)">Hold or reject <span style="font-weight:500;color:var(--ink-faint)">· audit reason required</span></div>' +
                '<div class="field2" style="margin-top:12px"><input id="st-reason" placeholder="Audit reason (logged)"/></div>' +
                '<div class="hstack" style="gap:8px">' +
                  '<button class="btn" data-act="hold-settlement" data-id="' + s.id + '">Place on hold</button>' +
                  '<button class="btn danger" data-act="reject-settlement" data-id="' + s.id + '">Reject</button>' +
                '</div>') +
        '</div></div>' +
      '</div>';
  };

  // ---- Investment desk (Flow 6) ------------------------------------------
  function canInvestManage() { return isSuper() || staff.role === 'Manager' || staff.role === 'Finance Officer'; }
  function retPill(s) { var m = { paid: ['green', 'Paid'], pending: ['amber', 'Pending'], onhold: ['grey', 'On hold'] }; var x = m[s] || m.pending; return '<span class="pill ' + x[0] + '"><span class="dot"></span>' + x[1] + '</span>'; }
  SECTIONS.investment = function () {
    var can = canInvestManage();
    var interests = (DB.investmentInterests || []);
    var withPartners = (DB.partners || []).filter(function (p) { return p.program === 'with' || p.program === 'both'; });
    var interestsCard = '<div class="card"><div class="ch">Purchase / investment interests<span class="spacer"></span><span class="muted" style="font-weight:500">' + interests.length + ' total · click Record to confirm</span></div>' +
      '<table><thead><tr><th>Ref</th><th>Partner</th><th>Type</th><th>Project · unit</th><th>Preferred time</th><th>Status</th><th></th></tr></thead><tbody>' +
      (interests.length ? interests.map(function (it) {
        var action = it.status === 'recorded' ? '<span class="muted">recorded</span>'
          : can ? '<button class="btn sm primary" data-act="open-record-modal" data-id="' + E(it.id) + '">Record ›</button>' : '';
        return '<tr><td class="mono">' + E(it.id) + '</td><td>' + E(it.partnerName) + '</td><td>' + (it.interestType === 'purchase' ? '<span class="pill blue"><span class="dot"></span>Purchase</span>' : '<span class="pill violet"><span class="dot"></span>Invest</span>') + '</td><td>' + E(it.projectName) + (it.unitRef ? ' · ' + E(it.unitRef) : '') + '</td><td>' + E(it.preferredTime) + '</td><td>' + (it.status === 'recorded' ? '<span class="pill green"><span class="dot"></span>Recorded</span>' : '<span class="pill amber"><span class="dot"></span>New</span>') + '</td><td style="text-align:right">' + action + '</td></tr>';
      }).join('') : '<tr><td class="empty" colspan="7">No interests yet — register one from a With-Investment partner app.</td></tr>') +
      '</tbody></table></div>';
    var recordCard = can
      ? '<div class="card"><div class="ch">' + I.plus + ' Record a confirmed investment<span class="spacer"></span><span class="muted" style="font-weight:500">after offline documentation + payment verification</span></div><div style="padding:16px">' +
          '<div class="banner" style="background:#fdf8ec;border:1px dashed #d9b877;color:#8a5a2b;margin-bottom:12px"><b>No returns are calculated or disbursed here.</b> Record only the client-approved commercial terms and effective date.</div>' +
          '<div class="detail" style="grid-template-columns:1fr 1fr">' +
            '<div class="field2"><label class="fl">Partner (With / Both)</label><select id="inv-partner">' + (withPartners.length ? withPartners.map(function (p) { return '<option value="' + p.id + '">' + E(p.name) + ' · ' + programLabel(p.program) + '</option>'; }).join('') : '<option value="">No With-Investment partners</option>') + '</select></div>' +
            '<div class="field2"><label class="fl">Effective date</label><input id="inv-date" type="date"/></div>' +
          '</div>' +
          '<div class="detail" style="grid-template-columns:1fr 1fr">' +
            '<div class="field2"><label class="fl">Recorded investment (BDT)</label><input id="inv-amount" type="number" placeholder="3000000"/></div>' +
            '<div class="field2"><label class="fl">Sales volume (BDT)</label><input id="inv-sales" type="number" placeholder="4200000"/></div>' +
          '</div>' +
          '<div class="field2"><label class="fl">Client-approved commercial terms</label><input id="inv-terms" placeholder="e.g. 12% p.a. · quarterly · 24-month term (client-signed)"/></div>' +
          '<div class="field2"><label class="fl">Return schedule (label)</label><input id="inv-schedule" placeholder="Client-approved 12% p.a. · quarterly"/></div>' +
          '<button class="btn primary" data-act="record-invest">Record investment</button>' +
        '</div></div>'
      : '';
    var returnCards = withPartners.filter(function (p) { return p.invest; }).map(function (p) {
      var iv = p.invest, entries = iv.entries || [];
      return '<div class="card"><div class="ch">' + E(p.name) + ' · return schedule<span class="spacer"></span><span class="muted" style="font-weight:500">paid ' + BDT(iv.returnPaidBdt || 0) + ' · pending ' + BDT(iv.returnPendingBdt || 0) + ' · on hold ' + BDT(iv.returnOnHoldBdt || 0) + '</span></div><div style="padding:16px">' +
        '<div class="kv2"><span class="k">Invested · effective</span><span class="v">' + BDT(iv.investedBdt || 0) + ' · ' + E(iv.effectiveDate || '—') + '</span></div>' +
        '<div class="kv2"><span class="k">Terms</span><span class="v" style="max-width:60%;text-align:right">' + E(iv.terms || '—') + '</span></div>' +
        (entries.length ? '<table style="margin-top:10px"><thead><tr><th>Period</th><th>Amount</th><th>Status</th><th>Recorded by</th></tr></thead><tbody>' + entries.slice().reverse().map(function (e) { return '<tr><td>' + E(e.period) + '</td><td class="tnum">' + BDT(e.amountBdt || 0) + '</td><td>' + retPill(e.status) + '</td><td class="muted">' + E(e.by || '') + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="muted" style="padding:8px 0">No return entries yet.</div>') +
        (can ? '<div class="ch" style="margin:14px -16px 12px;border-top:.5px solid var(--line)">Issue / update a return <span style="font-weight:500;color:var(--ink-faint)">· Paid · Pending · On hold — audit reason required</span></div>' +
          '<div class="detail" style="grid-template-columns:1fr 1fr 1fr">' +
            '<div class="field2"><label class="fl">Period</label><input id="ret-period-' + p.id + '" placeholder="e.g. Q3 2026"/></div>' +
            '<div class="field2"><label class="fl">Amount (BDT)</label><input id="ret-amount-' + p.id + '" type="number" placeholder="90000"/></div>' +
            '<div class="field2"><label class="fl">Status</label><select id="ret-status-' + p.id + '"><option value="paid">Paid</option><option value="pending">Pending</option><option value="onhold">On hold</option></select></div>' +
          '</div>' +
          '<div class="field2"><label class="fl">Audit reason *</label><input id="ret-reason-' + p.id + '" placeholder="e.g. Q3 payout confirmed via bank"/></div>' +
          '<button class="btn primary" data-act="record-return" data-id="' + p.id + '">' + I.check + ' Record return entry</button>' : '') +
      '</div></div>';
    }).join('');
    var hasAnyInvest = withPartners.some(function (p) { return p.invest; });
    var returnsHeader = hasAnyInvest
      ? '<div class="page-h" style="margin:22px 0 8px"><div><h1 style="font-size:18px">Recorded investments &amp; returns</h1><div class="desc">This is where Finance issues each partner’s <b>Paid / Pending / On-hold</b> return entries</div></div></div>'
      : '';
    return pageH('Investment desk', 'With Investment · interests → record confirmed investment → issue returns (Paid / Pending / On hold). No calculation or disbursement in-app.') +
      interestsCard + recordCard + returnsHeader + returnCards;
  };
  SECTIONS['investment-detail'] = function (p) {
    var e = DB.investmentEnquiries.find(function (x) { return x.id === p.id; });
    if (!e) return SECTIONS.investment();
    var done = e.status !== 'new';
    return backH('investment', 'Enquiry ' + e.id, e.partnerName) +
      '<div class="detail">' +
        '<div class="card"><div class="ch">Enquiry</div><div style="padding:16px">' +
          '<div class="kv2"><span class="k">Partner</span><span class="v">' + E(e.partnerName) + '</span></div>' +
          '<div class="kv2"><span class="k">Indicative interest</span><span class="v">' + (e.interestAmount ? BDT(e.interestAmount) : '—') + '</span></div>' +
          '<div class="kv2"><span class="k">Preferred contact</span><span class="v">' + E(e.contact) + '</span></div>' +
          '<div class="kv2"><span class="k">Notes</span><span class="v">' + E(e.notes || '—') + '</span></div>' +
        '</div></div>' +
        '<div class="card"><div class="ch">Record confirmed share</div><div style="padding:16px">' +
          '<div class="banner" style="background:#fdf8ec;border:1px dashed #d9b877;color:#8a5a2b"><b>Legally sensitive.</b> Commercial terms and amounts are <span class="mono">[LEGAL SIGN-OFF REQUIRED]</span> — the app records the shape only.</div>' +
          (done ? '<div style="margin-top:14px;color:var(--green);font-weight:700;display:flex;gap:8px;align-items:center">' + I.check + ' Followed up — share recorded (amounts = [LEGAL]).</div>'
            : '<button class="btn primary" style="margin-top:12px;width:100%" data-act="confirm-share" data-id="' + e.id + '">Mark followed-up · record confirmed share</button>') +
        '</div></div>' +
      '</div>';
  };

  // ---- Meetings (Flow 8) --------------------------------------------------
  function meetingStatusPill(m) {
    return m.status === 'confirmed' ? '<span class="pill green"><span class="dot"></span>Confirmed</span>'
      : m.status === 'scheduled' ? '<span class="pill green"><span class="dot"></span>Scheduled</span>'
      : '<span class="pill amber"><span class="dot"></span>Requested</span>';
  }
  SECTIONS.meetings = function () {
    var rows = DB.meetings.slice();
    return pageH('Meetings', DB.meetings.filter(function (m) { return m.status === 'requested'; }).length + ' awaiting confirmation') +
      '<div class="card"><table><thead><tr><th>Reference</th><th>Partner</th><th>With</th><th>When</th><th>Platform</th><th>Status</th><th></th></tr></thead><tbody>' +
        (rows.length ? rows.map(function (m) {
          var when = m.time || (m.date ? m.date + ' ' + (m.preferredTime || '') + (m.timezone ? ' (' + m.timezone + ')' : '') : '—');
          var link = m.link || m.zoomLink;
          return '<tr data-ref="' + E(m.id) + '"><td class="mono">' + E(m.id) + '</td><td>' + E(m.partnerName) + (m.prospectName ? ' <span class="muted">· ' + E(m.prospectName) + '</span>' : '') + '</td><td>' + E(m.withName || m.staffType) + '</td>' +
            '<td class="muted">' + E(when) + '</td><td>' + E(m.platform || '—') + '</td><td>' + meetingStatusPill(m) + '</td>' +
            '<td style="text-align:right">' + (m.status === 'requested' && canOps() ? '<button class="btn sm primary" data-act="confirm-meeting" data-id="' + m.id + '">Confirm + link</button>' : link ? '<a class="linkish" href="' + E(link) + '" target="_blank">Join ↗</a>' : '') + '</td></tr>';
        }).join('') : '<tr><td class="empty" colspan="7">No meetings.</td></tr>') +
      '</tbody></table></div>';
  };

  // ---- Support (Flow 8) ---------------------------------------------------
  // ========================================================================
  // Req 6.16 — Support & Help Desk. SP01 inbox (SLA aging), SP02 detail,
  // SP03 summary, SP04 client chat console. Industry-standard queue feel.
  // ========================================================================
  var TKT_PRIO = { urgent: ['red', 'Urgent'], high: ['amber', 'High'], normal: ['blue', 'Normal'], low: ['grey', 'Low'] };
  var TKT_STAT = { open: ['blue', 'Open'], in_progress: ['amber', 'In progress'], resolved: ['green', 'Resolved'], reopened: ['maroon', 'Reopened'] };
  function prioPill(p) { var x = TKT_PRIO[p] || ['grey', p]; return '<span class="pill ' + x[0] + '"><span class="dot"></span>' + x[1] + '</span>'; }
  function tstatPill(s) { var x = TKT_STAT[s] || ['grey', s]; return '<span class="pill ' + x[0] + '"><span class="dot"></span>' + x[1] + '</span>'; }
  function srcPill(s) { return s === 'client' ? '<span class="pill green"><span class="dot"></span>Client</span>' : '<span class="pill blue"><span class="dot"></span>Partner</span>'; }
  var SLA_H = { urgent: 4, high: 8, normal: 24, low: 48 };
  // SLA state drives the subtle aging warning — soft colour, not alarm.
  function tktSla(t) {
    var open = t.status !== 'resolved';
    var target = (t.slaHours || SLA_H[t.priority] || 24) * 3600000;
    var end = open ? Date.now() : new Date(t.resolvedAt || t.updatedAt).getTime();
    var age = Math.max(0, end - new Date(t.createdAt).getTime());
    var pct = target ? age / target : 0;
    return { age: age, target: target, pct: pct, open: open, state: !open ? 'resolved' : pct >= 1 ? 'breached' : pct >= 0.75 ? 'approaching' : 'ok' };
  }
  function ageLabel(ms) {
    var h = ms / 3600000;
    if (h < 1) return Math.round(ms / 60000) + 'm';
    if (h < 48) return h.toFixed(h < 10 ? 1 : 0) + 'h';
    return Math.round(h / 24) + 'd';
  }
  function agePill(t) {
    var s = tktSla(t);
    if (s.state === 'resolved') return '<span class="muted">' + ageLabel(s.age) + '</span>';
    var bg = s.state === 'breached' ? 'var(--red-bg);color:var(--red)' : s.state === 'approaching' ? 'var(--amber-bg,#fdf3e0);color:var(--amber,#b8860b)' : 'transparent;color:var(--muted)';
    var title = s.state === 'breached' ? 'SLA breached (' + (t.slaHours || SLA_H[t.priority]) + 'h target)' : s.state === 'approaching' ? 'Approaching SLA (' + (t.slaHours || SLA_H[t.priority]) + 'h target)' : 'Within SLA';
    return '<span title="' + title + '" style="display:inline-block;padding:2px 8px;border-radius:6px;font-weight:700;font-size:12px;background:' + bg + '">' + ageLabel(s.age) + (s.state === 'breached' ? ' ⚠' : '') + '</span>';
  }

  var tktFilters = { q: '', cat: '', status: '', source: '', priority: '' };
  var tktSel = {}; // bulk selection

  // SP01 — Ticket inbox. The industry-standard queue.
  SECTIONS.support = function () {
    var all = DB.tickets.slice();
    var rows = all.filter(function (t) {
      if (tktFilters.cat && t.category !== tktFilters.cat) return false;
      if (tktFilters.status && t.status !== tktFilters.status) return false;
      if (tktFilters.source && t.source !== tktFilters.source) return false;
      if (tktFilters.priority && t.priority !== tktFilters.priority) return false;
      if (tktFilters.q) { var q = tktFilters.q.toLowerCase(); if ((t.subject + ' ' + t.requesterName + ' ' + t.id).toLowerCase().indexOf(q) < 0) return false; }
      return true;
    });
    // default sort: aging first (breached → approaching → ok), resolved last
    var rank = { breached: 0, approaching: 1, ok: 2, resolved: 3 };
    rows.sort(function (a, b) { var sa = tktSla(a), sb = tktSla(b); if (rank[sa.state] !== rank[sb.state]) return rank[sa.state] - rank[sb.state]; return sb.pct - sa.pct; });
    var open = all.filter(function (t) { return t.status !== 'resolved'; });
    var breached = open.filter(function (t) { return tktSla(t).state === 'breached'; }).length;
    var selIds = Object.keys(tktSel).filter(function (k) { return tktSel[k]; });
    var opt = function (id, list, cur) { return '<select id="' + id + '" data-act="tkt-filter" style="height:30px;border:.5px solid var(--line-strong);border-radius:7px;font-size:12.5px;font-family:inherit;padding:0 8px">' + list.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === cur ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'; };
    var staffOpts = '<option value="">— assignee —</option>' + DB.staff.map(function (s) { return '<option value="' + s.id + '">' + E(s.name) + '</option>'; }).join('');

    return pageH('Support inbox', open.length + ' open · ' + (breached ? breached + ' breaching SLA' : 'all within SLA') + ' · sorted by age') +
      (breached ? '<div class="banner" style="margin-bottom:14px;background:var(--red-bg);color:var(--red)">' + I.warn + '<div><b>' + breached + ' ticket(s) past SLA target</b> — oldest first below.</div></div>' : '') +
      '<div class="card"><div class="ch">Queue<span class="spacer"></span><span class="hstack" style="gap:8px">' +
        '<input id="tkt-q" data-act="tkt-filter" placeholder="Search…" value="' + E(tktFilters.q) + '" style="height:30px;border:.5px solid var(--line-strong);border-radius:7px;font-size:12.5px;font-family:inherit;padding:0 10px;width:140px"/>' +
        opt('tkt-f-source', [['', 'All sources'], ['partner', 'Partner'], ['client', 'Client']], tktFilters.source) +
        opt('tkt-f-cat', [['', 'All categories'], ['Customer Care', 'Customer Care'], ['Sales', 'Sales'], ['Accounts', 'Accounts'], ['Administration', 'Administration']], tktFilters.cat) +
        opt('tkt-f-status', [['', 'Any status'], ['open', 'Open'], ['in_progress', 'In progress'], ['resolved', 'Resolved'], ['reopened', 'Reopened']], tktFilters.status) +
        opt('tkt-f-prio', [['', 'Any priority'], ['urgent', 'Urgent'], ['high', 'High'], ['normal', 'Normal'], ['low', 'Low']], tktFilters.priority) +
      '</span></div>' +
      (selIds.length && canOps() ? '<div style="padding:10px 16px;background:var(--wash,#faf7f2);border-bottom:.5px solid var(--line);display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
        '<b style="font-size:12.5px">' + selIds.length + ' selected</b>' +
        '<select id="tkt-bulk-assignee" style="height:28px;border:.5px solid var(--line-strong);border-radius:7px;font-size:12px">' + staffOpts + '</select><button class="btn sm" data-act="tkt-bulk" data-kind="assign">Assign</button>' +
        '<select id="tkt-bulk-prio" style="height:28px;border:.5px solid var(--line-strong);border-radius:7px;font-size:12px"><option value="">— priority —</option><option value="urgent">Urgent</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select><button class="btn sm" data-act="tkt-bulk" data-kind="priority">Set</button>' +
        '<button class="btn sm" data-act="tkt-bulk" data-kind="resolve">Mark resolved</button>' +
        '<button class="btn sm" data-act="tkt-clearsel">Clear</button></div>' : '') +
      '<table><thead><tr>' + (canOps() ? '<th style="width:28px"></th>' : '') + '<th>ID</th><th>Source</th><th>Category</th><th>Subject</th><th>Requester</th><th>Assignee</th><th>Priority</th><th>Status</th><th>Age</th><th>Last activity</th></tr></thead><tbody>' +
        (rows.length ? rows.map(function (t) {
          return '<tr class="click" data-nav="ticket" data-id="' + t.id + '" data-ref="' + t.id + '">' +
            (canOps() ? '<td><input type="checkbox" data-act="tkt-sel" data-id="' + t.id + '"' + (tktSel[t.id] ? ' checked' : '') + ' onclick="event.stopPropagation()"/></td>' : '') +
            '<td class="mono">' + E(t.id) + '</td><td>' + srcPill(t.source) + '</td><td>' + E(t.category) + '</td>' +
            '<td style="font-weight:700">' + E(t.subject) + '</td><td>' + E(t.requesterName) + '</td>' +
            '<td>' + (t.assigneeName ? E(t.assigneeName) : '<span class="muted">Unassigned</span>') + '</td>' +
            '<td>' + prioPill(t.priority) + '</td><td>' + tstatPill(t.status) + '</td><td>' + agePill(t) + '</td>' +
            '<td class="muted">' + Salmon.timeAgo(t.updatedAt) + '</td></tr>';
        }).join('') : '<tr><td class="empty" colspan="' + (canOps() ? 11 : 10) + '">No tickets match.</td></tr>') +
      '</tbody></table></div>';
  };

  // SP02 — Ticket detail. The thread + all workflow actions.
  SECTIONS.ticket = function (p) {
    var t = DB.tickets.find(function (x) { return x.id === p.id; });
    if (!t) return SECTIONS.support();
    var can = canOps() || canFinance();
    var sla = tktSla(t);
    var isChat = t.source === 'client' && t.channel !== 'ticket';
    var thread = (t.thread && t.thread.length) ? t.thread : (t.body ? [{ by: t.requesterName, side: 'requester', at: t.createdAt, text: t.body }] : []).concat((t.replies || []).map(function (r) { return { by: r.by, side: 'staff', at: r.at, text: r.text }; }));

    var meta = '<div class="card"><div class="ch">Details<span class="spacer"></span>' + tstatPill(t.status) + '</div><div style="padding:16px">' +
      '<div class="kv2"><span class="k">Source</span><span class="v">' + srcPill(t.source) + (isChat ? ' · <span class="muted">' + (t.channel === 'whatsapp' ? 'WhatsApp channel' : 'in-app chat') + '</span>' : '') + '</span></div>' +
      '<div class="kv2"><span class="k">Category</span><span class="v">' + E(t.category) + '</span></div>' +
      '<div class="kv2"><span class="k">Requester</span><span class="v">' + E(t.requesterName) + '</span></div>' +
      '<div class="kv2"><span class="k">Priority</span><span class="v">' + prioPill(t.priority) + '</span></div>' +
      '<div class="kv2"><span class="k">Assignee</span><span class="v">' + (t.assigneeName ? E(t.assigneeName) : '<span class="muted">Unassigned</span>') + '</span></div>' +
      '<div class="kv2"><span class="k">Opened</span><span class="v">' + Salmon.timeAgo(t.createdAt) + '</span></div>' +
      '<div class="kv2"><span class="k">SLA</span><span class="v">' + (sla.state === 'resolved' ? 'met' : sla.state === 'breached' ? '<span style="color:var(--red);font-weight:700">breached — ' + ageLabel(sla.age) + ' / ' + (t.slaHours || SLA_H[t.priority]) + 'h</span>' : ageLabel(sla.age) + ' / ' + (t.slaHours || SLA_H[t.priority]) + 'h target') + '</span></div>' +
      (t.firstResponseAt ? '<div class="kv2"><span class="k">First response</span><span class="v">' + fmtDate(t.firstResponseAt) + '</span></div>' : '') +
      (t.attachments && t.attachments.length ? '<div class="kv2"><span class="k">Attachments</span><span class="v">' + t.attachments.map(function (a) { return '<span class="pill grey" style="margin-right:4px"><span class="dot"></span>' + E(a) + '</span>'; }).join('') + '</span></div>' : '') +
      '</div></div>';

    // controls: assign, priority, status
    var controls = can ? '<div class="card"><div class="ch">Manage</div><div style="padding:16px">' +
      '<div class="field2"><label class="fl">Assign owner</label><select data-act="tkt-assign" data-id="' + t.id + '"><option value="">— unassigned —</option>' + DB.staff.map(function (s) { return '<option value="' + s.id + '"' + (t.assigneeId === s.id ? ' selected' : '') + '>' + E(s.name) + ' · ' + roleShort(s.role) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field2" style="margin-top:10px"><label class="fl">Priority</label><select data-act="tkt-prio" data-id="' + t.id + '">' + ['urgent', 'high', 'normal', 'low'].map(function (pr) { return '<option value="' + pr + '"' + (t.priority === pr ? ' selected' : '') + '>' + TKT_PRIO[pr][1] + '</option>'; }).join('') + '</select></div>' +
      '<div style="margin-top:12px"><label class="fl">Status</label><div class="hstack" style="gap:6px;flex-wrap:wrap;margin-top:6px">' +
        ['open', 'in_progress', 'resolved'].map(function (st) { return '<button class="btn sm' + (t.status === st ? ' primary' : '') + '" data-act="tkt-status" data-id="' + t.id + '" data-status="' + st + '">' + TKT_STAT[st][1] + '</button>'; }).join('') +
        (t.status === 'resolved' ? '<button class="btn sm" data-act="tkt-status" data-id="' + t.id + '" data-status="reopened">Reopen</button>' : '') +
      '</div></div></div></div>' : '';

    var threadBlk = '<div class="card"><div class="ch">Conversation history (' + thread.length + ')</div><div style="padding:16px">' +
      (thread.length ? thread.map(function (m) {
        var staffSide = m.side === 'staff';
        var sys = m.side === 'system' || m.kind === 'note';
        if (sys) return '<div style="margin:8px 0;padding:10px 12px;background:var(--wash,#faf7f2);border-radius:8px;color:var(--muted);font-size:12.5px">' + I.help + ' ' + E(m.text) + '</div>';
        return '<div style="padding:10px 0;border-bottom:.5px solid var(--line-2)"><div style="font-weight:700;font-size:12.5px;' + (staffSide ? 'color:var(--maroon)' : '') + '">' + E(m.by) + ' · ' + (staffSide ? 'Salmon' + (m.byRole ? ' (' + roleShort(m.byRole) + ')' : '') : t.source) + '<span class="muted" style="font-weight:400;margin-left:8px">' + Salmon.timeAgo(m.at) + '</span></div><div style="margin-top:2px">' + E(m.text) + '</div></div>';
      }).join('') : '<div class="muted">No messages yet.</div>') +
      (can && !(isChat && t.channel === 'whatsapp') ? '<div class="field2" style="margin-top:14px"><label class="fl">Respond</label><textarea id="tk-reply" rows="3" placeholder="Type a reply…"></textarea></div>' +
        '<div class="hstack" style="margin-top:10px;gap:8px"><button class="btn primary" data-act="ticket-reply" data-id="' + t.id + '">Send reply</button><button class="btn" data-act="ticket-reply" data-id="' + t.id + '" data-resolve="1">Send + resolve</button></div>'
        : isChat && t.channel === 'whatsapp' ? '<div class="banner amber" style="margin-top:12px">' + I.help + '<div><b>WhatsApp channel</b>This conversation happens on WhatsApp Business. This is a tracking stub — no transcript is stored in-app. Respond to the customer in WhatsApp.</div></div>'
        : '') +
      '</div></div>';

    var histBlk = t.history && t.history.length ? '<div class="card"><div class="ch">Activity log</div><table><tbody>' +
      t.history.map(function (h) { return '<tr><td class="muted" style="width:130px">' + new Date(h.at).toLocaleString('en-GB') + '</td><td style="font-weight:700">' + E(h.action) + '</td><td>' + E(h.by) + '</td><td class="muted">' + E(h.note) + '</td></tr>'; }).join('') +
      '</tbody></table></div>' : '';

    return backH('support', t.subject, t.id + ' · ' + t.requesterName) +
      '<div class="detail">' + meta + controls + '</div>' + threadBlk + histBlk;
  };

  // SP03 — Support summary. Volume · response status · aging. The help-desk feel.
  SECTIONS['support-summary'] = function () {
    var all = DB.tickets.slice();
    var open = all.filter(function (t) { return t.status !== 'resolved'; });
    var byStatus = { open: 0, in_progress: 0, resolved: 0, reopened: 0 };
    var byCat = { 'Customer Care': 0, 'Sales': 0, 'Accounts': 0, 'Administration': 0 };
    var bySrc = { partner: 0, client: 0 };
    all.forEach(function (t) { byStatus[t.status] = (byStatus[t.status] || 0) + 1; byCat[t.category] = (byCat[t.category] || 0) + 1; bySrc[t.source] = (bySrc[t.source] || 0) + 1; });
    // aging buckets (open tickets only)
    var buckets = [['<4h', 0], ['4–24h', 0], ['1–2d', 0], ['2d+ / breached', 0]];
    open.forEach(function (t) { var h = (Date.now() - new Date(t.createdAt)) / 3600000; if (h < 4) buckets[0][1]++; else if (h < 24) buckets[1][1]++; else if (h < 48) buckets[2][1]++; else buckets[3][1]++; });
    var breached = open.filter(function (t) { return tktSla(t).state === 'breached'; }).length;
    // response timing
    var responded = all.filter(function (t) { return t.firstResponseAt; });
    var avgFirst = responded.length ? responded.reduce(function (a, t) { return a + (new Date(t.firstResponseAt) - new Date(t.createdAt)); }, 0) / responded.length : 0;
    var resolved = all.filter(function (t) { return t.status === 'resolved' && t.resolvedAt; });
    var avgRes = resolved.length ? resolved.reduce(function (a, t) { return a + (new Date(t.resolvedAt) - new Date(t.createdAt)); }, 0) / resolved.length : 0;

    var bar = function (label, val, max, color) {
      var pct = max ? Math.round(val / max * 100) : 0;
      return '<div style="margin:8px 0"><div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:3px"><span>' + E(label) + '</span><b>' + val + '</b></div>' +
        '<div style="height:8px;background:var(--line-2,#eee);border-radius:5px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:' + color + '"></div></div></div>';
    };
    var maxCat = Math.max.apply(null, Object.keys(byCat).map(function (k) { return byCat[k]; }).concat([1]));
    var maxBucket = Math.max.apply(null, buckets.map(function (b) { return b[1]; }).concat([1]));

    return pageH('Support summary', 'Volume, response status and aging — the help-desk view (clause 6.16.5)') +
      '<div class="kpis">' +
        kpi('Open tickets', open.length, byStatus.in_progress + ' in progress', open.length > 0) +
        kpi('Breaching SLA', breached, 'past target', breached > 0) +
        kpi('Avg first response', avgFirst ? ageLabel(avgFirst) : '—', responded.length + ' responded', false) +
        kpi('Avg resolution', avgRes ? ageLabel(avgRes) : '—', resolved.length + ' resolved', false) +
      '</div>' +
      '<div class="detail">' +
        '<div class="card"><div class="ch">Volume by status</div><div style="padding:16px">' +
          Object.keys(byStatus).map(function (k) { return bar(TKT_STAT[k][1], byStatus[k], all.length || 1, 'var(--' + (TKT_STAT[k][0] === 'grey' ? 'muted' : TKT_STAT[k][0]) + ',#888)'); }).join('') +
        '</div></div>' +
        '<div class="card"><div class="ch">Volume by category</div><div style="padding:16px">' +
          Object.keys(byCat).map(function (k) { return bar(k, byCat[k], maxCat, 'var(--maroon)'); }).join('') +
        '</div></div>' +
      '</div>' +
      '<div class="detail">' +
        '<div class="card"><div class="ch">Aging (open tickets)</div><div style="padding:16px">' +
          buckets.map(function (b, i) { return bar(b[0], b[1], maxBucket, i === 3 ? 'var(--red)' : i === 2 ? 'var(--amber,#c8860b)' : 'var(--blue,#3b6fb0)'); }).join('') +
          '<div class="muted" style="font-size:12px;margin-top:8px">Tickets sitting past 2 days (or their SLA target) are the backlog to clear first.</div>' +
        '</div></div>' +
        '<div class="card"><div class="ch">By source</div><div style="padding:16px">' +
          bar('Partner tickets', bySrc.partner, all.length || 1, 'var(--blue,#3b6fb0)') +
          bar('Client chats', bySrc.client, all.length || 1, 'var(--green)') +
          '<div class="muted" style="font-size:12px;margin-top:8px">Two channels, one queue view: structured partner tickets + the client real-time channel.</div>' +
        '</div></div>' +
      '</div>';
  };

  // SP04 — Client chat console. Reflects the ONE configured channel.
  SECTIONS['client-chat'] = function () {
    var channel = (DB.config && DB.config.clientSupportChannel) || 'in_app';
    var chats = DB.tickets.filter(function (t) { return t.source === 'client'; });
    var canCfg = isSuper() || staff.role === 'Manager';
    var toggle = canCfg ? '<div class="card"><div class="ch">Approved channel</div><div style="padding:16px">' +
      '<div class="muted" style="font-size:12.5px;margin-bottom:10px">Salmon runs <b>one</b> approved real-time client channel — no custom voice/video. Switch the seam here.</div>' +
      '<div class="hstack" style="gap:8px">' +
        '<button class="btn sm' + (channel === 'in_app' ? ' primary' : '') + '" data-act="tkt-channel" data-channel="in_app">Managed in-app chat</button>' +
        '<button class="btn sm' + (channel === 'whatsapp' ? ' primary' : '') + '" data-act="tkt-channel" data-channel="whatsapp">WhatsApp Business API</button>' +
      '</div>' +
      (channel === 'whatsapp' ? '<div class="muted" style="font-size:12px;margin-top:10px">WhatsApp mode: the app shows an honest handoff + a ticket stub. It never renders a transcript it does not hold.</div>' : '') +
      '</div></div>' : '';

    return pageH('Client chat console', 'The approved real-time channel: ' + (channel === 'whatsapp' ? 'WhatsApp Business API' : 'managed in-app chat')) +
      toggle +
      '<div class="card"><div class="ch">Client conversations (' + chats.length + ')</div><table><thead><tr><th>Ref</th><th>Client</th><th>Channel</th><th>Subject</th><th>Status</th><th>Last activity</th></tr></thead><tbody>' +
        (chats.length ? chats.map(function (t) {
          return '<tr class="click" data-nav="ticket" data-id="' + t.id + '" data-ref="' + t.id + '"><td class="mono">' + E(t.id) + '</td><td style="font-weight:700">' + E(t.requesterName) + '</td>' +
            '<td>' + (t.channel === 'whatsapp' ? '<span class="pill green"><span class="dot"></span>WhatsApp</span>' : '<span class="pill blue"><span class="dot"></span>In-app</span>') + '</td>' +
            '<td>' + E(t.subject) + '</td><td>' + tstatPill(t.status) + '</td><td class="muted">' + Salmon.timeAgo(t.updatedAt) + '</td></tr>';
        }).join('') : '<tr><td class="empty" colspan="6">No client conversations yet.</td></tr>') +
      '</tbody></table></div>';
  };

  // ---- Document activity (Flow 2 log) ------------------------------------
  SECTIONS.docs = function () {
    var rows = DB.docAccessLog.slice();
    return pageH('Document activity', 'Every sales-kit download is logged here') +
      '<div class="card"><table><thead><tr><th>When</th><th>Partner</th><th>Project</th><th>Document</th></tr></thead><tbody>' +
        (rows.length ? rows.map(function (d) {
          return '<tr data-ref="' + E(d.id) + '"><td class="muted">' + new Date(d.at).toLocaleString('en-GB') + '</td><td>' + E(d.partnerName) + '</td><td>' + E(d.projectName) + '</td><td class="mono">' + E(d.docName) + '</td></tr>';
        }).join('') : '<tr><td class="empty" colspan="4">No downloads yet — download a brochure on the partner phone.</td></tr>') +
      '</tbody></table></div>';
  };

  // ---- Catalogue + publish construction update (cross-view moment) --------
  var PROJECT_CATEGORIES = ['Apartment / Flat', 'Commercial space', 'Shop', 'Land / Plot share', 'Hospital / Hotel share'];
  var UNIT_STATUSES = ['available', 'reserved', 'booked', 'sold'];
  function catOpts(sel) { return PROJECT_CATEGORIES.map(function (c) { return '<option' + (c === sel ? ' selected' : '') + '>' + E(c) + '</option>'; }).join(''); }
  function unitStatusPill(s) {
    var m = { available: ['green', 'Available'], reserved: ['amber', 'Reserved'], booked: ['blue', 'Booked'], sold: ['grey', 'Sold'] };
    var x = m[s] || m.sold; return '<span class="pill ' + x[0] + '"><span class="dot"></span>' + x[1] + '</span>';
  }
  function invStatusSelect(p, u) {
    return '<select class="tk-move" data-act="inv-status" data-id="' + p.id + '" data-unit="' + E(u.unitNo) + '">' +
      UNIT_STATUSES.map(function (s) { return '<option value="' + s + '"' + (s === u.status ? ' selected' : '') + '>' + s.charAt(0).toUpperCase() + s.slice(1) + '</option>'; }).join('') + '</select>';
  }
  SECTIONS.catalogue = function () {
    var canManage = canOps(); // Super Admin + Manager
    var create = canManage
      ? '<div class="card"><div class="ch">' + I.plus + ' Create a project<span class="spacer"></span><span class="muted" style="font-weight:500">create · publish · unpublish</span></div><div style="padding:16px">' +
          '<div class="fsec">Essentials</div>' +
          '<div class="detail" style="grid-template-columns:1fr 1fr">' +
            '<div class="field2"><label class="fl">Property category</label><select id="np-category">' + catOpts('') + '</select></div>' +
            '<div class="field2"><label class="fl">Construction status</label><select id="np-status"><option value="upcoming">Upcoming</option><option value="ongoing">Under construction</option><option value="completed">Ready / Completed</option></select></div>' +
          '</div>' +
          '<div class="field2"><label class="fl">Project title *</label><input id="np-name" placeholder="e.g. Salmon Sapphire"/></div>' +
          '<div class="field2"><label class="fl">Location (area, block, city)</label><input id="np-location" placeholder="Bashundhara R/A, Block J, Dhaka"/></div>' +
          '<div class="field2"><label class="fl">Summary</label><textarea id="np-summary" rows="2" placeholder="Short description shown on the sales kit"></textarea></div>' +
          '<div class="detail" style="grid-template-columns:1fr 1fr">' +
            '<div class="field2"><label class="fl">Handover</label><input id="np-handover" placeholder="e.g. Q4 2027"/></div>' +
            '<div class="field2"><label class="fl">Civic amenities (comma-separated)</label><input id="np-amenities" placeholder="Lift, Security, Parking, Gym"/></div>' +
          '</div>' +
          '<div class="fsec">Configuration &amp; filtering (Global Client filters)</div>' +
          '<div class="detail" style="grid-template-columns:1fr 1fr 1fr">' +
            '<div class="field2"><label class="fl">Bedrooms</label><input id="np-bed" placeholder="e.g. 3"/></div>' +
            '<div class="field2"><label class="fl">Bathrooms</label><input id="np-bath" placeholder="e.g. 3"/></div>' +
            '<div class="field2"><label class="fl">Floors</label><input id="np-floors" placeholder="e.g. 14"/></div>' +
          '</div>' +
          '<div class="detail" style="grid-template-columns:1fr 1fr">' +
            '<div class="field2"><label class="fl">Area from (sqft)</label><input id="np-areafrom" type="number" placeholder="1450"/></div>' +
            '<div class="field2"><label class="fl">Area to (sqft)</label><input id="np-areato" type="number" placeholder="2100"/></div>' +
          '</div>' +
          '<div class="detail" style="grid-template-columns:1fr 1fr">' +
            '<div class="field2"><label class="fl">Price from (BDT)</label><input id="np-price" type="number" placeholder="14500000"/></div>' +
            '<div class="field2"><label class="fl">Price to (BDT)</label><input id="np-priceto" type="number" placeholder="22000000"/></div>' +
          '</div>' +
          '<div class="fsec">Contact &amp; visit</div>' +
          '<div class="detail" style="grid-template-columns:1fr 1fr">' +
            '<div class="field2"><label class="fl">Sales contact</label><input id="np-contact" placeholder="09610-SALMON"/></div>' +
            '<div class="field2"><label class="fl">Visit information</label><input id="np-visit" placeholder="By appointment · sales office"/></div>' +
          '</div>' +
          '<div class="fsec">Media gallery — upload from device (approved assets)</div>' +
          '<div class="detail" style="grid-template-columns:1fr 1fr">' +
            '<div class="field2"><label class="fl">Banner / cover image</label><input type="file" accept="image/*" id="np-banner-file"/></div>' +
            '<div class="field2"><label class="fl">Gallery images (select multiple)</label><input type="file" accept="image/*" multiple id="np-gallery-file"/></div>' +
          '</div>' +
          '<div class="detail" style="grid-template-columns:1fr 1fr">' +
            '<div class="field2"><label class="fl">Brochure (PDF / image)</label><input type="file" accept="application/pdf,image/*" id="np-brochure-file"/></div>' +
            '<div class="field2"><label class="fl">Walkthrough video (keep small)</label><input type="file" accept="video/*" id="np-video-file"/></div>' +
          '</div>' +
          '<div class="fsec">Floor plan &amp; virtual tour</div>' +
          '<div class="detail" style="grid-template-columns:1fr 1fr">' +
            '<div class="field2"><label class="fl">Zoomable floor plan (image / PDF)</label><input type="file" accept="image/*,application/pdf" id="np-floorplan-file"/></div>' +
            '<div class="field2"><label class="fl">360° / Matterport link (client-approved)</label><input id="np-360" placeholder="https://my.matterport.com/show/?m=…"/></div>' +
          '</div>' +
          '<label class="hstack" style="gap:8px;margin:8px 0 12px;font-size:12.5px"><input type="checkbox" id="np-publish" checked/> Publish immediately (visible to partners &amp; clients)</label>' +
          '<button class="btn primary" data-act="create-project">' + I.plus + ' Create project</button>' +
        '</div></div>'
      : '';
    return pageH('Catalogue', 'Create, publish and unpublish real-estate projects · maintain live inventory · publish construction updates') +
      create +
      DB.projects.map(function (p) {
        var updates = (DB.constructionUpdates && DB.constructionUpdates[p.id]) || [];
        var units = p.units || [];
        var counts = UNIT_STATUSES.map(function (s) { return units.filter(function (u) { return u.status === s; }).length; });
        return '<div class="card"><div class="ch">' + E(p.name) + ' <span class="pill violet" style="margin-left:6px"><span class="dot"></span>' + E(p.category || 'Apartment / Flat') + '</span>' +
          '<span class="spacer"></span>' + statusPillA(p) +
          (p.published === false ? ' <span class="pill grey"><span class="dot"></span>Unpublished</span>' : ' <span class="pill green"><span class="dot"></span>Published</span>') +
          (canManage ? ' <button class="btn sm" data-act="toggle-publish" data-id="' + p.id + '" data-pub="' + (p.published === false ? '1' : '0') + '">' + (p.published === false ? 'Publish' : 'Unpublish') + '</button>' : '') +
          '</div><div style="padding:16px">' +
          '<div class="muted" style="font-size:12.5px;margin:-4px 0 12px">' + E(p.location || '') + ' · from ' + BDT(p.priceFromBdt || 0) + (p.summary ? ' · ' + E(p.summary) : '') + '</div>' +
          // Inventory (Req: available / reserved / booked / sold, synced to mobile)
          '<div class="ch" style="margin:0 -16px 10px;border-top:.5px solid var(--line)">Inventory · ' + counts[0] + ' available / ' + counts[1] + ' reserved / ' + counts[2] + ' booked / ' + counts[3] + ' sold</div>' +
          (units.length
            ? '<table><thead><tr><th>Unit</th><th>Config</th><th>Area</th><th>Price</th><th>Status</th>' + (canManage ? '<th>Set status</th><th></th>' : '') + '</tr></thead><tbody>' +
              units.slice(0, 24).map(function (u) {
                return '<tr><td class="mono">' + E(u.unitNo) + '</td><td>' + E(u.config || '—') + '</td><td class="tnum">' + (u.areaSqft || '—') + ' sqft</td><td class="tnum">' + BDT(u.priceBdt || 0) + '</td><td>' + unitStatusPill(u.status) + '</td>' +
                  (canManage ? '<td>' + invStatusSelect(p, u) + '</td><td><button class="btn sm" data-act="dup-unit" data-id="' + p.id + '" data-unit="' + E(u.unitNo) + '" title="Duplicate this unit">Duplicate</button></td>' : '') + '</tr>';
              }).join('') + '</tbody></table>' + (units.length > 24 ? '<div class="muted" style="font-size:11.5px;padding:8px 0">Showing first 24 of ' + units.length + ' units.</div>' : '')
            : '<div class="muted" style="font-size:12.5px;padding:4px 0 8px">No units yet — add one below.</div>') +
          (canManage
            ? '<div class="addunit">' +
                '<input id="nu-no-' + p.id + '" placeholder="Unit / share no *"/>' +
                '<input id="nu-cfg-' + p.id + '" placeholder="Config (e.g. 3 Bed)"/>' +
                '<input id="nu-area-' + p.id + '" type="number" placeholder="Area sqft"/>' +
                '<input id="nu-price-' + p.id + '" type="number" placeholder="Price BDT"/>' +
                '<select id="nu-status-' + p.id + '">' + UNIT_STATUSES.map(function (s) { return '<option value="' + s + '">' + s.charAt(0).toUpperCase() + s.slice(1) + '</option>'; }).join('') + '</select>' +
                '<button class="btn sm primary" data-act="add-unit" data-id="' + p.id + '">' + I.plus + ' Add unit</button>' +
              '</div>'
            : '') +
          // Construction updates
          '<div class="ch" style="margin:16px -16px 0;border-top:.5px solid var(--line)">Publish construction update</div>' +
          '<div class="field2" style="margin-top:12px"><label class="fl">Stage / milestone</label><input id="cu-stage-' + p.id + '" placeholder="e.g. 12th floor"/></div>' +
          '<div class="field2"><label class="fl">Caption</label><input id="cu-cap-' + p.id + '" placeholder="What happened"/></div>' +
          '<button class="btn primary" style="margin-top:10px" data-act="publish-update" data-id="' + p.id + '">Publish update</button>' +
          '<div class="ch" style="margin:16px -16px 0;border-top:.5px solid var(--line)">Recent updates (' + updates.length + ')</div>' +
          (updates.length ? updates.slice(0, 4).map(function (u) { return '<div style="padding:8px 0;border-bottom:.5px solid var(--line-2)"><span style="font-weight:700">' + E(u.stage) + '</span> <span class="muted">· ' + new Date(u.date).toLocaleDateString('en-GB') + '</span><div class="muted" style="font-size:12.5px">' + E(u.caption) + '</div></div>'; }).join('') : '<div class="muted" style="padding:8px 0">No updates.</div>') +
        '</div></div>';
      }).join('');
  };

  // =========================================================================
  // TASKS & TARGETS (W01–W08, X01–X03)
  // =========================================================================
  function taskPillA(t) {
    var m = { assigned: ['blue', 'Assigned'], in_progress: ['amber', 'In progress'], complete: ['green', 'Complete'], overdue: ['red', 'Overdue'], cancelled: ['grey', 'Cancelled'] };
    var x = m[t.status] || ['grey', t.status]; return '<span class="pill ' + x[0] + '"><span class="dot"></span>' + x[1] + '</span>';
  }
  function taskDue(t) { var d = Math.round((new Date(t.dueDate) - Date.now()) / 86400000); return d < 0 ? Math.abs(d) + 'd overdue' : d === 0 ? 'due today' : 'due in ' + d + 'd'; }
  function convertedFor(pid) { return (DB.leads || []).filter(function (l) { return l.status === 'converted' && l.partnerId === pid; }).length; }
  function teamIdsOf(leadId) { var p = (DB.partners || []).find(function (x) { return x.id === leadId; }); return p && p.team ? p.team.map(function (m) { return m.id; }) : []; }
  function achOfTarget(t) {
    if (t.archivedAchievement != null) return t.archivedAchievement;
    if (t.scope === 'team') { var ids = teamIdsOf(t.teamLeadId); return (DB.leads || []).filter(function (l) { return l.status === 'converted' && ids.indexOf(l.partnerId) >= 0; }).length; }
    return convertedFor(t.partnerId);
  }

  // W01 — Tasks board (kanban-lite, 4 columns)
  var TASK_COLS = [['assigned', 'Assigned', 'blue'], ['in_progress', 'In progress', 'amber'], ['complete', 'Complete', 'green'], ['overdue', 'Overdue', 'red']];
  // Which target columns a card may be dragged/moved into (from → allowed set).
  // 'overdue' is never a manual target — only the server tick flips it.
  var TASK_MOVES = { assigned: ['in_progress', 'complete'], in_progress: ['assigned', 'complete'], complete: ['assigned', 'in_progress'], overdue: ['in_progress', 'complete'] };
  function taskCard(t, canMove) {
    var overdue = t.status === 'overdue';
    var due = t.status === 'complete' ? 'completed' : taskDue(t);
    // one-tap status menu (the reliable path alongside drag)
    var menu = '';
    if (canMove) {
      var opts = (TASK_MOVES[t.status] || []).map(function (s) {
        var lbl = { assigned: 'Assigned', in_progress: 'In progress', complete: 'Complete' }[s];
        return '<option value="' + s + '">Move → ' + lbl + '</option>';
      }).join('');
      menu = '<select class="tsel" data-taskmove="' + t.id + '" onclick="event.stopPropagation()"><option value="">•••</option>' + opts + '</select>';
    }
    return '<div class="tcard" ' + (canMove ? 'draggable="true" ' : '') + 'data-task="' + t.id + '" data-status="' + t.status + '" data-nav="task" data-id="' + t.id + '" data-ref="' + t.id + '">' +
      '<div class="tcrow"><div class="tct">' + E(t.title) + '</div>' + menu + '</div>' +
      '<div class="tcm"><span class="tavatar">' + E(initials(t.assigneePartnerName)) + '</span>' + E(t.assigneePartnerName) + '</div>' +
      '<div class="tcd ' + (overdue ? 'over' : '') + '">' + due + (t.evidenceRequired ? ' · <span title="Evidence required">📎</span>' : '') + '</div></div>';
  }
  var taskView = 'board'; // 'board' | 'list' — user preference, persists across renders
  function taskViewToggle() {
    return '<div class="tbtoggle" role="tablist">' +
      '<button data-act="taskview" data-view="board" class="' + (taskView === 'board' ? 'on' : '') + '">' + I.dash + 'Board</button>' +
      '<button data-act="taskview" data-view="list" class="' + (taskView === 'list' ? 'on' : '') + '">' + I.ledger + 'List</button>' +
      '</div>';
  }
  SECTIONS.taskboard = function () {
    var tasks = (DB.tasks || []).filter(function (t) { return t.status !== 'cancelled'; });
    var canMove = canManageLeads();
    var partners = DB.partners || [];
    var head = '<div class="page-h"><div><h1>Tasks board</h1><div class="desc">' +
      E(tasks.length + ' task(s) · ' + (taskView === 'board' ? 'drag a card to change status, or quick-add below' : 'one row per task — sort by status at a glance')) +
      '</div></div>' + taskViewToggle() + '</div>';
    var body = taskView === 'list'
      ? taskListView(tasks, canMove, partners)
      : '<div class="taskboard">' + TASK_COLS.map(function (col) {
          var list = tasks.filter(function (t) { return t.status === col[0]; });
          // quick-add lives at the top of the Assigned column — ClickUp-style, no modal
          var qa = (col[0] === 'assigned' && canMove)
            ? '<div class="tqa"><input class="tqa-title" id="tqa-title" placeholder="+ Quick add a task… (Enter)"/>' +
              '<select class="tqa-partner" id="tqa-partner">' + partners.map(function (p) { return '<option value="' + p.id + '">' + E(p.name) + '</option>'; }).join('') + '</select></div>'
            : '';
          return '<div class="tcol" data-col="' + col[0] + '"><div class="tcolh"><span class="pill ' + col[2] + '"><span class="dot"></span>' + col[1] + '</span><span class="muted tcount">' + list.length + '</span></div>' +
            qa +
            '<div class="tcol-list">' +
            (list.length ? list.map(function (t) { return taskCard(t, canMove); }).join('') : '<div class="tempty">—</div>') +
            '</div></div>';
        }).join('') + '</div>';
    return head + body +
      '<div style="margin-top:14px"><button class="btn primary" data-nav="taskassign">' + I.plus + ' Assign a task (bulk / team / territory)</button></div>';
  };
  // list view — same records as the board, one row each, inline status move
  function taskListView(tasks, canMove, partners) {
    var order = { assigned: 0, in_progress: 1, overdue: 2, complete: 3 };
    var sorted = tasks.slice().sort(function (a, b) { return (order[a.status] || 0) - (order[b.status] || 0); });
    var qa = canMove
      ? '<div class="ch" style="border-top:.5px solid var(--line)"><div class="tqa" style="margin:0;width:100%"><input class="tqa-title" id="tqa-title" placeholder="+ Quick add a task… (Enter)"/>' +
        '<select class="tqa-partner" id="tqa-partner" style="max-width:160px">' + partners.map(function (p) { return '<option value="' + p.id + '">' + E(p.name) + '</option>'; }).join('') + '</select></div></div>'
      : '';
    var rows = sorted.length ? sorted.map(function (t) {
      var overdue = t.status === 'overdue';
      var due = t.status === 'complete' ? 'completed' : taskDue(t);
      var move = '';
      if (canMove) {
        var opts = (TASK_MOVES[t.status] || []).map(function (s) {
          var lbl = { assigned: 'Assigned', in_progress: 'In progress', complete: 'Complete' }[s];
          return '<option value="' + s + '">Move → ' + lbl + '</option>';
        }).join('');
        move = '<select class="tk-move" data-taskmove="' + t.id + '" onclick="event.stopPropagation()"><option value="">•••</option>' + opts + '</select>';
      }
      return '<tr class="click" data-nav="task" data-id="' + t.id + '" data-ref="' + t.id + '">' +
        '<td class="tk-title">' + E(t.title) + (t.evidenceRequired ? ' <span title="Evidence required">📎</span>' : '') + '</td>' +
        '<td><span class="tk-assignee"><span class="tavatar">' + E(initials(t.assigneePartnerName)) + '</span>' + E(t.assigneePartnerName) + '</span></td>' +
        '<td>' + taskPillA(t) + '</td>' +
        '<td class="tk-due ' + (overdue ? 'over' : '') + '">' + E(due) + '</td>' +
        '<td style="text-align:right" onclick="event.stopPropagation()">' + (move || I.chevr) + '</td></tr>';
    }).join('') : '<tr><td class="empty" colspan="5">No tasks yet.</td></tr>';
    return '<div class="card"><table class="tasklist"><thead><tr><th>Task</th><th>Assignee</th><th>Status</th><th>Due</th><th style="text-align:right">Move</th></tr></thead><tbody>' + rows + '</tbody></table>' + qa + '</div>';
  }
  // Post-render wiring for the board: HTML5 drag-and-drop, one-tap move, quick-add.
  function wireTaskboard() {
    var board = document.querySelector('.taskboard');
    // drag-and-drop only exists in board view
    if (board) {
      var dragId = null, dragFrom = null;
      board.querySelectorAll('.tcard[draggable]').forEach(function (card) {
        card.addEventListener('dragstart', function (e) {
          dragId = card.getAttribute('data-task'); dragFrom = card.getAttribute('data-status');
          card.classList.add('dragging'); try { e.dataTransfer.setData('text/plain', dragId); e.dataTransfer.effectAllowed = 'move'; } catch (x) {}
        });
        card.addEventListener('dragend', function () { card.classList.remove('dragging'); board.querySelectorAll('.tcol').forEach(function (c) { c.classList.remove('dragover'); }); });
      });
      board.querySelectorAll('.tcol').forEach(function (colEl) {
        var to = colEl.getAttribute('data-col');
        colEl.addEventListener('dragover', function (e) {
          if (!dragId) return;
          var ok = (TASK_MOVES[dragFrom] || []).indexOf(to) >= 0;
          if (ok) { e.preventDefault(); colEl.classList.add('dragover'); }
        });
        colEl.addEventListener('dragleave', function () { colEl.classList.remove('dragover'); });
        colEl.addEventListener('drop', function (e) {
          e.preventDefault(); colEl.classList.remove('dragover');
          if (!dragId || to === dragFrom) return;
          if ((TASK_MOVES[dragFrom] || []).indexOf(to) < 0) return;
          moveTask(dragId, to); dragId = null;
        });
      });
    }
    // one-tap status menu — works in both board and list view
    document.querySelectorAll('[data-taskmove]').forEach(function (sel) {
      sel.addEventListener('change', function () { if (sel.value) moveTask(sel.getAttribute('data-taskmove'), sel.value); });
    });
    // quick-add — Enter creates the task on the selected partner, due end of today
    var qt = document.getElementById('tqa-title');
    if (qt) qt.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var title = String(qt.value || '').trim(); if (!title) return;
      var pid = (document.getElementById('tqa-partner') || {}).value;
      qt.disabled = true;
      Salmon.post('/api/tasks', { assigneePartnerId: pid, title: title }).then(function (r) {
        var p = (DB.partners || []).find(function (x) { return x.id === pid; });
        Salmon.toast.show('Task added', title + ' → ' + (p ? p.name : pid) + '.');
      }).catch(function (err) { Salmon.toast.show('Could not add', (err.data && err.data.error) || '', { warn: true }); qt.disabled = false; });
    });
  }
  function moveTask(taskId, to) {
    Salmon.post('/api/tasks/status', { taskId: taskId, status: to }).then(function (r) {
      var lbl = { assigned: 'Assigned', in_progress: 'In progress', complete: 'Complete' }[to] || to;
      Salmon.toast.show('Moved to ' + lbl, r.task.title + (to === 'complete' ? ' — marked complete.' : '.'));
    }).catch(function (err) { Salmon.toast.show('Could not move', (err.data && err.data.error) || '', { warn: true }); render(); });
  }

  // W04 — task detail (manager view: completion note + evidence)
  SECTIONS.task = function (p) {
    var t = (DB.tasks || []).find(function (x) { return x.id === p.id; });
    if (!t) return SECTIONS.taskboard();
    var can = canManageLeads();
    return backH('taskboard', t.title, t.id) +
      '<div class="detail">' +
        '<div class="card"><div class="ch">Task</div><div style="padding:16px">' +
          '<div class="kv2"><span class="k">Assignee</span><span class="v linkish" data-nav="partner" data-id="' + t.assigneePartnerId + '">' + E(t.assigneePartnerName) + '</span></div>' +
          '<div class="kv2"><span class="k">Assigned by</span><span class="v">' + E(t.assignedBy) + ' (' + E(t.assignerType === 'teamlead' ? 'Team Lead' : roleShort(t.assignedByRole)) + ')</span></div>' +
          '<div class="kv2"><span class="k">Due</span><span class="v">' + new Date(t.dueDate).toLocaleString('en-GB') + ' · ' + taskDue(t) + '</span></div>' +
          '<div class="kv2"><span class="k">Evidence required</span><span class="v">' + (t.evidenceRequired ? 'Yes' : 'No') + '</span></div>' +
          '<div class="kv2"><span class="k">Status</span><span class="v">' + taskPillA(t) + '</span></div>' +
          '<div class="kv2"><span class="k">Description</span><span class="v" style="max-width:60%;text-align:right">' + E(t.description) + '</span></div>' +
        '</div></div>' +
        '<div class="card"><div class="ch">Completion</div><div style="padding:16px">' +
          (t.status === 'complete'
            ? '<div class="kv2"><span class="k">Completed</span><span class="v">' + new Date(t.completedAt).toLocaleString('en-GB') + '</span></div>' +
              '<div class="kv2"><span class="k">Partner note</span><span class="v" style="max-width:60%;text-align:right">' + E(t.completionNote || '—') + '</span></div>' +
              (t.evidenceFile ? '<div class="kv2"><span class="k">Evidence</span><span class="sigbadge">' + I.check + ' ' + E(t.evidenceFile) + '</span></div>' : '') +
              '<div style="margin-top:12px;color:var(--green);font-weight:700;display:flex;gap:8px;align-items:center">' + I.check + ' Completed by ' + E(t.assigneePartnerName) + '.</div>'
            : t.status === 'cancelled'
              ? '<div class="muted">Cancelled.</div>'
              : '<div class="muted">Awaiting completion by ' + E(t.assigneePartnerName) + '.</div>' +
                (can ? '<button class="btn danger" style="margin-top:14px;width:100%" data-act="cancel-task" data-id="' + t.id + '">Cancel task</button>' : '')) +
        '</div></div>' +
      '</div>';
  };

  // W02 + W03 — assign a task (single / bulk to team or territory) + templates
  SECTIONS.taskassign = function () {
    if (!canManageLeads()) return SECTIONS.denied({ attempted: 'taskassign' });
    var partners = DB.partners;
    return pageH('Assign a task', 'Single partner, or bulk to a team / territory') +
      '<div class="detail">' +
        '<div class="card"><div class="ch">Task</div><div style="padding:16px">' +
          '<div class="field2"><label class="fl">Template (optional)</label><select id="tk-template" data-act="tk-template"><option value="">— none —</option>' + (DB.taskTemplates || []).map(function (tpl) { return '<option value="' + tpl.id + '">' + E(tpl.title) + '</option>'; }).join('') + '</select></div>' +
          '<div class="field2"><label class="fl">Title</label><input id="tk-title" placeholder="e.g. Follow up with Karim Uddin re: Bellissimo B-704"/></div>' +
          '<div class="field2"><label class="fl">Description</label><textarea id="tk-desc" rows="2" placeholder="Short instruction…"></textarea></div>' +
          '<div class="field2"><label class="fl">Due date</label><input id="tk-due" type="datetime-local" value="' + tomorrowLocal() + '"/></div>' +
          '<label class="hstack" style="gap:8px;margin-top:6px"><input type="checkbox" id="tk-evi"/> <span class="muted">Evidence required (photo / document)</span></label>' +
        '</div></div>' +
        '<div class="card"><div class="ch">Assign to</div><div style="padding:16px">' +
          '<div class="field2"><label class="fl">Scope</label><select id="tk-scope" data-act="tk-scope"><option value="single">Single partner</option><option value="team">Whole team (Cumilla)</option><option value="territory">Whole territory</option></select></div>' +
          '<div id="tk-single"><div class="field2"><label class="fl">Partner</label><select id="tk-partner">' + partners.map(function (p) { return '<option value="' + p.id + '">' + E(p.name) + ' · ' + E(p.territory) + '</option>'; }).join('') + '</select></div></div>' +
          '<div id="tk-terr" style="display:none"><div class="field2"><label class="fl">Territory</label><select id="tk-territory"><option>Cumilla</option><option>Dhaka</option><option>Chattogram</option></select></div></div>' +
          '<div id="tk-summary" class="muted" style="font-size:12px;margin:8px 0"></div>' +
          '<button class="btn primary" style="width:100%" data-act="assign-task">' + I.check + ' Assign task</button>' +
        '</div></div>' +
      '</div>';
  };

  // W05 — team completion view
  SECTIONS.teamcompletion = function () {
    var teams = DB.partners.filter(function (p) { return p.teamLead; });
    return pageH('Team completion', 'Per team — assigned / completed / missed, sorted by completion rate') +
      '<div class="card"><table><thead><tr><th>Team</th><th>Assigned</th><th>Completed</th><th>Missed</th><th>Completion</th><th>Target</th></tr></thead><tbody>' +
        (teams.length ? teams.map(function (tl) {
          var ids = teamIdsOf(tl.id).concat([tl.id]);
          var ts = (DB.tasks || []).filter(function (t) { return ids.indexOf(t.assigneePartnerId) >= 0 && t.status !== 'cancelled'; });
          var comp = ts.filter(function (t) { return t.status === 'complete'; }).length;
          var missed = ts.filter(function (t) { return t.status === 'overdue'; }).length;
          var rate = ts.length ? Math.round(comp / ts.length * 100) : 0;
          var tgt = (DB.targets || []).find(function (x) { return x.scope === 'team' && x.teamLeadId === tl.id && x.period === DB.meta.currentPeriod; });
          return '<tr><td style="font-weight:700">' + E(tl.territory) + ' team</td><td class="tnum">' + ts.length + '</td><td class="tnum">' + comp + '</td><td class="tnum">' + missed + '</td>' +
            '<td>' + rateBar(rate) + '</td><td class="tnum">' + (tgt ? achOfTarget(tgt) + ' / ' + tgt.targetValue : '—') + '</td></tr>';
        }).join('') : '<tr><td class="empty" colspan="6">No teams.</td></tr>') +
      '</tbody></table></div>' +
      '<div class="card"><div class="ch">Per partner</div><table><thead><tr><th>Partner</th><th>Assigned</th><th>Completed</th><th>Missed</th><th>Completion</th></tr></thead><tbody>' +
        DB.partners.map(function (p) {
          var ts = (DB.tasks || []).filter(function (t) { return t.assigneePartnerId === p.id && t.status !== 'cancelled'; });
          var comp = ts.filter(function (t) { return t.status === 'complete'; }).length;
          var missed = ts.filter(function (t) { return t.status === 'overdue'; }).length;
          var rate = ts.length ? Math.round(comp / ts.length * 100) : 0;
          return '<tr><td style="font-weight:700">' + E(p.name) + '</td><td class="tnum">' + ts.length + '</td><td class="tnum">' + comp + '</td><td class="tnum">' + missed + '</td><td>' + rateBar(rate) + '</td></tr>';
        }).join('') +
      '</tbody></table></div>';
  };
  function rateBar(rate) {
    var cls = rate >= 90 ? 'green' : rate >= 60 ? 'grey' : 'amber'; // never red short of overdue
    return '<span class="ratewrap"><span class="ratebar"><span class="ratefill ' + cls + '" style="width:' + rate + '%"></span></span><span class="ratepct">' + rate + '%</span></span>';
  }

  // W06 — missed activities queue
  SECTIONS.missed = function () {
    var over = (DB.tasks || []).filter(function (t) { return t.status === 'overdue'; });
    return pageH('Missed activities', over.length + ' overdue task(s) awaiting attention') +
      '<div class="card"><table><thead><tr><th>Task</th><th>Partner</th><th>Was due</th><th>Assigned by</th><th></th></tr></thead><tbody>' +
        (over.length ? over.map(function (t) {
          return '<tr class="click" data-nav="task" data-id="' + t.id + '" data-ref="' + t.id + '"><td style="font-weight:700">' + E(t.title) + '</td><td>' + E(t.assigneePartnerName) + '</td>' +
            '<td><span class="pill red"><span class="dot"></span>' + taskDue(t) + '</span></td><td>' + E(t.assignedBy) + '</td><td style="text-align:right;color:var(--ink-faint)">' + I.chevr + '</td></tr>';
        }).join('') : '<tr><td class="empty" colspan="5">Nothing overdue — the network is on track.</td></tr>') +
      '</tbody></table></div>';
  };

  // W07 + W08 — target management + progress overview
  SECTIONS.targets = function () {
    var cur = (DB.targets || []).filter(function (t) { return t.period === DB.meta.currentPeriod; });
    return pageH('Target management', 'Set partner &amp; team targets — achievement is derived from converted leads, never typed') +
      '<div class="card"><div class="ch">Current period · ' + E(DB.meta.currentPeriod) + '</div><table><thead><tr><th>Scope</th><th>Who</th><th>Achievement</th><th>Target</th><th>Progress</th><th></th></tr></thead><tbody>' +
        (cur.length ? cur.map(function (t) {
          var ach = achOfTarget(t); var pct = Math.min(100, Math.round(ach / t.targetValue * 100));
          return '<tr data-ref="' + t.id + '"><td>' + (t.scope === 'team' ? 'Team' : 'Partner') + '</td><td style="font-weight:700">' + E(t.scope === 'team' ? (t.teamName || 'team') : t.partnerName) + '</td>' +
            '<td class="tnum">' + ach + '</td>' +
            '<td><input class="tinput" type="number" id="tv-' + t.id + '" value="' + t.targetValue + '" style="width:64px" ' + (canManageLeads() ? '' : 'disabled') + '/></td>' +
            '<td>' + rateBar(pct) + '</td>' +
            '<td style="text-align:right">' + (canManageLeads() ? '<button class="btn sm primary" data-act="set-target" data-id="' + t.id + '">Save</button>' : '') + '</td></tr>';
        }).join('') : '<tr><td class="empty" colspan="6">No targets this period.</td></tr>') +
      '</tbody></table></div>' +
      '<div class="muted" style="font-size:12px;margin-top:8px">Note: only the <b>target</b> is editable. Achievement is read-only — it is derived from Part 4 leads (converted count), never entered by hand.</div>';
  };

  // X01 — org-wide task activity
  SECTIONS.orgtasks = function () {
    var all = (DB.tasks || []);
    var byStatus = { assigned: 0, in_progress: 0, complete: 0, overdue: 0, cancelled: 0 };
    all.forEach(function (t) { byStatus[t.status] = (byStatus[t.status] || 0) + 1; });
    return pageH('Org-wide task activity', all.length + ' task(s) across all territories') +
      '<div class="kpis">' +
        kpi('Assigned', byStatus.assigned, 'open', false) +
        kpi('Completed', byStatus.complete, 'this period', false) +
        kpi('Overdue', byStatus.overdue, 'missed', byStatus.overdue > 0) +
        kpi('Completion', all.length ? Math.round(byStatus.complete / all.length * 100) + '%' : '—', 'overall', false) +
      '</div>' +
      '<div class="card"><div class="ch">All tasks</div><table><thead><tr><th>Task</th><th>Partner</th><th>Territory</th><th>Status</th></tr></thead><tbody>' +
        all.slice(0, 20).map(function (t) { return '<tr class="click" data-nav="task" data-id="' + t.id + '"><td>' + E(t.title) + '</td><td>' + E(t.assigneePartnerName) + '</td><td>' + E(t.territory) + '</td><td>' + taskPillA(t) + '</td></tr>'; }).join('') +
      '</tbody></table></div>';
  };

  // X02 — territory trend (one chart + one table)
  SECTIONS.territorytrend = function () {
    var terrs = {};
    (DB.tasks || []).forEach(function (t) {
      var k = t.territory || '—';
      terrs[k] = terrs[k] || { assigned: 0, complete: 0 };
      if (t.status !== 'cancelled') terrs[k].assigned += 1;
      if (t.status === 'complete') terrs[k].complete += 1;
    });
    var rows = Object.keys(terrs).map(function (k) {
      var d = terrs[k]; var rate = d.assigned ? Math.round(d.complete / d.assigned * 100) : 0;
      // target achievement across partners in territory
      var tsum = 0, asum = 0;
      (DB.targets || []).filter(function (x) { return x.scope === 'partner' && x.territory === k && x.period === DB.meta.currentPeriod; }).forEach(function (x) { tsum += x.targetValue; asum += achOfTarget(x); });
      return { terr: k, assigned: d.assigned, complete: d.complete, rate: rate, ach: asum, tgt: tsum };
    }).sort(function (a, b) { return b.assigned - a.assigned; });
    var max = Math.max(1, Math.max.apply(null, rows.map(function (r) { return r.assigned; })));
    return pageH('Territory trend', 'Task activity + target achievement per territory · current period') +
      '<div class="card"><div class="ch">Tasks assigned vs completed</div><div style="padding:16px">' +
        '<div class="chart">' + rows.map(function (r) {
          return '<div class="chrow"><div class="chlabel">' + E(r.terr) + '</div><div class="chbars">' +
            '<div class="chbar assigned" style="width:' + Math.round(r.assigned / max * 100) + '%"><span>' + r.assigned + '</span></div>' +
            '<div class="chbar complete" style="width:' + Math.round(r.complete / max * 100) + '%"><span>' + r.complete + '</span></div>' +
          '</div></div>';
        }).join('') + '</div>' +
        '<div class="chlegend"><span><i class="ci assigned"></i> Assigned</span><span><i class="ci complete"></i> Completed</span></div>' +
      '</div></div>' +
      '<div class="card"><div class="ch">By territory</div><table><thead><tr><th>Territory</th><th>Assigned</th><th>Completed</th><th>Completion</th><th>Target achievement</th></tr></thead><tbody>' +
        rows.map(function (r) { return '<tr><td style="font-weight:700">' + E(r.terr) + '</td><td class="tnum">' + r.assigned + '</td><td class="tnum">' + r.complete + '</td><td>' + rateBar(r.rate) + '</td><td class="tnum">' + r.ach + ' / ' + r.tgt + '</td></tr>'; }).join('') +
      '</tbody></table></div>';
  };

  // X03 — task template library
  SECTIONS.templates = function () {
    return pageH('Task templates', 'Org-level shared templates — literal, no smart substitution') +
      '<div class="card"><table><thead><tr><th>Title</th><th>Description</th><th>Evidence</th></tr></thead><tbody>' +
        (DB.taskTemplates || []).map(function (tpl) { return '<tr><td style="font-weight:700">' + E(tpl.title) + '</td><td class="muted">' + E(tpl.description) + '</td><td>' + (tpl.evidenceRequired ? '<span class="pill amber"><span class="dot"></span>Required</span>' : '<span class="pill grey"><span class="dot"></span>No</span>') + '</td></tr>'; }).join('') +
      '</tbody></table></div>';
  };

  // =========================================================================
  // ROLE DASHBOARDS (queue-focused work surfaces)
  // =========================================================================
  function queueCard(sec, icon, label, meta, hot) {
    return '<tr class="click" data-nav="' + sec + '"><td style="width:44px"><span class="ract" style="padding:0"><span class="ri ' + (hot ? 'maroon' : 'blue') + '">' + icon + '</span></span></td>' +
      '<td style="font-weight:700">' + label + '</td>' +
      '<td>' + (hot ? '<span class="pill maroon"><span class="dot"></span>' + meta + '</span>' : '<span class="muted">' + meta + '</span>') + '</td>' +
      '<td style="text-align:right;color:var(--ink-faint)">' + I.chevr + '</td></tr>';
  }
  function managerDash() {
    var c = counts();
    return pageH('Manager desk', 'Leads, applications, scheduling and support — everything waiting for you') +
      '<div class="kpis">' +
        kpi('Leads to action', c.leads, 'in pipeline', c.leads > 0) +
        kpi('Applications', c.approvals, 'to decide', c.approvals > 0) +
        kpi('Meetings', c.meetings, 'to confirm', c.meetings > 0) +
        kpi('Consultations', c.consultations, 'to confirm', c.consultations > 0) +
      '</div>' +
      dashCharts('Manager') +
      '<div class="card"><div class="ch">My queues</div><table><tbody>' +
        queueCard('leads', I.doc, 'Leads awaiting my action', c.leads + ' open', c.leads > 0) +
        queueCard('approvals', I.people, 'Partner applications pending', c.approvals + ' pending', c.approvals > 0) +
        queueCard('meetings', I.cal, 'Meetings to confirm', c.meetings + ' requested', c.meetings > 0) +
        queueCard('consultations', I.cal, 'Consultations to confirm', c.consultations + ' requested', c.consultations > 0) +
        queueCard('support', I.inbox, 'Open tickets in my queue', c.tickets + ' open', c.tickets > 0) +
      '</tbody></table></div>' + recentCard();
  }
  function legalDash() {
    var c = counts();
    var docs = (DB.documents || []);
    var partnerVis = docs.filter(function (d) { return d.classification === 'partnerVisible' && d.publishedToPartner; }).length;
    var quarantined = docs.filter(function (d) { return d.scanStatus === 'quarantined'; }).length;
    return pageH('Legal / Compliance desk', 'KYC review, the secure document repository and the access log') +
      '<div class="kpis">' +
        kpi('KYC pending', c.kyc, 'to review', c.kyc > 0) +
        kpi('Documents', docs.filter(function (d) { return d.isCurrent && d.lifecycleStatus === 'active'; }).length, partnerVis + ' partner-visible' + (quarantined ? ' · ' + quarantined + ' quarantined' : ''), quarantined > 0) +
        kpi('Access events', (DB.accessLog || []).length, 'logged', false) +
        kpi('Clients', c.clients, 'in directory', false) +
      '</div>' +
      dashCharts('Legal / Document Controller') +
      '<div class="card"><div class="ch">My queues</div><table><tbody>' +
        queueCard('kyc', I.shield, 'KYC pending review', c.kyc + ' pending', c.kyc > 0) +
        queueCard('documents', I.box, 'Document repository', (DB.documents || []).length + ' documents', false) +
        queueCard('accesslog', I.box, 'Recent access log', (DB.accessLog || []).length + ' events', false) +
      '</tbody></table></div>' +
      '<div class="card"><div class="ch">Recent access log</div>' + accessTable((DB.accessLog || []).slice(0, 5)) + '</div>';
  }

  // ---- Wire verification (F2) --------------------------------------------
  SECTIONS.wires = function () {
    var rows = (DB.wires || []).slice();
    return pageH('Wire verification', (DB.wires || []).filter(function (w) { return w.status === 'pending'; }).length + ' international wire(s) awaiting verification') +
      '<div class="card"><table><thead><tr><th>Reference</th><th>Client</th><th>Project · unit</th><th>Amount</th><th>Receipt</th><th>Status</th><th></th></tr></thead><tbody>' +
        (rows.length ? rows.map(function (w) {
          var can = canFinance();
          return '<tr data-ref="' + E(w.id) + '"><td class="mono">' + E(w.reference) + '</td><td>' + E(w.clientName) + '</td><td>' + E(w.projectName) + ' · ' + E(w.unitNo) + '</td>' +
            '<td class="tnum">' + BDT(w.amountBdt) + ' <span class="muted">(' + E(w.currency) + ')</span></td>' +
            '<td>' + (w.receiptConfirmed ? '<span class="sigbadge">' + I.check + ' confirmed</span>' : '<span class="muted">awaiting</span>') + '</td>' +
            '<td>' + (w.status === 'verified' ? '<span class="pill green"><span class="dot"></span>Verified</span>' : '<span class="pill amber"><span class="dot"></span>Pending</span>') + '</td>' +
            '<td style="text-align:right">' + (w.status === 'pending' && can ? '<button class="btn sm primary" data-act="verify-wire" data-id="' + w.id + '">Verify wire</button>' : '') + '</td></tr>';
        }).join('') : '<tr><td class="empty" colspan="7">No wires pending.</td></tr>') +
      '</tbody></table></div>';
  };

  // ---- Consultations (M5) -------------------------------------------------
  SECTIONS.consultations = function () {
    var rows = (DB.consultations || []).slice();
    var pending = rows.filter(function (m) { return m.status === 'requested'; }).length;
    function cpill(m) {
      return m.status === 'confirmed' ? '<span class="pill green"><span class="dot"></span>Confirmed</span>'
        : m.status === 'scheduled' ? '<span class="pill green"><span class="dot"></span>Scheduled</span>'
        : m.status === 'completed' ? '<span class="pill green"><span class="dot"></span>Done</span>'
        : '<span class="pill amber"><span class="dot"></span>Requested</span>';
    }
    return pageH('Consultation / visit', pending + ' to confirm · includes site visits scheduled from leads') +
      '<div class="card"><table><thead><tr><th>Reference</th><th>Type</th><th>Who</th><th>Topic / place</th><th>When</th><th>Status</th><th></th></tr></thead><tbody>' +
        (rows.length ? rows.map(function (m) {
          var isVisit = m.kind === 'visit';
          var who = isVisit ? (m.prospectName || m.partnerName || '—') : (m.clientName || '—');
          var topic = isVisit ? (m.place || '—') : (m.topic || '—');
          var when = isVisit ? ((m.date || '') + ' ' + (m.time || '') + (m.timezone ? ' (' + m.timezone + ')' : '')).trim() : (m.slot || '—');
          var typeChip = isVisit ? '<span class="pill violet"><span class="dot"></span>Site visit</span>' : '<span class="pill blue"><span class="dot"></span>Consultation</span>';
          var action = isVisit
            ? (m.leadId ? '<span class="linkish" data-nav="lead" data-id="' + E(m.leadId) + '">Open lead ›</span>' : '')
            : (m.status === 'requested' && canOps() ? '<button class="btn sm primary" data-act="confirm-consultation" data-id="' + m.id + '">Confirm + link</button>' : m.link ? '<span class="muted">confirmed</span>' : '');
          return '<tr data-ref="' + E(m.id) + '"><td class="mono">' + E(m.id) + '</td><td>' + typeChip + '</td><td>' + E(who) + '</td><td>' + E(topic) + '</td><td class="muted">' + E(when || '—') + '</td>' +
            '<td>' + cpill(m) + '</td><td style="text-align:right">' + action + '</td></tr>';
        }).join('') : '<tr><td class="empty" colspan="7">No consultations or visits yet.</td></tr>') +
      '</tbody></table></div>';
  };

  // ========================================================================
  // Req 6.7 — Secure Document Repository (admin). Compliance is the substance;
  // the UX stays realtor-clean. Every file is classified, scanned, versioned,
  // audited; the access log is the showpiece.
  // ========================================================================
  var DOC_CLS = { internalOnly: ['grey', 'Internal only'], legalFinanceRestricted: ['maroon', 'Legal / Finance'], partnerVisible: ['blue', 'Partner-visible'], customerLeadRestricted: ['green', 'Customer / Lead'] };
  function clsPill(c) { var x = DOC_CLS[c] || ['grey', c]; return '<span class="pill ' + x[0] + '"><span class="dot"></span>' + x[1] + '</span>'; }
  function scanPill(s) { var m = { uploading: ['grey', 'Uploading'], scanning: ['amber', 'Scanning…'], clean: ['green', 'Clean'], quarantined: ['red', 'Quarantined'], rejected: ['red', 'Rejected'] }, x = m[s] || ['grey', s]; return '<span class="pill ' + x[0] + '"><span class="dot"></span>' + x[1] + '</span>'; }
  function verPill(s) { var m = { uploaded: ['grey', 'Uploaded'], underReview: ['amber', 'Under review'], verified: ['green', 'Verified'], rejected: ['red', 'Rejected'], superseded: ['grey', 'Superseded'] }, x = m[s] || ['grey', s]; return '<span class="pill ' + x[0] + '"><span class="dot"></span>' + x[1] + '</span>'; }
  function docType(code) { return (DB.docTypeRegistry || []).find(function (t) { return t.code === code; }); }
  function docTypeLabel(code) { var t = docType(code); return t ? t.label : code; }
  function docLink(d) { return d.documentableType ? (cap(d.documentableType) + ' · ' + E(d.documentableLabel || d.documentableId)) : '<span class="muted">— unlinked —</span>'; }
  function cap(s) { return String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1); }
  function canUploadType(t) { return staff.role === 'Super Admin' || (t && t.uploaderRoles.indexOf(staff.role) >= 0); }
  // The lineage of a document = its supersede chain, ordered oldest→newest.
  function docLineage(d) {
    var byId = {}; (DB.documents || []).forEach(function (x) { byId[x.id] = x; });
    var chain = [d], cur = d;
    while (cur && cur.supersedesId && byId[cur.supersedesId]) { cur = byId[cur.supersedesId]; chain.unshift(cur); }
    cur = d;
    while (cur && cur.supersededById && byId[cur.supersededById]) { cur = byId[cur.supersededById]; chain.push(cur); }
    return chain;
  }

  var docFilters = { q: '', cls: '', family: '', ver: '', showInactive: false };

  SECTIONS.documents = function () {
    var all = (DB.documents || []).slice();
    // default view: active + current; superseded/archived/deleted behind a toggle
    var rows = all.filter(function (d) {
      if (!docFilters.showInactive && (d.lifecycleStatus !== 'active' || !d.isCurrent)) return false;
      if (docFilters.family && d.family !== docFilters.family) return false;
      if (docFilters.cls && d.classification !== docFilters.cls) return false;
      if (docFilters.ver && d.verificationStatus !== docFilters.ver) return false;
      if (docFilters.q) { var q = docFilters.q.toLowerCase(); if ((d.name + ' ' + (d.documentableLabel || '') + ' ' + docTypeLabel(d.docType)).toLowerCase().indexOf(q) < 0) return false; }
      return true;
    });
    var pendingScan = all.filter(function (d) { return d.scanStatus === 'scanning'; }).length;
    var quarantined = all.filter(function (d) { return d.scanStatus === 'quarantined'; }).length;
    var sel = function (id, opts, cur) { return '<select id="' + id + '" data-act="doc-filter" style="height:30px;border:.5px solid var(--line-strong);border-radius:7px;font-size:12.5px;font-family:inherit;padding:0 8px">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === cur ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'; };

    return pageH('Document repository', all.length + ' document(s) · every file is classified, scanned, audited — the private bucket never serves a permanent URL') +
      (quarantined ? '<div class="banner" style="margin-bottom:14px;background:var(--red-bg);color:var(--red)">' + I.shield + '<div><b>' + quarantined + ' file(s) quarantined</b> by the malware scanner — blocked from all access until cleared.</div></div>' : '') +
      uploadCard() +
      '<div class="card"><div class="ch">Repository' + (pendingScan ? ' <span class="pill amber" style="margin-left:8px"><span class="dot"></span>' + pendingScan + ' scanning</span>' : '') + '<span class="spacer"></span>' +
        '<span class="hstack" style="gap:8px">' +
          '<input id="doc-q" data-act="doc-filter" placeholder="Search…" value="' + E(docFilters.q) + '" style="height:30px;border:.5px solid var(--line-strong);border-radius:7px;font-size:12.5px;font-family:inherit;padding:0 10px;width:150px"/>' +
          sel('doc-f-family', [['', 'All families'], ['legal', 'Legal / project'], ['customer', 'Customer']], docFilters.family) +
          sel('doc-f-cls', [['', 'All classifications'], ['internalOnly', 'Internal only'], ['legalFinanceRestricted', 'Legal / Finance'], ['partnerVisible', 'Partner-visible'], ['customerLeadRestricted', 'Customer / Lead']], docFilters.cls) +
          sel('doc-f-ver', [['', 'Any verification'], ['uploaded', 'Uploaded'], ['underReview', 'Under review'], ['verified', 'Verified'], ['rejected', 'Rejected']], docFilters.ver) +
          '<label class="hstack" style="gap:5px;font-size:12px;color:var(--muted)"><input type="checkbox" id="doc-f-inactive" data-act="doc-filter"' + (docFilters.showInactive ? ' checked' : '') + '/> archived / prior versions</label>' +
        '</span></div>' +
        '<table><thead><tr><th>Document</th><th>Linked to</th><th>Classification</th><th>Verification</th><th>Scan</th><th>Ver.</th><th></th></tr></thead><tbody>' +
        (rows.length ? rows.map(function (d) {
          var t = docType(d.docType);
          var life = d.lifecycleStatus === 'archived' ? ' <span class="pill grey" style="margin-left:4px"><span class="dot"></span>Archived</span>' : d.lifecycleStatus === 'deleted' ? ' <span class="pill red" style="margin-left:4px"><span class="dot"></span>Deleted</span>' : (!d.isCurrent ? ' <span class="pill grey" style="margin-left:4px"><span class="dot"></span>Superseded</span>' : '');
          return '<tr class="click" data-nav="document" data-id="' + d.id + '" data-ref="' + E(d.id) + '">' +
            '<td style="font-weight:700">' + E(d.name) + life + '<div class="muted" style="font-weight:400;font-size:12px">' + E(docTypeLabel(d.docType)) + (t && t.labelBn ? ' · ' + E(t.labelBn) : '') + '</div></td>' +
            '<td>' + docLink(d) + '</td><td>' + clsPill(d.classification) + '</td><td>' + verPill(d.verificationStatus) + '</td><td>' + scanPill(d.scanStatus) + '</td><td class="muted">v' + d.version + '</td>' +
            '<td style="text-align:right"><button class="btn sm" data-nav="document" data-id="' + d.id + '">Open ' + I.chevr + '</button></td></tr>';
        }).join('') : '<tr><td class="empty" colspan="7">No documents match.</td></tr>') +
      '</tbody></table></div>';
  };

  function uploadCard() {
    var types = (DB.docTypeRegistry || []).filter(canUploadType);
    if (!types.length) return '<div class="card"><div class="empty">Your role can’t upload documents. Legal uploads project/legal records; Sales/Ops uploads customer documents.</div></div>';
    var legal = types.filter(function (t) { return t.family === 'legal'; });
    var cust = types.filter(function (t) { return t.family === 'customer'; });
    var typeOpts = (legal.length ? '<optgroup label="Project / legal">' + legal.map(function (t) { return '<option value="' + t.code + '">' + E(t.label) + '</option>'; }).join('') + '</optgroup>' : '') +
      (cust.length ? '<optgroup label="Customer">' + cust.map(function (t) { return '<option value="' + t.code + '">' + E(t.label) + '</option>'; }).join('') + '</optgroup>' : '');
    var linkOpts = '<option value="">— none —</option>' +
      '<optgroup label="Projects">' + DB.projects.map(function (p) { return '<option value="project:' + p.id + '">' + E(p.name) + '</option>'; }).join('') + '</optgroup>' +
      '<optgroup label="Customers">' + DB.clients.map(function (c) { return '<option value="customer:' + c.id + '">' + E(c.name) + '</option>'; }).join('') + '</optgroup>' +
      '<optgroup label="Leads">' + (DB.leads || []).map(function (l) { return '<option value="lead:' + l.id + '">' + E(l.prospectName) + '</option>'; }).join('') + '</optgroup>' +
      '<optgroup label="Bookings">' + (DB.bookings || []).map(function (b) { return '<option value="booking:' + b.id + '">' + E(b.projectName + ' · ' + b.unitNo) + '</option>'; }).join('') + '</optgroup>';
    return '<div class="card"><div class="ch">Upload a document <span class="muted" style="font-weight:400;font-size:12px;margin-left:8px">pick file → type → classification → link → (scan runs) → publish</span></div><div style="padding:16px" class="detail">' +
      '<div><div class="field2"><label class="fl">File name</label><input id="doc-name" placeholder="e.g. Bellissimo — Title Deed (Dolil).pdf"/></div>' +
      '<div class="field2"><label class="fl">Document type</label><select id="doc-type">' + typeOpts + '</select></div>' +
      '<div class="field2"><label class="fl">Link to (documentable)</label><select id="doc-link">' + linkOpts + '</select></div></div>' +
      '<div><div class="field2"><label class="fl">Classification <span class="muted" style="font-weight:400">(defaults from type; override with care)</span></label><select id="doc-cls">' +
        '<option value="">Use type default</option><option value="internalOnly">Internal only</option><option value="legalFinanceRestricted">Legal / Finance restricted</option><option value="partnerVisible">Partner-visible (summary)</option><option value="customerLeadRestricted">Customer / Lead restricted</option></select></div>' +
      '<div class="field2"><label class="fl">Size (KB)</label><input id="doc-size" type="number" value="500"/></div>' +
      '<button class="btn primary" style="margin-top:12px;width:100%" data-act="doc-upload">Upload → private bucket → scan</button>' +
      '<div class="muted" style="font-size:11.5px;margin-top:8px">The file is stored in the private encrypted bucket and stays unreachable until the malware scan clears it. Try a name containing “eicar” to see quarantine.</div></div>' +
    '</div></div>';
  }

  // ---- Document detail — metadata, viewer, versions, access log, controls --
  SECTIONS.document = function (p) {
    var d = (DB.documents || []).find(function (x) { return x.id === (p && p.id); });
    if (!d) return backH('documents', 'Document', '') + '<div class="card"><div class="empty">Document not found.</div></div>';
    var t = docType(d.docType);
    var can = canDocs() || canOps() || canFinance();
    var lineage = docLineage(d);
    var log = (DB.accessLog || []).filter(function (a) { return a.docId === d.id; });
    var openable = d.scanStatus === 'clean' && d.lifecycleStatus !== 'deleted';

    var meta = '<div class="card"><div class="ch">' + E(d.name) + '<span class="spacer"></span>' + clsPill(d.classification) + '</div><div style="padding:16px">' +
      '<div class="kv2"><span class="k">Type</span><span class="v">' + E(docTypeLabel(d.docType)) + (t && t.labelBn ? ' · ' + E(t.labelBn) : '') + ' <span class="muted">(' + E(d.family) + ')</span></span></div>' +
      '<div class="kv2"><span class="k">Linked to</span><span class="v">' + docLink(d) + '</span></div>' +
      '<div class="kv2"><span class="k">Uploaded by</span><span class="v">' + E(d.uploadedBy) + (d.uploadedByRole ? ' · ' + E(roleShort(d.uploadedByRole)) : '') + ' · ' + fmtDate(d.uploadedAt) + '</span></div>' +
      '<div class="kv2"><span class="k">Version</span><span class="v">v' + d.version + (d.isCurrent ? ' <span class="pill green" style="margin-left:6px"><span class="dot"></span>Current</span>' : ' <span class="pill grey" style="margin-left:6px"><span class="dot"></span>Superseded</span>') + '</span></div>' +
      '<div class="kv2"><span class="k">Storage</span><span class="v mono" style="font-size:12px">' + E(d.storageKey) + '</span></div>' +
      '<div class="kv2"><span class="k">Retention until</span><span class="v">' + fmtDate(d.retentionUntil) + '</span></div>' +
      (d.lifecycleStatus === 'deleted' ? '<div class="banner" style="margin-top:12px;background:var(--red-bg);color:var(--red)">' + I.shield + '<div><b>Soft-deleted</b> by ' + E(d.deletedBy) + ' · ' + fmtDate(d.deletedAt) + ' — reason: ' + E(d.deleteReason) + '. The record + audit trail are retained; nothing is hard-deleted.</div></div>' : '') +
      '</div></div>';

    // Viewer — behind a signed, expiring, permission-checked link.
    var viewer = '<div class="card"><div class="ch">Viewer<span class="spacer"></span><span class="sigbadge" title="Every open is recorded"><span style="width:6px;height:6px;border-radius:50%;background:var(--green);display:inline-block"></span> Viewing logged</span></div><div style="padding:16px">' +
      (d.scanStatus !== 'clean' ? '<div class="banner amber">' + I.warn + '<div><b>' + (d.scanStatus === 'quarantined' ? 'Quarantined' : 'Scanning') + '</b>This file is not accessible — only a file that passes the malware scan can be opened, downloaded or linked.</div></div>'
        : '<div class="muted" style="font-size:13px">The file lives in a private encrypted bucket. Opening it requests a time-limited signed link from the server (issued only after the access check passes) and records the view in the audit log.</div>' +
          '<div class="hstack" style="gap:8px;margin-top:12px"><button class="btn primary" data-act="doc-open" data-id="' + d.id + '" data-purpose="view">Open (signed link)</button>' +
          '<button class="btn" data-act="doc-open" data-id="' + d.id + '" data-purpose="download">Download (signed link)</button></div>') +
      '</div></div>';

    // Verification — HUMAN decision, attributed. Never a system determination.
    var verifyBlk = '<div class="card"><div class="ch">Verification &amp; publication status</div><div style="padding:16px">' +
      '<div class="kv2"><span class="k">Status</span><span class="v">' + verPill(d.verificationStatus) + '</span></div>' +
      (d.verifiedBy ? '<div class="kv2"><span class="k">Decision by</span><span class="v">' + E(d.verifiedBy) + ' · ' + E(roleShort(d.verifiedByRole || '')) + ' · ' + fmtDate(d.verifiedAt) + '</span></div>' : '') +
      '<div class="muted" style="font-size:12px;margin-top:8px;padding:10px;background:var(--wash,#faf7f2);border-radius:8px">A “Verified” status means a Salmon legal officer marked it verified. The system <b>records that human decision</b> — it does <b>not</b> validate the deed’s legal authenticity and does <b>not</b> process registration.</div>' +
      (canDocs() && d.isCurrent && d.lifecycleStatus === 'active' ? '<div class="hstack" style="gap:8px;margin-top:12px">' +
        '<button class="btn sm" data-act="doc-verify" data-id="' + d.id + '" data-status="underReview">Mark under review</button>' +
        '<button class="btn sm primary" data-act="doc-verify" data-id="' + d.id + '" data-status="verified">Mark verified</button>' +
        '<button class="btn sm" data-act="doc-verify" data-id="' + d.id + '" data-status="rejected">Reject</button></div>' : '') +
      '</div></div>';

    // Classification + publication controls
    var clsBlk = canDocs() ? '<div class="card"><div class="ch">Access control</div><div style="padding:16px">' +
      '<div class="field2"><label class="fl">Classification</label><select data-act="doc-classify" data-id="' + d.id + '">' +
        ['internalOnly', 'legalFinanceRestricted', 'partnerVisible', 'customerLeadRestricted'].map(function (c) { return '<option value="' + c + '"' + (d.classification === c ? ' selected' : '') + '>' + (DOC_CLS[c][1]) + '</option>'; }).join('') + '</select></div>' +
      (d.classification === 'partnerVisible' ? '<label class="hstack" style="gap:6px;margin-top:12px;font-size:13px"><input type="checkbox" data-act="doc-publish" data-id="' + d.id + '" data-aud="partner"' + (d.publishedToPartner ? ' checked' : '') + '/> Published to partners (legal summary only — never raw sensitive docs)</label>' : '') +
      (d.classification === 'customerLeadRestricted' && !d.customerId && !d.leadId ? '<label class="hstack" style="gap:6px;margin-top:12px;font-size:13px"><input type="checkbox" data-act="doc-publish" data-id="' + d.id + '" data-aud="allClients"' + (d.sharedToAllClients ? ' checked' : '') + '/> Shared to all clients (general collateral)</label>' : '') +
      '<div class="muted" style="font-size:12px;margin-top:10px">Default-deny: an unclassified file is treated as Internal only. A customer sees only their own documents; a partner sees only published summaries.</div>' +
      '</div></div>' : '';

    // Version history — superseded versions retained, not shown as current.
    var versionsBlk = '<div class="card"><div class="ch">Version history</div><table><thead><tr><th>Version</th><th>File</th><th>Uploaded</th><th>Status</th><th></th></tr></thead><tbody>' +
      lineage.map(function (v) {
        return '<tr' + (v.id === d.id ? ' style="background:var(--wash,#faf7f2)"' : '') + '><td>v' + v.version + (v.isCurrent ? ' <span class="pill green"><span class="dot"></span>Current</span>' : '') + '</td><td>' + E(v.name) + '</td><td class="muted">' + fmtDate(v.uploadedAt) + '</td><td>' + verPill(v.verificationStatus) + '</td>' +
          '<td style="text-align:right">' + (v.id === d.id ? '<span class="muted">viewing</span>' : '<button class="btn sm" data-nav="document" data-id="' + v.id + '">Open</button>') + '</td></tr>';
      }).join('') + '</tbody></table>' +
      (canDocs() && d.isCurrent && d.lifecycleStatus === 'active' ? '<div style="padding:12px 16px;border-top:.5px solid var(--line)"><div class="field2"><label class="fl">Upload a new version (supersedes current, old retained)</label><div class="hstack" style="gap:8px"><input id="doc-ver-name" placeholder="' + E(d.name) + '" style="flex:1"/><button class="btn sm primary" data-act="doc-version" data-id="' + d.id + '">Add version</button></div></div></div>' : '') +
      '</div>';

    // Lifecycle — archive / soft-delete / retention. Nothing hard-deleted.
    var lifeBlk = canDocs() ? '<div class="card"><div class="ch">Lifecycle &amp; retention</div><div style="padding:16px">' +
      '<div class="kv2"><span class="k">State</span><span class="v">' + cap(d.lifecycleStatus) + '</span></div>' +
      '<div class="kv2"><span class="k">Retention</span><span class="v">' + (t ? t.retentionYears + ' year(s) · until ' + fmtDate(d.retentionUntil) : fmtDate(d.retentionUntil)) + '</span></div>' +
      '<div class="hstack" style="gap:8px;margin-top:12px">' +
        (d.lifecycleStatus !== 'deleted' ? '<button class="btn sm" data-act="doc-archive" data-id="' + d.id + '" data-archive="' + (d.lifecycleStatus === 'archived' ? 'false' : 'true') + '">' + (d.lifecycleStatus === 'archived' ? 'Restore from archive' : 'Archive') + '</button>' : '') +
        (d.lifecycleStatus !== 'deleted' ? '<button class="btn sm" data-act="doc-delete" data-id="' + d.id + '">Soft-delete</button>' : '<span class="muted">already deleted — record retained</span>') +
      '</div>' +
      '<div class="muted" style="font-size:12px;margin-top:10px">Archive removes it from active view without deletion. Soft-delete retains the record + audit trail. Encrypted backup / restore is a documented procedure (out of prototype scope; the model acknowledges it).</div>' +
      '</div></div>' : '';

    var logBlk = '<div class="card"><div class="ch">Access log — this document (' + log.length + ')</div>' + accessTable(log) + '</div>';

    return backH('documents', d.name, d.id + ' · ' + E(docTypeLabel(d.docType))) +
      '<div class="detail">' + meta + viewer + '</div>' +
      '<div class="detail">' + verifyBlk + clsBlk + '</div>' +
      versionsBlk + lifeBlk + logBlk;
  };

  // ---- Access log — the compliance showpiece ------------------------------
  SECTIONS.accesslog = function () {
    var list = (DB.accessLog || []);
    return pageH('Document access log', 'Every upload, view, download, re-classify, verify and delete is recorded — including viewing. This is what makes the compliance model demonstrable.') +
      '<div class="card">' + accessTable(list) + '</div>';
  };
  function actionPill(a) {
    var m = { view: ['grey', 'View'], download: ['blue', 'Download'], upload: ['green', 'Upload'], reclassify: ['amber', 'Re-classify'], publish: ['blue', 'Publish'], verify: ['green', 'Verify'], version: ['amber', 'New version'], archive: ['grey', 'Archive'], unarchive: ['grey', 'Restore'], delete: ['red', 'Delete'], denied: ['red', 'DENIED'] };
    var x = m[a] || ['grey', a || 'view']; return '<span class="pill ' + x[0] + '"><span class="dot"></span>' + x[1] + '</span>';
  }
  function accessTable(list) {
    return '<table><thead><tr><th>When</th><th>Actor</th><th>Type</th><th>Action</th><th>Document</th><th>Classification</th></tr></thead><tbody>' +
      (list.length ? list.map(function (a) {
        var t = a.actorType === 'partner' ? '<span class="pill blue"><span class="dot"></span>Partner</span>' : a.actorType === 'client' ? '<span class="pill green"><span class="dot"></span>Client</span>' : '<span class="pill grey"><span class="dot"></span>Staff</span>';
        return '<tr data-ref="' + E(a.id) + '"><td class="muted">' + new Date(a.at).toLocaleString('en-GB') + '</td><td style="font-weight:700">' + E(a.actor) + '</td><td>' + t + '</td><td>' + actionPill(a.action) + '</td><td class="mono">' + E(a.docName) + '</td><td>' + (a.classification ? clsPill(a.classification) : '<span class="muted">—</span>') + '</td></tr>';
      }).join('') : '<tr><td class="empty" colspan="6">No access events yet.</td></tr>') +
    '</tbody></table>';
  }

  // ---- access denied (A03) + generic stub --------------------------------
  SECTIONS.denied = function (p) {
    return '<div class="card" style="max-width:560px;margin:40px auto"><div style="padding:40px;text-align:center">' +
      '<div style="width:64px;height:64px;border-radius:50%;background:var(--red-bg);color:var(--red);display:grid;place-items:center;margin:0 auto">' + I.shield + '</div>' +
      '<h1 style="font-size:20px;margin-top:16px">Access denied</h1>' +
      '<div class="desc" style="margin-top:6px">Your role — <b>' + E(staff.role) + '</b> — can’t open <span class="mono">' + E((p && p.attempted) || 'this section') + '</span>. This is real permission enforcement, not a demo prop; the server also returns 403.</div>' +
      '<button class="btn primary" style="margin-top:18px" data-nav="' + landingFor(staff.role) + '">Back to my desk</button>' +
      '</div></div>';
  };
  function stubSection() {
    return pageH('Coming soon', 'This screen isn’t part of the demo flow') +
      '<div class="card"><div class="empty">This module’s route resolves, but the page is intentionally a placeholder — it isn’t visited by any demo flow.</div></div>';
  }

  // ---- partner-side helper pills -----------------------------------------
  function rankChip(r) { return '<span class="pill ' + (r === 'Gold' ? 'amber' : r === 'Platinum' ? 'blue' : r === 'Bronze' ? 'grey' : 'grey') + '"><span class="dot"></span>' + E(r) + '</span>'; }
  function leadPillA(l) {
    var m = { new: ['blue', 'New'], contacted: ['blue', 'Contacted'], meeting_scheduled: ['amber', 'Meeting set'], meeting_done: ['amber', 'Meeting done'], visit_scheduled: ['amber', 'Visit set'], visit_done: ['amber', 'Visit done'], converted: ['green', 'Converted'], rejected: ['red', 'Rejected'] };
    var x = m[l.status] || ['grey', l.status]; return '<span class="pill ' + x[0] + '"><span class="dot"></span>' + x[1] + '</span>';
  }
  function commPill(c) {
    var m = { pending: ['amber', 'Pending'], approved: ['green', 'Approved'], settlement_requested: ['blue', 'Settlement req.'], settled: ['grey', 'Settled'], reversed: ['red', 'Reversed'] };
    var x = m[c.status] || ['grey', c.status]; return '<span class="pill ' + x[0] + '"><span class="dot"></span>' + x[1] + '</span>';
  }
  function settlePillA(s) {
    var m = { requested: ['blue', 'Requested'], approved_awaiting_payment: ['amber', 'Awaiting payment'], settled: ['green', 'Settled'], on_hold: ['amber', 'On hold'], rejected: ['red', 'Rejected'] };
    var x = m[s.status] || ['grey', s.status]; return '<span class="pill ' + x[0] + '"><span class="dot"></span>' + x[1] + '</span>';
  }
  function statusPillA(p) { return p.status === 'completed' ? '<span class="pill grey"><span class="dot"></span>Handed over</span>' : '<span class="pill maroon"><span class="dot"></span>Ongoing</span>'; }
  function terr3(t) {
    var map = { Dhaka: 'DHK', Cumilla: 'CUM', Chattogram: 'CTG', Sylhet: 'SYL', Khulna: 'KHL' };
    return map[t] || String(t || 'XXX').replace(/[^a-z]/gi, '').slice(0, 3).toUpperCase();
  }

  // ---- activity rail ------------------------------------------------------
  // each live-activity notification deep-links to the record that needs action.
  // refId points at the specific entity; go() re-gates by the current role.
  var NOTE_TARGET = {
    'client.created': 'client', 'kyc.pending': 'kyc-view', 'kyc.verified': 'client', 'kyc.rejected': 'client',
    'webhook.received': 'webhook', 'payment.pending': 'webhook',
    'partner.applied': 'application', 'lead.created': 'lead',
    'commission.created': 'commission', 'settlement.requested': 'settlement',
    'investment.enquiry': 'investment-detail', 'meeting.requested': 'meetings',
    'ticket.created': 'ticket', 'ticket.updated': 'ticket',
    'doc.quarantined': 'document', 'doc.clean': 'document', 'doc.denied': 'accesslog',
    'task.completed': 'task', 'task.overdue': 'missed', 'task.assigned': 'taskboard',
    'program.enrol': 'partner', 'program.participation': 'partner'
  };
  function rail() {
    var notes = (DB.notifications.admin || []).slice(0, 30);
    var rows = notes.map(function (n) {
      var isNew = !seenNotes[n.id];
      seenNotes[n.id] = true;
      var IC = {
        'client.created': ['blue', I.people], 'kyc.pending': ['amber', I.shield],
        'webhook.received': ['maroon', I.hook], 'payment.pending': ['amber', I.finance],
        'partner.applied': ['blue', I.badge], 'lead.created': ['blue', I.doc],
        'commission.created': ['maroon', I.cash], 'settlement.requested': ['maroon', I.ledger],
        'investment.enquiry': ['amber', I.scale], 'meeting.requested': ['blue', I.cal],
        'ticket.created': ['amber', I.inbox]
      };
      var icon = IC[n.kind] || ['green', I.check];
      var target = NOTE_TARGET[n.kind];
      var link = (target && canView(target)) ? ' data-nav="' + target + '"' + (n.refId ? ' data-id="' + E(n.refId) + '"' : '') : '';
      return '<div class="ract ' + (isNew ? 'new' : '') + '"' + link + '><span class="ri ' + icon[0] + '">' + icon[1] + '</span>' +
        '<div><div class="rt">' + E(n.title) + '</div><div class="rb">' + E(n.body) + '</div><div class="ra">' + Salmon.timeAgo(n.ts) + '</div></div></div>';
    }).join('');
    return '<div class="rail"><div class="rh"><span class="led"></span>Live activity</div>' +
      '<div class="rlist">' + (rows || '<div class="empty">Waiting for the client to act…</div>') + '</div></div>';
  }

  // ---- small view helpers -------------------------------------------------
  function pageH(title, desc) { return '<div class="page-h"><div><h1>' + E(title) + '</h1><div class="desc">' + E(desc) + '</div></div></div>'; }
  function backH(sec, title, sub) {
    return '<div class="page-h"><div style="display:flex;align-items:center;gap:12px">' +
      '<button class="btn sm" data-nav="' + sec + '">' + I.back + ' Back</button>' +
      '<div><h1 style="font-size:19px">' + E(title) + '</h1><div class="desc mono">' + E(sub || '') + '</div></div></div></div>';
  }
  function kpi(l, v, d, hot) { return '<div class="kpi"><div class="kl">' + E(l) + '</div><div class="kv ' + (hot ? 'hot' : '') + '">' + v + '</div><div class="kd">' + E(d) + '</div></div>'; }
  function kycPill(s) {
    var m = { not_submitted: ['grey', 'Not submitted'], pending: ['amber', 'Pending'], verified: ['green', 'Verified'], rejected: ['red', 'Rejected'] };
    var x = m[s] || m.not_submitted; return '<span class="pill ' + x[0] + '"><span class="dot"></span>' + x[1] + '</span>';
  }
  function bookingPill(b) {
    var m = { confirmed: ['green', 'Confirmed'], awaiting_confirmation: ['amber', 'Awaiting confirm'], pending_payment: ['blue', 'Locked'], expired: ['red', 'Expired'] };
    var x = m[b.status] || ['grey', b.status]; return '<span class="pill ' + x[0] + '"><span class="dot"></span>' + x[1] + '</span>';
  }
  function webhookPill(w) {
    var m = { pending: ['amber', 'Pending'], matched: ['green', 'Matched'], expired: ['red', 'Expired'] };
    var x = m[w.status] || ['grey', w.status]; return '<span class="pill ' + x[0] + '"><span class="dot"></span>' + x[1] + '</span>';
  }
  function instPill(i) {
    var m = { paid: ['green', 'Paid'], pending: ['amber', 'Pending'], due: ['grey', 'Due'] };
    var x = m[i.status] || m.due; return '<span class="pill ' + x[0] + '"><span class="dot"></span>' + x[1] + '</span>';
  }
  function initials(n) { return String(n || '?').split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase(); }
  function tomorrowLocal() { var d = new Date(); d.setDate(d.getDate() + 1); d.setHours(18, 0, 0, 0); var p = function (x) { return String(x).padStart(2, '0'); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()); }

  // ---- actions ------------------------------------------------------------
  root.addEventListener('click', function (e) {
    var navEl = e.target.closest('[data-nav]');
    var actEl = e.target.closest('[data-act]');
    if (actEl) {
      var act = actEl.getAttribute('data-act');
      if (ACTIONS[act]) { ACTIONS[act](actEl, e); return; }
    }
    if (navEl) { go(navEl.getAttribute('data-nav'), { id: navEl.getAttribute('data-id') }); }
  });
  root.addEventListener('change', function (e) {
    var act = e.target.getAttribute('data-act');
    if (act === 'role') {
      Salmon.post('/api/session/staff', { staffId: e.target.value }).then(refresh).then(function () {
        var role = staff.role;
        var back = lastByRole[role];
        go(back && canView(back) ? back : landingFor(role), {}); // land where this desk left off
      });
    }
    if (act === 'ledger-pick') { go('ledger', { id: e.target.value }); }
    if (act === 'inv-status') {
      Salmon.post('/api/projects/inventory', { projectId: e.target.getAttribute('data-id'), unitNo: e.target.getAttribute('data-unit'), status: e.target.value }).then(function (r) {
        Salmon.toast.show('Inventory updated', e.target.getAttribute('data-unit') + ' → ' + r.unit.status + ' · synced to mobile.'); refresh().then(render);
      }).catch(function (err) { Salmon.toast.show('Could not update', (err.data && err.data.error) || '', { warn: true }); });
    }
    if (act === 'doc-classify') {
      Salmon.post('/api/documents/classify', { docId: e.target.getAttribute('data-id'), classification: e.target.value }).then(function (r) {
        Salmon.toast.show('Re-classified', r.document.name + ' → ' + (DOC_CLS[r.document.classification] ? DOC_CLS[r.document.classification][1] : r.document.classification) + '.');
        refresh().then(render);
      }).catch(function (err) { Salmon.toast.show('Could not re-classify', (err.data && err.data.error) || '', { warn: true }); });
    }
    if (act === 'doc-publish') {
      Salmon.post('/api/documents/publish', { docId: e.target.getAttribute('data-id'), audience: e.target.getAttribute('data-aud'), publish: e.target.checked }).then(function (r) {
        Salmon.toast.show(e.target.checked ? 'Published' : 'Withdrawn', r.document.name + '.');
        refresh().then(render);
      }).catch(function (err) { Salmon.toast.show('Could not publish', (err.data && err.data.error) || '', { warn: true }); refresh().then(render); });
    }
    if (act === 'doc-filter') {
      docFilters.q = (document.getElementById('doc-q') || {}).value || '';
      docFilters.family = (document.getElementById('doc-f-family') || {}).value || '';
      docFilters.cls = (document.getElementById('doc-f-cls') || {}).value || '';
      docFilters.ver = (document.getElementById('doc-f-ver') || {}).value || '';
      var inc = document.getElementById('doc-f-inactive'); docFilters.showInactive = inc ? inc.checked : false;
      render();
    }
    if (act === 'tkt-filter') {
      tktFilters.q = (document.getElementById('tkt-q') || {}).value || '';
      tktFilters.source = (document.getElementById('tkt-f-source') || {}).value || '';
      tktFilters.cat = (document.getElementById('tkt-f-cat') || {}).value || '';
      tktFilters.status = (document.getElementById('tkt-f-status') || {}).value || '';
      tktFilters.priority = (document.getElementById('tkt-f-prio') || {}).value || '';
      render();
    }
    if (act === 'tkt-sel') { tktSel[e.target.getAttribute('data-id')] = e.target.checked; render(); }
    if (act === 'tkt-assign') {
      Salmon.post('/api/tickets/assign', { ticketId: e.target.getAttribute('data-id'), assigneeId: e.target.value }).then(function (r) {
        Salmon.toast.show('Assigned', r.ticket.id + ' → ' + (r.ticket.assigneeName || 'unassigned') + '.'); refresh().then(render);
      }).catch(function (err) { Salmon.toast.show('Could not assign', (err.data && err.data.error) || '', { warn: true }); });
    }
    if (act === 'tkt-prio') {
      Salmon.post('/api/tickets/priority', { ticketId: e.target.getAttribute('data-id'), priority: e.target.value }).then(function (r) {
        Salmon.toast.show('Priority set', r.ticket.id + ' → ' + r.ticket.priority + '.'); refresh().then(render);
      }).catch(function (err) { Salmon.toast.show('Could not set', (err.data && err.data.error) || '', { warn: true }); });
    }
    if (act === 'tk-template') {
      var tpl = (DB.taskTemplates || []).find(function (x) { return x.id === e.target.value; });
      if (tpl) {
        var ti = document.getElementById('tk-title'); if (ti) ti.value = tpl.title;
        var de = document.getElementById('tk-desc'); if (de) de.value = tpl.description;
        var ev = document.getElementById('tk-evi'); if (ev) ev.checked = tpl.evidenceRequired;
      }
    }
    if (act === 'tk-scope') {
      var s = e.target.value;
      var single = document.getElementById('tk-single'); var terr = document.getElementById('tk-terr');
      if (single) single.style.display = s === 'single' ? '' : 'none';
      if (terr) terr.style.display = s === 'territory' ? '' : 'none';
      var sum = document.getElementById('tk-summary');
      if (sum) {
        if (s === 'team') sum.textContent = 'This assigns every partner in the Cumilla team a task. Confirm below.';
        else if (s === 'territory') sum.textContent = 'This assigns every partner in the selected territory a task. Confirm below.';
        else sum.textContent = '';
      }
    }
  });

  // upload-from-device: read a file input into { name, url:dataURL } (or null).
  // Files over MAX_EMBED are NOT embedded (they'd exceed the request limit and
  // bloat the demo store) — we keep the name and flag tooBig so the UI can note it.
  var MAX_EMBED = 8 * 1024 * 1024; // 8 MB per file
  function readOne(f) {
    return new Promise(function (res) {
      if (f.size > MAX_EMBED) { res({ name: f.name, url: '', tooBig: true }); return; }
      var r = new FileReader(); r.onload = function () { res({ name: f.name, url: r.result }); }; r.onerror = function () { res(null); }; r.readAsDataURL(f);
    });
  }
  function readFile(id) {
    var el = document.getElementById(id);
    if (!el || !el.files || !el.files.length) return Promise.resolve(null);
    return readOne(el.files[0]);
  }
  function readFiles(id) {
    var el = document.getElementById(id);
    if (!el || !el.files || !el.files.length) return Promise.resolve([]);
    return Promise.all(Array.prototype.map.call(el.files, readOne)).then(function (a) { return a.filter(Boolean); });
  }

  // ---- lightweight modal (rendered outside root so render() never wipes it) --
  var _modalHost = null;
  function modalHost() {
    if (!_modalHost) {
      _modalHost = document.createElement('div');
      _modalHost.id = 'modalHost';
      document.body.appendChild(_modalHost);
      _modalHost.addEventListener('click', function (e) {
        var el = e.target.closest('[data-act]'); if (!el) return;
        var act = el.getAttribute('data-act'); if (ACTIONS[act]) ACTIONS[act](el, e);
      });
    }
    return _modalHost;
  }
  function openModal(title, bodyHtml, submitAct, submitLabel, id) {
    var h = modalHost();
    h.innerHTML = '<div class="mbackdrop" data-act="modal-close"></div>' +
      '<div class="mcard"><div class="mhead"><span>' + E(title) + '</span><button class="miconx" data-act="modal-close" title="Close">✕</button></div>' +
      '<div class="mbody">' + bodyHtml + '</div>' +
      '<div class="mfoot"><button class="btn" data-act="modal-close">Cancel</button><button class="btn primary" data-act="' + submitAct + '" data-id="' + E(id || '') + '">' + E(submitLabel) + '</button></div></div>';
    h.classList.add('on');
  }
  function closeModal() { if (_modalHost) { _modalHost.classList.remove('on'); _modalHost.innerHTML = ''; } }
  var TZs = ['Asia/Dhaka', 'Asia/Dubai', 'Asia/Kolkata', 'Europe/London', 'America/New_York'];
  function tzOptions() { return TZs.map(function (t) { return '<option' + (t === 'Asia/Dhaka' ? ' selected' : '') + '>' + t + '</option>'; }).join(''); }
  function meetingModalBody(l, opts) {
    opts = opts || {};
    return '<div class="detail" style="grid-template-columns:1fr 1fr">' +
        '<div class="field2"><label class="fl">Meet with</label><select id="mm-with">' + DB.staff.map(function (s) { return '<option value="' + E(s.name) + '"' + (opts.withName === s.name ? ' selected' : '') + '>' + E(roleShort(s.role)) + ' — ' + E(s.name) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field2"><label class="fl">Platform</label><select id="mm-platform"><option value="zoom">Zoom</option><option value="meet">Google Meet</option></select></div>' +
      '</div>' +
      '<div class="detail" style="grid-template-columns:1fr 1fr">' +
        '<div class="field2"><label class="fl">Date</label><input id="mm-date" type="date"/></div>' +
        '<div class="field2"><label class="fl">Time</label><input id="mm-time" type="time"/></div>' +
      '</div>' +
      '<div class="field2"><label class="fl">Timezone</label><select id="mm-tz">' + tzOptions() + '</select></div>' +
      '<div class="field2"><label class="fl">Reason</label><input id="mm-reason" value="' + E(opts.reason || 'Introductory meeting') + '" placeholder="e.g. Discuss unit options"/></div>' +
      '<div class="field2"><label class="fl">Client email</label><input id="mm-email" type="email" value="' + E((l && l.email) || '') + '" placeholder="client@example.com"/></div>';
  }
  function visitModalBody(l) {
    return '<div class="detail" style="grid-template-columns:1fr 1fr">' +
        '<div class="field2"><label class="fl">Visit date</label><input id="vm-date" type="date"/></div>' +
        '<div class="field2"><label class="fl">Time</label><input id="vm-time" type="time"/></div>' +
      '</div>' +
      '<div class="field2"><label class="fl">Place / site</label><input id="vm-place" value="' + E((l && l.projectName) || '') + '" placeholder="e.g. project site office"/></div>' +
      '<div class="field2"><label class="fl">Timezone</label><select id="vm-tz">' + tzOptions() + '</select></div>' +
      '<div class="field2"><label class="fl">Notes (optional)</label><input id="vm-notes" placeholder="Anything for the visit"/></div>';
  }
  // record a confirmed investment straight from an interest row (pre-filled)
  function recordModalBody(it, partner) {
    return '<div class="banner" style="background:#fdf8ec;border:1px dashed #d9b877;color:#8a5a2b;margin-bottom:12px"><b>No returns are calculated or disbursed here.</b> Record only the client-approved commercial terms and effective date, after offline documentation + payment verification.</div>' +
      '<div class="kv2"><span class="k">Partner</span><span class="v">' + E(partner.name) + ' · ' + programLabel(partner.program) + '</span></div>' +
      '<div class="kv2"><span class="k">Interest</span><span class="v">' + (it.interestType === 'purchase' ? 'Purchase' : 'Invest') + ' · ' + E(it.projectName) + (it.unitRef ? ' · ' + E(it.unitRef) : '') + '</span></div>' +
      '<div class="detail" style="grid-template-columns:1fr 1fr;margin-top:6px">' +
        '<div class="field2"><label class="fl">Effective date</label><input id="rm-date" type="date"/></div>' +
        '<div class="field2"><label class="fl">Recorded investment (BDT)</label><input id="rm-amount" type="number" placeholder="3000000"/></div>' +
      '</div>' +
      '<div class="field2"><label class="fl">Sales volume (BDT)</label><input id="rm-sales" type="number" placeholder="4200000"/></div>' +
      '<div class="field2"><label class="fl">Client-approved commercial terms</label><input id="rm-terms" placeholder="e.g. 12% p.a. · quarterly · 24-month term (client-signed)"/></div>' +
      '<div class="field2"><label class="fl">Return schedule (label)</label><input id="rm-schedule" placeholder="Client-approved 12% p.a. · quarterly"/></div>';
  }
  // advance button — opens a modal for the meeting/visit steps, plain advance otherwise
  function leadAdvanceBtn(l, next) {
    if (!next) return '';
    if (next === 'meeting_scheduled') return '<button class="btn" style="margin-top:14px;width:100%" data-act="open-meeting-modal" data-id="' + l.id + '">' + I.cal + ' Schedule meeting →</button>';
    if (next === 'visit_scheduled') return '<button class="btn" style="margin-top:14px;width:100%" data-act="open-visit-modal" data-id="' + l.id + '">' + I.cal + ' Schedule visit →</button>';
    if (next === 'converted') return ''; // final step handled by Verify conversion
    return '<button class="btn" style="margin-top:14px;width:100%" data-act="lead-advance" data-id="' + l.id + '" data-to="' + next + '">Advance → “' + next.replace(/_/g, ' ') + '”</button>';
  }

  var ACTIONS = {
    notifs: function () { Salmon.post('/api/notifications/read', { side: 'admin' }).then(refresh).then(render); },
    'modal-close': function () { closeModal(); },
    'open-meeting-modal': function (el) { var l = DB.leads.find(function (x) { return x.id === el.getAttribute('data-id'); }); if (!l) return; openModal('Schedule meeting — ' + l.prospectName, meetingModalBody(l), 'submit-meeting-schedule', 'Create meeting', l.id); },
    'open-visit-modal': function (el) { var l = DB.leads.find(function (x) { return x.id === el.getAttribute('data-id'); }); if (!l) return; openModal('Schedule site visit — ' + l.prospectName, visitModalBody(l), 'submit-visit-schedule', 'Create visit', l.id); },
    'open-record-modal': function (el) {
      var it = (DB.investmentInterests || []).find(function (x) { return x.id === el.getAttribute('data-id'); }); if (!it) return;
      var partner = DB.partners.find(function (p) { return p.id === it.partnerId; }); if (!partner) return;
      openModal('Record confirmed investment — ' + partner.name, recordModalBody(it, partner), 'submit-record-invest', 'Record investment', it.id);
    },
    'submit-record-invest': function (el) {
      var itId = el.getAttribute('data-id');
      var it = (DB.investmentInterests || []).find(function (x) { return x.id === itId; }); if (!it) return;
      var g = function (id) { var e = document.getElementById(id); return e ? e.value : ''; };
      var body = { partnerId: it.partnerId, interestId: itId, projectId: it.projectId, effectiveDate: g('rm-date'), investedBdt: g('rm-amount'), salesVolumeBdt: g('rm-sales'), terms: g('rm-terms'), schedule: g('rm-schedule') };
      if (!body.investedBdt) { Salmon.toast.show('Amount required', 'Enter the recorded investment amount.', { warn: true }); return; }
      Salmon.post('/api/investments/record', body).then(function () { closeModal(); Salmon.toast.show('Investment recorded — ' + it.partnerName, 'Interest marked recorded. Issue returns in the schedule below.'); refresh().then(render); }).catch(function (err) { Salmon.toast.show('Could not record', (err.data && err.data.error) || '', { warn: true }); });
    },
    'submit-meeting-schedule': function (el) {
      var id = el.getAttribute('data-id');
      var body = { leadId: id, withName: val('mm-with'), date: val('mm-date'), time: val('mm-time'), timezone: val('mm-tz'), platform: val('mm-platform'), reason: val('mm-reason'), clientEmail: val('mm-email') };
      if (!body.date || !body.time) { Salmon.toast.show('Date & time required', 'Pick a date and time.', { warn: true }); return; }
      Salmon.post('/api/leads/schedule-meeting', body).then(function (r) { closeModal(); Salmon.toast.show('Meeting scheduled', r.meeting.reason + ' · ' + body.date + ' ' + body.time + '.'); refresh().then(render); }).catch(function (err) { Salmon.toast.show('Could not schedule', (err.data && err.data.error) || '', { warn: true }); });
    },
    'submit-visit-schedule': function (el) {
      var id = el.getAttribute('data-id');
      var body = { leadId: id, date: val('vm-date'), time: val('vm-time'), place: val('vm-place'), timezone: val('vm-tz'), notes: val('vm-notes') };
      if (!body.date || !body.place) { Salmon.toast.show('Date & place required', 'Pick a date and a place.', { warn: true }); return; }
      Salmon.post('/api/leads/schedule-visit', body).then(function (r) { closeModal(); Salmon.toast.show('Site visit scheduled', body.place + ' · ' + body.date + '.'); refresh().then(render); }).catch(function (err) { Salmon.toast.show('Could not schedule', (err.data && err.data.error) || '', { warn: true }); });
    },
    taskview: function (el) { var v = el.getAttribute('data-view'); if (v && v !== taskView) { taskView = v; render(); } },
    dashrange: function (el) { var r = el.getAttribute('data-range'); if (r && r !== dashRange) { dashRange = r; render(); } },
    'create-project': function (btn) {
      var g = function (id) { var e = document.getElementById(id); return e ? e.value : ''; };
      var name = g('np-name');
      if (!name.trim()) { Salmon.toast.show('Title required', 'Give the project a name.', { warn: true }); return; }
      if (btn) { btn.disabled = true; }
      Promise.all([readFile('np-banner-file'), readFiles('np-gallery-file'), readFile('np-brochure-file'), readFile('np-video-file'), readFile('np-floorplan-file')]).then(function (m) {
        var banner = m[0], gallery = m[1], brochure = m[2], video = m[3], floorplan = m[4];
        var tooBig = [banner, brochure, video, floorplan].concat(gallery).filter(function (x) { return x && x.tooBig; }).map(function (x) { return x.name; });
        var body = {
          name: name, category: g('np-category'), status: g('np-status') || 'upcoming',
          location: g('np-location'), summary: g('np-summary'), handover: g('np-handover'),
          amenities: g('np-amenities'), bedrooms: g('np-bed'), bathrooms: g('np-bath'), floors: g('np-floors'),
          areaFromSqft: g('np-areafrom'), areaToSqft: g('np-areato'),
          priceFromBdt: g('np-price'), priceToBdt: g('np-priceto'),
          contactPhone: g('np-contact'), visit: g('np-visit'),
          banner: banner && banner.url ? banner.url : '', gallery: gallery.filter(function (f) { return f.url; }).map(function (f) { return f.url; }),
          brochure: brochure ? brochure.name : '', brochureUrl: brochure && brochure.url ? brochure.url : '',
          video: video && video.url ? video.url : '', tour360: g('np-360'),
          floorPlanImg: floorplan && floorplan.url ? floorplan.url : '', floorPlan: floorplan ? floorplan.name : '',
          published: (document.getElementById('np-publish') || {}).checked !== false
        };
        return Salmon.post('/api/projects', body).then(function (r) {
          Salmon.toast.show('Project created', r.project.name + ' · ' + r.project.category + (r.project.published ? ' — published' : ' — draft') + '.');
          if (tooBig.length) Salmon.toast.show('Some files skipped', tooBig.join(', ') + ' — over 8 MB, not embedded in the demo.', { warn: true });
          refresh().then(render);
        });
      }).catch(function (err) {
        if (btn) btn.disabled = false;
        Salmon.toast.show('Could not create', (err && err.data && err.data.error) || 'Restart the demo server (node server.js) so the new routes load.', { warn: true });
      });
    },
    'add-unit': function (el) {
      var pid = el.getAttribute('data-id');
      var g = function (id) { var e = document.getElementById(id); return e ? e.value : ''; };
      var body = { projectId: pid, unitNo: g('nu-no-' + pid), config: g('nu-cfg-' + pid), areaSqft: g('nu-area-' + pid), priceBdt: g('nu-price-' + pid), status: g('nu-status-' + pid) };
      if (!String(body.unitNo).trim()) { Salmon.toast.show('Unit number required', 'e.g. B-501.', { warn: true }); return; }
      Salmon.post('/api/projects/unit', body).then(function (r) {
        Salmon.toast.show('Unit added', r.unit.unitNo + ' · ' + r.unit.status + ' — synced to mobile.'); refresh().then(render);
      }).catch(function (err) { Salmon.toast.show('Could not add', (err.data && err.data.error) || '', { warn: true }); });
    },
    'dup-unit': function (el) {
      var pid = el.getAttribute('data-id'), src = el.getAttribute('data-unit');
      var proj = (DB.projects || []).find(function (p) { return p.id === pid; }); if (!proj) return;
      var u = (proj.units || []).find(function (x) { return x.unitNo === src; }); if (!u) return;
      // find a free unit number by suffixing -copy, -copy2, …
      var base = u.unitNo, taken = (proj.units || []).map(function (x) { return x.unitNo; });
      var no = base + '-copy', i = 2; while (taken.indexOf(no) >= 0) { no = base + '-copy' + i; i++; }
      Salmon.post('/api/projects/unit', { projectId: pid, unitNo: no, config: u.config, areaSqft: u.areaSqft, priceBdt: u.priceBdt, orientation: u.orientation, status: 'available' }).then(function (r) {
        Salmon.toast.show('Unit duplicated', src + ' → ' + r.unit.unitNo + ' (available).'); refresh().then(render);
      }).catch(function (err) { Salmon.toast.show('Could not duplicate', (err.data && err.data.error) || '', { warn: true }); });
    },
    'toggle-publish': function (el) {
      Salmon.post('/api/projects/publish', { projectId: el.getAttribute('data-id'), published: el.getAttribute('data-pub') === '1' }).then(function (r) {
        Salmon.toast.show(r.project.published ? 'Published' : 'Unpublished', r.project.name + (r.project.published ? ' is now visible to partners & clients.' : ' is hidden from partners & clients.')); refresh().then(render);
      }).catch(function (err) { Salmon.toast.show('Could not update', (err.data && err.data.error) || '', { warn: true }); });
    },
    'kyc-verify': function (el) {
      Salmon.post('/api/kyc/verify', { clientId: el.getAttribute('data-id') }).then(function () {
        var c = DB.clients.find(function (x) { return x.id === el.getAttribute('data-id'); });
        Salmon.toast.show('KYC verified' + (c ? ' — ' + c.name : ''), 'Client notified live on their phone.');
      });
    },
    'confirm-booking': function (el) {
      Salmon.post('/api/bookings/confirm', { bookingId: el.getAttribute('data-id') }).then(function (r) {
        var b = r.booking;
        Salmon.toast.show('Booking ' + b.id + ' confirmed', b.clientName + ' notified — installments generated.');
      }).catch(function (err) { Salmon.toast.show('Could not confirm', (err.data && err.data.error) || '', { warn: true }); });
    },
    'verify-inst': function (el) {
      var cid = el.getAttribute('data-cid'), iid = el.getAttribute('data-id');
      Salmon.post('/api/installments/verify', { clientId: cid, installmentId: iid }).then(function (r) {
        var c = DB.clients.find(function (x) { return x.id === cid; });
        Salmon.toast.show((r.installment.label || 'Installment') + ' verified', 'for ' + (c ? c.name : '') + ' — ' + BDT(r.installment.amountBdt) + '.');
      });
    },

    // ---- partner actions --------------------------------------------------
    'approve-partner': function (el) {
      Salmon.post('/api/partners/approve', {
        applicationId: el.getAttribute('data-id'),
        territory: val('ap-terr'), rank: val('ap-rank'), note: val('ap-note')
      }).then(function (r) {
        Salmon.toast.show('Partner approved — ' + r.partner.id, r.partner.name + ' notified live on their phone.');
      }).catch(function (err) { Salmon.toast.show('Could not approve', (err.data && err.data.error) || '', { warn: true }); });
    },
    'reject-partner': function (el) {
      var reason = val('ap-reason');
      if (!reason) { Salmon.toast.show('Reason required', 'Type a reason — it’s shown verbatim to the applicant.', { warn: true }); return; }
      Salmon.post('/api/partners/reject', { applicationId: el.getAttribute('data-id'), reason: reason }).then(function () {
        Salmon.toast.show('Application rejected', 'Reason delivered to the applicant’s phone.');
      });
    },
    'lead-advance': function (el) {
      Salmon.post('/api/leads/status', { leadId: el.getAttribute('data-id'), status: el.getAttribute('data-to') }).then(function (r) {
        Salmon.toast.show('Lead updated', r.lead.prospectName + ' → ' + r.lead.status.replace(/_/g, ' ') + '.');
      });
    },
    'lead-note': function (el) {
      var note = val('ld-note');
      if (!note) return;
      Salmon.post('/api/leads/status', { leadId: el.getAttribute('data-id'), internalNote: note }).then(function () {
        Salmon.toast.show('Internal note added', 'Private — the partner never sees this.'); refresh().then(render);
      });
    },
    'lead-save-manage': function (el) {
      Salmon.post('/api/leads/status', { leadId: el.getAttribute('data-id'), assignedRep: val('ld-rep'), nextAction: val('ld-next') }).then(function () {
        Salmon.toast.show('Saved', 'Assignment & next action updated (internal).'); refresh().then(render);
      }).catch(function (err) { Salmon.toast.show('Could not save', (err.data && err.data.error) || '', { warn: true }); });
    },
    'lead-followup': function (el) {
      var note = val('ld-followup');
      if (!note) { Salmon.toast.show('Write a note', 'This is shared with the partner.', { warn: true }); return; }
      Salmon.post('/api/leads/status', { leadId: el.getAttribute('data-id'), followUpNote: note }).then(function () {
        Salmon.toast.show('Sent to partner', 'The partner sees this on their lead screen.'); refresh().then(render);
      }).catch(function (err) { Salmon.toast.show('Could not send', (err.data && err.data.error) || '', { warn: true }); });
    },
    'lead-reject': function (el) {
      Salmon.post('/api/leads/status', { leadId: el.getAttribute('data-id'), status: 'rejected' }).then(function () {
        Salmon.toast.show('Lead closed', 'Partner projection shows “Closed”.'); refresh().then(render);
      }).catch(function (err) { Salmon.toast.show('Could not close', (err.data && err.data.error) || '', { warn: true }); });
    },
    'record-invest': function () {
      var g = function (id) { var e = document.getElementById(id); return e ? e.value : ''; };
      var body = { partnerId: g('inv-partner'), effectiveDate: g('inv-date'), investedBdt: g('inv-amount'), salesVolumeBdt: g('inv-sales'), terms: g('inv-terms'), schedule: g('inv-schedule') };
      if (!body.partnerId) { Salmon.toast.show('Pick a partner', 'Choose a With / Both partner.', { warn: true }); return; }
      if (!body.investedBdt) { Salmon.toast.show('Amount required', 'Enter the recorded investment amount.', { warn: true }); return; }
      var pn = (DB.partners.find(function (x) { return x.id === body.partnerId; }) || {}).name || 'partner';
      Salmon.post('/api/investments/record', body).then(function () {
        Salmon.toast.show('Investment recorded — ' + pn, 'Return schedule reset. Add return entries below.'); refresh().then(render);
      }).catch(function (err) { Salmon.toast.show('Could not record', (err.data && err.data.error) || '', { warn: true }); });
    },
    'record-return': function (el) {
      var pid = el.getAttribute('data-id'), g = function (id) { var e = document.getElementById(id); return e ? e.value : ''; };
      var body = { partnerId: pid, period: g('ret-period-' + pid), amountBdt: g('ret-amount-' + pid), status: g('ret-status-' + pid), reason: g('ret-reason-' + pid) };
      if (!body.reason) { Salmon.toast.show('Audit reason required', 'Every return change needs a reason.', { warn: true }); return; }
      Salmon.post('/api/investments/return', body).then(function () {
        Salmon.toast.show('Return recorded', body.status + ' · ' + (body.period || '—') + '.'); refresh().then(render);
      }).catch(function (err) { Salmon.toast.show('Could not record', (err.data && err.data.error) || '', { warn: true }); });
    },
    'verify-conversion': function (el) {
      Salmon.post('/api/leads/verify-conversion', { leadId: el.getAttribute('data-id') }).then(function (r) {
        Salmon.toast.show('Conversion verified', 'Commission ' + r.commission.id + ' pending finance approval.');
      });
    },
    'approve-commission': function (el) {
      var amt = Number(val('cm-amt'));
      if (!amt || amt <= 0) { Salmon.toast.show('Enter an amount', 'Finance enters the commission by hand — verify it against the evidence panel first.', { warn: true }); return; }
      Salmon.post('/api/commissions/approve', { commissionId: el.getAttribute('data-id'), amountBdt: amt, note: val('cm-note'), program: val('cm-program') }).then(function (r) {
        Salmon.toast.show('Commission approved: ' + BDT(r.commission.amountBdt), r.commission.partnerName + '’s balance updated live.');
        go('commissions');
      }).catch(function (err) { Salmon.toast.show('Could not approve', (err.data && err.data.error) || '', { warn: true }); });
    },
    'create-commission-conv': function () {
      Salmon.post('/api/commissions', { mode: 'conversion', leadId: val('cc-lead') }).then(function (r) {
        Salmon.toast.show('Commission created', 'Pending approval — ' + r.commission.prospectName + '.'); go('commission', {}); nav.params.id = r.commission.id; render();
      }).catch(function (err) { Salmon.toast.show('Could not create', (err.data && err.data.error) || '', { warn: true }); });
    },
    'create-commission-special': function () {
      Salmon.post('/api/commissions', { mode: 'special', partnerId: val('cs-partner'), category: val('cs-category'), reason: val('cs-reason') }).then(function (r) {
        Salmon.toast.show('Special commission created', 'Pending approval — ' + r.commission.category + '.'); go('commission', { id: r.commission.id });
      }).catch(function (err) { Salmon.toast.show('Could not create', (err.data && err.data.error) || '', { warn: true }); });
    },
    'correct-commission': function (el) {
      var amt = Number(val('cc-amt')), reason = val('cc-reason');
      if (!reason) { Salmon.toast.show('Reason required', 'Corrections are audited — a reason is mandatory.', { warn: true }); return; }
      Salmon.post('/api/commissions/correct', { commissionId: el.getAttribute('data-id'), amountBdt: amt, reason: reason }).then(function () {
        Salmon.toast.show('Commission corrected', 'Old → new recorded in the audit trail.');
      }).catch(function (err) { Salmon.toast.show('Could not correct', (err.data && err.data.error) || '', { warn: true }); });
    },
    'reverse-commission': function (el) {
      var reason = val('cc-reason');
      if (!reason) { Salmon.toast.show('Reason required', 'Reversals are audited — a reason is mandatory.', { warn: true }); return; }
      Salmon.post('/api/commissions/reverse', { commissionId: el.getAttribute('data-id'), reason: reason }).then(function () {
        Salmon.toast.show('Commission reversed', 'Partner sees the reversal honestly; balance clawed back.');
      }).catch(function (err) { Salmon.toast.show('Could not reverse', (err.data && err.data.error) || '', { warn: true }); });
    },
    'comm-filter': function (el) { commLedgerFilter = el.getAttribute('data-f'); render(); },
    'approve-settlement': function (el) {
      Salmon.post('/api/settlements/approve', { settlementId: el.getAttribute('data-id') }).then(function (r) {
        Salmon.toast.show('Settlement approved', BDT(r.settlement.amountBdt) + ' — awaiting payment. Partner notified.');
      });
    },
    'mark-settled': function (el) {
      Salmon.post('/api/settlements/settle', {
        settlementId: el.getAttribute('data-id'),
        paymentDate: val('st-date'), channel: val('st-channel'), reference: val('st-ref'), evidence: val('st-file')
      }).then(function (r) {
        Salmon.toast.show('Settled ' + BDT(r.settlement.amountBdt), 'Member sees status only — reference stays internal.'); refresh().then(render);
      }).catch(function (err) { Salmon.toast.show('Could not settle', (err.data && err.data.error) || '', { warn: true }); });
    },
    'hold-settlement': function (el) {
      var reason = val('st-reason');
      if (!reason) { Salmon.toast.show('Audit reason required', 'Every hold needs a reason (logged, staff-only).', { warn: true }); return; }
      Salmon.post('/api/settlements/hold', { settlementId: el.getAttribute('data-id'), reason: reason }).then(function () {
        Salmon.toast.show('On hold', 'Member sees “On hold” — the reason stays internal.'); refresh().then(render);
      }).catch(function (err) { Salmon.toast.show('Could not hold', (err.data && err.data.error) || '', { warn: true }); });
    },
    'reject-settlement': function (el) {
      var reason = val('st-reason');
      if (!reason) { Salmon.toast.show('Audit reason required', 'Rejection needs a reason (logged, staff-only).', { warn: true }); return; }
      Salmon.post('/api/settlements/reject', { settlementId: el.getAttribute('data-id'), reason: reason }).then(function () {
        Salmon.toast.show('Rejected', 'Commissions returned to Approved. Member sees status only.'); refresh().then(render);
      }).catch(function (err) { Salmon.toast.show('Could not reject', (err.data && err.data.error) || '', { warn: true }); });
    },
    'confirm-share': function (el) {
      Salmon.post('/api/investment/confirm-share', { enquiryId: el.getAttribute('data-id') }).then(function () {
        Salmon.toast.show('Share recorded', 'Amounts remain [LEGAL SIGN-OFF REQUIRED].');
      });
    },
    'prog-activate': function (el) {
      var prog = el.getAttribute('data-prog');
      Salmon.post('/api/partners/participation', { partnerId: el.getAttribute('data-id'), program: prog, action: 'activate' }).then(function () {
        Salmon.toast.show((prog === 'with' ? 'With Investment' : 'Zero Investment') + ' activated', 'Partner’s app now shows this program active.', { persist: true });
      }).catch(function (err) { Salmon.toast.show('Could not activate', (err.data && err.data.error) || '', { warn: true }); });
    },
    'prog-suspend': function (el) {
      var prog = el.getAttribute('data-prog');
      var reason = val('pp-reason-' + prog);
      if (!reason) { Salmon.toast.show('Reason required', 'It’s shown to the partner as the suspension reason.', { warn: true }); return; }
      Salmon.post('/api/partners/participation', { partnerId: el.getAttribute('data-id'), program: prog, action: 'suspend', reason: reason }).then(function () {
        Salmon.toast.show((prog === 'with' ? 'With Investment' : 'Zero Investment') + ' suspended', 'Retained and reversible. Partner sees the reason.', { persist: true });
      }).catch(function (err) { Salmon.toast.show('Could not suspend', (err.data && err.data.error) || '', { warn: true }); });
    },
    'prog-close': function (el) {
      var prog = el.getAttribute('data-prog');
      var reason = val('pp-reason-' + prog);
      if (!reason) { Salmon.toast.show('Reason required', 'Closing ends participation — the reason is recorded and shown.', { warn: true }); return; }
      Salmon.post('/api/partners/participation', { partnerId: el.getAttribute('data-id'), program: prog, action: 'close', reason: reason }).then(function () {
        Salmon.toast.show((prog === 'with' ? 'With Investment' : 'Zero Investment') + ' closed', 'Terminal but retained in history — nothing deleted.', { persist: true });
      }).catch(function (err) { Salmon.toast.show('Could not close', (err.data && err.data.error) || '', { warn: true }); });
    },
    'confirm-meeting': function (el) {
      Salmon.post('/api/meetings/confirm', { meetingId: el.getAttribute('data-id') }).then(function (r) {
        Salmon.toast.show('Meeting confirmed', r.meeting.partnerName + ' notified with a Zoom link.');
      });
    },
    'ticket-reply': function (el) {
      var body = val('tk-reply');
      if (!body) { Salmon.toast.show('Type a reply first', '', { warn: true }); return; }
      Salmon.post('/api/tickets/reply', { ticketId: el.getAttribute('data-id'), body: body, resolve: !!el.getAttribute('data-resolve') }).then(function (r) {
        Salmon.toast.show(r.ticket.status === 'resolved' ? 'Reply sent + resolved' : 'Reply sent', r.ticket.requesterName + ' notified.'); refresh().then(render);
      }).catch(function (err) { Salmon.toast.show('Could not send', (err.data && err.data.error) || '', { warn: true }); });
    },
    'tkt-status': function (el) {
      Salmon.post('/api/tickets/status', { ticketId: el.getAttribute('data-id'), status: el.getAttribute('data-status') }).then(function (r) {
        Salmon.toast.show('Status: ' + r.ticket.status.replace('_', ' '), r.ticket.requesterName + ' notified.'); refresh().then(render);
      }).catch(function (err) { Salmon.toast.show('Could not update', (err.data && err.data.error) || '', { warn: true }); });
    },
    'tkt-bulk': function (el) {
      var ids = Object.keys(tktSel).filter(function (k) { return tktSel[k]; });
      if (!ids.length) { Salmon.toast.show('Select tickets first', '', { warn: true }); return; }
      var kind = el.getAttribute('data-kind'), body = { ticketIds: ids };
      if (kind === 'assign') { body.assigneeId = val('tkt-bulk-assignee'); }
      else if (kind === 'priority') { var p = val('tkt-bulk-prio'); if (!p) { Salmon.toast.show('Pick a priority', '', { warn: true }); return; } body.priority = p; }
      else if (kind === 'resolve') { body.status = 'resolved'; }
      Salmon.post('/api/tickets/bulk', body).then(function (r) {
        Salmon.toast.show('Bulk updated', r.updated + ' ticket(s).'); tktSel = {}; refresh().then(render);
      }).catch(function (err) { Salmon.toast.show('Could not update', (err.data && err.data.error) || '', { warn: true }); });
    },
    'tkt-clearsel': function () { tktSel = {}; render(); },
    'tkt-channel': function (el) {
      Salmon.post('/api/config/channel', { channel: el.getAttribute('data-channel') }).then(function (r) {
        Salmon.toast.show('Channel set', r.channel === 'whatsapp' ? 'WhatsApp Business API.' : 'Managed in-app chat.'); refresh().then(render);
      }).catch(function (err) { Salmon.toast.show('Could not switch', (err.data && err.data.error) || '', { warn: true }); });
    },
    'publish-update': function (el) {
      var pid = el.getAttribute('data-id');
      Salmon.post('/api/construction/publish', { projectId: pid, stage: val('cu-stage-' + pid), caption: val('cu-cap-' + pid) }).then(function (r) {
        Salmon.toast.show('Update published', r.update.stage + ' — live on client + partner views.');
      });
    },

    // ---- Legal / Finance / Manager completions ---------------------------
    'kyc-reject': function (el) {
      var reason = val('kyc-reason');
      if (!reason) { Salmon.toast.show('Reason required', 'It’s shown verbatim on the client’s phone.', { warn: true }); return; }
      Salmon.post('/api/kyc/reject', { clientId: el.getAttribute('data-id'), reason: reason }).then(function () {
        Salmon.toast.show('KYC rejected', 'Reason delivered verbatim to the client.');
      }).catch(function (err) { Salmon.toast.show('Could not reject', (err.data && err.data.error) || '', { warn: true }); });
    },
    'verify-wire': function (el) {
      Salmon.post('/api/wires/verify', { wireId: el.getAttribute('data-id') }).then(function (r) {
        Salmon.toast.show('Wire verified', r.wire.clientName + ' — booking confirmed on their phone.');
      }).catch(function (err) { Salmon.toast.show('Could not verify', (err.data && err.data.error) || '', { warn: true }); });
    },
    'confirm-consultation': function (el) {
      Salmon.post('/api/consultations/confirm', { consultationId: el.getAttribute('data-id') }).then(function (r) {
        Salmon.toast.show('Consultation confirmed', r.consultation.clientName + ' notified with a link.');
      }).catch(function (err) { Salmon.toast.show('Could not confirm', (err.data && err.data.error) || '', { warn: true }); });
    },
    'generate-invoice': function (el) {
      Salmon.post('/api/invoices/generate', { clientId: el.getAttribute('data-id') }).then(function (r) {
        Salmon.toast.show('Invoice generated', r.invoice.id + ' — appears on the client.');
      }).catch(function (err) { Salmon.toast.show('Could not generate', (err.data && err.data.error) || '', { warn: true }); });
    },
    'doc-upload': function () {
      var link = val('doc-link'); var lt = null, li = null;
      if (link && link.indexOf(':') > 0) { lt = link.split(':')[0]; li = link.split(':')[1]; }
      var body = { name: val('doc-name'), docType: val('doc-type'), classification: val('doc-cls'), sizeKb: Number(val('doc-size')) || 500, documentableType: lt, documentableId: li };
      if (!body.name) { Salmon.toast.show('File name required', '', { warn: true }); return; }
      Salmon.post('/api/documents/upload', body).then(function (r) {
        Salmon.toast.show('Uploaded → scanning', r.document.name + ' is in the private bucket, unreachable until the scan clears.');
        refresh().then(render);
      }).catch(function (err) { Salmon.toast.show('Could not upload', (err.data && err.data.error) || '', { warn: true }); });
    },
    'doc-open': function (el) {
      var purpose = el.getAttribute('data-purpose') || 'view';
      Salmon.post('/api/documents/access', { as: 'staff', docId: el.getAttribute('data-id'), purpose: purpose }).then(function (r) {
        Salmon.toast.show('Signed link issued', 'Opens for ' + r.ttlSec + 's · this ' + purpose + ' was logged.');
        try { window.open(r.url, '_blank'); } catch (e) {}
        refresh().then(render);
      }).catch(function (err) { Salmon.toast.show('Access denied', (err.data && err.data.error) || '', { warn: true }); });
    },
    'doc-verify': function (el) {
      Salmon.post('/api/documents/verify', { docId: el.getAttribute('data-id'), status: el.getAttribute('data-status') }).then(function (r) {
        Salmon.toast.show('Recorded — human decision', r.document.name + ' marked ' + r.document.verificationStatus + ' by ' + r.document.verifiedBy + '.');
        refresh().then(render);
      }).catch(function (err) { Salmon.toast.show('Could not update', (err.data && err.data.error) || '', { warn: true }); });
    },
    'doc-version': function (el) {
      var name = val('doc-ver-name');
      Salmon.post('/api/documents/version', { docId: el.getAttribute('data-id'), name: name || undefined }).then(function (r) {
        Salmon.toast.show('New version', 'v' + r.document.version + ' supersedes the previous — prior version retained.');
        go('document', { id: r.document.id });
      }).catch(function (err) { Salmon.toast.show('Could not version', (err.data && err.data.error) || '', { warn: true }); });
    },
    'doc-archive': function (el) {
      Salmon.post('/api/documents/archive', { docId: el.getAttribute('data-id'), archive: el.getAttribute('data-archive') === 'true' }).then(function (r) {
        Salmon.toast.show(r.document.lifecycleStatus === 'archived' ? 'Archived' : 'Restored', r.document.name + '.');
        refresh().then(render);
      }).catch(function (err) { Salmon.toast.show('Could not archive', (err.data && err.data.error) || '', { warn: true }); });
    },
    'doc-delete': function (el) {
      var reason = window.prompt('Soft-delete reason (the record + audit trail are retained — nothing is hard-deleted):', '');
      if (reason === null) return;
      Salmon.post('/api/documents/delete', { docId: el.getAttribute('data-id'), reason: reason || 'No reason given' }).then(function (r) {
        Salmon.toast.show('Soft-deleted', r.document.name + ' — trail retained.');
        refresh().then(render);
      }).catch(function (err) { Salmon.toast.show('Could not delete', (err.data && err.data.error) || '', { warn: true }); });
    },

    // ---- tasks & targets --------------------------------------------------
    'assign-task': function () {
      var scope = val('tk-scope');
      var due = val('tk-due'); due = due ? new Date(due).toISOString() : null;
      var body = { title: val('tk-title'), description: val('tk-desc'), dueDate: due, evidenceRequired: document.getElementById('tk-evi').checked };
      if (scope === 'single') { body.assigneePartnerId = val('tk-partner'); }
      else if (scope === 'team') { body.assigneeIds = DB.partners.filter(function (p) { return p.territory === 'Cumilla'; }).map(function (p) { return p.id; }); }
      else { var terr = val('tk-territory'); body.assigneeIds = DB.partners.filter(function (p) { return p.territory === terr; }).map(function (p) { return p.id; }); }
      if (!body.title) { Salmon.toast.show('Title required', '', { warn: true }); return; }
      Salmon.post('/api/tasks', body).then(function (r) {
        Salmon.toast.show('Task assigned', r.tasks.length > 1 ? (r.tasks.length + ' partners notified live') : (r.tasks[0].assigneePartnerName + ' notified on their phone'));
        go('taskboard');
      }).catch(function (err) { Salmon.toast.show('Could not assign', (err.data && err.data.error) || '', { warn: true }); });
    },
    'cancel-task': function (el) {
      Salmon.post('/api/tasks/cancel', { taskId: el.getAttribute('data-id') }).then(function (r) {
        Salmon.toast.show('Task cancelled', r.task.assigneePartnerName + ' notified.');
      }).catch(function (err) { Salmon.toast.show('Could not cancel', (err.data && err.data.error) || '', { warn: true }); });
    },
    'set-target': function (el) {
      var id = el.getAttribute('data-id');
      Salmon.post('/api/targets', { targetId: id, targetValue: Number(val('tv-' + id)) }).then(function (r) {
        Salmon.toast.show('Target updated', 'Partner’s dashboard recomputes live.');
      }).catch(function (err) { Salmon.toast.show('Could not set target', (err.data && err.data.error) || '', { warn: true }); });
    }
  };

  function val(id) { var el = document.getElementById(id); return el ? String(el.value || '').trim() : ''; }
})();
