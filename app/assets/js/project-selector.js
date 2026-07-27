/* ============================================================================
 * Salmon — Shared Project / Unit Selector  (Req 6.5.7)
 * ----------------------------------------------------------------------------
 * ONE reusable component, used by all FIVE partner submission flows:
 *   • referral / lead submission     (submit-lead)
 *   • With-Investment enquiry         (invest-enquiry)
 *   • booking record                  (booking-record)
 *   • meeting request                 (request-meeting)
 *   • site-visit request              (request-visit)
 *
 * The partner learns it once. It returns a stable reference { projectId,
 * projectName, unitId?, unitLabel? } that carries through to the admin side so
 * staff see exactly which project/unit a request concerns. Don't build five
 * pickers — build one, reuse it five times.
 *
 * Reads the same catalogue + inventory as the client side (window.SALMON) and
 * offers the same 6.5.5 filters (type / location / construction status /
 * availability) so a partner can find what to pitch. Dependency-free; injects
 * its own styles once; framework-agnostic (works in the static prototype).
 * ==========================================================================*/
(function (root) {
  'use strict';

  var D = root.SALMON || { projects: [], areas: {} };
  var Cur = root.Currency;
  var SC = root.SalmonCategories;

  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }

  /* ---- one-time style injection ---- */
  function ensureStyle(){
    if (document.getElementById('psel-style')) return;
    var s = document.createElement('style'); s.id = 'psel-style';
    s.textContent = [
      '.psel-field{display:flex;align-items:center;gap:10px;width:calc(100% - 32px);margin:6px 16px;padding:12px 14px;border:1px solid var(--line,#e2dfe4);border-radius:12px;background:#fff;cursor:pointer;text-align:left;font:inherit}',
      '.psel-field:hover{border-color:var(--maroon,#7a1f2b)}',
      '.psel-field .pf-thumb{width:40px;height:40px;border-radius:9px;background:#f1eef0 center/cover;flex:none}',
      '.psel-field .pf-main{flex:1;min-width:0}',
      '.psel-field .pf-t{font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.psel-field .pf-s{font-size:12px;color:var(--ink-3,#8a8791);margin-top:1px}',
      '.psel-field .pf-chev{color:var(--ink-3,#b7b3bb);font-size:18px}',
      '.psel-field.empty .pf-t{color:var(--ink-3,#8a8791);font-weight:600}',
      '.psel-scrim{position:fixed;inset:0;background:rgba(20,16,20,.44);z-index:9000;display:flex;align-items:flex-end;justify-content:center}',
      '.psel-sheet{background:#fff;width:100%;max-width:440px;max-height:92vh;border-radius:20px 20px 0 0;display:flex;flex-direction:column;overflow:hidden;animation:pselUp .22s ease}',
      '@keyframes pselUp{from{transform:translateY(100%)}to{transform:translateY(0)}}',
      '.psel-hd{padding:16px 18px 10px;border-bottom:1px solid var(--line,#eee)}',
      '.psel-hd .row{display:flex;align-items:center;justify-content:space-between}',
      '.psel-hd h3{margin:0;font-size:16px}',
      '.psel-x{border:0;background:#f2eff2;width:30px;height:30px;border-radius:50%;font-size:16px;cursor:pointer}',
      '.psel-search{width:100%;margin-top:12px;padding:10px 12px;border:1px solid var(--line,#e2dfe4);border-radius:10px;font:inherit}',
      '.psel-filters{display:flex;gap:7px;overflow-x:auto;padding:10px 18px 6px;-webkit-overflow-scrolling:touch}',
      '.psel-chip{white-space:nowrap;border:1px solid var(--line,#dcdce2);background:#fafafb;color:var(--ink-2,#55555c);border-radius:999px;padding:6px 12px;font-size:12.5px;cursor:pointer;flex:none}',
      '.psel-chip.on{background:var(--maroon,#7a1f2b);border-color:var(--maroon,#7a1f2b);color:#fff}',
      '.psel-list{overflow-y:auto;padding:6px 12px 16px;flex:1}',
      '.psel-row{display:flex;align-items:center;gap:12px;padding:11px 10px;border-radius:12px;cursor:pointer}',
      '.psel-row:hover{background:#faf7f8}',
      '.psel-row .r-thumb{width:52px;height:52px;border-radius:10px;background:#f1eef0 center/cover;flex:none}',
      '.psel-row .r-main{flex:1;min-width:0}',
      '.psel-row .r-t{font-weight:700;font-size:14.5px}',
      '.psel-row .r-s{font-size:12px;color:var(--ink-3,#8a8791);margin-top:2px}',
      '.psel-row .r-av{font-size:11.5px;font-weight:700;color:#1a7a44}',
      '.psel-row .r-av.gone{color:#b4232f}',
      '.psel-badge{font-size:10.5px;text-transform:uppercase;letter-spacing:.03em;border:1px solid currentColor;border-radius:5px;padding:0 5px;color:var(--ink-3,#8a8791)}',
      '.psel-empty{text-align:center;color:var(--ink-3,#8a8791);font-size:13px;padding:30px 16px}',
      '.psel-back{border:0;background:none;color:var(--maroon,#7a1f2b);font-weight:700;font-size:13px;cursor:pointer;padding:0}',
      '.u-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}',
      '.u-available{background:#1a7a44}.u-reserved{background:#c98a00}.u-booked{background:#2563a8}.u-sold{background:#9a9a9a}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ---- data helpers (same catalogue as the client) ---- */
  function projects(){ return (root.SALMON && root.SALMON.projects || []).filter(function(p){ return p.status !== 'upcoming'; }); }
  function availCount(p){ return (p.units||[]).filter(function(u){ return u.status === 'available'; }).length; }
  function totalUnits(p){ return (p.units||[]).length || (p.glance && p.glance.flats) || 0; }
  function catLabelOf(p){ var id = p.category || 'apartment'; return SC ? SC.label(id) : id; }
  function priceLabel(p){
    if (!p.price || !Cur) return '';
    try { return Cur.fmtDisplay ? Cur.fmtDisplay(p.price.amountBdtFrom, 'AED') : ''; } catch(e){ return ''; }
  }
  function areaLabel(k){ return (D.areas && D.areas[k]) ? D.areas[k].en : k; }

  /* ---- the sheet ---- */
  function openSheet(opts){
    ensureStyle();
    var mode = opts.mode || 'project';          // 'project' | 'unit'
    var filter = { q:'', cat:null, area:null, status:null, availOnly:false };
    var drill = null;                            // project currently drilled into (unit mode)

    var scrim = document.createElement('div'); scrim.className = 'psel-scrim';
    scrim.innerHTML = '<div class="psel-sheet" role="dialog" aria-modal="true"></div>';
    var sheet = scrim.firstChild;
    function close(v){ scrim.remove(); document.removeEventListener('keydown', key); if (opts.onClose) opts.onClose(v); }
    function key(e){ if (e.key === 'Escape') close(null); }
    scrim.addEventListener('click', function(e){ if (e.target === scrim) close(null); });
    document.addEventListener('keydown', key);

    function pick(p, u){
      var ref = { projectId: p.slug, projectName: p.name };
      if (u){ ref.unitId = u.id; ref.unitLabel = u.label || u.id; ref.unitStatus = u.status; }
      opts.onSelect && opts.onSelect(ref);
      close(ref);
    }

    function drawProjects(){
      var cats = SC ? SC.all() : [];
      var areas = Object.keys(D.areas || {});
      sheet.innerHTML =
        '<div class="psel-hd"><div class="row"><h3>'+(mode==='unit'?'Select a project & unit':'Select a project')+'</h3>'+
          '<button class="psel-x" data-x aria-label="Close">×</button></div>'+
          '<input class="psel-search" placeholder="Search projects…" value="'+esc(filter.q)+'" data-q></div>'+
        '<div class="psel-filters" data-filters></div>'+
        '<div class="psel-list" data-list></div>';

      // 6.5.5 filters — type (category) / location / construction status / availability
      var fbar = sheet.querySelector('[data-filters]');
      function fchip(label, on, onclick){ var b=document.createElement('button'); b.className='psel-chip'+(on?' on':''); b.type='button'; b.textContent=label; b.onclick=onclick; return b; }
      fbar.appendChild(fchip('Available', filter.availOnly, function(){ filter.availOnly=!filter.availOnly; drawProjects(); }));
      ['ongoing','completed'].forEach(function(st){ fbar.appendChild(fchip(st==='ongoing'?'Under construction':'Ready', filter.status===st, function(){ filter.status = filter.status===st?null:st; drawProjects(); })); });
      cats.forEach(function(c){ fbar.appendChild(fchip(c.label, filter.cat===c.id, function(){ filter.cat = filter.cat===c.id?null:c.id; drawProjects(); })); });
      areas.forEach(function(k){ fbar.appendChild(fchip(areaLabel(k), filter.area===k, function(){ filter.area = filter.area===k?null:k; drawProjects(); })); });

      sheet.querySelector('[data-x]').onclick = function(){ close(null); };
      var qi = sheet.querySelector('[data-q]'); qi.oninput = function(){ filter.q = qi.value; drawList(); };

      drawList();
      function drawList(){
        var list = sheet.querySelector('[data-list]');
        var rows = projects().filter(function(p){
          if (filter.q && (p.name||'').toLowerCase().indexOf(filter.q.toLowerCase()) < 0) return false;
          if (filter.cat && (p.category||'apartment') !== filter.cat) return false;
          if (filter.area && p.area !== filter.area) return false;
          if (filter.status && p.status !== filter.status) return false;
          if (filter.availOnly && availCount(p) < 1) return false;
          return true;
        });
        if (!rows.length){ list.innerHTML = '<div class="psel-empty">No projects match. Relax a filter.</div>'; return; }
        list.innerHTML = '';
        rows.forEach(function(p){
          var av = availCount(p), tot = totalUnits(p), gone = tot - av;
          var row = document.createElement('div'); row.className = 'psel-row'; row.tabIndex = 0;
          row.setAttribute('data-testid','psel-project-'+p.slug);
          row.innerHTML =
            '<div class="r-thumb" style="'+(p.banner?'background-image:url('+esc(p.banner)+')':'')+'"></div>'+
            '<div class="r-main"><div class="r-t">'+esc(p.name)+'</div>'+
              '<div class="r-s"><span class="psel-badge">'+esc(catLabelOf(p))+'</span> · '+esc(p.siteStatus||'')+' · '+esc(areaLabel(p.area))+'</div></div>'+
            '<div style="text-align:right"><div class="r-av'+(av?'':' gone')+'">'+(av?av+' avail':'sold out')+'</div>'+
              (tot?'<div class="r-s">'+gone+' of '+tot+' gone</div>':'')+'</div>';
          row.onclick = function(){ mode==='unit' ? drillInto(p) : pick(p); };
          row.onkeydown = function(e){ if(e.key==='Enter'){ mode==='unit'?drillInto(p):pick(p); } };
          list.appendChild(row);
        });
      }
    }

    function drillInto(p){
      drill = p;
      var units = (p.units || []);
      sheet.innerHTML =
        '<div class="psel-hd"><div class="row"><button class="psel-back" data-back>‹ All projects</button>'+
          '<button class="psel-x" data-x aria-label="Close">×</button></div>'+
          '<h3 style="margin-top:8px">'+esc(p.name)+'</h3>'+
          '<div class="r-s" style="font-size:12px;color:var(--ink-3,#8a8791)">Only <b>available</b> units can be attached to a booking.</div></div>'+
        '<div class="psel-list" data-list></div>';
      sheet.querySelector('[data-x]').onclick = function(){ close(null); };
      sheet.querySelector('[data-back]').onclick = function(){ drill = null; drawProjects(); };
      var list = sheet.querySelector('[data-list]');
      if (!units.length){ list.innerHTML = '<div class="psel-empty">Inventory for this project isn’t itemised yet.</div>'; return; }
      units.forEach(function(u){
        var sel = u.status === 'available';
        var row = document.createElement('div'); row.className = 'psel-row'; row.tabIndex = sel?0:-1;
        row.style.opacity = sel ? '1' : '.5';
        row.setAttribute('data-testid','psel-unit-'+esc(u.id));
        row.innerHTML =
          '<div class="r-main"><div class="r-t"><span class="u-dot u-'+esc(u.status)+'"></span>'+esc(u.label||u.id)+'</div>'+
            '<div class="r-s" style="text-transform:capitalize">'+esc(u.status)+'</div></div>'+
          (sel?'<div class="psel-back">Select ›</div>':'<span class="psel-badge">'+esc(u.status)+'</span>');
        if (sel){ row.onclick = function(){ pick(p, u); }; row.onkeydown = function(e){ if(e.key==='Enter') pick(p,u); }; }
        list.appendChild(row);
      });
    }

    if (mode === 'unit' && opts.project){ var pj = projects().filter(function(p){ return p.slug === opts.project; })[0]; pj ? drillInto(pj) : drawProjects(); }
    else drawProjects();
    document.body.appendChild(scrim);
  }

  /* ---- public: mount an inline field that opens the sheet ---- */
  // ProjectSelector.field(hostEl, { mode, required, value:{projectId,unitId}, onChange })
  function field(host, cfg){
    ensureStyle();
    cfg = cfg || {};
    var current = cfg.value || null;   // { projectId, projectName, unitId?, unitLabel? }
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'psel-field'; btn.setAttribute('data-testid', cfg.testid || 'project-selector');
    function render(){
      var has = current && current.projectId;
      btn.className = 'psel-field' + (has?'':' empty');
      var proj = has ? (projects().filter(function(p){ return p.slug === current.projectId; })[0] || {}) : null;
      var sub = has
        ? (current.unitLabel ? ('Unit ' + esc(current.unitLabel)) : (proj && proj.siteStatus ? esc(proj.siteStatus) : 'Project selected'))
        : (cfg.mode === 'unit' ? 'Search projects, then pick a unit' : 'Search Salmon projects');
      btn.innerHTML =
        '<div class="pf-thumb" style="'+(proj&&proj.banner?'background-image:url('+esc(proj.banner)+')':'')+'"></div>'+
        '<div class="pf-main"><div class="pf-t">'+(has?esc(current.projectName):(cfg.placeholder||'Select a project'+(cfg.mode==='unit'?' & unit':'')))+(cfg.required&&!has?' <span style="color:var(--error,#c0392b)">*</span>':'')+'</div>'+
          '<div class="pf-s">'+sub+'</div></div>'+
        '<div class="pf-chev">›</div>';
    }
    btn.onclick = function(){
      openSheet({ mode: cfg.mode || 'project', project: current && current.projectId, onSelect: function(ref){ current = ref; render(); cfg.onChange && cfg.onChange(ref); } });
    };
    render();
    if (host){ host.innerHTML = ''; host.appendChild(btn); }
    return {
      el: btn,
      get: function(){ return current; },
      set: function(v){ current = v; render(); },
      clear: function(){ current = null; render(); }
    };
  }

  root.ProjectSelector = { open: openSheet, field: field };
})(window);
