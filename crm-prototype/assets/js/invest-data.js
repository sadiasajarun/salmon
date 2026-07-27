/* ============================================================================
 * Salmon CRM — With Investment record desk mock data (Req 6.6)
 * ----------------------------------------------------------------------------
 * ⚠️  THE MOST LEGALLY SENSITIVE MODULE. Read before editing.
 *
 * The app is a PASSIVE RECORD-KEEPER. Staff record the SHAPE of a confirmed
 * share and of return entries — AFTER offline documentation + payment
 * verification done through Salmon's legal/finance process. The app:
 *   - computes nothing, promises nothing, executes nothing, disburses nothing,
 *   - NEVER holds a money amount here. Every legally-consequential value is the
 *     marker  [AMOUNT — LEGAL SIGN-OFF REQUIRED]  until counsel signs off the
 *     structure and values. There is deliberately NO amount field in this data.
 *   - the higher-tier commission is NOT modelled here — it flows through the
 *     COMMON commission ledger (commission-data.js / L02), hand-entered.
 *
 * Mirrors commission-data.js: seed records + override-aware reads. Overrides
 * live in the same `crm_people_mut` store the rest of the console uses.
 * ==========================================================================*/
(function (root) {
  'use strict';

  var AMOUNT_MARKER = '[AMOUNT — LEGAL SIGN-OFF REQUIRED]';
  var TERMS_MARKER  = '[CLIENT-APPROVED TERMS REQUIRED]';
  var EFFDATE_MARKER= '[EFFECTIVE DATE — CLIENT-APPROVED]';

  function ago(days, h){ h=h||0; var d=new Date('2026-07-15T10:00:00Z'); d.setUTCDate(d.getUTCDate()-days); d.setUTCHours(d.getUTCHours()-h); return d.toISOString(); }

  /* ---- Investment enquiries (clauses 1–2): a request to be contacted -------- */
  // Framed as contact requests, never transactions. `interest` is a description
  // of intent (free text) — NOT an amount paid through the app.
  var enquiries = [
    { id:'INV-ENQ-0007', partner:'Nasrin Ahmed', partnerId:'SDP-DHK-00210', ref:'SHARE-OP-07 · Salmon Oasis Park', interest:'Interested in an additional share; wants to discuss terms.', contact:'Afternoon (12pm–4pm)', notes:'Prefers a call, then a site visit.', status:'new', createdUtc:ago(1) }
  ];

  /* ---- Confirmed shares (clause 3): staff-recorded, offline-verified -------- */
  // status: confirmed. NO amount — held as marker. Terms held as marker. The app
  // did NOT process any payment; this is a record of an offline decision.
  var shares = [
    { id:'INV-2026-0142', partner:'Nasrin Ahmed', partnerId:'SDP-DHK-00210', project:'Salmon Oasis Park', shareRef:'SHARE-OP-07',
      amount:AMOUNT_MARKER, terms:TERMS_MARKER, effectiveDate:EFFDATE_MARKER, status:'confirmed',
      recordedBy:'Fatima Ahmed', recordedUtc:ago(15), note:'Offline documentation + payment verified through finance. App records the shape only.' }
  ];

  /* ---- Return schedule (clause 4): STATUS-ONLY entries ---------------------- */
  // Each entry belongs to a share. status: paid | pending | onHold. Amount is
  // the marker on every row — the app never calculates or projects a return.
  var returns = [
    { id:'RE-0142-01', shareId:'INV-2026-0142', period:'Entry 1', amount:AMOUNT_MARKER, status:'paid',    recordedBy:'Fatima Ahmed', recordedUtc:ago(101), note:'' },
    { id:'RE-0142-02', shareId:'INV-2026-0142', period:'Entry 2', amount:AMOUNT_MARKER, status:'paid',    recordedBy:'Fatima Ahmed', recordedUtc:ago(71),  note:'' },
    { id:'RE-0142-03', shareId:'INV-2026-0142', period:'Entry 3', amount:AMOUNT_MARKER, status:'paid',    recordedBy:'Fatima Ahmed', recordedUtc:ago(41),  note:'' },
    { id:'RE-0142-04', shareId:'INV-2026-0142', period:'Entry 4', amount:AMOUNT_MARKER, status:'pending', recordedBy:'Fatima Ahmed', recordedUtc:ago(14),  note:'Recorded as intended — not confirmed.' },
    { id:'RE-0142-05', shareId:'INV-2026-0142', period:'Entry 5', amount:AMOUNT_MARKER, status:'onHold',  recordedBy:'Fatima Ahmed', recordedUtc:ago(14),  note:'Held pending Salmon review.' }
  ];

  /* ---- override-aware reads (mirror commission-data.js) --------------------- */
  function overrides(){ try { return JSON.parse(localStorage.getItem('crm_people_mut')||'{}'); } catch(e){ return {}; } }

  function merge(arr, prefix){
    var ov = overrides();
    var seeded = arr.map(function(x){ return Object.assign({}, x, ov[prefix+x.id]||{}); });
    var seen={}; seeded.forEach(function(x){ seen[x.id]=true; });
    var live=[];
    Object.keys(ov).forEach(function(k){ if(k.indexOf(prefix)===0){ var id=k.slice(prefix.length); if(!seen[id]){ var r=ov[k]; if(r&&r.id) live.push(r); } } });
    return live.concat(seeded);
  }

  function allEnquiries(){ return merge(enquiries,'invenq:'); }
  function allShares(){ return merge(shares,'invshare:'); }
  function allReturns(){ return merge(returns,'invret:'); }
  function shareById(id){ return allShares().filter(function(s){return s.id===id;})[0]||null; }
  function returnsForShare(id){ return allReturns().filter(function(r){return r.shareId===id;}); }
  function newEnquiries(){ return allEnquiries().filter(function(e){return e.status==='new';}); }

  var RETURN_STATUS = {
    paid:   { label:'Paid',    chip:'grey'   },
    pending:{ label:'Pending', chip:'amber'  },
    onHold: { label:'On hold', chip:'violet' }
  };

  root.CRM = root.CRM || {};
  root.CRM.Invest = {
    AMOUNT_MARKER: AMOUNT_MARKER, TERMS_MARKER: TERMS_MARKER, EFFDATE_MARKER: EFFDATE_MARKER,
    RETURN_STATUS: RETURN_STATUS,
    allEnquiries: allEnquiries, newEnquiries: newEnquiries,
    allShares: allShares, shareById: shareById,
    allReturns: allReturns, returnsForShare: returnsForShare,
    ago: ago
  };
})(window);
