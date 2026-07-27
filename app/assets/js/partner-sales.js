/* ============================================================================
 * Salmon Developers — partner operational mock data (Acts 3–5)
 * ----------------------------------------------------------------------------
 * Bengali-first content. Governance encoded here:
 *  - Leads carry ONLY a simplified partner-facing status timeline. There are NO
 *    internal notes / manager / CRM fields in this data — the partner never
 *    sees them.
 *  - A partner CANNOT set 'converted'. Conversion + commission eligibility are
 *    created by Salmon's sales team (backend). `verifiedBy: 'salmon'` marks that.
 *  - Dashboard money/target are DISPLAY VALUES from the backend — never computed
 *    in the app. No projections/forecasts (rule undefined -> OPEN_QUESTIONS).
 * ==========================================================================*/
(function (root) {
  'use strict';

  // Partner-facing lead status set (§7 LeadStatus). Order = the simplified timeline.
  var STATUS_ORDER = ['submitted', 'contacted', 'meetingScheduled', 'visitCompleted', 'converted', 'closed'];
  var STATUS = {
    submitted:        { en: 'Submitted',        bn: 'জমা হয়েছে',        cls: 'st-completed', gl: '•' },
    contacted:        { en: 'Contacted',        bn: 'যোগাযোগ হয়েছে',    cls: 'st-upcoming',  gl: '•' },
    meetingScheduled: { en: 'Meeting scheduled', bn: 'মিটিং নির্ধারিত',  cls: 'st-upcoming',  gl: '•' },
    visitCompleted:   { en: 'Visit completed',  bn: 'ভিজিট সম্পন্ন',     cls: 'st-upcoming',  gl: '•' },
    converted:        { en: 'Converted',        bn: 'রূপান্তরিত',        cls: 'st-ongoing',   gl: '✓' },
    closed:           { en: 'Closed',           bn: 'বন্ধ',              cls: 'st-completed', gl: '×' }
  };

  // A full pipeline — leads in every status, incl. one converted (verified by Salmon).
  var leads = [
    { id: 'LD-3041', name: 'Rahim Uddin',   nameBn: 'রহিম উদ্দিন',   phone: '+8801711000001', projectSlug: 'the-rossa',        projectName: 'The ROSSA',        status: 'submitted',        submittedUtc: '2026-07-14T05:00:00Z', lastMoveUtc: '2026-07-14T05:00:00Z', note: 'Interested in a 3-bed, cash buyer.' },
    { id: 'LD-3038', name: 'Salma Begum',   nameBn: 'সালমা বেগম',    phone: '+8801711000002', projectSlug: 'salmon-oasis-park', projectName: 'Salmon Oasis Park', status: 'contacted',        submittedUtc: '2026-07-11T05:00:00Z', lastMoveUtc: '2026-07-13T09:00:00Z', note: 'Lake-view unit preferred.' },
    { id: 'LD-3032', name: 'Jamal Hossain', nameBn: 'জামাল হোসেন',   phone: '+8801711000003', projectSlug: 'salmon-water-fall', projectName: 'Salmon Water Fall', status: 'meetingScheduled', submittedUtc: '2026-07-06T05:00:00Z', lastMoveUtc: '2026-07-12T11:00:00Z', note: '' },
    { id: 'LD-3025', name: 'Nasrin Akter',  nameBn: 'নাসরিন আক্তার', phone: '+8801711000004', projectSlug: 'the-rossa',        projectName: 'The ROSSA',        status: 'visitCompleted',   submittedUtc: '2026-06-28T05:00:00Z', lastMoveUtc: '2026-07-10T14:00:00Z', note: '' },
    { id: 'LD-3019', name: 'Kamrul Islam',  nameBn: 'কামরুল ইসলাম',  phone: '+8801711000005', projectSlug: 'salmon-bellissimo', projectName: 'Salmon Bellissimo', status: 'converted',        submittedUtc: '2026-06-10T05:00:00Z', lastMoveUtc: '2026-07-08T10:00:00Z', note: '', verifiedBy: 'salmon', commissionRef: 'CM-2026-0217' },
    { id: 'LD-3011', name: 'Ayesha Siddiqa',nameBn: 'আয়েশা সিদ্দিকা', phone: '+8801711000006', projectSlug: 'zheel-view',       projectName: 'Zheel View',        status: 'closed',           submittedUtc: '2026-05-30T05:00:00Z', lastMoveUtc: '2026-06-20T10:00:00Z', note: '' }
  ];

  function counts() { var c = {}; STATUS_ORDER.forEach(function (s) { c[s] = 0; }); leads.forEach(function (l) { c[l.status]++; }); return c; }

  // Dashboard — ALL backend-supplied display values. No client computation.
  // A FULL-PIPELINE partner (Shahin): money waiting, leads active, target underway.
  var dashboard = {
    // --- Earnings: the FIVE facts of Req 6.2 (all backend display values) ---
    verifiedSalesVolumeBdt: 3200000, // total verified sales volume (context, not spendable)
    approvedCommissionBdt: 184000,   // approved commission — the ONE hero number (spendable)
    pendingSettlementBdt: 42000,     // pending settlement
    settledBdt: 356000,              // settled amount (paid to date)
    investmentReturnBdt: null,       // recorded investment-return — null for Zero-only (shows —)
    targetBdt: 1000000,              // period target (rule undefined)
    achievedBdt: 620000,             // display value (NOT computed here)
    periodEn: 'Q3 2026', periodBn: 'তৃতীয় প্রান্তিক ২০২৬',
    // --- Identity status counts (Req 6.2) ---
    submittedLeads: 12, activeLeads: 4, movedToday: 1, // pipeline (per-status detail on Leads)
    meetingsToday: 2, openTasks: 5,
    openTickets: 1, ticketStatusEn: 'awaiting reply', ticketStatusBn: 'উত্তরের অপেক্ষায়',
    trainingItems: 3,                // new/incomplete training items
    noticesCount: 2, newUnits: true, // quiet footer signals
    lastSyncUtc: '2026-07-14T11:40:00Z', // for the offline "stale" timestamp
    __PLACEHOLDER: true
  };

  // An EMPTY new partner: approved yet, no leads — the hero becomes encouraging.
  var emptyDashboard = {
    verifiedSalesVolumeBdt: 0, approvedCommissionBdt: 0, pendingSettlementBdt: 0,
    settledBdt: 0, investmentReturnBdt: null,
    targetBdt: 1000000, achievedBdt: 0,
    periodEn: 'Q3 2026', periodBn: 'তৃতীয় প্রান্তিক ২০২৬',
    submittedLeads: 0, meetingsToday: 0, openTasks: 0,
    openTickets: 0, ticketStatusEn: 'none open', ticketStatusBn: 'কোনোটি খোলা নেই',
    trainingItems: 0,
    activeLeads: 0, movedToday: 0, noticesCount: 0, newUnits: false,
    lastSyncUtc: '2026-07-14T11:40:00Z',
    __PLACEHOLDER: true
  };

  var signals = [
    { en: 'Lead “Rahim Uddin” was contacted', bn: 'লিড “রহিম উদ্দিন”-এর সাথে যোগাযোগ হয়েছে', t: '2026-07-13T09:00:00Z', link: 'lead-detail.page.html?id=LD-3038' },
    { en: 'Commission approved · Bellissimo', bn: 'কমিশন অনুমোদিত · বেলিসিমো', t: '2026-07-08T10:00:00Z', link: 'commission.page.html' },
    { en: 'New units released · The ROSSA', bn: 'নতুন ইউনিট এসেছে · দ্য রোসা', t: '2026-07-12T06:00:00Z', link: 'inventory.page.html?slug=the-rossa' }
  ];

  var quickActions = [
    { key: 'lead',       en: 'Submit a lead',       bn: 'লিড জমা দিন',        icon: '👤', link: 'submit-lead.page.html' },
    { key: 'meeting',    en: 'Request a meeting',   bn: 'মিটিং অনুরোধ',        icon: '📅', link: 'request-meeting.page.html' },
    { key: 'kit',        en: 'Open the sales kit',  bn: 'সেলস কিট খুলুন',      icon: '🧰', link: 'sales-kit.page.html' },
    { key: 'ticket',     en: 'Raise a ticket',      bn: 'টিকিট খুলুন',         icon: '🎫', link: 'raise-ticket.page.html' },
    { key: 'settlement', en: 'Request settlement',  bn: 'সেটেলমেন্ট অনুরোধ',   icon: '💳', link: 'commission.page.html' }
  ];

  root.PartnerSales = {
    STATUS_ORDER: STATUS_ORDER, STATUS: STATUS, leads: leads, counts: counts,
    dashboard: dashboard, emptyDashboard: emptyDashboard, signals: signals, quickActions: quickActions,
    find: function (id) { return leads.filter(function (l) { return l.id === id; })[0] || null; },
    strings: {
      en: { dashboard:'Dashboard', leads:'Leads', pipeline:'My pipeline', submitLead:'Submit a lead', quickActions:'Quick actions',
        approvedCommission:'Approved commission', pendingSettlement:'Pending settlement', target:'Target vs achievement',
        today:'Today', meetings:'meetings', tasks:'open tasks', signals:'Recent activity', programs:'Programs',
        displayNote:'Figures are supplied by Salmon — shown here, not calculated in the app.',
        emptyTitle:'No leads yet', emptySub:'Submit your first lead — then track it here as Salmon’s team moves it forward.',
        submitFirst:'Submit your first lead', getKit:'Get sales material first',
        whatNext:'What happens next', consentTitle:'Confirm consent to share', reference:'Reference',
        // --- redesigned dashboard (three-tier) ---
        approvedReady:'Approved · ready to request', pendingSuffix:'pending settlement',
        requestSettlement:'Request settlement', active:'active', moved:'moved today', nothingMoved:'no moves today',
        todayWord:'Today', targetWord:'Target', meetingsShort:'meetings', tasksShort:'tasks',
        qaSubmit:'Submit a lead', qaMeeting:'Request a meeting', qaKit:'Sales kit', qaSupport:'Support',
        notices:'notices', newUnitsWord:'new units', noSignals:'No new updates',
        staleUpdated:'Cached · updated', offlineSettle:'You need a connection to request settlement.',
        emptyHero:'Your approved earnings will appear here', emptyHeroSub:'A verified conversion becomes commission you can request.',
        emptyLeads:'No leads yet — submit your first', errTitle:'Couldn’t load', errSub:'Check your connection and try again.', retry:'Retry',
        // --- 6.2 earnings chips + status counts + updates + shortcuts ---
        verifiedSales:'Verified sales', settledWord:'Settled', returnsWord:'Investment return', returnsNA:'—',
        returnsNote:'Recorded return applies to With Investment partners — amount held for legal sign-off.',
        leadsShort:'leads', ticketsShort:'tickets', trainingShort:'training', statusWord:'Status',
        updatesTitle:'Recent updates', noUpdates:'No new updates',
        qaBooking:'Booking record', qaSettlement:'Settlement',
        devState:'DEV state' },
      bn: { dashboard:'ড্যাশবোর্ড', leads:'লিড', pipeline:'আমার পাইপলাইন', submitLead:'লিড জমা দিন', quickActions:'দ্রুত কাজ',
        approvedCommission:'অনুমোদিত কমিশন', pendingSettlement:'বকেয়া সেটেলমেন্ট', target:'লক্ষ্য বনাম অর্জন',
        today:'আজ', meetings:'মিটিং', tasks:'খোলা কাজ', signals:'সাম্প্রতিক কার্যকলাপ', programs:'প্রোগ্রাম',
        displayNote:'সংখ্যাগুলো স্যামন সরবরাহ করে — এখানে শুধু দেখানো হয়, অ্যাপে হিসাব করা হয় না।',
        emptyTitle:'এখনো কোনো লিড নেই', emptySub:'আপনার প্রথম লিড জমা দিন — এরপর স্যামনের টিম এগিয়ে নিলে এখানে ট্র্যাক করুন।',
        submitFirst:'প্রথম লিড জমা দিন', getKit:'আগে সেলস উপকরণ নিন',
        whatNext:'এরপর কী হবে', consentTitle:'শেয়ারের সম্মতি নিশ্চিত করুন', reference:'রেফারেন্স',
        // --- redesigned dashboard (three-tier) ---
        approvedReady:'অনুমোদিত · উত্তোলনের জন্য প্রস্তুত', pendingSuffix:'বকেয়া সেটেলমেন্ট',
        requestSettlement:'সেটেলমেন্ট অনুরোধ', active:'সক্রিয়', moved:'আজ এগিয়েছে', nothingMoved:'আজ কিছু এগোয়নি',
        todayWord:'আজ', targetWord:'লক্ষ্য', meetingsShort:'মিটিং', tasksShort:'কাজ',
        qaSubmit:'লিড জমা দিন', qaMeeting:'মিটিং অনুরোধ', qaKit:'সেলস কিট', qaSupport:'সহায়তা',
        notices:'নোটিশ', newUnitsWord:'নতুন ইউনিট', noSignals:'নতুন কোনো আপডেট নেই',
        staleUpdated:'ক্যাশড · সর্বশেষ', offlineSettle:'সেটেলমেন্ট অনুরোধ করতে সংযোগ দরকার।',
        emptyHero:'আপনার অনুমোদিত আয় এখানে দেখা যাবে', emptyHeroSub:'একটি যাচাইকৃত রূপান্তর কমিশনে পরিণত হয়, যা আপনি উত্তোলনের অনুরোধ করতে পারেন।',
        emptyLeads:'এখনো কোনো লিড নেই — প্রথমটি জমা দিন', errTitle:'লোড হয়নি', errSub:'সংযোগ দেখে আবার চেষ্টা করুন।', retry:'আবার চেষ্টা',
        // --- 6.2 earnings chips + status counts + updates + shortcuts ---
        verifiedSales:'যাচাইকৃত বিক্রি', settledWord:'পরিশোধিত', returnsWord:'বিনিয়োগ রিটার্ন', returnsNA:'—',
        returnsNote:'রেকর্ডকৃত রিটার্ন উইথ ইনভেস্টমেন্ট পার্টনারদের জন্য — পরিমাণ আইনি অনুমোদনের অপেক্ষায়।',
        leadsShort:'লিড', ticketsShort:'টিকিট', trainingShort:'ট্রেনিং', statusWord:'স্ট্যাটাস',
        updatesTitle:'সাম্প্রতিক আপডেট', noUpdates:'নতুন কোনো আপডেট নেই',
        qaBooking:'বুকিং রেকর্ড', qaSettlement:'সেটেলমেন্ট',
        devState:'ডেভ স্টেট' }
    }
  };
})(window);
