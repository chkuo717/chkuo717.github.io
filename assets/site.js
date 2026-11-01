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
  var pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
  function Y(u) { return H - (u - lo) / (hi - lo) * H; }
  function path(fn) { return curve.map(function (c, i) { return (i ? 'L' : 'M') + f(W * i / (N - 1)) + ',' + f(Y(fn(c))); }).join(''); }
  el.cUg.setAttribute('d', path(function (c) { return c.Ug; }));
  el.cUs.setAttribute('d', path(function (c) { return c.Us; }));
  var pathBal = path(function (c) { return c.Ug + c.Us; }), pathUnbal = path(function (c) { return c.Ug; });
  el.cUt.setAttribute('d', pathBal);

  var toggle = document.getElementById('toggleSprings'), speed = document.getElementById('speed');
  var on = true;
  function setSprings(v) {
    on = v;
    el.springs.style.display = v ? '' : 'none';
    el.cUs.style.display = v ? '' : 'none';
    el.cUt.setAttribute('d', v ? pathBal : pathUnbal);
    el.lblT.textContent = v ? 'total' : 'total = gravity';
  }
  if (toggle) toggle.addEventListener('change', function () { setSprings(toggle.checked); });

  var theta = 0.9, last = null;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function tick(t) {
    var s = solve(theta);
    draw(s);
    var frac = ((theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / (2 * Math.PI);
    el.cursor.setAttribute('x1', f(W * frac)); el.cursor.setAttribute('x2', f(W * frac));
    if (t !== undefined) {
      if (last !== null) theta += (speed ? parseFloat(speed.value) : 0.9) * (t - last) / 1000;
      last = t;
    }
  }
  tick();
  if (!reduce) requestAnimationFrame(function loop(t) { tick(t); requestAnimationFrame(loop); });
})();
