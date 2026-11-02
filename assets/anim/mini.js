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
      // leaf spring clamped at the wall; the output pushes on its tip with a fixed force F. The roller pair rides
      // along the undeformed line and holds the beam there, so the beam left of the rollers stays straight and only
      // the overhang c from the rollers to the tip bends: y(xi) = F xi^2 (3c - xi) / 6EI, tip deflection F c^3 / 3EI.
      // Rollers far from the tip (long overhang) = soft; rollers near the tip (short overhang) = stiff.
      var T = s % 10, u = T < 5 ? smooth(T / 5) : 1 - smooth((T - 5) / 5), x0 = 22, Lb = 112, y0 = 56;
      var a = 14 + (Lb - 30) * u, c = Lb - a, F = 0.85 + 0.15 * Math.sin(s * 5), k = 3 * 20 / Math.pow(Lb - 14, 3);
      function y(xi) { return k * F * xi * xi * (3 * c - xi) / 6; }
      var d = 'M' + x0 + ',' + y0 + ' L' + f(x0 + a) + ',' + y0;
      for (var i = 1; i <= 30; i++) { var xi = c * i / 30; d += ' L' + f(x0 + a + xi) + ',' + f(y0 + y(xi)); }
      var out = KD.wall(P(x0, 26), P(x0, 86), -1) + '<rect x="' + x0 + '" y="' + (y0 - 4) + '" width="4" height="8" fill="var(--fg)"/>';
      out += '<path d="M' + x0 + ',' + y0 + ' L' + (x0 + Lb) + ',' + y0 + '" stroke="var(--fg-2)" stroke-width=".8" stroke-dasharray="2 2"/>' + '<path d="' + d + '" fill="none" stroke="var(--spring)" stroke-width="2.6"/>';
      var rx = x0 + a, tip = P(x0 + Lb, y0 + y(c));
      out += '<circle cx="' + f(rx) + '" cy="' + (y0 - 5) + '" r="3.6" fill="var(--card)" stroke="var(--fg)" stroke-width="1.2"/><circle cx="' + f(rx) + '" cy="' + (y0 + 5) + '" r="3.6" fill="var(--card)" stroke="var(--fg)" stroke-width="1.2"/>';
      out += KD.arrow(P(tip.x, tip.y - 20), P(tip.x, tip.y - 2), 'var(--red)', 1.4, 5) + KD.label(P(tip.x - 12, tip.y - 12), 'F', { size: 9, fill: 'var(--red)' });
      return out + txt(P(6, 12), u < 0.35 ? 'rollers far from the tip: soft' : u > 0.65 ? 'rollers near the tip: stiff' : 'rollers moving', 8, 'var(--fg)') +
        txt(P(6, 106), 'same F at the tip; only the overhang bends', 7, 'var(--fg-2)');

    }
  };
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
