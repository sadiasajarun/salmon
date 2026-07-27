/* ============================================================================
 * Salmon CRM — Training & Sales Kit content mock data (Req 6.15)
 * ----------------------------------------------------------------------------
 * ⚠️  A CONTENT LIBRARY, NOT AN LMS. Admin uploads / publishes / unpublishes /
 * updates content and targets it by program / rank / team / territory. There are
 * NO quizzes, scores, certification, pass/fail, or completion tracking — the only
 * partner-side progress marker is "viewed". Do not add course machinery.
 *
 * Shapes MIRROR the partner side so a real backend feeds both:
 *   training item  → app/assets/js/partner-training.js  (cat/type/size/pages)
 *   sales-kit asset→ app/assets/js/partner-kit.js        (cat/size/type + gate)
 *   gate           → { by:'program'|'rank'|'team'|'territory', need:'…' }
 *
 * Override-aware like commission-data.js / invest-data.js (crm_people_mut store).
 * ==========================================================================*/
(function (root) {
  'use strict';

  function ago(days){ var d=new Date('2026-07-15T10:00:00Z'); d.setUTCDate(d.getUTCDate()-days); return d.toISOString(); }

  var TRAINING_CATS = [
    { key:'policies',   label:'Company policies',  icon:'📘' },
    { key:'guidelines', label:'Partner guidelines', icon:'📕' },
    { key:'faqs',       label:'FAQs',              icon:'❓' },
    { key:'videos',     label:'Video tutorials',   icon:'🎬' }
  ];
  var KIT_CATS = [
    { key:'brochures',    label:'Brochures',            icon:'📄' },
    { key:'layouts',      label:'Layouts / floor plans', icon:'⌗' },
    { key:'images',       label:'Images',               icon:'🖼' },
    { key:'videos',       label:'Videos',               icon:'▶' },
    { key:'scripts',      label:'Sales scripts',        icon:'📝' },
    { key:'presentations',label:'Presentations',        icon:'📊' }
  ];

  // status: published | draft. gate: null (everyone) or { by, need }.
  var training = [
    { id:'TR-01', kind:'training', cat:'guidelines', type:'doc',   title:'Partner code of conduct',      sizeMb:1.2, pages:14, status:'published', gate:null, updatedUtc:ago(40) },
    { id:'TR-02', kind:'training', cat:'guidelines', type:'doc',   title:'How to submit a good lead',    sizeMb:0.6, pages:6,  status:'published', gate:null, updatedUtc:ago(30) },
    { id:'TR-03', kind:'training', cat:'policies',   type:'doc',   title:'Consent & data-sharing policy', sizeMb:0.9, pages:9,  status:'published', gate:null, updatedUtc:ago(25) },
    { id:'TR-04', kind:'training', cat:'policies',   type:'doc',   title:'Commission & settlement policy', sizeMb:1.1, pages:11, status:'published', gate:null, updatedUtc:ago(20) },
    { id:'TR-05', kind:'training', cat:'faqs',       type:'doc',   title:'Frequently asked questions',    sizeMb:0.4, pages:5,  status:'published', gate:null, updatedUtc:ago(12) },
    { id:'TR-06', kind:'training', cat:'videos',     type:'video', title:'Pitching The ROSSA to a distant buyer', sizeMb:42, durationMin:6, status:'published', gate:null, updatedUtc:ago(9) },
    { id:'TR-07', kind:'training', cat:'videos',     type:'video', title:'Using the sales kit offline',   sizeMb:28, durationMin:4, status:'draft',     gate:null, updatedUtc:ago(2) }
  ];

  // Sales-kit assets carry a project + optional gate (mirrors partner-kit gates).
  var kit = [
    { id:'KIT-ROSSA-broch',  kind:'kit', project:'The ROSSA',         cat:'brochures',     type:'pdf',   title:'The ROSSA brochure',   sizeMb:2.4, status:'published', gate:null, updatedUtc:ago(18) },
    { id:'KIT-ROSSA-deck',   kind:'kit', project:'The ROSSA',         cat:'presentations', type:'pdf',   title:'Premium pitch deck',   sizeMb:12,  status:'published', gate:{ by:'rank', need:'gold' }, updatedUtc:ago(16) },
    { id:'KIT-OASIS-broch',  kind:'kit', project:'Salmon Oasis Park', cat:'brochures',     type:'pdf',   title:'Oasis Park brochure',  sizeMb:2.1, status:'published', gate:null, updatedUtc:ago(15) },
    { id:'KIT-OASIS-winv',   kind:'kit', project:'Salmon Oasis Park', cat:'scripts',       type:'pdf',   title:'With-Investment brief', sizeMb:0.6, status:'published', gate:{ by:'program', need:'withInvestment' }, updatedUtc:ago(14) },
    { id:'KIT-BELL-script',  kind:'kit', project:'Salmon Bellissimo', cat:'scripts',       type:'pdf',   title:'Basic pitch script',   sizeMb:0.3, status:'draft',     gate:null, updatedUtc:ago(3) }
  ];

  // Audience attributes the targeting modal offers (rank/program from People;
  // team/territory are placeholders — the confirmed lists are OPEN_QUESTIONS).
  var GATE_OPTIONS = {
    program:   [{ value:'zeroInvestment', label:'Zero Investment' }, { value:'withInvestment', label:'With Investment' }],
    rank:      [{ value:'silver', label:'Silver' }, { value:'gold', label:'Gold' }, { value:'platinum', label:'Platinum' }],
    team:      [{ value:'dhaka-north', label:'Dhaka North team' }, { value:'sylhet', label:'Sylhet team' }],
    territory: [{ value:'dhaka', label:'Dhaka' }, { value:'chattogram', label:'Chattogram' }, { value:'sylhet', label:'Sylhet' }]
  };

  function overrides(){ try { return JSON.parse(localStorage.getItem('crm_people_mut')||'{}'); } catch(e){ return {}; } }
  function merge(arr){
    var ov = overrides();
    var seeded = arr.map(function(x){ return Object.assign({}, x, ov['content:'+x.id]||{}); });
    var seen={}; seeded.forEach(function(x){ seen[x.id]=true; });
    var live=[];
    Object.keys(ov).forEach(function(k){ if(k.indexOf('content:')===0){ var id=k.slice(8); if(!seen[id]){ var r=ov[k]; if(r&&r.id) live.push(r); } } });
    return live.concat(seeded);
  }
  function allTraining(){ return merge(training); }
  function allKit(){ return merge(kit); }
  function all(){ return allTraining().concat(allKit()); }
  function byId(id){ return all().filter(function(x){return x.id===id;})[0]||null; }

  function gateLabel(gate){
    if(!gate) return 'All partners';
    var opt=(GATE_OPTIONS[gate.by]||[]).filter(function(o){return o.value===gate.need;})[0];
    return (opt?opt.label:gate.need)+' only ('+gate.by+')';
  }

  root.CRM = root.CRM || {};
  root.CRM.Content = {
    TRAINING_CATS: TRAINING_CATS, KIT_CATS: KIT_CATS, GATE_OPTIONS: GATE_OPTIONS,
    allTraining: allTraining, allKit: allKit, all: all, byId: byId, gateLabel: gateLabel, ago: ago
  };
})(window);
