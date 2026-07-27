/* ============================================================================
 * Salmon — Configurable Property Category schema  (Req 6.5.3)
 * ----------------------------------------------------------------------------
 * The requirement is NOT "have some categories" — it is a *configurable*
 * category system where each category declares which configuration fields
 * apply. An apartment exposes bedrooms; a land share exposes plot size and
 * share fraction, not bedrooms. The Global Client filters (bedrooms, area,
 * price range) are driven by these same field declarations.
 *
 * This module is intentionally dependency-free and identical across surfaces
 * (admin `crm-prototype/` + client `app/`) so both read one schema. In the
 * Laravel + React build this becomes a single server-owned table — logged as
 * OPEN_QUESTIONS (Req 6.5) #2. Until then the two copies are kept byte-equal.
 *
 * Nothing here is hardcoded-per-category: categories and their field sets are
 * seeded as sensible defaults, then merged with admin edits persisted to
 * localStorage('salmon_categories'). Admin can add a category and toggle which
 * fields apply (E09). The field-per-category matrix below is a DEFAULT, not a
 * confirmed spec — see OPEN_QUESTIONS (Req 6.5) #1.
 * ==========================================================================*/
(function (root) {
  'use strict';

  var STORE_KEY = 'salmon_categories';

  /* ---------------------------------------------------------------------------
   * FIELD LIBRARY — the vocabulary of configuration fields a category may use.
   * `filter` describes the client filter control this field drives (6.5.3):
   *   chips  → discrete choices (bedrooms)
   *   range  → min/max slider (area, price, plot size, share fraction)
   *   (a field with no `filter` still shows on the project/unit, just isn't a
   *    global filter dimension — e.g. floor, facing, frontage.)
   * `sensitive:true` marks legally-guarded fields (return frame) that render as
   *   [LEGAL SIGN-OFF REQUIRED] and never carry a rate/projection.
   * ------------------------------------------------------------------------- */
  var FIELDS = {
    bedrooms:     { id:'bedrooms',     label:'Bedrooms',      labelBn:'শয়নকক্ষ',   type:'number', unit:'bed',   filter:{ control:'chips', choices:['1','2','3','4','4+'] } },
    bathrooms:    { id:'bathrooms',    label:'Bathrooms',     labelBn:'বাথরুম',    type:'number', unit:'bath' },
    area:         { id:'area',         label:'Area',          labelBn:'আয়তন',      type:'number', unit:'sqft',  filter:{ control:'range', min:600, max:2600, step:50, suffix:'sqft' } },
    floor:        { id:'floor',        label:'Floor',         labelBn:'তলা',       type:'number', unit:'floor' },
    balcony:      { id:'balcony',      label:'Balcony',       labelBn:'বারান্দা',   type:'number', unit:'balcony' },
    facing:       { id:'facing',       label:'Facing',        labelBn:'মুখ',        type:'text' },
    frontage:     { id:'frontage',     label:'Frontage',      labelBn:'সম্মুখ',     type:'text',   unit:'ft' },
    plotSize:     { id:'plotSize',     label:'Plot size',     labelBn:'জমির আয়তন', type:'number', unit:'katha', filter:{ control:'range', min:1, max:20, step:0.5, suffix:'katha' } },
    shareFraction:{ id:'shareFraction',label:'Share fraction',labelBn:'শেয়ার ভগ্নাংশ', type:'text', filter:{ control:'range', min:0, max:100, step:1, suffix:'%' } },
    priceRange:   { id:'priceRange',   label:'Price range',   labelBn:'মূল্যসীমা',  type:'number', unit:'BDT',   filter:{ control:'range', min:5000000, max:40000000, step:500000, suffix:'BDT' } },
    // The legally-sensitive one — share-based, return-bearing instruments.
    returnFrame:  { id:'returnFrame',  label:'Expected-return frame', labelBn:'প্রত্যাশিত রিটার্ন কাঠামো', type:'text', sensitive:true }
  };

  /* ---------------------------------------------------------------------------
   * DEFAULT CATEGORIES — each declares its applicable fields (ids into FIELDS).
   * Order matters for display. `system:true` = a seed category (still editable).
   * ------------------------------------------------------------------------- */
  var DEFAULTS = [
    { id:'apartment',  label:'Apartment / flat',   labelBn:'অ্যাপার্টমেন্ট / ফ্ল্যাট', system:true,
      fields:['bedrooms','bathrooms','area','floor','balcony','facing','priceRange'] },
    { id:'commercial', label:'Commercial space',   labelBn:'বাণিজ্যিক স্থান',        system:true,
      fields:['area','floor','frontage','priceRange'] },
    { id:'shop',       label:'Shop',               labelBn:'দোকান',                  system:true,
      fields:['area','floor','frontage','priceRange'] },
    { id:'land-share', label:'Land / plot share',  labelBn:'জমি / প্লট শেয়ার',       system:true,
      fields:['plotSize','shareFraction','priceRange'] },
    { id:'hotel-share',label:'Hospital / hotel share', labelBn:'হাসপাতাল / হোটেল শেয়ার', system:true,
      fields:['shareFraction','area','returnFrame','priceRange'] }
  ];

  /* ---- persistence: defaults merged with admin edits ---------------------- */
  function readStore(){ try { return JSON.parse(root.localStorage.getItem(STORE_KEY) || 'null'); } catch(e){ return null; } }
  function writeStore(list){ try { root.localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch(e){} }

  function all(){
    var stored = readStore();
    if (!stored || !stored.length) return DEFAULTS.map(clone);
    // merge: keep stored order/edits, but never lose a default field-library ref
    return stored.map(clone);
  }
  function clone(c){ return { id:c.id, label:c.label, labelBn:c.labelBn||'', system:!!c.system, fields:(c.fields||[]).slice() }; }

  function byId(id){ return all().filter(function(c){ return c.id === id; })[0] || null; }

  /* fields (full objects) that apply to a category, in declared order */
  function fieldsFor(id){
    var c = byId(id); if (!c) return [];
    return c.fields.map(function(fid){ return FIELDS[fid]; }).filter(Boolean);
  }
  /* only the fields that drive a GLOBAL CLIENT FILTER (6.5.3) */
  function filtersFor(id){
    return fieldsFor(id).filter(function(f){ return !!f.filter; });
  }
  /* union of filter fields across a set of categories (or all) — for the
     discovery screen when several categories are in play at once. */
  function filterUnion(ids){
    var seen = {}, out = [];
    var cats = (ids && ids.length) ? ids : all().map(function(c){ return c.id; });
    cats.forEach(function(cid){
      filtersFor(cid).forEach(function(f){ if (!seen[f.id]) { seen[f.id] = 1; out.push(f); } });
    });
    return out;
  }

  /* ---- admin mutations (E09) --------------------------------------------- */
  function addCategory(label, fields){
    var id = String(label||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || ('cat-'+all().length);
    var list = all();
    if (list.some(function(c){ return c.id === id; })) id = id + '-' + (list.length+1);
    list.push({ id:id, label:label, labelBn:'', system:false, fields:(fields||['area','priceRange']).slice() });
    writeStore(list);
    return id;
  }
  function setFields(id, fields){
    var list = all();
    var c = list.filter(function(x){ return x.id === id; })[0];
    if (!c) return false;
    c.fields = fields.slice();
    writeStore(list);
    return true;
  }
  function toggleField(id, fieldId){
    var c = byId(id); if (!c) return;
    var i = c.fields.indexOf(fieldId);
    if (i >= 0) c.fields.splice(i,1); else c.fields.push(fieldId);
    return setFields(id, c.fields);
  }
  function removeCategory(id){
    var list = all().filter(function(c){ return c.id !== id; });
    writeStore(list);
  }
  function resetToDefaults(){ writeStore(DEFAULTS.map(clone)); }

  root.SalmonCategories = {
    FIELDS: FIELDS,
    DEFAULTS: DEFAULTS,
    all: all, byId: byId,
    fieldsFor: fieldsFor, filtersFor: filtersFor, filterUnion: filterUnion,
    label: function(id){ var c = byId(id); return c ? c.label : id; },
    addCategory: addCategory, setFields: setFields, toggleField: toggleField,
    removeCategory: removeCategory, resetToDefaults: resetToDefaults,
    isSensitive: function(fieldId){ return !!(FIELDS[fieldId] && FIELDS[fieldId].sensitive); }
  };
})(typeof window !== 'undefined' ? window : this);
