/* ============================================================================
 * Salmon CRM — the four role dashboards. Same URL (#/dashboard), completely
 * different WORK QUEUES. Three-tier hierarchy: queue → metrics → ambient.
 * Every consequential action = ConfirmDialog + requirePermission + audit + toast.
 * ==========================================================================*/
(function (root) {
  'use strict';
  var C = root.C, Perm = root.Perm, Audit = root.Audit, CRM = root.CRM, Router = root.Router;
  var f = C.fmt;

  var TITLES = { SUPER_ADMIN: 'Organisation overview', MANAGER: 'My work queue', FINANCE: 'Finance queue', LEGAL: 'Review queue' };

  /* consequential-action flow: confirm → server guard → audit → toast → done */
  function runAction(o) {
    return C.confirmDialog(o.confirm).then(function (ok) {
      if (!ok) return;
      try { Perm.requirePermission(o.role, o.perm); }
      catch (e) { C.toast({ type: 'error', title: 'Not permitted', text: Perm.ROLE_LABEL[o.role] + ' cannot perform this action.' }); return; }
      Audit.audit({ actor: o.staff, action: o.perm, target: o.target });
      C.toast(o.toast);
      o.done && o.done();
    });
  }

  /* ---- generic states ---- */
  function skeleton() {
    var m = '<div class="sk" style="height:26px;width:240px;margin-bottom:16px"></div><div class="sk" style="height:38px;margin-bottom:12px"></div>';
    m += '<div class="sk" style="height:200px;margin-bottom:16px"></div>';
    m += '<div class="metrics">' + Array(4).fill('<div class="sk" style="height:78px"></div>').join('') + '</div>';
    return m;
  }
  function errorState() { return '<div class="stub" style="border-style:solid"><div class="tag" style="color:var(--red);background:var(--red-bg)">Error</div><h2>Couldn’t load your dashboard</h2><p>Something went wrong reaching the server. Your work is safe.</p><button class="btn primary" onclick="document.dispatchEvent(new CustomEvent(\'devstate\',{detail:\'data\'}))" style="margin-top:12px">Try again</button></div>'; }
  function emptyState() { return C.EmptyState({ icon: '✓', title: 'Your queues are clear', text: 'Nothing needs your action right now. New items will appear here as they arrive.' }); }
  function offlineBanner() { return '<div class="filterbar" style="background:var(--amber-bg);border-color:#e7d3a8;color:var(--amber);font-weight:600;margin-bottom:12px">⏳ You’re offline — figures are cached, last synced ' + f.dhaka('2026-07-15T05:40:00Z', true) + '. Actions are unavailable until you reconnect.</div>'; }

  /* small helpers */
  function qcard(title, count, bodyId, linkLabel, linkFn) {
    var z = count === 0 ? ' zero' : '';
    return '<div class="qcard"><div class="qh"><span class="t">' + C.esc(title) + '</span><span class="n' + z + '">' + count + '</span>' + (linkLabel ? '<span class="link" data-qlink>' + C.esc(linkLabel) + ' →</span>' : '') + '</div><div id="' + bodyId + '"></div></div>';
  }
  function mountAll(list) { list.forEach(function (m) { var elc = document.getElementById(m.id); if (elc) m.mount(elc); }); }
  function go(hash){ location.hash = hash; }

  /* ============================ SUPER ADMIN (A05) ============================ */
  function superAdmin(role, staff, mount, offline) {
    var A = CRM.partnerApplications, tbls = [];
    var html = '';
    html += C.PageHeader({ title: TITLES[role], sub: staff.name + ' · ' + Perm.ROLE_LABEL[role] + ' · ' + staff.office,
      actions: [{ label: 'Export summary CSV', id: 'exp', cls: '', icon: '⭳' }] });
    html += '<div id="flt"></div>';
    if (offline) html += offlineBanner();
    // Tier 1 — work queue
    html += qcard('New partner applications awaiting approval', A.length, 'tbl-apps', 'People', null);
    html += '<div class="qcols two">' + qcard('KYC pending review', CRM.kycQueue.length, 'q-kyc', 'Documents') + qcard('Payments awaiting reconciliation', CRM.webhooks.length, 'q-recon', 'Finance') + '</div>';
    // Tier 2 — metrics
    html += '<div class="sectitle">Organisation health</div>';
    html += C.metricsRow([
      { label: 'Active projects', value: CRM.org.activeProjects, delta: '+1 this week', deltaDir: 'up', spark: [7,9,8,11,12,15] },
      { label: 'Active partners', value: CRM.org.activePartners, delta: '+6', deltaDir: 'up', spark: [90,102,110,118,124,128] },
      { label: 'Active clients', value: CRM.org.activeClients, delta: '+12', deltaDir: 'up', spark: [280,300,315,330,338,342] },
      { label: 'Units (avail/res/sold)', value: CRM.org.units.available + ' / ' + CRM.org.units.reserved + ' / ' + CRM.org.units.sold, delta: 'stable', deltaDir: 'flat' }
    ]);
    // Tier 3 — ambient
    html += '<div class="qcols two" style="margin-top:20px">';
    html += '<div><div class="sectitle">Recent audit highlights <span class="n">last 10</span></div><div class="tablewrap" style="padding:6px 14px"><div class="auditlist" id="aud"></div></div></div>';
    html += '<div><div class="sectitle">Territory activity</div><div id="tbl-terr"></div></div>';
    html += '</div>';
    mount.innerHTML = html;

    C.FilterBar(document.getElementById('flt'), { id: 'sa', filters: [ { key: 'range', type: 'date' }, { key: 'project', label: 'Project', options: ['The ROSSA','Salmon Oasis Park','Salmon Bellissimo'] }, { key: 'territory', label: 'Territory', options: ['Chattogram › Cumilla','Dhaka › Savar','Sylhet'] }, { key: 'team', label: 'Team', options: ['Cumilla Sadar','Savar'] } ], onChange: function(){} });

    // export (permission-gated)
    var exp = mount.querySelector('[data-act="exp"]');
    if (exp) exp.onclick = function () { try { Perm.requirePermission(role, 'EXPORT_SUMMARY_CSV'); } catch (e) { C.toast({ type: 'error', title: 'Not permitted' }); return; } Audit.audit({ actor: staff, action: 'EXPORT_SUMMARY_CSV', target: 'org summary' }); C.toast({ type: 'success', title: 'Export started', text: 'Non-sensitive summary queued as CSV.' }); };

    // applications table (approve/reject + bulk approve)
    var appsTbl = C.mountDataTable(document.getElementById('tbl-apps'), {
      rowId: 'id', selectable: true, noun: 'applications',
      columns: [
        { key: 'id', label: 'App', render: function(r){ return '<span class="mono">'+r.id+'</span>'; } },
        { key: 'name', label: 'Applicant', strong: true, sortable: true },
        { key: 'territory', label: 'Territory' },
        { key: 'program', label: 'Program', render: function(r){ return '<span class="chip '+(r.program==='With Investment'?'violet':'blue')+'"><span class="d"></span>'+C.esc(r.program)+'</span>'; } },
        { key: 'submittedUtc', label: 'Submitted', sortable: true, sortValue: function(r){ return r.submittedUtc; }, render: function(r){ return f.dhaka(r.submittedUtc); } }
      ],
      rowActions: [
        { label: 'Approve partner', icon: '✓', onClick: function(r){ approveApp(r); } },
        { label: 'Reject', icon: '✕', danger: true, onClick: function(r){ rejectApp(r); } }
      ],
      bulkActions: [ { label: 'Approve selected', cls: 'primary', onClick: function(rows){ bulkApproveApps(rows); } } ],
      emptyState: C.EmptyState({ title: 'No applications waiting', text: 'New partner applications will appear here.' })
    });
    function approveApp(r){ runAction({ role: role, staff: staff, perm: 'APPROVE_PARTNER', target: r.id + ' · ' + r.name,
      confirm: { title: 'Approve partner?', body: 'Approve <b>'+C.esc(r.name)+'</b> for <b>'+C.esc(r.territory)+'</b>?', warn: 'This issues a Partner ID and sends a push to their phone.', confirmLabel: 'Approve partner' },
      toast: { type: 'success', persist: true, title: 'Partner approved', text: r.name + ' — a new Partner ID was issued.', ripple: 'Push sent to applicant' },
      done: function(){ appsTbl.remove(r.id); } }); }
    function rejectApp(r){ runAction({ role: role, staff: staff, perm: 'APPROVE_PARTNER', target: r.id + ' · rejected',
      confirm: { title: 'Reject application?', body: 'Reject <b>'+C.esc(r.name)+'</b>? They will be notified with a reason.', danger: true, confirmLabel: 'Reject' },
      toast: { type: 'warning', title: 'Application rejected', text: r.name + ' was notified.' }, done: function(){ appsTbl.remove(r.id); } }); }
    function bulkApproveApps(rows){ runAction({ role: role, staff: staff, perm: 'APPROVE_PARTNER', target: rows.length + ' applications',
      confirm: { title: 'Approve ' + rows.length + ' partners?', body: 'Issue Partner IDs to <b>'+rows.length+'</b> applicants and notify each?', warn: 'Each approval sends a push and writes an audit entry.', confirmLabel: 'Approve all' },
      toast: { type: 'success', persist: true, title: rows.length + ' partners approved', text: 'Partner IDs issued.', ripple: 'Pushes sent' },
      done: function(){ rows.forEach(function(r){ appsTbl.remove(r.id); }); } }); }

    // small KYC / recon lists
    document.getElementById('q-kyc').innerHTML = miniList(CRM.kycQueue.slice(0,3).map(function(k){ return { a: k.customer, b: k.docType + ' · ' + k.project, c: f.dhaka(k.uploadedUtc) }; }));
    document.getElementById('q-recon').innerHTML = miniList(CRM.webhooks.map(function(w){ return { a: f.money(w.amount, w.currency), b: 'Ref ' + w.gatewayRef, c: f.dhaka(w.receivedUtc, true) }; }));
    mount.querySelectorAll('[data-qlink]').forEach(function(l,i){ l.onclick=function(){ go(['#/people','#/documents','#/finance'][i]); }; });

    // audit highlights + territory
    document.getElementById('aud').innerHTML = Audit.recent(10).map(auditRow).join('') || '<div class="muted" style="padding:10px 0">No audit entries yet.</div>';
    C.mountDataTable(document.getElementById('tbl-terr'), { rowId: 'territory', noun: 'territories',
      columns: [ { key: 'territory', label: 'Territory', strong: true }, { key: 'partners', label: 'Partners', align: 'right', sortable: true, sortValue:function(r){return r.partners;} }, { key: 'leads7', label: 'Leads 7d', align: 'right' }, { key: 'sales7', label: 'Sales 7d', align: 'right' } ],
      rows: CRM.territoryActivity });
  }

  /* ============================ MANAGER (A06) ============================ */
  function manager(role, staff, mount, offline) {
    var html = C.PageHeader({ title: TITLES[role], sub: staff.name + ' · ' + Perm.ROLE_LABEL[role] + ' · ' + staff.office });
    html += '<div id="flt"></div>';
    if (offline) html += offlineBanner();
    html += qcard('Leads awaiting my action', CRM.leadsAwaiting.length, 'tbl-leads', 'Pipeline');
    html += '<div class="qcols two">' + qcard('Meetings to confirm', CRM.meetingsToConfirm.length, 'q-meet') + qcard('Consultations today', CRM.consultationsToday.length, 'q-cons') + '</div>';
    html += qcard('Conversions to verify', CRM.conversionsToVerify.length, 'tbl-conv');
    html += '<div class="sectitle">This week</div>';
    html += C.metricsRow([
      { label: 'Leads awaiting', value: CRM.leadsAwaiting.length, delta: '2 over SLA', deltaDir: 'down' },
      { label: 'Meetings today', value: CRM.consultationsToday.length, delta: 'on track', deltaDir: 'flat' },
      { label: 'Conversions to verify', value: CRM.conversionsToVerify.length, delta: '+2', deltaDir: 'up' },
      { label: 'Team sales (7d)', value: 6, delta: '+1', deltaDir: 'up', spark: [3,4,3,5,4,6] }
    ]);
    html += '<div class="sectitle" style="margin-top:20px">Recent activity</div><div class="tablewrap" style="padding:6px 14px"><div class="auditlist" id="aud"></div></div>';
    mount.innerHTML = html;

    C.FilterBar(document.getElementById('flt'), { id: 'mg', filters: [ { key: 'range', type: 'date' }, { key: 'project', label: 'Project', options: ['The ROSSA','Salmon Oasis Park','Salmon Bellissimo'] }, { key: 'status', label: 'Status', options: ['Submitted','Contacted','Meeting scheduled','Visit completed'] } ], onChange: function(){} });

    var leadsTbl = C.mountDataTable(document.getElementById('tbl-leads'), { rowId: 'id', noun: 'leads', defaultSort: 'slaH', defaultDir: 1,
      columns: [
        { key: 'name', label: 'Lead', strong: true, sortable: true },
        { key: 'project', label: 'Project' },
        { key: 'partner', label: 'Partner' },
        { key: 'status', label: 'Status', render: function(r){ return C.StatusChip(r.status); } },
        { key: 'slaH', label: 'SLA', align: 'right', sortable: true, sortValue: function(r){ return r.slaH; }, render: function(r){ var s=CRM.sla(r.slaH); return '<span class="sla '+s.cls+'">'+(r.slaH<0?Math.abs(r.slaH)+'h over':r.slaH+'h left')+'</span>'; } }
      ],
      rowActions: [ { label: 'Open lead', icon: '↗', onClick: function(r){ go('#/pipeline'); } }, { label: 'Mark contacted', icon: '✓', onClick: function(r){ C.toast({type:'success',title:'Marked contacted',text:r.name}); Audit.audit({actor:staff,action:'VERIFY_CONVERSION',target:'contacted '+r.id}); leadsTbl.remove(r.id); } } ],
      onRowClick: function(r){ go('#/pipeline'); },
      emptyState: C.EmptyState({ title: 'No leads waiting', text: 'Leads assigned to you appear here, sorted by SLA.' }) });

    document.getElementById('q-meet').innerHTML = CRM.meetingsToConfirm.map(function(m){
      return '<div class="ar" style="padding:9px 14px;border-bottom:.5px solid var(--line-2);display:flex;align-items:center;gap:10px"><div><div class="ac">'+C.esc(m.requester)+' <span class="chip '+(m.kind==='partner'?'blue':'violet')+'" style="margin-left:4px"><span class="d"></span>'+m.kind+'</span></div><div class="muted" style="font-size:11.5px">'+C.esc(m.project)+' · '+f.dhaka(m.whenUtc,true)+'</div></div><button class="btn sm primary" data-mid="'+m.id+'" style="margin-left:auto">Confirm</button></div>';
    }).join('');
    document.querySelectorAll('[data-mid]').forEach(function(b){ b.onclick=function(){ var m=CRM.meetingsToConfirm.filter(function(x){return x.id===b.getAttribute('data-mid');})[0];
      runAction({ role: role, staff: staff, perm: 'CONFIRM_MEETING', target: m.id + ' · ' + m.requester,
        confirm: { title: 'Confirm meeting?', body: 'Confirm the meeting with <b>'+C.esc(m.requester)+'</b> on <b>'+f.dhaka(m.whenUtc,true)+'</b>?', confirmLabel: 'Confirm meeting' },
        toast: { type: 'success', persist: true, title: 'Meeting confirmed', text: m.requester + ' · ' + f.dhaka(m.whenUtc,true), ripple: 'Join link sent' },
        done: function(){ b.closest('.ar').remove(); } }); }; });

    document.getElementById('q-cons').innerHTML = CRM.consultationsToday.map(function(c){
      return '<div class="ar" style="padding:9px 14px;border-bottom:.5px solid var(--line-2);display:flex;align-items:center;gap:10px"><div><div class="ac">'+C.esc(c.client)+'</div><div class="muted" style="font-size:11.5px">'+f.dhaka(c.whenUtc,true)+'</div></div><a class="btn sm" href="'+c.join+'" target="_blank" style="margin-left:auto">Join ↗</a></div>';
    }).join('');

    var convTbl = C.mountDataTable(document.getElementById('tbl-conv'), { rowId: 'id', noun: 'conversions',
      columns: [ { key: 'lead', label: 'Lead', strong: true }, { key: 'partner', label: 'Partner' }, { key: 'project', label: 'Project' }, { key: 'submittedUtc', label: 'Submitted', render: function(r){ return f.dhaka(r.submittedUtc); } } ],
      rowActions: [ { label: 'Verify conversion', icon: '✓', onClick: function(r){ verifyConv(r); } } ],
      emptyState: C.EmptyState({ title: 'Nothing to verify', text: 'Verified conversions create commission.' }) });
    function verifyConv(r){ runAction({ role: role, staff: staff, perm: 'VERIFY_CONVERSION', target: r.id + ' · ' + r.lead,
      confirm: { title: 'Verify conversion?', body: 'Verify <b>'+C.esc(r.lead)+'</b> (via '+C.esc(r.partner)+')? <b>This creates a commission record</b> for finance to approve.', warn: 'Verification is the action that makes commission eligible. It cannot be undone here.', confirmLabel: 'Verify conversion' },
      toast: { type: 'success', persist: true, title: 'Conversion verified', text: r.lead + ' — commission record created.', ripple: 'Partner notified' },
      done: function(){ convTbl.remove(r.id); } }); }

    document.getElementById('aud').innerHTML = Audit.recent(6).map(auditRow).join('');
  }

  /* ============================ FINANCE (A07) — the star ============================ */
  function finance(role, staff, mount, offline) {
    var html = C.PageHeader({ title: TITLES[role], sub: staff.name + ' · ' + Perm.ROLE_LABEL[role] + ' · ' + staff.office });
    html += '<div id="flt"></div>';
    if (offline) html += offlineBanner();
    html += qcard('Settlement requests', CRM.settlementRequests.length, 'tbl-settle', null);
    html += '<div class="qcols two">' + qcard('Webhooks awaiting reconciliation', CRM.webhooks.length, 'tbl-webhooks') + qcard('International wires pending', CRM.wires.length, 'tbl-wires') + '</div>';
    html += qcard('Commission approvals', CRM.commissionApprovals.length, 'tbl-comm');
    html += '<div class="sectitle">State</div>';
    html += C.metricsRow([
      { label: 'Awaiting reconciliation', value: CRM.financeStats.awaitingRecon, delta: '3 unmatched', deltaDir: 'down' },
      { label: 'Settlement requests', value: CRM.settlementRequests.filter(function(s){return s.status==='submitted';}).length, delta: 'review today', deltaDir: 'flat' },
      { label: 'Overdue installments', value: CRM.financeStats.overdueInstallments, delta: '+1', deltaDir: 'down' },
      { label: 'Invoices (7d)', value: CRM.financeStats.invoices7, delta: '+5', deltaDir: 'up', spark: [12,15,14,18,20,23] }
    ]);
    html += '<div class="sectitle" style="margin-top:20px">Recent settlements <span class="n">last 20</span></div><div id="tbl-recent"></div>';
    mount.innerHTML = html;

    C.FilterBar(document.getElementById('flt'), { id: 'fin', filters: [ { key: 'range', type: 'date' }, { key: 'project', label: 'Project', options: ['The ROSSA','Salmon Oasis Park','Salmon Bellissimo'] }, { key: 'status', label: 'Status', options: ['Submitted','Approved','On hold','Settled'] } ], onChange: function(){} });

    // ---- settlement queue: selectable + bulk + row actions, high-consequence ----
    var settleTbl = C.mountDataTable(document.getElementById('tbl-settle'), { rowId: 'id', selectable: true, noun: 'requests', defaultSort: 'requestedUtc', defaultDir: 1,
      columns: [
        { key: 'partner', label: 'Partner', strong: true, sortable: true, render: function(r){ return C.esc(r.partner)+' <span class="muted mono" style="font-size:11px">'+r.partnerId+'</span>'; } },
        { key: 'amountBdt', label: 'Requested', align: 'right', sortable: true, sortValue:function(r){return r.amountBdt;}, render: function(r){ return '<b>'+f.bdt(r.amountBdt)+'</b>'; } },
        { key: 'approvedBalanceBdt', label: 'Approved balance', align: 'right', render: function(r){ return f.bdt(r.approvedBalanceBdt); } },
        { key: 'requestedUtc', label: 'Requested', sortable: true, sortValue:function(r){return r.requestedUtc;}, render: function(r){ return f.dhaka(r.requestedUtc); } },
        { key: 'status', label: 'Status', render: function(r){ return C.StatusChip(r.status); } }
      ],
      rowActions: [
        { label: 'Approve settlement', icon: '✓', onClick: function(r){ approveSettle(r); } },
        { label: 'Put on hold', icon: '⏸', onClick: function(r){ holdSettle(r); } },
        { label: 'Reject', icon: '✕', danger: true, onClick: function(r){ rejectSettle(r); } }
      ],
      bulkActions: [
        { label: 'Approve selected', cls: 'primary', onClick: function(rows){ bulkApprove(rows); } },
        { label: 'Hold selected', onClick: function(rows){ bulkHold(rows); } }
      ],
      emptyState: C.EmptyState({ title: 'No settlement requests', text: 'Partner payout requests appear here.' }) });

    function approveSettle(r){ runAction({ role: role, staff: staff, perm: 'RELEASE_SETTLEMENT', target: r.id + ' · ' + f.bdt(r.amountBdt),
      confirm: { title: 'Approve settlement of ' + f.bdt(r.amountBdt) + '?', body: 'Release <b>'+f.bdt(r.amountBdt)+'</b> to <b>'+C.esc(r.partner)+'</b> ('+r.partnerId+').<br>Approved balance: <b>'+f.bdt(r.approvedBalanceBdt)+'</b>.', warn: 'This authorises a payout and cannot be undone from here.', confirmLabel: 'Approve settlement' },
      toast: { type: 'success', persist: true, title: 'Settlement approved — ' + r.id, text: f.bdt(r.amountBdt) + ' to ' + r.partnerId + '.', ripple: 'Push sent to partner' },
      done: function(){ settleTbl.remove(r.id); } }); }
    function holdSettle(r){ runAction({ role: role, staff: staff, perm: 'HOLD_SETTLEMENT', target: r.id + ' · on hold',
      confirm: { title: 'Put settlement on hold?', body: 'Hold <b>'+r.id+'</b> ('+C.esc(r.partner)+')? The partner sees an honest “on hold” state.', confirmLabel: 'Put on hold' },
      toast: { type: 'warning', title: 'Settlement on hold', text: r.id + ' held for review.' }, done: function(){ settleTbl.remove(r.id); } }); }
    function rejectSettle(r){ runAction({ role: role, staff: staff, perm: 'RELEASE_SETTLEMENT', target: r.id + ' · rejected',
      confirm: { title: 'Reject settlement?', body: 'Reject <b>'+r.id+'</b>? The partner is notified with a reason.', danger: true, confirmLabel: 'Reject' },
      toast: { type: 'warning', title: 'Settlement rejected', text: r.id }, done: function(){ settleTbl.remove(r.id); } }); }
    function bulkApprove(rows){ var total = rows.reduce(function(a,r){return a+r.amountBdt;},0);
      runAction({ role: role, staff: staff, perm: 'RELEASE_SETTLEMENT', target: rows.length + ' settlements · ' + f.bdt(total),
        confirm: { title: 'Approve ' + rows.length + ' settlements?', body: 'Release a total of <b>'+f.bdt(total)+'</b> across <b>'+rows.length+'</b> partners?', warn: 'Each approval authorises a payout, notifies the partner, and writes an audit entry.', confirmLabel: 'Approve all (' + f.bdt(total) + ')' },
        toast: { type: 'success', persist: true, title: rows.length + ' settlements approved', text: 'Total ' + f.bdt(total) + '.', ripple: 'Pushes sent to partners' },
        done: function(){ rows.forEach(function(r){ settleTbl.remove(r.id); }); } }); }
    function bulkHold(rows){ runAction({ role: role, staff: staff, perm: 'HOLD_SETTLEMENT', target: rows.length + ' on hold',
      confirm: { title: 'Hold ' + rows.length + ' settlements?', body: 'Put <b>'+rows.length+'</b> requests on hold for review?', confirmLabel: 'Hold all' },
      toast: { type: 'warning', title: rows.length + ' settlements on hold' }, done: function(){ rows.forEach(function(r){ settleTbl.remove(r.id); }); } }); }

    // webhooks
    var whTbl = C.mountDataTable(document.getElementById('tbl-webhooks'), { rowId: 'id', noun: 'webhooks',
      columns: [ { key: 'gatewayRef', label: 'Gateway ref', render: function(r){ return '<span class="mono">'+r.gatewayRef+'</span>'; } }, { key: 'amount', label: 'Amount', align: 'right', render: function(r){ return '<b>'+f.money(r.amount,r.currency)+'</b>'; } }, { key: 'receivedUtc', label: 'Received', render: function(r){ return f.dhaka(r.receivedUtc,true); } } ],
      rowActions: [ { label: 'Match to booking', icon: '⇄', onClick: function(r){ runAction({ role: role, staff: staff, perm: 'RECONCILE_PAYMENT', target: r.id + ' · ' + r.gatewayRef, confirm: { title: 'Match payment to a booking?', body: 'Reconcile <b>'+f.money(r.amount,r.currency)+'</b> (ref '+r.gatewayRef+') against a booking record?', confirmLabel: 'Match & reconcile' }, toast: { type: 'success', title: 'Payment reconciled', text: r.gatewayRef }, done: function(){ whTbl.remove(r.id); } }); } } ],
      emptyState: C.EmptyState({ title: 'All reconciled', text: 'No unmatched webhooks.' }) });

    // wires
    var wireTbl = C.mountDataTable(document.getElementById('tbl-wires'), { rowId: 'id', noun: 'wires',
      columns: [ { key: 'client', label: 'Client', strong: true }, { key: 'amountUsd', label: 'Amount', align: 'right', render: function(r){ return '<b>'+f.money(r.amountUsd,'USD')+'</b>'; } }, { key: 'project', label: 'Project' }, { key: 'submittedUtc', label: 'Submitted', render: function(r){ return f.dhaka(r.submittedUtc); } } ],
      rowActions: [ { label: 'Verify receipt', icon: '✓', onClick: function(r){ runAction({ role: role, staff: staff, perm: 'VERIFY_WIRE', target: r.id + ' · ' + f.money(r.amountUsd,'USD'), confirm: { title: 'Verify wire receipt?', body: 'Confirm receipt of <b>'+f.money(r.amountUsd,'USD')+'</b> from <b>'+C.esc(r.client)+'</b> against the bank statement?', warn: 'Only confirm after checking the bank statement.', confirmLabel: 'Verify receipt' }, toast: { type: 'success', persist: true, title: 'Wire verified', text: r.id + ' · ' + f.money(r.amountUsd,'USD'), ripple: 'Client notified' }, done: function(){ wireTbl.remove(r.id); } }); } } ],
      emptyState: C.EmptyState({ title: 'No wires pending', text: 'Client wire records awaiting verification appear here.' }) });

    // commission approvals
    var commTbl = C.mountDataTable(document.getElementById('tbl-comm'), { rowId: 'id', selectable: true, noun: 'commissions',
      columns: [ { key: 'id', label: 'Commission', render: function(r){ return '<span class="mono">'+r.id+'</span>'; } }, { key: 'partner', label: 'Partner', strong: true, render: function(r){ return C.esc(r.partner)+' <span class="muted mono" style="font-size:11px">'+r.partnerId+'</span>'; } }, { key: 'amountBdt', label: 'Amount', align: 'right', sortable: true, sortValue:function(r){return r.amountBdt;}, render: function(r){ return '<b>'+f.bdt(r.amountBdt)+'</b>'; } }, { key: 'conversionRef', label: 'From', render: function(r){ return '<span class="mono">'+r.conversionRef+'</span>'; } }, { key: 'status', label: 'Status', render: function(r){ return C.StatusChip(r.status); } } ],
      rowActions: [ { label: 'Approve commission', icon: '✓', onClick: function(r){ runAction({ role: role, staff: staff, perm: 'APPROVE_COMMISSION', target: r.id + ' · ' + f.bdt(r.amountBdt), confirm: { title: 'Approve commission?', body: 'Approve <b>'+f.bdt(r.amountBdt)+'</b> for <b>'+C.esc(r.partner)+'</b> ('+r.partnerId+')? This flips it Pending → Approved and lets the partner request settlement.', confirmLabel: 'Approve commission' }, toast: { type: 'success', persist: true, title: 'Commission approved', text: r.id + ' · ' + f.bdt(r.amountBdt), ripple: 'Partner balance updated' }, done: function(){ commTbl.remove(r.id); } }); } } ],
      bulkActions: [ { label: 'Approve selected', cls: 'primary', onClick: function(rows){ var total=rows.reduce(function(a,r){return a+r.amountBdt;},0); runAction({ role: role, staff: staff, perm: 'APPROVE_COMMISSION', target: rows.length+' commissions · '+f.bdt(total), confirm: { title: 'Approve '+rows.length+' commissions?', body: 'Approve a total of <b>'+f.bdt(total)+'</b> across '+rows.length+' partners?', confirmLabel: 'Approve all' }, toast: { type: 'success', persist: true, title: rows.length+' commissions approved', text: 'Total '+f.bdt(total), ripple: 'Partner balances updated' }, done: function(){ rows.forEach(function(r){ commTbl.remove(r.id); }); } }); } } ],
      emptyState: C.EmptyState({ title: 'No commissions to approve' }) });

    // recent settlements
    C.mountDataTable(document.getElementById('tbl-recent'), { rowId: 'id', noun: 'settlements',
      columns: [ { key: 'id', label: 'Ref', render: function(r){ return '<span class="mono">'+r.id+'</span>'; } }, { key: 'partner', label: 'Partner', strong: true }, { key: 'amountBdt', label: 'Amount', align: 'right', render: function(r){ return f.bdt(r.amountBdt); } }, { key: 'status', label: 'Status', render: function(r){ return C.StatusChip(r.status); } }, { key: 'settledUtc', label: 'Settled', render: function(r){ return f.dhaka(r.settledUtc); } } ],
      rows: CRM.recentSettlements });
  }

  /* ============================ LEGAL (A08) ============================ */
  function legal(role, staff, mount, offline) {
    var html = C.PageHeader({ title: TITLES[role], sub: staff.name + ' · ' + Perm.ROLE_LABEL[role] + ' · ' + staff.office });
    html += '<div id="flt"></div>';
    if (offline) html += offlineBanner();
    html += qcard('KYC pending review', CRM.kycQueue.length, 'tbl-kyc');
    html += '<div class="qcols two">' + qcard('Documents awaiting classification', CRM.docsToClassify.length, 'tbl-classify') + qcard('Documents pending publication', CRM.docsToPublish.length, 'tbl-publish') + '</div>';
    html += '<div class="sectitle">State</div>';
    html += C.metricsRow([
      { label: 'KYC pending', value: CRM.legalStats.kycPending, delta: 'review today', deltaDir: 'flat' },
      { label: 'Documents total', value: CRM.legalStats.docsTotal, delta: '+2', deltaDir: 'up' },
      { label: 'Restricted docs', value: CRM.legalStats.restricted, delta: 'stable', deltaDir: 'flat' },
      { label: 'To classify', value: CRM.docsToClassify.length, delta: '', deltaDir: 'flat' }
    ]);
    html += '<div class="sectitle" style="margin-top:20px">Document access log — highlights</div><div class="tablewrap" style="padding:4px 14px"><div class="auditlist" id="axlog"></div></div>';
    mount.innerHTML = html;

    C.FilterBar(document.getElementById('flt'), { id: 'lg', filters: [ { key: 'range', type: 'date' }, { key: 'project', label: 'Project', options: ['The ROSSA','Salmon Oasis Park','Salmon Bellissimo'] }, { key: 'docType', label: 'Doc type', options: ['Passport','NID','Deed','Certificate'] } ], onChange: function(){} });

    var kycTbl = C.mountDataTable(document.getElementById('tbl-kyc'), { rowId: 'id', selectable: true, noun: 'KYC docs',
      columns: [ { key: 'customer', label: 'Customer', strong: true, sortable: true }, { key: 'docType', label: 'Type', render: function(r){ return C.StatusChip(r.docType==='Passport'?'blue':'violet'); } }, { key: 'project', label: 'Project' }, { key: 'uploadedUtc', label: 'Uploaded', sortable: true, sortValue:function(r){return r.uploadedUtc;}, render: function(r){ return f.dhaka(r.uploadedUtc,true); } } ],
      rowActions: [ { label: 'Verify KYC', icon: '✓', onClick: function(r){ verifyKyc(r); } }, { label: 'Reject', icon: '✕', danger: true, onClick: function(r){ rejectKyc(r); } } ],
      bulkActions: [ { label: 'Verify selected', cls: 'primary', onClick: function(rows){ runAction({ role: role, staff: staff, perm: 'VERIFY_KYC', target: rows.length+' KYC docs', confirm: { title: 'Verify '+rows.length+' KYC documents?', body: 'Confirm you have reviewed <b>'+rows.length+'</b> identity documents?', warn: 'Only verify after checking each document.', confirmLabel: 'Verify all' }, toast: { type: 'success', title: rows.length+' KYC verified' }, done: function(){ rows.forEach(function(r){ kycTbl.remove(r.id); }); } }); } } ],
      emptyState: C.EmptyState({ title: 'KYC queue clear', text: 'Customer identity uploads appear here for review.' }) });
    function verifyKyc(r){ runAction({ role: role, staff: staff, perm: 'VERIFY_KYC', target: r.id + ' · ' + r.customer,
      confirm: { title: 'Verify KYC?', body: 'Verify the <b>'+r.docType+'</b> uploaded by <b>'+C.esc(r.customer)+'</b> for '+C.esc(r.project)+'?', warn: 'Confirm only after reviewing the document image.', confirmLabel: 'Verify KYC' },
      toast: { type: 'success', persist: true, title: 'KYC verified', text: r.customer + ' · ' + r.docType, ripple: 'Customer notified' }, done: function(){ kycTbl.remove(r.id); } }); }
    function rejectKyc(r){ runAction({ role: role, staff: staff, perm: 'VERIFY_KYC', target: r.id + ' · rejected',
      confirm: { title: 'Reject KYC?', body: 'Reject the document from <b>'+C.esc(r.customer)+'</b>? They will be asked to re-upload.', danger: true, confirmLabel: 'Reject' },
      toast: { type: 'warning', title: 'KYC rejected', text: r.customer }, done: function(){ kycTbl.remove(r.id); } }); }

    var clsTbl = C.mountDataTable(document.getElementById('tbl-classify'), { rowId: 'id', noun: 'documents',
      columns: [ { key: 'name', label: 'Document', strong: true }, { key: 'project', label: 'Project' }, { key: 'uploadedUtc', label: 'Uploaded', render: function(r){ return f.dhaka(r.uploadedUtc); } } ],
      rowActions: [ { label: 'Classify visibility', icon: '▤', onClick: function(r){ runAction({ role: role, staff: staff, perm: 'CLASSIFY_DOC', target: r.id + ' · ' + r.name, confirm: { title: 'Classify document?', body: 'Assign a visibility level to <b>'+C.esc(r.name)+'</b>? (Public / Internal / Restricted — set in the module in Part 5.)', confirmLabel: 'Classify' }, toast: { type: 'success', title: 'Document classified', text: r.name }, done: function(){ clsTbl.remove(r.id); } }); } } ],
      emptyState: C.EmptyState({ title: 'Nothing to classify' }) });

    var pubTbl = C.mountDataTable(document.getElementById('tbl-publish'), { rowId: 'id', noun: 'documents',
      columns: [ { key: 'name', label: 'Document', strong: true }, { key: 'visibility', label: 'Visibility', render: function(r){ return C.StatusChip(r.visibility.toLowerCase()); } }, { key: 'draftedUtc', label: 'Drafted', render: function(r){ return f.dhaka(r.draftedUtc); } } ],
      rowActions: [ { label: 'Publish', icon: '↑', onClick: function(r){ runAction({ role: role, staff: staff, perm: 'PUBLISH_DOC', target: r.id + ' · ' + r.name, confirm: { title: 'Publish document?', body: 'Publish <b>'+C.esc(r.name)+'</b> at its current visibility level?', warn: 'Publishing makes it visible to everyone in scope.', confirmLabel: 'Publish' }, toast: { type: 'success', persist: true, title: 'Document published', text: r.name, ripple: 'Visible on mobile app' }, done: function(){ pubTbl.remove(r.id); } }); } } ],
      emptyState: C.EmptyState({ title: 'Nothing pending publication' }) });

    document.getElementById('axlog').innerHTML = CRM.docAccessLog.map(function(a){
      return '<div class="ar"><span class="ac"'+(a.flag?' style="color:var(--red)"':'')+'>'+(a.flag?'⚠ ':'')+C.esc(a.kind)+' · '+C.esc(a.doc)+'</span><span class="muted">'+C.esc(a.actor)+'</span><span class="mt">'+f.dhaka(a.whenUtc,true)+'</span></div>';
    }).join('');
  }

  /* ---- shared bits ---- */
  function auditRow(a){ return '<div class="ar"><span class="ac">'+C.esc(prettyAction(a.action))+'</span><span class="muted">'+C.esc(a.target)+' · '+C.esc(a.actor)+'</span><span class="mt">'+f.dhaka(a.timestamp,true)+'</span></div>'; }
  function prettyAction(a){ return ({ RELEASE_SETTLEMENT:'Settlement released', APPROVE_COMMISSION:'Commission approved', APPROVE_PARTNER:'Partner approved', VERIFY_KYC:'KYC verified', VERIFY_CONVERSION:'Conversion verified', VERIFY_WIRE:'Wire verified', PUBLISH_PROJECT:'Project published', PUBLISH_DOC:'Document published', RECONCILE_PAYMENT:'Payment reconciled', CONFIRM_MEETING:'Meeting confirmed', HOLD_SETTLEMENT:'Settlement held', EXPORT_SUMMARY_CSV:'Summary exported', CLASSIFY_DOC:'Document classified' }[a] || a); }
  function miniList(items){ if(!items.length) return '<div class="empty"><div class="ic">✓</div><h3>Clear</h3></div>'; return '<div style="padding:2px 0">'+items.map(function(x){ return '<div class="ar" style="padding:8px 14px;border-bottom:.5px solid var(--line-2)"><div><div class="ac">'+C.esc(x.a)+'</div><div class="muted" style="font-size:11.5px">'+C.esc(x.b)+'</div></div><span class="mt">'+C.esc(x.c)+'</span></div>'; }).join('')+'</div>'; }

  var RENDER = { SUPER_ADMIN: superAdmin, MANAGER: manager, FINANCE: finance, LEGAL: legal };

  function render(role, state, mount, ctx) {
    var staff = ctx.staff;
    if (state === 'loading') { mount.innerHTML = skeleton(); return; }
    if (state === 'error') { mount.innerHTML = errorState(); return; }
    if (state === 'empty') { mount.innerHTML = C.PageHeader({ title: TITLES[role], sub: staff.name + ' · ' + Perm.ROLE_LABEL[role] }) + emptyState(); return; }
    (RENDER[role] || superAdmin)(role, staff, mount, state === 'offline');
  }

  root.Dashboards = { render: render, TITLES: TITLES };
})(window);
