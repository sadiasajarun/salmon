/* ============================================================================
 * Salmon CRM — Finance Core mock data (Part 5)
 * Adds a `CRM.Finance` island. Client-side money only (partner commission/
 * settlement is Part 6 — the wall stays clean). Reconciliation matches
 * REFERENCES only — this module deliberately holds no card details of any kind.
 * Mutations recorded as localStorage overrides.
 * ==========================================================================*/
(function (root) {
  'use strict';

  function ago(days, h){ h=h||0; var d=new Date('2026-07-15T10:00:00Z'); d.setUTCDate(d.getUTCDate()-days); d.setUTCHours(d.getUTCHours()-h); return d.toISOString(); }
  function fwd(days){ var d=new Date('2026-07-15T10:00:00Z'); d.setUTCDate(d.getUTCDate()+days); return d.toISOString(); }

  /* ---------------------------------------------------------------------------
   * Config (placeholders — real values come from Salmon's finance config).
   * Exchange rates, invoice numbering, tax and legal wording are NOT authored here.
   * ------------------------------------------------------------------------- */
  var CONFIG = {
    rates: { BDT:1, USD:118, AED:32, GBP:150, CAD:86, AUD:78 },   // OPEN_QUESTIONS: rates from config
    invoicePrefix: 'INV-2026-',
    vatLabel: 'VAT (rate from config — placeholder)',
    legalWording: 'Placeholder legal footer — Salmon-approved wording injected from config (OPEN_QUESTIONS #7).'
  };
  function toBdt(amount, cur){ return Math.round(amount * (CONFIG.rates[cur]||1)); }

  /* ---------------------------------------------------------------------------
   * Bookings — the record a payment confirms. Reuses Part-2 clients + Part-3 units.
   * status: pending | confirmed | cancelled
   * ------------------------------------------------------------------------- */
  function inst(no, dueUtc, amountBdt, status, paidUtc){ return { no:no, dueUtc:dueUtc, amountBdt:amountBdt, status:status, paidUtc:paidUtc||null }; }

  var bookings = [
    // Rezaul — the WIRE hero. Overseas (Dubai), wire pending 5 days.
    { id:'BK-2024-01847', clientId:'CL-5001', client:'Rezaul Karim', project:'Salmon Oasis Park', unit:'O-4B',
      totalBdt:13100000, currency:'BDT', method:'wire', status:'pending', tokenBdt:1500000,
      expectedRef:'SALMON-OASIS-1847', createdUtc:ago(6),
      installments:[
        inst(1, ago(6), 1500000, 'due'),          // booking token — awaiting the wire
        inst(2, fwd(24), 3800000, 'upcoming'),
        inst(3, fwd(84), 3800000, 'upcoming'),
        inst(4, fwd(160), 4000000, 'upcoming')
      ] },
    // Selina — the WEBHOOK hero (domestic, SSLCommerz). Token matches → confirm enabled.
    { id:'BK-2024-01860', clientId:'CL-5002', client:'Selina Akter', project:'Salmon Bellissimo', unit:'A-6B',
      totalBdt:16400000, currency:'BDT', method:'gateway', status:'pending', tokenBdt:1500000,
      expectedRef:'sslcz_7f3a91', createdUtc:ago(0,6),
      installments:[
        inst(1, ago(0,6), 1500000, 'due'),
        inst(2, fwd(30), 4966000, 'upcoming'),
        inst(3, fwd(120), 4967000, 'upcoming'),
        inst(4, fwd(210), 4967000, 'upcoming')
      ] },
    // Mahfuz — confirmed booking with a rich ledger (paid + overdue + upcoming) for K01/K02.
    { id:'BK-2024-01839', clientId:'CL-5011', client:'Mahfuz Anam', project:'The ROSSA', unit:'R-5C',
      totalBdt:22300000, currency:'BDT', method:'gateway', status:'confirmed', tokenBdt:2200000,
      expectedRef:'sslcz_5c11', createdUtc:ago(120),
      installments:[
        inst(1, ago(120), 2200000, 'paid', ago(120)),
        inst(2, ago(60), 6700000, 'paid', ago(58)),
        inst(3, ago(5), 6700000, 'overdue'),
        inst(4, fwd(85), 6700000, 'upcoming')
      ] },
    // Tanya — confirmed, fully on-track (from Part-4 conversion).
    { id:'BK-2024-01852', clientId:'CL-5010', client:'Tanya Haque', project:'Salmon Oasis Park', unit:'O-2A',
      totalBdt:11200000, currency:'BDT', method:'gateway', status:'confirmed', tokenBdt:1100000,
      expectedRef:'sslcz_2a52', createdUtc:ago(40),
      installments:[
        inst(1, ago(40), 1100000, 'paid', ago(40)),
        inst(2, fwd(20), 5050000, 'upcoming'),
        inst(3, fwd(110), 5050000, 'upcoming')
      ] }
  ];

  /* ---------------------------------------------------------------------------
   * Signed gateway webhooks (I01/I02). Reconciliation matches REFERENCE, amount,
   * currency + signature — never card data. Each row carries enough to compute
   * the match verdict on I02.
   * ------------------------------------------------------------------------- */
  var webhooks = [
    // clean match → confirm enabled (booking BK-2024-01860 is pending)
    { id:'WH-90271', gateway:'SSLCommerz', ref:'sslcz_7f3a91', amount:1500000, currency:'BDT', receivedUtc:ago(0,5), signatureValid:true, matchedBookingId:'BK-2024-01860' },
    // amount mismatch → confirm disabled ("amount mismatch") — sig/ref ok, amount ≠ token
    { id:'WH-90266', gateway:'SSLCommerz', ref:'sslcz_7f3a91', amount:1400000, currency:'BDT', receivedUtc:ago(1,2), signatureValid:true, matchedBookingId:'BK-2024-01860' },
    // currency mismatch → disabled ("currency mismatch") — sig/ref/amount ok, currency ≠
    { id:'WH-90265', gateway:'SSLCommerz', ref:'sslcz_7f3a91', amount:1500000, currency:'AED', receivedUtc:ago(1,8), signatureValid:true, matchedBookingId:'BK-2024-01860' },
    // invalid signature → disabled ("signature invalid")
    { id:'WH-90260', gateway:'SSLCommerz', ref:'sslcz_7f3a91', amount:1500000, currency:'BDT', receivedUtc:ago(2), signatureValid:false, matchedBookingId:'BK-2024-01860' },
    // unmatched — reference resolves to no booking (I04 anomaly)
    { id:'WH-90268', gateway:'SSLCommerz', ref:'sslcz_7f2b04', amount:750000, currency:'BDT', receivedUtc:ago(0,10), signatureValid:true, matchedBookingId:null }
  ];

  /* ---------------------------------------------------------------------------
   * International wires (J01/J02) — client-submitted, awaiting Finance to check
   * the bank statement. Age is prominent (a wire pending 5 days = nervous buyer).
   * ------------------------------------------------------------------------- */
  var wires = [
    { id:'WR-2205', clientId:'CL-5001', client:'Rezaul Karim', bookingId:'BK-2024-01847', project:'Salmon Oasis Park',
      amountOrig:12712, currency:'USD', quotedRef:'SALMON-OASIS-1847', initiatedUtc:ago(5), status:'pending', mobileId:'rezaul' },
    { id:'WR-2203', clientId:'CL-5003', client:'Ayesha Rahman', bookingId:null, project:'The ROSSA',
      amountOrig:38000, currency:'CAD', quotedRef:'SALMON-ROSSA-2203', initiatedUtc:ago(2), status:'pending', mobileId:'ayesha' },
    { id:'WR-2199', clientId:'CL-5006', client:'Imran Chowdhury', bookingId:null, project:'The ROSSA',
      amountOrig:40000, currency:'AUD', quotedRef:'SALMON-ROSSA-2199', initiatedUtc:ago(9), status:'verified', verifiedUtc:ago(8), mobileId:'imran' }
  ];

  /* ---------------------------------------------------------------------------
   * Offline / partner-submitted booking payments (J03).
   * ------------------------------------------------------------------------- */
  var offlinePayments = [
    { id:'OP-511', partner:'Shahin Alam', buyer:'Abdul Karim', project:'Salmon Bellissimo', bookingId:null, amountBdt:500000, method:'Bank deposit slip', submittedUtc:ago(1), status:'pending' },
    { id:'OP-509', partner:'Rokeya Sultana', buyer:'Nadia Islam', project:'Salmon Oasis Park', bookingId:null, amountBdt:300000, method:'bKash', submittedUtc:ago(2), status:'pending' }
  ];

  /* ---------------------------------------------------------------------------
   * Invoices (K04) — server-generated PDFs (mocked as records).
   * ------------------------------------------------------------------------- */
  var invoices = [
    { id:'INV-2026-0203', clientId:'CL-5011', client:'Mahfuz Anam', project:'The ROSSA', bookingId:'BK-2024-01839', amountBdt:2200000, issuedUtc:ago(120), type:'Booking token' },
    { id:'INV-2026-0204', clientId:'CL-5011', client:'Mahfuz Anam', project:'The ROSSA', bookingId:'BK-2024-01839', amountBdt:6700000, issuedUtc:ago(58), type:'Installment 2' },
    { id:'INV-2026-0210', clientId:'CL-5010', client:'Tanya Haque', project:'Salmon Oasis Park', bookingId:'BK-2024-01852', amountBdt:1100000, issuedUtc:ago(40), type:'Booking token' }
  ];

  /* ---------------------------------------------------------------------------
   * Override-aware reads.
   *   booking:<id> → { status }
   *   wh:<id>      → { status:'confirmed'|'resolved', matchedBookingId }
   *   wire:<id>    → { status:'verified'|'rejected'|'held', reason, evidence }
   *   off:<id>     → { status }
   *   inst:<bid>:<no> → { status, paidUtc }
   *   invoiceAdd / refundAdd / reminderLog → appended arrays
   * ------------------------------------------------------------------------- */
  function overrides(){ try { return JSON.parse(localStorage.getItem('crm_people_mut')||'{}'); } catch(e){ return {}; } }

  function mergeBooking(b){
    var ov = overrides(); var m = Object.assign({}, b, ov['booking:'+b.id]||{});
    m.installments = b.installments.map(function(i){ return Object.assign({}, i, ov['inst:'+b.id+':'+i.no]||{}); });
    return m;
  }
  function allBookings(){ return bookings.map(mergeBooking); }
  function bookingById(id){ var b=bookings.filter(function(x){return x.id===id;})[0]; return b?mergeBooking(b):null; }

  function allWebhooks(){ var ov=overrides(); return webhooks.map(function(w){ return Object.assign({}, w, ov['wh:'+w.id]||{}); }); }
  function webhookById(id){ var w=webhooks.filter(function(x){return x.id===id;})[0]; if(!w)return null; var ov=overrides(); return Object.assign({}, w, ov['wh:'+id]||{}); }
  function webhookQueue(){ return allWebhooks().filter(function(w){ return w.status!=='confirmed' && w.status!=='resolved' && w.matchedBookingId; }); }
  function unmatchedWebhooks(){ return allWebhooks().filter(function(w){ return !w.matchedBookingId && w.status!=='resolved'; }); }

  function allWires(){ var ov=overrides(); return wires.map(function(w){ return Object.assign({}, w, ov['wire:'+w.id]||{}); }); }
  function wireById(id){ var w=wires.filter(function(x){return x.id===id;})[0]; if(!w)return null; var ov=overrides(); return Object.assign({}, w, ov['wire:'+id]||{}); }
  function wireQueue(){ return allWires().filter(function(w){ return w.status==='pending' || w.status==='held'; }); }

  function allOffline(){ var ov=overrides(); return offlinePayments.map(function(o){ return Object.assign({}, o, ov['off:'+o.id]||{}); }); }
  function offlineById(id){ var o=offlinePayments.filter(function(x){return x.id===id;})[0]; if(!o)return null; var ov=overrides(); return Object.assign({}, o, ov['off:'+id]||{}); }

  function allInvoices(){ var ov=overrides(); return (ov['invoiceAdd']||[]).concat(invoices); }
  function refunds(){ return overrides()['refundAdd']||[]; }
  function reminders(){ return overrides()['reminderLog']||[]; }

  /* ---- compute a customer ledger (K01) — pending NEVER folded into paid ---- */
  function ledgerFor(clientId){
    var bs = allBookings().filter(function(b){ return b.clientId===clientId; });
    var total=0, paid=0, pending=0, overdue=0, nextDue=null;
    var pendingWire = allWires().filter(function(w){ return w.clientId===clientId && (w.status==='pending'||w.status==='held'); })
      .reduce(function(a,w){ return a + toBdt(w.amountOrig, w.currency); }, 0);
    bs.forEach(function(b){
      total += b.totalBdt;
      b.installments.forEach(function(i){
        if (i.status==='paid') paid += i.amountBdt;
        else if (i.status==='overdue') overdue += i.amountBdt;
        if ((i.status==='due'||i.status==='upcoming'||i.status==='overdue') && (!nextDue || i.dueUtc<nextDue.dueUtc)) nextDue=i;
      });
    });
    pending = pendingWire; // unverified money — shown separately, never counted as paid
    return { bookings:bs, totalPrice:total, verifiedPaid:paid, pendingVerification:pending, outstanding:Math.max(0,total-paid), overdue:overdue, nextDue:nextDue };
  }

  root.CRM = root.CRM || {};
  root.CRM.Finance = {
    CONFIG: CONFIG, toBdt: toBdt,
    allBookings: allBookings, bookingById: bookingById,
    allWebhooks: allWebhooks, webhookById: webhookById, webhookQueue: webhookQueue, unmatchedWebhooks: unmatchedWebhooks,
    allWires: allWires, wireById: wireById, wireQueue: wireQueue,
    allOffline: allOffline, offlineById: offlineById,
    allInvoices: allInvoices, refunds: refunds, reminders: reminders,
    ledgerFor: ledgerFor, ago: ago, fwd: fwd
  };
})(window);
