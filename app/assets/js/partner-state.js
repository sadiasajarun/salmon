/* ============================================================================
 * Salmon Developers — partner account state + registration draft
 * ----------------------------------------------------------------------------
 * accountStatus is one of pending/approved/rejected/suspended — RETURNED BY THE
 * BACKEND at login (the app never guesses). P07/P08/P09/P10 are the four
 * resolutions of "you registered"; the dev toolbar flips between them.
 *
 * Registration DRAFTS every field to localStorage so a dropped 3G connection
 * never loses Shahin's input. Identity values (Partner ID format, rank criteria,
 * SLA, field list) are UNDEFINED by the client -> placeholders, logged.
 * ==========================================================================*/
(function (root) {
  'use strict';
  var S_KEY = 'salmon_partner_status', D_KEY = 'salmon_partner_draft';
  var STATUSES = ['pending', 'approved', 'rejected', 'suspended'];

  function getStatus() { try { return localStorage.getItem(S_KEY) || 'pending'; } catch (e) { return 'pending'; } }
  function setStatus(s) { try { localStorage.setItem(S_KEY, s); } catch (e) {} document.dispatchEvent(new CustomEvent('partnerstatus', { detail: s })); }

  function getDraft() { try { return JSON.parse(localStorage.getItem(D_KEY)) || {}; } catch (e) { return {}; } }
  function saveDraft(patch) { var d = Object.assign(getDraft(), patch); try { localStorage.setItem(D_KEY, JSON.stringify(d)); } catch (e) {} return d; }
  function clearDraft() { try { localStorage.removeItem(D_KEY); } catch (e) {} }

  // Identity conferred on approval. Formats/criteria are PLACEHOLDERS.
  var identity = {
    name: 'Md. Shahin Alam', nameBn: 'মোঃ শাহিন আলম',
    partnerId: 'SDP-CUM-00417',           // __PLACEHOLDER format
    title: 'Authorized Sales Partner', titleBn: 'অনুমোদিত সেলস পার্টনার',
    rank: 'silver',                        // manually assigned by admin
    programs: ['zeroInvestment'],          // DERIVED mirror of active participation (kept in sync)
    joinDate: '2026-07-15',
    // Per-program PARTICIPATION (Req 6.3.2) — each program its own status +
    // enrolment date + history. DISTINCT from accountStatus above. Admin
    // activate/suspend/close writes here; suspend/close retain the record.
    participation: {
      zeroInvestment: { status: 'active', enrolledAt: '2026-07-15', reason: null, reasonAt: null },
      withInvestment: { status: 'notEnrolled', enrolledAt: null, reason: null, reasonAt: null }
    },
    phone: '+8801712345678', email: 'shahin.cumilla@example.com',
    __PLACEHOLDER: true
  };
  // ProgramParticipationStatus — per program, NOT the account.
  var PARTICIPATION_STATUSES = ['notEnrolled', 'active', 'suspended', 'closed'];
  // Keep the legacy identity.programs array in sync with active participation.
  function syncPrograms() {
    identity.programs = Object.keys(identity.participation).filter(function (k) {
      return identity.participation[k].status === 'active';
    });
  }
  syncPrograms();
  var rejectionReason = { bn: 'জমা দেওয়া এনআইডি ছবিটি স্পষ্ট ছিল না।', en: 'The submitted NID image was not clear.' };
  var suspensionReason = { bn: 'একটি অভিযোগ পর্যালোচনাধীন রয়েছে।', en: 'A complaint is under review.' };
  var slaHours = 48; // __PLACEHOLDER review SLA — the P07 screen needs a real number here

  /* --------------------------------------------------------------------------
   * CONFIG — client-approved choices that MUST be data-driven, not hardcoded.
   * Salmon flips these; the screens read them. Real values are OPEN_QUESTIONS.
   * ------------------------------------------------------------------------ */
  var CONFIG = {
    REGISTRATION_VERIFY_METHOD: 'phone',   // 'phone' | 'email' | 'both'  (OQ #1)
    WITH_INVESTMENT_ELIGIBILITY: 'admin-approval', // gate mechanism; RULE is OQ #4
    REFERRAL_BASE: 'https://salmon.example/r/'      // what the QR encodes (OQ #3)
  };
  // Eligibility GATE (mechanism, not rule). Zero is open to all; With is gated.
  // Whether a given partner is eligible is a config/back-end decision — here a
  // draft flag simulates the admin decision so the gate is demonstrable.
  function eligibleFor(program) {
    if (program !== 'with') return true;                 // Zero Investment: everyone
    var d = getDraft();
    if (d.withEligible === true) return true;            // admin pre-approved (sim)
    return CONFIG.WITH_INVESTMENT_ELIGIBILITY === 'open'; // else gated until rule set
  }
  // Referral link the business-card QR encodes (recommend: referral URL — OQ #3).
  function referralLink() { return CONFIG.REFERRAL_BASE + identity.partnerId; }

  /* --------------------------------------------------------------------------
   * Registration consent — FOUR distinct acceptances, each stored with a
   * timestamp + version. Separate from the per-lead consent (lead-consent.page).
   * ------------------------------------------------------------------------ */
  var CONSENT_VERSIONS = { terms: '1.0', privacy: '1.0', program: '1.0', dataHandling: '1.0', invest: '1.0' };
  function getConsents() { return getDraft().consents || {}; }
  function setConsent(key, accepted) {
    var d = getDraft(), c = d.consents || {};
    if (accepted) c[key] = { accepted: true, version: CONSENT_VERSIONS[key] || '1.0', acceptedAt: new Date().toISOString() };
    else delete c[key];
    saveDraft({ consents: c }); return c;
  }

  root.Partner = {
    STATUSES: STATUSES, getStatus: getStatus, setStatus: setStatus,
    getDraft: getDraft, saveDraft: saveDraft, clearDraft: clearDraft,
    identity: identity, rejectionReason: rejectionReason, suspensionReason: suspensionReason, slaHours: slaHours,
    CONFIG: CONFIG, eligibleFor: eligibleFor, referralLink: referralLink,
    PARTICIPATION_STATUSES: PARTICIPATION_STATUSES, syncPrograms: syncPrograms,
    CONSENT_VERSIONS: CONSENT_VERSIONS, getConsents: getConsents, setConsent: setConsent,
    RANKS: {
      silver:  { bn: 'সিলভার', en: 'Silver',  hex: '#8a8f98', unlocksBn: ['লিড জমা ও ট্র্যাকিং', 'সেলস কিট অ্যাক্সেস', 'কমিশন লেজার'], unlocksEn: ['Submit & track leads', 'Sales-kit access', 'Commission ledger'] },
      gold:    { bn: 'গোল্ড',   en: 'Gold',    hex: '#b8860b', unlocksBn: ['উচ্চতর কমিশন টিয়ার', 'অগ্রাধিকার সহায়তা'], unlocksEn: ['Higher commission tier', 'Priority support'] },
      platinum:{ bn: 'প্ল্যাটিনাম', en: 'Platinum', hex: '#5c6470', unlocksBn: ['টিম লিড সরঞ্জাম', 'উইথ-ইনভেস্টমেন্ট অগ্রাধিকার'], unlocksEn: ['Team-lead tools', 'With-Investment priority'] }
    },
    PROGRAMS: {
      zeroInvestment: { bn: 'জিরো ইনভেস্টমেন্ট', en: 'Zero Investment', lineBn: 'ক্রেতা রেফার করুন, যাচাইকৃত রূপান্তরে কমিশন পান।', lineEn: 'Refer buyers, earn commission on verified conversion.' },
      withInvestment: { bn: 'উইথ ইনভেস্টমেন্ট', en: 'With Investment', lineBn: 'অনুমোদিত প্রকল্পে শেয়ার কিনুন, উচ্চতর টিয়ার + রেকর্ডকৃত রিটার্ন সময়সূচি।', lineEn: 'Buy an approved project share; higher tier + a recorded return schedule.' }
    }
  };
})(window);
