/* ============================================================================
 * Salmon CRM — Hardening / admin data (Part 8)
 * Adds a `CRM.Admin` island: staff users, system configuration, notification
 * templates. Two things deliberately absent by design:
 *   - NO staff password fields (mock auth; real auth is SSO/MFA)
 *   - NO gateway credentials / secrets (those live in a locked-down secrets
 *     manager, never in the panel UI)
 * The audit-log UI reads Audit.fullLog() (persisted ledger), not this file.
 * ==========================================================================*/
(function (root) {
  'use strict';
  var R = root.Perm.ROLES;
  function ago(days, h){ h=h||0; var d=new Date('2026-07-15T10:00:00Z'); d.setUTCDate(d.getUTCDate()-days); d.setUTCHours(d.getUTCHours()-h); return d.toISOString(); }

  /* ---------------------------------------------------------------------------
   * Staff users — never deleted, only deactivated (audit history follows them).
   * No password field anywhere.
   * ------------------------------------------------------------------------- */
  var staffUsers = [
    { id:'U-001', name:'Rahima Chowdhury', email:'rahima.chowdhury@salmondevelopers.bd', role:R.SUPER_ADMIN, office:'Dhaka Head Office', status:'active', lastActiveUtc:ago(0,1), createdUtc:ago(400) },
    { id:'U-002', name:'Tanvir Hasan',     email:'tanvir.hasan@salmondevelopers.bd',     role:R.MANAGER,     office:'Dhaka Head Office', status:'active', lastActiveUtc:ago(0,3), createdUtc:ago(300) },
    { id:'U-003', name:'Fatima Ahmed',     email:'fatima.ahmed@salmondevelopers.bd',     role:R.FINANCE,     office:'Dhaka Head Office', status:'active', lastActiveUtc:ago(0,2), createdUtc:ago(280) },
    { id:'U-004', name:'Nusrat Jahan',     email:'nusrat.jahan@salmondevelopers.bd',     role:R.LEGAL,       office:'Dhaka Head Office', status:'active', lastActiveUtc:ago(0,5), createdUtc:ago(260) },
    { id:'U-005', name:'Kabir Ahmed',      email:'kabir.ahmed@salmondevelopers.bd',      role:R.MANAGER,     office:'Chattogram Branch', status:'active', lastActiveUtc:ago(1), createdUtc:ago(120) },
    { id:'U-006', name:'Sadia Islam',      email:'sadia.islam@salmondevelopers.bd',      role:R.FINANCE,     office:'Dhaka Head Office', status:'deactivated', deactivatedReason:'Left the company — access revoked 30 Jun.', deactivatedUtc:ago(15), lastActiveUtc:ago(16), createdUtc:ago(200) }
  ];

  /* ---------------------------------------------------------------------------
   * System configuration (defaults; overrides merged from localStorage).
   * NO credentials anywhere — enablement + mode only.
   * ------------------------------------------------------------------------- */
  var COUNTRIES = ['Bangladesh','UAE','UK','Canada','Australia'];
  var config = {
    gateways: {
      'Stripe':            { mode:'test', countries:{ Bangladesh:false, UAE:true,  UK:true,  Canada:true,  Australia:true } },
      'PayPal':            { mode:'test', countries:{ Bangladesh:false, UAE:true,  UK:true,  Canada:true,  Australia:false } },
      'SSLCommerz':        { mode:'live', countries:{ Bangladesh:true,  UAE:false, UK:false, Canada:false, Australia:false } },
      'International wire': { mode:'live', countries:{ Bangladesh:true,  UAE:true,  UK:true,  Canada:true,  Australia:true } },
      'Local MFS':         { mode:'live', countries:{ Bangladesh:true,  UAE:false, UK:false, Canada:false, Australia:false } }
    },
    currency: { display:['BDT','USD','AED','GBP','CAD','AUD'], base:'BDT', source:'Manual entry (OPEN_QUESTIONS #9)', rounding:'Nearest 1', rates:{ USD:118, AED:32, GBP:150, CAD:86, AUD:78 } },
    booking:  { tokenDefaultBdt:1500000, lockDurationHours:72 },
    slots:    { durationMins:30, bufferMins:10, horizonDays:14, cancellationHours:24 },
    providers:{ chat:'Undecided (WhatsApp Business API vs in-app)', meeting:'Zoom' },
    features: { people:true, catalogue:true, pipeline:true, finance:true, commission:true, documents:true, communications:true, reporting:true, withInvestment:false },
    minAppVersion: '1.4.0',
    session:  { timeoutMins:30, maxConcurrent:2, mfa:'Required (method TBD — OPEN_QUESTIONS #1)' },
    invoice:  { prefix:'INV-2026-', taxLabel:'VAT (rate from config)', legal:'Salmon Developers Ltd. · This is a computer-generated invoice.' }
  };

  /* ---------------------------------------------------------------------------
   * Status sets (clause 6.18.2) — the "basic statuses" every module reads.
   * These are the ENUMS the modules already use, surfaced here so a Super Admin
   * can rename the client-facing LABEL and toggle a value active/retired. The
   * canonical `key` is never editable (it is what the backend stores) — only the
   * display label and whether the value is offered on new records. Retiring a
   * value never rewrites history (records already in that state keep it) — same
   * "nothing hard-deletes" discipline as user deactivation. Values sourced from
   * the real module code; where a set is not yet nailed down it carries an
   * OPEN_QUESTIONS marker rather than an invented workflow.
   * ------------------------------------------------------------------------- */
  function S(key, label, active){ return { key:key, label:label==null?key:label, active:active!==false }; }
  var statusSets = [
    { id:'lead', label:'Lead', note:'Pipeline advance path (F03). Terminal states cannot be retired.',
      values:[ S('new','New'), S('contacted','Contacted'), S('qualified','Qualified'), S('meetingScheduled','Meeting scheduled'), S('visitScheduled','Visit scheduled'), S('visitCompleted','Visit completed'), S('negotiation','Negotiation'), S('converted','Converted'), S('onHold','On hold'), S('rejected','Rejected') ] },
    { id:'booking', label:'Booking', note:'Booking record lifecycle (I/J).',
      values:[ S('pending','Pending'), S('confirmed','Confirmed'), S('cancelled','Cancelled') ] },
    { id:'meeting', label:'Meeting / consultation', note:'Meeting & site-visit queue (G).',
      values:[ S('pending','Requested'), S('confirmed','Confirmed'), S('completed','Completed'), S('cancelled','Cancelled') ] },
    { id:'task', label:'Task assignment', note:'Internal task hand-offs. Set not yet finalised — OPEN_QUESTIONS #5.',
      values:[ S('open','Open'), S('inProgress','In progress'), S('done','Done') ] },
    { id:'document', label:'Document', note:'Controlled-document verification (N).',
      values:[ S('draft','Draft'), S('pending','Pending review'), S('verified','Verified'), S('archived','Archived') ] },
    { id:'commission', label:'Commission', note:'Commission queue → ledger (L).',
      values:[ S('submitted','Submitted'), S('approved','Approved'), S('held','On hold'), S('rejected','Rejected'), S('settled','Settled') ] },
    { id:'return', label:'Investment return record', note:'With-Investment return records (6.6) — amber-locked pending legal, so values are record-only. OPEN_QUESTIONS #6.',
      values:[ S('scheduled','Scheduled'), S('due','Due'), S('paid','Paid'), S('held','On hold') ] },
    { id:'ticket', label:'Support ticket', note:'Support inbox (O01).',
      values:[ S('open','Open'), S('inProgress','In progress'), S('waiting','Waiting'), S('resolved','Resolved'), S('closed','Closed') ] },
    { id:'settlement', label:'Settlement', note:'Settlement queue → mark settled (M).',
      values:[ S('submitted','Submitted'), S('approved','Approved'), S('held','On hold'), S('rejected','Rejected'), S('settled','Settled') ] }
  ];
  // Terminal values that may be relabelled but never retired (a record can always land here).
  var LOCKED_STATUS_VALUES = { lead:['converted','rejected','onHold'], commission:['settled','rejected'], settlement:['settled','rejected'], ticket:['closed'] };

  /* ---------------------------------------------------------------------------
   * Notification templates — where every mobile push originates. EN + BN copy.
   * The mobile rule: NO sensitive value in a push payload (deep-link, don't
   * disclose). SENSITIVE_VARS is what the editor blocks on save.
   * ------------------------------------------------------------------------- */
  var SENSITIVE_VARS = ['amount','balance','commissionValue','commission','cardLast4','reference','ref','price','settlementAmount','payout','iban','account'];
  function T(o){ o.variables = o.variables || []; return o; }
  var templates = [
    T({ id:'TPL-approve-partner', name:'Partner approved', type:'Push', trigger:'Partner application approved (B09)',
      titleEn:'Welcome to Salmon 🎉', bodyEn:'Hi {name}, your partner application is approved. Open the app to see your Partner ID.',
      titleBn:'সালমনে স্বাগতম 🎉', bodyBn:'{name}, আপনার আবেদন অনুমোদিত হয়েছে। পার্টনার আইডি দেখতে অ্যাপ খুলুন।', variables:['name'] }),
    T({ id:'TPL-reject-partner', name:'Partner rejected', type:'Push', trigger:'Partner application rejected (B08)',
      titleEn:'Application update', bodyEn:'Hi {name}, there’s an update on your application. Open the app to read it.',
      titleBn:'আবেদন সংক্রান্ত আপডেট', bodyBn:'{name}, আপনার আবেদন সম্পর্কে একটি আপডেট আছে। পড়তে অ্যাপ খুলুন।', variables:['name'] }),
    T({ id:'TPL-kyc-verified', name:'KYC verified', type:'Push', trigger:'KYC verified (C05)',
      titleEn:'KYC verified ✓', bodyEn:'Hi {name}, your identity is verified. You can now transact.',
      titleBn:'কেওয়াইসি যাচাই সম্পন্ন ✓', bodyBn:'{name}, আপনার পরিচয় যাচাই সম্পন্ন হয়েছে।', variables:['name'] }),
    T({ id:'TPL-booking-confirmed', name:'Booking confirmed', type:'Push', trigger:'Booking confirmed (I02/J02)',
      titleEn:'Booking confirmed', bodyEn:'Hi {name}, your booking for {project} is confirmed. Tap to view your receipt.',
      titleBn:'বুকিং নিশ্চিত হয়েছে', bodyBn:'{name}, {project}-এ আপনার বুকিং নিশ্চিত হয়েছে। রসিদ দেখতে ট্যাপ করুন।', variables:['name','project'] }),
    T({ id:'TPL-commission-approved', name:'Commission approved', type:'Push', trigger:'Commission approved (L02)',
      titleEn:'Commission update', bodyEn:'Hi {name}, you have a commission update. Open the app to view your earnings.',
      titleBn:'কমিশন আপডেট', bodyBn:'{name}, আপনার আয়ের একটি আপডেট আছে। অ্যাপ খুলুন।', variables:['name'] }),
    T({ id:'TPL-installment-due', name:'Installment reminder', type:'Push', trigger:'Installment due/overdue (K03)',
      titleEn:'Payment reminder', bodyEn:'Hi {name}, an installment for {project} is due. Tap to see details in the app.',
      titleBn:'পেমেন্ট রিমাইন্ডার', bodyBn:'{name}, {project}-এর একটি কিস্তি বাকি আছে। বিস্তারিত দেখতে ট্যাপ করুন।', variables:['name','project'] })
  ];

  /* ---------------------------------------------------------------------------
   * Override-aware reads (cfg / usr / tpl overrides in localStorage).
   * ------------------------------------------------------------------------- */
  function overrides(){ try { return JSON.parse(localStorage.getItem('crm_people_mut')||'{}'); } catch(e){ return {}; } }

  function getConfig(){
    var ov = overrides(); var c = JSON.parse(JSON.stringify(config));
    Object.keys(ov).forEach(function(k){ if (k.indexOf('cfg:')===0){ deepAssign(c, k.slice(4), ov[k]); } });
    return c;
  }
  function deepAssign(obj, path, val){ var parts=path.split('.'); var o=obj; for(var i=0;i<parts.length-1;i++){ if(o[parts[i]]==null) o[parts[i]]={}; o=o[parts[i]]; } o[parts[parts.length-1]]=val; }

  function allUsers(){ var ov=overrides(); return staffUsers.map(function(u){ return Object.assign({}, u, ov['usr:'+u.id]||{}); }).concat((ov['usrAdd']||[])); }
  function userById(id){ return allUsers().filter(function(u){ return u.id===id; })[0]; }

  function allTemplates(){ var ov=overrides(); return templates.map(function(t){ return Object.assign({}, t, ov['tpl:'+t.id]||{}); }); }
  function templateById(id){ return allTemplates().filter(function(t){ return t.id===id; })[0]; }

  // find sensitive variables referenced in a template body/title
  function sensitiveVarsIn(text){
    var found=[]; var re=/\{([a-zA-Z0-9_]+)\}/g, m;
    while((m=re.exec(text||''))){ var v=m[1]; if (SENSITIVE_VARS.indexOf(v)>-1 && found.indexOf(v)<0) found.push(v); }
    return found;
  }

  // Status sets are override-aware too (label + active toggles persist to the
  // same cfg: namespace, keyed statusset:<setId>:<valueKey>:<field>).
  function getStatusSets(){
    var ov = overrides();
    return statusSets.map(function(set){
      return Object.assign({}, set, { values: set.values.map(function(v){
        var lp = ov['statusset:'+set.id+':'+v.key+':label'];
        var ap = ov['statusset:'+set.id+':'+v.key+':active'];
        return Object.assign({}, v, { label: lp!=null?lp:v.label, active: ap!=null?ap:v.active });
      }) });
    });
  }
  function statusSetById(id){ return getStatusSets().filter(function(s){ return s.id===id; })[0]; }
  function isStatusLocked(setId, valueKey){ return (LOCKED_STATUS_VALUES[setId]||[]).indexOf(valueKey) > -1; }

  root.CRM = root.CRM || {};
  root.CRM.Admin = {
    COUNTRIES: COUNTRIES, SENSITIVE_VARS: SENSITIVE_VARS,
    allUsers: allUsers, userById: userById, ROLE_LIST:[R.SUPER_ADMIN,R.MANAGER,R.FINANCE,R.LEGAL],
    getConfig: getConfig,
    getStatusSets: getStatusSets, statusSetById: statusSetById, isStatusLocked: isStatusLocked,
    allTemplates: allTemplates, templateById: templateById, sensitiveVarsIn: sensitiveVarsIn,
    ago: ago
  };
})(window);
