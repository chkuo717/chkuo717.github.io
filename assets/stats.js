// Visit counting with GoatCounter (no cookies, no personal data). Page views are counted by count.js itself;
// this file adds one event per click on a link that leaves the site (DOI, Google Scholar, GeoGebra, ...),
// recorded as "out: <host><path>" so the dashboard shows which papers and profiles people open.
(function () {
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.host === location.host || !/^https?:$/.test(a.protocol)) return;
    if (!window.goatcounter || !window.goatcounter.count) return;
    window.goatcounter.count({ path: 'out: ' + a.host + a.pathname + a.search, title: (a.textContent || '').trim().slice(0, 120), event: true });
  });
})();
