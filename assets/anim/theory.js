// Animations for the mechanism-theory pages. Drawing through draw.js (KD).
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var f = KD.f;
  function loop(tick) { tick(); if (!reduce) requestAnimationFrame(function step(t) { tick(t); requestAnimationFrame(step); }); }
  function radios(name, cb) { Array.prototype.forEach.call(document.querySelectorAll('input[name=' + name + ']'), function (r) { r.addEventListener('change', function () { if (r.checked) cb(r.value); }); }); }

  // ---------------------------------------------------------------------------------------------
  // Kuo, Linkage Synthesis and Force Analysis by Using Relative Poles (interactive e-book, 2024).
  // A rigid body taken from position 1 to position 2 has turned about one point, the relative pole
  // P12, found where the perpendicular bisectors of A1A2 and B1B2 meet. Set position 2 and watch the
  // construction; the body then moves from 1 to 2 by a pure rotation about the pole.
  // ---------------------------------------------------------------------------------------------
  (function () {
    var svg = document.getElementById('pole');
    if (!svg) return;
    var g = svg.querySelector('#poBody'), msg = document.getElementById('poMsg');
    var A1 = { x: 80, y: 200 }, L = 90, ang1 = -0.5;
    var dxIn = document.getElementById('poDx'), dyIn = document.getElementById('poDy'), thIn = document.getElementById('poTh');
    var dx = 110, dy = -70, th = 70, t0 = null;
    function body(A, ang, dim) {
      var B = { x: A.x + L * Math.cos(ang), y: A.y + L * Math.sin(ang) }, C = { x: A.x + 0.4 * L * Math.cos(ang - 0.9), y: A.y + 0.4 * L * Math.sin(ang - 0.9) };
      return { B: B, svg: '<polygon points="' + KD.pt(A) + ' ' + KD.pt(B) + ' ' + KD.pt(C) + '" fill="var(--link-fill)" stroke="var(--fg)" stroke-width="' + (dim ? 1.2 : 2) + '" stroke-linejoin="round"' + (dim ? ' opacity=".55"' : '') + '/>' + KD.joint(A, 3.5) + KD.joint(B, 3.5) };
    }
    function bisector(P1, P2) { var m = { x: (P1.x + P2.x) / 2, y: (P1.y + P2.y) / 2 }, d = { x: -(P2.y - P1.y), y: P2.x - P1.x }; return { m: m, d: d }; }
    function meet(l1, l2) { var den = l1.d.x * l2.d.y - l1.d.y * l2.d.x; if (Math.abs(den) < 1e-6) return null; var t = ((l2.m.x - l1.m.x) * l2.d.y - (l2.m.y - l1.m.y) * l2.d.x) / den; return { x: l1.m.x + t * l1.d.x, y: l1.m.y + t * l1.d.y }; }
    function draw(u) {
      var A2 = { x: A1.x + dx, y: A1.y + dy }, ang2 = ang1 + th * Math.PI / 180;
      var b1 = body(A1, ang1, true), b2 = body(A2, ang2, true), B1 = b1.B, B2 = b2.B;
      var la = bisector(A1, A2), lb = bisector(B1, B2), Pp = meet(la, lb), out = '';
      function longLine(l) { var n = Math.hypot(l.d.x, l.d.y) || 1; return KD.line({ x: l.m.x - 400 * l.d.x / n, y: l.m.y - 400 * l.d.y / n }, { x: l.m.x + 400 * l.d.x / n, y: l.m.y + 400 * l.d.y / n }, 'stroke="var(--fg-2)" stroke-width="1" stroke-dasharray="4 4"'); }
      out += KD.thin(A1, A2) + KD.thin(B1, B2) + longLine(la) + longLine(lb) + b1.svg + b2.svg;
      out += KD.label({ x: A1.x - 16, y: A1.y + 14 }, 'A', { size: 11, sub: '1' }) + KD.label({ x: B1.x + 4, y: B1.y + 14 }, 'B', { size: 11, sub: '1' }) + KD.label({ x: A2.x - 16, y: A2.y - 6 }, 'A', { size: 11, sub: '2' }) + KD.label({ x: B2.x + 6, y: B2.y - 2 }, 'B', { size: 11, sub: '2' });
      if (Pp) {
        // the moving body: rotate position 1 about the pole by u * th
        var a = u * th * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
        function rot(p) { return { x: Pp.x + (p.x - Pp.x) * c - (p.y - Pp.y) * s, y: Pp.y + (p.x - Pp.x) * s + (p.y - Pp.y) * c }; }
        var Am = rot(A1), bm = body(Am, ang1 + a, false);
        out += '<g stroke="var(--spring)" stroke-width="1" stroke-dasharray="2 3">' + KD.line(Pp, Am) + KD.line(Pp, bm.B) + '</g>' + bm.svg;
        out += KD.disc(Pp, 4, 'var(--mass)') + KD.label({ x: Pp.x + 8, y: Pp.y + 14 }, 'P', { size: 12, fill: 'var(--red)', sub: '12' });
        if (msg) msg.textContent = 'Pole at (' + (Pp.x - A1.x).toFixed(0) + ', ' + (A1.y - Pp.y).toFixed(0) + ') from A₁; rotation ' + th.toFixed(0) + '° about it takes the body from 1 to 2.';
      } else if (msg) msg.textContent = 'A pure translation: the bisectors are parallel and the pole is at infinity.';
      g.innerHTML = out;
    }
    function fromUI() { dx = parseFloat(dxIn.value); dy = -parseFloat(dyIn.value); th = parseFloat(thIn.value); }
    [dxIn, dyIn, thIn].forEach(function (i) { if (i) i.addEventListener('input', fromUI); });
    if (dxIn) fromUI();
    loop(function (t) { var s = t === undefined ? 0 : ((t0 === null ? (t0 = t) : t0), (t - t0) / 1000); draw(0.5 - 0.5 * Math.cos(s * 0.9)); });
  })();

  // ---------------------------------------------------------------------------------------------
  // Kuo and Shih, ASME J. Mech. Des. 130 (2008) 084501: computational identification of link
  // adjacency and joint incidence. Which links of a kinematic chain are topologically the same, and
  // which joints? The paper answers by a pseudogenetic computation on the chain's graph and its line
  // graph; here the same classes are found by brute force over the graph's automorphisms, which is
  // exact for the small chains shown. For a mechanism the frame is fixed and the classes change.
  // ---------------------------------------------------------------------------------------------
  (function () {
    var svg = document.getElementById('adj');
    if (!svg) return;
    var g = svg.querySelector('#adBody'), msg = document.getElementById('adMsg'), sel = document.getElementById('adChain'), fixIn = document.getElementById('adFix');
    var chains = {
      watt: { name: 'Watt chain', n: 6, edges: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [4, 5], [5, 3]],
              pos: [[110, 150], [60, 90], [120, 40], [180, 90], [240, 60], [250, 150]] },
      stephenson: { name: 'Stephenson chain', n: 6, edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 3]],
              pos: [[90, 150], [60, 80], [120, 30], [200, 70], [250, 130], [180, 170]] }
    };
    var key = 'watt', fix = false;
    function perms(n) { var out = [], a = []; (function rec() { if (a.length === n) { out.push(a.slice()); return; } for (var i = 0; i < n; i++) if (a.indexOf(i) < 0) { a.push(i); rec(); a.pop(); } })(); return out; }
    function classes(ch, fixed) {
      var E = {}; ch.edges.forEach(function (e) { E[e[0] + ',' + e[1]] = 1; E[e[1] + ',' + e[0]] = 1; });
      var auts = perms(ch.n).filter(function (p) { if (fixed && p[0] !== 0) return false; return ch.edges.every(function (e) { return E[p[e[0]] + ',' + p[e[1]]]; }); });
      var linkCls = [], seen = {};
      for (var v = 0; v < ch.n; v++) if (!seen[v]) { var orb = {}; auts.forEach(function (p) { orb[p[v]] = 1; }); var o = Object.keys(orb).map(Number).sort(); o.forEach(function (x) { seen[x] = 1; }); linkCls.push(o); }
      var jointCls = [], seenJ = {};
      ch.edges.forEach(function (e, i) {
        if (seenJ[i]) return; var orb = {};
        auts.forEach(function (p) { var a = p[e[0]], b = p[e[1]]; ch.edges.forEach(function (e2, j) { if ((e2[0] === a && e2[1] === b) || (e2[0] === b && e2[1] === a)) orb[j] = 1; }); });
        var o = Object.keys(orb).map(Number).sort(); o.forEach(function (x) { seenJ[x] = 1; }); jointCls.push(o);
      });
      return { links: linkCls, joints: jointCls, nAut: auts.length };
    }
    var palette = ['var(--mass)', 'var(--spring)', 'var(--cable)', '#B8860B', '#8E44AD', 'var(--pin)'];
    function draw(hl) {
      var ch = chains[key], cl = classes(ch, fix), out = '', which = hl % (cl.links.length + cl.joints.length);
      var deg = []; for (var i = 0; i < ch.n; i++) deg.push(0); ch.edges.forEach(function (e) { deg[e[0]]++; deg[e[1]]++; });
      // links: binary links as bars between their two joints; ternary links as triangles through three joints.
      // Joints are drawn at the midpoint of each edge; link i connects the joint points of its incident edges.
      var jp = ch.edges.map(function (e) { var a = ch.pos[e[0]], b = ch.pos[e[1]]; return { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 }; });
      for (var v = 0; v < ch.n; v++) {
        var inc = []; ch.edges.forEach(function (e, j) { if (e[0] === v || e[1] === v) inc.push(jp[j]); });
        var ci = -1; cl.links.forEach(function (c, k) { if (c.indexOf(v) >= 0) ci = k; });
        var col = (which === ci) ? palette[ci % palette.length] : 'var(--fg)', wgt = which === ci ? 3 : 2;
        var fill = (which === ci) ? palette[ci % palette.length] : 'var(--link-fill)';
        if (inc.length === 2) out += KD.link(inc[0], inc[1], wgt + 1).replace('stroke="var(--fg)"', 'stroke="' + col + '"');
        else out += '<polygon points="' + inc.map(KD.pt).join(' ') + '" fill="' + fill + '" fill-opacity="' + (which === ci ? '.35' : '1') + '" stroke="' + col + '" stroke-width="' + wgt + '" stroke-linejoin="round"/>';
        if (fix && v === 0) out += KD.ground(jp[0], { w: 12, plain: true });
        var c = ch.pos[v]; out += KD.label({ x: c[0] - 4, y: c[1] + 4 }, String(v + 1), { size: 11, fill: 'var(--fg-2)' });
      }
      ch.edges.forEach(function (e, j) {
        var cj = -1; cl.joints.forEach(function (c, k) { if (c.indexOf(j) >= 0) cj = k; });
        var on = which === cl.links.length + cj;
        out += on ? KD.disc(jp[j], 5, palette[cj % palette.length]) : KD.joint(jp[j], 4);
      });
      g.innerHTML = out;
      var text = which < cl.links.length ? 'Links ' + cl.links[which].map(function (x) { return x + 1; }).join(', ') + ' are topologically identical' : 'Joints ' + cl.joints[which - cl.links.length].map(function (x) { return String.fromCharCode(97 + x); }).join(', ') + ' are topologically identical';
      if (msg) msg.textContent = ch.name + (fix ? ' with link 1 fixed (a mechanism)' : ' (a kinematic chain)') + ': ' + cl.links.length + ' link classes, ' + cl.joints.length + ' joint classes, ' + cl.nAut + ' symmetries. ' + text + '.';
    }
    if (sel) sel.addEventListener('change', function () { key = sel.value; });
    if (fixIn) fixIn.addEventListener('change', function () { fix = fixIn.checked; });
    var t0 = null;
    loop(function (t) { var s = t === undefined ? 0 : ((t0 === null ? (t0 = t) : t0), (t - t0) / 1000); draw(Math.floor(s / 2.2)); });
  })();
})();
