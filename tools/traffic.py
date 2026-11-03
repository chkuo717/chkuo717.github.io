#!/usr/bin/env python3
"""Traffic for chkuo717.github.io from GoatCounter (dashboard: https://chkuo717.goatcounter.com).

The GoatCounter API token lives in the macOS Keychain, never in this repo:
    security add-generic-password -a chkuo717 -s goatcounter-api -w     (prompts for the token)

Run:  python3 tools/traffic.py                  text summary, last 7 days
      python3 tools/traffic.py 30               last 30 days
      python3 tools/traffic.py 2026-11-01 2026-11-30
      python3 tools/traffic.py 30 --export out.json
                                                 rows for the private dashboard (one file, long format:
                                                 kind, key, label, grp, n, n2, n3), plus the text summary
Days are Sydney days, as in the GoatCounter account settings. Each period is compared with the
period of the same length just before it.
"""
import datetime as dt
import html
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from zoneinfo import ZoneInfo

API = "https://chkuo717.goatcounter.com/api/v0"
TZ = ZoneInfo("Australia/Sydney")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CV = os.path.expanduser("~/Library/CloudStorage/OneDrive-UniversityofWollongong/00 Academic Workplace/"
                        "00 Academic Profile MD/1 CV/10 Publications.md")
THEMES = {  # research page slug -> (theme id in papers.json, label)
    "gravity-balancing": ("gravity", "Gravity balancing"),
    "magnetic-mechanisms": ("magnetic", "Magnetic mechanisms"),
    "parallel-mechanisms": ("parallel", "Parallel & decoupled mechanisms"),
    "reconfigurable-mechanisms": ("reconfigurable", "Reconfigurable mechanisms"),
    "medical-mechanisms": ("medical", "Medical & rehabilitation devices"),
    "mechanism-theory": ("theory", "Mechanism theory & teaching"),
}
SIZES = {"phone": "Phone", "tablet": "Tablet", "desktop": "Desktop", "desktophd": "Large desktop", "unknown": "Unknown"}


def token():
    try:
        return subprocess.run(["security", "find-generic-password", "-a", "chkuo717", "-s", "goatcounter-api", "-w"],
                              capture_output=True, text=True, check=True).stdout.strip()
    except subprocess.CalledProcessError:
        sys.exit("No GoatCounter token in the Keychain (service goatcounter-api). See the docstring.")


class Api:
    def __init__(self, tok):
        self.tok = tok

    def get(self, path, start, end, **extra):
        """start, end: Sydney dates, both included."""
        s = dt.datetime.combine(start, dt.time(0, 0), TZ).isoformat()
        e = dt.datetime.combine(end, dt.time(23, 59, 59), TZ).isoformat()
        url = f"{API}/{path}?{urllib.parse.urlencode({'start': s, 'end': e, **extra})}"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {self.tok}", "Content-Type": "application/json"})
        for attempt in range(4):
            try:
                with urllib.request.urlopen(req, timeout=30) as r:
                    time.sleep(0.25)
                    return json.load(r)
            except urllib.error.HTTPError as err:
                if err.code == 429 and attempt < 3:
                    time.sleep(5 * (attempt + 1))
                    continue
                raise


def papers():
    """CV key -> {title, doi, cites}, and site paper data (anim pages, themes)."""
    site = json.load(open(os.path.join(ROOT, "src", "data", "papers.json"), encoding="utf-8"))["papers"]
    pubs = json.load(open(os.path.join(ROOT, "src", "data", "publications.json"), encoding="utf-8"))["sections"]
    out = {}
    for s in pubs:
        if s["id"] not in ("journals", "chapters", "books"):
            continue
        for it in s["items"]:
            text = re.sub(r"<[^>]+>", "", it["html"])
            m = re.search(r"doi:(10\.\S+)", text)
            t = re.search(r'"([^"]+?),?"', text) or re.search(r"<em>(.+?)</em>", it["html"])
            title = html.unescape(re.sub(r"<[^>]+>", "", t.group(1))) if t else it["key"]
            out[it["key"].lower()] = {"key": it["key"], "title": title.rstrip(","), "doi": m.group(1).rstrip(".") if m else None,
                                      "cites": None, "anim": None, "theme": None}
    if os.path.exists(CV):
        for line in open(CV, encoding="utf-8"):
            k = re.match(r"^- \*\*(?:\\\[\[\[[^|\]]+\|([^\]]+)\]\]\\\]|\[([^\]]+)\])\*\*", line)
            c = re.search(r"(\d+) citations?, GS", line)
            if k and c and (k.group(1) or k.group(2)).lower() in out:
                out[(k.group(1) or k.group(2)).lower()]["cites"] = int(c.group(1))
    for p in site:
        q = out.get(p["key"].lower())
        if q:
            q["anim"], q["theme"] = p.get("anim"), p["theme"]
    return out


def page_exists(path):
    rel = urllib.parse.unquote(path.split("?")[0]).lstrip("/")
    if rel == "" or rel.endswith("/"):
        rel += "index.html"
    full = os.path.join(ROOT, rel)
    return os.path.isfile(full) or os.path.isfile(full + ".html")


def outbound_label(path, by_doi):
    if path.startswith("doi.org/"):
        p = by_doi.get(path[len("doi.org/"):].lower())
        return f'{p["key"]}: {p["title"]}' if p else path
    if path.startswith("scholar.google."):
        return "Google Scholar profile"
    if path.startswith("scholars.uow.edu.au"):
        return "UOW Scholars profile"
    if "geogebra.org" in path:
        return "GeoGebra e-book (relative poles)"
    return path


def collect(api, start, end):
    days = (end - start).days + 1
    pstart, pend = start - dt.timedelta(days=days), start - dt.timedelta(days=1)
    rows = []

    def row(kind, key, label=None, grp=None, n=None, n2=None, n3=None):
        rows.append({"kind": kind, "key": str(key), "label": label, "grp": grp, "n": n, "n2": n2, "n3": n3})

    fmt = lambda d: f"{d.day} {d:%b %Y}"
    row("meta", "period", f"{fmt(start)} – {fmt(end)}", n=days)
    row("meta", "previous", f"{fmt(pstart)} – {fmt(pend)}", n=days)
    row("meta", "updated", dt.datetime.now(TZ).strftime("%-d %b %Y, %H:%M") + " Sydney time")

    # Everything below counts page visits only: GoatCounter's own totals also include outbound-click events.
    hits = api.get("stats/hits", start, end, limit=100)["hits"]
    phits_all = api.get("stats/hits", pstart, pend, limit=100)["hits"]
    pages = [h for h in hits if not h["event"]]
    events = [h for h in hits if h["event"]]
    cur_days, prev_days, heat = {}, {}, {}
    for src, acc in ((pages, cur_days), ([h for h in phits_all if not h["event"]], prev_days)):
        for h in src:
            for s in h["stats"]:
                acc[s["day"]] = acc.get(s["day"], 0) + s["daily"]
                if src is pages and start <= dt.date.fromisoformat(s["day"]) <= end:
                    w = dt.date.fromisoformat(s["day"]).weekday()
                    for hr, v in enumerate(s["hourly"]):
                        heat[(w, hr)] = heat.get((w, hr), 0) + v
    for i in range(days):
        d, pd = start + dt.timedelta(days=i), pstart + dt.timedelta(days=i)
        row("daily", d.isoformat(), pd.isoformat(), n=cur_days.get(d.isoformat(), 0), n2=prev_days.get(pd.isoformat(), 0))
    for w in range(7):
        for h in range(24):
            row("hour", f"{w}-{h}", ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][w], n=heat.get((w, h), 0), n2=w, n3=h)

    pp = papers()
    by_anim = {p["anim"]: p for p in pp.values() if p["anim"]}
    by_doi = {p["doi"].lower(): p for p in pp.values() if p["doi"]}
    phits = {h["path"]: h["count"] for h in phits_all}
    paths = set(h["path"] for h in pages) | set(p for p in phits if not p.startswith("out: "))
    cur = {h["path"]: h for h in pages}
    theme_n, theme_p = {}, {}
    for path in paths:
        c, p = cur[path]["count"] if path in cur else 0, phits.get(path, 0)
        rel = path.lstrip("/")
        theme = None
        m = re.match(r"research/([\w-]+)\.html$", rel)
        if m and m.group(1) in THEMES:
            theme = THEMES[m.group(1)][0]
        elif rel in by_anim:
            theme = by_anim[rel]["theme"]
        title = cur[path]["title"].replace(" · Chin-Hsing Kuo", "") if path in cur else None
        row("page", path, title or ("Home" if rel in ("", "index.html") else None), theme, n=c, n2=p)
        if theme:
            theme_n[theme] = theme_n.get(theme, 0) + c
            theme_p[theme] = theme_p.get(theme, 0) + p
        if c and not page_exists(path):
            row("notfound", path, n=c)
    for slug, (tid, label) in THEMES.items():
        row("theme", tid, label, n=theme_n.get(tid, 0), n2=theme_p.get(tid, 0))
    out_cur = {h["path"][5:]: h["count"] for h in events}
    out_prev = {k[5:]: v for k, v in phits.items() if k.startswith("out: ")}
    for path in set(out_cur) | set(out_prev):
        row("outbound", path, outbound_label(path, by_doi), n=out_cur.get(path, 0), n2=out_prev.get(path, 0))
    for p in pp.values():
        visits = cur[f'/{p["anim"]}']["count"] if p["anim"] and f'/{p["anim"]}' in cur else 0
        clicks = out_cur.get(f'doi.org/{p["doi"]}', 0) + out_cur.get(f'doi.org/{p["doi"].lower()}', 0) if p["doi"] else 0
        row("paper", p["key"], p["title"], "animation page" if p["anim"] else None, n=visits, n2=clicks, n3=p["cites"])

    site = lambda name: name.split("/")[0] == "chkuo717.github.io"
    fold = lambda name: "(this site)" if site(name) else (name or "(direct)")
    refs, prefs = {}, {}
    for s in api.get("stats/toprefs", start, end, limit=50)["stats"]:
        refs[fold(s.get("name") or "")] = refs.get(fold(s.get("name") or ""), 0) + s["count"]
    for s in api.get("stats/toprefs", pstart, pend, limit=50)["stats"]:
        prefs[fold(s.get("name") or "")] = prefs.get(fold(s.get("name") or ""), 0) + s["count"]
    labels = {"(direct)": "Direct, bookmark or app", "(this site)": "From another page of this site"}
    for key in set(refs) | set(prefs):
        row("ref", key, labels.get(key, key), "internal" if key == "(this site)" else None, n=refs.get(key, 0), n2=prefs.get(key, 0))
    for name in refs:
        if name not in labels:
            for u in api.get(f"stats/toprefs/{urllib.parse.quote(name, safe='')}", start, end, limit=20)["stats"]:
                row("refurl", f'{name}|{u.get("name")}', name + (u.get("name") or "") if (u.get("name") or "").startswith("/") else (u.get("name") or name), name, n=u["count"])
    for h in sorted(pages, key=lambda h: -h["count"])[:12]:
        for r in api.get(f'stats/hits/{h["path_id"]}', start, end, limit=10)["refs"]:
            ref = r.get("name") or ""
            label = "From another page of this site" if site(ref) else (ref or "Direct, bookmark or app")
            row("pageref", f'{h["path"]}|{ref or "(direct)"}', label, h["path"], n=r["count"])

    locs = api.get("stats/locations", start, end, limit=100)["stats"]
    plocs = {s.get("id"): s["count"] for s in api.get("stats/locations", pstart, pend, limit=100)["stats"]}
    for s in locs:
        row("country", s.get("id") or "(unknown)", s.get("name") or "Unknown", n=s["count"], n2=plocs.get(s.get("id"), 0))
    for s in locs[:8]:
        if s.get("id"):
            for r in api.get(f'stats/locations/{s["id"]}', start, end, limit=20)["stats"]:
                row("region", f'{s["id"]}|{r.get("name") or ""}', r.get("name") or "Region not recorded", s.get("name"), n=r["count"])
    for kind, path in [("language", "languages"), ("browser", "browsers"), ("system", "systems"), ("campaign", "campaigns")]:
        for s in api.get(f"stats/{path}", start, end, limit=50)["stats"]:
            if s["count"]:
                row(kind, s.get("id") or s.get("name") or "(unknown)", s.get("name") or s.get("id") or "Unknown", n=s["count"])
    for s in api.get("stats/sizes", start, end)["stats"]:
        row("size", s["id"], SIZES.get(s["id"], s["id"]), n=s["count"])

    countries = sum(1 for s in locs if s.get("id") and s["count"])
    row("total", "visits", "Visits", n=sum(h["count"] for h in pages), n2=sum(v for k, v in phits.items() if not k.startswith("out: ")))
    row("total", "outbound", "Clicks on links leaving the site", n=sum(out_cur.values()), n2=sum(out_prev.values()))
    row("total", "countries", "Countries", n=countries, n2=sum(1 for k, v in plocs.items() if k and v))
    return rows


def summary(rows):
    by = lambda k: [r for r in rows if r["kind"] == k]
    meta = {r["key"]: r for r in by("meta")}
    tot = {r["key"]: r for r in by("total")}
    print(f'GoatCounter, {meta["period"]["label"]} (previous: {meta["previous"]["label"]})')
    for k in ("visits", "outbound", "countries"):
        print(f'{tot[k]["label"]}: {tot[k]["n"]} (previous period {tot[k]["n2"]})')

    def table(title, items, n=15):
        print(f"\n{title}")
        if not items:
            print("  (none)")
        for name, count in items[:n]:
            print(f"  {count:6d}  {name}")
    srt = lambda k: sorted([r for r in by(k) if r["n"]], key=lambda r: -r["n"])
    table("Visits per day", [(r["key"], r["n"]) for r in by("daily") if r["n"]], n=400)
    table("Pages", [(r["key"], r["n"]) for r in srt("page")])
    table("Research themes", [(r["label"], r["n"]) for r in srt("theme")])
    table("Papers (animation-page visits + DOI clicks)", [(f'{r["key"]} (cited {r["n3"]})', r["n"] + r["n2"])
          for r in sorted(by("paper"), key=lambda r: -(r["n"] + r["n2"])) if r["n"] + r["n2"]])
    table("Outbound clicks", [(r["label"], r["n"]) for r in srt("outbound")])
    table("Referrers", [(r["label"], r["n"]) for r in srt("ref")])
    table("Referring pages", [(r["label"], r["n"]) for r in srt("refurl")])
    table("Countries", [(r["label"], r["n"]) for r in srt("country")])
    table("Regions", [(f'{r["grp"]}: {r["label"]}', r["n"]) for r in srt("region")])
    table("Languages", [(r["label"], r["n"]) for r in srt("language")])
    table("Browsers", [(r["label"], r["n"]) for r in srt("browser")])
    table("Systems", [(r["label"], r["n"]) for r in srt("system")])
    table("Screen sizes", [(r["label"], r["n"]) for r in srt("size")])
    table("Campaign tags", [(r["label"], r["n"]) for r in srt("campaign")])
    table("Missing pages people tried to open (404)", [(r["key"], r["n"]) for r in srt("notfound")])


def main(args):
    export = None
    if "--export" in args:
        i = args.index("--export")
        export = args[i + 1]
        args = args[:i] + args[i + 2:]
    today = dt.datetime.now(TZ).date()
    if len(args) == 2:
        start, end = dt.date.fromisoformat(args[0]), dt.date.fromisoformat(args[1])
    else:
        days = int(args[0]) if args else 7
        start, end = today - dt.timedelta(days=days - 1), today
    rows = collect(Api(token()), start, end)
    if export:
        with open(export, "w", encoding="utf-8") as f:
            json.dump({"rows": rows}, f, ensure_ascii=False)
        print(f"wrote {len(rows)} rows to {export}\n")
    summary(rows)


if __name__ == "__main__":
    main(sys.argv[1:])
