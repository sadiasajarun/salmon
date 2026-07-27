/* ============================================================================
 * Salmon Live Demo — configurable operating-territory hierarchy.
 * Bangladesh administrative units: Division › District › Upazila/Thana › Union.
 * A territory is a { division, district, upazila, union } path (name-based).
 * Dual-mode: attaches window.Geo in the browser AND exports for the Node server
 * (used to backfill legacy records and derive the district for partner IDs).
 * Representative subset — Chattogram › Cumilla is fully populated; every other
 * district carries at least one upazila+union so the cascade is never empty.
 * ==========================================================================*/
(function (root, factory) {
  var api = factory();
  if (root) root.Geo = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';

  function upz(name, unions) { return { name: name, unions: unions }; }

  var DIVISIONS = [
    { name: 'Chattogram', districts: [
      { name: 'Cumilla', upazilas: [
        upz('Cumilla Sadar', ['Amratali', 'Durgapur', 'Jagannathpur', 'Panchthubi']),
        upz('Debidwar', ['Subil', 'Elahabad', 'Rajamehar']),
        upz('Muradnagar', ['Bangra', 'Srikail', 'Jahapur']),
        upz('Chandina', ['Barkarai', 'Madhaiya', 'Etbarpur'])
      ] },
      { name: 'Chattogram', upazilas: [
        upz('Kotwali', ['Bakalia', 'Chawkbazar', 'Firingi Bazar']),
        upz('Panchlaish', ['Nasirabad', 'Sholoshahar']),
        upz('Hathazari', ['Fatehpur', 'Garduara'])
      ] },
      { name: 'Feni', upazilas: [
        upz('Feni Sadar', ['Kazirbagh', 'Dhormopur', 'Kalidas Pahalia']),
        upz('Chhagalnaiya', ['Ghopal', 'Radhanagar'])
      ] },
      { name: 'Noakhali', upazilas: [
        upz('Noakhali Sadar', ['Binodpur', 'Ashwadia', 'Noannoi']),
        upz('Begumganj', ['Amanullapur', 'Rajganj'])
      ] }
    ] },
    { name: 'Dhaka', districts: [
      { name: 'Dhaka', upazilas: [
        upz('Savar', ['Ashulia', 'Tetuljhora', 'Birulia']),
        upz('Dhamrai', ['Kushura', 'Sombhag', 'Baisakanda']),
        upz('Keraniganj', ['Kalindi', 'Shubhadya'])
      ] },
      { name: 'Gazipur', upazilas: [
        upz('Gazipur Sadar', ['Basan', 'Konabari', 'Pubail']),
        upz('Kaliakair', ['Sreefaltali', 'Mouchak'])
      ] },
      { name: 'Narayanganj', upazilas: [
        upz('Narayanganj Sadar', ['Kutubpur', 'Enayetnagar']),
        upz('Sonargaon', ['Baidyer Bazar', 'Pirojpur'])
      ] }
    ] },
    { name: 'Sylhet', districts: [
      { name: 'Sylhet', upazilas: [
        upz('Sylhet Sadar', ['Tuker Bazar', 'Khadimnagar', 'Jalalabad']),
        upz('Beanibazar', ['Kurar Bazar', 'Sheola'])
      ] },
      { name: 'Moulvibazar', upazilas: [
        upz('Sreemangal', ['Bhunabir', 'Kalapur']),
        upz('Kamalganj', ['Adampur', 'Munshibazar'])
      ] }
    ] },
    { name: 'Khulna', districts: [
      { name: 'Khulna', upazilas: [
        upz('Khulna Sadar', ['Tootpara', 'Sonadanga']),
        upz('Dumuria', ['Rudaghara', 'Sahas'])
      ] },
      { name: 'Jashore', upazilas: [
        upz('Jashore Sadar', ['Arabpur', 'Chanchra']),
        upz('Abhaynagar', ['Prembagh', 'Payra'])
      ] }
    ] },
    { name: 'Rajshahi', districts: [
      { name: 'Rajshahi', upazilas: [
        upz('Boalia', ['Terokhadia', 'Ramchandrapur']),
        upz('Paba', ['Haripur', 'Darshanpara'])
      ] },
      { name: 'Bogura', upazilas: [
        upz('Bogura Sadar', ['Namuja', 'Shakharia']),
        upz('Sherpur', ['Kusumbi', 'Mirzapur'])
      ] }
    ] },
    { name: 'Barishal', districts: [
      { name: 'Barishal', upazilas: [
        upz('Barishal Sadar', ['Kashipur', 'Charmonai']),
        upz('Bakerganj', ['Kalaskati', 'Charadi'])
      ] }
    ] },
    { name: 'Rangpur', districts: [
      { name: 'Rangpur', upazilas: [
        upz('Rangpur Sadar', ['Mominpur', 'Uttam', 'Sadyapushkarini']),
        upz('Mithapukur', ['Balarhat', 'Gopalpur'])
      ] }
    ] },
    { name: 'Mymensingh', districts: [
      { name: 'Mymensingh', upazilas: [
        upz('Mymensingh Sadar', ['Boyra', 'Char Ishwardia']),
        upz('Trishal', ['Balipara', 'Kanihari'])
      ] }
    ] }
  ];

  // legacy single-string territories → a best-effort full path (for backfill).
  var LEGACY = {
    'Cumilla':    { division: 'Chattogram', district: 'Cumilla', upazila: 'Cumilla Sadar', union: 'Panchthubi' },
    'Dhaka':      { division: 'Dhaka', district: 'Dhaka', upazila: 'Savar', union: 'Ashulia' },
    'Chattogram': { division: 'Chattogram', district: 'Chattogram', upazila: 'Kotwali', union: 'Bakalia' },
    'Sylhet':     { division: 'Sylhet', district: 'Sylhet', upazila: 'Sylhet Sadar', union: 'Jalalabad' },
    'Khulna':     { division: 'Khulna', district: 'Khulna', upazila: 'Khulna Sadar', union: 'Tootpara' }
  };

  function byName(list, name) { for (var i = 0; i < (list || []).length; i++) { if (list[i].name === name) return list[i]; } return null; }

  function districtsOf(division) { var d = byName(DIVISIONS, division); return d ? d.districts : []; }
  function upazilasOf(division, district) { var d = byName(districtsOf(division), district); return d ? d.upazilas : []; }
  function unionsOf(division, district, upazila) { var u = byName(upazilasOf(division, district), upazila); return u ? u.unions : []; }

  // resolve a possibly-partial path to a complete, valid one (fills first child
  // where a level is missing/invalid). Used by the registration cascade.
  function complete(path) {
    path = path || {};
    var division = byName(DIVISIONS, path.division) ? path.division : DIVISIONS[0].name;
    var dl = districtsOf(division);
    var district = byName(dl, path.district) ? path.district : (dl[0] && dl[0].name) || '';
    var ul = upazilasOf(division, district);
    var upazila = byName(ul, path.upazila) ? path.upazila : (ul[0] && ul[0].name) || '';
    var unl = unionsOf(division, district, upazila);
    var union = unl.indexOf(path.union) >= 0 ? path.union : (unl[0] || '');
    return { division: division, district: district, upazila: upazila, union: union };
  }

  // backfill a legacy record: prefer an explicit geo, else map the string.
  function fromName(name) {
    if (LEGACY[name]) return { division: LEGACY[name].division, district: LEGACY[name].district, upazila: LEGACY[name].upazila, union: LEGACY[name].union };
    return { division: '', district: name || '', upazila: '', union: '' };
  }

  function geoOf(record) {
    if (record && record.geo && (record.geo.district || record.geo.division)) return record.geo;
    return fromName(record ? record.territory : '');
  }

  // "Chattogram › Cumilla › Cumilla Sadar › Panchthubi" (skips empty levels).
  function format(record) {
    var g = geoOf(record);
    return [g.division, g.district, g.upazila, g.union].filter(function (x) { return x; }).join(' › ');
  }
  // compact form for tables/cards: "Cumilla · Cumilla Sadar" (district + upazila).
  function formatShort(record) {
    var g = geoOf(record);
    return [g.district, g.upazila].filter(function (x) { return x; }).join(' · ') || g.division || '';
  }
  // the district drives partner-ID prefixes and dense table columns.
  function districtOf(record) { return geoOf(record).district || (record && record.territory) || ''; }

  return {
    divisions: DIVISIONS,
    districtsOf: districtsOf, upazilasOf: upazilasOf, unionsOf: unionsOf,
    complete: complete, fromName: fromName, geoOf: geoOf,
    format: format, formatShort: formatShort, districtOf: districtOf
  };
});
