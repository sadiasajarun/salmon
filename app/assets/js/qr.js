/* ============================================================================
 * Salmon Developers — tiny dependency-free QR encoder (byte mode, ECC level M)
 * ----------------------------------------------------------------------------
 * No CDN, no library — a compact spec (ISO/IEC 18004) implementation good for
 * short URLs (versions 1–6 ≈ up to ~100 bytes at ECC-M). Returns a boolean
 * module matrix the business card renders on <canvas>. Level M = 15% recovery,
 * so the code survives being re-compressed when shared as a PNG over WhatsApp.
 *
 * QR.encode(text) -> { size:Number, modules:[[bool]] }   (throws if text too long)
 * ==========================================================================*/
(function (root) {
  'use strict';

  /* ---- Galois field GF(256), primitive 0x11d ---- */
  var EXP = new Array(512), LOG = new Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
    for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();
  function gmul(a, b) { return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]]; }

  /* ---- Reed-Solomon: generator poly of degree n, then EC codewords ---- */
  function rsGen(n) {
    var g = [1];
    for (var i = 0; i < n; i++) {
      var ng = new Array(g.length + 1).fill(0);
      for (var j = 0; j < g.length; j++) { ng[j] ^= g[j]; ng[j + 1] ^= gmul(g[j], EXP[i]); }
      g = ng;
    }
    return g;
  }
  function rsEncode(data, ecLen) {
    var gen = rsGen(ecLen), res = data.concat(new Array(ecLen).fill(0));
    for (var i = 0; i < data.length; i++) {
      var factor = res[i]; if (factor === 0) continue;
      for (var j = 0; j < gen.length; j++) res[i + j] ^= gmul(gen[j], factor);
    }
    return res.slice(data.length);
  }

  /* ---- per-version tables (ECC level M), versions 1–6 ---- */
  //  version: [ ecPerBlock, blocks:[[count, dataPerBlock],...], remainderBits, alignPositions ]
  var VER = {
    1: [10, [[1, 16]], 0, []],
    2: [16, [[1, 28]], 7, [6, 18]],
    3: [26, [[1, 44]], 7, [6, 22]],
    4: [18, [[2, 32]], 7, [6, 26]],
    5: [24, [[2, 43]], 7, [6, 30]],
    6: [16, [[4, 27]], 7, [6, 34]]
  };
  function dataCapacity(v) { var b = VER[v][1], n = 0; b.forEach(function (x) { n += x[0] * x[1]; }); return n; }

  /* ---- build the data bit-stream (byte mode) ---- */
  function bytesOf(text) { return Array.from(new TextEncoder().encode(text)); }
  function chooseVersion(len) {
    for (var v = 1; v <= 6; v++) { var bits = 4 + 8 + len * 8; if (dataCapacity(v) * 8 >= bits) return v; }
    throw new Error('QR: text too long for versions 1–6 (' + len + ' bytes)');
  }
  function buildData(bytes, v) {
    var cap = dataCapacity(v) * 8, bits = [];
    function push(val, n) { for (var i = n - 1; i >= 0; i--) bits.push((val >> i) & 1); }
    push(0x4, 4);            // byte mode
    push(bytes.length, 8);   // char count (8 bits for v1–9)
    bytes.forEach(function (b) { push(b, 8); });
    // terminator (up to 4 zero bits)
    for (var i = 0; i < 4 && bits.length < cap; i++) bits.push(0);
    // pad to byte boundary
    while (bits.length % 8 !== 0) bits.push(0);
    // pad codewords 0xEC / 0x11
    var pads = [0xEC, 0x11], pi = 0;
    while (bits.length < cap) { push(pads[pi], 8); pi ^= 1; }
    // to codewords
    var cw = []; for (i = 0; i < bits.length; i += 8) { var b = 0; for (var j = 0; j < 8; j++) b = (b << 1) | bits[i + j]; cw.push(b); }
    return cw;
  }

  /* ---- split into blocks, RS each, interleave data then EC ---- */
  function assembleCodewords(dataCw, v) {
    var ecLen = VER[v][0], blockDefs = VER[v][1];
    var dblocks = [], eblocks = [], p = 0;
    blockDefs.forEach(function (def) {
      for (var k = 0; k < def[0]; k++) {
        var d = dataCw.slice(p, p + def[1]); p += def[1];
        dblocks.push(d); eblocks.push(rsEncode(d, ecLen));
      }
    });
    var maxD = Math.max.apply(null, dblocks.map(function (b) { return b.length; }));
    var out = [];
    for (var i = 0; i < maxD; i++) dblocks.forEach(function (b) { if (i < b.length) out.push(b[i]); });
    for (i = 0; i < ecLen; i++) eblocks.forEach(function (b) { out.push(b[i]); });
    return out;
  }

  /* ---- matrix construction ---- */
  function newMatrix(size) { var m = []; for (var i = 0; i < size; i++) { m.push(new Array(size).fill(null)); } return m; }
  function isFn(fn, r, c) { return fn[r][c]; }
  function placeFinder(m, fn, r, c) {
    for (var dr = -1; dr <= 7; dr++) for (var dc = -1; dc <= 7; dc++) {
      var rr = r + dr, cc = c + dc; if (rr < 0 || cc < 0 || rr >= m.length || cc >= m.length) continue;
      var inRing = (dr >= 0 && dr <= 6 && (dc === 0 || dc === 6)) || (dc >= 0 && dc <= 6 && (dr === 0 || dr === 6));
      var inCore = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
      m[rr][cc] = (inRing || inCore); fn[rr][cc] = true;
    }
  }
  function placeAlignment(m, fn, positions) {
    var n = positions.length;
    for (var a = 0; a < n; a++) for (var b = 0; b < n; b++) {
      // skip the three that overlap finder patterns
      var corner = (a === 0 && b === 0) || (a === 0 && b === n - 1) || (a === n - 1 && b === 0);
      if (corner) continue;
      var r = positions[a], c = positions[b];
      for (var dr = -2; dr <= 2; dr++) for (var dc = -2; dc <= 2; dc++) {
        var edge = Math.max(Math.abs(dr), Math.abs(dc));
        m[r + dr][c + dc] = (edge !== 1); fn[r + dr][c + dc] = true;
      }
    }
  }
  function reserveFormat(m, fn) {
    var size = m.length;
    for (var i = 0; i < 9; i++) { if (!isFn(fn, 8, i)) fn[8][i] = true; if (!isFn(fn, i, 8)) fn[i][8] = true; }
    for (i = 0; i < 8; i++) { fn[8][size - 1 - i] = true; fn[size - 1 - i][8] = true; }
  }

  /* ---- format info (ECC level M = 0b00) with BCH + mask 0x5412 ---- */
  function formatBits(mask) {
    var data = (0x0 << 3) | mask;           // ecLevel M = 00, then 3-bit mask
    var rem = data << 10;
    for (var i = 14; i >= 10; i--) if ((rem >> i) & 1) rem ^= 0x537 << (i - 10);
    return ((data << 10) | rem) ^ 0x5412;
  }
  function placeFormat(m, mask) {
    var size = m.length, bits = formatBits(mask);
    function bit(i) { return (bits >> i) & 1; }
    // around top-left
    for (var i = 0; i <= 5; i++) m[8][i] = !!bit(i);
    m[8][7] = !!bit(6); m[8][8] = !!bit(7); m[7][8] = !!bit(8);
    for (i = 9; i <= 14; i++) m[14 - i][8] = !!bit(i);
    // around top-right / bottom-left + dark module
    for (i = 0; i <= 7; i++) m[size - 1 - i][8] = !!bit(i);
    for (i = 8; i <= 14; i++) m[8][size - 15 + i] = !!bit(i);
    m[size - 8][8] = true; // dark module
  }

  /* ---- data placement (zigzag) ---- */
  function placeData(m, fn, codewords) {
    var size = m.length, bits = [];
    codewords.forEach(function (cw) { for (var i = 7; i >= 0; i--) bits.push((cw >> i) & 1); });
    var bi = 0, up = true;
    for (var col = size - 1; col > 0; col -= 2) {
      if (col === 6) col--; // skip timing column
      for (var t = 0; t < size; t++) {
        var row = up ? size - 1 - t : t;
        for (var c = 0; c < 2; c++) {
          var cc = col - c;
          if (isFn(fn, row, cc)) continue;
          m[row][cc] = bi < bits.length ? !!bits[bi++] : false;
        }
      }
      up = !up;
    }
  }

  /* ---- masking ---- */
  function maskFn(k, r, c) {
    switch (k) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return (r * c) % 2 + (r * c) % 3 === 0;
      case 6: return ((r * c) % 2 + (r * c) % 3) % 2 === 0;
      case 7: return ((r + c) % 2 + (r * c) % 3) % 2 === 0;
    }
  }
  function applyMask(m, fn, k) {
    for (var r = 0; r < m.length; r++) for (var c = 0; c < m.length; c++) if (!isFn(fn, r, c) && maskFn(k, r, c)) m[r][c] = !m[r][c];
  }
  function penalty(m) {
    var size = m.length, score = 0, r, c, i;
    // rule 1: runs of >=5 same colour (rows + cols)
    function runs(getter) {
      for (r = 0; r < size; r++) { var last = null, len = 0; for (c = 0; c < size; c++) { var v = getter(r, c); if (v === last) { len++; if (len === 5) score += 3; else if (len > 5) score += 1; } else { last = v; len = 1; } } }
    }
    runs(function (a, b) { return m[a][b]; });
    runs(function (a, b) { return m[b][a]; });
    // rule 2: 2x2 blocks
    for (r = 0; r < size - 1; r++) for (c = 0; c < size - 1; c++) { var v = m[r][c]; if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) score += 3; }
    // rule 3: finder-like 1011101 patterns with 4 light on a side
    var pat1 = [true, false, true, true, true, false, true, false, false, false, false];
    var pat2 = [false, false, false, false, true, false, true, true, true, false, true];
    function look(getter) {
      for (r = 0; r < size; r++) for (c = 0; c <= size - 11; c++) {
        var ok1 = true, ok2 = true;
        for (i = 0; i < 11; i++) { var v = getter(r, c + i); if (v !== pat1[i]) ok1 = false; if (v !== pat2[i]) ok2 = false; }
        if (ok1 || ok2) score += 40;
      }
    }
    look(function (a, b) { return m[a][b]; });
    look(function (a, b) { return m[b][a]; });
    // rule 4: dark proportion
    var dark = 0; for (r = 0; r < size; r++) for (c = 0; c < size; c++) if (m[r][c]) dark++;
    var pct = dark * 100 / (size * size); score += Math.floor(Math.abs(pct - 50) / 5) * 10;
    return score;
  }

  function timing(m, fn) {
    for (var i = 8; i < m.length - 8; i++) { if (fn[6][i] === true) continue; m[6][i] = (i % 2 === 0); fn[6][i] = true; m[i][6] = (i % 2 === 0); fn[i][6] = true; }
  }

  function encode(text) {
    var bytes = bytesOf(text), v = chooseVersion(bytes.length), size = 17 + 4 * v;
    var dataCw = buildData(bytes, v);
    var all = assembleCodewords(dataCw, v);
    var m = newMatrix(size), fn = newMatrix(size).map(function (row) { return row.map(function () { return false; }); });
    placeFinder(m, fn, 0, 0); placeFinder(m, fn, 0, size - 7); placeFinder(m, fn, size - 7, 0);
    // separators are implicitly light (finder placement filled -1 ring as false already for in-bounds)
    timing(m, fn);
    placeAlignment(m, fn, VER[v][3]);
    fn[size - 8][8] = true; m[size - 8][8] = true; // dark module reserved
    reserveFormat(m, fn);
    placeData(m, fn, all);
    // choose best mask
    var best = 0, bestScore = Infinity, bestM = null;
    for (var k = 0; k < 8; k++) {
      var mm = m.map(function (row) { return row.slice(); });
      applyMask(mm, fn, k); placeFormat(mm, k);
      var s = penalty(mm); if (s < bestScore) { bestScore = s; best = k; bestM = mm; }
    }
    // normalise nulls to false
    for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) if (bestM[r][c] === null) bestM[r][c] = false;
    return { size: size, version: v, modules: bestM };
  }

  root.QR = { encode: encode, dataCapacity: dataCapacity };
})(window);
