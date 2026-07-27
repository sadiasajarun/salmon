/* ============================================================================
 * Salmon CRM — Documents / Communications / Reporting engine (Part 7)
 * ----------------------------------------------------------------------------
 * screens/N0x-O0x-P0x-Q0x .html bootstrap Connect.boot('N01'). Three connective
 * modules sharing one shell + a Part-7 sub-nav. The load-bearing rule:
 *   - each document is gated by Perm.canView(role, classification), enforced on
 *     N02 (a Manager URL-pasting to a Customer-restricted KYC → A03),
 *   - every N02 view AND every download writes audit() + an access-log row,
 *   - reports carry exportable=true/false; the CSV button is gated on it, and
 *     every export writes audit() with the filters used.
 * ==========================================================================*/
(function (root) {
  'use strict';
  var C = root.C, Perm = root.Perm, Audit = root.Audit, CRM = root.CRM, Router = root.Router,
      DevToolbar = root.DevToolbar, CN = root.CRM.Connect, Ripples = root.Ripples,
      RPT = root.CRM.Reporting;   // reporting engine (Req 6.17) — live + role-scoped

  root.CRM_NOW = '2026-07-15T10:00:00Z';
  var esc = C.esc, fmt = C.fmt;

  var state = { role: localStorage.getItem('crm_role') || Perm.ROLES.SUPER_ADMIN, render:'data', screen:null, params:null };
  function actor(){ return CRM.staff[state.role]; }
  function setRole(r){ state.role = r; localStorage.setItem('crm_role', r); }

  var FILES = {
    N01:'N01-document-repository.html', N02:'N02-document-detail.html', N03:'N03-upload-document.html', N04:'N04-change-visibility.html', N05:'N05-version-history.html', N06:'N06-access-log.html',
    O01:'O01-ticket-inbox.html', O02:'O02-ticket-detail.html', O03:'O03-chat-handoff.html',
    P01:'P01-notices-list.html', P02:'P02-compose-notice.html', P03:'P03-notice-detail.html',
    Q01:'Q01-reports-hub.html', Q02:'Q02-report-viewer.html', Q03:'Q03-export-queue.html', Q04:'Q04-metrics-overview.html'
  };
  function href(id, params){
    var f=FILES[id]; if(!f) return '#';
    if(!params) return f;
    var qs=Object.keys(params).filter(function(k){return params[k]!=null&&params[k]!=='';}).map(function(k){return k+'='+encodeURIComponent(params[k]);}).join('&');
    return qs?f+'?'+qs:f;
  }
  function go(id, params){ location.href = href(id, params); }

  /* ===================== shell ===================== */
  function sectionOf(sid){ return (sid||'N')[0]; }
  function mountShell(){
    document.getElementById('root').innerHTML =
      '<div class="app" id="app">' +
      '<div class="brandcorner"><a class="mark" href="../index.html" title="Salmon console home">S</a><span class="name">SALMON</span><button class="collapse" id="collapse" title="Collapse">⇤</button></div>' +
      '<div class="topbar" id="topbar"></div><nav class="sidebar" id="sidebar"></nav>' +
      '<div class="main"><div class="maininner" id="main"></div><div class="appfooter" id="footer"></div></div></div>';
    document.getElementById('collapse').onclick=function(){ document.getElementById('app').classList.toggle('collapsed'); };
    renderTopbar(); renderSidebar(); renderFooter(); ensureRippleFab();
  }
  function areaName(sec){ return { N:'Documents', O:'Support', P:'Notices', Q:'Reporting' }[sec]||'Part 7'; }
  function areaHome(sec){ return { N:'N01', O:'O01', P:'P01', Q:'Q01' }[sec]||'N01'; }
  function renderTopbar(){
    var tb=document.getElementById('topbar'); if(!tb) return;
    var sc=SCREENS[state.screen]||{title:'Part 7'}; var sec=sectionOf(state.screen); var s=actor();
    tb.innerHTML =
      '<div class="breadcrumb"><a href="../index.html#/dashboard">Salmon</a><span class="sep">›</span>' +
      '<a href="'+href(areaHome(sec))+'">'+esc(areaName(sec))+'</a><span class="sep">›</span><span class="cur">'+esc(sc.title)+'</span></div><span class="spacer"></span>' +
      '<button class="searchbtn" id="searchbtn">🔎 <span>Search…</span><kbd>⌘K</kbd></button><span id="devmount"></span>' +
      '<button class="icobtn" id="bell">🔔</button>' +
      '<div class="user"><span class="avatar">'+esc(s.initials)+'</span><span class="who"><span class="nm">'+esc(s.name)+'</span><span class="rl">'+Perm.ROLE_LABEL[state.role]+'</span></span></div>';
    document.getElementById('devmount').appendChild(DevToolbar.render({
      role: state.role, state: state.render,
      onRole:function(r){ setRole(r); renderTopbar(); renderSidebar(); renderFooter(); renderMain(); },
      onState:function(st){ state.render=st; renderMain(); },
      onReset:function(){ Ripples.reset(); C.toast({type:'info',title:'Mock data reset',text:'Part-7 data and ripples restored to seed.'}); renderMain(); }
    }));
    document.getElementById('searchbtn').onclick=function(){ location.href='../index.html#/dashboard'; };
    document.getElementById('bell').onclick=function(){ C.toast({type:'info',title:'Notifications',text:'The notification centre lives on the console home (Part 1).'}); };
  }
  function renderSidebar(){
    var sb=document.getElementById('sidebar'); if(!sb) return;
    var sec=sectionOf(state.screen);
    var activeId = sec==='N'?'documents':(sec==='O'||sec==='P')?'communications':sec==='Q'?'reporting':null;
    var groups=Router.getSidebarFor(state.role);
    var MODMAP={ documents:'N01-document-repository.html', communications:'O01-ticket-inbox.html', reporting:'Q01-reports-hub.html', people:'B02-approval-queue.html', catalogue:'E01-projects-list.html', pipeline:'F01-leads-list.html', finance:'I01-webhook-queue.html' };
    sb.innerHTML = groups.map(function(g){
      return '<div class="navgroup"><div class="gl">'+esc(g.title)+'</div>'+g.items.map(function(it){
        var active=it.id===activeId; var route=MODMAP[it.id]||('../index.html'+it.route);
        return '<a class="navitem'+(active?' active':'')+'" href="'+route+'"><span class="ic">'+it.icon+'</span><span class="lb">'+esc(it.label)+'</span>'+(it.count?'<span class="count">'+it.count+'</span>':'')+'</a>';
      }).join('')+'</div>';
    }).join('');
  }
  function renderFooter(){ var ft=document.getElementById('footer'); if(!ft)return; var s=actor();
    ft.innerHTML='<b style="color:var(--ink-2)">'+esc(s.name)+'</b> · '+Perm.ROLE_LABEL[state.role]+' · '+esc(s.office)+'<span class="spacer" style="flex:1"></span><span>Salmon Admin · Documents · Support · Reporting (Part 7)</span>'; }
  function ensureRippleFab(){
    if(document.getElementById('ripplefab')){ updateFab(); return; }
    var b=document.createElement('button'); b.id='ripplefab'; b.className='ripplefab';
    b.innerHTML='📱 Mobile ripples <span class="rc" id="ripplecount">0</span>'; b.onclick=function(){ Ripples.toggleConsole(); };
    document.body.appendChild(b); document.addEventListener('ripple', updateFab); updateFab();
  }
  function updateFab(){ var c=document.getElementById('ripplecount'); if(c) c.textContent=Ripples.feed().length; }

  /* ===================== main render (static perm OR custom gate) ===================== */
  function renderMain(){
    renderTopbar();
    var main=document.getElementById('main'); if(!main) return;
    var sc=SCREENS[state.screen];
    if(!sc){ main.innerHTML=C.PageHeader({title:'Unknown screen'}); return; }
    var denied=false, permLabel=sc.perm;
    if (sc.gate){ var g=sc.gate(state.role, state.params); denied=!g.ok; permLabel=g.perm; }
    else if (sc.perm && !Perm.can(state.role, sc.perm)){ denied=true; }
    if (denied){
      Audit.audit({ actor:actor(), action:'ACCESS_DENIED', target:'Part7 · '+sc.title+(permLabel?' ('+permLabel+')':'') });
      main.innerHTML=deniedPanel(sc.title, permLabel); wireDenied(main); return;
    }
    if(state.render==='loading'){ main.innerHTML=header(sc)+skeleton(); return; }
    if(state.render==='error'){ main.innerHTML=header(sc)+statePanel('error'); return; }
    if(state.render==='offline'){ main.innerHTML=header(sc)+statePanel('offline'); return; }
    if(state.render==='empty'){ main.innerHTML=header(sc)+(sc.emptyState?sc.emptyState():C.EmptyState({title:'Nothing here',text:'This view has no records in the current state.'})); return; }
    try{ sc.render(main, state.params); }catch(e){ console.error(e); main.innerHTML=header(sc)+statePanel('error'); }
    updateFab();
  }
  function p7nav(active){
    var items=[ ['N','Documents',href('N01'),CN.allDocuments().length], ['O','Support',href('O01'),CN.activeTickets().length], ['P','Notices',href('P01'),CN.allNotices().length], ['Q','Reports',href('Q01'),CN.reports.length] ];
    return '<div class="p7nav">'+items.map(function(it){ return '<a class="'+(it[0]===active?'on':'')+'" href="'+it[2]+'">'+esc(it[1])+'<span class="n">'+it[3]+'</span></a>'; }).join('')+'</div>';
  }
  function header(sc){ return p7nav(sectionOf(state.screen)) + C.PageHeader({ title:sc.title, sub:sc.sub }); }
  function deniedPanel(what, perm){
    return p7nav(null)+'<div class="authwrap" style="min-height:auto;padding:40px 0"><div class="authcard denied" style="text-align:center">' +
      '<div class="mark" style="margin:0 auto 14px">⛔</div><h1>Access denied</h1>' +
      '<p>Your role — <b>'+Perm.ROLE_LABEL[state.role]+'</b> — cannot open <b>'+esc(what)+'</b>.'+(perm?' Required: <span class="mono">'+perm+'</span>.':'')+'<br>Visibility is enforced server-side by classification, not by hiding rows.</p>' +
      '<button class="btn primary" id="back-p7" style="width:auto;margin:4px auto 0">Back</button></div></div>';
  }
  function wireDenied(main){ var b=main.querySelector('#back-p7'); if(b) b.onclick=function(){ go(areaHome(sectionOf(state.screen))); }; }
  function skeleton(){ var rows=Array(6).fill(0).map(function(){return '<div class="sk" style="height:34px;margin:6px 0"></div>';}).join(''); return '<div class="tablewrap" style="padding:10px">'+rows+'</div>'; }
  function statePanel(kind){
    if(kind==='offline') return C.EmptyState({icon:'⚠',title:'You’re offline',text:'We can’t reach the Salmon servers. Reconnect to load this view.'});
    return C.EmptyState({icon:'⚠',title:'Something went wrong',text:'This view failed to load. Retry, and if it persists the on-call engineer is paged.'});
  }

  /* ===================== formDialog ===================== */
  function formDialog(cfg){
    return new Promise(function(resolve){
      var fieldsHtml=(cfg.fields||[]).map(function(f){
        if(f.type==='html') return f.html;
        var lab='<label>'+esc(f.label)+(f.required?' <span class="req">*</span>':'')+'</label>';
        if(f.type==='textarea') return '<div class="field">'+lab+'<textarea data-fk="'+f.key+'" maxlength="'+(f.max||600)+'" placeholder="'+esc(f.placeholder||'')+'">'+esc(f.value||'')+'</textarea></div>';
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
        if(bad.length){ var f0=scrim.querySelector('[data-fk="'+bad[0].key+'"]'); if(f0){f0.style.borderColor='var(--red)';f0.focus();} C.toast({type:'warning',title:'A required field is empty',text:bad[0].label+' is required.'}); return; } close(vals); };
      document.addEventListener('keydown',key); document.body.appendChild(scrim);
      var first=scrim.querySelector('[data-fk],[data-ok]'); if(first) first.focus();
    });
  }

  /* ===================== helpers ===================== */
  function readOv(){ try{ return JSON.parse(localStorage.getItem('crm_people_mut')||'{}'); }catch(e){ return {}; } }
  function auditNote(id){ var n=C.el(C.AuditNote({actor:actor().name,when:root.CRM_NOW})); n.querySelector('.lk').onclick=function(){ C.toast({type:'info',title:'Audit slice',text:'Opens the audit log filtered to '+(id||'this record')+' (Super Admin · Part 7).'}); }; return n; }
  function wireEmpty(main, screen){ var b=main.querySelector('[data-empty-act]'); if(b) b.onclick=function(){ go(screen); }; }
  function visChip(v){ return '<span class="vis '+v+'"><span class="d"></span>'+esc(v)+'</span>'; }
  function ageChip(iso, slaH){ var h=(new Date(root.CRM_NOW)-new Date(iso))/3600000; var lab=h<24?Math.round(h)+'h':Math.floor(h/24)+'d'; var cls=h>=slaH?'over':h>=slaH*0.66?'warn':'ok'; return '<span class="sla '+cls+'">'+lab+'</span>'; }
  function logAccess(doc, kind){
    var ov=readOv(); var patch=ov['doc:'+doc.id]||{}; patch.accessAdd=[{ actor:actor().name, role:state.role, kind:kind, whenUtc:root.CRM_NOW }].concat(patch.accessAdd||[]);
    Ripples.mutate('doc:'+doc.id, patch);
    Audit.audit({ actor:actor(), action: kind==='download'?'DOWNLOAD_DOCUMENT':'VIEW_DOCUMENT', target:doc.id+' · '+doc.title });
  }

  /* ===================== SCREENS ===================== */
  var SCREENS = {};

  /* ===================== N — Documents ===================== */

  /* ---------- N01 · Document repository ---------- */
  SCREENS.N01 = { title:'Document repository', sub:'Controlled documents · gated by classification', perm:'VIEW_DOCUMENTS',
    render:function(main){
      var docs = CN.allDocuments();
      main.innerHTML = C.PageHeader({ title:this.title, sub:this.sub, actions: Perm.can(state.role,'UPLOAD_DOCUMENT')?[{ id:'up', label:'Upload document', cls:'primary', icon:'⬆' }]:[] });
      main.insertAdjacentHTML('afterbegin', p7nav('N'));
      var ub=main.querySelector('[data-act="up"]'); if(ub) ub.onclick=function(){ go('N03'); };
      var fbWrap=C.el('<div></div>'); main.appendChild(fbWrap);
      var tableWrap=C.el('<div></div>'); main.appendChild(tableWrap);
      C.FilterBar(fbWrap, { id:'n01', filters:[
        { key:'project', label:'Project', options:uniq(docs.map(function(d){return d.project;})) },
        { key:'category', label:'Category', options:CN.CATEGORIES },
        { key:'visibility', label:'Visibility', options:CN.VISIBILITIES },
        { key:'verification', label:'Verification', options:['verified','pending','draft'] }
      ], onChange:draw });
      function filtered(){ var f=C.getFilters('n01'); return docs.filter(function(d){ if(f.project&&d.project!==f.project)return false; if(f.category&&d.category!==f.category)return false; if(f.visibility&&d.visibility!==f.visibility)return false; if(f.verification&&d.verification!==f.verification)return false; return true; }); }
      function draw(){
        C.mountDataTable(tableWrap, { rowId:'id', noun:'documents', defaultSort:'uploadedUtc', defaultDir:-1, rows:filtered(), columns:[
          { key:'title', label:'Document', strong:true, sortable:true, render:function(r){ var locked=!Perm.canView(state.role, r.visibility); return (locked?'🔒 ':'')+esc(r.title); } },
          { key:'category', label:'Category' },
          { key:'project', label:'Project' },
          { key:'visibility', label:'Visibility', render:function(r){ return visChip(r.visibility); } },
          { key:'verification', label:'Verification', render:function(r){ return C.StatusChip(r.verification==='verified'?'verified':r.verification==='pending'?'pending':'draft'); } },
          { key:'version', label:'Ver' },
          { key:'uploadedUtc', label:'Uploaded', sortable:true, sortValue:function(r){return r.uploadedUtc;}, render:function(r){ return fmt.dhaka(r.uploadedUtc); } }
        ], rowActions:[
          { label:'Open', icon:'↗', onClick:function(r){ go('N02',{id:r.id}); } },
          { label:'Access log', icon:'☰', disabled:function(){ return !Perm.can(state.role,'VIEW_ACCESS_LOG'); }, onClick:function(r){ go('N06',{id:r.id}); } }
        ], onRowClick:function(r){ go('N02',{id:r.id}); } });
      }
      draw();
      main.insertAdjacentHTML('beforeend','<p class="metaline" style="margin-top:12px">🔒 marks documents your role cannot open. That lock is UX — the real gate fires on the document itself (server-side by classification).</p>');
    }
  };
  function uniq(a){ var o=[]; a.forEach(function(x){ if(x&&o.indexOf(x)<0)o.push(x); }); return o; }

  /* ---------- N02 · Document detail ⭐ (classification-gated, audited view) ---------- */
  SCREENS.N02 = {
    title:'Document detail',
    gate:function(role, P){ var d = P && P.get('id') ? CN.documentById(P.get('id')) : CN.allDocuments()[0]; if(!d) return { ok:true }; return { ok: Perm.canView(role, d.visibility), perm:'VIEW_DOCUMENT · '+d.visibility }; },
    render:function(main, P){
      var d = P.get('id') ? CN.documentById(P.get('id')) : CN.allDocuments()[0];
      main.innerHTML = header(this);
      if (!d){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'Document not found', actionLabel:'Repository' })); wireEmpty(main,'N01'); return; }
      // access is permitted (gate passed) → LOG THE VIEW
      logAccess(d, 'view');
      var tab = P.get('tab') || 'meta';
      main.insertAdjacentHTML('beforeend',
        '<div class="docview"><div><div class="docstageview"><div class="sheet"><div class="dh">'+esc(d.category.toUpperCase())+'</div><div class="ln m"></div><div class="ln"></div><div class="ln s"></div><div class="ln m"></div><div class="ln"></div><div class="ln s"></div></div></div>'+
        '<div style="margin-top:8px"><span class="viewlogchip">● Viewing logged</span></div>'+
        '<div class="doctabs" id="doctabs"><a class="'+(tab==='meta'?'on':'')+'" data-t="meta">Metadata</a><a class="'+(tab==='access'?'on':'')+'" data-t="access">Access log</a></div>'+
        '<div id="docbody"></div></div>'+
        '<div class="rightrail" id="docrail"></div></div>');
      // tabs
      main.querySelectorAll('#doctabs a').forEach(function(a){ a.onclick=function(){ go('N02',{id:d.id, tab:a.getAttribute('data-t')}); }; });
      var body=document.getElementById('docbody');
      if (tab==='access'){
        if (!Perm.can(state.role,'VIEW_ACCESS_LOG')){ body.innerHTML='<div class="card"><p class="hint">Your role can view this document but not its access log ('+'<span class="mono">VIEW_ACCESS_LOG</span>).</p></div>'; }
        else { body.innerHTML='<div class="card"><h3>Access log — every view & download</h3>'+accessRows(d)+'</div>'; }
      } else {
        body.innerHTML='<div class="card"><h3>Metadata</h3><dl class="kv"><dt>Title</dt><dd>'+esc(d.title)+'</dd><dt>Category</dt><dd>'+esc(d.category)+'</dd><dt>Project</dt><dd>'+esc(d.project)+'</dd><dt>Uploaded by</dt><dd>'+esc(d.uploadedBy)+' · '+esc(fmt.dhaka(d.uploadedUtc))+'</dd><dt>Version</dt><dd>'+esc(d.version)+' <span class="linkrow" id="vh">version history</span></dd><dt>Verification</dt><dd>'+C.StatusChip(d.verification==='verified'?'verified':d.verification==='pending'?'pending':'draft')+'</dd></dl></div>';
        var vh=document.getElementById('vh'); if(vh) vh.onclick=function(){ go('N05',{id:d.id}); };
      }
      // right rail — visibility + actions
      document.getElementById('docrail').innerHTML =
        '<div class="railcard"><h4>Visibility</h4><div>'+visChip(d.visibility)+'</div><p class="hint" style="margin-top:8px">Gated server-side by classification. Your role passed the check to open this.</p>'+
        (Perm.can(state.role,'CHANGE_VISIBILITY')?'<div class="gap"></div><button class="btn sm" id="chvis" style="width:100%;justify-content:center">Change visibility</button>':'')+'</div>'+
        '<div class="railcard"><h4>Actions</h4><div style="display:flex;flex-direction:column;gap:6px">'+
        '<button class="btn" id="dl">⬇ Download</button>'+
        (Perm.can(state.role,'UPLOAD_DOCUMENT')?'<button class="btn" id="newver">Upload new version</button>':'')+
        (Perm.can(state.role,'ARCHIVE_DOCUMENT')?'<button class="btn danger" id="arch"'+(d.archived?' disabled':'')+'>Archive</button>':'')+'</div></div>';
      document.getElementById('dl').onclick=function(){ logAccess(CN.documentById(d.id),'download'); C.toast({ type:'success', title:'Download logged', text:d.title+' — recorded in the access log.' }); if(state.params.get('tab')==='access') renderMain(); };
      var cv=document.getElementById('chvis'); if(cv) cv.onclick=function(){ go('N04',{id:d.id}); };
      var nv=document.getElementById('newver'); if(nv) nv.onclick=function(){ newVersion(d); };
      var ar=document.getElementById('arch'); if(ar) ar.onclick=function(){ archiveDoc(d); };
      main.appendChild(auditNote(d.id));
    }
  };
  function accessRows(d){
    if (!d.access.length) return '<p class="hint">No access recorded yet.</p>';
    return '<div>'+d.access.map(function(a){ return '<div class="axrow'+(a.actor==='External link'?' flag':'')+'"><span class="k '+(a.kind==='download'?'download':'')+'">'+esc(a.kind)+'</span><span class="who">'+esc(a.actor)+'</span><span class="rl">'+(Perm.ROLE_LABEL[a.role]||a.role)+'</span><span class="mt">'+esc(fmt.dhaka(a.whenUtc,true))+'</span></div>'; }).join('')+'</div>';
  }
  function newVersion(d){
    formDialog({ title:'Upload new version', fields:[ { type:'text', key:'v', label:'Version label', required:true, placeholder:'e.g. v'+(parseInt(String(d.version).replace(/\D/g,''),10)+1) }, { type:'text', key:'note', label:'Change note', placeholder:'What changed?' } ], confirmLabel:'Add version' }).then(function(v){
      if(!v) return;
      Perm.requirePermission(state.role,'UPLOAD_DOCUMENT');
      var ov=readOv(); var patch=ov['doc:'+d.id]||{}; patch.version=v.v; patch.versionsAdd=[{ v:v.v, uploadedBy:actor().name, uploadedUtc:root.CRM_NOW, note:v.note||'' }].concat(patch.versionsAdd||[]);
      Ripples.mutate('doc:'+d.id, patch);
      Audit.audit({ actor:actor(), action:'UPLOAD_DOCUMENT_VERSION', target:d.id+' · '+v.v });
      C.toast({ type:'success', title:'New version added', text:d.title+' → '+v.v });
      renderMain();
    });
  }
  function archiveDoc(d){
    C.confirmDialog({ title:'Archive document?', body:'<p>Archive <b>'+esc(d.title)+'</b>? It stays in the repository, marked archived, and its access log is preserved.</p>', danger:true, confirmLabel:'Archive' }).then(function(ok){
      if(!ok) return;
      Perm.requirePermission(state.role,'ARCHIVE_DOCUMENT');
      Ripples.mutate('doc:'+d.id, { archived:true });
      Audit.audit({ actor:actor(), action:'ARCHIVE_DOCUMENT', target:d.id+' · '+d.title });
      C.toast({ type:'warning', title:'Document archived', text:d.title });
      go('N01');
    });
  }

  /* ---------- N03 · Upload document ---------- */
  SCREENS.N03 = { title:'Upload document', perm:'UPLOAD_DOCUMENT',
    render:function(main){
      main.innerHTML = header(this);
      main.insertAdjacentHTML('beforeend','<div class="card"><h3>New controlled document</h3><p class="hint" style="margin-bottom:10px">The panel manages files; it does not edit them (no editor, no OCR, no auto-classification).</p><div class="primaryacts"><button class="btn primary" id="up">Upload…</button><a class="btn" href="'+href('N01')+'">Repository</a></div></div>');
      document.getElementById('up').onclick=function(){
        formDialog({ title:'Upload document', width:520, fields:[
          { type:'text', key:'title', label:'Title', required:true, placeholder:'e.g. Oasis Park — Completion Certificate' },
          { type:'select', key:'category', label:'Category', options:CN.CATEGORIES },
          { type:'select', key:'visibility', label:'Visibility classification', options:CN.VISIBILITIES, value:'Internal' },
          { type:'text', key:'project', label:'Linked project', placeholder:'e.g. Salmon Oasis Park' }
        ], intro:'<div class="evidence" style="margin-bottom:4px">⬆ Choose file (mock)</div>', confirmLabel:'Upload document' }).then(function(v){
          if(!v) return;
          Perm.requirePermission(state.role,'UPLOAD_DOCUMENT');
          Audit.audit({ actor:actor(), action:'UPLOAD_DOCUMENT', target:v.title, changes:{ category:v.category, visibility:v.visibility, project:v.project } });
          C.toast({ type:'success', title:'Document uploaded', text:v.title+' · '+v.visibility });
          go('N01');
        });
      };
    }
  };

  /* ---------- N04 · Change visibility ---------- */
  SCREENS.N04 = { title:'Change visibility', perm:'CHANGE_VISIBILITY',
    render:function(main, P){
      var d = P.get('id') ? CN.documentById(P.get('id')) : CN.allDocuments()[0];
      main.innerHTML = header(this);
      if (!d){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'Document not found' })); return; }
      main.insertAdjacentHTML('beforeend','<div class="card"><h3>'+esc(d.title)+'</h3><dl class="kv"><dt>Current visibility</dt><dd>'+visChip(d.visibility)+'</dd></dl><div class="primaryacts"><button class="btn primary" id="ch">Change visibility…</button></div></div>');
      document.getElementById('ch').onclick=function(){
        formDialog({ title:'Change visibility', intro:'<div class="effectbox">Current <b>'+esc(d.visibility)+'</b></div>',
          fields:[ { type:'select', key:'vis', label:'New classification', options:CN.VISIBILITIES, value:d.visibility },
            { type:'html', html:'<div class="effectbox" id="eff">Changing visibility changes who can open this document server-side.</div>' } ],
          warn:'This changes who can access the document. The change is audited old→new.', confirmLabel:'Apply visibility' }).then(function(v){
          if(!v || v.vis===d.visibility) return;
          Perm.requirePermission(state.role,'CHANGE_VISIBILITY');
          Ripples.mutate('doc:'+d.id, { visibility:v.vis });
          Audit.audit({ actor:actor(), action:'CHANGE_VISIBILITY', target:d.id+' · '+d.title, changes:{ from:d.visibility, to:v.vis } });
          C.toast({ type:'success', title:'Visibility changed', text:d.title+': '+d.visibility+' → '+v.vis });
          go('N02',{id:d.id});
        });
      };
      main.appendChild(auditNote(d.id));
    }
  };

  /* ---------- N05 · Version history ---------- */
  SCREENS.N05 = { title:'Version history', perm:'VIEW_DOCUMENTS',
    render:function(main, P){
      var d = P.get('id') ? CN.documentById(P.get('id')) : CN.allDocuments()[0];
      main.innerHTML = header(this);
      if (!d){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'Document not found' })); return; }
      main.insertAdjacentHTML('beforeend','<div class="card"><h3>'+esc(d.title)+' — versions</h3><p class="hint">Previous versions are viewable/downloadable per permission. Retention policy undefined (OPEN_QUESTIONS #3).</p></div>');
      var tw=C.el('<div></div>'); main.appendChild(tw);
      C.mountDataTable(tw, { rowId:'v', noun:'versions', rows:d.versions, columns:[
        { key:'v', label:'Version', strong:true }, { key:'uploadedBy', label:'Uploaded by' },
        { key:'uploadedUtc', label:'When', render:function(r){ return fmt.dhaka(r.uploadedUtc,true); } }, { key:'note', label:'Note', render:function(r){ return esc(r.note||'—'); } }
      ], rowActions:[ { label:'Download', icon:'⬇', onClick:function(r){ logAccess(d,'download'); C.toast({type:'success',title:'Version downloaded',text:d.title+' '+r.v+' — logged.'}); } } ] });
    }
  };

  /* ---------- N06 · Access log (per document) ---------- */
  SCREENS.N06 = { title:'Document access log', perm:'VIEW_ACCESS_LOG',
    render:function(main, P){
      var d = P.get('id') ? CN.documentById(P.get('id')) : CN.allDocuments()[0];
      main.innerHTML = header(this);
      if (!d){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'Document not found' })); return; }
      main.insertAdjacentHTML('beforeend','<div class="card"><h3>'+esc(d.title)+' — access history</h3><p class="hint">Every view and download, with actor, role and timestamp. Retention undefined (OPEN_QUESTIONS #4).</p>'+accessRows(d)+'</div>');
      main.appendChild(auditNote(d.id));
    }
  };

  /* ===================== O — Support ===================== */
  function ownsTicket(t){ return state.role===Perm.ROLES.SUPER_ADMIN || (t.assignee && t.assignee===actor().name); }

  /* ---------- O01 · Ticket inbox ⭐ ---------- */
  SCREENS.O01 = { title:'Ticket inbox', sub:'Unified queue from both mobile apps · SLA age colouring', perm:'VIEW_TICKETS',
    render:function(main){
      var tickets = CN.allTickets();
      main.innerHTML = header(this);
      var fbWrap=C.el('<div></div>'); main.appendChild(fbWrap);
      var tableWrap=C.el('<div></div>'); main.appendChild(tableWrap);
      C.FilterBar(fbWrap, { id:'o01', filters:[
        { key:'category', label:'Category', options:CN.TICKET_CATEGORIES },
        { key:'status', label:'Status', options:['open','in progress','waiting','resolved','closed'] },
        { key:'source', label:'Source', options:['Client','Partner'] },
        { key:'assignee', label:'Assignee', options:uniq(tickets.map(function(t){return t.assignee;}).filter(Boolean)) }
      ], onChange:draw });
      function filtered(){ var f=C.getFilters('o01'); return tickets.filter(function(t){ if(f.category&&t.category!==f.category)return false; if(f.status&&t.status!==f.status)return false; if(f.source&&t.source!==f.source)return false; if(f.assignee&&t.assignee!==f.assignee)return false; return true; }); }
      function draw(){
        C.mountDataTable(tableWrap, { rowId:'id', selectable:Perm.can(state.role,'ASSIGN_TICKET'), noun:'tickets', defaultSort:'createdUtc', defaultDir:1, rows:filtered(), columns:[
          { key:'id', label:'Ticket', render:function(r){ return '<span class="mono" style="font-size:12px">'+esc(r.id)+'</span>'; } },
          { key:'source', label:'Source', render:function(r){ return '<span class="chip '+(r.source==='Client'?'blue':'violet')+'" style="height:18px"><span class="d"></span>'+esc(r.source)+'</span>'; } },
          { key:'category', label:'Category' },
          { key:'subject', label:'Subject', strong:true },
          { key:'requester', label:'Requester' },
          { key:'assignee', label:'Assigned', render:function(r){ return r.assignee?esc(r.assignee):'<span class="chip amber" style="height:18px"><span class="d"></span>unassigned</span>'; } },
          { key:'status', label:'Status', render:function(r){ return C.StatusChip(statusToken(r.status)); } },
          { key:'createdUtc', label:'Age', align:'right', sortable:true, sortValue:function(r){return r.createdUtc;}, render:function(r){ return (r.status==='closed'||r.status==='resolved')?'<span class="muted">'+ageOf(r.createdUtc)+'</span>':ageChip(r.createdUtc, CN.SLA_HOURS[r.category]||12); } },
          { key:'lastActivityUtc', label:'Last activity', render:function(r){ return fmt.dhaka(r.lastActivityUtc,true); } }
        ], rowActions:[
          { label:'Open', icon:'↗', onClick:function(r){ go('O02',{id:r.id}); } },
          { label:'Assign', icon:'👤', disabled:function(){ return !Perm.can(state.role,'ASSIGN_TICKET'); }, onClick:function(r){ assignTicket(r, draw); } },
          { label:'Close', icon:'✓', disabled:function(r){ return r.status==='closed' || !ownsTicket(r); }, onClick:function(r){ closeTicket(r, draw); } }
        ], bulkActions: Perm.can(state.role,'ASSIGN_TICKET')?[
          { label:'Reassign', cls:'primary', onClick:function(rows){ bulkAssign(rows, draw); } },
          { label:'Mark in progress', onClick:function(rows){ rows.forEach(function(r){ Ripples.mutate('tkt:'+r.id,{status:'in progress'}); Audit.audit({actor:actor(),action:'UPDATE_TICKET_STATUS',target:r.id,changes:{to:'in progress'}}); }); C.toast({type:'success',title:rows.length+' tickets updated'}); draw(); } }
        ]:null, onRowClick:function(r){ go('O02',{id:r.id}); } });
      }
      draw();
    }
  };
  function ageOf(iso){ var d=(new Date(root.CRM_NOW)-new Date(iso))/86400000; return d<1?Math.round(d*24)+'h':Math.floor(d)+'d'; }
  function statusToken(s){ return { 'open':'submitted','in progress':'contacted','waiting':'onHold','resolved':'approved','closed':'closed' }[s]||'grey'; }
  function assignTicket(t, after){
    var staffOpts=Object.keys(CRM.staff).map(function(r){ return { value:CRM.staff[r].name, label:CRM.staff[r].name+' · '+Perm.ROLE_LABEL[r] }; });
    formDialog({ title:'Assign ticket', intro:'<div class="effectbox">'+esc(t.subject)+'</div>', fields:[ { type:'select', key:'assignee', label:'Assign to', options:staffOpts, value:t.assignee||'' } ], confirmLabel:'Assign' }).then(function(v){
      if(!v) return; Perm.requirePermission(state.role,'ASSIGN_TICKET');
      Ripples.mutate('tkt:'+t.id, { assignee:v.assignee, status: t.status==='open'?'in progress':t.status });
      Audit.audit({ actor:actor(), action:'ASSIGN_TICKET', target:t.id, changes:{ from:t.assignee||'unassigned', to:v.assignee } });
      C.toast({ type:'success', title:'Ticket assigned', text:t.id+' → '+v.assignee });
      after && after();
    });
  }
  function bulkAssign(rows, after){
    var staffOpts=Object.keys(CRM.staff).map(function(r){ return { value:CRM.staff[r].name, label:CRM.staff[r].name }; });
    formDialog({ title:'Reassign '+rows.length+' tickets', fields:[ { type:'select', key:'assignee', label:'Assign all to', options:staffOpts } ], confirmLabel:'Reassign' }).then(function(v){
      if(!v) return; Perm.requirePermission(state.role,'ASSIGN_TICKET');
      rows.forEach(function(t){ Ripples.mutate('tkt:'+t.id,{assignee:v.assignee}); Audit.audit({actor:actor(),action:'ASSIGN_TICKET',target:t.id,changes:{to:v.assignee}}); });
      C.toast({ type:'success', title:rows.length+' tickets reassigned', text:'→ '+v.assignee }); after && after();
    });
  }
  function closeTicket(t, after){
    C.confirmDialog({ title:'Close ticket '+t.id+'?', body:'<p>Close <b>'+esc(t.subject)+'</b>? Only the assigned owner or a Super Admin can close.</p>', confirmLabel:'Close ticket' }).then(function(ok){
      if(!ok) return;
      if(!ownsTicket(t)){ C.toast({type:'error',title:'Not permitted',text:'Only the assigned owner or Super Admin can close this.'}); return; }
      Ripples.mutate('tkt:'+t.id, { status:'closed' });
      Audit.audit({ actor:actor(), action:'CLOSE_TICKET', target:t.id, changes:{ from:t.status, to:'closed' } });
      C.toast({ type:'success', title:'Ticket closed', text:t.id }); after && after();
    });
  }

  /* ---------- O02 · Ticket detail ---------- */
  SCREENS.O02 = { title:'Ticket detail', perm:'VIEW_TICKETS',
    render:function(main, P){
      var t = P.get('id') ? CN.ticketById(P.get('id')) : CN.activeTickets()[0];
      main.innerHTML = header(this);
      if (!t){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'Ticket not found', actionLabel:'Inbox' })); wireEmpty(main,'O01'); return; }
      main.insertAdjacentHTML('beforeend',
        '<div class="profband"><div class="top"><div class="photo">'+esc(t.id.slice(0,2))+'</div><div class="who"><h1>'+esc(t.subject)+'</h1><div class="pid">'+esc(t.id)+' · '+esc(t.source)+' · '+esc(t.category)+'</div></div>'+C.StatusChip(statusToken(t.status)).replace('class="chip','class="statuschip chip')+'</div>'+
        '<div class="identity"><span>Requester <b>'+esc(t.requester)+'</b></span><span>Assigned <b>'+esc(t.assignee||'Unassigned')+'</b></span><span>Age <b>'+ageOf(t.createdUtc)+'</b></span><span>SLA <b>'+(CN.SLA_HOURS[t.category]||12)+'h</b></span></div>'+
        '<div class="primaryacts" id="tkacts"></div></div>');
      var host=document.getElementById('tkacts'); var acts=[];
      if (Perm.can(state.role,'ASSIGN_TICKET')) acts.push({ label:'Assign', fn:function(){ assignTicket(t, function(){ location.reload(); }); } });
      if (t.status!=='closed' && ownsTicket(t)) acts.push({ label:'Close', cls:'danger', fn:function(){ closeTicket(t, function(){ location.reload(); }); } });
      acts.push({ label:'Chat handoff', fn:function(){ go('O03',{id:t.id}); } });
      host.innerHTML=acts.map(function(a,i){ return '<button class="btn '+(a.cls||'')+'" data-a="'+i+'">'+esc(a.label)+'</button>'; }).join('');
      host.querySelectorAll('[data-a]').forEach(function(b){ b.onclick=function(){ acts[+b.getAttribute('data-a')].fn(); }; });
      // thread
      var card=C.el('<div class="card"><h3>Conversation</h3></div>'); main.appendChild(card);
      var thread=C.el('<div class="thread"></div>');
      t.thread.forEach(function(m){ var out = m.role!=='Client' && m.role!=='Partner';
        thread.appendChild(C.el('<div class="tmsg '+(out?'out':'')+'"><div class="th"><span class="nm">'+esc(m.who)+'</span><span class="rl">'+esc(m.role)+'</span><span class="mt">'+esc(fmt.dhaka(m.t,true))+'</span></div><div class="tx">'+esc(m.text)+'</div></div>'));
      });
      card.appendChild(thread);
      // reply — assigned owner + SA only
      var canReply = state.role===Perm.ROLES.SUPER_ADMIN || ownsTicket(t);
      if (t.status!=='closed'){
        if (canReply){
          card.insertAdjacentHTML('beforeend','<div class="replybox"><textarea id="reply" placeholder="Reply to '+esc(t.requester)+'…"></textarea><button class="btn primary" id="send">Send</button></div>');
          card.querySelector('#send').onclick=function(){ var txt=card.querySelector('#reply').value.trim(); if(!txt){ C.toast({type:'warning',title:'Empty reply'}); return; }
            Ripples.mutate('tkt:'+t.id, { threadAdd:[{ who:actor().name, role:Perm.ROLE_LABEL[state.role], text:txt, t:root.CRM_NOW }].concat((readOv()['tkt:'+t.id]||{}).threadAdd||[]), status:'in progress', lastActivityUtc:root.CRM_NOW });
            Audit.audit({ actor:actor(), action:'REPLY_TICKET', target:t.id }); C.toast({ type:'success', title:'Reply sent', text:t.requester+' notified.' }); location.reload(); };
        } else { card.insertAdjacentHTML('beforeend','<p class="hint" style="margin-top:8px">Only the assigned owner ('+esc(t.assignee||'unassigned')+') or a Super Admin can reply. Assign it to yourself first.</p>'); }
      }
      main.appendChild(auditNote(t.id));
    }
  };

  /* ---------- O03 · Chat handoff ---------- */
  SCREENS.O03 = { title:'Chat handoff', sub:'Hand off to the external chat console', perm:'VIEW_TICKETS',
    render:function(main, P){
      var t = P.get('id') ? CN.ticketById(P.get('id')) : null;
      main.innerHTML = header(this);
      main.insertAdjacentHTML('beforeend','<div class="card"><h3>Chat provider</h3><p class="hint" style="margin-bottom:10px">No chat SDK is integrated in the prototype. The provider is undefined — WhatsApp Business API or an in-app provider console (OPEN_QUESTIONS #6, blocks mobile screen 58).</p>'+
        '<div class="primaryacts"><button class="btn primary" id="wa">Open WhatsApp Business console ↗</button><button class="btn" id="inapp">In-app chat console ↗</button></div>'+
        (t?'<p class="metaline" style="margin-top:12px">Context: '+esc(t.id)+' · '+esc(t.requester)+' — '+esc(t.subject)+'</p>':'')+'</div>');
      document.getElementById('wa').onclick=function(){ C.toast({type:'info',title:'WhatsApp Business',text:'Would open the external WhatsApp Business console (placeholder link).'}); };
      document.getElementById('inapp').onclick=function(){ C.toast({type:'info',title:'In-app chat',text:'Would open the in-app provider console (placeholder).'}); };
    }
  };

  /* ===================== P — Notices ===================== */

  /* ---------- P01 · Notices list ---------- */
  SCREENS.P01 = { title:'Notices', sub:'Broadcast messages to partners', perm:'MANAGE_NOTICES',
    render:function(main){
      main.innerHTML = C.PageHeader({ title:this.title, sub:this.sub, actions:[{ id:'new', label:'Compose notice', cls:'primary', icon:'✎' }] });
      main.insertAdjacentHTML('afterbegin', p7nav('P'));
      main.querySelector('[data-act="new"]').onclick=function(){ go('P02'); };
      var tw=C.el('<div></div>'); main.appendChild(tw);
      C.mountDataTable(tw, { rowId:'id', noun:'notices', defaultSort:'id', rows:CN.allNotices(), columns:[
        { key:'title', label:'Notice', strong:true },
        { key:'target', label:'Audience', render:function(r){ return esc(targetLabel(r.target)); } },
        { key:'audience', label:'Reach', align:'right', render:function(r){ return r.audience; } },
        { key:'status', label:'Status', render:function(r){ return C.StatusChip(r.status==='published'?'published':r.status==='scheduled'?'pending':'draft'); } },
        { key:'when', label:'When', render:function(r){ return r.publishedUtc?fmt.dhaka(r.publishedUtc):r.scheduledUtc?'⏲ '+fmt.dhaka(r.scheduledUtc,true):'—'; } }
      ], rowActions:[ { label:'Open', icon:'↗', onClick:function(r){ go('P03',{id:r.id}); } } ], onRowClick:function(r){ go('P03',{id:r.id}); } });
    }
  };
  function targetLabel(t){ if(t.scope) return t.scope; var parts=[]; if(t.team)parts.push('Team '+t.team); if(t.territory)parts.push(t.territory); if(t.rank)parts.push(t.rank+' rank'); if(t.program)parts.push(t.program); return parts.join(' · ')||'—'; }

  /* ---------- P02 · Compose notice ---------- */
  SCREENS.P02 = { title:'Compose notice', sub:'Targeting · schedule · preview', perm:'MANAGE_NOTICES',
    render:function(main){
      main.innerHTML = header(this);
      main.insertAdjacentHTML('beforeend','<div class="composegrid"><div id="cform"></div><div id="cside"></div></div>');
      var form=document.getElementById('cform'), side=document.getElementById('cside');
      form.innerHTML =
        '<div class="card"><h3>Message</h3>'+
        '<div class="field"><label>Title</label><input type="text" id="ntitle" placeholder="e.g. Q3 incentive announcement"></div>'+
        '<div class="field"><label>Body</label><textarea id="nbody" placeholder="Write the notice…"></textarea></div></div>'+
        '<div class="card"><h3>Targeting</h3><p class="hint" style="margin-bottom:8px">Confirmed set: team · territory · rank · program (OPEN_QUESTIONS #7).</p>'+
        '<div class="split2"><div class="field"><label>Territory</label><select id="tterr"><option value="">Any</option><option>Chattogram › Cumilla</option><option>Dhaka › Savar</option><option>Sylhet › Sadar</option></select></div>'+
        '<div class="field"><label>Team</label><select id="tteam"><option value="">Any</option><option>Cumilla Sadar Alpha</option><option>Savar Metro</option><option>Sylhet Sadar Team</option></select></div>'+
        '<div class="field"><label>Rank</label><select id="trank"><option value="">Any</option><option>Silver</option><option>Gold</option><option>Platinum</option></select></div>'+
        '<div class="field"><label>Program</label><select id="tprog"><option value="">Any</option><option>Zero Investment</option><option>With Investment</option></select></div></div></div>'+
        '<div class="card"><h3>Schedule</h3><div class="split2"><div class="field"><label>When (OPEN_QUESTIONS #8)</label><select id="tsched"><option value="now">Send now</option><option value="later">Schedule for later</option></select></div><div class="field"><label>Scheduled time</label><input type="datetime-local" id="ttime" value="2026-07-16T10:00"></div></div>'+
        '<div class="primaryacts"><button class="btn primary" id="publish"'+(Perm.can(state.role,'PUBLISH_NOTICE')?'':' disabled title="Publishing is Super-Admin only"')+'>Publish notice</button><button class="btn" id="draft">Save draft</button></div>'+
        (Perm.can(state.role,'PUBLISH_NOTICE')?'':'<p class="hint" style="margin-top:8px">You can compose and save drafts; publishing is Super-Admin only (PUBLISH_NOTICE).</p>')+'</div>';
      function audience(){ var terr=val('tterr'), team=val('tteam'), rank=val('trank'), prog=val('tprog'); return computeAudience({territory:terr,team:team,rank:rank,program:prog}); }
      function refresh(){ var a=audience(); side.innerHTML='<div class="audiencebox"><div class="big">'+a.count+'</div><div class="lb">'+esc(a.label)+'</div></div>'+
        '<div class="noticepreview"><div class="np-h">'+esc(val('ntitle')||'Notice title')+'</div><div class="np-b">'+esc(val('nbody')||'Notice body preview…')+'</div><div class="np-t">'+esc(a.label)+'</div></div>'; }
      ['tterr','tteam','trank','tprog','ntitle','nbody'].forEach(function(id){ var e=document.getElementById(id); e.addEventListener('input',refresh); e.addEventListener('change',refresh); });
      refresh();
      function val(id){ return (document.getElementById(id)||{}).value||''; }
      function submit(publish){
        var title=val('ntitle'); if(!title){ C.toast({type:'warning',title:'Add a title'}); return; }
        var a=audience(); var sched=val('tsched');
        if (publish){
          Perm.requirePermission(state.role,'PUBLISH_NOTICE');
          Audit.audit({ actor:actor(), action:'PUBLISH_NOTICE', target:title, changes:{ audience:a.count, target:a.label, schedule:sched } });
          Ripples.emit({ kind:'partner', screen:'Notice board', headline:'Notice “'+title+'” '+(sched==='later'?'scheduled':'published')+' to '+a.count+' partners — '+a.label });
          C.toast({ type:'success', persist:true, title: sched==='later'?'Notice scheduled':'Notice published', text:'"'+title+'"', ripple:'Sent to '+a.count+' partners'+(a.label!=='All partners'?' · '+a.label:'') });
          go('P01');
        } else {
          Audit.audit({ actor:actor(), action:'SAVE_NOTICE_DRAFT', target:title });
          C.toast({ type:'info', title:'Draft saved', text:'"'+title+'"' }); go('P01');
        }
      }
      document.getElementById('publish').onclick=function(){ submit(true); };
      document.getElementById('draft').onclick=function(){ submit(false); };
    }
  };
  function computeAudience(t){
    var label = targetLabel(t); if(label==='—') label='All partners';
    var partners = (root.CRM.People && root.CRM.People.allPartners) ? root.CRM.People.allPartners().filter(function(p){return p.status!=='rejected';}) : [];
    if (!partners.length) return { count:128, label:label };
    var f = partners.filter(function(p){
      if (t.territory && (root.CRM.People.pathStr(p.territoryPath).indexOf(t.territory.split(' › ').pop())<0)) return false;
      if (t.team && root.CRM.People.teamName(p.team)!==t.team) return false;
      if (t.rank && p.rank!==t.rank) return false;
      if (t.program && (p.programs||[]).indexOf(t.program)<0) return false;
      return true;
    });
    return { count:f.length, label:label };
  }

  /* ---------- P03 · Notice detail ---------- */
  SCREENS.P03 = { title:'Notice detail', perm:'MANAGE_NOTICES',
    render:function(main, P){
      var n = P.get('id') ? CN.noticeById(P.get('id')) : CN.allNotices()[0];
      main.innerHTML = header(this);
      if (!n){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'Notice not found', actionLabel:'Notices' })); wireEmpty(main,'P01'); return; }
      main.insertAdjacentHTML('beforeend','<div class="split2"><div class="card"><h3>'+esc(n.title)+'</h3><p class="hint" style="margin-bottom:10px">'+esc(n.body)+'</p><dl class="kv"><dt>Audience</dt><dd>'+esc(targetLabel(n.target))+'</dd><dt>Reach</dt><dd>'+n.audience+' partners</dd><dt>Status</dt><dd>'+C.StatusChip(n.status==='published'?'published':n.status==='scheduled'?'pending':'draft')+'</dd>'+(n.publishedUtc?'<dt>Published</dt><dd>'+fmt.dhaka(n.publishedUtc,true)+'</dd>':n.scheduledUtc?'<dt>Scheduled</dt><dd>'+fmt.dhaka(n.scheduledUtc,true)+'</dd>':'')+'</dl></div>'+
        '<div class="card"><h3>Engagement</h3>'+C.metricsRow([{label:'Delivered',value:n.engagement.delivered},{label:'Read',value:n.engagement.read},{label:'Read rate',value:(n.engagement.delivered?Math.round(n.engagement.read/n.engagement.delivered*100):0)+'%'}]).replace('grid-template-columns:repeat(4,1fr)','')+'</div></div>');
      main.appendChild(auditNote(n.id));
    }
  };

  /* ===================== Q — Reporting ===================== */

  /* ---------- Q01 · Reports hub ---------- */
  SCREENS.Q01 = { title:'Reports', sub:'A fixed menu of report types — no custom builder', perm:'VIEW_REPORT',
    render:function(main){
      main.innerHTML = header(this);
      main.insertAdjacentHTML('beforeend','<div class="primaryacts" style="margin-bottom:12px"><a class="btn primary" href="'+href('Q04')+'">◱ Metrics overview</a><a class="btn" href="'+href('Q03')+'">Export queue / history</a></div>');
      var grid=C.el('<div class="reporthub"></div>'); main.appendChild(grid);
      CN.reports.forEach(function(r){
        var card=C.el('<div class="rcard"><div class="rt">'+esc(r.name)+'</div><div class="rd">'+esc(r.desc)+'</div><div class="rf">'+(r.exportable?'<span class="exportbadge">CSV exportable</span>':'<span class="sensitivebadge">🔒 View only · sensitive</span>')+'</div></div>');
        card.onclick=function(){ go('Q02',{r:r.key}); };
        grid.appendChild(card);
      });
      main.insertAdjacentHTML('beforeend','<p class="metaline" style="margin-top:14px">Which reports are non-sensitive/CSV-exportable is a client decision (OPEN_QUESTIONS #1). The mechanism — an <span class="mono">exportable</span> flag gating the Export button — exists.</p>');
      main.insertAdjacentHTML('beforeend','<div class="primaryacts"><a class="btn" href="'+href('Q03')+'">Export queue / history</a></div>');
    }
  };

  /* ---------- Q02 · Report viewer ⭐ (export gated by exportable) ---------- */
  SCREENS.Q02 = { title:'Report viewer', perm:'VIEW_REPORT',
    render:function(main, P){
      var r = P.get('r') ? CN.reportByKey(P.get('r')) : CN.reports[0];
      main.innerHTML = header(this);
      if (!r){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'Report not found', actionLabel:'Reports hub' })); wireEmpty(main,'Q01'); return; }
      var canExport = r.exportable && Perm.can(state.role,'EXPORT_REPORT');
      main.insertAdjacentHTML('beforeend', C.PageHeader({ title:r.name, sub:r.desc, actions: canExport?[{ id:'exp', label:'Export CSV', cls:'primary', icon:'⭳' }]:[] }));
      if (!r.exportable) main.insertAdjacentHTML('beforeend','<p class="metaline"><span class="sensitivebadge">🔒 Sensitive — view only</span> · the Export button is hidden for this report (would compromise a real person if it left the org).</p>');
      else if (!Perm.can(state.role,'EXPORT_REPORT')) main.insertAdjacentHTML('beforeend','<p class="metaline">This report is exportable, but your role lacks <span class="mono">EXPORT_REPORT</span>.</p>');
      // Role scope banner (6.17.5) — the same report tells a different truth per role.
      var scope = RPT.scopeFor(state.role);
      main.insertAdjacentHTML('beforeend','<p class="metaline">Showing: <b>'+esc(scope.label)+'</b> — switch role (top-right) to see the same report re-scoped.</p>');
      // filters — the full clause-6.17.2 set, options driven by live data
      var opt = RPT.filterOptions();
      var fbWrap=C.el('<div></div>'); main.appendChild(fbWrap);
      var chartWrap=C.el('<div></div>'); // placeholder anchors so redraw can target them
      var tableWrap=C.el('<div></div>');
      function draw(){
        var filters = C.getFilters('q02_'+r.key) || {};
        var data = RPT.reportData(r.key, { role:state.role, filters:filters });
        // chart — one chart, type chosen per report, via the shared helper
        if (data.chart){ root.ReportChart.render(chartWrap, data.chart); } else { chartWrap.innerHTML=''; }
        // table
        var cols = data.columns.map(function(c,i){ return { key:'c'+i, label:c, align: (i>0 && !isNaN(parseInt(String((data.rows[0]||[])[i]).replace(/[^\d]/g,''),10)) )?'right':'' }; });
        var rows = data.rows.map(function(row,ri){ var o={ _id:'r'+ri }; row.forEach(function(v,i){ o['c'+i]=v; }); return o; });
        tableWrap.innerHTML='';
        if (data.note) tableWrap.insertAdjacentHTML('beforeend','<p class="metaline">'+esc(data.note)+'</p>');
        C.mountDataTable(tableWrap, { rowId:'_id', noun:'rows', rows:rows, columns:cols.map(function(c){ return { key:c.key, label:c.label, align:c.align, render:function(r){ return esc(r[c.key]); } }; }) });
        var eb=main.querySelector('[data-act="exp"]'); if(eb) eb.onclick=function(){ exportCsv(r, data); };
        return data;
      }
      C.FilterBar(fbWrap, { id:'q02_'+r.key, filters:[
        { key:'from', label:'From', type:'date' }, { key:'to', label:'To', type:'date' },
        { key:'project', label:'Project', options:opt.project },
        { key:'inventoryStatus', label:'Inventory status', options:opt.inventoryStatus },
        { key:'program', label:'Program', options:opt.program },
        { key:'territory', label:'Territory', options:opt.territory },
        { key:'team', label:'Team', options:opt.team },
        { key:'teamLead', label:'Team lead?', options:opt.teamLead },
        { key:'rank', label:'Rank', options:opt.rank },
        { key:'status', label:'Status', options:opt.status }
      ], onChange:function(){ draw(); } });
      main.appendChild(chartWrap);
      main.appendChild(tableWrap);
      draw();
      main.appendChild(auditNote('report:'+r.key));
    }
  };
  function exportCsv(r, data){
    Perm.requirePermission(state.role,'EXPORT_REPORT');
    if (!r.exportable){ C.toast({type:'error',title:'Not exportable',text:'This report is view-only.'}); return; }
    var filters = C.getFilters('q02_'+r.key) || {};
    var filterStr = Object.keys(filters).filter(function(k){return filters[k];}).map(function(k){return k+'='+filters[k];}).join('; ') || 'none';
    var csv = [data.columns.join(',')].concat(data.rows.map(function(row){ return row.map(function(c){ return '"'+String(c).replace(/"/g,'""')+'"'; }).join(','); })).join('\n');
    // real download (works in a browser; harmless if it throws in a headless env)
    try { var blob=new Blob([csv],{type:'text/csv'}); var url=URL.createObjectURL(blob); var a=document.createElement('a'); a.href=url; a.download=r.key+'.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); } catch(e){}
    var exp = { id:'EXP-'+String(100+CN.exportHistory().length+1), report:r.name, key:r.key, filters:filterStr, rows:data.rows.length, by:actor().name, t:root.CRM_NOW };
    var full=readOv(); full['exportLog']=[exp].concat(full['exportLog']||[]); try{ localStorage.setItem('crm_people_mut', JSON.stringify(full)); }catch(e){}
    Audit.audit({ actor:actor(), action:'EXPORT_REPORT', target:r.name, changes:{ filters:filterStr, rows:data.rows.length } });
    C.toast({ type:'success', persist:true, title:'CSV exported — '+r.name, text:data.rows.length+' rows · filters: '+filterStr, ripple:null });
  }

  /* ---------- Q03 · Export queue ---------- */
  SCREENS.Q03 = { title:'Export queue', sub:'CSV generation history · every export is audited with its filters', perm:'VIEW_REPORT',
    render:function(main){
      var hist = CN.exportHistory();
      main.innerHTML = header(this);
      if (!hist.length){ main.insertAdjacentHTML('beforeend', C.EmptyState({ icon:'⭳', title:'No exports yet', text:'Export an exportable report (Q02) to see it here.', actionLabel:'Reports hub' })); wireEmpty(main,'Q01'); return; }
      var tw=C.el('<div></div>'); main.appendChild(tw);
      C.mountDataTable(tw, { rowId:'id', noun:'exports', rows:hist, columns:[
        { key:'id', label:'Export', strong:true, render:function(r){ return '<span class="mono">'+esc(r.id)+'</span>'; } },
        { key:'report', label:'Report' }, { key:'rows', label:'Rows', align:'right' },
        { key:'filters', label:'Filters used', render:function(r){ return '<span class="mono" style="font-size:11px">'+esc(r.filters)+'</span>'; } },
        { key:'by', label:'By' }, { key:'t', label:'When', render:function(r){ return fmt.dhaka(r.t,true); } }
      ], rowActions:[ { label:'Download CSV', icon:'⬇', onClick:function(r){ var d=RPT.reportData(r.key, { role:state.role, filters:{} }); exportCsv(CN.reportByKey(r.key), d); } } ] });
      main.insertAdjacentHTML('beforeend','<p class="metaline" style="margin-top:12px">Filters are recorded so a future auditor can reproduce the exact data pull.</p>');
    }
  };

  /* ---------- Q04 · Metrics overview ⭐ (Req 6.17.1 — grouped, role-scoped) ---------- */
  SCREENS.Q04 = { title:'Metrics overview', sub:'Summary metrics grouped by domain — scoped to your role', perm:'VIEW_REPORT',
    render:function(main){
      main.innerHTML = header(this);
      var m = RPT.metricsFor(state.role);
      main.insertAdjacentHTML('beforeend','<p class="metaline">Showing: <b>'+esc(m.scopeLabel)+'</b> — switch role (top-right) to re-scope every number. Trend deltas are shown only where a period figure is derivable (OPEN_QUESTIONS 6.17 #4).</p>');
      m.groups.forEach(function(g){
        main.insertAdjacentHTML('beforeend','<div class="metricgroup"><span class="mg-t">'+esc(g.title)+'</span></div>');
        main.insertAdjacentHTML('beforeend', C.metricsRow(g.metrics.map(function(x){
          return { label: x.label + (x.sub?'  ·  '+x.sub:''), value: x.value, delta: x.delta, deltaDir: x.deltaDir };
        })));
      });
      main.insertAdjacentHTML('beforeend','<div class="primaryacts" style="margin-top:14px"><a class="btn" href="'+href('Q01')+'">All reports</a></div>');
    }
  };

  /* ===================== boot ===================== */
  function boot(screenId){ state.screen=screenId; state.params=new URLSearchParams(location.search); Audit.seed(CRM.auditSeed); mountShell(); renderMain(); }
  root.Connect = { boot: boot, rerender: renderMain, SCREENS: SCREENS, go: go, href: href };
})(window);
