/* ============================================================================
 * Salmon Developers — shared Program Information renderer (Req 6.3.1)
 * ----------------------------------------------------------------------------
 * ONE six-section pattern, used by BOTH P17 (Zero Investment) and P18 (With
 * Investment) so they read as two variants of one design, never two designs.
 *
 * The six sections, in fixed order:
 *   1 Description  2 Eligibility  3 Responsibilities  4 Benefits
 *   5 Conditions   6 Disclaimers
 *
 * ALL section copy is CLIENT-APPROVED content — it comes from Salmon, not from
 * this prototype. Where the authoritative copy does not exist yet, the section
 * body is a clearly-marked [CLIENT-APPROVED COPY REQUIRED] block (or, for the
 * With-Investment legal framing, [LEGAL DISCLAIMER COPY REQUIRED] /
 * [LEGAL SIGN-OFF REQUIRED]). We never write plausible terms that could be
 * mistaken for the real thing.
 * ========================================================================== */
(function (root) {
  'use strict';

  var SECTION_ORDER = ['description', 'eligibility', 'responsibilities', 'benefits', 'conditions', 'disclaimers'];
  var TITLES = {
    description:     { bn: 'বিবরণ', en: 'Description' },
    eligibility:     { bn: 'যোগ্যতা', en: 'Eligibility' },
    responsibilities:{ bn: 'দায়িত্ব', en: 'Responsibilities' },
    benefits:        { bn: 'সুবিধা', en: 'Benefits' },
    conditions:      { bn: 'শর্ত', en: 'Conditions' },
    disclaimers:     { bn: 'দাবিত্যাগ', en: 'Disclaimers' }
  };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // A placeholder block — visually distinct, never mistakable for real copy.
  function ph(label) {
    return '<div class="copyph">' + esc(label) + '</div>';
  }
  // A neutral, non-committal framing hint (clearly the prototype's words, muted).
  // Safe to show because it describes the mechanism, not the terms.
  function hint(text) { return text ? '<div class="sechint">' + esc(text) + '</div>' : ''; }

  // Render one section: title, optional neutral hint, authoritative placeholder.
  function section(key, lang, cfg) {
    var s = cfg.sections[key] || {};
    var title = TITLES[key][lang] || TITLES[key].en;
    var mandatory = key === 'disclaimers' && cfg.variant === 'with';
    return '<div class="secblock' + (mandatory ? ' secmand' : '') + '">' +
      '<div class="sectitle" style="margin:0 0 6px">' + esc(title) + (mandatory ? ' <span class="reqtag">' + (lang === 'bn' ? 'বাধ্যতামূলক' : 'MANDATORY') + '</span>' : '') + '</div>' +
      hint(lang === 'bn' ? s.hintBn : s.hintEn) +
      ph(s.placeholder || '[CLIENT-APPROVED COPY REQUIRED]') +
      (s.extra ? s.extra(lang) : '') +
      '</div>';
  }

  // Full six-section body for a program.
  function render(lang, cfg) {
    return SECTION_ORDER.map(function (k) { return section(k, lang, cfg); }).join('');
  }

  root.ProgramInfo = { render: render, SECTION_ORDER: SECTION_ORDER, esc: esc };
})(window);
