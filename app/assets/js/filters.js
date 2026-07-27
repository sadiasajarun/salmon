/* ============================================================================
 * Salmon Developers — discovery filter engine (shared by list + filter sheet)
 * Filters operate on the CONVERTED display value for price, but the record
 * never loses BDT.
 *
 * Req 6.5.3 — the filter DIMENSIONS are driven by the configurable category
 * schema (SalmonCategories). Category is a live dimension on each project's
 * real `category`; and which config filters apply (bedrooms / area / price /
 * plot size / share fraction) is derived from the selected category's declared
 * fields. Filtering an apartment search by bedrooms works; filtering land
 * shares surfaces plot-size instead — never bedrooms.
 * ==========================================================================*/
(function (root) {
  'use strict';
  var KEY = 'salmon_filters';
  var SC = root.SalmonCategories; // configurable category schema (mirrored module)

  // Which config-filter fields apply, given the currently-selected categories.
  // No category selected → the union across every category (so discovery still
  // offers bedrooms for the apartment stock that dominates the catalogue).
  function fieldsForCats(cats) {
    if (!SC) return ['bedrooms', 'area', 'priceRange'];
    return SC.filterUnion(cats && cats.length ? cats : null).map(function (f) { return f.id; });
  }
  function fieldApplies(cats, fieldId) { return fieldsForCats(cats).indexOf(fieldId) > -1; }

  function def() {
    return { status: [], areas: [], cats: [], beds: [], sqftMin: null, sqftMax: null, priceMaxAed: null, availableOnly: false };
  }
  function load() {
    try { var v = JSON.parse(localStorage.getItem(KEY)); return v ? Object.assign(def(), v) : def(); }
    catch (e) { return def(); }
  }
  function save(f) { try { localStorage.setItem(KEY, JSON.stringify(f)); } catch (e) {} }
  function clear() { try { localStorage.removeItem(KEY); } catch (e) {} }

  function beds(p) {
    if (!p.glance) return [];
    var b = p.glance.bed;
    if (typeof b === 'number') return [b];
    return String(b).split(/[–\-/]/).map(function (x) { return parseInt(x, 10); }).filter(Boolean);
  }
  function bedOk(p, tokens) {
    if (!tokens.length) return true;
    var pb = beds(p);
    return tokens.some(function (t) {
      if (t === '4+') return pb.some(function (n) { return n >= 4; });
      return pb.indexOf(parseInt(t, 10)) > -1;
    });
  }
  function sqftOk(p, f) {
    if (f.sqftMin == null && f.sqftMax == null) return true;
    if (!p.glance) return false;
    var lo = f.sqftMin == null ? 0 : f.sqftMin, hi = f.sqftMax == null ? 1e9 : f.sqftMax;
    return p.glance.sqft.some(function (s) { return s >= lo && s <= hi; });
  }
  function priceOk(p, f, Currency) {
    if (f.priceMaxAed == null) return true;
    if (!p.price) return false;
    return Currency.toDisplay(p.price.amountBdtFrom, 'AED') <= f.priceMaxAed;
  }
  function matches(p, f, Currency) {
    if (f.status.length && f.status.indexOf(p.status) < 0) return false;
    if (f.areas.length && f.areas.indexOf(p.area) < 0) return false;
    // Live category dimension (6.5.3) — match the project's real category.
    var pcat = p.category || 'apartment';
    if (f.cats.length && f.cats.indexOf(pcat) < 0) return false;
    // Bedrooms only constrains categories that DECLARE a bedrooms field.
    if (f.beds.length && fieldApplies(f.cats, 'bedrooms') && !bedOk(p, f.beds)) return false;
    if (!sqftOk(p, f)) return false;
    if (!priceOk(p, f, Currency)) return false;
    if (f.availableOnly && !(p.availableUnits >= 1)) return false;
    return true;
  }
  function apply(projects, f, Currency) {
    return projects.filter(function (p) { return matches(p, f, Currency); });
  }
  function isEmpty(f) {
    return !f.status.length && !f.areas.length && !f.cats.length && !f.beds.length &&
      f.sqftMin == null && f.sqftMax == null && f.priceMaxAed == null && !f.availableOnly;
  }
  // active chips for display: [{k:'status:ongoing', label:'Ongoing'}]
  function chips(f, D, lang) {
    var out = [], s = D.strings[lang];
    f.status.forEach(function (v) { out.push({ k: 'status:' + v, label: s[v] }); });
    f.areas.forEach(function (v) { out.push({ k: 'areas:' + v, label: D.areas[v] ? D.areas[v][lang] : v }); });
    f.cats.forEach(function (v) { out.push({ k: 'cats:' + v, label: SC ? SC.label(v) : v }); });
    f.beds.forEach(function (v) { out.push({ k: 'beds:' + v, label: v + ' ' + s.bed }); });
    if (f.sqftMin != null || f.sqftMax != null) out.push({ k: 'sqft', label: (f.sqftMin || 0) + '–' + (f.sqftMax || '∞') + ' sqft' });
    if (f.priceMaxAed != null) out.push({ k: 'price', label: '≤ AED ' + f.priceMaxAed.toLocaleString('en-US') });
    if (f.availableOnly) out.push({ k: 'avail', label: s.availOnly });
    return out;
  }
  function removeChip(f, k) {
    if (k === 'sqft') { f.sqftMin = null; f.sqftMax = null; }
    else if (k === 'price') { f.priceMaxAed = null; }
    else if (k === 'avail') { f.availableOnly = false; }
    else {
      var parts = k.split(':'), field = parts[0], val = parts[1];
      f[field] = (f[field] || []).filter(function (x) { return String(x) !== val; });
    }
    return f;
  }
  root.Filters = { def: def, load: load, save: save, clear: clear, matches: matches, apply: apply, isEmpty: isEmpty, chips: chips, removeChip: removeChip, fieldsForCats: fieldsForCats, fieldApplies: fieldApplies };
})(window);
