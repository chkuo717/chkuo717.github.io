// Animations for the reconfigurable-mechanism paper pages. Drawing through draw.js (KD) and the
// isometric helper ISO from parallel.js (loaded first on these pages).
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var f = KD.f, ISO = window.ISO;
  function loop(tick) { tick(); if (!reduce) requestAnimationFrame(function step(t) { tick(t); requestAnimationFrame(step); }); }
  function clamp01(x) { return Math.max(0, Math.min(1, x)); }
  function smooth(x) { x = clamp01(x); return x * x * (3 - 2 * x); }
  // continue a one-variable root from the previous solution (keeps the branch)
  function cont(fn, prev, span) {
    var lo = prev - span, hi = prev + span, n = 60, a = lo, fa = fn(lo), best = null;
    for (var i = 1; i <= n; i++) { var b = lo + (hi - lo) * i / n, fb = fn(b); if (fa === 0 || fa * fb < 0) { best = [a, b]; if (Math.abs((a + b) / 2 - prev) < span / 2) break; } a = b; fa = fb; }
    if (!best) return prev;
    a = best[0]; var bb = best[1];
    for (var k = 0; k < 40; k++) { var m = (a + bb) / 2; if (fn(a) * fn(m) <= 0) bb = m; else a = m; }
    return (a + bb) / 2;
  }

  // ---------------------------------------------------------------------------------------------
  // Kuo and Su, Mech. Mach. Theory 107 (2017) 369: the reconfigurable cube mechanism, a loop of
  // eight hinged sub-cubes (a single-loop 8R spatial linkage) with eight topological configurations.
  // Shown here: the fold that takes the 2x2x2 cube (configuration A) to the 1x2x4 slab (C) and on to
  // another cube. Each fold turns one half of the loop about two hinges that are momentarily coaxial;
  // at other instants those hinges are not aligned and the loop's mobility is different, which is the
  // changeable mobility the paper analyses with screw theory.
  // ---------------------------------------------------------------------------------------------
  (function () {
    var svg = document.getElementById('rcm');
    if (!svg) return;
    var P = ISO.make(170, 150, 30), g = svg.querySelector('#rBody'), msg = document.getElementById('rcMsg'), lbl = document.getElementById('rcState');
    // eight unit cubes by their min corners, in the cube configuration; the loop runs 1..8
    var cubes = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 0, 1], [0, 0, 1]];
    function cubeFaces(c, R, O) {   // returns faces (arrays of 4 points) of a unit cube at c after rotation R about point O
      function T(p) { return ISO.add(O, ISO.apply(R, ISO.add(p, O, -1))); }
      var v = []; for (var i = 0; i < 8; i++) v.push(T([c[0] + (i & 1), c[1] + ((i >> 1) & 1), c[2] + ((i >> 2) & 1)]));
      var idx = [[0, 1, 3, 2], [4, 5, 7, 6], [0, 1, 5, 4], [2, 3, 7, 6], [0, 2, 6, 4], [1, 3, 7, 5]];
      return idx.map(function (q) { return q.map(function (i) { return v[i]; }); });
    }
    function depth(face) { var s = 0; face.forEach(function (p) { s += p[0] + p[1] + p[2]; }); return s / 4; }
    // phases: 0 cube A; 1 top half (cubes with z=1) folds 180 deg about the hinge line x=0,z=1 to the left
    //         -> slab; 2 the far half of the slab folds 180 deg about y=... to make a cube again
    function draw(phase, u) {
      // fold 1: the top half (z = 1) turns about the line x = 0, z = 1 (y direction); fold 2: the same half,
      // now lying at x < 0, turns about the line x = 0, z = 0 and swings under the other half
      var a1 = phase === 0 ? 0 : phase === 1 ? Math.PI * smooth(u) : Math.PI, a2 = phase < 2 ? 0 : phase === 2 ? Math.PI * smooth(u) : Math.PI;
      var R1 = ISO.rotvec([0, -a1, 0]), R2 = ISO.rotvec([0, -a2, 0]), faces = [];
      cubes.forEach(function (c, i) {
        var pre = cubeFaces(c, [1, 0, 0, 0, 1, 0, 0, 0, 1], [0, 0, 0]);
        if (c[2] === 1) pre = pre.map(function (face) { return face.map(function (p) { var q = ISO.add([0, 0, 1], ISO.apply(R1, ISO.add(p, [0, 0, 1], -1))); return ISO.apply(R2, q); }); });
        pre.forEach(function (face) { faces.push({ pts: face, d: depth(face), cube: i }); });
      });
      faces.sort(function (a, b) { return a.d - b.d; });
      var out = '';
      faces.forEach(function (fc) {
        var fill = fc.cube === 0 ? 'var(--mag-stator)' : 'var(--card)';
        out += ISO.poly(P, fc.pts, 'fill="' + fill + '" stroke="var(--fg)" stroke-width="1.2" stroke-linejoin="round"');
      });
      // hinge line of the current fold
      if (phase === 1) out += ISO.seg(P, [0, -0.4, 1], [0, 2.4, 1], 'stroke="var(--red)" stroke-width="1.5" stroke-dasharray="5 3"');
      if (phase === 2) out += ISO.seg(P, [0, -0.4, 0], [0, 2.4, 0], 'stroke="var(--red)" stroke-width="1.5" stroke-dasharray="5 3"');
      g.innerHTML = out;
      var names = ['cube (configuration A)', 'folding about the coaxial hinge pair: cube → slab', 'slab (configuration C): folding the far half back', 'cube again, a different configuration'];
      if (lbl) lbl.textContent = names[phase];
      if (msg) msg.textContent = phase === 1 || phase === 2 ? 'Two of the eight hinges are coaxial at this moment, so the loop has one mobility: a rigid fold of one half.' : 'All eight hinge axes in general position: the loop is stiff until the next coaxial pair is reached.';
    }
    var t0 = null;
    loop(function (t) {
      var s = t === undefined ? 0 : ((t0 === null ? (t0 = t) : t0), (t - t0) / 1000);
      var T = s % 12, phase, u;
      if (T < 1.5) { phase = 0; u = 0; } else if (T < 5) { phase = 1; u = (T - 1.5) / 3.5; } else if (T < 6.5) { phase = 1; u = 1; } else if (T < 10) { phase = 2; u = (T - 6.5) / 3.5; } else { phase = 3; u = 1; }
      draw(phase, u);
    });
  })();

  // ---------------------------------------------------------------------------------------------
  // Kuo and Chang, ASME J. Mech. Robot. 6 (2014) 021002: structure decomposition of planar variable
  // topology mechanisms. Example: the automatic steel clamping and sawing mechanism, seven links and
  // eight joints (constraint matrix Eq. 1): R 1-2, P 1-5, R 1-7, R 2-3, R 3-4, R 4-5, R 4-6, R 6-7.
  // Topology states: (b) clamping, the payload holds the saw arm 2 to the ground, mobility 1;
  // (c) clamped, the clamp arm 7 is stopped by the steel, links 3-4-5-6 form a structure, mobility 0;
  // (d) sawing, more input force lifts 2 off its rest and the saw moves, 7 staying fixed, mobility 1.
  // Geometry here is schematic; the topology and the sequence are the paper's.
  // ---------------------------------------------------------------------------------------------
  (function () {
    var svg = document.getElementById('vtm');
    if (!svg) return;
    var g = svg.querySelector('#vBody'), graph = svg.querySelector('#vGraph'), msg = document.getElementById('vtMsg'), lbl = document.getElementById('vtState');
    var O2 = { x: 270, y: 190 }, O7 = { x: 70, y: 190 }, r2 = 50, r7 = 50, l3 = 60, l6 = 60, a = 50, xs = 170;
    var p4 = 0, p2 = Math.PI, p7 = 0, p7lim = 0.62, p2end = Math.PI + 0.38;
    function J45(y) { return { x: xs, y: y }; }
    function J34(y, p) { return { x: xs + a * Math.cos(p), y: y + a * Math.sin(p) }; }
    function J46(y, p) { return { x: xs - a * Math.cos(p), y: y - a * Math.sin(p) }; }
    function J23(p) { return { x: O2.x + r2 * Math.cos(p), y: O2.y + r2 * Math.sin(p) }; }
    function J67(p) { return { x: O7.x + r7 * Math.cos(p), y: O7.y + r7 * Math.sin(p) }; }
    function dist(A, B) { return Math.hypot(A.x - B.x, A.y - B.y); }
    var stage = 'b', y = 130, dir = 1;
    function step(dt) {
      if (stage === 'b') {
        y += 18 * dt;
        p4 = cont(function (p) { return dist(J34(y, p), J23(p2)) - l3; }, p4, 0.4);
        p7 = cont(function (p) { return dist(J46(y, p4), J67(p)) - l6; }, p7, 0.4);
        if (p7 >= p7lim) { p7 = p7lim; stage = 'c'; hold = 0; }
      } else if (stage === 'c') {
        hold += dt; if (hold > 1.6) stage = 'd';
      } else if (stage === 'd') {
        y += 18 * dt;
        p4 = cont(function (p) { return dist(J46(y, p), J67(p7)) - l6; }, p4, 0.4);
        p2 = cont(function (p) { return dist(J34(y, p4), J23(p)) - l3; }, p2, 0.4);
        if (p2 >= p2end) { stage = 'e'; hold = 0; }
      } else if (stage === 'e') {
        hold += dt; if (hold > 1.4) { stage = 'r'; }
      } else {   // return to the start along the same path, quickly
        y -= 40 * dt;
        if (p2 > Math.PI + 0.01) { p4 = cont(function (p) { return dist(J46(y, p), J67(p7)) - l6; }, p4, 0.4); p2 = Math.max(Math.PI, cont(function (p) { return dist(J34(y, p4), J23(p)) - l3; }, p2, 0.4)); }
        else { p2 = Math.PI; p4 = cont(function (p) { return dist(J34(y, p), J23(p2)) - l3; }, p4, 0.4); p7 = cont(function (p) { return dist(J46(y, p4), J67(p)) - l6; }, p7, 0.4); }
        if (y <= 130) { y = 130; p4 = 0; p7 = 0; p2 = Math.PI; stage = 'b'; }
      }
    }
    var hold = 0;
    function draw() {
      var A = J45(y), B = J34(y, p4), C = J46(y, p4), D = J23(p2), E = J67(p7);
      var steel = { x: 170, y: 232 };
      var out = KD.wall({ x: 30, y: 250 }, { x: 310, y: 250 }, 1) +
        // the steel bar
        '<rect x="' + (steel.x - 60) + '" y="' + (steel.y - 8) + '" width="120" height="16" fill="var(--pin)" stroke="var(--fg)" stroke-width="1.2"/>' + KD.note({ x: steel.x, y: steel.y + 4 }, 'steel', { size: 8, anchor: 'middle', fill: '#fff' }) +
        // slider guide for link 5
        KD.wall({ x: xs + 10, y: 60 }, { x: xs + 10, y: 150 }, -1) + KD.slider(A, 12, 9, 0) +
        KD.arrow({ x: xs, y: 40 }, { x: xs, y: 62 }, 'var(--red)', 1.6, 7) + KD.label({ x: xs + 6, y: 50 }, 'F', { size: 11, fill: 'var(--red)' }) +
        // link 4 (ternary) and the couplers 3, 6
        KD.link(C, B, 3) + KD.link(B, D) + KD.link(C, E) +
        // arms 2 (saw) and 7 (clamp)
        KD.ground(O2, { w: 14 }) + KD.ground(O7, { w: 14 }) +
        KD.body(O2, { x: O2.x + 95 * Math.cos(p2), y: O2.y + 95 * Math.sin(p2) }, 4) +
        KD.body(O7, { x: O7.x + 95 * Math.cos(p7), y: O7.y + 95 * Math.sin(p7) }, 4) +
        KD.joint(O2, 4.5) + KD.joint(O7, 4.5) + KD.joint(A, 4) + KD.joint(B, 3.5) + KD.joint(C, 3.5) + KD.joint(D, 3.5) + KD.joint(E, 3.5);
      // saw teeth on arm 2's tip, clamp pad on arm 7's tip
      var tip2 = { x: O2.x + 95 * Math.cos(p2), y: O2.y + 95 * Math.sin(p2) }, tip7 = { x: O7.x + 95 * Math.cos(p7), y: O7.y + 95 * Math.sin(p7) };
      out += KD.disc(tip2, 4, 'var(--mass)') + KD.note({ x: tip2.x - 2, y: tip2.y + 16 }, 'saw', { size: 8, anchor: 'middle' }) + KD.disc(tip7, 4, 'var(--cw)') + KD.note({ x: tip7.x + 2, y: tip7.y + 16 }, 'clamp', { size: 8, anchor: 'middle' });
      out += KD.label({ x: 36, y: 212 }, '1', { size: 10 }) + KD.label({ x: O2.x + 48 * Math.cos(p2) + 4, y: O2.y + 48 * Math.sin(p2) - 8 }, '2', { size: 10 }) +
             KD.label({ x: (B.x + D.x) / 2 + 6, y: (B.y + D.y) / 2 }, '3', { size: 10 }) + KD.label({ x: A.x + 2, y: A.y - 14 }, '4', { size: 10 }) + KD.label({ x: xs + 16, y: 100 }, '5', { size: 10 }) +
             KD.label({ x: (C.x + E.x) / 2 - 12, y: (C.y + E.y) / 2 }, '6', { size: 10 }) + KD.label({ x: O7.x + 48 * Math.cos(p7) - 4, y: O7.y + 48 * Math.sin(p7) - 8 }, '7', { size: 10 });
      g.innerHTML = out;
      // topology graph: links as vertices, joints as edges; merged links drawn as one vertex
      var merged = stage === 'b' || stage === 'r' && p2 <= Math.PI + 0.01 ? [2] : stage === 'c' ? [2, 7] : [7];
      var pos = { 1: [40, 62], 2: [12, 40], 3: [12, 14], 4: [40, 0], 5: [40, 30], 6: [68, 14], 7: [68, 40] };
      var edges = [[1, 2], [1, 5], [1, 7], [2, 3], [3, 4], [4, 5], [4, 6], [6, 7]];
      var gout = '';
      edges.forEach(function (e) { var p = pos[e[0]], q = pos[e[1]], dead = merged.indexOf(e[0]) >= 0 && e[1] === 1 || merged.indexOf(e[1]) >= 0 && e[0] === 1; gout += '<line x1="' + p[0] + '" y1="' + p[1] + '" x2="' + q[0] + '" y2="' + q[1] + '" stroke="var(--fg)" stroke-width="' + (dead ? 0 : 1.2) + '"/>'; });
      merged.forEach(function (m) { var p = pos[m], q = pos[1]; gout += '<line x1="' + p[0] + '" y1="' + p[1] + '" x2="' + q[0] + '" y2="' + q[1] + '" stroke="var(--red)" stroke-width="3" opacity=".5"/>'; });
      Object.keys(pos).forEach(function (k) { var p = pos[k], m = merged.indexOf(+k) >= 0; gout += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="6" fill="' + (k === '1' || m ? 'var(--ground)' : 'var(--card)') + '" stroke="var(--fg)" stroke-width="1.2"/><text class="v" x="' + p[0] + '" y="' + (p[1] + 3.5) + '" font-size="9" text-anchor="middle" fill="var(--fg)">' + k + '</text>'; });
      graph.innerHTML = gout;
      var names = { b: ['(b) clamping', 'Payload holds the saw arm 2 to the ground: 6 moving links, 8 joints, mobility 3·5 − 2·7 = 1. The input drives the clamp.'],
                    c: ['(c) clamped', 'The clamp arm 7 is stopped by the steel. Links 3, 4, 5, 6 with six joints: mobility 0, a structure. The force builds up.'],
                    d: ['(d) sawing', 'The force lifts link 2 off its rest; with 7 fixed, mobility is 1 again and the saw arm moves.'],
                    e: ['(d) sawing', 'Cut made. Three topologies from one mechanism: 1(2), 1(2,7), 1(7) in the paper’s notation.'],
                    r: ['returning', 'Back to the start.'] };
      if (lbl) lbl.textContent = names[stage][0]; if (msg) msg.textContent = names[stage][1];
    }
    var last = null;
    loop(function (t) { var dt = 0; if (t !== undefined) { if (last !== null) dt = Math.min(0.05, (t - last) / 1000); last = t; } step(dt); draw(); });
  })();

  // ---------------------------------------------------------------------------------------------
  // Kuo and Yan, ASME J. Mech. Des. 129 (2007) 617: mobility and configuration singularity of
  // mechanisms with variable topologies. Example: the one-step push-button stopper lock with variable
  // passwords (Fig. 1). Frame, slider, button and stopper; four topology stages, with mobility from
  // the screw-system method: locking 1, unlockable 2, unlocking 1, password-changeable 2 (Table 1).
  // The planar Gruebler count gives 1, 0, 1, -1 for the same stages, which is the point: a formula
  // that ignores the changing joint topologies gets the mobility wrong.
  // ---------------------------------------------------------------------------------------------
  (function () {
    var svg = document.getElementById('lock');
    if (!svg) return;
    var g = svg.querySelector('#kBody'), msg = document.getElementById('lkMsg'), lbl = document.getElementById('lkState'), mOut = document.getElementById('lkMob');
    var F = { x: 170, y: 150 };   // frame centre
    function draw(stage, u) {
      // stage: 0 locking, 1 unlockable (button pressed), 2 unlocking (slider moved), 3 password changeable (button turned)
      var press = stage === 0 ? 0 : stage === 1 ? smooth(u) : 1, slide = stage < 2 ? 0 : stage === 2 ? smooth(u) : 1, turn = stage === 3 ? smooth(u) : 0;
      var bx = F.x, by = F.y - 70 + 22 * press, sx = F.x - 40 + 60 * slide;
      var out = '';
      // frame: two blocks with a horizontal channel for the slider and a vertical bore for the button
      ['-', '+'].forEach(function (s, i) {
        var yy = i === 0 ? F.y - 70 : F.y + 18;
        out += '<rect x="' + (F.x - 90) + '" y="' + yy + '" width="180" height="52" fill="var(--ground)" stroke="var(--fg)" stroke-width="1.2"/>';
      });
      out += '<rect x="' + (F.x - 90) + '" y="' + (F.y - 18) + '" width="180" height="36" fill="var(--card)" stroke="none"/>';
      // slider: a long bar with a notch (the groove) that the stopper drops into
      out += '<rect x="' + f(sx - 110) + '" y="' + (F.y - 14) + '" width="220" height="28" fill="var(--card)" stroke="var(--fg)" stroke-width="1.4"/>' +
             '<rect x="' + f(sx - 12) + '" y="' + (F.y - 14) + '" width="24" height="12" fill="var(--bg-2)" stroke="var(--fg)" stroke-width="1"/>' +
             KD.arrow({ x: sx + 120, y: F.y }, { x: sx + 150, y: F.y }, 'var(--fg-2)', 1, 6) + KD.label({ x: sx + 150, y: F.y - 6 }, 'x', { size: 10, fill: 'var(--fg-2)' });
      // button: a vertical pin through the frame bore, with the stopper (a lug) on it
      out += '<rect x="' + (bx - 8) + '" y="' + f(by - 40) + '" width="16" height="130" rx="2" fill="var(--mag-stator)" stroke="var(--fg)" stroke-width="1.4"/>' +
             '<rect x="' + (bx - 16) + '" y="' + f(by - 48) + '" width="32" height="10" rx="2" fill="var(--mag-stator)" stroke="var(--fg)" stroke-width="1.4"/>';
      // stopper lug: in the locking stage it sits in the slider's groove; pressed, it clears the groove
      var lugY = by + 60 - 22 * press;
      out += '<g transform="rotate(' + f(60 * turn) + ' ' + bx + ' ' + f(lugY + 5) + ')"><rect x="' + (bx - 12) + '" y="' + f(lugY) + '" width="24" height="10" fill="var(--mag-rotor)" stroke="var(--fg)" stroke-width="1.2"/></g>';
      out += KD.arrow({ x: bx + 40, y: by - 70 }, { x: bx + 40, y: by - 48 }, 'var(--fg-2)', 1, 6) + KD.label({ x: bx + 46, y: by - 55 }, 'z', { size: 10, fill: 'var(--fg-2)' });
      out += KD.note({ x: F.x - 86, y: F.y - 56 }, 'frame', { size: 9 }) + KD.note({ x: F.x - 86, y: F.y + 36 }, 'frame', { size: 9 }) + KD.note({ x: sx - 104, y: F.y + 4 }, 'slider', { size: 9 }) + KD.note({ x: bx + 22, y: by - 30 }, 'button', { size: 9 }) + KD.note({ x: bx + 16, y: lugY + 8 }, 'stopper', { size: 8 });
      g.innerHTML = out;
      var S = [['(a) locking', 'Stopper in the slider’s groove: the slider cannot move, only the button can. Joints: P(z) button–frame; the slider is fixed. Mobility 1.', 1],
               ['(b) unlockable', 'Button pressed: the stopper clears the groove. Button along z and slider along x are both free. Mobility 2 (a planar count says 0).', 2],
               ['(c) unlocking', 'Slider moved: the button is trapped by the slider body and can no longer rise. Mobility 1.', 1],
               ['(d) password changeable', 'At a special slider position the button can turn to another groove: a transitional topology, mobility 2 (a planar count says −1).', 2]];
      if (lbl) lbl.textContent = S[stage][0]; if (msg) msg.textContent = S[stage][1]; if (mOut) mOut.value = S[stage][2];
    }
    var t0 = null;
    loop(function (t) {
      var s = t === undefined ? 0 : ((t0 === null ? (t0 = t) : t0), (t - t0) / 1000), T = s % 12, stage, u;
      if (T < 2) { stage = 0; u = 0; } else if (T < 4) { stage = 1; u = (T - 2) / 2; } else if (T < 5) { stage = 1; u = 1; } else if (T < 7) { stage = 2; u = (T - 5) / 2; } else if (T < 8) { stage = 2; u = 1; } else if (T < 10) { stage = 3; u = (T - 8) / 2; } else { stage = 3; u = 1; }
      draw(stage, u);
    });
  })();
})();
