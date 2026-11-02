// Animations for the medical-device paper pages. Drawing through draw.js (KD); ISO from parallel.js.
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var f = KD.f, ISO = window.ISO;
  function loop(tick) { tick(); if (!reduce) requestAnimationFrame(function step(t) { tick(t); requestAnimationFrame(step); }); }
  function radios(name, cb) { Array.prototype.forEach.call(document.querySelectorAll('input[name=' + name + ']'), function (r) { r.addEventListener('change', function () { if (r.checked) cb(r.value); }); }); }
  function chartPath(W, H, x0, x1, lo, hi, fn, N) {
    N = N || 121; var d = '';
    for (var i = 0; i < N; i++) { var x = x0 + (x1 - x0) * i / (N - 1), y = H - (fn(x) - lo) / (hi - lo) * H; d += (i ? 'L' : 'M') + f(W * i / (N - 1)) + ',' + f(Math.max(-20, Math.min(H + 20, y))); }
    return d;
  }
  function smooth(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  // ---------------------------------------------------------------------------------------------
  // Tseng, Lin, Hsu, Lin and Kuo, ASME J. Mech. Robot. 9 (2017) 041002: a reconfigurable gravity
  // balancer for lower-limb rehabilitation with switchable hip-only / knee-only exercise.
  // Seven links, nine joints (Fig. 1). Thigh on link 3 (hip B at the top of the vertical link 2, knee
  // A at its other end), calf on link 4; links 2-3-6-7 form a parallelogram so link 6 stays vertical.
  // Knee-only: a roller lock holds 3 to 2 and the calf swings about A, balanced by spring k2 between
  // a vertical reference (link 8/6) and link 4. Hip-only: the knee is held and the thigh swings about
  // B with the calf translating, balanced by spring k1 between the vertical link 9 (on 2) and link 3.
  // Zero-free-length springs: k h l = (moment of the carried weight). Masses from the paper's Table 1
  // (thigh 8.4 kg, calf 4.4 kg, foot 1.1 kg, lt = 441 mm, lc = 440 mm); link masses neglected here.
  // ---------------------------------------------------------------------------------------------
  (function () {
    var svg = document.getElementById('rehab');
    if (!svg) return;
    var g = svg.querySelector('#hBody'), el = { cUg: svg.querySelector('#hUg'), cUs: svg.querySelector('#hUs'), cUt: svg.querySelector('#hUt'), cursor: svg.querySelector('#hCursor'), lblT: svg.querySelector('#hLblT') };
    var S = 0.36, O = { x: 230, y: 215 }, c = 190, d = 441, lc = 440, gacc = 9.81;
    var mt = 8.4, mc = 4.4, mf = 1.1, rt = d * 0.433, rc = lc * 0.433;        // CoM fractions after Dempster-type data
    var B = { x: O.x, y: O.y - c * S };
    var mode = 'knee', on = true, msg = document.getElementById('rhMsg'), sOut = document.getElementById('rhSpring');
    // spring geometry (mm): k2 between a point h2 above the knee on the vertical link and l2 down the calf;
    // k1 between a point h1 above the hip on link 9 and l1 along the thigh
    var h1 = 120, l1 = 150, h2 = 90, l2 = 110;
    var M1 = (mt * rt + (mc + mf) * d) * gacc, M2 = (mc * rc + mf * lc) * gacc;   // moments at zero angle (N mm)
    var k1 = M1 / (h1 * l1), k2 = M2 / (h2 * l2);
    function state(th, al) {   // th: hip flexion from horizontal (thigh up is positive), al: knee angle from vertical
      var A = { x: B.x - d * Math.cos(th), y: B.y - d * Math.sin(th) };                    // knee (mm, y up)
      var foot = { x: A.x - lc * Math.sin(al), y: A.y - lc * Math.cos(al) };
      var ct = { x: B.x - rt * Math.cos(th), y: B.y - rt * Math.sin(th) }, cc = { x: A.x - rc * Math.sin(al), y: A.y - rc * Math.cos(al) };
      var Ug = gacc * (mt * ct.y + mc * cc.y + mf * foot.y) / 1000;
      var s1 = { a: { x: B.x, y: B.y + h1 }, b: { x: B.x - l1 * Math.cos(th), y: B.y - l1 * Math.sin(th) } };
      var s2 = { a: { x: A.x, y: A.y + h2 }, b: { x: A.x - l2 * Math.sin(al), y: A.y - l2 * Math.cos(al) } };
      function U(sp, k) { var dx = sp.a.x - sp.b.x, dy = sp.a.y - sp.b.y; return 0.5 * k * (dx * dx + dy * dy) / 1000; }
      var Us = on ? U(s1, k1) + U(s2, k2) : 0;
      return { A: A, foot: foot, s1: s1, s2: s2, Ug: Ug, Us: Us, ct: ct, cc: cc };
    }
    function Sx(p) { return { x: O.x + (p.x - O.x) * S, y: O.y - (p.y - O.y) * S }; }   // mm (y up, hip at B in screen-mm) -> screen
    function toMM(p) { return { x: p.x, y: p.y }; }
    // work in a mm frame where O (ground pivot) is at screen O and B is c above
    var Bmm = { x: 0, y: c };
    function state2(th, al) {
      B = Bmm; var st = state(th, al); return st;
    }
    function P(p) { return { x: O.x + p.x * S, y: O.y - p.y * S }; }
    function draw(th, al) {
      var st = state2(th, al), A = st.A, Fp = st.foot;
      var C = { x: A.x, y: A.y - c };                                   // joint 6-7 under the knee (parallelogram 2-3-6-7)
      var out = '';
      out += KD.wall({ x: O.x - 70, y: O.y + 2 }, { x: O.x + 70, y: O.y + 2 }, 1) + KD.ground(P({ x: 0, y: 0 }), { w: 14, plain: true });
      // link 2 (vertical post), link 9 (vertical extension above the hip for spring 1), link 7 and 6
      out += KD.link(P({ x: 0, y: 0 }), P(Bmm), 3) + KD.link(P(Bmm), P({ x: 0, y: c + h1 }), 1.6) + KD.link(P({ x: 0, y: 0 }), P(C), 2) + KD.link(P(C), P(A), 2) + KD.link(P(A), P({ x: A.x, y: A.y + h2 }), 1.6);
      // thigh (link 3) and calf (link 4) as bodies, with the limb masses
      out += KD.body(P(Bmm), P(A), 5, 'var(--link-fill)') + KD.body(P(A), P(Fp), 4.5, 'var(--link-fill)');
      out += KD.joint(P({ x: 0, y: 0 }), 4.5) + KD.joint(P(C), 3.5) + KD.joint2(P(Bmm), 4) + KD.joint2(P(A), 4);
      out += KD.mass(P(st.ct), 7, 'm') + KD.mass(P(st.cc), 6, 'm') + KD.mass(P(Fp), 5, '');
      // springs
      if (on) out += KD.spring(P(st.s1.a), P(st.s1.b), 8, 3) + KD.spring(P(st.s2.a), P(st.s2.b), 8, 3) + KD.pin(P(st.s1.a)) + KD.pin(P(st.s1.b)) + KD.pin(P(st.s2.a)) + KD.pin(P(st.s2.b)) +
        KD.label({ x: P(st.s1.a).x + 8, y: P(st.s1.a).y + 2 }, 'k', { size: 11, fill: 'var(--spring)', sub: '1' }) + KD.label({ x: P(st.s2.a).x + 8, y: P(st.s2.a).y + 2 }, 'k', { size: 11, fill: 'var(--spring)', sub: '2' });
      // locks: a roller lock at the hip (knee-only) or a knee lock (hip-only)
      var lockP = mode === 'knee' ? P(Bmm) : P(A);
      out += '<rect x="' + f(lockP.x - 9) + '" y="' + f(lockP.y - 9) + '" width="18" height="18" fill="none" stroke="var(--red)" stroke-width="1.6" stroke-dasharray="3 2"/>' + KD.note({ x: lockP.x + 12, y: lockP.y - 10 }, 'held', { size: 8, fill: 'var(--red)' });
      out += KD.label({ x: P(Bmm).x + 10, y: P(Bmm).y - 6 }, 'B', { size: 11 }) + KD.label({ x: P(A).x - 16, y: P(A).y - 6 }, 'A', { size: 11 }) + KD.note({ x: P(Bmm).x + 26, y: P(Bmm).y + 14 }, 'hip', { size: 8 }) + KD.note({ x: P(A).x - 34, y: P(A).y + 14 }, 'knee', { size: 8 });
      g.innerHTML = out;
      return st;
    }
    // chart over the swing: 0..50 deg of the moving joint
    var W = 260, H = 70, lo, hi, AMP = 50 * Math.PI / 180;
    function range() { var a = state2(0, 0), b = state2(mode === 'hip' ? AMP : 0, mode === 'knee' ? AMP : 0); lo = Math.min(a.Ug, b.Ug, a.Us, b.Us); hi = Math.max(a.Ug + a.Us, b.Ug + b.Us, a.Ug, b.Ug); var p = (hi - lo) * 0.12 + 1; lo -= p; hi += p; }
    function rechart() {
      range();
      function st(x) { return mode === 'hip' ? state2(x, 0) : state2(0, x); }
      el.cUg.setAttribute('d', chartPath(W, H, 0, AMP, lo, hi, function (x) { return st(x).Ug; }));
      el.cUs.setAttribute('d', chartPath(W, H, 0, AMP, lo, hi, function (x) { return st(x).Us; }));
      el.cUt.setAttribute('d', chartPath(W, H, 0, AMP, lo, hi, function (x) { var s = st(x); return s.Ug + s.Us; }));
      el.cUs.style.display = on ? '' : 'none'; el.lblT.textContent = on ? 'total' : 'total = gravity';
      if (sOut) sOut.value = 'k₁ = ' + k1.toFixed(2) + ' N/mm, k₂ = ' + k2.toFixed(2) + ' N/mm';
      if (msg) msg.textContent = !on ? 'Springs off: the leg falls.' : mode === 'knee' ? 'Knee-only: the thigh is held level, the calf swings; only spring k₂ changes length and the total stays flat.' : 'Hip-only: the knee is held, the thigh swings and the calf translates; only spring k₁ changes length.';
    }
    radios('rhmode', function (v) { mode = v; rechart(); });
    var onIn = document.getElementById('rhOn'); if (onIn) onIn.addEventListener('change', function () { on = onIn.checked; rechart(); });
    rechart();
    var t0 = null;
    loop(function (t) {
      var s = t === undefined ? 0 : ((t0 === null ? (t0 = t) : t0), (t - t0) / 1000), x = AMP * 0.5 * (1 - Math.cos(s * 0.9));
      if (!on) x = AMP;
      draw(mode === 'hip' ? x : 0, mode === 'knee' ? x : 0);
      el.cursor.setAttribute('x1', f(W * x / AMP)); el.cursor.setAttribute('x2', f(W * x / AMP));
    });
  })();

  // ---------------------------------------------------------------------------------------------
  // Kuo and Lai, ASME J. Mech. Robot. 8 (2016) 015001: a statically balanced laparoscope holder with
  // decoupled positioning and orientating. The positioning mechanism is a double parallelogram on a
  // base revolute, so its end-effector link keeps its orientation and carries a fixed remote centre
  // of motion (RCM) point; the orientating mechanism, a 4-DOF parallel mechanism of two five-bars,
  // turns and inserts the laparoscope about that point. Planar view: the two parallelogram loops with
  // one zero-free-length spring each (k h l = moment carried), the RCM point moving with the arm in the
  // positioning phase and fixed at the incision in the orientating phase.
  // ---------------------------------------------------------------------------------------------
  (function () {
    var svg = document.getElementById('lap');
    if (!svg) return;
    var g = svg.querySelector('#lBody'), el = { cUg: svg.querySelector('#lUg'), cUs: svg.querySelector('#lUs'), cUt: svg.querySelector('#lUt'), cursor: svg.querySelector('#lCursor'), lblT: svg.querySelector('#lLblT') };
    var on = true, msg = document.getElementById('lpMsg'), phaseOut = document.getElementById('lpPhase');
    var O = { x: 70, y: 170 }, a = 90, b = 85, post = 36, w = 22, gacc = 1;      // screen units, y down
    var ma = 0.6, mb = 0.5, mE = 1.0;                                           // link masses and the orientating mechanism
    var h1 = 40, l1 = 45, h2 = 36, l2 = 40;
    var k1 = gacc * (ma * a / 2 + (mb + mE) * a) / (h1 * l1), k2 = gacc * (mb * b / 2 + mE * b) / (h2 * l2);
    function state(p1, p2) {   // angles above horizontal
      var A = { x: O.x + a * Math.cos(p1), y: O.y - a * Math.sin(p1) };          // end of link a (joint with the pseudo-base link)
      var E = { x: A.x + b * Math.cos(p2), y: A.y - b * Math.sin(p2) };          // end-effector link (vertical)
      var rcm = { x: E.x + 26, y: E.y + 46 };                                     // RCM point fixed to the end-effector link
      var Ug = gacc * (ma * (O.y - (O.y + A.y) / 2) + mb * (O.y - (A.y + E.y) / 2) + mE * (O.y - E.y));
      var s1 = { a: { x: O.x, y: O.y - h1 }, b: { x: O.x + l1 * Math.cos(p1), y: O.y - l1 * Math.sin(p1) } };
      var s2 = { a: { x: A.x, y: A.y - h2 }, b: { x: A.x + l2 * Math.cos(p2), y: A.y - l2 * Math.sin(p2) } };
      function U(sp, k) { var dx = sp.a.x - sp.b.x, dy = sp.a.y - sp.b.y; return 0.5 * k * (dx * dx + dy * dy); }
      return { A: A, E: E, rcm: rcm, Ug: Ug, Us: on ? U(s1, k1) + U(s2, k2) : 0, s1: s1, s2: s2 };
    }
    function draw(p1, p2, tilt, ins, phase) {
      var st = state(p1, p2), A = st.A, E = st.E, R = st.rcm, out = '';
      out += KD.wall({ x: O.x - 30, y: O.y + post }, { x: O.x + 30, y: O.y + post }, 1) + KD.link({ x: O.x, y: O.y + post }, { x: O.x, y: O.y - h1 - 6 }, 3);
      // parallelogram 1: links a (two parallel bars, offset w) between the post and the pseudo-base link
      function para(Pt, Qt, len, ang, off) {
        var Pb = { x: Pt.x, y: Pt.y + off }, Qb = { x: Qt.x, y: Qt.y + off };
        return KD.link(Pt, Qt, 2.4) + KD.link(Pb, Qb, 2.4) + KD.link(Qt, Qb, 2.4) + KD.joint(Pt, 3.5) + KD.joint(Pb, 3.5) + KD.joint(Qt, 3.5) + KD.joint(Qb, 3.5);
      }
      out += para(O, A, a, p1, w) + para(A, E, b, p2, w);
      // pseudo-base link (vertical) at A and the end-effector link at E, extended to the RCM
      out += KD.link({ x: A.x, y: A.y - h2 - 6 }, { x: A.x, y: A.y + w }, 3) + KD.link({ x: E.x, y: E.y - 8 }, { x: E.x, y: E.y + w + 10 }, 3);
      out += KD.dashed({ x: E.x, y: E.y + w + 10 }, R);
      // the orientating mechanism, drawn as a sector guide about the RCM with the laparoscope through it
      var dir = { x: Math.sin(tilt), y: -Math.cos(tilt) };
      out += '<path d="M' + f(R.x - 30 * Math.sin(0.6)) + ',' + f(R.y - 30 * Math.cos(0.6)) + ' A30,30 0 0 1 ' + f(R.x + 30 * Math.sin(0.6)) + ',' + f(R.y - 30 * Math.cos(0.6)) + '" fill="none" stroke="var(--fg)" stroke-width="1.2" stroke-dasharray="3 2"/>';
      out += KD.link({ x: R.x + dir.x * (64 - ins), y: R.y + dir.y * (64 - ins) }, { x: R.x - dir.x * (14 + ins), y: R.y - dir.y * (14 + ins) }, 3.5) +
             '<rect x="-6" y="-9" width="12" height="18" fill="var(--card)" stroke="var(--fg)" stroke-width="1.2" transform="translate(' + f(R.x + dir.x * 30) + ',' + f(R.y + dir.y * 30) + ') rotate(' + f(tilt * 180 / Math.PI) + ')"/>' +
             KD.link({ x: E.x, y: E.y + w + 10 }, { x: R.x + dir.x * 30, y: R.y + dir.y * 30 }, 1.6);
      // the patient's wall and the incision (fixed in the orientating phase)
      if (phase === 1) out += KD.wall({ x: R.x - 40, y: R.y + 3 }, { x: R.x - 8, y: R.y + 3 }, 1) + KD.wall({ x: R.x + 8, y: R.y + 3 }, { x: R.x + 40, y: R.y + 3 }, 1) + KD.note({ x: R.x + 44, y: R.y + 8 }, 'incision', { size: 8 });
      out += KD.disc(R, 3.5, 'var(--mass)') + KD.label({ x: R.x + 6, y: R.y - 6 }, 'RCM', { size: 9, fill: 'var(--red)' });
      if (on) out += KD.spring(st.s1.a, st.s1.b, 7, 3) + KD.spring(st.s2.a, st.s2.b, 7, 3) + KD.pin(st.s1.a) + KD.pin(st.s1.b) + KD.pin(st.s2.a) + KD.pin(st.s2.b);
      out += KD.joint(O, 4.5) + KD.mass(E, 6, '');
      g.innerHTML = out;
      return st;
    }
    var W = 260, H = 70, lo, hi, p1min = 0.15, p1max = 0.95, p2min = -0.35, p2max = 0.45;
    function rechart() {
      var pts = []; for (var i = 0; i <= 40; i++) { var u = i / 40; pts.push(state(p1min + (p1max - p1min) * u, p2min + (p2max - p2min) * (0.5 + 0.5 * Math.sin(u * 6.28)))); }
      lo = Infinity; hi = -Infinity; pts.forEach(function (s) { lo = Math.min(lo, s.Ug, s.Us); hi = Math.max(hi, s.Ug + s.Us, s.Ug); }); var p = (hi - lo) * 0.1 + 1; lo -= p; hi += p;
      function path(fn) { return pts.map(function (s, i) { return (i ? 'L' : 'M') + f(W * i / 40) + ',' + f(H - (fn(s) - lo) / (hi - lo) * H); }).join(''); }
      el.cUg.setAttribute('d', path(function (s) { return s.Ug; })); el.cUs.setAttribute('d', path(function (s) { return s.Us; })); el.cUt.setAttribute('d', path(function (s) { return s.Ug + s.Us; }));
      el.cUs.style.display = on ? '' : 'none'; el.lblT.textContent = on ? 'total' : 'total = gravity';
    }
    var onIn = document.getElementById('lpOn'); if (onIn) onIn.addEventListener('change', function () { on = onIn.checked; rechart(); });
    rechart();
    var t0 = null;
    loop(function (t) {
      var s = t === undefined ? 0 : ((t0 === null ? (t0 = t) : t0), (t - t0) / 1000), T = s % 14, phase, u, p1, p2, tilt = 0, ins = 0;
      if (T < 7) { phase = 0; u = T / 7; p1 = p1min + (p1max - p1min) * u; p2 = p2min + (p2max - p2min) * (0.5 + 0.5 * Math.sin(u * 6.28)); }
      else { phase = 1; u = (T - 7) / 7; p1 = p1max; p2 = p2min + (p2max - p2min) * 0.5; tilt = 0.5 * Math.sin(u * 6.28); ins = 12 * (1 - Math.cos(u * 12.56)) / 2; }
      draw(p1, p2, tilt, ins, phase);
      el.cursor.setAttribute('x1', f(W * (phase ? 1 : u))); el.cursor.setAttribute('x2', f(W * (phase ? 1 : u)));
      if (phaseOut) phaseOut.value = phase ? 'orientating: RCM fixed at the incision' : 'positioning: the arm carries the RCM point';
      if (msg) msg.textContent = !on ? 'Springs off: the arm sags under its own weight.' : phase ? 'The orientating mechanism tilts and inserts the laparoscope about the fixed RCM point; the arm does not move.' : 'The double parallelogram keeps its end link upright, so the RCM point moves without turning; one spring per loop keeps the total energy flat.';
    });
  })();

  // ---------------------------------------------------------------------------------------------
  // Kuo and Dai, ASME J. Med. Devices 6 (2012) 021008: a fully decoupled 4-DOF remote-centre-of-motion
  // parallel manipulator. The surgical tool pivots about the RCM point on the abdominal wall; its four
  // motions are two projective angles of the tool axis w (on the xz- and yz-planes), the spin about w,
  // and the insertion depth, and each is driven by one actuator of the manipulator (a motion constraint
  // leg RRRP with its three R axes meeting at the RCM, and auxiliary RRRUR legs).
  // ---------------------------------------------------------------------------------------------
  (function () {
    var svg = document.getElementById('rcm4');
    if (!svg) return;
    var P = ISO.make(170, 190, 1), g = svg.querySelector('#qBody');
    var ins = ['q1', 'q2', 'q3', 'q4'].map(function (id) { return document.getElementById(id); }), autoIn = document.getElementById('qAuto'), msg = document.getElementById('qMsg');
    var q = [15, -10, 0, 40], auto = true, t0 = null;
    function draw(q) {
      var ra = q[0] * Math.PI / 180, rb = q[1] * Math.PI / 180, spin = q[2] * Math.PI / 180, dep = q[3];
      var w = ISO.norm([Math.tan(ra), Math.tan(rb), 1]), out = '';
      // abdominal wall as an ellipse-ish quad around the RCM at the origin; the body below
      out += ISO.poly(P, [[-70, -70, 0], [70, -70, 0], [70, 70, 0], [-70, 70, 0]], 'fill="var(--mag-rotor)" stroke="var(--fg)" stroke-width="1" opacity=".35"');
      out += ISO.axes(P, 80);
      // projections of w on the xz and yz planes with their angles
      var W = ISO.mul(w, 95), pxz = [W[0], 0, W[2]], pyz = [0, W[1], W[2]];
      out += ISO.seg(P, [0, 0, 0], pxz, 'stroke="var(--fg)" stroke-width="1" stroke-dasharray="4 3"') + ISO.seg(P, [0, 0, 0], pyz, 'stroke="var(--fg)" stroke-width="1" stroke-dasharray="4 3"');
      out += ISO.seg(P, W, pxz, 'stroke="var(--fg-2)" stroke-width=".8" stroke-dasharray="2 3"') + ISO.seg(P, W, pyz, 'stroke="var(--fg-2)" stroke-width=".8" stroke-dasharray="2 3"');
      function arc(plane, ang) { var d = '', r = 36; for (var i = 0; i <= 14; i++) { var t = ang * i / 14, p = plane === 'xz' ? [r * Math.sin(t), 0, r * Math.cos(t)] : [0, r * Math.sin(t), r * Math.cos(t)]; d += (i ? 'L' : 'M') + KD.pt(P(p)); } return '<path d="' + d + '" fill="none" stroke="var(--red)" stroke-width="1.3"/>'; }
      out += arc('xz', ra) + arc('yz', rb);
      // the tool: a rod through the RCM, inserted by dep below the wall; the holder E above
      var tip = ISO.mul(w, -dep), top = ISO.mul(w, 110 - dep * 0.3);
      out += ISO.seg(P, tip, top, 'stroke="var(--fg)" stroke-width="3.5" stroke-linecap="round"');
      // spin marker: a short flag on the tool turned by spin about w
      var e1 = ISO.norm(ISO.cross(w, [0, 0, 1].every(function (v, i) { return v === w[i]; }) ? [1, 0, 0] : [0, 0, 1])), e2 = ISO.cross(w, e1);
      var fl = ISO.add(ISO.mul(e1, Math.cos(spin) * 16), ISO.mul(e2, Math.sin(spin) * 16)), base = ISO.mul(w, 70);
      out += ISO.seg(P, base, ISO.add(base, fl), 'stroke="var(--spring)" stroke-width="2.5"') + ISO.poly(P, [ISO.add(base, fl), ISO.add(base, fl, 0.6), ISO.add(ISO.add(base, fl, 0.8), w, 8)], 'fill="var(--spring)"');
      out += KD.disc(P([0, 0, 0]), 3.5, 'var(--mass)') + KD.label({ x: P([0, 0, 0]).x + 7, y: P([0, 0, 0]).y + 12 }, 'RCM', { size: 9, fill: 'var(--red)' });
      var E = P(top); out += '<rect x="' + f(E.x - 7) + '" y="' + f(E.y - 7) + '" width="14" height="14" fill="var(--card)" stroke="var(--fg)" stroke-width="1.4"/>' + KD.label({ x: E.x + 10, y: E.y - 4 }, 'E', { size: 11 }) + KD.label({ x: P(W).x + 10, y: P(W).y + 12 }, 'w', { size: 11, fill: 'var(--fg-2)' });
      out += KD.label({ x: P(tip).x + 8, y: P(tip).y + 4 }, 'd', { size: 11, sub: 'w' });
      g.innerHTML = out;
      if (msg) msg.textContent = 'θxz = ' + q[0].toFixed(0) + '°, θyz = ' + q[1].toFixed(0) + '°, spin ' + q[2].toFixed(0) + '°, insertion ' + q[3].toFixed(0) + ': one actuator each, nothing else moves.';
    }
    function fromUI() { auto = autoIn ? autoIn.checked : false; if (!auto) { q = ins.map(function (i) { return parseFloat(i.value); }); draw(q); } }
    ins.forEach(function (i) { if (i) i.addEventListener('input', function () { if (autoIn) autoIn.checked = false; fromUI(); }); });
    if (autoIn) autoIn.addEventListener('change', fromUI);
    loop(function (t) {
      if (auto && t !== undefined) {
        if (t0 === null) t0 = t; var s = (t - t0) / 1000, k = Math.floor(s / 5) % 4, u = (s % 5) / 5;
        q = [15, -10, 0, 40]; var amp = [30, 30, 180, 40][k]; q[k] = (k === 3 ? 40 : k === 2 ? 0 : q[k]) + amp * Math.sin(u * 2 * Math.PI) * (k === 3 ? 0.5 : 1);
        ins.forEach(function (i, j) { if (i) i.value = q[j].toFixed(0); }); draw(q);
      } else if (t === undefined) draw(q);
    });
  })();
})();
