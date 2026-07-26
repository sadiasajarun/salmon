/* ============================================================================
 * Salmon CRM — mock data (staff, role queues, audit seed, notifications, search)
 * A staff member of each role + the records every dashboard needs. All timestamps
 * are UTC; the panel renders them in Dhaka time. Nothing is computed on device.
 * ==========================================================================*/
(function (root) {
  'use strict';
  var R = root.Perm.ROLES;

  var staff = {
    SUPER_ADMIN: { name: 'Rahima Chowdhury', role: R.SUPER_ADMIN, office: 'Dhaka Head Office', initials: 'RC' },
    MANAGER:     { name: 'Tanvir Hasan',     role: R.MANAGER,     office: 'Dhaka Head Office', initials: 'TH' },
    FINANCE:     { name: 'Fatima Ahmed',     role: R.FINANCE,     office: 'Dhaka Head Office', initials: 'FA' },
    LEGAL:       { name: 'Nusrat Jahan',     role: R.LEGAL,       office: 'Dhaka Head Office', initials: 'NJ' }
  };

  // ---- Super Admin org health ----
  var org = {
    activeProjects: 15, activePartners: 128, activeClients: 342,
    units: { available: 96, reserved: 41, sold: 213 }
  };
  var partnerApplications = [
    { id: 'PA-2041', name: 'Shahin Alam',   territory: 'Chattogram › Cumilla › Cumilla Sadar', program: 'Zero Investment', submittedUtc: '2026-07-14T05:10:00Z' },
    { id: 'PA-2039', name: 'Rokeya Sultana', territory: 'Dhaka › Savar › Savar Sadar',          program: 'Zero Investment', submittedUtc: '2026-07-13T11:20:00Z' },
    { id: 'PA-2037', name: 'Jahangir Alam',  territory: 'Chattogram › Cumilla › Amratali',       program: 'With Investment', submittedUtc: '2026-07-13T07:00:00Z' },
    { id: 'PA-2034', name: 'Farida Yasmin',  territory: 'Sylhet › Sylhet Sadar › Tuker Bazar',  program: 'Zero Investment', submittedUtc: '2026-07-12T09:35:00Z' }
  ];
  var territoryActivity = [
    { territory: 'Chattogram › Cumilla', partners: 34, leads7: 22, sales7: 3 },
    { territory: 'Dhaka › Savar',        partners: 28, leads7: 17, sales7: 2 },
    { territory: 'Sylhet › Sylhet Sadar', partners: 19, leads7: 9,  sales7: 1 },
    { territory: 'Chattogram › Chandpur', partners: 12, leads7: 5,  sales7: 0 }
  ];

  // ---- Manager / Sales queues ----
  function sla(h){ return { hours: h, cls: h < 0 ? 'over' : h <= 6 ? 'warn' : 'ok' }; }
  var leadsAwaiting = [
    { id: 'LD-3041', name: 'Rahim Uddin',  project: 'The ROSSA',         partner: 'Shahin Alam',  status: 'submitted', slaH: -3 },
    { id: 'LD-3052', name: 'Selina Akter', project: 'Salmon Oasis Park', partner: 'Rokeya Sultana', status: 'submitted', slaH: 2 },
    { id: 'LD-3048', name: 'Abdul Karim',  project: 'Salmon Bellissimo', partner: 'Shahin Alam',  status: 'contacted',  slaH: 5 },
    { id: 'LD-3045', name: 'Momena Begum', project: 'Zheel View',        partner: 'Jahangir Alam', status: 'submitted', slaH: 20 }
  ];
  var meetingsToConfirm = [
    { id: 'MT-771', requester: 'Shahin Alam',  kind: 'partner', project: 'The ROSSA',         whenUtc: '2026-07-15T09:00:00Z' },
    { id: 'MT-770', requester: 'Rezaul Karim', kind: 'client',  project: 'Salmon Oasis Park', whenUtc: '2026-07-15T11:30:00Z' },
    { id: 'MT-768', requester: 'Selina Akter', kind: 'client',  project: 'Salmon Bellissimo', whenUtc: '2026-07-16T05:00:00Z' }
  ];
  var consultationsToday = [
    { id: 'CS-410', client: 'Rezaul Karim (Dubai)', whenUtc: '2026-07-15T12:00:00Z', join: 'https://zoom.us/j/mock-410' },
    { id: 'CS-411', client: 'Ayesha Rahman (Toronto)', whenUtc: '2026-07-15T15:30:00Z', join: 'https://zoom.us/j/mock-411' }
  ];
  var conversionsToVerify = [
    { id: 'CV-514', lead: 'Kamrul Islam', partner: 'Shahin Alam', project: 'Salmon Bellissimo', submittedUtc: '2026-07-14T06:00:00Z' },
    { id: 'CV-513', lead: 'Nadia Islam',  partner: 'Rokeya Sultana', project: 'Salmon Oasis Park', submittedUtc: '2026-07-13T13:20:00Z' }
  ];

  // ---- Finance queues ----
  var webhooks = [
    { id: 'WH-90271', gatewayRef: 'sslcz_7f3a91', amount: 1500000, currency: 'BDT', receivedUtc: '2026-07-15T04:22:00Z', status: 'unmatched' },
    { id: 'WH-90268', gatewayRef: 'sslcz_7f2b04', amount: 750000,  currency: 'BDT', receivedUtc: '2026-07-15T03:05:00Z', status: 'unmatched' },
    { id: 'WH-90265', gatewayRef: 'stripe_3kZ9', amount: 12000,   currency: 'AED', receivedUtc: '2026-07-14T18:40:00Z', status: 'unmatched' }
  ];
  var wires = [
    { id: 'WR-2205', client: 'Rezaul Karim',   amountUsd: 42000, project: 'Salmon Oasis Park', submittedUtc: '2026-07-14T10:00:00Z' },
    { id: 'WR-2203', client: 'Ayesha Rahman',  amountUsd: 38000, project: 'The ROSSA',         submittedUtc: '2026-07-13T16:15:00Z' }
  ];
  var commissionApprovals = [
    { id: 'CM-2026-0217', partner: 'Shahin Alam', partnerId: 'SDP-CUM-00417', amountBdt: 92000, conversionRef: 'CV-490', status: 'pending' },
    { id: 'CM-2026-0219', partner: 'Rokeya Sultana', partnerId: 'SDP-SAV-00231', amountBdt: 64000, conversionRef: 'CV-495', status: 'pending' },
    { id: 'CM-2026-0221', partner: 'Jahangir Alam', partnerId: 'SDP-CUM-00460', amountBdt: 110000, conversionRef: 'CV-501', status: 'pending' }
  ];
  var settlementRequests = [
    { id: 'ST-2026-106', partner: 'Shahin Alam',   partnerId: 'SDP-CUM-00417', amountBdt: 78000,  approvedBalanceBdt: 184000, requestedUtc: '2026-07-15T05:00:00Z', status: 'submitted' },
    { id: 'ST-2026-104', partner: 'Rokeya Sultana', partnerId: 'SDP-SAV-00231', amountBdt: 45000,  approvedBalanceBdt: 45000,  requestedUtc: '2026-07-14T09:20:00Z', status: 'submitted' },
    { id: 'ST-2026-101', partner: 'Jahangir Alam',  partnerId: 'SDP-CUM-00460', amountBdt: 130000, approvedBalanceBdt: 260000, requestedUtc: '2026-07-13T12:00:00Z', status: 'onHold' },
    { id: 'ST-2026-099', partner: 'Farida Yasmin',  partnerId: 'SDP-SYL-00088', amountBdt: 30000,  approvedBalanceBdt: 30000,  requestedUtc: '2026-07-13T08:10:00Z', status: 'submitted' }
  ];
  var recentSettlements = [
    { id: 'ST-2026-097', partner: 'Nasir Uddin', amountBdt: 55000, status: 'settled', settledUtc: '2026-07-12T10:00:00Z' },
    { id: 'ST-2026-095', partner: 'Habib Rahman', amountBdt: 41000, status: 'settled', settledUtc: '2026-07-11T14:30:00Z' }
  ];
  var financeStats = { overdueInstallments: 7, invoices7: 23, awaitingRecon: 3 };

  // ---- Legal / Document Controller queues ----
  var kycQueue = [
    { id: 'KY-661', customer: 'Rezaul Karim',  docType: 'Passport', project: 'Salmon Oasis Park', uploadedUtc: '2026-07-15T02:10:00Z' },
    { id: 'KY-659', customer: 'Selina Akter',  docType: 'NID',      project: 'Salmon Bellissimo', uploadedUtc: '2026-07-14T13:00:00Z' },
    { id: 'KY-657', customer: 'Ayesha Rahman', docType: 'Passport', project: 'The ROSSA',         uploadedUtc: '2026-07-14T07:45:00Z' }
  ];
  var docsToClassify = [
    { id: 'DC-330', name: 'Oasis Park — Deed of Agreement.pdf', project: 'Salmon Oasis Park', uploadedUtc: '2026-07-14T11:00:00Z' },
    { id: 'DC-328', name: 'ROSSA — Handover Certificate.pdf',   project: 'The ROSSA',         uploadedUtc: '2026-07-13T09:30:00Z' }
  ];
  var docsToPublish = [
    { id: 'DC-322', name: 'Bellissimo — Price Schedule v3.pdf', project: 'Salmon Bellissimo', visibility: 'Internal', draftedUtc: '2026-07-13T06:00:00Z' }
  ];
  var docAccessLog = [
    { id: 'AX-88', doc: 'Oasis Park — Deed of Agreement', actor: 'Tanvir Hasan', kind: 'view', whenUtc: '2026-07-15T06:20:00Z', flag: false },
    { id: 'AX-86', doc: 'ROSSA — Customer Sales Record',  actor: 'External link', kind: 'download', whenUtc: '2026-07-15T01:05:00Z', flag: true }
  ];
  var legalStats = { docsTotal: 214, kycPending: 3, restricted: 41 };

  // ---- audit seed (newest first is handled by Audit.audit; seed pushes as-is) ----
  var auditSeed = [
    { id: 'AUD-0999', timestamp: '2026-07-15T06:40:00Z', actor: 'Fatima Ahmed', actorRole: R.FINANCE, action: 'RELEASE_SETTLEMENT', target: 'ST-2026-097 · ৳55,000', changes: null },
    { id: 'AUD-0998', timestamp: '2026-07-15T06:12:00Z', actor: 'Nusrat Jahan', actorRole: R.LEGAL,   action: 'VERIFY_KYC', target: 'KY-654 · Rezaul Karim', changes: null },
    { id: 'AUD-0997', timestamp: '2026-07-15T05:35:00Z', actor: 'Tanvir Hasan', actorRole: R.MANAGER, action: 'APPROVE_PARTNER', target: 'SDP-CUM-00417 · Shahin Alam', changes: null },
    { id: 'AUD-0996', timestamp: '2026-07-15T04:50:00Z', actor: 'Fatima Ahmed', actorRole: R.FINANCE, action: 'APPROVE_COMMISSION', target: 'CM-2026-0215 · ৳92,000', changes: null },
    { id: 'AUD-0995', timestamp: '2026-07-14T15:20:00Z', actor: 'Rahima Chowdhury', actorRole: R.SUPER_ADMIN, action: 'PUBLISH_PROJECT', target: 'Salmon Florentine', changes: null },
    { id: 'AUD-0994', timestamp: '2026-07-14T12:05:00Z', actor: 'Tanvir Hasan', actorRole: R.MANAGER, action: 'VERIFY_CONVERSION', target: 'CV-490 · Kamrul Islam', changes: null },
    { id: 'AUD-0993', timestamp: '2026-07-14T10:40:00Z', actor: 'Nusrat Jahan', actorRole: R.LEGAL, action: 'PUBLISH_DOC', target: 'Oasis Park — Brochure v2', changes: null },
    { id: 'AUD-0992', timestamp: '2026-07-14T09:15:00Z', actor: 'Fatima Ahmed', actorRole: R.FINANCE, action: 'VERIFY_WIRE', target: 'WR-2199 · $40,000', changes: null }
  ];

  // ---- notifications (staff-facing, grouped, timezone-correct, no amounts in title) ----
  var notifications = [
    { id: 'ns1', cat: 'applications', text: 'New partner application — Shahin Alam (Cumilla)', t: '2026-07-15T05:10:00Z', unread: true,  link: '#/people' },
    { id: 'ns2', cat: 'finance',      text: 'Wire received — awaiting verification (WR-2205)',  t: '2026-07-15T04:25:00Z', unread: true,  link: '#/finance' },
    { id: 'ns3', cat: 'legal',        text: 'KYC uploaded by Rezaul Karim',                     t: '2026-07-15T02:10:00Z', unread: true,  link: '#/documents' },
    { id: 'ns4', cat: 'support',      text: 'Support ticket escalated — #PT-2087',              t: '2026-07-14T16:00:00Z', unread: false, link: '#/communications' },
    { id: 'ns5', cat: 'finance',      text: 'Settlement queue: 3 requests awaiting review',     t: '2026-07-14T09:20:00Z', unread: false, link: '#/finance' }
  ];
  var NOTIF_CAT = {
    applications: 'Applications', finance: 'Finance', legal: 'Legal', support: 'Support'
  };

  // ---- global search index ----
  var searchIndex = [
    { type: 'partner', icon: '👤', title: 'Shahin Alam', sub: 'SDP-CUM-00417 · Cumilla', link: '#/people' },
    { type: 'partner', icon: '👤', title: 'Rokeya Sultana', sub: 'SDP-SAV-00231 · Savar', link: '#/people' },
    { type: 'client',  icon: '🧑', title: 'Rezaul Karim', sub: 'Client · Dubai · Oasis Park', link: '#/people' },
    { type: 'client',  icon: '🧑', title: 'Ayesha Rahman', sub: 'Client · Toronto · The ROSSA', link: '#/people' },
    { type: 'project', icon: '🏢', title: 'The ROSSA', sub: 'Basundhara R/A · 1/6 available', link: '#/catalogue' },
    { type: 'project', icon: '🏢', title: 'Salmon Oasis Park', sub: 'Basundhara R/A · 3/9 available', link: '#/catalogue' },
    { type: 'unit',    icon: '🔑', title: 'Unit 4A · The ROSSA', sub: 'Available · 1,850 sqft', link: '#/catalogue' },
    { type: 'lead',    icon: '📇', title: 'Rahim Uddin', sub: 'LD-3041 · The ROSSA · submitted', link: '#/pipeline' },
    { type: 'ticket',  icon: '🎫', title: 'Commission question', sub: '#PT-2087 · Accounts · in progress', link: '#/communications' }
  ];

  root.CRM = {
    staff: staff, org: org,
    partnerApplications: partnerApplications, territoryActivity: territoryActivity,
    leadsAwaiting: leadsAwaiting, meetingsToConfirm: meetingsToConfirm,
    consultationsToday: consultationsToday, conversionsToVerify: conversionsToVerify,
    webhooks: webhooks, wires: wires, commissionApprovals: commissionApprovals,
    settlementRequests: settlementRequests, recentSettlements: recentSettlements, financeStats: financeStats,
    kycQueue: kycQueue, docsToClassify: docsToClassify, docsToPublish: docsToPublish,
    docAccessLog: docAccessLog, legalStats: legalStats,
    auditSeed: auditSeed, notifications: notifications, NOTIF_CAT: NOTIF_CAT, searchIndex: searchIndex,
    sla: sla
  };
})(window);
