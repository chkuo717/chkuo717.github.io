// Small animated figures beside the non-representative papers on the theme pages.
// Each entry in MINI draws one paper's figure into a 160 x 110 SVG for time s (seconds).
// One animation loop serves all of them, and a figure only redraws while it is on screen.
// Drawing goes through draw.js (window.KD), in the style of the author's paper figures.
(function () {
  'use strict';
  if (!window.KD) return;
  var f = KD.f, reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function P(x, y) { return { x: x, y: y }; }
  function pol(c, r, a) { return P(c.x + r * Math.cos(a), c.y + r * Math.sin(a)); }   // a from +x, clockwise on screen
  function up(c, r, th) { return P(c.x + r * Math.sin(th), c.y - r * Math.cos(th)); }   // th from the upward vertical
  function smooth(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  function txt(p, s, size, fill, anchor) { return KD.note(p, s, { size: size || 7.5, fill: fill || 'var(--fg-2)', anchor: anchor }); }
  function bar(x, y0, h, w, color) { var y = h >= 0 ? y0 - h : y0; return '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + w + '" height="' + f(Math.abs(h)) + '" fill="' + color + '"/>'; }
  function gsm(c, r) { return '<circle cx="' + f(c.x) + '" cy="' + f(c.y) + '" r="' + r + '" fill="var(--link-fill)" stroke="var(--fg)" stroke-width="1"/>'; }

  var MINI = {
    // ---- gravity balancing ------------------------------------------------------------------
    // Nguyen, Kuo and Lin, MMT 2024: a gravity-balanced arm under dynamic loads. Statically the
    // gear-spring module cancels the weight, so slow motion needs almost no torque; fast motion
    // needs the inertial torque I*alpha, which no static balancer removes.
    MMT2024: function (s) {
      // the paper's Figs. 2-5: a 3-DOF planar arm (1, 0.8, 0.5 m) with a gear-spring module at each joint, link 3 kept
      // horizontal, moving a payload P1 -> P5 (up 0.4, right 0.45, down 0.4, right 0.2 m). Balance is exact only at P1;
      // the motor torque that remains grows with acceleration. One slow pass, then one fast pass, each there and back.
      var K = 45, O = P(22, 96), l1 = 1, l2 = 0.8, l3 = 0.5, pts = [[1.4, .17], [1.4, .57], [1.85, .57], [1.85, .17], [2.05, .17]];
      function pathAt(q) { q = Math.max(0, Math.min(4, q)); var i = Math.min(3, Math.floor(q)), u = smooth(q - i), a = pts[i], b = pts[i + 1]; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; }
      var T = s % 11, fast = T >= 8, legT = fast ? 0.375 : 1, tt = fast ? T - 8 : T, span = 4 * legT;
      function qAt(t) { return t < span ? t / legT : (2 * span - t) / legT; }
      function E(t) { return pathAt(qAt(t)); }
      var e = E(tt), h = 0.01, e1 = E(Math.max(0, tt - h)), e2 = E(tt + h), acc = Math.hypot((e2[0] - 2 * e[0] + e1[0]) / (h * h), (e2[1] - 2 * e[1] + e1[1]) / (h * h));
      var w = [e[0] - l3, e[1]], r = Math.hypot(w[0], w[1]), ph = Math.atan2(w[1], w[0]), be = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + r * r - l2 * l2) / (2 * l1 * r))));
      var j1 = [l1 * Math.cos(ph + be), l1 * Math.sin(ph + be)];
      function S(q) { return P(O.x + K * q[0], O.y - K * q[1]); }
      var J1 = S(j1), W = S(w), Ee = S(e);
      function mod(a, b) { var u = KD.unit(a, b); return KD.spring(P(a.x + u.x * 9, a.y + u.y * 9), P(a.x + u.x * 22, a.y + u.y * 22), 5, 1.8) + '<circle cx="' + f(a.x + u.x * 5) + '" cy="' + f(a.y + u.y * 5) + '" r="3" fill="var(--link-fill)" stroke="var(--fg)" stroke-width=".8"/>'; }
      var out = KD.ground(O, { w: 11 }) + KD.link(O, J1, 2.6) + KD.link(J1, W, 2.4) + KD.link(W, Ee, 2.2) + mod(O, J1) + mod(J1, W) + KD.joint(O, 3) + KD.joint(J1, 2.6) + KD.joint(W, 2.4);
      out += '<rect x="' + f(Ee.x - 1) + '" y="' + f(Ee.y - 4) + '" width="8" height="8" fill="var(--mass)" stroke="var(--fg)" stroke-width="1"/>';
      var tq = Math.min(42, 2 + 2.2 * acc);
      out += '<line x1="128" y1="80" x2="154" y2="80" stroke="var(--line)"/>' + bar(136, 80, tq, 12, 'var(--red)') + txt(P(142, 92), 'motor', 7, 'var(--fg-2)', 'middle') + txt(P(142, 100), 'torque', 7, 'var(--fg-2)', 'middle');
      return out + txt(P(6, 12), fast ? 'fast: inertia needs torque' : 'slow: nearly balanced', 8, fast ? 'var(--red)' : 'var(--fg)');
    },
    // Nguyen, Kuo and Lin, JMR 2022: reliability of spring balancing with uncertain stiffness and
    // dimensions. Twelve sampled designs (k within a few per cent) give a band of leftover torque.
    JMR2022: function (s) {
      // the paper's Figs. 1, 5, 7, 8: a serial arm balanced at the shoulder and the elbow by two gear-spring modules.
      // Over a trajectory the unbalanced torque is high; the ideal balanced torque is low but not flat; with uncertain
      // dimensions, masses and stiffness (Monte Carlo) it spreads into a band above the ideal curve.
      var u = (s * 0.12) % 1, a1 = 0.52 + 0.25 * Math.sin(2 * Math.PI * u * 2), a2 = 1.57 + 0.3 * Math.sin(2 * Math.PI * u * 3 + 1);
      var Sh = P(30, 70), El = up(Sh, 28, a1), Wr = up(El, 28, a1 + a2 - a1 * 0 - 0.1);
      function mod(a, b) { var v = KD.unit(a, b); return '<circle cx="' + f(a.x) + '" cy="' + f(a.y) + '" r="3.5" fill="var(--link-fill)" stroke="var(--fg)" stroke-width=".8"/>' + KD.spring(P(a.x + v.x * 8, a.y + v.y * 8), P(a.x + v.x * 21, a.y + v.y * 21), 5, 1.7); }
      var out = KD.link(P(30, 96), Sh, 4) + KD.ground(P(30, 96), { w: 12 }) + KD.link(Sh, El, 2.4) + KD.link(El, Wr, 2.2) + mod(Sh, El) + mod(El, Wr) + KD.joint(Sh, 2.6) + KD.joint(El, 2.4) + KD.disc(Wr, 3.5, 'var(--mass)');
      var X0 = 84, Y0 = 88, Wd = 70, Hd = 70, ub = '', id = '', bt = '', bb = '';
      for (var i = 0; i <= 40; i++) {
        var t = i / 40, x = X0 + Wd * t;
        var yu = Y0 - Hd * (0.575 + 0.3 * Math.sin(2 * Math.PI * 2 * t)), yi = Y0 - Hd * (0.04 + 0.2 * t + 0.03 * Math.sin(4 * Math.PI * t)), yt = yi - Hd * (0.03 + 0.18 * t);
        ub += (i ? 'L' : 'M') + f(x) + ',' + f(yu); id += (i ? 'L' : 'M') + f(x) + ',' + f(yi); bt += (i ? 'L' : 'M') + f(x) + ',' + f(yt); bb = 'L' + f(x) + ',' + f(yi) + bb;
      }
      out += '<rect x="' + X0 + '" y="18" width="' + Wd + '" height="' + Hd + '" fill="none" stroke="var(--line)"/>' + '<path d="' + bt + bb.replace(/^L/, 'L') + 'Z" fill="var(--red)" fill-opacity=".2" stroke="none"/>';
      out += '<path d="' + ub + '" fill="none" stroke="var(--spring)" stroke-width="1.3"/><path d="' + id + '" fill="none" stroke="var(--red)" stroke-width="1.2" stroke-dasharray="3 2"/>';
      var cx = X0 + Wd * u; out += '<line x1="' + f(cx) + '" y1="18" x2="' + f(cx) + '" y2="88" stroke="var(--fg-2)" stroke-dasharray="2 2"/>';
      return out + txt(P(119, 99), 'unbalanced', 7, 'var(--spring)', 'middle') + txt(P(119, 108), 'balanced, with uncertainty', 6.5, 'var(--red)', 'middle') + txt(P(6, 12), 'torque vs time', 7, 'var(--fg-2)');
    },
    // Nguyen, Lin and Kuo, JMR 2020: a gear-spring module on every link of a planar articulated arm.
    JMR2020: function (s) {
      // the paper's Figs. 1-3: on each link, gear 1 is fixed at the joint to the previous link (or ground), gear 2 sits on
      // the link at H (ratio 2); its crank drives a slider that compresses a spring along the link. Balance is exact at
      // one chosen posture and close elsewhere.
      var O = P(40, 90), t1 = 0.7 + 0.45 * Math.sin(s * 0.7), t2 = 1.3 + 0.6 * Math.sin(s * 0.9 + 1);
      var J = up(O, 50, t1), E = up(J, 46, t1 + t2 - 1.2);
      function module(a, b) { var u = KD.unit(a, b); return '<circle cx="' + f(a.x) + '" cy="' + f(a.y) + '" r="2.8" fill="var(--ground)" stroke="var(--fg)" stroke-width=".9"/>' + gsm(P(a.x + u.x * 8.3, a.y + u.y * 8.3), 5.5) + KD.spring(P(a.x + u.x * 17, a.y + u.y * 17), P(a.x + u.x * 37, a.y + u.y * 37), 6, 2); }
      return KD.ground(O, { w: 12 }) + KD.body(O, J, 3.2) + KD.body(J, E, 3) + module(O, J) + module(J, E) + KD.joint(O, 2) + KD.joint(J, 2) + KD.mass(E, 5.5, '') +
        txt(P(154, 92), 'one module per link', 8, 'var(--fg)', 'end') + txt(P(154, 104), 'joint torques ≈ 0', 8, 'var(--red)', 'end');
    },
    // Nguyen and Kuo, MMT 2019: stiffness of spring-articulated arms. A link on a compliant joint
    // under a tip load deflects by an amount that depends on its posture (exaggerated here).
    MMT2019: function (s) {
      // the paper's Fig. 5a: a link pivoted at O with compliant actuation, balanced by a linear spring from a ground anchor
      // above O to a point on the link; under a tip force it deflects by an amount that depends on posture (exaggerated).
      var O = P(46, 70), th = 0.2 + 1.2 * (0.5 - 0.5 * Math.cos(s * 0.6)), L = 62, dfl = 0.28 * Math.sin(th);
      var Er = up(O, L, th), Ed = up(O, L, th + dfl), An = P(O.x, O.y - 32), Bk = up(O, 28, th + dfl), Mid = up(O, 31, th + dfl);
      return KD.ground(O, { w: 12 }) + KD.ground(An, { w: 9, plain: true, up: true }) + '<line x1="' + f(O.x) + '" y1="' + f(O.y) + '" x2="' + f(Er.x) + '" y2="' + f(Er.y) + '" stroke="var(--fg-2)" stroke-width="1" stroke-dasharray="3 2"/>' +
        KD.link(O, Ed, 2.6) + KD.spring(An, Bk, 7, 2.2) + KD.pin(An) + KD.pin(Bk) + KD.joint(O, 3.2) +
        KD.arrow(Mid, P(Mid.x, Mid.y + 12), 'var(--fg-2)', 1, 4) + KD.label(P(Mid.x + 3, Mid.y + 12), 'mg', { size: 7, fill: 'var(--fg-2)' }) +
        KD.arrow(P(Ed.x, Ed.y - 2), P(Ed.x, Ed.y + 18), 'var(--red)', 1.4, 5) + KD.label(P(Ed.x + 4, Ed.y + 16), 'F', { size: 9, fill: 'var(--red)' }) +
        KD.thin(Er, Ed) + txt(P(154, 104), 'deflection depends on posture', 7.5, 'var(--fg-2)', 'end');
    },
    // Nguyen and Kuo, chapter 2022: gear-spring modules as building blocks on serial and quasi-serial arms.
    BC02: function (s) {
      // the chapter's Fig. 10: a quasi-serial arm with both actuators at O1. Link 1 runs from O1 to O2; link 2 is a straight
      // bar from D2 through O2 to E; crank 3 at O1 (parallel to O2-D2) and link 4 (parallel to link 1) form the
      // parallelogram that drives link 2 from the ground. One gear-spring module at O1 (on link 1), one at O2 (on link 2).
      var deg = Math.PI / 180, t1 = (32.5 + 12.5 * Math.sin(s * 0.55)) * deg, ps = (25 + 15 * Math.sin(s * 0.8 + 1)) * deg;
      var O1 = P(50, 98), O2 = P(O1.x + 44 * Math.sin(t1), O1.y - 44 * Math.cos(t1)), d2 = P(Math.cos(ps), Math.sin(ps));
      var D1 = P(O1.x - 15 * d2.x, O1.y - 15 * d2.y), D2 = P(O2.x - 15 * d2.x, O2.y - 15 * d2.y), E = P(O2.x + 35 * d2.x, O2.y + 35 * d2.y);
      function mod(a, b) { var v = KD.unit(a, b); return gsm(P(a.x + v.x * 6, a.y + v.y * 6), 4.5) + KD.spring(P(a.x + v.x * 13, a.y + v.y * 13), P(a.x + v.x * 30, a.y + v.y * 30), 5, 1.8); }
      var out = KD.ground(O1, { w: 11 }) + KD.link(O1, O2, 2.6) + KD.link(D2, E, 2.6) + KD.link(O1, D1, 2) + KD.link(D1, D2, 1.8) + mod(O1, O2) + mod(O2, E);
      [O1, O2, D1, D2].forEach(function (q) { out += KD.joint(q, 2.4); });
      return out + KD.mass(E, 5, '') + txt(P(154, 12), 'quasi-serial arm, both motors at O₁', 7.5, 'var(--fg)', 'end');
    },
    // ---- reconfigurable --------------------------------------------------------------------
    // Kuo, Su and Wu, Mech. Sci. 2017: the cube puzzle's configurations generated one from the next
    // by joint-screw matrices; here the cube opens to the slab and closes again.
    MS2017: function (s) {
      // the paper's Figs. 1-2: configurations are reached one coaxial-joint pair at a time. A (cube) -> B: the top-right
      // column turns 180 deg about a hinge at x = 2, z = 1, giving an L/step; B -> C: the top-left column turns 180 deg
      // about a hinge at x = 0, z = 1, giving the flat 4x2x1 slab. Then back.
      var Pp = (function (ox, oy, k) { var cx = Math.cos(Math.PI / 6), sx = Math.sin(Math.PI / 6); return function (p) { return P(ox + k * cx * (p[1] - p[0]), oy + k * sx * (p[0] + p[1]) - k * p[2]); }; })(84, 62, 14);
      var T = s % 8, a1 = T < 1 ? 0 : T < 3 ? Math.PI * smooth((T - 1) / 2) : T < 6.5 ? Math.PI : Math.PI * (1 - smooth((T - 6.5) / 1.5));
      var a2 = T < 3 ? 0 : T < 5 ? Math.PI * smooth((T - 3) / 2) : T < 5.5 ? Math.PI : T < 6.5 ? Math.PI * (1 - smooth((T - 5.5) / 1)) : 0;
      function rot(p, cx, cz, a, sg) { var dx = p[0] - cx, dz = p[2] - cz, c = Math.cos(a), sn = Math.sin(a); return sg > 0 ? [cx + dx * c + dz * sn, p[1], cz - dx * sn + dz * c] : [cx + dx * c - dz * sn, p[1], cz + dx * sn + dz * c]; }
      var faces = [];
      [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 0, 1], [0, 0, 1]].forEach(function (c, i) {
        var v = []; for (var k = 0; k < 8; k++) v.push([c[0] + (k & 1), c[1] + ((k >> 1) & 1), c[2] + ((k >> 2) & 1)]);
        if (c[2] === 1 && c[0] === 1) v = v.map(function (p) { return rot(p, 2, 1, a1, 1); });
        if (c[2] === 1 && c[0] === 0) v = v.map(function (p) { return rot(p, 0, 1, a2, -1); });
        [[0, 1, 3, 2], [4, 5, 7, 6], [0, 1, 5, 4], [2, 3, 7, 6], [0, 2, 6, 4], [1, 3, 7, 5]].forEach(function (q) {
          var pts = q.map(function (k) { return v[k]; }), d = 0; pts.forEach(function (p) { d += p[0] + p[1] + p[2]; });
          faces.push({ pts: pts, d: d, i: i });
        });
      });
      faces.sort(function (x, y) { return x.d - y.d; });
      var lab = T < 1 ? 'A' : T < 3 ? 'A → B' : T < 5 ? 'B → C' : T < 5.5 ? 'C' : 'C → A';
      return faces.map(function (fc) { return '<polygon points="' + fc.pts.map(function (p) { return KD.pt(Pp(p)); }).join(' ') + '" fill="' + (fc.i === 0 ? 'var(--mag-stator)' : 'var(--card)') + '" stroke="var(--fg)" stroke-width=".9" stroke-linejoin="round"/>'; }).join('') +
        txt(P(6, 12), 'configuration ' + lab, 8, 'var(--fg)') + txt(P(6, 106), 'one coaxial joint pair turns at a time', 7, 'var(--fg-2)');
    },
    // ---- medical ---------------------------------------------------------------------------
    // Vyas, Aquino, Kuo, Dai and Dasgupta, BJU Int. 2011: flexible robotics, an arm that bends along its length.
    BJUI2011: function (s) {
      // the paper's Fig. 2: a parallel robot whose remote centre of motion re-aligns itself to the trocar point on the
      // abdominal wall, instead of a fixed fulcrum. Sliders on a frame rail and two-bar legs hold the tool.
      function wy(x) { return 74 - 0.16 * (x - 14); }
      var k = Math.floor(s / 4) % 2, fx = 64 + 34 * (k ? smooth((s % 4) / 1.2) : 1 - smooth((s % 4) / 1.2)), F = P(fx, wy(fx));
      var th = 0.35 * Math.sin(s * 1.1), dep = 10 + 6 * Math.sin(s * 0.8), d = P(Math.sin(th), Math.cos(th));
      function along(k) { return P(F.x + d.x * k, F.y + d.y * k); }
      var out = KD.wall(P(10, 12), P(150, 12), -1) + '<line x1="14" y1="' + f(wy(14)) + '" x2="154" y2="' + f(wy(154)) + '" stroke="var(--pin)" stroke-width="4" stroke-linecap="round"/>';
      function leg(S, Q, side) {
        var dx = Q.x - S.x, dy = Q.y - S.y, dd = Math.min(Math.hypot(dx, dy), 51), l = 26, h = Math.sqrt(Math.max(0, l * l - dd * dd / 4)), m = P(S.x + dx / 2, S.y + dy / 2), n = P(-dy / Math.hypot(dx, dy), dx / Math.hypot(dx, dy));
        var K = P(m.x + side * h * n.x, m.y + side * h * n.y);
        return KD.slider(S, 12, 4, 0) + KD.link(S, K, 1.8) + KD.link(K, Q, 1.8) + KD.joint(S, 2) + KD.joint(K, 2) + KD.joint(Q, 2);
      }
      var Q1 = along(-18), Q2 = along(-30);
      out += KD.link(along(-36), along(dep), 2.6) + leg(P(Q1.x - 34, 12), Q1, -1) + leg(P(Q2.x + 34, 12), Q2, 1) + KD.disc(F, 3, 'var(--mass)');
      return out + txt(P(6, 104), 'RCM re-aligns to the trocar point', 7.5, 'var(--fg)') + txt(P(154, 92), 'abdominal wall', 6.5, 'var(--fg-2)', 'end');
    },
    // Yeow, Wang, Kuo and Ren, Biomim. Intell. Robot. 2025: parallelogram-based RCM mechanisms read as kirigami.
    // A double parallelogram whose output link always passes through a fixed remote centre.
    BIR2025: function (s) {
      // the paper's Fig. 3A(i): a one-DOF double parallelogram. Two ground pivots and the RCM lie on one baseline;
      // two cranks (pivot-A-B, pivot-D-C), two horizontal bars (B-C-T, A-D-M) and the tool T-M through the RCM.
      var a = 0.26 * Math.sin(s * 0.7), L = 70, u = P(Math.sin(a), -Math.cos(a));
      function at(p, k) { return P(p.x + u.x * k, p.y + u.y * k); }
      var G1 = P(22, 92), G2 = P(66, 92), R = P(112, 92);
      var A = at(G1, L / 2), B = at(G1, L), D = at(G2, L / 2), C = at(G2, L), M = at(R, L / 2), T = at(R, L);
      var out = '<line x1="14" y1="92" x2="152" y2="92" stroke="var(--fg-2)" stroke-width=".8" stroke-dasharray="3 2"/>' + KD.wall(P(16, 92), P(72, 92), 1);
      out += KD.link(G1, B) + KD.link(G2, C) + KD.link(B, T) + KD.link(A, M) + KD.link(T, at(R, -10), 2.6);
      [G1, G2].forEach(function (g) { out += KD.joint(g, 3); }); [A, B, C, D, M, T].forEach(function (q) { out += KD.joint(q, 2.4); });
      out += '<path d="M14,80 A10,10 0 0 1 30,80" fill="none" stroke="var(--red)" stroke-width="1"/>' + KD.disc(R, 3, 'var(--mass)');
      return out + txt(P(154, 12), 'tool always through the red point', 7, 'var(--fg)', 'end') + txt(P(6, 106), 'nothing is pivoted at the RCM', 7, 'var(--fg-2)');
    },
    // Li, Essomba, Wu, Lee, Kuo et al., Proc. IMechE C 2017: an RCM mechanism for craniotomy: drill, then cut by pivoting.
    JMES2017: function (s) {
      // the paper's Figs. 2-3: the remote centre R is the centre of the skull; a parallelogram linkage keeps the drill
      // pointing at R. Drill a burr hole along the tool axis, then cut by swinging about R (a second, orthogonal
      // parallelogram gives the other rotation, shown by the curved arrow on the baseline).
      var T = s % 9, R = P(122, 96), G1 = P(30, 96), G2 = P(76, 96), L = 78, deg = Math.PI / 180;
      var sw = T >= 2 && T < 7.5 ? 12.5 * Math.sin(2 * Math.PI * (T - 2) / 5.5) : 0, al = (13 + sw) * deg, u = P(-Math.sin(al), -Math.cos(al));
      var rt = T < 2 ? 36 - 9 * smooth(T / 2) : T < 7.5 ? 27 : 27 + 9 * smooth((T - 7.5) / 1.5);
      function at(p, k) { return P(p.x + u.x * k, p.y + u.y * k); }
      function ring(r1, r2, a1, a2, fill, op) {   // band about R between radii r1, r2 and angles a1..a2 (deg from up, positive = left)
        function q(r, a) { return P(R.x - r * Math.sin(a * deg), R.y - r * Math.cos(a * deg)); }
        var p1 = q(r2, a1), p2 = q(r2, a2), p3 = q(r1, a2), p4 = q(r1, a1);
        return '<path d="M' + KD.pt(p1) + ' A' + r2 + ',' + r2 + ' 0 0 0 ' + KD.pt(p2) + ' L' + KD.pt(p3) + ' A' + r1 + ',' + r1 + ' 0 0 1 ' + KD.pt(p4) + 'Z" fill="' + fill + '" fill-opacity="' + op + '" stroke="var(--fg)" stroke-width=".8"/>';
      }
      var out = ring(26, 32, -25, 55, 'var(--mag-rotor)', '.45');
      if (T >= 2) { var hi = Math.min(1, (T - 2) / 1.375), lo = T > 4.75 ? Math.min(1, (T - 4.75) / 1.375) : 0; out += ring(26, 32, 13 - 12.5 * lo, 13 + 12.5 * hi, 'var(--red)', '.55'); }
      var TL = at(G1, L), TM = at(G2, L), TR = at(R, L), ML = at(G2, 0.69 * L), MR = at(R, 0.69 * L);
      out += '<line x1="20" y1="96" x2="152" y2="96" stroke="var(--fg-2)" stroke-width=".8" stroke-dasharray="3 2"/>' + KD.wall(P(24, 96), P(82, 96), 1);
      out += KD.link(G1, TL) + KD.link(G2, TM) + KD.link(TL, TR) + KD.link(ML, MR) + KD.link(TR, at(R, rt), 2.4) + KD.disc(at(R, rt), 2, 'var(--fg)');
      [G1, G2].forEach(function (g) { out += KD.joint(g, 2.8); }); [TL, TM, TR, ML, MR].forEach(function (q) { out += KD.joint(q, 2.2); });
      out += '<path d="M94,100 A7,3 0 1 0 104,100" fill="none" stroke="var(--fg)" stroke-width=".9"/>' + KD.disc(R, 2.6, 'var(--mass)');
      return out + txt(P(154, 12), T < 2 ? 'drill a burr hole' : T < 7.5 ? 'cut: swing about the centre' : 'retract', 7.5, 'var(--fg)', 'end') + txt(P(154, 22), 'remote centre = skull centre', 6.5, 'var(--fg-2)', 'end');
    },
    // ---- collaborations --------------------------------------------------------------------
    // Nguyen, Kuo and Lin, MMT 2022: compliance error compensation of a Delta robot mounted on an articulated arm for milling.
    MMT2022: function (s) {
      // the paper's Figs. 1, 4: the arm parks; the Delta robot on its flange moves the tool along the path. Each actuated
      // upper arm carries a spring (gear-spring mechanism). Joint compliance makes the cut deviate (dashed); the springs
      // sized by the paper's formulas reduce the deviation (blue), they do not remove it.
      var px = 80 + 38 * Math.sin(s * 0.7), out = KD.wall(P(10, 96), P(150, 96), 1) + '<rect x="14" y="80" width="132" height="16" fill="var(--bg-2)" stroke="var(--fg)" stroke-width="1"/>';
      function dev(x, a) { return a * Math.sin((x - 20) / 120 * Math.PI * 3); }
      var d1 = '', d2 = ''; for (var i = 0; i <= 40; i++) { var xx = 20 + 120 * i / 40; d1 += (i ? 'L' : 'M') + f(xx) + ',' + f(80 + dev(xx, 5)); d2 += (i ? 'L' : 'M') + f(xx) + ',' + f(80 + dev(xx, 1)); }
      out += '<path d="' + d1 + '" fill="none" stroke="var(--red)" stroke-width="1" stroke-dasharray="3 2"/><path d="' + d2 + '" fill="none" stroke="var(--spring)" stroke-width="1.6"/>';
      out += KD.link(P(80, 18), P(30, 2), 6) + KD.joint(P(80, 18), 2.6) + KD.note(P(6, 24), 'arm (parked)', { size: 6.5, fill: 'var(--fg-2)' });
      out += '<polygon points="56,26 104,26 96,18 64,18" fill="var(--link-fill)" stroke="var(--fg)" stroke-width="1"/>';
      var plat = P(px, 62);
      [-1, 0, 1].forEach(function (k) {
        var A = P(80 + 20 * k, 26), Bp = P(px + 6 * k, plat.y), dx = Bp.x - A.x, dy = Bp.y - A.y, dd = Math.hypot(dx, dy), l1 = 18, l2 = 30;
        var ca = Math.max(-1, Math.min(1, (l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd))), ang = Math.atan2(dy, dx) + (k <= 0 ? -1 : 1) * Math.acos(ca) * (k === 0 ? 0 : 1);
        if (k === 0) ang = Math.atan2(dy, dx) - Math.acos(ca);
        var E = P(A.x + l1 * Math.cos(ang), A.y + l1 * Math.sin(ang));
        out += KD.link(A, E, 2) + KD.link(E, Bp, 1.2) + KD.spring(P(A.x + 0.2 * (E.x - A.x), A.y + 0.2 * (E.y - A.y)), P(A.x + 0.8 * (E.x - A.x), A.y + 0.8 * (E.y - A.y)), 4, 1.6) + KD.joint(A, 1.8) + KD.joint(E, 1.6);
      });
      out += '<rect x="' + f(px - 9) + '" y="' + f(plat.y - 2) + '" width="18" height="4" fill="var(--card)" stroke="var(--fg)" stroke-width="1"/>' + KD.link(plat, P(px, 78), 2.2) + KD.note(P(112, 40), 'Delta', { size: 7, fill: 'var(--fg-2)' });
      return out + txt(P(6, 107), 'dashed: deflected cut; blue: with springs (smaller)', 6.5, 'var(--fg-2)');
    },
    // ---- theory ----------------------------------------------------------------------------
    // Yan, Huang and Kuo, Antique Mechanism Models in Taiwan (2008): the book catalogues teaching models;
    // a crank and slider stands for the kind of model the collection holds.
    BK01: function (s) {
      var O = P(40, 64), r = 16, l = 62, th = s * 1.2, A = pol(O, r, th), B = P(A.x + Math.sqrt(l * l - Math.pow(A.y - O.y, 2)), O.y);
      return '<rect x="10" y="86" width="140" height="10" rx="2" fill="#B8860B" fill-opacity=".35" stroke="var(--fg)" stroke-width="1"/>' +
        KD.wall(P(80, 74), P(146, 74), 1) + KD.ground(O, { w: 12 }) + '<circle cx="' + O.x + '" cy="' + O.y + '" r="' + r + '" fill="none" stroke="var(--fg)" stroke-width="1" stroke-dasharray="2 2"/>' +
        KD.link(O, A, 2.6) + KD.link(A, B, 2.4) + KD.slider(B, 18, 7, 0) + KD.joint(O, 3) + KD.joint(A, 2.6) + KD.joint(B, 2.6) + txt(P(154, 14), 'a teaching model', 8, 'var(--fg)', 'end');
    },
    // Kuo, Linkage Synthesis and Force Analysis by Using Relative Poles (GeoGebra e-book, 2024): the pole P12 of two
    // positions of a body, where the perpendicular bisectors of A1A2 and B1B2 meet; then its first use, two-position
    // synthesis: fixed pivots A0 and B0 taken anywhere on the bisectors give a four-bar that carries the body from 1 to 2.
    BK04: function (s) {
      var Pp = P(108, 82), A1 = P(36, 76), B1 = P(74, 58), al = 80 * Math.PI / 180;
      function rot(p, a) { var c = Math.cos(a), n = Math.sin(a), x = p.x - Pp.x, y = p.y - Pp.y; return P(Pp.x + x * c - y * n, Pp.y + x * n + y * c); }
      function on(p, q, t) { return P(Pp.x + t * ((p.x + q.x) / 2 - Pp.x), Pp.y + t * ((p.y + q.y) / 2 - Pp.y)); }   // a point on the bisector of pq
      function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
      var A2 = rot(A1, al), B2 = rot(B1, al), A0 = on(A1, A2, 1.6), B0 = on(B1, B2, 0.6), T = s % 13, A, B, out = '';
      function bis(p, q, full) {                       // chord, arc about P12, dashed bisector, right-angle mark
        var m = P((p.x + q.x) / 2, (p.y + q.y) / 2), u = KD.unit(p, q), v = KD.unit(m, Pp), r = dist(Pp, p), k = 3.2;
        var far = P(Pp.x - v.x * (r + 5), Pp.y - v.y * (r + 5));
        return KD.dashed(p, q) + KD.dashed(far, Pp) +
          (full ? '<path d="M' + KD.pt(p) + ' A' + f(r) + ',' + f(r) + ' 0 0 1 ' + KD.pt(q) + '" fill="none" stroke="var(--fg-2)" stroke-width="1" stroke-dasharray="1.5 2.5"/>' : '') +
          '<polyline points="' + KD.pt(P(m.x + u.x * k, m.y + u.y * k)) + ' ' + KD.pt(P(m.x + (u.x + v.x) * k, m.y + (u.y + v.y) * k)) + ' ' + KD.pt(P(m.x + v.x * k, m.y + v.y * k)) + '" fill="none" stroke="var(--fg)" stroke-width=".8"/>';
      }
      if (T < 6) {                                   // the pole: the body turns about P12 from position 1 to 2 and back
        var a = al * smooth((T < 3 ? T - 0.5 : 5.5 - T) / 2);
        A = rot(A1, a); B = rot(B1, a);
        out += bis(A1, A2, true) + bis(B1, B2, true);
      } else {                                       // two-position synthesis: a four-bar A0 A B B0 does the same move
        var lA = dist(A0, A1), lB = dist(B0, B1), lAB = dist(A1, B1), a1 = Math.atan2(A1.y - A0.y, A1.x - A0.x), a2 = Math.atan2(A2.y - A0.y, A2.x - A0.x);
        var da = a2 - a1; while (da > 0) da -= 2 * Math.PI;      // the crank turns back, the way that keeps the branch
        var ca = a1 + da * smooth((T < 9.5 ? T - 6.5 : 12.5 - T) / 2.5);
        A = P(A0.x + lA * Math.cos(ca), A0.y + lA * Math.sin(ca));
        var d = dist(A, B0), x = (d * d + lAB * lAB - lB * lB) / (2 * d), h = Math.sqrt(Math.max(0, lAB * lAB - x * x)), e = KD.unit(A, B0);
        B = P(A.x + e.x * x + e.y * h, A.y + e.y * x - e.x * h);          // the branch through B1 and B2
        out += bis(A1, A2, false) + bis(B1, B2, false) + KD.link(A0, A, 1.6) + KD.link(B0, B, 1.6) + KD.ground(A0, { w: 9, up: true }) + KD.ground(B0, { w: 9 }) +
          KD.joint(A0, 2.4) + KD.joint(B0, 2.4) + KD.label(P(A0.x + 7, A0.y + 4), 'A', { size: 9, sub: '0' }) + KD.label(P(B0.x + 7, B0.y - 1), 'B', { size: 9, sub: '0' });
      }
      out += '<g opacity=".4">' + KD.link(A1, B1) + KD.link(A2, B2) + KD.joint(A1, 2.6) + KD.joint(B1, 2.6) + KD.joint(A2, 2.6) + KD.joint(B2, 2.6) + '</g>' +
        KD.link(A, B) + KD.joint(A, 3) + KD.joint(B, 3) + KD.label(P(A1.x - 12, A1.y + 12), 'A', { size: 9, sub: '1' }) + KD.label(P(A2.x - 14, A2.y + 2), 'A', { size: 9, sub: '2' }) +
        KD.disc(Pp, 3, 'var(--mass)') + KD.label(P(Pp.x + 6, Pp.y + 4), 'P', { size: 10, sub: '12' });
      return out + txt(P(154, 106), T < 6 ? 'the relative pole' : 'two-position synthesis', 8, 'var(--fg)', 'end');
    },

    // ---- more gravity balancing ------------------------------------------------------------
    // Kuo, Nguyen, Robertson, Chou and Herder, JMR 2021: one spring balances both modes of a
    // reconfigurable linkage. Mode I swings the lower link, mode II swings the parallelogram arm;
    // a cable over pulleys carries both motions to the same grounded spring.
    JMR2021b: function (s) {
      // the paper's Figs. 1-3 (hip O on the right). Thigh link 2 runs left from O through N to A; calf link 6 hangs from A,
      // link 3 from N, link 7 joins them (parallelogram). Link 4 joins Q on link 3 to slider B under O; link 9 is pinned at N
      // and kept vertical by link 8 from ground pivot D. One spring above O pulls a cable N-G-F-H. Mode I: link 2 still,
      // links 3 and 6 swing about N and A. Mode II: link 2 turns about O, links 3, 6, 7, 9 translate up. In both the
      // cable path shortens and the spring relaxes as the leg rises.
      var T = s % 10, deg = Math.PI / 180, t1 = T < 4 ? 20 * deg * Math.sin(Math.PI * T / 4) : 0, t2 = T >= 5 && T < 9 ? 20 * deg * Math.sin(Math.PI * (T - 5) / 4) : 0;
      var O = P(109, 44), D = P(109, 60), dir2 = P(-Math.cos(t2), -Math.sin(t2));
      var N = P(O.x + 47 * dir2.x, O.y + 47 * dir2.y), A = P(O.x + 68 * dir2.x, O.y + 68 * dir2.y), dn = P(-Math.sin(t1), Math.cos(t1));
      function on(p, k) { return P(p.x + dn.x * k, p.y + dn.y * k); }
      var N7 = on(N, 45), A7 = on(A, 45), Foot = on(A, 60), Q = on(N, 29), G = on(N, 38);
      var By = 73, Bx = t2 > 0 ? 109 : Q.x + Math.sqrt(Math.max(0, 47 * 47 - Math.pow(By - Q.y, 2))), B = P(Bx, By);
      var F = P(N.x, N.y - 15), E = P(N.x, N.y + 16), H = P(111, 7), Cc = t2 > 0 ? O : P(Bx, 44 - (Bx - 109) * Math.tan(t2));
      var Lc = Math.hypot(N.x - G.x, N.y - G.y) + Math.hypot(G.x - F.x, G.y - F.y) + Math.hypot(F.x - H.x, F.y - H.y);
      var L0 = 38 + Math.hypot(0, 53) + Math.hypot(49, 22), top = Math.min(22, 14 + (L0 - Lc));
      var out = KD.ground(O, { w: 10 }) + KD.ground(D, { w: 8, plain: true }) + KD.wall(P(80, 76), P(150, 76), 1);
      out += KD.link(O, A, 2.6) + KD.link(A, Foot, 2.6) + KD.link(N, N7, 2) + KD.link(A7, N7, 1.8) + KD.link(Q, B, 1.6) + KD.link(B, Cc, 1.4) + KD.link(F, E, 1.6) + KD.link(E, D, 1.6);
      out += KD.slider(B, 8, 3, 0) + KD.cable([N, G, F, H, P(111, top)]) + KD.spring(P(111, top), P(111, 26), 5, 2) + KD.ground(P(111, 26), { w: 7, plain: true });
      [O, N, A, N7, A7, Q, E, D].forEach(function (q) { out += KD.joint(q, 2); }); [G, F, H].forEach(function (q) { out += '<circle cx="' + f(q.x) + '" cy="' + f(q.y) + '" r="2.4" fill="var(--card)" stroke="var(--cable)" stroke-width="1"/>'; });
      out += KD.mass(Foot, 4, '');
      return out + txt(P(6, 12), t1 > 0 ? 'mode I: calf swings' : t2 > 0 ? 'mode II: thigh swings' : 'transition pose', 8, 'var(--fg)') + txt(P(6, 23), 'one spring, both modes', 6.5, 'var(--fg-2)');
    },
    // Hsiu, Syu and Kuo, Proc. IMechE C 2015: a slider-type monitor stand balanced by a two-step disk,
    // a bent lever and an ordinary extension spring (schematic).
    JMES2015: function (s) {
      // the paper's Figs. 5-6: a two-step disk (big and small wheel) on a fixed axle; the monitor string hangs from the big
      // wheel; a string from the small wheel pulls the long right arm of a bent lever pivoted below-left of the disk; a
      // string from the short left arm runs over the small wheel to a vertical extension spring grounded below.
      // Pulling the monitor down turns the disk and the lever (about 40 deg) and stretches the spring.
      var u = 0.5 - 0.5 * Math.cos(s * 0.55), Dc = P(70, 30), Pv = P(52, 77);
      function lerp(a, b) { return P(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u); }
      var Lt = lerp(P(39, 59), P(33, 73)), Rt = lerp(P(98, 97), P(103, 64)), my = 61 + 39 * u, sTop = 70 - 10 * u;
      var out = '<circle cx="' + Dc.x + '" cy="' + Dc.y + '" r="24" fill="var(--link-fill)" stroke="var(--fg)" stroke-width="1.1"/><circle cx="' + Dc.x + '" cy="' + Dc.y + '" r="6" fill="var(--card)" stroke="var(--fg)" stroke-width="1"/>';
      for (var i = 0; i < 4; i++) { var a = -u * 2.2 + i * Math.PI / 2; out += KD.line(P(Dc.x + 8 * Math.cos(a), Dc.y + 8 * Math.sin(a)), P(Dc.x + 22 * Math.cos(a), Dc.y + 22 * Math.sin(a)), 'stroke="var(--fg)" stroke-width=".8"'); }
      out += KD.joint(Dc, 2);
      out += KD.line(P(46, Dc.y), P(46, my - 10), 'stroke="var(--fg)" stroke-width="1.2"') + '<rect x="36" y="' + f(my - 10) + '" width="20" height="18" fill="var(--card)" stroke="var(--fg)" stroke-width="1.2"/>' + txt(P(46, my + 2), 'monitor', 5.5, 'var(--fg-2)', 'middle');
      out += KD.line(P(76, Dc.y), Rt, 'stroke="var(--spring)" stroke-width="1"') + KD.line(Lt, P(64, Dc.y), 'stroke="var(--red)" stroke-width="1"') + KD.line(P(76, Dc.y), P(76, sTop), 'stroke="var(--red)" stroke-width="1"');
      out += KD.link(Lt, Pv, 2.4) + KD.link(Pv, Rt, 2.4) + KD.ground(Pv, { w: 10 }) + KD.joint(Pv, 2.4) + KD.spring(P(76, sTop), P(76, 85), 6, 2.4) + KD.ground(P(76, 85), { w: 8, plain: true });
      return out + txt(P(154, 12), 'stays at any height', 7.5, 'var(--fg)', 'end') + txt(P(154, 106), 'schematic, after the paper’s Fig. 6', 6.5, 'var(--fg-2)', 'end');
    },
    // ---- magnetic --------------------------------------------------------------------------
    // Li, Zeng and Kuo, ASME Lett. Transl. Robot. 2026: two stator magnets on a frame, the mover between them;
    // the lower stator pushes, the upper one pulls, and the sum stays nearly constant over the stroke.
    ALTR2026: function (s) {
      // the paper's Figs. 1-2: a stator frame (base plate and central housing) holds the lower and upper stator magnets;
      // the mover magnet, wider than both, is held by an inverted-cup mover frame that carries the load on its top
      // platform. Magnetisation (Fig. 2): upper stator N up, mover N up, lower stator N down, so the lower stator repels
      // and the upper one attracts; as the mover rises the push weakens and the pull grows, keeping the lift nearly constant.
      var z = 8 * Math.sin(s * 0.45), my = 60 - z, out = KD.wall(P(24, 104), P(106, 104), 1) + '<line x1="30" y1="104" x2="100" y2="104" stroke="var(--fg)" stroke-width="2"/>';
      out += KD.link(P(45, 104), P(45, 30), 2) + KD.link(P(85, 104), P(85, 30), 2);
      out += '<rect x="47" y="32" width="36" height="9" fill="var(--mag-stator)" stroke="var(--fg)" stroke-width="1.1"/><rect x="47" y="92" width="36" height="9" fill="var(--mag-stator)" stroke="var(--fg)" stroke-width="1.1"/>';
      out += '<rect x="38" y="' + f(my - 4) + '" width="54" height="8" fill="var(--mag-rotor)" stroke="var(--fg)" stroke-width="1.1"/>';
      out += KD.arrow(P(56, 39), P(56, 33), 'var(--mag-arrow)', 1.4, 4) + KD.arrow(P(56, 94), P(56, 100), 'var(--mag-arrow)', 1.4, 4) + KD.arrow(P(74, my + 3), P(74, my - 3), 'var(--mag-arrow-2)', 1.4, 4);
      var tb = my - 40;
      out += KD.link(P(36, my), P(36, tb), 2) + KD.link(P(94, my), P(94, tb), 2) + KD.link(P(32, tb), P(98, tb), 3);
      out += '<rect x="55" y="' + f(tb - 10) + '" width="20" height="9" fill="var(--mass)" stroke="var(--fg)" stroke-width="1"/>' + KD.arrow(P(84, tb - 12), P(84, tb - 2), 'var(--fg)', 1.2, 4) + KD.label(P(87, tb - 4), 'g', { size: 8, sub: 'm' });
      out += '<line x1="128" y1="56" x2="154" y2="56" stroke="var(--line)"/>' + bar(136, 56, 24, 10, 'var(--spring)');
      return out + txt(P(141, 92), 'lift', 7, 'var(--fg-2)', 'middle') + txt(P(141, 100), '≈ const.', 7, 'var(--fg-2)', 'middle');
    },
    // ---- parallel --------------------------------------------------------------------------
    // Kuo and Dai, chapter 2011: a 3SPS/PS parallel manipulator, three extensible SPS legs and a central PS leg.
    BC03: function (s) {
      var h = 50 + 8 * Math.sin(s * 0.6), tilt = 0.18 * Math.sin(s * 0.8), base = 96, c = P(80, base - h);
      var pl = [P(c.x - 30 * Math.cos(tilt), c.y - 30 * Math.sin(tilt)), P(c.x + 30 * Math.cos(tilt), c.y + 30 * Math.sin(tilt))];
      var out = KD.wall(P(20, base + 2), P(140, base + 2), 1) + '<line x1="30" y1="' + base + '" x2="130" y2="' + base + '" stroke="var(--fg)" stroke-width="2.4"/>';
      [[34, pl[0]], [126, pl[1]], [62, P(c.x - 12 * Math.cos(tilt), c.y - 12 * Math.sin(tilt))]].forEach(function (q) {
        var b = P(q[0], base), m = P((b.x + q[1].x) / 2, (b.y + q[1].y) / 2);
        out += KD.link(b, m, 3.4) + KD.link(m, q[1], 1.8) + KD.joint(b, 2.6) + KD.joint(q[1], 2.4);
      });
      out += KD.link(P(80, base), P(80, base - 26), 4) + KD.link(P(80, base - 26), c, 2) + KD.link(pl[0], pl[1], 4) + KD.joint(c, 3) + KD.joint(P(80, base), 2.6);
      return out + txt(P(154, 12), '3SPS legs + central PS leg', 7.5, 'var(--fg)', 'end');
    },

    // ---- reconfigurable --------------------------------------------------------------------
    // Kuo, Dai and Yan, J. Sci. Innov. 2012: reconfiguration principles. A pin in an L-shaped slot: the
    // prismatic joint changes direction, P(y) to P(x), one of the ways a mechanism changes its topology.
    JSI2012: function (s) {
      // the paper's Fig. 3: block A in an L-shaped slot of link B. A slides down (P along y), switches at the corner, then
      // slides right (P along x): the relative arrangement of the joint changes, a change of configuration (principle 4).
      var T = s % 6, u = T < 2.5 ? T / 2.5 : T < 3 ? 1 : T < 5.5 ? 1 + (T - 3) / 2.5 : 2;
      var c = u <= 1 ? P(48, 26 + 52 * smooth(u)) : P(48 + 70 * smooth(u - 1), 78);
      var out = '<path d="M40,18 L56,18 L56,70 L126,70 L126,86 L40,86 Z" fill="var(--bg-2)" stroke="var(--fg)" stroke-width="1.2"/>';
      out += '<rect x="' + f(c.x - 7) + '" y="' + f(c.y - 7) + '" width="14" height="14" fill="var(--mag-rotor)" stroke="var(--fg)" stroke-width="1.2"/>' + KD.label(P(c.x - 3, c.y + 3.5), 'A', { size: 8 });
      out += KD.label(P(132, 82), 'B', { size: 9 }) + KD.arrow(P(64, 40), P(64, 28), 'var(--fg-2)', 1, 4) + KD.arrow(P(64, 40), P(76, 40), 'var(--fg-2)', 1, 4) + KD.label(P(60, 27), 'y', { size: 8, fill: 'var(--fg-2)' }) + KD.label(P(78, 43), 'x', { size: 8, fill: 'var(--fg-2)' });
      return out + txt(P(150, 30), u < 1 ? 'P(y)' : u < 1.05 ? 'corner' : 'P(x)', 11, 'var(--fg)', 'end') + txt(P(6, 104), 'the joint changes its direction', 7.5, 'var(--fg-2)');
    },
    // Yan and Kuo, Trans. CSME 2006: a four-bar Geneva mechanism whose slider clamps and releases the wheel;
    // stages A to D, with the slider-block joint going fixed, prismatic, separated, prismatic.
    TCSME2006: function (s) {
      // four-slot Geneva: centre distance d, crank radius = wheel radius = d sin 45 deg; the pin is in a slot
      // while its angle about the crank centre lies within +-45 deg of the line to the wheel centre
      var d = 46, a = d * Math.SQRT1_2, W = P(104, 54), C = P(W.x - d, W.y), T = s % 8;
      var phi = 2 * Math.PI * (T / 8) - Math.PI, pin = pol(C, a, phi), eng = Math.abs(phi) <= Math.PI / 4;
      var rot = phi < -Math.PI / 4 ? 0 : eng ? (Math.atan2(pin.y - W.y, pin.x - W.x) - 1.25 * Math.PI) : -Math.PI / 2;
      rot = ((rot + 3 * Math.PI) % (2 * Math.PI)) - Math.PI; if (!eng && phi > 0) rot = -Math.PI / 2;
      var st = phi < -0.75 * Math.PI || phi > 0.75 * Math.PI ? 'A' : phi < -Math.PI / 4 ? 'B' : eng ? 'C' : 'D';
      var out = '<g transform="rotate(' + f(rot * 180 / Math.PI) + ' ' + W.x + ' ' + W.y + ')"><circle cx="' + W.x + '" cy="' + W.y + '" r="' + f(a) + '" fill="var(--card)" stroke="var(--fg)" stroke-width="1.4"/>';
      for (var i = 0; i < 4; i++) { var ang = Math.PI / 4 + i * Math.PI / 2; var q0 = P(W.x + (a - 18) * Math.cos(ang), W.y + (a - 18) * Math.sin(ang)), q1 = P(W.x + (a + 2) * Math.cos(ang), W.y + (a + 2) * Math.sin(ang)); out += KD.line(q0, q1, 'stroke="var(--fg)" stroke-width="8" stroke-linecap="butt"') + KD.line(q0, P(q1.x + 2 * Math.cos(ang), q1.y + 2 * Math.sin(ang)), 'stroke="var(--card)" stroke-width="5.2" stroke-linecap="butt"'); }
      out += '</g>' + KD.joint(W, 2.6);
      // the clamping slider under the wheel: down (clamped) in A and D, up (released) in B and C
      // back layer (the paper's Fig. 1, rear view): a square block on the wheel shaft turns with the wheel; a slider with a
      // V-notch on the line C-W clamps a block corner (joint X), is pushed back by a cam on the crank (P), dwells clear of
      // the block while the pin turns the wheel (D, separated), and is returned by its spring (P).
      var rel = st === 'A' ? 0 : st === 'B' ? 0.4 * smooth((phi + 0.75 * Math.PI) / (Math.PI / 2)) : st === 'C' ? 1 : 1 - smooth((phi - Math.PI / 4) / (Math.PI / 2));
      if (st === 'B' && rel > 0.38) rel = 0.4;
      var back = 'stroke="var(--fg-2)" stroke-width="1" stroke-dasharray="2 1.5"';
      out += '<g transform="rotate(' + f(rot * 180 / Math.PI + 45) + ' ' + W.x + ' ' + W.y + ')"><rect x="' + (W.x - 8) + '" y="' + (W.y - 8) + '" width="16" height="16" fill="none" ' + back + '/></g>';
      var xr = W.x - 11.3 + 4 - (st === 'C' ? 10 : 10 * rel), sy = W.y;
      out += '<polygon points="' + f(xr - 12) + ',' + (sy - 5) + ' ' + f(xr) + ',' + (sy - 5) + ' ' + f(xr - 4) + ',' + sy + ' ' + f(xr) + ',' + (sy + 5) + ' ' + f(xr - 12) + ',' + (sy + 5) + '" fill="none" stroke="var(--red)" stroke-width="1.1" stroke-dasharray="2 1.5"/>';
      var camA = phi, cam = [[-3, -4], [3, -2.5], [3, 2.5], [-3, 4]].map(function (q) { var r = Math.hypot(q[0] + 8, q[1]), a0 = Math.atan2(q[1], q[0] + 8) + camA; return f(C.x + r * Math.cos(a0)) + ',' + f(C.y + r * Math.sin(a0)); }).join(' ');
      out = '<polygon points="' + cam + '" fill="none" ' + back + '/>' + out;
      out += KD.ground(C, { w: 10 }) + KD.link(C, pin, 2.4) + KD.joint(C, 2.6) + KD.disc(pin, 3, 'var(--mass)');
      var code = { A: 'X (fixed)', B: 'P (sliding)', C: 'D (separated)', D: 'P (sliding)' }[st];
      return out + txt(P(6, 12), 'stage ' + st, 9, 'var(--fg)') + txt(P(6, 24), st === 'C' ? 'wheel free' : st === 'D' ? 're-clamping' : 'wheel clamped', 7.5, 'var(--fg-2)') + txt(P(6, 96), 'dashed: block and V-slider behind the wheel', 6.5, 'var(--fg-2)') + txt(P(6, 106), 'slider\u2013block joint: ' + code, 7.5, 'var(--fg-2)');
    },
    // Yan and Kuo, JMD 2006: a variable kinematic joint, the two-member key ring. The pin slides out of a slot
    // (prismatic), then both slides and turns, then only turns: states as nodes of a small digraph.
    JMD2006: function (s) {
      // the paper's Fig. 11: a two-member key chain. The split ring's pin end slides in a straight slot of the frame
      // (P along x); clear of the frame it can also turn about x (P+R); at the slot's end it only turns about x (R).
      // Fig. 11d: states u, v, w joined both ways.
      var T = s % 18, t = T < 9 ? T : 18 - T, px, th;
      if (t < 3) { px = 30 + 28 * smooth(t / 3); th = 0; } else if (t < 6) { px = 58 + 4 * smooth((t - 3) / 3); th = 70 * smooth((t - 3) / 3); } else { px = 62; th = 70 + 80 * smooth((t - 6) / 3); }
      var st = t < 3 ? 0 : t < 6 ? 1 : 2, ct = Math.cos(th * Math.PI / 180), cx = px + 20, cy = 60, d = '';
      for (var i = 0; i <= 40; i++) { var a = 0.3 + (2 * Math.PI - 0.6) * i / 40, x = cx - 20 * Math.cos(a), y = cy + 20 * Math.sin(a) * ct; d += (i ? 'L' : 'M') + f(x) + ',' + f(y); }
      var out = '<circle cx="40" cy="60" r="18" fill="var(--bg-2)" stroke="var(--fg)" stroke-width="1.2"/>' + KD.line(P(30, 60), P(58, 60), 'stroke="var(--fg)" stroke-width="1" stroke-dasharray="3 2"');
      out += '<path d="' + d + '" fill="none" stroke="var(--spring)" stroke-width="2.4"/>' + KD.disc(P(px, 60), 3, 'var(--fg)');
      var nodes = [P(134, 22), P(134, 56), P(134, 90)], lab = ['P', 'P+R', 'R'];
      for (i = 0; i < 2; i++) { var a0 = nodes[i], a1 = nodes[i + 1]; out += KD.arrow(P(a0.x - 4, a0.y + 9), P(a1.x - 4, a1.y - 9), 'var(--fg-2)', 1, 4) + KD.arrow(P(a1.x + 4, a1.y - 9), P(a0.x + 4, a0.y + 9), 'var(--fg-2)', 1, 4); }
      nodes.forEach(function (n, i) { out += '<circle cx="' + n.x + '" cy="' + n.y + '" r="9" fill="' + (i === st ? 'var(--mass)' : 'var(--card)') + '" stroke="var(--fg)" stroke-width="1.1"/>' + txt(P(n.x, n.y + 3), lab[i], 7, i === st ? '#fff' : 'var(--fg)', 'middle'); });
      return out + txt(P(6, 12), ['key-holding', 'ring-rotatable', 'key-collectable'][st], 8, 'var(--fg)') + txt(P(6, 106), 'two-member key chain: one joint, three states', 7, 'var(--fg-2)');
    },
    // Kuo, Structural Characteristics of Mechanisms with Variable Topologies (book, 2008): a joint that turns
    // about z, then slides along x, as its pin leaves an arc for a straight slot.
    BK02: function (s) {
      var T = s % 7, u = T < 3 ? smooth(T / 3) : T < 3.5 ? 1 : T < 6.5 ? 1 + smooth((T - 3.5) / 3) : 2;
      var C = P(50, 60), r = 28, pin = u <= 1 ? pol(C, r, Math.PI - u * Math.PI / 2) : P(C.x + 60 * (u - 1), C.y - r);
      var out = '<path d="M' + (C.x - r) + ',' + C.y + ' A' + r + ',' + r + ' 0 0 1 ' + C.x + ',' + (C.y - r) + ' L' + (C.x + 70) + ',' + (C.y - r) + '" fill="none" stroke="var(--bg-2)" stroke-width="12" stroke-linecap="round"/>' +
        '<path d="M' + (C.x - r) + ',' + C.y + ' A' + r + ',' + r + ' 0 0 1 ' + C.x + ',' + (C.y - r) + ' L' + (C.x + 70) + ',' + (C.y - r) + '" fill="none" stroke="var(--fg)" stroke-width=".8" stroke-dasharray="2 2"/>';
      out += KD.ground(C, { w: 10 }) + KD.joint(C, 2.6) + (u <= 1 ? KD.link(C, pin, 2) : KD.slider(pin, 16, 6, 0)) + KD.disc(pin, 4.5, 'var(--mass)');
      return out + txt(P(150, 96), u <= 1 ? 'R(z)' : 'P(x)', 11, 'var(--fg)', 'end') + txt(P(6, 106), 'the joint changes its kind', 7.5, 'var(--fg-2)');
    },

    // ---- medical ---------------------------------------------------------------------------
    // Kuo and Wang, J. Med. Devices 2017: an automatic acupoint catgut-embedding instrument. Step 1 feeds,
    // cuts and loads a catgut segment; step 2 pushes it out through the needle (schematic).
    JMED2017: function (s) {
      // the paper's Figs. 4-5: lever 5 is fixed to the upper roller; turning it clockwise feeds the catgut between the
      // rollers, lifts the cutter on a cam lobe, and through slider 4 (on an inclined guide) and rod 3 pulls the needle
      // seat 2 to the right, flipping the needle 180 deg to take the catgut. The cutter then snaps down; springs return
      // everything. Step 2: slider 8 is pushed left and the acupuncture needle pushes the catgut out (Fig. 4b).
      var T = s % 10, deg = Math.PI / 180, U = P(104, 66), out = '';
      var a = T < 3 ? 18 * deg * smooth(T / 3) : T < 5 ? 18 * deg * (1 - smooth((T - 3) / 2)) : 0;
      var dir = P(Math.sin(a), -Math.cos(a)), g0 = P(88, 26), g1 = P(150, 14), gs = (g1.y - g0.y) / (g1.x - g0.x);
      var t = (U.y - g0.y - gs * (U.x - g0.x)) / (gs * dir.x - dir.y), S4 = P(U.x + dir.x * t, U.y + dir.y * t);
      var xs = S4.x - Math.sqrt(73.8 * 73.8 - Math.pow(56 - S4.y, 2)), flip = smooth((xs - 38) / 16.8), seat = P(xs, 60);
      out += KD.wall(P(6, 44), P(6, 76), -1) + KD.line(P(10, 65), P(84, 65), 'stroke="var(--fg-2)" stroke-width=".8"') + KD.spring(P(6, 60), P(xs - 9, 60), 6, 2);
      out += '<rect x="' + f(xs - 9) + '" y="56" width="18" height="8" fill="var(--card)" stroke="var(--fg)" stroke-width="1.2"/>';
      var nd = P(Math.cos(Math.PI * flip), -Math.sin(Math.PI * flip)), tip = P(xs + 22 * nd.x, 60 + 22 * nd.y);
      out += KD.line(seat, tip, 'stroke="var(--fg)" stroke-width="1.6"');
      var cutT = T >= 3.05 && T < 10;
      if (cutT) { var pushed = T < 5 ? 0 : T < 8 ? smooth((T - 5) / 3) : 1 - smooth((T - 8) / 2), q = 10 + 14 * pushed; out += KD.line(P(xs + q * nd.x, 60 + q * nd.y), P(xs + (q + 6) * nd.x, 60 + (q + 6) * nd.y), 'stroke="#B8860B" stroke-width="2.4"'); }
      var feed = T < 3 ? smooth(T / 3) : 0, ce = 92 - 8 * feed;
      out += KD.line(P(150, 76), P(ce, 76), 'stroke="#B8860B" stroke-width="2.4"');
      var cy = T < 3 ? 62 - 6 * smooth(T / 3) : T < 3.05 ? 56 : 70 - 8 * smooth((T - 3.05) / 1.5);
      out += '<rect x="86" y="' + f(cy) + '" width="4" height="10" fill="var(--fg)"/>' + KD.spring(P(88, 40), P(88, cy), 5, 2) + KD.line(P(82, 40), P(94, 40), 'stroke="var(--fg)" stroke-width="1.2"');
      out += '<circle cx="' + U.x + '" cy="' + U.y + '" r="10" fill="var(--link-fill)" stroke="var(--fg)" stroke-width="1.1"/><circle cx="104" cy="86" r="8" fill="var(--link-fill)" stroke="var(--fg)" stroke-width="1.1"/>';
      out += KD.line(g0, g1, 'stroke="var(--fg-2)" stroke-width="1.2"') + KD.link(U, P(U.x + 46 * dir.x, U.y + 46 * dir.y), 2) + KD.slider(S4, 9, 4, Math.atan2(gs, 1) * 180 / Math.PI) + KD.link(S4, P(xs, 56), 1.2) + KD.joint(U, 2.4);
      var p8 = T < 5 ? 0 : T < 8 ? smooth((T - 5) / 3) : 1 - smooth((T - 8) / 2), x8 = 74 - 14 * p8;
      out += KD.line(P(40, 106), P(150, 106), 'stroke="var(--fg-2)" stroke-width=".8"') + '<rect x="' + f(x8 - 6) + '" y="98" width="12" height="7" fill="var(--card)" stroke="var(--fg)" stroke-width="1.1"/>' + KD.spring(P(x8 + 6, 101.5), P(150, 101.5), 6, 2);
      return out + txt(P(6, 12), T < 5 ? 'step 1: feed, insert, cut' : 'step 2: push the catgut out', 7.5, 'var(--fg)') + txt(P(20, 104), 'slider 8', 6.5, 'var(--fg-2)');
    },
    // Kuo, Liu and Wang, US Patent 10,456,153 (2019): a medical clamping instrument. Turning the drive rod turns
    // a screw through universal joints; the nut moves, and two links swing the jaws open and closed.
    PA01: function (s) {
      // US 10,456,153 B2, Figs. 1, 3, 4: tube 11 pivoted at the wrist to tube 12. The drive rod turns a screw through two
      // universal joints across the wrist; the nut drives rigid rods to the tails of two crossed claw arms pivoted at the
      // distal end: nut toward the jaws opens them, nut away grips. The wrist bends while the screw is still driven.
      var T = s % 8, deg = Math.PI / 180, be = T < 4 ? 0 : 25 * deg * Math.sin(Math.PI * (T - 4) / 4);
      var e = P(Math.cos(be), Math.sin(be)), n = P(-Math.sin(be), Math.cos(be)), W = P(72, 60);
      function at(a, b) { return P(W.x + a * e.x + b * n.x, W.y + a * e.y + b * n.y); }
      var open = T < 4 ? Math.sin(Math.PI * T / 4) : 0, dd = 22 - 3.2 * open, l2 = 145.7, J = at(46, 0);
      var cosd = Math.max(-1, Math.min(1, (dd * dd + 100 - l2) / (20 * dd))), sd = Math.sqrt(1 - cosd * cosd), nut = at(46 - dd, 0);
      var out = '<rect x="6" y="55" width="62" height="10" fill="var(--card)" stroke="var(--fg)" stroke-width="1.2"/>';
      out += '<polygon points="' + [at(3, -5), at(42, -5), at(42, 5), at(3, 5)].map(KD.pt).join(' ') + '" fill="var(--card)" stroke="var(--fg)" stroke-width="1.2"/>';
      out += KD.line(P(8, 60), P(W.x - 5, 60), 'stroke="var(--fg-2)" stroke-width="1.4"') + KD.line(P(W.x - 5, 60), at(5, 0), 'stroke="var(--fg-2)" stroke-width="1.4"');
      for (var i = 0; i < 6; i++) { var x = 6 + ((i * 4 + s * 10) % 24); out += KD.line(at(x, -2.5), at(x + 2, 2.5), 'stroke="var(--fg-2)" stroke-width=".8"'); }
      [P(W.x - 5, 60), at(5, 0)].forEach(function (c) { out += '<circle cx="' + f(c.x) + '" cy="' + f(c.y) + '" r="2.2" fill="var(--card)" stroke="var(--fg)" stroke-width=".9"/>'; });
      out += KD.joint(W, 2.4) + '<polygon points="' + [at(46 - dd - 2, -4), at(46 - dd + 2, -4), at(46 - dd + 2, 4), at(46 - dd - 2, 4)].map(KD.pt).join(' ') + '" fill="var(--link-fill)" stroke="var(--fg)" stroke-width="1"/>';
      [1, -1].forEach(function (sg) {
        var tip = at(46 + 26 * cosd, -sg * 26 * sd), tail = at(46 - 10 * cosd, sg * 10 * sd);
        out += KD.link(nut, tail, 1.2) + KD.link(tail, tip, 2.4) + KD.joint(tail, 1.4);
      });
      out += KD.joint(J, 2.2);
      return out + txt(P(6, 12), T >= 4 ? 'wrist bends; the screw is still driven' : open > 0.5 ? 'nut toward the jaws: open' : 'nut back: grip', 7.5, 'var(--fg)') + txt(P(6, 106), 'screw, nut and rigid rods; universal joints at the wrist', 6.5, 'var(--fg-2)');
    },
    // Kuo, Dai and Dasgupta, Int. J. Med. Robot. 2012: the overview's classification of remote-centre-of-motion
    // mechanisms. Two of the eight types in turn: a circular tracking arc and a parallelogram.
    IJMRCAS2012: function (s) {
      // two of the eight RCM types of the paper's Fig. 11: a circular tracking arc on a revolute whose axis (the
      // dash-dot baseline) passes through the RCM; and a parallelogram on such a revolute.
      var T = s % 10, R, out = '<line x1="6" y1="92" x2="154" y2="92" stroke="var(--fg-2)" stroke-width=".8" stroke-dasharray="6 2 1 2"/>';
      if (T < 5) {
        R = P(80, 92); var be = 0.6 * Math.sin(s * 0.5), cb = Math.cos(be), ps = 0.85 * Math.sin(s * 0.9), d = '';
        for (var i = 0; i <= 30; i++) { var ph = Math.PI * i / 30; d += (i ? 'L' : 'M') + f(R.x + 56 * Math.cos(ph)) + ',' + f(R.y - 56 * Math.sin(ph) * cb); }
        out += KD.wall(P(10, 92), P(24, 92), 1) + '<path d="' + d + '" fill="none" stroke="var(--fg)" stroke-width="3"/>';
        var car = P(R.x + 56 * Math.sin(ps), R.y - 56 * Math.cos(ps) * cb), tu = KD.unit(car, R);
        out += '<rect x="-6" y="-4" width="12" height="8" fill="var(--card)" stroke="var(--fg)" stroke-width="1.2" transform="translate(' + f(car.x) + ',' + f(car.y) + ') rotate(' + f(Math.atan2(tu.y, tu.x) * 180 / Math.PI + 90) + ')"/>';
        out += KD.link(P(car.x - tu.x * 8, car.y - tu.y * 8), R, 2.2) + '<path d="M30,96 A6,3 0 1 0 42,96" fill="none" stroke="var(--fg)" stroke-width=".9"/>';
      } else {
        R = P(104, 92); var al = (10 + 35 * (0.5 - 0.5 * Math.cos(s * 0.9))) * Math.PI / 180, u = P(Math.sin(al), -Math.cos(al)), L = 60;
        function at(p, k) { return P(p.x + u.x * k, p.y + u.y * k); }
        var P1 = P(20, 92), P2 = P(62, 92), TL = at(P1, L), TM = at(P2, L), TR = at(R, L), ML = at(P2, 0.6 * L), MR = at(R, 0.6 * L);
        out += KD.wall(P(6, 92), P(16, 92), 1) + KD.link(P1, P2, 2.4) + KD.link(P1, TL) + KD.link(P2, TM) + KD.link(TL, TR) + KD.link(ML, MR) + KD.link(TR, at(R, -8), 2.4);
        [P1, P2, TL, TM, TR, ML, MR].forEach(function (q) { out += KD.joint(q, 2.2); });
        out += '<path d="M8,96 A6,3 0 1 0 20,96" fill="none" stroke="var(--fg)" stroke-width=".9"/>';
      }
      return out + KD.disc(R, 2.6, 'var(--mass)') + txt(P(154, 12), (T < 5 ? 'circular tracking arc' : 'parallelogram') + ' (2 of 8 types)', 7, 'var(--fg)', 'end');
    },
    // ---- collaborations --------------------------------------------------------------------
    // Wang et al., Eng. Struct. 2025: a bistable unit derived from Waterbomb origami; a strip of units deploys,
    // then some snap to their second state and the strip arches to fit the ground.
    ES2025: function (s) {
      // side view of a chain of channel modules (paper Fig. 6D-E): each module is two panels with a
      // Waterbomb-derived unit on each side. Every unit is bistable, concave or convex. A module whose upper
      // unit is convex and lower unit concave tilts by gamma ~ 6.78 deg (Fig. 6A); a chain of them bends.
      var N = 8, H = 9, sp = 14, g0 = 6.78 * Math.PI / 180, T = s % 16;
      function snap(t0, i) { return smooth((T - t0 - 0.45 * i) / 0.35); }
      var up = [], lo = [];
      for (var i = 0; i < N; i++) {
        var a = 0, b = 0;
        if (T >= 2 && T < 8.5) b = snap(2, i) * (T < 7.5 ? 1 : 1 - smooth((T - 7.5) / 0.8));   // all lower units snap: the chain arches up
        if (T >= 9 && T < 15.5) {                                                          // S shape: upper on the left half, lower on the right half
          var v = smooth((T - 9 - 0.45 * i) / 0.35) * (T < 14.5 ? 1 : 1 - smooth((T - 14.5) / 0.8));
          if (i < 4) a = v; else b = v;
        }
        up.push(a); lo.push(b);
      }
      var p = P(14, T >= 9 ? 56 : 74), phi = 0, pts = [P(p.x, p.y)], ph = [0];
      for (i = 0; i < N; i++) { var gi = (up[i] - lo[i]) * g0; var m = phi + gi / 2; p = P(p.x + sp * Math.cos(m), p.y + sp * Math.sin(m)); phi += gi; pts.push(p); ph.push(phi); }
      function nrm(k) { return P(Math.sin(ph[k]), -Math.cos(ph[k])); }
      var out = '';
      for (i = 0; i < N; i++) {
        [1, -1].forEach(function (side) {
          var n0 = nrm(i), n1 = nrm(i + 1), A = P(pts[i].x + side * H * n0.x, pts[i].y + side * H * n0.y), B = P(pts[i + 1].x + side * H * n1.x, pts[i + 1].y + side * H * n1.y);
          var c = side === 1 ? up[i] : lo[i], nm = P((n0.x + n1.x) / 2, (n0.y + n1.y) / 2), bump = (2 * c - 1) * 4.5;
          var M = P((A.x + B.x) / 2 + side * bump * nm.x, (A.y + B.y) / 2 + side * bump * nm.y);
          out += '<polygon points="' + KD.pt(A) + ' ' + KD.pt(M) + ' ' + KD.pt(B) + '" fill="' + (c > 0.5 ? 'var(--mag-rotor)' : 'var(--link-fill)') + '" stroke="var(--fg)" stroke-width=".9" stroke-linejoin="round"/>';
        });
      }
      for (i = 0; i <= N; i++) { var n = nrm(i); out += KD.line(P(pts[i].x + (H + 1.5) * n.x, pts[i].y + (H + 1.5) * n.y), P(pts[i].x - (H + 1.5) * n.x, pts[i].y - (H + 1.5) * n.y), 'stroke="var(--fg)" stroke-width="2" stroke-linecap="round"'); }
      var lab = T < 2 ? 'all units concave: straight' : T < 8.5 ? 'lower units snap convex: the chain arches' : T < 9 ? 'straight again' : 'upper left, lower right: an S';
      return out + txt(P(6, 12), lab, 7.5, 'var(--fg)') + txt(P(6, 106), 'each convex unit tilts its module by ≈ 6.78°', 7, 'var(--fg-2)');
    },
    // Liu et al., Int. J. Mech. Sci. 2025: a curved loop strip that folds and wraps an object when twisted.
    IJMS2025: function (s) {
      // after the paper's Fig. 1b: (1) a loop strip; (2) pressed along a diameter and bonded at the middle: a
      // figure-eight; (3) the middle is rotated about the long axis, the lobes turn out of the plane; (4) seen from
      // the side, the two lobes fold down and wrap the object (first grasping mode, Fig. 1d).
      var T = s % 12, out = '', C = P(80, 44), lab;
      function path(fn, n) { var d = ''; for (var i = 0; i <= n; i++) { var q = fn(i / n); d += (i ? 'L' : 'M') + f(q.x) + ',' + f(q.y); } return d + 'Z'; }
      if (T < 6.5) {
        // top view: ring -> figure-eight (lemniscate of Gerono) -> apparent width shrinks as the lobes roll
        var m = smooth((T - 1) / 2), roll = smooth((T - 4) / 2.2), a = 34 + 12 * m;
        out += '<path d="' + path(function (u) { var t = 2 * Math.PI * u, rx = C.x + 34 * Math.cos(t), ry = C.y + 34 * Math.sin(t);
          var gx = C.x + 46 * Math.cos(t), gy = C.y + 46 * Math.sin(t) * Math.cos(t) * (1 - 0.8 * roll);
          return P(rx + (gx - rx) * m, ry + (gy - ry) * m); }, 72) + '" fill="none" stroke="var(--mass)" stroke-width="3" stroke-linejoin="round"/>';
        if (m > 0.6) out += '<rect x="' + (C.x - 3) + '" y="' + (C.y - 4) + '" width="6" height="8" fill="var(--spring)"/>';
        if (T >= 4) out += '<path d="M' + (C.x - 9) + ',' + (C.y + 13) + ' A9,4 0 1 0 ' + (C.x + 9) + ',' + (C.y + 13) + '" fill="none" stroke="var(--fg)" stroke-width="1.1"/>' + KD.arrow(P(C.x + 8, C.y + 15), P(C.x + 10, C.y + 12), 'var(--fg)', 1, 4);
        lab = T < 1 ? '1  loop strip (top view)' : T < 4 ? '2  bonded at the middle: a figure-eight' : '3  rotate the middle about the long axis';
      } else {
        // side view: the lobes go from edge-on (flat) to hanging down round the object
        var w = smooth((T - 6.5) / 2.5), R = 24, B = P(80, 22);
        var key = [[0, 0], [0.6, 0.15], [1.05, 0.55], [1.12, 1.05], [0.88, 1.5], [0.5, 1.62], [0.33, 1.3], [0.4, 0.85], [0.27, 0.35], [0, 0]];
        var flat = [[0, 0], [0.5, -0.04], [1, -0.04], [1.5, -0.04], [1.9, 0], [1.55, 0.04], [1.15, 0.04], [0.75, 0.04], [0.35, 0.04], [0, 0]];
        [1, -1].forEach(function (sg) {
          var pts = key.map(function (k, i) { var x = flat[i][0] + (k[0] - flat[i][0]) * w, y = flat[i][1] + (k[1] - flat[i][1]) * w; return P(B.x + sg * R * x, B.y + R * y); });
          var d = 'M' + KD.pt(pts[0]); for (var i = 1; i < pts.length - 1; i++) { var mid = P((pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2); d += ' Q' + KD.pt(pts[i]) + ' ' + KD.pt(mid); } d += ' L' + KD.pt(pts[pts.length - 1]);
          out += '<path d="' + d + '" fill="none" stroke="var(--mass)" stroke-width="3" stroke-linejoin="round"/>';
        });
        var ballY = B.y + R * (0.55 + 0.5 * w) + 4 * (1 - w);
        out = '<circle cx="' + B.x + '" cy="' + f(ballY + 10 * (1 - w)) + '" r="8" fill="#C8D86A" stroke="var(--fg)" stroke-width="1"/>' + out;
        out += KD.link(P(B.x, 4), P(B.x, B.y - 3), 2.4) + '<rect x="' + (B.x - 4) + '" y="' + (B.y - 5) + '" width="8" height="6" fill="var(--spring)"/>';
        lab = '4  the lobes fold down and grasp (side view)';
      }
      return out + txt(P(6, 96), lab, 7.5, 'var(--fg)') + txt(P(6, 106), 'reverse rotation gives a second mode for heavier loads', 6.5, 'var(--fg-2)');
    },
    // Sariyildiz, Mutlu, Roberts, Kuo and Ugurlu, IEEE/ASME T-Mech 2023: a variable stiffness series elastic
    // actuator. Rollers slide along leaf springs to change their effective length; the output gives less.
    TMech2023: function (s) {
      // Paper Figs. 4(d) and 6, Eq. (2): the input is the output link's twist q_l. The rollers ride on the output's
      // mobile frame at radius r, so a twist moves them sideways by delta = 2 r sin(q_l/2) and they push the leaf
      // spring at x_r. The spring is a cantilever from the fixed end loaded at x_r: it bends between the fixed end
      // and the rollers, y = delta x^2 (3 x_r - x) / (2 x_r^3), and runs on straight beyond them. Stiffness ~ 1/x_r^3,
      // so for the same twist the output torque tau_l is large with the rollers near the fixed end, small near the free end.
      var T = s % 10, u = T < 5 ? smooth(T / 5) : 1 - smooth((T - 5) / 5);
      var x0 = 14, L = 88, y0 = 52, amin = 36, a = amin + (L - 6 - amin) * u;
      var qn = Math.sin(s * Math.PI), dl = 6 * qn, kr = Math.pow(amin / a, 3);
      function y(x) { return x <= a ? dl * x * x * (3 * a - x) / (2 * a * a * a) : dl + 1.5 * dl / a * (x - a); }
      var d = 'M' + x0 + ',' + y0;
      for (var i = 1; i <= 40; i++) { var xi = L * i / 40; d += ' L' + f(x0 + xi) + ',' + f(y0 + y(xi)); }
      var out = KD.wall(P(x0, 30), P(x0, 76), -1) + '<rect x="' + x0 + '" y="' + (y0 - 4) + '" width="4" height="8" fill="var(--fg)"/>';
      out += '<path d="M' + x0 + ',' + y0 + ' L' + (x0 + L) + ',' + y0 + '" stroke="var(--fg-2)" stroke-width=".8" stroke-dasharray="2 2"/><path d="' + d + '" fill="none" stroke="var(--spring)" stroke-width="2.6"/>';
      var rx = x0 + a, ry = y0 + dl;
      out += '<circle cx="' + f(rx) + '" cy="' + f(ry - 5) + '" r="3.6" fill="var(--card)" stroke="var(--fg)" stroke-width="1.2"/><circle cx="' + f(rx) + '" cy="' + f(ry + 5) + '" r="3.6" fill="var(--card)" stroke="var(--fg)" stroke-width="1.2"/>';
      out += txt(P(x0 + 1, 86), 'fixed end', 6.5) + txt(P(x0 + L, 86), 'free end', 6.5, 'var(--fg-2)', 'end');
      out += KD.label(P(rx - 4, y0 - 20), 'x', { size: 8 }) + txt(P(rx + 1, y0 - 18), 'r', 5.5, 'var(--fg)');
      // end view: output hub, rollers on the mobile frame at radius R, twist q_l and the torque it takes
      var C = P(138, 56), R = 15, q = 0.5 * qn, th = -Math.PI / 2 + q;
      out += '<circle cx="' + C.x + '" cy="' + C.y + '" r="' + R + '" fill="var(--link-fill)" stroke="var(--fg)" stroke-width="1.2"/><circle cx="' + C.x + '" cy="' + C.y + '" r="2" fill="var(--fg)"/>';
      out += '<path d="M' + C.x + ',' + (C.y - R - 13) + ' L' + C.x + ',' + (C.y - R + 2) + '" stroke="var(--fg-2)" stroke-width=".8" stroke-dasharray="2 2"/>';
      var pr = P(C.x + (R + 5) * Math.cos(th), C.y + (R + 5) * Math.sin(th));
      out += '<path d="M' + C.x + ',' + C.y + ' L' + f(pr.x) + ',' + f(pr.y) + '" stroke="var(--fg)" stroke-width="1"/>';
      [-5, 5].forEach(function (o) { var pp = P(pr.x + o * Math.cos(th), pr.y + o * Math.sin(th)); out += '<circle cx="' + f(pp.x) + '" cy="' + f(pp.y) + '" r="3" fill="var(--card)" stroke="var(--fg)" stroke-width="1.1"/>'; });
      out += '<rect x="' + f(pr.x - 1.4) + '" y="' + f(pr.y - 5) + '" width="2.8" height="10" fill="var(--spring)" transform="rotate(' + f(q * 180 / Math.PI) + ' ' + f(pr.x) + ' ' + f(pr.y) + ')"/>';
      var span = (0.25 + 2.6 * kr) * Math.abs(qn), sg = qn >= 0 ? 1 : -1, Rt = 8.5, a0 = Math.PI / 2 - sg * span / 2, a1 = Math.PI / 2 + sg * span / 2;
      if (Math.abs(qn) > 0.08) {
        var p0 = P(C.x + Rt * Math.cos(a0), C.y + Rt * Math.sin(a0)), p1 = P(C.x + Rt * Math.cos(a1), C.y + Rt * Math.sin(a1));
        out += '<path d="M' + f(p0.x) + ',' + f(p0.y) + ' A' + Rt + ',' + Rt + ' 0 ' + (span > Math.PI ? 1 : 0) + ',' + (sg > 0 ? 1 : 0) + ' ' + f(p1.x) + ',' + f(p1.y) + '" fill="none" stroke="var(--red)" stroke-width="' + f(1 + 1.4 * kr) + '"/>';
        var tg = P(-Math.sin(a1) * sg, Math.cos(a1) * sg);
        out += KD.arrow(P(p1.x - 2 * tg.x, p1.y - 2 * tg.y), P(p1.x + 2.5 * tg.x, p1.y + 2.5 * tg.y), 'var(--red)', 1.2, 4);
      }
      out += KD.label(P(C.x - 4, C.y + R + 11), 'τ', { size: 9, fill: 'var(--red)' }) + txt(P(C.x + 1, C.y + R + 13), 'l', 5.5, 'var(--red)');
      out += KD.label(P(C.x + 7, C.y - R - 14), 'q', { size: 8 }) + txt(P(C.x + 12, C.y - R - 12), 'l', 5.5, 'var(--fg)');
      return out + txt(P(6, 12), u < 0.35 ? 'rollers near the fixed end: stiff' : u > 0.65 ? 'rollers near the free end: soft' : 'rollers moving', 8, 'var(--fg)') +
        txt(P(6, 106), 'same twist qₗ, torque τₗ ∝ 1/xᵣ³', 7, 'var(--fg-2)');
    },

    // ==== representative work: one figure per paper, from the paper's own construction =============
    // ---- gravity balancing ------------------------------------------------------------------
    // Kuo, MMT 2025: by the Walker-Oldham construction (Eq. 5, Fig. 2), the coupler mass m at P is, for gravity, the
    // same as m at A, carried rigidly by the crank, plus m at B, carried by the rocker, plus a fixed m on the ground.
    // Each moving copy gets one zero-free-length spring (kA, kB), and the total energy stays constant.
    MMT2025b: function (s) {
      var r1 = 200, r2 = 70, r3 = 190, r4 = 150, r5 = 150, al = 35 * Math.PI / 180, q = r5 / r3;
      var cA = [1 - q * Math.cos(al), -q * Math.sin(al)], cB = [q * Math.cos(al), q * Math.sin(al)];
      var rA = Math.hypot(cA[0], cA[1]) * r2, dA = Math.atan2(cA[1], cA[0]), rB = Math.hypot(cB[0], cB[1]) * r4, dB = Math.atan2(cB[1], cB[0]);
      var hA = 55, lA = 60, hB = 60, lB = 70, kA = rA / (hA * lA), kB = rB / (hB * lB);
      var HA = [hA * Math.cos(Math.PI / 2 - dA), hA * Math.sin(Math.PI / 2 - dA)], HB = [r1 + hB * Math.cos(Math.PI / 2 - dB), hB * Math.sin(Math.PI / 2 - dB)];
      function solve(t2) {                       // y-up frame, O at the origin, Q at (r1, 0); the branch with N above
        var M = [r2 * Math.cos(t2), r2 * Math.sin(t2)], dx = r1 - M[0], dy = -M[1], d = Math.hypot(dx, dy);
        var a = (r3 * r3 - r4 * r4 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, r3 * r3 - a * a));
        var N = [M[0] + a * dx / d - h * dy / d, M[1] + a * dy / d + h * dx / d], t3 = Math.atan2(N[1] - M[1], N[0] - M[0]), t4 = Math.atan2(N[1], N[0] - r1);
        var Pc = [M[0] + r5 * Math.cos(t3 + al), M[1] + r5 * Math.sin(t3 + al)];
        var LA = [lA * Math.cos(t2), lA * Math.sin(t2)], LB = [r1 + lB * Math.cos(t4), lB * Math.sin(t4)];
        var Ug = Pc[1], Us = 0.5 * kA * (Math.pow(HA[0] - LA[0], 2) + Math.pow(HA[1] - LA[1], 2)) + 0.5 * kB * (Math.pow(HB[0] - LB[0], 2) + Math.pow(HB[1] - LB[1], 2));
        return { M: M, N: N, P: Pc, A: [rA * Math.cos(t2 + dA), rA * Math.sin(t2 + dA)], B: [r1 + rB * Math.cos(t4 + dB), rB * Math.sin(t4 + dB)], LA: LA, LB: LB, Ug: Ug, Us: Us };
      }
      var SC = 0.31, X0 = 30, Y0 = 82;
      function S(p) { return P(X0 + SC * p[0], Y0 - SC * p[1]); }
      var c = solve(-s * 0.7), O = S([0, 0]), Q = S([r1, 0]), M = S(c.M), N = S(c.N), Pm = S(c.P), A = S(c.A), B = S(c.B);
      var out = KD.spring(S(HA), S(c.LA), 7, 2.6) + KD.spring(S(HB), S(c.LB), 7, 2.6) +
        KD.ground(S(HA), { w: 8, plain: true }) + KD.pin(S(HA), 1.8) + KD.ground(S(HB), { w: 8, plain: true }) + KD.pin(S(HB), 1.8);
      out += '<polygon points="' + KD.pt(M) + ' ' + KD.pt(N) + ' ' + KD.pt(Pm) + '" fill="var(--link-fill)" stroke="var(--fg)" stroke-width="1.4" stroke-linejoin="round"/>' +
        KD.link(O, M, 2.4) + KD.link(Q, N, 2.4) + KD.ground(O, { w: 10 }) + KD.ground(Q, { w: 10 }) + KD.joint(O, 2.6) + KD.joint(Q, 2.6) + KD.joint(M, 2.4) + KD.joint(N, 2.4) + KD.pin(S(c.LA), 1.8) + KD.pin(S(c.LB), 1.8);
      out += '<path d="M' + KD.pt(A) + 'L' + KD.pt(Pm) + 'L' + KD.pt(B) + '" fill="none" stroke="var(--mass)" stroke-width=".8" stroke-dasharray="2 2"/>';   // m and its two moving copies, as in Fig. 2
      out += '<circle cx="' + f(A.x) + '" cy="' + f(A.y) + '" r="3.6" fill="none" stroke="var(--mass)" stroke-width="1.1" stroke-dasharray="1.6 1.4"/>' +
        '<circle cx="' + f(B.x) + '" cy="' + f(B.y) + '" r="3.6" fill="none" stroke="var(--mass)" stroke-width="1.1" stroke-dasharray="1.6 1.4"/>' + KD.disc(Pm, 4.2, 'var(--mass)');
      out += KD.label(P(Pm.x + 6, Pm.y - 3), 'm', { size: 9 }) + txt(P(A.x - 5, A.y - 5), 'A', 7, 'var(--fg-2)', 'end') + txt(P(B.x + 5, B.y - 5), 'B', 7, 'var(--fg-2)');
      // energy: gravity (red) + springs (blue) = a constant column
      var lo = 1e9, hi = -1e9;
      for (var i = 0; i < 24; i++) { var e = solve(i * Math.PI / 12); lo = Math.min(lo, e.Ug); hi = Math.max(hi, e.Ug); }
      var tot = c.Ug + c.Us, hg = 34 * (c.Ug - lo) / (hi - lo) + 4, hs = 42 - hg;
      out += bar(143, 96, hg, 8, 'var(--mass)') + bar(143, 96 - hg, hs, 8, 'var(--spring)') + '<line x1="140" y1="54" x2="154" y2="54" stroke="var(--fg)" stroke-width="1"/>' +
        txt(P(147, 104), 'energy', 6.5, 'var(--fg-2)', 'middle');
      return out;
    },
    // Kuo and Wu, MMT 2023: the inverted Cardan gear of Fig. 4. Gear 1 (radius r, pivot OB) carries the arm; the ring gear
    // 2 (radius 2r, pivot OA, r below OB) turns by th/2, and the point A of gear 1 that starts at OA slides along the
    // ring's diameter PQ by 2r sin(th/2). A plain compression spring along PQ, free at th = 0, then stores k r^2 (1 - cos th),
    // the energy the arm gives up when k = mp g L / r^2. The spring on the other side stays at its free length.
    MMT2023: function (s) {
      var r = 16, L = 33, OB = P(54, 55), OA = P(54, 71), th = 1.75 * Math.sin(s * 0.55), h = th / 2;
      var A = P(OB.x + r * Math.sin(th), OB.y + r * Math.cos(th)), m = P(OB.x - L * Math.sin(th), OB.y - L * Math.cos(th));
      var u = P(Math.cos(h), Math.sin(h)), Pe = P(OA.x - 2 * r * u.x, OA.y - 2 * r * u.y), Qe = P(OA.x + 2 * r * u.x, OA.y + 2 * r * u.y);
      var sd = 2 * r * Math.sin(h);                                    // A's travel from OA along PQ (towards Q when > 0)
      var out = '<circle cx="' + f(OA.x) + '" cy="' + f(OA.y) + '" r="' + f(2 * r + 2.2) + '" fill="none" stroke="var(--fg)" stroke-width="1.2"/>' +
        '<circle cx="' + f(OA.x) + '" cy="' + f(OA.y) + '" r="' + f(2 * r) + '" fill="none" stroke="var(--fg)" stroke-width=".7" stroke-dasharray="1.2 1.6"/>';
      out += '<circle cx="' + f(OB.x) + '" cy="' + f(OB.y) + '" r="' + r + '" fill="var(--link-fill)" fill-opacity=".45" stroke="var(--fg)" stroke-width=".9"/>' + KD.thin(Pe, Qe);
      var nearQ = sd >= 0, endS = nearQ ? Qe : Pe, endF = nearQ ? Pe : Qe;
      out += KD.spring(endS, A, 7, 3.2) + KD.spring(endF, OA, 7, 3.2);    // the loaded spring and the idle one at free length
      out += '<line x1="' + f(OB.x) + '" y1="' + f(OB.y) + '" x2="' + f(OA.x) + '" y2="' + f(OA.y) + '" stroke="var(--ground)" stroke-width="4" stroke-linecap="round"/>' +   // link 0, fixed
        KD.link(OB, m, 2.4) + KD.link(OB, A, 1.6) +
        KD.joint(OB, 2.4) + KD.joint(OA, 2.2) + KD.disc(A, 2.6, 'var(--red)') + KD.disc(m, 5, 'var(--mass)');
      out += txt(P(Pe.x - 3, Pe.y + 3), 'P', 7.5, 'var(--fg-2)', 'end') + txt(P(Qe.x + 3, Qe.y + 3), 'Q', 7.5, 'var(--fg-2)') +
        KD.label(P(m.x + (th < 0 ? 7 : -17), m.y - 2), 'm', { size: 9, sub: 'p' }) + KD.label(P(A.x + u.y * 9 - 3, A.y - u.x * 9 + 3), 'A', { size: 8 });
      return out + txt(P(154, 100), 'A slides along PQ,', 7.5, 'var(--fg)', 'end') + txt(P(154, 108), 'which turns by θ/2', 7.5, 'var(--fg-2)', 'end');
    },
    // Nguyen, Lin and Kuo, MMT 2020: the gear-spring module of Fig. 3 on one upper arm of a Delta robot. Gear 1 is fixed
    // to the base at D; gear 2 (twice its size) rolls on it as the arm turns, so its crank pin A turns at half the arm's
    // rate relative to the arm. Through the rod AB it drives the slider B along the arm against a compression spring k,
    // which is free with the arm upright. One module sits on each of the three arms; nothing is added to the workspace.
    MMT2020: function (s) {
      var D = P(80, 88), r1 = 6, r2 = 12, ra = 9, r3 = 22, seat = 58, Lm = 68, ph = 1.05 * Math.sin(s * 0.6);
      var e = P(Math.sin(ph), -Math.cos(ph)), n = P(-e.y, e.x);            // along the arm, and across it
      function W(x, y) { return P(D.x + e.x * x + n.x * y, D.y + e.y * x + n.y * y); }
      var Hx = r1 + r2, g = Math.PI + ph / 2;                              // pin angle relative to the arm (rolling, ratio 2)
      var ax = Hx + ra * Math.cos(g), ay = ra * Math.sin(g), bx = ax + Math.sqrt(r3 * r3 - ay * ay);
      var H = W(Hx, 0), A = W(ax, ay), B = W(bx, 0), S0 = W(seat, 0), Tp = W(Lm, 0);
      var out = '<circle cx="' + f(D.x) + '" cy="' + f(D.y) + '" r="' + r1 + '" fill="var(--ground)" fill-opacity=".5" stroke="var(--fg)" stroke-width="1"/>' +
        KD.ground(D, { w: 12 }) + KD.link(D, Tp, 4.2) + '<line x1="' + f(D.x) + '" y1="' + f(D.y) + '" x2="' + f(Tp.x) + '" y2="' + f(Tp.y) + '" stroke="var(--card)" stroke-width="2"/>';
      out += '<circle cx="' + f(H.x) + '" cy="' + f(H.y) + '" r="' + r2 + '" fill="var(--link-fill)" fill-opacity=".7" stroke="var(--fg)" stroke-width="1"/>';
      out += KD.spring(B, S0, 7, 4) + KD.link(W(seat, -4.5), W(seat, 4.5), 2) + KD.link(H, A, 1.4) + KD.link(A, B, 1.8) +
        '<rect x="-3.5" y="-3" width="7" height="6" fill="var(--card)" stroke="var(--fg)" stroke-width="1.1" transform="translate(' + f(B.x) + ',' + f(B.y) + ') rotate(' + f(ph * 180 / Math.PI - 90) + ')"/>' +
        KD.joint(D, 2.4) + KD.joint(H, 1.8) + KD.joint(A, 1.8) + KD.disc(Tp, 5, 'var(--mass)');
      out += KD.label(P(D.x + 10, D.y + 1), 'D', { size: 8 }) +
        KD.label(P(W(seat - 6, 9).x - 3, W(seat - 6, 9).y + 3), 'k', { size: 9 });
      return out + txt(P(6, 107), 'one arm of a Delta robot', 7, 'var(--fg)') + txt(P(154, 107), 'gears 1 : 2', 7, 'var(--fg-2)', 'end');
    },
    // Chu and Kuo, JMR 2017: the self-regulated balancer of Fig. 3. A parallelogram arm keeps the payload platform level;
    // a zero-free-length spring k joins slider A on the vertical rail above O and slider B on link 2, and balances when
    // k sA sB = g L (masses). With the arm upright A and B coincide, so the weighing mechanism on the platform can move both
    // by the same amount, through two cables, at no cost in energy: a heavier payload is re-balanced without adjustment.
    JMR2017a: function (s) {
      var T = s % 16, O = P(34, 96), O2 = P(60, 96), Lk = 52, sa, mp, th;
      if (T < 6) { th = 0.85 * Math.sin(T / 6 * 2 * Math.PI); sa = 22; mp = 0; }
      else if (T < 8) { th = 0; var u = smooth((T - 6.6) / 1); sa = 22 + 12 * u; mp = smooth((T - 6) / 0.6); }
      else if (T < 14) { th = 0.85 * Math.sin((T - 8) / 6 * 2 * Math.PI); sa = 34; mp = 1; }
      else { th = 0; var w = smooth((T - 14.2) / 1.2); sa = 34 - 12 * w; mp = 1 - smooth((T - 14) / 0.5); }
      var e = P(Math.sin(th), -Math.cos(th)), T1 = P(O.x + e.x * Lk, O.y + e.y * Lk), T2 = P(O2.x + e.x * Lk, O2.y + e.y * Lk);
      var A = P(O.x, O.y - sa), B = P(O.x + e.x * sa, O.y + e.y * sa);
      var out = KD.wall(P(O.x, 12), P(O.x, O.y - 6), -1) + KD.link(O, T1, 2.4) + KD.link(O2, T2, 2.4) +
        KD.link(T1, P(T2.x + 26, T2.y), 2.6) + KD.ground(O, { w: 11 }) + KD.ground(O2, { w: 11 });
      out += '<rect x="' + f(T2.x - 2) + '" y="' + f(T2.y - 9) + '" width="22" height="7" fill="var(--card)" stroke="var(--fg)" stroke-width=".9"/>';
      var bw = 8 + 6 * mp, bh = 5 + 6 * mp;                             // the payload block: light, then heavy
      out += '<rect x="' + f(T2.x + 9 - bw / 2) + '" y="' + f(T2.y - 9 - bh) + '" width="' + f(bw) + '" height="' + f(bh) + '" fill="var(--mass)" stroke="var(--fg)" stroke-width=".9"/>';
      out += KD.spring(A, B, 6, 4) + '<rect x="' + f(A.x - 3) + '" y="' + f(A.y - 2.5) + '" width="6" height="5" fill="var(--card)" stroke="var(--fg)" stroke-width="1"/>' +
        KD.joint(O, 2.6) + KD.joint(O2, 2.6) + KD.joint(T1, 2.4) + KD.joint(T2, 2.4) + KD.disc(B, 2.4, 'var(--card)');
      out += KD.label(P(A.x - 13, A.y + 3), 'A', { size: 8 }) + KD.label(P(B.x + 5, B.y + 8), 'B', { size: 8 }) +
        KD.label(P(T2.x + 18 + 3 * mp, T2.y - 13 - 6 * mp), 'm', { size: 9, sub: 'p' }) + txt(P(T2.x + 21, T2.y + 8), 'regulator', 6, 'var(--fg-2)');
      var msg = T < 6 ? 'light payload: balanced' : T < 8 ? 'heavier payload: A and B move out' : T < 14 ? 'balanced again, no adjustment' : 'payload off: A and B return';
      return out + txt(P(154, 10), msg, 7.5, 'var(--fg)', 'end');
    },

    // ---- magnetic ----------------------------------------------------------------------------
    // Biggs, Kuo and Ren, JMD 2026: Fig. 3. Eight square magnets on a ring, each set in a spur gear, are magnetised at twice
    // their angle round the ring, so the bore field is uniform; the rotor magnet on the arm then gives a torque
    // n B cos(phi) sin(theta), the form of the payload torque, and the arm is balanced at every angle. One lever turns the
    // gears, so alternate magnets turn by +phi and -phi and the field falls as cos(phi): set with the arm horizontal, where
    // it costs almost no energy, the device suits a lighter payload.
    JMD2026: function (s) {
      var C = P(50, 56), R = 29, gr = R * Math.sin(Math.PI / 8), T = s % 18, ph, al;
      if (T < 5) { al = 1.45 * Math.sin(T / 5 * Math.PI * 2); ph = 0; }
      else if (T < 9) { al = Math.PI / 2; ph = 1.0 * smooth((T - 5.5) / 3); }
      else if (T < 14) { al = Math.PI / 2 - 1.2 * Math.sin((T - 9) / 5 * Math.PI); ph = 1.0; }
      else { al = Math.PI / 2; ph = 1.0 * (1 - smooth((T - 14.5) / 3)); }
      var out = '';
      for (var i = 0; i < 8; i++) {
        var d = i * Math.PI / 4, c = P(C.x + R * Math.cos(d), C.y - R * Math.sin(d));            // y-up angle d round the ring
        var m = 2 * d - Math.PI / 2 + (i % 2 ? -ph : ph);                                          // magnetisation, y-up angle
        out += '<circle cx="' + f(c.x) + '" cy="' + f(c.y) + '" r="' + f(gr) + '" fill="none" stroke="var(--fg-2)" stroke-width=".7" stroke-dasharray="1.6 1.6"/>' +
          KD.magnet(c, 9, 9, 90 - m * 180 / Math.PI, 'var(--mag-stator)');
      }
      var lv = P(C.x + R * Math.cos(3 * Math.PI / 4), C.y - R * Math.sin(3 * Math.PI / 4)), la = 3 * Math.PI / 4 + 0.6 + ph;
      out += KD.link(lv, P(lv.x + 15 * Math.cos(la), lv.y - 15 * Math.sin(la)), 1.8) + KD.pin(P(lv.x + 15 * Math.cos(la), lv.y - 15 * Math.sin(la)), 1.8);
      var Bs = Math.cos(ph);                                                                        // bore field lines, shrinking as cos(phi)
      for (var j = -1; j <= 1; j += 2) out += KD.arrow(P(C.x + j * 12, C.y + 9 * Bs), P(C.x + j * 12, C.y - 9 * Bs), 'var(--mag-arrow)', .9, 3.5 * Math.max(.3, Bs));
      var e = P(Math.sin(al), -Math.cos(al)), Tp = P(C.x + e.x * 42, C.y + e.y * 42);
      out += KD.link(C, Tp, 2) + KD.magnet(C, 9, 9, al * 180 / Math.PI, 'var(--mag-rotor)', 'var(--mag-arrow-2)') + KD.disc(Tp, 3 + 3 * Bs, 'var(--mass)');
      out += KD.label(P(Tp.x + 6, Tp.y - 5), 'm', { size: 8.5, sub: 'P' }) + KD.label(P(lv.x - 14, lv.y - 10), 'ϕ', { size: 9 });
      var msg = T < 5 ? 'balanced at every angle' : T < 9 ? 'lever turns: field × cos ϕ' : T < 14 ? 'lighter payload, balanced' : 'reset';
      return out + txt(P(154, 107), msg, 7.5, 'var(--fg)', 'end');
    },
    // Zeng, Li, Kuo and Sariyildiz, T-Mech 2026: Figs. 2 and 6. A 5 mm cube magnet on a rod floats in a V-shaped trench cut
    // into a 30 mm stator magnet, both magnetised upward. The trench profile (a flat floor and straight sides, found by
    // optimisation) keeps the lift f_s close to the load over 15 mm of travel, three times the mover's side.
    TMech2026: function (s) {
      var k = 2.3, X = 36, Yb = 100;                                                               // mm -> px; stator 30 x 30 from (X, Yb)
      function Q(x, z) { return P(X + k * x, Yb - k * z); }
      var tr = [Q(0, 30), Q(5.3, 30), Q(12.4, 5), Q(17.6, 5), Q(24.7, 30), Q(30, 30), Q(30, 0), Q(0, 0)];
      var out = '<polygon points="' + tr.map(KD.pt).join(' ') + '" fill="var(--mag-stator)" stroke="var(--fg)" stroke-width="1.2" stroke-linejoin="round"/>' +
        KD.arrow(Q(4, 8), Q(4, 20), 'var(--mag-arrow)', 1.6, 5) + KD.arrow(Q(26, 8), Q(26, 20), 'var(--mag-arrow)', 1.6, 5) + KD.wall(Q(-3, 0), Q(33, 0), 1);
      var zm = 22.5 + 7.5 * Math.sin(s * 0.5), c = Q(15, zm + 2.5), fs = 2 + 0.1 * Math.sin(zm * 0.9) - 0.06 * Math.cos(zm * 0.4);
      out += KD.link(Q(15, zm + 5), P(c.x, 4), 2) + KD.magnet(c, 5 * k, 5 * k, 0, 'var(--mag-rotor)', 'var(--mag-arrow-2)');
      var ax = c.x + 14, L = 9;
      out += KD.arrow(P(ax, c.y), P(ax, c.y - L * fs), 'var(--red)', 1.3, 4) + KD.arrow(P(ax + 8, c.y), P(ax + 8, c.y + L * 2), 'var(--fg)', 1.3, 4);
      out += KD.label(P(ax - 11, c.y - L * fs + 4), 'f', { size: 8, sub: 's' }) + KD.label(P(ax + 11, c.y + L * 2 + 1), 'g', { size: 8, sub: 'm' });
      out += '<line x1="' + f(X - 8) + '" y1="' + f(Yb) + '" x2="' + f(X - 8) + '" y2="' + f(Q(0, zm).y) + '" stroke="var(--fg-2)" stroke-width=".7"/>' +
        '<line x1="' + f(X - 11) + '" y1="' + f(Q(0, zm).y) + '" x2="' + f(c.x - 6) + '" y2="' + f(Q(0, zm).y) + '" stroke="var(--fg-2)" stroke-width=".5" stroke-dasharray="1.5 1.5"/>' +
        KD.label(P(X - 26, (Yb + Q(0, zm).y) / 2 + 3), 'z', { size: 8, sub: 'm' });
      return out + txt(P(156, 60), 'lift ≈ load', 7.5, 'var(--fg)', 'end') + txt(P(156, 70), 'over 3 × the', 7, 'var(--fg-2)', 'end') + txt(P(156, 79), 'mover’s size', 7, 'var(--fg-2)', 'end');
    },
    // Zeng, Kuo and Sariyildiz, MMT 2025: Figs. 1(b) and 5. Four columns of five cube magnets (two seen here) face a cube on
    // a vertical slider; their positions and small tilts come from a genetic algorithm run on the Monte Carlo force model.
    // The lift f_s stays near the load g_m over a stroke six times the magnet's height, with a small ripple.
    MMT2025a: function (s) {
      var k = 1.15, Cx = 58, Cy = 56, tilt = [0.2, -0.1, 0.05, 0.12, -0.18];
      function F(z) { return 1.5 + 0.13 * Math.sin(z / 30 * 4 * Math.PI) * (0.6 + 0.4 * Math.cos(z / 30 * Math.PI)); }
      var out = '';
      for (var i = 0; i < 5; i++) {
        var y = Cy + (i - 2) * 15 * k;
        out += KD.magnet(P(Cx - 22, y), 10 * k, 10 * k, 90 + tilt[i] * 57.3, 'var(--mag-stator)') + KD.magnet(P(Cx + 22, y), 10 * k, 10 * k, -90 - tilt[i] * 57.3, 'var(--mag-stator)');
      }
      out += KD.wall(P(Cx - 30, 16), P(Cx - 30, 96), -1) + KD.wall(P(Cx + 30, 16), P(Cx + 30, 96), 1);
      var z = 30 * Math.sin(s * 0.5), c = P(Cx, Cy - z * k);
      out += KD.link(P(Cx, 4), P(Cx, 106), 1) + KD.magnet(c, 10 * k, 10 * k, 0, 'var(--mag-rotor)', 'var(--mag-arrow-2)');
      var X0 = 112, sc = 70, d = '';                                                              // f_s against z, drawn beside the stroke
      for (var j = 0; j <= 40; j++) { var zz = -30 + 60 * j / 40; d += (j ? 'L' : 'M') + f(X0 + (F(zz) - 1.2) * sc) + ',' + f(Cy - zz * k); }
      out += '<line x1="' + f(X0 + 0.3 * sc) + '" y1="' + f(Cy - 34 * k) + '" x2="' + f(X0 + 0.3 * sc) + '" y2="' + f(Cy + 34 * k) + '" stroke="var(--fg)" stroke-width=".9" stroke-dasharray="3 2"/>' +
        '<path d="' + d + '" fill="none" stroke="var(--red)" stroke-width="1.3"/>' + KD.disc(P(X0 + (F(z) - 1.2) * sc, c.y), 2.4, 'var(--red)') +
        '<line x1="' + f(Cx + 8) + '" y1="' + f(c.y) + '" x2="' + f(X0 + (F(z) - 1.2) * sc - 3) + '" y2="' + f(c.y) + '" stroke="var(--fg-2)" stroke-width=".5" stroke-dasharray="1.5 1.5"/>';
      return out + KD.label(P(X0 + 0.3 * sc - 10, Cy + 36 * k + 8), 'g', { size: 8, sub: 'm' }) + KD.label(P(X0 + 0.3 * sc + 8, Cy - 34 * k + 2), 'f', { size: 8, sub: 's', fill: 'var(--red)' });
    },
    // Zeng, Kuo and Sariyildiz, T-Mag 2024: Figs. 1 and 3. The force between two magnets of any shape is one six-fold
    // integral, evaluated by Monte Carlo: random points in a box round each magnet, pairs that fall inside both magnets
    // contribute, and the mean times the box volumes converges to the force (here a truncated cone I and a triangular prism J).
    TMAG2024: function (s) {
      var Cx = 52, out = '';
      var I = { y0: 100, y1: 78, rb: 13, rt: 6.5 }, J = { x0: 41, x1: 61, y0: 52, y1: 12, bx: 55, by: 6 };
      function inI(x, y) { if (y > I.y0 || y < I.y1) return false; var w = I.rt + (I.rb - I.rt) * (y - I.y1) / (I.y0 - I.y1); return Math.abs(x - Cx) <= w; }
      function inJ(x, y) { if (x < J.x0 || x > J.x1 || y > J.y0) return false; if (y >= J.y1) return true;
        var t = (J.y1 - y) / (J.y1 - J.by), l = J.x0 + (J.bx - J.x0) * t, r = J.x1 + (J.bx - J.x1) * t; return y >= J.by && x >= l && x <= r; }
      out += '<rect x="' + (Cx - I.rb - 2) + '" y="' + (I.y1 - 3) + '" width="' + (2 * I.rb + 4) + '" height="' + (I.y0 - I.y1 + 5) + '" fill="none" stroke="var(--fg-2)" stroke-width=".7" stroke-dasharray="2.5 2"/>' +
        '<rect x="' + (J.x0 - 3) + '" y="' + (J.by - 2) + '" width="' + (J.x1 - J.x0 + 6) + '" height="' + (J.y0 - J.by + 4) + '" fill="none" stroke="var(--fg-2)" stroke-width=".7" stroke-dasharray="2.5 2"/>';
      out += '<path d="M' + (Cx - I.rb) + ',' + I.y0 + ' L' + (Cx - I.rt) + ',' + I.y1 + ' L' + (Cx + I.rt) + ',' + I.y1 + ' L' + (Cx + I.rb) + ',' + I.y0 + ' Z" fill="var(--mag-stator)" fill-opacity=".8" stroke="var(--fg)" stroke-width="1.1"/>' +
        '<ellipse cx="' + Cx + '" cy="' + I.y1 + '" rx="' + I.rt + '" ry="1.6" fill="var(--mag-stator)" stroke="var(--fg)" stroke-width=".8"/>' +
        '<path d="M' + J.x0 + ',' + J.y0 + ' L' + J.x0 + ',' + J.y1 + ' L' + J.bx + ',' + J.by + ' L' + J.x1 + ',' + J.y1 + ' L' + J.x1 + ',' + J.y0 + ' Z" fill="var(--mag-rotor)" fill-opacity=".8" stroke="var(--fg)" stroke-width="1.1"/>' +
        '<path d="M' + J.x0 + ',' + J.y1 + ' L' + J.x1 + ',' + J.y1 + '" stroke="var(--fg)" stroke-width=".8"/>' +
        KD.arrow(P(Cx, 96), P(Cx, 84), 'var(--mag-arrow)', 1.3, 4) + KD.arrow(P(Cx, 44), P(Cx, 24), 'var(--mag-arrow-2)', 1.3, 4);
      var fr = Math.floor(s * 5), seed = fr * 7919 + 13;
      function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
      for (var i = 0; i < 9; i++) {
        var a = P(Cx - I.rb - 2 + rnd() * (2 * I.rb + 4), I.y1 - 3 + rnd() * (I.y0 - I.y1 + 5)), b = P(J.x0 - 3 + rnd() * (J.x1 - J.x0 + 6), J.by - 2 + rnd() * (J.y0 - J.by + 4));
        var ok = inI(a.x, a.y) && inJ(b.x, b.y);
        out += ok ? '<line x1="' + f(a.x) + '" y1="' + f(a.y) + '" x2="' + f(b.x) + '" y2="' + f(b.y) + '" stroke="var(--red)" stroke-width=".5" stroke-opacity=".6"/>' : '';
        out += '<circle cx="' + f(a.x) + '" cy="' + f(a.y) + '" r="1.3" fill="' + (ok ? 'var(--red)' : 'var(--fg-2)') + '" fill-opacity="' + (ok ? 1 : .35) + '"/>' +
          '<circle cx="' + f(b.x) + '" cy="' + f(b.y) + '" r="1.3" fill="' + (ok ? 'var(--red)' : 'var(--fg-2)') + '" fill-opacity="' + (ok ? 1 : .35) + '"/>';
      }
      var t = s % 12, n = Math.round(Math.pow(10, 3 + 2.3 * t / 12) / 100) * 100, est = 1 + 0.45 * Math.sin(n * 0.0137 + 1) / Math.sqrt(n / 1000);
      out += KD.arrow(P(84, 22), P(84, 22 + 22 * est), 'var(--red)', 1.4, 4.5) + KD.label(P(88, 34), 'f', { size: 9, sub: 'IJ' }) +
        '<line x1="80" y1="44" x2="88" y2="44" stroke="var(--fg)" stroke-width=".8" stroke-dasharray="2 1.5"/>';
      out += KD.label(P(Cx + 16, 98), 'I', { size: 9 }) + KD.label(P(J.x1 + 5, 50), 'J', { size: 9 });
      return out + txt(P(154, 70), 'random pairs', 7.5, 'var(--fg)', 'end') + txt(P(154, 80), 'n = ' + n.toLocaleString('en'), 7.5, 'var(--fg-2)', 'end') + txt(P(154, 90), 'estimate settles', 7.5, 'var(--fg-2)', 'end');
    },

    // ---- parallel ----------------------------------------------------------------------------
    // Kuo and Dai, JMR 2021: Fig. 5. The base joint a of a six-DOF leg, on the y-axis, is a dominating joint: it alone sets
    // the projective angle of the axis w on the xz-plane, since w always lies in the plane that a turns about y. With a
    // locked, the leg's other joints (b) move w out of that plane, but its projection on the xz-plane does not change.
    JMR2021a: function (s) {
      var Q = iso(66, 70, 44), T = s % 12, ta, tb = 0;
      if (T < 5) ta = 0.45 * Math.sin(T * 2 * Math.PI / 5);
      else if (T < 6) ta = 0.4 * smooth(T - 5);
      else if (T < 11) { ta = 0.4; tb = 0.55 * Math.sin((T - 6) * 2 * Math.PI / 5); }
      else ta = 0.4 * (1 - smooth(T - 11));
      var d = [Math.sin(ta), 0, Math.cos(ta)], w = v3n([Math.tan(ta), Math.tan(tb), 1]), out = isoAxes(Q, 1.15);
      out += '<polygon points="' + [[0, -0.45, 0], [0, 0.45, 0], v3a([0, 0.45, 0], d, 1.1), v3a([0, -0.45, 0], d, 1.1)].map(function (p) { return KD.pt(Q(p)); }).join(' ') + '" fill="var(--link-fill)" fill-opacity=".55" stroke="var(--fg-2)" stroke-width=".6"/>';
      var wt = v3a([0, 0, 0], w, 1.05), pr = [wt[0], 0, wt[2]], arc = '';
      for (var i = 0; i <= 12; i++) { var t = ta * i / 12; arc += (i ? 'L' : 'M') + KD.pt(Q([0.42 * Math.sin(t), 0, 0.42 * Math.cos(t)])); }
      out += '<line x1="' + f(Q([0, 0, 0]).x) + '" y1="' + f(Q([0, 0, 0]).y) + '" x2="' + f(Q(pr).x) + '" y2="' + f(Q(pr).y) + '" stroke="var(--fg)" stroke-width="1" stroke-dasharray="5 2 1 2"/>' +
        '<line x1="' + f(Q(wt).x) + '" y1="' + f(Q(wt).y) + '" x2="' + f(Q(pr).x) + '" y2="' + f(Q(pr).y) + '" stroke="var(--fg-2)" stroke-width=".6" stroke-dasharray="1.5 1.5"/>' +
        '<path d="' + arc + '" fill="none" stroke="var(--red)" stroke-width="1.1"/>' + KD.link(Q([0, 0, 0]), Q(wt), 2.6) + KD.joint(Q([0, 0, 0]), 2.6);
      var ja = Q([0, 0.85, 0]);
      out += KD.disc(ja, 3.4, 'var(--red)') + KD.label(P(ja.x + 5, ja.y + 9), 'a', { size: 9 }) + KD.label(P(Q(wt).x + 4, Q(wt).y - 2), 'w', { size: 9 }) +
        KD.label(P(Q([0.5, 0, 0.5]).x - 22, Q([0.5, 0, 0.5]).y + 2), 'ʷθ', { size: 9, sub: 'xz', fill: 'var(--red)' });
      return out + txt(P(156, 12), T < 6 ? 'joint a turns:' : 'a locked, b turns:', 7.5, 'var(--fg)', 'end') + txt(P(156, 22), T < 6 ? 'ʷθxz follows a' : 'ʷθxz stays', 7.5, 'var(--fg-2)', 'end');
    },
    // Kuo, Dai and Legnani, Robotica 2014: Fig. 2. A platform on one spherical joint at O and three R-U-PPP legs, one on
    // each axis. The leg on the x-axis holds the platform's v-axis, so its input alpha_x is the projective angle of v on the
    // yz-plane, and likewise for y (w) and z (u): each motor sets one angle and leaves the other two, without the
    // overconstraint of the Agile Eye.
    ROB2014: function (s) {
      var Q = iso(56, 72, 33), T = s % 12, k = Math.floor(T / 4), al = 0.5 * Math.sin(Math.PI * (T % 4) / 2);
      var ax = [[1, 0, 0], [0, 1, 0], [0, 0, 1]][k], R = rotAxis(ax, al);
      var u = mat3(R, [0.8, 0, 0]), v = mat3(R, [0, 0.8, 0]), w = mat3(R, [0, 0, 0.8]), out = isoAxes(Q, 1.25);
      out += '<polygon points="' + [u, v, w].map(function (p) { return KD.pt(Q(p)); }).join(' ') + '" fill="var(--link-fill)" fill-opacity=".8" stroke="var(--fg)" stroke-width="1.2" stroke-linejoin="round"/>';
      [[[1.45, 0, 0], v], [[0, 1.45, 0], w], [[0, 0, 1.45], u]].forEach(function (lg, i) {
        var b = Q(lg[0]), e = Q(lg[1]), m = P((b.x + e.x) / 2, (b.y + e.y) / 2);
        out += KD.thin(b, e) + '<rect x="' + f(m.x - 2.5) + '" y="' + f(m.y - 2.5) + '" width="5" height="5" fill="var(--card)" stroke="var(--fg)" stroke-width=".8"/>' +
          KD.disc(b, 3, i === k ? 'var(--red)' : 'var(--card)') + KD.pin(e, 1.6);
      });
      out += KD.joint(Q([0, 0, 0]), 2.8);
      var names = [['α', 'x', 'ᵛθ', 'yz'], ['α', 'y', 'ʷθ', 'zx'], ['α', 'z', 'ᵘθ', 'xy']];
      for (var j = 0; j < 3; j++) {
        var y = 26 + j * 22, on = j === k, val = on ? al : 0;
        out += KD.label(P(112, y), names[j][0], { size: 8.5, sub: names[j][1], fill: on ? 'var(--red)' : 'var(--fg-2)' }) + txt(P(124, y), '=', 7.5, 'var(--fg-2)') +
          KD.label(P(130, y), names[j][2], { size: 8.5, sub: names[j][3], fill: on ? 'var(--red)' : 'var(--fg-2)' }) +
          '<line x1="112" y1="' + (y + 6) + '" x2="154" y2="' + (y + 6) + '" stroke="var(--line)"/>' + bar(132 + 20 * Math.min(0, val), y + 8, 3, Math.max(1, 20 * Math.abs(val)), on ? 'var(--red)' : 'var(--fg-2)');
      }
      return out + txt(P(154, 106), 'one motor, one angle', 7.5, 'var(--fg)', 'end');
    },
    // Kuo and Dai, MMT 2013: Fig. 1 on the example of Fig. 4(b). Between base and platform, a single serial leg (here a post
    // with a universal joint at the centre) defines the platform's motion; legs of connectivity six (UPS) add no constraint
    // and carry the actuators. Synthesising the manipulator becomes synthesising one serial chain.
    MMT2013: function (s) {
      var T = s % 14, C = P(70, 48), out = '<ellipse cx="70" cy="96" rx="46" ry="8" fill="var(--ground)" fill-opacity=".45" stroke="var(--fg)" stroke-width="1.1"/>', c = C, be;
      if (T < 3.5) { c = P(C.x + 7 * Math.sin(T * 1.7), C.y - 5 + 6 * Math.sin(T * 2.3)); be = 0.3 * Math.sin(T * 1.3); }
      else be = 0.32 * Math.sin((T - 3.5) * 1.1);
      if (T >= 3.5) out += KD.link(P(70, 96), C, 3.2) + KD.joint(P(70, 96), 2.6);
      var e = P(Math.cos(be), Math.sin(be));
      if (T >= 7.5) [-1, 1].forEach(function (sg) {
        var b = P(70 + sg * 36, 96), pp = P(C.x + sg * 30 * e.x, C.y + sg * 30 * e.y), u = KD.unit(b, pp);
        out += KD.body(b, P(b.x + u.x * 24, b.y + u.y * 24), 2.6, 'var(--card)') + KD.link(P(b.x + u.x * 14, b.y + u.y * 14), pp, 1.6) +
          KD.disc(P(b.x + u.x * 12, b.y + u.y * 12), 2.4, 'var(--red)') + KD.joint(b, 2.6) + KD.joint(pp, 2.4);
      });
      out += '<ellipse cx="' + f(c.x) + '" cy="' + f(c.y) + '" rx="34" ry="6" transform="rotate(' + f(be * 180 / Math.PI) + ' ' + f(c.x) + ' ' + f(c.y) + ')" fill="var(--link-fill)" fill-opacity=".85" stroke="var(--fg)" stroke-width="1.2"/>';
      if (T >= 3.5) out += KD.joint(C, 3) + '<path d="M' + f(C.x - 2) + ',' + f(C.y) + 'h4M' + f(C.x) + ',' + f(C.y - 2) + 'v4" stroke="var(--fg)" stroke-width=".8"/>';
      var msg = T < 3.5 ? 'no legs: the platform is free' : T < 7.5 ? 'one serial leg fixes the motion' : 'six-DOF legs add motors, no constraint';
      return out + (T >= 3.5 && T < 7.5 ? txt(P(76, 78), 'constraint leg', 7, 'var(--fg-2)') : '') + (T >= 7.5 ? txt(P(4, 108), 'centre: constraint leg', 6.5, 'var(--fg-2)') + txt(P(156, 108), 'outer: auxiliary legs', 6.5, 'var(--fg-2)', 'end') : '') + txt(P(154, 12), msg, 7.5, 'var(--fg)', 'end');
    },

    // ---- reconfigurable ------------------------------------------------------------------------
    // Kuo and Su, MMT 2017: Fig. 4(a)-(c). The cube of eight hinged sub-cubes is a single-loop 8R linkage. From the cube A,
    // the top-right pair of sub-cubes turns over about the coaxial hinges a-g (configuration B), then the top-left pair
    // about c-e, giving the slab C. Comparing joint orientations and joint distances shows that A and C, which look
    // nothing alike, are configurationally isomorphic.
    MMT2017: function (s) {
      var k = 22, T = s % 16, a1, a2, h = null;
      function Q(p) { return P(54 + k * (p[0] - 0.42 * p[2]), 84 - k * (p[1] - 0.3 * p[2])); }
      if (T < 2) { a1 = 0; a2 = 0; } else if (T < 5) { a1 = Math.PI * smooth((T - 2) / 3); a2 = 0; h = 1; } else if (T < 6.5) { a1 = Math.PI; a2 = 0; }
      else if (T < 9.5) { a1 = Math.PI; a2 = Math.PI * smooth((T - 6.5) / 3); h = 2; } else if (T < 12) { a1 = Math.PI; a2 = Math.PI; }
      else if (T < 14) { a1 = Math.PI; a2 = Math.PI * (1 - smooth((T - 12) / 2)); h = 2; } else { a1 = Math.PI * (1 - smooth((T - 14) / 2)); a2 = 0; h = 1; }
      function mv(p, c) {                                           // the two folding pairs: top-right about x=2,y=1; top-left about x=0,y=1
        if (c[1] === 1 && c[0] === 1) { var x = p[0] - 2, y = p[1] - 1, ca = Math.cos(a1), sa = Math.sin(a1); return [2 + x * ca + y * sa, 1 - x * sa + y * ca, p[2]]; }
        if (c[1] === 1 && c[0] === 0) { var x2 = p[0], y2 = p[1] - 1, cb = Math.cos(a2), sb = Math.sin(a2); return [x2 * cb - y2 * sb, 1 + x2 * sb + y2 * cb, p[2]]; }
        return p;
      }
      var faces = [], idx = [[0, 1, 3, 2], [4, 5, 7, 6], [0, 1, 5, 4], [2, 3, 7, 6], [0, 2, 6, 4], [1, 3, 7, 5]];
      [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]].forEach(function (c) {
        var v = []; for (var i = 0; i < 8; i++) v.push(mv([c[0] + (i & 1), c[1] + ((i >> 1) & 1), c[2] + ((i >> 2) & 1)], c));
        idx.forEach(function (q) { var pts = q.map(function (i) { return v[i]; }), d = 0; pts.forEach(function (p) { d += p[2] + 0.42 * p[0] + 0.3 * p[1]; }); faces.push({ pts: pts, d: d, blue: c[0] === 1 && c[1] === 0 && c[2] === 1 }); });
      });
      faces.sort(function (p, q) { return p.d - q.d; });
      var out = '';
      faces.forEach(function (fc) { out += '<polygon points="' + fc.pts.map(function (p) { return KD.pt(Q(p)); }).join(' ') + '" fill="' + (fc.blue ? 'var(--mag-stator)' : 'var(--card)') + '" stroke="var(--fg)" stroke-width=".9" stroke-linejoin="round"/>'; });
      if (h) { var hx = h === 1 ? 2 : 0; out += '<line x1="' + f(Q([hx, 1, -0.4]).x) + '" y1="' + f(Q([hx, 1, -0.4]).y) + '" x2="' + f(Q([hx, 1, 2.4]).x) + '" y2="' + f(Q([hx, 1, 2.4]).y) + '" stroke="var(--red)" stroke-width="1.2" stroke-dasharray="5 2 1 2"/>'; }
      var name = T < 2 || T >= 14 && a1 < 0.05 ? 'A' : T < 6.5 || T >= 14 ? 'A → B' : T < 9.5 ? 'B → C' : T < 12 ? 'C' : 'C → B';
      return out + KD.note(P(8, 16), name, { size: 11, fill: 'var(--fg)' }) + (T >= 9.5 && T < 12 ? txt(P(154, 16), 'A ≅ C: configurationally isomorphic', 7, 'var(--red)', 'end') : '') +
        (h ? txt(P(154, 106), h === 1 ? 'turning about hinges a, g' : 'turning about hinges c, e', 7.5, 'var(--fg-2)', 'end') : '');
    },
    // Kuo and Chang, JMR 2014: Figs. 1-2, the steel clamping and sawing mechanism (seven links, eight joints). Pulling the
    // slider 5 first closes the clamp 7 with the saw arm 2 held down by the payload, topology 1(2); the clamp meets the steel
    // and the linkage becomes a structure, 1(2,7); more force lifts arm 2 and the saw moves, 1(7). One constraint matrix
    // holds all three topologies. (Geometry as on the paper's page; the sequence is the paper's.)
    JMR2014: (function () {
      var O2 = { x: 270, y: 190 }, O7 = { x: 70, y: 190 }, r2 = 50, r7 = 50, l3 = 60, l6 = 60, a = 50, xs = 170, frames = null;
      function J34(y, p) { return { x: xs + a * Math.cos(p), y: y + a * Math.sin(p) }; }
      function J46(y, p) { return { x: xs - a * Math.cos(p), y: y - a * Math.sin(p) }; }
      function J23(p) { return { x: O2.x + r2 * Math.cos(p), y: O2.y + r2 * Math.sin(p) }; }
      function J67(p) { return { x: O7.x + r7 * Math.cos(p), y: O7.y + r7 * Math.sin(p) }; }
      function dist(A, B) { return Math.hypot(A.x - B.x, A.y - B.y); }
      function cont(fn, prev, span) {
        var lo = prev - span, hi = prev + span, n = 60, x0 = lo, f0 = fn(lo), best = null;
        for (var i = 1; i <= n; i++) { var x1 = lo + (hi - lo) * i / n, f1 = fn(x1); if (f0 === 0 || f0 * f1 < 0) { best = [x0, x1]; if (Math.abs((x0 + x1) / 2 - prev) < span / 2) break; } x0 = x1; f0 = f1; }
        if (!best) return prev;
        x0 = best[0]; var x2 = best[1];
        for (var k = 0; k < 40; k++) { var m = (x0 + x2) / 2; if (fn(x0) * fn(m) <= 0) x2 = m; else x0 = m; }
        return (x0 + x2) / 2;
      }
      function build() {                                            // the forward stroke, stepped once and stored
        var y = 130, p4 = 0, p2 = Math.PI, p7 = 0, st = 'b', hold = 0, out = [];
        for (var n = 0; n < 4000 && st !== 'e'; n++) {
          if (st === 'b') { y += 0.6; p4 = cont(function (p) { return dist(J34(y, p), J23(p2)) - l3; }, p4, 0.4); p7 = cont(function (p) { return dist(J46(y, p4), J67(p)) - l6; }, p7, 0.4); if (p7 >= 0.62) { p7 = 0.62; st = 'c'; } }
          else if (st === 'c') { hold++; if (hold > 40) st = 'd'; }
          else { y += 0.6; p4 = cont(function (p) { return dist(J46(y, p), J67(p7)) - l6; }, p4, 0.4); p2 = cont(function (p) { return dist(J34(y, p4), J23(p)) - l3; }, p2, 0.4); if (p2 >= Math.PI + 0.38) st = 'e'; }
          out.push([y, p4, p2, p7, st]);
        }
        return out;
      }
      return function (s) {
        if (!frames) frames = build();
        var N = frames.length, fps = 30, T = s % (N / fps + 1.5 + N / fps / 3 + 0.5), i;
        if (T < N / fps) i = Math.floor(T * fps); else if (T < N / fps + 1.5) i = N - 1; else i = Math.max(0, N - 1 - Math.floor((T - N / fps - 1.5) * fps * 3));
        var fr = frames[Math.min(N - 1, i)], y = fr[0], p4 = fr[1], p2 = fr[2], p7 = fr[3], st = fr[4];
        var A = { x: xs, y: y }, B = J34(y, p4), C = J46(y, p4), D = J23(p2), E = J67(p7);
        var tip2 = { x: O2.x + 95 * Math.cos(p2), y: O2.y + 95 * Math.sin(p2) }, tip7 = { x: O7.x + 95 * Math.cos(p7), y: O7.y + 95 * Math.sin(p7) };
        var g = KD.wall({ x: 30, y: 250 }, { x: 310, y: 250 }, 1) + '<rect x="110" y="224" width="120" height="16" fill="var(--pin)" stroke="var(--fg)" stroke-width="1.6"/>' +
          KD.wall({ x: xs + 10, y: 60 }, { x: xs + 10, y: 150 }, -1) + KD.slider(A, 12, 9, 0) + KD.arrow({ x: xs, y: 30 }, { x: xs, y: 58 }, 'var(--red)', 2.4, 10) +
          KD.link(C, B, 4) + KD.link(B, D, 3) + KD.link(C, E, 3) + KD.ground(O2, { w: 18 }) + KD.ground(O7, { w: 18 }) +
          KD.body(O2, tip2, 5) + KD.body(O7, tip7, 5) + KD.joint(O2, 5) + KD.joint(O7, 5) + KD.joint(A, 5) + KD.joint(B, 4.5) + KD.joint(C, 4.5) + KD.joint(D, 4.5) + KD.joint(E, 4.5) +
          KD.disc(tip2, 6, 'var(--mass)') + KD.disc(tip7, 6, 'var(--cw)') + KD.note({ x: tip2.x, y: tip2.y + 24 }, 'saw', { size: 15, anchor: 'middle' }) + KD.note({ x: tip7.x, y: tip7.y + 24 }, 'clamp', { size: 15, anchor: 'middle' });
        var top = st === 'b' ? '1(2): clamping' : st === 'c' ? '1(2,7): a structure' : '1(7): sawing';
        return '<g transform="translate(-12,-16) scale(.5)">' + g + '</g>' + txt(P(156, 12), top, 8, 'var(--fg)', 'end') + txt(P(156, 22), st === 'c' ? 'mobility 0' : 'mobility 1', 7, 'var(--fg-2)', 'end');
      };
    })(),

    // ---- structural synthesis ----------------------------------------------------------------
    // Kuo and Yan, JMD 2007: Fig. 1, the one-step push-button stopper lock in section. Frame, slider (x), button (z) and the
    // stopper in a groove of the button, all prismatic: (a) locking, (b) unlockable with the button pressed, (c) unlocking as
    // the slider carries the stopper away, (d) password changeable, the button punched to a new position. Writing each
    // stage's joints as screws gives mobility 1, 2, 1, 2 (Table 1), where the Gruebler count does not.
    JMD2007: function (s) {
      var T = s % 16, st, bz = 0, sx = 0, sz = -4;                  // button z offset, slider x offset, stopper z offset
      if (T < 3) st = 0;
      else if (T < 5) { st = 1; var u = smooth((T - 3) / 1.2); bz = 6 * u; sz = -4 + 4 * u; }
      else if (T < 8) { st = 2; bz = 6; sz = 0; sx = -7 * smooth((T - 5) / 1.5); }
      else if (T < 11) { st = 3; bz = 6 - 14 * smooth((T - 8) / 1.5); sz = 0; sx = -7; }
      else { st = 3; var w = smooth((T - 11) / 4); bz = -8 + 8 * w; sx = -7 * (1 - w); sz = -4 * w; }
      var cx = 56, cy = 56, out = '';
      out += '<rect x="' + (cx - 32) + '" y="' + (cy - 32) + '" width="64" height="64" fill="var(--ground)" stroke="var(--fg)" stroke-width="1.2"/>' +
        '<rect x="' + (cx - 14) + '" y="' + (cy - 13) + '" width="28" height="26" fill="var(--card)" stroke="var(--fg)" stroke-width="1"/>' +
        '<rect x="' + (cx - 9) + '" y="' + (cy - 17) + '" width="18" height="34" fill="var(--card)" stroke="var(--fg)" stroke-width="1"/>' +
        '<rect x="' + (cx - 13) + '" y="' + (cy - 12.2) + '" width="26" height="24.4" fill="var(--card)"/>' +
        '<rect x="' + (cx - 8.2) + '" y="' + (cy - 16.2) + '" width="16.4" height="32.4" fill="var(--card)"/>';
      out += '<rect x="' + f(cx - 52 + sx) + '" y="' + (cy - 6) + '" width="104" height="12" fill="var(--card)" stroke="var(--fg)" stroke-width="1.2"/>';
      out += '<rect x="' + (cx - 4) + '" y="' + f(cy - 44 + bz) + '" width="8" height="88" fill="var(--card)" stroke="var(--fg)" stroke-width="1.2"/>';
      if (st >= 2) out += '<rect x="' + (cx - 7) + '" y="' + f(cy - 7 + bz - 6) + '" width="14" height="14" fill="none" stroke="var(--fg)" stroke-width=".8" stroke-dasharray="1.5 1.5"/>';
      var px = cx - 7 + sx, py = cy - 7 + sz, hat = '';
      for (var i = -2; i <= 3; i++) hat += '<line x1="' + f(px + i * 4) + '" y1="' + f(py + 14) + '" x2="' + f(px + i * 4 + 14) + '" y2="' + f(py) + '"/>';
      out += '<clipPath id="jmd07c"><rect x="' + f(px) + '" y="' + f(py) + '" width="14" height="14"/></clipPath><rect x="' + f(px) + '" y="' + f(py) + '" width="14" height="14" fill="var(--card)" stroke="var(--fg)" stroke-width="1.2"/>' +
        '<g clip-path="url(#jmd07c)" stroke="var(--fg)" stroke-width=".8">' + hat + '</g>';
      var names = ['(a) locking', '(b) unlockable', '(c) unlocking', '(d) password changeable'], mob = [1, 2, 1, 2][st];
      out += txt(P(cx - 50, 104), 'slider', 6.5, 'var(--fg-2)') + txt(P(cx + 8, 16), 'button', 6.5, 'var(--fg-2)');
      return out + txt(P(156, 46), names[st], 7.5, 'var(--fg)', 'end') + KD.note(P(156, 62), 'm = ' + mob, { size: 10, fill: 'var(--red)', anchor: 'end' }) + txt(P(156, 74), 'by screw systems', 6.5, 'var(--fg-2)', 'end');
    },
    // Kuo and Shih, JMD 2008: Figs. 3(c) and 5(b). The graph of Watt's chain (links as vertices, joints as edges). Vertex
    // strings from the crossover matrices sort the links with the same adjacency into classes, {1, 4} and {2, 3, 5, 6};
    // fixing link 1 (a root) splits them into {1}, {4}, {2, 6}, {3, 5}. The same on the line graph sorts the joints.
    JMD2008: function (s) {
      var root = (s % 10) >= 5, pos = { 1: P(60, 96), 2: P(34, 80), 3: P(34, 40), 4: P(60, 22), 5: P(86, 40), 6: P(86, 80) };
      var E = { a: [1, 2], d: [2, 3], e: [3, 4], f: [4, 5], g: [5, 6], c: [6, 1], b: [1, 4] };
      var C1 = 'var(--red)', C2 = 'var(--spring)', C3 = '#B8860B', C4 = 'var(--fg-2)';
      var vc = root ? { 1: 'var(--ground)', 4: C1, 2: C2, 6: C2, 3: C3, 5: C3 } : { 1: C1, 4: C1, 2: C2, 3: C2, 5: C2, 6: C2 };
      var ec = root ? { a: C2, c: C2, e: C1, f: C1, b: C4, d: C3, g: C3 } : { a: C2, c: C2, e: C2, f: C2, b: C4, d: C3, g: C3 };
      var out = '';
      Object.keys(E).forEach(function (k) {
        var p = pos[E[k][0]], q = pos[E[k][1]], m = P((p.x + q.x) / 2, (p.y + q.y) / 2), off = k === 'b' ? P(5, 0) : P((m.x - 60) * 0.18, (m.y - 59) * 0.18);
        out += '<line x1="' + f(p.x) + '" y1="' + f(p.y) + '" x2="' + f(q.x) + '" y2="' + f(q.y) + '" stroke="' + ec[k] + '" stroke-width="2.2"/>' + KD.note(P(m.x + off.x + (k === 'b' ? 0 : 0), m.y + off.y + 3), k, { size: 8, fill: ec[k], anchor: 'middle' });
      });
      Object.keys(pos).forEach(function (k) {
        var p = pos[k];
        if (root && k === '1') out += '<circle cx="' + f(p.x) + '" cy="' + f(p.y) + '" r="9" fill="none" stroke="var(--fg)" stroke-width="1"/>';
        out += '<circle cx="' + f(p.x) + '" cy="' + f(p.y) + '" r="6.2" fill="' + vc[k] + '" stroke="var(--fg)" stroke-width="1"/>' + KD.note(P(p.x, p.y + 3), k, { size: 8, fill: '#fff', anchor: 'middle' });
      });
      return out + txt(P(156, 14), root ? 'link 1 fixed:' : 'Watt’s chain:', 7.5, 'var(--fg)', 'end') + txt(P(156, 24), root ? 'four link classes' : 'two link classes', 7.5, 'var(--fg-2)', 'end') +
        txt(P(156, 96), root ? '{1} {4} {2,6} {3,5}' : '{1,4} {2,3,5,6}', 7, 'var(--fg-2)', 'end');
    },

    // ---- medical -------------------------------------------------------------------------------
    // Tseng et al., JMR 2017: Figs. 1-2. One linkage, two configurations. Knee only: the thigh link 3 is held, the
    // parallelogram 4-5-6 turns about the knee A and the calf swings; k2, between the vertical link 9 and link 6, does the
    // balancing while k1 keeps its length. Hip only: link 3 turns about the hip B, the calf translates, k1 balances and k2
    // keeps its length.
    JMR2017b: function (s) {
      var T = s % 14, ph = 0, ps = 0, mode;
      if (T < 5.5) { mode = 0; ph = 0.85 * Math.sin(Math.PI * T / 5.5); } else if (T < 6.5) mode = 1; else if (T < 12.5) { mode = 2; ps = 0.6 * Math.sin(Math.PI * (T - 6.5) / 6); } else mode = 1;
      var B = P(130, 54), d3 = P(-Math.cos(ps), -Math.sin(ps)), J = P(B.x + 36 * d3.x, B.y + 36 * d3.y), A = P(B.x + 70 * d3.x, B.y + 70 * d3.y);
      var c = P(-Math.sin(ph), Math.cos(ph)), L4 = 30;                // links 4 and 6 hang from A and J, parallel
      var A4 = P(A.x + L4 * c.x, A.y + L4 * c.y), J6 = P(J.x + L4 * c.x, J.y + L4 * c.y), foot = P(A.x + 54 * c.x, A.y + 54 * c.y);
      var nine = P(J.x, J.y - 11), k2e = P(J.x + 22 * c.x, J.y + 22 * c.y), k1a = P(B.x + 18 * d3.x, B.y + 18 * d3.y), Wb = P(140, 24), G = P(112, 100);
      var out = KD.wall(P(140, 10), P(140, 70), 1) + KD.wall(P(92, 104), P(132, 104), 1) + '<rect x="104" y="96" width="16" height="8" fill="var(--card)" stroke="var(--fg)" stroke-width="1"/>';
      out += KD.link(B, A, 2.6) + KD.link(A, foot, 2.6) + KD.link(J, J6, 1.6) + KD.link(A4, J6, 1.6) + KD.link(P(J.x + 16 * c.x, J.y + 16 * c.y), G, 1.4) + KD.link(J, nine, 1.4);
      out += KD.spring(nine, k2e, 6, 3.2) + KD.spring(k1a, Wb, 6, 3.2) + KD.pin(Wb, 1.8) + KD.joint(B, 3) + KD.joint(A, 2.6) + KD.joint(J, 2.4) + KD.joint(A4, 2) + KD.joint(J6, 2) + KD.joint(G, 2) + KD.pin(nine, 1.6);
      out += KD.label(P(A.x - 9, A.y - 3), 'A', { size: 8.5 }) + KD.label(P(B.x - 3, B.y + 12), 'B', { size: 8.5 }) +
        KD.label(P((k1a.x + Wb.x) / 2 - 4, (k1a.y + Wb.y) / 2 - 9), 'k', { size: 8.5, sub: '1', fill: mode === 2 ? 'var(--red)' : 'var(--fg)' }) +
        KD.label(P((nine.x + k2e.x) / 2 - 15, (nine.y + k2e.y) / 2 + 3), 'k', { size: 8.5, sub: '2', fill: mode === 0 ? 'var(--red)' : 'var(--fg)' });
      return out + txt(P(6, 12), mode === 0 ? 'knee only: k₂ balances' : mode === 2 ? 'hip only: k₁ balances' : 'switching', 7.5, 'var(--fg)');
    },
    // Kuo and Lai, JMR 2016: Figs. 2 and 5. A double parallelogram places the remote centre of motion (red) anywhere in
    // the plane while the end link keeps its orientation; with the RCM at the incision, the wrist turns and inserts the
    // laparoscope about it. Zero-free-length springs k1, k2 balance the two parallelogram loops.
    JMR2016: function (s) {
      var T = s % 13, t2 = 0, t3 = 0, be = 0, ins = 0, ph2 = T >= 6.5;
      if (!ph2) { t2 = 0.3 * Math.sin(T * 2 * Math.PI / 6.5); t3 = -0.35 * Math.sin(T * 2 * Math.PI / 6.5 + 0.9) + 0.35 * Math.sin(0.9); }
      else { be = 0.35 * Math.sin((T - 6.5) * 2 * Math.PI / 6.5); ins = 6 * Math.sin((T - 6.5) * 4 * Math.PI / 6.5); }
      var W1 = P(12, 40), W2 = P(12, 58), L = 40, u2 = P(Math.cos(t2), -Math.sin(t2)), u3 = P(Math.cos(t3), -Math.sin(t3));
      var P1 = P(W1.x + L * u2.x, W1.y + L * u2.y), P2 = P(W2.x + L * u2.x, W2.y + L * u2.y), E1 = P(P1.x + L * u3.x, P1.y + L * u3.y), E2 = P(P2.x + L * u3.x, P2.y + L * u3.y);
      var Wr = P(E2.x, E2.y + 12), R = P(E2.x + 16, E2.y + 40), sd = P(Math.sin(be), Math.cos(be)), top = P(R.x - sd.x * (34 - ins), R.y - sd.y * (34 - ins));
      var out = KD.wall(P(8, 30), P(8, 68), -1) + KD.link(W1, P1, 2.2) + KD.link(W2, P2, 2.2) + KD.link(P(P1.x, P1.y - 6), P(P2.x, P2.y + 4), 2.6) +
        KD.link(P1, E1, 2.2) + KD.link(P2, E2, 2.2) + KD.link(E1, Wr, 2.6);
      out += KD.spring(P((W1.x + P1.x) / 2, (W1.y + P1.y) / 2), P(P2.x, P2.y + 4), 6, 3) + KD.spring(P((P1.x + E1.x) / 2, (P1.y + E1.y) / 2), P(E2.x, E2.y + 6), 6, 3);
      out += '<rect x="' + f(Wr.x - 5) + '" y="' + f(Wr.y - 3) + '" width="10" height="7" fill="var(--card)" stroke="var(--fg)" stroke-width="1"/>' + KD.link(Wr, top, 1) + KD.link(top, P(R.x + sd.x * (18 + ins), R.y + sd.y * (18 + ins)), 2.2);
      if (ph2) out += '<path d="M' + f(R.x - 30) + ',' + f(R.y + 4) + ' Q' + f(R.x) + ',' + f(R.y - 3) + ' ' + f(R.x + 30) + ',' + f(R.y + 4) + '" fill="none" stroke="var(--fg-2)" stroke-width="1.2"/>';
      out += [W1, W2, P1, P2, E1, E2].map(function (p) { return KD.joint(p, 2.2); }).join('') + KD.disc(R, 2.6, 'var(--red)') +
        KD.label(P(R.x + 6, R.y - 4), 'RCM', { size: 7.5, fill: 'var(--red)' }) + KD.label(P((W1.x + P1.x) / 2 - 2, (W1.y + P1.y) / 2 - 6), 'k', { size: 8, sub: '1' }) + KD.label(P((P1.x + E1.x) / 2, (P1.y + E1.y) / 2 - 6), 'k', { size: 8, sub: '2' });
      return out + txt(P(4, 98), ph2 ? 'RCM at the incision:' : 'the arm moves the RCM;', 7.5, 'var(--fg)') + txt(P(4, 107), ph2 ? 'the wrist turns, inserts' : 'end link stays upright', 7.5, 'var(--fg-2)');
    },
    // Kuo and Dai, JMED 2012: Figs. 4(a) and 6(b), side view. The base crank of each auxiliary leg turns about an axis
    // through the base, and its angle always equals the projected tilt of the tool through the remote centre O
    // (theta_x = the tool's angle on the yz-plane). So the two tilts, the spin and the insertion each have their own actuator.
    JMED2012: function (s) {
      var T = s % 15, th = 0, sp = 0, ins = 0, st;
      if (T < 6) { st = 0; th = 0.4 * Math.sin(T * 2 * Math.PI / 6); } else if (T < 10.5) { st = 1; th = 0; sp = (T - 6) / 4.5 * 2 * Math.PI; } else { st = 2; ins = 8 * Math.sin((T - 10.5) * 2 * Math.PI / 4.5); }
      var O = P(100, 64), A1 = P(40, 98), d = P(Math.sin(th), -Math.cos(th)), cr = P(A1.x + 30 * d.x, A1.y + 30 * d.y);
      var out = '<path d="M60,64 Q100,58 150,64" fill="none" stroke="var(--fg-2)" stroke-width="1.3"/>' + KD.ground(A1, { w: 12 }) +
        '<line x1="' + f(A1.x - 8 * d.x) + '" y1="' + f(A1.y - 8 * d.y) + '" x2="' + f(A1.x + 70 * d.x) + '" y2="' + f(A1.y + 70 * d.y) + '" stroke="var(--fg-2)" stroke-width=".7" stroke-dasharray="4 2 1 2"/>' +
        KD.link(A1, cr, 2.6) + KD.joint(A1, 2.6) + KD.joint(cr, 2.2);
      var tt = P(O.x - d.x * (46 - ins), O.y - d.y * (46 - ins)), tb = P(O.x + d.x * (16 + ins), O.y + d.y * (16 + ins));
      out += KD.link(tt, tb, 2.4) + '<polygon points="' + KD.pt(tt) + ' ' + f(tt.x + 9 * Math.cos(sp)) + ',' + f(tt.y + 2) + ' ' + KD.pt(P(tt.x, tt.y + 6)) + '" fill="var(--red)" fill-opacity=".8"/>' + KD.disc(O, 2.6, 'var(--red)');
      function arc(c, r) { var p = ''; for (var i = 0; i <= 10; i++) { var a = th * i / 10; p += (i ? 'L' : 'M') + f(c.x + r * Math.sin(a)) + ',' + f(c.y - r * Math.cos(a)); } return '<line x1="' + f(c.x) + '" y1="' + f(c.y) + '" x2="' + f(c.x) + '" y2="' + f(c.y - r - 4) + '" stroke="var(--fg-2)" stroke-width=".6"/><path d="' + p + '" fill="none" stroke="var(--red)" stroke-width="1"/>'; }
      if (st === 0) out += arc(A1, 18) + arc(P(O.x, O.y - 0), 26) + KD.label(P(A1.x + 10, A1.y - 22), 'θ', { size: 8.5, sub: 'x', fill: 'var(--red)' });
      out += KD.label(P(O.x + 6, O.y + 10), 'O', { size: 8.5 }) + KD.label(P(tt.x + 5, tt.y + 2), 'w', { size: 8.5 });
      var msg = ['crank angle = tool tilt', 'spin: its own actuator', 'insertion: its own actuator'][st];
      return out + txt(P(6, 12), msg, 7.5, 'var(--fg)');
    }
  };
  // small 3-D helpers for the spatial figures above: isometric view with x to the lower left, y to the lower right, z up
  function iso(ox, oy, k) { return function (p) { return P(ox + k * 0.866 * (p[1] - p[0]), oy + k * 0.5 * (p[0] + p[1]) - k * p[2]); }; }
  function isoAxes(Q, L) {
    var o = Q([0, 0, 0]);
    return [[L, 0, 0, 'x', -9, 8], [0, L, 0, 'y', 4, 8], [0, 0, L, 'z', -9, 0]].map(function (a) {
      var e = Q([a[0], a[1], a[2]]); return KD.arrow(o, e, 'var(--fg-2)', .8, 4.5) + KD.label(P(e.x + a[4], e.y + a[5]), a[3], { size: 8, fill: 'var(--fg-2)' });
    }).join('');
  }
  function v3a(a, b, k) { return [a[0] + k * b[0], a[1] + k * b[1], a[2] + k * b[2]]; }
  function v3n(a) { var n = Math.hypot(a[0], a[1], a[2]); return [a[0] / n, a[1] / n, a[2] / n]; }
  function rotAxis(k, t) { var c = Math.cos(t), s = Math.sin(t), C = 1 - c, x = k[0], y = k[1], z = k[2];
    return [c + x * x * C, x * y * C - z * s, x * z * C + y * s, y * x * C + z * s, c + y * y * C, y * z * C - x * s, z * x * C - y * s, z * y * C + x * s, c + z * z * C]; }
  function mat3(R, v) { return [R[0] * v[0] + R[1] * v[1] + R[2] * v[2], R[3] * v[0] + R[4] * v[1] + R[5] * v[2], R[6] * v[0] + R[7] * v[1] + R[8] * v[2]]; }
  window.KD_MINI = MINI;

  var figs = Array.prototype.map.call(document.querySelectorAll('svg.mini[data-mini]'), function (svg) { return { svg: svg, fn: MINI[svg.getAttribute('data-mini')], on: false }; }).filter(function (x) { return x.fn; });
  if (!figs.length) return;
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { figs.forEach(function (x) { if (x.svg === e.target) x.on = e.isIntersecting; }); }); });
    figs.forEach(function (x) { io.observe(x.svg); });
  } else figs.forEach(function (x) { x.on = true; });
  function drawAll(s, all) { figs.forEach(function (x) { if (all || x.on) { try { x.svg.innerHTML = x.fn(s); } catch (err) { /* keep the last frame */ } } }); }
  drawAll(1.5, true);
  if (reduce) return;
  var t0 = null;
  requestAnimationFrame(function step(t) { if (t0 === null) t0 = t; drawAll((t - t0) / 1000, false); requestAnimationFrame(step); });
})();
