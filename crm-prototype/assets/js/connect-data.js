/* ============================================================================
 * Salmon CRM — Documents / Communications / Reporting mock data (Part 7)
 * Adds a `CRM.Connect` island. The load-bearing rule: every document carries a
 * visibility classification and an access log; the gate is Perm.canView(role,
 * classification), enforced in the engine (hiding a row is UX, not security).
 * Reports carry an `exportable` flag — the CSV button is gated on it.
 * ==========================================================================*/
(function (root) {
  'use strict';
  function ago(days, h){ h=h||0; var d=new Date('2026-07-15T10:00:00Z'); d.setUTCDate(d.getUTCDate()-days); d.setUTCHours(d.getUTCHours()-h); return d.toISOString(); }
  function fwd(days, h){ h=h||0; var d=new Date('2026-07-15T10:00:00Z'); d.setUTCDate(d.getUTCDate()+days); d.setUTCHours(d.getUTCHours()+h); return d.toISOString(); }

  /* ---------------------------------------------------------------------------
   * Documents. category: Legal | Plan | NOC | Brochure | KYC | Sales record
   * visibility: Internal | Legal-Finance | Partner-visible | Customer-restricted
   * ------------------------------------------------------------------------- */
  function ax(actor, role, kind, days){ return { actor:actor, role:role, kind:kind, whenUtc:ago(days) }; }
  function D(o){ o.versions = o.versions || [{ v:o.version||'v1', uploadedBy:o.uploadedBy, uploadedUtc:o.uploadedUtc, note:'Initial upload' }]; o.access = o.access || []; o.verification = o.verification || 'verified'; o.archived = o.archived || false; return o; }

  var documents = [
    D({ id:'DOC-2001', title:'Oasis Park — Deed of Agreement', category:'Legal', project:'Salmon Oasis Park', visibility:'Legal-Finance', uploadedBy:'Nusrat Jahan', uploadedUtc:ago(60), version:'v2',
      versions:[{v:'v2',uploadedBy:'Nusrat Jahan',uploadedUtc:ago(60),note:'Registrar-stamped copy'},{v:'v1',uploadedBy:'Nusrat Jahan',uploadedUtc:ago(120),note:'Draft'}],
      access:[ax('Tanvir Hasan','MANAGER','view',1), ax('Fatima Ahmed','FINANCE','download',2), ax('Nusrat Jahan','LEGAL','view',5)] }),
    D({ id:'DOC-2002', title:'Bellissimo — Approved Floor Plan (RAJUK)', category:'Plan', project:'Salmon Bellissimo', visibility:'Internal', uploadedBy:'Nusrat Jahan', uploadedUtc:ago(90), version:'v1',
      access:[ax('Rahima Chowdhury','SUPER_ADMIN','view',3), ax('Tanvir Hasan','MANAGER','view',6)] }),
    D({ id:'DOC-2003', title:'The ROSSA — Fire NOC', category:'NOC', project:'The ROSSA', visibility:'Legal-Finance', uploadedBy:'Nusrat Jahan', uploadedUtc:ago(45), version:'v1',
      access:[ax('Fatima Ahmed','FINANCE','view',4)] }),
    D({ id:'DOC-2004', title:'Bellissimo — Brochure v3', category:'Brochure', project:'Salmon Bellissimo', visibility:'Partner-visible', uploadedBy:'Nusrat Jahan', uploadedUtc:ago(20), version:'v3',
      versions:[{v:'v3',uploadedBy:'Nusrat Jahan',uploadedUtc:ago(20),note:'Updated pricing page'},{v:'v2',uploadedBy:'Nusrat Jahan',uploadedUtc:ago(70),note:''},{v:'v1',uploadedBy:'Nusrat Jahan',uploadedUtc:ago(140),note:'Launch'}],
      access:[ax('Tanvir Hasan','MANAGER','download',1), ax('Rahima Chowdhury','SUPER_ADMIN','view',8)] }),
    D({ id:'DOC-2005', title:'Rezaul Karim — Passport (KYC)', category:'KYC', project:'Salmon Oasis Park', visibility:'Customer-restricted', uploadedBy:'Nusrat Jahan', uploadedUtc:ago(0,8), version:'v1',
      access:[ax('Nusrat Jahan','LEGAL','view',0)] }),
    D({ id:'DOC-2006', title:'Selina Akter — NID (KYC)', category:'KYC', project:'Salmon Bellissimo', visibility:'Customer-restricted', uploadedBy:'Nusrat Jahan', uploadedUtc:ago(1), version:'v1', verification:'pending',
      access:[] }),
    D({ id:'DOC-2007', title:'The ROSSA — Customer Sales Record', category:'Sales record', project:'The ROSSA', visibility:'Customer-restricted', uploadedBy:'Fatima Ahmed', uploadedUtc:ago(30), version:'v1',
      access:[ax('External link','—','download',1)] }),
    D({ id:'DOC-2008', title:'Oasis Park — Mutation Certificate', category:'Legal', project:'Salmon Oasis Park', visibility:'Legal-Finance', uploadedBy:'Nusrat Jahan', uploadedUtc:ago(75), version:'v1', access:[] }),
    D({ id:'DOC-2009', title:'Florentine — Structural Drawings', category:'Plan', project:'Salmon Florentine', visibility:'Internal', uploadedBy:'Nusrat Jahan', uploadedUtc:ago(50), version:'v1', access:[] }),
    D({ id:'DOC-2010', title:'Oasis Park — Price Schedule v3', category:'Brochure', project:'Salmon Oasis Park', visibility:'Internal', uploadedBy:'Nusrat Jahan', uploadedUtc:ago(13), version:'v3', verification:'draft', access:[] })
  ];

  /* ---------------------------------------------------------------------------
   * Tickets — unified inbox from BOTH mobile apps (Client + Partner).
   * category: Sales | Accounts | Customer Care | Admin. SLA hours per category.
   * ------------------------------------------------------------------------- */
  var SLA_HOURS = { 'Sales':8, 'Accounts':12, 'Customer Care':6, 'Admin':24 };
  function msg(who, role, text, days, h){ return { who:who, role:role, text:text, t:ago(days,h) }; }
  var tickets = [
    { id:'PT-2087', source:'Partner', category:'Accounts', subject:'Commission question — CM-2026-0680', requester:'Shahin Alam', assignee:'Fatima Ahmed', status:'in progress', createdUtc:ago(1,4), lastActivityUtc:ago(0,3),
      thread:[ msg('Shahin Alam','Partner','When will my ৳92,000 commission be settled?',1,4), msg('Fatima Ahmed','Finance Officer','It’s approved; settlement is in this week’s batch.',0,3) ] },
    { id:'CT-3301', source:'Client', category:'Customer Care', subject:'When is my KYC reviewed?', requester:'Rezaul Karim', assignee:'Nusrat Jahan', status:'open', createdUtc:ago(0,9), lastActivityUtc:ago(0,9),
      thread:[ msg('Rezaul Karim','Client','I uploaded my passport, flying back on the 20th — any update?',0,9) ] },
    { id:'CT-3305', source:'Client', category:'Sales', subject:'Unit availability — Oasis Park', requester:'Ayesha Rahman', assignee:null, status:'open', createdUtc:ago(0,3), lastActivityUtc:ago(0,3),
      thread:[ msg('Ayesha Rahman','Client','Is a west-facing 3-bed still available at Oasis Park?',0,3) ] },
    { id:'PT-2090', source:'Partner', category:'Admin', subject:'Cannot access sales kit', requester:'Rokeya Sultana', assignee:'Tanvir Hasan', status:'waiting', createdUtc:ago(2), lastActivityUtc:ago(1),
      thread:[ msg('Rokeya Sultana','Partner','Gold kit content isn’t showing on my app.',2,0), msg('Tanvir Hasan','Manager','Raised with IT; awaiting fix.',1,0) ] },
    { id:'PT-2092', source:'Partner', category:'Accounts', subject:'Settlement delay', requester:'Shirin Akter', assignee:'Fatima Ahmed', status:'open', createdUtc:ago(1,6), lastActivityUtc:ago(1,6),
      thread:[ msg('Shirin Akter','Partner','My settlement ST-2026-099 is still pending.',1,6) ] },
    { id:'CT-3310', source:'Client', category:'Customer Care', subject:'Handover timeline — The ROSSA', requester:'Imran Chowdhury', assignee:null, status:'open', createdUtc:ago(0,2), lastActivityUtc:ago(0,2),
      thread:[ msg('Imran Chowdhury','Client','When is handover for R-4C?',0,2) ] },
    { id:'CT-3298', source:'Client', category:'Accounts', subject:'Payment not reflected', requester:'Tanya Haque', assignee:'Fatima Ahmed', status:'resolved', createdUtc:ago(4), lastActivityUtc:ago(3),
      thread:[ msg('Tanya Haque','Client','My installment isn’t showing as paid.',4,0), msg('Fatima Ahmed','Finance Officer','Reconciled — it now shows Paid. Thank you.',3,0) ] },
    { id:'PT-2085', source:'Partner', category:'Sales', subject:'Lead reassignment request', requester:'Jahangir Alam', assignee:'Tanvir Hasan', status:'closed', createdUtc:ago(8), lastActivityUtc:ago(6),
      thread:[ msg('Jahangir Alam','Partner','Please move LD-3045 to my new team.',8,0), msg('Tanvir Hasan','Manager','Done.',6,0) ] }
  ];

  /* ---------------------------------------------------------------------------
   * Notices — targeting team / territory / rank / program + schedule + engagement.
   * ------------------------------------------------------------------------- */
  var notices = [
    { id:'NT-01', title:'Eid holiday schedule', body:'Offices closed 16–18 Jul. Support responses may be delayed.', target:{ scope:'All partners' }, audience:128, status:'published', publishedUtc:ago(5), engagement:{ delivered:128, read:96 } },
    { id:'NT-02', title:'Bellissimo price update — Cumilla', body:'Updated price schedule for Cumilla Sadar team. See the sales kit.', target:{ territory:'Chattogram › Cumilla', team:'Cumilla Sadar Alpha' }, audience:34, status:'scheduled', scheduledUtc:fwd(1,2), engagement:{ delivered:0, read:0 } },
    { id:'NT-03', title:'Platinum partner incentive', body:'Q3 incentive for Platinum-rank partners.', target:{ rank:'Platinum' }, audience:3, status:'draft', engagement:{ delivered:0, read:0 } },
    { id:'NT-04', title:'Zero Investment webinar', body:'Live webinar for Zero Investment program partners, 22 Jul.', target:{ program:'Zero Investment' }, audience:96, status:'published', publishedUtc:ago(2), engagement:{ delivered:96, read:71 } }
  ];

  /* ---------------------------------------------------------------------------
   * Reports — fixed list from the proposal. exportable gates the CSV button.
   * ------------------------------------------------------------------------- */
  var reports = [
    { key:'lead-conversion',    name:'Lead conversion',            exportable:true,  cat:'Sales',   desc:'Conversion counts by stage / territory.' },
    { key:'sales-records',      name:'Sales / booking records',    exportable:false, cat:'Sales',   desc:'Individual bookings — contains customer identifiers.' },
    { key:'inventory',          name:'Inventory summary',          exportable:true,  cat:'Catalogue', desc:'Available / reserved / booked / sold by project.' },
    { key:'territory-activity', name:'Team / territory activity',  exportable:true,  cat:'People',  desc:'Aggregate partners / leads / sales per territory.' },
    { key:'meeting-outcomes',   name:'Meeting outcomes',           exportable:true,  cat:'Pipeline',desc:'Meetings held / no-show / converted.' },
    { key:'task-completion',    name:'Task completion rates',      exportable:true,  cat:'Ops',     desc:'Staff task completion aggregates.' },
    { key:'document-activity',  name:'Document activity',          exportable:true,  cat:'Legal',   desc:'View / download counts per category.' },
    { key:'helpdesk',           name:'Help-desk performance',      exportable:true,  cat:'Support', desc:'Tickets by category, avg resolution.' },
    { key:'commission',         name:'Commission per partner',     exportable:false, cat:'Finance', desc:'Amounts per partner — sensitive.' },
    { key:'investment-return',  name:'Investment return',          exportable:false, cat:'Finance', desc:'Amber-locked until legal delivers — sensitive.' },
    { key:'settlement-recon',   name:'Settlement reconciliation',  exportable:false, cat:'Finance', desc:'Settlements with identifiers — sensitive.' }
  ];
  // simple mock rows + a chart series per report key
  function reportData(key){
    var R = {
      'lead-conversion': { columns:['Territory','Submitted','Contacted','Converted','Rate'], rows:[
        ['Chattogram › Cumilla',42,31,8,'19%'],['Dhaka › Savar',28,19,6,'21%'],['Sylhet › Sadar',17,9,3,'18%'],['Chattogram › Chandpur',9,4,1,'11%'] ],
        chart:{ label:'Conversions by territory', bars:[['Cumilla',8],['Savar',6],['Sylhet',3],['Chandpur',1]] } },
      'inventory': { columns:['Project','Available','Reserved','Booked','Sold'], rows:[
        ['Salmon Bellissimo',4,1,1,2],['Salmon Florentine',3,1,1,1],['The ROSSA',2,1,1,2],['Salmon Oasis Park',5,1,1,0] ],
        chart:{ label:'Available units by project', bars:[['Bellissimo',4],['Florentine',3],['ROSSA',2],['Oasis',5]] } },
      'territory-activity': { columns:['Territory','Partners','Leads 30d','Sales 30d'], rows:[
        ['Chattogram › Cumilla',34,22,3],['Dhaka › Savar',28,17,2],['Sylhet › Sadar',19,9,1],['Chattogram › Chandpur',12,5,0] ],
        chart:{ label:'Partners by territory', bars:[['Cumilla',34],['Savar',28],['Sylhet',19],['Chandpur',12]] } },
      'meeting-outcomes': { columns:['Outcome','Count'], rows:[['Held',24],['No-show',5],['Converted',9],['Rescheduled',7]],
        chart:{ label:'Meeting outcomes', bars:[['Held',24],['No-show',5],['Converted',9],['Resched',7]] } },
      'task-completion': { columns:['Team','Assigned','Completed','Rate'], rows:[['Cumilla Sadar Alpha',40,34,'85%'],['Savar Metro',38,36,'95%'],['Sylhet Sadar',22,14,'64%']],
        chart:{ label:'Completion rate %', bars:[['Cumilla',85],['Savar',95],['Sylhet',64]] } },
      'document-activity': { columns:['Category','Views','Downloads'], rows:[['Legal',18,7],['Plan',12,3],['NOC',6,1],['Brochure',31,14],['KYC',9,0]],
        chart:{ label:'Views by category', bars:[['Legal',18],['Plan',12],['NOC',6],['Brochure',31],['KYC',9]] } },
      'helpdesk': { columns:['Category','Open','Resolved','Avg hrs'], rows:[['Sales',2,11,7],['Accounts',2,14,9],['Customer Care',3,8,5],['Admin',1,4,18]],
        chart:{ label:'Open tickets by category', bars:[['Sales',2],['Accounts',2],['Care',3],['Admin',1]] } },
      'sales-records': { columns:['Booking','Client','Project','Amount'], rows:[['BK-2024-01847','Rezaul Karim','Oasis Park','৳13,100,000'],['BK-2024-01860','Selina Akter','Bellissimo','৳16,400,000']],
        chart:{ label:'Bookings by project', bars:[['Oasis',1],['Bellissimo',1]] } },
      'commission': { columns:['Partner','Approved','Settled'], rows:[['Shahin Alam','৳184,000','—'],['Rokeya Sultana','৳45,000','—'],['Jahangir Alam','৳260,000','—']],
        chart:{ label:'Approved (৳000s)', bars:[['Shahin',184],['Rokeya',45],['Jahangir',260]] } },
      'investment-return': { columns:['Note'], rows:[['Amber-locked — out of scope until legal delivers the return model.']], chart:null },
      'settlement-recon': { columns:['Settlement','Partner','Amount','Ref'], rows:[['ST-2026-097','Nasir Uddin','৳55,000','MFS-TXN-7741'],['ST-2026-095','Habibur Rahman','৳41,000','BANK-REF-2231']], chart:null }
    };
    return R[key] || { columns:['—'], rows:[], chart:null };
  }

  /* ---------------------------------------------------------------------------
   * Override-aware reads.
   *   doc:<id> → { visibility, verification, archived, versionsAdd, accessAdd }
   *   tkt:<id> → { status, assignee, threadAdd }
   *   ntc:<id> → { status, publishedUtc }
   *   exportLog → appended CSV export history
   * ------------------------------------------------------------------------- */
  function overrides(){ try { return JSON.parse(localStorage.getItem('crm_people_mut')||'{}'); } catch(e){ return {}; } }

  function mergeDoc(d){ var ov=overrides(); var p=ov['doc:'+d.id]||{}; var m=Object.assign({}, d, p);
    m.access=(p.accessAdd||[]).concat(d.access); m.versions=(p.versionsAdd||[]).concat(d.versions); return m; }
  function allDocuments(){ return documents.map(mergeDoc); }
  function documentById(id){ var d=documents.filter(function(x){return x.id===id;})[0]; return d?mergeDoc(d):null; }

  function allTickets(){ var ov=overrides(); return tickets.map(function(t){ var p=ov['tkt:'+t.id]||{}; var m=Object.assign({}, t, p); m.thread=t.thread.concat(p.threadAdd||[]); return m; }); }
  function ticketById(id){ var t=allTickets().filter(function(x){return x.id===id;})[0]; return t||null; }
  function activeTickets(){ return allTickets().filter(function(t){ return t.status!=='closed'; }); }

  function allNotices(){ var ov=overrides(); return notices.map(function(n){ return Object.assign({}, n, ov['ntc:'+n.id]||{}); }); }
  function noticeById(id){ var n=notices.filter(function(x){return x.id===id;})[0]; if(!n)return null; var ov=overrides(); return Object.assign({}, n, ov['ntc:'+id]||{}); }

  function exportHistory(){ return overrides()['exportLog']||[]; }
  function reportByKey(k){ return reports.filter(function(r){return r.key===k;})[0]; }

  root.CRM = root.CRM || {};
  root.CRM.Connect = {
    CATEGORIES: ['Legal','Plan','NOC','Brochure','KYC','Sales record'],
    VISIBILITIES: ['Internal','Legal-Finance','Partner-visible','Customer-restricted'],
    TICKET_CATEGORIES: ['Sales','Accounts','Customer Care','Admin'], SLA_HOURS: SLA_HOURS,
    allDocuments: allDocuments, documentById: documentById,
    allTickets: allTickets, ticketById: ticketById, activeTickets: activeTickets,
    allNotices: allNotices, noticeById: noticeById,
    reports: reports, reportByKey: reportByKey, reportData: reportData, exportHistory: exportHistory,
    ago: ago, fwd: fwd
  };
})(window);
