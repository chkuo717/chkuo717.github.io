// Small theme drawings for the Research index cards, in the site's figure style (draw.js).
(function () {
  'use strict';
  if (!window.KD) return;
  var P = function (x, y) { return { x: x, y: y }; };
  var icons = {
    gravity: function () {
      var O = P(48, 72), m = P(104, 32), pin = P(O.x + (m.x - O.x) * 0.38, O.y + (m.y - O.y) * 0.38), A = P(46, 18);
      return KD.ground(O, { w: 16 }) + KD.ground(A, { w: 11, plain: true, up: true }) + KD.pin(A) + KD.spring(A, pin, 8, 3) +
             KD.link(O, m) + KD.pin(pin) + KD.joint(O, 4.5) + KD.mass(m, 8, 'm');
    },
    magnetic: function () {
      var C = P(80, 46), R = 30, out = '';
      for (var i = 0; i < 8; i++) {
        var az = -Math.PI / 2 + i * Math.PI / 4, c = P(C.x + R * Math.cos(az), C.y + R * Math.sin(az)), mag = 2 * az + Math.PI / 2;
        out += KD.magnet(c, 13, 13, (mag + Math.PI / 2) * 180 / Math.PI, 'var(--mag-stator)', 'var(--mag-arrow)');
      }
      var th = 0.6, end = P(C.x + 24 * Math.sin(th), C.y - 24 * Math.cos(th));
      return out + '<circle cx="80" cy="46" r="11" fill="var(--card)" stroke="var(--fg)" stroke-width="1.2"/>' +
             '<g transform="rotate(' + (th * 180 / Math.PI).toFixed(1) + ' 80 46)"><rect x="75" y="38" width="10" height="16" rx="1.5" fill="var(--mag-rotor)" stroke="var(--fg)" stroke-width="1"/>' +
             KD.arrow(P(80, 51), P(80, 40), 'var(--mag-arrow-2)', 1.4, 5) + '</g>' + KD.link(P(C.x + 8 * Math.sin(th), C.y - 8 * Math.cos(th)), end, 2) + KD.mass(end, 5, '');
    },
    energy: function () {
      var Bc = P(48, 63), G = P(118, 40), th = 200 * Math.PI / 180, C = P(G.x + 16 * Math.cos(th), G.y + 16 * Math.sin(th)), d = '', i, x;
      for (i = 0; i <= 38; i++) { x = 10 + 2 * i; d += (i ? 'L' : 'M') + x + ',' + (68 + 3 * Math.sin(2 * Math.PI * (x - 10) / 38)).toFixed(2); }
      return '<path d="' + d + 'L86,84L10,84Z" fill="var(--mag-stator)" opacity=".6"/><path d="' + d + '" fill="none" stroke="var(--accent)" stroke-width="1.4"/>' +
             KD.arrow(P(32, 57), P(32, 44), 'var(--cable)', 1.3, 6) + KD.arrow(P(32, 51), P(32, 64), 'var(--cable)', 1.3, 6) +
             KD.ground(G, { w: 16 }) + KD.mass(Bc, 7, '') + KD.link(Bc, C) + KD.link(G, C) + KD.joint(G, 4.5) + KD.joint(C, 3.5) + KD.joint(Bc, 3) +
             '<path d="M111.2,21.2 A20,20 0 0 1 133.3,27.1" fill="none" stroke="var(--cable)" stroke-width="1.3"/>' + KD.arrow(P(130.7, 24), P(134.6, 28.6), 'var(--cable)', 1.3, 6);
    },
    parallel: function () {
      var g = [P(26, 76), P(134, 76), P(80, 80)], k = [P(34, 50), P(126, 50), P(62, 60)], t = [P(56, 36), P(104, 36), P(80, 20)];
      var out = KD.ground(g[0], { w: 13 }) + KD.ground(g[1], { w: 13 }) + KD.ground(g[2], { w: 13 });
      out += '<polygon points="56,36 104,36 80,20" fill="var(--link-fill)" stroke="var(--fg)" stroke-width="1.8" stroke-linejoin="round"/>';
      for (var i = 0; i < 3; i++) out += KD.link(g[i], k[i]) + KD.link(k[i], t[i]) + KD.joint(g[i], 4) + KD.joint(k[i], 3.5) + KD.joint(t[i], 3.5);
      return out;
    },
    reconfigurable: function () {
      var O = P(34, 74), Q = P(126, 74), A = P(52, 40), B = P(108, 30), A2 = P(74, 50), B2 = P(118, 48);
      return KD.ground(O, { w: 14 }) + KD.ground(Q, { w: 14 }) +
             '<g opacity=".55">' + KD.dashed(O, A2) + KD.dashed(A2, B2) + KD.dashed(Q, B2) + KD.joint(A2, 3.5) + KD.joint(B2, 3.5) + '</g>' +
             KD.link(O, A) + KD.link(A, B) + KD.link(Q, B) + KD.joint(O, 4.5) + KD.joint(Q, 4.5) + KD.joint(A, 3.5) + KD.joint2(B, 3.5) +
             '<path d="M70,58 A26,26 0 0 1 60,34" fill="none" stroke="var(--cable)" stroke-width="1.3"/>' + KD.arrow(P(61, 40), P(59, 32), 'var(--cable)', 1.3, 6);
    },
    medical: function () {
      var G = P(40, 24), A = P(78, 18), Bp = P(104, 50), C = P(66, 56), R = P(130, 78);
      return KD.ground(G, { w: 13, up: true }) +
             KD.link(G, A) + KD.link(A, Bp) + KD.link(G, C) + KD.link(C, Bp) + KD.link(Bp, R, 1.6) +
             KD.joint(G, 4) + KD.joint(A, 3.5) + KD.joint(Bp, 3.5) + KD.joint(C, 3.5) +
             '<path d="M118,86 A14,14 0 0 1 142,70" fill="none" stroke="var(--fg)" stroke-width="1" stroke-dasharray="3 2"/>' +
             KD.disc(R, 3.2, 'var(--mass)') + KD.label(P(138, 86), 'RCM', { size: 9 });
    },
    theory: function () {
      var A1 = P(30, 66), B1 = P(70, 44), A2 = P(84, 22), B2 = P(128, 36), Pp = P(104, 76);
      return KD.dashed(P(42, 20), P(66, 78)) + KD.dashed(P(96, 10), P(106, 86)) +
             '<g stroke="var(--spring)" stroke-width="1" stroke-dasharray="2 3">' + KD.line(Pp, A1) + KD.line(Pp, A2) + KD.line(Pp, B1) + KD.line(Pp, B2) + '</g>' +
             KD.link(A1, B1) + KD.link(A2, B2) + KD.joint(A1, 3.5) + KD.joint(B1, 3.5) + KD.joint(A2, 3.5) + KD.joint(B2, 3.5) +
             KD.disc(Pp, 3.5, 'var(--mass)') + KD.label(P(110, 82), 'P', { size: 11, sub: '12' });
    }
  };
  Array.prototype.forEach.call(document.querySelectorAll('svg.icon[data-icon]'), function (svg) {
    var fn = icons[svg.getAttribute('data-icon')];
    if (fn) svg.innerHTML = fn();
  });
})();
