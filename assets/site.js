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

// Home: a crank-rocker four-bar, drawn live. r1 ground, r2 crank, r3 coupler, r4 rocker.
(function () {
  var svg = document.getElementById('fourbar');
  if (!svg) return;
  var O2 = { x: 60, y: 200 }, r1 = 200, r2 = 55, r3 = 170, r4 = 130;
  var O4 = { x: O2.x + r1, y: O2.y };
  var crank = svg.querySelector('#crank'), coupler = svg.querySelector('#coupler'),
      rocker = svg.querySelector('#rocker'), A = svg.querySelector('#jA'), B = svg.querySelector('#jB'),
      P = svg.querySelector('#jP'), trace = svg.querySelector('#trace'), couplerBody = svg.querySelector('#couplerBody');
  var speed = document.getElementById('speed');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var theta = 0.6, pts = [], last = null;

  function solve(th) {
    var ax = O2.x + r2 * Math.cos(th), ay = O2.y - r2 * Math.sin(th);
    var dx = O4.x - ax, dy = O4.y - ay, d = Math.hypot(dx, dy);
    var a = (r3 * r3 - r4 * r4 + d * d) / (2 * d);
    var h = Math.sqrt(Math.max(0, r3 * r3 - a * a));
    var mx = ax + a * dx / d, my = ay + a * dy / d;
    // open configuration (B above the ground line)
    var bx = mx + h * dy / d, by = my - h * dx / d;
    // coupler point: offset from AB, on the side away from the ground
    var ux = (bx - ax) / r3, uy = (by - ay) / r3;
    var px = ax + 0.45 * r3 * ux + 70 * uy, py = ay + 0.45 * r3 * uy - 70 * ux;
    return { ax: ax, ay: ay, bx: bx, by: by, px: px, py: py };
  }
  function draw(s) {
    crank.setAttribute('x2', s.ax); crank.setAttribute('y2', s.ay);
    coupler.setAttribute('x1', s.ax); coupler.setAttribute('y1', s.ay);
    coupler.setAttribute('x2', s.bx); coupler.setAttribute('y2', s.by);
    rocker.setAttribute('x2', s.bx); rocker.setAttribute('y2', s.by);
    couplerBody.setAttribute('points', s.ax + ',' + s.ay + ' ' + s.bx + ',' + s.by + ' ' + s.px + ',' + s.py);
    A.setAttribute('cx', s.ax); A.setAttribute('cy', s.ay);
    B.setAttribute('cx', s.bx); B.setAttribute('cy', s.by);
    P.setAttribute('cx', s.px); P.setAttribute('cy', s.py);
  }
  // full coupler curve once, as a faint path
  (function () {
    var d = '';
    for (var i = 0; i <= 360; i += 2) { var s = solve(i * Math.PI / 180); d += (i ? ' L' : 'M') + s.px.toFixed(1) + ',' + s.py.toFixed(1); }
    trace.setAttribute('d', d + ' Z');
  })();
  draw(solve(theta));
  if (reduce) return;
  function frame(t) {
    if (last !== null) {
      var w = speed ? parseFloat(speed.value) : 1.2; // rad/s
      theta += w * (t - last) / 1000;
    }
    last = t;
    draw(solve(theta));
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
