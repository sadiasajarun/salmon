/* ============================================================================
 * Salmon Developers — partner meetings & booking records (Acts 6–7)
 * ----------------------------------------------------------------------------
 * The app RECORDS and REQUESTS; it never executes:
 *  - Meetings: the app REQUESTS a slot; the scheduler confirms on the web panel.
 *    A confirmed meeting ATTACHES an external Zoom/Meet/Teams link — the app
 *    hosts no video. Provider is undecided (seam) -> OPEN_QUESTIONS.
 *  - Booking records: data-entry-with-attachments logging a sale that happened
 *    OFFLINE. No money moves. Payment "method" is a CATEGORY (cash/bank transfer/
 *    cheque/MFS) — never an account number. Records are `unverified` until finance
 *    confirms on the web panel; the partner sees a simple state, not the trail.
 * ==========================================================================*/
(function (root) {
  'use strict';
  var PROVIDER = 'Zoom'; // seam: Zoom | Google Meet | Teams (undecided)

  var meetingWith = [
    { key: 'manager', en: 'Sales manager',  bn: 'সেলস ম্যানেজার' },
    { key: 'scheduler', en: 'Scheduler',    bn: 'শিডিউলার' },
    { key: 'sales', en: 'Sales rep',        bn: 'সেলস প্রতিনিধি' },
    { key: 'care', en: 'Customer care',     bn: 'কাস্টমার কেয়ার' },
    { key: 'accounts', en: 'Accounts',      bn: 'অ্যাকাউন্টস' }
  ];
  var meetingReasons = [
    { key: 'close', en: 'Close a deal',   bn: 'ডিল ক্লোজ করা' },
    { key: 'learn', en: 'Learn / training', bn: 'শেখা / প্রশিক্ষণ' },
    { key: 'coord', en: 'Coordinate',     bn: 'সমন্বয়' }
  ];

  // Calendar — meetings & visits in every status, incl. the recurring head-office meeting.
  var meetings = [
    { id: 'MT-501', kind: 'virtual', withKey: 'manager', title: 'Deal review with sales manager', titleBn: 'সেলস ম্যানেজারের সাথে ডিল রিভিউ', status: 'confirmed', whenUtc: '2026-07-17T09:00:00Z', link: 'https://zoom.us/j/000000000?pwd=__PLACEHOLDER' },
    { id: 'MT-498', kind: 'visit', project: 'The ROSSA', leadId: 'LD-3025', title: 'Site visit · The ROSSA', titleBn: 'সাইট ভিজিট · দ্য রোসা', status: 'requested', whenUtc: null },
    { id: 'MT-490', kind: 'virtual', withKey: 'sales', title: 'Head-office coordination (recurring)', titleBn: 'হেড অফিস সমন্বয় (নিয়মিত)', status: 'recurring', whenUtc: '2026-07-20T10:00:00Z', link: 'https://zoom.us/j/111111111?pwd=__PLACEHOLDER',
      // 6.9.5 — attendance is an enum per occurrence: attended | absent | excused | pending.
      attendance: 'attended', cadenceEn: 'Twice monthly · 1st & 3rd Thursday', cadenceBn: 'মাসে দুবার · ১ম ও ৩য় বৃহস্পতিবার',
      attendanceHistory: [ { dateUtc: '2026-07-03T10:00:00Z', status: 'attended' }, { dateUtc: '2026-06-19T10:00:00Z', status: 'excused' }, { dateUtc: '2026-06-05T10:00:00Z', status: 'attended' } ] },
    { id: 'MT-482', kind: 'virtual', withKey: 'accounts', title: 'Settlement query with accounts', titleBn: 'অ্যাকাউন্টসের সাথে সেটেলমেন্ট প্রশ্ন', status: 'completed', whenUtc: '2026-07-05T11:00:00Z' },
    { id: 'MT-475', kind: 'visit', project: 'Salmon Oasis Park', title: 'Site visit · Oasis Park', titleBn: 'সাইট ভিজিট · ওয়েসিস পার্ক', status: 'cancelled', whenUtc: '2026-06-28T09:00:00Z' }
  ];

  var paymentMethods = [
    { key: 'cash', en: 'Cash',           bn: 'নগদ' },
    { key: 'bank', en: 'Bank transfer',  bn: 'ব্যাংক ট্রান্সফার' },
    { key: 'cheque', en: 'Cheque',       bn: 'চেক' },
    { key: 'mfs', en: 'MFS (bKash/Nagad)', bn: 'MFS (বিকাশ/নগদ)' }
  ];

  // Booking records — verified + unverified. NO account numbers anywhere; method is a category.
  var bookingRecords = [
    { id: 'BR-2026-088', leadId: 'LD-3019', leadName: 'Kamrul Islam', leadNameBn: 'কামরুল ইসলাম', project: 'Salmon Bellissimo', unit: 'A-4', status: 'verified',   bookingDate: '2026-07-06', amountBdt: 500000, method: 'bank',   reference: 'RCPT-OFF-1188', createdUtc: '2026-07-06T10:00:00Z' },
    { id: 'BR-2026-095', leadId: 'LD-3025', leadName: 'Nasrin Akter', leadNameBn: 'নাসরিন আক্তার', project: 'The ROSSA',        unit: 'A-9', status: 'unverified', bookingDate: '2026-07-14', amountBdt: 500000, method: 'cash',   reference: 'RCPT-OFF-1204', createdUtc: '2026-07-14T09:00:00Z' }
  ];

  root.PartnerOps = {
    PROVIDER: PROVIDER, meetingWith: meetingWith, meetingReasons: meetingReasons,
    meetings: meetings, paymentMethods: paymentMethods, bookingRecords: bookingRecords,
    withLabel: function (k, lang) { var w = meetingWith.filter(function (x) { return x.key === k; })[0]; return w ? (lang === 'bn' ? w.bn : w.en) : k; },
    methodLabel: function (k, lang) { var m = paymentMethods.filter(function (x) { return x.key === k; })[0]; return m ? (lang === 'bn' ? m.bn : m.en) : k; },
    MSTATUS: {
      requested:   { en: 'Requested',   bn: 'অনুরোধকৃত',  cls: 'st-upcoming',  gl: '•' },
      confirmed:   { en: 'Confirmed',   bn: 'নিশ্চিত',     cls: 'st-ongoing',   gl: '✓' },
      rescheduled: { en: 'Rescheduled', bn: 'পুনঃনির্ধারিত', cls: 'st-upcoming', gl: '↻' },
      cancelled:   { en: 'Cancelled',   bn: 'বাতিল',       cls: 'st-completed', gl: '×' },
      completed:   { en: 'Completed',   bn: 'সম্পন্ন',      cls: 'st-completed', gl: '✓' },
      recurring:   { en: 'Recurring',   bn: 'নিয়মিত',      cls: 'st-ongoing',   gl: '↻' }
    },
    strings: {
      en: { requestMeeting:'Request a virtual meeting', requestVisit:'Request a site visit', awaiting:'Awaiting a slot',
        confirmed:'Meeting confirmed', calendar:'Calendar', recordSale:'Record a sale', bookingRecord:'Booking record',
        customer:'Customer details', offlinePay:'Offline payment entry', evidence:'Attach evidence', recordStatus:'Record status',
        unverified:'Unverified', verified:'Verified', addCal:'Add to calendar (.ics)', join:'Join', prepare:'What to prepare',
        secureRepo:'Uploaded to Salmon’s secure repository — protected, signed access, never cached in the clear.' },
      bn: { requestMeeting:'ভার্চুয়াল মিটিং অনুরোধ', requestVisit:'সাইট ভিজিট অনুরোধ', awaiting:'স্লটের অপেক্ষায়',
        confirmed:'মিটিং নিশ্চিত', calendar:'ক্যালেন্ডার', recordSale:'সেল রেকর্ড করুন', bookingRecord:'বুকিং রেকর্ড',
        customer:'কাস্টমার তথ্য', offlinePay:'অফলাইন পেমেন্ট এন্ট্রি', evidence:'প্রমাণ সংযুক্ত', recordStatus:'রেকর্ড অবস্থা',
        unverified:'যাচাই হয়নি', verified:'যাচাইকৃত', addCal:'ক্যালেন্ডারে যোগ করুন (.ics)', join:'যোগ দিন', prepare:'কী প্রস্তুত করবেন',
        secureRepo:'স্যামনের নিরাপদ রিপোজিটরিতে আপলোড — সুরক্ষিত, সাইনড অ্যাক্সেস, খোলা অবস্থায় ক্যাশ হয় না।' }
    }
  };
})(window);
