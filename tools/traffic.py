#!/usr/bin/env python3
"""Traffic summary for chkuo717.github.io from GoatCounter (dashboard: https://chkuo717.goatcounter.com).

The read-only API token lives in the macOS Keychain, never in this repo:
    security add-generic-password -a chkuo717 -s goatcounter-api -w     (prompts for the token)

Run:  python3 tools/traffic.py            last 7 days
      python3 tools/traffic.py 30         last 30 days
      python3 tools/traffic.py 2026-11-01 2026-11-30
"""
import datetime as dt
import json
import subprocess
import sys
import urllib.parse
import urllib.request

API = "https://chkuo717.goatcounter.com/api/v0"


def token():
    try:
        return subprocess.run(["security", "find-generic-password", "-a", "chkuo717", "-s", "goatcounter-api", "-w"],
                              capture_output=True, text=True, check=True).stdout.strip()
    except subprocess.CalledProcessError:
        sys.exit("No GoatCounter token in the Keychain (service goatcounter-api). See the docstring.")


def get(path, start, end, tok, **extra):
    q = {"start": start.isoformat() + "T00:00:00Z", "end": end.isoformat() + "T23:59:59Z", **extra}
    req = urllib.request.Request(f"{API}/{path}?{urllib.parse.urlencode(q)}",
                                 headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def table(title, rows, n=15):
    print(f"\n{title}")
    if not rows:
        print("  (none)")
    for name, count in rows[:n]:
        print(f"  {count:6d}  {name}")


def main(args):
    today = dt.date.today()
    if len(args) == 2:
        start, end = dt.date.fromisoformat(args[0]), dt.date.fromisoformat(args[1])
    else:
        days = int(args[0]) if args else 7
        start, end = today - dt.timedelta(days=days - 1), today
    tok = token()
    hits = get("stats/hits", start, end, tok, limit=100)["hits"]
    pages = [h for h in hits if not h["event"]]
    events = [h for h in hits if h["event"]]
    daily = {}
    for h in pages:
        for d in h["stats"]:
            if start.isoformat() <= d["day"] <= end.isoformat():
                daily[d["day"]] = daily.get(d["day"], 0) + d["daily"]
    print(f"GoatCounter, {start} to {end} (UTC)")
    print(f"Visits to pages: {sum(h['count'] for h in pages)}   Outbound clicks: {sum(h['count'] for h in events)}")
    table("Visits per day", sorted(daily.items()), n=400)
    table("Pages", [(h["path"], h["count"]) for h in pages])
    table("Outbound clicks (DOI, Scholar, ...)", [(h["path"].removeprefix("out: "), h["count"]) for h in events])
    for name, path in [("Referrers", "toprefs"), ("Countries", "locations"), ("Browsers", "browsers"),
                       ("Systems", "systems"), ("Screen sizes", "sizes")]:
        rows = [(s.get("name") or s.get("id") or "(direct / unknown)", s["count"])
                for s in get(f"stats/{path}", start, end, tok)["stats"] if s["count"]]
        table(name, rows)


if __name__ == "__main__":
    main(sys.argv[1:])
