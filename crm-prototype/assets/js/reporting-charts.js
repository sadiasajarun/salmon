/* ============================================================================
 * Salmon CRM — Report chart helper (Req 6.17.3)
 * ----------------------------------------------------------------------------
 * ONE lightweight, dependency-free chart component, one visual style, shared by
 * every report. No Chart.js, no chart wall — a single chart per report, the type
 * chosen to fit the data (bar / funnel / donut / line). Uses the CRM design
 * tokens so it reads as part of the console.
 *
 *   ReportChart.render(hostEl, { type, label, series:[[name,value],...] })
 * ==========================================================================*/
(function (root) {
  'use strict';

  var PALETTE = ['#7a1f2b', '#b06a34', '#c9a24b', '#4e6e5d', '#5b6b8c', '#8a5a6a'];
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function bar(series){
    var mx = Math.max.apply(null, series.map(function(s){ return s[1]; })) || 1;
    return '<div class="rc-bars">' + series.map(function(s){
      return '<div class="rc-barrow"><span class="rc-bl">' + esc(s[0]) + '</span>' +
        '<span class="rc-bt"><i style="width:' + Math.round(s[1] / mx * 100) + '%"></i></span>' +
        '<span class="rc-bv">' + esc(s[1]) + '</span></div>';
    }).join('') + '</div>';
  }

  function funnel(series){
    var mx = Math.max.apply(null, series.map(function(s){ return s[1]; })) || 1;
    return '<div class="rc-funnel">' + series.map(function(s, i){
      var w = Math.max(12, Math.round(s[1] / mx * 100));
      var rate = i > 0 && series[i - 1][1] ? ' · ' + Math.round(s[1] / series[i - 1][1] * 100) + '%' : '';
      return '<div class="rc-frow"><div class="rc-fbar" style="width:' + w + '%;background:' + PALETTE[i % PALETTE.length] + '">' +
        '<span class="rc-fn">' + esc(s[0]) + '</span><span class="rc-fv">' + esc(s[1]) + esc(rate) + '</span></div></div>';
    }).join('') + '</div>';
  }

  function donut(series){
    var total = series.reduce(function(n, s){ return n + s[1]; }, 0) || 1;
    var R = 52, C = 2 * Math.PI * R, off = 0;
    var segs = series.map(function(s, i){
      var frac = s[1] / total, len = frac * C;
      var seg = '<circle r="' + R + '" cx="70" cy="70" fill="none" stroke="' + PALETTE[i % PALETTE.length] + '" stroke-width="18" ' +
        'stroke-dasharray="' + len + ' ' + (C - len) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 70 70)"></circle>';
      off += len; return seg;
    }).join('');
    var legend = series.map(function(s, i){
      return '<div class="rc-leg"><span class="rc-dot" style="background:' + PALETTE[i % PALETTE.length] + '"></span>' +
        esc(s[0]) + ' <b>' + esc(s[1]) + '</b> <span class="rc-pct">' + Math.round(s[1] / total * 100) + '%</span></div>';
    }).join('');
    return '<div class="rc-donutwrap"><svg viewBox="0 0 140 140" class="rc-donut">' + segs +
      '<text x="70" y="66" text-anchor="middle" class="rc-dtot">' + total + '</text>' +
      '<text x="70" y="84" text-anchor="middle" class="rc-dlab">total</text></svg><div class="rc-legend">' + legend + '</div></div>';
  }

  function line(series){
    var mx = Math.max.apply(null, series.map(function(s){ return s[1]; })) || 1;
    var W = 300, H = 90, n = series.length;
    var pts = series.map(function(s, i){ var x = n > 1 ? (i / (n - 1)) * (W - 20) + 10 : W / 2; var y = H - 12 - (s[1] / mx) * (H - 24); return [x, y]; });
    var poly = pts.map(function(p){ return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
    var dots = pts.map(function(p){ return '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3" fill="' + PALETTE[0] + '"></circle>'; }).join('');
    var labs = series.map(function(s, i){ return '<span class="rc-lx">' + esc(s[0]) + '</span>'; }).join('');
    return '<div class="rc-line"><svg viewBox="0 0 ' + W + ' ' + H + '"><polyline points="' + poly + '" fill="none" stroke="' + PALETTE[0] + '" stroke-width="2"></polyline>' + dots + '</svg><div class="rc-lxs">' + labs + '</div></div>';
  }

  function render(host, spec){
    if (!host) return;
    if (!spec || !spec.series || !spec.series.length){ host.innerHTML = ''; return; }
    var body = spec.type === 'funnel' ? funnel(spec.series)
      : spec.type === 'donut' ? donut(spec.series)
        : spec.type === 'line' ? line(spec.series)
          : bar(spec.series);
    host.innerHTML = '<div class="reportchart"><h4>' + esc(spec.label || '') + ' <span class="rc-type">' + esc(spec.type || 'bar') + '</span></h4>' + body + '</div>';
  }

  root.ReportChart = { render: render, PALETTE: PALETTE };
})(window);
