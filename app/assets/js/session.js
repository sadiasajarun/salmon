/* ============================================================================
 * Salmon Developers (mobile) — shared logout helper
 * ----------------------------------------------------------------------------
 * One real Log out for every authenticated surface (partner + client). The
 * screens used to link straight to G02; this adds the behaviour the flow needs:
 * confirm → clear the mock session/draft → revoke the mock device token → return
 * to the unified entry (G02). Dependency-free so any page can include it.
 * ==========================================================================*/
(function (root) {
  'use strict';
  var ENTRY = '../shared/g02-welcome.page.html';

  function clearSession() {
    // mock session + device-token revocation (prototype: localStorage only)
    ['salmon_partner_status', 'salmon_partner_draft', 'salmon_device_token', 'salmon_session'].forEach(function (k) {
      try { localStorage.removeItem(k); } catch (e) {}
    });
  }

  function confirmSheet(onYes) {
    // lightweight bottom-sheet confirm — no external CSS needed
    var scrim = document.createElement('div');
    scrim.setAttribute('style', 'position:fixed;inset:0;z-index:9999;background:rgba(20,10,12,.42);display:flex;align-items:flex-end;justify-content:center');
    scrim.innerHTML =
      '<div style="background:#fff;width:100%;max-width:420px;border-radius:16px 16px 0 0;padding:20px 18px 18px;box-shadow:0 -8px 30px rgba(0,0,0,.18)">' +
      '<div style="font-family:var(--serif,Georgia);font-size:18px;margin-bottom:6px">Log out?</div>' +
      '<div style="font-size:13px;color:var(--ink-subtle,#6b6b6b);line-height:1.5;margin-bottom:16px">You’ll be signed out on this device and returned to the welcome screen. Your account and data are safe.</div>' +
      '<div style="display:flex;gap:10px">' +
      '<button id="_lo_cancel" style="flex:1;height:46px;border-radius:10px;border:1px solid #d9cfd2;background:#fff;font-size:15px;font-weight:600;cursor:pointer">Stay signed in</button>' +
      '<button id="_lo_yes" style="flex:1;height:46px;border-radius:10px;border:none;background:var(--primary,#800020);color:#fff;font-size:15px;font-weight:700;cursor:pointer">Log out</button>' +
      '</div></div>';
    document.body.appendChild(scrim);
    scrim.addEventListener('click', function (e) { if (e.target === scrim) scrim.remove(); });
    scrim.querySelector('#_lo_cancel').onclick = function () { scrim.remove(); };
    scrim.querySelector('#_lo_yes').onclick = function () { scrim.remove(); onYes(); };
  }

  function logout(e) {
    if (e && e.preventDefault) e.preventDefault();
    confirmSheet(function () {
      clearSession();
      window.location.href = ENTRY;
    });
  }

  root.Session = { logout: logout, clearSession: clearSession, ENTRY: ENTRY };
})(window);
