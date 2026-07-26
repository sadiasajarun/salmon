/* ============================================================================
 * Salmon CRM — Catalogue & Inventory mock data (Part 3)
 * Adds a `CRM.Catalogue` island. Real Salmon project names + structural
 * "At A Glance" fields. Mutations (publish, unit status, media, construction)
 * are recorded as localStorage overrides (via Ripples.mutate) and merged on
 * read — same pattern as Part 2, so a change on one screen shows on the next.
 * ==========================================================================*/
(function (root) {
  'use strict';

  function ago(days){ var d = new Date('2026-07-15T10:00:00Z'); d.setUTCDate(d.getUTCDate()-days); return d.toISOString(); }

  /* ---------------------------------------------------------------------------
   * Projects — At-A-Glance mirrors Salmon's real site fields.
   * ------------------------------------------------------------------------- */
  function unit(no, floor, config, area, price, orient, status){
    return { unitNo:no, floor:floor, config:config, areaSqft:area, priceBdt:price, orientation:orient, status:status };
  }

  var projects = [
    {
      id:'PRJ-BEL', name:'Salmon Bellissimo', location:'Bashundhara R/A, Block J, Dhaka', status:'published', publishedUtc: ago(40),
      glance:{ buildingType:'Residential Apartment', floors:'B2 + G + 12', unitSqft:'1,650 – 2,250 sqft', bed:3, bath:3, balcony:2, lift:2, landFacing:'South-East', frontRoad:'25 ft' },
      handover:'Dec 2026', priceFromBdt:14500000,
      units:[
        unit('A-3A',3,'3 Bed',1650,14500000,'South','sold'),
        unit('A-4A',4,'3 Bed',1650,14750000,'South','sold'),
        unit('A-5B',5,'3 Bed',1850,16200000,'South-East','booked'),
        unit('A-6B',6,'3 Bed',1850,16400000,'South-East','reserved'),
        unit('A-7C',7,'3 Bed',2100,18900000,'East','available'),
        unit('A-8C',8,'3 Bed',2100,19100000,'East','available'),
        unit('A-9D',9,'3 Bed',2250,20500000,'North-East','available'),
        unit('A-10D',10,'3 Bed',2250,20800000,'North-East','available')
      ],
      media:[
        { id:'M-BEL-1', type:'photo', label:'Front elevation (dusk)', hero:true },
        { id:'M-BEL-2', type:'photo', label:'Lobby' },
        { id:'M-BEL-3', type:'photo', label:'Living room — show unit' },
        { id:'M-BEL-4', type:'video', label:'Walkthrough 02:14' },
        { id:'M-BEL-5', type:'360', label:'Rooftop 360', url:'https://example.com/360/bellissimo-roof' },
        { id:'M-BEL-6', type:'floorplan', label:'Typical floor plan (Type C)' },
        { id:'M-BEL-7', type:'brochure', label:'Bellissimo — Brochure v3.pdf' }
      ],
      construction:[
        { id:'CU-BEL-4', date: ago(2),  stage:'12th floor', caption:'12th floor slab casting completed — structure topped out.', mediaType:'photo' },
        { id:'CU-BEL-3', date: ago(16), stage:'10th floor', caption:'10th floor columns and shear walls poured.', mediaType:'photo' },
        { id:'CU-BEL-2', date: ago(34), stage:'8th floor',  caption:'8th floor slab casting — steel and shuttering in place.', mediaType:'video' },
        { id:'CU-BEL-1', date: ago(60), stage:'6th floor',  caption:'6th floor work underway, brickwork started on lower floors.', mediaType:'photo' }
      ]
    },
    {
      id:'PRJ-FLO', name:'Salmon Florentine', location:'Bashundhara R/A, Block C, Dhaka', status:'published', publishedUtc: ago(20),
      glance:{ buildingType:'Residential Apartment', floors:'B1 + G + 10', unitSqft:'1,450 – 1,950 sqft', bed:3, bath:2, balcony:2, lift:2, landFacing:'South', frontRoad:'30 ft' },
      handover:'Jun 2027', priceFromBdt:12800000,
      units:[
        unit('B-2A',2,'3 Bed',1450,12800000,'South','sold'),
        unit('B-3A',3,'3 Bed',1450,12950000,'South','booked'),
        unit('B-4B',4,'3 Bed',1650,14600000,'South-West','reserved'),
        unit('B-5B',5,'3 Bed',1650,14750000,'South-West','available'),
        unit('B-6C',6,'3 Bed',1950,17200000,'West','available'),
        unit('B-7C',7,'3 Bed',1950,17400000,'West','available')
      ],
      media:[
        { id:'M-FLO-1', type:'photo', label:'Front elevation', hero:true },
        { id:'M-FLO-2', type:'photo', label:'Entrance canopy' },
        { id:'M-FLO-3', type:'floorplan', label:'Ground floor plan' },
        { id:'M-FLO-4', type:'brochure', label:'Florentine — Brochure v2.pdf' }
      ],
      construction:[
        { id:'CU-FLO-3', date: ago(5),  stage:'10th floor', caption:'10th floor slab casting completed — topped out.', mediaType:'photo' },
        { id:'CU-FLO-2', date: ago(24), stage:'7th floor',  caption:'7th floor concrete work in progress.', mediaType:'photo' },
        { id:'CU-FLO-1', date: ago(55), stage:'4th floor',  caption:'4th floor slab completed.', mediaType:'photo' }
      ]
    },
    {
      id:'PRJ-ROS', name:'The ROSSA', location:'Bashundhara R/A, Block K, Dhaka', status:'published', publishedUtc: ago(90),
      glance:{ buildingType:'Premium Apartment', floors:'B2 + G + 14', unitSqft:'1,850 – 2,600 sqft', bed:4, bath:4, balcony:3, lift:3, landFacing:'South-East', frontRoad:'40 ft' },
      handover:'Handover complete', priceFromBdt:22000000,
      units:[
        unit('R-11A',11,'4 Bed',2400,29500000,'South-East','sold'),
        unit('R-12A',12,'4 Bed',2400,29800000,'South-East','sold'),
        unit('R-13B',13,'4 Bed',2600,33000000,'South','booked'),
        unit('R-14B',14,'4 Bed',2600,34500000,'South','available'),
        unit('R-4C',4,'4 Bed',1850,22000000,'East','available'),
        unit('R-5C',5,'4 Bed',1850,22300000,'East','reserved')
      ],
      media:[
        { id:'M-ROS-1', type:'photo', label:'Tower — full height', hero:true },
        { id:'M-ROS-2', type:'photo', label:'Sky lounge' },
        { id:'M-ROS-3', type:'video', label:'Amenities tour 03:40' },
        { id:'M-ROS-4', type:'360', label:'Penthouse 360', url:'https://example.com/360/rossa-ph' },
        { id:'M-ROS-5', type:'floorplan', label:'Penthouse plan' },
        { id:'M-ROS-6', type:'brochure', label:'The ROSSA — Brochure.pdf' }
      ],
      construction:[
        { id:'CU-ROS-1', date: ago(120), stage:'Handover', caption:'Project handover complete — residents moving in.', mediaType:'photo' }
      ]
    },
    {
      id:'PRJ-OAS', name:'Salmon Oasis Park', location:'Bashundhara R/A, Block M, Dhaka', status:'published', publishedUtc: ago(12),
      glance:{ buildingType:'Residential Apartment', floors:'B1 + G + 9', unitSqft:'1,350 – 1,800 sqft', bed:3, bath:2, balcony:2, lift:2, landFacing:'North', frontRoad:'25 ft' },
      handover:'Mar 2028', priceFromBdt:11200000,
      units:[
        unit('O-2A',2,'3 Bed',1350,11200000,'North','booked'),
        unit('O-3A',3,'3 Bed',1350,11350000,'North','reserved'),
        unit('O-4B',4,'3 Bed',1550,13100000,'North-West','available'),
        unit('O-5B',5,'3 Bed',1550,13250000,'North-West','available'),
        unit('O-6C',6,'3 Bed',1800,15400000,'West','available'),
        unit('O-704',7,'3 Bed',1800,15600000,'West','available'),
        unit('O-8C',8,'3 Bed',1800,15800000,'West','available')
      ],
      media:[
        { id:'M-OAS-1', type:'photo', label:'Elevation render', hero:true },
        { id:'M-OAS-2', type:'floorplan', label:'Typical plan' },
        { id:'M-OAS-3', type:'brochure', label:'Oasis Park — Brochure v1.pdf' }
      ],
      construction:[
        { id:'CU-OAS-2', date: ago(8),  stage:'3rd floor', caption:'3rd floor slab casting completed.', mediaType:'photo' },
        { id:'CU-OAS-1', date: ago(40), stage:'Foundation', caption:'Piling and foundation raft completed.', mediaType:'video' }
      ]
    },
    {
      id:'PRJ-ZHL', name:'Zheel View', location:'Aftabnagar, Block D, Dhaka', status:'draft', publishedUtc:null,
      glance:{ buildingType:'Lake-facing Apartment', floors:'G + 8', unitSqft:'1,500 – 2,000 sqft', bed:3, bath:3, balcony:2, lift:2, landFacing:'West (lake)', frontRoad:'20 ft' },
      handover:'Dec 2028', priceFromBdt:10500000,
      units:[
        unit('Z-2A',2,'3 Bed',1500,10500000,'West','available'),
        unit('Z-3A',3,'3 Bed',1500,10650000,'West','available'),
        unit('Z-4B',4,'3 Bed',2000,14200000,'West','available')
      ],
      media:[
        { id:'M-ZHL-1', type:'photo', label:'Concept render', hero:true }
      ],
      construction:[]
    }
  ];

  /* ---------------------------------------------------------------------------
   * Override-aware reads (merges Ripples.mutate patches from localStorage).
   *   proj:<id>       → { status, publishedUtc, glance patch, ... }
   *   unit:<pid>:<no> → { status, priceBdt, ... }
   *   Added media / construction rows are appended in override arrays.
   * ------------------------------------------------------------------------- */
  function overrides(){ try { return JSON.parse(localStorage.getItem('crm_people_mut')||'{}'); } catch(e){ return {}; } }

  function mergeProject(p){
    var ov = overrides();
    var patch = ov['proj:'+p.id] || {};
    var m = Object.assign({}, p, patch);
    m.glance = Object.assign({}, p.glance, patch.glance||{});
    // units with per-unit overrides
    m.units = p.units.map(function(u){ var up = ov['unit:'+p.id+':'+u.unitNo] || {}; return Object.assign({}, u, up); });
    // appended media / construction
    m.media = (patch.mediaAdd||[]).concat(p.media.map(function(x){ var xp = ov['media:'+p.id+':'+x.id]||{}; return Object.assign({}, x, xp); }));
    // hero override: only one hero
    if (patch.heroId){ m.media = m.media.map(function(x){ return Object.assign({}, x, { hero: x.id===patch.heroId }); }); }
    m.construction = (patch.constructionAdd||[]).concat(p.construction).sort(function(a,b){ return a.date<b.date?1:-1; });
    return m;
  }

  function allProjects(){ return projects.map(mergeProject); }
  function projectById(id){ var p = projects.filter(function(x){ return x.id===id; })[0]; return p ? mergeProject(p) : null; }
  function unitCounts(p){
    var c = { available:0, reserved:0, booked:0, sold:0, total:p.units.length };
    p.units.forEach(function(u){ if (c[u.status]!=null) c[u.status]++; });
    return c;
  }

  root.CRM = root.CRM || {};
  root.CRM.Catalogue = {
    UNIT_STATUS: ['available','reserved','booked','sold'],
    allProjects: allProjects, projectById: projectById, unitCounts: unitCounts, ago: ago
  };
})(window);
