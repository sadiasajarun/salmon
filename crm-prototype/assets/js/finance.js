/* ============================================================================
 * Salmon CRM — Finance Core engine (Part 5)
 * ----------------------------------------------------------------------------
 * screens/I0x-J0x-K0x .html bootstrap Finance.boot('I01'). Mounts the Part-1
 * shell, gates by permission, renders each screen. The module's rules:
 *  - a booking confirms ONLY after a verified webhook / wire (signature + amount
 *    + currency + reference all match; no override toggle),
 *  - the panel never touches card data (there is none),
 *  - every mutation writes audit() + a mobile ripple + a Toast,
 *  - pending-verification money is NEVER folded into paid.
 * ==========================================================================*/
(function (root) {
  'use strict';
  var C = root.C, Perm = root.Perm, Audit = root.Audit, CRM = root.CRM, Router = root.Router,
      DevToolbar = root.DevToolbar, FIN = root.CRM.Finance, Ripples = root.Ripples;

  root.CRM_NOW = '2026-07-15T10:00:00Z';
  var esc = C.esc, fmt = C.fmt;

  var state = { role: localStorage.getItem('crm_role') || Perm.ROLES.SUPER_ADMIN, render:'data', screen:null, params:null };
  function actor(){ return CRM.staff[state.role]; }
  function setRole(r){ state.role = r; localStorage.setItem('crm_role', r); }

  var FILES = {
    I01:'I01-webhook-queue.html', I02:'I02-webhook-detail.html', I03:'I03-booking-payments.html', I04:'I04-unmatched-webhooks.html',
    J01:'J01-wire-queue.html', J02:'J02-wire-detail.html', J03:'J03-offline-payments.html',
    K01:'K01-customer-ledger.html', K02:'K02-installment-schedule.html', K03:'K03-trigger-reminder.html',
    K04:'K04-invoices-list.html', K05:'K05-invoice-generation.html', K06:'K06-refund-cancellation.html'
  };
  function href(id, params){
    var f=FILES[id]; if(!f) return '#';
    if(!params) return f;
    var qs=Object.keys(params).filter(function(k){return params[k]!=null&&params[k]!=='';}).map(function(k){return k+'='+encodeURIComponent(params[k]);}).join('&');
    return qs?f+'?'+qs:f;
  }
  function go(id, params){ location.href = href(id, params); }

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
    var sc=SCREENS[state.screen]||{title:'Finance'}; var s=actor();
    tb.innerHTML =
      '<div class="breadcrumb"><a href="../index.html#/dashboard">Salmon</a><span class="sep">›</span>' +
      '<a href="'+href('I01')+'">Finance</a><span class="sep">›</span><span class="cur">'+esc(sc.title)+'</span></div><span class="spacer"></span>' +
      '<button class="searchbtn" id="searchbtn">🔎 <span>Search…</span><kbd>⌘K</kbd></button><span id="devmount"></span>' +
      '<button class="icobtn" id="bell">🔔</button>' +
      '<div class="user"><span class="avatar">'+esc(s.initials)+'</span><span class="who"><span class="nm">'+esc(s.name)+'</span><span class="rl">'+Perm.ROLE_LABEL[state.role]+'</span></span></div>';
    document.getElementById('devmount').appendChild(DevToolbar.render({
      role: state.role, state: state.render,
      onRole:function(r){ setRole(r); renderTopbar(); renderSidebar(); renderFooter(); renderMain(); },
      onState:function(st){ state.render=st; renderMain(); },
      onReset:function(){ Ripples.reset(); C.toast({type:'info',title:'Mock data reset',text:'Finance and mobile ripples restored to seed.'}); renderMain(); }
    }));
    document.getElementById('searchbtn').onclick=function(){ location.href='../index.html#/dashboard'; };
    document.getElementById('bell').onclick=function(){ C.toast({type:'info',title:'Notifications',text:'The notification centre lives on the console home (Part 1).'}); };
  }
  function renderSidebar(){
    var sb=document.getElementById('sidebar'); if(!sb) return;
    var groups=Router.getSidebarFor(state.role);
    var MODMAP={ finance:href('I01'), people:'B02-approval-queue.html', catalogue:'E01-projects-list.html', pipeline:'F01-leads-list.html' };
    sb.innerHTML = groups.map(function(g){
      return '<div class="navgroup"><div class="gl">'+esc(g.title)+'</div>'+g.items.map(function(it){
        var active=it.id==='finance'; var route=MODMAP[it.id]||('../index.html'+it.route);
        return '<a class="navitem'+(active?' active':'')+'" href="'+route+'"><span class="ic">'+it.icon+'</span><span class="lb">'+esc(it.label)+'</span>'+(it.count?'<span class="count">'+it.count+'</span>':'')+'</a>';
      }).join('')+'</div>';
    }).join('');
  }
  function renderFooter(){ var ft=document.getElementById('footer'); if(!ft)return; var s=actor();
    ft.innerHTML='<b style="color:var(--ink-2)">'+esc(s.name)+'</b> · '+Perm.ROLE_LABEL[state.role]+' · '+esc(s.office)+'<span class="spacer" style="flex:1"></span><span>Salmon Admin · Finance Core (Part 5)</span>'; }
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
      Audit.audit({ actor:actor(), action:'ACCESS_DENIED', target:'Finance · '+sc.title });
      main.innerHTML=deniedPanel(sc.title, sc.perm); wireDenied(main); return;
    }
    if(state.render==='loading'){ main.innerHTML=header(sc)+skeleton(); return; }
    if(state.render==='error'){ main.innerHTML=header(sc)+statePanel('error'); return; }
    if(state.render==='offline'){ main.innerHTML=header(sc)+statePanel('offline'); return; }
    if(state.render==='empty'){ main.innerHTML=header(sc)+(sc.emptyState?sc.emptyState():C.EmptyState({title:'Nothing here',text:'This view has no records in the current state.'})); return; }
    try{ sc.render(main, state.params); }catch(e){ console.error(e); main.innerHTML=header(sc)+statePanel('error'); }
    updateFab();
  }
  function header(sc){ return C.PageHeader({ title:sc.title, sub:sc.sub }); }
  function deniedPanel(what, perm){
    return '<div class="authwrap" style="min-height:auto;padding:40px 0"><div class="authcard denied" style="text-align:center">' +
      '<div class="mark" style="margin:0 auto 14px">⛔</div><h1>Access denied</h1>' +
      '<p>Your role — <b>'+Perm.ROLE_LABEL[state.role]+'</b> — cannot open <b>'+esc(what)+'</b>.'+(perm?' Required permission: <span class="mono">'+perm+'</span>.':'')+'<br>Permissions are enforced server-side; this isn’t a UI glitch.</p>' +
      '<button class="btn primary" id="back-fin" style="width:auto;margin:4px auto 0">Back to Finance</button></div></div>';
  }
  function wireDenied(main){ var b=main.querySelector('#back-fin'); if(b) b.onclick=function(){ go('I01'); }; }
  function skeleton(){ var rows=Array(6).fill(0).map(function(){return '<div class="sk" style="height:34px;margin:6px 0"></div>';}).join(''); return '<div class="tablewrap" style="padding:10px">'+rows+'</div>'; }
  function statePanel(kind){
    if(kind==='offline') return C.EmptyState({icon:'⚠',title:'You’re offline',text:'We can’t reach the Salmon servers. Payment confirmation is unavailable until you reconnect.'});
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
        return '<div class="field">'+lab+'<input type="text" data-fk="'+f.key+'" value="'+esc(f.value||'')+'" placeholder="'+esc(f.placeholder||'')+'"></div>';
      }).join('');
      var scrim=C.el('<div class="modalscrim"><div class="modal" style="width:'+(cfg.width||480)+'px"><div class="mh"><h3>'+esc(cfg.title)+'</h3></div>'+
        '<div class="mb">'+(cfg.intro||'')+fieldsHtml+(cfg.mobileNote?'<div class="mobilenote">📱 '+cfg.mobileNote+'</div>':'')+'</div>'+
        (cfg.warn?'<div class="warn">⚠ '+esc(cfg.warn)+'</div>':'')+
        '<div class="mf"><button class="btn" data-x>Cancel</button><button class="btn '+(cfg.danger?'danger':'primary')+'" data-ok'+(cfg.okDisabled?' disabled':'')+'>'+esc(cfg.confirmLabel||'Confirm')+'</button></div></div></div>');
      function collect(){ var o={}; scrim.querySelectorAll('[data-fk]').forEach(function(i){ o[i.getAttribute('data-fk')]=i.value.trim(); }); return o; }
      function close(v){ scrim.remove(); document.removeEventListener('keydown',key); resolve(v); }
      function key(e){ if(e.key==='Escape') close(null); }
      scrim.addEventListener('click',function(e){ if(e.target===scrim) close(null); });
      scrim.querySelector('[data-x]').onclick=function(){ close(null); };
      scrim.querySelector('[data-ok]').onclick=function(){ var vals=collect(); var bad=(cfg.fields||[]).filter(function(f){return f.required&&!vals[f.key];});
        if(bad.length){ var f0=scrim.querySelector('[data-fk="'+bad[0].key+'"]'); if(f0){f0.style.borderColor='var(--red)';f0.focus();} C.toast({type:'warning',title:'A required field is empty',text:bad[0].label+' is required.'}); return; } close(vals); };
      document.addEventListener('keydown',key); document.body.appendChild(scrim);
      var first=scrim.querySelector('[data-fk],[data-ok]'); if(first) first.focus();
    });
  }

  /* ===================== helpers ===================== */
  function auditNote(id){ var n=C.el(C.AuditNote({actor:actor().name,when:root.CRM_NOW})); n.querySelector('.lk').onclick=function(){ C.toast({type:'info',title:'Audit slice',text:'Opens the audit log filtered to '+(id||'this record')+' (Super Admin · Part 7).'}); }; return n; }
  function wireEmpty(main, screen){ var b=main.querySelector('[data-empty-act]'); if(b) b.onclick=function(){ go(screen); }; }
  function readOv(){ try{ return JSON.parse(localStorage.getItem('crm_people_mut')||'{}'); }catch(e){ return {}; } }
  function pushArray(key, row){ var full=readOv(); full[key]=[row].concat(full[key]||[]); try{ localStorage.setItem('crm_people_mut', JSON.stringify(full)); }catch(e){} }
  function money(amt, cur){ return fmt.money(amt, cur||'BDT'); }
  function ageDays(iso){ return (new Date(root.CRM_NOW)-new Date(iso))/86400000; }
  function ageChip(iso, slaDays){ var d=ageDays(iso); var cls=d>=(slaDays||3)?'over':d>=(slaDays||3)*0.66?'warn':'ok'; return '<span class="sla '+cls+'">'+(d<1?Math.round(d*24)+'h':Math.floor(d)+'d')+'</span>'; }

  // shared: confirm a booking (from a verified webhook or wire) — the one place it happens
  function confirmBooking(booking, opts){
    // opts: { via:'webhook'|'wire', ref, mobileId, client }
    var invId = FIN.CONFIG.invoicePrefix + String(300 + FIN.allInvoices().length);
    Ripples.mutate('booking:'+booking.id, { status:'confirmed' });
    // token installment → paid
    Ripples.mutate('inst:'+booking.id+':1', { status:'paid', paidUtc:root.CRM_NOW });
    pushArray('invoiceAdd', { id:invId, clientId:booking.clientId, client:booking.client, project:booking.project, bookingId:booking.id, amountBdt:booking.tokenBdt, issuedUtc:root.CRM_NOW, type:'Booking token' });
    Audit.audit({ actor:actor(), action:'CONFIRM_BOOKING', target:booking.id+' · '+booking.client, changes:{ via:opts.via, ref:opts.ref, unit:booking.unit+' → sold', invoice:invId } });
    Ripples.emit({ mobileId:opts.mobileId, kind:'client', status:'verified', screen:'Screen 43 · Booking confirmed', name:booking.client,
      headline:'Booking '+booking.id+' confirmed ('+booking.client+') — unit '+booking.unit+' locked → sold · receipt + invoice '+invId+' issued' });
    C.toast({ type:'success', persist:true, title:'Booking '+booking.id+' confirmed', text:booking.client+' notified · unit '+booking.unit+' → sold · invoice '+invId+'.', ripple:booking.client.split(' ')[0]+' sees screen 43 (confirmed) + receipt' });
    return invId;
  }

  // webhook match verdict — the gate
  function matchVerdict(wh, booking){
    var checks = [
      { key:'signature', label:'Signature verified', ok:!!wh.signatureValid, cmp: wh.signatureValid?'valid':'INVALID' },
      { key:'reference', label:'Reference matches issued', ok: booking ? wh.ref===booking.expectedRef : false, cmp: (wh.ref||'—')+(booking? ' vs '+booking.expectedRef : '') },
      { key:'amount', label:'Amount matches booking token', ok: booking ? wh.amount===booking.tokenBdt : false, cmp: (booking? fmt.money(wh.amount,wh.currency)+' vs '+fmt.bdt(booking.tokenBdt) : '—') },
      { key:'currency', label:'Currency matches', ok: booking ? wh.currency===booking.currency : false, cmp: (booking? wh.currency+' vs '+booking.currency : '—') }
    ];
    var allOk = checks.every(function(c){ return c.ok; });
    var firstBad = checks.filter(function(c){ return !c.ok; })[0];
    return { checks:checks, allOk:allOk, reason: firstBad ? firstBad.label.replace('matches','mismatch').replace('verified','invalid') : null };
  }

  /* ===================== SCREENS ===================== */
  var SCREENS = {};

  /* ---------- I01 · Webhook queue ⭐ ---------- */
  SCREENS.I01 = { title:'Webhook reconciliation', sub:'Signed gateway webhooks awaiting match to a booking', perm:'VIEW_PAYMENTS',
    emptyState:function(){ return C.EmptyState({ icon:'✓', title:'All webhooks reconciled', text:'Signed gateway callbacks appear here to match to a booking.' }); },
    render:function(main){
      var q = FIN.webhookQueue();
      main.innerHTML = C.PageHeader({ title:this.title, sub:this.sub, actions:[{ id:'payouts', label:'Partner payouts', icon:'₿' }, { id:'anom', label:'Unmatched / anomalies', icon:'⚠' }] });
      var pb=main.querySelector('[data-act="payouts"]'); if(pb) pb.onclick=function(){ location.href='L01-commission-queue.html'; };
      var ab=main.querySelector('[data-act="anom"]'); if(ab) ab.onclick=function(){ go('I04'); };
      main.insertAdjacentHTML('beforeend', '<p class="metaline">The panel confirms a booking <b>only</b> after signature + amount + currency + reference all match. There is no manual "mark as paid" that skips verification.</p>');
      if (!q.length){ main.insertAdjacentHTML('beforeend', this.emptyState()); return; }
      var tw=C.el('<div></div>'); main.appendChild(tw);
      C.mountDataTable(tw, { rowId:'id', noun:'webhooks', defaultSort:'receivedUtc', defaultDir:-1, rows:q, columns:[
        { key:'gateway', label:'Gateway', strong:true },
        { key:'ref', label:'Reference', render:function(r){ return '<span class="mono" style="font-size:12px">'+esc(r.ref)+'</span>'; } },
        { key:'amount', label:'Amount', align:'right', render:function(r){ return money(r.amount, r.currency); } },
        { key:'currency', label:'Cur', render:function(r){ return esc(r.currency); } },
        { key:'sig', label:'Signature', render:function(r){ return r.signatureValid?'<span class="sigbadge ok">🔒 Verified</span>':'<span class="sigbadge bad">✕ Invalid</span>'; } },
        { key:'matched', label:'Matched booking', render:function(r){ return r.matchedBookingId?'<span class="mono" style="font-size:12px">'+esc(r.matchedBookingId)+'</span>':'<span class="chip amber"><span class="d"></span>unmatched</span>'; } },
        { key:'receivedUtc', label:'Received', render:function(r){ return fmt.dhaka(r.receivedUtc,true); } }
      ], rowActions:[ { label:'Open / reconcile', icon:'↗', onClick:function(r){ go('I02',{id:r.id}); } } ], onRowClick:function(r){ go('I02',{id:r.id}); } });
    }
  };

  /* ---------- I02 · Webhook detail (match-gated confirm) ⭐ ---------- */
  SCREENS.I02 = { title:'Webhook detail', perm:'VIEW_PAYMENTS',
    render:function(main, P){
      var wh = P.get('id') ? FIN.webhookById(P.get('id')) : FIN.webhookQueue()[0];
      main.innerHTML = header(this);
      if (!wh){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'Webhook not found', actionLabel:'Webhook queue' })); wireEmpty(main,'I01'); return; }
      var booking = wh.matchedBookingId ? FIN.bookingById(wh.matchedBookingId) : null;
      var v = matchVerdict(wh, booking);
      var confirmed = wh.status==='confirmed' || (booking && booking.status==='confirmed');
      main.insertAdjacentHTML('beforeend',
        '<div class="reconsplit"><div class="reconpane"><div class="rph"><h3>Raw webhook</h3>'+(wh.signatureValid?'<span class="sigbadge ok" style="margin-left:auto">🔒 Signature verified</span>':'<span class="sigbadge bad" style="margin-left:auto">✕ Signature invalid</span>')+'</div>'+
        '<div class="rpb"><div class="rawfields">'+
          '<div><span class="k">id:</span> <span class="v">'+esc(wh.id)+'</span></div>'+
          '<div><span class="k">gateway:</span> <span class="v">'+esc(wh.gateway)+'</span></div>'+
          '<div><span class="k">reference:</span> <span class="v">'+esc(wh.ref)+'</span></div>'+
          '<div><span class="k">amount:</span> <span class="v">'+money(wh.amount,wh.currency)+'</span></div>'+
          '<div><span class="k">currency:</span> <span class="v">'+esc(wh.currency)+'</span></div>'+
          '<div><span class="k">received:</span> <span class="v">'+esc(fmt.dhaka(wh.receivedUtc,true))+'</span></div>'+
        '</div><p class="hint" style="margin-top:10px">The panel reconciles the <b>reference</b>, never card data. There are no card fields in this payload.</p></div></div>'+
        '<div class="reconpane"><div class="rph"><h3>'+(booking?'Matched booking':'Unmatched — resolve')+'</h3></div><div class="rpb" id="matchpane"></div></div></div>');

      var mp = document.getElementById('matchpane');
      if (!booking){
        mp.innerHTML = '<p class="hint" style="margin-bottom:8px">The reference did not resolve to a booking. Search and match manually — no auto-matching.</p>'+
          '<div class="field"><label>Search booking by reference / client</label><input type="text" id="bsearch" placeholder="e.g. BK-2024-…"></div>'+
          '<button class="btn" id="resolve">Mark as anomaly (resolve later)</button>';
        document.getElementById('resolve').onclick=function(){ Perm.requirePermission(state.role,'CONFIRM_WEBHOOK'); Ripples.mutate('wh:'+wh.id,{status:'resolved'}); Audit.audit({actor:actor(),action:'RESOLVE_ANOMALY',target:wh.id}); C.toast({type:'info',title:'Marked as anomaly',text:wh.id+' moved to manual resolution.'}); go('I04'); };
        main.appendChild(auditNote(wh.id)); return;
      }
      // matched → show booking + match checklist
      mp.innerHTML =
        '<dl class="kv" style="margin-bottom:12px"><dt>Booking</dt><dd>'+esc(booking.id)+'</dd><dt>Client</dt><dd>'+esc(booking.client)+'</dd><dt>Project</dt><dd>'+esc(booking.project)+' · '+esc(booking.unit)+'</dd><dt>Expected ref</dt><dd class="mono">'+esc(booking.expectedRef)+'</dd><dt>Booking token</dt><dd>'+fmt.bdt(booking.tokenBdt)+' '+booking.currency+'</dd></dl>'+
        '<div class="matchlist">'+v.checks.map(function(c){ return '<div class="matchrow '+(c.ok?'ok':'bad')+'"><span class="ic">'+(c.ok?'✓':'✕')+'</span><span class="lb">'+esc(c.label)+'</span><span class="cmp">'+esc(c.cmp)+'</span></div>'; }).join('')+'</div>'+
        (confirmed ? '<div class="confirmnote ok">✓ Booking already confirmed.</div>'
          : v.allOk ? '<div class="confirmnote ok">All checks pass — confirmation enabled.</div>'
          : '<div class="confirmnote">Confirmation disabled — '+esc(v.reason)+'. No override in the prototype (OPEN_QUESTIONS #5).</div>')+
        (confirmed ? '' : '<button class="btn primary" id="confirm" style="width:100%;justify-content:center"'+(v.allOk?'':' disabled')+'>Confirm booking '+esc(booking.id)+'</button>');
      var cb=document.getElementById('confirm');
      if (cb) cb.onclick=function(){
        Perm.requirePermission(state.role,'CONFIRM_WEBHOOK');
        var client = (root.CRM.People && root.CRM.People.clientById) ? root.CRM.People.clientById(booking.clientId) : null;
        C.confirmDialog({ title:'Confirm booking '+booking.id+'?', body:'<p>Signature valid and all fields match. Confirm <b>'+esc(booking.client)+'</b>’s booking? Unit <b>'+esc(booking.unit)+'</b> locks → <b>sold</b>, an invoice is generated, and the client is notified.</p>', warn:'This is only reachable because every check passed. It cannot be undone here.', confirmLabel:'Confirm booking' }).then(function(ok){
          if(!ok) return;
          Ripples.mutate('wh:'+wh.id,{status:'confirmed'});
          confirmBooking(booking, { via:'webhook', ref:wh.ref, mobileId:(client&&client.mobileId)||booking.clientId });
          go('I01');
        });
      };
      main.appendChild(auditNote(wh.id));
    }
  };

  /* ---------- I03 · Booking payments ---------- */
  SCREENS.I03 = { title:'Booking payments', perm:'VIEW_PAYMENTS',
    render:function(main, P){
      var b = P.get('id') ? FIN.bookingById(P.get('id')) : FIN.allBookings()[0];
      main.innerHTML = header(this);
      if (!b){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'Booking not found' })); return; }
      main.insertAdjacentHTML('beforeend', '<div class="card"><h3>Booking '+esc(b.id)+'</h3><dl class="kv"><dt>Client</dt><dd>'+esc(b.client)+'</dd><dt>Project</dt><dd>'+esc(b.project)+' · '+esc(b.unit)+'</dd><dt>Total</dt><dd>'+fmt.bdt(b.totalBdt)+'</dd><dt>Status</dt><dd>'+C.StatusChip(b.status==='confirmed'?'approved':b.status==='cancelled'?'rejected':'pending')+'</dd></dl></div>');
      main.insertAdjacentHTML('beforeend','<div class="sectitle">Payments · statuses shown honestly</div>');
      var tw=C.el('<div></div>'); main.appendChild(tw);
      var rows = b.installments.map(function(i){ return { no:'Installment '+i.no, due:i.dueUtc, amt:i.amountBdt, status:i.status }; });
      C.mountDataTable(tw, { rowId:'no', noun:'payments', rows:rows, columns:[
        { key:'no', label:'Item', strong:true }, { key:'due', label:'Due', render:function(r){ return fmt.dhaka(r.due); } },
        { key:'amt', label:'Amount', align:'right', render:function(r){ return fmt.bdt(r.amt); } },
        { key:'status', label:'Status', render:function(r){ return instChip(r.status); } }
      ] });
      main.insertAdjacentHTML('beforeend','<p class="metaline" style="margin-top:12px">Pending / unverified money is never shown as paid — same rule the mobile app follows.</p>');
      main.appendChild(auditNote(b.id));
    }
  };

  /* ---------- I04 · Unmatched webhooks / anomalies ---------- */
  SCREENS.I04 = { title:'Unmatched webhooks & anomalies', sub:'References that don’t resolve — manual resolution', perm:'VIEW_PAYMENTS',
    emptyState:function(){ return C.EmptyState({ icon:'✓', title:'No anomalies', text:'Every signed webhook resolved to a booking.' }); },
    render:function(main){
      var q = FIN.unmatchedWebhooks();
      main.innerHTML = header(this);
      if (!q.length){ main.insertAdjacentHTML('beforeend', this.emptyState()); return; }
      var tw=C.el('<div></div>'); main.appendChild(tw);
      C.mountDataTable(tw, { rowId:'id', noun:'anomalies', rows:q, columns:[
        { key:'gateway', label:'Gateway', strong:true }, { key:'ref', label:'Reference', render:function(r){ return '<span class="mono" style="font-size:12px">'+esc(r.ref)+'</span>'; } },
        { key:'amount', label:'Amount', align:'right', render:function(r){ return money(r.amount,r.currency); } },
        { key:'sig', label:'Signature', render:function(r){ return r.signatureValid?'<span class="sigbadge ok">🔒 Verified</span>':'<span class="sigbadge bad">✕ Invalid</span>'; } },
        { key:'receivedUtc', label:'Received', render:function(r){ return fmt.dhaka(r.receivedUtc,true); } }
      ], rowActions:[ { label:'Resolve manually', icon:'⚙', onClick:function(r){ go('I02',{id:r.id}); } } ], onRowClick:function(r){ go('I02',{id:r.id}); } });
    }
  };

  /* ---------- J01 · Wire verification queue ⭐ ---------- */
  SCREENS.J01 = { title:'Wire verification queue', sub:'Client wires awaiting Finance to confirm receipt', perm:'VIEW_PAYMENTS',
    emptyState:function(){ return C.EmptyState({ icon:'✓', title:'No wires pending', text:'International wire records awaiting verification appear here.' }); },
    render:function(main){
      var q = FIN.wireQueue();
      main.innerHTML = header(this);
      if (!q.length){ main.insertAdjacentHTML('beforeend', this.emptyState()); return; }
      main.insertAdjacentHTML('beforeend','<p class="metaline">Age is prominent — a wire pending days is a nervous customer (SLA undefined, OPEN_QUESTIONS #4).</p>');
      var tw=C.el('<div></div>'); main.appendChild(tw);
      C.mountDataTable(tw, { rowId:'id', noun:'wires', defaultSort:'initiatedUtc', defaultDir:1, rows:q, columns:[
        { key:'client', label:'Client', strong:true },
        { key:'amount', label:'Expected', align:'right', render:function(r){ return money(r.amountOrig, r.currency); } },
        { key:'quotedRef', label:'Quoted ref', render:function(r){ return '<span class="mono" style="font-size:12px">'+esc(r.quotedRef)+'</span>'; } },
        { key:'project', label:'Project' },
        { key:'status', label:'Status', render:function(r){ return C.StatusChip(r.status==='held'?'onHold':'pending'); } },
        { key:'initiatedUtc', label:'Age', align:'right', sortable:true, sortValue:function(r){return r.initiatedUtc;}, render:function(r){ return ageChip(r.initiatedUtc, 3); } }
      ], rowActions:[ { label:'Verify / review', icon:'↗', onClick:function(r){ go('J02',{id:r.id}); } } ], onRowClick:function(r){ go('J02',{id:r.id}); } });
    }
  };

  /* ---------- J02 · Wire verification detail ⭐ ---------- */
  SCREENS.J02 = { title:'Wire verification', perm:'VIEW_PAYMENTS',
    render:function(main, P){
      var wr = P.get('id') ? FIN.wireById(P.get('id')) : FIN.wireQueue()[0];
      main.innerHTML = header(this);
      if (!wr){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'Wire not found', actionLabel:'Wire queue' })); wireEmpty(main,'J01'); return; }
      var booking = wr.bookingId ? FIN.bookingById(wr.bookingId) : null;
      var done = wr.status==='verified' || wr.status==='rejected';
      main.insertAdjacentHTML('beforeend',
        '<div class="reconsplit"><div class="reconpane"><div class="rph"><h3>Client-submitted wire</h3><span class="sla '+(ageDays(wr.initiatedUtc)>=3?'over':'warn')+'" style="margin-left:auto">'+(Math.floor(ageDays(wr.initiatedUtc)))+'d old</span></div><div class="rpb"><dl class="kv">'+
          '<dt>Client</dt><dd>'+esc(wr.client)+'</dd><dt>Quoted reference</dt><dd class="mono">'+esc(wr.quotedRef)+'</dd>'+
          '<dt>Expected amount</dt><dd>'+money(wr.amountOrig, wr.currency)+'</dd><dt>Expected currency</dt><dd>'+esc(wr.currency)+'</dd>'+
          '<dt>Initiated</dt><dd>'+esc(fmt.dhaka(wr.initiatedUtc,true))+'</dd>'+(booking?'<dt>Booking</dt><dd>'+esc(booking.id)+' · '+esc(booking.unit)+'</dd>':'')+'</dl></div></div>'+
        '<div class="reconpane"><div class="rph"><h3>Finance action</h3></div><div class="rpb" id="wireact"></div></div></div>');
      var wa=document.getElementById('wireact');
      if (done){ wa.innerHTML='<div class="confirmnote '+(wr.status==='verified'?'ok':'')+'">'+(wr.status==='verified'?'✓ Wire verified — booking confirmed.':'✕ Wire rejected'+(wr.reason?' — '+esc(wr.reason):'')+'.')+'</div>'; main.appendChild(auditNote(wr.id)); return; }
      var evidenceSet=false;
      wa.innerHTML = '<p class="hint" style="margin-bottom:8px">Verify against the <b>bank statement</b>. The panel records that Finance checked — it never auto-confirms.</p>'+
        '<div class="evidence" id="ev">⬆ Upload bank-statement evidence (mock)</div>'+
        '<div class="matchlist"><label class="matchrow ok" style="cursor:pointer"><input type="checkbox" id="ck-amt" style="accent-color:var(--maroon)"> <span class="lb">Amount received matches expected</span></label>'+
        '<label class="matchrow ok" style="cursor:pointer"><input type="checkbox" id="ck-ref" style="accent-color:var(--maroon)"> <span class="lb">Reference on statement matches quoted</span></label></div>'+
        '<div class="racts" style="display:flex;gap:8px"><button class="btn primary" id="verify" disabled>Verify receipt</button><button class="btn" id="hold">Hold</button><button class="btn danger" id="reject">Reject</button></div>';
      var ev=document.getElementById('ev'); ev.onclick=function(){ evidenceSet=true; ev.classList.add('set'); ev.textContent='✓ Evidence attached: statement-'+wr.id+'.pdf (mock)'; recompute(); };
      var ckA=document.getElementById('ck-amt'), ckR=document.getElementById('ck-ref'), vbtn=document.getElementById('verify');
      function recompute(){ vbtn.disabled = !(evidenceSet && ckA.checked && ckR.checked); }
      ckA.onchange=recompute; ckR.onchange=recompute;
      vbtn.onclick=function(){
        Perm.requirePermission(state.role,'VERIFY_WIRE');
        C.confirmDialog({ title:'Verify wire '+wr.id+'?', body:'<p>Confirm receipt of <b>'+money(wr.amountOrig,wr.currency)+'</b> from <b>'+esc(wr.client)+'</b> against the bank statement?'+(booking?' This confirms booking <b>'+esc(booking.id)+'</b>.':'')+'</p>', warn:'Only confirm after checking the statement.', confirmLabel:'Verify receipt' }).then(function(ok){
          if(!ok) return;
          Ripples.mutate('wire:'+wr.id, { status:'verified', verifiedUtc:root.CRM_NOW, evidence:'statement-'+wr.id+'.pdf' });
          Audit.audit({ actor:actor(), action:'VERIFY_WIRE', target:wr.id+' · '+wr.client, changes:{ from:'pending', to:'verified', amount:money(wr.amountOrig,wr.currency) } });
          if (booking){ confirmBooking(booking, { via:'wire', ref:wr.quotedRef, mobileId:wr.mobileId }); }
          else { Ripples.emit({ mobileId:wr.mobileId, kind:'client', status:'verified', screen:'Payment · success', name:wr.client, headline:'Wire '+wr.id+' verified — '+wr.client+'’s payment flips pending → success' });
            C.toast({ type:'success', persist:true, title:'Wire verified', text:wr.client+' · '+money(wr.amountOrig,wr.currency), ripple:wr.client.split(' ')[0]+'’s payment: pending → success' }); }
          go('J01');
        });
      };
      document.getElementById('hold').onclick=function(){ Perm.requirePermission(state.role,'VERIFY_WIRE'); Ripples.mutate('wire:'+wr.id,{status:'held'}); Audit.audit({actor:actor(),action:'HOLD_WIRE',target:wr.id}); C.toast({type:'warning',title:'Wire on hold',text:wr.id}); go('J01'); };
      document.getElementById('reject').onclick=function(){ rejectWire(wr); };
      main.appendChild(auditNote(wr.id));
    }
  };
  function rejectWire(wr){
    formDialog({ title:'Reject wire', danger:true,
      intro:'<p class="hint">The reason is shown to <b>'+esc(wr.client)+'</b> on their failed-payment screen.</p>',
      fields:[ { type:'textarea', key:'reason', label:'Rejection reason', required:true, placeholder:'e.g. Amount received does not match the quoted amount; please re-send the difference.' } ],
      mobileNote:'The client sees the payment as <b>failed</b> with this reason.',
      confirmLabel:'Reject wire' }).then(function(v){
      if(!v) return;
      Perm.requirePermission(state.role,'REJECT_PAYMENT');
      Ripples.mutate('wire:'+wr.id, { status:'rejected', reason:v.reason });
      Audit.audit({ actor:actor(), action:'REJECT_PAYMENT', target:wr.id+' · '+wr.client, changes:{ reason:v.reason } });
      Ripples.emit({ mobileId:wr.mobileId, kind:'client', status:'rejected', screen:'Payment · failed', name:wr.client, reason:v.reason, headline:'Wire '+wr.id+' rejected — '+wr.client+' sees payment failed with the reason' });
      C.toast({ type:'warning', persist:true, title:'Wire rejected', text:wr.client+' notified.', ripple:'payment shows failed + your reason' });
      go('J01');
    });
  }

  /* ---------- J03 / BR04 · Offline booking payment-history desk ----------
   * The integrity screen (Req 6.10.4). Finance can VERIFY a partner-recorded
   * claim, or CORRECT / REJECT / REVERSE it — the last three each demand a
   * MANDATORY REASON and write an audit entry. Nothing is ever hard-deleted:
   * every action is a status transition + a reason kept on the record's history.
   * A partner-recorded row is an *unverified claim* until finance confirms it. */
  function offPill(st){
    var m={ pending:['amber','Recorded · unverified'], verified:['green','Verified'], corrected:['blue','Corrected'], rejected:['red','Rejected'], reversed:['grey','Reversed'] };
    var x=m[st]||['grey',st]; return '<span class="pill '+x[0]+'"><span class="dot"></span>'+esc(x[1])+'</span>';
  }
  function offHistory(r){ return (r.history||[]).concat([{ action:'RECORDED', by:r.partner+' (partner)', at:r.submittedUtc, reason:'Offline '+(r.kind||'payment')+' recorded — '+r.method+', ref '+(r.reference||'—') }]); }
  function pushOffHistory(r, entry){
    var ov=readOv(); var patch=ov['off:'+r.id]||{}; patch.history=[entry].concat(patch.history||r.history||[]);
    return patch;
  }
  function verifyOffline(r, after){
    C.confirmDialog({ title:'Verify payment '+r.id+'?', body:'<p>Confirm this <b>offline</b> '+(r.kind||'payment')+' of <b>'+fmt.bdt(r.amountBdt)+'</b> from <b>'+esc(r.buyer)+'</b> (recorded by '+esc(r.partner)+') against the evidence in the repository. This records that finance <b>verified a fact</b> — it moves no money.', warn:'Only verify after checking the attached evidence ('+esc(r.evidence||'—')+').', confirmLabel:'Verify payment' }).then(function(ok){
      if(!ok) return;
      Perm.requirePermission(state.role,'VERIFY_PAYMENT');
      var patch=pushOffHistory(r,{ action:'VERIFIED', by:actor().name, at:root.CRM_NOW, reason:'' }); patch.status='verified'; patch.verifiedUtc=root.CRM_NOW;
      Ripples.mutate('off:'+r.id, patch);
      Audit.audit({ actor:actor(), action:'VERIFY_OFFLINE_PAYMENT', target:r.id+' · '+r.buyer, changes:{ from:'pending', to:'verified', amount:fmt.bdt(r.amountBdt) } });
      Ripples.emit({ mobileId:r.partnerId, kind:'partner', screen:'P42 · Record status', headline:'Payment '+r.id+' ('+r.buyer+') verified — the partner’s record flips Unverified → Verified' });
      C.toast({ type:'success', title:'Payment verified', text:r.buyer+' · '+fmt.bdt(r.amountBdt), ripple:'partner sees “Verified”' });
      after&&after();
    });
  }
  function correctOffline(r, after){
    formDialog({ title:'Correct payment '+r.id, width:520,
      intro:'<p class="hint">A correction fixes a mis-recorded value without deleting the entry. The old value is kept in the audit trail. The partner keeps seeing a simplified status only.</p>',
      fields:[
        { type:'text', key:'amount', label:'Corrected amount (BDT)', value:String(r.amountBdt), placeholder:'e.g. 450000' },
        { type:'select', key:'method', label:'Method (category)', value:r.method, options:['Cash','Bank transfer','Cheque','MFS (bKash)','MFS (Nagad)','Other'] },
        { type:'text', key:'reference', label:'Non-sensitive reference', value:r.reference||'', placeholder:'office receipt / slip no.' },
        { type:'textarea', key:'reason', label:'Reason for correction', required:true, placeholder:'e.g. Partner recorded 500,000 but the deposit slip shows 450,000.' }
      ],
      warn:'This overwrites the recorded value. The original is preserved in the audit log — never deleted.',
      confirmLabel:'Save correction' }).then(function(v){
      if(!v) return;
      Perm.requirePermission(state.role,'CORRECT_PAYMENT');
      var newAmt=parseInt(String(v.amount).replace(/[^\d]/g,''),10)||r.amountBdt;
      var patch=pushOffHistory(r,{ action:'CORRECTED', by:actor().name, at:root.CRM_NOW, reason:v.reason, from:fmt.bdt(r.amountBdt)+' · '+r.method, to:fmt.bdt(newAmt)+' · '+v.method });
      patch.status='corrected'; patch.amountBdt=newAmt; patch.method=v.method; patch.reference=v.reference;
      Ripples.mutate('off:'+r.id, patch);
      Audit.audit({ actor:actor(), action:'CORRECT_OFFLINE_PAYMENT', target:r.id+' · '+r.buyer, changes:{ from:fmt.bdt(r.amountBdt)+' · '+r.method, to:fmt.bdt(newAmt)+' · '+v.method, reason:v.reason } });
      Ripples.emit({ mobileId:r.partnerId, kind:'partner', screen:'P42 · Record status', headline:'Payment '+r.id+' ('+r.buyer+') corrected by finance — partner still sees a simplified status' });
      C.toast({ type:'success', title:'Correction saved', text:r.buyer+' · '+fmt.bdt(newAmt), ripple:'audited — original kept' });
      after&&after();
    });
  }
  function rejectOffline(r, after){
    formDialog({ title:'Reject payment '+r.id, danger:true,
      intro:'<p class="hint">Rejecting a recorded claim that finance could not confirm. The reason is shown to the partner on their record-status screen.</p>',
      fields:[ { type:'textarea', key:'reason', label:'Rejection reason', required:true, placeholder:'e.g. No matching deposit found on the bank statement for this reference.' } ],
      mobileNote:'The partner sees the record move to <b>Rejected</b> with this reason.',
      warn:'The record is retained as rejected — never deleted.',
      confirmLabel:'Reject payment' }).then(function(v){
      if(!v) return;
      Perm.requirePermission(state.role,'REJECT_PAYMENT');
      var patch=pushOffHistory(r,{ action:'REJECTED', by:actor().name, at:root.CRM_NOW, reason:v.reason }); patch.status='rejected'; patch.reason=v.reason;
      Ripples.mutate('off:'+r.id, patch);
      Audit.audit({ actor:actor(), action:'REJECT_OFFLINE_PAYMENT', target:r.id+' · '+r.buyer, changes:{ from:r.status, to:'rejected', reason:v.reason } });
      Ripples.emit({ mobileId:r.partnerId, kind:'partner', screen:'P42 · Record status', reason:v.reason, headline:'Payment '+r.id+' ('+r.buyer+') rejected — partner sees Rejected with the reason' });
      C.toast({ type:'warning', title:'Payment rejected', text:r.buyer+' notified.', ripple:'partner sees “Rejected” + reason' });
      after&&after();
    });
  }
  function reverseOffline(r, after){
    formDialog({ title:'Reverse verified payment '+r.id, danger:true,
      intro:'<p class="hint">Reversing a <b>previously verified</b> payment (e.g. a cheque later bounced). This records that the money is no longer counted — it moves no money and does not delete the entry.</p>',
      fields:[ { type:'textarea', key:'reason', label:'Reason for reversal', required:true, placeholder:'e.g. Cheque 220145 returned unpaid by the bank on 24 Jul.' } ],
      mobileNote:'The partner sees the record move to <b>Reversed</b>; the verified amount stops counting.',
      warn:'The verified entry is retained with a reversal reason — never deleted. Finance handles any money movement outside the panel.',
      confirmLabel:'Reverse payment' }).then(function(v){
      if(!v) return;
      Perm.requirePermission(state.role,'REVERSE_PAYMENT');
      var patch=pushOffHistory(r,{ action:'REVERSED', by:actor().name, at:root.CRM_NOW, reason:v.reason }); patch.status='reversed'; patch.reason=v.reason;
      Ripples.mutate('off:'+r.id, patch);
      Audit.audit({ actor:actor(), action:'REVERSE_OFFLINE_PAYMENT', target:r.id+' · '+r.buyer, changes:{ from:'verified', to:'reversed', amount:fmt.bdt(r.amountBdt), reason:v.reason } });
      Ripples.emit({ mobileId:r.partnerId, kind:'partner', screen:'P42 · Record status', reason:v.reason, headline:'Verified payment '+r.id+' ('+r.buyer+') reversed — no longer counted as paid' });
      C.toast({ type:'warning', title:'Payment reversed', text:r.buyer+' · '+fmt.bdt(r.amountBdt)+' no longer counted.', ripple:'partner sees “Reversed”' });
      after&&after();
    });
  }
  SCREENS.J03 = { title:'Offline booking payment-history', sub:'Partner-recorded offline payments — finance verifies claim → fact (Req 6.10.4)', perm:'VIEW_PAYMENTS',
    emptyState:function(){ return C.EmptyState({ icon:'✓', title:'No offline payment records yet' }); },
    render:function(main){
      var all = FIN.allOffline();
      main.innerHTML = header(this);
      main.insertAdjacentHTML('beforeend','<div class="metaline">Every partner row is an <b>unverified claim</b> about an offline payment until finance confirms it. Correct / Reject / Reverse each require a reason and are audited — nothing is deleted. No account or card numbers exist here; “method” is a category only.</div>');
      if (!all.length){ main.insertAdjacentHTML('beforeend', this.emptyState()); return; }
      var tw=C.el('<div></div>'); main.appendChild(tw);
      var draw=function(){ C.mountDataTable(tw, { rowId:'id', noun:'records', rows:FIN.allOffline(), columns:[
        { key:'id', label:'Ref', render:function(r){ return '<span class="mono" style="font-size:11px">'+esc(r.id)+'</span>'; } },
        { key:'partner', label:'Recorded by', strong:true }, { key:'buyer', label:'Buyer' }, { key:'project', label:'Project · unit', render:function(r){ return esc(r.project)+(r.unit?' · '+esc(r.unit):''); } },
        { key:'method', label:'Method' }, { key:'amountBdt', label:'Amount', align:'right', render:function(r){ return fmt.bdt(r.amountBdt); } },
        { key:'bookingDate', label:'Booking date', render:function(r){ return r.bookingDate?fmt.dhaka(r.bookingDate):'—'; } },
        { key:'status', label:'Status', render:function(r){ return offPill(r.status); } }
      ], rowActions:[
        { label:'Verify', icon:'✓', disabled:function(r){ return r.status!=='pending' || !Perm.can(state.role,'VERIFY_PAYMENT'); }, onClick:function(r){ verifyOffline(r, draw); } },
        { label:'Correct', icon:'✎', disabled:function(r){ return (r.status!=='pending'&&r.status!=='verified'&&r.status!=='corrected') || !Perm.can(state.role,'CORRECT_PAYMENT'); }, onClick:function(r){ correctOffline(r, draw); } },
        { label:'Reject', icon:'✕', danger:true, disabled:function(r){ return r.status!=='pending' || !Perm.can(state.role,'REJECT_PAYMENT'); }, onClick:function(r){ rejectOffline(r, draw); } },
        { label:'Reverse', icon:'⇄', danger:true, disabled:function(r){ return (r.status!=='verified'&&r.status!=='corrected') || !Perm.can(state.role,'REVERSE_PAYMENT'); }, onClick:function(r){ reverseOffline(r, draw); } },
        { label:'History', icon:'↗', onClick:function(r){ var h=offHistory(r).map(function(e){ return '• '+e.action+' — '+esc(e.by)+' · '+fmt.dhaka(e.at)+(e.reason?' — “'+esc(e.reason)+'”':'')+(e.from?' ['+esc(e.from)+' → '+esc(e.to)+']':''); }).join('<br>'); C.confirmDialog({ title:'Payment history — '+r.id, body:'<div style="font-size:12.5px;line-height:1.9">'+h+'</div>', confirmLabel:'Close' }); } }
      ] }); };
      draw();
    }
  };

  /* ---------- K01 · Customer ledger — pending NEVER folded into paid ---------- */
  SCREENS.K01 = { title:'Customer ledger', sub:'The source of truth the mobile installment tracker reads', perm:'VIEW_LEDGER',
    render:function(main, P){
      var clientId = P.get('id') || 'CL-5011';
      var client = (root.CRM.People && root.CRM.People.clientById) ? root.CRM.People.clientById(clientId) : null;
      var L = FIN.ledgerFor(clientId);
      main.innerHTML = header(this);
      main.insertAdjacentHTML('beforeend','<div class="field" style="max-width:340px"><label>Client</label><select id="clsel">'+
        (root.CRM.People?root.CRM.People.allClients():[{id:clientId,name:client?client.name:clientId}]).map(function(c){ return '<option value="'+c.id+'"'+(c.id===clientId?' selected':'')+'>'+esc(c.name)+' · '+esc(c.id)+'</option>'; }).join('')+'</select></div>');
      document.getElementById('clsel').onchange=function(){ go('K01',{id:this.value}); };
      main.insertAdjacentHTML('beforeend', '<div class="ledgergrid"><div id="lledger"></div><div id="lrail"></div></div>');
      // ledger card — pending is its own row, styled distinctly
      var lc = document.getElementById('lledger');
      lc.innerHTML =
        '<div class="ledgercard"><div class="lh">'+esc(client?client.name:clientId)+' · ledger</div>'+
        '<div class="ledgerrow total"><span class="l">Total price</span><span class="v">'+fmt.bdt(L.totalPrice)+'</span></div>'+
        '<div class="ledgerrow paid"><span class="l">Verified paid</span><span class="v">'+fmt.bdt(L.verifiedPaid)+'</span></div>'+
        '<div class="ledgerrow pending"><span class="l">Pending verification<span class="tag">not counted as paid</span></span><span class="v">'+fmt.bdt(L.pendingVerification)+'</span></div>'+
        '<div class="ledgerrow outstanding"><span class="l">Outstanding</span><span class="v">'+fmt.bdt(L.outstanding)+'</span></div>'+
        '<div class="ledgerrow overdue"><span class="l">Overdue</span><span class="v">'+fmt.bdt(L.overdue)+'</span></div>'+
        '<div class="ledgerrow"><span class="l">Next due</span><span class="v" style="font-size:13px">'+(L.nextDue?fmt.bdt(L.nextDue.amountBdt)+' · '+fmt.dhaka(L.nextDue.dueUtc):'—')+'</span></div>'+
        '<div class="ledgernote">Pending-verification money is shown on its own row and is <b>never</b> folded into “verified paid” — the exact rule the mobile installment tracker (screen 51) mirrors. Unverified money never counts as paid.</div></div>';
      // installments
      lc.insertAdjacentHTML('beforeend','<div class="sectitle instwrap">Installments</div>');
      var tw=C.el('<div></div>'); lc.appendChild(tw);
      var rows=[]; L.bookings.forEach(function(b){ b.installments.forEach(function(i){ rows.push({ id:b.id+'-'+i.no, booking:b.id, no:'#'+i.no, due:i.dueUtc, amt:i.amountBdt, status:i.status }); }); });
      C.mountDataTable(tw, { rowId:'id', noun:'installments', rows:rows, columns:[
        { key:'booking', label:'Booking', render:function(r){ return '<span class="mono" style="font-size:11px">'+esc(r.booking)+'</span>'; } },
        { key:'no', label:'#' }, { key:'due', label:'Due', render:function(r){ return fmt.dhaka(r.due); } },
        { key:'amt', label:'Amount', align:'right', render:function(r){ return fmt.bdt(r.amt); } },
        { key:'status', label:'Status', render:function(r){ return instChip(r.status); } }
      ], rowActions:[
        { label:'Trigger reminder', icon:'🔔', disabled:function(r){ return r.status==='paid' || !Perm.can(state.role,'TRIGGER_REMINDER'); }, onClick:function(r){ triggerReminder(client||{name:clientId,id:clientId}, r); } },
        { label:'View schedule', icon:'↗', onClick:function(r){ go('K02',{id:r.booking}); } }
      ] });
      // right rail
      document.getElementById('lrail').innerHTML =
        '<div class="railcard"><h4>Quick facts</h4>'+
        '<div class="railstat"><span class="l">Bookings</span><span class="v">'+L.bookings.length+'</span></div>'+
        '<div class="railstat"><span class="l">Projects</span><span class="v">'+uniq(L.bookings.map(function(b){return b.project;})).length+'</span></div>'+
        '<div class="railstat"><span class="l">KYC</span><span class="v" style="font-size:12px">'+esc(client?client.kycStatus:'—')+'</span></div>'+
        '<div class="railstat"><span class="l">Location</span><span class="v" style="font-size:12px">'+esc(client?client.location:'—')+'</span></div></div>'+
        '<div class="railcard"><h4>Actions</h4><div style="display:flex;flex-direction:column;gap:6px"><a class="btn" href="'+href('K04',{id:clientId})+'">Invoices</a><a class="btn" href="'+href('K05',{id:clientId})+'">Generate invoice</a><a class="btn danger" href="'+href('K06',{id:clientId})+'">Record refund</a></div></div>';
      main.appendChild(auditNote(clientId));
    }
  };
  function uniq(a){ var o=[]; a.forEach(function(x){ if(x&&o.indexOf(x)<0)o.push(x); }); return o; }

  /* ---------- K02 · Installment schedule ---------- */
  SCREENS.K02 = { title:'Installment schedule', perm:'VIEW_LEDGER',
    render:function(main, P){
      var b = P.get('id') ? FIN.bookingById(P.get('id')) : FIN.allBookings().filter(function(x){return x.status==='confirmed';})[0];
      main.innerHTML = header(this);
      if (!b){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'Booking not found' })); return; }
      main.insertAdjacentHTML('beforeend','<div class="card"><h3>Booking '+esc(b.id)+'</h3><dl class="kv"><dt>Client</dt><dd>'+esc(b.client)+'</dd><dt>Project</dt><dd>'+esc(b.project)+' · '+esc(b.unit)+'</dd><dt>Total</dt><dd>'+fmt.bdt(b.totalBdt)+'</dd></dl></div>');
      var tw=C.el('<div></div>'); main.appendChild(tw);
      var draw=function(){ b=FIN.bookingById(b.id); C.mountDataTable(tw, { rowId:'no', noun:'installments', rows:b.installments, columns:[
        { key:'no', label:'#', render:function(r){ return 'Installment '+r.no; } },
        { key:'dueUtc', label:'Due', render:function(r){ return fmt.dhaka(r.dueUtc); } },
        { key:'amountBdt', label:'Amount', align:'right', render:function(r){ return fmt.bdt(r.amountBdt); } },
        { key:'status', label:'Status', render:function(r){ return instChip(r.status); } }
      ], rowActions:[
        { label:'Trigger reminder', icon:'🔔', disabled:function(r){ return r.status==='paid' || !Perm.can(state.role,'TRIGGER_REMINDER'); }, onClick:function(r){ triggerReminder({name:b.client,id:b.clientId}, { booking:b.id, no:'#'+r.no, amt:r.amountBdt }); } }
      ] }); };
      draw();
      main.insertAdjacentHTML('beforeend','<p class="metaline" style="margin-top:12px">Schedule rules (count, intervals, late penalties) are undefined (OPEN_QUESTIONS #8).</p>');
    }
  };

  /* ---------- K03 · Trigger installment notification ---------- */
  SCREENS.K03 = { title:'Trigger installment reminder', sub:'Manual override for due / overdue reminders', perm:'TRIGGER_REMINDER',
    render:function(main){
      main.innerHTML = header(this);
      var due=[]; FIN.allBookings().forEach(function(b){ b.installments.forEach(function(i){ if(i.status==='due'||i.status==='overdue') due.push({ id:b.id+'-'+i.no, client:b.client, clientId:b.clientId, booking:b.id, no:i.no, amt:i.amountBdt, status:i.status }); }); });
      if (!due.length){ main.insertAdjacentHTML('beforeend', C.EmptyState({ icon:'✓', title:'Nothing due or overdue' })); return; }
      main.insertAdjacentHTML('beforeend','<p class="metaline">Reminders are timezone-adjusted for the client (cadence undefined — OPEN_QUESTIONS #9).</p>');
      var tw=C.el('<div></div>'); main.appendChild(tw);
      C.mountDataTable(tw, { rowId:'id', noun:'reminders', rows:due, columns:[
        { key:'client', label:'Client', strong:true }, { key:'booking', label:'Booking', render:function(r){ return '<span class="mono" style="font-size:11px">'+esc(r.booking)+'</span>'; } },
        { key:'no', label:'Installment', render:function(r){ return '#'+r.no; } }, { key:'amt', label:'Amount', align:'right', render:function(r){ return fmt.bdt(r.amt); } },
        { key:'status', label:'Status', render:function(r){ return instChip(r.status); } }
      ], rowActions:[ { label:'Send reminder', icon:'🔔', onClick:function(r){ triggerReminder({name:r.client,id:r.clientId}, r); } } ] });
    }
  };
  function triggerReminder(client, item){
    Perm.requirePermission(state.role,'TRIGGER_REMINDER');
    pushArray('reminderLog', { client:client.name, item:item.booking+' '+(item.no||''), t:root.CRM_NOW });
    Audit.audit({ actor:actor(), action:'TRIGGER_REMINDER', target:(item.booking||'')+' · '+client.name });
    Ripples.emit({ kind:'client', screen:'Push · reminder', headline:'Installment reminder sent to '+client.name+' ('+(item.booking||'')+') — timezone-adjusted push queued' });
    C.toast({ type:'success', title:'Reminder sent', text:client.name+' · push queued (timezone-adjusted).', ripple:client.name.split(' ')[0]+' gets a due/overdue push' });
  }

  /* ---------- K04 · Invoices list ---------- */
  SCREENS.K04 = { title:'Invoices', sub:'Server-generated PDFs', perm:'VIEW_PAYMENTS',
    render:function(main, P){
      var clientId=P.get('id'); var inv=FIN.allInvoices().filter(function(i){ return !clientId || i.clientId===clientId; });
      main.innerHTML = C.PageHeader({ title:this.title, sub:this.sub, actions: Perm.can(state.role,'GENERATE_INVOICE')?[{ id:'gen', label:'Generate invoice', cls:'primary', icon:'＋' }]:[] });
      var gb=main.querySelector('[data-act="gen"]'); if(gb) gb.onclick=function(){ go('K05',clientId?{id:clientId}:null); };
      if (!inv.length){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'No invoices yet', text:'Generated invoices appear here.' })); return; }
      var fbWrap=C.el('<div></div>'); main.appendChild(fbWrap);
      var tw=C.el('<div></div>'); main.appendChild(tw);
      C.FilterBar(fbWrap, { id:'k04', filters:[ { key:'project', label:'Project', options:uniq(inv.map(function(i){return i.project;})) }, { key:'type', label:'Type', options:uniq(inv.map(function(i){return i.type;})) } ], onChange:draw });
      function filtered(){ var f=C.getFilters('k04'); return inv.filter(function(i){ if(f.project&&i.project!==f.project)return false; if(f.type&&i.type!==f.type)return false; return true; }); }
      function draw(){ C.mountDataTable(tw, { rowId:'id', noun:'invoices', defaultSort:'issuedUtc', defaultDir:-1, rows:filtered(), columns:[
        { key:'id', label:'Invoice', strong:true, render:function(r){ return '<span class="mono">'+esc(r.id)+'</span>'; } },
        { key:'client', label:'Client' }, { key:'project', label:'Project' }, { key:'type', label:'Type' },
        { key:'amountBdt', label:'Amount', align:'right', render:function(r){ return fmt.bdt(r.amountBdt); } },
        { key:'issuedUtc', label:'Issued', render:function(r){ return fmt.dhaka(r.issuedUtc); } }
      ], rowActions:[ { label:'View PDF (mock)', icon:'📄', onClick:function(r){ C.toast({type:'info',title:r.id,text:'Opens the generated PDF in the client portal.'}); } } ] }); }
      draw();
    }
  };

  /* ---------- K05 · Invoice generation ---------- */
  SCREENS.K05 = { title:'Generate invoice', sub:'Numbering + tax + legal wording from config (placeholder)', perm:'GENERATE_INVOICE',
    render:function(main, P){
      var clientId=P.get('id')||'CL-5011';
      var bookings = FIN.allBookings().filter(function(b){ return b.clientId===clientId; });
      var b = bookings[0] || FIN.allBookings()[0];
      main.innerHTML = header(this);
      var nextNo = FIN.CONFIG.invoicePrefix + String(300 + FIN.allInvoices().length + 1);
      main.insertAdjacentHTML('beforeend',
        '<div class="split2"><div><div class="sectitle">Preview</div><div class="invoicebox">'+
        '<div class="ib-top"><div><div class="ib-mark">S</div></div><div style="text-align:right"><div class="ib-no">'+esc(nextNo)+'</div><div class="hint">'+esc(fmt.dhaka(root.CRM_NOW))+'</div></div></div>'+
        '<dl class="kv" style="margin-bottom:12px"><dt>Bill to</dt><dd>'+esc(b?b.client:'—')+'</dd><dt>Project</dt><dd>'+esc(b?b.project+' · '+b.unit:'—')+'</dd></dl>'+
        '<div class="ib-rows"><div class="ib-row"><span>Booking token</span><span>'+fmt.bdt(b?b.tokenBdt:0)+'</span></div>'+
        '<div class="ib-row"><span>'+esc(FIN.CONFIG.vatLabel)+'</span><span>—</span></div>'+
        '<div class="ib-row tot"><span>Total</span><span>'+fmt.bdt(b?b.tokenBdt:0)+'</span></div></div>'+
        '<div class="ib-legal">'+esc(FIN.CONFIG.legalWording)+'</div></div></div>'+
        '<div><div class="sectitle">Generate</div><div class="card"><p class="hint" style="margin-bottom:10px">One template driven by config — no designer. Numbering, tax fields and legal wording are placeholders (OPEN_QUESTIONS #7).</p>'+
        '<dl class="kv"><dt>Next number</dt><dd class="mono">'+esc(nextNo)+'</dd><dt>Client</dt><dd>'+esc(b?b.client:'—')+'</dd><dt>Booking</dt><dd>'+esc(b?b.id:'—')+'</dd></dl>'+
        '<div class="gap"></div><button class="btn primary" id="gen">Generate invoice '+esc(nextNo)+'</button></div></div></div>');
      document.getElementById('gen').onclick=function(){
        if(!b){ C.toast({type:'warning',title:'No booking'}); return; }
        Perm.requirePermission(state.role,'GENERATE_INVOICE');
        var rec={ id:nextNo, clientId:b.clientId, client:b.client, project:b.project, bookingId:b.id, amountBdt:b.tokenBdt, issuedUtc:root.CRM_NOW, type:'Manual invoice' };
        pushArray('invoiceAdd', rec);
        Audit.audit({ actor:actor(), action:'GENERATE_INVOICE', target:nextNo+' · '+b.client, changes:{ booking:b.id, amount:fmt.bdt(b.tokenBdt) } });
        Ripples.emit({ kind:'client', screen:'Invoices', headline:'Invoice '+nextNo+' generated for '+b.client+' — new PDF on their invoice list' });
        C.toast({ type:'success', persist:true, title:'Invoice '+nextNo+' generated', text:b.client, ripple:'new PDF on '+b.client.split(' ')[0]+'’s invoice list' });
        go('K04',{id:b.clientId});
      };
    }
  };

  /* ---------- K06 · Refund / cancellation (records decision only) ---------- */
  SCREENS.K06 = { title:'Refund / cancellation', sub:'Records the decision — money moves outside the panel', perm:'RECORD_REFUND',
    render:function(main, P){
      var clientId=P.get('id')||'CL-5011';
      var bookings=FIN.allBookings().filter(function(b){return b.clientId===clientId;});
      main.innerHTML = header(this);
      main.insertAdjacentHTML('beforeend','<div class="part6note" style="background:var(--red-bg);border-color:#e6c9c6;color:var(--red)">⚠ The refund itself is executed <b>outside the panel</b>, through Salmon’s finance process. This screen only <b>records</b> the decision (refund policy undefined — OPEN_QUESTIONS #6).</div>');
      main.insertAdjacentHTML('beforeend','<div class="card"><h3>Record a refund / cancellation</h3><div class="primaryacts"><button class="btn danger" id="rec">Record refund decision…</button></div></div>');
      document.getElementById('rec').onclick=function(){
        formDialog({ title:'Record refund / cancellation', danger:true,
          intro:'<p class="hint" style="margin-bottom:6px">This records the decision only. No money moves from the panel.</p>',
          fields:[ { type:'select', key:'booking', label:'Booking', options:bookings.map(function(b){return {value:b.id,label:b.id+' · '+b.project+' · '+b.unit};}) },
            { type:'select', key:'kind', label:'Type', options:['Full refund','Partial refund','Cancellation (non-refundable)'] },
            { type:'text', key:'amount', label:'Refund amount (BDT)', placeholder:'e.g. 1500000' },
            { type:'textarea', key:'reason', label:'Reason', required:true, placeholder:'e.g. Buyer withdrew before handover; partial refund per policy.' } ],
          mobileNote:'The client’s payment history shows a <b>refund entry</b>.',
          confirmLabel:'Record decision' }).then(function(v){
          if(!v) return;
          Perm.requirePermission(state.role,'RECORD_REFUND');
          var b=FIN.bookingById(v.booking);
          pushArray('refundAdd', { id:'RF-'+String(100+FIN.refunds().length+1), bookingId:v.booking, clientId:clientId, kind:v.kind, amount:v.amount, reason:v.reason, t:root.CRM_NOW });
          Audit.audit({ actor:actor(), action:'RECORD_REFUND', target:v.booking+' · '+(b?b.client:''), changes:{ kind:v.kind, amount:v.amount, reason:v.reason } });
          Ripples.emit({ kind:'client', screen:'Payment history · refund', headline:'Refund recorded for '+(b?b.client:v.booking)+' ('+v.kind+') — entry shown in their payment history' });
          C.toast({ type:'warning', persist:true, title:'Refund decision recorded', text:(b?b.client:v.booking)+' · '+v.kind, ripple:'refund entry in client payment history' });
          go('K01',{id:clientId});
        });
      };
      main.appendChild(auditNote(clientId));
    }
  };

  function instChip(status){ var m={ paid:['green','Paid'], due:['amber','Due'], overdue:['red','Overdue'], upcoming:['grey','Upcoming'] }[status]||['grey',status]; return '<span class="chip '+m[0]+'"><span class="d"></span>'+m[1]+'</span>'; }

  /* ===================== boot ===================== */
  function boot(screenId){ state.screen=screenId; state.params=new URLSearchParams(location.search); Audit.seed(CRM.auditSeed); mountShell(); renderMain(); }
  root.Finance = { boot: boot, rerender: renderMain, SCREENS: SCREENS, go: go, href: href };
})(window);
