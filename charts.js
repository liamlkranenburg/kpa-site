/* KPA interactive charts. No libraries, no build step, ES5 syntax.
   Usage: <div class="ichart" data-spec="/chart-specs/load-bearing/fig1.json"></div>
   Optional: data-head="none" hides the title block (when the page already captions the figure).
   Spec format: see the "spec" notes at the bottom of this file. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var PAL = { copper: '#B8692E', delft: '#1F3A68', mid: '#4E6A93', grey: '#5C6370', wash: '#DCE4EF', ink: '#1B1F24' };
  var INK = '#1B1F24', MUTED = '#5C6370', GRID = '#E1E6ED', ZERO = '#8A939E';
  var FONT = 'Montserrat, "Helvetica Neue", Arial, sans-serif';
  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var hosts = [];

  function fill(c) { return PAL[c] || PAL.delft; }
  function ink(c) { return c === 'copper' ? '#A35A24' : c === 'wash' ? MUTED : (PAL[c] || INK); } // small copper text uses copper-text
  function each(a, f) { for (var i = 0; a && i < a.length; i++) f(a[i], i); }
  function max(a) { var m = 0; each(a, function (v) { if (v > m) m = v; }); return m; }
  function has(a, i) { return !!a && a.indexOf(i) >= 0; }
  function clean(x) { return Number(Number(x).toPrecision(12)); }
  function lin(d0, d1, r0, r1) { return function (v) { return r0 + (v - d0) / (d1 - d0) * (r1 - r0); }; }

  var mctx = document.createElement('canvas').getContext('2d');
  function tw(s, size, bold) {
    mctx.font = (bold ? '700 ' : '400 ') + (size || 12) + 'px ' + FONT;
    var w = 0; each(String(s).split('\n'), function (l) { w = Math.max(w, mctx.measureText(l).width); });
    return Math.ceil(w);
  }
  function nl(s) { return String(s).split('\n').length; }

  function mk(tag, a, p) {
    var n = document.createElementNS(NS, tag);
    for (var k in a) if (a.hasOwnProperty(k) && a[k] != null) n.setAttribute(k, a[k]);
    if (p) p.appendChild(n);
    return n;
  }
  // Text with \n breaks. o: size, bold, color, anchor, v ('base' | 'mid' | 'top' | 'bottom').
  function txt(p, x, y, s, o) {
    o = o || {};
    var size = o.size || 12, lines = String(s).split('\n'), lh = size * 1.2;
    var t = mk('text', { x: x, y: y, 'font-size': size, 'font-weight': o.bold ? 700 : 400, fill: o.color || MUTED, 'text-anchor': o.anchor || 'start' }, p);
    if (o.halo) { t.setAttribute('stroke', '#fff'); t.setAttribute('stroke-width', 4); t.setAttribute('stroke-linejoin', 'round'); t.setAttribute('paint-order', 'stroke'); }
    var off = o.v === 'mid' ? -(lines.length - 1) * lh / 2 + size * 0.36 : o.v === 'top' ? size * 0.8 : o.v === 'bottom' ? -(lines.length - 1) * lh : 0;
    each(lines, function (l, i) { mk('tspan', { x: x, y: y + off + i * lh }, t).textContent = l; });
    return t;
  }

  // Number formatting: f = {decimals, scale, prefix, suffix, sign, thousands}. Unset decimals = as many as the data has.
  function fmt(v, f, units) {
    if (v == null || v === '' || isNaN(v)) return 'n/a';
    f = f || {};
    var x = clean(v * (f.scale || 1));
    var d = f.decimals != null ? f.decimals : Math.min(3, (String(x).split('.')[1] || '').length);
    if (x === 0 && f.zero != null) return f.zero;
    var p = Math.pow(10, d), a = clean(Math.abs(x) * p), r = Math.floor(a);
    if (a - r > 0.5 || (a - r === 0.5 && r % 2)) r++;               // round half to even
    var s = (r / p).toFixed(d).split('.');
    if (f.thousands !== false && s[0].length > 3) s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    var sign = x < 0 && Number(s.join('.')) !== 0 ? '−' : (f.sign && x > 0 ? '+' : '');
    var suf = f.suffix != null ? f.suffix : (units ? ' ' + units : '');
    return sign + (f.prefix || '') + s.join('.') + suf;
  }
  function bare(f) { var o = {}; for (var k in f) o[k] = f[k]; if (o.suffix == null) o.suffix = ''; return o; }
  function val(s, i) { var v = s.values[i]; return v == null ? null : clean(v * (s.scale || 1)); }

  function ticks(ax) {
    if (ax.ticks) return ax.ticks;
    var span = ax.max - ax.min, raw = span / 5, p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), st = p, m = [1, 2, 2.5, 5, 10];
    for (var i = 0; i < m.length; i++) { st = m[i] * p; if (st >= raw) break; }
    var out = []; for (var v = Math.ceil(ax.min / st) * st; v <= ax.max + st * 1e-9; v += st) out.push(clean(v));
    return out;
  }
  function aspect(S, narrow) { return narrow ? (S.aspectNarrow || Math.min(S.aspect || 2, 1.3)) : (S.aspect || 2); }

  // Key row: series names as coloured words above the plot (no legend boxes).
  function keyLayout(S, W, items) {
    var x = 0, y = 0, out = [];
    each(items, function (it) {
      var w = tw(it.text, 12, true);
      if (x > 0 && x + w > W) { x = 0; y += 18; }
      out.push({ x: x, y: y, text: it.text, color: it.color }); x += w + 18;
    });
    return { items: out, h: items.length ? y + 26 : 0 };
  }
  function drawKey(g, k, x0, y0) { each(k.items, function (it) { txt(g, x0 + it.x, y0 + it.y + 13, it.text, { bold: true, color: ink(it.color) }); }); }
  function keyItems(S) {
    if (S.key) return S.key;
    var out = [];
    each(S.series, function (s) { out.push({ text: s.label || s.name, color: s.color }); });
    each(S.markers, function (mk_) { if (mk_.label) out.push({ text: mk_.label, color: mk_.color }); });
    return out;
  }

  // Horizontal gridlines and value labels for a vertical value axis.
  function yAxis(g, ax, y, x0, x1, tl) {
    each(ticks(ax), function (t) {
      mk('line', { x1: x0, x2: x1, y1: y(t), y2: y(t), stroke: t === 0 ? ZERO : GRID, 'stroke-width': t === 0 ? 1 : 1 }, g);
      txt(g, x0 - 8, y(t), fmt(t, bare(ax.fmt || {})), { anchor: 'end', v: 'mid' });
    });
    if (ax.title) txt(g, x0 - tl - 8, y(ticks(ax)[ticks(ax).length - 1]) - 16, ax.title, { size: 11 });
  }
  function tickW(ax) { var w = 0; each(ticks(ax), function (t) { w = Math.max(w, tw(fmt(t, bare(ax.fmt || {})), 12)); }); return w; }

  function note(g, n, px, py, W) {
    if (n.minWidth && W < n.minWidth) return;
    txt(g, px + (n.dx || 0), py + (n.dy || 0), n.text, { size: n.size || 12, bold: n.bold !== false, color: n.color === 'white' ? '#fff' : ink(n.color || 'grey'), anchor: n.anchor || 'start', v: n.v || 'mid' });
  }
  function refLabelPos(r, x0, x1) { return r.at === 'right' ? { x: x1, a: 'end' } : { x: x0 + 2, a: 'start' }; }

  /* ---------- line chart (optional lower bar panel sharing the x axis) ---------- */
  function drawLine(S, W, narrow, G) {
    var X = S.x, xs = X.values, n = xs.length, low = S.lower, stops = [];
    var endW = 0; each(S.series, function (s) { if (s.label) endW = Math.max(endW, tw(s.label, 12, true)); });
    var tl = Math.max(tickW(S.y), low ? tickW(low.y) : 0);
    var m = { t: S.y.title ? 28 : 12, r: endW ? endW + 14 : 16, l: tl + 10, b: 28 };
    var H = Math.round(W / aspect(S, narrow)), bottom = H - m.b, x1 = W - m.r;
    var uH = low ? (bottom - m.t - 34) * (low.ratio || 0.6) : bottom - m.t;
    var x = lin(X.min != null ? X.min : xs[0], X.max != null ? X.max : xs[n - 1], m.l, x1), y = lin(S.y.min, S.y.max, m.t + uH, m.t);
    each(S.bands, function (b) {
      mk('rect', { x: x(b.from), y: m.t, width: x(b.to) - x(b.from), height: uH, fill: PAL.wash, opacity: 0.55 }, G.grid);
      if (b.label) note(G.lab, { text: b.label, anchor: b.anchor || 'end', color: 'grey', size: 11, minWidth: b.minWidth, v: 'base' }, b.anchor === 'start' ? x(b.from) + 4 : x(b.from) - 6, m.t + 12, W);
    });
    yAxis(G.grid, S.y, y, m.l, x1, tl);
    var y2, lt = m.t + uH + 34;
    if (low) {
      y2 = lin(low.y.min, low.y.max, bottom, lt);
      yAxis(G.grid, low.y, y2, m.l, x1, tl);
      var bw = Math.max(1, (x1 - m.l) / n * 0.8);
      each(low.series.values, function (v, i) {
        if (v == null) return; var vv = clean(v * (low.series.scale || 1)), c = vv >= 0 ? low.series.color : low.series.colorNeg;
        var r = mk('rect', { x: x(xs[i]) - bw / 2, y: Math.min(y2(0), y2(vv)), width: bw, height: Math.abs(y2(vv) - y2(0)), fill: fill(c), 'class': 'ichart-bar ichart-by' }, G.marks);
        r.style.transformOrigin = 'center ' + (vv >= 0 ? 'bottom' : 'top');
      });
      each(low.notes, function (nn) { note(G.lab, nn, x(nn.x), y2(nn.y), W); });
    }
    // x ticks, thinned until labels stop colliding
    var tv = X.ticks || xs, tlab = X.tickLabels || tv, step = 1, gap = (x1 - m.l) / Math.max(1, tv.length - 1);
    while (step < tv.length && max(tlab.map(function (s) { return tw(s, 12); })) + 8 > gap * step) step++;
    for (var i = 0; i < tv.length; i += step) txt(G.lab, x(tv[i]), bottom + 18, tlab[i], { anchor: 'middle' });
    each(S.series, function (s) {
      var segs = [], f = s.forecastFrom, d = '', dd = '';
      for (var i = 0; i < n; i++) {
        var v = val(s, i); if (v == null) continue;
        var pt = x(xs[i]).toFixed(1) + ',' + y(v).toFixed(1);
        if (f == null || i <= f) d += (d ? 'L' : 'M') + pt;
        if (f != null && i >= f) dd += (dd ? 'L' : 'M') + pt;
      }
      var sw = narrow ? 2.25 : 2.75;
      mk('path', { d: d, fill: 'none', stroke: fill(s.color), 'stroke-width': sw, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', pathLength: 1, 'class': 'ichart-line' }, G.marks);
      if (dd) mk('path', { d: dd, fill: 'none', stroke: fill(s.color), 'stroke-width': sw, 'stroke-dasharray': '5 4', 'class': 'ichart-fade' }, G.marks);
      if (s.label) { var li = n - 1; while (val(s, li) == null) li--; txt(G.lab, x(xs[li]) + 8, y(val(s, li)), s.label, { bold: true, color: ink(s.color), v: 'mid' }); }
    });
    each(S.refs, function (r) {
      var a = x(r.from != null ? r.from : xs[0]), b = r.to != null ? x(r.to) : x1, p = refLabelPos(r, a, b);
      mk('line', { x1: a, x2: b, y1: y(r.value), y2: y(r.value), stroke: fill(r.color || 'grey'), 'stroke-width': 1.5, 'stroke-dasharray': r.dash || '4 3' }, G.marks);
      if (r.label && !(r.minWidth && W < r.minWidth)) txt(G.lab, r.labelX != null ? x(r.labelX) : p.x, y(r.value) - 6, r.label, { bold: true, color: ink(r.color || 'grey'), anchor: r.anchor || p.a, size: narrow ? 11 : 12 });
    });
    each(S.notes, function (nn) { var o = narrow && nn.narrow ? merge(nn, nn.narrow) : nn; note(G.lab, o, x(o.x), y(o.y), W); });
    for (i = 0; i < n; i++) {
      var dots = [], rows = [], top = bottom;
      each(S.series, function (s) {
        var v = val(s, i); if (v == null) return;
        dots.push({ x: x(xs[i]), y: y(v), c: s.color }); top = Math.min(top, y(v));
        rows.push({ name: s.name + (s.forecastFrom != null && i > s.forecastFrom ? ' (' + (s.forecastLabel || 'forecast') + ')' : ''), value: fmt(v, s.fmt || S.fmt, S.units), color: s.color });
      });
      if (low) { var lv = low.series.values[i]; rows.push({ name: low.series.name, value: fmt(lv == null ? null : clean(lv * (low.series.scale || 1)), low.series.fmt || S.fmt, low.units || S.units), color: lv >= 0 ? low.series.color : low.series.colorNeg }); }
      stops.push({ cx: x(xs[i]), cy: top, vline: [m.t, low ? bottom : m.t + uH], dots: dots, head: X.labels ? X.labels[i] : String(xs[i]), rows: rows });
    }
    return { h: H, stops: stops, mode: 'x' };
  }
  function merge(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }

  /* ---------- bar, grouped bar and stacked bar, vertical or horizontal ---------- */
  function drawBars(S, W, narrow, G) {
    var cats = S.categories, n = cats.length, ser = S.series, k = ser.length, stacked = S.type === 'stacked', grouped = !stacked && k > 1;
    var hz = !!S.horizontal, VA = hz ? S.x : S.y, stops = [], i, j;
    var lfmt = function (s) { return s.labelFmt || S.labelFmt || bare(s.fmt || S.fmt || {}); };
    var showVals = function (s) { return s.valueLabels != null ? s.valueLabels : !stacked; };
    var total = function (i) { if (S.totals && S.totals.length) return S.totals[i]; var t = 0; each(ser, function (s) { t += val(s, i) || 0; }); return clean(t); };
    var colorOf = function (s, i) { return s.colors ? s.colors[i] : has(S.highlight, i) ? 'copper' : s.color; };
    var present = function (i) { return ser.filter(function (s) { return !S.compact || val(s, i) != null; }); };
    var endLab = stacked && S.endLabels && !narrow && !hz;
    var kItems = (grouped || stacked || S.key) && !endLab ? keyItems(S) : [];
    var key = keyLayout(S, W, kItems), bars = [];
    var rect = function (xx, yy, w, h, c, origin) {
      var r = mk('rect', { x: xx, y: yy, width: Math.max(0, w), height: Math.max(0, h), fill: fill(c), 'class': 'ichart-bar ' + (origin.indexOf('left') === 0 ? 'ichart-bx' : 'ichart-by') }, G.marks);
      r.style.transformOrigin = origin; return r;
    };
    var tip = function (i) {
      var rows = [];
      each(ser, function (s) {
        var v = val(s, i); if (v == null) return;
        rows.push({ name: s.name, value: fmt(v, s.fmt || S.fmt, S.units), color: colorOf(s, i) });
        if (s.extra) rows.push({ name: s.extra.name, value: fmt(s.extra.values[i], s.extra.fmt, s.extra.units) });
      });
      if (stacked && S.totals !== false) rows.push({ name: S.totalName || 'Total', value: fmt(total(i), S.fmt, S.units), bold: true });
      each(S.markers, function (mm) { if (mm.values[i] != null) rows.push({ name: mm.name, value: fmt(mm.values[i], mm.fmt || S.fmt, mm.units || S.units), color: mm.color }); });
      if (S.rowBelow) rows.push({ name: S.rowBelow.name || S.rowBelow.label, value: fmt(S.rowBelow.values[i], S.rowBelow.fmt, S.rowBelow.units) });
      if (S.categoryNotes && S.categoryNotes[i]) rows.push({ name: S.categoryNotes[i] });
      return rows;
    };
    var catName = function (i) { return String(cats[i]).replace(/\s*\n\s*/g, ' '); };

    if (!hz) {
      var labs = narrow && S.categoriesShort ? S.categoriesShort : cats;
      var tl = tickW(VA), rb = S.rowBelow, rbW = rb && !narrow ? tw(rb.label, 12) : 0;
      var endW = 0; if (endLab) each(ser, function (s) { endW = Math.max(endW, tw(s.label || s.name, 12, true)); });
      var lines = max(labs.map(nl));
      var m = { t: 12 + key.h + (VA.title ? 20 : 4), l: Math.max(tl, rbW) + 12, r: endLab ? endW + 18 : 10, b: 10 + lines * 15 + (rb ? (narrow ? 44 : 24) : 0) };
      var H = Math.round(W / aspect(S, narrow)), bot = H - m.b, x1 = W - m.r, pw = x1 - m.l, band = pw / n, bw = band * (S.barWidth || 0.62);
      var y = lin(VA.min, VA.max, bot, m.t);
      drawKey(G.lab, key, 0, 4);
      yAxis(G.grid, VA, y, m.l, x1, tl);
      var xlw = max(labs.map(function (s) { return tw(s, 12); })), lstep = 1;
      while (xlw + 6 > band * lstep && lstep < n) lstep++;
      for (i = 0; i < n; i++) {
        var bx = m.l + i * band + (band - bw) / 2, cx = m.l + (i + 0.5) * band, ps = present(i), base = 0, topY = bot;
        if (i % lstep === 0) txt(G.lab, cx, bot + 17, labs[i], { anchor: 'middle', color: INK });
        each(stacked ? ser : ps, function (s, jj) {
          var v = val(s, i); if (v == null) return;
          var w = stacked || !grouped ? bw : bw / ps.length, xx = stacked || !grouped ? bx : bx + jj * w, y0 = stacked ? base : 0, y1 = y0 + v;
          rect(xx + (grouped ? 1 : 0), Math.min(y(y0), y(y1)), w - (grouped ? 2 : 0), Math.abs(y(y1) - y(y0)), colorOf(s, i), 'center ' + (v >= 0 ? 'bottom' : 'top'));
          topY = Math.min(topY, y(y1));
          if (stacked) base = y1;
          var lt = fmt(v, lfmt(s)), fits = tw(lt, 12, true) <= (grouped ? w + 10 : narrow ? band - 3 : band * 1.05);
          if (showVals(s) && (fits || has(S.keyLabels, i)) && (!S.labelOnly || has(S.labelOnly, i))) txt(G.lab, xx + w / 2, v >= 0 ? y(y1) - 6 : y(y1) + 16, lt, { anchor: 'middle', bold: true, color: s.labelColor ? ink(s.labelColor) : (has(S.highlight, i) || (s.colors && s.colors[i] === 'copper') ? ink('copper') : INK), size: grouped ? 11 : 12, halo: true });
          if (endLab && i === n - 1) txt(G.lab, bx + bw + 8, (y(y0) + y(y1)) / 2, (s.label || s.name), { bold: true, color: ink(s.color), v: 'mid' });
        });
        if (stacked && S.totals !== false) { var tt = fmt(total(i), S.totalFmt || bare(S.fmt || {})); if (tw(tt, 12, true) <= band * 1.05 || has(S.keyLabels, i)) txt(G.lab, cx, topY - 6, tt, { anchor: 'middle', bold: true, color: INK, halo: true }); }
        each(S.markers, function (mm) {
          var v = mm.values[i]; if (v == null) return;
          mk('line', { x1: bx - 2, x2: bx + bw + 2, y1: y(v), y2: y(v), stroke: fill(mm.color), 'stroke-width': 3.5 }, G.marks);
        });
        if (rb) {
          var hi = rb.highlight && rb.highlight.index === i;
          txt(G.lab, cx, bot + 17 + lines * 15 + 8, fmt(rb.values[i], rb.fmt), { anchor: 'middle', bold: hi, color: hi ? ink(rb.highlight.color) : MUTED, size: narrow ? 11 : 12 });
        }
        stops.push({ cx: cx, cy: topY, band: { x: m.l + i * band, y: m.t, w: band, h: bot - m.t }, head: catName(i), rows: tip(i) });
      }
      if (rb) narrow ? txt(G.lab, m.l, bot + 17 + lines * 15 + 30, rb.label + (rb.narrowHint || ''), { size: 11 }) : txt(G.lab, m.l - 12, bot + 17 + lines * 15 + 8, rb.label, { anchor: 'end' });
      each(S.refs, function (r) {
        var p = refLabelPos(r, m.l, x1);
        mk('line', { x1: m.l, x2: x1, y1: y(r.value), y2: y(r.value), stroke: fill(r.color || 'grey'), 'stroke-width': 1.5, 'stroke-dasharray': r.dash || '4 3' }, G.marks);
        var ai = narrow && r.atIndexNarrow != null ? r.atIndexNarrow : r.atIndex;
        if (r.label) txt(G.lab, ai != null ? m.l + ai * band + 6 : p.x, y(r.value) - 6, narrow && r.labelNarrow ? r.labelNarrow : r.label, { bold: true, color: ink(r.color || 'grey'), anchor: ai != null ? 'start' : p.a, size: narrow ? 11 : 12, v: 'bottom', halo: true });
      });
      each(S.notes, function (nn) { var o = narrow && nn.narrow ? merge(nn, nn.narrow) : nn; note(G.lab, o, m.l + (o.i + 0.5) * band, y(o.v), W); });
      return { h: H, stops: stops, mode: 'x' };
    }

    // horizontal: categories down the side, value axis along the bottom
    var lw = max(cats.map(function (s) { return tw(s, 12); })) + 14, above = narrow || lw > W * 0.4;
    key = keyLayout(S, above ? W : W - lw, kItems);
    var ends = [];
    for (i = 0; i < n; i++) {
      var e = [];
      if (stacked) e.push(S.totals === false ? '' : fmt(total(i), S.totalFmt || bare(S.fmt || {})));
      else each(ser, function (s) { var v = val(s, i); e.push(v == null || !showVals(s) ? '' : fmt(v, lfmt(s)) + (s.extra ? '  ·  ' + fmt(s.extra.values[i], s.extra.fmt, s.extra.units) : '')); });
      ends.push(e);
    }
    var rw = 0; each(ends, function (e) { each(e, function (t) { rw = Math.max(rw, tw(t, grouped ? 11 : 12, true)); }); });
    var hm = { t: 6 + key.h, l: above ? 0 : lw, r: rw + 12, b: 28 }, cur = hm.t, rows = [];
    var bh = grouped ? k * 13 : (S.barHeight || 22), gapR = S.rowGap || (above ? 14 : 10);
    for (i = 0; i < n; i++) {
      var g0 = null; each(S.groups, function (g) { if (g.from === i) g0 = g; });
      if (g0) { rows.push({ head: g0.label, y: cur + (i ? 22 : 14) }); cur += i ? 30 : 22; }
      var r0 = cur; if (above) cur += 18;
      rows.push({ i: i, top: r0, bar: cur }); cur += bh + gapR;
    }
    var hH = cur + hm.b - gapR + 6, xr = lin(VA.min, VA.max, hm.l, W - hm.r), z = xr(Math.max(0, VA.min));
    drawKey(G.lab, key, hm.l, 2);
    each(ticks(VA), function (t) { txt(G.lab, xr(t), hH - 8, fmt(t, bare(VA.fmt || {})), { anchor: 'middle' }); });
    if (!above) mk('line', { x1: z, x2: z, y1: hm.t, y2: hH - hm.b + 4, stroke: ZERO, 'stroke-width': 1 }, G.grid);
    each(rows, function (r) {
      if (r.head) { txt(G.lab, 0, r.y, r.head, { bold: true, color: INK, size: 12 }); return; }
      var i = r.i, base = 0, ex = z, ind = has(S.indent, i) ? 12 : 0;
      if (above) mk('line', { x1: z, x2: z, y1: r.bar - 3, y2: r.bar + bh + 3, stroke: ZERO, 'stroke-width': 1 }, G.grid);
      txt(G.lab, above ? ind : hm.l - 10, above ? r.top + 12 : r.bar + bh / 2, cats[i], { anchor: above ? 'start' : 'end', v: above ? 'base' : 'mid', color: INK, bold: has(S.bold, i) });
      each(ser, function (s, j) {
        var v = val(s, i); if (v == null) return;
        var hh = grouped ? 12 : bh, yy = grouped ? r.bar + j * 13 : r.bar, x0 = stacked ? base : 0, xe = x0 + v;
        rect(xr(Math.min(x0, xe)), yy, Math.abs(xr(xe) - xr(x0)), hh, colorOf(s, i), 'left center');
        if (stacked) {
          var st = fmt(v, lfmt(s));
          if (S.segmentLabels && v >= (S.segmentMin || 0) && tw(st, 11, true) + 10 <= xr(xe) - xr(x0)) txt(G.lab, (xr(x0) + xr(xe)) / 2, yy + hh / 2, st, { anchor: 'middle', v: 'mid', bold: true, color: '#fff', size: 11 });
          base = xe;
        } else if (ends[i][j]) txt(G.lab, xr(xe) + 6, yy + hh / 2, ends[i][j], { v: 'mid', bold: true, color: ink(colorOf(s, i)), size: grouped ? 11 : 12, halo: true });
        ex = Math.max(ex, xr(xe));
      });
      if (stacked && ends[i][0]) txt(G.lab, ex + 6, r.bar + bh / 2, ends[i][0], { v: 'mid', bold: true, color: INK });
      each(S.markers, function (mm) {
        var v = mm.values[i]; if (v == null) return;
        mk('line', { x1: xr(v), x2: xr(v), y1: r.bar - 4, y2: r.bar + bh + 4, stroke: fill(mm.color), 'stroke-width': 3 }, G.marks);
      });
      stops.push({ cx: ex, cy: r.top, band: { x: 0, y: r.top - 4, w: W, h: r.bar + bh - r.top + 8 }, head: catName(i), rows: tip(i) });
    });
    each(S.refs, function (r) {
      var segs = above ? rows.filter(function (q) { return q.i != null; }).map(function (q) { return [q.bar - 4, q.bar + bh + 4]; }) : [[hm.t, hH - hm.b + 4]];
      each(segs, function (sg) { mk('line', { x1: xr(r.value), x2: xr(r.value), y1: sg[0], y2: sg[1], stroke: fill(r.color || 'grey'), 'stroke-width': 1.5, 'stroke-dasharray': r.dash || '3 3' }, G.marks); });
      if (r.label) txt(G.lab, xr(r.value) + 5, hH - hm.b - 4, r.label, { bold: true, color: ink(r.color || 'grey'), size: 11 });
    });
    each(S.notes, function (nn) { var rr = rows.filter(function (q) { return q.i === nn.i; })[0]; if (rr) note(G.lab, nn, xr(nn.v), rr.bar + bh / 2, W); });
    return { h: hH, stops: stops, mode: 'y' };
  }

  /* ---------- scatter with point labels ---------- */
  function drawScatter(S, W, narrow, G) {
    var X = S.x, Y = S.y, tl = tickW(Y), stops = [];
    var m = { t: Y.title ? 30 : 12, l: tl + 12, r: 14, b: 34 + (X.title ? nl(X.title) * 15 + 6 : 0) };
    var H = Math.round(W / aspect(S, narrow)), bot = H - m.b, x1 = W - m.r;
    var x = lin(X.min, X.max, m.l, x1), y = lin(Y.min, Y.max, bot, m.t), rad = narrow ? 4 : 5.5;
    yAxis(G.grid, Y, y, m.l, x1, tl);
    each(ticks(X), function (t) { txt(G.lab, x(t), bot + 18, fmt(t, bare(X.fmt || {})), { anchor: 'middle' }); });
    if (X.title) txt(G.lab, (m.l + x1) / 2, bot + 38, narrow && X.titleNarrow ? X.titleNarrow : X.title, { anchor: 'middle', size: 11 });
    each(S.series, function (s) {
      each(s.points, function (p) {
        var c = mk('circle', { cx: x(p[0]), cy: y(p[1]), r: rad, fill: fill(s.color), stroke: '#fff', 'stroke-width': 1, 'class': 'ichart-fade' }, G.marks);
        var off = S.pointLabels && S.pointLabels[p[2]];
        if (off) txt(G.lab, x(p[0]) + off[0], y(p[1]) + off[1], p[2], { bold: true, size: narrow ? 10 : 11, color: ink(s.labelColor || s.color), v: 'mid' });
        stops.push({ cx: x(p[0]), cy: y(p[1]), ring: c, dots: [{ x: x(p[0]), y: y(p[1]), c: s.color }], head: p[3] || p[2],
          rows: [{ name: X.name, value: fmt(p[0], X.tipFmt, X.units) }, { name: Y.name, value: fmt(p[1], Y.tipFmt, Y.units) }, { name: s.name, color: s.color }] });
      });
    });
    stops.sort(function (a, b) { return a.cx - b.cx || a.cy - b.cy; });
    each(S.notes, function (nn) { note(G.lab, nn, x(nn.x), y(nn.y), W); });
    return { h: H, stops: stops, mode: 'xy' };
  }

  /* ---------- host scaffold, table, interaction ---------- */
  function build(host, S) {
    host._spec = S; host.innerHTML = '';
    var id = 'ichart-' + hosts.length;
    if (host.getAttribute('data-head') !== 'none') {
      var hd = document.createElement('div'); hd.className = 'ichart-head';
      if (S.figure) addEl(hd, 'p', 'ichart-fig', S.figure);
      addEl(hd, 'p', 'ichart-title', S.title).id = id + '-t';
      if (S.subtitle) addEl(hd, 'p', 'ichart-sub', S.subtitle);
      host.appendChild(hd);
    }
    var box = addEl(host, 'div', 'ichart-plot');
    box.tabIndex = 0; box.setAttribute('role', 'group');
    box.setAttribute('aria-label', (S.figure ? S.figure + ': ' : '') + S.title + '. Interactive chart: use the arrow keys to read each value. The full data table follows.');
    var tip = addEl(box, 'div', 'ichart-tip'); tip.hidden = true; tip.setAttribute('role', 'status'); tip.setAttribute('aria-live', 'polite');
    if (S.source) addEl(host, 'p', 'ichart-src', S.source);
    host.appendChild(table(S));
    host._plot = box; host._tip = tip; host._i = -1;
    wire(host);
    hosts.push(host);
    draw(host);
  }
  function addEl(p, tag, cls, text) { var e = document.createElement(tag); e.className = cls; if (text != null) e.textContent = text; p.appendChild(e); return e; }

  function table(S) {
    var t = document.createElement('table'), head = [], rows = [], i;
    t.className = 'ichart-table';
    addEl(t, 'caption', '', (S.figure ? S.figure + ': ' : '') + S.title + (S.units ? ' (' + S.units + ')' : ''));
    if (S.type === 'scatter') {
      head = [S.x.labelName || 'Name', 'Group', S.x.name, S.y.name];
      each(S.series, function (s) { each(s.points, function (p) { rows.push([p[3] || p[2], s.name, fmt(p[0], S.x.tipFmt, S.x.units), fmt(p[1], S.y.tipFmt, S.y.units)]); }); });
    } else {
      var cats = S.type === 'line' ? (S.x.labels || S.x.values) : S.categories;
      head.push(S.categoryName || (S.type === 'line' ? S.x.name || 'x' : 'Category'));
      each(S.series, function (s) { head.push(s.name); if (s.extra) head.push(s.extra.name); });
      if (S.lower) head.push(S.lower.series.name);
      each(S.markers, function (mm) { head.push(mm.name); });
      if (S.rowBelow) head.push(S.rowBelow.name || S.rowBelow.label);
      for (i = 0; i < cats.length; i++) {
        var r = [String(cats[i]).replace(/\s*\n\s*/g, ' ')];
        each(S.series, function (s) { r.push(fmt(val(s, i), s.fmt || S.fmt, S.units)); if (s.extra) r.push(fmt(s.extra.values[i], s.extra.fmt, s.extra.units)); });
        if (S.lower) { var lv = S.lower.series.values[i]; r.push(fmt(lv == null ? null : clean(lv * (S.lower.series.scale || 1)), S.lower.series.fmt, S.lower.units)); }
        each(S.markers, function (mm) { r.push(mm.values[i] == null ? '' : fmt(mm.values[i], mm.fmt || S.fmt, mm.units || S.units)); });
        if (S.rowBelow) r.push(fmt(S.rowBelow.values[i], S.rowBelow.fmt, S.rowBelow.units));
        rows.push(r);
      }
    }
    var tr = document.createElement('tr'); t.appendChild(addEl(t, 'thead', '')).appendChild(tr);
    each(head, function (h) { var th = addEl(tr, 'th', '', h); th.setAttribute('scope', 'col'); });
    var tb = addEl(t, 'tbody', '');
    each(rows, function (r) { var row = addEl(tb, 'tr', ''); each(r, function (c, j) { var cell = addEl(row, j ? 'td' : 'th', '', c); if (!j) cell.setAttribute('scope', 'row'); }); });
    return t;
  }

  function draw(host) {
    var S = host._spec, box = host._plot, W = Math.max(260, Math.floor(box.clientWidth));
    if (!S || W === host._w) return;
    host._w = W;
    var narrow = W < 560, svg = mk('svg', { width: W, 'aria-hidden': 'true', focusable: 'false', 'class': 'ichart-svg' });
    var G = { grid: mk('g', null, svg), back: mk('g', null, svg), marks: mk('g', null, svg), lab: mk('g', null, svg), front: mk('g', null, svg) };
    var out = (S.type === 'line' ? drawLine : S.type === 'scatter' ? drawScatter : drawBars)(S, W, narrow, G);
    svg.setAttribute('height', out.h); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + out.h);
    if (!host._drawn && !reduced) svg.setAttribute('class', 'ichart-svg ichart-anim');
    if (host._svg) box.replaceChild(svg, host._svg); else box.insertBefore(svg, host._tip);
    host._svg = svg; host._G = G; host._stops = out.stops; host._mode = out.mode; host._drawn = true;
    box.style.minHeight = '';
    if (host._i >= 0) show(host, Math.min(host._i, out.stops.length - 1));
  }

  function show(host, i) {
    var G = host._G, st = host._stops[i], tip = host._tip;
    host._i = st ? i : -1; G.back.innerHTML = ''; G.front.innerHTML = '';
    if (!st) { tip.hidden = true; return; }
    if (st.band) mk('rect', { x: st.band.x, y: st.band.y, width: st.band.w, height: st.band.h, fill: PAL.wash, opacity: 0.6 }, G.back);
    if (st.vline) mk('line', { x1: st.cx, x2: st.cx, y1: st.vline[0], y2: st.vline[1], stroke: MUTED, 'stroke-width': 1, 'stroke-dasharray': '2 3' }, G.front);
    each(st.dots, function (d) { mk('circle', { cx: d.x, cy: d.y, r: st.ring ? 9 : 5, fill: st.ring ? 'none' : fill(d.c), stroke: st.ring ? INK : '#fff', 'stroke-width': 2 }, G.front); });
    tip.innerHTML = '';
    addEl(tip, 'div', 'ichart-tip-h', st.head);
    each(st.rows, function (r) {
      var row = addEl(tip, 'div', 'ichart-tip-r' + (r.bold ? ' is-total' : ''));
      var nm = addEl(row, 'span', 'ichart-tip-n', r.name); if (r.color) nm.style.color = ink(r.color);
      if (r.value != null) addEl(row, 'b', '', r.value);
    });
    tip.hidden = false;
    var W = host._w, w = tip.offsetWidth, h = tip.offsetHeight, l = st.cx + 14;
    if (l + w > W) l = st.cx - 14 - w;
    if (l < 0) l = Math.max(0, Math.min(W - w, st.cx - w / 2));
    var t = st.cy - h - 10; if (t < 0) t = st.cy + 16;
    tip.style.left = Math.round(l) + 'px'; tip.style.top = Math.round(t) + 'px';
  }

  function wire(host) {
    var box = host._plot;
    function nearest(e) {
      var r = box.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top, best = -1, bd = Infinity;
      each(host._stops, function (s, i) {
        var d = host._mode === 'x' ? Math.abs(s.cx - px) : host._mode === 'y' ? (py >= s.band.y && py <= s.band.y + s.band.h ? 0 : Math.abs(s.band.y + s.band.h / 2 - py)) : Math.sqrt(Math.pow(s.cx - px, 2) + Math.pow(s.cy - py, 2));
        if (d < bd) { bd = d; best = i; }
      });
      return host._mode === 'xy' && bd > 36 ? -1 : best;
    }
    box.addEventListener('pointermove', function (e) { show(host, nearest(e)); });
    box.addEventListener('pointerdown', function (e) { show(host, nearest(e)); });
    box.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && document.activeElement !== box) show(host, -1); });
    box.addEventListener('blur', function () { show(host, -1); });
    box.addEventListener('keydown', function (e) {
      var k = e.key, i = host._i, n = host._stops.length, vert = host._mode === 'y';
      if (k === 'ArrowRight' || (vert && k === 'ArrowDown')) i = i < 0 ? 0 : Math.min(n - 1, i + 1);
      else if (k === 'ArrowLeft' || (vert && k === 'ArrowUp')) i = i < 0 ? n - 1 : Math.max(0, i - 1);
      else if (k === 'Home') i = 0;
      else if (k === 'End') i = n - 1;
      else if (k === 'Escape') i = -1;
      else return;
      e.preventDefault(); show(host, i);
    });
  }

  function load(host) {
    var url = host.getAttribute('data-spec'), xhr = new XMLHttpRequest();
    if (!url || host._loading) return; host._loading = true;
    xhr.open('GET', url); xhr.responseType = 'text';
    xhr.onload = function () {
      try { if (xhr.status >= 400) throw new Error(xhr.status); build(host, JSON.parse(xhr.responseText)); }
      catch (err) { host.innerHTML = '<p class="ichart-err">Chart could not be loaded.</p>'; }
    };
    xhr.onerror = function () { host.innerHTML = '<p class="ichart-err">Chart could not be loaded.</p>'; };
    xhr.send();
  }

  var timer;
  function redrawAll(force) { each(hosts, function (h) { if (force) h._w = 0; draw(h); }); }
  function init(root) { each((root || document).querySelectorAll('.ichart[data-spec]'), load); }
  window.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(function () { redrawAll(false); }, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { redrawAll(true); });
  window.KPACharts = { render: function (el) { if (el._spec) { el._w = 0; draw(el); } else load(el); }, init: init, format: fmt };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); }); else init();
})();
/* Spec notes. type: line | bar | stacked | scatter. Colours are palette names: copper, delft, mid, grey, wash, ink.
   Shared: title, subtitle, figure, units, fmt {decimals, scale, prefix, suffix, sign}, source, data, aspect, aspectNarrow, notes.
   line: x {values, labels, ticks, tickLabels, min, max, name}, y {min, max, ticks, title, fmt}, series [{name, color, values, label,
     forecastFrom}], bands [{from, to, label}], refs [{value, from, to, label, color}], lower {ratio, y, units, series {name, values,
     scale, color, colorNeg}, notes}.
   bar / stacked: categories, categoriesShort, horizontal, y (vertical) or x (horizontal) value axis, series [{name, color, values,
     scale, colors, label, labelFmt, valueLabels, extra {name, values, fmt}}], highlight, keyLabels, compact, markers [{name, values,
     color, label}], refs, rowBelow {label, values, fmt, highlight}, totals, endLabels, segmentLabels, groups [{from, label}], key, bold, indent.
   scatter: x/y {min, max, ticks, name, title, tipFmt, units}, series [{name, color, points: [[x, y, short, name]]}], pointLabels {short: [dx, dy]}. */
