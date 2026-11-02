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
      var T = s % 12, fast = T >= 6, w = fast ? 2.6 : 0.8, A = 0.9;
      var th = A * Math.sin(w * T), alpha = -A * w * w * Math.sin(w * T);
      var O = P(58, 82), E = up(O, 52, th), tq = 7 * alpha;
      return KD.ground(O, { w: 12 }) + KD.body(O, E, 3.2) + KD.spring(up(O, 14, th), up(O, 36, th), 6, 2.2) + gsm(up(O, 8, th), 5) + KD.joint(O, 3.5) + KD.mass(E, 6, '') +
        '<line x1="118" y1="58" x2="152" y2="58" stroke="var(--line)"/>' + bar(128, 58, Math.max(-40, Math.min(40, tq)), 14, 'var(--red)') +
        txt(P(135, 104), 'motor torque', 7, 'var(--fg-2)', 'middle') + txt(P(8, 12), fast ? 'fast: inertia needs torque' : 'slow: balanced, no torque', 8, fast ? 'var(--red)' : 'var(--fg)');
    },
    // Nguyen, Kuo and Lin, JMR 2022: reliability of spring balancing with uncertain stiffness and
    // dimensions. Twelve sampled designs (k within a few per cent) give a band of leftover torque.
    JMR2022: (function () {
      var ks = []; for (var i = 0; i < 14; i++) ks.push(1 + 0.08 * Math.sin(i * 2.39) * Math.cos(i * 1.13));
      return function (s) {
        var th = 1.1 * Math.sin(s * 0.8), O = P(42, 80), E = up(O, 40, th), A = P(O.x, O.y - 20), B = up(O, 22, th);
        var out = KD.ground(O, { w: 11 }) + KD.ground(A, { w: 8, plain: true, up: true }) + KD.spring(A, B, 6, 2.2) + KD.link(O, E) + KD.pin(A) + KD.pin(B) + KD.joint(O, 3) + KD.mass(E, 5, '');
        out += '<rect x="84" y="18" width="70" height="70" fill="none" stroke="var(--line)"/><line x1="84" y1="53" x2="154" y2="53" stroke="var(--line)"/>';
        ks.forEach(function (k) {
          var d = ''; for (var j = 0; j <= 30; j++) { var a = -1.4 + 2.8 * j / 30, v = (k - 1) * Math.sin(a); d += (j ? 'L' : 'M') + f(84 + 70 * j / 30) + ',' + f(53 - 250 * v); }
          out += '<path d="' + d + '" fill="none" stroke="var(--red)" stroke-width=".8" opacity=".45"/>';
        });
        var x = 84 + 70 * (th + 1.4) / 2.8;
        return out + '<line x1="' + f(x) + '" y1="18" x2="' + f(x) + '" y2="88" stroke="var(--fg-2)" stroke-dasharray="2 2"/>' + txt(P(119, 99), 'leftover torque', 7.5, 'var(--fg-2)', 'middle') + txt(P(119, 108), '14 sampled designs', 6.5, 'var(--fg-2)', 'middle');
      };
    })(),
    // Nguyen, Lin and Kuo, JMR 2020: a gear-spring module on every link of a planar articulated arm.
    JMR2020: function (s) {
      var O = P(40, 90), t1 = 0.7 + 0.45 * Math.sin(s * 0.7), t2 = 1.3 + 0.6 * Math.sin(s * 0.9 + 1);
      var J = up(O, 50, t1), E = up(J, 46, t1 + t2 - 1.2);
      function module(a, b) { var u = KD.unit(a, b); return gsm(P(a.x + u.x * 8, a.y + u.y * 8), 5.5) + KD.spring(P(a.x + u.x * 16, a.y + u.y * 16), P(a.x + u.x * 36, a.y + u.y * 36), 6, 2); }
      return KD.ground(O, { w: 12 }) + KD.body(O, J, 3.2) + KD.body(J, E, 3) + module(O, J) + module(J, E) + KD.joint(O, 3.5) + KD.joint(J, 3) + KD.mass(E, 5.5, '') +
        txt(P(154, 92), 'one module per link', 8, 'var(--fg)', 'end') + txt(P(154, 104), 'joint torques ≈ 0', 8, 'var(--red)', 'end');
    },
    // Nguyen and Kuo, MMT 2019: stiffness of spring-articulated arms. A link on a compliant joint
    // under a tip load deflects by an amount that depends on its posture (exaggerated here).
    MMT2019: function (s) {
      var O = P(46, 70), th = 0.2 + 1.2 * (0.5 - 0.5 * Math.cos(s * 0.6)), L = 62, dfl = 0.28 * Math.sin(th);
      var Er = up(O, L, th), Ed = up(O, L, th + dfl);
      return KD.ground(O, { w: 12 }) + '<line x1="' + f(O.x) + '" y1="' + f(O.y) + '" x2="' + f(Er.x) + '" y2="' + f(Er.y) + '" stroke="var(--fg-2)" stroke-width="1" stroke-dasharray="3 2"/>' +
        KD.link(O, Ed, 2.6) + '<path d="M' + f(O.x - 9) + ',' + f(O.y) + ' a9,9 0 1 1 18,0" fill="none" stroke="var(--spring)" stroke-width="1.6"/>' + KD.joint(O, 3.2) +
        KD.arrow(P(Ed.x, Ed.y - 2), P(Ed.x, Ed.y + 18), 'var(--red)', 1.4, 5) + KD.label(P(Ed.x + 4, Ed.y + 16), 'F', { size: 9, fill: 'var(--red)' }) +
        KD.thin(Er, Ed) + txt(P(154, 100), 'deflection depends on posture', 7.5, 'var(--fg-2)', 'end');
    },
    // Nguyen and Kuo, chapter 2022: gear-spring modules as building blocks on serial and quasi-serial arms.
    BC02: function (s) {
      var O = P(30, 92), O2 = P(48, 92), t1 = 0.55 + 0.35 * Math.sin(s * 0.6), t2 = 1.9 + 0.4 * Math.sin(s * 0.8 + 1);
      var J = up(O, 50, t1), J2 = up(O2, 50, t1), E = up(J, 52, t2);
      return KD.ground(O, { w: 10 }) + KD.ground(O2, { w: 10 }) + KD.link(O, J) + KD.link(O2, J2) + KD.link(J, J2) + KD.body(J, E, 3) +
        gsm(up(O, 10, t1), 5) + KD.spring(up(O, 18, t1), up(O, 38, t1), 5, 2) + gsm(P(J.x + 8 * Math.sin(t2), J.y - 8 * Math.cos(t2)), 5) + KD.spring(up(J, 16, t2), up(J, 38, t2), 5, 2) +
        KD.joint(O, 3) + KD.joint(O2, 3) + KD.joint(J, 3) + KD.joint(J2, 3) + KD.mass(E, 5, '') + txt(P(154, 14), 'modules on a quasi-serial arm', 7.5, 'var(--fg)', 'end');
    },

    // ---- reconfigurable --------------------------------------------------------------------
    // Kuo, Su and Wu, Mech. Sci. 2017: the cube puzzle's configurations generated one from the next
    // by joint-screw matrices; here the cube opens to the slab and closes again.
    MS2017: function (s) {
      var Pp = (function (ox, oy, k) { var cx = Math.cos(Math.PI / 6), sx = Math.sin(Math.PI / 6); return function (p) { return P(ox + k * cx * (p[1] - p[0]), oy + k * sx * (p[0] + p[1]) - k * p[2]); }; })(80, 64, 15);
      var T = s % 8, a = T < 1 ? 0 : T < 3.5 ? Math.PI * smooth((T - 1) / 2.5) : T < 5 ? Math.PI : T < 7.5 ? Math.PI * (1 - smooth((T - 5) / 2.5)) : 0;
      var faces = [];
      [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 0, 1], [0, 0, 1]].forEach(function (c, i) {
        var v = []; for (var k = 0; k < 8; k++) v.push([c[0] + (k & 1), c[1] + ((k >> 1) & 1), c[2] + ((k >> 2) & 1)]);
        if (c[2] === 1) v = v.map(function (p) { var x = p[0], z = p[2] - 1, ca = Math.cos(a), sa = Math.sin(a); return [x * ca - z * sa, p[1], 1 + x * sa + z * ca]; });
        [[0, 1, 3, 2], [4, 5, 7, 6], [0, 1, 5, 4], [2, 3, 7, 6], [0, 2, 6, 4], [1, 3, 7, 5]].forEach(function (q) {
          var pts = q.map(function (k) { return v[k]; }), d = 0; pts.forEach(function (p) { d += p[0] + p[1] + p[2]; });
          faces.push({ pts: pts, d: d, i: i });
        });
      });
      faces.sort(function (x, y) { return x.d - y.d; });
      return faces.map(function (fc) { return '<polygon points="' + fc.pts.map(function (p) { return KD.pt(Pp(p)); }).join(' ') + '" fill="' + (fc.i === 0 ? 'var(--mag-stator)' : 'var(--card)') + '" stroke="var(--fg)" stroke-width=".9" stroke-linejoin="round"/>'; }).join('') +
        txt(P(154, 104), a > 3 ? 'slab' : a > 0.05 ? 'transforming' : 'cube', 8, 'var(--fg)', 'end');
    },

    // ---- medical ---------------------------------------------------------------------------
    // Vyas, Aquino, Kuo, Dai and Dasgupta, BJU Int. 2011: flexible robotics, an arm that bends along its length.
    BJUI2011: function (s) {
      var n = 9, seg = 10, base = P(30, 98), a = 0, p = base, out = KD.wall(P(14, 100), P(46, 100), 1), k = 0.22 * Math.sin(s * 0.7), k2 = 0.18 * Math.sin(s * 0.9 + 1.5);
      for (var i = 0; i < n; i++) {
        a += i < 5 ? k : k2; var q = P(p.x + seg * Math.sin(a), p.y - seg * Math.cos(a));
        out += KD.link(p, q, 4.5) + KD.joint(p, 2.2); p = q;
      }
      return out + KD.disc(p, 3, 'var(--mass)') + txt(P(154, 14), 'bending along its length', 8, 'var(--fg)', 'end');
    },
    // Yeow, Wang, Kuo and Ren, Biomim. Intell. Robot. 2025: parallelogram-based RCM mechanisms read as kirigami.
    // A double parallelogram whose output link always passes through a fixed remote centre.
    BIR2025: function (s) {
      // classic double parallelogram: cranks OA and B-A' turn together, so bar A..C translates along v = R - O;
      // the tool C1-C is parallel to the cranks, so its line always passes through R = O + v, where nothing is pivoted
      var th = 0.38 * Math.sin(s * 0.7), O = P(24, 58), R = P(104, 96), L = 36, e = 15, b = 24;
      var v = P(R.x - O.x, R.y - O.y), vl = Math.hypot(v.x, v.y), vh = P(v.x / vl, v.y / vl), dir = P(Math.sin(th), -Math.cos(th));
      function at(p, d, k) { return P(p.x + d.x * k, p.y + d.y * k); }
      var A = at(O, dir, L), A1 = at(O, dir, L - e), B = at(O, vh, b), Ab = at(B, dir, L), C = P(A.x + v.x, A.y + v.y), C1 = P(A1.x + v.x, A1.y + v.y);
      var out = KD.ground(O, { w: 10 }) + KD.ground(B, { w: 10 }) + KD.link(O, A, 2.2) + KD.link(B, Ab, 2.2) + KD.link(A, C, 2.2) + KD.link(A1, C1, 1.8) +
        KD.link(at(C1, dir, 6), at(R, dir, -10), 2.6) + KD.joint(O, 2.8) + KD.joint(B, 2.8) + KD.joint(A, 2.4) + KD.joint(Ab, 2.4) + KD.joint(A1, 2.4) + KD.joint(C, 2.4) + KD.joint(C1, 2.4);
      out += '<path d="M60,96 L146,96" stroke="var(--fg-2)" stroke-width="1" stroke-dasharray="3 2"/>' + KD.disc(R, 2.6, 'var(--mass)');
      return out + txt(P(4, 107), 'tool always through the red point', 7, 'var(--fg)');
    },
    // Li, Essomba, Wu, Lee, Kuo et al., Proc. IMechE C 2017: an RCM mechanism for craniotomy: drill, then cut by pivoting.
    JMES2017: function (s) {
      var C = P(80, 100), R = 62, rcm = P(80, 38), T = s % 9;
      var depth = T < 2 ? 8 * smooth(T / 2) : T < 7.5 ? 8 : 8 * (1 - smooth((T - 7.5) / 1.5)), sw = T < 2 ? 0 : T < 7.5 ? 0.45 * Math.sin((T - 2) / 5.5 * 2 * Math.PI) : 0;
      var dir = P(Math.sin(sw), Math.cos(sw)), tip = P(rcm.x + dir.x * depth, rcm.y + dir.y * depth), back = P(rcm.x - dir.x * 30, rcm.y - dir.y * 30);
      var out = '<path d="M' + f(C.x - R) + ',' + f(C.y) + ' A' + R + ',' + R + ' 0 0 1 ' + f(C.x + R) + ',' + f(C.y) + '" fill="var(--mag-rotor)" fill-opacity=".35" stroke="var(--fg)" stroke-width="1.2"/>';
      if (T >= 2) { var a0 = -0.45, a1 = Math.min(0.45, Math.abs(sw)) * Math.sign(sw || 1); out += '<path d="M' + f(rcm.x + 8 * Math.sin(-0.45)) + ',' + f(rcm.y + 8 * Math.cos(-0.45)) + ' A8,8 0 0 0 ' + f(rcm.x + 8 * Math.sin(0.45)) + ',' + f(rcm.y + 8 * Math.cos(0.45)) + '" fill="none" stroke="var(--red)" stroke-width="1.3"/>'; }
      out += KD.link(back, tip, 3) + KD.disc(rcm, 2.6, 'var(--mass)');
      return out + txt(P(80, 92), T < 2 ? '1: drill, one freedom' : '2: cut by pivoting, two freedoms', 7.5, 'var(--fg)', 'middle') + txt(P(80, 78), 'skull', 7, 'var(--fg-2)', 'middle');
    },

    // ---- collaborations --------------------------------------------------------------------
    // Nguyen, Kuo and Lin, MMT 2022: compliance error compensation of a Delta robot mounted on an articulated arm for milling.
    MMT2022: function (s) {
      var u = (s * 0.18) % 1, x = 20 + 120 * u, out = KD.wall(P(10, 96), P(150, 96), 1) + '<rect x="14" y="78" width="132" height="18" fill="var(--bg-2)" stroke="var(--fg)" stroke-width="1"/>';
      var dev = function (xx) { return 5 * Math.sin((xx - 20) / 120 * Math.PI * 3); };
      var d1 = '', d2 = ''; for (var i = 0; i <= 40; i++) { var xx = 20 + 120 * i / 40; d1 += (i ? 'L' : 'M') + f(xx) + ',' + f(78 + dev(xx)); }
      out += '<path d="' + d1 + '" fill="none" stroke="var(--red)" stroke-width="1" stroke-dasharray="3 2"/><line x1="20" y1="78" x2="140" y2="78" stroke="var(--spring)" stroke-width="1.6"/>';
      var tool = P(x, 76), plat = P(x, 58), baseY = 30;
      out += KD.link(P(x, 22), P(x - 46, 4), 5) + KD.joint(P(x, 22), 2.5) + KD.note(P(x - 44, 16), 'arm', { size: 7, fill: 'var(--fg-2)' });
      out += '<polygon points="' + f(x - 20) + ',' + baseY + ' ' + f(x + 20) + ',' + baseY + ' ' + f(x + 12) + ',22 ' + f(x - 12) + ',22" fill="var(--link-fill)" stroke="var(--fg)" stroke-width="1"/>';
      [-1, 0, 1].forEach(function (k) { var a = P(x + 16 * k, baseY), el = P(x + 22 * k, baseY + 12), b = P(x + 6 * k, plat.y); out += KD.link(a, el, 1.6) + KD.link(el, b, 1.2) + KD.joint(el, 1.6); });
      out += '<rect x="' + f(x - 8) + '" y="' + f(plat.y - 2) + '" width="16" height="4" fill="var(--card)" stroke="var(--fg)" stroke-width="1"/>' + KD.link(plat, tool, 2.2) + KD.note(P(x + 24, 48), 'Delta', { size: 7, fill: 'var(--fg-2)' });
      return out + txt(P(6, 108), 'dashed: deflected cut; blue: compensated', 7, 'var(--fg-2)');
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
      var T = s % 12, mode = T < 5.5 ? 1 : T < 6 ? 0 : T < 11.5 ? 2 : 0;
      var a1 = mode === 1 ? 0.6 * Math.sin((T / 5.5) * Math.PI) : 0, a2 = mode === 2 ? 0.45 * Math.sin(((T - 6) / 5.5) * Math.PI) : 0;
      var O1 = P(30, 92), O2 = P(30, 70), L = 54;
      var A1 = P(O1.x + L * Math.cos(-a2), O1.y + L * Math.sin(-a2)), A2 = P(O2.x + L * Math.cos(-a2), O2.y + L * Math.sin(-a2));
      var Kn = A2, F = P(Kn.x + 34 * Math.sin(a1), Kn.y + 34 * Math.cos(a1));
      var stretch = 10 * (a1 + a2) / 0.6, pul = P(122, 30), spBase = P(150, 96), spTop = P(150, 60 - stretch);
      var out = KD.ground(O1, { w: 10 }) + KD.ground(O2, { w: 10, plain: true }) + KD.link(O1, A1) + KD.link(O2, A2) + KD.link(A1, A2) + KD.body(Kn, F, 2.6) +
        KD.joint(O1, 2.6) + KD.joint(O2, 2.6) + KD.joint(A1, 2.4) + KD.joint(A2, 2.4) + KD.mass(F, 4.5, '');
      out += KD.cable([P(Kn.x + 8, Kn.y - 2), P(110, 22), pul, P(150, 22), spTop]) + KD.joint(pul, 3) + KD.joint(P(110, 22), 3) + KD.joint(P(150, 22), 3) +
        KD.spring(spTop, spBase, 7, 2.6) + KD.ground(spBase, { w: 10, plain: true });
      return out + txt(P(6, 12), mode === 1 ? 'mode I: lower link swings' : mode === 2 ? 'mode II: arm swings' : 'transition pose', 8, 'var(--fg)') + txt(P(146, 108), 'one spring', 7.5, 'var(--spring)', 'end');
    },
    // Hsiu, Syu and Kuo, Proc. IMechE C 2015: a slider-type monitor stand balanced by a two-step disk,
    // a bent lever and an ordinary extension spring (schematic).
    JMES2015: function (s) {
      var y = 18 * Math.sin(s * 0.5), D = P(56, 22), r2 = 12, r1 = 4, rot = y / r2;
      var blk = P(26, 58 + y), Lp = P(100, 40), lev = 0.6 + 0.05 * y, la = 18, ra = 28;
      var right = P(Lp.x + ra * Math.cos(Math.PI + lev), Lp.y + ra * Math.sin(Math.PI + lev)), left = P(Lp.x + la * Math.cos(lev - 0.6), Lp.y + la * Math.sin(lev - 0.6));
      var out = KD.wall(P(14, 10), P(14, 102), 1) + '<rect x="16" y="' + f(blk.y - 14) + '" width="22" height="28" fill="var(--card)" stroke="var(--fg)" stroke-width="1.2"/>' + txt(P(27, blk.y + 3), 'monitor', 5.5, 'var(--fg-2)', 'middle');
      out += KD.cable([P(27, blk.y - 14), P(D.x - r2, D.y)]) + '<circle cx="' + D.x + '" cy="' + D.y + '" r="' + r2 + '" fill="var(--link-fill)" stroke="var(--fg)" stroke-width="1.2"/><circle cx="' + D.x + '" cy="' + D.y + '" r="' + r1 + '" fill="var(--card)" stroke="var(--fg)" stroke-width="1"/>' +
        KD.line(D, P(D.x + r2 * Math.cos(rot), D.y + r2 * Math.sin(rot)), 'stroke="var(--fg)" stroke-width="1"');
      out += KD.cable([P(D.x + r1, D.y), right]) + KD.link(right, Lp, 2.2) + KD.link(Lp, left, 2.2) + KD.ground(Lp, { w: 9, plain: true }) + KD.joint(Lp, 2.4) + KD.joint(D, 2);
      var sb = P(left.x + 34, left.y + 44);
      return out + KD.spring(left, sb, 7, 2.4) + KD.ground(sb, { w: 9, plain: true }) + txt(P(154, 12), 'stays at any height', 7.5, 'var(--fg)', 'end');
    },

    // ---- magnetic --------------------------------------------------------------------------
    // Li, Zeng and Kuo, ASME Lett. Transl. Robot. 2026: two stator magnets on a frame, the mover between them;
    // the lower stator pushes, the upper one pulls, and the sum stays nearly constant over the stroke.
    ALTR2026: function (s) {
      var z = 14 * Math.sin(s * 0.45), my = 58 - z, out = '<rect x="30" y="8" width="70" height="96" fill="none" stroke="var(--fg)" stroke-width="1.2"/>' + KD.wall(P(24, 104), P(106, 104), 1);
      out += '<rect x="45" y="12" width="40" height="10" fill="var(--mag-stator)" stroke="var(--fg)" stroke-width="1.1"/><rect x="45" y="90" width="40" height="10" fill="var(--mag-stator)" stroke="var(--fg)" stroke-width="1.1"/>';
      out += '<rect x="40" y="' + f(my - 4) + '" width="50" height="8" fill="var(--mag-rotor)" stroke="var(--fg)" stroke-width="1.1"/>' + KD.link(P(90, my), P(108, my), 2) + KD.mass(P(114, my), 5, '');
      // magnetisation per the paper's Fig. 2: upper stator and mover N up, lower stator N down (like poles face below, opposite poles above)
      out += KD.arrow(P(52, 21), P(52, 13), 'var(--mag-arrow)', 1.4, 4) + KD.arrow(P(52, 91), P(52, 99), 'var(--mag-arrow)', 1.4, 4) + KD.arrow(P(84, my + 3.5), P(84, my - 3.5), 'var(--mag-arrow-2)', 1.4, 4);
      var push = 12 * (1 - z / 40), pull = 12 * (1 + z / 40);
      out += KD.arrow(P(60, my + 22), P(60, my + 22 - push), 'var(--spring)', 1.4, 5) + KD.arrow(P(70, my - 22 + pull), P(70, my - 22), 'var(--spring)', 1.4, 5);
      out += '<line x1="128" y1="56" x2="154" y2="56" stroke="var(--line)"/>' + bar(136, 56, 24, 10, 'var(--spring)');
      return out + txt(P(141, 92), 'lift', 7, 'var(--fg-2)', 'middle') + txt(P(141, 100), '≈ const.', 7, 'var(--fg-2)', 'middle') + txt(P(28, 6), '', 1);
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
      var T = s % 6, u = T < 2.5 ? T / 2.5 : T < 3 ? 1 : T < 5.5 ? 1 + (T - 3) / 2.5 : 2;
      var pin = u <= 1 ? P(48, 26 + 52 * smooth(u)) : P(48 + 70 * smooth(u - 1), 78);
      var out = '<path d="M40,18 L56,18 L56,70 L126,70 L126,86 L40,86 Z" fill="var(--bg-2)" stroke="var(--fg)" stroke-width="1.2"/>' + KD.disc(pin, 5, 'var(--mass)');
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
      // touching the rim = clamped (A, D); drawn away = released (B, C)
      var rel = st === 'A' ? 0 : st === 'B' ? smooth((phi + 0.75 * Math.PI) / (Math.PI / 2)) : st === 'C' ? 1 : 1 - smooth((phi - Math.PI / 4) / (Math.PI / 2));
      var by = W.y + a + 8 * rel;
      out += '<polygon points="' + f(W.x - 9) + ',' + f(by + 10) + ' ' + f(W.x + 9) + ',' + f(by + 10) + ' ' + W.x + ',' + f(by) + '" fill="var(--link-fill)" stroke="var(--fg)" stroke-width="1.2"/>';
      out += KD.ground(C, { w: 10 }) + KD.link(C, pin, 2.4) + KD.joint(C, 2.6) + KD.disc(pin, 3, 'var(--mass)');
      var code = { A: 'X (fixed)', B: 'P (sliding)', C: 'D (separated)', D: 'P (sliding)' }[st];
      return out + txt(P(6, 12), 'stage ' + st, 9, 'var(--fg)') + txt(P(6, 24), rel > 0.5 ? 'wheel released' : 'wheel clamped', 7.5, 'var(--fg-2)') + txt(P(6, 106), 'joint: ' + code, 7.5, 'var(--fg-2)');
    },
    // Yan and Kuo, JMD 2006: a variable kinematic joint, the two-member key ring. The pin slides out of a slot
    // (prismatic), then both slides and turns, then only turns: states as nodes of a small digraph.
    JMD2006: function (s) {
      var T = s % 9, st = T < 3 ? 0 : T < 6 ? 1 : 2, u = (T % 3) / 3;
      var O = P(52, 66), slot = 30, ext = st === 0 ? slot * smooth(u) : slot, ang = st === 0 ? 0 : st === 1 ? -0.6 * smooth(u) : -0.6 - 0.9 * Math.sin(u * Math.PI);
      var out = '<rect x="' + (O.x - 30) + '" y="' + (O.y - 6) + '" width="36" height="12" rx="6" fill="var(--bg-2)" stroke="var(--fg)" stroke-width="1.2"/>';
      var piv = P(O.x + ext - 26, O.y), tip = P(piv.x + 42 * Math.cos(ang), piv.y + 42 * Math.sin(ang));
      out += KD.body(piv, tip, 4, 'var(--link-fill)') + KD.joint(piv, 3);
      var nodes = [P(118, 22), P(138, 52), P(118, 82)], lab = ['P', 'P+R', 'R'];
      out += KD.arrow(nodes[0], P(nodes[1].x - 4, nodes[1].y - 6), 'var(--fg-2)', 1, 5) + KD.arrow(nodes[1], P(nodes[2].x + 4, nodes[2].y - 6), 'var(--fg-2)', 1, 5);
      nodes.forEach(function (n, i) { out += '<circle cx="' + n.x + '" cy="' + n.y + '" r="9" fill="' + (i === st ? 'var(--mass)' : 'var(--card)') + '" stroke="var(--fg)" stroke-width="1.1"/>' + txt(P(n.x, n.y + 3), lab[i], 7, i === st ? '#fff' : 'var(--fg)', 'middle'); });
      return out + txt(P(6, 106), 'key ring: one joint, three states', 7.5, 'var(--fg-2)');
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
      var T = s % 10, out = '', y0 = 46;
      var feed = T < 2 ? smooth(T / 2) : 1, cut = T >= 2 && T < 2.6, flip = T < 3 ? 0 : T < 4.5 ? smooth((T - 3) / 1.5) : 1, push = T < 6 ? 0 : T < 8 ? smooth((T - 6) / 2) : 1 - smooth((T - 8) / 2);
      out += '<circle cx="30" cy="' + (y0 - 8) + '" r="7" fill="var(--link-fill)" stroke="var(--fg)" stroke-width="1"/>' + KD.line(P(30, y0 - 8), P(30 + 7 * Math.cos(T * 3), y0 - 8 + 7 * Math.sin(T * 3)), 'stroke="var(--fg)" stroke-width="1"');
      out += KD.line(P(12, y0), P(70 - 20 * feed, y0), 'stroke="#B8860B" stroke-width="2.4"');
      out += '<rect x="46" y="' + f(cut ? y0 - 6 : y0 - 22) + '" width="4" height="12" fill="var(--fg)"/>';
      var nx = 92, seg = 12;
      out += '<g transform="rotate(' + f(180 * flip) + ' ' + (nx + 22) + ' ' + y0 + ')"><rect x="' + nx + '" y="' + (y0 - 3) + '" width="44" height="6" fill="var(--card)" stroke="var(--fg)" stroke-width="1.1"/>' +
        (T >= 2.6 ? KD.line(P(nx + 2 + 30 * push, y0), P(nx + 2 + seg + 30 * push, y0), 'stroke="#B8860B" stroke-width="2.4"') : '') + '</g>';
      if (T >= 6) out += KD.link(P(nx - 6 + 30 * push, y0 + 18), P(nx - 6 + 30 * push, y0 + 6), 2) + txt(P(nx + 22, y0 + 32), 'plunger', 7, 'var(--fg-2)', 'middle');
      var lab = T < 2 ? 'feed' : T < 3 ? 'cut' : T < 6 ? 'flip the needle seat' : 'push the catgut out';
      return out + txt(P(6, 12), (T < 6 ? 'step 1: ' : 'step 2: ') + lab, 8, 'var(--fg)') + txt(P(6, 106), 'no battery, two steps instead of five', 7, 'var(--fg-2)');
    },
    // Kuo, Liu and Wang, US Patent 10,456,153 (2019): a medical clamping instrument. Turning the drive rod turns
    // a screw through universal joints; the nut moves, and two links swing the jaws open and closed.
    PA01: function (s) {
      var T = s % 8, open = T < 4 ? smooth(T / 4) : 1 - smooth((T - 4) / 4), nx = 62 + 22 * open;
      var out = '<rect x="10" y="50" width="92" height="12" fill="var(--card)" stroke="var(--fg)" stroke-width="1.2"/>';
      for (var i = 0; i < 9; i++) { var x = 30 + i * 8 + (T * 6) % 8; out += KD.line(P(x, 52), P(x - 4, 60), 'stroke="var(--fg-2)" stroke-width=".8"'); }
      out += '<rect x="' + f(nx - 5) + '" y="48" width="10" height="16" fill="var(--link-fill)" stroke="var(--fg)" stroke-width="1.2"/>';
      var piv = P(116, 56), ja = 0.08 + 0.55 * open;
      var t1 = P(piv.x + 30 * Math.cos(-ja), piv.y + 30 * Math.sin(-ja)), t2 = P(piv.x + 30 * Math.cos(ja), piv.y + 30 * Math.sin(ja));
      var c1 = P(piv.x - 10 * Math.cos(-ja + 0.5), piv.y - 10 * Math.sin(-ja + 0.5)), c2 = P(piv.x - 10 * Math.cos(ja - 0.5), piv.y - 10 * Math.sin(ja - 0.5));
      out += KD.link(P(nx + 5, 52), c1, 1.4) + KD.link(P(nx + 5, 60), c2, 1.4) + KD.link(c1, t1, 2.6) + KD.link(c2, t2, 2.6) + KD.joint(piv, 2.6) + KD.joint(c1, 1.8) + KD.joint(c2, 1.8);
      return out + txt(P(6, 12), open > 0.5 ? 'nut forward: jaws open' : 'nut back: jaws grip', 8, 'var(--fg)') + txt(P(6, 106), 'screw and nut instead of cables', 7, 'var(--fg-2)');
    },
    // Kuo, Dai and Dasgupta, Int. J. Med. Robot. 2012: the overview's classification of remote-centre-of-motion
    // mechanisms. Two of the eight types in turn: a circular tracking arc and a parallelogram.
    IJMRCAS2012: function (s) {
      var T = s % 10, R = P(80, 92), th = 0.45 * Math.sin((T % 5) / 5 * 2 * Math.PI), out = '<path d="M20,92 L140,92" stroke="var(--fg-2)" stroke-dasharray="3 2"/>';
      var dir = P(Math.sin(th), -Math.cos(th));
      if (T < 5) {
        out += '<path d="M' + f(R.x - 60 * Math.sin(0.6)) + ',' + f(R.y - 60 * Math.cos(0.6)) + ' A60,60 0 0 1 ' + f(R.x + 60 * Math.sin(0.6)) + ',' + f(R.y - 60 * Math.cos(0.6)) + '" fill="none" stroke="var(--fg)" stroke-width="3"/>';
        var cart = P(R.x + 60 * dir.x, R.y + 60 * dir.y);
        out += '<rect x="-6" y="-4" width="12" height="8" fill="var(--card)" stroke="var(--fg)" stroke-width="1.2" transform="translate(' + f(cart.x) + ',' + f(cart.y) + ') rotate(' + f(th * 180 / Math.PI) + ')"/>';
        out += KD.link(P(R.x + 72 * dir.x, R.y + 72 * dir.y), P(R.x - 8 * dir.x, R.y - 8 * dir.y), 2.2);
      } else {
        var O = P(24, 40), v = P(R.x - O.x, R.y - O.y), L = 30, A = P(O.x + L * dir.x, O.y + L * dir.y), C = P(A.x + v.x, A.y + v.y), B = P(O.x + 0.3 * v.x, O.y + 0.3 * v.y), Ab = P(B.x + L * dir.x, B.y + L * dir.y);
        out += KD.ground(O, { w: 9 }) + KD.ground(B, { w: 9 }) + KD.link(O, A, 2) + KD.link(B, Ab, 2) + KD.link(A, C, 2) + KD.link(P(C.x + 6 * dir.x, C.y + 6 * dir.y), P(R.x - 8 * dir.x, R.y - 8 * dir.y), 2.2) + KD.joint(O, 2.4) + KD.joint(B, 2.4) + KD.joint(A, 2) + KD.joint(Ab, 2) + KD.joint(C, 2);
      }
      return out + KD.disc(R, 2.6, 'var(--mass)') + txt(P(154, 12), (T < 5 ? 'circular tracking arc' : 'parallelogram') + ' (2 of 8 types)', 7, 'var(--fg)', 'end');
    },

    // ---- collaborations --------------------------------------------------------------------
    // Wang et al., Eng. Struct. 2025: a bistable unit derived from Waterbomb origami; a strip of units deploys,
    // then some snap to their second state and the strip arches to fit the ground.
    ES2025: function (s) {
      var T = s % 10, dep = T < 3 ? smooth(T / 3) : T < 7 ? 1 : 1 - smooth((T - 7) / 3), arch = T < 3.5 ? 0 : T < 5 ? smooth((T - 3.5) / 1.5) : T < 7 ? 1 : 1 - smooth((T - 7) / 1.5);
      var n = 6, w = 8 + 12 * dep, out = KD.wall(P(10, 100), P(150, 100), 1), x0 = 80 - n * w / 2;
      for (var i = 0; i < n; i++) {
        var cx = x0 + (i + 0.5) * w, k = (i - (n - 1) / 2), y = 70 - arch * (18 - 2.2 * k * k) - 6 * (1 - dep);
        var snap = arch > 0.5 && (i === 2 || i === 3), h = 6 + 6 * dep;
        out += '<polygon points="' + f(cx - w / 2) + ',' + f(y) + ' ' + f(cx) + ',' + f(y + (snap ? h : -h)) + ' ' + f(cx + w / 2) + ',' + f(y) + '" fill="' + (snap ? 'var(--mag-rotor)' : 'var(--link-fill)') + '" stroke="var(--fg)" stroke-width="1"/>';
      }
      return out + txt(P(6, 12), T < 3 ? 'deploying' : arch > 0.5 ? 'units snapped: the strip arches' : 'deployed', 8, 'var(--fg)');
    },
    // Liu et al., Int. J. Mech. Sci. 2025: a curved loop strip that folds and wraps an object when twisted.
    IJMS2025: function (s) {
      var tw = 0.5 - 0.5 * Math.cos(s * 0.9), C = P(80, 62), out = '<circle cx="' + C.x + '" cy="' + C.y + '" r="12" fill="var(--pin)" stroke="var(--fg)" stroke-width="1.2"/>';
      [-1, 1].forEach(function (sg) {
        var span = 34 - 18 * tw, curl = 0.2 + 1.3 * tw, d = 'M' + f(C.x) + ',' + f(C.y - 40);
        for (var i = 1; i <= 16; i++) { var u = i / 16, a = -Math.PI / 2 + sg * (u * curl * 2), r = span * (1 - 0.35 * u * tw) + 14 * tw; d += ' L' + f(C.x + sg * Math.sin(u * Math.PI) * r) + ',' + f(C.y - 40 + 80 * u * (0.55 + 0.45 * (1 - tw)) + 14 * tw * Math.sin(u * Math.PI)); }
        out += '<path d="' + d + '" fill="none" stroke="var(--spring)" stroke-width="2.4" stroke-linecap="round"/>';
      });
      out += KD.link(P(C.x, 4), P(C.x, C.y - 40), 2.4) + '<path d="M' + (C.x - 8) + ',14 A8,4 0 1 0 ' + (C.x + 8) + ',14" fill="none" stroke="var(--red)" stroke-width="1.2"/>';
      return out + txt(P(154, 12), tw > 0.5 ? 'twisted: the loop wraps' : 'twist the axis', 7.5, 'var(--fg)', 'end');
    },
    // Sariyildiz, Mutlu, Roberts, Kuo and Ugurlu, IEEE/ASME T-Mech 2023: a variable stiffness series elastic
    // actuator. Rollers slide along leaf springs to change their effective length; the output gives less.
    TMech2023: function (s) {
      var T = s % 10, u = T < 5 ? smooth(T / 5) : 1 - smooth((T - 5) / 5), rx = 130 - 80 * u, Lf = 130 - 20;
      var stiff = 1 / Math.pow((rx - 20) / Lf, 3), d = 16 / stiff * (0.6 + 0.4 * Math.sin(s * 6));
      var out = KD.wall(P(18, 30), P(18, 90), -1) + '<rect x="18" y="56" width="4" height="8" fill="var(--fg)"/>';
      var tipY = 60 + Math.min(18, d), dpath = 'M22,60 Q' + f((22 + rx) / 2) + ',60 ' + f(rx) + ',60 L130,' + f(tipY);
      out += '<path d="' + dpath + '" fill="none" stroke="var(--spring)" stroke-width="2.6"/>';
      out += '<circle cx="' + f(rx) + '" cy="55" r="4" fill="var(--card)" stroke="var(--fg)" stroke-width="1.2"/><circle cx="' + f(rx) + '" cy="65" r="4" fill="var(--card)" stroke="var(--fg)" stroke-width="1.2"/>';
      out += KD.arrow(P(130, tipY - 16), P(130, tipY - 2), 'var(--red)', 1.2, 5);
      return out + txt(P(6, 12), u > 0.5 ? 'rollers in: stiff' : 'rollers out: soft', 8, 'var(--fg)') + txt(P(6, 106), 'effective spring length sets the stiffness', 7, 'var(--fg-2)');
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
