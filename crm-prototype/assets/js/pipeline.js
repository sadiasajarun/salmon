/* ============================================================================
 * Salmon CRM — Sales Pipeline engine (Part 4)
 * ----------------------------------------------------------------------------
 * screens/F0x-G0x-H0x .html files bootstrap Pipeline.boot('F01'). Mounts the Part-1
 * shell, gates by permission, renders each screen. Every mutation emits
 * Audit.audit(); status changes / conversion / meeting / consultation confirms
 * emit Ripples.emit() + a Toast. F04 creates a Pending commission record for
 * Part 6 — no amount is calculated here (that wall stays clean).
 * ==========================================================================*/
(function (root) {
  'use strict';
  var C = root.C, Perm = root.Perm, Audit = root.Audit, CRM = root.CRM, Router = root.Router,
      DevToolbar = root.DevToolbar, PL = root.CRM.Pipeline, Ripples = root.Ripples;

  root.CRM_NOW = '2026-07-15T10:00:00Z';
  var esc = C.esc, fmt = C.fmt;

  var state = {
    role: localStorage.getItem('crm_role') || Perm.ROLES.SUPER_ADMIN,
    render: 'data', screen: null, params: null
  };
  function actor(){ return CRM.staff[state.role]; }
  function setRole(r){ state.role = r; localStorage.setItem('crm_role', r); }

  var FILES = {
    F01:'F01-leads-list.html', F02:'F02-lead-detail.html', F03:'F03-update-status.html',
    F04:'F04-verify-conversion.html', F05:'F05-reject-lead.html',
    G01:'G01-meetings-queue.html', G02:'G02-confirm-meeting.html', G03:'G03-site-visit-queue.html',
    H01:'H01-slot-management.html', H02:'H02-consultation-requests.html', H03:'H03-consultation-detail.html',
    X01:'X01-commissions-stub.html'
  };
  function href(id, params){
    var f = FILES[id]; if (!f) return '#';
    if (!params) return f;
    var qs = Object.keys(params).filter(function(k){ return params[k]!=null && params[k]!==''; })
      .map(function(k){ return k+'='+encodeURIComponent(params[k]); }).join('&');
    return qs ? f+'?'+qs : f;
  }
  function go(id, params){ location.href = href(id, params); }

  /* ===================== shell ===================== */
  function mountShell(){
    document.getElementById('root').innerHTML =
      '<div class="app" id="app">' +
      '<div class="brandcorner"><a class="mark" href="../index.html" title="Salmon console home">S</a><span class="name">SALMON</span><button class="collapse" id="collapse" title="Collapse">⇤</button></div>' +
      '<div class="topbar" id="topbar"></div>' +
      '<nav class="sidebar" id="sidebar"></nav>' +
      '<div class="main"><div class="maininner" id="main"></div><div class="appfooter" id="footer"></div></div>' +
      '</div>';
    document.getElementById('collapse').onclick = function(){ document.getElementById('app').classList.toggle('collapsed'); };
    renderTopbar(); renderSidebar(); renderFooter(); ensureRippleFab();
  }
  function renderTopbar(){
    var tb = document.getElementById('topbar'); if (!tb) return;
    var sc = SCREENS[state.screen] || { title:'Sales Pipeline' };
    var s = actor();
    tb.innerHTML =
      '<div class="breadcrumb"><a href="../index.html#/dashboard">Salmon</a><span class="sep">›</span>' +
      '<a href="'+href('F01')+'">Sales Pipeline</a><span class="sep">›</span><span class="cur">'+esc(sc.title)+'</span></div><span class="spacer"></span>' +
      '<button class="searchbtn" id="searchbtn">🔎 <span>Search…</span><kbd>⌘K</kbd></button>' +
      '<span id="devmount"></span>' +
      '<button class="icobtn" id="bell">🔔</button>' +
      '<div class="user"><span class="avatar">'+esc(s.initials)+'</span><span class="who"><span class="nm">'+esc(s.name)+'</span><span class="rl">'+Perm.ROLE_LABEL[state.role]+'</span></span></div>';
    document.getElementById('devmount').appendChild(DevToolbar.render({
      role: state.role, state: state.render,
      onRole: function(r){ setRole(r); renderTopbar(); renderSidebar(); renderFooter(); renderMain(); },
      onState: function(st){ state.render = st; renderMain(); },
      onReset: function(){ Ripples.reset(); C.toast({ type:'info', title:'Mock data reset', text:'Pipeline and mobile ripples restored to seed.' }); renderMain(); }
    }));
    document.getElementById('searchbtn').onclick = function(){ location.href = '../index.html#/dashboard'; };
    document.getElementById('bell').onclick = function(){ C.toast({ type:'info', title:'Notifications', text:'The notification centre lives on the console home (Part 1).' }); };
  }
  function renderSidebar(){
    var sb = document.getElementById('sidebar'); if (!sb) return;
    var groups = Router.getSidebarFor(state.role);
    var MODMAP = { pipeline:href('F01'), people:'B02-approval-queue.html', catalogue:'E01-projects-list.html', finance:'I01-webhook-queue.html' };
    sb.innerHTML = groups.map(function(g){
      return '<div class="navgroup"><div class="gl">'+esc(g.title)+'</div>'+g.items.map(function(it){
        var active = it.id === 'pipeline';
        var route = MODMAP[it.id] || ('../index.html'+it.route);
        return '<a class="navitem'+(active?' active':'')+'" href="'+route+'"><span class="ic">'+it.icon+'</span><span class="lb">'+esc(it.label)+'</span>'+(it.count?'<span class="count">'+it.count+'</span>':'')+'</a>';
      }).join('')+'</div>';
    }).join('');
  }
  function renderFooter(){
    var ft = document.getElementById('footer'); if (!ft) return; var s = actor();
    ft.innerHTML = '<b style="color:var(--ink-2)">'+esc(s.name)+'</b> · '+Perm.ROLE_LABEL[state.role]+' · '+esc(s.office)+'<span class="spacer" style="flex:1"></span><span>Salmon Admin · Sales Pipeline (Part 4)</span>';
  }
  function ensureRippleFab(){
    if (document.getElementById('ripplefab')) { updateFab(); return; }
    var b = document.createElement('button'); b.id='ripplefab'; b.className='ripplefab';
    b.innerHTML = '📱 Mobile ripples <span class="rc" id="ripplecount">0</span>';
    b.onclick = function(){ Ripples.toggleConsole(); };
    document.body.appendChild(b); document.addEventListener('ripple', updateFab); updateFab();
  }
  function updateFab(){ var c=document.getElementById('ripplecount'); if(c) c.textContent = Ripples.feed().length; }

  /* ===================== main render (gate + states) ===================== */
  function renderMain(){
    renderTopbar();
    var main = document.getElementById('main'); if (!main) return;
    var sc = SCREENS[state.screen];
    if (!sc){ main.innerHTML = C.PageHeader({ title:'Unknown screen' }); return; }
    if (sc.perm && !Perm.can(state.role, sc.perm)){
      Audit.audit({ actor: actor(), action:'ACCESS_DENIED', target:'Pipeline · '+sc.title });
      main.innerHTML = deniedPanel(sc.title, sc.perm); wireDenied(main); return;
    }
    if (state.render === 'loading'){ main.innerHTML = header(sc) + skeleton(); return; }
    if (state.render === 'error'){ main.innerHTML = header(sc) + statePanel('error'); return; }
    if (state.render === 'offline'){ main.innerHTML = header(sc) + statePanel('offline'); return; }
    if (state.render === 'empty'){ main.innerHTML = header(sc) + (sc.emptyState ? sc.emptyState() : C.EmptyState({ title:'Nothing here', text:'This view has no records in the current state.' })); return; }
    try { sc.render(main, state.params); } catch(e){ console.error(e); main.innerHTML = header(sc) + statePanel('error'); }
    updateFab();
  }
  function header(sc){ return C.PageHeader({ title: sc.title, sub: sc.sub }); }
  function deniedPanel(what, perm){
    return '<div class="authwrap" style="min-height:auto;padding:40px 0"><div class="authcard denied" style="text-align:center">' +
      '<div class="mark" style="margin:0 auto 14px">⛔</div><h1>Access denied</h1>' +
      '<p>Your role — <b>'+Perm.ROLE_LABEL[state.role]+'</b> — cannot open <b>'+esc(what)+'</b>.' +
      (perm ? ' Required permission: <span class="mono">'+perm+'</span>.' : '') +
      '<br>Permissions are enforced server-side; this isn’t a UI glitch.</p>' +
      '<button class="btn primary" id="back-pl" style="width:auto;margin:4px auto 0">Back to Pipeline</button></div></div>';
  }
  function wireDenied(main){ var b=main.querySelector('#back-pl'); if(b) b.onclick=function(){ go('F01'); }; }
  function skeleton(){ var rows=Array(7).fill(0).map(function(){return '<div class="sk" style="height:34px;margin:6px 0"></div>';}).join(''); return '<div class="tablewrap" style="padding:10px">'+rows+'</div>'; }
  function statePanel(kind){
    if (kind==='offline') return C.EmptyState({ icon:'⚠', title:'You’re offline', text:'We can’t reach the Salmon servers. Reconnect to load the pipeline.' });
    return C.EmptyState({ icon:'⚠', title:'Something went wrong', text:'This view failed to load. Retry, and if it persists the on-call engineer is paged.' });
  }

  /* ===================== formDialog ===================== */
  function formDialog(cfg){
    return new Promise(function(resolve){
      var fieldsHtml = (cfg.fields||[]).map(function(f){
        if (f.type==='html') return f.html;
        var lab='<label>'+esc(f.label)+(f.required?' <span class="req">*</span>':'')+'</label>';
        if (f.type==='textarea') return '<div class="field">'+lab+'<textarea data-fk="'+f.key+'" maxlength="'+(f.max||400)+'" placeholder="'+esc(f.placeholder||'')+'">'+esc(f.value||'')+'</textarea></div>';
        if (f.type==='select') return '<div class="field">'+lab+'<select data-fk="'+f.key+'">'+f.options.map(function(o){ var v=o.value!=null?o.value:o, t=o.label!=null?o.label:o; return '<option value="'+esc(v)+'"'+(String(f.value)===String(v)?' selected':'')+'>'+esc(t)+'</option>'; }).join('')+'</select></div>';
        if (f.type==='datetime') return '<div class="field">'+lab+'<input type="datetime-local" data-fk="'+f.key+'" value="'+esc(f.value||'')+'"></div>';
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
      scrim.querySelector('[data-ok]').onclick=function(){
        var vals=collect(); var bad=(cfg.fields||[]).filter(function(f){ return f.required && !vals[f.key]; });
        if (bad.length){ var f0=scrim.querySelector('[data-fk="'+bad[0].key+'"]'); if(f0){ f0.style.borderColor='var(--red)'; f0.focus(); }
          C.toast({ type:'warning', title:'A required field is empty', text:bad[0].label+' is required.' }); return; }
        close(vals);
      };
      document.addEventListener('keydown',key); document.body.appendChild(scrim);
      var first=scrim.querySelector('[data-fk],[data-ok]'); if(first) first.focus();
    });
  }

  /* ===================== chips / helpers ===================== */
  function leadChip(status){ var m=PL.INTERNAL_STATUS[status]||{label:status,chip:'grey'}; return '<span class="leadchip '+m.chip+'" style="color:var(--'+m.chip+');background:var(--'+m.chip+'-bg)"><span class="d"></span>'+esc(m.label)+'</span>'; }
  function partnerChip(pstatus){ return C.StatusChip(pstatus); }
  function initials(name){ return name.split(' ').map(function(w){return w[0];}).slice(0,2).join('').toUpperCase(); }
  function ageOf(iso){ var d=(new Date(root.CRM_NOW)-new Date(iso))/86400000; return d<1?Math.round(d*24)+'h':Math.floor(d)+'d'; }
  function auditNote(id){ var n=C.el(C.AuditNote({ actor:actor().name, when:root.CRM_NOW })); n.querySelector('.lk').onclick=function(){ C.toast({type:'info',title:'Audit slice',text:'Opens the audit log filtered to '+(id||'this record')+' (Super Admin · Part 7).'}); }; return n; }
  function wireEmpty(main, screen){ var b=main.querySelector('[data-empty-act]'); if(b) b.onclick=function(){ go(screen); }; }
  function readOv(){ try { return JSON.parse(localStorage.getItem('crm_people_mut')||'{}'); } catch(e){ return {}; } }
  var _seq=0; function uid(){ return (++_seq)+''+PL.commissionRecords().length; }

  /* partner-projection preview panel (the wall made visible) */
  function partnerProjection(lead){
    var STEPS = ['submitted','contacted','meetingScheduled','visitCompleted','converted'];
    var cur = PL.partnerStatusOf(lead.status);
    var curIdx = STEPS.indexOf(cur); if (cur==='closed') curIdx = -1;
    var steps = STEPS.map(function(s,i){ var cls = cur==='closed' ? '' : (i<curIdx?'done':i===curIdx?'cur':''); return '<span class="pv-step '+cls+'">'+esc(PL.PARTNER_LABEL[s])+'</span>'; }).join('');
    return '<div class="partnerview"><div class="pvh">📱 What Shahin sees on P30 <span class="badge">partner projection</span></div>'+
      '<div class="pv-steps">'+steps+'</div>'+
      '<p class="hint" style="margin-top:10px;color:var(--maroon-700)">The partner sees only these 6 statuses. Internal notes, owner, and hold/reject reasons are never shown. Current partner-facing status: <b>'+esc(cur==='closed'?'Closed':PL.PARTNER_LABEL[cur])+'</b>.</p></div>';
  }

  /* ===================== ACTIONS ===================== */
  function updateStatus(lead, after){
    var flow = PL.STATUS_FLOW;
    formDialog({
      title:'Update lead status',
      intro:'<p class="hint" style="margin-bottom:8px">Move <b>'+esc(lead.buyer)+'</b> through the internal pipeline. The partner sees only the simplified projection.</p>'+
        '<div class="field"><label>New status</label><div class="flowpick" id="flow">'+flow.map(function(s){ var m=PL.INTERNAL_STATUS[s]; var cls = s===lead.status?'sel':(flow.indexOf(s)<flow.indexOf(lead.status)?'past':''); return '<span class="fstep '+cls+'" data-s="'+s+'">'+esc(m.label)+'</span>'; }).join('')+'</div></div>'+
        '<input type="hidden" data-fk="status" value="'+esc(lead.status)+'">',
      fields:[ { type:'html', html:'' }, { type:'textarea', key:'note', label:'Note (internal, optional)', placeholder:'e.g. Buyer confirmed weekend site visit.' } ],
      mobileNote:'The partner’s P30 status updates to the projection of the new stage.',
      confirmLabel:'Update status',
      onOpen:true
    }).then(function(v){
      if (!v || !v.status || v.status===lead.status) return;
      Perm.requirePermission(state.role,'UPDATE_LEAD_STATUS');
      var pnew = PL.partnerStatusOf(v.status);
      var add = [ { t:root.CRM_NOW, kind:'status', text:'Status → '+PL.INTERNAL_STATUS[v.status].label+' (by '+actor().name+')', internal:false } ];
      if (v.note) add.unshift({ t:root.CRM_NOW, kind:'note', text:v.note, internal:true });
      var ov = readOv(); var patch = ov['lead:'+lead.id]||{}; patch.status=v.status; patch.timelineAdd=(add).concat(patch.timelineAdd||[]);
      Ripples.mutate('lead:'+lead.id, patch);
      Audit.audit({ actor:actor(), action:'UPDATE_LEAD_STATUS', target:lead.id+' · '+lead.buyer, changes:{ from:lead.status, to:v.status } });
      Ripples.emit({ mobileId:lead.partnerId, kind:'partner', screen:'P30 · Lead', headline:'Lead '+lead.id+' ('+lead.buyer+') → '+PL.PARTNER_LABEL[pnew]+' on '+lead.partner+'’s app' });
      C.toast({ type:'success', title:'Status updated', text:lead.buyer+' → '+PL.INTERNAL_STATUS[v.status].label, ripple:lead.partner.split(' ')[0]+' sees “'+PL.PARTNER_LABEL[pnew]+'”' });
      after && after();
    });
    // wire the flow picker after the dialog is in the DOM
    setTimeout(function(){
      var flowEl=document.getElementById('flow'); if(!flowEl) return;
      var hidden=document.querySelector('.modalscrim [data-fk="status"]');
      flowEl.querySelectorAll('.fstep').forEach(function(st){ st.onclick=function(){ flowEl.querySelectorAll('.fstep').forEach(function(x){x.classList.remove('sel');}); st.classList.add('sel'); if(hidden) hidden.value=st.getAttribute('data-s'); }; });
    }, 0);
  }

  function verifyConversion(lead, after){
    var unit = lead.unit || lead.convertedUnit || '';
    formDialog({
      title:'Verify conversion',
      width:520,
      intro:'<p class="hint" style="margin-bottom:8px">Verifying a conversion is the wall between <b>what Sales verified</b> and <b>what Finance approves</b>. It creates a <b>Pending</b> commission record — no amount is calculated here (Finance enters it in Part 6).</p>'+
        '<div class="card" style="margin:0 0 6px;padding:12px 14px"><dl class="kv" style="grid-template-columns:130px 1fr">'+
        '<dt>Buyer</dt><dd>'+esc(lead.buyer)+'</dd>'+
        '<dt>Unit / share</dt><dd>'+esc(unit||'—')+'</dd>'+
        '<dt>Project</dt><dd>'+esc(lead.project)+'</dd>'+
        '<dt>Submitting partner</dt><dd>'+esc(lead.partner)+' <span class="mono" style="font-size:11px;color:var(--ink-muted)">'+esc(lead.partnerId||'')+'</span></dd></dl></div>',
      fields:[ { type:'text', key:'unit', label:'Unit / share being purchased', value:unit, placeholder:'e.g. A-7C' },
        { type:'textarea', key:'note', label:'Verification note (internal, optional)', placeholder:'e.g. Booking money received, confirmed with Finance.' } ],
      warn:'This flips the lead to Converted and creates a commission record. It cannot be undone here.',
      mobileNote:'<b>'+esc(lead.partner)+'</b> sees the lead flip to <b>Converted</b>; the commission appears on their earnings once Finance approves it (Part 6).',
      confirmLabel:'Verify conversion'
    }).then(function(v){
      if (!v) return;
      Perm.requirePermission(state.role,'VERIFY_CONVERSION');
      var commId = 'CM-2026-'+String(700+PL.commissionRecords().length+1);
      var record = { id:commId, leadId:lead.id, buyer:lead.buyer, project:lead.project, unit:(v.unit||unit||null),
        partner:lead.partner, partnerId:lead.partnerId, status:'pending', amountBdt:null, createdUtc:root.CRM_NOW, createdBy:actor().name };
      var add = [ { t:root.CRM_NOW, kind:'convert', text:'Conversion verified by '+actor().name+' — commission record '+commId+' created (Pending).', internal:false } ];
      if (v.note) add.unshift({ t:root.CRM_NOW, kind:'note', text:v.note, internal:true });
      Ripples.mutate('lead:'+lead.id, { status:'converted', convertedUnit:(v.unit||unit||null), timelineAdd: add.concat((readOv()['lead:'+lead.id]||{}).timelineAdd||[]) });
      Ripples.mutate('comm:'+commId, record);
      Audit.audit({ actor:actor(), action:'VERIFY_CONVERSION', target:lead.id+' · '+lead.buyer, changes:{ commissionRecord:commId, unit:record.unit } });
      Ripples.emit({ mobileId:lead.partnerId, kind:'partner', screen:'P30 · Converted', headline:'Conversion verified — '+lead.buyer+' ('+lead.project+') → Converted on '+lead.partner+'’s app · commission '+commId+' Pending' });
      C.toast({ type:'success', persist:true, title:'Conversion verified — '+commId, text:lead.buyer+' · commission record created (Pending for Finance).', ripple:lead.partner.split(' ')[0]+' sees “Converted”' });
      after && after(commId);
    });
  }

  function rejectLead(lead, after){
    formDialog({
      title:'Reject / close lead',
      danger:true,
      intro:'<p class="hint" style="margin-bottom:6px">Closing <b>'+esc(lead.buyer)+'</b>’s lead. Choose whether the reason is internal-only or shown to the partner.</p>',
      fields:[
        { type:'select', key:'visibility', label:'Reason visibility', options:[{value:'internal',label:'Internal only — partner never sees it'},{value:'partner',label:'Shown to partner'}], value:'internal' },
        { type:'textarea', key:'reason', label:'Reason', required:true, placeholder:'e.g. Budget mismatch — buyer looking below entry price.' }
      ],
      mobileNote:'The partner sees the lead move to <b>Closed</b>. The reason is shown only if you choose “Shown to partner”.',
      confirmLabel:'Close lead'
    }).then(function(v){
      if (!v) return;
      Perm.requirePermission(state.role,'REJECT_LEAD');
      var internal = v.visibility!=='partner';
      var add = [ { t:root.CRM_NOW, kind:'reject', text:'Lead closed — '+v.reason+(internal?' (internal)':''), internal:internal } ];
      Ripples.mutate('lead:'+lead.id, { status:'rejected', rejection:{ reason:v.reason, internalOnly:internal }, timelineAdd: add.concat((readOv()['lead:'+lead.id]||{}).timelineAdd||[]) });
      Audit.audit({ actor:actor(), action:'REJECT_LEAD', target:lead.id+' · '+lead.buyer, changes:{ reason:v.reason, internalOnly:internal } });
      Ripples.emit({ mobileId:lead.partnerId, kind:'partner', screen:'P30 · Closed', reason: internal?null:v.reason, headline:'Lead '+lead.id+' ('+lead.buyer+') closed on '+lead.partner+'’s app'+(internal?' (reason internal)':'') });
      C.toast({ type:'warning', title:'Lead closed', text:lead.buyer+(internal?' · reason kept internal':' · reason sent to partner') });
      after && after();
    });
  }

  function reassignOwner(lead, after){
    var staffOpts = Object.keys(CRM.staff).filter(function(r){ return r===Perm.ROLES.SUPER_ADMIN || r===Perm.ROLES.MANAGER; }).map(function(r){ return { value:CRM.staff[r].name, label:CRM.staff[r].name+' · '+Perm.ROLE_LABEL[r] }; });
    formDialog({
      title:'Assign / reassign owner',
      intro:'<div class="effectbox">Current owner <b>'+esc(lead.owner||'Unassigned')+'</b> <span class="internalonly">internal</span></div>',
      fields:[ { type:'select', key:'owner', label:'New staff owner', options:staffOpts, value:lead.owner||'' } ],
      confirmLabel:'Assign owner'
    }).then(function(v){
      if (!v || v.owner===lead.owner) return;
      Perm.requirePermission(state.role,'UPDATE_LEAD_STATUS');
      var add = [ { t:root.CRM_NOW, kind:'note', text:'Owner reassigned '+(lead.owner||'—')+' → '+v.owner+' (by '+actor().name+')', internal:true } ];
      Ripples.mutate('lead:'+lead.id, { owner:v.owner, timelineAdd: add.concat((readOv()['lead:'+lead.id]||{}).timelineAdd||[]) });
      Audit.audit({ actor:actor(), action:'REASSIGN_LEAD_OWNER', target:lead.id, changes:{ from:lead.owner, to:v.owner } });
      C.toast({ type:'success', title:'Owner reassigned', text:lead.buyer+' → '+v.owner+' (internal)' });
      after && after();
    });
  }

  function addNote(lead, text, after){
    if (!text) return;
    Perm.requirePermission(state.role,'VIEW_LEAD');
    Ripples.mutate('lead:'+lead.id, { timelineAdd: [{ t:root.CRM_NOW, kind:'note', text:text, internal:true }].concat((readOv()['lead:'+lead.id]||{}).timelineAdd||[]) });
    Audit.audit({ actor:actor(), action:'ADD_LEAD_NOTE', target:lead.id });
    C.toast({ type:'success', title:'Internal note added', text:'Never shown to the partner.' });
    after && after();
  }

  function confirmMeeting(m, after){
    formDialog({
      title:'Confirm meeting',
      intro:'<p class="hint" style="margin-bottom:6px">Assign staff, propose a time, and attach an external link (no in-panel call — OPEN_QUESTIONS #5).</p>',
      fields:[
        { type:'select', key:'staff', label:'Assign staff', options:[CRM.staff.MANAGER.name, CRM.staff.SUPER_ADMIN.name], value:CRM.staff.MANAGER.name },
        { type:'datetime', key:'when', label:'Proposed time (Dhaka)', value:'2026-07-15T15:00' },
        { type:'text', key:'link', label:'Meeting link', required:true, placeholder:'https://zoom.us/j/… or Meet/Teams' }
      ],
      mobileNote:'<b>'+esc(m.requester)+'</b> sees <b>P36 (meeting confirmed)</b> with this link.',
      confirmLabel:'Confirm meeting'
    }).then(function(v){
      if (!v) return;
      Perm.requirePermission(state.role,'MANAGE_MEETING');
      Ripples.mutate('meet:'+m.id, { status:'confirmed', link:v.link, staff:v.staff, proposedUtc:v.when });
      Audit.audit({ actor:actor(), action:'CONFIRM_MEETING', target:m.id+' · '+m.requester, changes:{ staff:v.staff, link:v.link } });
      Ripples.emit({ mobileId:m.requester==='Shahin Alam'?'shahin':null, kind:'partner', screen:'P36 · Meeting confirmed', headline:'Meeting confirmed for '+m.requester+' ('+m.project+') — link sent to their app' });
      C.toast({ type:'success', persist:true, title:'Meeting confirmed', text:m.requester+' · '+m.project, ripple:'P36 shows the meeting link' });
      after && after();
    });
  }

  function confirmVisit(v0, after){
    formDialog({
      title:'Confirm site visit',
      intro:'<div class="effectbox">'+esc(v0.buyer)+' · '+esc(v0.project)+'<br><b>'+esc(v0.location)+'</b></div>',
      fields:[
        { type:'select', key:'staff', label:'Assign staff', options:[CRM.staff.MANAGER.name, CRM.staff.SUPER_ADMIN.name], value:CRM.staff.MANAGER.name },
        { type:'datetime', key:'when', label:'Visit time (Dhaka)', value:'2026-07-16T10:00' }
      ],
      mobileNote:'<b>'+esc(v0.requester)+'</b> sees the confirmed site visit with location + time.',
      confirmLabel:'Confirm visit'
    }).then(function(v){
      if (!v) return;
      Perm.requirePermission(state.role,'MANAGE_MEETING');
      Ripples.mutate('visit:'+v0.id, { status:'confirmed', staff:v.staff, proposedUtc:v.when });
      Audit.audit({ actor:actor(), action:'CONFIRM_SITE_VISIT', target:v0.id+' · '+v0.requester, changes:{ staff:v.staff } });
      Ripples.emit({ kind:'partner', screen:'Site visit confirmed', headline:'Site visit confirmed for '+v0.requester+' at '+v0.location });
      C.toast({ type:'success', title:'Site visit confirmed', text:v0.requester+' · '+v0.project });
      after && after();
    });
  }

  function confirmConsultation(c, after){
    formDialog({
      title:'Confirm consultation',
      intro:'<div class="effectbox">'+esc(c.client)+' · <b>'+esc(c.tz)+'</b><br>'+esc(fmt.dhaka(c.slotUtc,true))+'</div>',
      fields:[
        { type:'text', key:'link', label:'Meeting link', required:true, placeholder:'https://zoom.us/j/…' },
        { type:'textarea', key:'prep', label:'Prep notes (internal)', placeholder:'e.g. Overseas buyer, focus on handover timeline.' }
      ],
      mobileNote:'<b>'+esc(c.client)+'</b> sees <b>screen 60</b> with the meeting link and slot in their timezone.',
      confirmLabel:'Confirm consultation'
    }).then(function(v){
      if (!v) return;
      Perm.requirePermission(state.role,'MANAGE_CONSULTATION');
      Ripples.mutate('cons:'+c.id, { status:'confirmed', link:v.link, prep:v.prep });
      Audit.audit({ actor:actor(), action:'MANAGE_CONSULTATION', target:c.id+' · '+c.client, changes:{ link:v.link } });
      Ripples.emit({ mobileId:c.mobileId, kind:'client', status:'verified', screen:'Screen 60 · Consultation', name:c.client, headline:'Consultation confirmed for '+c.client+' — Zoom link sent to their app' });
      C.toast({ type:'success', persist:true, title:'Consultation confirmed', text:c.client+' · '+c.tz, ripple:'client screen 60 shows the meeting link' });
      after && after();
    });
  }

  function rescheduleConsultation(c, after){
    formDialog({
      title:'Reschedule consultation',
      danger:false,
      intro:'<p class="hint">Propose a new slot for <b>'+esc(c.client)+'</b> ('+esc(c.tz)+').</p>',
      fields:[ { type:'datetime', key:'when', label:'New slot (Dhaka time)', value:'2026-07-17T14:00' } ],
      mobileNote:'The client sees the updated slot on their calendar screen.',
      confirmLabel:'Reschedule'
    }).then(function(v){
      if (!v) return;
      Perm.requirePermission(state.role,'MANAGE_CONSULTATION');
      Ripples.mutate('cons:'+c.id, { status:'rescheduled', slotUtc:new Date(v.when).toISOString ? v.when : c.slotUtc });
      Audit.audit({ actor:actor(), action:'MANAGE_CONSULTATION', target:c.id+' · rescheduled' });
      Ripples.emit({ mobileId:c.mobileId, kind:'client', status:'pending', screen:'Calendar', name:c.client, headline:'Consultation rescheduled for '+c.client+' — new slot shown on their calendar' });
      C.toast({ type:'info', title:'Consultation rescheduled', text:c.client });
      after && after();
    });
  }

  function addSlot(after){
    formDialog({
      title:'Add availability slot',
      intro:'<p class="hint">Define an available consultation slot in Dhaka time (OPEN_QUESTIONS #4 — duration/buffer rules undefined).</p>',
      fields:[ { type:'datetime', key:'when', label:'Start (Dhaka)', value:'2026-07-18T11:00' }, { type:'select', key:'mins', label:'Duration', options:['30','45','60'], value:'30' } ],
      confirmLabel:'Add slot'
    }).then(function(v){
      if (!v) return;
      Perm.requirePermission(state.role,'MANAGE_CONSULTATION');
      var row = { id:'SL-'+uid(), startUtc:v.when, mins:parseInt(v.mins,10), status:'open' };
      // slotsAdd is an array override — read/modify/write directly
      var full = readOv(); full['slotsAdd'] = [row].concat(full['slotsAdd']||[]);
      try { localStorage.setItem('crm_people_mut', JSON.stringify(full)); } catch(e){}
      Audit.audit({ actor:actor(), action:'ADD_CONSULTATION_SLOT', target:row.id });
      C.toast({ type:'success', title:'Slot added', text:fmt.dhaka(v.when,true) });
      after && after();
    });
  }

  /* ===================== SCREENS ===================== */
  var SCREENS = {};

  /* ---------- F01 · Leads list ---------- */
  SCREENS.F01 = { title:'Leads', sub:'Full internal CRM pipeline', perm:'VIEW_PIPELINE',
    render:function(main){
      var leads = PL.allLeads();
      main.innerHTML = C.PageHeader({ title:this.title, sub:this.sub, actions:[{ id:'comm', label:'Commission records', icon:'₿' }] });
      var cb=main.querySelector('[data-act="comm"]'); if(cb) cb.onclick=function(){ go('X01'); };
      var fbWrap=C.el('<div></div>'); main.appendChild(fbWrap);
      var tableWrap=C.el('<div></div>'); main.appendChild(tableWrap);
      C.FilterBar(fbWrap, { id:'f01', filters:[
        { key:'status', label:'Status', options:Object.keys(PL.INTERNAL_STATUS).map(function(k){ return PL.INTERNAL_STATUS[k].label; }) },
        { key:'partner', label:'Partner', options:uniq(leads.map(function(l){return l.partner;})) },
        { key:'project', label:'Project', options:uniq(leads.map(function(l){return l.project;})) },
        { key:'division', label:'Division', options:['Chattogram','Dhaka','Sylhet'] }
      ], onChange:draw });
      function filtered(){ var f=C.getFilters('f01'); return leads.filter(function(l){
        if (f.status && PL.INTERNAL_STATUS[l.status].label!==f.status) return false;
        if (f.partner && l.partner!==f.partner) return false;
        if (f.project && l.project!==f.project) return false;
        if (f.division && l.territory.indexOf(f.division)<0) return false;
        return true; }); }
      function draw(){
        C.mountDataTable(tableWrap, { rowId:'id', noun:'leads', defaultSort:'updatedUtc', defaultDir:-1, rows:filtered(),
          columns:[
            { key:'id', label:'Lead', render:function(r){ return '<span class="mono" style="font-size:12px">'+esc(r.id)+'</span>'; } },
            { key:'buyer', label:'Buyer', strong:true, sortable:true },
            { key:'project', label:'Project' },
            { key:'unit', label:'Unit', render:function(r){ return r.unit?esc(r.unit):'<span class="muted">—</span>'; } },
            { key:'partner', label:'Partner', render:function(r){ return esc(r.partner); } },
            { key:'status', label:'Internal status', sortable:true, render:function(r){ return leadChip(r.status); } },
            { key:'updatedUtc', label:'Age', align:'right', sortable:true, sortValue:function(r){return r.updatedUtc;}, render:function(r){ return '<span class="muted">'+ageOf(r.createdUtc)+'</span>'; } }
          ],
          rowActions:[
            { label:'Open lead', icon:'↗', onClick:function(r){ go('F02',{id:r.id}); } },
            { label:'Update status', icon:'→', disabled:function(){return !Perm.can(state.role,'UPDATE_LEAD_STATUS');}, onClick:function(r){ updateStatus(r, draw); } },
            { label:'Verify conversion', icon:'✓', disabled:function(r){ return r.status==='converted' || !Perm.can(state.role,'VERIFY_CONVERSION'); }, onClick:function(r){ verifyConversion(r, draw); } },
            { label:'Reject / close', icon:'✕', danger:true, disabled:function(r){ return r.status==='rejected' || !Perm.can(state.role,'REJECT_LEAD'); }, onClick:function(r){ rejectLead(r, draw); } }
          ],
          onRowClick:function(r){ go('F02',{id:r.id}); } });
      }
      draw();
    }
  };
  function uniq(a){ var o=[]; a.forEach(function(x){ if(x&&o.indexOf(x)<0) o.push(x); }); return o; }

  /* ---------- F02 · Lead detail ⭐ ---------- */
  SCREENS.F02 = { title:'Lead detail', perm:'VIEW_LEAD',
    render:function(main, P){
      var lead = P.get('id') ? PL.leadById(P.get('id')) : PL.allLeads()[0];
      main.innerHTML = '';
      if (!lead){ main.innerHTML = C.EmptyState({ title:'Lead not found', actionLabel:'All leads' }); wireEmpty(main,'F01'); return; }
      var pstatus = PL.partnerStatusOf(lead.status);
      // band
      main.insertAdjacentHTML('beforeend',
        '<div class="profband"><div class="top"><div class="photo">'+esc(initials(lead.buyer))+'</div>'+
        '<div class="who"><h1>'+esc(lead.buyer)+'</h1><div class="pid">'+esc(lead.id)+' · '+esc(lead.project)+(lead.unit?' · '+esc(lead.unit):'')+'</div></div>'+
        leadChip(lead.status).replace('class="leadchip','class="statuschip leadchip')+'</div>'+
        '<div class="identity"><span>Partner <b>'+esc(lead.partner)+'</b></span><span>Owner <b>'+esc(lead.owner||'Unassigned')+'</b> <span class="internalonly">internal</span></span><span>Age <b>'+ageOf(lead.createdUtc)+'</b></span><span>Partner sees <b>'+esc(PL.PARTNER_LABEL[pstatus]||'—')+'</b></span></div>'+
        '<div class="primaryacts" id="leadacts"></div></div>');
      // primary actions computed from state
      var host=document.getElementById('leadacts'); var acts=[];
      if (lead.status!=='converted' && lead.status!=='rejected'){
        acts.push({ label: lead.status==='negotiation'||lead.status==='visitCompleted'?'Verify conversion':'Update status', cls:'primary', fn:function(){ (lead.status==='negotiation'||lead.status==='visitCompleted'?verifyConversion:updateStatus)(lead, function(){ location.reload(); }); } });
        acts.push({ label:'Update status', cls: (lead.status==='negotiation'||lead.status==='visitCompleted')?'':'', fn:function(){ updateStatus(lead, function(){ location.reload(); }); } });
        acts.push({ label:'Verify conversion', cls:'', perm:'VERIFY_CONVERSION', fn:function(){ verifyConversion(lead, function(){ location.reload(); }); } });
        acts.push({ label:'Reject / close', cls:'danger', perm:'REJECT_LEAD', fn:function(){ rejectLead(lead, function(){ location.reload(); }); } });
      }
      acts.push({ label:'Reassign owner', cls:'', perm:'UPDATE_LEAD_STATUS', fn:function(){ reassignOwner(lead, function(){ location.reload(); }); } });
      // dedupe labels (keep first)
      var seen={}; acts=acts.filter(function(a){ if(seen[a.label])return false; seen[a.label]=1; return true; });
      host.innerHTML = acts.map(function(a,i){ return '<button class="btn '+a.cls+'" data-a="'+i+'"'+(a.perm&&!Perm.can(state.role,a.perm)?' disabled title="Your role can’t do this"':'')+'>'+esc(a.label)+'</button>'; }).join('');
      host.querySelectorAll('[data-a]').forEach(function(b){ b.onclick=function(){ acts[+b.getAttribute('data-a')].fn(); }; });

      // wall toggle
      main.insertAdjacentHTML('beforeend', '<div class="wallbar"><span class="lbl">View</span><span class="hint">Internal timeline vs. the partner’s simplified projection</span><span class="toggle" id="walltoggle"><button data-w="internal" class="on">Internal (full)</button><button data-w="partner">What the partner sees</button></span></div>');
      var body=C.el('<div id="leadbody"></div>'); main.appendChild(body);

      function renderInternal(){
        var tlitems = lead.timeline;
        var tl = C.el('<div class="card"><h3>Full internal timeline</h3></div>');
        var line = C.el('<div class="timeline"></div>');
        tlitems.forEach(function(it){ line.appendChild(C.el('<div class="tl-row k-'+(it.kind||'')+'"><div class="tx"><span class="tl-kind">'+esc(it.kind||'')+'</span>'+esc(it.text)+(it.internal?'<span class="internalonly">internal</span>':'')+'</div><div class="mt">'+esc(fmt.ago(it.t))+'</div></div>')); });
        tl.appendChild(line);
        // note composer
        var composer = C.el('<div><div class="sectitle" style="margin-top:4px">Add internal note <span class="internalonly">never shown to the partner</span></div><div class="notebox"><textarea id="notein" placeholder="Staff-only note…"></textarea><button class="btn primary" id="noteadd">Add note</button></div></div>');
        body.innerHTML=''; body.appendChild(tl); body.appendChild(composer);
        body.appendChild(auditNote(lead.id));
        document.getElementById('noteadd').onclick=function(){ var t=document.getElementById('notein').value.trim(); if(!t){ C.toast({type:'warning',title:'Empty note'}); return; } addNote(lead, t, function(){ location.reload(); }); };
      }
      function renderPartner(){ body.innerHTML=''; body.insertAdjacentHTML('beforeend', partnerProjection(lead));
        var seen = lead.timeline.filter(function(it){ return !it.internal; });
        var card=C.el('<div class="card"><h3>What the partner’s timeline shows</h3></div>');
        var line=C.el('<div class="timeline"></div>');
        seen.forEach(function(it){ line.appendChild(C.el('<div class="tl-row"><div class="tx">'+esc(it.text)+'</div><div class="mt">'+esc(fmt.ago(it.t))+'</div></div>')); });
        if(!seen.length) line.appendChild(C.el('<div class="hint">No partner-visible events yet.</div>'));
        card.appendChild(line); body.appendChild(card);
      }
      renderInternal();
      document.querySelectorAll('#walltoggle button').forEach(function(b){ b.onclick=function(){ document.querySelectorAll('#walltoggle button').forEach(function(x){x.classList.remove('on');}); b.classList.add('on'); (b.getAttribute('data-w')==='partner'?renderPartner:renderInternal)(); }; });
    }
  };

  /* ---------- F03 · Update status (launcher) ---------- */
  SCREENS.F03 = { title:'Update lead status', perm:'UPDATE_LEAD_STATUS',
    render:function(main, P){
      var lead = P.get('id')?PL.leadById(P.get('id')):PL.allLeads().filter(function(l){return l.status!=='converted'&&l.status!=='rejected';})[0];
      main.innerHTML = header(this);
      if (!lead){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'No open lead', actionLabel:'All leads' })); wireEmpty(main,'F01'); return; }
      main.insertAdjacentHTML('beforeend', leadCard(lead) + '<div class="primaryacts"><button class="btn primary" id="go">Update '+esc(lead.buyer)+'’s status</button><a class="btn" href="'+href('F02',{id:lead.id})+'">Open lead</a></div>');
      document.getElementById('go').onclick=function(){ updateStatus(lead, function(){ go('F02',{id:lead.id}); }); };
    }
  };
  /* ---------- F04 · Verify conversion (launcher) ⭐⭐ ---------- */
  SCREENS.F04 = { title:'Verify conversion', sub:'Creates a Pending commission record for Finance (Part 6)', perm:'VERIFY_CONVERSION',
    render:function(main, P){
      var lead = P.get('id')?PL.leadById(P.get('id')):PL.allLeads().filter(function(l){return l.status==='visitCompleted'||l.status==='negotiation';})[0];
      main.innerHTML = header(this);
      main.insertAdjacentHTML('beforeend', '<div class="part6note">🧱 The wall: this action records <b>what Sales verified</b>. The commission <b>amount</b> is entered by Finance on the web panel in Part 6 — nothing is calculated here.</div>');
      if (!lead){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'No lead ready to convert', actionLabel:'All leads' })); wireEmpty(main,'F01'); return; }
      main.insertAdjacentHTML('beforeend', leadCard(lead) + '<div class="primaryacts"><button class="btn primary" id="go">Verify '+esc(lead.buyer)+'’s conversion</button><a class="btn" href="'+href('F02',{id:lead.id})+'">Open lead</a></div>');
      document.getElementById('go').onclick=function(){ verifyConversion(lead, function(){ go('X01'); }); };
    }
  };
  /* ---------- F05 · Reject / close (launcher) ---------- */
  SCREENS.F05 = { title:'Reject / close lead', perm:'REJECT_LEAD',
    render:function(main, P){
      var lead = P.get('id')?PL.leadById(P.get('id')):PL.allLeads().filter(function(l){return l.status!=='converted'&&l.status!=='rejected';})[0];
      main.innerHTML = header(this);
      if (!lead){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'No open lead', actionLabel:'All leads' })); wireEmpty(main,'F01'); return; }
      main.insertAdjacentHTML('beforeend', leadCard(lead) + '<div class="primaryacts"><button class="btn danger" id="go">Close '+esc(lead.buyer)+'’s lead</button><a class="btn" href="'+href('F02',{id:lead.id})+'">Open lead</a></div>');
      document.getElementById('go').onclick=function(){ rejectLead(lead, function(){ go('F01'); }); };
    }
  };
  function leadCard(lead){
    return '<div class="card"><h3>Lead '+esc(lead.id)+'</h3><dl class="kv">'+
      '<dt>Buyer</dt><dd>'+esc(lead.buyer)+'</dd><dt>Project</dt><dd>'+esc(lead.project)+(lead.unit?' · '+esc(lead.unit):'')+'</dd>'+
      '<dt>Partner</dt><dd>'+esc(lead.partner)+'</dd><dt>Internal status</dt><dd>'+leadChip(lead.status)+'</dd>'+
      '<dt>Owner</dt><dd>'+esc(lead.owner||'Unassigned')+' <span class="internalonly">internal</span></dd></dl></div>';
  }

  /* ---------- G01 · Meetings queue ---------- */
  SCREENS.G01 = { title:'Meetings queue', sub:'Partner meeting requests awaiting confirmation', perm:'VIEW_PIPELINE',
    emptyState:function(){ return C.EmptyState({ icon:'✓', title:'No meetings to confirm', text:'Partner meeting requests appear here.' }); },
    render:function(main){
      var pending = PL.allMeetings().filter(function(m){return m.status==='pending';});
      main.innerHTML = header(this);
      if (!pending.length){ main.insertAdjacentHTML('beforeend', this.emptyState()); return; }
      pending.forEach(function(m){ main.appendChild(reqCard({
        who:m.requester, sub:'partner', st:C.StatusChip('pending'),
        meta:[['Buyer',m.buyer],['Project',m.project],['Proposed',fmt.dhaka(m.proposedUtc,true)]],
        acts: Perm.can(state.role,'MANAGE_MEETING') ? [{ label:'Confirm meeting', cls:'primary', fn:function(){ confirmMeeting(m, function(){ location.reload(); }); } },{ label:'Open lead', cls:'', fn:function(){ go('F02',{id:m.leadId}); } }] : [{ label:'Open lead', cls:'', fn:function(){ go('F02',{id:m.leadId}); } }]
      })); });
    }
  };
  /* ---------- G02 · Confirm meeting (launcher) ---------- */
  SCREENS.G02 = { title:'Confirm meeting', perm:'MANAGE_MEETING',
    render:function(main, P){
      var m = P.get('id')?PL.meetingById(P.get('id')):PL.allMeetings().filter(function(x){return x.status==='pending';})[0];
      main.innerHTML = header(this);
      if (!m){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'No meeting to confirm', actionLabel:'Meetings queue' })); wireEmpty(main,'G01'); return; }
      main.appendChild(reqCard({ who:m.requester, sub:'partner', st:C.StatusChip(m.status),
        meta:[['Buyer',m.buyer],['Project',m.project],['Proposed',fmt.dhaka(m.proposedUtc,true)]],
        acts:[{ label:'Confirm '+m.requester+'’s meeting', cls:'primary', fn:function(){ confirmMeeting(m, function(){ go('G01'); }); } }] }));
    }
  };
  /* ---------- G03 · Site visit queue ---------- */
  SCREENS.G03 = { title:'Site visit queue', sub:'Partner visit requests · location + time', perm:'VIEW_PIPELINE',
    emptyState:function(){ return C.EmptyState({ icon:'✓', title:'No site visits to confirm' }); },
    render:function(main){
      var pending = PL.allSiteVisits().filter(function(v){return v.status==='pending';});
      main.innerHTML = header(this);
      if (!pending.length){ main.insertAdjacentHTML('beforeend', this.emptyState()); return; }
      pending.forEach(function(v){ main.appendChild(reqCard({
        who:v.requester, sub:'site visit', st:C.StatusChip('pending'),
        meta:[['Buyer',v.buyer],['Project',v.project],['Location',v.location],['Proposed',fmt.dhaka(v.proposedUtc,true)]],
        acts: Perm.can(state.role,'MANAGE_MEETING') ? [{ label:'Confirm visit', cls:'primary', fn:function(){ confirmVisit(v, function(){ location.reload(); }); } },{ label:'Open lead', cls:'', fn:function(){ go('F02',{id:v.leadId}); } }] : [{ label:'Open lead', cls:'', fn:function(){ go('F02',{id:v.leadId}); } }]
      })); });
    }
  };

  /* ---------- H01 · Slot management ---------- */
  SCREENS.H01 = { title:'Consultation slots', sub:'Scheduler availability · Dhaka time', perm:'MANAGE_CONSULTATION',
    render:function(main){
      main.innerHTML = header(this);
      main.insertAdjacentHTML('beforeend', '<div class="primaryacts" style="margin-bottom:12px"><button class="btn primary" id="addslot">＋ Add slot</button></div>');
      document.getElementById('addslot').onclick=function(){ addSlot(function(){ location.reload(); }); };
      var grid=C.el('<div class="slotgrid"></div>'); main.appendChild(grid);
      PL.allSlots().forEach(function(s){
        grid.appendChild(C.el('<div class="slotcard '+(s.status==='booked'?'booked':'')+'"><div class="sd">'+esc(fmt.dhaka(s.startUtc))+'</div><div class="st">'+esc(fmt.dhaka(s.startUtc,true).replace(' (Dhaka)',''))+' · '+s.mins+' min</div><div class="sf">'+(s.status==='booked'?'<span class="chip amber"><span class="d"></span>Booked</span>':'<span class="chip green"><span class="d"></span>Open</span>')+'</div></div>'));
      });
      main.insertAdjacentHTML('beforeend','<p class="metaline" style="margin-top:12px">Slot duration, buffer and cancellation-window rules are undefined (OPEN_QUESTIONS #4).</p>');
    }
  };
  /* ---------- H02 · Consultation requests ---------- */
  SCREENS.H02 = { title:'Consultation requests', sub:'Global clients booking slots', perm:'MANAGE_CONSULTATION',
    emptyState:function(){ return C.EmptyState({ icon:'✓', title:'No consultation requests' }); },
    render:function(main){
      var reqs = PL.allConsultations().filter(function(c){return c.status==='requested';});
      main.innerHTML = header(this);
      if (!reqs.length){ main.insertAdjacentHTML('beforeend', this.emptyState()); return; }
      reqs.forEach(function(c){ main.appendChild(reqCard({
        who:c.client, sub:c.tz, st:C.StatusChip('pending'),
        meta:[['Timezone',c.tz],['Project',c.project],['Requested slot',fmt.dhaka(c.slotUtc,true)]],
        acts:[{ label:'Confirm', cls:'primary', fn:function(){ confirmConsultation(c, function(){ location.reload(); }); } },{ label:'Reschedule', cls:'', fn:function(){ rescheduleConsultation(c, function(){ location.reload(); }); } }]
      })); });
    }
  };
  /* ---------- H03 · Confirmed consultation detail ---------- */
  SCREENS.H03 = { title:'Consultation detail', perm:'VIEW_PIPELINE',
    render:function(main, P){
      var c = P.get('id')?PL.consultationById(P.get('id')):PL.allConsultations().filter(function(x){return x.status==='confirmed';})[0];
      main.innerHTML = header(this);
      if (!c){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'No confirmed consultation', actionLabel:'Requests' })); wireEmpty(main,'H02'); return; }
      main.insertAdjacentHTML('beforeend',
        '<div class="card"><h3>Consultation '+esc(c.id)+'</h3><dl class="kv">'+
        '<dt>Client</dt><dd>'+esc(c.client)+'</dd><dt>Timezone</dt><dd>'+esc(c.tz)+'</dd>'+
        '<dt>Project</dt><dd>'+esc(c.project)+'</dd><dt>Slot (Dhaka)</dt><dd>'+esc(fmt.dhaka(c.slotUtc,true))+'</dd>'+
        '<dt>Status</dt><dd>'+C.StatusChip(c.status==='confirmed'?'approved':'pending')+'</dd>'+
        '<dt>Meeting link</dt><dd>'+(c.link?'<a class="linkchip" href="'+esc(c.link)+'" target="_blank">🔗 Join link</a>':'<span class="muted">—</span>')+'</dd>'+
        '<dt>Prep notes</dt><dd>'+esc(c.prep||'—')+' <span class="internalonly">internal</span></dd></dl>'+
        (c.status!=='confirmed'&&Perm.can(state.role,'MANAGE_CONSULTATION')?'<div class="gap"></div><button class="btn primary" id="conf">Confirm consultation</button>':'')+'</div>');
      var cf=document.getElementById('conf'); if(cf) cf.onclick=function(){ confirmConsultation(c, function(){ location.reload(); }); };
      main.appendChild(auditNote(c.id));
    }
  };

  /* ---------- X01 · Commission records (Part 6 stub) ---------- */
  SCREENS.X01 = { title:'Commission records', sub:'Created by conversion — Pending for Finance (Part 6)', perm:'VIEW_PIPELINE',
    render:function(main){
      main.innerHTML = header(this);
      main.insertAdjacentHTML('beforeend', '<div class="part6note">🧱 These records were created by <b>Verify conversion</b> (F04). Amounts are <b>blank</b> — Finance enters and approves them in the <b>Commission desk (Part 6)</b>. <a class="linkrow" href="L01-commission-queue.html">Open the Commission queue →</a></div>');
      var recs = PL.commissionRecords();
      if (!recs.length){ main.insertAdjacentHTML('beforeend', C.EmptyState({ icon:'₿', title:'No commission records yet', text:'Verify a lead conversion (F04) to create a Pending commission record here.', actionLabel:'Go to leads' })); wireEmpty(main,'F01'); return; }
      var tw=C.el('<div></div>'); main.appendChild(tw);
      C.mountDataTable(tw, { rowId:'id', noun:'commission records', rows:recs, columns:[
        { key:'id', label:'Commission', strong:true, render:function(r){ return '<span class="mono">'+esc(r.id)+'</span>'; } },
        { key:'partner', label:'Partner', render:function(r){ return esc(r.partner)+' <span class="mono" style="font-size:11px;color:var(--ink-muted)">'+esc(r.partnerId||'')+'</span>'; } },
        { key:'buyer', label:'Buyer' }, { key:'project', label:'Project' }, { key:'unit', label:'Unit', render:function(r){ return r.unit?esc(r.unit):'—'; } },
        { key:'amountBdt', label:'Amount', align:'right', render:function(){ return '<span class="muted">— (set by Finance)</span>'; } },
        { key:'status', label:'Status', render:function(){ return C.StatusChip('pending'); } },
        { key:'leadId', label:'From lead', render:function(r){ return '<span class="linkrow" data-lead="'+esc(r.leadId)+'">'+esc(r.leadId)+'</span>'; } }
      ], onRowClick:function(r){ go('F02',{id:r.leadId}); } });
    }
  };

  function reqCard(cfg){
    var meta = (cfg.meta||[]).map(function(m){ return '<span>'+esc(m[0])+' <b>'+esc(m[1])+'</b></span>'; }).join('');
    var card = C.el('<div class="reqcard"><div class="rh"><span class="who">'+esc(cfg.who)+'</span><span class="chip grey" style="height:18px"><span class="d"></span>'+esc(cfg.sub)+'</span><span class="st">'+cfg.st+'</span></div><div class="rmeta">'+meta+'</div><div class="racts"></div></div>');
    var host=card.querySelector('.racts');
    (cfg.acts||[]).forEach(function(a){ var b=C.el('<button class="btn '+(a.cls||'')+'">'+esc(a.label)+'</button>'); b.onclick=a.fn; host.appendChild(b); });
    return card;
  }

  /* ===================== boot ===================== */
  function boot(screenId){
    state.screen = screenId; state.params = new URLSearchParams(location.search);
    Audit.seed(CRM.auditSeed); mountShell(); renderMain();
  }
  root.Pipeline = { boot: boot, rerender: renderMain, SCREENS: SCREENS, go: go, href: href };
})(window);
