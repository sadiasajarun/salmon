/* ============================================================================
 * Salmon Live Demo — Client mobile app.
 * Vanilla JS. One state object, re-render on change. Subscribes to SSE so the
 * admin's actions ripple back to the phone with no tap and no refresh.
 * ==========================================================================*/
(function () {
  'use strict';

  var E = Salmon.esc, BDT = Salmon.bdt, BDTS = Salmon.bdtShort;
  var view = document.getElementById('view');

  var DB = null;         // full server state
  var CFG = null;        // config
  var me = null;         // current client
  var nav = { screen: 'welcome', params: {} };
  var pending = null;    // { kind:'booking'|'installment', id }
  var lockTimer = null;

  // ---- icons --------------------------------------------------------------
  var I = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 18l-6-6 6-6"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9.5 12 3l9 6.5V21H3z"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M20 6 9 17l-5-5"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 4 5v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5z"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 15V3M7 8l5-5 5 5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
    receipt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 2v20l3-2 3 2 2-2 2 2 3-2 3 2V2l-3 2-3-2-2 2-2-2-3 2z"/><path d="M8 8h8M8 12h8"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    bed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 14h18M7 10V8a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/></svg>'
  };

  // ---- boot ---------------------------------------------------------------
  Salmon.toast.mount(document.getElementById('toastHost'));

  function refresh() {
    return Promise.all([Salmon.state(), Salmon.config()]).then(function (r) {
      DB = r[0]; CFG = r[1];
      me = DB.session.clientId ? DB.clients.find(function (c) { return c.id === DB.session.clientId; }) : null;
      return DB;
    });
  }

  refresh().then(function () {
    if (me) nav = { screen: 'home', params: {} };
    render();
    Salmon.connect();
  });

  // ---- live wire ----------------------------------------------------------
  Salmon.on('kyc.verified', function (m) {
    refresh().then(function () {
      if (me && m.data.clientId === me.id) {
        Salmon.toast.show('Your KYC has been verified', 'You can now book any available unit.');
      }
      rerenderIfRelevant();
    });
  });

  Salmon.on('booking.confirmed', function (m) {
    refresh().then(function () {
      if (me && m.data.booking && m.data.booking.clientId === me.id) {
        Salmon.toast.show('Booking confirmed', m.data.booking.unitNo + ' · ' + m.data.booking.id);
        if (pending && pending.kind === 'booking' && pending.id === m.data.bookingId) {
          pending = null;
          nav = { screen: 'booking-success', params: { bookingId: m.data.bookingId } };
        }
      }
      render();
    });
  });

  Salmon.on('installment.verified', function (m) {
    refresh().then(function () {
      if (me && m.data.clientId === me.id) {
        Salmon.toast.show('Payment successful', 'Your ledger has been updated.');
        if (pending && pending.kind === 'installment' && pending.id === m.data.installmentId) {
          pending = null;
          nav = { screen: 'payment-success', params: { installmentId: m.data.installmentId } };
        }
      }
      render();
    });
  });

  Salmon.on('booking.expired', function (m) {
    refresh().then(function () {
      if (me && m.data.booking && m.data.booking.clientId === me.id) {
        Salmon.toast.show('Booking lock expired', m.data.booking.unitNo + ' was released — not confirmed in time.', { warn: true });
        if (pending && pending.kind === 'booking' && pending.id === m.data.bookingId) {
          pending = null;
          nav = { screen: 'booking-expired', params: { bookingId: m.data.bookingId } };
        }
      }
      render();
    });
  });

  // KYC rejected by Legal — the reason arrives verbatim on the phone
  Salmon.on('kyc.rejected', function (m) {
    refresh().then(function () {
      if (me && m.data.clientId === me.id) {
        Salmon.toast.show('KYC could not be verified', m.data.reason, { warn: true, ttl: 6000 });
      }
      rerenderIfRelevant();
    });
  });
  // consultation confirmed / invoice issued — show up in the notification centre
  Salmon.on('consultation.confirmed', function (m) {
    refresh().then(function () { if (me && m.data.clientId === me.id) Salmon.toast.show('Consultation confirmed', m.data.consultation.slot + ' · link ready.'); rerenderIfRelevant(); });
  });
  Salmon.on('invoice.generated', function (m) {
    refresh().then(function () { if (me && m.data.clientId === me.id) Salmon.toast.show('New invoice available', m.data.invoice.id); rerenderIfRelevant(); });
  });
  // a document published/shared to clients — appears in shared docs / my documents
  function onDocChange(m) {
    refresh().then(function () { if (m.data && m.data.side === 'client') { Salmon.toast.show('New document available', m.data.document ? m.data.document.name : ''); } render(); });
  }
  Salmon.on('doc.published', onDocChange);
  Salmon.on('doc.classified', function (m) { refresh().then(render); });
  Salmon.on('doc.uploaded', function (m) { refresh().then(render); });

  // Req 6.16 — the support channel replies / updates land here live.
  Salmon.on('ticket.replied', function (m) {
    refresh().then(function () { if (me && m.data.clientId === me.id) { var t = m.data.ticket; Salmon.toast.show(t && t.status === 'resolved' ? 'Support resolved your request' : 'Salmon replied', t ? t.subject : ''); } rerenderIfRelevant(); });
  });
  Salmon.on('ticket.updated', function (m) { refresh().then(rerenderIfRelevant); });
  Salmon.on('config.channel', function (m) { refresh().then(rerenderIfRelevant); });

  // construction update published by admin — appears on the client timeline live
  Salmon.on('construction.published', function (m) {
    refresh().then(function () {
      var proj = DB.projects.find(function (p) { return p.id === m.data.projectId; });
      Salmon.toast.show('Construction update', (proj ? proj.name + ' · ' : '') + (m.data.update ? m.data.update.stage : ''));
      if (nav.screen === 'project' && nav.params.id === m.data.projectId) render();
    });
  });

  // any other event → keep data fresh + refresh notification badge
  Salmon.onAny(function (m) {
    if (['kyc.verified', 'kyc.rejected', 'booking.confirmed', 'installment.verified', 'booking.expired', 'construction.published', 'consultation.confirmed', 'invoice.generated', 'doc.published', 'doc.classified', 'doc.uploaded', 'ticket.replied', 'ticket.updated', 'config.channel', 'demo.reset'].indexOf(m.type) >= 0) return;
    refresh().then(rerenderIfRelevant);
  });
  Salmon.on('demo.reset', function () { location.reload(); });

  function rerenderIfRelevant() {
    // re-render list/status screens; never yank the user off a form/checkout
    if (['home', 'profile', 'notifications', 'bookings', 'installments', 'booking-detail', 'support'].indexOf(nav.screen) >= 0) render();
  }

  // clicking a feed row in the shell highlights an element here
  window.addEventListener('message', function (ev) {
    var ref = ev.data && ev.data.salmonHighlight;
    if (!ref) return;
    var el = document.querySelector('[data-ref="' + ref + '"]');
    if (el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  });

  // ---- navigation ---------------------------------------------------------
  function go(screen, params) { nav = { screen: screen, params: params || {} }; window.scrollTo(0, 0); render(); }

  function unreadCount() { return (DB.notifications.client || []).filter(function (n) { return !n.read; }).length; }

  // ---- shared chrome ------------------------------------------------------
  function appbar(title, opts) {
    opts = opts || {};
    var left = opts.back
      ? '<button class="iconbtn" data-act="back">' + I.back + '</button>'
      : '<div style="width:38px"></div>';
    var bell = opts.noBell ? '' :
      '<button class="iconbtn bell" data-act="notifs">' + I.bell +
      (unreadCount() ? '<span class="badge">' + unreadCount() + '</span>' : '') + '</button>';
    return '<div class="appbar">' + left + '<div class="title">' + E(title) + '</div>' + bell + '</div>';
  }

  function tabbar(active) {
    function t(id, label, icon) {
      return '<button class="' + (active === id ? 'on' : '') + '" data-tab="' + id + '">' + icon + '<span>' + label + '</span></button>';
    }
    return '<div class="tabbar">' +
      t('home', 'Home', I.home) + t('projects', 'Projects', I.grid) +
      t('bookings', 'Bookings', I.doc) + t('profile', 'Profile', I.user) +
      '</div>';
  }

  function kycPill(status) {
    var map = {
      not_submitted: ['grey', 'Not submitted'], pending: ['amber', 'Pending review'],
      verified: ['green', 'Verified'], rejected: ['red', 'Rejected']
    };
    var m = map[status] || map.not_submitted;
    return '<span class="pill ' + m[0] + '"><span class="dot"></span>' + m[1] + '</span>';
  }

  function projImg(p) {
    return '<img class="hero-img" src="' + E(p.banner) + '" onerror="this.style.opacity=0" alt="' + E(p.name) + '"/>';
  }

  // ---- property media: gallery + video + 360 tour + floor plan (Req 6.5) ----
  function mediaSection(proj) {
    var imgs = [proj.banner].concat(proj.gallery || []).filter(Boolean);
    var m = proj.media || {};
    var tiles = imgs.map(function (src, i) {
      return '<button class="mtile" data-act="media-img" data-src="' + E(src) + '" data-cap="Photo ' + (i + 1) + ' · ' + E(proj.name) + '">' +
        '<img src="' + E(src) + '" loading="lazy" onerror="this.parentNode.classList.add(\'broken\')" alt=""/></button>';
    }).join('');
    if (m.video) tiles += '<button class="mtile mvid" data-act="media-video" data-src="' + E(m.video.url) + '"' + (m.video.sample ? ' data-sample="1"' : '') + '><span class="mbadge">▶</span><span class="mlabel">Video' + (m.video.sample ? ' · sample' : '') + '</span></button>';
    if (m.tour360) tiles += '<button class="mtile m360" data-act="media-360" data-src="' + E(m.tour360.url) + '"' + (m.tour360.sample ? ' data-sample="1"' : '') + '><span class="mbadge">🧭</span><span class="mlabel">360° tour' + (m.tour360.sample ? ' · sample' : '') + '</span></button>';
    if (m.floorPlan) tiles += '<button class="mtile mfp" data-act="media-floor" data-bed="' + E(g0(proj, 'bed')) + '" data-bath="' + E(g0(proj, 'bath')) + '"><span class="mbadge">▦</span><span class="mlabel">Floor plan</span></button>';
    return '<h2 class="sec">Gallery &amp; tours</h2>' +
      '<div class="mediastrip">' + tiles + '</div>' +
      '<p class="muted mediahint">Photos are project media. Video, 360° tour and floor plan are <b>sample placeholders</b> until Salmon uploads the project’s own.</p>';
  }
  function g0(proj, k) { return (proj.glance && proj.glance[k] != null) ? proj.glance[k] : ''; }

  // Body-level lightbox overlay (survives view re-render — it lives on <body>).
  function closeLightbox() { var o = document.getElementById('lightbox'); if (o) o.remove(); document.removeEventListener('keydown', escClose); }
  function escClose(e) { if (e.key === 'Escape') closeLightbox(); }
  function openLightbox(inner, cap, sample) {
    closeLightbox();
    var o = document.createElement('div');
    o.id = 'lightbox'; o.className = 'lightbox';
    o.innerHTML = '<div class="lbbox">' +
      '<button class="lbx" data-lbclose aria-label="Close">×</button>' +
      (sample ? '<div class="lbsample">SAMPLE / PLACEHOLDER — replace with the project’s own asset</div>' : '') +
      '<div class="lbmedia">' + inner + '</div>' +
      (cap ? '<div class="lbcap">' + cap + '</div>' : '') +
      '</div>';
    o.addEventListener('click', function (e) { if (e.target === o || e.target.hasAttribute('data-lbclose')) closeLightbox(); });
    document.body.appendChild(o);
    document.addEventListener('keydown', escClose);
  }
  // A simple, self-contained schematic floor plan (no network) sized to bed count.
  function floorPlanSvg(bed, bath) {
    bed = parseInt(bed, 10) || 3; bath = parseInt(bath, 10) || 2;
    var rooms = [['Living / Dining', 2], ['Kitchen', 1]];
    for (var i = 1; i <= bed; i++) rooms.push([(i === 1 ? 'Master ' : '') + 'Bed ' + i, i === 1 ? 2 : 1]);
    for (var b = 1; b <= bath; b++) rooms.push(['Bath ' + b, 1]);
    rooms.push(['Balcony', 1]);
    var cols = 4, cw = 150, ch = 96, pad = 10, x = 0, y = 0, cells = '';
    rooms.forEach(function (r) {
      var span = Math.min(r[1], cols);
      if (x + span > cols) { x = 0; y += 1; }
      var px = pad + x * cw, py = pad + y * ch, w = span * cw - 8, h = ch - 8;
      cells += '<rect x="' + px + '" y="' + py + '" width="' + w + '" height="' + h + '" rx="6" fill="#faf6f3" stroke="#c9a89a"/>' +
        '<text x="' + (px + w / 2) + '" y="' + (py + h / 2) + '" text-anchor="middle" dominant-baseline="middle" font-size="13" fill="#7a5a4e" font-family="sans-serif">' + r[0] + '</text>';
      x += span;
    });
    var W = pad * 2 + cols * cw, H = pad * 2 + (y + 1) * ch;
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;background:#fff;border-radius:8px" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="4" y="4" width="' + (W - 8) + '" height="' + (H - 8) + '" fill="none" stroke="#b98c7c" stroke-width="2" rx="8"/>' + cells + '</svg>';
  }

  // ---- render root --------------------------------------------------------
  function render() {
    var s = nav.screen;
    var fn = SCREENS[s] || SCREENS.welcome;
    view.innerHTML = fn(nav.params);
    if (s === 'review') startLockTimer();
    else stopLockTimer();
  }

  // ---- screens ------------------------------------------------------------
  var SCREENS = {};

  SCREENS.welcome = function () {
    return '' +
      '<div class="welcome">' +
        '<div class="wbody">' +
          '<div class="brandwrap"><img class="brandmark" src="/shared/salmon-logo-white.svg" alt="Salmon"/></div>' +
          '<h1>Own a home<br/>with Salmon.</h1>' +
          '<p>Browse verified projects, reserve a unit, and manage every installment — from anywhere in the world.</p>' +
          '<div class="wactions">' +
            '<button class="btn" data-act="go-signup">Create account</button>' +
            '<button class="btn line" data-act="go-signin">I already have an account</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  };

  SCREENS.signup = function () {
    return appbar('Create account', { back: true, noBell: true }) +
      '<div class="screen"><div class="pad">' +
        '<div class="field"><label>Full name</label><input id="su-name" placeholder="Rezaul Karim" value="Rezaul Karim"/></div>' +
        '<div class="field"><label>Email</label><input id="su-email" type="email" placeholder="you@email.com" value="rezaul.karim@email.com"/></div>' +
        '<div class="field"><label>Phone</label><input id="su-phone" placeholder="+971 50 000 0000" value="+971 50 214 8890"/></div>' +
        '<div class="field"><label>Country</label>' +
          '<select id="su-country">' +
            '<option>UAE</option><option>Bangladesh</option><option>United Kingdom</option><option>USA</option><option>Qatar</option><option>Saudi Arabia</option>' +
          '</select></div>' +
        '<div class="spacer-24"></div>' +
        '<button class="btn primary" data-act="do-signup">Create account</button>' +
        '<p class="center-note" style="padding:16px 0 0">By continuing you agree to Salmon’s terms &amp; privacy policy.</p>' +
      '</div></div>';
  };

  SCREENS.signin = function () {
    return appbar('Sign in', { back: true, noBell: true }) +
      '<div class="screen"><div class="pad">' +
        '<div class="field"><label>Email</label><input id="si-email" type="email" placeholder="you@email.com" value="ayesha.rahman@gmail.com"/></div>' +
        '<div class="field"><label>Password</label><input id="si-pass" type="password" placeholder="••••" value="demo"/></div>' +
        '<div class="spacer-24"></div>' +
        '<button class="btn primary" data-act="do-signin">Sign in</button>' +
        '<p class="center-note" style="padding:16px 0 0">Demo account pre-filled — Ayesha has a live installment ledger.</p>' +
      '</div></div>';
  };

  SCREENS.home = function () {
    if (!me) return SCREENS.welcome();
    var bookings = myBookings();
    var confirmed = bookings.filter(function (b) { return b.status === 'confirmed'; });
    var nextInst = nextDue();
    return appbar('Hello, ' + firstName(me.name)) +
      '<div class="screen"><div class="pad stack">' +
        // KYC status card
        '<div class="card pad">' +
          '<div class="row between"><h2 class="sec" style="margin:0">Identity (KYC)</h2>' + kycPill(me.kycStatus) + '</div>' +
          (me.kycStatus === 'verified'
            ? '<div class="banner green" style="margin-top:12px">' + I.check + '<div><b>Verified</b>You’re all set to book.</div></div>'
            : me.kycStatus === 'pending'
              ? '<div class="banner amber" style="margin-top:12px">' + I.clock + '<div><b>Under review</b>We’ll notify you the moment it’s verified.</div></div>'
              : me.kycStatus === 'rejected'
                ? '<div class="banner" style="margin-top:12px;background:var(--red-bg);color:var(--red)">' + I.shield + '<div><b>Not verified</b>' + E(me.kycReason || 'Please re-submit your passport.') + '</div></div>' +
                  '<button class="btn primary" style="margin-top:12px" data-act="go-profile">Re-upload passport</button>'
                : '<div class="banner grey" style="margin-top:12px">' + I.shield + '<div><b>Verify your identity</b>Upload your passport to unlock booking.</div></div>' +
                  '<button class="btn primary" style="margin-top:12px" data-act="go-profile">Upload passport</button>') +
        '</div>' +
        // bookings summary
        '<div class="card pad">' +
          '<h2 class="sec" style="margin:0 0 10px">My bookings</h2>' +
          (confirmed.length
            ? confirmed.map(function (b) {
                return '<div class="row between" data-act="booking-detail" data-id="' + b.id + '" data-ref="' + b.id + '" style="padding:8px 0;cursor:pointer">' +
                  '<div><div style="font-weight:700">' + E(b.projectName) + ' · ' + E(b.unitNo) + '</div>' +
                  '<div class="muted" style="font-size:12.5px">' + E(b.id) + '</div></div>' +
                  '<span class="pill green"><span class="dot"></span>Booked</span></div>';
              }).join('')
            : '<div class="muted" style="font-size:13.5px">No confirmed bookings yet. Browse projects to reserve a unit.</div>') +
        '</div>' +
        // next installment
        (nextInst ? '<div class="card pad" data-act="go-installments" style="cursor:pointer">' +
          '<h2 class="sec" style="margin:0 0 10px">Next installment</h2>' +
          '<div class="row between"><div><div style="font-weight:800;font-size:20px">' + BDT(nextInst.amountBdt) + '</div>' +
          '<div class="muted" style="font-size:12.5px">' + E(nextInst.label) + ' · due ' + dueLabel(nextInst.dueDate) + '</div></div>' +
          '<button class="btn sm primary">Pay now</button></div></div>' : '') +
        '<button class="btn" data-act="go-projects">Browse projects</button>' +
      '</div></div>' + tabbar('home');
  };

  // ---- discover: filters + Map/List toggle (interactive per-project map) ---
  var projView = 'list'; // 'list' | 'map'
  var projFilters = { category: '', location: '', status: '', avail: '' };
  function cityOf(loc) { var parts = String(loc || '').split(','); return parts[parts.length - 1].trim() || (loc || ''); }
  function uniqv(arr) { return arr.filter(function (v, i) { return v && arr.indexOf(v) === i; }); }
  function projOpts(vals, sel) { return '<option value="">All</option>' + vals.map(function (v) { return '<option value="' + E(v) + '"' + (v === sel ? ' selected' : '') + '>' + E(v) + '</option>'; }).join(''); }
  function projMapC(shown) {
    if (!shown.length) return '<div class="center-note">No projects match these filters.</div>';
    var pins = shown.map(function (p, i) {
      var top = 12 + ((i * 41 + 7) % 64), left = 7 + ((i * 57 + 11) % 66);
      return '<button class="mappin" data-act="project" data-id="' + p.id + '" style="top:' + top + '%;left:' + left + '%" title="' + E(p.name) + ' · ' + E(p.location) + '">' +
        '<span class="mp-dot ' + (p.status || 'upcoming') + '"></span>' + E(p.name) + '</button>';
    }).join('');
    return '<div class="pmap">' + pins + '<div class="pmap-note">Tap a project pin to open it</div></div>' +
      '<div class="mlegend"><span><i class="ld ongoing"></i>Ongoing</span><span><i class="ld completed"></i>Completed</span><span><i class="ld upcoming"></i>Upcoming</span></div>';
  }
  SCREENS.projects = function () {
    var live = (DB.projects || []).filter(function (p) { return p.published !== false; });
    var cats = uniqv(live.map(function (p) { return p.category || 'Apartment / Flat'; }));
    var cities = uniqv(live.map(function (p) { return cityOf(p.location); }));
    var shown = live.filter(function (p) {
      var avail = (p.units || []).filter(function (u) { return u.status === 'available'; }).length;
      if (projFilters.category && (p.category || 'Apartment / Flat') !== projFilters.category) return false;
      if (projFilters.location && cityOf(p.location) !== projFilters.location) return false;
      if (projFilters.status && p.status !== projFilters.status) return false;
      if (projFilters.avail === 'yes' && avail === 0) return false;
      return true;
    });
    var statusLabel = { ongoing: 'Under construction', completed: 'Ready / Handed over', upcoming: 'Upcoming' };
    var statusOpts = '<option value="">Any status</option>' + ['ongoing', 'completed', 'upcoming'].map(function (s) { return '<option value="' + s + '"' + (s === projFilters.status ? ' selected' : '') + '>' + statusLabel[s] + '</option>'; }).join('');
    var filters = '<div class="projfilters">' +
      '<select data-projfilter="category">' + projOpts(cats, projFilters.category) + '</select>' +
      '<select data-projfilter="location">' + projOpts(cities, projFilters.location) + '</select>' +
      '<select data-projfilter="status">' + statusOpts + '</select>' +
      '<select data-projfilter="avail"><option value="">Any availability</option><option value="yes"' + (projFilters.avail === 'yes' ? ' selected' : '') + '>Has available units</option></select>' +
      '</div>';
    var toggle = '<div class="projview-toggle">' +
      '<button data-act="projview" data-view="map" class="' + (projView === 'map' ? 'on' : '') + '">' + I.grid + ' Map</button>' +
      '<button data-act="projview" data-view="list" class="' + (projView === 'list' ? 'on' : '') + '">' + I.doc + ' List</button>' +
      '</div>';
    var listBody = shown.length ? shown.map(function (p) {
      var avail = p.units.filter(function (u) { return u.status === 'available'; }).length;
      return '<div class="card" data-act="project" data-id="' + p.id + '" style="cursor:pointer;margin-bottom:14px">' +
        projImg(p) +
        '<div class="pad">' +
          '<div class="row between"><div style="font-weight:800;font-size:17px">' + E(p.name) + '</div>' + statusPill(p) + '</div>' +
          '<div class="muted" style="font-size:13px;margin-top:2px">' + E(p.category || 'Apartment / Flat') + ' · ' + E(p.location) + '</div>' +
          '<div class="row between" style="margin-top:12px">' +
            '<div><div class="muted" style="font-size:11px">From</div><div style="font-weight:800">' + BDTS(p.priceFromBdt) + '</div></div>' +
            '<div style="text-align:right"><div class="muted" style="font-size:11px">Available</div><div style="font-weight:800">' + avail + ' units</div></div>' +
          '</div>' +
        '</div></div>';
    }).join('') : '<div class="center-note">No projects match these filters.</div>';
    return appbar('Projects') +
      '<div class="screen"><div class="pad">' +
        '<p class="eyebrow">Salmon Developers</p>' +
        '<div class="row between" style="margin:2px 0 12px"><h1 class="big">Find your unit</h1>' + toggle + '</div>' +
        filters +
        '<div class="muted" style="font-size:12px;margin:2px 0 12px">' + shown.length + ' of ' + live.length + ' project(s)</div>' +
        (projView === 'map' ? projMapC(shown) : listBody) +
      '</div></div>' + tabbar('projects');
  };

  SCREENS.project = function (p) {
    var proj = DB.projects.find(function (x) { return x.id === p.id; });
    if (!proj) return SCREENS.projects();
    var g = proj.glance;
    var units = proj.units;
    return appbar(proj.name, { back: true }) +
      '<div class="screen">' +
        projImg(proj) +
        '<div class="pad">' +
          '<div class="row between"><div><p class="eyebrow">' + E(proj.siteStatus) + '</p>' +
          '<h1 class="big" style="margin:2px 0">' + E(proj.name) + '</h1></div>' + statusPill(proj) + '</div>' +
          '<div class="muted" style="margin-bottom:14px">' + E(proj.location) + '</div>' +
          '<div class="glance" style="margin-bottom:18px">' +
            gcell('Building', g.buildingType) + gcell('Floors', g.floors) +
            gcell('Unit size', g.unitSqft) + gcell('Bed / Bath', g.bed + ' / ' + g.bath) +
            gcell('Balcony', g.balcony) + gcell('Handover', proj.handover) +
          '</div>' +
          mediaSection(proj) +
          '<h2 class="sec">Units</h2>' +
          '<div class="card">' +
            units.map(unitRow.bind(null, proj)).join('') +
          '</div>' +
          constructionSection(proj) +
          sharedDocsSection(proj) +
          '<div class="spacer-24"></div>' +
        '</div>' +
      '</div>';
  };

  // General collateral explicitly shared to all clients (6.7.10) — never
  // another customer's documents. Sensitive customer docs live under "My documents".
  function sharedDocsSection(proj) {
    var docs = (DB.documents || []).filter(function (d) {
      return d.classification === 'customerLeadRestricted' && d.sharedToAllClients && d.scanStatus === 'clean' && d.lifecycleStatus === 'active' && d.isCurrent && (!d.projectId || d.projectId === proj.id);
    });
    if (!docs.length) return '';
    return '<h2 class="sec" style="margin-top:18px">Shared documents</h2><div class="card">' +
      docs.map(function (d) {
        return '<div class="unit" data-ref="' + E(d.id) + '"><div><span class="un" style="font-size:14px">' + E(d.name) + '</span></div><div class="um">' + E(d.projectName || 'All buyers') + '</div><div class="up"><button class="btn sm" data-act="doc-open" data-id="' + E(d.id) + '">Open</button></div></div>';
      }).join('') + '</div>';
  }

  // construction timeline — updates the admin publishes appear here live (cross-view)
  function constructionSection(proj) {
    var ups = (DB.constructionUpdates && DB.constructionUpdates[proj.id]) || [];
    if (!ups.length) return '';
    return '<h2 class="sec" style="margin-top:18px">Construction updates</h2><div class="card pad">' +
      ups.map(function (u) {
        return '<div class="cu-row" data-ref="' + E(u.id) + '"><div class="cu-dot"></div><div><div class="cu-s">' + E(u.stage) + '</div><div class="cu-c">' + E(u.caption) + '</div><div class="cu-t">' + new Date(u.date).toLocaleDateString('en-GB') + '</div></div></div>';
      }).join('') + '</div>';
  }

  function unitRow(proj, u) {
    var avail = u.status === 'available';
    var pillMap = { available: ['green', 'Available'], locked: ['amber', 'Locked'], booked: ['blue', 'Booked'], reserved: ['violet', 'Reserved'], sold: ['grey', 'Sold'] };
    var pm = pillMap[u.status] || ['grey', u.status];
    return '<div class="unit ' + (avail ? 'avail' : 'off') + '" ' + (avail ? 'data-act="unit" data-pid="' + proj.id + '" data-uno="' + E(u.unitNo) + '"' : '') + '>' +
      '<div><span class="un">' + E(u.unitNo) + '</span> <span class="pill ' + pm[0] + '" style="margin-left:6px"><span class="dot"></span>' + pm[1] + '</span></div>' +
      '<div class="um">Floor ' + u.floor + ' · ' + E(u.config) + ' · ' + u.areaSqft.toLocaleString() + ' sqft · ' + E(u.orientation) + '</div>' +
      '<div class="up">' + BDTS(u.priceBdt) + '</div>' +
      '</div>';
  }

  SCREENS.unit = function (p) {
    var proj = DB.projects.find(function (x) { return x.id === p.pid; });
    var u = proj && proj.units.find(function (x) { return x.unitNo === p.uno; });
    if (!u) return SCREENS.projects();
    var locked = me.kycStatus !== 'verified';
    return appbar(u.unitNo, { back: true }) +
      '<div class="screen">' + projImg(proj) +
        '<div class="pad stack">' +
          '<div><p class="eyebrow">' + E(proj.name) + '</p><h1 class="big" style="margin:2px 0">' + E(u.unitNo) + '</h1>' +
          '<div class="muted">Floor ' + u.floor + ' · ' + E(u.orientation) + ' facing</div></div>' +
          '<div class="glance">' +
            gcell('Configuration', u.config) + gcell('Area', u.areaSqft.toLocaleString() + ' sqft') +
            gcell('Price', BDT(u.priceBdt)) + gcell('Token to reserve', BDT(CFG.tokenAmountBdt)) +
          '</div>' +
          (locked
            ? '<div class="banner amber">' + I.shield + '<div><b>Verify your identity first</b>Complete KYC to reserve this unit.</div></div>' +
              '<button class="btn" data-act="go-profile">Go to KYC</button>'
            : '<div class="banner blue">' + I.clock + '<div><b>Reserve for ' + lockWindow() + ' seconds</b>Pay the ' + BDT(CFG.tokenAmountBdt) + ' token within the lock window to hold this unit.</div></div>' +
              '<button class="btn primary" data-act="reserve" data-pid="' + proj.id + '" data-uno="' + E(u.unitNo) + '">Reserve this unit</button>') +
          '<div class="spacer-24"></div>' +
        '</div>' +
      '</div>';
  };

  SCREENS.review = function (p) {
    var b = myBooking(p.bookingId);
    if (!b) return SCREENS.projects();
    return appbar('Review booking', { back: true }) +
      '<div class="screen"><div class="pad stack">' +
        '<div class="lock" id="lockBox">' + I.lock +
          '<div style="flex:1"><div style="font-size:12px;font-weight:700">Unit held — complete payment before</div>' +
          '<div class="clock" id="lockClock">--:--</div></div></div>' +
        '<div class="card pad">' +
          '<div class="kv"><span class="k">Project</span><span class="v">' + E(b.projectName) + '</span></div>' +
          '<div class="kv"><span class="k">Unit</span><span class="v">' + E(b.unitNo) + '</span></div>' +
          '<div class="kv"><span class="k">Area</span><span class="v">' + b.unitAreaSqft.toLocaleString() + ' sqft</span></div>' +
          '<div class="kv"><span class="k">Unit price</span><span class="v">' + BDT(b.unitPriceBdt) + '</span></div>' +
          '<div class="kv"><span class="k">Token due now</span><span class="v" style="color:var(--maroon)">' + BDT(b.amountBdt) + '</span></div>' +
        '</div>' +
        '<div class="banner grey" style="font-size:12.5px">' + I.doc + '<div>The token secures your unit. The remaining balance is payable via the installment schedule generated on confirmation.</div></div>' +
        '<button class="btn primary" data-act="checkout" data-id="' + b.id + '">Pay ' + BDT(b.amountBdt) + ' token</button>' +
        '<div class="spacer-24"></div>' +
      '</div></div>';
  };

  SCREENS.checkout = function (p) {
    var ctx = p.ctx; // {kind, amount, gateway, label, id}
    var gwClass = ctx.gateway === 'Stripe' ? '' : ctx.gateway === 'SSLCommerz' ? 'ssl' : 'wire';
    return '<div class="screen"><div class="checkout">' +
        '<div class="gw"><span>' + E(ctx.gateway) + '</span>' +
          '<span class="lock-ic">' + I.lock + '</span>' +
          '<span style="margin-left:auto;font-size:11px;color:#7ee0a1">secure checkout</span></div>' +
        '<div class="cc"><div class="cl">Salmon Developers Ltd · ' + E(ctx.label) + '</div>' +
          '<div class="amt">' + BDT(ctx.amount) + '</div></div>' +
        // hosted / tokenized checkout — Salmon never sees card data (6.22 money law).
        // No card-number / expiry / CVV fields anywhere; the gateway collects them.
        '<div class="hosted-cx">' +
          '<div class="hcx-bar">' + I.lock + ' secure-checkout.' + (ctx.gateway || 'gateway').toLowerCase().replace(/[^a-z]/g, '') + '.com</div>' +
          '<div class="hcx-body">The gateway’s <b>hosted checkout</b> opens here. Salmon never sees or stores your <b>card number, CVV or PIN</b>.</div>' +
        '</div>' +
        '<div class="cpay">' +
          '<button class="btn ' + gwClass + '" data-act="pay-confirm">Open secure checkout · ' + BDT(ctx.amount) + '</button>' +
          '<div class="stub-note">Stubbed hosted checkout — no real charge, no card fields. Salmon confirms from the gateway’s verified notification, not this screen.</div>' +
        '</div>' +
      '</div></div>';
  };

  SCREENS.pending = function (p) {
    return '<div class="screen"><div class="result">' +
        '<div class="spinner"></div>' +
        '<h2>Confirming your payment</h2>' +
        '<p>' + (p.text || 'We’re verifying your payment with Salmon.') + '</p>' +
        (p.ref ? '<div class="ref">Ref ' + E(p.ref) + '</div>' : '') +
        '<div class="wait-note">This resolves the moment Salmon’s finance team confirms it — watch the admin panel.</div>' +
      '</div></div>';
  };

  SCREENS['booking-success'] = function (p) {
    var b = myBooking(p.bookingId);
    return '<div class="screen"><div class="result">' +
        '<div class="big-ic ok">' + I.check + '</div>' +
        '<h2>Booking confirmed</h2>' +
        '<p>' + (b ? E(b.projectName) + ' · ' + E(b.unitNo) : 'Your unit is booked') + ' is now yours to complete.</p>' +
        (b ? '<div class="ref">' + E(b.id) + '</div>' : '') +
        '<div class="actions">' +
          '<button class="btn primary" data-act="go-installments">View installment schedule</button>' +
          '<button class="btn" data-act="booking-detail" data-id="' + (b ? b.id : '') + '">View booking</button>' +
        '</div>' +
      '</div></div>';
  };

  SCREENS['booking-expired'] = function () {
    return '<div class="screen"><div class="result">' +
        '<div class="big-ic fail">' + I.x + '</div>' +
        '<h2>Lock expired</h2>' +
        '<p>The 60-second hold ended before payment was confirmed, so the unit was released. You can reserve it again if it’s still available.</p>' +
        '<div class="actions"><button class="btn primary" data-act="go-projects">Back to projects</button></div>' +
      '</div></div>';
  };

  SCREENS['payment-success'] = function (p) {
    var inst = (me.schedule || []).find(function (i) { return i.id === p.installmentId; });
    return '<div class="screen"><div class="result">' +
        '<div class="big-ic ok">' + I.check + '</div>' +
        '<h2>Payment successful</h2>' +
        '<p>' + (inst ? E(inst.label) + ' — ' + BDT(inst.amountBdt) : 'Your installment') + ' has been verified.</p>' +
        '<div class="actions">' +
          '<button class="btn" data-act="receipt"><span>' + I.receipt + '</span>Download receipt (PDF)</button>' +
          '<button class="btn primary" data-act="go-installments">Back to tracker</button>' +
        '</div>' +
      '</div></div>';
  };

  SCREENS.bookings = function () {
    var bookings = myBookings();
    return appbar('My bookings') +
      '<div class="screen"><div class="pad">' +
        (bookings.length ? bookings.map(function (b) {
          return '<div class="card pad" data-act="booking-detail" data-id="' + b.id + '" data-ref="' + b.id + '" style="cursor:pointer;margin-bottom:12px">' +
            '<div class="row between"><div style="font-weight:800">' + E(b.projectName) + ' · ' + E(b.unitNo) + '</div>' + bookingPill(b) + '</div>' +
            '<div class="muted" style="font-size:12.5px;margin-top:2px">' + E(b.id) + ' · token ' + BDT(b.amountBdt) + '</div></div>';
        }).join('') : '<div class="center-note">No bookings yet.<br/>Reserve a unit to see it here.</div>') +
      '</div></div>' + tabbar('bookings');
  };

  SCREENS['booking-detail'] = function (p) {
    var b = myBooking(p.bookingId || p.id);
    if (!b) return SCREENS.bookings();
    var confirmed = b.status === 'confirmed';
    return appbar('Booking ' + b.unitNo, { back: true }) +
      '<div class="screen"><div class="pad stack">' +
        '<div class="row between"><h1 class="big">' + E(b.unitNo) + '</h1>' + bookingPill(b) + '</div>' +
        '<div class="card pad">' +
          '<div class="kv"><span class="k">Reference</span><span class="v mono">' + E(b.id) + '</span></div>' +
          '<div class="kv"><span class="k">Project</span><span class="v">' + E(b.projectName) + '</span></div>' +
          '<div class="kv"><span class="k">Token paid</span><span class="v">' + BDT(b.amountBdt) + '</span></div>' +
          '<div class="kv"><span class="k">Payment ref</span><span class="v mono">' + E(b.reference || '—') + '</span></div>' +
        '</div>' +
        (confirmed ? '<button class="btn primary" data-act="go-installments">View installment schedule</button>' : '') +
      '</div></div>';
  };

  SCREENS.installments = function () {
    var sched = me.schedule || [];
    if (!sched.length) {
      return appbar('Installments') + '<div class="screen"><div class="center-note">No installment schedule yet.<br/>It’s generated when a booking is confirmed.</div></div>' + tabbar('bookings');
    }
    var paid = sched.filter(function (i) { return i.status === 'paid'; });
    var total = sched.reduce(function (n, i) { return n + i.amountBdt; }, 0);
    var paidAmt = paid.reduce(function (n, i) { return n + i.amountBdt; }, 0);
    var pct = Math.round(paidAmt / total * 100);
    var next = nextDue();
    return appbar('Installment tracker') +
      '<div class="screen"><div class="pad stack">' +
        '<div class="card pad">' +
          '<div class="muted" style="font-size:12px">' + E(me.scheduleProjectName || '') + ' · ' + E(me.scheduleUnitNo || '') + '</div>' +
          '<div class="row between" style="margin:8px 0 10px"><div><div style="font-weight:800;font-size:22px">' + BDT(paidAmt) + '</div><div class="muted" style="font-size:12px">of ' + BDT(total) + ' paid</div></div>' +
          '<div style="text-align:right"><div style="font-weight:800;font-size:22px;color:var(--green)">' + pct + '%</div><div class="muted" style="font-size:12px">' + paid.length + ' / ' + sched.length + ' verified</div></div></div>' +
          '<div class="progress"><span style="width:' + pct + '%"></span></div>' +
          '<div class="row between" style="margin-top:12px"><span class="muted" style="font-size:13px">Outstanding</span><span style="font-weight:800">' + BDT(total - paidAmt) + '</span></div>' +
        '</div>' +
        (next ? '<div class="card pad"><h2 class="sec" style="margin:0 0 8px">Next due</h2>' +
          '<div class="row between"><div><div style="font-weight:800;font-size:18px">' + BDT(next.amountBdt) + '</div><div class="muted" style="font-size:12.5px">' + E(next.label) + ' · due ' + dueLabel(next.dueDate) + '</div></div>' +
          (next.status === 'pending'
            ? '<span class="pill amber"><span class="dot"></span>Pending</span>'
            : '<button class="btn sm primary" data-act="pay-inst" data-id="' + next.id + '">Pay now</button>') +
          '</div></div>' : '<div class="banner green">' + I.check + '<div><b>All installments paid</b>Nothing outstanding.</div></div>') +
        '<div class="card"><h2 class="sec" style="margin:14px 14px 6px">Schedule</h2>' +
          sched.map(instRow).join('') +
        '</div><div class="spacer-24"></div>' +
      '</div></div>' + tabbar('bookings');
  };

  function instRow(i) {
    var cls = i.status === 'paid' ? 'paid' : i.status === 'pending' ? 'pending' : '';
    var right = i.status === 'paid' ? '<span class="pill green"><span class="dot"></span>Verified</span>'
      : i.status === 'pending' ? '<span class="pill amber"><span class="dot"></span>Pending</span>'
      : '<span class="iv">' + BDT(i.amountBdt) + '</span>';
    return '<div class="inst ' + cls + '" data-ref="' + i.id + '">' +
      '<div class="in-n">' + (i.status === 'paid' ? I.check : i.n) + '</div>' +
      '<div><div class="il">' + E(i.label) + '</div><div class="id">Due ' + dueLabel(i.dueDate) + '</div></div>' +
      '<div>' + right + '</div></div>';
  }

  SCREENS.profile = function () {
    if (!me) return SCREENS.welcome();
    return appbar('Profile') +
      '<div class="screen"><div class="pad stack">' +
        '<div class="card pad row" style="gap:14px">' +
          '<div style="width:54px;height:54px;border-radius:50%;background:var(--maroon-tint);color:var(--maroon);display:grid;place-items:center;font-weight:800;font-size:20px">' + E(initials(me.name)) + '</div>' +
          '<div><div style="font-weight:800;font-size:17px">' + E(me.name) + '</div>' +
          '<div class="muted" style="font-size:13px">' + E(me.email) + '</div>' +
          '<div class="muted" style="font-size:12.5px">' + E(me.phone) + ' · ' + E(me.country) + '</div></div>' +
        '</div>' +
        '<div class="card pad">' +
          '<div class="row between"><h2 class="sec" style="margin:0">Passport / KYC</h2>' + kycPill(me.kycStatus) + '</div>' +
          (me.kycStatus === 'not_submitted'
            ? '<div class="banner grey" style="margin-top:12px">' + I.upload + '<div><b>Upload your passport</b>A clear photo of the ID page. Stored securely.</div></div>' +
              '<button class="btn primary" style="margin-top:12px" data-act="kyc-upload">' + I.upload + 'Upload passport</button>'
            : me.kycStatus === 'pending'
              ? '<div class="banner amber" style="margin-top:12px">' + I.clock + '<div><b>Pending review — ' + E(me.kycFile || 'passport.jpg') + '</b>Salmon’s team is verifying your document.</div></div>'
              : me.kycStatus === 'rejected'
                ? '<div class="banner" style="margin-top:12px;background:var(--red-bg);color:var(--red)">' + I.shield + '<div><b>Not verified</b>' + E(me.kycReason || '') + '</div></div>' +
                  '<button class="btn primary" style="margin-top:12px" data-act="kyc-upload">' + I.upload + 'Re-upload passport</button>'
                : '<div class="banner green" style="margin-top:12px">' + I.check + '<div><b>Verified</b>' + E(me.kycFile || 'passport.jpg') + ' accepted.</div></div>') +
        '</div>' +
        myDocsSection() +
        '<button class="btn" data-act="go-support"><span>' + I.chat + '</span>Help &amp; support</button>' +
        '<button class="btn" data-act="signout">Sign out</button>' +
      '</div></div>' + tabbar('profile');
  };

  // Req 6.16 clause 3 — the client's ONE approved real-time channel. In-app: a
  // real thread with agent identity + history. WhatsApp: an honest handoff + a
  // ticket STUB (reference + status) — never a faked transcript.
  SCREENS.support = function () {
    if (!me) return SCREENS.welcome();
    var channel = (DB.config && DB.config.clientSupportChannel) || 'in_app';
    var chat = (DB.tickets || []).filter(function (t) { return t.source === 'client' && t.clientId === me.id; }).sort(function (a, b) { return new Date(b.updatedAt) - new Date(a.updatedAt); })[0];
    var body;
    if (channel === 'whatsapp') {
      // Honest handoff + stub. No transcript rendered.
      var waNum = ((DB.config && DB.config.whatsappNumber) || '').replace(/[^0-9]/g, '');
      var ref = chat ? chat.id : '';
      var waLink = 'https://wa.me/' + waNum + '?text=' + encodeURIComponent('Salmon support' + (ref ? ' — ref ' + ref : ''));
      body = '<div class="card pad"><div style="font-weight:800;font-size:15px;margin-bottom:4px">Chat with Salmon on WhatsApp</div>' +
        '<div class="muted" style="font-size:13px;margin-bottom:12px">Our team replies on WhatsApp Business during working hours. Tap below to open the conversation.</div>' +
        '<a class="btn primary" href="' + waLink + '" target="_blank" data-act="wa-open" data-id="' + (chat ? chat.id : '') + '"><span>' + I.chat + '</span>Open WhatsApp</a></div>' +
        (chat ? '<div class="card pad"><div class="row between"><div style="font-weight:700;font-size:13px">Support reference</div>' + clientTktPill(chat.status) + '</div>' +
          '<div class="muted" style="font-size:13px;margin-top:6px">' + E(chat.id) + ' · ' + E(chat.category) + '</div>' +
          '<div class="muted" style="font-size:12px;margin-top:8px">This is a status stub only — your WhatsApp messages stay in WhatsApp.</div></div>'
          : '<div class="center-note" style="padding:16px">No open conversation yet. Opening WhatsApp starts one.</div>');
    } else {
      // In-app: real thread.
      if (!chat) {
        body = '<div class="card pad"><div style="font-weight:800;font-size:15px;margin-bottom:4px">Chat with Salmon</div>' +
          '<div class="muted" style="font-size:13px;margin-bottom:12px">Message our team about your booking, payments or documents — we reply here in the app.</div>' +
          '<button class="btn primary" data-act="chat-start"><span>' + I.chat + '</span>Start a chat</button></div>';
      } else {
        var thread = (chat.thread || []).filter(function (m) { return m.side !== 'system' && m.kind !== 'note'; });
        body = '<div class="card pad"><div class="row between"><div style="font-weight:700;font-size:13px">' + E(chat.assigneeName || 'Salmon support') + '</div>' + clientTktPill(chat.status) + '</div>' +
          '<div class="muted" style="font-size:12px">' + E(chat.id) + ' · usually replies within a few hours</div></div>' +
          thread.map(function (m) {
            var staffSide = m.side === 'staff';
            return '<div class="card pad"' + (staffSide ? ' style="background:var(--maroon-tint)"' : '') + '><div style="font-weight:700;font-size:12.5px;margin-bottom:3px">' + (staffSide ? E(m.by) + ' · Salmon' : 'You') + '<span class="muted" style="font-weight:400;font-size:11px;margin-left:6px">' + Salmon.timeAgo(m.at) + '</span></div><div style="font-size:14px">' + E(m.text) + '</div></div>';
          }).join('') +
          '<div class="field"><label>Message</label><textarea id="c-msg" rows="2" placeholder="Type a message…"></textarea></div>' +
          '<button class="btn primary" data-act="chat-send" data-id="' + chat.id + '"><span>' + I.chat + '</span>Send</button>';
      }
    }
    return appbar('Help & support', { back: true, to: 'profile' }) +
      '<div class="screen"><div class="pad stack">' + body + '</div></div>';
  };
  function clientTktPill(s) {
    var m = { open: ['blue', 'Open'], in_progress: ['amber', 'Salmon replying'], resolved: ['green', 'Resolved'], reopened: ['maroon', 'Reopened'] };
    var x = m[s] || ['grey', s]; return '<span class="pill ' + x[0] + '"><span class="dot"></span>' + x[1] + '</span>';
  }

  // Req 6.7 — the client sees ONLY their own documents (booking form, receipts,
  // payment proof, their NID) plus general collateral shared to all clients.
  // Access is server-enforced; this client-side filter mirrors canAccessDocument.
  function myDocsSection() {
    if (!me) return '';
    var docs = (DB.documents || []).filter(function (d) {
      if (d.classification !== 'customerLeadRestricted') return false;
      if (d.scanStatus !== 'clean' || d.lifecycleStatus === 'deleted' || !d.isCurrent) return false;
      return d.sharedToAllClients || d.customerId === me.id || (d.documentableType === 'customer' && d.documentableId === me.id) ||
        (d.documentableType === 'booking' && (me.bookings || []).indexOf(d.documentableId) >= 0) ||
        (DB.bookings || []).some(function (b) { return b.clientId === me.id && d.documentableType === 'booking' && d.documentableId === b.id; });
    });
    return '<div class="card pad">' +
      '<div class="row between"><h2 class="sec" style="margin:0">My documents</h2><span class="pill green" style="height:20px"><span class="dot"></span>' + docs.length + '</span></div>' +
      '<div class="muted" style="font-size:12px;margin:6px 0 10px">Your paperwork, kept in order. Only you and Salmon’s authorised staff can open these — every view is logged.</div>' +
      (docs.length ? docs.map(function (d) {
        return '<div class="unit" data-ref="' + E(d.id) + '"><div><span class="un" style="font-size:14px">' + E(d.name) + '</span>' +
          (d.verificationStatus === 'verified' ? ' <span class="pill green" style="height:18px;margin-left:4px"><span class="dot"></span>Verified</span>' : '') + '</div>' +
          '<div class="um">' + E(d.documentableLabel || 'Your account') + '</div>' +
          '<div class="up"><button class="btn sm" data-act="doc-open" data-id="' + E(d.id) + '">Open</button></div></div>';
      }).join('') : '<div class="center-note" style="padding:16px">No documents yet. Salmon adds your booking form, receipts and KYC here.</div>') +
      '</div>';
  }

  SCREENS.notifications = function () {
    var notes = DB.notifications.client || [];
    Salmon.post('/api/notifications/read', { side: 'client' }); // clear badge on open
    return appbar('Notifications', { back: true, noBell: true }) +
      '<div class="screen">' +
        (notes.length ? notes.map(function (n) {
          return '<div class="note ' + (n.read ? '' : 'unread') + '"><div class="nd">' + (n.kind === 'kyc.verified' ? I.shield : n.kind === 'booking.confirmed' ? I.check : n.kind === 'installment.verified' ? I.receipt : I.bell) + '</div>' +
            '<div><div class="nt">' + E(n.title) + '</div><div class="nb">' + E(n.body) + '</div><div class="na">' + Salmon.timeAgo(n.ts) + '</div></div></div>';
        }).join('') : '<div class="center-note">No notifications yet.</div>') +
      '</div>';
  };

  // ---- small helpers ------------------------------------------------------
  function gcell(l, v) { return '<div class="g"><div class="gl">' + E(l) + '</div><div class="gv">' + E(v) + '</div></div>'; }
  function statusPill(p) { return p.status === 'completed' ? '<span class="pill grey"><span class="dot"></span>Handed over</span>' : '<span class="pill maroon"><span class="dot"></span>Ongoing</span>'; }
  function bookingPill(b) {
    var m = { confirmed: ['green', 'Booked'], awaiting_confirmation: ['amber', 'Confirming'], pending_payment: ['amber', 'Payment due'], expired: ['red', 'Expired'] };
    var x = m[b.status] || ['grey', b.status];
    return '<span class="pill ' + x[0] + '"><span class="dot"></span>' + x[1] + '</span>';
  }
  function myBookings() { return DB.bookings.filter(function (b) { return me && b.clientId === me.id; }).slice().reverse(); }
  function myBooking(id) { return DB.bookings.find(function (b) { return b.id === id; }); }
  function nextDue() {
    var s = (me && me.schedule) || [];
    return s.find(function (i) { return i.status === 'due'; }) || s.find(function (i) { return i.status === 'pending'; }) || null;
  }
  function firstName(n) { return String(n || '').split(' ')[0]; }
  function initials(n) { return String(n || '?').split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase(); }
  function lockWindow() { return CFG.lockWindowActiveSec || CFG.lockWindowSec; }
  function dueLabel(iso) {
    var days = Math.round((new Date(iso).getTime() - Date.now()) / 86400000);
    if (days < 0) return Math.abs(days) + 'd overdue';
    if (days === 0) return 'today';
    return 'in ' + days + ' day' + (days === 1 ? '' : 's');
  }

  // ---- lock countdown (real) ----------------------------------------------
  function startLockTimer() {
    stopLockTimer();
    lockTimer = setInterval(function () {
      var b = myBooking(nav.params.bookingId);
      var box = document.getElementById('lockBox');
      var clk = document.getElementById('lockClock');
      if (!b || !clk) { stopLockTimer(); return; }
      var left = Math.max(0, Math.ceil((b.lockExpiresAt - Date.now()) / 1000));
      var mm = String(Math.floor(left / 60)).padStart(2, '0');
      var ss = String(left % 60).padStart(2, '0');
      clk.textContent = mm + ':' + ss;
      if (box) box.classList.toggle('warn', left <= 10);
      if (left <= 0) { stopLockTimer(); } // server emits booking.expired
    }, 250);
  }
  function stopLockTimer() { if (lockTimer) { clearInterval(lockTimer); lockTimer = null; } }

  // ---- gateway for current client -----------------------------------------
  function gatewayFor(country) {
    var c = String(country || '').toLowerCase();
    if (c.indexOf('bangladesh') >= 0) return 'SSLCommerz';
    if (c.indexOf('uae') >= 0 || c.indexOf('emirates') >= 0) return 'Stripe';
    return 'Bank Wire';
  }

  // ---- actions (event delegation) -----------------------------------------
  view.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act],[data-tab]');
    if (!el) return;
    var tab = el.getAttribute('data-tab');
    if (tab) { go(tab === 'projects' ? 'projects' : tab === 'bookings' ? 'bookings' : tab === 'profile' ? 'profile' : 'home'); return; }
    var act = el.getAttribute('data-act');
    ACTIONS[act] && ACTIONS[act](el, e);
  });
  view.addEventListener('change', function (e) {
    if (e.target.hasAttribute && e.target.hasAttribute('data-projfilter')) { projFilters[e.target.getAttribute('data-projfilter')] = e.target.value; render(); }
  });

  var ACTIONS = {
    back: function () { history.length; go(prevScreen()); },
    'media-img': function (el) { openLightbox('<img class="lbimg" src="' + el.getAttribute('data-src') + '" alt=""/>', el.getAttribute('data-cap') || 'Photo', false); },
    'media-video': function (el) {
      var src = el.getAttribute('data-src');
      openLightbox('<video class="lbvid" src="' + src + '" controls autoplay playsinline></video>', 'Project walkthrough', el.getAttribute('data-sample') === '1');
    },
    'media-360': function (el) {
      var src = el.getAttribute('data-src');
      openLightbox('<iframe class="lb360" src="' + src + '" allowfullscreen allow="xr-spatial-tracking; gyroscope; accelerometer; fullscreen"></iframe>' +
        '<a class="lbext" href="' + src + '" target="_blank" rel="noopener">Open 360° tour in a new tab ↗</a>', '360° / virtual tour', el.getAttribute('data-sample') === '1');
    },
    'media-floor': function (el) { openLightbox(floorPlanSvg(el.getAttribute('data-bed'), el.getAttribute('data-bath')), 'Floor plan — schematic (' + (el.getAttribute('data-bed') || '?') + ' bed / ' + (el.getAttribute('data-bath') || '?') + ' bath)', true); },
    'go-signup': function () { go('signup'); },
    'go-signin': function () { go('signin'); },
    'go-projects': function () { go('projects'); },
    'go-profile': function () { go('profile'); },
    'go-installments': function () { go('installments'); },
    'go-support': function () { go('support'); },
    notifs: function () { go('notifications'); },

    // Req 6.16 — the client's approved real-time channel.
    'chat-start': function () {
      Salmon.post('/api/chat/start', { clientId: me.id }).then(function (r) {
        if (r.channel === 'whatsapp' && r.whatsappLink) { try { window.open(r.whatsappLink, '_blank'); } catch (e) {} }
        return refresh();
      }).then(function () { render(); }).catch(function (err) { Salmon.toast.show('Could not start chat', (err.data && err.data.error) || '', { warn: true }); });
    },
    'chat-send': function (el) {
      var body = val('c-msg');
      if (!body) { Salmon.toast.show('Type a message first', '', { warn: true }); return; }
      Salmon.post('/api/tickets/message', { ticketId: el.getAttribute('data-id'), body: body })
        .then(refresh).then(function () { render(); }).catch(function (err) { Salmon.toast.show('Could not send', (err.data && err.data.error) || '', { warn: true }); });
    },
    'wa-open': function (el) {
      // ensure a tracking stub exists on the server, then let the href open WhatsApp
      Salmon.post('/api/chat/start', { clientId: me.id }).then(refresh).then(render);
    },

    'do-signup': function () {
      var body = {
        name: val('su-name'), email: val('su-email'), phone: val('su-phone'), country: val('su-country')
      };
      if (!body.name || !body.email) { Salmon.toast.show('Please fill in name and email', '', { warn: true }); return; }
      Salmon.post('/api/clients', body).then(function () {
        return refresh();
      }).then(function () {
        Salmon.toast.show('Account created — welcome to Salmon', firstName(me.name) + ', your dashboard is ready.');
        go('home');
      });
    },
    'do-signin': function () {
      Salmon.post('/api/auth/login', { email: val('si-email'), password: val('si-pass') })
        .then(refresh).then(function () { Salmon.toast.show('Signed in', 'Welcome back, ' + firstName(me.name)); go('home'); })
        .catch(function () { Salmon.toast.show('Sign in failed', 'Check your email and password.', { warn: true }); });
    },
    signout: function () { me = null; DB.session.clientId = null; go('welcome'); },

    project: function (el) { go('project', { id: el.getAttribute('data-id') }); },
    projview: function (el) { var v = el.getAttribute('data-view'); if (v && v !== projView) { projView = v; render(); } },
    unit: function (el) { go('unit', { pid: el.getAttribute('data-pid'), uno: el.getAttribute('data-uno') }); },

    reserve: function (el) {
      Salmon.post('/api/bookings', { clientId: me.id, projectId: el.getAttribute('data-pid'), unitNo: el.getAttribute('data-uno') })
        .then(function (r) { return refresh().then(function () { go('review', { bookingId: r.booking.id }); }); })
        .catch(function (err) { Salmon.toast.show('Could not reserve', err.data && err.data.error || '', { warn: true }); });
    },

    checkout: function (el) {
      var b = myBooking(el.getAttribute('data-id'));
      go('checkout', { ctx: { kind: 'booking', id: b.id, amount: b.amountBdt, gateway: gatewayFor(me.country), label: b.projectName + ' ' + b.unitNo + ' — token' } });
    },
    'pay-inst': function (el) {
      var inst = (me.schedule || []).find(function (i) { return i.id === el.getAttribute('data-id'); });
      go('checkout', { ctx: { kind: 'installment', id: inst.id, amount: inst.amountBdt, gateway: gatewayFor(me.country), label: inst.label } });
    },

    'pay-confirm': function () {
      var ctx = nav.params.ctx;
      if (ctx.kind === 'booking') {
        Salmon.post('/api/payments/checkout', { bookingId: ctx.id }).then(function (r) {
          pending = { kind: 'booking', id: ctx.id };
          // brief "processing" beat on the stub, then the confirming screen (resolves via SSE from admin)
          go('pending', { text: 'Waiting for Salmon to confirm your booking.', ref: r.webhook.reference });
        }).catch(function () {
          // lock ran out before the token was paid — honest state, not a crash
          pending = null;
          refresh().then(function () { go('booking-expired', { bookingId: ctx.id }); });
        });
      } else {
        Salmon.post('/api/installments/pay', { clientId: me.id, installmentId: ctx.id }).then(function (r) {
          pending = { kind: 'installment', id: ctx.id };
          go('pending', { text: 'Waiting for Salmon to verify this installment.', ref: r.webhook.reference });
        });
      }
    },

    'kyc-upload': function () {
      Salmon.post('/api/kyc/upload', { clientId: me.id, filename: 'passport-' + firstName(me.name).toLowerCase() + '.jpg' })
        .then(refresh).then(function () { Salmon.toast.show('Passport uploaded', 'Status is now Pending review.'); render(); });
    },

    'booking-detail': function (el) { go('booking-detail', { bookingId: el.getAttribute('data-id') }); },
    receipt: function () { Salmon.toast.show('Receipt', 'receipt-' + Date.now() + '.pdf (stub link)'); },
    // Req 6.7 — open one of MY documents via a time-limited signed link.
    'doc-open': function (el) {
      Salmon.post('/api/documents/access', { as: 'client', clientId: me.id, docId: el.getAttribute('data-id'), purpose: 'view' }).then(function (r) {
        Salmon.toast.show('Opening securely', 'Signed link · valid ' + r.ttlSec + 's · this view was logged.');
        try { window.open(r.url, '_blank'); } catch (e) {}
      }).catch(function (err) { Salmon.toast.show('Cannot open', (err.data && err.data.error) || 'Access denied.', { warn: true }); });
    },
    'go-home': function () { go('home'); }
  };

  function prevScreen() {
    // simple, predictable back mapping
    var s = nav.screen;
    if (s === 'unit') return 'project';
    if (s === 'project') return 'projects';
    if (s === 'review') return 'projects';
    if (s === 'booking-detail') return 'bookings';
    if (s === 'signup' || s === 'signin') return 'welcome';
    if (s === 'notifications') return me ? 'home' : 'welcome';
    return me ? 'home' : 'welcome';
  }
  // back needs to return to project with id when leaving unit
  var _origBack = ACTIONS.back;
  ACTIONS.back = function () {
    var s = nav.screen;
    if (s === 'unit') return go('project', { id: nav.params.pid });
    return go(prevScreen());
  };

  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
})();
