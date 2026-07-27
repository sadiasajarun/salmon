/* ============================================================================
 * Salmon Live Demo — shared client runtime.
 * A tiny event bus over Server-Sent Events + REST helpers + view utilities.
 * Both the client app and the admin panel (and the split-view shell) load this.
 * Exposes a single global: `Salmon`.
 * ==========================================================================*/
(function (root) {
  'use strict';

  var listeners = {}; // type -> [fn]
  var anyListeners = [];
  var source = null;
  var statusFns = [];

  function on(type, fn) {
    (listeners[type] = listeners[type] || []).push(fn);
    return function off() {
      listeners[type] = (listeners[type] || []).filter(function (f) { return f !== fn; });
    };
  }
  function onAny(fn) { anyListeners.push(fn); }
  function onStatus(fn) { statusFns.push(fn); }

  function dispatch(msg) {
    (listeners[msg.type] || []).forEach(function (fn) { try { fn(msg); } catch (e) { console.error(e); } });
    anyListeners.forEach(function (fn) { try { fn(msg); } catch (e) { console.error(e); } });
  }

  function connect() {
    if (source) return;
    source = new EventSource('/api/events');
    source.onopen = function () { statusFns.forEach(function (f) { f(true); }); };
    source.onerror = function () { statusFns.forEach(function (f) { f(false); }); };
    source.onmessage = function (e) {
      var msg;
      try { msg = JSON.parse(e.data); } catch (err) { return; }
      dispatch(msg);
    };
  }

  // ---- REST helpers -------------------------------------------------------
  function get(path) {
    return fetch(path).then(function (r) { return r.json(); });
  }
  function post(path, body) {
    return fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    }).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok) throw Object.assign(new Error(data.error || 'request failed'), { data: data });
        return data;
      });
    });
  }
  // `as` opt: 'partner' asks the server for the partner-safe projection of
  // leads (internal notes / owner / rep / next-action stripped at the source).
  function state(as) { return get('/api/state' + (as ? '?as=' + encodeURIComponent(as) : '')); }
  function config() { return get('/api/config'); }

  // ---- view utilities -----------------------------------------------------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function bdt(n) {
    if (n == null) return '—';
    return '৳' + Number(n).toLocaleString('en-IN');
  }
  // compact BDT: 14500000 -> ৳1.45 Cr, 200000 -> ৳2.0 L
  function bdtShort(n) {
    if (n == null) return '—';
    n = Number(n);
    if (n >= 10000000) return '৳' + (n / 10000000).toFixed(2).replace(/\.00$/, '') + ' Cr';
    if (n >= 100000) return '৳' + (n / 100000).toFixed(1).replace(/\.0$/, '') + ' L';
    return '৳' + n.toLocaleString('en-IN');
  }
  function timeAgo(iso) {
    var s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 5) return 'just now';
    if (s < 60) return s + 's ago';
    var m = Math.floor(s / 60);
    if (m < 60) return m + 'm ago';
    var h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    return Math.floor(h / 24) + 'd ago';
  }
  function clock(ts) {
    var d = ts ? new Date(ts) : new Date();
    return d.toLocaleTimeString('en-GB', { hour12: false });
  }

  // ---- toasts (each app calls Salmon.toast.mount once) --------------------
  var toastHost = null;
  var toast = {
    mount: function (el) { toastHost = el; },
    show: function (title, body, opts) {
      opts = opts || {};
      if (!toastHost) return;
      var t = document.createElement('div');
      t.className = 'toast' + (opts.warn ? ' warn' : '');
      var icon = opts.warn
        ? '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>'
        : '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6 9 17l-5-5"/></svg>';
      t.innerHTML = icon + '<div><b>' + esc(title) + '</b>' + (body ? '<div>' + esc(body) + '</div>' : '') + '</div>';
      toastHost.appendChild(t);
      setTimeout(function () {
        t.style.animation = 'toastOut .3s forwards';
        setTimeout(function () { t.remove(); }, 320);
      }, opts.ttl || 4200);
    }
  };

  root.Salmon = {
    on: on, onAny: onAny, onStatus: onStatus, connect: connect,
    get: get, post: post, state: state, config: config,
    esc: esc, bdt: bdt, bdtShort: bdtShort, timeAgo: timeAgo, clock: clock,
    toast: toast
  };
})(window);
