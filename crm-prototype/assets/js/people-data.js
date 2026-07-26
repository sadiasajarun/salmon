/* ============================================================================
 * Salmon CRM — People & Access mock data (Part 2)
 * Extends the Part-1 world (mock-data.js) with the rich partner + client set the
 * People module needs. Nothing here forks Part 1 — it adds a `CRM.People` island.
 *
 * Mutations (approve / reject / suspend / verify KYC / assign …) are NOT written
 * back into these literals. They are recorded as overrides in localStorage by
 * ripples.js and merged on read, so a decision on one screen is visible on the
 * next screen and survives a reload — the way a real backend would behave.
 * ==========================================================================*/
(function (root) {
  'use strict';
  var R = root.Perm.ROLES;

  /* ---------------------------------------------------------------------------
   * Territory tree — Division › District › Upazila › Union (OPEN_QUESTIONS #10)
   * Counts (partners / teams) are computed live from the partner + team sets so
   * the tree never drifts from the data it summarises.
   * ------------------------------------------------------------------------- */
  var territoryTree = [
    { id: 'DIV-CTG', level: 'Division', name: 'Chattogram', children: [
      { id: 'DST-CUM', level: 'District', name: 'Cumilla', children: [
        { id: 'UPZ-CUM-SADAR', level: 'Upazila', name: 'Cumilla Sadar', children: [
          { id: 'UNI-KANDIRPAR', level: 'Union', name: 'Kandirpar' },
          { id: 'UNI-BAGICHA',   level: 'Union', name: 'Bagichagaon' }
        ]},
        { id: 'UPZ-CUM-AMRATALI', level: 'Upazila', name: 'Amratali', children: [
          { id: 'UNI-AMRATALI', level: 'Union', name: 'Amratali' }
        ]}
      ]},
      { id: 'DST-CHAND', level: 'District', name: 'Chandpur', children: [
        { id: 'UPZ-CHAND-SADAR', level: 'Upazila', name: 'Chandpur Sadar', children: [
          { id: 'UNI-CHAND-BAZAR', level: 'Union', name: 'Bishnupur' }
        ]}
      ]}
    ]},
    { id: 'DIV-DHK', level: 'Division', name: 'Dhaka', children: [
      { id: 'DST-DHK', level: 'District', name: 'Dhaka', children: [
        { id: 'UPZ-SAVAR', level: 'Upazila', name: 'Savar', children: [
          { id: 'UNI-SAVAR-SADAR', level: 'Union', name: 'Savar Sadar' },
          { id: 'UNI-BANK-TOWN',   level: 'Union', name: 'Bank Town' }
        ]},
        { id: 'UPZ-KERANIGANJ', level: 'Upazila', name: 'Keraniganj', children: [
          { id: 'UNI-KALINDI', level: 'Union', name: 'Kalindi' }
        ]}
      ]}
    ]},
    { id: 'DIV-SYL', level: 'Division', name: 'Sylhet', children: [
      { id: 'DST-SYL', level: 'District', name: 'Sylhet', children: [
        { id: 'UPZ-SYL-SADAR', level: 'Upazila', name: 'Sylhet Sadar', children: [
          { id: 'UNI-TUKER', level: 'Union', name: 'Tuker Bazar' }
        ]}
      ]}
    ]}
  ];

  // A partner's territory is stored as a path string "Division › District › Upazila › Union".
  function pathStr(a){ return a.join(' › '); }

  /* ---------------------------------------------------------------------------
   * Teams — a set of partners under one team lead, scoped to a territory.
   * ------------------------------------------------------------------------- */
  var teams = [
    { id: 'TM-CUM-01', name: 'Cumilla Sadar Alpha', territory: pathStr(['Chattogram','Cumilla','Cumilla Sadar']), leadId: 'SDP-CUM-00405', targetBdt: 4500000, achievedBdt: 3120000 },
    { id: 'TM-CUM-02', name: 'Amratali Field Unit',  territory: pathStr(['Chattogram','Cumilla','Amratali']),      leadId: 'SDP-CUM-00460', targetBdt: 2600000, achievedBdt: 1180000 },
    { id: 'TM-SAV-01', name: 'Savar Metro',          territory: pathStr(['Dhaka','Dhaka','Savar']),                 leadId: 'SDP-SAV-00231', targetBdt: 3800000, achievedBdt: 3990000 },
    { id: 'TM-SYL-01', name: 'Sylhet Sadar Team',    territory: pathStr(['Sylhet','Sylhet','Sylhet Sadar']),        leadId: 'SDP-SYL-00088', targetBdt: 2100000, achievedBdt: 940000 },
    { id: 'TM-CHAND-01', name: 'Chandpur Riverside', territory: pathStr(['Chattogram','Chandpur','Chandpur Sadar']), leadId: null,           targetBdt: 1500000, achievedBdt: 260000 }
  ];

  /* ---------------------------------------------------------------------------
   * Ranks — assigned by hand. The panel is a list, not a rule engine (no
   * "criteria met" auto-suggestion anywhere).
   * ------------------------------------------------------------------------- */
  var ranks = [
    { id: 'Silver',   order: 1, unlocks: ['Standard sales kit', 'Base commission tier', 'Public project brochures'] },
    { id: 'Gold',     order: 2, unlocks: ['Silver kit + premium unit sheets', 'Early access to new launches', 'Co-branded marketing assets'] },
    { id: 'Platinum', order: 3, unlocks: ['Gold kit + confidential price schedules', 'Priority lead assignment', 'Direct line to the launch desk'] }
  ];

  /* ---------------------------------------------------------------------------
   * PENDING partner applications (the B02 wall). 7 of them, spanning territories,
   * programs and referral sources, at different ages against a 2-business-day SLA.
   * Shahin Alam (PA-2041) is the one whose mobile flow this module unblocks.
   * ------------------------------------------------------------------------- */
  function ago(days, h){ h = h || 0; var d = new Date('2026-07-15T10:00:00Z'); d.setUTCDate(d.getUTCDate()-days); d.setUTCHours(d.getUTCHours()-h); return d.toISOString(); }

  var applications = [
    { appId:'PA-2041', name:'Shahin Alam',    phone:'+8801711-204101', phoneVerified:true,  email:'shahin.alam@gmail.com',   territoryPath:['Chattogram','Cumilla','Cumilla Sadar','Kandirpar'], programs:['Zero Investment'],               referral:{code:'CUM-ALPHA-7', source:'Referral link · Rafiq (SDP-CUM-00405 team)'}, submittedUtc: ago(1,5),  mobileId:'shahin' },
    { appId:'PA-2039', name:'Rokeya Begum',   phone:'+8801812-337220', phoneVerified:true,  email:'rokeya.begum@gmail.com',  territoryPath:['Dhaka','Dhaka','Savar','Savar Sadar'],            programs:['Zero Investment'],               referral:{code:'SAV-METRO-3',source:'Referral code'}, submittedUtc: ago(1,22), mobileId:'rokeya' },
    { appId:'PA-2037', name:'Jahid Hasan',    phone:'+8801933-110984', phoneVerified:false, email:'jahid.hasan@yahoo.com',   territoryPath:['Chattogram','Cumilla','Amratali','Amratali'],      programs:['With Investment'],               referral:{code:null,          source:'Facebook campaign'}, submittedUtc: ago(2,3),  mobileId:'jahid' },
    { appId:'PA-2034', name:'Farida Yasmin',  phone:'+8801722-556677', phoneVerified:true,  email:'farida.yasmin@gmail.com', territoryPath:['Sylhet','Sylhet','Sylhet Sadar','Tuker Bazar'],    programs:['Zero Investment'],               referral:{code:'SYL-01',      source:'Referral code'}, submittedUtc: ago(3,1),  mobileId:'farida' },
    { appId:'PA-2031', name:'Kamal Uddin',    phone:'+8801655-889900', phoneVerified:true,  email:'kamal.uddin@gmail.com',   territoryPath:['Chattogram','Chandpur','Chandpur Sadar','Bishnupur'], programs:['Zero Investment','With Investment'], referral:{code:'CHAND-01',  source:'Walk-in office'}, submittedUtc: ago(4,6),  mobileId:'kamal' },
    { appId:'PA-2029', name:'Nazma Khatun',   phone:'+8801777-443322', phoneVerified:false, email:'nazma.khatun@gmail.com',  territoryPath:['Dhaka','Dhaka','Keraniganj','Kalindi'],            programs:['Zero Investment'],               referral:{code:null,          source:'Direct app signup'}, submittedUtc: ago(5,2),  mobileId:'nazma' },
    { appId:'PA-2026', name:'Sohel Rana',     phone:'+8801988-221100', phoneVerified:true,  email:'sohel.rana@gmail.com',    territoryPath:['Dhaka','Dhaka','Savar','Bank Town'],               programs:['With Investment'],               referral:{code:'SAV-METRO-3', source:'Referral code'}, submittedUtc: ago(6,4),  mobileId:'sohel' }
  ];

  /* ---------------------------------------------------------------------------
   * APPROVED / SUSPENDED / REJECTED partners.
   * 16 approved across all three ranks + both programs; 4 suspended/rejected.
   * ------------------------------------------------------------------------- */
  function P(o){
    o.status = o.status || 'approved';
    o.stats = o.stats || {};
    return o;
  }
  var partners = [
    P({ id:'SDP-CUM-00405', name:'Rafiqul Islam', phone:'+8801711-004417', email:'rafiqul.islam@gmail.com', territoryPath:['Chattogram','Cumilla','Cumilla Sadar','Kandirpar'], rank:'Gold',     programs:['Zero Investment'], team:'TM-CUM-01', teamLead:true,  joinedUtc: ago(210), stats:{leadsQ:24, targetPct:71, approvedCommissionBdt:184000, pendingSettlementBdt:78000, leads30:9, commission30:92000} }),
    P({ id:'SDP-CUM-00460', name:'Jahangir Alam', phone:'+8801711-004460', email:'jahangir.alam@gmail.com', territoryPath:['Chattogram','Cumilla','Amratali','Amratali'],       rank:'Silver',   programs:['With Investment'], team:'TM-CUM-02', teamLead:true,  joinedUtc: ago(120), stats:{leadsQ:11, targetPct:45, approvedCommissionBdt:110000, pendingSettlementBdt:130000, leads30:4, commission30:0} }),
    P({ id:'SDP-SAV-00231', name:'Rokeya Sultana', phone:'+8801812-000231', email:'rokeya.sultana@gmail.com', territoryPath:['Dhaka','Dhaka','Savar','Savar Sadar'],            rank:'Platinum', programs:['Zero Investment','With Investment'], team:'TM-SAV-01', teamLead:true, joinedUtc: ago(365), stats:{leadsQ:38, targetPct:105, approvedCommissionBdt:420000, pendingSettlementBdt:45000, leads30:14, commission30:64000} }),
    P({ id:'SDP-SYL-00088', name:'Mizanur Rahman', phone:'+8801722-000088', email:'mizanur.rahman@gmail.com', territoryPath:['Sylhet','Sylhet','Sylhet Sadar','Tuker Bazar'],   rank:'Gold',     programs:['Zero Investment'], team:'TM-SYL-01', teamLead:true,  joinedUtc: ago(150), stats:{leadsQ:9, targetPct:44, approvedCommissionBdt:96000, pendingSettlementBdt:30000, leads30:3, commission30:0} }),
    P({ id:'SDP-SAV-00244', name:'Selina Akter',   phone:'+8801812-000244', email:'selina.akter@gmail.com',  territoryPath:['Dhaka','Dhaka','Savar','Savar Sadar'],            rank:'Silver',   programs:['Zero Investment'], team:'TM-SAV-01', teamLead:false, joinedUtc: ago(95),  stats:{leadsQ:15, targetPct:60, approvedCommissionBdt:72000, pendingSettlementBdt:0, leads30:6, commission30:24000} }),
    P({ id:'SDP-SAV-00251', name:'Abdul Karim',    phone:'+8801812-000251', email:'abdul.karim@gmail.com',   territoryPath:['Dhaka','Dhaka','Savar','Bank Town'],              rank:'Silver',   programs:['With Investment'], team:'TM-SAV-01', teamLead:false, joinedUtc: ago(60),  stats:{leadsQ:7, targetPct:35, approvedCommissionBdt:28000, pendingSettlementBdt:0, leads30:2, commission30:0} }),
    P({ id:'SDP-CUM-00470', name:'Momena Begum',   phone:'+8801711-004470', email:'momena.begum@gmail.com',  territoryPath:['Chattogram','Cumilla','Cumilla Sadar','Bagichagaon'], rank:'Gold',  programs:['Zero Investment'], team:'TM-CUM-01', teamLead:false, joinedUtc: ago(88),  stats:{leadsQ:19, targetPct:66, approvedCommissionBdt:140000, pendingSettlementBdt:22000, leads30:8, commission30:41000} }),
    P({ id:'SDP-CUM-00482', name:'Nasir Uddin',    phone:'+8801711-004482', email:'nasir.uddin@gmail.com',   territoryPath:['Chattogram','Cumilla','Cumilla Sadar','Kandirpar'], rank:'Silver',  programs:['Zero Investment'], team:'TM-CUM-01', teamLead:false, joinedUtc: ago(45),  stats:{leadsQ:6, targetPct:30, approvedCommissionBdt:55000, pendingSettlementBdt:0, leads30:5, commission30:33000} }),
    P({ id:'SDP-CHAND-00120', name:'Habibur Rahman', phone:'+8801655-000120', email:'habibur.rahman@gmail.com', territoryPath:['Chattogram','Chandpur','Chandpur Sadar','Bishnupur'], rank:'Silver', programs:['Zero Investment'], team:'TM-CHAND-01', teamLead:false, joinedUtc: ago(30), stats:{leadsQ:4, targetPct:20, approvedCommissionBdt:18000, pendingSettlementBdt:0, leads30:4, commission30:18000} }),
    P({ id:'SDP-CHAND-00121', name:'Ayesha Siddika', phone:'+8801655-000121', email:'ayesha.siddika@gmail.com', territoryPath:['Chattogram','Chandpur','Chandpur Sadar','Bishnupur'], rank:'Silver', programs:['With Investment'], team:'TM-CHAND-01', teamLead:false, joinedUtc: ago(25), stats:{leadsQ:3, targetPct:15, approvedCommissionBdt:0, pendingSettlementBdt:0, leads30:3, commission30:0} }),
    P({ id:'SDP-SYL-00092', name:'Tariqul Islam',  phone:'+8801722-000092', email:'tariqul.islam@gmail.com', territoryPath:['Sylhet','Sylhet','Sylhet Sadar','Tuker Bazar'],   rank:'Silver',   programs:['Zero Investment'], team:'TM-SYL-01', teamLead:false, joinedUtc: ago(70),  stats:{leadsQ:8, targetPct:40, approvedCommissionBdt:44000, pendingSettlementBdt:12000, leads30:2, commission30:0} }),
    P({ id:'SDP-SYL-00099', name:'Shirin Akter',   phone:'+8801722-000099', email:'shirin.akter@gmail.com', territoryPath:['Sylhet','Sylhet','Sylhet Sadar','Tuker Bazar'],   rank:'Gold',     programs:['Zero Investment','With Investment'], team:'TM-SYL-01', teamLead:false, joinedUtc: ago(140), stats:{leadsQ:17, targetPct:63, approvedCommissionBdt:158000, pendingSettlementBdt:36000, leads30:7, commission30:38000} }),
    P({ id:'SDP-SAV-00260', name:'Kawsar Ahmed',   phone:'+8801812-000260', email:'kawsar.ahmed@gmail.com', territoryPath:['Dhaka','Dhaka','Keraniganj','Kalindi'],          rank:'Silver',   programs:['Zero Investment'], team:null, teamLead:false, joinedUtc: ago(18),  stats:{leadsQ:2, targetPct:10, approvedCommissionBdt:0, pendingSettlementBdt:0, leads30:2, commission30:0} }),
    P({ id:'SDP-CUM-00495', name:'Delwar Hossain', phone:'+8801711-004495', email:'delwar.hossain@gmail.com', territoryPath:['Chattogram','Cumilla','Amratali','Amratali'],    rank:'Platinum', programs:['With Investment'], team:'TM-CUM-02', teamLead:false, joinedUtc: ago(300), stats:{leadsQ:41, targetPct:98, approvedCommissionBdt:512000, pendingSettlementBdt:88000, leads30:12, commission30:120000} }),
    P({ id:'SDP-SAV-00272', name:'Rehana Parvin',  phone:'+8801812-000272', email:'rehana.parvin@gmail.com', territoryPath:['Dhaka','Dhaka','Savar','Savar Sadar'],           rank:'Gold',     programs:['Zero Investment'], team:'TM-SAV-01', teamLead:false, joinedUtc: ago(110), stats:{leadsQ:21, targetPct:74, approvedCommissionBdt:172000, pendingSettlementBdt:0, leads30:9, commission30:52000} }),
    P({ id:'SDP-CUM-00501', name:'Faruk Ahmed',    phone:'+8801711-004501', email:'faruk.ahmed@gmail.com',  territoryPath:['Chattogram','Cumilla','Cumilla Sadar','Kandirpar'], rank:'Silver',  programs:['Zero Investment'], team:'TM-CUM-01', teamLead:false, joinedUtc: ago(52),  stats:{leadsQ:10, targetPct:48, approvedCommissionBdt:61000, pendingSettlementBdt:15000, leads30:4, commission30:19000} }),

    // suspended / rejected — to exercise those states end to end
    P({ id:'SDP-SAV-00219', name:'Jamal Uddin',    phone:'+8801812-000219', email:'jamal.uddin@gmail.com',  territoryPath:['Dhaka','Dhaka','Savar','Savar Sadar'],           rank:'Silver',  programs:['Zero Investment'], team:'TM-SAV-01', teamLead:false, joinedUtc: ago(180), status:'suspended', suspension:{reason:'Repeated unverified leads flagged by Manager review.', effectiveUtc: ago(9), blocksApp:true}, stats:{leadsQ:0, targetPct:0, approvedCommissionBdt:34000, pendingSettlementBdt:34000, leads30:0, commission30:0} }),
    P({ id:'SDP-CUM-00399', name:'Hasan Mahmud',   phone:'+8801711-003990', email:'hasan.mahmud@gmail.com', territoryPath:['Chattogram','Cumilla','Cumilla Sadar','Bagichagaon'], rank:'Silver', programs:['Zero Investment'], team:null, teamLead:false, joinedUtc: ago(160), status:'suspended', suspension:{reason:'Under investigation — client complaint pending resolution.', effectiveUtc: ago(4), blocksApp:false}, stats:{leadsQ:1, targetPct:5, approvedCommissionBdt:12000, pendingSettlementBdt:0, leads30:1, commission30:0} }),
    P({ id:'PA-2018', name:'Belal Hossain',        phone:'+8801933-201801', email:'belal.hossain@gmail.com', territoryPath:['Dhaka','Dhaka','Keraniganj','Kalindi'],         rank:null,      programs:['With Investment'], team:null, teamLead:false, joinedUtc:null, status:'rejected', rejectionReason:'Territory already at partner capacity for this cycle. Please re-apply next quarter — thank you for your interest.', decidedUtc: ago(7), mobileId:'belal', stats:{} }),
    P({ id:'PA-2011', name:'Ruma Akter',           phone:'+8801777-201101', email:'ruma.akter@gmail.com',   territoryPath:['Sylhet','Sylhet','Sylhet Sadar','Tuker Bazar'],  rank:null,      programs:['Zero Investment'], team:null, teamLead:false, joinedUtc:null, status:'rejected', rejectionReason:'Could not verify the referral source on file. Re-apply with a valid referral code or via a Salmon office.', decidedUtc: ago(12), mobileId:'ruma', stats:{} })
  ];

  /* ---------------------------------------------------------------------------
   * Per-partner activity log (chronological reconstruction of the relationship).
   * The hero partner (Rafiqul / SDP-CUM-00405) is the richest.
   * ------------------------------------------------------------------------- */
  var partnerActivity = {
    'SDP-CUM-00405': [
      { t: ago(2),   kind:'commission', text:'Commission approved — ৳92,000 (CV-490 · Kamrul Islam)' },
      { t: ago(3),   kind:'lead',       text:'Lead submitted — Rahim Uddin · The ROSSA' },
      { t: ago(6),   kind:'meeting',    text:'Site visit attended — The ROSSA with client Rahim Uddin' },
      { t: ago(14),  kind:'rank',       text:'Rank changed Silver → Gold by Rahima Chowdhury' },
      { t: ago(30),  kind:'lead',       text:'Lead converted — booking confirmed (Salmon Bellissimo)' },
      { t: ago(120), kind:'team',       text:'Assigned as Team Lead — Cumilla Sadar Alpha' },
      { t: ago(210), kind:'approval',   text:'Application approved by Tanvir Hasan — Partner ID SDP-CUM-00405 issued' },
      { t: ago(212), kind:'application',text:'Applied via referral link (Zero Investment · Cumilla Sadar)' }
    ],
    'SDP-SAV-00231': [
      { t: ago(1),  kind:'lead',     text:'Lead submitted — Nadia Islam · Salmon Oasis Park' },
      { t: ago(5),  kind:'settlement',text:'Settlement requested — ৳45,000' },
      { t: ago(40), kind:'rank',     text:'Rank changed Gold → Platinum by Rahima Chowdhury' },
      { t: ago(365),kind:'approval', text:'Application approved — Partner ID SDP-SAV-00231 issued' }
    ],
    'SDP-SAV-00219': [
      { t: ago(9),   kind:'suspend',    text:'Suspended by Tanvir Hasan — repeated unverified leads' },
      { t: ago(50),  kind:'lead',       text:'Lead flagged for review — unable to contact client' },
      { t: ago(180), kind:'approval',   text:'Application approved — Partner ID SDP-SAV-00219 issued' }
    ]
  };
  function activityFor(id){ return partnerActivity[id] || [
    { t: ago(3),  kind:'lead',     text:'Lead submitted' },
    { t: ago(60), kind:'approval', text:'Application approved — Partner ID '+id+' issued' }
  ]; }

  /* ---------------------------------------------------------------------------
   * Rank-change history per partner (small chronological list — R03).
   * ------------------------------------------------------------------------- */
  var rankHistory = {
    'SDP-CUM-00405': [
      { t: ago(14),  from:'Silver', to:'Gold', by:'Rahima Chowdhury', note:'Consistent 3-month conversion above team median.' },
      { t: ago(210), from:null,     to:'Silver', by:'Tanvir Hasan',   note:'Initial rank on approval.' }
    ],
    'SDP-SAV-00231': [
      { t: ago(40),  from:'Gold',   to:'Platinum', by:'Rahima Chowdhury', note:'Top performer, Savar — exceeded annual target.' },
      { t: ago(200), from:'Silver', to:'Gold',     by:'Rahima Chowdhury', note:'Strong first half.' },
      { t: ago(365), from:null,     to:'Silver',   by:'Rahima Chowdhury', note:'Initial rank on approval.' }
    ]
  };
  function rankHistoryFor(id){ return rankHistory[id] || [ { t: ago(60), from:null, to:(partnerById(id)||{}).rank||'Silver', by:'System', note:'Initial rank on approval.' } ]; }

  /* ---------------------------------------------------------------------------
   * Global Clients — 22, across all four KYC states, 6 pending uploads (C04).
   *   KYC states: notSubmitted · pending · verified · rejected
   * Rezaul Karim is the one whose mobile KYC flow this module unblocks.
   * ------------------------------------------------------------------------- */
  function CL(o){ o.kyc = o.kyc || {}; return o; }
  var clients = [
    CL({ id:'CL-5001', name:'Rezaul Karim',   location:'Dubai, UAE',      email:'rezaul.karim@outlook.com', phone:'+971 50-224-1180', interest:'Salmon Oasis Park', partnerId:'SDP-SAV-00231', kycStatus:'pending', mobileId:'rezaul',
      kyc:{ type:'Passport', docName:'BD Passport — A0442119', dob:'1984-03-12', nationality:'Bangladeshi', nameOnDoc:'Md Rezaul Karim', pages:2, submittedUtc: ago(0,8) } }),
    CL({ id:'CL-5002', name:'Selina Akter',   location:'Dhaka, BD',       email:'selina.akter.c@gmail.com', phone:'+8801712-500002', interest:'Salmon Bellissimo', partnerId:'SDP-SAV-00244', kycStatus:'pending', mobileId:'selinac',
      kyc:{ type:'NID', docName:'NID — 199234******', dob:'1990-07-01', nationality:'Bangladeshi', nameOnDoc:'Selina Akter', pages:2, submittedUtc: ago(1,3) } }),
    CL({ id:'CL-5003', name:'Ayesha Rahman',  location:'Toronto, Canada', email:'ayesha.rahman@gmail.com',  phone:'+1 416-500-0003',  interest:'The ROSSA',        partnerId:'SDP-SAV-00231', kycStatus:'pending', mobileId:'ayesha',
      kyc:{ type:'Passport', docName:'CA Passport — HK772210', dob:'1988-11-25', nationality:'Canadian', nameOnDoc:'Ayesha Rahman', pages:1, submittedUtc: ago(1,10) } }),
    CL({ id:'CL-5004', name:'Kamrul Islam',   location:'London, UK',      email:'kamrul.islam@gmail.com',   phone:'+44 7700-500004',  interest:'Salmon Bellissimo', partnerId:'SDP-CUM-00405', kycStatus:'pending', mobileId:'kamrul',
      kyc:{ type:'Passport', docName:'BD Passport — A0338871', dob:'1979-05-30', nationality:'Bangladeshi', nameOnDoc:'Md Kamrul Islam', pages:2, submittedUtc: ago(2,2) } }),
    CL({ id:'CL-5005', name:'Nadia Islam',    location:'Dhaka, BD',       email:'nadia.islam@gmail.com',    phone:'+8801812-500005', interest:'Salmon Oasis Park', partnerId:'SDP-SAV-00231', kycStatus:'pending', mobileId:'nadia',
      kyc:{ type:'NID', docName:'NID — 200145******', dob:'1995-02-18', nationality:'Bangladeshi', nameOnDoc:'Nadia Islam Chowdhury', pages:2, submittedUtc: ago(2,9) } }),
    CL({ id:'CL-5006', name:'Imran Chowdhury',location:'Sydney, Australia',email:'imran.chy@gmail.com',     phone:'+61 4-5000-0006',  interest:'The ROSSA',        partnerId:'SDP-SYL-00099', kycStatus:'pending', mobileId:'imran',
      kyc:{ type:'Passport', docName:'AU Passport — PA118820', dob:'1982-09-09', nationality:'Australian', nameOnDoc:'Imran Chowdhury', pages:1, submittedUtc: ago(3,4) } }),

    CL({ id:'CL-5010', name:'Tanya Haque',    location:'Dhaka, BD',       email:'tanya.haque@gmail.com',    phone:'+8801712-500010', interest:'Salmon Oasis Park', partnerId:'SDP-SAV-00231', kycStatus:'verified', kyc:{ type:'NID', verifiedUtc: ago(8), verifiedBy:'Nusrat Jahan' } }),
    CL({ id:'CL-5011', name:'Mahfuz Anam',    location:'Dhaka, BD',       email:'mahfuz.anam@gmail.com',    phone:'+8801712-500011', interest:'The ROSSA',        partnerId:'SDP-CUM-00405', kycStatus:'verified', kyc:{ type:'Passport', verifiedUtc: ago(20), verifiedBy:'Nusrat Jahan' } }),
    CL({ id:'CL-5012', name:'Sadia Islam',    location:'Doha, Qatar',     email:'sadia.islam@gmail.com',    phone:'+974 3-500-0012',  interest:'Salmon Bellissimo', partnerId:'SDP-SAV-00272', kycStatus:'verified', kyc:{ type:'Passport', verifiedUtc: ago(35), verifiedBy:'Nusrat Jahan' } }),
    CL({ id:'CL-5013', name:'Arif Hossain',   location:'Dhaka, BD',       email:'arif.hossain@gmail.com',   phone:'+8801712-500013', interest:'Salmon Oasis Park', partnerId:'SDP-CUM-00470', kycStatus:'verified', kyc:{ type:'NID', verifiedUtc: ago(50), verifiedBy:'Nusrat Jahan' } }),
    CL({ id:'CL-5014', name:'Farhana Yasmin', location:'New York, USA',   email:'farhana.y@gmail.com',      phone:'+1 212-500-0014',  interest:'The ROSSA',        partnerId:'SDP-SAV-00231', kycStatus:'verified', kyc:{ type:'Passport', verifiedUtc: ago(60), verifiedBy:'Nusrat Jahan' } }),
    CL({ id:'CL-5015', name:'Zahid Hasan',    location:'Dhaka, BD',       email:'zahid.hasan.c@gmail.com',  phone:'+8801712-500015', interest:'Salmon Bellissimo', partnerId:'SDP-CUM-00405', kycStatus:'verified', kyc:{ type:'NID', verifiedUtc: ago(70), verifiedBy:'Nusrat Jahan' } }),

    CL({ id:'CL-5020', name:'Robiul Awal',    location:'Kuala Lumpur, MY',email:'robiul.awal@gmail.com',    phone:'+60 12-500-0020',  interest:'Salmon Oasis Park', partnerId:'SDP-SYL-00088', kycStatus:'rejected', kyc:{ type:'Passport', rejectedUtc: ago(6), rejectedBy:'Nusrat Jahan', reason:'Document expired — passport valid-to date has passed. Please upload a current passport.' } }),
    CL({ id:'CL-5021', name:'Shamima Nasrin', location:'Dhaka, BD',       email:'shamima.n@gmail.com',      phone:'+8801712-500021', interest:'The ROSSA',        partnerId:'SDP-SAV-00231', kycStatus:'rejected', kyc:{ type:'NID', rejectedUtc: ago(11), rejectedBy:'Nusrat Jahan', reason:'Name on document does not match profile. Please re-submit with a matching government ID.' } }),

    CL({ id:'CL-5030', name:'Golam Rabbani',  location:'Dhaka, BD',       email:'golam.rabbani@gmail.com',  phone:'+8801712-500030', interest:'Salmon Bellissimo', partnerId:null,            kycStatus:'notSubmitted', kyc:{} }),
    CL({ id:'CL-5031', name:'Nusaiba Karim',  location:'Jeddah, KSA',     email:'nusaiba.karim@gmail.com',  phone:'+966 5-500-0031',  interest:'Salmon Oasis Park', partnerId:'SDP-SAV-00231', kycStatus:'notSubmitted', kyc:{} }),
    CL({ id:'CL-5032', name:'Tofael Ahmed',   location:'Dhaka, BD',       email:'tofael.ahmed@gmail.com',   phone:'+8801712-500032', interest:'The ROSSA',        partnerId:'SDP-CUM-00405', kycStatus:'notSubmitted', kyc:{} }),
    CL({ id:'CL-5033', name:'Marium Begum',   location:'Rome, Italy',     email:'marium.begum@gmail.com',   phone:'+39 3-5000-0033',  interest:'Salmon Bellissimo', partnerId:'SDP-CUM-00470', kycStatus:'notSubmitted', kyc:{} }),
    CL({ id:'CL-5034', name:'Ashraful Alam',  location:'Dhaka, BD',       email:'ashraful.alam@gmail.com',  phone:'+8801712-500034', interest:'Salmon Oasis Park', partnerId:'SDP-SAV-00272', kycStatus:'notSubmitted', kyc:{} }),
    CL({ id:'CL-5035', name:'Rina Parvin',    location:'Dhaka, BD',       email:'rina.parvin@gmail.com',    phone:'+8801712-500035', interest:'The ROSSA',        partnerId:null,            kycStatus:'notSubmitted', kyc:{} }),
    CL({ id:'CL-5036', name:'Sabbir Rahman',  location:'Muscat, Oman',    email:'sabbir.rahman@gmail.com',  phone:'+968 9-500-0036',  interest:'Salmon Bellissimo', partnerId:'SDP-SYL-00099', kycStatus:'notSubmitted', kyc:{} })
  ];

  /* ---- per-client activity (bookings/payments/meetings/tickets — read-only) ---- */
  function clientActivity(id){
    var base = {
      'CL-5001': [
        { t: ago(0,6), kind:'kyc',     text:'KYC document uploaded — Passport (2 pages)' },
        { t: ago(2),   kind:'payment', text:'Booking money received — $ 5,000 (wire, awaiting verification)' },
        { t: ago(3),   kind:'meeting', text:'Online consultation — Salmon Oasis Park (with Rokeya Sultana)' },
        { t: ago(9),   kind:'booking', text:'Expressed interest — Unit B-704, Salmon Oasis Park' }
      ],
      'CL-5010': [
        { t: ago(8),  kind:'kyc',     text:'KYC verified by Nusrat Jahan' },
        { t: ago(10), kind:'payment', text:'Installment paid — ৳ 8,50,000' },
        { t: ago(30), kind:'booking', text:'Unit booked — A-1203, Salmon Oasis Park' }
      ]
    };
    return base[id] || [
      { t: ago(5),  kind:'meeting', text:'Consultation scheduled' },
      { t: ago(20), kind:'booking', text:'Registered interest' }
    ];
  }

  /* ---- per-client communication log (C06 — read-only in Part 2) ---- */
  function clientComms(id){
    var base = {
      'CL-5001': [
        { t: ago(0,4), chan:'ticket', dir:'in',  who:'Rezaul Karim', text:'Asked when KYC will be reviewed — flying back on the 20th.' },
        { t: ago(1),   chan:'chat',   dir:'out', who:'Support (Nusrat J.)', text:'Confirmed document received; review within 2 business days.' },
        { t: ago(3),   chan:'call',   dir:'out', who:'Rokeya Sultana',  text:'Consultation call — walked through Oasis Park floor plans.' },
        { t: ago(9),   chan:'email',  dir:'out', who:'Salmon',          text:'Sent Oasis Park brochure + price schedule.' }
      ]
    };
    return base[id] || [
      { t: ago(6),  chan:'email', dir:'out', who:'Salmon',  text:'Welcome email + brochure sent.' },
      { t: ago(15), chan:'chat',  dir:'in',  who:'Client',  text:'General enquiry about availability.' }
    ];
  }

  /* ---------------------------------------------------------------------------
   * KYC document-access log (C05 requirement: every view is logged).
   * ------------------------------------------------------------------------- */
  var kycAccessSeed = [
    { id:'KX-201', clientId:'CL-5001', actor:'Nusrat Jahan', role:R.LEGAL, kind:'view', whenUtc: ago(0,2) },
    { id:'KX-198', clientId:'CL-5020', actor:'Nusrat Jahan', role:R.LEGAL, kind:'view', whenUtc: ago(6) },
    { id:'KX-197', clientId:'CL-5010', actor:'Rahima Chowdhury', role:R.SUPER_ADMIN, kind:'view', whenUtc: ago(8) }
  ];

  /* ---------------------------------------------------------------------------
   * Referral codes (D07) — each binds a team + territory.
   * ------------------------------------------------------------------------- */
  var referralCodes = [
    { code:'CUM-ALPHA-7',  team:'TM-CUM-01',   territory:teams[0].territory, active:true,  uses:14, createdUtc: ago(200) },
    { code:'SAV-METRO-3',  team:'TM-SAV-01',   territory:teams[2].territory, active:true,  uses:31, createdUtc: ago(365) },
    { code:'SYL-01',       team:'TM-SYL-01',   territory:teams[3].territory, active:true,  uses:9,  createdUtc: ago(150) },
    { code:'CHAND-01',     team:'TM-CHAND-01', territory:teams[4].territory, active:true,  uses:5,  createdUtc: ago(60) },
    { code:'CUM-OLD-2',    team:'TM-CUM-02',   territory:teams[1].territory, active:false, uses:22, createdUtc: ago(420) }
  ];

  /* ---------------------------------------------------------------------------
   * Read helpers — merge localStorage overrides written by ripples.js so a
   * decision on one screen is reflected on the next.
   * ------------------------------------------------------------------------- */
  function overrides(){ try { return JSON.parse(localStorage.getItem('crm_people_mut')||'{}'); } catch(e){ return {}; } }

  function allApplications(){
    var ov = overrides();
    return applications.map(function(a){ return Object.assign({}, a, ov['app:'+a.appId]||{}); })
                       .filter(function(a){ return !a.removed; });
  }
  function partnerById(id){ var p = partners.filter(function(x){ return x.id===id; })[0]; if(!p) return null; var ov = overrides(); return Object.assign({}, p, ov['ptr:'+id]||{}); }
  function allPartners(){ var ov = overrides(); return partners.map(function(p){ return Object.assign({}, p, ov['ptr:'+p.id]||{}); }); }
  function clientById(id){ var c = clients.filter(function(x){ return x.id===id; })[0]; if(!c) return null; var ov = overrides(); var patch = ov['cli:'+id]||{}; var merged = Object.assign({}, c, patch); merged.kyc = Object.assign({}, c.kyc, patch.kyc||{}); return merged; }
  function allClients(){ var ov = overrides(); return clients.map(function(c){ var patch = ov['cli:'+c.id]||{}; var m = Object.assign({}, c, patch); m.kyc = Object.assign({}, c.kyc, patch.kyc||{}); return m; }); }
  function kycQueue(){ return allClients().filter(function(c){ return c.kycStatus==='pending'; }); }

  // Resolve an id to a partner OR an applicant (so a just-approved applicant, who
  // is not in the static `partners` list, still has a viewable profile).
  function partnerOrApplicant(id){
    var p = partnerById(id); if (p) return p;
    var ov = overrides();
    var apps = applications.map(function(a){ return Object.assign({}, a, ov['app:'+a.appId]||{}); });
    var m = apps.filter(function(a){ return a.partnerId===id || a.appId===id; })[0];
    if (!m) return null;
    return { id: m.partnerId || m.appId, name:m.name, phone:m.phone, phoneVerified:m.phoneVerified, email:m.email,
      territoryPath:m.territoryPath, rank:m.rank||'Silver', programs:m.programs, team:null, teamLead:false,
      joinedUtc:m.approvedUtc||null, submittedUtc:m.submittedUtc, referral:m.referral,
      status: m.approved ? 'approved' : (m.rejected ? 'rejected' : 'pending'),
      rejectionReason:m.rejectionReason || null, suspension:null, mobileId:m.mobileId, appId:m.appId,
      stats:{leadsQ:0,targetPct:0,approvedCommissionBdt:0,pendingSettlementBdt:0,leads30:0,commission30:0}, _fromApp:true };
  }

  function teamById(id){ return teams.filter(function(t){ return t.id===id; })[0]; }
  function teamName(id){ var t = teamById(id); return t ? t.name : '—'; }
  function partnersInTeam(id){ return allPartners().filter(function(p){ return p.team===id; }); }
  function partnersInTerritoryName(name){ return allPartners().filter(function(p){ return pathStr(p.territoryPath).indexOf(name) > -1; }); }

  // node → count of partners/teams whose path contains this node name
  function countsForNode(node){
    var pc = allPartners().filter(function(p){ return p.status!=='rejected' && pathStr(p.territoryPath).indexOf(node.name) > -1; }).length;
    var tc = teams.filter(function(t){ return t.territory.indexOf(node.name) > -1; }).length;
    return { partners: pc, teams: tc };
  }

  root.CRM.People = {
    // raw sets
    territoryTree: territoryTree, teams: teams, ranks: ranks, referralCodes: referralCodes, kycAccessSeed: kycAccessSeed,
    // read helpers (override-aware)
    allApplications: allApplications, applicationById: function(id){ return allApplications().filter(function(a){return a.appId===id;})[0]; },
    allPartners: allPartners, partnerById: partnerById, partnerOrApplicant: partnerOrApplicant,
    allClients: allClients, clientById: clientById, kycQueue: kycQueue,
    activityFor: activityFor, rankHistoryFor: rankHistoryFor,
    clientActivity: clientActivity, clientComms: clientComms,
    teamById: teamById, teamName: teamName, partnersInTeam: partnersInTeam, partnersInTerritoryName: partnersInTerritoryName,
    countsForNode: countsForNode, pathStr: pathStr, ago: ago
  };
})(window);
