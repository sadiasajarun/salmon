/* ============================================================================
 * Salmon Developers — externalized localization (partner)
 * ----------------------------------------------------------------------------
 * Strings live in resource dictionaries, NOT in markup. The canonical copies are
 * app/i18n/partner.en.json + partner.bn.json (ARB/JSON-shaped, for the real
 * Flutter/React build). This file is the file://-loadable mirror the prototype
 * reads, because browsers block fetch() of local JSON on file://.
 *
 *   tr(lang, 'consent.dataHandling')  -> the string, or the key if missing.
 *
 * The new 6.1 strings (four-part consent, eligibility, card) are migrated here to
 * prove the externalization path; migrating the remaining legacy inline strings
 * is a mechanical follow-up (logged in OPEN_QUESTIONS / ALIGNMENT).
 * ==========================================================================*/
(function (root) {
  'use strict';
  var STRINGS = {
    en: {
      'consent.intro': 'Please accept each of the following. Nothing is pre-ticked — tap each to accept.',
      'consent.terms': 'I have read and accept the <a>Terms of Service</a>.',
      'consent.privacy': 'I agree to the <a>Privacy Policy</a>.',
      'consent.program': 'I have read and accept the partner <a>program conditions</a>.',
      'consent.dataHandling': 'When I submit a prospective customer’s information, I confirm I have their permission to share it — and I will obtain that permission before every submission.',
      'consent.dataHandling.tag': 'Data-handling undertaking',
      'consent.dataHandling.help': 'A standing acknowledgment captured once, up front. It is separate from the per-referral consent you confirm each time you submit a lead.',
      'consent.investDisclaimer': 'With Investment: Salmon is not a guarantor or investment adviser. Returns are not guaranteed; all terms are client-approved.',
      'consent.invest': 'I understand the additional With-Investment conditions and risks.',
      'consent.continue': 'Continue',
      'eligibility.withConditional': 'Eligibility required',
      'eligibility.withLocked': 'With Investment enrolment requires administrator approval. You can register for Zero Investment now and request With Investment later.',
      'eligibility.zeroOpen': 'Open to all approved partners.',
      'card.scanLabel': 'Scan to connect',
      'verify.phone': 'Verify by mobile (OTP)',
      'verify.email': 'Verify by email link',
      'verify.methodNote': 'Verification method is set by Salmon (config). Current: '
    },
    bn: {
      'consent.intro': 'অনুগ্রহ করে নিচের প্রতিটিতে সম্মতি দিন। কিছুই আগে থেকে টিক করা নেই — প্রতিটিতে ট্যাপ করে সম্মতি দিন।',
      'consent.terms': 'আমি <a>সেবার শর্তাবলি</a> পড়েছি ও সম্মত।',
      'consent.privacy': 'আমি <a>গোপনীয়তা নীতি</a>-তে সম্মত।',
      'consent.program': 'আমি পার্টনার <a>প্রোগ্রাম শর্তাবলি</a> পড়েছি ও সম্মত।',
      'consent.dataHandling': 'আমি যখন কোনো সম্ভাব্য ক্রেতার তথ্য জমা দেব, তখন নিশ্চিত করছি যে তা শেয়ার করার অনুমতি আমার কাছে আছে — এবং প্রতিবার জমা দেওয়ার আগে আমি সেই অনুমতি নেব।',
      'consent.dataHandling.tag': 'তথ্য-ব্যবস্থাপনার অঙ্গীকার',
      'consent.dataHandling.help': 'এটি একবারই, শুরুতেই নেওয়া একটি স্থায়ী অঙ্গীকার। লিড জমা দেওয়ার সময় প্রতিবার যে সম্মতি দেন, এটি তা থেকে আলাদা।',
      'consent.investDisclaimer': 'উইথ-ইনভেস্টমেন্ট: স্যামন কোনো গ্যারান্টর বা বিনিয়োগ উপদেষ্টা নয়। রিটার্ন নিশ্চিত নয়; সব শর্ত ক্লায়েন্ট-অনুমোদিত।',
      'consent.invest': 'আমি উইথ-ইনভেস্টমেন্টের অতিরিক্ত শর্ত ও ঝুঁকি বুঝেছি।',
      'consent.continue': 'চালিয়ে যান',
      'eligibility.withConditional': 'যোগ্যতা প্রয়োজন',
      'eligibility.withLocked': 'উইথ-ইনভেস্টমেন্টে যোগ দিতে অ্যাডমিন অনুমোদন প্রয়োজন। আপনি এখন জিরো ইনভেস্টমেন্টে রেজিস্টার করে পরে উইথ ইনভেস্টমেন্টের জন্য অনুরোধ করতে পারেন।',
      'eligibility.zeroOpen': 'সকল অনুমোদিত পার্টনারের জন্য উন্মুক্ত।',
      'card.scanLabel': 'সংযোগে স্ক্যান করুন',
      'verify.phone': 'মোবাইল (OTP) দিয়ে যাচাই',
      'verify.email': 'ইমেইল লিংক দিয়ে যাচাই',
      'verify.methodNote': 'যাচাই পদ্ধতি স্যামন নির্ধারণ করে (কনফিগ)। বর্তমান: '
    }
  };
  function tr(lang, key) { var d = STRINGS[lang] || STRINGS.en; return (key in d) ? d[key] : (STRINGS.en[key] || key); }
  root.I18N = { STRINGS: STRINGS, tr: tr };
  root.tr = tr;
})(window);
