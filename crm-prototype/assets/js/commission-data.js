/* ============================================================================
 * Salmon CRM — Commission & Settlement mock data (Part 6)
 * Adds a `CRM.Payout` island — the PARTNER payout desk (client-side money is
 * Part 5; the wall stays clean). Two rules baked into the shape:
 *   - there is NO bank field anywhere — the panel holds no partner payment
 *     destinations of any kind. Salmon's external finance process holds those
 *     details and moves the money; this panel only records decisions.
 *   - commission amounts are entered BY HAND — there is no rate table or formula
 *     in this data. `amountBdt` is null until a human types it on L02.
 * Live commission records created by Part-4 F04 (comm:<id> overrides) are merged.
 * ==========================================================================*/
(function (root) {
  'use strict';

  function ago(days, h){ h=h||0; var d=new Date('2026-07-15T10:00:00Z'); d.setUTCDate(d.getUTCDate()-days); d.setUTCHours(d.getUTCHours()-h); return d.toISOString(); }

  /* ---------------------------------------------------------------------------
   * Seed commission records. Pending ones mimic Part-4 F04 output (amount null);
   * approved/settled ones give the ledger + balances history.
   * Each traces loosely back to a client booking (the Part-5 connection).
   * ------------------------------------------------------------------------- */
  function CM(o){ o.status=o.status||'pending'; if(o.amountBdt===undefined)o.amountBdt=null; return o; }
  var commissions = [
    // pending — created by Sales verifying a conversion (Part 4). Amount not yet entered.
    CM({ id:'CM-2026-0701', partner:'Shahin Alam',    partnerId:'SDP-CUM-00417', program:'Zero Investment', buyer:'Tanya Haque',  project:'Salmon Oasis Park', unit:'O-2A', leadId:'LD-3018', bookingId:'BK-2024-01852', createdBy:'Tanvir Hasan', createdUtc:ago(2), mobileId:'shahin' }),
    CM({ id:'CM-2026-0702', partner:'Rokeya Sultana', partnerId:'SDP-SAV-00231', program:'With Investment', buyer:'Nadia Islam',  project:'Salmon Oasis Park', unit:'O-4B', leadId:'LD-3067', bookingId:null, createdBy:'Tanvir Hasan', createdUtc:ago(1) }),
    CM({ id:'CM-2026-0703', partner:'Rafiqul Islam',  partnerId:'SDP-CUM-00405', program:'Zero Investment', buyer:'Kamrul Islam', project:'Salmon Bellissimo', unit:'A-5B', leadId:'LD-3061', bookingId:null, createdBy:'Rahima Chowdhury', createdUtc:ago(3) }),

    // approved — real money on the partner side (unsettled → counts toward balance)
    CM({ id:'CM-2026-0680', partner:'Shahin Alam',    partnerId:'SDP-CUM-00417', program:'Zero Investment', buyer:'Rahim Uddin', project:'The ROSSA',         unit:'R-14B', leadId:'LD-3041', status:'approved', amountBdt:92000, approvedBy:'Fatima Ahmed', approvedUtc:ago(8), note:'Standard tier.', mobileId:'shahin' }),
    CM({ id:'CM-2026-0675', partner:'Shahin Alam',    partnerId:'SDP-CUM-00417', program:'Zero Investment', buyer:'Abdul Karim', project:'Salmon Bellissimo', unit:'A-7C', leadId:'LD-3048', status:'approved', amountBdt:92000, approvedBy:'Fatima Ahmed', approvedUtc:ago(20), note:'', mobileId:'shahin' }),
    CM({ id:'CM-2026-0670', partner:'Rokeya Sultana', partnerId:'SDP-SAV-00231', program:'With Investment', buyer:'Selina Akter', project:'Salmon Oasis Park', unit:'O-6C', leadId:'LD-3052', status:'approved', amountBdt:45000, approvedBy:'Fatima Ahmed', approvedUtc:ago(6) }),
    CM({ id:'CM-2026-0661', partner:'Jahangir Alam',  partnerId:'SDP-CUM-00460', program:'With Investment', buyer:'Momena Begum', project:'Zheel View', unit:null, leadId:'LD-3045', status:'approved', amountBdt:130000, approvedBy:'Fatima Ahmed', approvedUtc:ago(15) }),
    CM({ id:'CM-2026-0660', partner:'Jahangir Alam',  partnerId:'SDP-CUM-00460', program:'With Investment', buyer:'—', project:'Salmon Bellissimo', unit:null, leadId:'LD-3020', status:'approved', amountBdt:130000, approvedBy:'Fatima Ahmed', approvedUtc:ago(30) }),
    CM({ id:'CM-2026-0655', partner:'Shirin Akter',   partnerId:'SDP-SYL-00099', program:'With Investment', buyer:'Imran Chowdhury', project:'The ROSSA', unit:'R-4C', leadId:'LD-3072', status:'approved', amountBdt:158000, approvedBy:'Fatima Ahmed', approvedUtc:ago(12) }),

    // settled — history (already paid externally, recorded here)
    CM({ id:'CM-2026-0650', partner:'Delwar Hossain', partnerId:'SDP-CUM-00495', program:'With Investment', buyer:'—', project:'Salmon Bellissimo', unit:null, leadId:'LD-3009', status:'settled', amountBdt:120000, approvedBy:'Fatima Ahmed', approvedUtc:ago(50), settledUtc:ago(40) })
  ];

  /* ---------------------------------------------------------------------------
   * Settlement requests — partners asking Finance to pay out their APPROVED
   * balance. Note: there is deliberately NO bank field on these records.
   * status: submitted | approved | held | rejected | settled
   * ------------------------------------------------------------------------- */
  var settlements = [
    { id:'ST-2026-106', partner:'Shahin Alam',    partnerId:'SDP-CUM-00417', amountBdt:78000,  approvedBalanceAtRequest:184000, requestedUtc:ago(0,8), status:'submitted', mobileId:'shahin' },
    { id:'ST-2026-104', partner:'Rokeya Sultana', partnerId:'SDP-SAV-00231', amountBdt:45000,  approvedBalanceAtRequest:45000,  requestedUtc:ago(1),   status:'submitted' },
    { id:'ST-2026-101', partner:'Jahangir Alam',  partnerId:'SDP-CUM-00460', amountBdt:130000, approvedBalanceAtRequest:260000, requestedUtc:ago(2),   status:'held', reason:'Awaiting confirmation of one underlying booking payment.' },
    { id:'ST-2026-099', partner:'Shirin Akter',   partnerId:'SDP-SYL-00099', amountBdt:36000,  approvedBalanceAtRequest:158000, requestedUtc:ago(3),   status:'submitted' },
    // history
    { id:'ST-2026-097', partner:'Nasir Uddin',    partnerId:'SDP-CUM-00482', amountBdt:55000,  approvedBalanceAtRequest:55000,  requestedUtc:ago(12),  status:'settled', settledUtc:ago(10), channel:'bKash', reference:'MFS-TXN-7741' },
    { id:'ST-2026-095', partner:'Habibur Rahman', partnerId:'SDP-CHAND-00120', amountBdt:41000, approvedBalanceAtRequest:41000, requestedUtc:ago(16),  status:'settled', settledUtc:ago(14), channel:'Bank', reference:'BANK-REF-2231' }
  ];

  /* ---------------------------------------------------------------------------
   * Override-aware reads. Merges live Part-4 records (comm:<id>) + Part-6 edits.
   *   comm:<id> → a commission record (from Part-4 F04, or Part-6 approve/adjust)
   *   stl:<id>  → { status, reason, channel, reference, settledUtc, evidence }
   * ------------------------------------------------------------------------- */
  function overrides(){ try { return JSON.parse(localStorage.getItem('crm_people_mut')||'{}'); } catch(e){ return {}; } }

  function allCommissions(){
    var ov = overrides();
    // seed records, with any per-record override merged
    var seeded = commissions.map(function(c){ return Object.assign({}, c, ov['comm:'+c.id]||{}); });
    var seenIds = {}; seeded.forEach(function(c){ seenIds[c.id]=true; });
    // live records created by Part-4 F04 (comm:<id> keys not in the seed)
    var live = [];
    Object.keys(ov).forEach(function(k){ if (k.indexOf('comm:')===0){ var id=k.slice(5); if(!seenIds[id]){ var r=ov[k]; if(r&&r.id) live.push(r); } } });
    return live.concat(seeded);
  }
  function commissionById(id){ return allCommissions().filter(function(c){ return c.id===id; })[0]; }
  function commissionQueue(){ return allCommissions().filter(function(c){ return c.status==='pending'; }); }
  function commissionsForPartner(pid){ return allCommissions().filter(function(c){ return c.partnerId===pid; }); }

  function allSettlements(){ var ov=overrides(); return settlements.map(function(s){ return Object.assign({}, s, ov['stl:'+s.id]||{}); }); }
  function settlementById(id){ var s=settlements.filter(function(x){return x.id===id;})[0]; if(!s)return null; var ov=overrides(); return Object.assign({}, s, ov['stl:'+id]||{}); }
  function activeSettlements(){ return allSettlements().filter(function(s){ return s.status==='submitted' || s.status==='held' || s.status==='approved'; }); }
  function settledHistory(){ return allSettlements().filter(function(s){ return s.status==='settled' || s.status==='rejected'; }); }

  // approved (unsettled) balance a partner can draw on: sum(approved amounts) − sum(settled settlements)
  function approvedBalance(pid){
    var approved = allCommissions().filter(function(c){ return c.partnerId===pid && c.status==='approved'; }).reduce(function(a,c){ return a + (c.amountBdt||0); }, 0);
    var settled = allSettlements().filter(function(s){ return s.partnerId===pid && s.status==='settled'; }).reduce(function(a,s){ return a + s.amountBdt; }, 0);
    return Math.max(0, approved - settled);
  }

  // partner name→id helper + list of partners with any payout activity
  function partnersWithActivity(){
    var map = {};
    allCommissions().forEach(function(c){ map[c.partnerId] = c.partner; });
    return Object.keys(map).map(function(id){ return { id:id, name:map[id] }; });
  }

  root.CRM = root.CRM || {};
  root.CRM.Payout = {
    CHANNELS: ['Cash','Bank','bKash','Nagad','Cheque','Other'],   // OPEN_QUESTIONS #8 — list to confirm
    allCommissions: allCommissions, commissionById: commissionById, commissionQueue: commissionQueue, commissionsForPartner: commissionsForPartner,
    allSettlements: allSettlements, settlementById: settlementById, activeSettlements: activeSettlements, settledHistory: settledHistory,
    approvedBalance: approvedBalance, partnersWithActivity: partnersWithActivity, ago: ago
  };
})(window);
