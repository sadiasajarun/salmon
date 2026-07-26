/* ============================================================================
 * Salmon CRM — Ripples (Part 2)
 * ----------------------------------------------------------------------------
 * Every high-consequence People action ripples to a phone somewhere. This module
 * is the causal link the operator should *feel*:
 *   1. mutate()  — records the decision as a localStorage override (people-data.js
 *                  merges it on read, so the next screen shows the new state).
 *   2. emit()    — writes the mobile-side effect (Shahin's status flips pending→
 *                  approved, Rezaul's KYC flips pending→verified) and logs it.
 *   3. console   — a floating "Mobile ripples" panel (the dev-toolbar mock console)
 *                  renders the feed + a phone preview, so we can PROVE the ripple.
 *
 * Rejection reasons are WRITE-ONCE: the operator types once, the client app shows
 * verbatim. Because the client app is Bengali-first (OPEN_QUESTIONS #8 / Part-1),
 * the preview has an EN / বাংলা toggle — the reason string is the operator's exact
 * words; the surrounding screen chrome is bilingual.
 * ==========================================================================*/
(function (root) {
  'use strict';
  var Audit = root.Audit;

  var MUT_KEY = 'crm_people_mut';     // entity overrides
  var RIP_KEY = 'crm_ripples';        // ripple feed (newest first)
  var MOB_KEY = 'crm_mobile';         // mobile-side status store keyed by mobileId

  function read(k){ try { return JSON.parse(localStorage.getItem(k)) || {}; } catch(e){ return {}; } }
  function readArr(k){ try { return JSON.parse(localStorage.getItem(k)) || []; } catch(e){ return []; } }
  function write(k,v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }

  /* ---- record a data mutation as an override ---- */
  function mutate(key, patch){
    var ov = read(MUT_KEY);
    ov[key] = Object.assign({}, ov[key] || {}, patch);
    write(MUT_KEY, ov);
  }

  /* ---- mobile-side screen labels (what the applicant/client sees) ---- */
  var MOBILE_SCREEN = {
    pending:   { code:'P07', label:'Pending review' },
    approved:  { code:'P10', label:'Welcome — approved' },
    rejected:  { code:'P08', label:'Application declined' },
    suspended: { code:'P09', label:'Account suspended' },
    kycPending:  { code:'KYC', label:'KYC under review' },
    kycVerified: { code:'KYC', label:'KYC verified' },
    kycRejected: { code:'KYC', label:'KYC declined' }
  };

  /* ---- emit a ripple: update mobile store + feed, log, notify ---- */
  function emit(r){
    // r: { mobileId, kind:'partner'|'client', status, screen, headline, reason, partnerId }
    if (r.mobileId){
      var mob = read(MOB_KEY);
      mob[r.mobileId] = Object.assign({}, mob[r.mobileId] || {}, {
        kind: r.kind, status: r.status, screen: r.screen, reason: r.reason || null,
        partnerId: r.partnerId || (mob[r.mobileId]||{}).partnerId || null,
        name: r.name || (mob[r.mobileId]||{}).name || r.mobileId, t: nowIso()
      });
      write(MOB_KEY, mob);
    }
    var feed = readArr(RIP_KEY);
    feed.unshift({ t: nowIso(), headline: r.headline, screen: r.screen, mobileId: r.mobileId || null, reason: r.reason || null });
    write(RIP_KEY, feed.slice(0, 40));
    // visible proof in the JS console
    console.log('%c[RIPPLE]', 'color:#800020;font-weight:800', r.headline, '→', (r.screen||''), r);
    document.dispatchEvent(new CustomEvent('ripple', { detail: r }));
    // if the console panel is open, refresh it
    if (document.getElementById('ripplepanel')) renderConsole(true);
  }

  function nowIso(){ return root.CRM_NOW || new Date().toISOString(); }
  function feed(){ return readArr(RIP_KEY); }
  function mobileState(id){ return read(MOB_KEY)[id] || null; }

  function reset(){ write(MUT_KEY, {}); write(RIP_KEY, []); write(MOB_KEY, {}); if (document.getElementById('ripplepanel')) renderConsole(true); }

  /* ---- Bengali chrome for the phone preview (proves reasons read in বাংলা) ---- */
  var BN = {
    approved:  { title:'অভিনন্দন! আপনি অনুমোদিত', body:'আপনার পার্টনার আইডি:' },
    rejected:  { title:'আবেদন গৃহীত হয়নি', body:'কারণ:' },
    suspended: { title:'অ্যাকাউন্ট স্থগিত', body:'কারণ:' },
    kycVerified:{ title:'কেওয়াইসি যাচাই সম্পন্ন', body:'আপনি এখন লেনদেন করতে পারবেন।' },
    kycRejected:{ title:'কেওয়াইসি গৃহীত হয়নি', body:'কারণ:' },
    kycPending:{ title:'কেওয়াইসি পর্যালোচনাধীন', body:'আমরা আপনার নথি পর্যালোচনা করছি।' }
  };
  var EN = {
    approved:  { title:'Congratulations — you’re approved', body:'Your Partner ID:' },
    rejected:  { title:'Application not accepted', body:'Reason:' },
    suspended: { title:'Account suspended', body:'Reason:' },
    kycVerified:{ title:'KYC verified', body:'You can now transact.' },
    kycRejected:{ title:'KYC not accepted', body:'Reason:' },
    kycPending:{ title:'KYC under review', body:'We’re reviewing your document.' }
  };

  /* ---- floating mock console (dev toolbar companion) ---- */
  var lang = 'en';
  function statusKey(m){
    if (m.kind === 'client'){ return m.status === 'verified' ? 'kycVerified' : m.status === 'rejected' ? 'kycRejected' : 'kycPending'; }
    return m.status; // approved | rejected | suspended | pending
  }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }

  function phoneCard(id){
    var m = mobileState(id); if (!m) return '';
    var k = statusKey(m);
    var t = (lang === 'bn' ? BN : EN)[k] || { title:m.status, body:'' };
    var dot = m.kind==='client'
      ? (m.status==='verified'?'green':m.status==='rejected'?'red':'amber')
      : (m.status==='approved'?'green':m.status==='rejected'?'red':m.status==='suspended'?'red':'amber');
    var scr = MOBILE_SCREEN[m.kind==='client' ? (m.status==='verified'?'kycVerified':m.status==='rejected'?'kycRejected':'kycPending') : m.status] || {};
    var body = '';
    if (k === 'approved') body = '<div class="pv-body">'+esc(t.body)+' <b>'+esc(m.partnerId||'—')+'</b></div>';
    else if (m.reason)    body = '<div class="pv-body">'+esc(t.body)+'<div class="pv-reason">'+esc(m.reason)+'</div></div>';
    else                  body = '<div class="pv-body">'+esc(t.body)+'</div>';
    return '<div class="phoneprev">'+
      '<div class="pv-top"><span class="pv-scr">'+esc(scr.code||'')+'</span><span class="pv-nm">'+esc(m.name||id)+'</span><span class="chip '+dot+'"><span class="d"></span>'+esc(m.status)+'</span></div>'+
      '<div class="pv-title">'+esc(t.title)+'</div>'+ body +
    '</div>';
  }

  function renderConsole(refreshOnly){
    var panel = document.getElementById('ripplepanel');
    if (!panel && refreshOnly) return;
    if (!panel){
      panel = document.createElement('div');
      panel.id = 'ripplepanel';
      panel.className = 'ripplepanel';
      document.body.appendChild(panel);
    }
    var f = feed();
    var mob = read(MOB_KEY);
    var previewIds = Object.keys(mob).slice(0, 4);
    panel.innerHTML =
      '<div class="rp-head"><span class="rp-dl">Mock console</span><b>Mobile-side ripples</b>'+
        '<span class="rp-lang"><button data-lang="en" class="'+(lang==='en'?'on':'')+'">EN</button><button data-lang="bn" class="'+(lang==='bn'?'on':'')+'">বাংলা</button></span>'+
        '<button class="rp-x" data-close>✕</button></div>'+
      '<div class="rp-body">'+
        (previewIds.length ? '<div class="rp-sec">Phone preview</div>'+previewIds.map(phoneCard).join('') : '')+
        '<div class="rp-sec">Ripple feed</div>'+
        (f.length ? f.map(function(r){
          return '<div class="rp-row"><span class="rp-t">'+esc(root.C ? root.C.fmt.ago(r.t) : r.t)+'</span><div class="rp-tx">'+esc(r.headline)+
            (r.screen?' <span class="rp-scr">'+esc(r.screen)+'</span>':'')+
            (r.reason?'<div class="rp-reason">“'+esc(r.reason)+'”</div>':'')+'</div></div>';
        }).join('') : '<div class="rp-empty">No ripples yet. Approve a partner or verify a KYC to light up a phone.</div>')+
      '</div>'+
      '<div class="rp-foot"><button class="rp-reset" data-reset>Reset mock data</button></div>';
    panel.querySelectorAll('[data-lang]').forEach(function(b){ b.onclick = function(){ lang = b.getAttribute('data-lang'); renderConsole(true); }; });
    panel.querySelector('[data-close]').onclick = function(){ panel.classList.remove('open'); };
    panel.querySelector('[data-reset]').onclick = function(){ reset(); if (root.People && root.People.rerender) root.People.rerender(); };
    panel.classList.add('open');
  }

  function toggleConsole(){
    var panel = document.getElementById('ripplepanel');
    if (panel && panel.classList.contains('open')) { panel.classList.remove('open'); return; }
    renderConsole();
  }

  root.Ripples = {
    mutate: mutate, emit: emit, feed: feed, mobileState: mobileState, reset: reset,
    renderConsole: renderConsole, toggleConsole: toggleConsole, MOBILE_SCREEN: MOBILE_SCREEN
  };
})(window);
