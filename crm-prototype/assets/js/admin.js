/* ============================================================================
 * Salmon CRM — Hardening / admin engine (Part 8)
 * ----------------------------------------------------------------------------
 * screens/S0x-T0x-U0x-V0x .html bootstrap Admin.boot('S01'). Almost everything
 * is Super-Admin only. Disciplines enforced here:
 *   - S01 reads the PERSISTED audit ledger (Audit.fullLog) — every action Parts
 *     1–7 emitted — and viewing S01 itself writes an audit entry,
 *   - every config / user mutation goes through a ConfirmDialog with an EFFECT
 *     SUMMARY and writes audit() old→new,
 *   - the notification template editor BLOCKS sensitive variables in payloads,
 *   - there are NO secrets, NO gateway credentials, NO staff passwords anywhere.
 * ==========================================================================*/
(function (root) {
  'use strict';
  var C = root.C, Perm = root.Perm, Audit = root.Audit, CRM = root.CRM, Router = root.Router,
      DevToolbar = root.DevToolbar, AD = root.CRM.Admin, Ripples = root.Ripples;

  root.CRM_NOW = '2026-07-15T10:00:00Z';
  var esc = C.esc, fmt = C.fmt;
  var state = { role: localStorage.getItem('crm_role') || Perm.ROLES.SUPER_ADMIN, render:'data', screen:null, params:null };
  function actor(){ return CRM.staff[state.role]; }
  function setRole(r){ state.role = r; localStorage.setItem('crm_role', r); }

  var FILES = {
    S01:'S01-audit-log.html', S02:'S02-audit-entry.html', S03:'S03-audit-export.html',
    T01:'T01-staff-users.html', T02:'T02-edit-user.html', T03:'T03-assign-role.html', T04:'T04-deactivate-user.html', T05:'T05-roles-overview.html', T06:'T06-impersonation-log.html',
    U01:'U01-config-home.html', U02:'U02-payment-gateways.html', U03:'U03-currency-rates.html', U04:'U04-booking-rules.html', U05:'U05-slot-rules.html', U06:'U06-providers.html', U07:'U07-feature-flags.html', U08:'U08-min-app-version.html', U09:'U09-session-policy.html', U10:'U10-invoice-template.html', U11:'U11-status-configuration.html',
    V01:'V01-templates-list.html', V02:'V02-template-detail.html', V03:'V03-test-send.html'
  };
  function href(id, params){
    var f=FILES[id]; if(!f) return '#';
    if(!params) return f;
    var qs=Object.keys(params).filter(function(k){return params[k]!=null&&params[k]!=='';}).map(function(k){return k+'='+encodeURIComponent(params[k]);}).join('&');
    return qs?f+'?'+qs:f;
  }
  function go(id, params){ location.href = href(id, params); }
  function sectionOf(sid){ return (sid||'S')[0]; }

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
  function areaName(sec){ return { S:'Audit log', T:'Users & roles', U:'Configuration', V:'Notification templates' }[sec]||'Admin'; }
  function areaHome(sec){ return { S:'S01', T:'T01', U:'U01', V:'V01' }[sec]||'S01'; }
  function renderTopbar(){
    var tb=document.getElementById('topbar'); if(!tb) return;
    var sc=SCREENS[state.screen]||{title:'Admin'}; var sec=sectionOf(state.screen); var s=actor();
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
      onReset:function(){ Ripples.reset(); Audit.clearPersisted(); C.toast({type:'info',title:'Mock data reset',text:'Config, users, and the persisted audit ledger restored to seed.'}); renderMain(); }
    }));
    document.getElementById('searchbtn').onclick=function(){ location.href='../index.html#/dashboard'; };
    document.getElementById('bell').onclick=function(){ C.toast({type:'info',title:'Notifications',text:'The notification centre lives on the console home (Part 1).'}); };
  }
  function renderSidebar(){
    var sb=document.getElementById('sidebar'); if(!sb) return;
    var sec=sectionOf(state.screen); var activeId={ S:'audit', T:'users', U:'settings', V:'settings' }[sec];
    var groups=Router.getSidebarFor(state.role);
    var MODMAP={ audit:'S01-audit-log.html', users:'T01-staff-users.html', settings:'U01-config-home.html', people:'B02-approval-queue.html', catalogue:'E01-projects-list.html', pipeline:'F01-leads-list.html', finance:'I01-webhook-queue.html', documents:'N01-document-repository.html', communications:'O01-ticket-inbox.html' };
    sb.innerHTML = groups.map(function(g){
      return '<div class="navgroup"><div class="gl">'+esc(g.title)+'</div>'+g.items.map(function(it){
        var active=it.id===activeId; var route=MODMAP[it.id]||('../index.html'+it.route);
        return '<a class="navitem'+(active?' active':'')+'" href="'+route+'"><span class="ic">'+it.icon+'</span><span class="lb">'+esc(it.label)+'</span>'+(it.count?'<span class="count">'+it.count+'</span>':'')+'</a>';
      }).join('')+'</div>';
    }).join('');
  }
  function renderFooter(){ var ft=document.getElementById('footer'); if(!ft)return; var s=actor();
    ft.innerHTML='<b style="color:var(--ink-2)">'+esc(s.name)+'</b> · '+Perm.ROLE_LABEL[state.role]+' · '+esc(s.office)+'<span class="spacer" style="flex:1"></span><span>Salmon Admin · Hardening (Part 8)</span>'; }
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
      Audit.audit({ actor:actor(), action:'ACCESS_DENIED', target:'Admin · '+sc.title });
      main.innerHTML=deniedPanel(sc.title, sc.perm); wireDenied(main); return;
    }
    if(state.render==='loading'){ main.innerHTML=header(sc)+skeleton(); return; }
    if(state.render==='error'){ main.innerHTML=header(sc)+statePanel('error'); return; }
    if(state.render==='offline'){ main.innerHTML=header(sc)+statePanel('offline'); return; }
    if(state.render==='empty'){ main.innerHTML=header(sc)+(sc.emptyState?sc.emptyState():C.EmptyState({title:'Nothing here'})); return; }
    try{ sc.render(main, state.params); }catch(e){ console.error(e); main.innerHTML=header(sc)+statePanel('error'); }
    updateFab();
  }
  function admnav(active){
    var items=[ ['S','Audit',href('S01')], ['T','Users & roles',href('T01')], ['U','Configuration',href('U01')], ['V','Templates',href('V01')] ];
    return '<div class="admnav">'+items.map(function(it){ return '<a class="'+(it[0]===active?'on':'')+'" href="'+it[2]+'">'+esc(it[1])+'</a>'; }).join('')+'</div>';
  }
  function header(sc){ return admnav(sectionOf(state.screen)) + C.PageHeader({ title:sc.title, sub:sc.sub }); }
  function deniedPanel(what, perm){
    return admnav(null)+'<div class="authwrap" style="min-height:auto;padding:40px 0"><div class="authcard denied" style="text-align:center">' +
      '<div class="mark" style="margin:0 auto 14px">⛔</div><h1>Access denied</h1>' +
      '<p>Your role — <b>'+Perm.ROLE_LABEL[state.role]+'</b> — cannot open <b>'+esc(what)+'</b>.'+(perm?' Required: <span class="mono">'+perm+'</span>.':'')+'<br>Hardening screens are Super-Admin only.</p>' +
      '<button class="btn primary" id="back-adm" style="width:auto;margin:4px auto 0">Back</button></div></div>';
  }
  function wireDenied(main){ var b=main.querySelector('#back-adm'); if(b) b.onclick=function(){ location.href='../index.html#/dashboard'; }; }
  function skeleton(){ var rows=Array(6).fill(0).map(function(){return '<div class="sk" style="height:34px;margin:6px 0"></div>';}).join(''); return '<div class="tablewrap" style="padding:10px">'+rows+'</div>'; }
  function statePanel(kind){ return C.EmptyState({icon:'⚠',title:kind==='offline'?'You’re offline':'Something went wrong',text:'This view failed to load.'}); }

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
        '<div class="mb">'+(cfg.intro||'')+fieldsHtml+'</div>'+
        (cfg.warn?'<div class="warn">⚠ '+esc(cfg.warn)+'</div>':'')+
        '<div class="mf"><button class="btn" data-x>Cancel</button><button class="btn '+(cfg.danger?'danger':'primary')+'" data-ok>'+esc(cfg.confirmLabel||'Confirm')+'</button></div></div></div>');
      function collect(){ var o={}; scrim.querySelectorAll('[data-fk]').forEach(function(i){ o[i.getAttribute('data-fk')]=i.value.trim(); }); return o; }
      function close(v){ scrim.remove(); document.removeEventListener('keydown',key); resolve(v); }
      function key(e){ if(e.key==='Escape') close(null); }
      scrim.addEventListener('click',function(e){ if(e.target===scrim) close(null); });
      scrim.querySelector('[data-x]').onclick=function(){ close(null); };
      scrim.querySelector('[data-ok]').onclick=function(){ var vals=collect(); var bad=(cfg.fields||[]).filter(function(f){return f.required&&!vals[f.key];});
        if(bad.length){ var f0=scrim.querySelector('[data-fk="'+bad[0].key+'"]'); if(f0){f0.style.borderColor='var(--red)';f0.focus();} C.toast({type:'warning',title:'A required field is empty'}); return; } close(vals); };
      document.addEventListener('keydown',key); document.body.appendChild(scrim);
      var first=scrim.querySelector('[data-fk],[data-ok]'); if(first) first.focus();
    });
  }

  /* ===================== helpers ===================== */
  function readOv(){ try{ return JSON.parse(localStorage.getItem('crm_people_mut')||'{}'); }catch(e){ return {}; } }
  function setCfg(path, val){ var full=readOv(); full['cfg:'+path]=val; try{ localStorage.setItem('crm_people_mut', JSON.stringify(full)); }catch(e){} }
  function setOv(key, val){ var full=readOv(); full[key]=val; try{ localStorage.setItem('crm_people_mut', JSON.stringify(full)); }catch(e){} }
  function auditNote(id){ var n=C.el(C.AuditNote({actor:actor().name,when:root.CRM_NOW})); n.querySelector('.lk').onclick=function(){ go('S01'); }; return n; }
  function wireEmpty(main, screen){ var b=main.querySelector('[data-empty-act]'); if(b) b.onclick=function(){ go(screen); }; }

  /* prettify an action for the log */
  function prettyAction(a){ return String(a||'').replace(/_/g,' ').toLowerCase().replace(/^./,function(c){return c.toUpperCase();}); }

  var SCREENS = {};

  /* ===================== S — Audit log ===================== */

  /* ---------- S01 · Audit log ⭐ ---------- */
  SCREENS.S01 = { title:'Audit log', sub:'Every action, every module — the all-actions ledger', perm:'VIEW_AUDIT_LOG',
    render:function(main){
      // viewing the audit log is itself an audit event
      Audit.audit({ actor:actor(), action:'VIEW_AUDIT_LOG', target:'Audit log opened' });
      var log = Audit.fullLog();
      main.innerHTML = admnav('S') + C.PageHeader({ title:this.title, sub:this.sub, actions:[{ id:'exp', label:'Export', cls:'', icon:'⭳' }] });
      main.querySelector('[data-act="exp"]').onclick=function(){ go('S03'); };
      main.insertAdjacentHTML('beforeend','<div class="gravebanner"><span class="ic">⚖</span><div><b>You are viewing the audit log.</b> This view is itself logged — accessing the ledger is an audit event. Entries are immutable and retained per policy (retention undefined — OPEN_QUESTIONS #4).</div></div>');
      var wrap=C.el('<div class="auditwrap"></div>'); main.appendChild(wrap);
      var search=C.el('<div class="audsearch">🔎 <input id="audq" placeholder="Search every audit entry — action, actor, target…"></div>'); wrap.appendChild(search);
      var fbWrap=C.el('<div></div>'); wrap.appendChild(fbWrap);
      var tableWrap=C.el('<div></div>'); wrap.appendChild(tableWrap);
      C.FilterBar(fbWrap, { id:'s01', filters:[
        { key:'actor', label:'Actor', options:uniq(log.map(function(r){return r.actor;})) },
        { key:'role', label:'Role', options:uniq(log.map(function(r){return Perm.ROLE_LABEL[r.actorRole]||r.actorRole;})) },
        { key:'action', label:'Action', options:uniq(log.map(function(r){return r.action;})) },
        { key:'from', label:'From', type:'date' }
      ], onChange:draw });
      var q='';
      document.getElementById('audq').addEventListener('input', function(){ q=this.value.toLowerCase(); draw(); });
      function filtered(){ var f=C.getFilters('s01'); return log.filter(function(r){
        if (f.actor && r.actor!==f.actor) return false;
        if (f.role && (Perm.ROLE_LABEL[r.actorRole]||r.actorRole)!==f.role) return false;
        if (f.action && r.action!==f.action) return false;
        if (f.from && r.timestamp.slice(0,10) < f.from) return false;
        if (q && (r.action+' '+r.actor+' '+r.target+' '+(r.actorRole||'')).toLowerCase().indexOf(q)<0) return false;
        return true; }); }
      function draw(){
        C.mountDataTable(tableWrap, { rowId:'id', noun:'entries', rows:filtered(), columns:[
          { key:'timestamp', label:'Timestamp', render:function(r){ return '<span class="ts">'+esc(fmt.dhaka(r.timestamp,true).replace(' (Dhaka)',''))+'</span>'; } },
          { key:'actor', label:'Actor', strong:true },
          { key:'actorRole', label:'Role', render:function(r){ return Perm.ROLE_LABEL[r.actorRole]||esc(r.actorRole); } },
          { key:'action', label:'Action', render:function(r){ return '<span class="act">'+esc(prettyAction(r.action))+'</span>'; } },
          { key:'target', label:'Target', render:function(r){ return esc(r.target||'—'); } },
          { key:'changes', label:'Summary', render:function(r){ return r.changes?'<span class="muted" style="font-size:11.5px">'+esc(summarize(r.changes))+'</span>':'<span class="muted">—</span>'; } }
        ], rowActions:[ { label:'Open entry', icon:'↗', onClick:function(r){ go('S02',{id:r.id}); } } ], onRowClick:function(r){ go('S02',{id:r.id}); } });
      }
      draw();
      wrap.insertAdjacentHTML('beforeend','<p class="metaline" style="margin-top:12px">'+log.length+' entries in the ledger. Everything Parts 1–7 emitted persists here — approvals, verifications, config changes, denials.</p>');
    }
  };
  function uniq(a){ var o=[]; a.forEach(function(x){ if(x&&o.indexOf(x)<0)o.push(x); }); return o; }
  function summarize(ch){ if(!ch) return ''; return Object.keys(ch).map(function(k){ var v=ch[k]; if(v&&typeof v==='object') v=JSON.stringify(v); return k+': '+v; }).join(' · ').slice(0,80); }

  /* ---------- S02 · Audit entry detail ---------- */
  SCREENS.S02 = { title:'Audit entry', perm:'VIEW_AUDIT_LOG',
    render:function(main, P){
      var id=P.get('id'); var rec=Audit.fullLog().filter(function(r){return r.id===id;})[0] || Audit.fullLog()[0];
      main.innerHTML = header(this);
      if(!rec){ main.insertAdjacentHTML('beforeend', C.EmptyState({ title:'Entry not found', actionLabel:'Audit log' })); wireEmpty(main,'S01'); return; }
      main.insertAdjacentHTML('beforeend','<div class="card"><h3>'+esc(rec.id)+'</h3><dl class="kv"><dt>Action</dt><dd><b>'+esc(prettyAction(rec.action))+'</b></dd><dt>Actor</dt><dd>'+esc(rec.actor)+' · '+(Perm.ROLE_LABEL[rec.actorRole]||rec.actorRole)+'</dd><dt>Target</dt><dd>'+esc(rec.target||'—')+'</dd><dt>Timestamp</dt><dd class="mono">'+esc(fmt.dhaka(rec.timestamp,true))+'</dd></dl></div>');
      if (rec.changes){
        var rows=Object.keys(rec.changes).map(function(k){ var v=rec.changes[k];
          if (k==='from' || k==='old'){ return null; }
          if (rec.changes.from!==undefined && (k==='to')){ return '<div class="diffrow"><div class="k">value</div><div class="old">'+esc(fmtv(rec.changes.from))+'</div><div class="new">'+esc(fmtv(rec.changes.to))+'</div></div>'; }
          return '<div class="diffrow"><div class="k">'+esc(k)+'</div><div class="arrowcol" style="grid-column:2 / span 2;text-align:left;color:var(--ink-2);font-family:var(--mono);font-size:11.5px">'+esc(fmtv(v))+'</div></div>';
        }).filter(Boolean).join('');
        main.insertAdjacentHTML('beforeend','<div class="sectitle">Change detail — old → new</div><div class="diffbox">'+(rows||'<div class="diffrow"><div class="k">—</div><div style="grid-column:2 / span 2">No structured diff.</div></div>')+'</div>');
      } else {
        main.insertAdjacentHTML('beforeend','<p class="metaline">No structured change payload on this entry (e.g. a view or access event).</p>');
      }
      main.insertAdjacentHTML('beforeend','<div class="primaryacts" style="margin-top:14px"><a class="btn" href="'+href('S01')+'">Back to log</a></div>');
    }
  };
  function fmtv(v){ if(v&&typeof v==='object') return JSON.stringify(v); return String(v); }

  /* ---------- S03 · Audit export ---------- */
  SCREENS.S03 = { title:'Audit log export', sub:'CSV export · the export itself is audited', perm:'EXPORT_AUDIT_LOG',
    render:function(main){
      main.innerHTML = header(this);
      main.insertAdjacentHTML('beforeend','<div class="card"><h3>Export the audit ledger</h3><p class="hint" style="margin-bottom:10px">CSV export, filterable by date. Super-Admin only in the prototype (OPEN_QUESTIONS #5). Every export writes its own audit entry with the filters used.</p>'+
        '<div class="field" style="max-width:220px"><label>From date (optional)</label><input type="date" id="from"></div>'+
        '<div class="primaryacts"><button class="btn primary" id="exp">Export CSV</button><a class="btn" href="'+href('S01')+'">Back to log</a></div></div>');
      document.getElementById('exp').onclick=function(){
        Perm.requirePermission(state.role,'EXPORT_AUDIT_LOG');
        var from=document.getElementById('from').value;
        var rows=Audit.fullLog().filter(function(r){ return !from || r.timestamp.slice(0,10)>=from; });
        var csv=['id,timestamp,actor,role,action,target'].concat(rows.map(function(r){ return [r.id, r.timestamp, r.actor, r.actorRole, r.action, '"'+String(r.target).replace(/"/g,'""')+'"'].join(','); })).join('\n');
        try{ var b=new Blob([csv],{type:'text/csv'}); var u=URL.createObjectURL(b); var a=document.createElement('a'); a.href=u; a.download='audit-log.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u); }catch(e){}
        Audit.audit({ actor:actor(), action:'EXPORT_AUDIT_LOG', target:rows.length+' entries', changes:{ from:from||'all', rows:rows.length } });
        C.toast({ type:'success', persist:true, title:'Audit log exported', text:rows.length+' entries · this export is itself logged.' });
        go('S01');
      };
    }
  };

  /* ===================== T — Users & roles ===================== */

  /* ---------- T01 · Staff users list ---------- */
  SCREENS.T01 = { title:'Staff users', sub:'Never deleted — only deactivated', perm:'VIEW_USERS',
    render:function(main){
      main.innerHTML = admnav('T') + C.PageHeader({ title:this.title, sub:this.sub, actions:[{ id:'new', label:'Create staff user', cls:'primary', icon:'＋' }] });
      main.querySelector('[data-act="new"]').onclick=function(){ go('T02'); };
      var tw=C.el('<div></div>'); main.appendChild(tw);
      var draw=function(){ C.mountDataTable(tw, { rowId:'id', noun:'users', defaultSort:'name', rows:AD.allUsers(), columns:[
        { key:'name', label:'Name', strong:true, sortable:true },
        { key:'email', label:'Email' },
        { key:'role', label:'Role', render:function(r){ return Perm.ROLE_LABEL[r.role]||r.role; } },
        { key:'office', label:'Office' },
        { key:'status', label:'Status', render:function(r){ return r.status==='active'?'<span class="chip green"><span class="d"></span>Active</span>':'<span class="chip red"><span class="d"></span>Deactivated</span>'; } },
        { key:'lastActiveUtc', label:'Last active', render:function(r){ return fmt.dhaka(r.lastActiveUtc,true); } }
      ], rowActions:[
        { label:'Edit', icon:'✎', onClick:function(r){ go('T02',{id:r.id}); } },
        { label:'Assign role', icon:'◆', onClick:function(r){ go('T03',{id:r.id}); } },
        { label:'Deactivate', icon:'⊘', danger:true, disabled:function(r){ return r.status!=='active'; }, onClick:function(r){ go('T04',{id:r.id}); } }
      ] }); };
      draw();
      main.insertAdjacentHTML('beforeend','<p class="metaline" style="margin-top:12px">No password fields anywhere — real auth is SSO/MFA. No "delete user" — deactivation only; audit history follows a user forever.</p>');
    }
  };

  /* ---------- T02 · Create / edit staff user ---------- */
  SCREENS.T02 = { title:'Create / edit staff user', perm:'MANAGE_STAFF_USER',
    render:function(main, P){
      var u = P.get('id') ? AD.userById(P.get('id')) : null;
      main.innerHTML = header(this);
      main.insertAdjacentHTML('beforeend','<div class="card"><h3>'+(u?'Edit '+esc(u.name):'New staff user')+'</h3><p class="hint" style="margin-bottom:10px">No password field — accounts authenticate via SSO/MFA (OPEN_QUESTIONS #1).</p><div class="primaryacts"><button class="btn primary" id="go">'+(u?'Edit details…':'Create user…')+'</button><a class="btn" href="'+href('T01')+'">All users</a></div></div>');
      document.getElementById('go').onclick=function(){
        formDialog({ title:u?'Edit staff user':'Create staff user', width:500,
          fields:[ { type:'text', key:'name', label:'Full name', required:true, value:u?u.name:'' },
            { type:'text', key:'email', label:'Work email', required:true, value:u?u.email:'', placeholder:'name@salmondevelopers.bd' },
            { type:'select', key:'role', label:'Role', options:AD.ROLE_LIST.map(function(r){return {value:r,label:Perm.ROLE_LABEL[r]};}), value:u?u.role:AD.ROLE_LIST[1] },
            { type:'text', key:'office', label:'Office', value:u?u.office:'Dhaka Head Office' } ],
          intro:'<p class="hint" style="margin-bottom:4px">The account is provisioned; the person signs in via SSO. No password is set here.</p>',
          warn:'Creating or editing a staff account changes who can act in the panel.', confirmLabel:u?'Save changes':'Create user' }).then(function(v){
          if(!v) return;
          Perm.requirePermission(state.role,'MANAGE_STAFF_USER');
          if (u){ setOv('usr:'+u.id, Object.assign({}, AD.userById(u.id), { name:v.name, email:v.email, role:v.role, office:v.office }));
            Audit.audit({ actor:actor(), action:'EDIT_STAFF_USER', target:u.id+' · '+v.name, changes:{ role:v.role, office:v.office } }); C.toast({type:'success',title:'User updated',text:v.name}); }
          else { var id='U-'+String(100+AD.allUsers().length); var rec={ id:id, name:v.name, email:v.email, role:v.role, office:v.office, status:'active', lastActiveUtc:root.CRM_NOW, createdUtc:root.CRM_NOW };
            setOv('usrAdd', [rec].concat(readOv()['usrAdd']||[])); Audit.audit({ actor:actor(), action:'CREATE_STAFF_USER', target:id+' · '+v.name, changes:{ role:v.role } }); C.toast({type:'success',title:'Staff user created',text:v.name+' · '+Perm.ROLE_LABEL[v.role]}); }
          go('T01');
        });
      };
    }
  };

  /* ---------- T03 · Assign role ---------- */
  SCREENS.T03 = { title:'Assign role', perm:'ASSIGN_ROLE',
    render:function(main, P){
      var u = P.get('id') ? AD.userById(P.get('id')) : AD.allUsers()[0];
      main.innerHTML = header(this);
      if(!u){ main.insertAdjacentHTML('beforeend', C.EmptyState({title:'User not found'})); return; }
      main.insertAdjacentHTML('beforeend','<div class="card"><h3>'+esc(u.name)+'</h3><dl class="kv"><dt>Current role</dt><dd>'+Perm.ROLE_LABEL[u.role]+'</dd></dl><div class="primaryacts"><button class="btn primary" id="go">Change role…</button></div></div>');
      document.getElementById('go').onclick=function(){
        formDialog({ title:'Assign role', intro:'<div class="effectbox">Current <b>'+Perm.ROLE_LABEL[u.role]+'</b></div>',
          fields:[ { type:'select', key:'role', label:'New role', options:AD.ROLE_LIST.map(function(r){return {value:r,label:Perm.ROLE_LABEL[r]};}), value:u.role },
            { type:'html', html:'<div class="effectbox">A role change instantly alters what this user can see and do across every module.</div>' } ],
          warn:'This ripples across the whole panel. It is audited old→new.', confirmLabel:'Assign role' }).then(function(v){
          if(!v || v.role===u.role) return;
          Perm.requirePermission(state.role,'ASSIGN_ROLE');
          setOv('usr:'+u.id, Object.assign({}, AD.userById(u.id), { role:v.role }));
          Audit.audit({ actor:actor(), action:'ASSIGN_ROLE', target:u.id+' · '+u.name, changes:{ from:u.role, to:v.role } });
          C.toast({ type:'success', title:'Role assigned', text:u.name+': '+Perm.ROLE_LABEL[u.role]+' → '+Perm.ROLE_LABEL[v.role] });
          go('T01');
        });
      };
      main.appendChild(auditNote(u.id));
    }
  };

  /* ---------- T04 · Deactivate user ---------- */
  SCREENS.T04 = { title:'Deactivate user', perm:'DEACTIVATE_USER',
    render:function(main, P){
      var u = P.get('id') ? AD.userById(P.get('id')) : AD.allUsers().filter(function(x){return x.status==='active';})[0];
      main.innerHTML = header(this);
      if(!u){ main.insertAdjacentHTML('beforeend', C.EmptyState({title:'User not found'})); return; }
      main.insertAdjacentHTML('beforeend','<div class="warnbanner">⚠ Users are never deleted — only deactivated. '+esc(u.name)+'’s audit history is preserved forever and remains attributable.</div>');
      main.insertAdjacentHTML('beforeend','<div class="card"><h3>'+esc(u.name)+' · '+Perm.ROLE_LABEL[u.role]+'</h3><div class="primaryacts"><button class="btn danger" id="go"'+(u.status!=='active'?' disabled':'')+'>Deactivate '+esc(u.name)+'</button></div></div>');
      document.getElementById('go').onclick=function(){
        formDialog({ title:'Deactivate user', danger:true, intro:'<p class="hint">Revokes '+esc(u.name)+'’s access immediately. Reversible by reactivation; the account is never deleted.</p>',
          fields:[ { type:'textarea', key:'reason', label:'Reason', required:true, placeholder:'e.g. Left the company — access revoked.' } ],
          warn:'This immediately signs the user out of every session.', confirmLabel:'Deactivate user' }).then(function(v){
          if(!v) return;
          Perm.requirePermission(state.role,'DEACTIVATE_USER');
          setOv('usr:'+u.id, Object.assign({}, AD.userById(u.id), { status:'deactivated', deactivatedReason:v.reason, deactivatedUtc:root.CRM_NOW }));
          Audit.audit({ actor:actor(), action:'DEACTIVATE_USER', target:u.id+' · '+u.name, changes:{ from:'active', to:'deactivated', reason:v.reason } });
          C.toast({ type:'warning', title:'User deactivated', text:u.name+' — access revoked.' });
          go('T01');
        });
      };
    }
  };

  /* ---------- T05 · Roles overview (permission matrix) ---------- */
  SCREENS.T05 = { title:'Roles overview', sub:'Which role holds which permission (fixed role set)', perm:'VIEW_USERS',
    render:function(main){
      main.innerHTML = header(this);
      main.insertAdjacentHTML('beforeend','<p class="metaline">Roles are a fixed set — no custom-role creation (out of scope). Every permission maps to the roles that hold it.</p>');
      var roles=AD.ROLE_LIST; var actions=Object.keys(Perm.CAN);
      var head='<thead><tr><th class="gw" style="text-align:left">Permission</th>'+roles.map(function(r){ return '<th>'+Perm.ROLE_LABEL[r]+'</th>'; }).join('')+'</tr></thead>';
      var body='<tbody>'+actions.map(function(a){ return '<tr><td class="gw" style="text-align:left"><span class="mono" style="font-size:11px">'+esc(a)+'</span></td>'+roles.map(function(r){ return '<td>'+(Perm.can(r,a)?'<span style="color:var(--green);font-weight:800">✓</span>':'<span style="color:var(--line-strong)">·</span>')+'</td>'; }).join('')+'</tr>'; }).join('')+'</tbody>';
      main.insertAdjacentHTML('beforeend','<div class="tablewrap" style="overflow:auto"><table class="gwmatrix">'+head+body+'</table></div>');
    }
  };

  /* ---------- T06 · Impersonation log ---------- */
  SCREENS.T06 = { title:'Impersonation log', sub:'“View as another user” — if enabled', perm:'VIEW_AUDIT_LOG',
    render:function(main){
      main.innerHTML = header(this);
      main.insertAdjacentHTML('beforeend','<div class="warnbanner">Impersonation is <b>not enabled</b> in the prototype. Whether Super Admin may "view as" another user for support is undefined (OPEN_QUESTIONS #3). If enabled, every impersonated action is <b>double-audited</b> (as the impersonator and the impersonated).</div>');
      main.insertAdjacentHTML('beforeend', C.EmptyState({ icon:'○', title:'No impersonation sessions', text:'This log is empty because impersonation is disabled. The mechanism is designed but not switched on.' }));
    }
  };

  /* ===================== U — Configuration ===================== */

  /* ---------- U01 · Config home ---------- */
  SCREENS.U01 = { title:'System configuration', sub:'Grouped panels · every change is high-consequence and audited', perm:'MANAGE_CONFIG',
    render:function(main){
      main.innerHTML = admnav('U') + C.PageHeader({ title:this.title, sub:this.sub });
      var cfg=AD.getConfig();
      var panels=[
        ['U02','Payment gateways','Enable/disable per country · test vs live', gwSummary(cfg)],
        ['U03','Currency & exchange rates','Display currencies, source, rounding', cfg.currency.base+' base · '+cfg.currency.display.length+' currencies'],
        ['U04','Inventory & booking rules','Token defaults, lock duration', fmt.bdt(cfg.booking.tokenDefaultBdt)+' · '+cfg.booking.lockDurationHours+'h lock'],
        ['U05','Consultation slot rules','Duration, buffer, booking horizon', cfg.slots.durationMins+'min · '+cfg.slots.horizonDays+'d horizon'],
        ['U06','Chat & meeting provider','WhatsApp-vs-in-app, Zoom-vs-Meet', cfg.providers.meeting+' · chat TBD'],
        ['U07','Feature flags','Per-module on/off', Object.keys(cfg.features).filter(function(k){return cfg.features[k];}).length+' of '+Object.keys(cfg.features).length+' on'],
        ['U08','Minimum app version','Drives the force-update screen', cfg.minAppVersion],
        ['U09','Session policy','Timeout, concurrent sessions, MFA', cfg.session.timeoutMins+'min · '+cfg.session.maxConcurrent+' sessions'],
        ['U10','Invoice template','Numbering, tax, legal wording', cfg.invoice.prefix+'####'],
        ['U11','Status configuration','The basic status sets every module reads', statusSummary()]
      ];
      var grid=C.el('<div class="confgrid"></div>'); main.appendChild(grid);
      panels.forEach(function(p){ var card=C.el('<div class="confcard"><div class="ct">'+esc(p[1])+'</div><div class="cd">'+esc(p[2])+'</div><div class="cv">'+esc(p[3])+'</div></div>'); card.onclick=function(){ go(p[0]); }; grid.appendChild(card); });
    }
  };
  function gwSummary(cfg){ var on=0,tot=0; Object.keys(cfg.gateways).forEach(function(g){ AD.COUNTRIES.forEach(function(c){ tot++; if(cfg.gateways[g].countries[c]) on++; }); }); return on+' of '+tot+' gateway×country enabled'; }

  /* ---------- U02 · Payment gateways ⭐ (per-country toggle) ---------- */
  SCREENS.U02 = { title:'Payment gateways', sub:'Enable/disable per country · no credentials in the panel', perm:'SET_GATEWAY_STATUS',
    render:function(main){
      main.innerHTML = header(this);
      main.insertAdjacentHTML('beforeend','<p class="metaline">Gateway <b>credentials never live here</b> — they belong in a locked-down secrets manager. This screen sets <b>enablement</b> only. Each toggle is a confirmed, audited change.</p>');
      var host=C.el('<div class="tablewrap" style="overflow:auto"></div>'); main.appendChild(host);
      function draw(){
        var cfg=AD.getConfig();
        var head='<thead><tr><th class="gw" style="text-align:left">Gateway</th>'+AD.COUNTRIES.map(function(c){ return '<th>'+esc(c)+'</th>'; }).join('')+'</tr></thead>';
        var body='<tbody>'+Object.keys(cfg.gateways).map(function(g){ var G=cfg.gateways[g];
          return '<tr><td class="gw">'+esc(g)+'<span class="mode '+G.mode+'">'+G.mode+'</span></td>'+AD.COUNTRIES.map(function(c){ var on=!!G.countries[c]; return '<td><button class="gwtoggle'+(on?' on':'')+'" data-g="'+esc(g)+'" data-c="'+esc(c)+'" data-on="'+on+'" title="'+(on?'Enabled':'Disabled')+'"></button></td>'; }).join('')+'</tr>';
        }).join('')+'</tbody>';
        host.innerHTML='<table class="gwmatrix">'+head+body+'</table>';
        host.querySelectorAll('.gwtoggle').forEach(function(t){ t.onclick=function(){ toggleGateway(t.getAttribute('data-g'), t.getAttribute('data-c'), t.getAttribute('data-on')==='true', draw); }; });
      }
      draw();
      main.appendChild(auditNote('gateways'));
    }
  };
  function toggleGateway(g, country, currentlyOn, after){
    var turningOff=currentlyOn;
    C.confirmDialog({ title:(turningOff?'Disable ':'Enable ')+g+' in '+country+'?', danger:turningOff,
      body:'<p><b>'+esc(turningOff?'Disabling':'Enabling')+' '+esc(g)+' in '+esc(country)+'</b> will '+(turningOff?'remove it from':'add it to')+' the payment channel selection on <b>screen 40</b> for clients whose country is '+esc(country)+'. The client mobile app reflects this on its next config fetch.</p>',
      warn:'This changes what real clients can pay with. Audited old→new.', confirmLabel:(turningOff?'Disable':'Enable')+' '+g }).then(function(ok){
      if(!ok) return;
      Perm.requirePermission(state.role,'SET_GATEWAY_STATUS');
      setCfg('gateways.'+g+'.countries.'+country, !currentlyOn);
      Audit.audit({ actor:actor(), action:'SET_GATEWAY_STATUS', target:g+' · '+country, changes:{ from:currentlyOn?'enabled':'disabled', to:currentlyOn?'disabled':'enabled' } });
      Ripples.emit({ kind:'client', screen:'Screen 40 · payment channels', headline:g+' '+(currentlyOn?'disabled':'enabled')+' in '+country+' — client payment options update on next config fetch' });
      C.toast({ type:'success', title:g+(currentlyOn?' disabled':' enabled')+' · '+country, text:'Clients in '+country+' see the updated channel list.', ripple:'screen 40 payment channels updated' });
      after && after();
    });
  }

  /* ---------- U03 · Currency & rates ---------- */
  SCREENS.U03 = { title:'Currency & exchange rates', perm:'MANAGE_CONFIG',
    render:function(main){
      main.innerHTML = header(this); var cfg=AD.getConfig();
      main.insertAdjacentHTML('beforeend','<div class="card"><h3>Display & source</h3><dl class="kv"><dt>Base currency</dt><dd>'+cfg.currency.base+'</dd><dt>Display currencies</dt><dd>'+cfg.currency.display.join(', ')+'</dd><dt>Rate source</dt><dd>'+esc(cfg.currency.source)+'</dd><dt>Rounding</dt><dd>'+esc(cfg.currency.rounding)+'</dd></dl><p class="hint" style="margin-top:8px">Exchange-rate source (auto feed vs manual) is undefined — OPEN_QUESTIONS #9.</p></div>');
      var card=C.el('<div class="card"><h3>Rates (per '+cfg.currency.base+')</h3></div>'); main.appendChild(card);
      Object.keys(cfg.currency.rates).forEach(function(cur){ var row=C.el('<div class="cfgrow"><span class="cl">1 '+cur+' =</span><span class="cval">'+cfg.currency.rates[cur]+' '+cfg.currency.base+'</span><button class="btn sm">Edit</button></div>');
        row.querySelector('button').onclick=function(){ editCfg('currency.rates.'+cur, cfg.currency.rates[cur], 'Rate for '+cur, 'SET_EXCHANGE_RATE', cur, function(){ renderMain(); }); }; card.appendChild(row); });
      main.appendChild(auditNote('currency'));
    }
  };
  function editCfg(path, current, label, action, targetName, after){
    formDialog({ title:'Edit '+label, intro:'<div class="effectbox">Current <b>'+esc(String(current))+'</b></div>',
      fields:[ { type:'text', key:'v', label:'New value', required:true, value:String(current) } ],
      warn:'This config change is audited old→new.', confirmLabel:'Save change' }).then(function(v){
      if(!v || v.v===String(current)) return;
      Perm.requirePermission(state.role,'MANAGE_CONFIG');
      var nv = /^\d+(\.\d+)?$/.test(v.v) ? Number(v.v) : v.v;
      setCfg(path, nv);
      Audit.audit({ actor:actor(), action:action||'UPDATE_CONFIG', target:targetName||path, changes:{ from:current, to:nv } });
      C.toast({ type:'success', title:'Config updated', text:label+': '+current+' → '+nv });
      after && after();
    });
  }

  /* ---------- U04 · Booking rules ---------- */
  SCREENS.U04 = { title:'Inventory & booking rules', perm:'MANAGE_CONFIG',
    render:function(main){
      main.innerHTML = header(this); var cfg=AD.getConfig();
      var card=C.el('<div class="card"><h3>Booking rules</h3></div>'); main.appendChild(card);
      card.appendChild(cfgEditor('Default booking token (BDT)', fmt.bdt(cfg.booking.tokenDefaultBdt), 'booking.tokenDefaultBdt', cfg.booking.tokenDefaultBdt, 'SET_TOKEN_DEFAULT'));
      card.appendChild(cfgEditor('Unit lock duration (hours)', cfg.booking.lockDurationHours+'h', 'booking.lockDurationHours', cfg.booking.lockDurationHours, 'SET_LOCK_DURATION'));
      main.insertAdjacentHTML('beforeend','<p class="metaline" style="margin-top:12px">What happens when a lock expires while payment is pending is a business rule (Part-5 OPEN_QUESTIONS #3).</p>');
      main.appendChild(auditNote('booking'));
    }
  };
  function cfgEditor(label, display, path, current, action){
    var row=C.el('<div class="cfgrow"><span class="cl">'+esc(label)+'</span><span class="cval">'+esc(display)+'</span><button class="btn sm">Edit</button></div>');
    row.querySelector('button').onclick=function(){ editCfg(path, current, label, action, label, function(){ renderMain(); }); };
    return row;
  }

  /* ---------- U05 · Slot rules ---------- */
  SCREENS.U05 = { title:'Consultation slot rules', perm:'MANAGE_CONFIG',
    render:function(main){
      main.innerHTML = header(this); var cfg=AD.getConfig();
      var card=C.el('<div class="card"><h3>Slot rules</h3></div>'); main.appendChild(card);
      card.appendChild(cfgEditor('Default duration (mins)', cfg.slots.durationMins+' min', 'slots.durationMins', cfg.slots.durationMins, 'SET_SLOT_DURATION'));
      card.appendChild(cfgEditor('Buffer between slots (mins)', cfg.slots.bufferMins+' min', 'slots.bufferMins', cfg.slots.bufferMins, 'SET_SLOT_BUFFER'));
      card.appendChild(cfgEditor('Booking horizon (days)', cfg.slots.horizonDays+' days', 'slots.horizonDays', cfg.slots.horizonDays, 'SET_SLOT_HORIZON'));
      card.appendChild(cfgEditor('Cancellation window (hours)', cfg.slots.cancellationHours+'h', 'slots.cancellationHours', cfg.slots.cancellationHours, 'SET_SLOT_CANCEL'));
      main.appendChild(auditNote('slots'));
    }
  };

  /* ---------- U06 · Providers ---------- */
  SCREENS.U06 = { title:'Chat & meeting provider', perm:'MANAGE_CONFIG',
    render:function(main){
      main.innerHTML = header(this); var cfg=AD.getConfig();
      var card=C.el('<div class="card"><h3>Providers</h3><p class="hint" style="margin-bottom:8px">The chat decision blocks mobile screen 58 (OPEN_QUESTIONS #6).</p></div>'); main.appendChild(card);
      var chatRow=C.el('<div class="cfgrow"><span class="cl">Chat provider</span><span class="cval">'+esc(cfg.providers.chat)+'</span><button class="btn sm">Set</button></div>');
      chatRow.querySelector('button').onclick=function(){ pickCfg('providers.chat', cfg.providers.chat, 'Chat provider', ['WhatsApp Business API','In-app provider console','Undecided (WhatsApp Business API vs in-app)'], 'SET_CHAT_PROVIDER'); };
      var meetRow=C.el('<div class="cfgrow"><span class="cl">Meeting provider</span><span class="cval">'+esc(cfg.providers.meeting)+'</span><button class="btn sm">Set</button></div>');
      meetRow.querySelector('button').onclick=function(){ pickCfg('providers.meeting', cfg.providers.meeting, 'Meeting provider', ['Zoom','Google Meet','Microsoft Teams'], 'SET_MEETING_PROVIDER'); };
      card.appendChild(chatRow); card.appendChild(meetRow);
      main.appendChild(auditNote('providers'));
    }
  };
  function pickCfg(path, current, label, options, action){
    formDialog({ title:'Set '+label, intro:'<div class="effectbox">Current <b>'+esc(current)+'</b></div>', fields:[ { type:'select', key:'v', label:label, options:options, value:current } ], warn:'Changing the provider changes the mobile integration seam. Audited.', confirmLabel:'Save' }).then(function(v){
      if(!v || v.v===current) return; Perm.requirePermission(state.role,'MANAGE_CONFIG'); setCfg(path, v.v);
      Audit.audit({ actor:actor(), action:action||'UPDATE_CONFIG', target:label, changes:{ from:current, to:v.v } });
      C.toast({ type:'success', title:label+' set', text:v.v }); renderMain();
    });
  }

  /* ---------- U07 · Feature flags ---------- */
  SCREENS.U07 = { title:'Feature flags', sub:'Per-module on/off · no experimentation platform', perm:'MANAGE_CONFIG',
    render:function(main){
      main.innerHTML = header(this);
      var card=C.el('<div class="card"><h3>Modules</h3></div>'); main.appendChild(card);
      function draw(){ var cfg=AD.getConfig(); card.querySelectorAll('.flagrow').forEach(function(n){n.remove();});
        Object.keys(cfg.features).forEach(function(k){ var on=cfg.features[k]; var row=C.el('<div class="flagrow"><span class="fn">'+esc(k.replace(/([A-Z])/g,' $1'))+'</span><button class="gwtoggle'+(on?' on':'')+'"></button></div>');
          row.querySelector('button').onclick=function(){ toggleFlag(k, on, draw); }; card.appendChild(row); }); }
      draw();
      main.insertAdjacentHTML('beforeend','<p class="metaline" style="margin-top:12px">With-Investment stays off until legal delivers the commercial rules (amber-locked module).</p>');
      main.appendChild(auditNote('features'));
    }
  };
  function toggleFlag(k, on, after){
    C.confirmDialog({ title:(on?'Disable ':'Enable ')+k+' module?', danger:on, body:'<p>'+(on?'Disabling':'Enabling')+' the <b>'+esc(k)+'</b> module '+(on?'hides it from every role’s navigation and blocks its routes.':'makes it available to permitted roles.')+'</p>', warn:'Module-level change. Audited old→new.', confirmLabel:(on?'Disable':'Enable')+' module' }).then(function(ok){
      if(!ok) return; Perm.requirePermission(state.role,'MANAGE_CONFIG'); setCfg('features.'+k, !on);
      Audit.audit({ actor:actor(), action:'SET_FEATURE_FLAG', target:k, changes:{ from:on?'on':'off', to:on?'off':'on' } });
      C.toast({ type:'success', title:k+(on?' disabled':' enabled') }); after && after();
    });
  }

  /* ---------- U08 · Minimum app version ⭐ ---------- */
  SCREENS.U08 = { title:'Minimum supported app version', sub:'Tiny screen, huge consequence', perm:'SET_MIN_APP_VERSION',
    render:function(main){
      main.innerHTML = header(this); var cfg=AD.getConfig();
      main.insertAdjacentHTML('beforeend','<div class="versionbox"><div class="cur">'+esc(cfg.minAppVersion)+'</div><div class="lb">current minimum supported version</div></div>');
      main.insertAdjacentHTML('beforeend','<div class="primaryacts" style="margin-top:14px"><button class="btn primary" id="raise">Change minimum version…</button></div>');
      document.getElementById('raise').onclick=function(){
        formDialog({ title:'Change minimum app version', width:460,
          intro:'<div class="warnbanner" style="margin:0 0 8px">⚠ This is the one config that immediately locks users out.</div><div class="effectbox">Current minimum <b>'+esc(cfg.minAppVersion)+'</b></div>',
          fields:[ { type:'text', key:'v', label:'New minimum version', required:true, value:cfg.minAppVersion, placeholder:'e.g. 1.5.0' } ],
          warn:'Devices running below the new version will see the force-update screen (67) on next launch and cannot use the app until they update.', confirmLabel:'Raise minimum version' }).then(function(v){
          if(!v || v.v===cfg.minAppVersion) return;
          Perm.requirePermission(state.role,'SET_MIN_APP_VERSION');
          C.confirmDialog({ title:'Confirm — this locks out older devices', danger:true, body:'<p>Set the minimum supported version to <b>'+esc(v.v)+'</b>? <b>Every device below '+esc(v.v)+' will be forced to update</b> on next launch (mobile screen 67) and cannot use the app until they do.</p>', warn:'There is no gradual rollout in the prototype — this is immediate for all clients on next config fetch.', confirmLabel:'Yes, raise to '+esc(v.v) }).then(function(ok){
            if(!ok) return;
            setCfg('minAppVersion', v.v);
            Audit.audit({ actor:actor(), action:'SET_MIN_APP_VERSION', target:'minimum app version', changes:{ from:cfg.minAppVersion, to:v.v } });
            Ripples.emit({ kind:'client', screen:'Screen 67 · Force update', headline:'Minimum app version raised '+cfg.minAppVersion+' → '+v.v+' — devices below '+v.v+' now hit the force-update screen on next launch' });
            C.toast({ type:'warning', persist:true, title:'Minimum version raised to '+v.v, text:'Devices below '+v.v+' will be forced to update.', ripple:'clients below '+v.v+' see screen 67 (force update)' });
            go('U08');
          });
        });
      };
      main.appendChild(auditNote('minAppVersion'));
    }
  };

  /* ---------- U09 · Session policy ---------- */
  SCREENS.U09 = { title:'Session policy', perm:'MANAGE_CONFIG',
    render:function(main){
      main.innerHTML = header(this); var cfg=AD.getConfig();
      var card=C.el('<div class="card"><h3>Session policy</h3><p class="hint" style="margin-bottom:8px">SSO/MFA provider is undefined (OPEN_QUESTIONS #1, #2).</p></div>'); main.appendChild(card);
      card.appendChild(cfgEditor('Idle timeout (minutes)', cfg.session.timeoutMins+' min', 'session.timeoutMins', cfg.session.timeoutMins, 'SET_SESSION_TIMEOUT'));
      card.appendChild(cfgEditor('Max concurrent sessions', String(cfg.session.maxConcurrent), 'session.maxConcurrent', cfg.session.maxConcurrent, 'SET_MAX_SESSIONS'));
      card.insertAdjacentHTML('beforeend','<div class="cfgrow"><span class="cl">MFA</span><span class="cval" style="font-weight:600">'+esc(cfg.session.mfa)+'</span></div>');
      main.appendChild(auditNote('session'));
    }
  };

  /* ---------- U10 · Invoice template ---------- */
  SCREENS.U10 = { title:'Invoice template', perm:'EDIT_INVOICE_TEMPLATE',
    render:function(main){
      main.innerHTML = header(this); var cfg=AD.getConfig();
      var card=C.el('<div class="card"><h3>Invoice template (one global — per-project overrides undefined, OPEN_QUESTIONS #10)</h3></div>'); main.appendChild(card);
      card.appendChild(cfgEditor('Numbering prefix', cfg.invoice.prefix, 'invoice.prefix', cfg.invoice.prefix, 'EDIT_INVOICE_TEMPLATE'));
      card.appendChild(cfgEditor('Tax label', cfg.invoice.taxLabel, 'invoice.taxLabel', cfg.invoice.taxLabel, 'EDIT_INVOICE_TEMPLATE'));
      var lrow=C.el('<div class="cfgrow"><span class="cl">Legal wording</span><span class="cval" style="font-weight:500;font-size:12px">'+esc(cfg.invoice.legal)+'</span><button class="btn sm">Edit</button></div>');
      lrow.querySelector('button').onclick=function(){ editCfg('invoice.legal', cfg.invoice.legal, 'Legal wording', 'EDIT_INVOICE_TEMPLATE', 'invoice legal', function(){ renderMain(); }); };
      card.appendChild(lrow);
      main.appendChild(auditNote('invoice'));
    }
  };

  /* ---------- U11 · Status configuration (clause 6.18.2) ---------- */
  function statusSummary(){ var sets=AD.getStatusSets(); var vals=sets.reduce(function(a,s){ return a+s.values.length; },0); return sets.length+' status sets · '+vals+' values'; }
  SCREENS.U11 = { title:'Status configuration', sub:'The basic status sets every module reads — relabel or retire a value; history is never rewritten', perm:'MANAGE_CONFIG',
    render:function(main){
      main.innerHTML = header(this);
      main.insertAdjacentHTML('beforeend','<p class="metaline">These are the <b>enums the modules already use</b> (lead, booking, meeting, task, document, commission, return, ticket, settlement). You can rename the <b>label a partner/client sees</b> and <b>retire</b> a value so it is no longer offered on new records — but the canonical <span class="mono">key</span> the backend stores is fixed, and <b>retiring never rewrites history</b> (records already in that state keep it, same discipline as user deactivation). Terminal states cannot be retired.</p>');
      var host=C.el('<div class="statuscfg"></div>'); main.appendChild(host);
      function draw(){
        var sets=AD.getStatusSets();
        host.innerHTML = sets.map(function(set){
          return '<div class="scard"><div class="sc-h"><h3>'+esc(set.label)+' <span class="mono" style="font-size:11px;color:var(--ink-2)">'+esc(set.id)+'</span></h3><p class="hint" style="margin:2px 0 0">'+esc(set.note||'')+'</p></div>'+
            '<div class="sc-vals">'+set.values.map(function(v){
              var locked=AD.isStatusLocked(set.id, v.key);
              return '<div class="svrow'+(v.active?'':' retired')+'"><span class="chip '+(v.active?'blue':'grey')+'" style="height:20px"><span class="d"></span>'+esc(v.label)+'</span>'+
                '<span class="svkey mono">'+esc(v.key)+'</span>'+
                '<span class="spacer" style="flex:1"></span>'+
                '<button class="btn sm" data-edit="'+esc(set.id)+':'+esc(v.key)+'">Rename</button>'+
                (locked ? '<span class="lockpill" title="Terminal state — a record can always land here, so it cannot be retired">🔒 terminal</span>'
                        : '<button class="btn sm '+(v.active?'':'primary')+'" data-toggle="'+esc(set.id)+':'+esc(v.key)+'" data-on="'+v.active+'">'+(v.active?'Retire':'Restore')+'</button>')+
              '</div>';
            }).join('')+'</div></div>';
        }).join('');
        host.querySelectorAll('[data-edit]').forEach(function(b){ b.onclick=function(){ var p=b.getAttribute('data-edit').split(':'); renameStatus(p[0],p[1],draw); }; });
        host.querySelectorAll('[data-toggle]').forEach(function(b){ b.onclick=function(){ var p=b.getAttribute('data-toggle').split(':'); toggleStatus(p[0],p[1],b.getAttribute('data-on')==='true',draw); }; });
      }
      draw();
      main.appendChild(auditNote('statuses'));
    }
  };
  function statusVal(setId, key){ var set=AD.statusSetById(setId); return (set&&set.values.filter(function(v){return v.key===key;})[0])||{key:key,label:key,active:true}; }
  function renameStatus(setId, key, after){
    var set=AD.statusSetById(setId), v=statusVal(setId,key);
    formDialog({ title:'Rename status label', intro:'<div class="effectbox">'+esc(set.label)+' · canonical key <b class="mono">'+esc(key)+'</b> (unchanged) — current label <b>'+esc(v.label)+'</b></div>',
      fields:[ { type:'text', key:'label', label:'Display label', required:true, value:v.label } ],
      warn:'Only the label changes — the stored key is fixed, so existing records and reports are unaffected. Audited old→new.', confirmLabel:'Save label' }).then(function(res){
      if(!res || res.label===v.label) return;
      Perm.requirePermission(state.role,'MANAGE_CONFIG');
      setCfg('statusset:'+setId+':'+key+':label', res.label);
      Audit.audit({ actor:actor(), action:'EDIT_STATUS_LABEL', target:set.label+' · '+key, changes:{ from:v.label, to:res.label } });
      C.toast({ type:'success', title:'Status label updated', text:key+': '+v.label+' → '+res.label });
      after && after();
    });
  }
  function toggleStatus(setId, key, currentlyActive, after){
    if (AD.isStatusLocked(setId, key)){ C.toast({type:'error',title:'Terminal state',text:'This status cannot be retired — a record can always end up here.'}); return; }
    var set=AD.statusSetById(setId), v=statusVal(setId,key), retiring=currentlyActive;
    C.confirmDialog({ title:(retiring?'Retire ':'Restore ')+'“'+v.label+'”?', danger:retiring,
      body:'<p>'+(retiring?'Retiring':'Restoring')+' <b>'+esc(v.label)+'</b> ('+esc(set.label)+') '+(retiring?'removes it from the status picker on <b>new</b> records. Records already in this state <b>keep it</b> — nothing is rewritten or deleted.':'makes it selectable again on new records.')+'</p>',
      warn:'Audited old→new. Nothing hard-deletes.', confirmLabel:(retiring?'Retire':'Restore')+' status' }).then(function(ok){
      if(!ok) return;
      Perm.requirePermission(state.role,'MANAGE_CONFIG');
      setCfg('statusset:'+setId+':'+key+':active', !currentlyActive);
      Audit.audit({ actor:actor(), action:'SET_STATUS_ACTIVE', target:set.label+' · '+key, changes:{ from:currentlyActive?'active':'retired', to:currentlyActive?'retired':'active' } });
      C.toast({ type:retiring?'warning':'success', title:'Status '+(retiring?'retired':'restored'), text:set.label+' · '+v.label });
      after && after();
    });
  }

  /* ===================== V — Notification templates ===================== */

  /* ---------- V01 · Templates list ---------- */
  SCREENS.V01 = { title:'Notification templates', sub:'Every mobile push originates here', perm:'MANAGE_NOTIF_TEMPLATE',
    render:function(main){
      main.innerHTML = admnav('V') + C.PageHeader({ title:this.title, sub:this.sub });
      var tw=C.el('<div></div>'); main.appendChild(tw);
      C.mountDataTable(tw, { rowId:'id', noun:'templates', rows:AD.allTemplates(), columns:[
        { key:'name', label:'Template', strong:true },
        { key:'type', label:'Type' },
        { key:'trigger', label:'Fires on' },
        { key:'variables', label:'Variables', render:function(r){ return (r.variables||[]).map(function(v){ return '<span class="varchip">{'+esc(v)+'}</span>'; }).join(' ')||'—'; } }
      ], rowActions:[ { label:'Edit', icon:'✎', onClick:function(r){ go('V02',{id:r.id}); } }, { label:'Test send', icon:'📤', onClick:function(r){ go('V03',{id:r.id}); } } ], onRowClick:function(r){ go('V02',{id:r.id}); } });
      main.insertAdjacentHTML('beforeend','<p class="metaline" style="margin-top:12px">The mobile rule "deep-link, don’t disclose" is enforced in the editor — no sensitive value ('+AD.SENSITIVE_VARS.slice(0,4).map(function(v){return '{'+v+'}';}).join(', ')+'…) may appear in a push payload.</p>');
    }
  };

  /* ---------- V02 · Template detail / edit ⭐ (blocks sensitive vars) ---------- */
  SCREENS.V02 = { title:'Template', perm:'MANAGE_NOTIF_TEMPLATE',
    render:function(main, P){
      var t = P.get('id') ? AD.templateById(P.get('id')) : AD.allTemplates()[0];
      main.innerHTML = header(this);
      if(!t){ main.insertAdjacentHTML('beforeend', C.EmptyState({title:'Template not found', actionLabel:'Templates'})); wireEmpty(main,'V01'); return; }
      var lang='en';
      main.insertAdjacentHTML('beforeend','<div class="tpledit"><div id="ted"></div><div id="tprev"></div></div>');
      var ted=document.getElementById('ted'), tprev=document.getElementById('tprev');
      function curTitle(){ return lang==='en'?(document.getElementById('ttitle')?document.getElementById('ttitle').value:t.titleEn):(document.getElementById('ttitle')?document.getElementById('ttitle').value:t.titleBn); }
      function drawEditor(){
        var title = lang==='en'?t.titleEn:t.titleBn, body = lang==='en'?t.bodyEn:t.bodyBn;
        ted.innerHTML =
          '<div class="card"><h3>'+esc(t.name)+' · <span class="muted" style="font-weight:600">'+esc(t.trigger)+'</span></h3>'+
          '<div class="langtabs"><button data-l="en" class="'+(lang==='en'?'on':'')+'">English</button><button data-l="bn" class="'+(lang==='bn'?'on':'')+'">বাংলা</button></div>'+
          '<div class="field"><label>Title</label><input type="text" id="ttitle" value="'+esc(title)+'"></div>'+
          '<div class="field"><label>Body</label><textarea id="tbody">'+esc(body)+'</textarea></div>'+
          '<div class="hint">Variables use <span class="mono">{name}</span> syntax. Available: '+(t.variables||[]).map(function(v){return '<span class="varchip">{'+esc(v)+'}</span>';}).join(' ')+'</div>'+
          '<div id="sens"></div>'+
          '<div class="primaryacts"><button class="btn primary" id="save">Save template</button><a class="btn" href="'+href('V03',{id:t.id})+'">Test send</a></div></div>';
        ted.querySelectorAll('.langtabs button').forEach(function(b){ b.onclick=function(){ // stash current edits before switching
          if(lang==='en'){ t.titleEn=document.getElementById('ttitle').value; t.bodyEn=document.getElementById('tbody').value; } else { t.titleBn=document.getElementById('ttitle').value; t.bodyBn=document.getElementById('tbody').value; }
          lang=b.getAttribute('data-l'); drawEditor(); drawPreview(); checkSensitive(); }; });
        ['ttitle','tbody'].forEach(function(id){ document.getElementById(id).addEventListener('input', function(){ drawPreview(); checkSensitive(); }); });
        document.getElementById('save').onclick=save;
        checkSensitive();
      }
      function checkSensitive(){
        var text=(document.getElementById('ttitle').value||'')+' '+(document.getElementById('tbody').value||'');
        var bad=AD.sensitiveVarsIn(text);
        var el=document.getElementById('sens');
        if (bad.length){ el.innerHTML='<div class="sensitiveblock">🚫 <b>Cannot save.</b> A push payload must never disclose sensitive values (deep-link, don’t disclose). Remove: '+bad.map(function(v){return '<span class="varchip bad">{'+esc(v)+'}</span>';}).join(' ')+'. Notify the user, then let them open the app to see the value.</div>'; document.getElementById('save').disabled=true; }
        else { el.innerHTML=''; document.getElementById('save').disabled=false; }
      }
      function drawPreview(){
        var title=document.getElementById('ttitle')?document.getElementById('ttitle').value:(lang==='en'?t.titleEn:t.titleBn);
        var body=document.getElementById('tbody')?document.getElementById('tbody').value:(lang==='en'?t.bodyEn:t.bodyBn);
        tprev.innerHTML =
          '<div class="lockprev" style="margin-bottom:10px"><div class="os">iOS lock screen</div><div class="notif"><div class="nh"><span class="app">S</span> SALMON · now</div><div class="t">'+esc(title)+'</div><div class="b">'+esc(body)+'</div></div></div>'+
          '<div class="lockprev"><div class="os">Android lock screen</div><div class="notif"><div class="nh"><span class="app">S</span> Salmon Developers</div><div class="t">'+esc(title)+'</div><div class="b">'+esc(body)+'</div></div></div>';
      }
      function save(){
        var text=(document.getElementById('ttitle').value||'')+' '+(document.getElementById('tbody').value||'');
        var bad=AD.sensitiveVarsIn(text);
        if (bad.length){ C.toast({ type:'error', title:'Blocked — sensitive variable', text:'Remove {'+bad.join('}, {')+'} — push payloads must not disclose values.' }); return; }
        Perm.requirePermission(state.role,'MANAGE_NOTIF_TEMPLATE');
        if(lang==='en'){ t.titleEn=document.getElementById('ttitle').value; t.bodyEn=document.getElementById('tbody').value; } else { t.titleBn=document.getElementById('ttitle').value; t.bodyBn=document.getElementById('tbody').value; }
        setOv('tpl:'+t.id, Object.assign({}, AD.templateById(t.id), { titleEn:t.titleEn, bodyEn:t.bodyEn, titleBn:t.titleBn, bodyBn:t.bodyBn }));
        Audit.audit({ actor:actor(), action:'EDIT_NOTIF_TEMPLATE', target:t.id+' · '+t.name, changes:{ lang:lang } });
        C.toast({ type:'success', title:'Template saved', text:t.name });
      }
      drawEditor(); drawPreview();
      main.appendChild(auditNote(t.id));
    }
  };

  /* ---------- V03 · Test send ---------- */
  SCREENS.V03 = { title:'Test send', sub:'Fire a template to a test staff device', perm:'TEST_NOTIF_TEMPLATE',
    render:function(main, P){
      var t = P.get('id') ? AD.templateById(P.get('id')) : AD.allTemplates()[0];
      main.innerHTML = header(this);
      if(!t){ main.insertAdjacentHTML('beforeend', C.EmptyState({title:'Template not found'})); return; }
      main.insertAdjacentHTML('beforeend','<div class="card"><h3>Test send · '+esc(t.name)+'</h3><p class="hint" style="margin-bottom:10px">Fires the template to a registered test staff device only — never a real client/partner.</p>'+
        '<div class="field" style="max-width:320px"><label>Test device</label><select id="dev"><option>'+esc(actor().name)+'’s device (test)</option><option>QA test device</option></select></div>'+
        '<div class="field" style="max-width:200px"><label>Language</label><select id="lng"><option value="en">English</option><option value="bn">বাংলা</option></select></div>'+
        '<div class="primaryacts"><button class="btn primary" id="send">Send test push</button><a class="btn" href="'+href('V02',{id:t.id})+'">Edit template</a></div></div>');
      document.getElementById('send').onclick=function(){
        Perm.requirePermission(state.role,'TEST_NOTIF_TEMPLATE');
        var lng=document.getElementById('lng').value; var dev=document.getElementById('dev').value;
        Audit.audit({ actor:actor(), action:'TEST_NOTIF_TEMPLATE', target:t.id+' · '+t.name, changes:{ device:dev, lang:lng } });
        Ripples.emit({ kind:'partner', screen:'Test device', headline:'Test push "'+t.name+'" ('+lng+') sent to '+dev });
        C.toast({ type:'success', persist:true, title:'Test push sent', text:t.name+' → '+dev, ripple:'test device received the '+lng+' notification' });
      };
    }
  };

  /* ===================== boot ===================== */
  function boot(screenId){ state.screen=screenId; state.params=new URLSearchParams(location.search); Audit.seed(CRM.auditSeed); mountShell(); renderMain(); }
  root.Admin = { boot: boot, rerender: renderMain, SCREENS: SCREENS, go: go, href: href };
})(window);
