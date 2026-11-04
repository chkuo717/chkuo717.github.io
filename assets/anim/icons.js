// Small theme drawings for the theme cards (Research index and Home), in the site's figure style (draw.js).
// Each drawing is a function of time s (seconds) and moves the way its mechanism moves; with reduced motion,
// or before the first frame, it is drawn at s = 0. Only drawings on screen are redrawn.
(function () {
  'use strict';
  if (!window.KD) return;
  var P = function (x, y) { return { x: x, y: y }; };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function rot(c, p, a) { var dx = p.x - c.x, dy = p.y - c.y, ca = Math.cos(a), sa = Math.sin(a); return P(c.x + dx * ca - dy * sa, c.y + dx * sa + dy * ca); }
  function ease(s, T) { var u = (s % (2 * T)) / T; u = u < 1 ? u : 2 - u; return u * u * (3 - 2 * u); }   // 0 -> 1 -> 0, smooth
  // the intersection of circles (a, ra) and (b, rb) on the same side of a->b as the reference point ref
  function meet(a, ra, b, rb, ref) {
    var d = dist(a, b), x = (d * d + ra * ra - rb * rb) / (2 * d), h = Math.sqrt(Math.max(0, ra * ra - x * x));
    var ux = (b.x - a.x) / d, uy = (b.y - a.y) / d, side = Math.sign((b.x - a.x) * (ref.y - a.y) - (b.y - a.y) * (ref.x - a.x)) || 1;
    return P(a.x + ux * x - uy * h * side, a.y + uy * x + ux * h * side);
  }

  // fixed geometry, set once
  var gv = { O: P(48, 72), A: P(46, 18), L: Math.hypot(56, 40), th0: Math.atan2(40, 56) };
  var pr = { g: [P(26, 76), P(134, 76), P(80, 80)], k: [P(34, 50), P(126, 50), P(62, 60)], t: [P(56, 36), P(104, 36), P(80, 20)] };
  pr.l1 = pr.g.map(function (g, i) { return dist(g, pr.k[i]); }); pr.l2 = pr.k.map(function (k, i) { return dist(k, pr.t[i]); });
  var rc = { O: P(34, 74), Q: P(126, 74), A: P(52, 40), B: P(108, 30) };
  rc.a = dist(rc.O, rc.A); rc.b = dist(rc.A, rc.B); rc.c = dist(rc.Q, rc.B); rc.al0 = Math.atan2(rc.A.y - rc.O.y, rc.A.x - rc.O.x);
  var md = { G: P(40, 24), A: P(78, 18), B: P(104, 50), R: P(130, 78) };
  md.ga = dist(md.G, md.A); md.ab = dist(md.A, md.B); md.rb = dist(md.R, md.B); md.ph0 = Math.atan2(md.B.y - md.R.y, md.B.x - md.R.x);
  var th = { P: P(110, 82), A1: P(22, 58), B1: P(62, 40), al: 38 * Math.PI / 180 };
  th.A2 = rot(th.P, th.A1, th.al); th.B2 = rot(th.P, th.B1, th.al);
  var en = { G: P(118, 40), r: 16, x: 48, th0: 200 * Math.PI / 180 };
  en.C0 = P(en.G.x + en.r * Math.cos(en.th0), en.G.y + en.r * Math.sin(en.th0)); en.l = dist(P(en.x, 63), en.C0);

  var icons = {
    // a link pinned to the ground at O carries a mass; a spring from a fixed point holds it in any posture
    gravity: function (s) {
      var q = gv.th0 + 0.42 * Math.sin(0.8 * s), m = P(gv.O.x + gv.L * Math.cos(q), gv.O.y - gv.L * Math.sin(q));
      var pin = P(gv.O.x + (m.x - gv.O.x) * 0.38, gv.O.y + (m.y - gv.O.y) * 0.38);
      return KD.ground(gv.O, { w: 16 }) + KD.ground(gv.A, { w: 11, plain: true, up: true }) + KD.pin(gv.A) + KD.spring(gv.A, pin, 8, 3) +
             KD.link(gv.O, m) + KD.pin(pin) + KD.joint(gv.O, 4.5) + KD.mass(m, 8, 'm');
    },
    // a ring of magnets holds up an arm on a magnetised rotor at any angle
    magnetic: function (s) {
      var C = P(80, 46), R = 30, out = '';
      for (var i = 0; i < 8; i++) {
        var az = -Math.PI / 2 + i * Math.PI / 4, c = P(C.x + R * Math.cos(az), C.y + R * Math.sin(az)), mag = 2 * az + Math.PI / 2;
        out += KD.magnet(c, 13, 13, (mag + Math.PI / 2) * 180 / Math.PI, 'var(--mag-stator)', 'var(--mag-arrow)');
      }
      var a = 0.85 * Math.sin(0.6 * s), end = P(C.x + 24 * Math.sin(a), C.y - 24 * Math.cos(a));
      return out + '<circle cx="80" cy="46" r="11" fill="var(--card)" stroke="var(--fg)" stroke-width="1.2"/>' +
             '<g transform="rotate(' + (a * 180 / Math.PI).toFixed(1) + ' 80 46)"><rect x="75" y="38" width="10" height="16" rx="1.5" fill="var(--mag-rotor)" stroke="var(--fg)" stroke-width="1"/>' +
             KD.arrow(P(80, 51), P(80, 40), 'var(--mag-arrow-2)', 1.4, 5) + '</g>' + KD.link(P(C.x + 8 * Math.sin(a), C.y - 8 * Math.cos(a)), end, 2) + KD.mass(end, 5, '');
    },
    // a float rides the wave; a connecting rod of fixed length rocks the crank of a generator
    energy: function (s) {
      var w = 1.4 * s, d = '', i, x;
      function wave(x) { return 68 + 3 * Math.sin(2 * Math.PI * (x - 10) / 38 - w); }
      for (i = 0; i <= 38; i++) { x = 10 + 2 * i; d += (i ? 'L' : 'M') + x + ',' + wave(x).toFixed(2); }
      var Bc = P(en.x, wave(en.x) - 5);
      var C = meet(en.G, en.r, Bc, en.l, P(100, 20));                // crank pin: on the crank circle and one rod length from the float
      return '<path d="' + d + 'L86,84L10,84Z" fill="var(--mag-stator)" opacity=".6"/><path d="' + d + '" fill="none" stroke="var(--accent)" stroke-width="1.4"/>' +
             KD.arrow(P(32, 57), P(32, 44), 'var(--cable)', 1.3, 6) + KD.arrow(P(32, 51), P(32, 64), 'var(--cable)', 1.3, 6) +
             KD.ground(en.G, { w: 16 }) + KD.mass(Bc, 7, '') + KD.link(Bc, C) + KD.link(en.G, C) + KD.joint(en.G, 4.5) + KD.joint(C, 3.5) + KD.joint(Bc, 3) +
             '<path d="M111.2,21.2 A20,20 0 0 1 133.3,27.1" fill="none" stroke="var(--cable)" stroke-width="1.3"/>' + KD.arrow(P(130.7, 24), P(134.6, 28.6), 'var(--cable)', 1.3, 6);
    },
    // three legs of fixed link lengths carry the platform as it moves
    parallel: function (s) {
      var dx = 7 * Math.sin(0.7 * s), dy = 4 * Math.sin(1.1 * s + 1), da = 0.08 * Math.sin(0.5 * s), c = P(80, 31);
      var t = pr.t.map(function (p) { var q = rot(c, p, da); return P(q.x + dx, q.y + dy); });
      var out = pr.g.map(function (g) { return KD.ground(g, { w: 13 }); }).join('');
      out += '<polygon points="' + t.map(KD.pt).join(' ') + '" fill="var(--link-fill)" stroke="var(--fg)" stroke-width="1.8" stroke-linejoin="round"/>';
      for (var i = 0; i < 3; i++) {
        var k = meet(pr.g[i], pr.l1[i], t[i], pr.l2[i], pr.k[i]);
        out += KD.link(pr.g[i], k) + KD.link(k, t[i]) + KD.joint(pr.g[i], 4) + KD.joint(k, 3.5) + KD.joint(t[i], 3.5);
      }
      return out;
    },
    // a four-bar moves; the dashed outline is its other configuration
    reconfigurable: function (s) {
      var O = rc.O, Q = rc.Q, al = rc.al0 + 0.22 * Math.sin(0.7 * s), A = P(O.x + rc.a * Math.cos(al), O.y + rc.a * Math.sin(al));
      var B = meet(A, rc.b, Q, rc.c, rc.B), A2 = P(74, 50), B2 = P(118, 48);
      return KD.ground(O, { w: 14 }) + KD.ground(Q, { w: 14 }) +
             '<g opacity=".55">' + KD.dashed(O, A2) + KD.dashed(A2, B2) + KD.dashed(Q, B2) + KD.joint(A2, 3.5) + KD.joint(B2, 3.5) + '</g>' +
             KD.link(O, A) + KD.link(A, B) + KD.link(Q, B) + KD.joint(O, 4.5) + KD.joint(Q, 4.5) + KD.joint(A, 3.5) + KD.joint2(B, 3.5) +
             '<path d="M70,58 A26,26 0 0 1 60,34" fill="none" stroke="var(--cable)" stroke-width="1.3"/>' + KD.arrow(P(61, 40), P(59, 32), 'var(--cable)', 1.3, 6);
    },
    // a parallelogram arm whose instrument pivots about the remote centre of motion
    medical: function (s) {
      var G = md.G, ph = md.ph0 + 0.35 * Math.sin(0.7 * s), B = P(md.R.x + md.rb * Math.cos(ph), md.R.y + md.rb * Math.sin(ph));
      var A = meet(G, md.ga, B, md.ab, md.A), C = P(G.x + B.x - A.x, G.y + B.y - A.y);
      var u = KD.unit(B, md.R), tip = P(md.R.x + u.x * 10, md.R.y + u.y * 10);
      return KD.ground(G, { w: 13, up: true }) +
             KD.link(G, A) + KD.link(A, B) + KD.link(G, C) + KD.link(C, B) + KD.link(B, tip, 1.6) +
             KD.joint(G, 4) + KD.joint(A, 3.5) + KD.joint(B, 3.5) + KD.joint(C, 3.5) +
             '<path d="M118,86 A14,14 0 0 1 142,70" fill="none" stroke="var(--fg)" stroke-width="1" stroke-dasharray="3 2"/>' +
             KD.disc(md.R, 3.2, 'var(--mass)') + KD.label(P(138, 88), 'RCM', { size: 9 });
    },
    // a link displaced from position 1 to position 2 turns about their relative pole P12, where the
    // perpendicular bisectors of A1A2 and B1B2 meet
    theory: function (s) {
      var a = th.al * ease(s, 2.6), A = rot(th.P, th.A1, a), B = rot(th.P, th.B1, a), Pp = th.P;
      function bis(p, q) { var m = P((p.x + q.x) / 2, (p.y + q.y) / 2); return KD.dashed(Pp, P(m.x + (m.x - Pp.x) * 0.3, m.y + (m.y - Pp.y) * 0.3)); }   // through P12 and the chord's midpoint
      return bis(th.A1, th.A2) + bis(th.B1, th.B2) +
             '<g stroke="var(--spring)" stroke-width="1" stroke-dasharray="2 3">' + KD.line(Pp, A) + KD.line(Pp, B) + '</g>' +
             '<g opacity=".4">' + KD.link(th.A1, th.B1) + KD.link(th.A2, th.B2) + KD.joint(th.A1, 3) + KD.joint(th.B1, 3) + KD.joint(th.A2, 3) + KD.joint(th.B2, 3) + '</g>' +
             KD.link(A, B) + KD.joint(A, 3.5) + KD.joint(B, 3.5) +
             KD.disc(Pp, 3.5, 'var(--mass)') + KD.label(P(Pp.x + 7, Pp.y + 4), 'P', { size: 11, sub: '12' });
    }
  };

  var items = [];
  Array.prototype.forEach.call(document.querySelectorAll('svg.icon[data-icon]'), function (svg) {
    var fn = icons[svg.getAttribute('data-icon')];
    if (!fn) return;
    var it = { svg: svg, fn: fn, on: true };
    svg.innerHTML = fn(0);
    items.push(it);
  });
  if (reduce || !items.length) return;
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { items.forEach(function (it) { if (it.svg === e.target) it.on = e.isIntersecting; }); }); });
    items.forEach(function (it) { io.observe(it.svg); });
  }
  var t0 = null;
  requestAnimationFrame(function step(t) {
    if (t0 === null) t0 = t;
    var s = (t - t0) / 1000;
    items.forEach(function (it) { if (it.on) it.svg.innerHTML = it.fn(s); });
    requestAnimationFrame(step);
  });
})();
