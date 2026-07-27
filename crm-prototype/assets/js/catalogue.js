/* ============================================================================
 * Salmon CRM — Catalogue & Inventory engine (Part 3)
 * ----------------------------------------------------------------------------
 * Each screens/E0*.html bootstraps Catalogue.boot('E01'). Mounts the Part-1
 * shell (same classes, same Router / DevToolbar / C.* components), gates entry
 * by permission, and renders the requested screen. Every mutation emits
 * Audit.audit(); publish + construction + unit-status + media changes emit a
 * Ripples.emit() (mobile ripple) and a Toast that names the phone-side effect.
 * ==========================================================================*/
(function (root) {
  'use strict';
  var C = root.C, Perm = root.Perm, Audit = root.Audit, CRM = root.CRM, Router = root.Router,
      DevToolbar = root.DevToolbar, Cat = root.CRM.Catalogue, Ripples = root.Ripples,
      SC = root.SalmonCategories;

  root.CRM_NOW = '2026-07-15T10:00:00Z';
  var esc = C.esc, fmt = C.fmt;

  var state = {
    role: localStorage.getItem('crm_role') || Perm.ROLES.SUPER_ADMIN,
    render: 'data', screen: null, params: null
  };
  function actor(){ return CRM.staff[state.role]; }
  function setRole(r){ state.role = r; localStorage.setItem('crm_role', r); }

  var FILES = {
    E01:'E01-projects-list.html', E02:'E02-project-overview.html', E03:'E03-project-units.html',
    E04:'E04-project-media.html', E05:'E05-construction-updates.html', E06:'E06-create-project.html',
    E07:'E07-publish-project.html', E08:'E08-unit-detail.html',
    E09:'E09-category-config.html'
  };
  function href(id, params){
    var f = FILES[id]; if (!f) return '#';
    if (!params) return f;
    var qs = Object.keys(params).filter(function(k){ return params[k]!=null && params[k]!==''; })
      .map(function(k){ return k+'='+encodeURIComponent(params[k]); }).join('&');
    return qs ? f+'?'+qs : f;
  }
  function go(id, params){ location.href = href(id, params); }

  /* ===================== shell (imports Part-1 chrome) ===================== */
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
    var sc = SCREENS[state.screen] || { title:'Catalogue' };
    var s = actor();
    var PROJECT_SCOPED = { E02:1,E03:1,E04:1,E05:1,E07:1,E08:1 };
    var pid = (PROJECT_SCOPED[state.screen] && state.params) ? state.params.get('id') : null;
    var proj = pid ? Cat.projectById(pid) : null;
    var crumbTail = proj ? '<a href="'+href('E02',{id:proj.id})+'">'+esc(proj.name)+'</a><span class="sep">›</span><span class="cur">'+esc(sc.title)+'</span>'
                         : '<span class="cur">'+esc(sc.title)+'</span>';
    tb.innerHTML =
      '<div class="breadcrumb"><a href="../index.html#/dashboard">Salmon</a><span class="sep">›</span>' +
      '<a href="'+href('E01')+'">Catalogue</a><span class="sep">›</span>'+crumbTail+'</div><span class="spacer"></span>' +
      '<button class="searchbtn" id="searchbtn">🔎 <span>Search…</span><kbd>⌘K</kbd></button>' +
      '<span id="devmount"></span>' +
      '<button class="icobtn" id="bell">🔔</button>' +
      '<div class="user"><span class="avatar">'+esc(s.initials)+'</span><span class="who"><span class="nm">'+esc(s.name)+'</span><span class="rl">'+Perm.ROLE_LABEL[state.role]+'</span></span></div>';
    document.getElementById('devmount').appendChild(DevToolbar.render({
      role: state.role, state: state.render,
      onRole: function(r){ setRole(r); renderTopbar(); renderSidebar(); renderFooter(); renderMain(); },
      onState: function(st){ state.render = st; renderMain(); },
      onReset: function(){ Ripples.reset(); C.toast({ type:'info', title:'Mock data reset', text:'Catalogue and mobile ripples restored to seed.' }); renderMain(); }
    }));
    document.getElementById('searchbtn').onclick = function(){ location.href = '../index.html#/dashboard'; };
    document.getElementById('bell').onclick = function(){ C.toast({ type:'info', title:'Notifications', text:'The notification centre lives on the console home (Part 1).' }); };
  }
  function renderSidebar(){
    var sb = document.getElementById('sidebar'); if (!sb) return;
    var groups = Router.getSidebarFor(state.role);
    sb.innerHTML = groups.map(function(g){
      return '<div class="navgroup"><div class="gl">'+esc(g.title)+'</div>'+g.items.map(function(it){
        var active = it.id === 'catalogue';
        var MODMAP = { catalogue:href('E01'), people:'B02-approval-queue.html', pipeline:'F01-leads-list.html', finance:'I01-webhook-queue.html' };
        var route = MODMAP[it.id] || ('../index.html'+it.route);
        return '<a class="navitem'+(active?' active':'')+'" href="'+route+'"><span class="ic">'+it.icon+'</span><span class="lb">'+esc(it.label)+'</span>'+(it.count?'<span class="count">'+it.count+'</span>':'')+'</a>';
      }).join('')+'</div>';
    }).join('');
  }
  function renderFooter(){
    var ft = document.getElementById('footer'); if (!ft) return;
    var s = actor();
    ft.innerHTML = '<b style="color:var(--ink-2)">'+esc(s.name)+'</b> · '+Perm.ROLE_LABEL[state.role]+' · '+esc(s.office)+'<span class="spacer" style="flex:1"></span><span>Salmon Admin · Catalogue & Inventory (Part 3)</span>';
  }
  function ensureRippleFab(){
    if (document.getElementById('ripplefab')) { updateFab(); return; }
    var b = document.createElement('button');
    b.id = 'ripplefab'; b.className = 'ripplefab';
    b.innerHTML = '📱 Mobile ripples <span class="rc" id="ripplecount">0</span>';
    b.onclick = function(){ Ripples.toggleConsole(); };
    document.body.appendChild(b);
    document.addEventListener('ripple', updateFab); updateFab();
  }
  function updateFab(){ var c = document.getElementById('ripplecount'); if (c) c.textContent = Ripples.feed().length; }

  /* ===================== main render (gate + dev states) ===================== */
  function renderMain(){
    renderTopbar();
    var main = document.getElementById('main'); if (!main) return;
    var sc = SCREENS[state.screen];
    if (!sc){ main.innerHTML = C.PageHeader({ title:'Unknown screen' }); return; }
    if (sc.perm && !Perm.can(state.role, sc.perm)){
      Audit.audit({ actor: actor(), action:'ACCESS_DENIED', target:'Catalogue · '+sc.title });
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
      '<button class="btn primary" id="back-cat" style="width:auto;margin:4px auto 0">Back to Catalogue</button></div></div>';
  }
  function wireDenied(main){ var b = main.querySelector('#back-cat'); if (b) b.onclick = function(){ go('E01'); }; }
  function skeleton(){ var rows = Array(6).fill(0).map(function(){ return '<div class="sk" style="height:34px;margin:6px 0"></div>'; }).join(''); return '<div class="tablewrap" style="padding:10px">'+rows+'</div>'; }
  function statePanel(kind){
    if (kind === 'offline') return C.EmptyState({ icon:'⚠', title:'You’re offline', text:'We can’t reach the Salmon servers. Reconnect to load the catalogue.' });
    return C.EmptyState({ icon:'⚠', title:'Something went wrong', text:'This view failed to load. Retry, and if it persists the on-call engineer is paged automatically.' });
  }

  /* ===================== shared formDialog (ConfirmDialog + fields) ===================== */
  function formDialog(cfg){
    return new Promise(function(resolve){
      var fieldsHtml = (cfg.fields||[]).map(function(f){
        if (f.type === 'html') return f.html;
        var lab = '<label>'+esc(f.label)+(f.required?' <span class="req">*</span>':'')+'</label>';
        if (f.type === 'textarea') return '<div class="field'+(f.full?' full':'')+'">'+lab+'<textarea data-fk="'+f.key+'" maxlength="'+(f.max||400)+'" placeholder="'+esc(f.placeholder||'')+'">'+esc(f.value||'')+'</textarea></div>';
        if (f.type === 'select') return '<div class="field'+(f.full?' full':'')+'">'+lab+'<select data-fk="'+f.key+'">'+f.options.map(function(o){ var val=o.value!=null?o.value:o, txt=o.label!=null?o.label:o; return '<option value="'+esc(val)+'"'+(String(f.value)===String(val)?' selected':'')+'>'+esc(txt)+'</option>'; }).join('')+'</select></div>';
        if (f.type === 'date') return '<div class="field'+(f.full?' full':'')+'">'+lab+'<input type="date" data-fk="'+f.key+'" value="'+esc(f.value||'')+'"></div>';
        return '<div class="field'+(f.full?' full':'')+'">'+lab+'<input type="text" data-fk="'+f.key+'" value="'+esc(f.value||'')+'" placeholder="'+esc(f.placeholder||'')+'"></div>';
      }).join('');
      var body = cfg.grid ? '<div class="formgrid">'+fieldsHtml+'</div>' : fieldsHtml;
      var scrim = C.el('<div class="modalscrim"><div class="modal" style="width:'+(cfg.width||480)+'px"><div class="mh"><h3>'+esc(cfg.title)+'</h3></div>'+
        '<div class="mb">'+(cfg.intro||'')+body+(cfg.mobileNote?'<div class="mobilenote">📱 '+cfg.mobileNote+'</div>':'')+'</div>'+
        (cfg.warn?'<div class="warn">⚠ '+esc(cfg.warn)+'</div>':'')+
        '<div class="mf"><button class="btn" data-x>Cancel</button><button class="btn '+(cfg.danger?'danger':'primary')+'" data-ok>'+esc(cfg.confirmLabel||'Confirm')+'</button></div></div></div>');
      function collect(){ var out={}; scrim.querySelectorAll('[data-fk]').forEach(function(i){ out[i.getAttribute('data-fk')]=i.value.trim(); }); return out; }
      function close(v){ scrim.remove(); document.removeEventListener('keydown', key); resolve(v); }
      function key(e){ if (e.key==='Escape') close(null); }
      scrim.addEventListener('click', function(e){ if (e.target===scrim) close(null); });
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

  /* ===================== chips / helpers ===================== */
  function unitChip(status){ var m={ available:['green','Available'], reserved:['amber','Reserved'], booked:['blue','Booked'], sold:['grey','Sold'] }[status] || ['grey',status]; return '<span class="chip '+m[0]+'"><span class="d"></span>'+m[1]+'</span>'; }
  function statusChip(status){
    if (status==='published') return '<span class="chip green"><span class="d"></span>Published</span>';
    if (status==='unpublished') return '<span class="chip amber"><span class="d"></span>Unpublished</span>';
    return '<span class="chip grey"><span class="d"></span>Draft</span>';
  }
  function initials(name){ return name.replace(/^(The|Salmon)\s+/i,'').split(' ').map(function(w){return w[0];}).slice(0,2).join('').toUpperCase(); }
  // 6.5.2 — summary, civic amenities, contact, visit info, map coordinates.
  function projectDetailBlock(p){
    var coords = p.coordinates && p.coordinates.lat ? (p.coordinates.lat+', '+p.coordinates.lng) : '<span class="hint">[coordinates required]</span>';
    var amen = (p.civicAmenities&&p.civicAmenities.length) ? p.civicAmenities.map(function(a){ return '<span class="chip grey" style="margin:2px 4px 2px 0">'+esc(a)+'</span>'; }).join('') : '<span class="hint">[CLIENT COPY REQUIRED]</span>';
    var c = p.contact||{};
    return '<div class="sectitle">Project detail</div>'+
      '<div class="detailblock">'+
        '<div class="drow"><div class="dl">Summary</div><div class="dv">'+esc(p.summary||'[CLIENT COPY REQUIRED]')+'</div></div>'+
        '<div class="drow"><div class="dl">Civic amenities</div><div class="dv">'+amen+'</div></div>'+
        '<div class="drow"><div class="dl">Contact</div><div class="dv">'+esc(c.name||'—')+(c.phone?' · '+esc(c.phone):'')+(c.email?' · '+esc(c.email):'')+'</div></div>'+
        '<div class="drow"><div class="dl">Visit information</div><div class="dv">'+esc(p.visitInfo||'[CLIENT COPY REQUIRED]')+'</div></div>'+
        '<div class="drow"><div class="dl">Map coordinates</div><div class="dv">'+coords+'</div></div>'+
      '</div>';
  }
  function unitSummary(p){
    var c = Cat.unitCounts(p);
    return '<div class="unitsummary">'+['available','reserved','booked','sold'].map(function(k){
      return '<span class="ustat '+k+'"><span class="n">'+c[k]+'</span> '+k+'</span>';
    }).join('')+'<span class="ustat" style="color:var(--ink-3)"><span class="n">'+c.total+'</span> total</span></div>';
  }
  function mediaIcon(type){ return { photo:'🖼', video:'▶', '360':'🌐', floorplan:'▦', brochure:'📄' }[type] || '📎'; }
  function typeClass(type){ return type==='360' ? 'n360' : type; }

  function auditNote(pid){
    var n = C.el(C.AuditNote({ actor:actor().name, when:root.CRM_NOW }));
    n.querySelector('.lk').onclick = function(){ C.toast({ type:'info', title:'Audit slice', text:'Opens the audit log filtered to '+(pid||'this project')+' (Super Admin · Part 7).' }); };
    return n;
  }

  /* ===================== project band + tabs ===================== */
  function projectBand(p){
    var c = Cat.unitCounts(p);
    return '<div class="profband"><div class="top">'+
      '<div class="photo">'+esc(initials(p.name))+'</div>'+
      '<div class="who"><h1>'+esc(p.name)+'</h1><div class="pid">'+esc(p.location)+'</div></div>'+
      statusChip(p.status).replace('class="chip','class="statuschip chip')+'</div>'+
      '<div class="identity"><span>Type <b>'+esc(p.glance.buildingType)+'</b></span><span>Floors <b>'+esc(p.glance.floors)+'</b></span><span>From <b>'+fmt.bdt(p.priceFromBdt)+'</b></span><span>Handover <b>'+esc(p.handover)+'</b></span><span><b>'+c.available+'</b> of '+c.total+' available</span></div>'+
      unitSummary(p)+
      '<div class="primaryacts" id="bandacts"></div></div>';
  }
  function wireBand(p){
    var host = document.getElementById('bandacts'); if (!host) return;
    var acts = [];
    if (p.status==='draft') acts.push({ label:'Publish project', cls:'primary', perm:'PUBLISH_PROJECT', fn:function(){ go('E07',{id:p.id}); } });
    else acts.push({ label:'Unpublish', cls:'', perm:'PUBLISH_PROJECT', fn:function(){ go('E07',{id:p.id}); } });
    acts.push({ label:'Add construction update', cls:p.status==='draft'?'primary':'', perm:'POST_CONSTRUCTION', fn:function(){ go('E05',{id:p.id}); } });
    acts.push({ label:'Manage units', cls:'', perm:'VIEW_CATALOGUE', fn:function(){ go('E03',{id:p.id}); } });
    host.innerHTML = acts.map(function(a,i){ return '<button class="btn '+a.cls+'" data-a="'+i+'"'+(a.perm&&!Perm.can(state.role,a.perm)?' disabled title="Your role can’t do this"':'')+'>'+esc(a.label)+'</button>'; }).join('');
    host.querySelectorAll('[data-a]').forEach(function(b){ b.onclick=function(){ acts[+b.getAttribute('data-a')].fn(); }; });
  }
  function projectTabs(p, active){
    var tabs = [ ['overview','Overview',href('E02',{id:p.id})], ['units','Units',href('E03',{id:p.id})],
      ['media','Media',href('E04',{id:p.id})], ['construction','Construction',href('E05',{id:p.id})] ];
    return '<div class="ptabs">'+tabs.map(function(t){ return '<a class="'+(t[0]===active?'on':'')+'" href="'+t[2]+'">'+t[1]+'</a>'; }).join('')+'</div>';
  }

  /* ===================== ACTIONS (dialog → mutate → audit → ripple → toast) ===================== */
  function togglePublish(p, after){
    var publishing = p.status !== 'published';
    formDialog({
      title: publishing ? 'Publish project' : 'Unpublish project',
      danger: !publishing,
      intro:'<p class="hint" style="margin-bottom:6px">'+esc(p.name)+' is currently <b>'+p.status+'</b>.</p>'+
        '<div class="effectbox">This project will become <b>'+(publishing?'visible':'hidden')+'</b> in the mobile app'+(publishing?' — it appears on the discovery map and buyers like Rezaul can browse its units.':' — it disappears from discovery. Existing bookings are unaffected.')+'</div>',
      fields: publishing ? [] : [ { type:'textarea', key:'reason', label:'Reason (optional)', placeholder:'e.g. Pricing under revision — temporarily hidden.' } ],
      mobileNote: publishing ? 'On confirm, <b>'+esc(p.name)+'</b> appears on the mobile discovery map.' : '<b>'+esc(p.name)+'</b> is removed from mobile discovery.',
      confirmLabel: publishing ? 'Publish' : 'Unpublish'
    }).then(function(v){
      if (!v) return;
      Perm.requirePermission(state.role, 'PUBLISH_PROJECT');
      // 3-state lifecycle (6.5.1): draft → published → unpublished. Unpublish is
      // its own audited state (a project that was live and is now hidden), NOT a
      // silent collapse back to draft — those read very differently to staff.
      var next = publishing ? 'published' : (p.status === 'draft' ? 'draft' : 'unpublished');
      Ripples.mutate('proj:'+p.id, { status: next, publishedUtc: publishing?root.CRM_NOW:p.publishedUtc, unpublishedUtc: publishing?null:root.CRM_NOW });
      Audit.audit({ actor:actor(), action: publishing?'PUBLISH_PROJECT':'UNPUBLISH_PROJECT', target:p.id+' · '+p.name, changes:{ from:p.status, to:next, reason:(v.reason||null) } });
      Ripples.emit({ kind:'project', screen: publishing?'Discovery map':'Hidden', headline: (publishing?'Published ':'Unpublished ')+p.name+(publishing?' — now on the mobile discovery map':' — removed from discovery') });
      C.toast({ type: publishing?'success':'warning', persist:true, title: publishing?'Project published':'Project unpublished', text:p.name, ripple: publishing?'now visible in the mobile app':'now hidden in the mobile app' });
      after && after();
    });
  }

  function changeUnitStatus(p, u, after){
    formDialog({
      title:'Change unit status',
      intro:'<div class="effectbox">Unit <b>'+esc(u.unitNo)+'</b> · '+esc(u.config)+' · '+esc(fmt.bdt(u.priceBdt))+'<br>Current status <b>'+esc(u.status)+'</b></div>',
      fields:[
        { type:'select', key:'status', label:'New status', options:Cat.UNIT_STATUS.map(function(s){ return { value:s, label:s.charAt(0).toUpperCase()+s.slice(1) }; }), value:u.status },
        { type:'textarea', key:'note', label:'Note (optional)', placeholder:'e.g. Held for client Rezaul Karim pending KYC.' }
      ],
      mobileNote:'The mobile inventory chip for this unit updates immediately.',
      confirmLabel:'Update status'
    }).then(function(v){
      if (!v || v.status===u.status) return;
      Perm.requirePermission(state.role, 'MANAGE_INVENTORY');
      Ripples.mutate('unit:'+p.id+':'+u.unitNo, { status:v.status });
      Audit.audit({ actor:actor(), action:'CHANGE_UNIT_STATUS', target:p.id+' · Unit '+u.unitNo, changes:{ from:u.status, to:v.status, note:(v.note||null) } });
      Ripples.emit({ kind:'project', screen:'Unit inventory', headline:'Unit '+u.unitNo+' ('+p.name+') → '+v.status+' — mobile inventory chip updated' });
      C.toast({ type:'success', title:'Unit updated', text:'Unit '+u.unitNo+': '+u.status+' → '+v.status, ripple:'mobile inventory chip now shows '+v.status });
      after && after();
    });
  }

  function bulkUnitStatus(p, units, after){
    if (!units.length){ C.toast({ type:'info', title:'Nothing selected', text:'Select units to change.' }); return; }
    formDialog({
      title:'Bulk change '+units.length+' unit'+(units.length>1?'s':''),
      intro:'<div class="effectbox">'+units.map(function(u){ return esc(u.unitNo); }).join(', ')+'</div>',
      fields:[ { type:'select', key:'status', label:'Set all to', options:Cat.UNIT_STATUS.map(function(s){ return { value:s, label:s.charAt(0).toUpperCase()+s.slice(1) }; }) } ],
      mobileNote:'<b>'+units.length+'</b> inventory chips update on the mobile unit picker.',
      confirmLabel:'Apply to '+units.length
    }).then(function(v){
      if (!v) return;
      Perm.requirePermission(state.role, 'MANAGE_INVENTORY');
      units.forEach(function(u){
        Ripples.mutate('unit:'+p.id+':'+u.unitNo, { status:v.status });
        Audit.audit({ actor:actor(), action:'CHANGE_UNIT_STATUS', target:p.id+' · Unit '+u.unitNo, changes:{ from:u.status, to:v.status, bulk:true } });
      });
      Ripples.emit({ kind:'project', screen:'Unit inventory', headline:units.length+' units in '+p.name+' → '+v.status+' — mobile inventory updated' });
      C.toast({ type:'success', title:'Units updated', text:units.length+' units set to '+v.status, ripple:'mobile inventory refreshed' });
      after && after();
    });
  }

  function addConstruction(p, after){
    formDialog({
      title:'Post construction update',
      width:520,
      intro:'<p class="hint" style="margin-bottom:6px">A dated photo of progress. Overseas buyers see this on their mobile timeline minutes after you publish.</p>',
      fields:[
        { type:'date', key:'date', label:'Date', value:'2026-07-15' },
        { type:'text', key:'stage', label:'Construction stage (optional)', placeholder:'e.g. 12th floor' },
        { type:'select', key:'mediaType', label:'Media', options:[{value:'photo',label:'Photo'},{value:'video',label:'Video'}] },
        { type:'textarea', key:'caption', label:'Caption', required:true, max:160, full:true, placeholder:'One line — e.g. 12th floor slab casting completed, structure topped out.' }
      ],
      grid:true,
      mobileNote:'On publish, a new entry appears on the mobile timeline and a push is queued to interested clients (OPEN_QUESTIONS #4).',
      confirmLabel:'Publish update'
    }).then(function(v){
      if (!v) return;
      Perm.requirePermission(state.role, 'POST_CONSTRUCTION');
      var row = { id:'CU-'+p.id+'-'+Date0(), date:v.date, stage:v.stage||null, caption:v.caption, mediaType:v.mediaType };
      var ov = readOv(); var patch = ov['proj:'+p.id] || {}; patch.constructionAdd = [row].concat(patch.constructionAdd||[]);
      Ripples.mutate('proj:'+p.id, { constructionAdd: patch.constructionAdd });
      Audit.audit({ actor:actor(), action:'POST_CONSTRUCTION', target:p.id+' · '+(v.stage||v.date), changes:{ caption:v.caption } });
      Ripples.emit({ kind:'project', screen:'Construction timeline', headline:'Construction update on '+p.name+' — “'+v.caption.slice(0,50)+(v.caption.length>50?'…':'')+'” · push queued' });
      C.toast({ type:'success', persist:true, title:'Update published', text:p.name+(v.stage?' · '+v.stage:''), ripple:'new timeline entry + push to interested clients' });
      after && after();
    });
  }

  function uploadMedia(p, after){
    formDialog({
      title:'Upload media',
      intro:'<p class="hint" style="margin-bottom:6px">Prototype accepts a label + type (no image editing — see What-NOT-to-build). 360 takes an equirectangular / Matterport URL only.</p>',
      fields:[
        { type:'select', key:'type', label:'Type', options:[{value:'photo',label:'Photo'},{value:'video',label:'Video'},{value:'360',label:'360 / Matterport'},{value:'floorplan',label:'Floor plan'},{value:'brochure',label:'Brochure (PDF)'}] },
        { type:'text', key:'label', label:'Label', required:true, placeholder:'e.g. Front elevation (dusk)' },
        { type:'text', key:'url', label:'URL (360 / brochure only)', placeholder:'https://…' }
      ],
      mobileNote:'On upload, the mobile gallery for this project reflects the change.',
      confirmLabel:'Upload'
    }).then(function(v){
      if (!v) return;
      Perm.requirePermission(state.role, 'UPLOAD_MEDIA');
      var row = { id:'M-'+p.id+'-'+Date0(), type:v.type, label:v.label, url:(v.url||null) };
      var ov = readOv(); var patch = ov['proj:'+p.id] || {}; patch.mediaAdd = [row].concat(patch.mediaAdd||[]);
      Ripples.mutate('proj:'+p.id, { mediaAdd: patch.mediaAdd });
      Audit.audit({ actor:actor(), action:'UPLOAD_MEDIA', target:p.id+' · '+v.label, changes:{ type:v.type } });
      Ripples.emit({ kind:'project', screen:'Gallery', headline:'Media added to '+p.name+' — “'+v.label+'” · mobile gallery updated' });
      C.toast({ type:'success', title:'Media uploaded', text:v.label, ripple:'mobile gallery reflects the new '+v.type });
      after && after();
    });
  }

  function setHero(p, m, after){
    Perm.requirePermission(state.role, 'UPLOAD_MEDIA');
    Ripples.mutate('proj:'+p.id, { heroId:m.id });
    Audit.audit({ actor:actor(), action:'SET_HERO_MEDIA', target:p.id+' · '+m.label });
    Ripples.emit({ kind:'project', screen:'Gallery', headline:'Hero image for '+p.name+' set to “'+m.label+'” — mobile gallery cover updated' });
    C.toast({ type:'success', title:'Hero image set', text:m.label, ripple:'mobile gallery cover updated' });
    after && after();
  }

  function createProject(after){
    var catOpts = SC.all().map(function(c){ return c.label; });
    formDialog({
      title:'Create project',
      width:600, grid:true,
      intro:'<p class="hint" style="margin-bottom:6px">A new project starts as a <b>draft</b> — invisible in the mobile app until published (E07). The <b>category</b> decides which configuration fields apply (6.5.3).</p>',
      fields:[
        { type:'text', key:'name', label:'Project name', required:true, placeholder:'e.g. Salmon Serenity', full:true },
        { type:'select', key:'category', label:'Property category', options:catOpts, required:true, full:true },
        { type:'text', key:'location', label:'Location', required:true, placeholder:'Bashundhara R/A, Block …, Dhaka', full:true },
        { type:'text', key:'lat', label:'Latitude', placeholder:'23.8188' },
        { type:'text', key:'lng', label:'Longitude', placeholder:'90.4348' },
        { type:'select', key:'readyStatus', label:'Status', options:['Under construction','Ready'] },
        { type:'text', key:'floors', label:'Floors', placeholder:'B1 + G + 10' },
        { type:'text', key:'priceFrom', label:'Price from (BDT)', placeholder:'12500000' },
        { type:'textarea', key:'summary', label:'Summary', placeholder:'One-paragraph project summary', full:true },
        { type:'text', key:'civicAmenities', label:'Civic amenities (comma-separated)', placeholder:'Rooftop deck, Standby generator, CCTV', full:true },
        { type:'text', key:'contactPhone', label:'Contact phone', placeholder:'+880 …' },
        { type:'text', key:'visitInfo', label:'Visit information', placeholder:'How a buyer arranges a visit', full:true }
      ],
      confirmLabel:'Create as draft'
    }).then(function(v){
      if (!v) return;
      Perm.requirePermission(state.role, 'CREATE_PROJECT');
      var pid = 'PRJ-NEW-'+Date0();
      var catId = (SC.all().filter(function(c){ return c.label===v.category; })[0]||{}).id || 'apartment';
      var proj = {
        id:pid, name:v.name, category:catId, location:v.location,
        coordinates:{ lat:parseFloat(v.lat)||null, lng:parseFloat(v.lng)||null },
        status:'draft', publishedUtc:null,
        readyStatus: v.readyStatus==='Ready' ? 'ready' : 'under_construction',
        summary: v.summary || '[CLIENT COPY REQUIRED]',
        civicAmenities: (v.civicAmenities||'').split(',').map(function(s){ return s.trim(); }).filter(Boolean),
        contact:{ name:'Salmon Sales Desk', phone:v.contactPhone||'', email:'sales@salmondevelopersbd.com' },
        visitInfo: v.visitInfo || '[CLIENT COPY REQUIRED]',
        glance:{ buildingType:v.category, floors:v.floors||'—', unitSqft:'—', bed:null, bath:null, balcony:null, lift:null, landFacing:'—', frontRoad:'—' },
        handover:'—', priceFromBdt: parseInt(v.priceFrom,10) || 0,
        units:[], media:[], construction:[]
      };
      // persist: append to the projectsAdd override array so it appears in E01
      var ov = readOv(); ov['projectsAdd'] = (ov['projectsAdd']||[]); ov['projectsAdd'].unshift(proj);
      try { localStorage.setItem('crm_people_mut', JSON.stringify(ov)); } catch(e){}
      Audit.audit({ actor:actor(), action:'CREATE_PROJECT', target:pid+' · '+v.name, changes:{ category:catId, location:v.location, status:'draft' } });
      C.toast({ type:'success', title:'Project created (draft)', text:v.name+' — saved as a draft. Not yet visible on mobile; publish from E07 when ready.' });
      after && after();
    });
  }

  function readOv(){ try { return JSON.parse(localStorage.getItem('crm_people_mut')||'{}'); } catch(e){ return {}; } }
  // stable-ish id suffix without Date.now (kept deterministic-friendly): counter
  var _seq = 0; function Date0(){ return (++_seq)+''+((readOv()['_seq']||0)); }

  /* ===================== SCREENS ===================== */
  var SCREENS = {};

  /* ---------- E01 · Projects list ---------- */
  SCREENS.E01 = { title:'Projects', sub:'Every Salmon development', perm:'VIEW_CATALOGUE',
    render:function(main){
      var projects = Cat.allProjects();
      var headerActions = [];
      if (Perm.can(state.role,'CREATE_PROJECT')) headerActions.push({ id:'create', label:'Create project', cls:'primary', icon:'＋' });
      if (Perm.can(state.role,'CONFIGURE_CATEGORIES')) headerActions.push({ id:'categories', label:'Property categories', cls:'', icon:'⚙' });
      main.innerHTML = C.PageHeader({ title:this.title, sub:this.sub, actions: headerActions });
      var ca = main.querySelector('[data-act="create"]'); if (ca) ca.onclick = function(){ createProject(function(){ location.reload(); }); };
      var cc = main.querySelector('[data-act="categories"]'); if (cc) cc.onclick = function(){ go('E09'); };
      var fbWrap = C.el('<div></div>'); main.appendChild(fbWrap);
      var tableWrap = C.el('<div></div>'); main.appendChild(tableWrap);
      // Category options are driven by the configurable schema (6.5.3), not hardcoded building types.
      var catOpts = SC.all().map(function(c){ return { value:c.id, label:c.label }; });
      C.FilterBar(fbWrap, { id:'e01', filters:[
        { key:'status', label:'Publish state', options:['published','draft','unpublished'] },
        { key:'category', label:'Category', options:catOpts.map(function(o){ return o.label; }) }
      ], onChange:draw });
      function catLabel(p){ return SC.label(p.category || 'apartment'); }
      function filtered(){ var f=C.getFilters('e01'); return projects.filter(function(p){ if (f.status && p.status!==f.status) return false; if (f.category && catLabel(p)!==f.category) return false; return true; }); }
      function draw(){
        C.mountDataTable(tableWrap, {
          rowId:'id', noun:'projects', defaultSort:'name', rows:filtered(),
          columns:[
            { key:'name', label:'Project', strong:true, sortable:true },
            { key:'category', label:'Category', render:function(r){ return esc(SC.label(r.category||'apartment')); } },
            { key:'location', label:'Location' },
            { key:'floors', label:'Floors', sortValue:function(r){return r.glance.floors;}, render:function(r){ return esc(r.glance.floors); } },
            { key:'avail', label:'Units (avail / total)', align:'right', render:function(r){ var c=Cat.unitCounts(r); return '<span class="num"><b>'+c.available+'</b> / '+c.total+'</span>'; } },
            { key:'priceFromBdt', label:'From', align:'right', sortable:true, render:function(r){ return fmt.bdt(r.priceFromBdt); } },
            { key:'status', label:'State', sortable:true, render:function(r){ return statusChip(r.status); } }
          ],
          rowActions:[
            { label:'Open overview', icon:'↗', onClick:function(r){ go('E02',{id:r.id}); } },
            { label:'Units', icon:'▤', onClick:function(r){ go('E03',{id:r.id}); } },
            { label:'Construction updates', icon:'🏗', onClick:function(r){ go('E05',{id:r.id}); } },
            { label:'Publish / unpublish', icon:'◉', disabled:function(){ return !Perm.can(state.role,'PUBLISH_PROJECT'); }, onClick:function(r){ go('E07',{id:r.id}); } }
          ],
          onRowClick:function(r){ go('E02',{id:r.id}); }
        });
      }
      draw();
    }
  };

  /* ---------- E02 · Project overview (At A Glance) ---------- */
  SCREENS.E02 = { title:'Project overview', perm:'VIEW_CATALOGUE',
    render:function(main, P){
      var p = P.get('id') ? Cat.projectById(P.get('id')) : Cat.allProjects()[0];
      main.innerHTML = '';
      if (!p){ main.innerHTML = C.EmptyState({ title:'Project not found', actionLabel:'All projects' }); wireEmpty(main,'E01'); return; }
      this.project = p.id;
      main.insertAdjacentHTML('beforeend', projectBand(p)); wireBand(p);
      main.insertAdjacentHTML('beforeend', projectTabs(p,'overview'));
      var canEdit = Perm.can(state.role,'EDIT_PROJECT');
      main.insertAdjacentHTML('beforeend', '<div class="sectitle">At A Glance'+(canEdit?'<span class="link" id="edit-glance">Edit fields</span>':'')+'</div>');
      var g = p.glance;
      var readyLabel = p.readyStatus==='ready' ? 'Ready' : p.readyStatus==='under_construction' ? 'Under construction' : (p.handover||'—');
      var tiles = [
        ['Category', SC.label(p.category||'apartment')], ['Ready status', readyLabel], ['Floors', g.floors], ['Handover', p.handover],
        ['Unit size', g.unitSqft], ['Bed', g.bed], ['Bath', g.bath], ['Balcony', g.balcony],
        ['Land facing', g.landFacing], ['Front road', g.frontRoad], ['Price from', fmt.bdt(p.priceFromBdt)], ['Publish state', p.status]
      ];
      main.insertAdjacentHTML('beforeend', '<div class="glancegrid">'+tiles.map(function(t){ return '<div class="gtile"><div class="gl">'+esc(t[0])+'</div><div class="gv">'+esc(t[1]==null?'—':t[1])+'</div></div>'; }).join('')+'</div>');
      // 6.5.2 — the fields the discovery view and a buyer need beyond structural glance.
      main.insertAdjacentHTML('beforeend', projectDetailBlock(p));
      main.appendChild(auditNote(p.id));
      var eg = document.getElementById('edit-glance'); if (eg) eg.onclick = function(){ editGlance(p, function(){ location.reload(); }); };
    }
  };
  function editGlance(p, after){
    var g = p.glance;
    formDialog({
      title:'Edit At-A-Glance', width:560, grid:true,
      fields:[
        { type:'text', key:'buildingType', label:'Building type', value:g.buildingType, full:true },
        { type:'text', key:'floors', label:'Floors', value:g.floors },
        { type:'text', key:'unitSqft', label:'Unit size', value:g.unitSqft },
        { type:'text', key:'landFacing', label:'Land facing', value:g.landFacing },
        { type:'text', key:'frontRoad', label:'Front road', value:g.frontRoad },
        { type:'text', key:'handover', label:'Handover', value:p.handover }
      ],
      confirmLabel:'Save fields'
    }).then(function(v){
      if (!v) return;
      Perm.requirePermission(state.role, 'EDIT_PROJECT');
      Ripples.mutate('proj:'+p.id, { glance:{ buildingType:v.buildingType, floors:v.floors, unitSqft:v.unitSqft, landFacing:v.landFacing, frontRoad:v.frontRoad }, handover:v.handover });
      Audit.audit({ actor:actor(), action:'EDIT_PROJECT', target:p.id+' · '+p.name, changes:{ fields:'At-A-Glance' } });
      C.toast({ type:'success', title:'Fields updated', text:p.name });
      after && after();
    });
  }

  /* ---------- E03 · Units ---------- */
  SCREENS.E03 = { title:'Units', perm:'VIEW_CATALOGUE',
    render:function(main, P){
      var p = P.get('id') ? Cat.projectById(P.get('id')) : Cat.allProjects()[0];
      main.innerHTML = '';
      if (!p){ main.innerHTML = C.EmptyState({ title:'Project not found', actionLabel:'All projects' }); wireEmpty(main,'E01'); return; }
      this.project = p.id;
      main.insertAdjacentHTML('beforeend', projectBand(p)); wireBand(p);
      main.insertAdjacentHTML('beforeend', projectTabs(p,'units'));
      main.insertAdjacentHTML('beforeend', '<p class="metaline">Select units to bulk-change status. Every change updates the mobile inventory chip.</p>');
      var tableWrap = C.el('<div></div>'); main.appendChild(tableWrap);
      var canManage = Perm.can(state.role,'MANAGE_INVENTORY');
      function draw(){
        C.mountDataTable(tableWrap, {
          rowId:'unitNo', selectable:canManage, noun:'units', defaultSort:'unitNo', rows:p.units,
          columns:[
            { key:'unitNo', label:'Unit', strong:true, sortable:true },
            { key:'floor', label:'Floor', align:'right', sortable:true },
            { key:'config', label:'Config' },
            { key:'areaSqft', label:'Area', align:'right', sortable:true, render:function(r){ return r.areaSqft.toLocaleString()+' sqft'; } },
            { key:'orientation', label:'Facing' },
            { key:'priceBdt', label:'Price', align:'right', sortable:true, render:function(r){ return fmt.bdt(r.priceBdt); } },
            { key:'status', label:'Status', sortable:true, render:function(r){ return unitChip(r.status); } }
          ],
          rowActions: canManage ? [
            { label:'Change status', icon:'◉', onClick:function(r){ changeUnitStatus(p, r, function(){ p=Cat.projectById(p.id); draw(); }); } },
            { label:'Edit unit', icon:'✎', onClick:function(r){ go('E08',{id:p.id, unit:r.unitNo}); } }
          ] : [ { label:'View unit', icon:'↗', onClick:function(r){ go('E08',{id:p.id, unit:r.unitNo}); } } ],
          bulkActions: canManage ? [ { label:'Change status', cls:'primary', onClick:function(rows){ bulkUnitStatus(p, rows, function(){ p=Cat.projectById(p.id); draw(); }); } } ] : null,
          onRowClick:function(r){ go('E08',{id:p.id, unit:r.unitNo}); }
        });
      }
      draw();
      main.appendChild(auditNote(p.id));
    }
  };

  /* ---------- E08 · Unit detail / edit ---------- */
  SCREENS.E08 = { title:'Unit detail', perm:'VIEW_CATALOGUE',
    render:function(main, P){
      var p = Cat.projectById(P.get('id')); if (!p){ main.innerHTML = header(this) + C.EmptyState({ title:'Project not found', actionLabel:'All projects' }); wireEmpty(main,'E01'); return; }
      this.project = p.id;
      var u = p.units.filter(function(x){ return x.unitNo===P.get('unit'); })[0] || p.units[0];
      main.innerHTML = '';
      main.insertAdjacentHTML('beforeend', C.PageHeader({ title:'Unit '+u.unitNo, sub:p.name+' · '+p.location, actions:[{ id:'back', label:'All units' }] }));
      main.querySelector('[data-act="back"]').onclick = function(){ go('E03',{id:p.id}); };
      main.insertAdjacentHTML('beforeend',
        '<div class="split2"><div class="card"><h3>Configuration</h3><dl class="kv">'+
        '<dt>Unit no</dt><dd>'+esc(u.unitNo)+'</dd><dt>Floor</dt><dd>'+u.floor+'</dd>'+
        '<dt>Configuration</dt><dd>'+esc(u.config)+'</dd><dt>Area</dt><dd>'+u.areaSqft.toLocaleString()+' sqft</dd>'+
        '<dt>Orientation</dt><dd>'+esc(u.orientation)+'</dd><dt>Status</dt><dd>'+unitChip(u.status)+'</dd></dl></div>'+
        '<div class="card"><h3>Price</h3><dl class="kv"><dt>Price (BDT)</dt><dd>'+fmt.bdt(u.priceBdt)+'</dd>'+
        '<dt>Per sqft</dt><dd>'+fmt.bdt(Math.round(u.priceBdt/u.areaSqft))+'</dd>'+
        '<dt>Display currency</dt><dd>Derived from BDT on the client side</dd></dl>'+
        '<p class="hint" style="margin-top:8px">Price-change history as an audit requirement is undefined (OPEN_QUESTIONS #5).</p>'+
        (Perm.can(state.role,'MANAGE_INVENTORY')?'<div class="gap"></div><div class="primaryacts"><button class="btn primary" id="u-status">Change status</button><button class="btn" id="u-price">Edit price</button></div>':'')+
        '</div></div>');
      var us=document.getElementById('u-status'); if (us) us.onclick=function(){ changeUnitStatus(p,u,function(){ location.reload(); }); };
      var up=document.getElementById('u-price'); if (up) up.onclick=function(){ editUnitPrice(p,u,function(){ location.reload(); }); };
      main.appendChild(auditNote(p.id));
    }
  };
  function editUnitPrice(p, u, after){
    formDialog({
      title:'Edit unit price',
      intro:'<div class="effectbox">Unit <b>'+esc(u.unitNo)+'</b> · current <b>'+fmt.bdt(u.priceBdt)+'</b></div>',
      fields:[ { type:'text', key:'price', label:'New price (BDT)', required:true, value:String(u.priceBdt) },
        { type:'textarea', key:'note', label:'Reason (recorded on audit)', placeholder:'e.g. Revised per Q3 price schedule.' } ],
      confirmLabel:'Save price'
    }).then(function(v){
      if (!v) return;
      var np = parseInt(String(v.price).replace(/\D/g,''),10) || u.priceBdt;
      Perm.requirePermission(state.role, 'MANAGE_INVENTORY');
      Ripples.mutate('unit:'+p.id+':'+u.unitNo, { priceBdt:np });
      Audit.audit({ actor:actor(), action:'EDIT_UNIT_PRICE', target:p.id+' · Unit '+u.unitNo, changes:{ from:u.priceBdt, to:np, note:(v.note||null) } });
      C.toast({ type:'success', title:'Price updated', text:'Unit '+u.unitNo+': '+fmt.bdt(u.priceBdt)+' → '+fmt.bdt(np) });
      after && after();
    });
  }

  /* ---------- E04 · Media ---------- */
  SCREENS.E04 = { title:'Media', perm:'VIEW_CATALOGUE',
    render:function(main, P){
      var p = P.get('id') ? Cat.projectById(P.get('id')) : Cat.allProjects()[0];
      main.innerHTML = '';
      if (!p){ main.innerHTML = C.EmptyState({ title:'Project not found', actionLabel:'All projects' }); wireEmpty(main,'E01'); return; }
      this.project = p.id;
      main.insertAdjacentHTML('beforeend', projectBand(p)); wireBand(p);
      main.insertAdjacentHTML('beforeend', projectTabs(p,'media'));
      var canUpload = Perm.can(state.role,'UPLOAD_MEDIA');
      main.insertAdjacentHTML('beforeend', '<div class="mediabar"><span class="fl">'+p.media.length+' items</span><span class="spacer" style="flex:1"></span>'+(canUpload?'<button class="btn primary" id="m-upload">＋ Upload media</button>':'')+'</div>');
      var mu = document.getElementById('m-upload'); if (mu) mu.onclick = function(){ uploadMedia(p, function(){ location.reload(); }); };
      if (!p.media.length){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'No media yet', text:'Upload photos, video, 360 links, floor plans and brochures.' })); return; }
      var grid = C.el('<div class="medialib"></div>');
      p.media.forEach(function(m, i){
        var tile = C.el('<div class="mediatile '+typeClass(m.type)+'">'+(m.hero?'<span class="herobadge">Hero</span>':'')+
          '<div class="thumb">'+mediaIcon(m.type)+'</div><div class="meta"><div class="tl">'+esc(m.label)+'</div><div class="ty">'+esc(m.type)+(m.url?' · linked':'')+'</div></div>'+
          '<div class="acts">'+(canUpload?'<button data-hero'+(m.hero?' disabled':'')+'>Set hero</button><button data-up>↑</button><button data-down>↓</button>':'<button data-view>View</button>')+'</div></div>');
        if (canUpload){
          var hb = tile.querySelector('[data-hero]'); if (hb && !m.hero) hb.onclick = function(){ setHero(p, m, function(){ location.reload(); }); };
          tile.querySelector('[data-up]').onclick = function(){ reorderMedia(p, i, -1); };
          tile.querySelector('[data-down]').onclick = function(){ reorderMedia(p, i, 1); };
        } else { tile.querySelector('[data-view]').onclick = function(){ C.toast({ type:'info', title:m.label, text:'Preview opens in the client gallery.' }); }; }
        grid.appendChild(tile);
      });
      main.appendChild(grid);
      main.appendChild(auditNote(p.id));
    }
  };
  function reorderMedia(p, i, dir){
    Perm.requirePermission(state.role, 'UPLOAD_MEDIA');
    Audit.audit({ actor:actor(), action:'REORDER_MEDIA', target:p.id+' · '+p.media[i].label, changes:{ dir: dir<0?'up':'down' } });
    Ripples.emit({ kind:'project', screen:'Gallery', headline:'Reordered media in '+p.name+' — mobile gallery order updated' });
    C.toast({ type:'success', title:'Media reordered', text:p.media[i].label+' moved '+(dir<0?'up':'down'), ripple:'mobile gallery order reflects the change' });
  }

  /* ---------- E05 · Construction updates ⭐ ---------- */
  SCREENS.E05 = { title:'Construction updates', perm:'VIEW_CATALOGUE',
    render:function(main, P){
      var p = P.get('id') ? Cat.projectById(P.get('id')) : Cat.allProjects()[0];
      main.innerHTML = '';
      if (!p){ main.innerHTML = C.EmptyState({ title:'Project not found', actionLabel:'All projects' }); wireEmpty(main,'E01'); return; }
      this.project = p.id;
      main.insertAdjacentHTML('beforeend', projectBand(p)); wireBand(p);
      main.insertAdjacentHTML('beforeend', projectTabs(p,'construction'));
      var canPost = Perm.can(state.role,'POST_CONSTRUCTION');
      main.insertAdjacentHTML('beforeend', '<div class="mediabar"><span class="fl">'+p.construction.length+' updates · newest first</span><span class="spacer" style="flex:1"></span>'+(canPost?'<button class="btn primary" id="c-add">＋ Post construction update</button>':'')+'</div>');
      var ca = document.getElementById('c-add'); if (ca) ca.onclick = function(){ addConstruction(p, function(){ location.reload(); }); };
      if (!p.construction.length){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'No construction updates yet', text:'Post the first dated photo — overseas buyers watch this timeline closely.' })); return; }
      var card = C.el('<div class="card"></div>');
      p.construction.forEach(function(cu){
        card.appendChild(C.el('<div class="cu-row"><div class="cu-thumb">'+(cu.mediaType==='video'?'▶':'🖼')+'</div><div class="cu-main">'+
          '<div><span class="cu-date">'+esc(fmt.dhaka(cu.date))+'</span>'+(cu.stage?'<span class="cu-stage">'+esc(cu.stage)+'</span>':'')+'</div>'+
          '<div class="cu-cap">'+esc(cu.caption)+'</div>'+
          '<div style="margin-top:6px"><span class="cu-media">'+(cu.mediaType==='video'?'▶ Video':'🖼 Photo')+'</span></div></div></div>'));
      });
      main.appendChild(card);
      main.appendChild(auditNote(p.id));
    }
  };

  /* ---------- E06 · Create project ---------- */
  SCREENS.E06 = { title:'Create project', sub:'New projects start as a draft', perm:'CREATE_PROJECT',
    render:function(main){
      main.innerHTML = header(this);
      main.insertAdjacentHTML('beforeend', '<div class="card"><h3>New development</h3><p class="hint" style="margin-bottom:12px">Create a project as a draft, then add units, media and construction updates before publishing it to the mobile app.</p><div class="primaryacts"><button class="btn primary" id="do-create">Create project…</button><a class="btn" href="'+href('E01')+'">All projects</a></div></div>');
      document.getElementById('do-create').onclick = function(){ createProject(function(){ go('E01'); }); };
    }
  };

  /* ---------- E07 · Publish / unpublish ---------- */
  SCREENS.E07 = { title:'Publish / unpublish', perm:'PUBLISH_PROJECT',
    render:function(main, P){
      var p = P.get('id') ? Cat.projectById(P.get('id')) : Cat.allProjects()[0];
      main.innerHTML = header(this);
      if (!p){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'Project not found', actionLabel:'All projects' })); wireEmpty(main,'E01'); return; }
      this.project = p.id;
      main.insertAdjacentHTML('beforeend', projectBand(p)); wireBand(p);
      var publishing = p.status!=='published';
      main.insertAdjacentHTML('beforeend', '<div class="card"><h3>'+(publishing?'Publish':'Unpublish')+' this project</h3>'+
        '<div class="effectbox">This project will become <b>'+(publishing?'visible':'hidden')+'</b> in the mobile app. '+(publishing?'It appears on the discovery map for buyers like Rezaul.':'It disappears from discovery; existing bookings are unaffected.')+'</div>'+
        '<div class="primaryacts"><button class="btn '+(publishing?'primary':'danger')+'" id="do-pub">'+(publishing?'Publish '+esc(p.name):'Unpublish '+esc(p.name))+'</button></div></div>');
      document.getElementById('do-pub').onclick = function(){ togglePublish(p, function(){ location.reload(); }); };
      main.appendChild(auditNote(p.id));
    }
  };

  function wireEmpty(main, screen){ var b=main.querySelector('[data-empty-act]'); if(b) b.onclick=function(){ go(screen); }; }

  /* ---------- E09 · Configurable property categories (6.5.3) ---------- */
  SCREENS.E09 = { title:'Property categories', sub:'Configure categories and the fields that apply to each', perm:'CONFIGURE_CATEGORIES',
    render:function(main){
      var canEdit = Perm.can(state.role,'CONFIGURE_CATEGORIES');
      main.innerHTML = C.PageHeader({ title:this.title, sub:this.sub, actions: canEdit ? [{ id:'addcat', label:'Add category', cls:'primary', icon:'＋' },{ id:'resetcat', label:'Reset to defaults', cls:'' }] : [] });
      main.insertAdjacentHTML('beforeend', '<div class="effectbox" style="margin:0 0 14px">Each category declares which configuration fields apply. A project of that category exposes exactly those fields — an <b>apartment</b> shows bedrooms; a <b>land / plot share</b> shows plot size and share fraction, not bedrooms. These same declarations drive the <b>Global Client filters</b> (6.5.3). The default matrix is a placeholder — confirm with Salmon (OPEN QUESTIONS #1).</div>');
      var ac = main.querySelector('[data-act="addcat"]'); if (ac) ac.onclick = function(){ addCategoryDialog(function(){ location.reload(); }); };
      var rc = main.querySelector('[data-act="resetcat"]'); if (rc) rc.onclick = function(){ C.confirmDialog ? C.confirmDialog({ title:'Reset categories?', text:'Restore the five default categories and their fields.' }).then(function(ok){ if(ok){ SC.resetToDefaults(); Audit.audit({ actor:actor(), action:'RESET_CATEGORIES', target:'Property categories' }); location.reload(); } }) : (SC.resetToDefaults(), location.reload()); };
      var fieldIds = Object.keys(SC.FIELDS);
      var wrap = C.el('<div class="catgrid"></div>');
      SC.all().forEach(function(cat){
        var card = C.el('<div class="card catcard"></div>');
        var applied = {}; cat.fields.forEach(function(f){ applied[f]=1; });
        card.innerHTML = '<div class="row between" style="align-items:center"><div><h3 style="margin:0">'+esc(cat.label)+'</h3><div class="hint">'+esc(cat.id)+(cat.system?' · seed':'')+'</div></div>'+
          (canEdit && !cat.system ? '<button class="link danger" data-del>Remove</button>' : '')+'</div>'+
          '<div class="hint" style="margin:8px 0 6px">Applicable configuration fields — click to toggle:</div>'+
          '<div class="fieldchips">'+fieldIds.map(function(fid){
            var f = SC.FIELDS[fid];
            var on = !!applied[fid];
            return '<button class="fchip'+(on?' on':'')+(f.sensitive?' sensitive':'')+'" data-f="'+fid+'"'+(canEdit?'':' disabled')+'>'+esc(f.label)+(f.filter?' <span class="ff">filter</span>':'')+(f.sensitive?' <span class="ff sens">legal</span>':'')+'</button>';
          }).join('')+'</div>'+
          '<div class="hint" style="margin-top:8px">Drives client filters: <b>'+(SC.filtersFor(cat.id).map(function(f){return f.label;}).join(', ')||'—')+'</b></div>';
        if (canEdit){
          card.querySelectorAll('[data-f]').forEach(function(btn){ btn.onclick = function(){
            var fid = btn.getAttribute('data-f');
            SC.toggleField(cat.id, fid);
            Audit.audit({ actor:actor(), action:'CONFIGURE_CATEGORY', target:cat.label, changes:{ field:fid, applied: btn.className.indexOf('on')<0 } });
            location.reload();
          }; });
          var del = card.querySelector('[data-del]'); if (del) del.onclick = function(){ SC.removeCategory(cat.id); Audit.audit({ actor:actor(), action:'REMOVE_CATEGORY', target:cat.label }); location.reload(); };
        }
        wrap.appendChild(card);
      });
      main.appendChild(wrap);
    }
  };
  function addCategoryDialog(after){
    formDialog({
      title:'Add property category', width:520, grid:false,
      intro:'<p class="hint">Name the category. It starts with <b>Area</b> + <b>Price range</b> applied; toggle the rest of its fields on the category card afterwards.</p>',
      fields:[ { type:'text', key:'label', label:'Category name', required:true, placeholder:'e.g. Duplex' } ],
      confirmLabel:'Add category'
    }).then(function(v){
      if (!v || !v.label) return;
      var id = SC.addCategory(v.label, ['area','priceRange']);
      Audit.audit({ actor:actor(), action:'ADD_CATEGORY', target:v.label, changes:{ id:id, fields:'area,priceRange' } });
      C.toast({ type:'success', title:'Category added', text:v.label+' — now selectable when creating a project and as a client filter. Toggle its fields below.' });
      after && after();
    });
  }

  /* ===================== boot ===================== */
  function boot(screenId){
    state.screen = screenId;
    state.params = new URLSearchParams(location.search);
    Audit.seed(CRM.auditSeed);
    mountShell();
    renderMain();
  }
  root.Catalogue = { boot: boot, rerender: renderMain, SCREENS: SCREENS, go: go, href: href };
})(window);
