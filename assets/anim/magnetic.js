// Animations for the magnetic-mechanisms paper pages (papers/*.html).
// Each block looks for its own root SVG and does nothing on pages that lack it.
// Drawing goes through draw.js (window.KD). The force curves are computed, not drawn:
// the levitator and the array use a surface-charge model of the magnets (below), which
// reproduces the force curves published in the papers to within a few per cent.

(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var f = KD.f;
  function chartPath(W, H, x0, x1, lo, hi, fn, N) {
    N = N || 121;
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
  function ease(a, b, dt, rate) { return a + (b - a) * Math.min(1, rate * dt); }
  function radios(name, cb) {
    Array.prototype.forEach.call(document.querySelectorAll('input[name=' + name + ']'), function (r) {
      r.addEventListener('change', function () { if (r.checked) cb(r.value); });
    });
  }

  // ---------------------------------------------------------------------------------------------
  // Magnet force model. A uniformly magnetised body is equivalent to a magnetic surface charge
  // sigma = M . n on its faces. The force on a small dipole m (along z) at r is m dBz/dz, and for
  // a point charge q at s,  dBz/dz = (mu0/4pi) q (1/R^3 - 3 dz^2/R^5),  R = r - s.
  // Lengths in mm and M in A/m give the force in N after a factor 1e-6 (mm^2 charge x mm^3 dipole
  // volume / mm^3 field). The mover is integrated as ng^3 dipoles over its cube. This is the same
  // dipole physics the papers integrate by Monte Carlo, in a form a browser can evaluate at once.
  // ---------------------------------------------------------------------------------------------
  var MU = 1e-7;                                                 // mu0 / 4 pi
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function norm(a) { return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]); }
  // quad a,b,c,d (arrays [x,y,z]) with unit outward normal n, magnetisation M (A/m vector); appends x,y,z,q to out
  function faceCharges(a, b, c, d, n, M, grid, out) {
    var sigma = n[0] * M[0] + n[1] * M[1] + n[2] * M[2];
    if (Math.abs(sigma) < 1e-6) return;
    for (var i = 0; i < grid; i++) for (var j = 0; j < grid; j++) {
      var u = (i + 0.5) / grid, v = (j + 0.5) / grid, p = [0, 0, 0], du = [0, 0, 0], dv = [0, 0, 0];
      for (var k = 0; k < 3; k++) {
        p[k] = (1 - u) * (1 - v) * a[k] + u * (1 - v) * b[k] + u * v * c[k] + (1 - u) * v * d[k];
        du[k] = (-(1 - v) * a[k] + (1 - v) * b[k] + v * c[k] - v * d[k]) / grid;
        dv[k] = (-(1 - u) * a[k] - u * b[k] + u * c[k] + (1 - u) * d[k]) / grid;
      }
      out.push(p[0], p[1], p[2], sigma * norm(cross(du, dv)));
    }
  }
  // a box centred at c with half sizes h, rotated by R (row-major 3x3), magnetisation M
  function boxCharges(c, h, R, M, grid, out) {
    function rot(v) { return [R[0] * v[0] + R[1] * v[1] + R[2] * v[2] + c[0], R[3] * v[0] + R[4] * v[1] + R[5] * v[2] + c[1], R[6] * v[0] + R[7] * v[1] + R[8] * v[2] + c[2]]; }
    function rotn(v) { return [R[0] * v[0] + R[1] * v[1] + R[2] * v[2], R[3] * v[0] + R[4] * v[1] + R[5] * v[2], R[6] * v[0] + R[7] * v[1] + R[8] * v[2]]; }
    for (var ax = 0; ax < 3; ax++) for (var s = -1; s <= 1; s += 2) {
      var o1 = (ax + 1) % 3, o2 = (ax + 2) % 3, n = [0, 0, 0]; n[ax] = s;
      var corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(function (pq) {
        var v = [0, 0, 0]; v[ax] = s * h[ax]; v[o1] = pq[0] * h[o1]; v[o2] = pq[1] * h[o2]; return rot(v);
      });
      if (s < 0) corners.reverse();
      faceCharges(corners[0], corners[1], corners[2], corners[3], rotn(n), M, grid, out);
    }
  }
  // a prism: polygon in the x-z plane (counter-clockwise), extruded from y = -hy to +hy, magnetisation M
  function prismCharges(poly, hy, M, grid, out) {
    for (var i = 0; i < poly.length; i++) {
      var p1 = poly[i], p2 = poly[(i + 1) % poly.length], tx = p2[0] - p1[0], tz = p2[1] - p1[1], L = Math.hypot(tx, tz) || 1;
      var n = [tz / L, 0, -tx / L];
      faceCharges([p1[0], -hy, p1[1]], [p2[0], -hy, p2[1]], [p2[0], hy, p2[1]], [p1[0], hy, p1[1]], n, M, grid, out);
    }
  }
  function dBzdz(ch, x, y, z) {
    var s = 0;
    for (var i = 0; i < ch.length; i += 4) {
      var dx = x - ch[i], dy = y - ch[i + 1], dz = z - ch[i + 2], R2 = dx * dx + dy * dy + dz * dz, R = Math.sqrt(R2), R3 = R2 * R;
      s += ch[i + 3] * (1 / R3 - 3 * dz * dz / (R3 * R2));
    }
    return MU * s;
  }
  // force (N) on a cube of side `side` (mm), magnetisation Mm (A/m, along z), centred at (0,0,zm)
  function forceOnCube(ch, side, Mm, zm, ng) {
    ng = ng || 3;
    var m = Mm * side * side * side / (ng * ng * ng), F = 0;
    for (var i = 0; i < ng; i++) for (var j = 0; j < ng; j++) for (var k = 0; k < ng; k++) {
      F += m * dBzdz(ch, ((i + 0.5) / ng - 0.5) * side, ((j + 0.5) / ng - 0.5) * side, zm + ((k + 0.5) / ng - 0.5) * side);
    }
    return F * 1e-6;
  }
  function agrr(curve, target) { var s = 0; curve.forEach(function (c) { s += Math.abs(target - c.F); }); return 100 * (1 - s / curve.length / target); }

  // ---------------------------------------------------------------------------------------------
  // Biggs, Kuo and Ren, ASME J. Mech. Des. 148 (2026) 033305: a reconfigurable Halbach cylinder.
  // Eight array magnets at azimuths 22.5 deg + 45 deg k, each magnetised at twice its azimuth (the
  // paper's Fig. 2a), give a uniform field B across the bore. The rotor magnet, dipole n along the
  // arm, feels tau = n B sin(theta), which cancels the gravity torque m g L sin(theta) of the
  // payload when n B = m g L. Re-setting (Fig. 2b, Eqs. 3 and 6): the array magnets sit in meshing
  // spur gears, so turning the lever turns alternate magnets by +phi and -phi; the field keeps its
  // direction and scales by cos(phi), and phi = acos(m g L / n Bmax) matches the payload.
  // ---------------------------------------------------------------------------------------------
  (function () {
    var svg = document.getElementById('halbach');
    if (!svg) return;
    var C = { x: 170, y: 128 }, L = 112, Rr = 86, rg = 33, rm = 17, n = 8, g = 1, Bmax = L;   // n Bmax = g L: full field carries M = 1
    var a3 = 0.04;                                                 // small ripple of a discrete ring (illustrative)
    var $ = function (id) { return svg.querySelector('#' + id); };
    var el = { outer: $('hOuter'), rotor: $('hRotor'), lever: $('hLever'), tG: $('hTG'), tM: $('hTM'), tN: $('hTN'), cursor: $('hCursor') };
    var M = 0.6, mode = 'set', phi = Math.acos(0.6), phiTarget = phi;
    function phiFor() { return mode === 'set' ? Math.acos(Math.min(1, M)) : mode === 'full' ? 0 : Math.PI / 2; }
    function B(p) { return Bmax * Math.cos(p); }
    function tauG(th) { return -M * g * L * Math.sin(th); }
    function tauM(th, p) { return n / n * B(p) * (Math.sin(th) + a3 * Math.sin(3 * th)); }

    function arcArrow(c, r, a0, a1, color) {
      var p0 = { x: c.x + r * Math.cos(a0), y: c.y + r * Math.sin(a0) }, p1 = { x: c.x + r * Math.cos(a1), y: c.y + r * Math.sin(a1) };
      var sweep = a1 > a0 ? 1 : 0, tx = -Math.sin(a1) * (a1 > a0 ? 1 : -1), ty = Math.cos(a1) * (a1 > a0 ? 1 : -1);
      return '<path d="M' + KD.pt(p0) + ' A' + r + ',' + r + ' 0 0 ' + sweep + ' ' + KD.pt(p1) + '" fill="none" stroke="' + color + '" stroke-width="1.3"/>' +
             KD.arrow({ x: p1.x - tx * 6, y: p1.y - ty * 6 }, { x: p1.x + tx * 0.5, y: p1.y + ty * 0.5 }, color, 1.3, 6);
    }
    function drawOuter(p) {
      var out = '', lever = '';
      for (var i = 0; i < n; i++) {
        var az = -Math.PI / 2 + Math.PI / 8 + i * Math.PI / 4;
        var c = { x: C.x + Rr * Math.cos(az), y: C.y + Rr * Math.sin(az) };
        var sgn = i % 2 ? -1 : 1, mag = 2 * az + Math.PI / 2 + sgn * p;
        var d = { x: Math.cos(mag), y: Math.sin(mag) };
        out += '<circle cx="' + f(c.x) + '" cy="' + f(c.y) + '" r="' + rg + '" fill="none" stroke="var(--fg)" stroke-width="1" stroke-dasharray="4 3"/>' +
               '<circle cx="' + f(c.x) + '" cy="' + f(c.y) + '" r="' + rm + '" fill="var(--mag-stator)" stroke="var(--fg)" stroke-width="1.2"/>' +
               KD.arrow({ x: c.x - 11 * d.x, y: c.y - 11 * d.y }, { x: c.x + 11 * d.x, y: c.y + 11 * d.y }, 'var(--mag-arrow)', 1.8, 7) +
               arcArrow(c, rg + 5, az + Math.PI - 0.5 * sgn, az + Math.PI + 0.5 * sgn, 'var(--cable)');
        if (i === 7) {   // the reconfiguration lever on the top-left gear, turning with it
          var la = -3 * Math.PI / 4 + sgn * p;
          lever = KD.link(c, { x: c.x + 42 * Math.cos(la), y: c.y + 42 * Math.sin(la) }, 3) + KD.joint(c, 3) +
                  KD.disc({ x: c.x + 42 * Math.cos(la), y: c.y + 42 * Math.sin(la) }, 3.5, 'var(--fg)') +
                  KD.note({ x: c.x - 44, y: c.y - 38 }, 'lever', { size: 9, anchor: 'start' });
        }
      }
      el.outer.innerHTML = out;
      el.lever.innerHTML = lever;
    }
    function drawRotor(th) {
      var end = { x: C.x + L * Math.sin(th), y: C.y - L * Math.cos(th) }, deg = th * 180 / Math.PI, r = 7 + 5 * Math.sqrt(M);
      el.rotor.innerHTML =
        '<g transform="rotate(' + f(deg + 45) + ' ' + C.x + ' ' + C.y + ')"><rect x="' + (C.x - 13) + '" y="' + (C.y - 13) + '" width="26" height="26" rx="2" fill="var(--mag-rotor)" stroke="var(--fg)" stroke-width="1.4"/></g>' +
        '<g transform="rotate(' + f(deg) + ' ' + C.x + ' ' + C.y + ')">' + KD.arrow({ x: C.x, y: C.y + 11 }, { x: C.x, y: C.y - 15 }, 'var(--mag-arrow-2)', 1.8, 7) + '</g>' +
        KD.body({ x: C.x + 16 * Math.sin(th), y: C.y - 16 * Math.cos(th) }, end, 4) + KD.joint(C, 3) +
        KD.com(end, r - 3.5) + KD.label({ x: end.x + r + 5, y: end.y + 4 }, 'M');
    }
    // torque chart over one turn
    var W = 260, H = 70, scale = 1.25 * g * L;
    function Y(t) { return H / 2 - t / scale * (H / 2); }
    function path(fn) { var d = '', N = 181; for (var i = 0; i < N; i++) { var th = -Math.PI + 2 * Math.PI * i / (N - 1); d += (i ? 'L' : 'M') + f(W * i / (N - 1)) + ',' + f(Y(fn(th))); } return d; }
    function rechart(p) {
      el.tG.setAttribute('d', path(tauG));
      el.tM.setAttribute('d', path(function (th) { return tauM(th, p); }));
      el.tN.setAttribute('d', path(function (th) { return tauG(th) + tauM(th, p); }));
    }
    var loadIn = document.getElementById('hbLoad'), loadOut = document.getElementById('hbLoadOut'), phiOut = document.getElementById('hbPhiOut'), msg = document.getElementById('hbMsg');
    function say() {
      if (phiOut) phiOut.value = Math.round(phi * 180 / Math.PI) + '°';
      if (!msg) return;
      var need = M * g * L, have = B(phi), diff = Math.abs(have - need) / need;
      if (mode === 'off') msg.textContent = 'Field off (ϕ = 90°): the arm falls under the load.';
      else if (Math.abs(phi - phiTarget) > 0.02) msg.textContent = 'Turning the lever…';
      else if (diff < 0.02) msg.textContent = 'Balanced: the lever is set so that n B cos ϕ = M g L.';
      else msg.textContent = (have > need ? 'Too much field for this load: the magnets overpower the weight.' : 'Too little field for this load: the weight wins.');
    }
    function apply() {
      M = loadIn ? parseFloat(loadIn.value) : 0.6;
      if (loadOut) loadOut.value = M.toFixed(2);
      phiTarget = phiFor(); say();
    }
    if (loadIn) loadIn.addEventListener('input', apply);
    radios('hbmode', function (v) { mode = v; apply(); });
    apply();
    var th = 0.7, last = null, omega = 0.5;
    loop(function (t) {
      var dt = 0;
      if (t !== undefined) { if (last !== null) dt = Math.min(0.05, (t - last) / 1000); last = t; }
      th += omega * dt;
      var moving = Math.abs(phi - phiTarget) > 0.002;
      if (moving) { phi = ease(phi, phiTarget, dt, 3); if (Math.abs(phi - phiTarget) <= 0.002) { phi = phiTarget; say(); } }
      drawOuter(phi); drawRotor(th); rechart(phi);
      var tt = ((th + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      el.cursor.setAttribute('x1', f(W * tt / (2 * Math.PI))); el.cursor.setAttribute('x2', f(W * tt / (2 * Math.PI)));
    });
  })();

  // ---------------------------------------------------------------------------------------------
  // Zeng, Li, Kuo and Sariyildiz, IEEE/ASME Trans. Mechatronics 31 (2026) 2575: passive levitation
  // over a long vertical range with two magnets. A cubic mover (dm = 5 mm, N50) rides on a rod above a
  // cubic stator (ds = 30 mm, N38) with a concave profile cut into its top; both are magnetised
  // upwards, so the two halves of the stator repel the mover from below. The profile is chosen so that
  // the lifting force stays close to the 2 N load (200 times the mover's weight) over 15 mm of travel
  // (three times the mover's side). Combined linear profile (the paper's Table III): k = 3.5,
  // b = -4 mm, c = 5 mm after optimisation (93 % average gravity reduction); k = 5, b = -10, c = 1
  // before (75 %); the quadratic profile a2 = 0.361 /mm, a0 = 7.4 mm reaches 65 % (Table II).
  // ---------------------------------------------------------------------------------------------
  (function () {
    var svg = document.getElementById('levit');
    if (!svg) return;
    var ds = 30, dm = 5, Ms = 994e3, Mm = 1135e3, h = ds / 2, load = 2, zMin = 15, zMax = 30;
    var S = 4.4, X = function (x) { return 170 + S * x; }, Yy = function (z) { return 236 - S * z; };
    var $ = function (id) { return svg.querySelector('#' + id); };
    var el = { stator: $('lStator'), mover: $('lMover'), cG: $('lG'), cM: $('lM'), cN: $('lN'), cursor: $('lCursor') };
    var profiles = {
      clp: { name: 'optimised V profile', poly: function () { return clp(3.5, -4, 5); }, floor: 5 },
      before: { name: 'initial guess', poly: function () { return clp(5, -10, 1); }, floor: 1 },
      qpp: { name: 'parabolic profile', poly: function () { return qpp(0.361, 7.4); }, floor: 7.4 }
    };
    function clp(k, b, c) { var xs = (c - b) / k, xt = (ds - b) / k; return [[-h, 0], [h, 0], [h, ds], [xt, ds], [xs, c], [-xs, c], [-xt, ds], [-h, ds]]; }
    function qpp(a2, a0) { var xt = Math.sqrt((ds - a0) / a2), out = [[-h, 0], [h, 0], [h, ds]]; for (var i = 0; i <= 12; i++) { var x = xt - 2 * xt * i / 12; out.push([x, a2 * x * x + a0]); } out.push([-h, ds]); return out; }
    var cache = {};
    function curveFor(key) {
      if (cache[key]) return cache[key];
      var ch = []; prismCharges(profiles[key].poly(), h, [0, 0, Ms], 16, ch);
      var cv = []; for (var z = zMin - 2; z <= zMax + 2; z += 0.5) cv.push({ z: z, F: forceOnCube(ch, dm, Mm, z, 3) });
      var inRange = cv.filter(function (c) { return c.z >= zMin && c.z <= zMax; });
      cache[key] = { curve: cv, agrr: agrr(inRange, load) };
      return cache[key];
    }
    function Fat(cv, z) {
      for (var i = 1; i < cv.length; i++) if (cv[i].z >= z) { var a = cv[i - 1], b = cv[i]; return a.F + (b.F - a.F) * (z - a.z) / (b.z - a.z); }
      return cv[cv.length - 1].F;
    }
    var key = 'clp', on = true;
    function drawStator() {
      var poly = profiles[key].poly(), d = poly.map(function (p, i) { return (i ? 'L' : 'M') + f(X(p[0])) + ',' + f(Yy(p[1])); }).join('') + 'Z';
      var arrows = '';
      function gc(x) { // profile height at x
        var p = profiles[key].poly(); var top = p.slice(3, p.length - 1).concat([]);   // the cavity points, right to left
        var pts = [[h, ds]].concat(top, [[-h, ds]]);
        for (var i = 1; i < pts.length; i++) { var a = pts[i - 1], b = pts[i]; if ((x <= a[0] && x >= b[0])) return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0] || 1e-9); }
        return ds;
      }
      if (on) for (var x = -13; x <= 13; x += 4.33) for (var z = 3.5; z < ds; z += 5.5) {
        if (z + 2.2 < gc(x) - 0.5) arrows += KD.arrow({ x: X(x), y: Yy(z - 1.8) }, { x: X(x), y: Yy(z + 1.8) }, 'var(--mag-arrow)', 1.3, 5);
      }
      el.stator.innerHTML = '<path d="' + d + '" fill="' + (on ? 'var(--mag-stator)' : 'var(--bg-2)') + '" stroke="var(--fg)" stroke-width="1.4" stroke-linejoin="round"/>' + arrows +
        // ground under the stator, and the cap with its slide bush on top
        KD.wall({ x: X(-h) - 10, y: Yy(0) }, { x: X(h) + 10, y: Yy(0) }, 1) +
        '<rect x="' + f(X(-h)) + '" y="' + f(Yy(ds + 1.6)) + '" width="' + f(2 * h * S) + '" height="' + f(1.6 * S) + '" fill="var(--card)" stroke="var(--fg)" stroke-width="1.2"/>' +
        '<rect x="' + f(X(-2.2)) + '" y="' + f(Yy(ds + 5)) + '" width="' + f(4.4 * S) + '" height="' + f(3.4 * S) + '" fill="var(--card)" stroke="var(--fg)" stroke-width="1.2"/>' +
        KD.note({ x: X(h) + 14, y: Yy(ds + 2.5) }, 'cap', { size: 9 });
    }
    function drawMover(z) {
      var top = z + dm / 2, rodTop = z + 20, c = { x: X(0), y: Yy(z) }, half = dm / 2 * S;
      el.mover.innerHTML =
        KD.link({ x: X(0), y: Yy(top) }, { x: X(0), y: Yy(rodTop) }, 2.4) +
        '<rect x="' + f(c.x - half) + '" y="' + f(c.y - half) + '" width="' + f(2 * half) + '" height="' + f(2 * half) + '" fill="var(--mag-rotor)" stroke="var(--fg)" stroke-width="1.3"/>' +
        KD.arrow({ x: c.x, y: c.y + half * 0.6 }, { x: c.x, y: c.y - half * 0.6 }, 'var(--mag-arrow-2)', 1.6, 6) +
        KD.mass({ x: X(0), y: Yy(rodTop) - 8 }, 8, 'M') +
        KD.label({ x: X(0) + 12, y: Yy(rodTop) - 6 }, '2 N', { size: 9 });
    }
    var W = 260, H = 70, lo = 0, hi = 3.6;
    function rechart() {
      var cv = curveFor(key).curve;
      el.cG.setAttribute('d', 'M0,' + f(H - (load - lo) / (hi - lo) * H) + 'L' + W + ',' + f(H - (load - lo) / (hi - lo) * H));
      el.cM.setAttribute('d', chartPath(W, H, zMin, zMax, lo, hi, function (z) { return on ? Fat(cv, z) : 0; }, 61));
      el.cN.setAttribute('d', chartPath(W, H, zMin, zMax, lo, hi, function (z) { return (on ? Fat(cv, z) : 0) - load + (hi + lo) / 2 - 0.2; }, 61));
    }
    var onIn = document.getElementById('lvOn'), msg = document.getElementById('lvMsg'), aOut = document.getElementById('lvAgrr');
    function say(z) {
      if (!msg) return;
      var cv = curveFor(key);
      if (aOut) aOut.value = on ? Math.round(cv.agrr) + ' %' : '–';
      msg.textContent = on ? 'At z = ' + z.toFixed(0) + ' mm the stator lifts ' + Fat(cv.curve, z).toFixed(2) + ' N of the 2 N load (' + profiles[key].name + ', average gravity reduction ' + Math.round(cv.agrr) + ' %).'
                           : 'Stator off: the mover rests on the bottom of the cavity.';
    }
    function apply() { drawStator(); rechart(); }
    radios('lvprofile', function (v) { key = v; apply(); });
    if (onIn) onIn.addEventListener('change', function () { on = onIn.checked; apply(); });
    apply();
    var z = 22, last = null, tt = 0, lastSaid = -1;
    loop(function (t) {
      var dt = 0;
      if (t !== undefined) { if (last !== null) dt = Math.min(0.05, (t - last) / 1000); last = t; }
      if (on) { tt += dt; var target = (zMin + zMax) / 2 + (zMax - zMin) / 2 * Math.sin(tt * 0.5); z = ease(z, target, dt, 4); }
      else z = ease(z, profiles[key].floor + dm / 2, dt, 2.5);
      drawMover(z);
      var frac = Math.max(0, Math.min(1, (z - zMin) / (zMax - zMin)));
      el.cursor.setAttribute('x1', f(W * frac)); el.cursor.setAttribute('x2', f(W * frac));
      if (Math.abs(z - lastSaid) > 0.5) { lastSaid = z; say(z); }
    });
  })();

  // ---------------------------------------------------------------------------------------------
  // Zeng, Kuo and Sariyildiz, Mech. Mach. Theory 209 (2025) 105990: a permanent-magnet array for
  // gravity compensation over a long stroke. A cubic mover (s = 10 mm, M = 1.05e6 A/m, magnetised up)
  // on a slider moves between four columns of five stator cubes, symmetric about the x-z and y-z
  // planes, spaced d = 15 mm in z. Each stator cube is magnetised along its own x-axis after a
  // pitch theta (about y) and a yaw phi (about z), R = Ry(theta) Rz(phi). Example I (Table 3):
  // the optimised design lifts 1.5 N (20 times the mover's weight) over +-30 mm with 92.3 % average
  // gravity reduction; the earlier trial-and-error design reached 86.2 %.
  // ---------------------------------------------------------------------------------------------
  (function () {
    var svg = document.getElementById('array');
    if (!svg) return;
    var s = 10, Mg = 1.05e6, d = 15, zA = 30, load = 1.5;
    var S = 2.4, X = function (x) { return 170 + S * x; }, Yy = function (z) { return 140 - S * z; };
    var $ = function (id) { return svg.querySelector('#' + id); };
    var el = { stator: $('aStator'), mover: $('aMover'), cG: $('aG'), cM: $('aM'), cN: $('aN'), cursor: $('aCursor') };
    var designs = {
      opt: { name: 'optimised design', agrrPaper: 92.3, rows: [[17.51, 15.07, 0.20, 3.14], [17.51, 15.01, 0.19, 3.17], [17.51, 15.02, 0.00, 3.15], [17.50, 15.06, 6.09, 3.14], [17.46, 15.00, 6.05, 3.14]] },
      trial: { name: 'trial-and-error design', agrrPaper: 86.2, rows: [[16, 16, 3.32, 0], [16, 16, 3.32, 0], [16, 16, 3.14, 0], [16, 16, 2.97, 0], [16, 16, 2.97, 0]] }
    };
    function Rmat(th, ph) {  // Ry(theta) Rz(phi), row-major
      var ct = Math.cos(th), st = Math.sin(th), cp = Math.cos(ph), sp = Math.sin(ph);
      return [ct * cp, -ct * sp, st, sp, cp, 0, -st * cp, st * sp, ct];
    }
    var cache = {};
    function curveFor(key) {
      if (cache[key]) return cache[key];
      var ch = [];
      designs[key].rows.forEach(function (r, k) {
        var R = Rmat(r[2], r[3]), m = [R[0] * Mg, R[3] * Mg, R[6] * Mg], z = (k - 2) * d;
        boxCharges([r[0], r[1], z], [s / 2, s / 2, s / 2], R, m, 6, ch);
      });
      var n = ch.length, mir = [[-1, 1], [1, -1], [-1, -1]];
      for (var q = 0; q < 3; q++) for (var i = 0; i < n; i += 4) ch.push(ch[i] * mir[q][0], ch[i + 1] * mir[q][1], ch[i + 2], ch[i + 3]);
      var cv = []; for (var z = -zA; z <= zA; z += 1) cv.push({ z: z, F: forceOnCube(ch, s, Mg, z, 3) });
      cache[key] = { curve: cv, agrr: agrr(cv, load) };
      return cache[key];
    }
    function Fat(cv, z) {
      for (var i = 1; i < cv.length; i++) if (cv[i].z >= z) { var a = cv[i - 1], b = cv[i]; return a.F + (b.F - a.F) * (z - a.z) / (b.z - a.z); }
      return cv[cv.length - 1].F;
    }
    var key = 'opt', on = true;
    function drawStator() {
      var out = '';
      // the frame: two columns (each stands for the pair at +-y), the base, and the top rail
      [-1, 1].forEach(function (side) {
        var cx = X(side * 17.5);
        out += '<rect x="' + f(cx - 8 * S) + '" y="' + f(Yy(40)) + '" width="' + f(16 * S) + '" height="' + f(80 * S) + '" fill="var(--card)" stroke="var(--fg)" stroke-width="1.4"/>';
      });
      out += KD.wall({ x: X(-32), y: Yy(-40) }, { x: X(32), y: Yy(-40) }, 1);
      if (on) designs[key].rows.forEach(function (r, k) {
        var R = Rmat(r[2], r[3]), mx = R[0], mz = R[6], z = (k - 2) * d;
        [1, -1].forEach(function (side) {
          var sx = side * mx, sy = -mz, deg = Math.atan2(sx, -sy) * 180 / Math.PI;
          out += KD.magnet({ x: X(side * r[0]), y: Yy(z) }, s * S, s * S, deg, 'var(--mag-stator)', 'var(--mag-arrow)');
        });
      });
      el.stator.innerHTML = out;
    }
    function drawMover(z) {
      var c = { x: X(0), y: Yy(z) }, plate = z + 13;
      el.mover.innerHTML =
        KD.link({ x: X(0), y: Yy(z + s / 2) }, { x: X(0), y: Yy(plate) }, 2.4) +
        '<rect x="' + f(X(-9)) + '" y="' + f(Yy(plate + 1.5)) + '" width="' + f(18 * S) + '" height="' + f(3 * S) + '" fill="var(--card)" stroke="var(--fg)" stroke-width="1.3"/>' +
        KD.magnet(c, s * S, s * S, 0, 'var(--mag-rotor)', 'var(--mag-arrow-2)') +
        KD.mass({ x: X(0), y: Yy(plate + 1.5) - 9 }, 9, 'M') + KD.label({ x: X(0) + 13, y: Yy(plate + 1.5) - 7 }, '1.5 N', { size: 9 });
    }
    var W = 260, H = 70, lo = 0, hi = 2.6;
    function rechart() {
      var cv = curveFor(key).curve, yl = f(H - (load - lo) / (hi - lo) * H);
      el.cG.setAttribute('d', 'M0,' + yl + 'L' + W + ',' + yl);
      el.cM.setAttribute('d', chartPath(W, H, -zA, zA, lo, hi, function (z) { return on ? Fat(cv, z) : 0; }, 61));
      el.cN.setAttribute('d', chartPath(W, H, -zA, zA, lo, hi, function (z) { return (on ? Fat(cv, z) : 0) - load + 1.1; }, 61));
    }
    var onIn = document.getElementById('arOn'), msg = document.getElementById('arMsg'), aOut = document.getElementById('arAgrr');
    function say(z) {
      if (!msg) return;
      var cv = curveFor(key);
      if (aOut) aOut.value = on ? Math.round(cv.agrr) + ' %' : '–';
      msg.textContent = on ? 'At z = ' + (z >= 0 ? '+' : '') + z.toFixed(0) + ' mm the array lifts ' + Fat(cv.curve, z).toFixed(2) + ' N of the 1.5 N load (' + designs[key].name + ': average gravity reduction ' + Math.round(cv.agrr) + ' % in this model, ' + designs[key].agrrPaper.toFixed(1) + ' % in the paper).'
                           : 'Magnets off: the slider drops to the base.';
    }
    function apply() { drawStator(); rechart(); }
    radios('armode', function (v) { key = v; apply(); });
    if (onIn) onIn.addEventListener('change', function () { on = onIn.checked; apply(); });
    apply();
    var z = 0, last = null, tt = 0, lastSaid = -99;
    loop(function (t) {
      var dt = 0;
      if (t !== undefined) { if (last !== null) dt = Math.min(0.05, (t - last) / 1000); last = t; }
      if (on) { tt += dt; z = ease(z, zA * Math.sin(tt * 0.45), dt, 4); } else z = ease(z, -34, dt, 2.5);
      drawMover(z);
      var frac = Math.max(0, Math.min(1, (z + zA) / (2 * zA)));
      el.cursor.setAttribute('x1', f(W * frac)); el.cursor.setAttribute('x2', f(W * frac));
      if (Math.abs(z - lastSaid) > 1) { lastSaid = z; say(z); }
    });
  })();

  // ---------------------------------------------------------------------------------------------
  // Zeng, Kuo and Sariyildiz, IEEE Trans. Magn. 60 (2024) 7001717: the force between two magnets of
  // any shape by Monte Carlo integration. The force is a six-dimensional integral of the dipole-dipole
  // force over the two volumes. Random points are thrown into a box around each magnet; a pair that
  // lands inside both magnets contributes the dipole force between its two points, and the average
  // times the box volumes converges to the force (the paper's Eq. 29). Example 1: a truncated-cone
  // magnet (radius 20 - z/4 mm, 0 <= z <= 40) and a triangular-prism magnet (equilateral, 40 mm high)
  // at height zB, both magnetised along z at 900 kA/m; zB from 80 to 160 mm.
  // ---------------------------------------------------------------------------------------------
  (function () {
    var svg = document.getElementById('mc');
    if (!svg) return;
    var Mz = 9e5, mu = 4e-7 * Math.PI;
    var S = 1.15, X = function (x) { return 150 + S * x; }, Yy = function (z) { return 240 - S * z; };
    var $ = function (id) { return svg.querySelector('#' + id); };
    var el = { bodies: $('mBodies'), dots: $('mDots'), est: $('mEst'), ref: $('mRef'), cursor: $('mCursor') };
    var zB = 100, n = 0, m = 0, sum = 0, hist = [], dots = [], refF = 0;
    var VI = 40 * 40 * 40, VJ = 40 * 30 * 40;                       // sampling boxes (mm^3)
    function inCone(p) { var r = 20 - p[2] / 4; return p[2] >= 0 && p[2] <= 40 && p[0] * p[0] + p[1] * p[1] <= r * r; }
    function inPrism(p, zb) { return Math.abs(p[2] - zb) <= 20 && p[1] >= -20 && p[1] <= 10 && (-p[1] + Math.sqrt(3) * p[0] <= 20) && (-p[1] - Math.sqrt(3) * p[0] <= 20); }
    function fz(a, b) {   // z-force on dipole density at b due to dipole density at a, both along z (per unit volume pair, SI)
      var dx = (b[0] - a[0]) * 1e-3, dy = (b[1] - a[1]) * 1e-3, dz = (b[2] - a[2]) * 1e-3, r2 = dx * dx + dy * dy + dz * dz, r = Math.sqrt(r2);
      return (3 * mu * Mz * Mz / (4 * Math.PI * r2 * r2 * r)) * (3 * dz - 5 * dz * dz * dz / r2);
    }
    function sample(zb, count, keep) {
      for (var i = 0; i < count; i++) {
        var a = [-20 + 40 * Math.random(), -20 + 40 * Math.random(), 40 * Math.random()];
        var b = [-20 + 40 * Math.random(), -20 + 30 * Math.random(), zb - 20 + 40 * Math.random()];
        var ia = inCone(a), ib = inPrism(b, zb);
        n++;
        if (ia && ib) { m++; sum += fz(a, b); }
        if (keep) dots.push([a[0], a[2], ia ? 1 : 0], [b[0], b[2], ib ? 2 : 0]);
      }
    }
    function estimate() { return n ? sum / n * VI * VJ * 1e-18 : 0; }
    function reference(zb) {
      var sn = n, sm = m, ss = sum; n = 0; m = 0; sum = 0;
      sample(zb, 60000, false); var F = estimate();
      n = sn; m = sm; sum = ss; return F;
    }
    function drawBodies() {
      var cone = [[-20, 0], [20, 0], [10, 40], [-10, 40]], w = 20 / Math.sqrt(3) * 1.5;   // prism silhouette half-width at y = 10
      el.bodies.innerHTML =
        KD.wall({ x: X(-34), y: Yy(0) }, { x: X(34), y: Yy(0) }, 1) +
        '<rect x="' + f(X(-20)) + '" y="' + f(Yy(40)) + '" width="' + f(40 * S) + '" height="' + f(40 * S) + '" fill="none" stroke="var(--fg)" stroke-width="1" stroke-dasharray="3 3"/>' +
        '<rect x="' + f(X(-20)) + '" y="' + f(Yy(zB + 20)) + '" width="' + f(40 * S) + '" height="' + f(40 * S) + '" fill="none" stroke="var(--fg)" stroke-width="1" stroke-dasharray="3 3"/>' +
        '<polygon points="' + cone.map(function (p) { return f(X(p[0])) + ',' + f(Yy(p[1])); }).join(' ') + '" fill="var(--mag-stator)" stroke="var(--fg)" stroke-width="1.3"/>' +
        '<rect x="' + f(X(-w)) + '" y="' + f(Yy(zB + 20)) + '" width="' + f(2 * w * S) + '" height="' + f(40 * S) + '" fill="var(--mag-rotor)" stroke="var(--fg)" stroke-width="1.3"/>' +
        KD.arrow({ x: X(0), y: Yy(10) }, { x: X(0), y: Yy(30) }, 'var(--mag-arrow)', 1.8, 7) +
        KD.arrow({ x: X(0), y: Yy(zB - 10) }, { x: X(0), y: Yy(zB + 10) }, 'var(--mag-arrow-2)', 1.8, 7) +
        KD.label({ x: X(26), y: Yy(16) }, 'I', { size: 12 }) + KD.label({ x: X(26), y: Yy(zB - 4) }, 'J', { size: 12 }) +
        '<line x1="' + f(X(-30)) + '" y1="' + f(Yy(zB)) + '" x2="' + f(X(-20)) + '" y2="' + f(Yy(zB)) + '" stroke="var(--fg)" stroke-width="1" stroke-dasharray="2 2"/>' +
        KD.label({ x: X(-34), y: Yy(zB) + 4 }, 'z', { size: 11, anchor: 'end', sub: 'B' }) +
        KD.note({ x: X(26), y: Yy(zB + 18) }, 'sampling box', { size: 8 }) + KD.note({ x: X(26), y: Yy(38) }, 'sampling box', { size: 8 });
    }
    function drawDots() {
      if (dots.length > 700) dots.splice(0, dots.length - 700);
      var out = '';
      for (var i = 0; i < dots.length; i++) {
        var p = dots[i], col = p[2] === 1 ? 'var(--mag-arrow)' : p[2] === 2 ? 'var(--mag-arrow-2)' : 'var(--pin)';
        out += '<circle cx="' + f(X(p[0])) + '" cy="' + f(Yy(p[1])) + '" r="' + (p[2] ? 1.4 : 0.9) + '" fill="' + col + '" opacity="' + (p[2] ? 0.9 : 0.45) + '"/>';
      }
      el.dots.innerHTML = out;
    }
    // convergence chart: estimate against the number of samples (log axis from 100 to 100 000)
    var W = 260, H = 70, nMin = 100, nMax = 1e5;
    function xOf(k) { return W * Math.log(k / nMin) / Math.log(nMax / nMin); }
    function yOf(F) { var lo = refF * 1.6, hi = refF * 0.4; return H - (F - lo) / (hi - lo) * H; }   // forces are negative (attraction)
    function rechart() {
      var pts = hist.filter(function (p) { return p[0] >= nMin; });
      el.est.setAttribute('d', pts.map(function (p, i) { return (i ? 'L' : 'M') + f(xOf(p[0])) + ',' + f(Math.max(-5, Math.min(H + 5, yOf(p[1])))); }).join(''));
      el.ref.setAttribute('d', 'M0,' + f(yOf(refF)) + 'L' + W + ',' + f(yOf(refF)));
      var x = xOf(Math.max(nMin, Math.min(nMax, n)));
      el.cursor.setAttribute('x1', f(x)); el.cursor.setAttribute('x2', f(x));
    }
    var zIn = document.getElementById('mcZ'), zOut = document.getElementById('mcZOut'), msg = document.getElementById('mcMsg'), restart = document.getElementById('mcRestart');
    function reset() {
      zB = zIn ? parseFloat(zIn.value) : 100;
      if (zOut) zOut.value = zB.toFixed(0) + ' mm';
      n = 0; m = 0; sum = 0; hist = []; dots = [];
      refF = reference(zB);
      drawBodies(); rechart();
    }
    if (zIn) zIn.addEventListener('input', reset);
    if (restart) restart.addEventListener('click', reset);
    reset();
    function say() {
      if (!msg) return;
      var F = estimate(), err = refF ? Math.abs((F - refF) / refF) * 100 : 0;
      msg.textContent = n.toLocaleString() + ' pairs thrown, ' + m.toLocaleString() + ' landed in both magnets: F = ' + F.toFixed(2) + ' N' +
        (n >= nMin ? ' (reference ' + refF.toFixed(2) + ' N, ' + err.toFixed(1) + ' % off).' : '.');
    }
    var acc = 0;
    loop(function (t) {
      if (n < nMax) {
        var batch = n < 2000 ? 25 : n < 20000 ? 150 : 600;
        sample(zB, batch, n < 20000);
        hist.push([n, estimate()]);
        drawDots(); rechart(); say();
      } else if (!reduce) {
        acc++; if (acc > 240) { acc = 0; reset(); }
      }
    });
  })();
})();
