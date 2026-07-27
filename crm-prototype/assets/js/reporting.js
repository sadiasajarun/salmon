/* ============================================================================
 * Salmon CRM — Reporting engine (Req 6.17)
 * ----------------------------------------------------------------------------
 * The reporting DATA layer, kept separate from the Part-7 Connect screens so the
 * viewer (Q02) and the metrics board (Q04) share ONE source of truth. Two ideas
 * carry the module:
 *
 *   1. reportData(key, {role, filters}) computes each report from the LIVE data
 *      sets (Pipeline / People / Payout / Finance / Catalogue / Connect), then
 *      applies role SCOPE + the filter set. Same screen, different truth per
 *      role — a Manager sees only their division, Super Admin sees the org.
 *   2. metricsFor(role) returns the ~16 summary metrics GROUPED by domain
 *      (People / Catalogue / Sales / Money / Activity), role-scoped.
 *
 * scopeFor(role) is a deliberate placeholder for the team-lead/manager boundary
 * (OPEN_QUESTIONS 6.17 #3) — a Manager is scoped to one division here; Salmon
 * confirms the real rule. Sensitive money/identifier reports stay non-exportable
 * (Req 6.17.4) regardless of role.
 * ==========================================================================*/
(function (root) {
  'use strict';

  function P(){ return root.CRM && root.CRM.Pipeline; }
  function PE(){ return root.CRM && root.CRM.People; }
  function PY(){ return root.CRM && root.CRM.Payout; }
  function FI(){ return root.CRM && root.CRM.Finance; }
  function CA(){ return root.CRM && root.CRM.Catalogue; }
  function CN(){ return root.CRM && root.CRM.Connect; }

  /* ---- territory helpers (strings use ' › '; partners carry territoryPath) --- */
  function divOf(str){ return String(str || '').split('›')[0].trim(); }
  function distOf(str){ var p = String(str || '').split('›'); return (p[0] || '').trim() + (p[1] ? ' › ' + p[1].trim() : ''); }
  function partnerDiv(pid){ var pe = PE(); if (!pe) return ''; var p = pe.partnerById && pe.partnerById(pid); return p && p.territoryPath ? p.territoryPath[0] : ''; }

  /* ---------------------------------------------------------------------------
   * SCOPE — the heart of clause 6.17.5. A Manager owns one division; Super Admin
   * and Finance see the org. (Team-lead is a mobile concept — no panel role yet;
   * the exact reporting boundary is OPEN_QUESTIONS 6.17 #3.)
   * ------------------------------------------------------------------------- */
  var MANAGER_DIVISION = 'Chattogram';   // placeholder assignment — OQ #3
  function scopeFor(role){
    if (role === 'MANAGER') return { all: false, division: MANAGER_DIVISION, label: MANAGER_DIVISION + ' division (your patch)' };
    if (role === 'FINANCE') return { all: true, label: 'Organisation-wide · finance view' };
    return { all: true, label: 'Organisation-wide' };
  }
  function inScope(scope, territoryStr){ return scope.all || divOf(territoryStr) === scope.division; }

  /* ---- generic filter predicate over a normalized record -------------------
   * rec may carry: territory, project, program, status, rank, team, teamLead
   * filters may carry: from,to (unused on aggregates), project, inventoryStatus,
   * program, territory, team, teamLead, rank, status
   * ------------------------------------------------------------------------- */
  function passFilters(rec, f){
    if (!f) return true;
    if (f.project && rec.project && rec.project !== f.project) return false;
    if (f.program && rec.program && rec.program !== f.program) return false;
    if (f.territory && rec.territory && rec.territory.indexOf(f.territory) < 0) return false;
    if (f.team && rec.team && rec.team !== f.team) return false;
    if (f.rank && rec.rank && rec.rank !== f.rank) return false;
    if (f.status && rec.status && rec.status !== f.status) return false;
    if (f.teamLead && rec.teamLead != null && String(rec.teamLead) !== f.teamLead) return false;
    return true;
  }

  /* =========================================================================
   * REPORT COMPUTERS — each returns { columns, rows, chart, note? }
   * chart: { type:'bar'|'funnel'|'line'|'donut', label, series:[[name,val],...] }
   * ========================================================================= */

  function rptLeadConversion(scope, f){
    var leads = (P() && P().allLeads && P().allLeads()) || [];
    var byTerr = {};
    leads.forEach(function(l){
      if (!inScope(scope, l.territory)) return;
      var rec = { territory: l.territory, project: l.project, status: l.status };
      if (!passFilters(rec, f)) return;
      var k = distOf(l.territory);
      var g = byTerr[k] || (byTerr[k] = { sub: 0, cont: 0, conv: 0 });
      g.sub++;
      if (l.status !== 'new') g.cont++;
      if (l.status === 'converted') g.conv++;
    });
    var rows = Object.keys(byTerr).map(function(k){ var g = byTerr[k]; return [k, g.sub, g.cont, g.conv, (g.sub ? Math.round(g.conv / g.sub * 100) : 0) + '%']; });
    rows.sort(function(a, b){ return b[1] - a[1]; });
    var totals = rows.reduce(function(t, r){ t.sub += r[1]; t.cont += r[2]; t.conv += r[3]; return t; }, { sub: 0, cont: 0, conv: 0 });
    return {
      columns: ['Territory', 'Submitted', 'Contacted', 'Converted', 'Rate'], rows: rows,
      chart: { type: 'funnel', label: 'Conversion funnel (in scope)', series: [['Submitted', totals.sub], ['Contacted', totals.cont], ['Converted', totals.conv]] }
    };
  }

  function rptInventory(scope, f){
    var cat = CA(); var projects = (cat && cat.allProjects && cat.allProjects()) || [];
    var rows = [], tot = { available: 0, reserved: 0, booked: 0, sold: 0 };
    projects.forEach(function(p){
      if (p.status !== 'published') return;
      if (f && f.project && p.name !== f.project) return;
      var c = cat.unitCounts(p);
      rows.push([p.name, c.available, c.reserved, c.booked, c.sold]);
      tot.available += c.available; tot.reserved += c.reserved; tot.booked += c.booked; tot.sold += c.sold;
    });
    return {
      columns: ['Project', 'Available', 'Reserved', 'Booked', 'Sold'], rows: rows,
      chart: { type: 'donut', label: 'Inventory mix (all projects in view)', series: [['Available', tot.available], ['Reserved', tot.reserved], ['Booked', tot.booked], ['Sold', tot.sold]] },
      note: scope.all ? null : 'Inventory is an org-wide resource — shown in full even in a division scope.'
    };
  }

  function rptTerritoryActivity(scope, f){
    var pe = PE(); var partners = (pe && pe.allPartners && pe.allPartners()) || [];
    var leads = (P() && P().allLeads && P().allLeads()) || [];
    var byTerr = {};
    partners.forEach(function(p){
      var terr = (p.territoryPath || []).join(' › ');
      if (!inScope(scope, terr)) return;
      var rec = { territory: terr, program: (p.programs || [])[0], rank: p.rank, team: p.team, teamLead: p.teamLead };
      if (!passFilters(rec, f)) return;
      var k = distOf(terr); (byTerr[k] || (byTerr[k] = { partners: 0, leads: 0, sales: 0 })).partners++;
    });
    leads.forEach(function(l){ if (!inScope(scope, l.territory)) return; var k = distOf(l.territory); if (byTerr[k]) { byTerr[k].leads++; if (l.status === 'converted') byTerr[k].sales++; } });
    var rows = Object.keys(byTerr).map(function(k){ var g = byTerr[k]; return [k, g.partners, g.leads, g.sales]; });
    rows.sort(function(a, b){ return b[1] - a[1]; });
    return { columns: ['Territory', 'Partners', 'Leads', 'Converted'], rows: rows,
      chart: { type: 'bar', label: 'Partners by territory', series: rows.map(function(r){ return [r[0].split('›').pop().trim(), r[1]]; }) } };
  }

  function rptMeetingOutcomes(scope, f){
    var meets = ((P() && P().allMeetings && P().allMeetings()) || []).concat((P() && P().allSiteVisits && P().allSiteVisits()) || []);
    var by = {};
    meets.forEach(function(m){
      if (f && f.project && m.project !== f.project) return;
      var st = m.status || 'pending';
      var label = { pending: 'Awaiting', confirmed: 'Confirmed', held: 'Held', 'no-show': 'No-show', converted: 'Converted', declined: 'Declined' }[st] || st;
      by[label] = (by[label] || 0) + 1;
    });
    var rows = Object.keys(by).map(function(k){ return [k, by[k]]; });
    return { columns: ['Outcome', 'Count'], rows: rows, chart: { type: 'donut', label: 'Meeting & visit outcomes', series: rows } };
  }

  function rptTaskCompletion(scope, f){
    // No panel-side task store (tasks live in the partner app). Curated by team,
    // scoped by the team's division. Flagged — OPEN_QUESTIONS 6.17 #1/#3.
    var pe = PE(); var teams = (pe && pe.teams) || [];
    var seed = { 'TM-CUM-01': [40, 34], 'TM-CUM-02': [26, 17], 'TM-SAV-01': [38, 36], 'TM-SYL-01': [22, 14], 'TM-CHAND-01': [15, 9] };
    var rows = [];
    teams.forEach(function(t){
      if (!inScope(scope, t.territory)) return;
      if (f && f.team && t.id !== f.team) return;
      var s = seed[t.id] || [0, 0];
      rows.push([t.name, s[0], s[1], (s[0] ? Math.round(s[1] / s[0] * 100) : 0) + '%']);
    });
    return { columns: ['Team', 'Assigned', 'Completed', 'Rate'], rows: rows,
      chart: { type: 'bar', label: 'Completion rate %', series: rows.map(function(r){ return [r[0].split(' ')[0], parseInt(r[3], 10)]; }) },
      note: 'Task figures are placeholders — panel has no task store yet (OQ #1).' };
  }

  function rptDocumentActivity(scope, f){
    var cn = CN(); var docs = (cn && cn.allDocuments && cn.allDocuments()) || [];
    var by = {};
    docs.forEach(function(d){
      var g = by[d.category] || (by[d.category] = { views: 0, downloads: 0 });
      (d.access || []).forEach(function(a){ if (a.kind === 'download') g.downloads++; else g.views++; });
    });
    var rows = Object.keys(by).map(function(k){ return [k, by[k].views, by[k].downloads]; });
    return { columns: ['Category', 'Views', 'Downloads'], rows: rows,
      chart: { type: 'bar', label: 'Views by category', series: rows.map(function(r){ return [r[0], r[1]]; }) } };
  }

  function rptHelpdesk(scope, f){
    var cn = CN(); var tk = (cn && cn.allTickets && cn.allTickets()) || [];
    var by = {};
    tk.forEach(function(t){
      var g = by[t.category] || (by[t.category] = { open: 0, resolved: 0 });
      if (t.status === 'closed') g.resolved++; else g.open++;
    });
    var rows = Object.keys(by).map(function(k){ return [k, by[k].open, by[k].resolved]; });
    return { columns: ['Category', 'Open', 'Resolved'], rows: rows,
      chart: { type: 'bar', label: 'Open tickets by category', series: rows.map(function(r){ return [r[0], r[1]]; }) } };
  }

  function rptCommission(scope, f){
    var py = PY(); var comms = (py && py.allCommissions && py.allCommissions()) || [];
    var by = {};
    comms.forEach(function(c){
      var terr = partnerDiv(c.partnerId);
      if (!scope.all && terr !== scope.division) return;
      var rec = { program: c.program, project: c.project, status: c.status };
      if (!passFilters(rec, f)) return;
      var g = by[c.partner] || (by[c.partner] = { approved: 0, settled: 0 });
      if (c.status === 'approved') g.approved += (c.amountBdt || 0);
      if (c.status === 'settled') g.settled += (c.amountBdt || 0);
    });
    var money = root.C && root.C.fmt ? root.C.fmt.bdt : function(n){ return '৳' + n; };
    var rows = Object.keys(by).map(function(k){ var g = by[k]; return [k, money(g.approved), g.settled ? money(g.settled) : '—', g.approved]; });
    rows.sort(function(a, b){ return b[3] - a[3]; });
    var chart = { type: 'bar', label: 'Approved commission (৳000s)', series: rows.map(function(r){ return [r[0].split(' ')[0], Math.round(r[3] / 1000)]; }) };
    rows.forEach(function(r){ r.pop(); }); // drop the numeric helper column
    return { columns: ['Partner', 'Approved', 'Settled'], rows: rows, chart: chart };
  }

  function rptSalesRecords(scope, f){
    var fi = FI(); var bookings = (fi && fi.allBookings && fi.allBookings()) || [];
    var money = root.C && root.C.fmt ? root.C.fmt.bdt : function(n){ return '৳' + n; };
    var byProject = {};
    var rows = bookings.filter(function(b){ return !f || !f.project || b.project === f.project; }).map(function(b){
      byProject[b.project] = (byProject[b.project] || 0) + 1;
      return [b.id, b.client, b.project, money(b.totalBdt)];
    });
    return { columns: ['Booking', 'Client', 'Project', 'Amount'], rows: rows,
      chart: { type: 'bar', label: 'Bookings by project', series: Object.keys(byProject).map(function(k){ return [k.replace('Salmon ', ''), byProject[k]]; }) } };
  }

  function rptSettlementRecon(scope, f){
    var py = PY(); var stl = (py && py.allSettlements && py.allSettlements()) || [];
    var money = root.C && root.C.fmt ? root.C.fmt.bdt : function(n){ return '৳' + n; };
    var rows = stl.filter(function(s){
      if (s.status !== 'settled') return false;
      if (!scope.all && partnerDiv(s.partnerId) !== scope.division) return false;
      return true;
    }).map(function(s){ return [s.id, s.partner, money(s.amountBdt), s.reference || '—']; });
    return { columns: ['Settlement', 'Partner', 'Amount', 'Reference'], rows: rows, chart: null,
      note: 'Settled reconciliation carries payment references — view-only, never exported.' };
  }

  function rptInvestmentReturn(){
    return { columns: ['Note'], rows: [['Amber-locked — return amounts require legal sign-off (Req 6.6). No rate or projection is shown here.']], chart: null,
      note: 'Investment-return figures render [AMOUNT — LEGAL SIGN-OFF REQUIRED] (OQ #5).' };
  }

  var COMPUTERS = {
    'lead-conversion': rptLeadConversion, 'inventory': rptInventory, 'territory-activity': rptTerritoryActivity,
    'meeting-outcomes': rptMeetingOutcomes, 'task-completion': rptTaskCompletion, 'document-activity': rptDocumentActivity,
    'helpdesk': rptHelpdesk, 'commission': rptCommission, 'sales-records': rptSalesRecords,
    'settlement-recon': rptSettlementRecon, 'investment-return': rptInvestmentReturn
  };

  function reportData(key, ctx){
    ctx = ctx || {};
    var scope = scopeFor(ctx.role || 'SUPER_ADMIN');
    var fn = COMPUTERS[key];
    var out = fn ? fn(scope, ctx.filters || {}) : { columns: ['—'], rows: [], chart: null };
    out.scopeLabel = scope.label;
    return out;
  }

  /* =========================================================================
   * METRICS OVERVIEW (Req 6.17.1) — grouped, role-scoped.
   * Each group → [{label, value, delta?, deltaDir?}]. Deltas are shown only where
   * a period figure is derivable; the vs-previous-period basis is OQ #4.
   * ========================================================================= */
  function metricsFor(role){
    var scope = scopeFor(role);
    var pe = PE(), py = PY(), fi = FI(), ca = CA(), p = P(), cn = CN();
    var partners = ((pe && pe.allPartners && pe.allPartners()) || []).filter(function(x){ return inScope(scope, (x.territoryPath || []).join(' › ')); });
    var teams = ((pe && pe.teams) || []).filter(function(t){ return inScope(scope, t.territory); });
    var territories = {}; partners.forEach(function(x){ territories[distOf((x.territoryPath || []).join(' › '))] = 1; });
    var ranks = {}; partners.forEach(function(x){ ranks[x.rank] = (ranks[x.rank] || 0) + 1; });
    var projects = ((ca && ca.allProjects && ca.allProjects()) || []).filter(function(x){ return x.status === 'published'; });
    var inv = { available: 0, reserved: 0, booked: 0, sold: 0 };
    projects.forEach(function(pr){ var c = ca.unitCounts(pr); inv.available += c.available; inv.reserved += c.reserved; inv.booked += c.booked; inv.sold += c.sold; });
    var leads = ((p && p.allLeads && p.allLeads()) || []).filter(function(l){ return inScope(scope, l.territory); });
    var converted = leads.filter(function(l){ return l.status === 'converted'; }).length;
    var bookings = (fi && fi.allBookings && fi.allBookings()) || [];
    var comms = ((py && py.allCommissions && py.allCommissions()) || []).filter(function(c){ return scope.all || partnerDiv(c.partnerId) === scope.division; });
    var approvedComm = comms.filter(function(c){ return c.status === 'approved'; }).reduce(function(n, c){ return n + (c.amountBdt || 0); }, 0);
    var settlements = ((py && py.allSettlements && py.allSettlements()) || []).filter(function(s){ return scope.all || partnerDiv(s.partnerId) === scope.division; });
    var pendingStl = settlements.filter(function(s){ return s.status === 'submitted' || s.status === 'held'; });
    var meetings = ((p && p.allMeetings && p.allMeetings()) || []).length + ((p && p.allSiteVisits && p.allSiteVisits()) || []).length;
    var tickets = ((cn && cn.allTickets && cn.allTickets()) || []);
    var money = root.C && root.C.fmt ? root.C.fmt.bdt : function(n){ return '৳' + n; };

    return {
      scopeLabel: scope.label,
      groups: [
        { title: 'People', metrics: [
          { label: 'Partners', value: partners.length },
          { label: 'Teams', value: teams.length },
          { label: 'Territories', value: Object.keys(territories).length },
          { label: 'Ranks in use', value: Object.keys(ranks).length, sub: Object.keys(ranks).sort().join(' · ') }
        ] },
        { title: 'Catalogue', metrics: [
          { label: 'Published projects', value: projects.length },
          { label: 'Available units', value: inv.available, deltaDir: 'flat' },
          { label: 'Reserved', value: inv.reserved },
          { label: 'Booked · Sold', value: inv.booked + ' · ' + inv.sold }
        ] },
        { title: 'Sales', metrics: [
          { label: 'Open leads', value: leads.filter(function(l){ return l.status !== 'converted' && l.status !== 'rejected'; }).length },
          { label: 'Bookings', value: bookings.length },
          { label: 'Converted sales', value: converted }
        ] },
        { title: 'Money', metrics: [
          { label: 'Payment records', value: bookings.length },
          { label: 'Approved commission', value: money(approvedComm) },
          { label: 'Investment returns', value: '🔒 legal', sub: 'record-only (Req 6.6)' },
          { label: 'Pending settlements', value: pendingStl.length, sub: money(pendingStl.reduce(function(n, s){ return n + s.amountBdt; }, 0)) }
        ] },
        { title: 'Activity', metrics: [
          { label: 'Meetings & visits', value: meetings },
          { label: 'Open support tickets', value: tickets.filter(function(t){ return t.status !== 'closed'; }).length },
          { label: 'Tasks', value: '—', sub: 'no panel store (OQ #1)' },
          { label: 'Training activity', value: '—', sub: 'partner-app (OQ #1)' }
        ] }
      ]
    };
  }

  /* the filter option lists the viewer offers (clause 6.17.2) */
  function filterOptions(){
    var pe = PE(), ca = CA();
    var projects = ((ca && ca.allProjects && ca.allProjects()) || []).map(function(p){ return p.name; });
    var territories = {}; var teams = {}; var ranks = {};
    ((pe && pe.allPartners && pe.allPartners()) || []).forEach(function(p){ territories[distOf((p.territoryPath || []).join(' › '))] = 1; if (p.team) teams[p.team] = 1; ranks[p.rank] = 1; });
    return {
      project: projects,
      inventoryStatus: ['available', 'reserved', 'booked', 'sold'],
      program: ['Zero Investment', 'With Investment'],
      territory: Object.keys(territories),
      team: Object.keys(teams),
      teamLead: ['true', 'false'],
      rank: Object.keys(ranks).sort(),
      status: ['new', 'contacted', 'qualified', 'meetingScheduled', 'visitCompleted', 'negotiation', 'converted', 'rejected']
    };
  }

  root.CRM = root.CRM || {};
  root.CRM.Reporting = {
    scopeFor: scopeFor, reportData: reportData, metricsFor: metricsFor, filterOptions: filterOptions,
    MANAGER_DIVISION: MANAGER_DIVISION
  };
})(window);
