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
      el.cUs.style.display = on ? '' : 'none'; el.lblT.textContent = 'total';
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
      el.cUs.style.display = on ? '' : 'none'; el.lblT.textContent = 'total';
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

  // ---------------------------------------------------------------------------------------------
  // Kuo, Dai and Dasgupta, Int. J. Med. Robot. Comput. Assist. Surg. 8 (2012) 127-145: an overview of
  // kinematic design for minimally invasive surgical robots. (1) The eight RCM mechanism types of the
  // paper's Fig. 11, each with its instrument swinging about the fixed RCM; the line below gives the type's
  // entries in Table 4 and sample robots from Table 3. (2) Task-oriented decouplability: two revolutes in
  // series (Type III, as in the double-parallelogram robot of Fig. 5, where Ptheta_x = f(RX) but
  // Ptheta_y = f(RX, RY)) against a fully decoupled pair (Type V).
  // ---------------------------------------------------------------------------------------------
  (function () {
    var svg = document.getElementById('rcm8');
    if (!svg) return;
    var g = svg.querySelector('#r8Body'), msg = document.getElementById('r8Msg'), autoIn = document.getElementById('r8Auto');
    function Q(x, y) { return { x: x, y: y }; }
    var INFO = [
      ['Isocenter', '2R and 3R, and with the insertion also 2R1T and 3R1T', 'none of Types I to V', 'no', 'Naviot, UT-LAP; CLEM with flexible straps'],
      ['Circular tracking arc', '2R and 3R', 'Type II; I and III with extra actuators', 'yes', 'Probot, EndoBot, FIPS Endoarm, ViKY'],
      ['Parallelogram', '2R; 3R with an extra actuator', 'Type II; I and III with extra actuators', 'yes', 'da Vinci, LARS, ARTEMIS, Black Falcon'],
      ['Synchronous belt', '2R; 3R with an extra actuator', 'Type II; I and III with extra actuators', 'yes', 'PAKY-RCM, AcuBot, Steady-Hand'],
      ['Spherical linkage', '2R and 3R', 'open chain: Type II, and I and III with extra actuators', 'yes', 'RAVEN, MC2E'],
      ['Gimbal', '2R and 3R', 'Type II; I and III with extra actuators', 'no', 'none in the paper’s table'],
      ['Parallel wrist', '2R and 3R', 'Types II and IV; I, III and V with extra actuators', 'yes', 'MHU'],
      ['Gear train', '2R and 3R', 'Type II; I and III with extra actuators', 'yes', 'CoBRASurge']
    ];
    var red = function (R) { return KD.disc(R, 4, 'var(--mass)') + KD.label({ x: R.x + 8, y: R.y + 15 }, 'RCM', { size: 10, fill: 'var(--red)' }); };
    var tool = function (R, u, up, down) { return KD.link(Q(R.x + u.x * up, R.y + u.y * up), Q(R.x - u.x * down, R.y - u.y * down), 3.2); };
    var axis = function (a, b) { return KD.line(a, b, 'stroke="var(--fg-2)" stroke-width="1" stroke-dasharray="8 3 2 3"'); };
    var tilt = function (s) { var al = (12 + 28 * (0.5 - 0.5 * Math.cos(0.8 * s))) * Math.PI / 180; return Q(Math.sin(al), -Math.cos(al)); };
    var tool3 = function (P, w, up, down) { return ISO.seg(P, ISO.mul(w, -down), ISO.mul(w, up), 'stroke="var(--fg)" stroke-width="3.2" stroke-linecap="round"'); };
    var skin = function (P, h) { return ISO.poly(P, [[-h, -h, 0], [h, -h, 0], [h, h, 0], [-h, h, 0]], 'fill="var(--mag-rotor)" stroke="var(--fg-2)" stroke-width=".8" opacity=".35"'); };
    var circ3 = function (P, c, e1, e2, rad, w) {
      var d = '';
      for (var i = 0; i <= 48; i++) { var t = 2 * Math.PI * i / 48; d += (i ? 'L' : 'M') + KD.pt(P(ISO.add(ISO.add(c, e1, rad * Math.cos(t)), e2, rad * Math.sin(t)))); }
      return '<path d="' + d + 'Z" fill="none" stroke="var(--fg)" stroke-width="' + w + '"/>';
    };
    var arcS = function (P, u, v, rad, w) {   // a link drawn along the sphere of radius rad about the RCM, from direction u to v
      var d = '';
      for (var i = 0; i <= 16; i++) { var k = i / 16; d += (i ? 'L' : 'M') + KD.pt(P(ISO.mul(ISO.norm(ISO.add(ISO.mul(u, 1 - k), v, k)), rad))); }
      return '<path d="' + d + '" fill="none" stroke="var(--fg)" stroke-width="' + (w || 3) + '" stroke-linecap="round"/>';
    };
    var note = function (p, s) { return KD.note(p, s, { size: 10, fill: 'var(--fg-2)' }); };

    var draw = [
      // isocenter: the joint sits at the point itself
      function (s) {
        var R = Q(205, 150), a = 0.55 * Math.sin(0.8 * s), u = Q(Math.sin(a), -Math.cos(a)), G = Q(70, 150);
        return KD.ground(G, { w: 16 }) + KD.link(G, Q(R.x - 17, R.y), 2.8) + KD.joint(G, 4.5) +
               '<circle cx="' + R.x + '" cy="' + R.y + '" r="17" fill="var(--card)" stroke="var(--fg)" stroke-width="1.8"/>' +
               tool(R, u, 120, 55) + red(R) + note(Q(232, 214), 'the joint is at the point');
      },
      // circular tracking arc: a carriage runs on an arc centred at the RCM; the arc turns about the dash-dot axis
      function (s) {
        var R = Q(200, 190), Ra = 105, be = 0.55 * Math.sin(0.45 * s + 1), cb = Math.cos(be), ps = 0.7 * Math.sin(0.7 * s), d = '';
        for (var i = 0; i <= 40; i++) { var ph = Math.PI * i / 40; d += (i ? 'L' : 'M') + KD.f(R.x + Ra * Math.cos(ph)) + ',' + KD.f(R.y - Ra * Math.sin(ph) * cb); }
        var car = Q(R.x + Ra * Math.sin(ps), R.y - Ra * Math.cos(ps) * cb), tg = Math.atan2(Ra * Math.sin(ps) * cb, Ra * Math.cos(ps)) * 180 / Math.PI;
        var G = Q(48, R.y), u = KD.unit(R, car);
        return axis(Q(36, R.y), Q(326, R.y)) + KD.ground(G, { w: 14 }) + KD.link(G, Q(R.x - Ra, R.y), 2.6) + KD.joint(G, 4) +
               '<path d="' + d + '" fill="none" stroke="var(--fg)" stroke-width="3.4"/>' + KD.joint(Q(R.x - Ra, R.y), 4) + KD.joint(Q(R.x + Ra, R.y), 4) +
               tool(R, Q(u.x, u.y), u.L + 14, 45) +
               '<rect x="-9" y="-5" width="18" height="10" fill="var(--card)" stroke="var(--fg)" stroke-width="1.4" transform="translate(' + KD.f(car.x) + ',' + KD.f(car.y) + ') rotate(' + KD.f(tg) + ')"/>' + red(R);
      },
      // double parallelogram: the instrument stays parallel to the first crank
      function (s) {
        var R = Q(252, 192), u = tilt(s), L = 105;
        var at = function (p, k) { return Q(p.x + u.x * k, p.y + u.y * k); };
        var P1 = Q(R.x - 150, R.y), Pm = Q(R.x - 75, R.y), TL = at(P1, L), TM = at(Pm, L), TR = at(R, L), ML = at(Pm, 0.55 * L), MR = at(R, 0.55 * L);
        return axis(Q(36, R.y), Q(330, R.y)) + KD.ground(P1, { w: 14 }) + KD.ground(Pm, { w: 14 }) +
               KD.link(P1, TL) + KD.link(Pm, TM) + KD.link(TL, TR) + KD.link(ML, MR) + tool(R, u, L + 16, 45) +
               [P1, Pm, TL, TM, TR, ML, MR].map(function (p) { return KD.joint(p, 3.6); }).join('') + red(R);
      },
      // synchronous belts: the bar BC keeps its direction, and the pulley at C turns the instrument with the arm AB
      function (s) {
        var R = Q(252, 192), u = tilt(s), L = 100, r = 11, A = Q(R.x - 130, R.y), B = Q(A.x + u.x * L, A.y + u.y * L), C = Q(R.x + u.x * L, R.y + u.y * L);
        var belt = function (p, q) { var v = KD.unit(p, q), n = Q(-v.y * r, v.x * r); return KD.line(Q(p.x + n.x, p.y + n.y), Q(q.x + n.x, q.y + n.y), 'stroke="var(--fg-2)" stroke-width="1.4"') + KD.line(Q(p.x - n.x, p.y - n.y), Q(q.x - n.x, q.y - n.y), 'stroke="var(--fg-2)" stroke-width="1.4"'); };
        var pulley = function (p) { return '<circle cx="' + KD.f(p.x) + '" cy="' + KD.f(p.y) + '" r="' + r + '" fill="var(--link-fill)" stroke="var(--fg)" stroke-width="1.4"/>'; };
        return axis(Q(36, R.y), Q(330, R.y)) + KD.ground(A, { w: 24 }) + belt(A, B) + belt(B, C) + pulley(A) + pulley(B) + pulley(C) +
               KD.link(A, B) + KD.link(B, C) + tool(R, u, L + 16, 45) + KD.joint(A, 3.6) + KD.joint(B, 3.6) + KD.joint(C, 3.6) + red(R) +
               note(Q(A.x - 22, A.y + 34), 'fixed pulley');
      },
      // spherical linkage (open chain): curved links whose joint axes all pass through the RCM
      function (s) {
        var P = ISO.make(185, 160, 1), r = 100;
        var a1 = ISO.norm([-0.7, 0.2, 0.68]), a20 = ISO.norm([0.05, 0.75, 0.66]), w0 = ISO.norm([0.12, 0.08, 1]);
        var R1 = ISO.rotvec(ISO.mul(a1, 0.55 * Math.sin(0.6 * s))), R2 = ISO.rotvec(ISO.mul(a20, 0.5 * Math.sin(0.85 * s + 1)));
        var a2 = ISO.apply(R1, a20), w = ISO.apply(R1, ISO.apply(R2, w0)), J1 = ISO.mul(a1, r), J2 = ISO.mul(a2, r), H = ISO.mul(w, r), o = [0, 0, 0];
        var dd = 'stroke="var(--fg-2)" stroke-width="1" stroke-dasharray="8 3 2 3"';
        return skin(P, 60) + ISO.seg(P, o, ISO.mul(a1, r + 22), dd) + ISO.seg(P, o, ISO.mul(a2, r + 22), dd) +
               KD.ground(P(ISO.mul(a1, r + 10)), { w: 14, up: true }) + arcS(P, a1, a2, r) + arcS(P, a2, w, r) + tool3(P, w, r + 40, 45) +
               KD.joint(P(J1), 4.5) + KD.joint(P(J2), 4.5) + KD.joint(P(H), 3.6) + red(P(o)) + note(Q(214, 238), 'joint axes meet at the point');
      },
      // gimbal: two rings on crossed axes through the RCM
      function (s) {
        var P = ISO.make(175, 150, 1.05), o = [0, 0, 0];
        var Rx = ISO.rotvec([0.45 * Math.sin(0.6 * s), 0, 0]), y1 = ISO.apply(Rx, [0, 1, 0]), z1 = ISO.apply(Rx, [0, 0, 1]);
        var Ry = ISO.rotvec(ISO.mul(y1, 0.45 * Math.sin(0.8 * s + 1.3))), x2 = ISO.apply(Ry, [1, 0, 0]), w = ISO.apply(Ry, z1);
        var out = skin(P, 50) + circ3(P, o, [1, 0, 0], y1, 62, 3) + circ3(P, o, x2, y1, 46, 2.6);
        [1, -1].forEach(function (k) {
          out += ISO.seg(P, [62 * k, 0, 0], [84 * k, 0, 0], 'stroke="var(--fg)" stroke-width="2.6"') + KD.ground(P([84 * k, 0, 0]), { w: 14 }) + KD.joint(P([84 * k, 0, 0]), 4) +
                 ISO.seg(P, ISO.mul(y1, 46 * k), ISO.mul(y1, 62 * k), 'stroke="var(--fg)" stroke-width="2.6"') + KD.joint(P(ISO.mul(y1, 62 * k)), 3.6);
        });
        return out + tool3(P, w, 125, 45) + red(P(o)) + note(Q(214, 238), 'the rings surround the point');
      },
      // parallel wrist (after the paper's sketch): the end-effector pyramid turns about its apex, the RCM, on
      // three legs whose prismatic joints change length
      function (s) {
        var P = ISO.make(175, 62, 1), o = [0, 0, 0];
        var Rm = ISO.rotvec([0.32 * Math.sin(0.7 * s), 0.28 * Math.sin(0.9 * s + 1), 0.3 * Math.sin(0.5 * s + 2)]);
        var b = [0, 1, 2].map(function (i) { var t = Math.PI / 2 + 2 * Math.PI * i / 3; return [80 * Math.cos(t), 80 * Math.sin(t), -10]; });
        var e = [0, 1, 2].map(function (i) { var t = Math.PI / 2 + 2 * Math.PI * i / 3 + Math.PI / 3; return ISO.apply(Rm, [45 * Math.cos(t), 45 * Math.sin(t), -110]); });
        var ax = ISO.apply(Rm, [0, 0, -1]), out = ISO.poly(P, b, 'fill="var(--red)" fill-opacity=".14" stroke="var(--red)" stroke-width="1.2"');
        out += b.map(function (p) { return ISO.seg(P, o, p, 'stroke="var(--red)" stroke-width="1.2"'); }).join('');
        out += ISO.poly(P, e, 'fill="var(--accent)" fill-opacity=".14" stroke="var(--accent)" stroke-width="1.4"') + e.map(function (p) { return ISO.seg(P, o, p, 'stroke="var(--accent)" stroke-width="1.4"'); }).join('');
        for (var i = 0; i < 3; i++) {
          var m = ISO.add(b[i], ISO.add(e[(i + 1) % 3], b[i], -1), 0.5);
          out += ISO.seg(P, b[i], m, 'stroke="var(--fg)" stroke-width="4" stroke-linecap="round"') + ISO.seg(P, b[i], e[(i + 1) % 3], 'stroke="var(--fg)" stroke-width="1.8"') +
                 KD.joint(P(b[i]), 3.6) + KD.joint(P(e[(i + 1) % 3]), 3.6);
        }
        return out + ISO.seg(P, o, ISO.mul(ax, 112), 'stroke="var(--fg-2)" stroke-width="1" stroke-dasharray="4 3"') + tool3(P, ax, 165, -112) + red(P(o)) + note(Q(214, 238), 'apex fixed; legs change length');
      },
      // gear train: coaxial inputs drive, through bevel gears, an arm and an end-effector whose axes meet at the RCM
      function (s) {
        var P = ISO.make(190, 160, 1), o = [0, 0, 0], a = ISO.norm([-0.25, 1, 0.42]);
        var n0 = ISO.norm(ISO.cross(a, [1, 0, 0])), R1 = ISO.rotvec(ISO.mul(a, 0.6 * Math.sin(0.6 * s)));
        var J1 = ISO.mul(a, 95), J2 = ISO.add(J1, ISO.apply(R1, n0), 55), bdir = ISO.norm(J2), rad = Math.hypot(J2[0], J2[1], J2[2]);
        var w0 = ISO.apply(R1, ISO.norm([0.1, -0.3, 1])), w = ISO.apply(ISO.rotvec(ISO.mul(bdir, 0.5 * Math.sin(0.8 * s + 1))), w0);
        var out = skin(P, 55) + ISO.seg(P, o, ISO.mul(a, 150), 'stroke="var(--fg-2)" stroke-width="1" stroke-dasharray="8 3 2 3"') +
                  ISO.seg(P, o, ISO.mul(bdir, rad + 18), 'stroke="var(--fg-2)" stroke-width="1" stroke-dasharray="8 3 2 3"');
        out += ISO.seg(P, ISO.mul(a, 140), ISO.mul(a, 115), 'stroke="var(--ground)" stroke-width="11"') + ISO.seg(P, ISO.mul(a, 140), ISO.mul(a, 105), 'stroke="var(--link-fill)" stroke-width="7"') +
               ISO.seg(P, ISO.mul(a, 140), J1, 'stroke="var(--fg)" stroke-width="2.6"');
        out += ISO.seg(P, J1, J2, 'stroke="var(--fg)" stroke-width="3"') + arcS(P, bdir, w, rad) + tool3(P, w, rad + 40, 45) +
               KD.joint(P(J1), 5) + KD.joint(P(J2), 5) + KD.joint(P(ISO.mul(w, rad)), 3.6) + red(P(o)) + note(Q(214, 238), 'three coaxial inputs');
        return out;
      }
    ];

    var k = 2, auto = true, t0 = null, last = -1;
    var inputs = Array.prototype.slice.call(document.querySelectorAll('input[name=r8]'));
    function show(i) {
      k = i; inputs.forEach(function (r) { r.checked = +r.value === i; });
      var d = INFO[i];
      if (msg) msg.innerHTML = '<strong>' + d[0] + '.</strong> Rotations without extra actuators: ' + d[1] + '. Decoupling: ' + d[2] + '. Extracorporeal workspace: ' + d[3] + '. Robots: ' + d[4] + '.';
    }
    radios('r8', function (v) { auto = false; if (autoIn) autoIn.checked = false; show(+v); });
    if (autoIn) autoIn.addEventListener('change', function () { auto = autoIn.checked; t0 = null; });
    show(k);
    loop(function (t) {
      var s = t === undefined ? 0 : t / 1000;
      if (auto && t !== undefined) { if (t0 === null) t0 = s - 6 * k; var j = Math.floor((s - t0) / 6) % 8; if (j !== last) { last = j; show(j); } }
      g.innerHTML = draw[k](s);
    });
  })();

  (function () {
    var svg = document.getElementById('rcmc');
    if (!svg) return;
    var P = ISO.make(165, 178, 1), g = svg.querySelector('#cBody');
    var rx = document.getElementById('cRX'), ry = document.getElementById('cRY'), autoIn = document.getElementById('cAuto'), msg = document.getElementById('cMsg');
    var mode = 'III', RX = 0, RY = 20, auto = true, t0 = null, D = 180 / Math.PI;
    function arc(plane, ang, r) { var d = ''; for (var i = 0; i <= 14; i++) { var t = ang * i / 14, p = plane === 'xz' ? [r * Math.sin(t), 0, r * Math.cos(t)] : [0, r * Math.sin(t), r * Math.cos(t)]; d += (i ? 'L' : 'M') + KD.pt(P(p)); } return '<path d="' + d + '" fill="none" stroke="var(--red)" stroke-width="1.4"/>'; }
    function draw() {
      var a = RX / D, b = RY / D, w = mode === 'III' ? [Math.sin(b), Math.sin(a) * Math.cos(b), Math.cos(a) * Math.cos(b)] : ISO.norm([Math.tan(b), Math.tan(a), 1]);
      var thx = Math.atan2(w[1], w[2]), thy = Math.atan2(w[0], w[2]), o = [0, 0, 0], dd = 'stroke="var(--accent)" stroke-width="1.2" stroke-dasharray="8 3 2 3"';
      var out = ISO.poly(P, [[-75, -75, 0], [75, -75, 0], [75, 75, 0], [-75, 75, 0]], 'fill="var(--mag-rotor)" stroke="var(--fg)" stroke-width="1" opacity=".35"') + ISO.axes(P, 82);
      if (mode === 'III') {
        var a2 = [0, Math.cos(a), -Math.sin(a)];
        out += ISO.seg(P, [-100, 0, 0], [100, 0, 0], dd) + ISO.seg(P, ISO.mul(a2, -100), ISO.mul(a2, 100), dd) +
               KD.label({ x: P([-100, 0, 0]).x - 4, y: P([-100, 0, 0]).y - 6 }, 'R', { size: 11, sub: 'X', fill: 'var(--accent)' }) +
               KD.label({ x: P(ISO.mul(a2, -100)).x - 18, y: P(ISO.mul(a2, -100)).y - 6 }, 'R', { size: 11, sub: 'Y', fill: 'var(--accent)' });
      }
      var W = ISO.mul(w, 100), pxz = [W[0], 0, W[2]], pyz = [0, W[1], W[2]];
      out += ISO.seg(P, o, pxz, 'stroke="var(--fg)" stroke-width="1" stroke-dasharray="4 3"') + ISO.seg(P, o, pyz, 'stroke="var(--fg)" stroke-width="1" stroke-dasharray="4 3"') +
             ISO.seg(P, W, pxz, 'stroke="var(--fg-2)" stroke-width=".8" stroke-dasharray="2 3"') + ISO.seg(P, W, pyz, 'stroke="var(--fg-2)" stroke-width=".8" stroke-dasharray="2 3"');
      out += arc('yz', thx, 40) + arc('xz', thy, 40);
      var lx = P([0, 46 * Math.sin(thx / 2), 46 * Math.cos(thx / 2)]), ly = P([46 * Math.sin(thy / 2), 0, 46 * Math.cos(thy / 2)]);
      out += KD.label({ x: lx.x + 4, y: lx.y }, 'θ', { size: 11, sub: 'x', fill: 'var(--red)' }) + KD.label({ x: ly.x - 16, y: ly.y }, 'θ', { size: 11, sub: 'y', fill: 'var(--red)' });
      out += ISO.seg(P, ISO.mul(w, -45), ISO.mul(w, 120), 'stroke="var(--fg)" stroke-width="3.5" stroke-linecap="round"') + KD.disc(P(o), 3.8, 'var(--mass)');
      g.innerHTML = out;
      var fx = (thx * D).toFixed(1), fy = (thy * D).toFixed(1);
      if (msg) msg.textContent = mode === 'III'
        ? 'RX = ' + RX + '°, RY = ' + RY + '°:  θx = ' + fx + '°, θy = ' + fy + '°. ' + (Math.abs(thy * D - RY) > 0.4 ? 'θy differs from RY because the second axis is carried by the first: the two tilts are coupled.' : 'With RX at zero the second axis is in its home position and θy equals RY.')
        : 'RX = ' + RX + '°, RY = ' + RY + '°:  θx = ' + fx + '°, θy = ' + fy + '°. Each angle follows its own actuator only.';
    }
    radios('cmode', function (v) { mode = v; draw(); });
    function fromUI() { RX = +rx.value; RY = +ry.value; draw(); }
    [rx, ry].forEach(function (i) { if (i) i.addEventListener('input', function () { if (i === rx && autoIn) { autoIn.checked = false; auto = false; } fromUI(); }); });
    if (autoIn) autoIn.addEventListener('change', function () { auto = autoIn.checked; t0 = null; });
    fromUI();
    loop(function (t) {
      if (auto && t !== undefined) {
        if (t0 === null) t0 = t;
        RX = Math.round(38 * Math.sin((t - t0) / 1000 * 0.7)); RY = +ry.value; if (rx) rx.value = RX; draw();
      }
    });
  })();
})();
