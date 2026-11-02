// Animations for the parallel-mechanism paper pages. Drawing through draw.js (window.KD).
// A small isometric projector (ISO) is shared with the other theme scripts via window.ISO.
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var f = KD.f;
  function loop(tick) { tick(); if (!reduce) requestAnimationFrame(function step(t) { tick(t); requestAnimationFrame(step); }); }
  function radios(name, cb) { Array.prototype.forEach.call(document.querySelectorAll('input[name=' + name + ']'), function (r) { r.addEventListener('change', function () { if (r.checked) cb(r.value); }); }); }

  // ---- isometric projection: world x towards the lower left, y towards the lower right, z up;
  //      the viewer sits in the (+x, +y, +z) octant, so nearer points have larger x + y + z ----
  var ISO = window.ISO = {
    make: function (ox, oy, s) {
      var cx = Math.cos(Math.PI / 6), sx = Math.sin(Math.PI / 6);
      return function (p) { return { x: ox + s * cx * (p[1] - p[0]), y: oy + s * sx * (p[0] + p[1]) - s * p[2] }; };
    },
    // 3-vector helpers
    add: function (a, b, k) { k = k === undefined ? 1 : k; return [a[0] + k * b[0], a[1] + k * b[1], a[2] + k * b[2]]; },
    mul: function (a, k) { return [a[0] * k, a[1] * k, a[2] * k]; },
    dot: function (a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; },
    cross: function (a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; },
    norm: function (a) { var n = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / n, a[1] / n, a[2] / n]; },
    // rotation matrix (row-major 9) from a rotation vector
    rotvec: function (v) {
      var th = Math.hypot(v[0], v[1], v[2]); if (th < 1e-12) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
      var k = [v[0] / th, v[1] / th, v[2] / th], c = Math.cos(th), s = Math.sin(th), C = 1 - c;
      return [c + k[0] * k[0] * C, k[0] * k[1] * C - k[2] * s, k[0] * k[2] * C + k[1] * s,
              k[1] * k[0] * C + k[2] * s, c + k[1] * k[1] * C, k[1] * k[2] * C - k[0] * s,
              k[2] * k[0] * C - k[1] * s, k[2] * k[1] * C + k[0] * s, c + k[2] * k[2] * C];
    },
    apply: function (R, v) { return [R[0] * v[0] + R[1] * v[1] + R[2] * v[2], R[3] * v[0] + R[4] * v[1] + R[5] * v[2], R[6] * v[0] + R[7] * v[1] + R[8] * v[2]]; },
    mulR: function (A, B) { var C = []; for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) { var s = 0; for (var k = 0; k < 3; k++) s += A[3 * i + k] * B[3 * k + j]; C.push(s); } return C; },
    // SVG pieces
    poly: function (P, pts, attrs) { return '<polygon points="' + pts.map(function (p) { return KD.pt(P(p)); }).join(' ') + '" ' + attrs + '/>'; },
    seg: function (P, a, b, attrs) { return KD.line(P(a), P(b), attrs); },
    axes: function (P, L, labels) {
      var o = [0, 0, 0];
      return KD.arrow(P(o), P([L, 0, 0]), 'var(--fg-2)', 1, 6) + KD.arrow(P(o), P([0, L, 0]), 'var(--fg-2)', 1, 6) + KD.arrow(P(o), P([0, 0, L]), 'var(--fg-2)', 1, 6) +
             KD.label({ x: P([L, 0, 0]).x - 12, y: P([L, 0, 0]).y + 10 }, labels ? labels[0] : 'x', { size: 11, fill: 'var(--fg-2)' }) +
             KD.label({ x: P([0, L, 0]).x + 5, y: P([0, L, 0]).y + 10 }, labels ? labels[1] : 'y', { size: 11, fill: 'var(--fg-2)' }) +
             KD.label({ x: P([0, 0, L]).x - 10, y: P([0, 0, L]).y - 3 }, labels ? labels[2] : 'z', { size: 11, fill: 'var(--fg-2)' });
    }
  };

  // ---------------------------------------------------------------------------------------------
  // Kuo and Dai, ASME J. Mech. Robot. 13 (2021) 031109: fully decoupled projective motion.
  // The orientation of a moving axis w is described by two "projective angles": the angle of its
  // projection on the xz-plane from z (theta_xz, tan = wx/wz) and on the yz-plane (theta_yz,
  // tan = wy/wz). Given both, w is parallel to (tan theta_xz, tan theta_yz, 1). The paper shows that
  // parallel manipulators can be built in which each actuator sets one projective angle (or one
  // translation) and nothing else: the Jacobian is the identity.
  // ---------------------------------------------------------------------------------------------
  (function () {
    var svg = document.getElementById('proj');
    if (!svg) return;
    var P = ISO.make(170, 175, 1), L = 95;
    var g = svg.querySelector('#pBody');
    var aIn = document.getElementById('pjA'), bIn = document.getElementById('pjB'), aOut = document.getElementById('pjAOut'), bOut = document.getElementById('pjBOut'), msg = document.getElementById('pjMsg'), autoIn = document.getElementById('pjAuto');
    var a = 20, b = -15, auto = true, t0 = null;
    function draw(ta, tb) {
      var ra = ta * Math.PI / 180, rb = tb * Math.PI / 180;
      var w = ISO.norm([Math.tan(ra), Math.tan(rb), 1]), W = ISO.mul(w, L);
      var pxz = [W[0], 0, W[2]], pyz = [0, W[1], W[2]];
      var out = '';
      // the two projection planes, drawn as light quadrilaterals
      out += ISO.poly(P, [[-20, 0, 0], [110, 0, 0], [110, 0, 115], [-20, 0, 115]], 'fill="var(--link-fill)" stroke="var(--line)" stroke-width="1" opacity=".7"');
      out += ISO.poly(P, [[0, -20, 0], [0, 110, 0], [0, 110, 115], [0, -20, 115]], 'fill="var(--mag-stator)" stroke="var(--line)" stroke-width="1" opacity=".55"');
      out += ISO.axes(P, 105);
      // projections (dashed) and the drop lines
      out += ISO.seg(P, [0, 0, 0], pxz, 'stroke="var(--fg)" stroke-width="1.2" stroke-dasharray="4 3"') + ISO.seg(P, [0, 0, 0], pyz, 'stroke="var(--fg)" stroke-width="1.2" stroke-dasharray="4 3"');
      out += ISO.seg(P, W, pxz, 'stroke="var(--fg-2)" stroke-width=".8" stroke-dasharray="2 3"') + ISO.seg(P, W, pyz, 'stroke="var(--fg-2)" stroke-width=".8" stroke-dasharray="2 3"');
      // angle arcs from the z axis to each projection
      function arc(plane, ang) {
        var d = '', r = 42, n = 16;
        for (var i = 0; i <= n; i++) { var t = ang * i / n, p = plane === 'xz' ? [r * Math.sin(t), 0, r * Math.cos(t)] : [0, r * Math.sin(t), r * Math.cos(t)]; d += (i ? 'L' : 'M') + KD.pt(P(p)); }
        return '<path d="' + d + '" fill="none" stroke="var(--red)" stroke-width="1.3"/>';
      }
      out += arc('xz', ra) + arc('yz', rb);
      var la = P([48 * Math.sin(ra / 2), 0, 48 * Math.cos(ra / 2)]), lb = P([0, 48 * Math.sin(rb / 2), 48 * Math.cos(rb / 2)]);
      out += KD.label({ x: la.x + 2, y: la.y - 4 }, 'θ', { size: 11, fill: 'var(--red)', sub: 'xz' }) + KD.label({ x: lb.x + 4, y: lb.y - 4 }, 'θ', { size: 11, fill: 'var(--red)', sub: 'yz' });
      // the axis w itself, as a rod on a ball at the origin
      out += KD.arrow(P([0, 0, 0]), P(W), 'var(--spring)', 2.4, 9) + KD.joint(P([0, 0, 0]), 5) + KD.label({ x: P(W).x + 8, y: P(W).y - 4 }, 'w', { size: 12, fill: 'var(--spring)' });
      g.innerHTML = out;
      if (aOut) aOut.value = ta.toFixed(0) + '°'; if (bOut) bOut.value = tb.toFixed(0) + '°';
      if (msg) msg.textContent = 'w ∝ (tan ' + ta.toFixed(0) + '°, tan ' + tb.toFixed(0) + '°, 1): each slider moves one projection only.';
    }
    function fromUI() { auto = autoIn ? autoIn.checked : false; if (!auto) { a = parseFloat(aIn.value); b = parseFloat(bIn.value); draw(a, b); } }
    if (aIn) aIn.addEventListener('input', function () { if (autoIn) autoIn.checked = false; fromUI(); });
    if (bIn) bIn.addEventListener('input', function () { if (autoIn) autoIn.checked = false; fromUI(); });
    if (autoIn) autoIn.addEventListener('change', fromUI);
    loop(function (t) {
      if (auto && t !== undefined) {
        if (t0 === null) t0 = t; var s = (t - t0) / 1000;
        a = 30 * Math.sin(s * 0.6); b = 30 * Math.sin(s * 0.6 + Math.PI / 2) * (Math.floor(s / 10.47) % 2 ? 1 : 0);
        if (Math.floor(s / 10.47) % 2 === 0) { b = 0; } else { a = 0; b = 30 * Math.sin(s * 0.6); }
        if (aIn) aIn.value = a.toFixed(0); if (bIn) bIn.value = b.toFixed(0);
        draw(a, b);
      } else if (t === undefined) draw(a, b);
    });
  })();

  // ---------------------------------------------------------------------------------------------
  // Kuo, Dai and Legnani, Robotica 32 (2014) 889: a non-overconstrained variant of the Agile Eye.
  // The platform turns about a fixed spherical joint at O. Three legs lie on the x-, y- and z-axes;
  // each is an actuated revolute on the base axis, a universal joint, and three prismatic joints, so
  // a leg constrains its platform point only to a plane that contains the base axis and turns with
  // the input. The leg on the x-axis holds the point on the platform's v-axis, so its input angle is
  // the projective angle of v on the yz-plane; cyclically for the others. Three plane angles fix the
  // orientation: solved here by Newton's method on a rotation vector.
  // ---------------------------------------------------------------------------------------------
  (function () {
    var svg = document.getElementById('agile');
    if (!svg) return;
    var P = ISO.make(170, 165, 0.8), l = 60, Lax = 110;
    var g = svg.querySelector('#aBody');
    var ins = ['agX', 'agY', 'agZ'].map(function (id) { return document.getElementById(id); }), outs = ['agXOut', 'agYOut', 'agZOut'].map(function (id) { return document.getElementById(id); });
    var autoIn = document.getElementById('agAuto'), msg = document.getElementById('agMsg');
    var th = [0, 0, 0], rv = [0, 0, 0], auto = true, t0 = null;
    function angles(R) {   // projective angles controlled by the x-, y-, z-legs
      var u = ISO.apply(R, [1, 0, 0]), v = ISO.apply(R, [0, 1, 0]), w = ISO.apply(R, [0, 0, 1]);
      return [Math.atan2(v[2], v[1]), Math.atan2(w[0], w[2]), Math.atan2(u[1], u[0])];
    }
    function solve(target) {
      for (var it = 0; it < 12; it++) {
        var R = ISO.rotvec(rv), e = angles(R).map(function (a, i) { return a - target[i]; });
        if (Math.hypot(e[0], e[1], e[2]) < 1e-7) break;
        var J = [];
        for (var j = 0; j < 3; j++) { var d = rv.slice(); d[j] += 1e-5; var a2 = angles(ISO.rotvec(d)); J.push(a2.map(function (a, i) { return (a - e[i] - target[i]) / 1e-5; })); }
        // J[j][i] = d e_i / d rv_j ; solve 3x3 by Cramer
        var A = [J[0][0], J[1][0], J[2][0], J[0][1], J[1][1], J[2][1], J[0][2], J[1][2], J[2][2]];
        var det = A[0] * (A[4] * A[8] - A[5] * A[7]) - A[1] * (A[3] * A[8] - A[5] * A[6]) + A[2] * (A[3] * A[7] - A[4] * A[6]);
        if (Math.abs(det) < 1e-12) break;
        function sub(c, b) { var M = A.slice(); M[c] = b[0]; M[c + 3] = b[1]; M[c + 6] = b[2]; return M[0] * (M[4] * M[8] - M[5] * M[7]) - M[1] * (M[3] * M[8] - M[5] * M[6]) + M[2] * (M[3] * M[7] - M[4] * M[6]); }
        var dx = [sub(0, e) / det, sub(1, e) / det, sub(2, e) / det];
        rv = [rv[0] - dx[0], rv[1] - dx[1], rv[2] - dx[2]];
      }
      return ISO.rotvec(rv);
    }
    function plane(axis, ang) {   // a quad hinged on the base axis `axis`, turned by ang
      var e = [[1, 0, 0], [0, 1, 0], [0, 0, 1]][axis], n0 = [[0, 1, 0], [0, 0, 1], [1, 0, 0]][axis], n1 = [[0, 0, 1], [1, 0, 0], [0, 1, 0]][axis];
      var d = ISO.add(ISO.mul(n0, Math.cos(ang)), ISO.mul(n1, Math.sin(ang)));
      var a = ISO.mul(e, 18), b = ISO.mul(e, 100), w = 60;
      return [ISO.add(a, d, -12), ISO.add(b, d, -12), ISO.add(b, d, w), ISO.add(a, d, w)];
    }
    function draw(R) {
      var u = ISO.apply(R, [1, 0, 0]), v = ISO.apply(R, [0, 1, 0]), w = ISO.apply(R, [0, 0, 1]);
      var Ax = ISO.mul(v, l), Ay = ISO.mul(w, l), Az = ISO.mul(u, l), an = angles(R);
      var fills = ['var(--link-fill)', 'var(--mag-stator)', 'var(--mag-rotor)'], out = '';
      // the three planes (far ones first), each with its hinge on the base axis
      [0, 1, 2].forEach(function (i) {
        out += ISO.poly(P, plane(i, an[i]), 'fill="' + fills[i] + '" stroke="var(--fg)" stroke-width="1" opacity=".55"');
      });
      out += ISO.axes(P, Lax);
      // revolute actuators on the axes
      [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach(function (e, i) {
        var c = P(ISO.mul(e, 90)); out += '<rect x="' + f(c.x - 6) + '" y="' + f(c.y - 6) + '" width="12" height="12" rx="2" fill="var(--card)" stroke="var(--fg)" stroke-width="1.4"/>' + KD.label({ x: c.x + 8, y: c.y - 6 }, 'θ', { size: 11, sub: 'xyz'[i] });
      });
      // sliders on the planes (the PPP chain) and the platform
      [Ax, Ay, Az].forEach(function (A, i) { var p = P(A); out += '<rect x="' + f(p.x - 5) + '" y="' + f(p.y - 5) + '" width="10" height="10" fill="var(--card)" stroke="var(--fg)" stroke-width="1.2"/>'; });
      out += ISO.poly(P, [Ax, Ay, Az], 'fill="var(--link-fill)" stroke="var(--fg)" stroke-width="2" stroke-linejoin="round" opacity=".92"');
      out += ISO.seg(P, [0, 0, 0], Ax, 'stroke="var(--fg)" stroke-width="1.6"') + ISO.seg(P, [0, 0, 0], Ay, 'stroke="var(--fg)" stroke-width="1.6"') + ISO.seg(P, [0, 0, 0], Az, 'stroke="var(--fg)" stroke-width="1.6"');
      out += KD.joint(P([0, 0, 0]), 7) + KD.joint(P(Ax), 3.5) + KD.joint(P(Ay), 3.5) + KD.joint(P(Az), 3.5);
      out += KD.label({ x: P(Az).x + 6, y: P(Az).y + 12 }, 'u', { size: 11, fill: 'var(--spring)' }) + KD.label({ x: P(Ax).x + 7, y: P(Ax).y + 4 }, 'v', { size: 11, fill: 'var(--spring)' }) + KD.label({ x: P(Ay).x - 12, y: P(Ay).y - 4 }, 'w', { size: 11, fill: 'var(--spring)' });
      g.innerHTML = out;
      outs.forEach(function (o, i) { if (o) o.value = (an[i] * 180 / Math.PI).toFixed(0) + '°'; });
      if (msg) msg.textContent = 'Each input turns one plane; the platform point on that plane follows, and the other two inputs read unchanged.';
    }
    function fromUI() { auto = autoIn ? autoIn.checked : false; if (!auto) { th = ins.map(function (i) { return parseFloat(i.value) * Math.PI / 180; }); draw(solve(th)); } }
    ins.forEach(function (i) { if (i) i.addEventListener('input', function () { if (autoIn) autoIn.checked = false; fromUI(); }); });
    if (autoIn) autoIn.addEventListener('change', fromUI);
    loop(function (t) {
      if (auto && t !== undefined) {
        if (t0 === null) t0 = t; var s = (t - t0) / 1000, k = Math.floor(s / 6) % 3;
        th = [0, 0, 0]; th[k] = 35 * Math.PI / 180 * Math.sin((s % 6) / 6 * 2 * Math.PI);
        ins.forEach(function (i, j) { if (i) i.value = (th[j] * 180 / Math.PI).toFixed(0); });
        draw(solve(th));
      } else if (t === undefined) draw(solve(th));
    });
  })();

  // ---------------------------------------------------------------------------------------------
  // Kuo and Dai, Mech. Mach. Theory 70 (2013) 394: task-oriented structure synthesis with a motion
  // constraint generator. One serial "motion constraint leg" has exactly the degrees of freedom the
  // end-effector should have, so it alone fixes the motion type; the remaining legs are "auxiliary
  // actuation legs" with the full freedom of the space (here 3 in the plane), which add no constraint
  // and only carry the actuators. Planar illustration: a PR constraint leg (translate along x, then
  // rotate) gives a 2-DOF end-effector; two RRR legs with actuated base joints drive it.
  // ---------------------------------------------------------------------------------------------
  (function () {
    var svg = document.getElementById('mcg');
    if (!svg) return;
    var g = svg.querySelector('#mBody');
    var showC = true, t0 = null, msg = document.getElementById('mcMsg'), cIn = document.getElementById('mcConstraint');
    var rail = { y: 200, x0: 60, x1: 280 }, B1 = { x: 70, y: 232 }, B2 = { x: 270, y: 232 }, L1 = 95, L2 = 95, plat = 44;
    function ik(base, tip, elbowSign) {   // planar 2R inverse kinematics
      var dx = tip.x - base.x, dy = tip.y - base.y, d = Math.hypot(dx, dy), c = Math.min(1, Math.max(-1, (d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2)));
      var q2 = elbowSign * Math.acos(c), q1 = Math.atan2(dy, dx) - Math.atan2(L2 * Math.sin(q2), L1 + L2 * Math.cos(q2));
      return { x: base.x + L1 * Math.cos(q1), y: base.y + L1 * Math.sin(q1) };
    }
    function draw(s) {
      var xs = 170 + 55 * Math.sin(s * 0.7), phi = 0.5 * Math.sin(s * 0.45 + 1), wob = showC ? 0 : 1;
      // without the constraint leg the two actuators cannot fix three freedoms: the platform wanders
      var cx = xs, cy = rail.y - 48 - (wob ? 10 * Math.sin(s * 2.1) : 0), ph = phi + (wob ? 0.25 * Math.sin(s * 1.7) : 0);
      var e1 = { x: cx - plat * Math.cos(ph), y: cy - plat * Math.sin(ph) }, e2 = { x: cx + plat * Math.cos(ph), y: cy + plat * Math.sin(ph) };
      var k1 = ik(B1, e1, 1), k2 = ik(B2, e2, -1), out = '';
      out += KD.wall({ x: 40, y: 240 }, { x: 300, y: 240 }, 1);
      // the constraint leg: a slider on the rail (P) and a revolute to the platform
      if (showC) {
        out += KD.wall({ x: rail.x0, y: rail.y + 6 }, { x: rail.x1, y: rail.y + 6 }, 1) +
               KD.slider({ x: cx, y: rail.y }, 26, 7, 0) + KD.link({ x: cx, y: rail.y }, { x: cx, y: cy }, 2.2) + KD.joint({ x: cx, y: cy }, 4) +
               KD.note({ x: rail.x1 + 2, y: rail.y - 8 }, 'constraint leg: P + R', { size: 8, anchor: 'end' });
      }
      // the auxiliary legs (RRR), actuated at the base
      out += KD.ground(B1, { w: 14 }) + KD.ground(B2, { w: 14 }) +
             KD.link(B1, k1) + KD.link(k1, e1) + KD.link(B2, k2) + KD.link(k2, e2) +
             KD.joint(B1, 5) + KD.joint(B2, 5) + KD.joint(k1, 3.5) + KD.joint(k2, 3.5);
      // the platform
      out += KD.link(e1, e2, 7) + KD.body(e1, e2, 3, 'var(--link-fill)') + KD.joint(e1, 3.5) + KD.joint(e2, 3.5) +
             KD.label({ x: B1.x - 4, y: B1.y + 22 }, 'θ', { size: 11, sub: '1' }) + KD.label({ x: B2.x - 2, y: B2.y + 22 }, 'θ', { size: 11, sub: '2' }) +
             KD.arrow({ x: cx + 60, y: cy }, { x: cx + 84, y: cy }, 'var(--red)', 1.3, 6) + KD.arrow({ x: cx + 60, y: cy }, { x: cx + 36, y: cy }, 'var(--red)', 1.3, 6) +
             '<path d="M' + f(cx - 24) + ',' + f(cy - 22) + ' A26,26 0 0 1 ' + f(cx + 24) + ',' + f(cy - 22) + '" fill="none" stroke="var(--red)" stroke-width="1.3"/>' + KD.arrow({ x: cx + 22, y: cy - 24 }, { x: cx + 26, y: cy - 19 }, 'var(--red)', 1.3, 6);
      g.innerHTML = out;
      if (msg) msg.textContent = showC ? 'Mobility 2: x and the turn φ. The two base motors set them; the constraint leg says what they are.' : 'Constraint leg removed: three freedoms, two motors, the platform is not determined.';
    }
    if (cIn) cIn.addEventListener('change', function () { showC = cIn.checked; });
    loop(function (t) { if (t !== undefined) { if (t0 === null) t0 = t; draw((t - t0) / 1000); } else draw(0); });
  })();
})();
