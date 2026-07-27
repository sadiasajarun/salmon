/* ============================================================================
 * Salmon CRM — shared components. Build once, every module reuses unchanged.
 *   PageHeader · DataTable · FilterBar · MetricCard · StatusChip · EmptyState
 *   · ConfirmDialog · Toast · AuditNote  (+ small helpers: fmt, menu, el)
 * ==========================================================================*/
(function (root) {
  'use strict';

  /* ---------- helpers ---------- */
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function el(html){ var t=document.createElement('template'); t.innerHTML=html.trim(); return t.content.firstElementChild; }

  var fmt = {
    grpIndian: function(n){ var x=String(Math.round(Math.abs(n||0))); var l=x.slice(-3),r=x.slice(0,-3); if(r)r=r.replace(/\B(?=(\d{2})+(?!\d))/g,','); return (n<0?'-':'')+(r?r+','+l:l); },
    bdt: function(n){ return '৳ '+fmt.grpIndian(n); },
    money: function(n,cur){ if(cur==='USD') return '$ '+Number(n).toLocaleString('en-US'); if(cur==='AED') return 'AED '+Number(n).toLocaleString('en-US'); return '৳ '+fmt.grpIndian(n); },
    dhaka: function(iso, withTime){ try{ var o={day:'numeric',month:'short',timeZone:'Asia/Dhaka'}; if(withTime){o.hour='numeric';o.minute='2-digit';o.hour12=true;} return new Intl.DateTimeFormat('en-GB',o).format(new Date(iso))+(withTime?' (Dhaka)':''); }catch(e){ return String(iso).slice(0,10); } },
    ago: function(iso){ return fmt.dhaka(iso,true); }
  };

  /* ---------- StatusChip ---------- */
  var STATUS = {
    submitted:{c:'blue',l:'Submitted'}, contacted:{c:'blue',l:'Contacted'}, meetingScheduled:{c:'blue',l:'Meeting scheduled'},
    visitCompleted:{c:'blue',l:'Visit completed'}, converted:{c:'green',l:'Converted'}, closed:{c:'grey',l:'Closed'},
    pending:{c:'amber',l:'Pending'}, approved:{c:'green',l:'Approved'}, settled:{c:'green',l:'Settled'},
    onHold:{c:'violet',l:'On hold'}, rejected:{c:'red',l:'Rejected'}, unmatched:{c:'amber',l:'Unmatched'},
    verified:{c:'green',l:'Verified'}, published:{c:'green',l:'Published'}, draft:{c:'grey',l:'Draft'},
    internal:{c:'violet',l:'Internal'}, restricted:{c:'red',l:'Restricted'}, available:{c:'green',l:'Available'},
    reserved:{c:'amber',l:'Reserved'}, sold:{c:'grey',l:'Sold'}, overdue:{c:'red',l:'Overdue'}, paid:{c:'green',l:'Paid'}
  };
  function StatusChip(status){ var m=STATUS[status]||{c:'grey',l:status}; return '<span class="chip '+m.c+'"><span class="d"></span>'+esc(m.l)+'</span>'; }

  /* ---------- PageHeader ---------- */
  function PageHeader(cfg){
    var acts=(cfg.actions||[]).map(function(a){ return '<button class="btn '+(a.cls||'')+'" data-act="'+esc(a.id||'')+'"'+(a.disabled?' disabled':'')+'>'+(a.icon?a.icon+' ':'')+esc(a.label)+'</button>'; }).join('');
    return '<div class="pagehead"><div><h1>'+esc(cfg.title)+'</h1>'+(cfg.sub?'<div class="sub">'+esc(cfg.sub)+'</div>':'')+'</div>'+(acts?'<div class="acts">'+acts+'</div>':'')+'</div>';
  }

  /* ---------- MetricCard ---------- */
  function MetricCard(m){
    var spark=''; if(m.spark&&m.spark.length){ var mx=Math.max.apply(null,m.spark)||1; spark='<span class="spark">'+m.spark.map(function(v){ return '<i style="height:'+Math.max(3,Math.round(v/mx*20))+'px"></i>'; }).join('')+'</span>'; }
    var delta=''; if(m.delta!=null){ var dir=m.deltaDir||'flat'; delta='<span class="delta '+dir+'">'+(dir==='up'?'▲ ':dir==='down'?'▼ ':'')+esc(m.delta)+'</span>'; }
    return '<div class="metric"><div class="l">'+esc(m.label)+'</div><div class="v">'+esc(m.value)+'</div><div class="foot">'+delta+spark+'</div></div>';
  }
  function metricsRow(cards){ return '<div class="metrics">'+cards.map(MetricCard).join('')+'</div>'; }

  /* ---------- EmptyState ---------- */
  function EmptyState(cfg){
    return '<div class="empty"><div class="ic">'+(cfg.icon||'✓')+'</div><h3>'+esc(cfg.title||'Nothing here')+'</h3>'+(cfg.text?'<p>'+esc(cfg.text)+'</p>':'')+(cfg.actionLabel?'<button class="btn primary" data-empty-act>'+esc(cfg.actionLabel)+'</button>':'')+'</div>';
  }

  /* ---------- AuditNote ---------- */
  function AuditNote(cfg){ return '<div class="auditnote">🕮 Last changed by <b style="color:var(--ink-2)">'+esc(cfg.actor)+'</b> · '+esc(fmt.ago(cfg.when))+' <span class="lk" style="margin-left:auto">View history</span></div>'; }

  /* ---------- Toast ---------- */
  function toast(cfg){
    var host=document.getElementById('toasts'); if(!host){ host=el('<div class="toasts" id="toasts"></div>'); document.body.appendChild(host); }
    var t=el('<div class="toast '+(cfg.type||'info')+(cfg.persist?' persist':'')+'"><span class="bar"></span><div style="flex:1"><div class="tt">'+esc(cfg.title||'')+'</div>'+(cfg.text?'<div class="ts">'+esc(cfg.text)+'</div>':'')+(cfg.ripple?'<span class="ripple">📱 '+esc(cfg.ripple)+'</span>':'')+'</div><button class="x">✕</button></div>');
    t.querySelector('.x').onclick=function(){ t.remove(); };
    host.appendChild(t);
    if(!cfg.persist) setTimeout(function(){ t.remove(); }, cfg.duration||3800);
    return t;
  }

  /* ---------- ConfirmDialog ---------- */
  function confirmDialog(cfg){
    return new Promise(function(resolve){
      var scrim=el('<div class="modalscrim"><div class="modal"><div class="mh"><h3>'+esc(cfg.title)+'</h3></div><div class="mb">'+(cfg.body||'')+'</div>'+(cfg.warn?'<div class="warn">⚠ '+esc(cfg.warn)+'</div>':'')+'<div class="mf"><button class="btn" data-x>Cancel</button><button class="btn '+(cfg.danger?'danger':'primary')+'" data-ok>'+esc(cfg.confirmLabel||'Confirm')+'</button></div></div></div>');
      function close(v){ scrim.remove(); document.removeEventListener('keydown',key); resolve(v); }
      function key(e){ if(e.key==='Escape')close(false); if(e.key==='Enter')close(true); }
      scrim.addEventListener('click',function(e){ if(e.target===scrim) close(false); });
      scrim.querySelector('[data-x]').onclick=function(){ close(false); };
      scrim.querySelector('[data-ok]').onclick=function(){ close(true); };
      document.addEventListener('keydown',key);
      document.body.appendChild(scrim);
      scrim.querySelector('[data-ok]').focus();
    });
  }

  /* ---------- lightweight popover menu (row menus, etc.) ---------- */
  function menu(anchor, items){
    closeMenu();
    var m=el('<div class="pop menu" id="_ctxmenu"></div>');
    items.forEach(function(it){ if(it.sep){ m.appendChild(el('<div class="msep"></div>')); return; } var mi=el('<div class="mi '+(it.danger?'danger':'')+(it.disabled?' hidden':'')+'">'+(it.icon?it.icon+' ':'')+esc(it.label)+'</div>'); mi.onclick=function(){ closeMenu(); it.onClick&&it.onClick(); }; m.appendChild(mi); });
    document.body.appendChild(m);
    var r=anchor.getBoundingClientRect(); var w=230;
    m.style.top=(r.bottom+4)+'px'; m.style.left=Math.max(8,Math.min(r.right-w, window.innerWidth-w-8))+'px';
    setTimeout(function(){ document.addEventListener('mousedown',outside); },0);
    function outside(e){ if(!m.contains(e.target)){ closeMenu(); } }
    m._outside=outside;
  }
  function closeMenu(){ var m=document.getElementById('_ctxmenu'); if(m){ if(m._outside)document.removeEventListener('mousedown',m._outside); m.remove(); } }

  /* ---------- User menu + Log out (A11 — shared across EVERY module engine) ----------
   * The console (app.js) wires its own #user menu. The built module screens
   * (screens/*.html) each render an identical `.user` avatar but had no menu, so
   * there was no way to sign out from inside a module. This delegated handler gives
   * every one of them the same account dropdown with a real Log out — confirm →
   * clear the mock session + revoke the device token → return to the sign-in wall. */
  function doLogout(){
    confirmDialog({ title:'Log out', body:'<p>Sign out of the Salmon admin console on this device? Your session and device token are cleared; you’ll return to the sign-in screen.</p>', danger:true, confirmLabel:'Log out' }).then(function(ok){
      if(!ok) return;
      try{ if(root.Audit&&root.Audit.audit) root.Audit.audit({ actor:{ name:'—' }, action:'SIGN_OUT', target:'admin console (module)' }); }catch(e){}
      try{ sessionStorage.removeItem('crm_authed'); }catch(e){}     // clear mock session
      try{ localStorage.removeItem('crm_device_token'); }catch(e){} // revoke mock device token
      location.href='../index.html';                                // → showLogin()
    });
  }
  function openUserMenu(anchor){
    closeMenu();
    var nm=(anchor.querySelector('.nm')||{}).textContent||'Signed in';
    var rl=(anchor.querySelector('.rl')||{}).textContent||'';
    var m=el('<div class="pop menu" id="_ctxmenu"><div class="mhead"><div class="nm">'+esc(nm)+'</div><div class="rl">'+esc(rl)+'</div></div><div class="msep"></div>'+
      '<div class="mi" data-a="account">👤 My account</div><div class="mi" data-a="prefs">⚙ Preferences</div><div class="msep"></div>'+
      '<div class="mi danger" data-a="logout">⇤ Log out</div></div>');
    document.body.appendChild(m);
    var r=anchor.getBoundingClientRect(), w=230;
    m.style.top=(r.bottom+6)+'px'; m.style.left=Math.max(8,Math.min(r.right-w, window.innerWidth-w-10))+'px';
    m.querySelectorAll('.mi').forEach(function(mi){ mi.onclick=function(){ var a=mi.getAttribute('data-a'); closeMenu();
      if(a==='logout') doLogout();
      else toast({ type:'info', title:a==='account'?'My account':'Preferences', text:'Opens in a later part.' });
    }; });
    setTimeout(function(){ document.addEventListener('mousedown', outside); },0);
    function outside(e){ if(!m.contains(e.target)){ document.removeEventListener('mousedown', outside); closeMenu(); } }
  }
  // Delegated: any `.user` click opens the menu — EXCEPT on the console, where
  // app.js owns #user and stops propagation before this listener ever sees it.
  document.addEventListener('click', function(e){
    var u = e.target.closest ? e.target.closest('.user') : null;
    if(!u) return;
    if(root.App) return;               // console (app.js) handles its own #user
    e.preventDefault(); openUserMenu(u);
  });

  /* ---------- FilterBar (persistent across navigation via sessionStorage) ---------- */
  function getFilters(id){ try{ return JSON.parse(sessionStorage.getItem('crm_flt_'+id))||{}; }catch(e){ return {}; } }
  function setFilters(id,v){ try{ sessionStorage.setItem('crm_flt_'+id, JSON.stringify(v)); }catch(e){} }
  function FilterBar(container, cfg){
    var cur=getFilters(cfg.id);
    var html='<div class="filterbar"><span class="fl">Filter</span>';
    cfg.filters.forEach(function(f){
      if(f.type==='date'){ html+='<input type="date" data-fk="'+f.key+'" value="'+esc(cur[f.key]||'')+'">'; }
      else{ html+='<select data-fk="'+f.key+'"><option value="">'+esc(f.label)+'</option>'+f.options.map(function(o){ return '<option value="'+esc(o)+'"'+(cur[f.key]===o?' selected':'')+'>'+esc(o)+'</option>'; }).join('')+'</select>'; }
    });
    html+='<button class="clear">Clear</button></div>';
    var node=el(html); container.appendChild(node);
    node.addEventListener('change',function(e){ var fk=e.target.getAttribute('data-fk'); if(!fk)return; cur[fk]=e.target.value; setFilters(cfg.id,cur); cfg.onChange&&cfg.onChange(cur); });
    node.querySelector('.clear').onclick=function(){ cur={}; setFilters(cfg.id,cur); node.querySelectorAll('[data-fk]').forEach(function(i){ i.value=''; }); cfg.onChange&&cfg.onChange(cur); };
    return { get:function(){ return cur; } };
  }

  /* ---------- DataTable ---------- */
  function mountDataTable(container, cfg){
    var rowId=cfg.rowId||'id';
    var st={ rows:(cfg.rows||[]).slice(), sortKey:cfg.defaultSort||null, sortDir:cfg.defaultDir||1, sel:{}, focus:-1 };
    function idOf(r){ return r[rowId]; }
    function sortRows(){ if(!st.sortKey) return st.rows.slice(); var col=cfg.columns.filter(function(c){return c.key===st.sortKey;})[0]; var sv=col&&col.sortValue; return st.rows.slice().sort(function(a,b){ var x=sv?sv(a):a[st.sortKey], y=sv?sv(b):b[st.sortKey]; if(x<y)return -1*st.sortDir; if(x>y)return 1*st.sortDir; return 0; }); }
    function selCount(){ return Object.keys(st.sel).filter(function(k){return st.sel[k];}).length; }
    function selectedRows(){ return st.rows.filter(function(r){ return st.sel[idOf(r)]; }); }

    function render(){
      var rows=sortRows();
      var html='';
      // bulk bar
      var n=selCount();
      if(cfg.bulkActions && n>0){
        html+='<div class="bulkbar"><span class="cnt">'+n+' selected</span>'+cfg.bulkActions.map(function(b,i){ return '<button class="btn '+(b.cls||'')+'" data-bulk="'+i+'">'+esc(b.label)+'</button>'; }).join('')+'<span class="spacer"></span><button class="x" data-bclear>✕</button></div>';
      }
      html+='<div class="tablewrap"><table class="dt"><thead><tr>';
      if(cfg.selectable) html+='<th class="cbcol"><input type="checkbox" class="dtcb" data-all></th>';
      cfg.columns.forEach(function(c){ var sorted=st.sortKey===c.key; html+='<th class="'+(c.align==='right'?'num ':'')+(c.sortable?'sortable ':'')+(sorted?'sorted':'')+'" data-sort="'+(c.sortable?c.key:'')+'">'+esc(c.label)+(c.sortable?'<span class="arr">'+(sorted?(st.sortDir>0?'▲':'▼'):'▲')+'</span>':'')+'</th>'; });
      if(cfg.rowActions) html+='<th class="rowmenu"></th>';
      html+='</tr></thead><tbody>';
      if(!rows.length){ html+='</tbody></table>'; container.innerHTML=html; var tw=container.querySelector('.tablewrap'); tw.insertAdjacentHTML('beforeend', cfg.empty? '' : ''); container.querySelector('.dt').insertAdjacentElement('afterend', el('<div>'+(cfg.emptyState||EmptyState({title:'Nothing in this queue',text:'You’re all caught up.'}))+'</div>')); wire(); return; }
      rows.forEach(function(r,i){ var id=idOf(r); var sel=st.sel[id]?' sel':''; var foc=st.focus===i?' focus':'';
        html+='<tr class="'+sel+foc+'" data-id="'+esc(id)+'" data-i="'+i+'">';
        if(cfg.selectable) html+='<td class="cbcol"><input type="checkbox" class="dtcb" data-row-cb '+(st.sel[id]?'checked':'')+'></td>';
        cfg.columns.forEach(function(c){ html+='<td class="'+(c.align==='right'?'num ':'')+(c.strong?'strong ':'')+'">'+(c.render?c.render(r):esc(r[c.key]))+'</td>'; });
        if(cfg.rowActions) html+='<td class="rowmenu" data-rowmenu>⋯</td>';
        html+='</tr>';
      });
      html+='</tbody></table><div class="dt-foot"><span>'+rows.length+' '+(cfg.noun||'rows')+'</span><span class="muted">↑↓ move · space select · enter open</span></div></div>';
      container.innerHTML=html; wire();
    }

    function wire(){
      var all=container.querySelector('[data-all]'); if(all){ all.checked = st.rows.length>0 && selCount()===st.rows.length; all.onchange=function(){ st.rows.forEach(function(r){ st.sel[idOf(r)]=all.checked; }); render(); }; }
      container.querySelectorAll('[data-sort]').forEach(function(th){ var k=th.getAttribute('data-sort'); if(!k)return; th.onclick=function(){ if(st.sortKey===k)st.sortDir*=-1; else{ st.sortKey=k; st.sortDir=1; } render(); }; });
      container.querySelectorAll('[data-row-cb]').forEach(function(cb){ cb.onclick=function(e){ e.stopPropagation(); var id=cb.closest('tr').getAttribute('data-id'); st.sel[id]=cb.checked; render(); }; });
      container.querySelectorAll('tbody tr').forEach(function(tr){ tr.onclick=function(){ var r=byId(tr.getAttribute('data-id')); cfg.onRowClick&&cfg.onRowClick(r); }; });
      container.querySelectorAll('[data-rowmenu]').forEach(function(td){ td.onclick=function(e){ e.stopPropagation(); var r=byId(td.closest('tr').getAttribute('data-id')); menu(td, cfg.rowActions.map(function(a){ return { label:a.label, icon:a.icon, danger:a.danger, disabled:a.disabled&&a.disabled(r), onClick:function(){ a.onClick(r); } }; })); }; });
      var bc=container.querySelector('[data-bclear]'); if(bc) bc.onclick=function(){ st.sel={}; render(); };
      if(cfg.bulkActions) container.querySelectorAll('[data-bulk]').forEach(function(b){ b.onclick=function(){ cfg.bulkActions[+b.getAttribute('data-bulk')].onClick(selectedRows()); }; });
    }
    function byId(id){ return st.rows.filter(function(r){ return String(idOf(r))===String(id); })[0]; }

    // keyboard nav on the table container
    container.tabIndex=0;
    container.addEventListener('keydown',function(e){
      var rows=sortRows(); if(!rows.length)return;
      if(e.key==='ArrowDown'){ e.preventDefault(); st.focus=Math.min(rows.length-1, st.focus+1); render(); }
      else if(e.key==='ArrowUp'){ e.preventDefault(); st.focus=Math.max(0, st.focus-1); render(); }
      else if(e.key===' '&&st.focus>=0){ e.preventDefault(); var id=idOf(rows[st.focus]); st.sel[id]=!st.sel[id]; render(); }
      else if(e.key==='Enter'&&st.focus>=0){ e.preventDefault(); cfg.onRowClick&&cfg.onRowClick(rows[st.focus]); }
    });

    render();
    return { getSelected:selectedRows, clear:function(){ st.sel={}; render(); }, refresh:function(rows){ st.rows=rows.slice(); st.sel={}; render(); }, remove:function(id){ st.rows=st.rows.filter(function(r){return String(idOf(r))!==String(id);}); delete st.sel[id]; render(); } };
  }

  root.C = {
    esc:esc, el:el, fmt:fmt, STATUS:STATUS,
    PageHeader:PageHeader, MetricCard:MetricCard, metricsRow:metricsRow, StatusChip:StatusChip,
    EmptyState:EmptyState, AuditNote:AuditNote, toast:toast, confirmDialog:confirmDialog,
    menu:menu, closeMenu:closeMenu, FilterBar:FilterBar, getFilters:getFilters, mountDataTable:mountDataTable
  };
})(window);
