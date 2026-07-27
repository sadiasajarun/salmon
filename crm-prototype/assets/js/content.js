/* ============================================================================
 * Salmon CRM — Training & Sales Kit content management (Req 6.15)  ·  Y01
 * ----------------------------------------------------------------------------
 * screens/Y01-content-management.html bootstraps Content.boot('Y01').
 * A content LIBRARY, not an LMS. Admin can:
 *   - upload / edit / publish / unpublish training + sales-kit content (TR05),
 *   - target content by program / rank / team / territory (TR06) — the gate the
 *     partner's sales kit reflects as "locked-with-reason" (never hidden).
 * Rules enforced in code: NO quiz / score / certification / completion field
 * exists here; publish/unpublish/target are permission-gated, audited old→new,
 * and ripple to the partner library. Mirrors invest.js / commission.js shell.
 * ==========================================================================*/
(function (root) {
  'use strict';
  var C = root.C, Perm = root.Perm, Audit = root.Audit, CRM = root.CRM, Router = root.Router,
      DevToolbar = root.DevToolbar, CT = root.CRM.Content, Ripples = root.Ripples;

  root.CRM_NOW = '2026-07-15T10:00:00Z';
  var esc = C.esc, fmt = C.fmt;

  var state = { role: localStorage.getItem('crm_role') || Perm.ROLES.SUPER_ADMIN, render:'data', screen:null, params:null };
  function actor(){ return CRM.staff[state.role]; }
  function setRole(r){ state.role = r; localStorage.setItem('crm_role', r); }

  var FILES = { Y01:'Y01-content-management.html' };
  function href(id){ return FILES[id]||'#'; }
  function go(id){ location.href = href(id); }

  /* ===================== shell (mirrors invest.js) ===================== */
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
    var s=actor();
    tb.innerHTML =
      '<div class="breadcrumb"><a href="../index.html#/dashboard">Salmon</a><span class="sep">›</span><span class="cur">Training &amp; Sales Kit</span></div><span class="spacer"></span>' +
      '<button class="searchbtn" id="searchbtn">🔎 <span>Search…</span><kbd>⌘K</kbd></button><span id="devmount"></span>' +
      '<button class="icobtn" id="bell">🔔</button>' +
      '<div class="user"><span class="avatar">'+esc(s.initials)+'</span><span class="who"><span class="nm">'+esc(s.name)+'</span><span class="rl">'+Perm.ROLE_LABEL[state.role]+'</span></span></div>';
    document.getElementById('devmount').appendChild(DevToolbar.render({
      role: state.role, state: state.render,
      onRole:function(r){ setRole(r); renderTopbar(); renderSidebar(); renderFooter(); renderMain(); },
      onState:function(st){ state.render=st; renderMain(); },
      onReset:function(){ Ripples.reset(); C.toast({type:'info',title:'Mock data reset',text:'Content library restored to seed.'}); renderMain(); }
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
        var route=MODMAP[it.id]||('../index.html'+it.route);
        return '<a class="navitem" href="'+route+'"><span class="ic">'+it.icon+'</span><span class="lb">'+esc(it.label)+'</span>'+(it.count?'<span class="count">'+it.count+'</span>':'')+'</a>';
      }).join('')+'</div>';
    }).join('');
  }
  function renderFooter(){ var ft=document.getElementById('footer'); if(!ft)return; var s=actor();
    ft.innerHTML='<b style="color:var(--ink-2)">'+esc(s.name)+'</b> · '+Perm.ROLE_LABEL[state.role]+' · '+esc(s.office)+'<span class="spacer" style="flex:1"></span><span>Salmon Admin · Training &amp; Sales Kit (Req 6.15)</span>'; }
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
      Audit.audit({ actor:actor(), action:'ACCESS_DENIED', target:'Content · '+sc.title });
      main.innerHTML=deniedPanel(sc.title, sc.perm); wireDenied(main); return;
    }
    if(state.render==='loading'){ main.innerHTML=header(sc)+skeleton(); return; }
    if(state.render==='error'){ main.innerHTML=header(sc)+C.EmptyState({icon:'⚠',title:'Something went wrong',text:'This view failed to load.'}); return; }
    if(state.render==='offline'){ main.innerHTML=header(sc)+C.EmptyState({icon:'⚠',title:'You’re offline',text:'Publishing is unavailable until you reconnect.'}); return; }
    if(state.render==='empty'){ main.innerHTML=header(sc)+C.EmptyState({title:'No content',text:'Upload training or sales-kit content to begin.'}); return; }
    try{ sc.render(main); }catch(e){ console.error(e); main.innerHTML=header(sc)+C.EmptyState({icon:'⚠',title:'Something went wrong',text:'This view failed to load.'}); }
    updateFab();
  }
  function header(sc){ return C.PageHeader({ title:sc.title, sub:sc.sub }); }
  function deniedPanel(what, perm){
    return '<div class="authwrap" style="min-height:auto;padding:40px 0"><div class="authcard denied" style="text-align:center">' +
      '<div class="mark" style="margin:0 auto 14px">⛔</div><h1>Access denied</h1>' +
      '<p>Your role — <b>'+Perm.ROLE_LABEL[state.role]+'</b> — cannot open <b>'+esc(what)+'</b>.'+(perm?' Required permission: <span class="mono">'+perm+'</span>.':'')+'</p>' +
      '<button class="btn primary" id="back-ct" style="width:auto;margin:4px auto 0">Back to console</button></div></div>';
  }
  function wireDenied(main){ var b=main.querySelector('#back-ct'); if(b) b.onclick=function(){ location.href='../index.html#/dashboard'; }; }
  function skeleton(){ return '<div class="tablewrap" style="padding:10px">'+Array(6).fill(0).map(function(){return '<div class="sk" style="height:34px;margin:6px 0"></div>';}).join('')+'</div>'; }

  /* ===================== formDialog (copied from invest.js) ===================== */
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
  function statusChip(st){ return '<span class="chip '+(st==='published'?'green':'grey')+'"><span class="d"></span>'+(st==='published'?'Published':'Draft')+'</span>'; }
  function audienceChip(gate){ return gate?('<span class="chip amber"><span class="d"></span>'+esc(CT.gateLabel(gate))+'</span>'):'<span class="chip blue"><span class="d"></span>All partners</span>'; }
  function sizeLabel(x){ return (x.sizeMb!=null?x.sizeMb+' MB':'—')+(x.pages?' · '+x.pages+'p':(x.durationMin?' · '+x.durationMin+'m':'')); }
  function auditNote(id){ var n=C.el(C.AuditNote({actor:actor().name,when:root.CRM_NOW})); var lk=n.querySelector('.lk'); if(lk) lk.onclick=function(){ C.toast({type:'info',title:'Audit slice',text:'Opens the audit log filtered to '+(id||'content')+'.'}); }; return n; }

  /* ===================== SCREENS ===================== */
  var SCREENS = {};
  SCREENS.Y01 = { section:'Y', title:'Training & Sales Kit', sub:'Upload, publish & target the partner content library — no quizzes, no certification (library only)', perm:'VIEW_CONTENT',
    render:function(main){
      main.innerHTML = header(this);
      main.insertAdjacentHTML('beforeend','<div class="part6note" style="background:#eef4f0;border-color:#cfe6da;color:#1E7A46">📚 This is a content <b>library</b>, not an LMS. Publish/unpublish/update content and target it by program / rank / team / territory. There are deliberately <b>no</b> quizzes, scores, or certificates — the only partner-side marker is "viewed".</div>');

      var canManage = Perm.can(state.role,'MANAGE_CONTENT');
      main.insertAdjacentHTML('beforeend','<div style="display:flex;align-items:center;gap:10px;margin:14px 0 6px"><h3 style="margin:0">Training library</h3><span class="spacer" style="flex:1"></span>'+(canManage?'<button class="btn" id="up-training">+ Upload training</button>':'')+'</div>');
      mountTable(main, CT.allTraining(), 'training');

      main.insertAdjacentHTML('beforeend','<div style="display:flex;align-items:center;gap:10px;margin:18px 0 6px"><h3 style="margin:0">Sales kit</h3><span class="spacer" style="flex:1"></span>'+(canManage?'<button class="btn" id="up-kit">+ Upload sales-kit asset</button>':'')+'</div>');
      main.insertAdjacentHTML('beforeend','<p class="metaline">Sales-kit assets are organised per project — the partner grabs everything for a pitch in one place.</p>');
      mountTable(main, CT.allKit(), 'kit');

      var ut=document.getElementById('up-training'); if(ut) ut.onclick=function(){ uploadContent('training'); };
      var uk=document.getElementById('up-kit'); if(uk) uk.onclick=function(){ uploadContent('kit'); };
      main.appendChild(auditNote(null));
    }
  };

  function mountTable(main, rows, kind){
    var tw=C.el('<div></div>'); main.appendChild(tw);
    var cols=[
      { key:'title', label:'Title', strong:true },
      (kind==='kit' ? { key:'project', label:'Project' } : { key:'cat', label:'Category', render:function(r){ return esc(r.cat); } }),
      { key:'type', label:'Type', render:function(r){ return esc(r.type); } },
      { key:'size', label:'Size', align:'right', render:function(r){ return sizeLabel(r); } },
      { key:'status', label:'Status', render:function(r){ return statusChip(r.status); } },
      { key:'gate', label:'Audience', render:function(r){ return audienceChip(r.gate); } }
    ];
    C.mountDataTable(tw, { rowId:'id', noun:'items', defaultSort:'updatedUtc', defaultDir:-1, rows:rows, columns:cols, rowActions:[
      { label:'Edit', icon:'✎', disabled:function(){ return !Perm.can(state.role,'MANAGE_CONTENT'); }, onClick:function(r){ editContent(r); } },
      { label:'Set targeting', icon:'🎯', disabled:function(){ return !Perm.can(state.role,'TARGET_CONTENT'); }, onClick:function(r){ targetContent(r); } },
      { label:'Publish / Unpublish', icon:'⇅', disabled:function(){ return !Perm.can(state.role,'MANAGE_CONTENT'); }, onClick:function(r){ togglePublish(r); } }
    ] });
  }

  /* ===================== actions (permission-gated, audited, rippled) ===================== */
  function uploadContent(kind){
    var catOpts = (kind==='kit'?CT.KIT_CATS:CT.TRAINING_CATS).map(function(c){ return { value:c.key, label:c.label }; });
    var fields=[
      { type:'text', key:'title', label:'Title', required:true, placeholder:kind==='kit'?'e.g. Bellissimo brochure':'e.g. New partner onboarding guide' },
      { type:'select', key:'cat', label:'Category', options:catOpts },
      { type:'select', key:'type', label:'Type', options:(kind==='kit'?['pdf','image','video']:['doc','video']) },
      { type:'text', key:'sizeMb', label:'File size (MB)', placeholder:'e.g. 1.2' }
    ];
    if(kind==='kit') fields.splice(1,0,{ type:'text', key:'project', label:'Project', placeholder:'e.g. Salmon Bellissimo' });
    formDialog({ title:kind==='kit'?'Upload sales-kit asset':'Upload training content', confirmLabel:'Upload as draft',
      intro:'<p class="hint">Mock upload — records the content’s shape. It starts as a <b>Draft</b>; publish it to make it visible to partners.</p>',
      fields:fields, mobileNote:'Once published, partners see it in the '+(kind==='kit'?'sales kit':'training library')+'.'
    }).then(function(v){
      if(!v) return;
      Perm.requirePermission(state.role,'MANAGE_CONTENT');
      var id=(kind==='kit'?'KIT-':'TR-')+String(Date.parse(root.CRM_NOW)).slice(-6);
      var rec={ id:id, kind:kind, cat:v.cat, type:v.type, title:v.title, sizeMb:parseFloat(v.sizeMb)||null, status:'draft', gate:null, updatedUtc:root.CRM_NOW };
      if(kind==='kit') rec.project=v.project||'—';
      Ripples.mutate('content:'+id, rec);
      Audit.audit({ actor:actor(), action:'UPLOAD_CONTENT', target:id+' · '+v.title, changes:{ kind:kind, status:'draft' } });
      C.toast({ type:'success', title:'Uploaded as draft', text:v.title+' — publish it to reach partners.' });
      go('Y01');
    });
  }

  function editContent(r){
    formDialog({ title:'Edit content', confirmLabel:'Save changes',
      intro:'<div class="effectbox">'+esc(r.id)+'</div>',
      fields:[
        { type:'text', key:'title', label:'Title', required:true, value:r.title },
        { type:'text', key:'sizeMb', label:'File size (MB)', value:r.sizeMb!=null?String(r.sizeMb):'' }
      ], mobileNote:'Partners see the updated title/size.'
    }).then(function(v){
      if(!v) return;
      Perm.requirePermission(state.role,'MANAGE_CONTENT');
      Ripples.mutate('content:'+r.id, Object.assign({}, r, { title:v.title, sizeMb:parseFloat(v.sizeMb)||r.sizeMb, updatedUtc:root.CRM_NOW }));
      Audit.audit({ actor:actor(), action:'UPDATE_CONTENT', target:r.id+' · '+v.title, changes:{ title:v.title } });
      C.toast({ type:'success', title:'Content updated', text:v.title });
      go('Y01');
    });
  }

  function togglePublish(r){
    var to = r.status==='published' ? 'draft' : 'published';
    C.confirmDialog({ title:(to==='published'?'Publish':'Unpublish')+' “'+esc(r.title)+'”?',
      body:'<p>'+(to==='published'?'Make this visible to partners in the '+(r.kind==='kit'?'sales kit':'training library')+'.':'Hide this from partners. It stays in the library as a Draft — nothing is deleted.')+'</p>',
      confirmLabel:(to==='published'?'Publish':'Unpublish') }).then(function(ok){
      if(!ok) return;
      Perm.requirePermission(state.role,'MANAGE_CONTENT');
      Ripples.mutate('content:'+r.id, Object.assign({}, r, { status:to, updatedUtc:root.CRM_NOW }));
      Audit.audit({ actor:actor(), action:to==='published'?'PUBLISH_CONTENT':'UNPUBLISH_CONTENT', target:r.id+' · '+r.title, changes:{ from:r.status, to:to } });
      Ripples.emit({ kind:'partner', screen:(r.kind==='kit'?'Sales kit':'Training library'), headline:'“'+r.title+'” '+(to==='published'?'published':'unpublished')+' — partner library updates' });
      C.toast({ type:'success', persist:true, title:to==='published'?'Published':'Unpublished', text:r.title, ripple:'partner '+(r.kind==='kit'?'sales kit':'library')+' updated' });
      go('Y01');
    });
  }

  function targetContent(r){
    // Build a flat audience choice: "All partners" + one option per gate attribute value.
    var opts=[{ value:'', label:'All partners (no gate)' }];
    Object.keys(CT.GATE_OPTIONS).forEach(function(by){
      CT.GATE_OPTIONS[by].forEach(function(o){ opts.push({ value:by+':'+o.value, label:o.label+' only ('+by+')' }); });
    });
    var cur = r.gate ? (r.gate.by+':'+r.gate.need) : '';
    formDialog({ title:'Set targeting', confirmLabel:'Apply targeting',
      intro:'<div class="effectbox">'+esc(r.title)+'</div><p class="hint">Gated content is shown to non-matching partners as <b>locked-with-reason</b> — never hidden. The confirmed attribute lists are OPEN_QUESTIONS (Req 6.15 #2).</p>',
      fields:[{ type:'select', key:'aud', label:'Audience', value:cur, options:opts }],
      mobileNote:'Non-matching partners see a lock with the reason on the sales kit.'
    }).then(function(v){
      if(!v) return;
      Perm.requirePermission(state.role,'TARGET_CONTENT');
      var gate=null;
      if(v.aud){ var p=v.aud.split(':'); gate={ by:p[0], need:p[1] }; }
      Ripples.mutate('content:'+r.id, Object.assign({}, r, { gate:gate, updatedUtc:root.CRM_NOW }));
      Audit.audit({ actor:actor(), action:'TARGET_CONTENT', target:r.id+' · '+r.title, changes:{ audience:CT.gateLabel(gate) } });
      Ripples.emit({ kind:'partner', screen:(r.kind==='kit'?'Sales kit':'Training library'), headline:'“'+r.title+'” targeting → '+CT.gateLabel(gate)+' — partner sees locked-with-reason if not matching' });
      C.toast({ type:'success', persist:true, title:'Targeting applied', text:r.title+' → '+CT.gateLabel(gate) });
      go('Y01');
    });
  }

  /* ===================== boot ===================== */
  function boot(screenId){ state.screen=screenId; state.params=new URLSearchParams(location.search); Audit.seed(CRM.auditSeed); mountShell(); renderMain(); }
  root.Content = { boot: boot, rerender: renderMain, SCREENS: SCREENS, go: go, href: href };
})(window);
