/* ============================================================================
 * Salmon CRM — People & Access engine (Part 2)
 * ----------------------------------------------------------------------------
 * Each screens/*.html is a thin bootstrap that calls People.boot('B02').
 * This engine mounts the Part-1 shell (same DOM classes, same Router, same C.*
 * components — imported, never forked), gates entry by permission, and renders
 * the requested screen. Every mutation goes through a ConfirmDialog-shaped modal,
 * emits Audit.audit(), and (where it reaches a phone) Ripples.emit() + a Toast.
 * ==========================================================================*/
(function (root) {
  'use strict';
  var C = root.C, Perm = root.Perm, Audit = root.Audit, CRM = root.CRM, Router = root.Router,
      DevToolbar = root.DevToolbar, People = root.CRM.People, Ripples = root.Ripples;

  root.CRM_NOW = '2026-07-15T10:00:00Z';
  var esc = C.esc, fmt = C.fmt;

  /* ===================== state ===================== */
  var state = {
    role: localStorage.getItem('crm_role') || Perm.ROLES.SUPER_ADMIN,
    render: 'data',   // data | loading | empty | error | offline (dev toolbar)
    screen: null,
    params: null
  };
  function actor(){ return CRM.staff[state.role]; }
  function setRole(r){ state.role = r; localStorage.setItem('crm_role', r); }

  /* ===================== screen files (for cross-screen links) ===================== */
  var FILES = {
    B01:'B01-partners-list.html', B02:'B02-approval-queue.html', B03:'B03-partner-profile.html',
    B04:'B04-partner-pipeline.html', B05:'B05-partner-earnings.html', B06:'B06-partner-assign.html',
    B07:'B07-suspend-reactivate.html', B08:'B08-reject-application.html', B09:'B09-approve-application.html',
    B10:'B10-bulk-approve.html',
    C01:'C01-clients-list.html', C02:'C02-client-profile.html', C03:'C03-client-activity.html',
    C04:'C04-kyc-queue.html', C05:'C05-kyc-viewer.html', C06:'C06-communication-log.html',
    D01:'D01-territory-tree.html', D02:'D02-territory-detail.html', D03:'D03-teams-list.html',
    D04:'D04-team-detail.html', D05:'D05-assign-team-lead.html', D06:'D06-move-partner.html',
    D07:'D07-referral-codes.html',
    R01:'R01-rank-management.html', R02:'R02-assign-rank.html', R03:'R03-rank-history.html'
  };
  function href(id, params){
    var f = FILES[id]; if (!f) return '#';
    if (!params) return f;
    var qs = Object.keys(params).filter(function(k){ return params[k]!=null && params[k]!==''; })
      .map(function(k){ return k+'='+encodeURIComponent(params[k]); }).join('&');
    return qs ? f+'?'+qs : f;
  }
  function go(id, params){ location.href = href(id, params); }

  /* ===================== Partner ID generation (OPEN_QUESTIONS #1) ===================== */
  var PREFIX = [['Cumilla','CUM'],['Amratali','CUM'],['Savar','SAV'],['Bank Town','SAV'],['Sylhet','SYL'],
                ['Chandpur','CHAND'],['Keraniganj','KER'],['Dhaka','DHK']];
  function territoryPrefix(path){
    var s = People.pathStr(path);
    for (var i=0;i<PREFIX.length;i++){ if (s.indexOf(PREFIX[i][0]) > -1) return PREFIX[i][1]; }
    return 'BD';
  }
  // Deterministic in the prototype: Shahin (PA-2041) always mints SDP-CUM-00417.
  var FIXED_ID = { 'PA-2041':'SDP-CUM-00417' };
  function nextPartnerId(app){
    if (FIXED_ID[app.appId]) return FIXED_ID[app.appId];
    var pre = territoryPrefix(app.territoryPath);
    var seq = (parseInt(app.appId.replace(/\D/g,''),10) % 900 + 100);
    return 'SDP-'+pre+'-'+String(seq).padStart(5,'0');
  }

  /* ===================== shell (imports Part-1 chrome) ===================== */
  function mountShell(){
    var rootEl = document.getElementById('root');
    rootEl.innerHTML =
      '<div class="app" id="app">' +
      '<div class="brandcorner"><a class="mark" href="../index.html" title="Salmon console home">S</a><span class="name">SALMON</span><button class="collapse" id="collapse" title="Collapse">⇤</button></div>' +
      '<div class="topbar" id="topbar"></div>' +
      '<nav class="sidebar" id="sidebar"></nav>' +
      '<div class="main"><div class="maininner" id="main"></div><div class="appfooter" id="footer"></div></div>' +
      '</div>';
    document.getElementById('collapse').onclick = function(){ document.getElementById('app').classList.toggle('collapsed'); };
    renderTopbar(); renderSidebar(); renderFooter();
    ensureRippleFab();
  }

  function renderTopbar(){
    var tb = document.getElementById('topbar'); if (!tb) return;
    var sc = SCREENS[state.screen] || { title:'People', section:'B' };
    var s = actor();
    tb.innerHTML =
      '<div class="breadcrumb"><a href="../index.html#/dashboard">Salmon</a><span class="sep">›</span>' +
      '<a href="'+href(sectionHome(sc.section))+'">People</a><span class="sep">›</span>' +
      '<span class="cur">'+esc(sc.title)+'</span></div><span class="spacer"></span>' +
      '<button class="searchbtn" id="searchbtn">🔎 <span>Search…</span><kbd>⌘K</kbd></button>' +
      '<span id="devmount"></span>' +
      '<button class="icobtn" id="bell">🔔</button>' +
      '<div class="user"><span class="avatar">'+esc(s.initials)+'</span><span class="who"><span class="nm">'+esc(s.name)+'</span><span class="rl">'+Perm.ROLE_LABEL[state.role]+'</span></span></div>';
    document.getElementById('devmount').appendChild(DevToolbar.render({
      role: state.role, state: state.render,
      onRole: function(r){ setRole(r); renderTopbar(); renderSidebar(); renderFooter(); renderMain(); },
      onState: function(st){ state.render = st; renderMain(); },
      onReset: function(){ Ripples.reset(); C.toast({ type:'info', title:'Mock data reset', text:'Queues and mobile ripples restored to seed.' }); renderMain(); }
    }));
    document.getElementById('searchbtn').onclick = function(){ location.href = '../index.html#/dashboard'; };
    document.getElementById('bell').onclick = function(){ C.toast({ type:'info', title:'Notifications', text:'The notification centre lives on the console home (Part 1).' }); };
  }

  function renderSidebar(){
    var sb = document.getElementById('sidebar'); if (!sb) return;
    var groups = Router.getSidebarFor(state.role);
    sb.innerHTML = groups.map(function(g){
      return '<div class="navgroup"><div class="gl">'+esc(g.title)+'</div>'+g.items.map(function(it){
        var active = it.id === 'people';
        var MODMAP = { people:href('B02'), catalogue:'E01-projects-list.html', pipeline:'F01-leads-list.html', finance:'I01-webhook-queue.html' };
        var route = MODMAP[it.id] || ('../index.html'+it.route);
        var count = it.id === 'people' ? People.allApplications().length : it.count;
        return '<a class="navitem'+(active?' active':'')+'" href="'+route+'"><span class="ic">'+it.icon+'</span><span class="lb">'+esc(it.label)+'</span>'+(count?'<span class="count">'+count+'</span>':'')+'</a>';
      }).join('')+'</div>';
    }).join('');
  }

  function renderFooter(){
    var ft = document.getElementById('footer'); if (!ft) return;
    var s = actor();
    ft.innerHTML = '<b style="color:var(--ink-2)">'+esc(s.name)+'</b> · '+Perm.ROLE_LABEL[state.role]+' · '+esc(s.office)+'<span class="spacer" style="flex:1"></span><span>Salmon Admin · People & Access (Part 2)</span>';
  }

  /* ===================== ripple FAB ===================== */
  function ensureRippleFab(){
    if (document.getElementById('ripplefab')) { updateFab(); return; }
    var b = document.createElement('button');
    b.id = 'ripplefab'; b.className = 'ripplefab';
    b.innerHTML = '📱 Mobile ripples <span class="rc" id="ripplecount">0</span>';
    b.onclick = function(){ Ripples.toggleConsole(); };
    document.body.appendChild(b);
    document.addEventListener('ripple', updateFab);
    updateFab();
  }
  function updateFab(){ var c = document.getElementById('ripplecount'); if (c) c.textContent = Ripples.feed().length; }

  /* ===================== main render (gate + dev states) ===================== */
  function renderMain(){
    renderTopbar();
    var main = document.getElementById('main'); if (!main) return;
    var sc = SCREENS[state.screen];
    if (!sc){ main.innerHTML = C.PageHeader({ title:'Unknown screen' }); return; }

    // permission gate FIRST (URL-paste as the wrong role → A03)
    if (sc.perm && !Perm.can(state.role, sc.perm)){
      Audit.audit({ actor: actor(), action:'ACCESS_DENIED', target:'People · '+sc.title });
      main.innerHTML = deniedPanel(sc.title, sc.perm); wireDenied(main); return;
    }

    // dev render states apply to every screen
    if (state.render === 'loading'){ main.innerHTML = header(sc) + skeleton(); return; }
    if (state.render === 'error'){ main.innerHTML = header(sc) + statePanel('error'); return; }
    if (state.render === 'offline'){ main.innerHTML = header(sc) + statePanel('offline'); return; }
    if (state.render === 'empty'){ main.innerHTML = header(sc) + (sc.emptyState ? sc.emptyState() : C.EmptyState({ title:'Nothing here', text:'This view has no records in the current state.' })); return; }

    try { sc.render(main, state.params); }
    catch(e){ console.error(e); main.innerHTML = header(sc) + statePanel('error'); }
    updateFab();
  }

  function sectionHome(sec){ return { B:'B01', C:'C01', D:'D01', R:'R01' }[sec] || 'B01'; }
  function header(sc){ return submodnav(sc.section) + C.PageHeader({ title: sc.title, sub: sc.sub }); }

  function deniedPanel(what, perm){
    return submodnav(null) + '<div class="authwrap" style="min-height:auto;padding:40px 0"><div class="authcard denied" style="text-align:center">' +
      '<div class="mark" style="margin:0 auto 14px">⛔</div><h1>Access denied</h1>' +
      '<p>Your role — <b>'+Perm.ROLE_LABEL[state.role]+'</b> — cannot open <b>'+esc(what)+'</b>.' +
      (perm ? ' Required permission: <span class="mono">'+perm+'</span>.' : '') +
      '<br>Permissions are enforced server-side; this isn’t a UI glitch.</p>' +
      '<button class="btn primary" id="back-people" style="width:auto;margin:4px auto 0">Back to People</button></div></div>';
  }
  function wireDenied(main){ var b = main.querySelector('#back-people'); if (b) b.onclick = function(){ go('B02'); }; }

  function skeleton(){
    var rows = Array(7).fill(0).map(function(){ return '<div class="sk" style="height:34px;margin:6px 0"></div>'; }).join('');
    return '<div class="filterbar"><div class="sk" style="height:22px;width:120px"></div></div><div class="tablewrap" style="padding:10px">'+rows+'</div>';
  }
  function statePanel(kind){
    if (kind === 'offline') return C.EmptyState({ icon:'⚠', title:'You’re offline', text:'We can’t reach the Salmon servers. Reconnect to load this queue — nothing here is cached on device.' });
    return C.EmptyState({ icon:'⚠', title:'Something went wrong', text:'This queue failed to load. Retry, and if it persists, the on-call engineer is paged automatically.' });
  }

  /* ===================== module sub-nav ===================== */
  function submodnav(active){
    var items = [
      { sec:'B', label:'Partners',  home:'B01', n: People.allPartners().filter(function(p){return p.status!=='rejected';}).length },
      { sec:'C', label:'Clients',   home:'C01', n: People.allClients().length },
      { sec:'D', label:'Teams & Territories', home:'D01', n: People.teams.length },
      { sec:'R', label:'Ranks',     home:'R01', n: People.ranks.length }
    ];
    return '<div class="submodnav">'+items.map(function(it){
      return '<a class="'+(it.sec===active?'on':'')+'" href="'+href(it.home)+'">'+esc(it.label)+'<span class="n">'+it.n+'</span></a>';
    }).join('')+'</div>';
  }

  /* ===================== shared formDialog (ConfirmDialog + fields) =====================
   * Same look and deliberate two-button shape as C.confirmDialog, extended with
   * validated fields so a required reason/note can be captured. Resolves with the
   * collected values, or null on cancel. */
  function formDialog(cfg){
    return new Promise(function(resolve){
      var fieldsHtml = (cfg.fields||[]).map(function(f){
        if (f.type === 'html') return f.html;
        var lab = '<label>'+esc(f.label)+(f.required?' <span class="req">*</span>':'')+'</label>';
        if (f.type === 'textarea') return '<div class="field">'+lab+'<textarea data-fk="'+f.key+'" maxlength="'+(f.max||400)+'" placeholder="'+esc(f.placeholder||'')+'">'+esc(f.value||'')+'</textarea>'+(f.hint?'<div class="cnt">'+esc(f.hint)+'</div>':'')+'</div>';
        if (f.type === 'select') return '<div class="field">'+lab+'<select data-fk="'+f.key+'">'+f.options.map(function(o){ var val=o.value!=null?o.value:o, txt=o.label!=null?o.label:o; return '<option value="'+esc(val)+'"'+(String(f.value)===String(val)?' selected':'')+'>'+esc(txt)+'</option>'; }).join('')+'</select></div>';
        if (f.type === 'radio') return '<div class="field">'+lab+'<div class="radiogrp" data-radio="'+f.key+'">'+f.options.map(function(o,i){ return '<label class="radioopt'+((f.value?String(f.value)===String(o.value):i===0)?' sel':'')+'"><input type="radio" name="'+f.key+'" value="'+esc(o.value)+'"'+((f.value?String(f.value)===String(o.value):i===0)?' checked':'')+'><span><span class="rl">'+esc(o.label)+'</span>'+(o.sub?'<span class="rs">'+esc(o.sub)+'</span>':'')+'</span></label>'; }).join('')+'</div></div>';
        if (f.type === 'date') return '<div class="field">'+lab+'<input type="date" data-fk="'+f.key+'" value="'+esc(f.value||'')+'"></div>';
        return '<div class="field">'+lab+'<input type="text" data-fk="'+f.key+'" value="'+esc(f.value||'')+'" placeholder="'+esc(f.placeholder||'')+'"></div>';
      }).join('');
      var scrim = C.el('<div class="modalscrim"><div class="modal" style="width:'+(cfg.width||480)+'px"><div class="mh"><h3>'+esc(cfg.title)+'</h3></div>'+
        '<div class="mb">'+(cfg.intro||'')+fieldsHtml+(cfg.mobileNote?'<div class="mobilenote">📱 '+cfg.mobileNote+'</div>':'')+'</div>'+
        (cfg.warn?'<div class="warn">⚠ '+esc(cfg.warn)+'</div>':'')+
        '<div class="mf"><button class="btn" data-x>Cancel</button><button class="btn '+(cfg.danger?'danger':'primary')+'" data-ok>'+esc(cfg.confirmLabel||'Confirm')+'</button></div></div></div>');
      function collect(){ var out={}; scrim.querySelectorAll('[data-fk]').forEach(function(i){ out[i.getAttribute('data-fk')]=i.value.trim(); });
        scrim.querySelectorAll('[data-radio]').forEach(function(g){ var k=g.getAttribute('data-radio'); var c=g.querySelector('input:checked'); out[k]=c?c.value:''; }); return out; }
      function close(v){ scrim.remove(); document.removeEventListener('keydown', key); resolve(v); }
      function key(e){ if (e.key==='Escape') close(null); }
      scrim.addEventListener('click', function(e){ if (e.target===scrim) close(null); });
      // radio visual selection
      scrim.querySelectorAll('[data-radio] .radioopt').forEach(function(opt){ opt.onclick = function(){ opt.parentNode.querySelectorAll('.radioopt').forEach(function(o){ o.classList.remove('sel'); }); opt.classList.add('sel'); opt.querySelector('input').checked=true; if (cfg.onChange) cfg.onChange(collect(), scrim); }; });
      scrim.querySelectorAll('[data-fk]').forEach(function(i){ i.addEventListener('input', function(){ if (cfg.onChange) cfg.onChange(collect(), scrim); }); });
      scrim.querySelector('[data-x]').onclick = function(){ close(null); };
      scrim.querySelector('[data-ok]').onclick = function(){
        var vals = collect();
        var bad = (cfg.fields||[]).filter(function(f){ return f.required && !vals[f.key]; });
        if (bad.length){ var f0 = scrim.querySelector('[data-fk="'+bad[0].key+'"]'); if (f0){ f0.style.borderColor='var(--red)'; f0.focus(); }
          C.toast({ type:'warning', title:'A required field is empty', text:bad[0].label+' is required before you can confirm.' }); return; }
        close(vals);
      };
      document.addEventListener('keydown', key);
      document.body.appendChild(scrim);
      var first = scrim.querySelector('[data-fk],[data-ok]'); if (first) first.focus();
    });
  }

  /* ===================== reason vocabularies (OPEN_QUESTIONS #4, #5) ===================== */
  var KYC_REJECT_REASONS = ['Document expired','Name mismatch with profile','Image unreadable / blurred','Wrong document type','Suspected tampering','Other (see note)'];

  /* ===================== ACTIONS (each: dialog → mutate → audit → ripple → toast) ===================== */

  function approveApplication(app, after){
    var pid = nextPartnerId(app);
    var terrOpts = territoryOptions(app.territoryPath);
    formDialog({
      title:'Approve application',
      width:520,
      intro:'<p class="hint" style="margin-bottom:10px">Approving <b>'+esc(app.name)+'</b> issues a Partner ID that follows them forever. This is shown on their mobile welcome screen (P10) the moment they reopen the app.</p>'+
            '<div class="field"><label>Partner ID to be issued</label><div class="idpreview" data-idpreview>'+esc(pid)+'</div></div>',
      fields:[
        { type:'select', key:'territory', label:'Territory being assigned (editable if wrong)', options:terrOpts, value:People.pathStr(app.territoryPath) },
        { type:'select', key:'rank', label:'Initial rank', options:['Silver','Gold','Platinum'], value:'Silver' },
        { type:'html', html:'<div class="effectbox">Program membership confirmed: <b>'+esc((app.programs||[]).join(', '))+'</b></div>' },
        { type:'textarea', key:'note', label:'Note (optional)', placeholder:'Approved after phone verification, ref call log 14/11', hint:'Recorded on the audit trail.' }
      ],
      mobileNote:'On confirm, Shahin’s app flips <b>pending → approved</b> and reveals this Partner ID.',
      confirmLabel:'Approve & issue ID'
    }).then(function(v){
      if (!v) return;
      Perm.requirePermission(state.role, 'APPROVE_PARTNER');
      Ripples.mutate('app:'+app.appId, { approved:true, removed:true, partnerId:pid, rank:v.rank, territory:v.territory, note:v.note, approvedUtc: root.CRM_NOW });
      Audit.audit({ actor:actor(), action:'APPROVE_PARTNER', target:pid+' · '+app.name, changes:{ rank:v.rank, territory:v.territory, note:v.note||null } });
      Ripples.emit({ mobileId:app.mobileId, kind:'partner', status:'approved', screen:'P10 · Welcome', partnerId:pid, name:app.name,
        headline:'Approved '+app.name+' — Partner ID '+pid+' issued' });
      C.toast({ type:'success', persist:true, title:'Approved '+pid, text:app.name+' is now an active partner.', ripple:'push sent to '+app.name.split(' ')[0]+' — welcome screen unlocked' });
      after && after(pid);
    });
  }

  function rejectApplication(app, after){
    formDialog({
      title:'Reject application',
      danger:true,
      intro:'<p class="hint" style="margin-bottom:6px">Rejecting <b>'+esc(app.name)+'</b> is final for this application. Write the reason as if speaking to them — it is the only explanation they receive.</p>',
      fields:[
        { type:'textarea', key:'reason', label:'Reason for rejection', required:true, max:280, placeholder:'e.g. Territory already at partner capacity this cycle. Please re-apply next quarter — thank you for your interest.', hint:'Shown verbatim on their phone.' }
      ],
      mobileNote:'This reason will be shown to the applicant on their mobile <b>P08</b> rejection screen — write it with care.',
      confirmLabel:'Reject application'
    }).then(function(v){
      if (!v) return;
      Perm.requirePermission(state.role, 'REJECT_PARTNER');
      Ripples.mutate('app:'+app.appId, { rejected:true, removed:true, rejectionReason:v.reason, decidedUtc: root.CRM_NOW });
      Audit.audit({ actor:actor(), action:'REJECT_PARTNER', target:app.appId+' · '+app.name, changes:{ reason:v.reason } });
      Ripples.emit({ mobileId:app.mobileId, kind:'partner', status:'rejected', screen:'P08 · Declined', name:app.name, reason:v.reason,
        headline:'Rejected '+app.name+' — reason delivered to their phone' });
      C.toast({ type:'warning', persist:true, title:'Application rejected', text:app.name+' has been notified.', ripple:'P08 shows your reason to '+app.name.split(' ')[0] });
      after && after();
    });
  }

  function holdApplication(app, after){
    formDialog({
      title:'Hold for review',
      intro:'<p class="hint">Holding keeps <b>'+esc(app.name)+'</b> in the queue but flags the application for a second look. No mobile-side change.</p>',
      fields:[ { type:'textarea', key:'note', label:'Why is this on hold?', required:true, placeholder:'e.g. Phone unverified — awaiting call-back before deciding.' } ],
      confirmLabel:'Place on hold'
    }).then(function(v){
      if (!v) return;
      Ripples.mutate('app:'+app.appId, { onHold:true, holdNote:v.note });
      Audit.audit({ actor:actor(), action:'HOLD_APPLICATION', target:app.appId+' · '+app.name, changes:{ note:v.note } });
      C.toast({ type:'info', title:'On hold', text:app.name+' flagged for review.' });
      after && after();
    });
  }

  function bulkApprove(apps, after){
    if (!apps.length){ C.toast({ type:'info', title:'Nothing selected', text:'Select applications to bulk-approve.' }); return; }
    var CAP = 20; // OPEN_QUESTIONS #3 — rate limit
    var list = apps.slice(0, CAP);
    var previews = list.map(function(a){ return { app:a, pid:nextPartnerId(a) }; });
    var rows = previews.map(function(p){ return '<div class="railstat"><span class="l">'+esc(p.app.name)+'</span><span class="v mono" style="font-size:12px">'+esc(p.pid)+'</span></div>'; }).join('');
    formDialog({
      title:'Bulk approve '+list.length+' application'+(list.length>1?'s':''),
      width:520,
      intro:'<p class="hint" style="margin-bottom:8px">Each applicant is issued the Partner ID below and their phone flips to the welcome screen. One audit entry is written <b>per partner</b>.</p><div class="card" style="margin:0 0 4px;padding:10px 12px">'+rows+'</div>'+
        (apps.length>CAP?'<div class="warn" style="margin:10px 0 0">⚠ '+apps.length+' selected — capped at '+CAP+' per action (OPEN_QUESTIONS #3). The remaining '+(apps.length-CAP)+' stay in the queue.</div>':''),
      fields:[
        { type:'select', key:'rank', label:'Initial rank for all', options:['Silver','Gold','Platinum'], value:'Silver' },
        { type:'textarea', key:'note', label:'Shared note (optional)', placeholder:'Batch approved — quarterly Cumilla intake, all phone-verified.' }
      ],
      mobileNote:'<b>'+list.length+'</b> phones flip pending → approved on confirm.',
      confirmLabel:'Approve '+list.length+' partner'+(list.length>1?'s':'')
    }).then(function(v){
      if (!v) return;
      Perm.requirePermission(state.role, 'APPROVE_PARTNER');
      previews.forEach(function(p){
        Ripples.mutate('app:'+p.app.appId, { approved:true, removed:true, partnerId:p.pid, rank:v.rank, note:v.note, approvedUtc: root.CRM_NOW });
        Audit.audit({ actor:actor(), action:'APPROVE_PARTNER', target:p.pid+' · '+p.app.name, changes:{ rank:v.rank, bulk:true, note:v.note||null } });
        Ripples.emit({ mobileId:p.app.mobileId, kind:'partner', status:'approved', screen:'P10 · Welcome', partnerId:p.pid, name:p.app.name, headline:'Bulk-approved '+p.app.name+' — '+p.pid });
      });
      C.toast({ type:'success', persist:true, title:'Approved '+list.length+' partners', text:'One audit entry written per partner.', ripple:list.length+' welcome pushes sent' });
      after && after();
    });
  }

  function suspendPartner(p, after){
    formDialog({
      title:'Suspend partner',
      danger:true,
      intro:'<p class="hint">Suspending <b>'+esc(p.name)+'</b> ('+esc(p.id)+') is auditable and reversible only by reactivation.</p>',
      fields:[
        { type:'textarea', key:'reason', label:'Reason for suspension', required:true, placeholder:'e.g. Repeated unverified leads flagged in Manager review.' },
        { type:'date', key:'effective', label:'Effective from', value:'2026-07-15' },
        { type:'radio', key:'scope', label:'Access effect (OPEN_QUESTIONS #7)', value:'block', options:[
          { value:'block', label:'Block mobile access entirely', sub:'Partner sees the P09 suspended shell; cannot submit leads.' },
          { value:'leads', label:'Block new leads only', sub:'Can sign in; in-flight leads flagged, no new submissions.' } ] }
      ],
      mobileNote:'On confirm, this partner’s app shows the <b>P09 suspended</b> state.',
      confirmLabel:'Suspend partner'
    }).then(function(v){
      if (!v) return;
      Perm.requirePermission(state.role, 'SUSPEND_PARTNER');
      Ripples.mutate('ptr:'+p.id, { status:'suspended', suspension:{ reason:v.reason, effectiveUtc:v.effective, blocksApp:v.scope==='block' } });
      Audit.audit({ actor:actor(), action:'SUSPEND_PARTNER', target:p.id+' · '+p.name, changes:{ reason:v.reason, scope:v.scope, effective:v.effective } });
      Ripples.emit({ mobileId:p.mobileId||p.id, kind:'partner', status:'suspended', screen:'P09 · Suspended', name:p.name, reason:v.reason, headline:'Suspended '+p.name+' — P09 shown on their phone' });
      C.toast({ type:'warning', persist:true, title:'Partner suspended', text:p.name+' — '+(v.scope==='block'?'mobile access blocked':'new leads blocked'), ripple:'P09 suspended state shown' });
      after && after();
    });
  }

  function reactivatePartner(p, after){
    C.confirmDialog({
      title:'Reactivate partner',
      body:'<p>Restore <b>'+esc(p.name)+'</b> ('+esc(p.id)+') to active status? Their mobile access is restored and they return to their previous state. This is audit-only.</p>',
      confirmLabel:'Reactivate'
    }).then(function(ok){
      if (!ok) return;
      Perm.requirePermission(state.role, 'SUSPEND_PARTNER');
      Ripples.mutate('ptr:'+p.id, { status:'approved', suspension:null });
      Audit.audit({ actor:actor(), action:'REACTIVATE_PARTNER', target:p.id+' · '+p.name });
      Ripples.emit({ mobileId:p.mobileId||p.id, kind:'partner', status:'approved', screen:'Restored', name:p.name, partnerId:p.id, headline:'Reactivated '+p.name+' — mobile access restored' });
      C.toast({ type:'success', title:'Partner reactivated', text:p.name+' is active again.' });
      after && after();
    });
  }

  // B06 — single modal reused for territory / team / rank / program (old → new + effect)
  function assignChange(p, kind, after){
    var cfg = {
      territory: { title:'Change territory', perm:'ASSIGN_TERRITORY', label:'New territory', field:{ type:'select', key:'val', options:territoryOptions(p.territoryPath), value:People.pathStr(p.territoryPath) }, cur:People.pathStr(p.territoryPath), effect:'Leads in the old territory stay assigned to this partner unless separately moved (OPEN_QUESTIONS #6).' },
      team:      { title:'Change team',      perm:'MANAGE_TEAM',      label:'New team', field:{ type:'select', key:'val', options:teamOptions(), value:p.team||'' }, cur:People.teamName(p.team), effect:'Moves this partner’s roster membership. Team-lead flag is unaffected.' },
      rank:      { title:'Change rank',      perm:'ASSIGN_RANK',      label:'New rank', field:{ type:'select', key:'val', options:['Silver','Gold','Platinum'], value:p.rank }, cur:p.rank, effect:'This changes what sales-kit content the partner can access. Rank is assigned by hand — there is no automatic criteria check.' },
      program:   { title:'Change program',   perm:'EDIT_PARTNER_PROFILE', label:'Program membership', field:{ type:'select', key:'val', options:['Zero Investment','With Investment','Zero Investment + With Investment'], value:(p.programs||[]).join(' + ') }, cur:(p.programs||[]).join(', '), effect:'Adjusts which program flows the partner participates in.' }
    }[kind];
    var noteReq = kind === 'rank'; // ranks are manual → note is the "why"
    formDialog({
      title:cfg.title,
      intro:'<div class="effectbox">Current <b>'+esc(cfg.cur||'—')+'</b></div>',
      fields:[
        cfg.field,
        { type:'html', html:'<div class="effectbox">'+esc(cfg.effect)+'</div>' },
        { type:'textarea', key:'note', label:'Reason / note'+(noteReq?' (required)':' (optional)'), required:noteReq, placeholder: kind==='rank'?'Why this rank? e.g. Consistent conversion above team median for 3 months.':'Optional context for the audit trail.' }
      ],
      confirmLabel:'Apply change'
    }).then(function(v){
      if (!v) return;
      Perm.requirePermission(state.role, cfg.perm);
      var patch = {}, oldVal = cfg.cur;
      if (kind==='territory'){ /* store display only in prototype */ patch.territoryDisplay = v.val; }
      else if (kind==='team'){ patch.team = v.val; }
      else if (kind==='rank'){ patch.rank = v.val; }
      else if (kind==='program'){ patch.programs = v.val.split(' + '); }
      Ripples.mutate('ptr:'+p.id, patch);
      Audit.audit({ actor:actor(), action:'ASSIGN_'+kind.toUpperCase(), target:p.id+' · '+p.name, changes:{ from:oldVal, to:v.val, note:v.note||null } });
      C.toast({ type:'success', title:cfg.title.replace('Change','Changed'), text:p.name+': '+oldVal+' → '+v.val });
      after && after();
    });
  }

  // R02 — assign rank with required note (delegates to assignChange rank)
  function assignRank(p, after){ assignChange(p, 'rank', after); }

  // D05 — team-lead flag flip
  function toggleTeamLead(p, after){
    var making = !p.teamLead;
    C.confirmDialog({
      title:(making?'Make ':'Remove ')+'team lead',
      body:'<p>'+(making?'Flag':'Unflag')+' <b>'+esc(p.name)+'</b> ('+esc(p.id)+') as team lead for <b>'+esc(People.teamName(p.team))+'</b>? This is a boolean flag, not a role change.'+(making?'':' Their team roster and reports are unaffected (OPEN_QUESTIONS #12).')+'</p>',
      confirmLabel:(making?'Make team lead':'Remove flag')
    }).then(function(ok){
      if (!ok) return;
      Perm.requirePermission(state.role, 'MANAGE_TEAM');
      Ripples.mutate('ptr:'+p.id, { teamLead:making });
      Audit.audit({ actor:actor(), action:making?'ASSIGN_TEAM_LEAD':'REMOVE_TEAM_LEAD', target:p.id+' · '+p.name, changes:{ team:p.team } });
      C.toast({ type:'success', title:making?'Team lead assigned':'Team-lead flag removed', text:p.name });
      after && after();
    });
  }

  // D06 — move partner between teams/territories (explicit in-flight leads decision)
  function movePartner(p, after){
    formDialog({
      title:'Move partner',
      width:500,
      intro:'<p class="hint" style="margin-bottom:8px">Move <b>'+esc(p.name)+'</b> ('+esc(p.id)+') to a new team and/or territory.</p>',
      fields:[
        { type:'select', key:'team', label:'Team', options:teamOptions(), value:p.team||'' },
        { type:'select', key:'territory', label:'Territory', options:territoryOptions(p.territoryPath), value:People.pathStr(p.territoryPath) },
        { type:'radio', key:'leads', label:'In-flight leads (OPEN_QUESTIONS #6 — rule undefined)', value:'log', options:[
          { value:'keep', label:'Keep with partner', sub:'Leads follow the partner to the new team.' },
          { value:'reassign', label:'Reassign to new team lead', sub:'Open leads pass to the destination team lead.' },
          { value:'log', label:'Leave undecided — log the question', sub:'Recommended until Salmon defines the rule.' } ] }
      ],
      confirmLabel:'Move partner'
    }).then(function(v){
      if (!v) return;
      Perm.requirePermission(state.role, 'MOVE_PARTNER');
      Ripples.mutate('ptr:'+p.id, { team:v.team, territoryDisplay:v.territory });
      Audit.audit({ actor:actor(), action:'MOVE_PARTNER', target:p.id+' · '+p.name, changes:{ team:v.team, territory:v.territory, inFlightLeads:v.leads } });
      C.toast({ type:'success', title:'Partner moved', text:p.name+' → '+People.teamName(v.team)+(v.leads==='log'?' · lead rule logged as open question':'') });
      after && after();
    });
  }

  // D07 — generate referral code
  function generateReferral(after){
    formDialog({
      title:'Generate referral code',
      intro:'<p class="hint" style="margin-bottom:6px">Each code binds a team + territory. Lifetime is undefined (OPEN_QUESTIONS #11) — treated as permanent until deactivated.</p>',
      fields:[
        { type:'select', key:'team', label:'Team', options:teamOptions() },
        { type:'text', key:'code', label:'Code', required:true, placeholder:'e.g. CUM-ALPHA-8' }
      ],
      confirmLabel:'Generate code'
    }).then(function(v){
      if (!v) return;
      Perm.requirePermission(state.role, 'GENERATE_REFERRAL');
      Audit.audit({ actor:actor(), action:'GENERATE_REFERRAL', target:v.code, changes:{ team:v.team } });
      C.toast({ type:'success', title:'Referral code created', text:v.code+' → '+People.teamName(v.team) });
      after && after();
    });
  }

  /* ---- option builders ---- */
  function territoryOptions(currentPath){
    var opts = [];
    People.allPartners().forEach(function(p){ var s=People.pathStr(p.territoryPath); if (opts.indexOf(s)<0) opts.push(s); });
    People.allApplications().forEach(function(a){ var s=People.pathStr(a.territoryPath); if (opts.indexOf(s)<0) opts.push(s); });
    if (currentPath){ var cs=People.pathStr(currentPath); if (opts.indexOf(cs)<0) opts.unshift(cs); }
    return opts.sort();
  }
  function teamOptions(){ return [{value:'',label:'— No team —'}].concat(People.teams.map(function(t){ return { value:t.id, label:t.name+' · '+t.territory }; })); }

  /* ===================== reusable profile pieces ===================== */
  function partnerBand(p){
    var st = p.status || 'approved';
    var chip = C.StatusChip(st==='approved'?'available':st==='suspended'?'restricted':st==='rejected'?'rejected':'pending');
    // relabel via title on the chip container is overkill; use explicit chip label
    var statusLabel = { approved:'Active', suspended:'Suspended', rejected:'Rejected', pending:'Pending' }[st] || st;
    var statusCls = { approved:'green', suspended:'red', rejected:'red', pending:'amber' }[st] || 'grey';
    var days = p.joinedUtc ? Math.round((new Date(root.CRM_NOW)-new Date(p.joinedUtc))/86400000) : null;
    var terr = p.territoryDisplay || People.pathStr(p.territoryPath);
    return '<div class="profband"><div class="top">'+
      '<div class="photo">'+esc(initials(p.name))+'</div>'+
      '<div class="who"><h1>'+esc(p.name)+(p.teamLead?' <span class="pill">★ Team lead</span>':'')+'</h1>'+
      '<div class="pid">'+esc(p.id)+'</div></div>'+
      '<span class="chip '+statusCls+' statuschip"><span class="d"></span>'+statusLabel+'</span></div>'+
      '<div class="identity"><span>Territory <b>'+esc(terr)+'</b></span>'+
      (p.rank?'<span>Rank <b>'+esc(p.rank)+'</b></span>':'')+
      '<span>Program <b>'+esc((p.programs||[]).join(', '))+'</b></span>'+
      (p.joinedUtc?'<span>Joined <b>'+esc(fmt.dhaka(p.joinedUtc))+'</b></span><span><b>'+days+'</b> days as partner</span>':'<span>Not yet approved</span>')+
      '</div>'+ primaryActs(p) +'</div>';
  }
  function primaryActs(p){
    var acts = [];
    if (p.status==='pending'){
      acts.push({ label:'Approve', cls:'primary', fn:function(){ var a=People.applicationById(p.appId)||p; approveApplication(a, function(){ location.reload(); }); } });
      acts.push({ label:'Reject', cls:'danger', fn:function(){ var a=People.applicationById(p.appId)||p; rejectApplication(a, function(){ go('B02'); }); } });
    } else if (p.status==='suspended'){
      acts.push({ label:'Reactivate', cls:'primary', fn:function(){ reactivatePartner(p, function(){ location.reload(); }); } });
    } else {
      if ((p.stats&&p.stats.pendingSettlementBdt)>0) acts.push({ label:'Review pending settlement', cls:'primary', fn:function(){ go('B05',{id:p.id}); } });
      if (!p.team) acts.push({ label:'Assign to team', cls:acts.length?'':'primary', fn:function(){ assignChange(p,'team',function(){ location.reload(); }); } });
      acts.push({ label:'Change territory', cls:acts.length?'':'primary', fn:function(){ assignChange(p,'territory',function(){ location.reload(); }); } });
      acts.push({ label:'Change rank', cls:'', fn:function(){ assignChange(p,'rank',function(){ location.reload(); }); } });
      acts.push({ label:'Suspend', cls:'danger', fn:function(){ suspendPartner(p, function(){ location.reload(); }); } });
    }
    var wrap = '<div class="primaryacts" id="primaryacts">'+acts.map(function(a,i){ return '<button class="btn '+a.cls+'" data-pa="'+i+'"'+((a.cls==='primary'||a.cls==='danger')&&!Perm.can(state.role, actionPerm(a.label))?' disabled title="Your role can’t do this"':'')+'>'+esc(a.label)+'</button>'; }).join('')+'</div>';
    // defer wiring
    setTimeout(function(){ var el=document.getElementById('primaryacts'); if(!el)return; el.querySelectorAll('[data-pa]').forEach(function(b){ b.onclick=function(){ acts[+b.getAttribute('data-pa')].fn(); }; }); }, 0);
    return wrap;
  }
  function actionPerm(label){ return { 'Approve':'APPROVE_PARTNER','Reject':'REJECT_PARTNER','Suspend':'SUSPEND_PARTNER','Reactivate':'SUSPEND_PARTNER','Change rank':'ASSIGN_RANK','Change territory':'ASSIGN_TERRITORY','Assign to team':'MANAGE_TEAM' }[label] || 'EDIT_PARTNER_PROFILE'; }

  function partnerTabs(p, active){
    var tabs = [ ['profile','Profile',href('B03',{id:p.id})], ['pipeline','Pipeline',href('B04',{id:p.id})],
      ['earnings','Earnings',href('B05',{id:p.id})], ['activity','Activity log',href('B03',{id:p.id,tab:'activity'})],
      ['documents','Documents',href('B03',{id:p.id,tab:'documents'})] ];
    return '<div class="ptabs">'+tabs.map(function(t){ return '<a class="'+(t[0]===active?'on':'')+'" href="'+t[2]+'">'+t[1]+'</a>'; }).join('')+'</div>';
  }
  function rightRail(p){
    var s = p.stats||{};
    return '<div class="rightrail">'+
      '<div class="railcard"><h4>Quick stats · operator view</h4>'+
        '<div class="railstat"><span class="l">Leads this quarter</span><span class="v">'+(s.leadsQ||0)+'</span></div>'+
        '<div class="railstat"><span class="l">Target progress</span><span class="v">'+(s.targetPct||0)+'%</span></div>'+
        '<div class="progress"><i style="width:'+Math.min(100,s.targetPct||0)+'%"></i></div>'+
        '<div class="railstat" style="margin-top:8px"><span class="l">Approved commission</span><span class="v">'+fmt.bdt(s.approvedCommissionBdt||0)+'</span></div>'+
        '<div class="railstat"><span class="l">Pending settlement</span><span class="v">'+fmt.bdt(s.pendingSettlementBdt||0)+'</span></div>'+
      '</div>'+
      '<div class="railcard"><h4>Same numbers '+esc(p.name.split(' ')[0])+' sees</h4><p class="hint">These mirror the partner’s own mobile dashboard — nothing is computed on device; the panel and the phone read the same server values.</p></div>'+
    '</div>';
  }
  function timelineHtml(items){
    return '<div class="timeline">'+items.map(function(it){
      return '<div class="tl-row k-'+(it.kind||'')+'"><div class="tx"><span class="tl-kind">'+esc(it.kind||'')+'</span>'+esc(it.text)+'</div><div class="mt">'+esc(fmt.ago(it.t))+'</div></div>';
    }).join('')+'</div>';
  }
  function timeline(items){ return C.el(timelineHtml(items)); }
  function initials(name){ return name.split(' ').map(function(w){return w[0];}).slice(0,2).join('').toUpperCase(); }
  function kycChip(status){ var m={ pending:['amber','KYC pending'], verified:['green','Verified'], rejected:['red','Rejected'], notSubmitted:['grey','Not submitted'] }[status] || ['grey', status]; return '<span class="chip '+m[0]+'"><span class="d"></span>'+m[1]+'</span>'; }

  function auditNote(actorName, whenUtc, pid){
    var n = C.el(C.AuditNote({ actor:actorName||'—', when:whenUtc||root.CRM_NOW }));
    n.querySelector('.lk').onclick = function(){ C.toast({ type:'info', title:'Audit slice', text:'Opens the audit log filtered to '+(pid||'this record')+' (Super Admin · Part 7).' }); };
    return n;
  }

  /* ===================== SCREEN RENDERERS ===================== */
  var SCREENS = {};

  /* ---------- B02 · Approval queue (⭐) ---------- */
  SCREENS.B02 = { section:'B', title:'Partner approval queue', sub:'Oldest first · 2-business-day SLA', perm:'VIEW_PEOPLE',
    emptyState:function(){ return C.EmptyState({ icon:'✓', title:'No applications pending. Nice.', text:'Every partner application has been actioned. New submissions land here as they arrive.' }); },
    render:function(main){
      var apps = People.allApplications();
      main.innerHTML = header(this);
      if (!apps.length){ main.insertAdjacentHTML('beforeend', this.emptyState()); return; }
      var fbWrap = C.el('<div></div>'); main.appendChild(fbWrap);
      var tableWrap = C.el('<div></div>'); main.appendChild(tableWrap);
      var dt;
      C.FilterBar(fbWrap, { id:'b02', filters:[
        { key:'territory', label:'Territory', options:['Chattogram','Dhaka','Sylhet'] },
        { key:'program', label:'Program', options:['Zero Investment','With Investment'] },
        { key:'source', label:'Referral source', options:['Referral code','Referral link','Facebook campaign','Walk-in office','Direct app signup'] },
        { key:'from', label:'From', type:'date' }
      ], onChange:function(){ draw(); } });
      function ageDays(a){ return (new Date(root.CRM_NOW)-new Date(a.submittedUtc))/86400000; }
      function slaCls(a){ var d=ageDays(a); return d>=2?'over':d>=1.5?'warn':'ok'; }
      function filtered(){ var f=C.getFilters('b02'); return apps.filter(function(a){
        if (f.territory && a.territoryPath[0]!==f.territory) return false;
        if (f.program && (a.programs||[]).indexOf(f.program)<0) return false;
        if (f.source && (a.referral.source||'').indexOf(f.source)<0) return false;
        if (f.from && a.submittedUtc.slice(0,10) < f.from) return false;
        return true;
      }); }
      function draw(){
        dt = C.mountDataTable(tableWrap, {
          rowId:'appId', selectable:true, noun:'applications', defaultSort:'submittedUtc', defaultDir:1,
          rows: filtered(),
          columns:[
            { key:'name', label:'Applicant', strong:true, sortable:true, render:function(r){ return esc(r.name)+'<div class="mt" style="font-size:11px;color:var(--ink-muted)">'+esc(r.email)+'</div>'; } },
            { key:'phone', label:'Phone', render:function(r){ return esc(r.phone)+' '+(r.phoneVerified?'<span class="chip green" style="height:16px"><span class="d"></span>verified</span>':'<span class="chip amber" style="height:16px"><span class="d"></span>unverified</span>'); } },
            { key:'territory', label:'Requested territory', sortValue:function(r){return People.pathStr(r.territoryPath);}, render:function(r){ return esc(People.pathStr(r.territoryPath)); } },
            { key:'program', label:'Program', render:function(r){ return esc((r.programs||[]).join(', ')); } },
            { key:'referral', label:'Referred via', render:function(r){ return esc(r.referral.code||r.referral.source); } },
            { key:'submittedUtc', label:'Age', sortable:true, align:'right', render:function(r){ var d=ageDays(r); var lab=d<1?Math.round(d*24)+'h':Math.floor(d)+'d'; return '<span class="sla '+slaCls(r)+'">'+lab+'</span>'; } }
          ],
          rowActions:[
            { label:'Approve', icon:'✓', onClick:function(r){ approveApplication(r, draw); } },
            { label:'Reject', icon:'✕', danger:true, onClick:function(r){ rejectApplication(r, draw); } },
            { label:'Hold for review', icon:'⏸', onClick:function(r){ holdApplication(r, draw); } },
            { label:'Open profile', icon:'↗', onClick:function(r){ go('B03',{id:r.appId}); } }
          ],
          bulkActions:[ { label:'Bulk approve', cls:'primary', onClick:function(rows){ bulkApprove(rows, draw); } } ],
          onRowClick:function(r){ go('B03',{id:r.appId}); }
        });
      }
      draw();
      main.insertAdjacentHTML('beforeend', '<p class="metaline" style="margin-top:12px">Rows approaching the SLA turn amber; past it, red. Approving reveals the Partner ID before you confirm — it appears on the applicant’s welcome screen.</p>');
    }
  };

  /* ---------- B09 · Approve (deep-linked launcher) ⭐ ---------- */
  SCREENS.B09 = { section:'B', title:'Approve application', sub:'Confirmed action · issues a permanent Partner ID', perm:'APPROVE_PARTNER',
    render:function(main, P){
      var app = P.get('id') ? People.applicationById(P.get('id')) : People.allApplications()[0];
      main.innerHTML = header(this);
      if (!app){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'No application to approve', text:'The queue is clear.', actionLabel:'Back to queue' })); wireEmpty(main,'B02'); return; }
      main.insertAdjacentHTML('beforeend', applicantCard(app) + '<div class="primaryacts"><button class="btn primary" id="do-approve">Review & approve '+esc(app.name)+'</button><button class="btn" id="to-queue">Back to queue</button></div>');
      document.getElementById('do-approve').onclick = function(){ approveApplication(app, function(pid){ go('B03',{id:pid}); }); };
      document.getElementById('to-queue').onclick = function(){ go('B02'); };
    }
  };

  /* ---------- B08 · Reject (deep-linked launcher) ---------- */
  SCREENS.B08 = { section:'B', title:'Reject application', sub:'The reason is shown on the applicant’s phone', perm:'REJECT_PARTNER',
    render:function(main, P){
      var app = P.get('id') ? People.applicationById(P.get('id')) : People.allApplications()[0];
      main.innerHTML = header(this);
      if (!app){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'No application to reject', text:'The queue is clear.' })); return; }
      main.insertAdjacentHTML('beforeend', applicantCard(app) + '<div class="primaryacts"><button class="btn danger" id="do-reject">Reject '+esc(app.name)+' with a reason</button><button class="btn" id="to-queue">Back to queue</button></div>');
      document.getElementById('do-reject').onclick = function(){ rejectApplication(app, function(){ go('B02'); }); };
      document.getElementById('to-queue').onclick = function(){ go('B02'); };
    }
  };

  /* ---------- B10 · Bulk approve ---------- */
  SCREENS.B10 = { section:'B', title:'Bulk approve queue', sub:'For straightforward batches · one audit entry per partner', perm:'APPROVE_PARTNER',
    render:function(main){
      var apps = People.allApplications();
      main.innerHTML = header(this);
      if (!apps.length){ main.insertAdjacentHTML('beforeend', C.EmptyState({ icon:'✓', title:'Nothing to bulk-approve', text:'The queue is clear.' })); return; }
      main.insertAdjacentHTML('beforeend','<p class="metaline">Select applicants that meet the same criteria, then Bulk approve. Capped at 20 per action (OPEN_QUESTIONS #3).</p>');
      var tableWrap = C.el('<div></div>'); main.appendChild(tableWrap);
      var dt = C.mountDataTable(tableWrap, {
        rowId:'appId', selectable:true, noun:'applications', rows:apps,
        columns:[
          { key:'name', label:'Applicant', strong:true },
          { key:'territory', label:'Territory', render:function(r){ return esc(People.pathStr(r.territoryPath)); } },
          { key:'program', label:'Program', render:function(r){ return esc((r.programs||[]).join(', ')); } },
          { key:'pid', label:'Will become', render:function(r){ return '<span class="mono" style="font-size:12px">'+esc(nextPartnerId(r))+'</span>'; } }
        ],
        bulkActions:[ { label:'Bulk approve selected', cls:'primary', onClick:function(rows){ bulkApprove(rows, function(){ location.reload(); }); } } ]
      });
      var all = C.el('<div class="primaryacts"><button class="btn primary" id="ba-all">Select all & bulk approve</button></div>'); main.appendChild(all);
      document.getElementById('ba-all').onclick = function(){ bulkApprove(apps, function(){ location.reload(); }); };
    }
  };

  function applicantCard(app){
    return '<div class="card"><h3>Application '+esc(app.appId)+'</h3><dl class="kv">'+
      '<dt>Name</dt><dd>'+esc(app.name)+'</dd>'+
      '<dt>Phone</dt><dd>'+esc(app.phone)+' '+(app.phoneVerified?'· verified':'· <span style="color:var(--amber)">unverified</span>')+'</dd>'+
      '<dt>Email</dt><dd>'+esc(app.email)+'</dd>'+
      '<dt>Requested territory</dt><dd>'+esc(People.pathStr(app.territoryPath))+'</dd>'+
      '<dt>Program(s)</dt><dd>'+esc((app.programs||[]).join(', '))+'</dd>'+
      '<dt>Referred via</dt><dd>'+esc(app.referral.code||app.referral.source)+'</dd>'+
      '<dt>Submitted</dt><dd>'+esc(fmt.ago(app.submittedUtc))+'</dd></dl></div>';
  }
  function wireEmpty(main, screen){ var b=main.querySelector('[data-empty-act]'); if(b) b.onclick=function(){ go(screen); }; }

  /* ---------- B01 · Partners list ---------- */
  SCREENS.B01 = { section:'B', title:'Partners', sub:'All approved partners', perm:'VIEW_PEOPLE',
    render:function(main){
      var partners = People.allPartners().filter(function(p){ return p.status!=='rejected' && !p._fromApp; });
      main.innerHTML = header(this);
      var fbWrap = C.el('<div></div>'); main.appendChild(fbWrap);
      var tableWrap = C.el('<div></div>'); main.appendChild(tableWrap);
      C.FilterBar(fbWrap, { id:'b01', filters:[
        { key:'rank', label:'Rank', options:['Silver','Gold','Platinum'] },
        { key:'program', label:'Program', options:['Zero Investment','With Investment'] },
        { key:'status', label:'Status', options:['approved','suspended'] },
        { key:'division', label:'Division', options:['Chattogram','Dhaka','Sylhet'] }
      ], onChange:draw });
      function filtered(){ var f=C.getFilters('b01'); return partners.filter(function(p){
        if (f.rank && p.rank!==f.rank) return false;
        if (f.program && (p.programs||[]).indexOf(f.program)<0) return false;
        if (f.status && p.status!==f.status) return false;
        if (f.division && p.territoryPath[0]!==f.division) return false;
        return true;
      }); }
      function draw(){
        C.mountDataTable(tableWrap, {
          rowId:'id', selectable:true, noun:'partners', defaultSort:'name', rows:filtered(),
          columns:[
            { key:'id', label:'Partner ID', render:function(r){ return '<span class="mono" style="font-size:12px">'+esc(r.id)+'</span>'; } },
            { key:'name', label:'Name', strong:true, sortable:true },
            { key:'territory', label:'Territory', sortValue:function(r){return People.pathStr(r.territoryPath);}, render:function(r){ return esc(r.territoryDisplay||People.pathStr(r.territoryPath)); } },
            { key:'rank', label:'Rank', sortable:true, render:function(r){ return '<span class="pill rank-'+r.rank+'">'+esc(r.rank)+'</span>'; } },
            { key:'program', label:'Program', render:function(r){ return esc((r.programs||[]).join(', ')); } },
            { key:'status', label:'Status', render:function(r){ var m={approved:['green','Active'],suspended:['red','Suspended']}[r.status]||['grey',r.status]; return '<span class="chip '+m[0]+'"><span class="d"></span>'+m[1]+'</span>'; } },
            { key:'leads30', label:'Leads 30d', align:'right', sortable:true, sortValue:function(r){return r.stats.leads30||0;}, render:function(r){ return r.stats.leads30||0; } },
            { key:'commission30', label:'Comm. 30d', align:'right', sortValue:function(r){return r.stats.commission30||0;}, render:function(r){ return fmt.bdt(r.stats.commission30||0); } },
            { key:'joinedUtc', label:'Joined', sortable:true, render:function(r){ return r.joinedUtc?esc(fmt.dhaka(r.joinedUtc)):'—'; } }
          ],
          rowActions:[
            { label:'Open profile', icon:'↗', onClick:function(r){ go('B03',{id:r.id}); } },
            { label:'Change rank', icon:'◆', onClick:function(r){ assignChange(r,'rank',draw); } },
            { label:'Suspend', icon:'⏸', danger:true, disabled:function(r){ return r.status==='suspended'; }, onClick:function(r){ suspendPartner(r, draw); } },
            { label:'Message', icon:'✉', onClick:function(r){ C.toast({type:'info',title:'Message',text:'Messaging lives in Part 7 (Communications).'}); } }
          ],
          bulkActions:[
            { label:'Assign to team', onClick:function(rows){ C.toast({type:'info',title:'Bulk assign',text:rows.length+' partners — bulk team assignment opens the assign modal per selection in the build.'}); } },
            { label:'Change rank', onClick:function(rows){ C.toast({type:'info',title:'Bulk rank change',text:rows.length+' selected — rank is admin-only and audited per partner.'}); } }
          ],
          onRowClick:function(r){ go('B03',{id:r.id}); }
        });
      }
      draw();
    }
  };

  /* ---------- B03 · Partner profile (story) ---------- */
  SCREENS.B03 = { section:'B', title:'Partner profile', perm:'VIEW_PEOPLE',
    render:function(main, P){
      var id = P.get('id'); var tab = P.get('tab') || 'profile';
      var p = id ? People.partnerOrApplicant(id) : People.allPartners()[0];
      main.innerHTML = submodnav('B');
      if (!p){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'Partner not found', text:'No partner or applicant matches “'+esc(id||'')+'”.', actionLabel:'Back to partners' })); wireEmpty(main,'B01'); return; }
      main.insertAdjacentHTML('beforeend', partnerBand(p));
      main.insertAdjacentHTML('beforeend', partnerTabs(p, tab==='activity'||tab==='documents'?tab:'profile'));
      var body = C.el('<div class="proflayout"><div id="tabbody"></div>'+rightRail(p)+'</div>');
      main.appendChild(body);
      var tb = body.querySelector('#tabbody');
      if (tab==='activity'){
        tb.innerHTML = '<div class="card"><h3>Activity log — chronological</h3>'+'</div>';
        tb.querySelector('.card').appendChild(timeline(People.activityFor(p.id)));
      } else if (tab==='documents'){
        tb.innerHTML = '<div class="card"><h3>Documents</h3><p class="hint">Partner agreement, ID copy, and signed program terms. Document management ships with the Legal module — this tab reads the same store.</p><dl class="kv" style="margin-top:10px"><dt>Partner agreement</dt><dd>Signed · '+(p.joinedUtc?esc(fmt.dhaka(p.joinedUtc)):'—')+'</dd><dt>ID copy</dt><dd>On file</dd><dt>Program terms</dt><dd>'+esc((p.programs||[]).join(', '))+'</dd></dl></div>';
      } else {
        tb.innerHTML =
          '<div class="card"><h3>Contact</h3><dl class="kv"><dt>Phone</dt><dd>'+esc(p.phone||'—')+'</dd><dt>Email</dt><dd>'+esc(p.email||'—')+'</dd></dl></div>'+
          '<div class="card"><h3>Membership</h3><dl class="kv"><dt>Territory</dt><dd>'+esc(p.territoryDisplay||People.pathStr(p.territoryPath))+'</dd><dt>Team</dt><dd>'+esc(People.teamName(p.team))+(p.teamLead?' · <b>team lead</b>':'')+'</dd><dt>Rank</dt><dd><span class="pill rank-'+(p.rank||'Silver')+'">'+esc(p.rank||'—')+'</span> <span class="linkrow" id="rank-hist">rank history</span></dd><dt>Program</dt><dd>'+esc((p.programs||[]).join(', '))+'</dd></dl></div>'+
          (p.status==='suspended'&&p.suspension?'<div class="card" style="border-color:#e6c9c6"><h3>Suspension</h3><dl class="kv"><dt>Reason</dt><dd>'+esc(p.suspension.reason)+'</dd><dt>Effective</dt><dd>'+esc(fmt.dhaka(p.suspension.effectiveUtc))+'</dd><dt>Mobile access</dt><dd>'+(p.suspension.blocksApp?'Blocked (P09)':'New leads blocked')+'</dd></dl></div>':'')+
          (p.status==='rejected'?'<div class="card" style="border-color:#e6c9c6"><h3>Rejection</h3><p class="hint">This reason is shown on the applicant’s mobile P08 screen:</p><div class="effectbox" style="margin-top:8px">'+esc(p.rejectionReason||'—')+'</div></div>':'')+
          '<div class="card"><h3>Recent activity</h3></div>';
        var rc = tb.querySelectorAll('.card'); rc[rc.length-1].appendChild(timeline(People.activityFor(p.id).slice(0,4)));
        var rh = tb.querySelector('#rank-hist'); if (rh) rh.onclick=function(){ go('R03',{id:p.id}); };
      }
      tb.appendChild(auditNote(actor().name, root.CRM_NOW, p.id));
    }
  };

  /* ---------- B04 · Pipeline (read-only stub) ---------- */
  SCREENS.B04 = { section:'B', title:'Partner pipeline', perm:'VIEW_PEOPLE',
    render:function(main, P){
      var p = People.partnerOrApplicant(P.get('id')) || People.allPartners()[0];
      main.innerHTML = submodnav('B');
      if (!p){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'Partner not found' })); return; }
      main.insertAdjacentHTML('beforeend', partnerBand(p) + partnerTabs(p,'pipeline'));
      var wrap = C.el('<div></div>'); main.appendChild(wrap);
      wrap.innerHTML = '<p class="metaline">Leads, meetings and bookings owned by this partner. Read-only preview — the live tables connect in Part 4 (Sales Pipeline).</p>';
      var rows = (CRM.leadsAwaiting||[]).map(function(l){ return { id:l.id, name:l.name, project:l.project, status:l.status, partner:l.partner }; }).filter(function(l){ return l.partner===p.name; });
      if (!rows.length) rows = [{ id:'LD-'+p.id.slice(-3)+'a', name:'—', project:'(stubbed)', status:'submitted', partner:p.name }];
      var tw = C.el('<div></div>'); wrap.appendChild(tw);
      C.mountDataTable(tw, { rowId:'id', noun:'leads', rows:rows, columns:[
        { key:'id', label:'Lead' }, { key:'name', label:'Client', strong:true }, { key:'project', label:'Project' },
        { key:'status', label:'Status', render:function(r){ return C.StatusChip(r.status); } }
      ] });
      wrap.appendChild(auditNote(actor().name, root.CRM_NOW, p.id));
    }
  };

  /* ---------- B05 · Earnings (read-only preview) ---------- */
  SCREENS.B05 = { section:'B', title:'Partner earnings', perm:'VIEW_PEOPLE',
    render:function(main, P){
      var p = People.partnerOrApplicant(P.get('id')) || People.allPartners()[0];
      main.innerHTML = submodnav('B');
      if (!p){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'Partner not found' })); return; }
      main.insertAdjacentHTML('beforeend', partnerBand(p) + partnerTabs(p,'earnings'));
      var s=p.stats||{};
      main.insertAdjacentHTML('beforeend', '<p class="metaline">Read-only preview. Commission approval and settlement release are Finance actions in Part 6 — no money moves from this screen.</p>'+
        C.metricsRow([
          { label:'Approved commission', value:fmt.bdt(s.approvedCommissionBdt||0) },
          { label:'Pending settlement', value:fmt.bdt(s.pendingSettlementBdt||0) },
          { label:'Commission (30d)', value:fmt.bdt(s.commission30||0) },
          { label:'Target progress', value:(s.targetPct||0)+'%' }
        ]));
      main.insertAdjacentHTML('beforeend','<div class="card" style="margin-top:14px"><h3>Settlement history (stub)</h3><p class="hint">Populated from Part 6 finance data. The profile shape is ready; the ledger connects later.</p></div>');
      main.appendChild(auditNote(actor().name, root.CRM_NOW, p.id));
    }
  };

  /* ---------- B06 · Assign / change (single reused modal) ---------- */
  SCREENS.B06 = { section:'B', title:'Assign / change', sub:'Territory · team · rank · program — every change audited old→new', perm:'EDIT_PARTNER_PROFILE',
    render:function(main, P){
      var p = People.partnerOrApplicant(P.get('id')) || People.allPartners()[0];
      main.innerHTML = header(this);
      if (!p){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'Pick a partner first', text:'Open a partner and choose Assign / change.', actionLabel:'Partners list' })); wireEmpty(main,'B01'); return; }
      main.insertAdjacentHTML('beforeend', partnerBand(p));
      main.insertAdjacentHTML('beforeend', '<div class="card"><h3>What would you like to change?</h3><p class="hint" style="margin-bottom:10px">One modal handles all four. Each shows current → new, an effect summary, and a note field. Rank is admin-only.</p><div class="primaryacts">'+
        '<button class="btn" data-ch="territory">Territory</button>'+
        '<button class="btn" data-ch="team">Team</button>'+
        '<button class="btn" data-ch="rank"'+(Perm.can(state.role,'ASSIGN_RANK')?'':' disabled title="Rank is admin-only"')+'>Rank</button>'+
        '<button class="btn" data-ch="program">Program</button>'+
      '</div></div>');
      main.querySelectorAll('[data-ch]').forEach(function(b){ b.onclick=function(){ assignChange(p, b.getAttribute('data-ch'), function(){ location.reload(); }); }; });
      main.appendChild(auditNote(actor().name, root.CRM_NOW, p.id));
    }
  };

  /* ---------- B07 · Suspend / reactivate ---------- */
  SCREENS.B07 = { section:'B', title:'Suspend / reactivate', perm:'SUSPEND_PARTNER',
    render:function(main, P){
      var p = People.partnerOrApplicant(P.get('id')) || People.allPartners().filter(function(x){return x.status==='approved';})[0];
      main.innerHTML = header(this);
      if (!p){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'Pick a partner', actionLabel:'Partners list' })); wireEmpty(main,'B01'); return; }
      main.insertAdjacentHTML('beforeend', partnerBand(p));
      var isSusp = p.status==='suspended';
      main.insertAdjacentHTML('beforeend', '<div class="card"><h3>'+(isSusp?'Reactivate':'Suspend')+' this partner</h3><p class="hint" style="margin-bottom:10px">'+(isSusp?'Restoring '+esc(p.name)+' returns their mobile access and previous state. Audit-only.':'Suspension requires a reason and an effective time, and shows the P09 state on '+esc(p.name)+'’s phone.')+'</p><div class="primaryacts"><button class="btn '+(isSusp?'primary':'danger')+'" id="do-sr">'+(isSusp?'Reactivate '+esc(p.name):'Suspend '+esc(p.name))+'</button></div></div>');
      document.getElementById('do-sr').onclick = function(){ (isSusp?reactivatePartner:suspendPartner)(p, function(){ location.reload(); }); };
      main.appendChild(auditNote(actor().name, root.CRM_NOW, p.id));
    }
  };

  /* ===================== C — Clients ===================== */

  /* ---------- C01 · Clients list ---------- */
  SCREENS.C01 = { section:'C', title:'Global clients', sub:'Buyers across every project', perm:'VIEW_PEOPLE',
    render:function(main){
      var clients = People.allClients();
      main.innerHTML = header(this);
      var fbWrap=C.el('<div></div>'); main.appendChild(fbWrap);
      var tableWrap=C.el('<div></div>'); main.appendChild(tableWrap);
      C.FilterBar(fbWrap, { id:'c01', filters:[
        { key:'kyc', label:'KYC status', options:['pending','verified','rejected','notSubmitted'] },
        { key:'project', label:'Interest', options:['Salmon Oasis Park','The ROSSA','Salmon Bellissimo'] }
      ], onChange:draw });
      function filtered(){ var f=C.getFilters('c01'); return clients.filter(function(c){
        if (f.kyc && c.kycStatus!==f.kyc) return false;
        if (f.project && c.interest!==f.project) return false; return true; }); }
      function draw(){
        C.mountDataTable(tableWrap, { rowId:'id', selectable:true, noun:'clients', defaultSort:'name', rows:filtered(),
          columns:[
            { key:'name', label:'Client', strong:true, sortable:true },
            { key:'location', label:'Location' },
            { key:'interest', label:'Interested in' },
            { key:'partnerId', label:'Sourced by', render:function(r){ return r.partnerId?'<span class="mono" style="font-size:12px">'+esc(r.partnerId)+'</span>':'<span class="muted">Direct</span>'; } },
            { key:'kycStatus', label:'KYC', sortable:true, render:function(r){ return kycChip(r.kycStatus); } }
          ],
          rowActions:[
            { label:'Open profile', icon:'↗', onClick:function(r){ go('C02',{id:r.id}); } },
            { label:'Communication log', icon:'✉', onClick:function(r){ go('C06',{id:r.id}); } }
          ],
          onRowClick:function(r){ go('C02',{id:r.id}); } });
      }
      draw();
    }
  };

  /* ---------- C02 · Client profile ---------- */
  SCREENS.C02 = { section:'C', title:'Client profile', perm:'VIEW_PEOPLE',
    render:function(main, P){
      var c = P.get('id') ? People.clientById(P.get('id')) : People.allClients()[0];
      main.innerHTML = submodnav('C');
      if (!c){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'Client not found', actionLabel:'Clients list' })); wireEmpty(main,'C01'); return; }
      main.insertAdjacentHTML('beforeend',
        '<div class="profband"><div class="top"><div class="photo">'+esc(initials(c.name))+'</div>'+
        '<div class="who"><h1>'+esc(c.name)+'</h1><div class="pid">'+esc(c.id)+' · '+esc(c.location)+'</div></div>'+
        kycChip(c.kycStatus)+'</div>'+
        '<div class="identity"><span>Email <b>'+esc(c.email)+'</b></span><span>Phone <b>'+esc(c.phone)+'</b></span><span>Interested in <b>'+esc(c.interest)+'</b></span><span>Sourced by <b>'+esc(c.partnerId||'Direct')+'</b></span></div>'+
        '<div class="primaryacts">'+(c.kycStatus==='pending'?'<button class="btn primary" id="to-kyc">Review KYC</button>':'')+'<button class="btn" id="to-act">Activity</button><button class="btn" id="to-comm">Communication log</button></div></div>');
      main.insertAdjacentHTML('beforeend',
        '<div class="split2"><div class="card"><h3>KYC</h3><dl class="kv"><dt>Status</dt><dd>'+kycChip(c.kycStatus)+'</dd>'+
        (c.kyc.type?'<dt>Document</dt><dd>'+esc(c.kyc.type)+'</dd>':'')+
        (c.kyc.submittedUtc?'<dt>Submitted</dt><dd>'+esc(fmt.ago(c.kyc.submittedUtc))+'</dd>':'')+
        (c.kyc.verifiedUtc?'<dt>Verified</dt><dd>'+esc(fmt.dhaka(c.kyc.verifiedUtc))+' · '+esc(c.kyc.verifiedBy||'')+'</dd>':'')+
        (c.kyc.reason?'<dt>Reason</dt><dd>'+esc(c.kyc.reason)+'</dd>':'')+
        '</dl>'+(c.kycStatus==='pending'?'<div class="gap"></div><button class="btn primary" id="to-kyc2">Open KYC document</button>':'')+'</div>'+
        '<div class="card"><h3>Preferences</h3><dl class="kv"><dt>Language</dt><dd>বাংলা (Bengali-first)</dd><dt>Contact</dt><dd>WhatsApp / email</dd><dt>Budget band</dt><dd>Undisclosed</dd></dl><p class="hint" style="margin-top:8px">Clients self-serve — there is no approve/reject for a client. Intervention points are KYC, suspension (rare), and support.</p></div></div>');
      var abody = C.el('<div class="card"><h3>Recent activity</h3></div>'); main.appendChild(abody);
      abody.appendChild(timeline(People.clientActivity(c.id).slice(0,4)));
      main.appendChild(auditNote(actor().name, root.CRM_NOW, c.id));
      ['to-kyc','to-kyc2'].forEach(function(idb){ var b=document.getElementById(idb); if(b) b.onclick=function(){ go('C05',{id:c.id}); }; });
      var a=document.getElementById('to-act'); if(a) a.onclick=function(){ go('C03',{id:c.id}); };
      var m=document.getElementById('to-comm'); if(m) m.onclick=function(){ go('C06',{id:c.id}); };
    }
  };

  /* ---------- C03 · Client activity ---------- */
  SCREENS.C03 = { section:'C', title:'Client activity', perm:'VIEW_PEOPLE',
    render:function(main, P){
      var c = P.get('id') ? People.clientById(P.get('id')) : People.allClients()[0];
      main.innerHTML = header(this);
      if (!c){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'Client not found' })); return; }
      main.insertAdjacentHTML('beforeend','<p class="metaline">Bookings, payments, meetings and tickets for <b>'+esc(c.name)+'</b> — read-only summaries.</p>');
      var card=C.el('<div class="card"><h3>Activity — chronological</h3></div>'); main.appendChild(card);
      card.appendChild(timeline(People.clientActivity(c.id)));
      main.appendChild(auditNote(actor().name, root.CRM_NOW, c.id));
    }
  };

  /* ---------- C04 · KYC review queue (⭐) ---------- */
  SCREENS.C04 = { section:'C', title:'KYC review queue', sub:'Legal / Document Controller · oldest first', perm:'REVIEW_KYC',
    emptyState:function(){ return C.EmptyState({ icon:'✓', title:'No pending KYC reviews.', text:'Every uploaded document has been actioned.' }); },
    render:function(main){
      var q = People.kycQueue();
      main.innerHTML = header(this);
      if (!q.length){ main.insertAdjacentHTML('beforeend', this.emptyState()); return; }
      var fbWrap=C.el('<div></div>'); main.appendChild(fbWrap);
      var tableWrap=C.el('<div></div>'); main.appendChild(tableWrap);
      C.FilterBar(fbWrap, { id:'c04', filters:[
        { key:'doc', label:'Document', options:['Passport','NID'] },
        { key:'from', label:'From', type:'date' }
      ], onChange:draw });
      function ageH(c){ return (new Date(root.CRM_NOW)-new Date(c.kyc.submittedUtc))/3600000; }
      function filtered(){ var f=C.getFilters('c04'); return q.filter(function(c){ if (f.doc && c.kyc.type!==f.doc) return false; if (f.from && c.kyc.submittedUtc.slice(0,10)<f.from) return false; return true; }); }
      function draw(){
        C.mountDataTable(tableWrap, { rowId:'id', selectable:true, noun:'documents', defaultSort:'sub', defaultDir:1, rows:filtered(),
          columns:[
            { key:'name', label:'Client', strong:true },
            { key:'doc', label:'Document', render:function(r){ return esc(r.kyc.type); } },
            { key:'location', label:'Location' },
            { key:'sub', label:'Submitted', sortable:true, sortValue:function(r){return r.kyc.submittedUtc;}, render:function(r){ return esc(fmt.ago(r.kyc.submittedUtc)); } },
            { key:'age', label:'Age', align:'right', sortable:true, sortValue:function(r){return ageH(r);}, render:function(r){ var h=ageH(r); var cls=h>=48?'over':h>=36?'warn':'ok'; return '<span class="sla '+cls+'">'+(h<24?Math.round(h)+'h':Math.floor(h/24)+'d')+'</span>'; } },
            { key:'status', label:'Status', render:function(){ return kycChip('pending'); } }
          ],
          rowActions:[
            { label:'Open document', icon:'↗', onClick:function(r){ go('C05',{id:r.id}); } },
            { label:'Client profile', icon:'👤', onClick:function(r){ go('C02',{id:r.id}); } }
          ],
          bulkActions:[ { label:'Open first for review', cls:'primary', onClick:function(rows){ go('C05',{id:rows[0].id}); } } ],
          onRowClick:function(r){ go('C05',{id:r.id}); } });
      }
      draw();
    }
  };

  /* ---------- C05 · KYC document viewer + decision (⭐) ---------- */
  SCREENS.C05 = { section:'C', title:'KYC document', sub:'Split view · every view is logged', perm:'VIEW_KYC_DOCUMENT',
    render:function(main, P){
      var c = P.get('id') ? People.clientById(P.get('id')) : People.kycQueue()[0];
      main.innerHTML = header(this);
      if (!c){ main.insertAdjacentHTML('beforeend', this.emptyState ? this.emptyState() : C.EmptyState({ title:'No document', text:'Nothing to review.' })); return; }
      if (c.kycStatus!=='pending'){
        main.insertAdjacentHTML('beforeend', C.EmptyState({ icon:'✓', title:'Already decided', text:c.name+'’s KYC is '+c.kycStatus+'. No action needed.', actionLabel:'Back to queue' })); wireEmpty(main,'C04'); return;
      }
      // log the access (requirement: every view logged)
      Audit.audit({ actor:actor(), action:'VIEW_KYC_DOCUMENT', target:c.id+' · '+c.name+' · '+c.kyc.type });

      var pages = c.kyc.pages || 1;
      main.insertAdjacentHTML('beforeend',
        '<div class="kycsplit"><div class="docpane">'+
          '<div class="doctools"><button class="tbtn" data-z="out">−</button><button class="tbtn" data-z="in">+</button><button class="tbtn" data-rot title="Rotate">⟳</button>'+
            '<button class="tbtn" data-pg="prev" title="Previous page">‹</button><span class="pg" data-pgl>Page 1 / '+pages+'</span><button class="tbtn" data-pg="next" title="Next page">›</button>'+
            '<span class="spacer"></span><span class="viewlogged">● Viewing logged</span></div>'+
          '<div class="docstage"><div class="docimg" id="docimg">'+docFace(c,1)+'</div></div>'+
        '</div>'+
        '<div class="decisionpanel"><h3 style="font-size:12.5px;font-weight:800;text-transform:uppercase;color:var(--ink-2);margin-bottom:10px">Verify against profile</h3>'+
          compareRows(c)+
          '<div class="field"><label>Decision</label><div class="radiogrp" id="kyc-dec">'+
            '<label class="radioopt sel"><input type="radio" name="kd" value="verify" checked><span><span class="rl">Verify</span><span class="rs">Unlocks the client’s ability to transact.</span></span></label>'+
            '<label class="radioopt"><input type="radio" name="kd" value="resubmit"><span><span class="rl">Request resubmission</span><span class="rs">Ask for a new upload — reason shown on their phone.</span></span></label>'+
            '<label class="radioopt"><input type="radio" name="kd" value="reject"><span><span class="rl">Reject</span><span class="rs">Structured reason required — shown on their phone.</span></span></label>'+
          '</div></div>'+
          '<div id="reason-wrap" style="display:none"><div class="field"><label>Reason <span class="req">*</span></label><select id="kyc-reason">'+KYC_REJECT_REASONS.map(function(r){return '<option>'+esc(r)+'</option>';}).join('')+'</select></div>'+
            '<div class="field"><label>Note to client</label><textarea id="kyc-note" placeholder="e.g. Passport expired — please upload a current one."></textarea></div>'+
            '<div class="mobilenote">📱 This reason and note are shown to <b>'+esc(c.name)+'</b> in the mobile app.</div></div>'+
          '<button class="btn primary" id="kyc-confirm" style="width:100%;justify-content:center;margin-top:6px">Confirm decision</button>'+
        '</div></div>');

      // doc tools
      var img=document.getElementById('docimg'); var zoom=1, rot=0, page=1;
      function apply(){ img.style.transform='scale('+zoom+') rotate('+rot+'deg)'; }
      main.querySelector('[data-z="in"]').onclick=function(){ zoom=Math.min(2,zoom+0.15); apply(); };
      main.querySelector('[data-z="out"]').onclick=function(){ zoom=Math.max(0.6,zoom-0.15); apply(); };
      main.querySelector('[data-rot]').onclick=function(){ rot=(rot+90)%360; apply(); };
      main.querySelector('[data-pg="next"]').onclick=function(){ if(page<pages){ page++; img.innerHTML=docFace(c,page); main.querySelector('[data-pgl]').textContent='Page '+page+' / '+pages; } };
      main.querySelector('[data-pg="prev"]').onclick=function(){ if(page>1){ page--; img.innerHTML=docFace(c,page); main.querySelector('[data-pgl]').textContent='Page '+page+' / '+pages; } };

      // decision radios
      var reasonWrap=document.getElementById('reason-wrap');
      main.querySelectorAll('#kyc-dec .radioopt').forEach(function(opt){ opt.onclick=function(){ main.querySelectorAll('#kyc-dec .radioopt').forEach(function(o){o.classList.remove('sel');}); opt.classList.add('sel'); opt.querySelector('input').checked=true; var v=opt.querySelector('input').value; reasonWrap.style.display=(v==='reject'||v==='resubmit')?'block':'none'; }; });

      document.getElementById('kyc-confirm').onclick=function(){
        var dec=(main.querySelector('#kyc-dec input:checked')||{}).value;
        if (dec==='verify'){
          Perm.requirePermission(state.role,'VERIFY_KYC');
          C.confirmDialog({ title:'Verify KYC', body:'<p>Confirm <b>'+esc(c.name)+'</b>’s '+esc(c.kyc.type)+' as verified? This unlocks their ability to transact and flips their mobile KYC status to <b>verified</b>.</p>', confirmLabel:'Verify' }).then(function(ok){
            if(!ok) return;
            Ripples.mutate('cli:'+c.id, { kycStatus:'verified', kyc:{ verifiedUtc:root.CRM_NOW, verifiedBy:actor().name } });
            Audit.audit({ actor:actor(), action:'VERIFY_KYC', target:c.id+' · '+c.name });
            Ripples.emit({ mobileId:c.mobileId||c.id, kind:'client', status:'verified', screen:'KYC · Verified', name:c.name, headline:'Verified KYC — '+c.name+' can now transact' });
            C.toast({ type:'success', persist:true, title:'KYC verified', text:c.name+' can now transact.', ripple:'client’s KYC screen flips to verified' });
            go('C04');
          });
        } else {
          var reason=document.getElementById('kyc-reason').value;
          var note=document.getElementById('kyc-note').value.trim();
          var full = reason + (note?' — '+note:'');
          Perm.requirePermission(state.role,'VERIFY_KYC');
          var isReject = dec==='reject';
          C.confirmDialog({ title:isReject?'Reject KYC':'Request resubmission', danger:isReject,
            body:'<p>'+(isReject?'Reject':'Ask '+esc(c.name)+' to resubmit')+' with reason:</p><div class="effectbox" style="margin-top:8px">'+esc(full)+'</div><p class="hint" style="margin-top:8px">Shown verbatim on the client’s phone.</p>', confirmLabel:isReject?'Reject KYC':'Request resubmission' }).then(function(ok){
            if(!ok) return;
            Ripples.mutate('cli:'+c.id, { kycStatus:isReject?'rejected':'pending', kyc:{ reason:full, rejectedUtc:root.CRM_NOW, rejectedBy:actor().name } });
            Audit.audit({ actor:actor(), action:isReject?'REJECT_KYC':'REQUEST_KYC_RESUBMISSION', target:c.id+' · '+c.name, changes:{ reason:full } });
            Ripples.emit({ mobileId:c.mobileId||c.id, kind:'client', status:isReject?'rejected':'pending', screen:isReject?'KYC · Declined':'KYC · Resubmit', name:c.name, reason:full, headline:(isReject?'Rejected':'Resubmission requested for')+' '+c.name+'’s KYC' });
            C.toast({ type:isReject?'warning':'info', persist:true, title:isReject?'KYC rejected':'Resubmission requested', text:c.name+' has been notified.', ripple:'reason shown on client’s KYC screen' });
            go('C04');
          });
        }
      };
      main.insertAdjacentHTML('beforeend','<p class="metaline" style="margin-top:12px">Access to this screen requires <span class="mono">VIEW_KYC_DOCUMENT</span>. This view has been recorded in the document-access log.</p>');
    }
  };
  function docFace(c, page){
    var name = c.kyc.nameOnDoc || c.name;
    if (c.kyc.type==='Passport'){
      return '<div class="dphoto">🪪</div><div class="dh">PASSPORT · '+(page===1?'BIO PAGE':'PAGE '+page)+'</div>'+
        '<div class="drow"><span>Surname</span><span>'+esc(name.split(' ').slice(-1)[0])+'</span></div>'+
        '<div class="drow"><span>Given</span><span>'+esc(name.split(' ').slice(0,-1).join(' '))+'</span></div>'+
        '<div class="drow"><span>DOB</span><span>'+esc(c.kyc.dob||'—')+'</span></div>'+
        '<div class="drow"><span>Nationality</span><span>'+esc(c.kyc.nationality||'—')+'</span></div>'+
        '<div class="drow"><span>Doc No</span><span>'+esc((c.kyc.docName||'').replace(/.*—\s*/,''))+'</span></div>';
    }
    return '<div class="dphoto">🪪</div><div class="dh">NATIONAL ID · '+(page===1?'FRONT':'BACK')+'</div>'+
      '<div class="drow"><span>Name</span><span>'+esc(name)+'</span></div>'+
      '<div class="drow"><span>DOB</span><span>'+esc(c.kyc.dob||'—')+'</span></div>'+
      '<div class="drow"><span>NID</span><span>'+esc((c.kyc.docName||'').replace(/.*—\s*/,''))+'</span></div>';
  }
  function compareRows(c){
    var nameOn=c.kyc.nameOnDoc||c.name; var nameMatch = nameOn.toLowerCase().indexOf(c.name.split(' ').slice(-1)[0].toLowerCase())>-1;
    return '<div class="compare"><div class="ch">On document</div><div class="ch">On profile</div>'+
      '<div class="cv '+(nameMatch?'match':'mismatch')+'">'+esc(nameOn)+'</div><div class="cv">'+esc(c.name)+'</div>'+
      '<div class="cv">'+esc(c.kyc.dob||'—')+'</div><div class="cv">DOB on file</div>'+
      '<div class="cv">'+esc(c.kyc.nationality||'—')+'</div><div class="cv">'+esc(c.location)+'</div></div>'+
      '<p class="hint" style="margin:-4px 0 12px">Compare name, DOB and nationality on the document against the profile before deciding.</p>';
  }

  /* ---------- C06 · Communication log ---------- */
  SCREENS.C06 = { section:'C', title:'Communication log', sub:'Read-only in Part 2 · management is Part 7', perm:'VIEW_PEOPLE',
    render:function(main, P){
      var c = P.get('id') ? People.clientById(P.get('id')) : People.allClients()[0];
      main.innerHTML = header(this);
      if (!c){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'Client not found' })); return; }
      main.insertAdjacentHTML('beforeend','<p class="metaline">Every ticket, chat handoff, consultation and outbound message with <b>'+esc(c.name)+'</b>.</p>');
      var card=C.el('<div class="card"><h3>Chronological</h3></div>'); main.appendChild(card);
      var tl=People.clientComms(c.id).map(function(m){ return { t:m.t, kind:m.chan, text:'<b>'+esc(m.who)+'</b> · '+esc(m.text), dir:m.dir }; });
      card.appendChild((function(){ var d=C.el('<div class="timeline"></div>'); tl.forEach(function(it){ d.appendChild(C.el('<div class="tl-row comm-'+it.dir+'"><div class="tx"><span class="tl-kind">'+esc(it.kind)+'</span>'+it.text+'</div><div class="mt">'+esc(fmt.ago(it.t))+'</div></div>')); }); return d; })());
      main.appendChild(auditNote(actor().name, root.CRM_NOW, c.id));
    }
  };

  /* ===================== D — Teams & Territories ===================== */

  /* ---------- D01 · Territory tree ---------- */
  SCREENS.D01 = { section:'D', title:'Territory tree', sub:'Division › District › Upazila › Union', perm:'VIEW_PEOPLE',
    render:function(main){
      main.innerHTML = header(this);
      var wrap=C.el('<div class="treewrap"><div class="tree" id="tree"></div><div id="terrdetail"></div></div>'); main.appendChild(wrap);
      var treeEl=wrap.querySelector('#tree'); var detEl=wrap.querySelector('#terrdetail');
      treeEl.innerHTML = People.territoryTree.map(function(n){ return treeNode(n,true); }).join('');
      function selectNode(name){ showTerr(detEl, name); treeEl.querySelectorAll('.row').forEach(function(r){ r.classList.toggle('sel', r.getAttribute('data-name')===name); }); }
      treeEl.querySelectorAll('.tnode').forEach(function(node){
        var row=node.querySelector(':scope > .row');
        row.onclick=function(e){ e.stopPropagation(); if (node.querySelector(':scope > .kids')) node.classList.toggle('open'); selectNode(row.getAttribute('data-name')); };
      });
      showTerr(detEl, People.territoryTree[0].name);
      treeEl.querySelector('.row').classList.add('sel');
    }
  };
  function treeNode(n, open){
    var cnt=People.countsForNode(n);
    var caret = n.children ? (open?'▾':'▸') : '·';
    return '<div class="tnode'+(open?' open':'')+'"><div class="row" data-name="'+esc(n.name)+'"><span class="tw">'+caret+'</span><span class="lvl">'+n.level.slice(0,3)+'</span><span class="nm">'+esc(n.name)+'</span><span class="cnt">'+cnt.partners+' ptr · '+cnt.teams+' tm</span></div>'+
      (n.children?'<div class="kids">'+n.children.map(function(ch){ return treeNode(ch,false); }).join('')+'</div>':'')+'</div>';
  }
  function showTerr(el, name){
    var partners=People.partnersInTerritoryName(name).filter(function(p){return p.status!=='rejected';});
    var teams=People.teams.filter(function(t){ return t.territory.indexOf(name)>-1; });
    el.innerHTML='<div class="card"><h3>'+esc(name)+'</h3><p class="hint">Clicking a node filters the roster below. '+partners.length+' active partner'+(partners.length===1?'':'s')+' · '+teams.length+' team'+(teams.length===1?'':'s')+'.</p>'+
      '<div class="gap"></div><a class="linkrow" href="'+href('D02',{name:name})+'">Open full territory detail →</a></div>';
    var tw=C.el('<div></div>'); el.appendChild(tw);
    if (!partners.length){ tw.innerHTML=C.EmptyState({ title:'No partners here yet', text:'This territory has no active partners.' }); return; }
    C.mountDataTable(tw, { rowId:'id', noun:'partners', rows:partners, columns:[
      { key:'name', label:'Partner', strong:true }, { key:'rank', label:'Rank', render:function(r){return '<span class="pill rank-'+r.rank+'">'+esc(r.rank)+'</span>';} },
      { key:'team', label:'Team', render:function(r){ return esc(People.teamName(r.team)); } }
    ], onRowClick:function(r){ go('B03',{id:r.id}); } });
  }

  /* ---------- D02 · Territory detail ---------- */
  SCREENS.D02 = { section:'D', title:'Territory detail', perm:'VIEW_PEOPLE',
    render:function(main, P){
      var name = P.get('name') || 'Cumilla';
      main.innerHTML = header(this);
      var partners=People.partnersInTerritoryName(name).filter(function(p){return p.status!=='rejected';});
      var teams=People.teams.filter(function(t){ return t.territory.indexOf(name)>-1; });
      main.insertAdjacentHTML('beforeend', C.metricsRow([
        { label:'Active partners', value:partners.length },
        { label:'Teams', value:teams.length },
        { label:'Team leads', value:partners.filter(function(p){return p.teamLead;}).length },
        { label:'Platinum partners', value:partners.filter(function(p){return p.rank==='Platinum';}).length }
      ]));
      main.insertAdjacentHTML('beforeend','<div class="sectitle">Teams in '+esc(name)+'</div>');
      var tw1=C.el('<div></div>'); main.appendChild(tw1);
      C.mountDataTable(tw1, { rowId:'id', noun:'teams', rows:teams, columns:[
        { key:'name', label:'Team', strong:true }, { key:'leadId', label:'Team lead', render:function(r){ var l=r.leadId?People.partnerById(r.leadId):null; return l?esc(l.name):'<span class="muted">Unassigned</span>'; } },
        { key:'ach', label:'Achieved', align:'right', render:function(r){ return fmt.bdt(r.achievedBdt); } }
      ], onRowClick:function(r){ go('D04',{id:r.id}); } });
      main.insertAdjacentHTML('beforeend','<div class="sectitle">Partner roster</div>');
      var tw2=C.el('<div></div>'); main.appendChild(tw2);
      C.mountDataTable(tw2, { rowId:'id', noun:'partners', rows:partners, columns:[
        { key:'name', label:'Partner', strong:true }, { key:'rank', label:'Rank', render:function(r){return '<span class="pill rank-'+r.rank+'">'+esc(r.rank)+'</span>';} },
        { key:'team', label:'Team', render:function(r){ return esc(People.teamName(r.team)); } },
        { key:'status', label:'Status', render:function(r){ var m={approved:['green','Active'],suspended:['red','Suspended']}[r.status]||['grey',r.status]; return '<span class="chip '+m[0]+'"><span class="d"></span>'+m[1]+'</span>'; } }
      ], onRowClick:function(r){ go('B03',{id:r.id}); } });
    }
  };

  /* ---------- D03 · Teams list ---------- */
  SCREENS.D03 = { section:'D', title:'Teams', perm:'VIEW_PEOPLE',
    render:function(main){
      main.innerHTML = header(this);
      var tw=C.el('<div></div>'); main.appendChild(tw);
      C.mountDataTable(tw, { rowId:'id', noun:'teams', defaultSort:'name', rows:People.teams.slice(), columns:[
        { key:'name', label:'Team', strong:true, sortable:true },
        { key:'territory', label:'Territory' },
        { key:'leadId', label:'Team lead', render:function(r){ var l=r.leadId?People.partnerById(r.leadId):null; return l?esc(l.name):'<span class="muted">Unassigned</span>'; } },
        { key:'members', label:'Members', align:'right', render:function(r){ return People.partnersInTeam(r.id).length; } },
        { key:'target', label:'Target', align:'right', render:function(r){ return fmt.bdt(r.targetBdt); } },
        { key:'ach', label:'Achieved', align:'right', sortable:true, sortValue:function(r){return r.achievedBdt;}, render:function(r){ var pct=Math.round(r.achievedBdt/r.targetBdt*100); return fmt.bdt(r.achievedBdt)+' <span class="sla '+(pct>=100?'ok':pct>=60?'warn':'over')+'">'+pct+'%</span>'; } }
      ], onRowClick:function(r){ go('D04',{id:r.id}); } });
    }
  };

  /* ---------- D04 · Team detail ---------- */
  SCREENS.D04 = { section:'D', title:'Team detail', perm:'VIEW_PEOPLE',
    render:function(main, P){
      var t = P.get('id')?People.teamById(P.get('id')):People.teams[0];
      main.innerHTML = header(this);
      if (!t){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'Team not found', actionLabel:'Teams list' })); wireEmpty(main,'D03'); return; }
      var roster=People.partnersInTeam(t.id); var lead=t.leadId?People.partnerById(t.leadId):null;
      var pct=Math.round(t.achievedBdt/t.targetBdt*100);
      main.insertAdjacentHTML('beforeend','<div class="profband"><div class="top"><div class="photo">'+esc(initials(t.name))+'</div><div class="who"><h1>'+esc(t.name)+'</h1><div class="pid">'+esc(t.territory)+'</div></div></div><div class="identity"><span>Team lead <b>'+esc(lead?lead.name:'Unassigned')+'</b></span><span>Members <b>'+roster.length+'</b></span><span>Target <b>'+fmt.bdt(t.targetBdt)+'</b></span><span>Achieved <b>'+fmt.bdt(t.achievedBdt)+' ('+pct+'%)</b></span></div><div class="progress" style="margin-top:10px"><i style="width:'+Math.min(100,pct)+'%"></i></div></div>');
      main.insertAdjacentHTML('beforeend','<div class="sectitle">Roster</div>');
      var tw=C.el('<div></div>'); main.appendChild(tw);
      C.mountDataTable(tw, { rowId:'id', noun:'members', rows:roster, columns:[
        { key:'name', label:'Partner', strong:true, render:function(r){ return esc(r.name)+(r.teamLead?' <span class="pill">★ lead</span>':''); } },
        { key:'rank', label:'Rank', render:function(r){return '<span class="pill rank-'+r.rank+'">'+esc(r.rank)+'</span>';} },
        { key:'leads30', label:'Leads 30d', align:'right', render:function(r){ return r.stats.leads30||0; } }
      ], rowActions:[
        { label:'Open profile', icon:'↗', onClick:function(r){ go('B03',{id:r.id}); } },
        { label:'Toggle team-lead flag', icon:'★', onClick:function(r){ toggleTeamLead(r, function(){ location.reload(); }); } },
        { label:'Move partner', icon:'⇄', onClick:function(r){ movePartner(r, function(){ location.reload(); }); } }
      ], onRowClick:function(r){ go('B03',{id:r.id}); } });
    }
  };

  /* ---------- D05 · Assign team lead ---------- */
  SCREENS.D05 = { section:'D', title:'Assign team lead', sub:'A boolean flag, not a role change', perm:'MANAGE_TEAM',
    render:function(main){
      main.innerHTML = header(this);
      main.insertAdjacentHTML('beforeend','<p class="metaline">Flip the team-lead flag on any partner. Their roster and reports are unaffected (OPEN_QUESTIONS #12).</p>');
      var rows=People.allPartners().filter(function(p){return p.status==='approved';});
      var tw=C.el('<div></div>'); main.appendChild(tw);
      C.mountDataTable(tw, { rowId:'id', noun:'partners', defaultSort:'name', rows:rows, columns:[
        { key:'name', label:'Partner', strong:true, sortable:true },
        { key:'team', label:'Team', render:function(r){ return esc(People.teamName(r.team)); } },
        { key:'lead', label:'Team lead?', render:function(r){ return r.teamLead?'<span class="chip green"><span class="d"></span>Lead</span>':'<span class="muted">—</span>'; } }
      ], rowActions:[
        { label:'Toggle team-lead flag', icon:'★', onClick:function(r){ toggleTeamLead(r, function(){ location.reload(); }); } }
      ] });
    }
  };

  /* ---------- D06 · Move partner ---------- */
  SCREENS.D06 = { section:'D', title:'Move partner', sub:'Team / territory transfer · explicit in-flight-lead decision', perm:'MOVE_PARTNER',
    render:function(main){
      main.innerHTML = header(this);
      main.insertAdjacentHTML('beforeend','<p class="metaline">Move a partner between teams or territories. The dialog forces a decision on in-flight leads (OPEN_QUESTIONS #6).</p>');
      var rows=People.allPartners().filter(function(p){return p.status==='approved';});
      var tw=C.el('<div></div>'); main.appendChild(tw);
      C.mountDataTable(tw, { rowId:'id', noun:'partners', defaultSort:'name', rows:rows, columns:[
        { key:'name', label:'Partner', strong:true, sortable:true },
        { key:'team', label:'Current team', render:function(r){ return esc(People.teamName(r.team)); } },
        { key:'territory', label:'Territory', render:function(r){ return esc(r.territoryDisplay||People.pathStr(r.territoryPath)); } }
      ], rowActions:[
        { label:'Move partner', icon:'⇄', onClick:function(r){ movePartner(r, function(){ location.reload(); }); } },
        { label:'Open profile', icon:'↗', onClick:function(r){ go('B03',{id:r.id}); } }
      ], onRowClick:function(r){ movePartner(r, function(){ location.reload(); }); } });
    }
  };

  /* ---------- D07 · Referral codes ---------- */
  SCREENS.D07 = { section:'D', title:'Referral codes', sub:'Each code binds a team + territory', perm:'GENERATE_REFERRAL',
    render:function(main){
      main.innerHTML = header(this);
      main.insertAdjacentHTML('beforeend','<div class="primaryacts" style="margin-bottom:12px"><button class="btn primary" id="gen-ref">Generate referral code</button></div>');
      document.getElementById('gen-ref').onclick=function(){ generateReferral(function(){ location.reload(); }); };
      var tw=C.el('<div></div>'); main.appendChild(tw);
      C.mountDataTable(tw, { rowId:'code', noun:'codes', rows:People.referralCodes.slice(), columns:[
        { key:'code', label:'Code', strong:true, render:function(r){ return '<span class="mono">'+esc(r.code)+'</span>'; } },
        { key:'team', label:'Team', render:function(r){ return esc(People.teamName(r.team)); } },
        { key:'territory', label:'Territory' },
        { key:'uses', label:'Uses', align:'right' },
        { key:'active', label:'Status', render:function(r){ return r.active?'<span class="chip green"><span class="d"></span>Active</span>':'<span class="chip grey"><span class="d"></span>Inactive</span>'; } }
      ], rowActions:[
        { label:'Deactivate', icon:'⏸', danger:true, disabled:function(r){return !r.active;}, onClick:function(r){ Perm.requirePermission(state.role,'GENERATE_REFERRAL'); Audit.audit({ actor:actor(), action:'DEACTIVATE_REFERRAL', target:r.code }); C.toast({type:'info',title:'Code deactivated',text:r.code}); } },
        { label:'View usage', icon:'📊', onClick:function(r){ C.toast({type:'info',title:'Usage',text:r.code+': '+r.uses+' signups to date.'}); } }
      ] });
      main.insertAdjacentHTML('beforeend','<p class="metaline" style="margin-top:12px">Referral-code lifetime is undefined — treated as permanent until deactivated (OPEN_QUESTIONS #11).</p>');
    }
  };

  /* ===================== R — Ranks ===================== */

  /* ---------- R01 · Rank management ---------- */
  SCREENS.R01 = { section:'R', title:'Rank management', sub:'Silver · Gold · Platinum — assigned by hand', perm:'ASSIGN_RANK',
    render:function(main){
      main.innerHTML = header(this);
      var counts={}; People.allPartners().forEach(function(p){ if(p.status!=='rejected'&&p.rank) counts[p.rank]=(counts[p.rank]||0)+1; });
      main.insertAdjacentHTML('beforeend','<div class="split3">'+People.ranks.map(function(r){
        return '<div class="rankcard"><div class="rc-h"><span class="pill rank-'+r.id+'">'+esc(r.id)+'</span><span class="nm">'+esc(r.id)+'</span><span class="cnt">'+(counts[r.id]||0)+' partners</span></div><ul>'+r.unlocks.map(function(u){return '<li>'+esc(u)+'</li>';}).join('')+'</ul></div>';
      }).join('')+'</div>');
      main.insertAdjacentHTML('beforeend','<p class="metaline" style="margin-top:14px">This panel is a list of what each rank unlocks — not a rule engine. Ranks are assigned by hand with a required note (see Assign rank). Whether rank changes affect commission rate is undefined (OPEN_QUESTIONS #8).</p>');
      main.insertAdjacentHTML('beforeend','<div class="primaryacts"><a class="btn primary" href="'+href('R02')+'">Assign a rank to a partner</a></div>');
    }
  };

  /* ---------- R02 · Assign rank ---------- */
  SCREENS.R02 = { section:'R', title:'Assign rank', sub:'Manual · required note is the audit trail’s “why”', perm:'ASSIGN_RANK',
    render:function(main, P){
      main.innerHTML = header(this);
      var pre = P.get('id'); var target = pre?People.partnerById(pre):null;
      if (target){
        main.insertAdjacentHTML('beforeend', partnerBand(target)+'<div class="primaryacts"><button class="btn primary" id="ar-go">Change '+esc(target.name)+'’s rank</button></div>');
        document.getElementById('ar-go').onclick=function(){ assignRank(target, function(){ location.reload(); }); };
        main.appendChild(auditNote(actor().name, root.CRM_NOW, target.id));
        return;
      }
      main.insertAdjacentHTML('beforeend','<p class="metaline">Pick a partner to assign a rank. The dialog requires a note because ranks are manual — the note is the recorded reason.</p>');
      var rows=People.allPartners().filter(function(p){return p.status==='approved';});
      var tw=C.el('<div></div>'); main.appendChild(tw);
      C.mountDataTable(tw, { rowId:'id', noun:'partners', defaultSort:'name', rows:rows, columns:[
        { key:'name', label:'Partner', strong:true, sortable:true },
        { key:'rank', label:'Current rank', render:function(r){ return '<span class="pill rank-'+r.rank+'">'+esc(r.rank)+'</span>'; } },
        { key:'territory', label:'Territory', render:function(r){ return esc(r.territoryDisplay||People.pathStr(r.territoryPath)); } }
      ], rowActions:[
        { label:'Assign rank', icon:'◆', onClick:function(r){ assignRank(r, function(){ location.reload(); }); } },
        { label:'Rank history', icon:'☰', onClick:function(r){ go('R03',{id:r.id}); } }
      ], onRowClick:function(r){ assignRank(r, function(){ location.reload(); }); } });
    }
  };

  /* ---------- R03 · Rank change history ---------- */
  SCREENS.R03 = { section:'R', title:'Rank change history', perm:'VIEW_PEOPLE',
    render:function(main, P){
      var p = P.get('id')?People.partnerById(P.get('id')):People.allPartners()[0];
      main.innerHTML = header(this);
      if (!p){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'Partner not found' })); return; }
      main.insertAdjacentHTML('beforeend','<div class="profband"><div class="top"><div class="photo">'+esc(initials(p.name))+'</div><div class="who"><h1>'+esc(p.name)+'</h1><div class="pid">'+esc(p.id)+' · current rank '+esc(p.rank||'—')+'</div></div></div></div>');
      var card=C.el('<div class="card"><h3>Rank changes — chronological</h3></div>'); main.appendChild(card);
      var hist=People.rankHistoryFor(p.id);
      card.appendChild((function(){ var d=C.el('<div class="timeline"></div>'); hist.forEach(function(h){ d.appendChild(C.el('<div class="tl-row k-rank"><div class="tx"><span class="tl-kind">rank</span>'+(h.from?esc(h.from)+' → ':'Initial → ')+'<b>'+esc(h.to)+'</b> · by '+esc(h.by)+'<div class="mt" style="font-style:italic">“'+esc(h.note)+'”</div></div><div class="mt">'+esc(fmt.dhaka(h.t))+'</div></div>')); }); return d; })());
      main.insertAdjacentHTML('beforeend','<div class="primaryacts"><a class="btn" href="'+href('B03',{id:p.id})+'">Back to profile</a>'+(Perm.can(state.role,'ASSIGN_RANK')?'<button class="btn primary" id="ar2">Change rank</button>':'')+'</div>');
      var b=document.getElementById('ar2'); if(b) b.onclick=function(){ assignRank(p, function(){ location.reload(); }); };
    }
  };

  /* ===================== boot ===================== */
  function boot(screenId){
    state.screen = screenId;
    state.params = new URLSearchParams(location.search);
    Audit.seed(CRM.auditSeed);
    mountShell();
    renderMain();
  }

  root.People = { boot: boot, rerender: renderMain, SCREENS: SCREENS, go: go, href: href };
})(window);
