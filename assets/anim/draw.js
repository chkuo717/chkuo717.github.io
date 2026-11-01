// Shared drawing helpers for the site's figures and animations.
// The conventions follow the author's own paper figures (JMR gravity-balancing review, 2026):
//   uniform black outlines, white fills, no shading; revolute joints as small white circles
//   (double circle for a compound joint); spring attachment points as small grey dots;
//   the ground as a grey triangle with a hatched base line; the main mass as a solid red disc
//   with a white italic label, counterweights as solid blue discs; springs as sharp blue zigzags
//   with straight leads; cables as green dashed lines; link bodies, where drawn, as white
//   rounded bars with the centre of mass marked by a quartered circle; variable labels in a
//   serif italic. Colours are CSS tokens so the figures also work in dark mode.
// Every helper returns an SVG string; callers assemble them into innerHTML.
window.KD = (function () {
  'use strict';
  function f(v) { return (+v).toFixed(1); }
  function pt(p) { return f(p.x) + ',' + f(p.y); }
  function unit(a, b) { var dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1; return { x: dx / L, y: dy / L, L: L }; }
  function attrs(o) { var s = ''; for (var k in o) if (o[k] !== undefined && o[k] !== null) s += ' ' + k + '="' + o[k] + '"'; return s; }

  // ---- lines -----------------------------------------------------------------------------------
  function line(a, b, extra) { return '<line x1="' + f(a.x) + '" y1="' + f(a.y) + '" x2="' + f(b.x) + '" y2="' + f(b.y) + '"' + (extra ? ' ' + extra : '') + '/>'; }
  function link(a, b, w) { return line(a, b, 'stroke="var(--fg)" stroke-width="' + (w || 2.2) + '" stroke-linecap="round"'); }
  function thin(a, b) { return line(a, b, 'stroke="var(--fg)" stroke-width="1"'); }
  function dashed(a, b) { return line(a, b, 'stroke="var(--fg)" stroke-width="1" stroke-dasharray="4 3"'); }
  // an outlined bar with rounded ends, half-width w, from a to b (two round-capped strokes)
  function body(a, b, w, fill) {
    return line(a, b, 'stroke="var(--fg)" stroke-width="' + f(2 * w + 3.2) + '" stroke-linecap="round"') +
           line(a, b, 'stroke="' + (fill || 'var(--card)') + '" stroke-width="' + f(2 * w) + '" stroke-linecap="round"');
  }
  // a straight arrow with a filled triangular head
  function arrow(a, b, color, w, head) {
    color = color || 'var(--fg)'; w = w || 1.2; head = head || 7;
    var u = unit(a, b), tip = b, base = { x: b.x - u.x * head, y: b.y - u.y * head }, hw = head * 0.42;
    return line(a, base, 'stroke="' + color + '" stroke-width="' + w + '"') +
           '<polygon points="' + pt(tip) + ' ' + f(base.x - u.y * hw) + ',' + f(base.y + u.x * hw) + ' ' + f(base.x + u.y * hw) + ',' + f(base.y - u.x * hw) + '" fill="' + color + '"/>';
  }
  // short diagonal strokes along a->b, on the given side (+1 = right of the direction of travel)
  function hatch(a, b, n, len, side) {
    var u = unit(a, b), nx = -u.y * side, ny = u.x * side, out = '';
    for (var i = 0; i <= n; i++) {
      var t = i / n, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
      out += '<line x1="' + f(x) + '" y1="' + f(y) + '" x2="' + f(x - u.x * len * 0.75 + nx * len * 0.75) + '" y2="' + f(y - u.y * len * 0.75 + ny * len * 0.75) + '"/>';
    }
    return '<g stroke="var(--fg)" stroke-width="1" stroke-linecap="butt">' + out + '</g>';
  }
  // a fixed surface: a line from a to b with hatching on the given side
  function wall(a, b, side) {
    var u = unit(a, b), n = Math.max(2, Math.round(u.L / 7));
    return line(a, b, 'stroke="var(--fg)" stroke-width="1.2"') + hatch(a, b, n, 6, side || 1);
  }

  // ---- joints, pins, ground --------------------------------------------------------------------
  function joint(p, r) { r = r || 4.5; return '<circle cx="' + f(p.x) + '" cy="' + f(p.y) + '" r="' + f(r) + '" fill="var(--card)" stroke="var(--fg)" stroke-width="1.6"/>'; }
  function joint2(p, r) { r = r || 4.5; return joint(p, r + 2.8) + joint(p, r); }     // compound joint: two links pinned at one point
  function pin(p, r) { r = r || 2.6; return '<circle cx="' + f(p.x) + '" cy="' + f(p.y) + '" r="' + f(r) + '" fill="var(--pin)" stroke="var(--fg)" stroke-width=".8"/>'; }
  // the ground symbol: a grey triangle hanging from the pivot p, with a hatched base line
  // opts.w = triangle width (default 16); opts.plain = no base line / hatching; opts.up = triangle above p
  function ground(p, opts) {
    opts = opts || {}; var w = opts.w || 16, h = w * 0.8, s = opts.up ? -1 : 1, by = p.y + s * h;
    var out = '<polygon points="' + pt(p) + ' ' + f(p.x - w / 2) + ',' + f(by) + ' ' + f(p.x + w / 2) + ',' + f(by) + '" fill="var(--ground)" stroke="var(--fg)" stroke-width="1.2" stroke-linejoin="round"/>';
    if (!opts.plain) {
      var a = { x: p.x - w * 0.8, y: by }, b = { x: p.x + w * 0.8, y: by };
      out += line(a, b, 'stroke="var(--fg)" stroke-width="1.2"') + hatch({ x: p.x - w * 0.62, y: by }, b, 5, 5.5, s);
    }
    return out;
  }
  // a sliding block of length len and half-width w, centred at p, aligned with angle deg (screen clockwise)
  function slider(p, len, w, deg) {
    return '<g transform="rotate(' + f(deg) + ' ' + pt(p) + ')"><rect x="' + f(p.x - len / 2) + '" y="' + f(p.y - w) + '" width="' + f(len) + '" height="' + f(2 * w) + '" fill="var(--card)" stroke="var(--fg)" stroke-width="1.4"/></g>';
  }

  // ---- masses ----------------------------------------------------------------------------------
  function disc(p, r, fill, label, textFill) {
    return '<circle cx="' + f(p.x) + '" cy="' + f(p.y) + '" r="' + f(r) + '" fill="' + fill + '" stroke="var(--fg)" stroke-width="1.4"/>' +
           (label ? '<text class="v" x="' + f(p.x) + '" y="' + f(p.y) + '" text-anchor="middle" dominant-baseline="central" fill="' + (textFill || '#fff') + '" font-size="' + f(Math.max(9, r * 1.2)) + '">' + label + '</text>' : '');
  }
  function mass(p, r, label) { return disc(p, r, 'var(--mass)', label === undefined ? 'm' : label); }
  function counterweight(p, r, label) { return disc(p, r, 'var(--cw)', label); }
  // centre-of-mass symbol: a quartered disc inside a ring
  function com(p, r) {
    var x = p.x, y = p.y;
    return '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r + 3.5) + '" fill="var(--card)" stroke="var(--fg)" stroke-width="1.6"/>' +
           '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" fill="var(--card)" stroke="var(--fg)" stroke-width="1.2"/>' +
           '<path d="M' + f(x) + ',' + f(y) + ' L' + f(x + r) + ',' + f(y) + ' A' + f(r) + ',' + f(r) + ' 0 0 0 ' + f(x) + ',' + f(y - r) + ' Z ' +
           'M' + f(x) + ',' + f(y) + ' L' + f(x - r) + ',' + f(y) + ' A' + f(r) + ',' + f(r) + ' 0 0 0 ' + f(x) + ',' + f(y + r) + ' Z" fill="var(--fg)"/>';
  }

  // ---- springs and cables ----------------------------------------------------------------------
  function zigzag(a, b, n, w, lead) {
    var u = unit(a, b), px = -u.y, py = u.x, L = u.L;
    lead = lead === undefined ? Math.min(8, L * 0.14) : lead;
    var pts = [pt(a), f(a.x + u.x * lead) + ',' + f(a.y + u.y * lead)], span = L - 2 * lead;
    for (var i = 0; i < n; i++) {
      var t = lead + span * (i + 0.5) / n, s = (i % 2 ? 1 : -1) * w;
      pts.push(f(a.x + u.x * t + px * s) + ',' + f(a.y + u.y * t + py * s));
    }
    pts.push(f(b.x - u.x * lead) + ',' + f(b.y - u.y * lead), pt(b));
    return pts.join(' ');
  }
  // an extension (or zero-free-length) spring between a and b
  function spring(a, b, n, w, color) {
    return '<polyline points="' + zigzag(a, b, n || 9, w || 3.5) + '" fill="none" stroke="' + (color || 'var(--spring)') + '" stroke-width="1.8" stroke-linejoin="miter" stroke-miterlimit="6"/>';
  }
  // a compression spring seated at `from`, pointing to `to`, of free length `free`: it is only as long as the gap.
  // Returns the coil plus an end plate; the coil is grey when it is at its free length (touching nothing).
  function compSpring(from, to, free, n, w) {
    var dx = to.x - from.x, dy = to.y - from.y, d = Math.hypot(dx, dy) || 1, len = Math.min(d, free);
    var end = { x: from.x + dx / d * len, y: from.y + dy / d * len }, loaded = d < free - 0.5;
    return '<polyline points="' + zigzag(from, end, n || 11, w || 3, 3) + '" fill="none" stroke="' + (loaded ? 'var(--spring)' : 'var(--ground)') + '" stroke-width="1.8" stroke-linejoin="miter" stroke-miterlimit="6"/>' +
           '<line x1="' + f(end.x - 4 * dy / d) + '" y1="' + f(end.y + 4 * dx / d) + '" x2="' + f(end.x + 4 * dy / d) + '" y2="' + f(end.y - 4 * dx / d) + '" stroke="var(--fg)" stroke-width="1.6"/>';
  }
  function cable(points) {
    return '<polyline points="' + points.map(pt).join(' ') + '" fill="none" stroke="var(--cable)" stroke-width="1.5" stroke-dasharray="5 3" stroke-linejoin="round"/>';
  }

  // ---- labels ----------------------------------------------------------------------------------
  // a variable label (serif italic); opts: size, anchor, fill, sub (subscript text)
  function label(p, text, opts) {
    opts = opts || {};
    return '<text class="v" x="' + f(p.x) + '" y="' + f(p.y) + '"' + attrs({ 'font-size': opts.size || 12, 'text-anchor': opts.anchor, fill: opts.fill || 'var(--fg)' }) + '>' + text +
           (opts.sub ? '<tspan font-size="' + f((opts.size || 12) * 0.72) + '" baseline-shift="sub">' + opts.sub + '</tspan>' : '') + '</text>';
  }
  // an upright note in the figure's serif face
  function note(p, text, opts) {
    opts = opts || {};
    return '<text class="n" x="' + f(p.x) + '" y="' + f(p.y) + '"' + attrs({ 'font-size': opts.size || 10, 'text-anchor': opts.anchor, fill: opts.fill || 'var(--fg)' }) + '>' + text + '</text>';
  }
  // the gravity arrow with its label
  function gArrow(x, y, len) {
    len = len || 30;
    return arrow({ x: x, y: y }, { x: x, y: y + len }, 'var(--fg)', 1.2, 8) + label({ x: x + 6, y: y + len - 4 }, 'g');
  }
  // a rectangular permanent magnet centred at c, size w x h, turned by deg, with its magnetisation arrow
  function magnet(c, w, h, deg, fill, arrowColor) {
    var L = Math.min(w, h) * 0.62;
    return '<g transform="translate(' + pt(c) + ') rotate(' + f(deg) + ')">' +
           '<rect x="' + f(-w / 2) + '" y="' + f(-h / 2) + '" width="' + f(w) + '" height="' + f(h) + '" fill="' + (fill || 'var(--mag-stator)') + '" stroke="var(--fg)" stroke-width="1.2"/>' +
           arrow({ x: 0, y: L / 2 }, { x: 0, y: -L / 2 }, arrowColor || 'var(--mag-arrow)', 1.8, 7) + '</g>';
  }

  return { f: f, pt: pt, unit: unit, line: line, link: link, thin: thin, dashed: dashed, body: body, arrow: arrow, hatch: hatch, wall: wall,
           joint: joint, joint2: joint2, pin: pin, ground: ground, slider: slider, disc: disc, mass: mass, counterweight: counterweight, com: com,
           zigzag: zigzag, spring: spring, compSpring: compSpring, cable: cable, label: label, note: note, gArrow: gArrow, magnet: magnet };
})();
