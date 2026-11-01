// Animations for the gravity-balancing paper pages (papers/*.html).
// Each block looks for its own root SVG and does nothing on pages that lack it.
// The four-bar animation of Kuo (2025) lives in site.js and is shared with the home page.

(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function f(v) { return (+v).toFixed(1); }
  function zigzag(a, b, n, w) {
    var dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, px = -uy, py = ux;
    var pts = [f(a.x) + ',' + f(a.y)], lead = Math.min(6, L * 0.12);
    pts.push(f(a.x + ux * lead) + ',' + f(a.y + uy * lead));
    var span = L - 2 * lead;
    for (var i = 1; i < n; i++) {
      var t = lead + span * i / n, s = (i % 2 ? 1 : -1) * w;
      pts.push(f(a.x + ux * t + px * s) + ',' + f(a.y + uy * t + py * s));
    }
    pts.push(f(b.x - ux * lead) + ',' + f(b.y - uy * lead));
    pts.push(f(b.x) + ',' + f(b.y));
    return pts.join(' ');
  }
  function line(a, b) { return '<line x1="' + f(a.x) + '" y1="' + f(a.y) + '" x2="' + f(b.x) + '" y2="' + f(b.y) + '"/>'; }
  function dot(p, r, fill) { return '<circle cx="' + f(p.x) + '" cy="' + f(p.y) + '" r="' + r + '" fill="' + (fill || 'var(--card)') + '" stroke="var(--fg)" stroke-width="1.6"/>'; }
  function massDisc(p, r) {
    return '<circle cx="' + f(p.x) + '" cy="' + f(p.y) + '" r="' + r + '" fill="var(--card)" stroke="var(--fg)" stroke-width="1.6"/>' +
           '<circle cx="' + f(p.x) + '" cy="' + f(p.y) + '" r="' + r + '" fill="url(#masshatch)" stroke="none" color="var(--fg)"/>';
  }
  // A chart box W x H whose x axis runs over [x0, x1]; fn(x) -> value; y range [lo, hi]
  function chartPath(W, H, x0, x1, lo, hi, fn, N) {
    N = N || 181;
    var d = '';
    for (var i = 0; i < N; i++) {
      var x = x0 + (x1 - x0) * i / (N - 1), y = H - (fn(x) - lo) / (hi - lo) * H;
      d += (i ? 'L' : 'M') + f(W * i / (N - 1)) + ',' + f(Math.max(-20, Math.min(H + 20, y)));
    }
    return d;
  }
  function loop(tick) {
    tick();
    if (!reduce) requestAnimationFrame(function step(t) { tick(t); requestAnimationFrame(step); });
  }

  // ---------------------------------------------------------------------------------------------
  // Kuo and Wu, Mech. Mach. Theory 181 (2023) 105229: perfect static balancing with an inverted
  // Cardan gear and a plain (non-zero-free-length) linear spring.
  // Inner gear (pitch radius r) is pivoted to the ground at O and carries the arm; the ring gear
  // (pitch radius 2r) is pivoted to the ground at Or, a distance r below O, and is free to turn.
  // The gear pair makes the ring turn by theta/2 when the arm turns by theta. Point A on the inner
  // gear's pitch circle then moves along a fixed diameter PQ of the ring, a distance 2r sin(theta/2)
  // from Or. A spring laid along PQ, at its free length when A is at Or (theta = 0), stores
  //   Us = 1/2 k (2r sin(theta/2))^2 = k r^2 (1 - cos theta),
  // which cancels Ug = m g L cos theta exactly when k = m g L / r^2 (the paper's Eq. 6).
  // Two compression springs, one each side of A, cover both directions of swing (the paper's Fig. 7).
  // ---------------------------------------------------------------------------------------------
  (function () {
    var svg = document.getElementById('cardan');
    if (!svg) return;
    var r = 28, R = 2 * r, L = 82, m = 1, g = 1, k = m * g * L / (r * r);
    var AMP = 120 * Math.PI / 180;                       // swing amplitude
    var O = { x: 170, y: 120 }, Or = { x: O.x, y: O.y + r };   // screen coordinates (y down)
    var $ = function (id) { return svg.querySelector('#' + id); };
    var el = { ring: $('cRing'), inner: $('cInner'), arm: $('cArm'), springs: $('cSprings'), lineG: $('cLine'),
               cUg: $('cUg'), cUs: $('cUs'), cUt: $('cUt'), cursor: $('cCursor'), lblT: $('cLblT') };
    var on = true, showLine = true;

    // world: angles clockwise from the upward vertical, as seen on screen
    function state(th) {
      var mass = { x: O.x + L * Math.sin(th), y: O.y - L * Math.cos(th) };
      var A = { x: O.x - r * Math.sin(th), y: O.y + r * Math.cos(th) };       // opposite the arm
      var dir = { x: -Math.cos(th / 2), y: -Math.sin(th / 2) };               // the diameter PQ, turning with the ring
      var Q = { x: Or.x + R * dir.x, y: Or.y + R * dir.y }, P = { x: Or.x - R * dir.x, y: Or.y - R * dir.y };
      var Ug = m * g * (mass.y - O.y) * -1;                                   // height above O
      var s = 2 * r * Math.sin(th / 2);                                       // A's offset from Or along PQ (signed)
      var Us = on ? 0.5 * k * s * s : 0;
      return { mass: mass, A: A, P: P, Q: Q, dir: dir, s: s, Ug: Ug, Us: Us };
    }

    function spokes(c, rad, th, n) {
      var out = '';
      for (var i = 0; i < n; i++) {
        var a = th + 2 * Math.PI * i / n;
        out += '<line x1="' + f(c.x + 0.35 * rad * Math.sin(a)) + '" y1="' + f(c.y - 0.35 * rad * Math.cos(a)) + '" x2="' + f(c.x + 0.9 * rad * Math.sin(a)) + '" y2="' + f(c.y - 0.9 * rad * Math.cos(a)) + '"/>';
      }
      return out;
    }
    function teeth(c, rad, th, n, inward) {
      var out = '', h = inward ? -3 : 3;
      for (var i = 0; i < n; i++) {
        var a = th + 2 * Math.PI * i / n;
        out += '<line x1="' + f(c.x + rad * Math.sin(a)) + '" y1="' + f(c.y - rad * Math.cos(a)) + '" x2="' + f(c.x + (rad + h) * Math.sin(a)) + '" y2="' + f(c.y - (rad + h) * Math.cos(a)) + '"/>';
      }
      return out;
    }
    function compSpring(from, to, free) {
      // a compression spring seated at `from`, pointing to `to`; it is only as long as the gap, up to its free length
      var dx = to.x - from.x, dy = to.y - from.y, d = Math.hypot(dx, dy), len = Math.min(d, free);
      var end = { x: from.x + dx / d * len, y: from.y + dy / d * len };
      var loaded = d < free - 0.5;
      return '<polyline fill="none" stroke="' + (loaded ? 'var(--accent)' : 'var(--line)') + '" stroke-width="1.6" stroke-linejoin="round" points="' + zigzag(from, end, 11, 3) + '"/>' +
             '<line x1="' + f(end.x - 4 * dy / d) + '" y1="' + f(end.y + 4 * dx / d) + '" x2="' + f(end.x + 4 * dy / d) + '" y2="' + f(end.y - 4 * dx / d) + '" stroke="var(--fg)" stroke-width="1.6"/>';
    }

    function draw(th) {
      var s = state(th);
      el.ring.innerHTML = '<circle cx="' + Or.x + '" cy="' + Or.y + '" r="' + R + '" fill="none" stroke="var(--fg)" stroke-width="2"/>' +
        '<g stroke="var(--fg-2)" stroke-width="1">' + teeth(Or, R, th / 2, 36, true) + '</g>' +
        '<circle cx="' + Or.x + '" cy="' + Or.y + '" r="4.5" fill="var(--card)" stroke="var(--fg)" stroke-width="1.6"/>';
      el.inner.innerHTML = '<circle cx="' + O.x + '" cy="' + O.y + '" r="' + r + '" fill="var(--bg-2)" stroke="var(--fg)" stroke-width="2"/>' +
        '<g stroke="var(--fg-2)" stroke-width="1">' + teeth(O, r, th, 18, false) + spokes(O, r, th, 3) + '</g>';
      el.arm.innerHTML = '<line x1="' + O.x + '" y1="' + O.y + '" x2="' + f(s.mass.x) + '" y2="' + f(s.mass.y) + '" stroke="var(--fg)" stroke-width="3.5" stroke-linecap="round"/>' +
        massDisc(s.mass, 9) + dot(O, 5) +
        '<text x="' + f(s.mass.x + 12) + '" y="' + f(s.mass.y + 4) + '" font-size="11" font-style="italic" fill="var(--fg)">m</text>';
      el.lineG.style.display = showLine ? '' : 'none';
      el.lineG.innerHTML = '<line x1="' + f(s.P.x) + '" y1="' + f(s.P.y) + '" x2="' + f(s.Q.x) + '" y2="' + f(s.Q.y) + '" stroke="var(--red)" stroke-width="1" stroke-dasharray="3 3"/>' +
        '<text x="' + f(s.P.x + 6 * -s.dir.x) + '" y="' + f(s.P.y + 6 * -s.dir.y + 4) + '" font-size="10" font-style="italic" fill="var(--fg-2)" text-anchor="middle">P</text>' +
        '<text x="' + f(s.Q.x + 6 * s.dir.x) + '" y="' + f(s.Q.y + 6 * s.dir.y + 4) + '" font-size="10" font-style="italic" fill="var(--fg-2)" text-anchor="middle">Q</text>';
      el.springs.style.display = on ? '' : 'none';
      el.springs.innerHTML = compSpring(s.Q, s.A, R) + compSpring(s.P, s.A, R) +
        '<circle cx="' + f(s.A.x) + '" cy="' + f(s.A.y) + '" r="4" fill="var(--red)"/>' +
        '<text x="' + f(s.A.x + 7) + '" y="' + f(s.A.y - 6) + '" font-size="10" font-style="italic" fill="var(--fg)">A</text>';
      if (!on) el.inner.innerHTML += '<circle cx="' + f(s.A.x) + '" cy="' + f(s.A.y) + '" r="4" fill="var(--red)"/>';
    }

    // energy chart over the swing
    var W = 260, H = 70, lo, hi;
    (function () { var a = state(0), b = state(AMP); lo = Math.min(a.Ug, b.Ug, a.Us, b.Us); hi = Math.max(a.Ug + a.Us, b.Ug + b.Us); var p = (hi - lo) * .08; lo -= p; hi += p; })();
    function rechart() {
      el.cUg.setAttribute('d', chartPath(W, H, -AMP, AMP, lo, hi, function (t) { return state(t).Ug; }));
      el.cUs.setAttribute('d', chartPath(W, H, -AMP, AMP, lo, hi, function (t) { return state(t).Us; }));
      el.cUt.setAttribute('d', chartPath(W, H, -AMP, AMP, lo, hi, function (t) { var s = state(t); return s.Ug + s.Us; }));
      el.cUs.style.display = on ? '' : 'none';
      el.lblT.textContent = on ? 'total' : 'total = gravity';
    }
    var cOn = document.getElementById('cardanOn'), cLine = document.getElementById('cardanLine'), msg = document.getElementById('cardanMsg');
    if (cOn) cOn.addEventListener('change', function () { on = cOn.checked; rechart(); if (msg) msg.textContent = on ? 'Balanced: the arm rests at any angle.' : 'Not balanced: the weight pulls the arm down.'; });
    if (cLine) cLine.addEventListener('change', function () { showLine = cLine.checked; });
    rechart();
    var t0 = null, th = 0.5;
    loop(function (t) {
      if (t !== undefined) { if (t0 === null) t0 = t; th = AMP * Math.sin((t - t0) / 1000 * 0.5); }
      draw(th);
      var frac = (th + AMP) / (2 * AMP);
      el.cursor.setAttribute('x1', f(W * frac)); el.cursor.setAttribute('x2', f(W * frac));
    });
  })();

  // ---------------------------------------------------------------------------------------------
  // Chu and Kuo, ASME J. Mech. Robot. 9 (2017) 021006: a self-regulated gravity balancer.
  // A parallelogram arm (links 2 and 4) carries a payload platform (link 3). A zero-free-length
  // spring runs from slider A, which moves on a vertical ground rail through the pivot, to slider B,
  // which moves along link 2. With both sliders the same distance s from the pivot,
  //   Ug = M g L cos(theta),  Us = 1/2 k (2 s^2 - 2 s^2 cos theta),
  // so the arm is balanced when k s^2 = M g L (the paper's Eq. 4 with sA = sB).
  // The payload sits on a self-regulator: a weighing mechanism on link 3 that pays out or takes in
  // two cables, one to each slider, so that s follows the payload. The paper lets this happen only
  // in the upright position (theta = 0), where moving the sliders costs no energy; the animation
  // does the same: change the payload and the arm returns upright, re-sets, and swings again.
  // ---------------------------------------------------------------------------------------------
  (function () {
    var svg = document.getElementById('reg');
    if (!svg) return;
    var L = 112, c = 22, g = 1, k = 1 * g * L / (50 * 50);   // k chosen so that s = 50 for M = 1
    var mArm = 0.25;                                          // links and platform, balanced along with the payload
    var AMP = 65 * Math.PI / 180;
    var O = { x: 150, y: 190 };                               // screen, y down
    var $ = function (id) { return svg.querySelector('#' + id); };
    var el = { body: $('rBody'), spring: $('rSpring'), cables: $('rCables'), rail: $('rRail'),
               cUg: $('rUg'), cUs: $('rUs'), cUt: $('rUt'), cursor: $('rCursor'), lblT: $('rLblT') };
    var M = 1, mode = 'auto';                                  // auto | fixed | off
    var sNow = 50, sTarget = 50, sFixed = 50;
    function sFor(load) { return Math.sqrt((load + mArm) * g * L / k); }

    function state(th, s) {
      var u = { x: Math.sin(th), y: -Math.cos(th) };            // along the arm (screen)
      var top = { x: O.x + L * u.x, y: O.y + L * u.y };
      var O2 = { x: O.x + c, y: O.y }, top2 = { x: top.x + c, y: top.y };
      var A = { x: O.x, y: O.y - s }, B = { x: O.x + s * u.x, y: O.y + s * u.y };
      var Ug = (M + mArm) * g * L * Math.cos(th);
      var Us = mode === 'off' ? 0 : 0.5 * k * ((A.x - B.x) * (A.x - B.x) + (A.y - B.y) * (A.y - B.y));
      return { u: u, top: top, O2: O2, top2: top2, A: A, B: B, Ug: Ug, Us: Us };
    }

    function draw(th, s) {
      var st = state(th, s);
      var ph = 12 + 10 * M, pw = 26 + 6 * M;                     // payload box grows with M
      var plate = st.top.y - 6;
      el.rail.innerHTML = '<line x1="' + (O.x - 7) + '" y1="' + (O.y - 85) + '" x2="' + (O.x - 7) + '" y2="' + (O.y - 25) + '" stroke="var(--fg-2)" stroke-width="1.2"/>' +
        '<rect x="' + (O.x - 11) + '" y="' + (O.y - 85) + '" width="4" height="60" fill="url(#hatch)" stroke="none" color="var(--fg-2)" opacity=".7"/>';
      el.body.innerHTML =
        // ground
        '<line x1="' + (O.x - 30) + '" y1="' + (O.y + 8) + '" x2="' + (O.x + 60) + '" y2="' + (O.y + 8) + '" stroke="var(--fg-2)" stroke-width="1.2"/>' +
        '<rect x="' + (O.x - 30) + '" y="' + (O.y + 8) + '" width="90" height="7" fill="url(#hatch)" stroke="none" color="var(--fg-2)" opacity=".6"/>' +
        // parallelogram
        '<g stroke="var(--fg)" stroke-width="3.2" stroke-linecap="round">' + line(O, st.top) + line(st.O2, st.top2) + '</g>' +
        '<line x1="' + f(st.top.x) + '" y1="' + f(st.top.y) + '" x2="' + f(st.top2.x) + '" y2="' + f(st.top2.y) + '" stroke="var(--fg)" stroke-width="3.2" stroke-linecap="round"/>' +
        // platform with self-regulator and payload
        '<rect x="' + f(st.top.x - 8) + '" y="' + f(plate - 16) + '" width="' + (c + 16) + '" height="16" rx="2" fill="var(--bg-2)" stroke="var(--fg)" stroke-width="1.4"/>' +
        '<text x="' + f(st.top.x + c / 2) + '" y="' + f(plate - 5) + '" font-size="7.5" text-anchor="middle" fill="var(--fg-2)">regulator</text>' +
        '<rect x="' + f(st.top.x + c / 2 - pw / 2) + '" y="' + f(plate - 16 - ph) + '" width="' + f(pw) + '" height="' + f(ph) + '" rx="2" fill="var(--card)" stroke="var(--fg)" stroke-width="1.6"/>' +
        '<rect x="' + f(st.top.x + c / 2 - pw / 2) + '" y="' + f(plate - 16 - ph) + '" width="' + f(pw) + '" height="' + f(ph) + '" rx="2" fill="url(#masshatch)" stroke="none" color="var(--fg)"/>' +
        '<text x="' + f(st.top.x + c / 2 + pw / 2 + 5) + '" y="' + f(plate - 16 - ph / 2 + 4) + '" font-size="11" font-style="italic" fill="var(--fg)">M</text>' +
        // joints and sliders
        dot(O, 5) + dot(st.O2, 5) + dot(st.top, 4) + dot(st.top2, 4) +
        '<rect x="' + f(st.A.x - 11) + '" y="' + f(st.A.y - 5) + '" width="9" height="10" rx="1" fill="var(--card)" stroke="var(--fg)" stroke-width="1.4"/>' +
        '<g transform="rotate(' + f(th * 180 / Math.PI) + ' ' + f(st.B.x) + ' ' + f(st.B.y) + ')"><rect x="' + f(st.B.x - 5) + '" y="' + f(st.B.y - 6) + '" width="10" height="12" rx="1" fill="var(--card)" stroke="var(--fg)" stroke-width="1.4"/></g>' +
        '<text x="' + f(st.A.x - 22) + '" y="' + f(st.A.y + 4) + '" font-size="10" font-style="italic" fill="var(--fg)">A</text>' +
        '<text x="' + f(st.B.x + 9) + '" y="' + f(st.B.y + 4) + '" font-size="10" font-style="italic" fill="var(--fg)">B</text>';
      el.spring.style.display = mode === 'off' ? 'none' : '';
      el.spring.setAttribute('points', zigzag(st.A, st.B, 10, 3));
      // cables: A up and over the pulleys, down the left, back under the pivot and up the arm; B along the arm
      var pa = { x: O.x - 7, y: O.y - 100 }, pb = { x: O.x - 60, y: O.y - 100 }, pc = { x: O.x - 60, y: O.y - 2 };
      var mid = { x: O.x + (L - 14) * st.u.x, y: O.y + (L - 14) * st.u.y };
      el.cables.style.display = mode === 'off' ? 'none' : '';
      el.cables.innerHTML = '<g fill="none" stroke="var(--accent)" stroke-width="1.1" opacity=".9">' +
        '<polyline points="' + f(st.A.x - 7) + ',' + f(st.A.y) + ' ' + f(pa.x) + ',' + f(pa.y) + ' ' + f(pb.x) + ',' + f(pb.y) + ' ' + f(pc.x) + ',' + f(pc.y) + ' ' + O.x + ',' + O.y + ' ' + f(mid.x) + ',' + f(mid.y) + '"/>' +
        '<polyline stroke-dasharray="3 2" points="' + f(st.B.x) + ',' + f(st.B.y) + ' ' + f(mid.x) + ',' + f(mid.y) + '"/></g>' +
        '<g fill="var(--card)" stroke="var(--fg-2)" stroke-width="1">' + dot(pa, 3) + dot(pb, 3) + dot(pc, 3) + '</g>' +
        '<text x="' + f(pb.x - 4) + '" y="' + f((pb.y + pc.y) / 2) + '" font-size="8" fill="var(--accent)" text-anchor="end">cable A</text>';
    }

    var W = 260, H = 70, lo, hi;
    (function () { var save = M; M = 2; var a = state(0, sFor(2)), b = state(AMP, sFor(2)); M = save;
      lo = Math.min(0, b.Ug, a.Us); hi = Math.max(a.Ug + a.Us, b.Ug + b.Us, a.Ug); var p = (hi - lo) * .08; lo -= p; hi += p; })();
    function rechart(s) {
      el.cUg.setAttribute('d', chartPath(W, H, -AMP, AMP, lo, hi, function (t) { return state(t, s).Ug; }));
      el.cUs.setAttribute('d', chartPath(W, H, -AMP, AMP, lo, hi, function (t) { return state(t, s).Us; }));
      el.cUt.setAttribute('d', chartPath(W, H, -AMP, AMP, lo, hi, function (t) { var st = state(t, s); return st.Ug + st.Us; }));
      el.cUs.style.display = mode === 'off' ? 'none' : '';
      el.lblT.textContent = mode === 'off' ? 'total = gravity' : 'total';
    }
    var loadIn = document.getElementById('regLoad'), loadOut = document.getElementById('regLoadOut'), sOut = document.getElementById('regSOut'), msg = document.getElementById('regMsg');
    var phase = 'swing', phaseT = 0, sFrom = 50, thHome = 0;
    function retarget() {
      M = loadIn ? parseFloat(loadIn.value) : 1;
      sTarget = mode === 'auto' ? sFor(M) : sFixed;
      if (loadOut) loadOut.value = M.toFixed(2);
      if (Math.abs(sTarget - sNow) > 0.05 && mode === 'auto') { phase = 'home'; }
      else { rechart(sNow); }
      say();
    }
    function say() {
      if (sOut) sOut.value = mode === 'off' ? '–' : sNow.toFixed(0) + ' mm';
      if (!msg) return;
      if (mode === 'off') msg.textContent = 'Not balanced: the arm falls over.';
      else if (mode === 'fixed') msg.textContent = Math.abs(sTarget - sFor(M)) < 0.5 ? 'Balanced for this load.' : 'Set for M = 1: with another load the arm is not balanced.';
      else msg.textContent = phase === 'swing' ? 'Balanced: the regulator has set both sliders to the new load.' : 'Re-setting at the upright position…';
    }
    if (loadIn) loadIn.addEventListener('input', retarget);
    Array.prototype.forEach.call(document.querySelectorAll('input[name=regmode]'), function (rb) {
      rb.addEventListener('change', function () { if (rb.checked) { mode = rb.value; retarget(); rechart(sNow); } });
    });
    rechart(sNow); say();
    var t0 = null, th = 0.4, last = null, swingT = 0;
    loop(function (t) {
      var dt = 0;
      if (t !== undefined) { if (last !== null) dt = Math.min(0.05, (t - last) / 1000); last = t; }
      if (phase === 'swing') {
        swingT += dt; th = AMP * Math.sin(swingT * 0.6);
      } else if (phase === 'home') {
        // ease the arm back upright, then adjust
        th += (0 - th) * Math.min(1, 4 * dt);
        if (Math.abs(th) < 0.01) { th = 0; phase = 'adjust'; phaseT = 0; sFrom = sNow; say(); }
      } else if (phase === 'adjust') {
        phaseT += dt; var e = Math.min(1, phaseT / 0.9); e = e * e * (3 - 2 * e);
        sNow = sFrom + (sTarget - sFrom) * e; rechart(sNow);
        if (e >= 1) { sNow = sTarget; phase = 'swing'; swingT = 0; say(); }
      }
      draw(th, sNow);
      var frac = (th + AMP) / (2 * AMP);
      el.cursor.setAttribute('x1', f(W * frac)); el.cursor.setAttribute('x2', f(W * frac));
    });
  })();

  // ---------------------------------------------------------------------------------------------
  // Nguyen, Lin and Kuo, Mech. Mach. Theory 154 (2020) 104046 (and ASME J. Mech. Robot. 12 (2020)
  // 031014): the gear-spring module (GSM).
  // Gear 1 is fixed to the ground at the pivot O. The rotating link carries gear 2, which meshes
  // with gear 1, so gear 2 turns relative to the link by theta / n_g when the link turns by theta
  // (n_g = r2 / r1 = 2). A crank pin A on gear 2 drives a slider B along the link through a
  // connecting rod; the slider compresses a spring that lies along the link. With the spring free
  // at theta = 0 and the crank set at right angles to the link, the slider travel is close to
  // r2a sin(theta/2) and the spring energy close to 1/4 k r2a^2 (1 - cos theta): the gravity energy
  // m g s cos theta is cancelled when k = 4 m g s / r2a^2 (the paper's Eq. 20), exactly in the
  // limit of a long connecting rod and approximately otherwise. The leftover shown is that of the
  // finite rod; the slider sets the rod length.
  // ---------------------------------------------------------------------------------------------
  (function () {
    var svg = document.getElementById('gsm');
    if (!svg) return;
    var r1 = 9, r2 = 18, ng = r2 / r1, r2a = 7, sM = 112, m = 1, g = 1, k0 = 4 * m * g * sM / (r2a * r2a), k = k0;
    var hH = r1 + r2, xStop = 80;                  // gear 2 centre and the spring seat, measured from O and H along the link
    var ratio = 3.5, r3 = ratio * r2a, on = true, tune = true;
    var O = { x: 170, y: 131 };
    var $ = function (id) { return svg.querySelector('#' + id); };
    var el = { g: $('gBody'), spring: $('gSpring'), tG: $('gTG'), tS: $('gTS'), tN: $('gTN'), cursor: $('gCursor') };

    function xB(th) {                               // slider position from H along the link (outwards)
      var au = r2a * Math.sin(th / ng), av = r2a * Math.cos(th / ng);
      return au + Math.sqrt(r3 * r3 - av * av);
    }
    function Us(th) { if (!on) return 0; var d = xB(th) - xB(0); return 0.5 * k * d * d; }
    function Ug(th) { return m * g * sM * Math.cos(th); }
    function torque(fn, th) { var h = 1e-3; return -(fn(th + h) - fn(th - h)) / (2 * h); }
    function peakNet() { var pk = 0; for (var i = 0; i <= 120; i++) { var th = 2 * Math.PI * i / 120; pk = Math.max(pk, Math.abs(torque(Ug, th) + torque(Us, th))); } return pk; }
    function tuneK() {
      // the paper's second route: pick the stiffness that minimises the peak motor torque for the rod as built
      var a = 0.5 * k0, b = 1.1 * k0, gr = (Math.sqrt(5) - 1) / 2;
      var c = b - gr * (b - a), d = a + gr * (b - a);
      for (var i = 0; i < 40; i++) {
        k = c; var fc = peakNet(); k = d; var fd = peakNet();
        if (fc < fd) { b = d; } else { a = c; }
        c = b - gr * (b - a); d = a + gr * (b - a);
      }
      k = (a + b) / 2;
    }

    function draw(th) {
      var u = { x: Math.sin(th), y: -Math.cos(th) }, v = { x: Math.cos(th), y: Math.sin(th) };   // along the link, and clockwise-perpendicular
      function P(a, b) { return { x: O.x + a * u.x + b * v.x, y: O.y + a * u.y + b * v.y }; }
      var H = P(hH, 0), phi = -Math.PI / 2 + th / ng;
      var A = P(hH + r2a * Math.cos(phi), r2a * Math.sin(phi));
      var B = P(hH + xB(th), 0), S = P(hH + xStop, 0), end = P(sM, 0);
      var gear2rot = th + th / ng;                 // absolute rotation of gear 2 (screen clockwise)
      function teeth(cen, rad, rot, n) {
        var out = '';
        for (var i = 0; i < n; i++) { var a = rot + 2 * Math.PI * i / n; out += '<line x1="' + f(cen.x + rad * Math.sin(a)) + '" y1="' + f(cen.y - rad * Math.cos(a)) + '" x2="' + f(cen.x + (rad + 2.5) * Math.sin(a)) + '" y2="' + f(cen.y - (rad + 2.5) * Math.cos(a)) + '"/>'; }
        return out;
      }
      el.g.innerHTML =
        // link with a slot for the slider
        '<line x1="' + O.x + '" y1="' + O.y + '" x2="' + f(end.x) + '" y2="' + f(end.y) + '" stroke="var(--fg)" stroke-width="3.5" stroke-linecap="round"/>' +
        // fixed gear 1 (hatched) and gear 2
        '<circle cx="' + O.x + '" cy="' + O.y + '" r="' + r1 + '" fill="url(#hatch)" stroke="var(--fg)" stroke-width="1.6" color="var(--fg-2)"/>' +
        '<g stroke="var(--fg-2)" stroke-width="1">' + teeth(O, r1, 0, 10) + '</g>' +
        '<circle cx="' + f(H.x) + '" cy="' + f(H.y) + '" r="' + r2 + '" fill="var(--bg-2)" stroke="var(--fg)" stroke-width="1.6" opacity=".95"/>' +
        '<g stroke="var(--fg-2)" stroke-width="1">' + teeth(H, r2, gear2rot, 20) + '</g>' +
        dot(H, 3.5) +
        // crank, connecting rod, slider, spring seat
        '<line x1="' + f(H.x) + '" y1="' + f(H.y) + '" x2="' + f(A.x) + '" y2="' + f(A.y) + '" stroke="var(--fg)" stroke-width="2"/>' +
        '<line x1="' + f(A.x) + '" y1="' + f(A.y) + '" x2="' + f(B.x) + '" y2="' + f(B.y) + '" stroke="var(--fg)" stroke-width="2.2" stroke-linecap="round"/>' +
        '<g transform="rotate(' + f(th * 180 / Math.PI) + ' ' + f(B.x) + ' ' + f(B.y) + ')"><rect x="' + f(B.x - 5) + '" y="' + f(B.y - 6) + '" width="10" height="12" rx="1" fill="var(--card)" stroke="var(--fg)" stroke-width="1.4"/></g>' +
        '<g transform="rotate(' + f(th * 180 / Math.PI) + ' ' + f(S.x) + ' ' + f(S.y) + ')"><rect x="' + f(S.x - 1.5) + '" y="' + f(S.y - 7) + '" width="3" height="14" fill="var(--fg)"/></g>' +
        dot(A, 3, 'var(--red)') + dot(O, 4.5) +
        massDisc(end, 9) +
        '<text x="' + f(A.x + 6) + '" y="' + f(A.y - 5) + '" font-size="10" font-style="italic" fill="var(--fg)">A</text>' +
        '<text x="' + f(end.x + 12) + '" y="' + f(end.y + 4) + '" font-size="11" font-style="italic" fill="var(--fg)">m</text>';
      el.spring.style.display = on ? '' : 'none';
      el.spring.setAttribute('points', zigzag(B, S, 9, 3.5));
    }

    var W = 260, H = 70, scale = 1.3 * m * g * sM;
    function Y(t) { return H / 2 - t / scale * (H / 2); }
    function path(fn) { var d = '', N = 241; for (var i = 0; i < N; i++) { var th = 2 * Math.PI * i / (N - 1); d += (i ? 'L' : 'M') + f(W * i / (N - 1)) + ',' + f(Y(fn(th))); } return d; }
    var rodIn = document.getElementById('gsmRod'), rodOut = document.getElementById('gsmRodOut'), onIn = document.getElementById('gsmOn'),
        tuneIn = document.getElementById('gsmTune'), msg = document.getElementById('gsmMsg'), kOut = document.getElementById('gsmKOut');
    function rechart() {
      el.tG.setAttribute('d', path(function (th) { return torque(Ug, th); }));
      el.tS.setAttribute('d', path(function (th) { return torque(Us, th); }));
      el.tS.style.display = on ? '' : 'none';
      el.tN.setAttribute('d', path(function (th) { return torque(Ug, th) + torque(Us, th); }));
      // peak leftover torque as a share of the unbalanced peak
      if (msg) msg.textContent = on ? 'Leftover torque: ' + Math.round(100 * peakNet() / (m * g * sM)) + ' % of the unbalanced peak.' : 'Not balanced: the motor carries the whole weight.';
      if (kOut) kOut.value = on ? (100 * k / k0).toFixed(0) + ' %' : '–';
    }
    function apply() {
      ratio = rodIn ? parseFloat(rodIn.value) : 3.5; r3 = ratio * r2a;
      on = onIn ? onIn.checked : true;
      tune = tuneIn ? tuneIn.checked : true;
      if (rodOut) rodOut.value = ratio.toFixed(1) + ' ×';
      if (on && tune) tuneK(); else k = k0;
      rechart();
    }
    if (rodIn) rodIn.addEventListener('input', apply);
    if (onIn) onIn.addEventListener('change', apply);
    if (tuneIn) tuneIn.addEventListener('change', apply);
    apply();
    var th = 0.8, last = null, omega = 0.6;
    loop(function (t) {
      if (t !== undefined) { if (last !== null) th += omega * (t - last) / 1000; last = t; }
      var tt = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      draw(tt);
      el.cursor.setAttribute('x1', f(W * tt / (2 * Math.PI))); el.cursor.setAttribute('x2', f(W * tt / (2 * Math.PI)));
    });
  })();
})();
