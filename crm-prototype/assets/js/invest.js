/* ============================================================================
 * Salmon CRM — With Investment record desk (Req 6.6)  ·  B11
 * ----------------------------------------------------------------------------
 * screens/B11-investment-records.html bootstraps Invest.boot('B11').
 * The legally-sensitive record desk. Rules enforced IN CODE:
 *   - NO amount field exists anywhere in this island. Staff record the SHAPE of
 *     a confirmed share / return entry; every value stays the marker
 *     [AMOUNT — LEGAL SIGN-OFF REQUIRED]. The app computes/pays/promises nothing.
 *   - recording a share / return entry is permission-gated (Finance/Super-Admin),
 *   - every mutation audits old→new + ripples to the partner + a Toast,
 *   - the higher-tier commission is NOT here — it lives in the COMMON ledger
 *     (L02), hand-entered. This desk only records the investment SHAPE.
 * Mirrors commission.js (the Payout desk) so it inherits the same shell.
 * ==========================================================================*/
(function (root) {
  'use strict';
  var C = root.C, Perm = root.Perm, Audit = root.Audit, CRM = root.CRM, Router = root.Router,
      DevToolbar = root.DevToolbar, IV = root.CRM.Invest, Ripples = root.Ripples;

  root.CRM_NOW = '2026-07-15T10:00:00Z';
  var esc = C.esc, fmt = C.fmt;

  var state = { role: localStorage.getItem('crm_role') || Perm.ROLES.SUPER_ADMIN, render:'data', screen:null, params:null };
  function actor(){ return CRM.staff[state.role]; }
  function setRole(r){ state.role = r; localStorage.setItem('crm_role', r); }

  var FILES = { B11:'B11-investment-records.html' };
  function href(id, params){
    var f=FILES[id]; if(!f) return '#';
    if(!params) return f;
    var qs=Object.keys(params).filter(function(k){return params[k]!=null&&params[k]!=='';}).map(function(k){return k+'='+encodeURIComponent(params[k]);}).join('&');
    return qs?f+'?'+qs:f;
  }
  function go(id, params){ location.href = href(id, params); }

  var HOLD = 'style="font-family:monospace;font-weight:800;font-size:11px;color:var(--red,#b23c3c);background:#fbf3f3;border:1px dashed var(--red,#b23c3c);border-radius:5px;padding:2px 7px;white-space:normal;display:inline-block"';
  function hold(txt){ return '<span '+HOLD+'>'+esc(txt)+'</span>'; }

  /* ===================== shell (mirrors Payout) ===================== */
  function mountShell(){
    document.getElementById('root').innerHTML =
      '<div class="app" id="app">' +
      '<div class="brandcorner"><a class="mark" href="../index.html" title="Salmon console home">S</a><span class="name">SALMON</span><button class="collapse" id="collapse" title="Collapse">⇤</button></div>' +
      '<div class="topbar" id="topbar"></div><nav class="sidebar" id="sidebar"></nav>' +
      '<div class="main"><div class="maininner" id="main"></div><div class="appfooter" id="footer"></div></div></div>';
    document.getElementById('collapse').onclick=function(){ document.getElementById('app').classList.toggle('collapsed'); };
    renderTopbar(); renderSidebar(); renderFooter(); ensureRippleFab();
  }
  function renderTopbar(){
    var tb=document.getElementById('topbar'); if(!tb) return;
    var sc=SCREENS[state.screen]||{title:'Investment records'}; var s=actor();
    tb.innerHTML =
      '<div class="breadcrumb"><a href="../index.html#/dashboard">Salmon</a><span class="sep">›</span>' +
      '<a href="B02-approval-queue.html">People</a><span class="sep">›</span><span class="cur">With Investment</span></div><span class="spacer"></span>' +
      '<button class="searchbtn" id="searchbtn">🔎 <span>Search…</span><kbd>⌘K</kbd></button><span id="devmount"></span>' +
      '<button class="icobtn" id="bell">🔔</button>' +
      '<div class="user"><span class="avatar">'+esc(s.initials)+'</span><span class="who"><span class="nm">'+esc(s.name)+'</span><span class="rl">'+Perm.ROLE_LABEL[state.role]+'</span></span></div>';
    document.getElementById('devmount').appendChild(DevToolbar.render({
      role: state.role, state: state.render,
      onRole:function(r){ setRole(r); renderTopbar(); renderSidebar(); renderFooter(); renderMain(); },
      onState:function(st){ state.render=st; renderMain(); },
      onReset:function(){ Ripples.reset(); C.toast({type:'info',title:'Mock data reset',text:'Investment desk and mobile ripples restored to seed.'}); renderMain(); }
    }));
    document.getElementById('searchbtn').onclick=function(){ location.href='../index.html#/dashboard'; };
    document.getElementById('bell').onclick=function(){ C.toast({type:'info',title:'Notifications',text:'The notification centre lives on the console home (Part 1).'}); };
  }
  function renderSidebar(){
    var sb=document.getElementById('sidebar'); if(!sb) return;
    var groups=Router.getSidebarFor(state.role);
    var MODMAP={ finance:'I01-webhook-queue.html', people:'B02-approval-queue.html', catalogue:'E01-projects-list.html', pipeline:'F01-leads-list.html' };
    sb.innerHTML = groups.map(function(g){
      return '<div class="navgroup"><div class="gl">'+esc(g.title)+'</div>'+g.items.map(function(it){
        var active=it.id==='people'; var route=MODMAP[it.id]||('../index.html'+it.route);
        return '<a class="navitem'+(active?' active':'')+'" href="'+route+'"><span class="ic">'+it.icon+'</span><span class="lb">'+esc(it.label)+'</span>'+(it.count?'<span class="count">'+it.count+'</span>':'')+'</a>';
      }).join('')+'</div>';
    }).join('');
  }
  function renderFooter(){ var ft=document.getElementById('footer'); if(!ft)return; var s=actor();
    ft.innerHTML='<b style="color:var(--ink-2)">'+esc(s.name)+'</b> · '+Perm.ROLE_LABEL[state.role]+' · '+esc(s.office)+'<span class="spacer" style="flex:1"></span><span>Salmon Admin · With Investment (Req 6.6)</span>'; }
  function ensureRippleFab(){
    if(document.getElementById('ripplefab')){ updateFab(); return; }
    var b=document.createElement('button'); b.id='ripplefab'; b.className='ripplefab';
    b.innerHTML='📱 Mobile ripples <span class="rc" id="ripplecount">0</span>'; b.onclick=function(){ Ripples.toggleConsole(); };
    document.body.appendChild(b); document.addEventListener('ripple', updateFab); updateFab();
  }
  function updateFab(){ var c=document.getElementById('ripplecount'); if(c) c.textContent=Ripples.feed().length; }

  /* ===================== main render ===================== */
  function renderMain(){
    renderTopbar();
    var main=document.getElementById('main'); if(!main) return;
    var sc=SCREENS[state.screen];
    if(!sc){ main.innerHTML=C.PageHeader({title:'Unknown screen'}); return; }
    if(sc.perm && !Perm.can(state.role, sc.perm)){
      Audit.audit({ actor:actor(), action:'ACCESS_DENIED', target:'Investment · '+sc.title });
      main.innerHTML=deniedPanel(sc.title, sc.perm); wireDenied(main); return;
    }
    if(state.render==='loading'){ main.innerHTML=header(sc)+skeleton(); return; }
    if(state.render==='error'){ main.innerHTML=header(sc)+statePanel('error'); return; }
    if(state.render==='offline'){ main.innerHTML=header(sc)+statePanel('offline'); return; }
    if(state.render==='empty'){ main.innerHTML=header(sc)+C.EmptyState({title:'Nothing here',text:'No investment records in the current state.'}); return; }
    try{ sc.render(main, state.params); }catch(e){ console.error(e); main.innerHTML=header(sc)+statePanel('error'); }
    updateFab();
  }
  function header(sc){ return C.PageHeader({ title:sc.title, sub:sc.sub }); }
  function deniedPanel(what, perm){
    return '<div class="authwrap" style="min-height:auto;padding:40px 0"><div class="authcard denied" style="text-align:center">' +
      '<div class="mark" style="margin:0 auto 14px">⛔</div><h1>Access denied</h1>' +
      '<p>Your role — <b>'+Perm.ROLE_LABEL[state.role]+'</b> — cannot open <b>'+esc(what)+'</b>.'+(perm?' Required permission: <span class="mono">'+perm+'</span>.':'')+'<br>Permissions are enforced server-side; this isn’t a UI glitch.</p>' +
      '<button class="btn primary" id="back-iv" style="width:auto;margin:4px auto 0">Back to console</button></div></div>';
  }
  function wireDenied(main){ var b=main.querySelector('#back-iv'); if(b) b.onclick=function(){ location.href='../index.html#/dashboard'; }; }
  function skeleton(){ var rows=Array(6).fill(0).map(function(){return '<div class="sk" style="height:34px;margin:6px 0"></div>';}).join(''); return '<div class="tablewrap" style="padding:10px">'+rows+'</div>'; }
  function statePanel(kind){
    if(kind==='offline') return C.EmptyState({icon:'⚠',title:'You’re offline',text:'We can’t reach the Salmon servers. Recording is unavailable until you reconnect.'});
    return C.EmptyState({icon:'⚠',title:'Something went wrong',text:'This view failed to load. Retry, and if it persists the on-call engineer is paged.'});
  }

  /* ===================== formDialog (copied from Payout) ===================== */
  function formDialog(cfg){
    return new Promise(function(resolve){
      var fieldsHtml=(cfg.fields||[]).map(function(f){
        if(f.type==='html') return f.html;
        var lab='<label>'+esc(f.label)+(f.required?' <span class="req">*</span>':'')+'</label>';
        if(f.type==='textarea') return '<div class="field">'+lab+'<textarea data-fk="'+f.key+'" maxlength="'+(f.max||400)+'" placeholder="'+esc(f.placeholder||'')+'">'+esc(f.value||'')+'</textarea></div>';
        if(f.type==='select') return '<div class="field">'+lab+'<select data-fk="'+f.key+'">'+f.options.map(function(o){var v=o.value!=null?o.value:o,t=o.label!=null?o.label:o;return '<option value="'+esc(v)+'"'+(String(f.value)===String(v)?' selected':'')+'>'+esc(t)+'</option>';}).join('')+'</select></div>';
        return '<div class="field">'+lab+'<input type="text" data-fk="'+f.key+'" value="'+esc(f.value||'')+'" placeholder="'+esc(f.placeholder||'')+'"></div>';
      }).join('');
      var scrim=C.el('<div class="modalscrim"><div class="modal" style="width:'+(cfg.width||480)+'px"><div class="mh"><h3>'+esc(cfg.title)+'</h3></div>'+
        '<div class="mb">'+(cfg.intro||'')+fieldsHtml+(cfg.mobileNote?'<div class="mobilenote">📱 '+cfg.mobileNote+'</div>':'')+'</div>'+
        (cfg.warn?'<div class="warn">⚠ '+esc(cfg.warn)+'</div>':'')+
        '<div class="mf"><button class="btn" data-x>Cancel</button><button class="btn '+(cfg.danger?'danger':'primary')+'" data-ok>'+esc(cfg.confirmLabel||'Confirm')+'</button></div></div></div>');
      function collect(){ var o={}; scrim.querySelectorAll('[data-fk]').forEach(function(i){ o[i.getAttribute('data-fk')]=i.value.trim(); }); return o; }
      function close(v){ scrim.remove(); document.removeEventListener('keydown',key); resolve(v); }
      function key(e){ if(e.key==='Escape') close(null); }
      scrim.addEventListener('click',function(e){ if(e.target===scrim) close(null); });
      scrim.querySelector('[data-x]').onclick=function(){ close(null); };
      scrim.querySelector('[data-ok]').onclick=function(){ var vals=collect(); var bad=(cfg.fields||[]).filter(function(f){return f.required&&!vals[f.key];});
        if(bad.length){ var f0=scrim.querySelector('[data-fk="'+bad[0].key+'"]'); if(f0){f0.style.borderColor='var(--red)';f0.focus();} C.toast({type:'warning',title:'A required field is empty',text:bad[0].label+' is required.'}); return; }
        close(vals); };
      document.addEventListener('keydown',key); document.body.appendChild(scrim);
      var first=scrim.querySelector('[data-fk],[data-ok]'); if(first) first.focus();
    });
  }

  /* ===================== helpers ===================== */
  function retChip(status){ var m=IV.RETURN_STATUS[status]||{label:status,chip:'grey'}; return '<span class="chip '+m.chip+'"><span class="d"></span>'+esc(m.label)+'</span>'; }
  function auditNote(id){ var n=C.el(C.AuditNote({actor:actor().name,when:root.CRM_NOW})); var lk=n.querySelector('.lk'); if(lk) lk.onclick=function(){ C.toast({type:'info',title:'Audit slice',text:'Opens the audit log filtered to '+(id||'this record')+' (Super Admin · Part 7).'}); }; return n; }

  /* ===================== SCREENS ===================== */
  var SCREENS = {};

  SCREENS.B11 = { section:'B', title:'With Investment records', sub:'Enquiries, confirmed shares & the status-only return schedule — amounts are held for legal sign-off', perm:'VIEW_INVESTMENT',
    render:function(main, P){
      main.innerHTML = header(this);
      // Legal-sensitivity banner — load-bearing.
      main.insertAdjacentHTML('beforeend','<div class="part6note" style="background:#fbf3f3;border-color:#e6cdd5;color:var(--red,#b23c3c)">⚠ Legally sensitive (Req 6.6). This desk records the SHAPE only — a confirmed share, a return entry\'s status. <b>No amount is entered here</b>; every value stays '+hold(IV.AMOUNT_MARKER)+' until Salmon\'s counsel signs off the terms and figures. The higher-tier commission is <b>not</b> here — it flows through the common commission ledger (L02), hand-entered.</div>');

      var shareId = P.get('share');
      if (shareId){ renderShareDetail(main, shareId); return; }

      /* ---- enquiries (clauses 1–2) ---- */
      var enq = IV.allEnquiries();
      main.insertAdjacentHTML('beforeend','<h3 style="margin:14px 0 6px">Investment enquiries</h3><p class="metaline">A request to be contacted — never a purchase. Staff follow up offline, then record a confirmed share below.</p>');
      if (!enq.length){ main.insertAdjacentHTML('beforeend', C.EmptyState({icon:'✓',title:'No enquiries',text:'Partner enquiries (P51) appear here.'})); }
      else {
        var etw=C.el('<div></div>'); main.appendChild(etw);
        C.mountDataTable(etw, { rowId:'id', noun:'enquiries', defaultSort:'createdUtc', defaultDir:-1, rows:enq, columns:[
          { key:'id', label:'Enquiry', strong:true, render:function(r){ return '<span class="mono" style="font-size:12px">'+esc(r.id)+'</span>'; } },
          { key:'partner', label:'Partner', render:function(r){ return esc(r.partner)+' <span class="mono" style="font-size:11px;color:var(--ink-muted)">'+esc(r.partnerId)+'</span>'; } },
          { key:'ref', label:'Project / share' },
          { key:'contact', label:'Preferred contact' },
          { key:'status', label:'Status', render:function(r){ return '<span class="chip '+(r.status==='new'?'amber':'grey')+'"><span class="d"></span>'+esc(r.status==='new'?'New':(r.status==='followed_up'?'Followed up':r.status))+'</span>'; } }
        ], rowActions:[
          { label:'Record confirmed share', icon:'✓', disabled:function(){ return !Perm.can(state.role,'RECORD_INVESTMENT_SHARE'); }, onClick:function(r){ recordShare(r); } }
        ] });
      }

      /* ---- confirmed shares (clause 3) ---- */
      var shares = IV.allShares();
      main.insertAdjacentHTML('beforeend','<h3 style="margin:18px 0 6px">Confirmed shares</h3><p class="metaline">Recorded by staff AFTER offline documentation + payment verification. The app did <b>not</b> process any payment — it records the result.</p>');
      var stw=C.el('<div></div>'); main.appendChild(stw);
      C.mountDataTable(stw, { rowId:'id', noun:'shares', defaultSort:'recordedUtc', defaultDir:-1, rows:shares, columns:[
        { key:'id', label:'Record', strong:true, render:function(r){ return '<span class="mono" style="font-size:12px">'+esc(r.id)+'</span>'; } },
        { key:'partner', label:'Partner', render:function(r){ return esc(r.partner)+' <span class="mono" style="font-size:11px;color:var(--ink-muted)">'+esc(r.partnerId)+'</span>'; } },
        { key:'project', label:'Project' },
        { key:'shareRef', label:'Share' },
        { key:'amount', label:'Amount', align:'right', render:function(){ return hold(IV.AMOUNT_MARKER); } },
        { key:'status', label:'Status', render:function(){ return '<span class="chip green"><span class="d"></span>Confirmed</span>'; } }
      ], rowActions:[
        { label:'Open return schedule', icon:'☰', onClick:function(r){ go('B11',{share:r.id}); } }
      ], onRowClick:function(r){ go('B11',{share:r.id}); } });
      main.appendChild(auditNote(null));
    }
  };

  /* ---- share detail: record card + return schedule (clause 4) ---- */
  function renderShareDetail(main, shareId){
    var sh = IV.shareById(shareId);
    if (!sh){ main.insertAdjacentHTML('beforeend', C.EmptyState({title:'Share not found', actionLabel:'Back to records'})); var b=main.querySelector('[data-empty-act]'); if(b) b.onclick=function(){ go('B11'); }; return; }
    main.insertAdjacentHTML('beforeend','<p><a href="'+href('B11')+'" class="mono" style="font-size:12px">‹ All investment records</a></p>');
    main.insertAdjacentHTML('beforeend','<div class="card"><h3>Confirmed share '+esc(sh.id)+'</h3><dl class="kv">'+
      '<dt>Partner</dt><dd>'+esc(sh.partner)+' · '+esc(sh.partnerId)+'</dd>'+
      '<dt>Project / share</dt><dd>'+esc(sh.project)+' · '+esc(sh.shareRef)+'</dd>'+
      '<dt>Amount recorded</dt><dd>'+hold(sh.amount)+'</dd>'+
      '<dt>Effective date</dt><dd>'+hold(sh.effectiveDate)+'</dd>'+
      '<dt>Client-approved terms</dt><dd>'+hold(sh.terms)+'</dd>'+
      '<dt>Recorded by</dt><dd>'+esc(sh.recordedBy||'—')+' · '+esc(fmt.dhaka(sh.recordedUtc))+'</dd></dl>'+
      '<p class="metaline">Held values are entered offline under Salmon\'s client-approved agreement, never in the app. Nothing here computes or promises a return.</p></div>');

    var rows = IV.returnsForShare(shareId);
    main.insertAdjacentHTML('beforeend','<div style="display:flex;align-items:center;gap:10px;margin:16px 0 6px"><h3 style="margin:0">Return schedule</h3><span class="spacer" style="flex:1"></span>'+
      (Perm.can(state.role,'RECORD_RETURN_ENTRY')?'<button class="btn" id="add-ret">+ Add return entry</button>':'')+'</div>');
    main.insertAdjacentHTML('beforeend','<p class="metaline">Status-only. The app does not calculate, project, or promise any entry — there is no amount field and no next-payment countdown.</p>');
    var tw=C.el('<div></div>'); main.appendChild(tw);
    C.mountDataTable(tw, { rowId:'id', noun:'entries', defaultSort:'recordedUtc', defaultDir:1, rows:rows, columns:[
      { key:'period', label:'Entry', strong:true },
      { key:'amount', label:'Amount', align:'right', render:function(){ return hold(IV.AMOUNT_MARKER); } },
      { key:'status', label:'Status', render:function(r){ return retChip(r.status); } },
      { key:'recordedUtc', label:'Recorded', render:function(r){ return fmt.dhaka(r.recordedUtc); } },
      { key:'note', label:'Note', render:function(r){ return r.note?esc(r.note):'—'; } }
    ], rowActions:[
      { label:'Set status (correction)', icon:'↺', disabled:function(){ return !Perm.can(state.role,'RECORD_RETURN_ENTRY'); }, onClick:function(r){ setEntryStatus(sh, r); } }
    ] });
    var addBtn=document.getElementById('add-ret'); if(addBtn) addBtn.onclick=function(){ addReturnEntry(sh); };
    main.appendChild(auditNote(sh.id));
  }

  /* ===================== actions (permission-gated, audited, rippled) ===================== */
  function recordShare(enq){
    formDialog({ title:'Record confirmed share', confirmLabel:'Record share',
      intro:'<div class="effectbox">'+esc(enq.partner)+' · '+esc(enq.partnerId)+'</div><p class="hint">Record this AFTER offline documentation + payment verification. <b>No amount is entered</b> — it stays '+hold(IV.AMOUNT_MARKER)+'.</p>',
      fields:[
        { type:'text', key:'project', label:'Project', required:true, value:(enq.ref||'').split(' · ')[1]||'' },
        { type:'text', key:'shareRef', label:'Share reference', required:true, value:(enq.ref||'').split(' · ')[0]||'' },
        { type:'textarea', key:'note', label:'Note (offline verification reference)', placeholder:'e.g. Docs + payment verified via finance ref XYZ (offline).' }
      ],
      warn:'This records the SHAPE of a decision made offline. The app processes no payment and holds no amount.',
      mobileNote:'The partner sees a read-only confirmed record (P53) — amount held as a marker.'
    }).then(function(v){
      if(!v) return;
      Perm.requirePermission(state.role,'RECORD_INVESTMENT_SHARE');
      var id='INV-2026-'+String(1000+Math.floor((IV.allShares().length+1))).slice(1); // deterministic-ish demo id
      var rec={ id:id, partner:enq.partner, partnerId:enq.partnerId, project:v.project, shareRef:v.shareRef,
        amount:IV.AMOUNT_MARKER, terms:IV.TERMS_MARKER, effectiveDate:IV.EFFDATE_MARKER, status:'confirmed',
        recordedBy:actor().name, recordedUtc:root.CRM_NOW, note:v.note||'' };
      Ripples.mutate('invshare:'+id, rec);
      Ripples.mutate('invenq:'+enq.id, Object.assign({}, enq, { status:'followed_up' }));
      Audit.audit({ actor:actor(), action:'RECORD_INVESTMENT_SHARE', target:id+' · '+enq.partner, changes:{ project:v.project, share:v.shareRef, amount:'[HELD]', terms:'[HELD]' } });
      Ripples.emit({ kind:'partner', screen:'P53 · Investment record', headline:'Confirmed share '+id+' recorded for '+enq.partner+' — read-only on P53, amount held for legal sign-off' });
      C.toast({ type:'success', persist:true, title:'Share recorded', text:enq.partner+' · '+id+' — amount held as a marker.', ripple:enq.partner.split(' ')[0]+' sees P53 · Confirmed' });
      go('B11',{share:id});
    });
  }

  function addReturnEntry(sh){
    formDialog({ title:'Add return entry', confirmLabel:'Add entry',
      intro:'<div class="effectbox">'+esc(sh.partner)+' · '+esc(sh.id)+'</div><p class="hint">A status-only record. <b>No amount is entered</b> — it stays '+hold(IV.AMOUNT_MARKER)+'.</p>',
      fields:[
        { type:'text', key:'period', label:'Entry label', required:true, placeholder:'e.g. Entry 6' },
        { type:'select', key:'status', label:'Status', value:'pending', options:[{value:'pending',label:'Pending'},{value:'paid',label:'Paid'},{value:'onHold',label:'On hold'}] },
        { type:'textarea', key:'note', label:'Note (optional)', placeholder:'e.g. Recorded as intended — not confirmed.' }
      ],
      warn:'This records that an entry exists with a status. It is not a promise and carries no amount.',
      mobileNote:'The partner sees this row on the return schedule (P54) — status only.'
    }).then(function(v){
      if(!v) return;
      Perm.requirePermission(state.role,'RECORD_RETURN_ENTRY');
      var id='RE-'+sh.id.replace(/[^0-9]/g,'').slice(-4)+'-'+String(90+IV.returnsForShare(sh.id).length+1).slice(-2);
      var rec={ id:id, shareId:sh.id, period:v.period, amount:IV.AMOUNT_MARKER, status:v.status, recordedBy:actor().name, recordedUtc:root.CRM_NOW, note:v.note||'' };
      Ripples.mutate('invret:'+id, rec);
      Audit.audit({ actor:actor(), action:'RECORD_RETURN_ENTRY', target:id+' · '+sh.partner, changes:{ share:sh.id, period:v.period, status:v.status, amount:'[HELD]' } });
      Ripples.emit({ kind:'partner', screen:'P54 · Return schedule', headline:'Return entry '+v.period+' ('+v.status+') recorded for '+sh.partner+' — status only, amount held' });
      C.toast({ type:'success', persist:true, title:'Return entry recorded', text:sh.partner+' · '+v.period+' · '+v.status, ripple:sh.partner.split(' ')[0]+' sees P54 updated' });
      go('B11',{share:sh.id});
    });
  }

  function setEntryStatus(sh, entry){
    formDialog({ title:'Set return-entry status', confirmLabel:'Update status', danger:true,
      intro:'<div class="effectbox">'+esc(sh.partner)+' · '+esc(entry.period)+' — current <b>'+esc((IV.RETURN_STATUS[entry.status]||{}).label||entry.status)+'</b></div><p class="hint">Correction path (OPEN_QUESTIONS 6.6 #8). Amount stays '+hold(IV.AMOUNT_MARKER)+'.</p>',
      fields:[
        { type:'select', key:'status', label:'New status', value:entry.status, options:[{value:'pending',label:'Pending'},{value:'paid',label:'Paid'},{value:'onHold',label:'On hold'}] },
        { type:'textarea', key:'reason', label:'Reason (audited)', required:true, placeholder:'e.g. Corrected after finance review.' }
      ],
      mobileNote:'The partner sees the status change on P54.'
    }).then(function(v){
      if(!v) return;
      Perm.requirePermission(state.role,'RECORD_RETURN_ENTRY');
      Ripples.mutate('invret:'+entry.id, Object.assign({}, entry, { status:v.status, correctionReason:v.reason, recordedBy:actor().name, recordedUtc:root.CRM_NOW }));
      Audit.audit({ actor:actor(), action:'SET_RETURN_ENTRY_STATUS', target:entry.id+' · '+sh.partner, changes:{ from:entry.status, to:v.status, reason:v.reason } });
      Ripples.emit({ kind:'partner', screen:'P54 · Return schedule', reason:v.reason, headline:'Return entry '+entry.period+' status → '+v.status+' for '+sh.partner+' — partner sees the change' });
      C.toast({ type:'info', persist:true, title:'Status updated', text:entry.period+' → '+v.status, ripple:'P54 updated + reason' });
      go('B11',{share:sh.id});
    });
  }

  /* ===================== boot ===================== */
  function boot(screenId){ state.screen=screenId; state.params=new URLSearchParams(location.search); Audit.seed(CRM.auditSeed); mountShell(); renderMain(); }
  root.Invest = { boot: boot, rerender: renderMain, SCREENS: SCREENS, go: go, href: href };
})(window);
