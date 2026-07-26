/* ============================================================================
 * Salmon CRM — dev toolbar (clearly marked, lives in the topbar).
 * Rapid-switch role (rebuilds sidebar + dashboard instantly), switch render
 * state, and reset mock data. This is how you review the whole prototype
 * without logging in and out.
 * ==========================================================================*/
(function (root) {
  'use strict';
  var Perm = root.Perm, C = root.C;

  function render(cfg) {
    var roleOpts = Perm.ALL.map(function (r) { return '<option value="' + r + '"' + (cfg.role === r ? ' selected' : '') + '>' + Perm.ROLE_LABEL[r] + '</option>'; }).join('');
    var states = ['data', 'loading', 'empty', 'error', 'offline'];
    var stOpts = states.map(function (s) { return '<option value="' + s + '"' + (cfg.state === s ? ' selected' : '') + '>' + s + '</option>'; }).join('');
    var elx = C.el('<div class="devbar" title="Dev toolbar — not part of the product"><span class="dl">Dev</span>' +
      '<select data-role>' + roleOpts + '</select>' +
      '<select data-state>' + stOpts + '</select>' +
      '<button class="reset" data-reset>Reset</button></div>');
    elx.querySelector('[data-role]').onchange = function () { cfg.onRole(this.value); };
    elx.querySelector('[data-state]').onchange = function () { cfg.onState(this.value); };
    elx.querySelector('[data-reset]').onclick = function () { cfg.onReset(); };
    return elx;
  }

  root.DevToolbar = { render: render };
})(window);
