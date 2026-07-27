/* ============================================================================
 * Salmon Developers — Training LIBRARY mock data (Partner Act 11, P67–P69)
 * ----------------------------------------------------------------------------
 * ⚠️  THIS IS A CONTENT LIBRARY, NOT AN LMS.
 *   ✅ Categories, search, view, download, offline access, file sizes.
 *   ❌ NO quizzes. NO scores. NO certification. NO pass/fail. NO completion-%
 *      tracking beyond a simple "viewed" marker.
 * If you find yourself adding a progress ring or "3 of 5 modules complete",
 * stop — that's an LMS nobody asked for.
 *
 * Copy makes clear it's a library, not a course. File sizes shown because rural
 * mobile data is the baseline — a partner downloads at wifi, shows in the field.
 * ==========================================================================*/
(function (root) {
  'use strict';
  var DKEY = 'salmon_training_downloads', VKEY = 'salmon_training_viewed';

  var CATS = [
    { key: 'policies',   en: 'Company policies',  bn: 'কোম্পানি নীতি',     icon: '📘' },
    { key: 'guidelines', en: 'Partner guidelines', bn: 'পার্টনার নির্দেশিকা', icon: '📕' },
    { key: 'faqs',       en: 'FAQs',              bn: 'সাধারণ প্রশ্ন',      icon: '❓' },
    { key: 'videos',     en: 'Video tutorials',   bn: 'ভিডিও টিউটোরিয়াল',  icon: '🎬' }
  ];

  var items = [
    { id: 'TR-01', cat: 'guidelines', type: 'doc',   titleEn: 'Partner code of conduct', titleBn: 'পার্টনার আচরণবিধি', sizeMb: 1.2, pages: 14 },
    { id: 'TR-02', cat: 'guidelines', type: 'doc',   titleEn: 'How to submit a good lead', titleBn: 'কীভাবে একটি ভালো লিড জমা দেবেন', sizeMb: 0.6, pages: 6 },
    { id: 'TR-03', cat: 'policies',   type: 'doc',   titleEn: 'Consent & data-sharing policy', titleBn: 'সম্মতি ও ডেটা-শেয়ারিং নীতি', sizeMb: 0.9, pages: 9 },
    { id: 'TR-04', cat: 'policies',   type: 'doc',   titleEn: 'Commission & settlement policy', titleBn: 'কমিশন ও সেটেলমেন্ট নীতি', sizeMb: 1.1, pages: 11 },
    { id: 'TR-05', cat: 'faqs',       type: 'doc',   titleEn: 'Frequently asked questions', titleBn: 'প্রায়শই জিজ্ঞাসিত প্রশ্ন', sizeMb: 0.4, pages: 5 },
    { id: 'TR-06', cat: 'videos',     type: 'video', titleEn: 'Pitching The ROSSA to a distant buyer', titleBn: 'দূরের ক্রেতাকে দ্য রোসা পিচ করা', sizeMb: 42, durationMin: 6 },
    { id: 'TR-07', cat: 'videos',     type: 'video', titleEn: 'Using the sales kit offline', titleBn: 'অফলাইনে সেলস কিট ব্যবহার', sizeMb: 28, durationMin: 4 }
  ];
  function item(id) { return items.filter(function (i) { return i.id === id; })[0] || null; }
  function inCat(cat) { return items.filter(function (i) { return i.cat === cat; }); }

  function isDownloaded(id) { try { return (JSON.parse(localStorage.getItem(DKEY)) || {})[id] === true; } catch (e) { return false; } }
  function setDownloaded(id, v) { try { var m = JSON.parse(localStorage.getItem(DKEY)) || {}; m[id] = !!v; localStorage.setItem(DKEY, JSON.stringify(m)); } catch (e) {} }
  function downloaded() { return items.filter(function (i) { return isDownloaded(i.id); }); }
  // "viewed" is the ONLY progress marker — not a score, not completion %.
  function isViewed(id) { try { return (JSON.parse(localStorage.getItem(VKEY)) || {})[id] === true; } catch (e) { return false; } }
  function setViewed(id) { try { var m = JSON.parse(localStorage.getItem(VKEY)) || {}; m[id] = true; localStorage.setItem(VKEY, JSON.stringify(m)); } catch (e) {} }

  root.PartnerTraining = {
    CATS: CATS, items: items, item: item, inCat: inCat,
    isDownloaded: isDownloaded, setDownloaded: setDownloaded, downloaded: downloaded,
    isViewed: isViewed, setViewed: setViewed,
    strings: {
      en: { library: 'Training library', libSub: 'A reference library — read, watch, and download. Not a course: there are no quizzes, scores, or certificates.',
        search: 'Search training…', view: 'View', download: 'Download', downloaded: 'Downloaded', remove: 'Remove',
        downloads: 'Downloads', dlSub: 'Approved material available offline. Sizes shown for mobile data.',
        viewed: 'Viewed', isNew: 'New', pages: 'pages', min: 'min', size: 'Size', empty: 'Nothing downloaded yet',
        offlineReady: 'Available offline', playNote: 'Tap to play — no autoplay with sound.' },
      bn: { library: 'প্রশিক্ষণ লাইব্রেরি', libSub: 'একটি রেফারেন্স লাইব্রেরি — পড়ুন, দেখুন, ডাউনলোড করুন। এটি কোনো কোর্স নয়: কোনো কুইজ, স্কোর বা সার্টিফিকেট নেই।',
        search: 'প্রশিক্ষণ খুঁজুন…', view: 'দেখুন', download: 'ডাউনলোড', downloaded: 'ডাউনলোড হয়েছে', remove: 'সরান',
        downloads: 'ডাউনলোড', dlSub: 'অনুমোদিত উপকরণ অফলাইনে উপলব্ধ। মোবাইল ডেটার জন্য সাইজ দেখানো হয়েছে।',
        viewed: 'দেখা হয়েছে', isNew: 'নতুন', pages: 'পৃষ্ঠা', min: 'মিনিট', size: 'সাইজ', empty: 'এখনো কিছু ডাউনলোড হয়নি',
        offlineReady: 'অফলাইনে উপলব্ধ', playNote: 'চালাতে ট্যাপ করুন — শব্দসহ অটোপ্লে নেই।' }
    }
  };
})(window);
