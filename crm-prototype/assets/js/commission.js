/* ============================================================================
 * Salmon CRM — Commission & Settlement engine (Part 6)
 * ----------------------------------------------------------------------------
 * screens/L0x-M0x .html bootstrap Payout.boot('L01'). The partner payout desk.
 * Rules enforced in code:
 *   - the panel never pays (no "pay now" / gateway button anywhere),
 *   - no bank details are collected (no field exists),
 *   - commission amount is HAND-ENTERED (no calculator / rate table),
 *   - settlement amount cannot exceed the partner's Approved balance,
 *   - every mutation audits old→new + ripples to mobile + a Toast.
 * ==========================================================================*/
(function (root) {
  'use strict';
  var C = root.C, Perm = root.Perm, Audit = root.Audit, CRM = root.CRM, Router = root.Router,
      DevToolbar = root.DevToolbar, PO = root.CRM.Payout, Ripples = root.Ripples;

  root.CRM_NOW = '2026-07-15T10:00:00Z';
  var esc = C.esc, fmt = C.fmt;

  var state = { role: localStorage.getItem('crm_role') || Perm.ROLES.SUPER_ADMIN, render:'data', screen:null, params:null };
  function actor(){ return CRM.staff[state.role]; }
  function setRole(r){ state.role = r; localStorage.setItem('crm_role', r); }

  var FILES = {
    L01:'L01-commission-queue.html', L02:'L02-commission-approval.html', L03:'L03-commission-ledger.html', L04:'L04-commission-adjustment.html',
    M01:'M01-settlement-queue.html', M02:'M02-settlement-decision.html', M03:'M03-mark-settled.html', M04:'M04-settlement-history.html'
  };
  function href(id, params){
    var f=FILES[id]; if(!f) return '#';
    if(!params) return f;
    var qs=Object.keys(params).filter(function(k){return params[k]!=null&&params[k]!=='';}).map(function(k){return k+'='+encodeURIComponent(params[k]);}).join('&');
    return qs?f+'?'+qs:f;
  }
  function go(id, params){ location.href = href(id, params); }
  function finHref(file){ return file; } // Part-5 screens live in the same screens/ dir

  /* ===================== shell ===================== */
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
    var sc=SCREENS[state.screen]||{title:'Payouts'}; var s=actor();
    tb.innerHTML =
      '<div class="breadcrumb"><a href="../index.html#/dashboard">Salmon</a><span class="sep">›</span>' +
      '<a href="I01-webhook-queue.html">Finance</a><span class="sep">›</span><a href="'+href(sc.section==='M'?'M01':'L01')+'">'+(sc.section==='M'?'Settlement':'Commission')+'</a><span class="sep">›</span><span class="cur">'+esc(sc.title)+'</span></div><span class="spacer"></span>' +
      '<button class="searchbtn" id="searchbtn">🔎 <span>Search…</span><kbd>⌘K</kbd></button><span id="devmount"></span>' +
      '<button class="icobtn" id="bell">🔔</button>' +
      '<div class="user"><span class="avatar">'+esc(s.initials)+'</span><span class="who"><span class="nm">'+esc(s.name)+'</span><span class="rl">'+Perm.ROLE_LABEL[state.role]+'</span></span></div>';
    document.getElementById('devmount').appendChild(DevToolbar.render({
      role: state.role, state: state.render,
      onRole:function(r){ setRole(r); renderTopbar(); renderSidebar(); renderFooter(); renderMain(); },
      onState:function(st){ state.render=st; renderMain(); },
      onReset:function(){ Ripples.reset(); C.toast({type:'info',title:'Mock data reset',text:'Payout desk and mobile ripples restored to seed.'}); renderMain(); }
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
        var active=it.id==='finance'; var route=MODMAP[it.id]||('../index.html'+it.route);
        return '<a class="navitem'+(active?' active':'')+'" href="'+route+'"><span class="ic">'+it.icon+'</span><span class="lb">'+esc(it.label)+'</span>'+(it.count?'<span class="count">'+it.count+'</span>':'')+'</a>';
      }).join('')+'</div>';
    }).join('');
  }
  function renderFooter(){ var ft=document.getElementById('footer'); if(!ft)return; var s=actor();
    ft.innerHTML='<b style="color:var(--ink-2)">'+esc(s.name)+'</b> · '+Perm.ROLE_LABEL[state.role]+' · '+esc(s.office)+'<span class="spacer" style="flex:1"></span><span>Salmon Admin · Commission & Settlement (Part 6)</span>'; }
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
      Audit.audit({ actor:actor(), action:'ACCESS_DENIED', target:'Payout · '+sc.title });
      main.innerHTML=deniedPanel(sc.title, sc.perm); wireDenied(main); return;
    }
    if(state.render==='loading'){ main.innerHTML=header(sc)+skeleton(); return; }
    if(state.render==='error'){ main.innerHTML=header(sc)+statePanel('error'); return; }
    if(state.render==='offline'){ main.innerHTML=header(sc)+statePanel('offline'); return; }
    if(state.render==='empty'){ main.innerHTML=header(sc)+(sc.emptyState?sc.emptyState():C.EmptyState({title:'Nothing here',text:'This view has no records in the current state.'})); return; }
    try{ sc.render(main, state.params); }catch(e){ console.error(e); main.innerHTML=header(sc)+statePanel('error'); }
    updateFab();
  }
  function finnav(active){
    var items=[ ['client','Client money',finHref('I01-webhook-queue.html'),null], ['comm','Commission',href('L01'),PO.commissionQueue().length], ['stl','Settlement',href('M01'),PO.activeSettlements().length] ];
    return '<div class="finnav">'+items.map(function(it){ return '<a class="'+(it[0]===active?'on':'')+'" href="'+it[2]+'">'+esc(it[1])+(it[3]?'<span class="n">'+it[3]+'</span>':'')+'</a>'; }).join('')+'</div>';
  }
  function header(sc){ return finnav(sc.section==='M'?'stl':'comm') + C.PageHeader({ title:sc.title, sub:sc.sub }); }
  function deniedPanel(what, perm){
    return finnav(null)+'<div class="authwrap" style="min-height:auto;padding:40px 0"><div class="authcard denied" style="text-align:center">' +
      '<div class="mark" style="margin:0 auto 14px">⛔</div><h1>Access denied</h1>' +
      '<p>Your role — <b>'+Perm.ROLE_LABEL[state.role]+'</b> — cannot open <b>'+esc(what)+'</b>.'+(perm?' Required permission: <span class="mono">'+perm+'</span>.':'')+'<br>Permissions are enforced server-side; this isn’t a UI glitch.</p>' +
      '<button class="btn primary" id="back-po" style="width:auto;margin:4px auto 0">Back to Commission</button></div></div>';
  }
  function wireDenied(main){ var b=main.querySelector('#back-po'); if(b) b.onclick=function(){ go('L01'); }; }
  function skeleton(){ var rows=Array(6).fill(0).map(function(){return '<div class="sk" style="height:34px;margin:6px 0"></div>';}).join(''); return '<div class="tablewrap" style="padding:10px">'+rows+'</div>'; }
  function statePanel(kind){
    if(kind==='offline') return C.EmptyState({icon:'⚠',title:'You’re offline',text:'We can’t reach the Salmon servers. Approvals are unavailable until you reconnect.'});
    return C.EmptyState({icon:'⚠',title:'Something went wrong',text:'This view failed to load. Retry, and if it persists the on-call engineer is paged.'});
  }

  /* ===================== formDialog ===================== */
  function formDialog(cfg){
    return new Promise(function(resolve){
      var fieldsHtml=(cfg.fields||[]).map(function(f){
        if(f.type==='html') return f.html;
        var lab='<label>'+esc(f.label)+(f.required?' <span class="req">*</span>':'')+'</label>';
        if(f.type==='textarea') return '<div class="field">'+lab+'<textarea data-fk="'+f.key+'" maxlength="'+(f.max||400)+'" placeholder="'+esc(f.placeholder||'')+'">'+esc(f.value||'')+'</textarea></div>';
        if(f.type==='select') return '<div class="field">'+lab+'<select data-fk="'+f.key+'">'+f.options.map(function(o){var v=o.value!=null?o.value:o,t=o.label!=null?o.label:o;return '<option value="'+esc(v)+'"'+(String(f.value)===String(v)?' selected':'')+'>'+esc(t)+'</option>';}).join('')+'</select></div>';
        if(f.type==='date') return '<div class="field">'+lab+'<input type="date" data-fk="'+f.key+'" value="'+esc(f.value||'')+'"></div>';
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
        if(cfg.validate){ var err=cfg.validate(vals); if(err){ C.toast({type:'warning',title:'Check the values',text:err}); return; } }
        close(vals); };
      document.addEventListener('keydown',key); document.body.appendChild(scrim);
      var first=scrim.querySelector('[data-fk],[data-ok]'); if(first) first.focus();
    });
  }

  /* ===================== helpers ===================== */
  function auditNote(id){ var n=C.el(C.AuditNote({actor:actor().name,when:root.CRM_NOW})); n.querySelector('.lk').onclick=function(){ C.toast({type:'info',title:'Audit slice',text:'Opens the audit log filtered to '+(id||'this record')+' (Super Admin · Part 7).'}); }; return n; }
  function wireEmpty(main, screen){ var b=main.querySelector('[data-empty-act]'); if(b) b.onclick=function(){ go(screen); }; }
  function readOv(){ try{ return JSON.parse(localStorage.getItem('crm_people_mut')||'{}'); }catch(e){ return {}; } }
  function ageOf(iso){ var d=(new Date(root.CRM_NOW)-new Date(iso))/86400000; return d<1?Math.round(d*24)+'h':Math.floor(d)+'d'; }
  function commChip(status){ var m={ pending:['amber','Pending'], approved:['green','Approved'], settled:['grey','Settled'], reversed:['red','Reversed'], 'awaitingPayment':['blue','Approved · awaiting payment'] }[status]||['grey',status]; return '<span class="chip '+m[0]+'"><span class="d"></span>'+m[1]+'</span>'; }
  function stlChip(status){ var m={ submitted:['amber','Submitted'], approved:['blue','Approved · awaiting payment'], held:['violet','On hold'], rejected:['red','Rejected'], settled:['green','Settled'] }[status]||['grey',status]; return '<span class="chip '+m[0]+'"><span class="d"></span>'+m[1]+'</span>'; }
  function num(s){ return parseInt(String(s||'').replace(/[^\d]/g,''),10) || 0; }

  /* ===================== SCREENS ===================== */
  var SCREENS = {};

  /* ---------- L01 · Commission queue ---------- */
  SCREENS.L01 = { section:'L', title:'Commission queue', sub:'Pending records created when Sales verified a conversion (Part 4)', perm:'VIEW_COMMISSION',
    emptyState:function(){ return C.EmptyState({ icon:'✓', title:'No pending commissions', text:'Verify a lead conversion in Sales Pipeline (F04) to create a Pending commission here.' }); },
    render:function(main){
      var q = PO.commissionQueue();
      main.innerHTML = header(this);
      main.insertAdjacentHTML('beforeend','<p class="metaline">Each Pending record traces back to a Sales-verified conversion. Finance enters the amount by hand on approval — there is no rate table.</p>');
      if (!q.length){ main.insertAdjacentHTML('beforeend', this.emptyState()); return; }
      var tw=C.el('<div></div>'); main.appendChild(tw);
      C.mountDataTable(tw, { rowId:'id', noun:'commissions', defaultSort:'createdUtc', defaultDir:1, rows:q, columns:[
        { key:'id', label:'Commission', strong:true, render:function(r){ return '<span class="mono" style="font-size:12px">'+esc(r.id)+'</span>'; } },
        { key:'partner', label:'Partner', render:function(r){ return esc(r.partner)+' <span class="mono" style="font-size:11px;color:var(--ink-muted)">'+esc(r.partnerId)+'</span>'; } },
        { key:'program', label:'Program', render:function(r){ return '<span class="chip '+(r.program==='With Investment'?'violet':'blue')+'" style="height:18px"><span class="d"></span>'+esc(r.program)+'</span>'; } },
        { key:'buyer', label:'From client', render:function(r){ return esc(r.buyer)+(r.bookingId?' <span class="mono" style="font-size:10px;color:var(--ink-faint)">'+esc(r.bookingId)+'</span>':''); } },
        { key:'project', label:'Project' },
        { key:'amountBdt', label:'Amount', align:'right', render:function(){ return '<span class="muted">— (enter on approval)</span>'; } },
        { key:'status', label:'Status', render:function(r){ return commChip(r.status); } }
      ], rowActions:[
        { label:'Approve (enter amount)', icon:'✓', disabled:function(){ return !Perm.can(state.role,'APPROVE_COMMISSION'); }, onClick:function(r){ go('L02',{id:r.id}); } },
        { label:'Open ledger', icon:'☰', onClick:function(r){ go('L03',{id:r.partnerId}); } }
      ], onRowClick:function(r){ go('L02',{id:r.id}); } });
      main.insertAdjacentHTML('beforeend','<p class="metaline" style="margin-top:12px">No bulk approve here — each amount is a separate human decision (bulk would force one number across records).</p>');
    }
  };

  /* ---------- L02 · Commission approval ⭐ (hand-entered amount) ---------- */
  SCREENS.L02 = { section:'L', title:'Commission approval', sub:'Finance enters the amount by hand — no calculator, no rate table', perm:'APPROVE_COMMISSION',
    render:function(main, P){
      var c = P.get('id') ? PO.commissionById(P.get('id')) : PO.commissionQueue()[0];
      main.innerHTML = header(this);
      if (!c){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'No commission to approve', actionLabel:'Commission queue' })); wireEmpty(main,'L01'); return; }
      if (c.status!=='pending'){ main.insertAdjacentHTML('beforeend', C.EmptyState({ icon:'✓', title:'Already actioned', text:c.id+' is '+c.status+(c.amountBdt?' · '+fmt.bdt(c.amountBdt):'')+'.', actionLabel:'Commission queue' })); wireEmpty(main,'L01'); return; }
      main.insertAdjacentHTML('beforeend',
        '<div class="split2"><div class="card"><h3>Commission '+esc(c.id)+'</h3><dl class="kv">'+
        '<dt>Partner</dt><dd>'+esc(c.partner)+' <span class="mono" style="font-size:11px;color:var(--ink-muted)">'+esc(c.partnerId)+'</span></dd>'+
        '<dt>Program</dt><dd>'+esc(c.program)+' <span class="hint">(prefilled from partner)</span></dd>'+
        '<dt>Related lead</dt><dd>'+esc(c.leadId||'—')+' · '+esc(c.project)+(c.unit?' · '+esc(c.unit):'')+'</dd>'+
        '<dt>From client</dt><dd>'+esc(c.buyer)+(c.bookingId?' · '+esc(c.bookingId):'')+'</dd>'+
        '<dt>Verified by</dt><dd>'+esc(c.createdBy||'—')+' · '+esc(fmt.dhaka(c.createdUtc))+'</dd></dl>'+
        '<div class="trace"><span class="step">Sales verified</span><span class="arr">→</span><span class="step">Finance approves</span><span class="arr">→</span><span class="step">Settled later</span></div></div>'+
        '<div class="card"><h3>Enter approved amount</h3>'+
        '<div class="amountfield"><label>Commission amount (BDT) — your decision</label><div class="wrap"><span class="cur">৳</span><input id="amt" inputmode="numeric" placeholder="0" autocomplete="off"></div><div class="hint">A human types this number and takes responsibility for it. There is no suggested amount.</div></div>'+
        '<div class="field"><label>Note (optional — the “why” of the number)</label><textarea id="note" placeholder="e.g. Higher tier rate approved per XYZ."></textarea></div>'+
        '<div class="humannote">📱 On approve, this becomes <b>Approved</b> — real money on '+esc(c.partner.split(' ')[0])+'’s earnings screen, requestable for settlement.</div>'+
        '<button class="btn primary" id="approve" style="width:100%;justify-content:center">Approve commission</button></div></div>');
      var amt=document.getElementById('amt');
      amt.addEventListener('input',function(){ var n=num(amt.value); amt.value = n?n.toLocaleString('en-US'):''; });
      document.getElementById('approve').onclick=function(){
        var amount=num(amt.value); var note=document.getElementById('note').value.trim();
        if (amount<=0){ amt.style.borderColor='var(--red)'; C.toast({type:'warning',title:'Enter an amount',text:'Type the commission amount before approving.'}); return; }
        Perm.requirePermission(state.role,'APPROVE_COMMISSION');
        C.confirmDialog({ title:'Approve '+fmt.bdt(amount)+'?', body:'<p>Approve <b>'+fmt.bdt(amount)+'</b> commission for <b>'+esc(c.partner)+'</b> ('+esc(c.partnerId)+')? This flips it <b>Pending → Approved</b> and it becomes requestable on the partner side.</p>'+(note?'<div class="effectbox" style="margin-top:8px">'+esc(note)+'</div>':''), warn:'The amount is a human decision — there is no formula behind it.', confirmLabel:'Approve commission' }).then(function(ok){
          if(!ok) return;
          Ripples.mutate('comm:'+c.id, Object.assign({}, c, { status:'approved', amountBdt:amount, approvedBy:actor().name, approvedUtc:root.CRM_NOW, note:note }));
          Audit.audit({ actor:actor(), action:'APPROVE_COMMISSION', target:c.id+' · '+c.partner, changes:{ from:'pending', to:'approved', amount:fmt.bdt(amount), note:note||null } });
          Ripples.emit({ mobileId:c.mobileId||null, kind:'partner', screen:'Earnings · Approved', headline:fmt.bdt(amount)+' commission approved for '+c.partner+' — Approved balance increases, now requestable' });
          C.toast({ type:'success', persist:true, title:fmt.bdt(amount)+' approved', text:'for '+c.partner+' — will appear on his earnings screen.', ripple:c.partner.split(' ')[0]+'’s Approved balance +'+fmt.bdt(amount) });
          go('L01');
        });
      };
    }
  };

  /* ---------- L03 · Commission ledger (per partner) ---------- */
  SCREENS.L03 = { section:'L', title:'Commission ledger', sub:'Full history per partner', perm:'VIEW_COMMISSION',
    render:function(main, P){
      var pid = P.get('id') || (PO.partnersWithActivity()[0]||{}).id;
      main.innerHTML = header(this);
      var partners = PO.partnersWithActivity();
      main.insertAdjacentHTML('beforeend','<div class="field" style="max-width:360px"><label>Partner</label><select id="psel">'+partners.map(function(p){ return '<option value="'+p.id+'"'+(p.id===pid?' selected':'')+'>'+esc(p.name)+' · '+esc(p.id)+'</option>'; }).join('')+'</select></div>');
      document.getElementById('psel').onchange=function(){ go('L03',{id:this.value}); };
      var recs = PO.commissionsForPartner(pid);
      var approved = recs.filter(function(r){return r.status==='approved';}).reduce(function(a,r){return a+(r.amountBdt||0);},0);
      var settled = recs.filter(function(r){return r.status==='settled';}).reduce(function(a,r){return a+(r.amountBdt||0);},0);
      var pending = recs.filter(function(r){return r.status==='pending';}).length;
      main.insertAdjacentHTML('beforeend', '<div class="balancestrip">'+
        '<div class="baltile approved"><div class="l">Approved balance</div><div class="v">'+fmt.bdt(PO.approvedBalance(pid))+'</div></div>'+
        '<div class="baltile pending"><div class="l">Pending records</div><div class="v">'+pending+'</div></div>'+
        '<div class="baltile settled"><div class="l">Settled to date</div><div class="v">'+fmt.bdt(settled)+'</div></div></div>');
      var tw=C.el('<div></div>'); main.appendChild(tw);
      C.mountDataTable(tw, { rowId:'id', noun:'commissions', defaultSort:'createdUtc', defaultDir:-1, rows:recs, columns:[
        { key:'id', label:'Commission', strong:true, render:function(r){ return '<span class="mono" style="font-size:12px">'+esc(r.id)+'</span>'; } },
        { key:'buyer', label:'From client' }, { key:'project', label:'Project' },
        { key:'amountBdt', label:'Amount', align:'right', render:function(r){ return r.amountBdt?fmt.bdt(r.amountBdt):'<span class="muted">—</span>'; } },
        { key:'status', label:'Status', render:function(r){ return commChip(r.status); } },
        { key:'approvedUtc', label:'Approved', render:function(r){ return r.approvedUtc?fmt.dhaka(r.approvedUtc):'—'; } }
      ], rowActions:[
        { label:'Approve', icon:'✓', disabled:function(r){ return r.status!=='pending' || !Perm.can(state.role,'APPROVE_COMMISSION'); }, onClick:function(r){ go('L02',{id:r.id}); } },
        { label:'Adjust / reverse', icon:'↺', disabled:function(r){ return r.status!=='approved' || !Perm.can(state.role,'ADJUST_COMMISSION'); }, onClick:function(r){ go('L04',{id:r.id}); } }
      ] });
      main.appendChild(auditNote(pid));
    }
  };

  /* ---------- L04 · Commission adjustment (rare, high-consequence) ---------- */
  SCREENS.L04 = { section:'L', title:'Commission adjustment', sub:'Reduce or reverse an approved commission', perm:'ADJUST_COMMISSION',
    render:function(main, P){
      var c = P.get('id') ? PO.commissionById(P.get('id')) : PO.allCommissions().filter(function(x){return x.status==='approved';})[0];
      main.innerHTML = header(this);
      if (!c){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'No approved commission to adjust', actionLabel:'Commission ledger' })); wireEmpty(main,'L03'); return; }
      main.insertAdjacentHTML('beforeend','<div class="part6note" style="background:var(--red-bg);border-color:#e6c9c6;color:var(--red)">⚠ Adjusting an approved commission changes real partner money. Whether this needs Super-Admin sign-off is undefined (OPEN_QUESTIONS #7). Clawback rules for refund/default are also undefined (#6).</div>');
      main.insertAdjacentHTML('beforeend','<div class="card"><h3>Commission '+esc(c.id)+'</h3><dl class="kv"><dt>Partner</dt><dd>'+esc(c.partner)+' · '+esc(c.partnerId)+'</dd><dt>Current amount</dt><dd>'+fmt.bdt(c.amountBdt||0)+'</dd><dt>Approved by</dt><dd>'+esc(c.approvedBy||'—')+'</dd></dl>'+
        '<div class="primaryacts"><button class="btn danger" id="reduce">Reduce amount</button><button class="btn danger" id="reverse">Reverse fully</button></div></div>');
      document.getElementById('reduce').onclick=function(){ adjust(c, 'reduce'); };
      document.getElementById('reverse').onclick=function(){ adjust(c, 'reverse'); };
      main.appendChild(auditNote(c.id));
    }
  };
  function adjust(c, mode){
    formDialog({ title: mode==='reverse'?'Reverse commission':'Reduce commission', danger:true,
      intro:'<div class="effectbox">'+esc(c.partner)+' · current <b>'+fmt.bdt(c.amountBdt||0)+'</b></div>',
      fields:(mode==='reduce'?[{ type:'text', key:'amount', label:'New amount (BDT)', required:true, value:String(c.amountBdt||0) }]:[])
        .concat([{ type:'textarea', key:'reason', label:'Reason', required:true, placeholder: mode==='reverse'?'e.g. Underlying booking cancelled — commission reversed.':'e.g. Corrected to standard tier after review.' }]),
      mobileNote:'The partner sees the status/amount change'+(mode==='reverse'?' (reversed)':'')+' with this reason.',
      confirmLabel: mode==='reverse'?'Reverse commission':'Reduce commission',
      validate:function(v){ if(mode==='reduce'){ var n=num(v.amount); if(n<=0) return 'New amount must be greater than zero.'; if(n>=(c.amountBdt||0)) return 'Reduced amount must be less than the current amount.'; } }
    }).then(function(v){
      if(!v) return;
      Perm.requirePermission(state.role,'ADJUST_COMMISSION');
      var newAmt = mode==='reverse' ? 0 : num(v.amount);
      var newStatus = mode==='reverse' ? 'reversed' : 'approved';
      Ripples.mutate('comm:'+c.id, Object.assign({}, c, { status:newStatus, amountBdt:newAmt, adjustReason:v.reason, adjustedBy:actor().name, adjustedUtc:root.CRM_NOW }));
      Audit.audit({ actor:actor(), action:'ADJUST_COMMISSION', target:c.id+' · '+c.partner, changes:{ from:fmt.bdt(c.amountBdt||0), to:fmt.bdt(newAmt), mode:mode, reason:v.reason } });
      Ripples.emit({ mobileId:c.mobileId||null, kind:'partner', screen:'Earnings · adjusted', reason:v.reason, headline:'Commission '+c.id+' '+(mode==='reverse'?'reversed':'reduced to '+fmt.bdt(newAmt))+' for '+c.partner+' — partner sees the change + reason' });
      C.toast({ type:'warning', persist:true, title: mode==='reverse'?'Commission reversed':'Commission reduced', text:c.partner+' · '+(mode==='reverse'?fmt.bdt(c.amountBdt||0)+' → ৳0':fmt.bdt(c.amountBdt||0)+' → '+fmt.bdt(newAmt)), ripple:'partner earnings updated + reason shown' });
      go('L03',{id:c.partnerId});
    });
  }

  /* ---------- M01 · Settlement queue ⭐ ---------- */
  SCREENS.M01 = { section:'M', title:'Settlement queue', sub:'Partner payout requests awaiting Finance', perm:'VIEW_SETTLEMENT',
    emptyState:function(){ return C.EmptyState({ icon:'✓', title:'No active settlement requests', text:'Partner payout requests appear here.' }); },
    render:function(main){
      var q = PO.activeSettlements();
      main.innerHTML = header(this);
      main.insertAdjacentHTML('beforeend','<p class="metaline">Sortable by age. There is <b>no bank field</b> on this queue — the data model doesn’t hold one. Approving does not pay; it records that Finance will pay externally.</p>');
      if (!q.length){ main.insertAdjacentHTML('beforeend', this.emptyState()); return; }
      var tw=C.el('<div></div>'); main.appendChild(tw);
      C.mountDataTable(tw, { rowId:'id', noun:'requests', defaultSort:'requestedUtc', defaultDir:1, rows:q, columns:[
        { key:'partner', label:'Partner', strong:true, render:function(r){ return esc(r.partner)+' <span class="mono" style="font-size:11px;color:var(--ink-muted)">'+esc(r.partnerId)+'</span>'; } },
        { key:'amountBdt', label:'Requested', align:'right', render:function(r){ return '<b>'+fmt.bdt(r.amountBdt)+'</b>'; } },
        { key:'bal', label:'Approved balance', align:'right', render:function(r){ return fmt.bdt(PO.approvedBalance(r.partnerId)); } },
        { key:'requestedUtc', label:'Requested', render:function(r){ return fmt.dhaka(r.requestedUtc); } },
        { key:'age', label:'Age', align:'right', sortable:true, sortValue:function(r){return r.requestedUtc;}, render:function(r){ var d=(new Date(root.CRM_NOW)-new Date(r.requestedUtc))/86400000; return '<span class="sla '+(d>=3?'over':d>=2?'warn':'ok')+'">'+ageOf(r.requestedUtc)+'</span>'; } },
        { key:'status', label:'Status', render:function(r){ return stlChip(r.status); } }
      ], rowActions:[
        { label:'Decide (approve/reject/hold)', icon:'⚖', disabled:function(r){ return r.status!=='submitted' && r.status!=='held'; }, onClick:function(r){ go('M02',{id:r.id}); } },
        { label:'Mark as settled', icon:'✓', disabled:function(r){ return r.status!=='approved' || !Perm.can(state.role,'MARK_SETTLED'); }, onClick:function(r){ go('M03',{id:r.id}); } }
      ], onRowClick:function(r){ go('M02',{id:r.id}); } });
    }
  };

  /* ---------- M02 · Settlement decision ⭐ (balance-capped) ---------- */
  SCREENS.M02 = { section:'M', title:'Settlement decision', perm:'VIEW_SETTLEMENT',
    render:function(main, P){
      var s = P.get('id') ? PO.settlementById(P.get('id')) : PO.activeSettlements()[0];
      main.innerHTML = header(this);
      if (!s){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'Settlement not found', actionLabel:'Settlement queue' })); wireEmpty(main,'M01'); return; }
      var bal = PO.approvedBalance(s.partnerId);
      var overCap = s.amountBdt > bal;
      main.insertAdjacentHTML('beforeend', '<div class="balancestrip">'+
        '<div class="baltile"><div class="l">Requested</div><div class="v">'+fmt.bdt(s.amountBdt)+'</div></div>'+
        '<div class="baltile approved"><div class="l">Approved balance</div><div class="v">'+fmt.bdt(bal)+'</div></div>'+
        '<div class="baltile"><div class="l">Age</div><div class="v" style="font-size:16px">'+ageOf(s.requestedUtc)+'</div></div></div>');
      main.insertAdjacentHTML('beforeend','<div class="card"><h3>Request '+esc(s.id)+'</h3><dl class="kv"><dt>Partner</dt><dd>'+esc(s.partner)+' · '+esc(s.partnerId)+'</dd><dt>Requested amount</dt><dd>'+fmt.bdt(s.amountBdt)+'</dd><dt>Current status</dt><dd>'+stlChip(s.status)+'</dd>'+(s.reason?'<dt>Hold reason</dt><dd>'+esc(s.reason)+'</dd>':'')+'</dl>'+
        (overCap?'<div class="overcap">⚠ Requested amount exceeds the approved balance ('+fmt.bdt(s.amountBdt)+' > '+fmt.bdt(bal)+'). Approval is blocked.</div>':'')+
        '<div class="decisionrow"><button class="btn primary" id="approve"'+(overCap||s.status==='approved'?' disabled':'')+'>Approve</button><button class="btn danger" id="reject">Reject</button><button class="btn" id="hold">Hold</button></div>'+
        '<p class="hint" style="margin-top:10px">Approving means “Finance will now pay this externally” — there is deliberately no <b>Pay now</b> button and no bank field.</p></div>');
      document.getElementById('approve').onclick=function(){
        if (overCap) return;
        Perm.requirePermission(state.role,'APPROVE_SETTLEMENT');
        C.confirmDialog({ title:'Approve settlement '+s.id+'?', body:'<p>Approve <b>'+fmt.bdt(s.amountBdt)+'</b> for <b>'+esc(s.partner)+'</b>? This moves it to <b>Approved (awaiting payment)</b>. Finance then pays externally and marks it settled.</p>', warn:'This does not move money. It records that payment is authorised.', confirmLabel:'Approve settlement' }).then(function(ok){
          if(!ok) return;
          Ripples.mutate('stl:'+s.id, { status:'approved', approvedUtc:root.CRM_NOW });
          Audit.audit({ actor:actor(), action:'APPROVE_SETTLEMENT', target:s.id+' · '+s.partner, changes:{ from:s.status, to:'approved', amount:fmt.bdt(s.amountBdt) } });
          Ripples.emit({ mobileId:s.mobileId||null, kind:'partner', screen:'P48 · Approved', headline:'Settlement '+s.id+' approved for '+s.partner+' — P48 flips to Approved (awaiting payment)' });
          C.toast({ type:'success', persist:true, title:'Settlement approved', text:s.partner+' · '+fmt.bdt(s.amountBdt), ripple:s.partner.split(' ')[0]+' sees P48 → Approved' });
          go('M01');
        });
      };
      document.getElementById('reject').onclick=function(){ decideReason(s,'reject'); };
      document.getElementById('hold').onclick=function(){ decideReason(s,'hold'); };
      main.appendChild(auditNote(s.id));
    }
  };
  function decideReason(s, mode){
    formDialog({ title: mode==='reject'?'Reject settlement':'Hold settlement', danger: mode==='reject',
      intro:'<p class="hint">The reason is shown to <b>'+esc(s.partner)+'</b> on their mobile P48.</p>',
      fields:[{ type:'textarea', key:'reason', label:'Reason', required:true, placeholder: mode==='reject'?'e.g. Requested amount exceeds available approved balance.':'e.g. Awaiting confirmation of one underlying booking payment.' }]
        .concat(mode==='hold'?[{ type:'text', key:'resolve', label:'Expected resolution', placeholder:'e.g. Within 3 business days.' }]:[]),
      mobileNote:'P48 shows <b>'+(mode==='reject'?'Rejected':'On hold')+'</b> with this reason.',
      confirmLabel: mode==='reject'?'Reject settlement':'Hold settlement'
    }).then(function(v){
      if(!v) return;
      Perm.requirePermission(state.role, mode==='reject'?'REJECT_SETTLEMENT':'APPROVE_SETTLEMENT');
      Ripples.mutate('stl:'+s.id, { status: mode==='reject'?'rejected':'held', reason:v.reason, resolve:(v.resolve||null) });
      Audit.audit({ actor:actor(), action: mode==='reject'?'REJECT_SETTLEMENT':'HOLD_SETTLEMENT', target:s.id+' · '+s.partner, changes:{ from:s.status, to:mode==='reject'?'rejected':'held', reason:v.reason } });
      Ripples.emit({ mobileId:s.mobileId||null, kind:'partner', screen:'P48 · '+(mode==='reject'?'Rejected':'On hold'), reason:v.reason, headline:'Settlement '+s.id+' '+(mode==='reject'?'rejected':'held')+' for '+s.partner+' — P48 shows the reason' });
      C.toast({ type: mode==='reject'?'warning':'info', persist:true, title: mode==='reject'?'Settlement rejected':'Settlement on hold', text:s.partner+' notified.', ripple:'P48 → '+(mode==='reject'?'Rejected':'On hold')+' + reason' });
      go('M01');
    });
  }

  /* ---------- M03 · Mark as settled ⭐ (evidence, channel, non-sensitive ref) ---------- */
  SCREENS.M03 = { section:'M', title:'Mark as settled', sub:'Record an external payment — never a bank account', perm:'MARK_SETTLED',
    render:function(main, P){
      var s = P.get('id') ? PO.settlementById(P.get('id')) : PO.activeSettlements().filter(function(x){return x.status==='approved';})[0];
      main.innerHTML = header(this);
      if (!s){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'No approved settlement awaiting payment', text:'Approve a settlement (M02) first.', actionLabel:'Settlement queue' })); wireEmpty(main,'M01'); return; }
      if (s.status==='settled'){ main.insertAdjacentHTML('beforeend', C.EmptyState({ icon:'✓', title:'Already settled', text:s.id+' was settled '+fmt.dhaka(s.settledUtc)+'.', actionLabel:'Settlement history' })); wireEmpty(main,'M04'); return; }
      main.insertAdjacentHTML('beforeend','<div class="part6note">🧱 The panel does <b>not</b> pay. Finance has already paid '+esc(s.partner.split(' ')[0])+' through Salmon’s external process; this screen only <b>records</b> it. There is no bank-account field — not even here.</div>');
      main.insertAdjacentHTML('beforeend','<div class="card"><h3>Settlement '+esc(s.id)+'</h3><dl class="kv"><dt>Partner</dt><dd>'+esc(s.partner)+' · '+esc(s.partnerId)+'</dd><dt>Amount</dt><dd>'+fmt.bdt(s.amountBdt)+'</dd></dl>'+
        '<div class="field"><label>Payment date</label><input type="date" id="pdate" value="2026-07-15"></div>'+
        '<div class="field"><label>Channel category</label><select id="chan">'+PO.CHANNELS.map(function(ch){ return '<option>'+esc(ch)+'</option>'; }).join('')+'</select></div>'+
        '<div class="field"><label>Reference (non-sensitive)</label><input type="text" id="ref" placeholder="e.g. cheque no / txn ref — NOT an account number"></div>'+
        '<div class="evidence" id="ev">⬆ Upload payment evidence (mock) — filed against the settlement, never shown to the partner</div>'+
        '<div class="humannote">📱 On confirm, '+esc(s.partner.split(' ')[0])+' sees P48 → <b>Settled</b> with the reference (not the evidence).</div>'+
        '<button class="btn primary" id="settle" disabled>Mark settled</button></div>');
      var evSet=false, ev=document.getElementById('ev'), sb=document.getElementById('settle');
      ev.onclick=function(){ evSet=true; ev.classList.add('set'); ev.textContent='✓ Evidence attached: settlement-'+s.id+'.pdf (mock)'; sb.disabled=false; };
      sb.onclick=function(){
        var chan=document.getElementById('chan').value, ref=document.getElementById('ref').value.trim(), pdate=document.getElementById('pdate').value;
        Perm.requirePermission(state.role,'MARK_SETTLED');
        var stlRef = ref || ('STL-2026-'+String(90+PO.settledHistory().length+1));  // OPEN_QUESTIONS #9 — auto vs manual
        C.confirmDialog({ title:'Mark '+s.id+' settled?', body:'<p>Record that <b>'+fmt.bdt(s.amountBdt)+'</b> was paid to <b>'+esc(s.partner)+'</b> via <b>'+esc(chan)+'</b> (ref '+esc(stlRef)+')? '+esc(s.partner.split(' ')[0])+' will see P48 → Settled.</p>', confirmLabel:'Mark settled' }).then(function(ok){
          if(!ok) return;
          Ripples.mutate('stl:'+s.id, { status:'settled', settledUtc:root.CRM_NOW, channel:chan, reference:stlRef, paymentDate:pdate, evidence:'settlement-'+s.id+'.pdf' });
          Audit.audit({ actor:actor(), action:'MARK_SETTLED', target:s.id+' · '+s.partner, changes:{ from:'approved', to:'settled', amount:fmt.bdt(s.amountBdt), channel:chan, reference:stlRef } });
          Ripples.emit({ mobileId:s.mobileId||null, kind:'partner', screen:'P48 · Settled', headline:'Settled '+fmt.bdt(s.amountBdt)+' to '+s.partner+' via '+chan+' (ref '+stlRef+') — P48 → Settled, push queued' });
          C.toast({ type:'success', persist:true, title:'Settled '+fmt.bdt(s.amountBdt)+' to '+s.partner, text:'he’s been notified.', ripple:s.partner.split(' ')[0]+' sees P48 → Settled + reference' });
          go('M04');
        });
      };
      main.appendChild(auditNote(s.id));
    }
  };

  /* ---------- M04 · Settlement history ---------- */
  SCREENS.M04 = { section:'M', title:'Settlement history', sub:'Per partner and org-wide', perm:'VIEW_SETTLEMENT',
    render:function(main, P){
      var pid = P.get('id');
      var hist = PO.allSettlements().filter(function(s){ return (s.status==='settled'||s.status==='rejected') && (!pid || s.partnerId===pid); });
      main.innerHTML = header(this);
      if (!hist.length){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'No settlement history yet', text:'Settled and rejected requests appear here.' })); return; }
      var tw=C.el('<div></div>'); main.appendChild(tw);
      C.mountDataTable(tw, { rowId:'id', noun:'settlements', defaultSort:'settledUtc', defaultDir:-1, rows:hist, columns:[
        { key:'id', label:'Ref', strong:true, render:function(r){ return '<span class="mono" style="font-size:12px">'+esc(r.id)+'</span>'; } },
        { key:'partner', label:'Partner' },
        { key:'amountBdt', label:'Amount', align:'right', render:function(r){ return fmt.bdt(r.amountBdt); } },
        { key:'channel', label:'Channel', render:function(r){ return r.channel?esc(r.channel):'—'; } },
        { key:'reference', label:'Reference', render:function(r){ return r.reference?'<span class="mono" style="font-size:11px">'+esc(r.reference)+'</span>':'—'; } },
        { key:'status', label:'Status', render:function(r){ return stlChip(r.status); } },
        { key:'settledUtc', label:'Settled', render:function(r){ return r.settledUtc?fmt.dhaka(r.settledUtc):'—'; } }
      ] });
      main.insertAdjacentHTML('beforeend','<p class="metaline" style="margin-top:12px">Reference is a non-sensitive identifier (cheque no / txn ref). No account numbers are stored anywhere in this module.</p>');
    }
  };

  /* ===================== boot ===================== */
  function boot(screenId){ state.screen=screenId; state.params=new URLSearchParams(location.search); Audit.seed(CRM.auditSeed); mountShell(); renderMain(); }
  root.Payout = { boot: boot, rerender: renderMain, SCREENS: SCREENS, go: go, href: href };
})(window);
