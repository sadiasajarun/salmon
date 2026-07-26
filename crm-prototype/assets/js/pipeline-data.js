/* ============================================================================
 * Salmon CRM — Sales Pipeline mock data (Part 4)
 * Adds a `CRM.Pipeline` island. Leads carry the FULL internal status set; the
 * partner app only ever sees a 6-status projection (the wall between internal
 * and partner-facing). Reuses Part-2 partners/clients + Part-3 projects.
 * Mutations recorded as localStorage overrides (via Ripples.mutate), merged on
 * read — including the Pending commission records F04 creates for Part 6.
 * ==========================================================================*/
(function (root) {
  'use strict';

  function ago(days, h){ h=h||0; var d=new Date('2026-07-15T10:00:00Z'); d.setUTCDate(d.getUTCDate()-days); d.setUTCHours(d.getUTCHours()-h); return d.toISOString(); }
  function fwd(days, h){ h=h||0; var d=new Date('2026-07-15T10:00:00Z'); d.setUTCDate(d.getUTCDate()+days); d.setUTCHours(d.getUTCHours()+h); return d.toISOString(); }

  /* ---------------------------------------------------------------------------
   * Internal lead statuses (OPEN_QUESTIONS #1) — richer than the 6 the partner sees.
   * PARTNER_PROJECTION maps each internal status → the simplified partner status
   * shown on the mobile P30 lead screen. This is the "wall" made explicit.
   * ------------------------------------------------------------------------- */
  var INTERNAL_STATUS = {
    new:              { label:'New',                chip:'blue'   },
    contacted:        { label:'Contacted',          chip:'blue'   },
    qualified:        { label:'Qualified',          chip:'blue'   },
    meetingScheduled: { label:'Meeting scheduled',  chip:'blue'   },
    visitScheduled:   { label:'Site visit scheduled',chip:'blue'  },
    visitCompleted:   { label:'Visit completed',    chip:'blue'   },
    negotiation:      { label:'In negotiation',     chip:'violet' },
    converted:        { label:'Converted',          chip:'green'  },
    onHold:           { label:'On hold',            chip:'amber'  },
    rejected:         { label:'Closed / rejected',  chip:'red'    }
  };
  // ordered flow for the status picker (excludes terminal onHold/rejected/converted from the "advance" path)
  var STATUS_FLOW = ['new','contacted','qualified','meetingScheduled','visitScheduled','visitCompleted','negotiation','converted'];

  // partner-facing 6-status projection (what Shahin sees on P30)
  var PARTNER_PROJECTION = {
    new:'submitted', contacted:'contacted', qualified:'contacted',
    meetingScheduled:'meetingScheduled', visitScheduled:'meetingScheduled',
    visitCompleted:'visitCompleted', negotiation:'visitCompleted',
    converted:'converted', onHold:'contacted', rejected:'closed'
  };
  var PARTNER_LABEL = { submitted:'Submitted', contacted:'Contacted', meetingScheduled:'Meeting scheduled', visitCompleted:'Visit completed', converted:'Converted', closed:'Closed' };

  /* ---------------------------------------------------------------------------
   * Leads — internal CRM pipeline. Owner (staff) is internal-only.
   * ------------------------------------------------------------------------- */
  function tl(t, kind, text, internal){ return { t:t, kind:kind, text:text, internal:!!internal }; }

  var leads = [
    { id:'LD-3041', buyer:'Rahim Uddin', buyerPhone:'+8801710-330041', project:'The ROSSA', unit:'R-14B',
      partner:'Shahin Alam', partnerId:'SDP-CUM-00417', territory:'Chattogram › Cumilla › Cumilla Sadar',
      status:'visitCompleted', owner:'Tanvir Hasan', createdUtc:ago(9), updatedUtc:ago(1),
      timeline:[
        tl(ago(1),'visit','Site visit completed at The ROSSA — buyer liked unit R-14B.'),
        tl(ago(1,4),'note','Buyer asking about 4-bed payment plan; flagged for negotiation.', true),
        tl(ago(3),'meeting','Site visit scheduled for R-14B.'),
        tl(ago(5),'contact','Called buyer — interested, wants a weekend visit.'),
        tl(ago(6),'note','Owner reassigned from Rahima → Tanvir.', true),
        tl(ago(9),'submission','Lead submitted by Shahin Alam via mobile app.')
      ] },
    { id:'LD-3052', buyer:'Selina Akter', buyerPhone:'+8801712-500002', project:'Salmon Oasis Park', unit:'O-6C',
      partner:'Rokeya Sultana', partnerId:'SDP-SAV-00231', territory:'Dhaka › Dhaka › Savar',
      status:'meetingScheduled', owner:'Tanvir Hasan', createdUtc:ago(4), updatedUtc:ago(1,2),
      timeline:[
        tl(ago(1,2),'meeting','Meeting scheduled — Oasis Park show unit, 16 Jul.'),
        tl(ago(3),'contact','Contacted buyer, shared Oasis Park brochure.'),
        tl(ago(4),'submission','Lead submitted by Rokeya Sultana.')
      ] },
    { id:'LD-3048', buyer:'Abdul Karim', buyerPhone:'+8801811-220048', project:'Salmon Bellissimo', unit:'A-7C',
      partner:'Shahin Alam', partnerId:'SDP-CUM-00417', territory:'Chattogram › Cumilla › Cumilla Sadar',
      status:'negotiation', owner:'Tanvir Hasan', createdUtc:ago(12), updatedUtc:ago(2),
      timeline:[
        tl(ago(2),'note','Buyer negotiating on A-7C price; within 3% of list — likely to close.', true),
        tl(ago(5),'visit','Visit completed at Bellissimo.'),
        tl(ago(8),'meeting','Meeting held, buyer shortlisted A-7C and A-8C.'),
        tl(ago(12),'submission','Lead submitted by Shahin Alam.')
      ] },
    { id:'LD-3061', buyer:'Kamrul Islam', buyerPhone:'+44 7700-500004', project:'Salmon Bellissimo', unit:'A-5B',
      partner:'Shahin Alam', partnerId:'SDP-CUM-00417', territory:'Chattogram › Cumilla › Cumilla Sadar',
      status:'visitCompleted', owner:'Rahima Chowdhury', createdUtc:ago(15), updatedUtc:ago(3),
      timeline:[
        tl(ago(3),'visit','Overseas buyer (London) attended virtual visit — ready to book A-5B.'),
        tl(ago(7),'meeting','Online consultation held.'),
        tl(ago(15),'submission','Lead submitted by Shahin Alam.')
      ] },
    { id:'LD-3045', buyer:'Momena Begum', buyerPhone:'+8801933-450045', project:'Zheel View', unit:null,
      partner:'Jahangir Alam', partnerId:'SDP-CUM-00460', territory:'Chattogram › Cumilla › Amratali',
      status:'contacted', owner:'Tanvir Hasan', createdUtc:ago(2), updatedUtc:ago(0,8),
      timeline:[
        tl(ago(0,8),'contact','Called buyer — Zheel View not yet published; noted interest.'),
        tl(ago(2),'submission','Lead submitted by Jahangir Alam.')
      ] },
    { id:'LD-3067', buyer:'Nadia Islam', buyerPhone:'+8801812-500005', project:'Salmon Oasis Park', unit:'O-4B',
      partner:'Rokeya Sultana', partnerId:'SDP-SAV-00231', territory:'Dhaka › Dhaka › Savar',
      status:'new', owner:null, createdUtc:ago(0,5), updatedUtc:ago(0,5),
      timeline:[ tl(ago(0,5),'submission','Lead submitted by Rokeya Sultana — awaiting first contact.') ] },
    { id:'LD-3033', buyer:'Robiul Awal', buyerPhone:'+60 12-500-0020', project:'Salmon Oasis Park', unit:null,
      partner:'Mizanur Rahman', partnerId:'SDP-SYL-00088', territory:'Sylhet › Sylhet › Sylhet Sadar',
      status:'onHold', owner:'Tanvir Hasan', createdUtc:ago(20), updatedUtc:ago(6),
      timeline:[
        tl(ago(6),'note','On hold — buyer KYC rejected (expired passport). Awaiting re-submission.', true),
        tl(ago(10),'contact','Buyer keen but documents pending.'),
        tl(ago(20),'submission','Lead submitted by Mizanur Rahman.')
      ] },
    { id:'LD-3029', buyer:'Shamima Nasrin', buyerPhone:'+8801712-500021', project:'The ROSSA', unit:null,
      partner:'Rokeya Sultana', partnerId:'SDP-SAV-00231', territory:'Dhaka › Dhaka › Savar',
      status:'rejected', owner:'Tanvir Hasan', createdUtc:ago(24), updatedUtc:ago(9),
      rejection:{ reason:'Budget mismatch — buyer looking below The ROSSA entry price.', internalOnly:true },
      timeline:[
        tl(ago(9),'reject','Lead closed — budget mismatch (internal).', true),
        tl(ago(18),'contact','Buyer wants sub-2cr; ROSSA starts higher.'),
        tl(ago(24),'submission','Lead submitted by Rokeya Sultana.')
      ] },
    { id:'LD-3072', buyer:'Imran Chowdhury', buyerPhone:'+61 4-5000-0006', project:'The ROSSA', unit:'R-4C',
      partner:'Shirin Akter', partnerId:'SDP-SYL-00099', territory:'Sylhet › Sylhet › Sylhet Sadar',
      status:'qualified', owner:'Rahima Chowdhury', createdUtc:ago(5), updatedUtc:ago(1,6),
      timeline:[
        tl(ago(1,6),'note','Qualified — funds confirmed, overseas buyer (Sydney).', true),
        tl(ago(3),'contact','Contacted, strong intent.'),
        tl(ago(5),'submission','Lead submitted by Shirin Akter.')
      ] },
    { id:'LD-3018', buyer:'Tanya Haque', buyerPhone:'+8801712-500010', project:'Salmon Oasis Park', unit:'O-2A',
      partner:'Rokeya Sultana', partnerId:'SDP-SAV-00231', territory:'Dhaka › Dhaka › Savar',
      status:'converted', owner:'Tanvir Hasan', createdUtc:ago(40), updatedUtc:ago(6),
      convertedUnit:'O-2A', timeline:[
        tl(ago(6),'convert','Conversion verified — O-2A booked. Commission record created.'),
        tl(ago(9),'visit','Visit completed, booking money paid.'),
        tl(ago(40),'submission','Lead submitted by Rokeya Sultana.')
      ] }
  ];

  /* ---------------------------------------------------------------------------
   * Meetings (partner requests) + site visits.
   * ------------------------------------------------------------------------- */
  var meetings = [
    { id:'MT-771', requester:'Shahin Alam', kind:'partner', buyer:'Rahim Uddin', project:'The ROSSA', leadId:'LD-3041', proposedUtc:fwd(0,3), status:'pending' },
    { id:'MT-773', requester:'Rokeya Sultana', kind:'partner', buyer:'Selina Akter', project:'Salmon Oasis Park', leadId:'LD-3052', proposedUtc:fwd(1,2), status:'pending' },
    { id:'MT-768', requester:'Jahangir Alam', kind:'partner', buyer:'Momena Begum', project:'Zheel View', leadId:'LD-3045', proposedUtc:fwd(2), status:'pending' }
  ];
  var siteVisits = [
    { id:'SV-410', requester:'Shahin Alam', buyer:'Abdul Karim', project:'Salmon Bellissimo', leadId:'LD-3048', location:'Bashundhara R/A, Block J — site office', proposedUtc:fwd(1,4), status:'pending' },
    { id:'SV-408', requester:'Shirin Akter', buyer:'Imran Chowdhury', project:'The ROSSA', leadId:'LD-3072', location:'Bashundhara R/A, Block K — show unit', proposedUtc:fwd(3), status:'pending' }
  ];

  /* ---------------------------------------------------------------------------
   * Consultations (global clients) + scheduler slots (Dhaka time).
   * ------------------------------------------------------------------------- */
  var slots = [
    { id:'SL-01', startUtc:fwd(0,2), mins:30, status:'open' },
    { id:'SL-02', startUtc:fwd(0,5), mins:30, status:'booked' },
    { id:'SL-03', startUtc:fwd(1,3), mins:45, status:'open' },
    { id:'SL-04', startUtc:fwd(1,6), mins:30, status:'open' },
    { id:'SL-05', startUtc:fwd(2,2), mins:30, status:'open' }
  ];
  var consultations = [
    { id:'CS-410', client:'Rezaul Karim', clientId:'CL-5001', tz:'Asia/Dubai (GST)', project:'Salmon Oasis Park', slotId:'SL-02', slotUtc:fwd(0,5), status:'requested', mobileId:'rezaul' },
    { id:'CS-411', client:'Ayesha Rahman', clientId:'CL-5003', tz:'America/Toronto (EDT)', project:'The ROSSA', slotId:null, slotUtc:fwd(1,3), status:'requested', mobileId:'ayesha' },
    { id:'CS-409', client:'Imran Chowdhury', clientId:'CL-5006', tz:'Australia/Sydney (AEST)', project:'The ROSSA', slotId:null, slotUtc:ago(1), status:'confirmed', link:'https://meet.google.com/mock-cs-409', prep:'Overseas buyer, funds confirmed. Focus on R-4C and handover timeline.', mobileId:'imran' }
  ];

  /* ---------------------------------------------------------------------------
   * Override-aware reads.
   *   lead:<id>   → { status, owner, timelineAdd:[...], rejection }
   *   meet:<id>   → { status, link, staff, proposedUtc }
   *   cons:<id>   → { status, link, slotId, prep }
   *   comm:<id>   → a created Pending commission record (F04) for Part 6
   * ------------------------------------------------------------------------- */
  function overrides(){ try { return JSON.parse(localStorage.getItem('crm_people_mut')||'{}'); } catch(e){ return {}; } }

  function mergeLead(l){
    var ov = overrides(); var p = ov['lead:'+l.id] || {};
    var m = Object.assign({}, l, p);
    m.timeline = (p.timelineAdd||[]).concat(l.timeline);
    return m;
  }
  function allLeads(){ return leads.map(mergeLead); }
  function leadById(id){ var l = leads.filter(function(x){return x.id===id;})[0]; return l?mergeLead(l):null; }

  function allMeetings(){ var ov=overrides(); return meetings.map(function(m){ return Object.assign({}, m, ov['meet:'+m.id]||{}); }); }
  function meetingById(id){ var m=meetings.filter(function(x){return x.id===id;})[0]; if(!m)return null; var ov=overrides(); return Object.assign({}, m, ov['meet:'+id]||{}); }
  function allSiteVisits(){ var ov=overrides(); return siteVisits.map(function(v){ return Object.assign({}, v, ov['visit:'+v.id]||{}); }); }
  function visitById(id){ var v=siteVisits.filter(function(x){return x.id===id;})[0]; if(!v)return null; var ov=overrides(); return Object.assign({}, v, ov['visit:'+id]||{}); }

  function allSlots(){ var ov=overrides(); return (ov['slotsAdd']||[]).concat(slots.map(function(s){ return Object.assign({}, s, ov['slot:'+s.id]||{}); })); }
  function allConsultations(){ var ov=overrides(); return consultations.map(function(c){ return Object.assign({}, c, ov['cons:'+c.id]||{}); }); }
  function consultationById(id){ var c=consultations.filter(function(x){return x.id===id;})[0]; if(!c)return null; var ov=overrides(); return Object.assign({}, c, ov['cons:'+id]||{}); }

  // commission records created by F04 (Pending, for Part 6)
  function commissionRecords(){
    var ov = overrides(); var out = [];
    Object.keys(ov).forEach(function(k){ if (k.indexOf('comm:')===0) out.push(ov[k]); });
    return out.sort(function(a,b){ return a.createdUtc<b.createdUtc?1:-1; });
  }

  function partnerStatusOf(internalStatus){ return PARTNER_PROJECTION[internalStatus] || 'submitted'; }

  root.CRM = root.CRM || {};
  root.CRM.Pipeline = {
    INTERNAL_STATUS: INTERNAL_STATUS, STATUS_FLOW: STATUS_FLOW,
    PARTNER_PROJECTION: PARTNER_PROJECTION, PARTNER_LABEL: PARTNER_LABEL,
    allLeads: allLeads, leadById: leadById,
    allMeetings: allMeetings, meetingById: meetingById,
    allSiteVisits: allSiteVisits, visitById: visitById,
    allSlots: allSlots, allConsultations: allConsultations, consultationById: consultationById,
    commissionRecords: commissionRecords, partnerStatusOf: partnerStatusOf,
    ago: ago, fwd: fwd
  };
})(window);
