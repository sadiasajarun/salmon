/* ============================================================================
 * Salmon Live Demo — the live event feed (the demo's secret weapon).
 * A rolling, timestamped, colour-coded log of every message that passes between
 * the two sides. New entries slide in at the top. Clicking an entry pulses the
 * affected side. Used by the split-view shell (index.html).
 * ==========================================================================*/
(function (root) {
  'use strict';

  function arrowSvg(dir) {
    // dir '→' = request from a side to server ; '←' = event delivered to a side
    if (dir === '→') {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>';
  }

  function rowHtml(f) {
    var tone = f.tone === 'req' ? 'req' : 'evt';
    var meta = f.method
      ? '<span class="ef-verb">' + Salmon.esc(f.method) + '</span> <span class="ef-path">' + Salmon.esc(f.path) + '</span>'
      : '<span class="ef-evt-name">' + Salmon.esc(f.path || 'event') + '</span>';
    var clock = new Date(f.ts).toLocaleTimeString('en-GB', { hour12: false });
    return '' +
      '<div class="ef-row ' + tone + '" data-id="' + f.id + '" data-target="' + Salmon.esc(f.target || '') + '" data-ref="' + Salmon.esc(f.ref || '') + '">' +
        '<span class="ef-time num">' + clock + '</span>' +
        '<span class="ef-arrow ' + (f.dir === '→' ? 'out' : 'in') + '">' + arrowSvg(f.dir) + '</span>' +
        '<span class="ef-meta">' + meta + '</span>' +
        '<span class="ef-text">' + Salmon.esc(f.text) + '</span>' +
        '<span class="ef-src ' + Salmon.esc(f.source) + '">' + Salmon.esc(f.source) + '</span>' +
      '</div>';
  }

  function init(opts) {
    var list = opts.container;
    var onClick = opts.onEntryClick || function () {};
    var seen = {};

    function add(entries, animate) {
      entries.forEach(function (f) {
        if (seen[f.id]) return;
        seen[f.id] = true;
        var wrap = document.createElement('div');
        wrap.innerHTML = rowHtml(f);
        var row = wrap.firstChild;
        if (animate) row.classList.add('ef-new');
        list.insertBefore(row, list.firstChild);
      });
      // cap DOM size
      while (list.children.length > 120) list.removeChild(list.lastChild);
    }

    // load history (oldest first so newest ends on top)
    Salmon.state().then(function (s) {
      var feed = (s.feed || []).slice().reverse();
      add(feed, false);
    });

    // live
    Salmon.onAny(function (msg) {
      if (msg.feed && msg.feed.length) add(msg.feed, true);
    });

    list.addEventListener('click', function (e) {
      var row = e.target.closest('.ef-row');
      if (!row) return;
      list.querySelectorAll('.ef-row.sel').forEach(function (r) { r.classList.remove('sel'); });
      row.classList.add('sel');
      onClick({ id: row.dataset.id, target: row.dataset.target, ref: row.dataset.ref });
    });
  }

  root.SalmonFeed = { init: init };
})(window);
