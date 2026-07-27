/* ============================================================================
 * Salmon Developers — partner commission ledger + settlement history (Act 8)
 * ----------------------------------------------------------------------------
 * Every amount was ENTERED AND APPROVED BY A HUMAN on the web panel — the app
 * DISPLAYS it and never computes it. Only `approved` commission is requestable;
 * `pending` is a claim that hasn't cleared and is NEVER folded into the headline.
 * The partner sees amounts + statuses only — no finance reference/evidence.
 * ==========================================================================*/
(function (root) {
  'use strict';

  // §7 CommissionStatus: pending, approved, settlementRequested, settled
  //
  // NOTE (clause 6): the "With Investment" higher-tier commission is NOT a
  // separate system. It is an ordinary commission with program:'withInvestment'
  // — same ledger, same Pending→Approved→Settlement→Settled path, same
  // hand-entered amount (a staff member typed it on the web panel L02; there is
  // no rate/tier formula anywhere). The only difference is the program tag and,
  // typically, a larger typed number. The row below demonstrates that.
  var commissions = [
    { ref: 'CM-2026-0231', leadId: 'LD-3081', leadName: 'Tahmid Alam',   leadNameBn: 'তাহমিদ আলম',   project: 'Salmon Oasis Park', program: 'withInvestment', amountBdt: 168000, status: 'approved',             approvedDate: '2026-07-11' },
    { ref: 'CM-2026-0217', leadId: 'LD-3019', leadName: 'Kamrul Islam',  leadNameBn: 'কামরুল ইসলাম',  project: 'Salmon Bellissimo', program: 'zeroInvestment', amountBdt: 112000, status: 'approved',             approvedDate: '2026-07-08' },
    { ref: 'CM-2026-0210', leadId: 'LD-2990', leadName: 'Selim Reza',    leadNameBn: 'সেলিম রেজা',     project: 'The ROSSA',        program: 'zeroInvestment', amountBdt: 72000,  status: 'approved',             approvedDate: '2026-07-02' },
    { ref: 'CM-2026-0205', leadId: 'LD-3038', leadName: 'Salma Begum',   leadNameBn: 'সালমা বেগম',    project: 'Salmon Oasis Park',program: 'zeroInvestment', amountBdt: 48000,  status: 'pending',              approvedDate: null },
    { ref: 'CM-2026-0198', leadId: 'LD-2951', leadName: 'Habib Ullah',   leadNameBn: 'হাবিব উল্লাহ',   project: 'Salmon Water Fall',program: 'zeroInvestment', amountBdt: 55000,  status: 'settlementRequested', approvedDate: '2026-06-20' },
    { ref: 'CM-2026-0180', leadId: 'LD-2900', leadName: 'Rashida Khatun', leadNameBn: 'রাশিদা খাতুন',  project: 'Zheel View',       program: 'zeroInvestment', amountBdt: 40000,  status: 'settled',              approvedDate: '2026-05-15' }
  ];

  function sum(st) { return commissions.filter(function (c) { return c.status === st; }).reduce(function (a, b) { return a + b.amountBdt; }, 0); }
  function buckets() {
    return {
      pending: sum('pending'),
      approved: sum('approved'),                 // <- the ONLY requestable money
      settlementRequested: sum('settlementRequested'),
      settled: sum('settled')
    };
  }
  function approvedBalanceBdt() { return sum('approved'); }
  function find(ref) { return commissions.filter(function (c) { return c.ref === ref; })[0] || null; }

  // Past settlements — partner-appropriate references only (no internal finance ref).
  var settlementHistory = [
    { ref: 'ST-2026-011', amountBdt: 40000, dateUtc: '2026-05-28T00:00:00Z', status: 'settled' },
    { ref: 'ST-2026-006', amountBdt: 20000, dateUtc: '2026-04-30T00:00:00Z', status: 'rejected' }
  ];

  root.PartnerLedger = {
    commissions: commissions, buckets: buckets, approvedBalanceBdt: approvedBalanceBdt, find: find,
    settlementHistory: settlementHistory,
    STATUS: {
      pending:             { en: 'Pending',              bn: 'অপেক্ষমাণ',          cls: 'st-upcoming',  gl: '•' },
      approved:            { en: 'Approved',             bn: 'অনুমোদিত',           cls: 'st-ongoing',   gl: '✓' },
      settlementRequested: { en: 'Settlement requested', bn: 'সেটেলমেন্ট অনুরোধকৃত', cls: 'st-completed', gl: '↗' },
      settled:             { en: 'Settled',              bn: 'পরিশোধিত',           cls: 'st-completed', gl: '✓' }
    },
    SETTLE_STATUS: {
      submitted: { en: 'Submitted', bn: 'জমা হয়েছে',   cls: 'st-completed', gl: '•' },
      approved:  { en: 'Approved',  bn: 'অনুমোদিত',     cls: 'st-upcoming',  gl: '•' },
      settled:   { en: 'Settled',   bn: 'পরিশোধিত',     cls: 'st-ongoing',   gl: '✓' },
      rejected:  { en: 'Rejected',  bn: 'প্রত্যাখ্যাত',  cls: 'st-completed', gl: '×' },
      onHold:    { en: 'On hold',   bn: 'স্থগিত',       cls: 'st-upcoming',  gl: '⏸' }
    },
    strings: {
      en: { earnings:'Earnings', ledger:'Commission ledger', detail:'Commission detail', requestable:'Approved · requestable',
        onlyApproved:'Only Approved commission is requestable. Pending is a claim that hasn’t cleared — it is not in your balance.',
        requestSettlement:'Request settlement', relatedLead:'Related lead', project:'Project', program:'Program', approvedOn:'Approved on',
        humanNote:'This amount was entered and approved by a Salmon staff member on the web panel. The app displays it and never calculates it.',
        settlementHistory:'Settlement history', reference:'Reference' },
      bn: { earnings:'আয়', ledger:'কমিশন লেজার', detail:'কমিশন বিবরণ', requestable:'অনুমোদিত · অনুরোধযোগ্য',
        onlyApproved:'শুধু অনুমোদিত কমিশন অনুরোধ করা যায়। অপেক্ষমাণ এখনো ক্লিয়ার হয়নি — এটি আপনার ব্যালেন্সে নেই।',
        requestSettlement:'সেটেলমেন্ট অনুরোধ', relatedLead:'সম্পর্কিত লিড', project:'প্রকল্প', program:'প্রোগ্রাম', approvedOn:'অনুমোদনের তারিখ',
        humanNote:'এই পরিমাণ স্যামন স্টাফ ওয়েব প্যানেলে প্রবেশ ও অনুমোদন করেছেন। অ্যাপ শুধু দেখায়, কখনো হিসাব করে না।',
        settlementHistory:'সেটেলমেন্ট ইতিহাস', reference:'রেফারেন্স' }
    }
  };
})(window);
