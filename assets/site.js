// Mobile menu
(function () {
  var btn = document.querySelector('.menu-toggle');
  var nav = document.getElementById('nav');
  if (!btn || !nav) return;
  btn.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
})();

// Home: complete gravity balancing of a general four-bar linkage with two zero-free-length springs.
// Kuo, Mech. Mach. Theory 214 (2025) 106140. Coupler-mass case (the paper's Fig. 2).
// Model, in a y-up frame with O at the origin and Q at (r1, 0):
//   P (coupler point) = r2 e^{i th2} (1 - (r5/r3) e^{i a}) + (r5/r3) e^{i a} r4 e^{i th4} + const
//   so the mass m at P is equivalent, for gravity, to m at A on the crank (radius rA, offset dA)
//   plus m at B on the rocker (radius rB, offset dB) plus a fixed m on the ground.
//   Each rotating equivalent mass is balanced by a ZFL spring between a ground point H (distance h from the
//   pivot, on the vertical rotated by phi) and a link point L (distance l, on the pivot-to-mass line rotated by phi),
//   with k h l = m g r.  Then  U_g + U_sA + U_sB = const for every th2.
(function () {
  var svg = document.getElementById('bal');
  if (!svg) return;
  var r1 = 200, r2 = 70, r3 = 190, r4 = 150, r5 = 150, alpha = 35 * Math.PI / 180;
  var m = 1, g = 1;
  // complex helpers
  function cexp(t) { return { re: Math.cos(t), im: Math.sin(t) }; }
  function cmul(a, b) { return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }; }
  var ea = cexp(alpha);
  var cA = { re: 1 - (r5 / r3) * ea.re, im: -(r5 / r3) * ea.im };
  var cB = { re: (r5 / r3) * ea.re, im: (r5 / r3) * ea.im };
  var rA = Math.hypot(cA.re, cA.im) * r2, dA = Math.atan2(cA.im, cA.re);
  var rB = Math.hypot(cB.re, cB.im) * r4, dB = Math.atan2(cB.im, cB.re);
  var phiA = 35 * Math.PI / 180, hA = 95, lA = 55;
  var phiB = -35 * Math.PI / 180, hB = 95, lB = 55;
  var kA = m * g * rA / (hA * lA), kB = m * g * rB / (hB * lB);
  var Q = { x: r1, y: 0 };
  var HA = { x: hA * Math.cos(Math.PI / 2 + phiA), y: hA * Math.sin(Math.PI / 2 + phiA) };
  var HB = { x: Q.x + hB * Math.cos(Math.PI / 2 + phiB), y: Q.y + hB * Math.sin(Math.PI / 2 + phiB) };

  function solve(th2) {
    var M = { x: r2 * Math.cos(th2), y: r2 * Math.sin(th2) };
    var dx = Q.x - M.x, dy = Q.y - M.y, d = Math.hypot(dx, dy);
    var a = (r3 * r3 - r4 * r4 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, r3 * r3 - a * a));
    var mx = M.x + a * dx / d, my = M.y + a * dy / d;
    var N = { x: mx - h * dy / d, y: my + h * dx / d };        // branch with N above
    var th3 = Math.atan2(N.y - M.y, N.x - M.x), th4 = Math.atan2(N.y - Q.y, N.x - Q.x);
    var P = { x: M.x + r5 * Math.cos(th3 + alpha), y: M.y + r5 * Math.sin(th3 + alpha) };
    var LA = { x: lA * Math.cos(th2 + dA + phiA), y: lA * Math.sin(th2 + dA + phiA) };
    var LB = { x: Q.x + lB * Math.cos(th4 + dB + phiB), y: Q.y + lB * Math.sin(th4 + dB + phiB) };
    var Ug = m * g * P.y;
    var Us = 0.5 * kA * ((HA.x - LA.x) ** 2 + (HA.y - LA.y) ** 2) + 0.5 * kB * ((HB.x - LB.x) ** 2 + (HB.y - LB.y) ** 2);
    return { M: M, N: N, P: P, LA: LA, LB: LB, Ug: Ug, Us: Us };
  }

  // frame: y up -> svg
  var OX = 70, OY = 215;
  function S(p) { return { x: OX + p.x, y: OY - p.y }; }
  function f(v) { return v.toFixed(1); }

  var $ = function (id) { return svg.querySelector('#' + id); };
  var el = { crank: $('crank'), rocker: $('rocker'), coupler: $('coupler'), jO: $('jO'), jQ: $('jQ'), jM: $('jM'), jN: $('jN'),
             mass: $('mass'), massLbl: $('massLbl'), sprA: $('sprA'), sprB: $('sprB'), armA: $('armA'), armB: $('armB'),
             anchors: $('anchors'), cUg: $('cUg'), cUs: $('cUs'), cUt: $('cUt'), cursor: $('cursor'), springs: $('springs'), lblT: $('lblT') };

  // static parts: pivots, ground anchors
  var o = S({ x: 0, y: 0 }), q = S(Q), ha = S(HA), hb = S(HB);
  el.jO.setAttribute('cx', o.x); el.jO.setAttribute('cy', o.y);
  el.jQ.setAttribute('cx', q.x); el.jQ.setAttribute('cy', q.y);
  el.anchors.innerHTML = anchor(ha) + anchor(hb);
  function anchor(p) {
    return '<polygon points="' + f(p.x) + ',' + f(p.y) + ' ' + f(p.x - 7) + ',' + f(p.y + 11) + ' ' + f(p.x + 7) + ',' + f(p.y + 11) + '"/>' +
           '<circle cx="' + f(p.x) + '" cy="' + f(p.y) + '" r="2.4" fill="var(--fg)"/>';
  }
  function zigzag(a, b, n, w) {
    var dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, px = -uy, py = ux;
    var pts = [a.x + ',' + a.y], lead = Math.min(8, L * 0.12);
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

  function draw(s) {
    var M = S(s.M), N = S(s.N), P = S(s.P), LA = S(s.LA), LB = S(s.LB);
    el.crank.setAttribute('x1', o.x); el.crank.setAttribute('y1', o.y); el.crank.setAttribute('x2', f(M.x)); el.crank.setAttribute('y2', f(M.y));
    el.rocker.setAttribute('x1', q.x); el.rocker.setAttribute('y1', q.y); el.rocker.setAttribute('x2', f(N.x)); el.rocker.setAttribute('y2', f(N.y));
    el.coupler.setAttribute('points', f(M.x) + ',' + f(M.y) + ' ' + f(N.x) + ',' + f(N.y) + ' ' + f(P.x) + ',' + f(P.y));
    el.jM.setAttribute('cx', f(M.x)); el.jM.setAttribute('cy', f(M.y));
    el.jN.setAttribute('cx', f(N.x)); el.jN.setAttribute('cy', f(N.y));
    el.mass.setAttribute('transform', 'translate(' + f(P.x) + ',' + f(P.y) + ')');
    el.massLbl.setAttribute('x', f(P.x + 11)); el.massLbl.setAttribute('y', f(P.y - 6));
    // spring attachment arms are rigid parts of the crank and rocker
    el.armA.innerHTML = line(o, LA) + '<circle cx="' + f(LA.x) + '" cy="' + f(LA.y) + '" r="2.6" fill="var(--fg)" stroke="none"/>';
    el.armB.innerHTML = line(q, LB) + '<circle cx="' + f(LB.x) + '" cy="' + f(LB.y) + '" r="2.6" fill="var(--fg)" stroke="none"/>';
    el.sprA.setAttribute('points', zigzag(ha, LA, 9, 3.2));
    el.sprB.setAttribute('points', zigzag(hb, LB, 9, 3.2));
  }

  // energy curves over a full crank turn, drawn once; scaled to the chart box
  var W = 260, H = 70, N = 181, curve = [];
  for (var i = 0; i < N; i++) curve.push(solve(2 * Math.PI * i / (N - 1)));
  var lo = Infinity, hi = -Infinity;
  curve.forEach(function (c) { lo = Math.min(lo, c.Ug, c.Us); hi = Math.max(hi, c.Ug + c.Us); });
  hi = lo + (hi - lo) * 2.0;   // room for payloads up to m = 2
  var pad = (hi - lo) * 0.05; lo -= pad; hi += pad;
  function Y(u) { return H - (u - lo) / (hi - lo) * H; }
  function path(fn) { return curve.map(function (c, i) { return (i ? 'L' : 'M') + f(W * i / (N - 1)) + ',' + f(Y(fn(c))); }).join(''); }
  el.cUg.setAttribute('d', path(function (c) { return c.Ug; }));
  el.cUs.setAttribute('d', path(function (c) { return c.Us; }));
  var pathBal = path(function (c) { return c.Ug + c.Us; }), pathUnbal = path(function (c) { return c.Ug; });
  el.cUt.setAttribute('d', pathBal);

  // controls: payload m, spring mode
  var massIn = document.getElementById('payload'), massOut = document.getElementById('massOut');
  var kAOut = document.getElementById('kAOut'), kBOut = document.getElementById('kBOut');
  var mode = 'tuned';                      // tuned | fixed | off
  var m0 = 1, kA0 = kA, kB0 = kB;          // springs as designed for m = 1
  function applyMode() {
    m = massIn ? parseFloat(massIn.value) : 1;
    if (mode === 'tuned') { kA = m * g * rA / (hA * lA); kB = m * g * rB / (hB * lB); }
    else { kA = kA0; kB = kB0; }
    el.springs.style.display = mode === 'off' ? 'none' : '';
    el.cUs.style.display = mode === 'off' ? 'none' : '';
    if (massOut) massOut.value = m.toFixed(2);
    if (kAOut) kAOut.value = (mode === 'off' ? 0 : kA).toFixed(3);
    if (kBOut) kBOut.value = (mode === 'off' ? 0 : kB).toFixed(3);
    el.lblT.textContent = mode === 'off' ? 'total = gravity' : 'total';
    rechart();
  }
  function rechart() {
    curve = [];
    for (var i = 0; i < N; i++) curve.push(solve(2 * Math.PI * i / (N - 1)));
    // fixed scale so that changes in m are visible: based on the designed case
    el.cUg.setAttribute('d', path(function (c) { return c.Ug; }));
    el.cUs.setAttribute('d', path(function (c) { return c.Us; }));
    el.cUt.setAttribute('d', path(function (c) { return mode === 'off' ? c.Ug : c.Ug + c.Us; }));
  }
  if (massIn) massIn.addEventListener('input', applyMode);
  Array.prototype.forEach.call(document.querySelectorAll('input[name=smode]'), function (r) {
    r.addEventListener('change', function () { if (r.checked) { mode = r.value; applyMode(); } });
  });
  var sOn = document.getElementById('springsOn'), balMsg = document.getElementById('balMsg');
  if (sOn) sOn.addEventListener('change', function () {
    mode = sOn.checked ? 'tuned' : 'off'; applyMode();
    if (balMsg) balMsg.textContent = sOn.checked ? 'Balanced: it rests in any position.' : 'Not balanced: the weight pulls it down.';
  });
  applyMode();

  var theta = 0.9, last = null, omega = 0.7;  // slow, constant: speed has no bearing on balance
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function tick(t) {
    draw(solve(theta));
    var frac = ((theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / (2 * Math.PI);
    el.cursor.setAttribute('x1', f(W * frac)); el.cursor.setAttribute('x2', f(W * frac));
    if (t !== undefined) { if (last !== null) theta += omega * (t - last) / 1000; last = t; }
  }
  tick();
  if (!reduce) requestAnimationFrame(function loop(t) { tick(t); requestAnimationFrame(loop); });
})();


// Home: gravity compensation of a pendulum by a reconfigurable Halbach cylinder.
// After Biggs, Kuo and Ren, ASME J. Mech. Des. 148 (2026) 033305.
// Model: arm of length L with payload M, fixed to a centre magnet of dipole moment mu, inside the field of a
// finite ring of magnets. With the dipole along the arm (theta from the upward vertical),
//   torque_g = -M g L sin(theta)
//   torque_m = +mu B [sin(theta) + a3 sin(3 theta) + a5 sin(5 theta)]
// The harmonics stand for the non-uniformity of a real, discrete ring and the finite size of the magnets:
// the match is close but not exact, so a small residual torque remains. Magnetic balancing is approximate,
// unlike the exact spring solution above; the real curves are computed and measured in the paper.
// Turning all outer magnets by delta changes the field; here B = Bmax cos(delta), an illustration of the lever.
(function () {
  var svg = document.getElementById('mag');
  if (!svg) return;
  var C = { x: 170, y: 130 }, L = 95, R = 92, n = 10, g = 1, mu = 1, Bmax = 2.0 * 95;  // full field carries M = 2
  var M = 1, Bmode = 'tuned', B0 = M * g * L / mu;  // field as set for M = 1
  var a3 = 0.12, a5 = 0.04;                            // illustrative ripple of a 10-magnet ring
  function shape(th) { return Math.sin(th) + a3 * Math.sin(3 * th) + a5 * Math.sin(5 * th); }
  var $ = function (id) { return svg.querySelector('#' + id); };
  var outer = $('outer'), rotor = $('rotor'), field = $('field'), tG = $('tG'), tM = $('tM'), tN = $('tN'), cursor = $('cursor2');
  var massIn = document.getElementById('mass2'), massOut = document.getElementById('mass2Out'), BOut = document.getElementById('BOut'), dOut = document.getElementById('dOut');
  function f(v) { return v.toFixed(1); }

  function Bnow() {
    if (Bmode === 'off') return 0;
    return Bmode === 'tuned' ? M * g * L / mu : B0;
  }
  function deltaFor(B) { return Math.acos(Math.min(1, B / Bmax)); }

  function drawOuter(delta) {
    // Halbach (k = 2, "dipole") ring: magnetisation angle 2*phi + 90deg for a magnet at azimuth phi,
    // which gives a uniform field inside; each magnet then turned by delta about its own axis.
    var out = '';
    if (Bmode === 'off') { outer.innerHTML = ''; return; }
    for (var i = 0; i < n; i++) {
      var phi = 2 * Math.PI * i / n - Math.PI / 2;
      var cx = C.x + R * Math.cos(phi), cy = C.y + R * Math.sin(phi);
      var mag = 2 * phi + Math.PI / 2 + delta;     // svg y is down: angles measured clockwise on screen
      var ax = Math.cos(mag), ay = Math.sin(mag);
      out += '<g transform="translate(' + f(cx) + ',' + f(cy) + ')">' +
             '<rect x="-11" y="-11" width="22" height="22" rx="2" fill="var(--bg-2)" stroke="var(--fg)" stroke-width="1.3"/>' +
             '<line x1="' + f(-7 * ax) + '" y1="' + f(-7 * ay) + '" x2="' + f(7 * ax) + '" y2="' + f(7 * ay) + '" stroke="var(--fg)" stroke-width="1.6" marker-end="url(#arr)"/></g>';
    }
    outer.innerHTML = out;
  }
  function drawField(B) {
    var out = '';
    if (B <= 0) { field.innerHTML = ''; return; }
    var k = Math.min(1, B / Bmax);
    for (var x = -48; x <= 48; x += 24) {
      out += '<line x1="' + (C.x + x) + '" y1="' + (C.y + 62) + '" x2="' + (C.x + x) + '" y2="' + (C.y - 62) + '" marker-end="url(#arr)" opacity="' + (0.25 + 0.75 * k).toFixed(2) + '"/>';
    }
    field.innerHTML = out;
  }
  function drawArm(theta) {
    var ex = C.x + L * Math.sin(theta), ey = C.y - L * Math.cos(theta);
    var r = 7 + 5 * Math.sqrt(M);
    rotor.innerHTML =
      '<line x1="' + C.x + '" y1="' + C.y + '" x2="' + f(ex) + '" y2="' + f(ey) + '" stroke="var(--fg)" stroke-width="3.5" stroke-linecap="round"/>' +
      // centre magnet: dipole along the arm, N at the arm side
      '<g transform="rotate(' + f(theta * 180 / Math.PI) + ' ' + C.x + ' ' + C.y + ')">' +
      '<rect x="' + (C.x - 9) + '" y="' + (C.y - 20) + '" width="18" height="40" rx="3" fill="var(--card)" stroke="var(--fg)" stroke-width="1.5"/>' +
      '<rect x="' + (C.x - 9) + '" y="' + (C.y - 20) + '" width="18" height="20" rx="3" fill="var(--red)" opacity=".85"/>' +
      '<text x="' + C.x + '" y="' + (C.y - 7) + '" font-size="9" text-anchor="middle" fill="#fff" font-weight="700">N</text>' +
      '<text x="' + C.x + '" y="' + (C.y + 14) + '" font-size="9" text-anchor="middle" fill="var(--fg)" font-weight="700">S</text></g>' +
      '<circle cx="' + f(ex) + '" cy="' + f(ey) + '" r="' + f(r) + '" fill="var(--card)" stroke="var(--fg)" stroke-width="1.6"/>' +
      '<circle cx="' + f(ex) + '" cy="' + f(ey) + '" r="' + f(r) + '" fill="url(#masshatch)" stroke="none" color="var(--fg)"/>' +
      '<text x="' + f(ex + r + 4) + '" y="' + f(ey + 4) + '" font-size="11" font-style="italic" fill="var(--fg)">M</text>';
  }
  // torque chart: theta from -180 to 180, fixed scale for M up to 2
  var W = 260, H = 70, N = 181, scale = 1.25 * g * L;
  function Y(t) { return H / 2 - t / scale * (H / 2); }
  function path(fn) { var d = ''; for (var i = 0; i < N; i++) { var th = -Math.PI + 2 * Math.PI * i / (N - 1); d += (i ? 'L' : 'M') + f(W * i / (N - 1)) + ',' + f(Y(fn(th))); } return d; }
  function rechart(B) {
    tG.setAttribute('d', path(function (th) { return -M * g * L * Math.sin(th); }));
    tM.setAttribute('d', path(function (th) { return mu * B * shape(th); }));
    tN.setAttribute('d', path(function (th) { return mu * B * shape(th) - M * g * L * Math.sin(th); }));
    tM.style.display = B > 0 ? '' : 'none';
  }
  function apply() {
    M = massIn ? parseFloat(massIn.value) : 1;
    var B = Bnow(), d = Bmode === 'off' ? 0 : deltaFor(B);
    if (massOut) massOut.value = M.toFixed(2);
    if (BOut) BOut.value = Bmode === 'off' ? '0 %' : Math.round(100 * B / Bmax) + ' %';
    if (dOut) dOut.value = Bmode === 'off' ? '–' : Math.round(d * 180 / Math.PI) + '°';
    drawOuter(d); drawField(B); rechart(B);
  }
  if (massIn) massIn.addEventListener('input', apply);
  Array.prototype.forEach.call(document.querySelectorAll('input[name=bmode]'), function (r) {
    r.addEventListener('change', function () { if (r.checked) { Bmode = r.value; apply(); } });
  });
  var mOn = document.getElementById('magnetsOn'), magMsg = document.getElementById('magMsg');
  if (mOn) mOn.addEventListener('change', function () {
    Bmode = mOn.checked ? 'tuned' : 'off'; apply();
    if (magMsg) magMsg.textContent = mOn.checked ? 'Nearly balanced: only a small push is left.' : 'Not balanced: the arm swings down.';
  });
  apply();
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var t0 = null, theta = 0;
  function tick(t) {
    if (t !== undefined) { if (t0 === null) t0 = t; theta = 0.75 * Math.PI * Math.sin((t - t0) / 1000 * 0.45); }
    drawArm(theta);
    var frac = (theta + Math.PI) / (2 * Math.PI);
    cursor.setAttribute('x1', f(W * frac)); cursor.setAttribute('x2', f(W * frac));
  }
  theta = 0.6; tick();
  if (!reduce) requestAnimationFrame(function loop(t) { tick(t); requestAnimationFrame(loop); });
})();
