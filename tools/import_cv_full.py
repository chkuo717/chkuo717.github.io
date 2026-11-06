#!/usr/bin/env python3
"""Import the CV section files (01-09) into src/data/cv.html, the body of the CV page (cv.html).

The publication list is not converted here: the CV page reuses {{publications}}, which comes from
tools/import_cv.py. Run this whenever a CV section file changes, then run build.py:

    python3 tools/import_cv_full.py "<path to>/00 Academic Profile MD"
    python3 build.py

What it leaves out, because the site is public:
  - Research Impact (bibliometrics for promotion files; they go stale)
  - nominations of colleagues, and university agreements still under approval
  - the thesis titles of current research students (their topics are not public)
  - grants that are industry contracts or current unpublished projects, and all funding amounts
  - the indented notes under an entry (dossier evidence: how it was checked, who notified, society blurbs),
    except award citations, student-award recipients and the awarded papers themselves
  - Obsidian links, block ids, HTML comments and working notes (embargo dates, publication cross-links)
"""
import html
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from import_cv import to_html  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src", "data", "cv.html")
PUBS = {it["key"].lower(): it["html"] for s in json.load(open(os.path.join(ROOT, "src", "data", "publications.json"),
                                                              encoding="utf-8"))["sections"] for it in s["items"]}

FILES = ["01 Profile", "02 Leadership", "03 Awards", "04 Service", "05 Teaching",
         "06 Professional Activities", "07 Talks", "08 Grants", "09 Supervision"]
SKIP_HEADINGS = {"Research Impact", "Teaching Award Nominations (Colleagues)"}
SKIP_ITEMS = ("**Initiator and lead**",)                     # alliance still in the approval pathway
GRANTS = ["ncp2025", "uowsurrey2025", "aegis2022", "theomurphy2022", "eis2020", "umove2019", "jsps2023"]
KEEP_NOTES = ("Citation:", "Conferred to")                  # other indented notes are dossier evidence
CURRENT = re.compile(r"–current\)|–present\)|\(\d{4}–\)")     # a student still enrolled


def strip_obsidian(s):
    s = re.sub(r"<!--.*?-->", "", s)
    s = re.sub(r"\s*\^[\w-]+\s*$", "", s)                                        # block id
    s = re.sub(r"\s*\(\[\[[^\]]*\]\]\)", "", s)                                  # "(supervision details)" links
    s = re.sub(r"\.?\s*(Publications|\*\*Award:\*\*):? .*$", ".", s)             # cross-links to publications
    s = re.sub(r"\s*Thesis embargo[^.]*\.[^.]*\.?", "", s)
    s = re.sub(r"\[\[[^\]|]*\|([^\]]*)\]\]", r"\1", s)
    s = re.sub(r"\[\[([^\]]*)\]\]", r"\1", s)
    if len(re.findall(r"(?<!\*)\*(?!\*)", s)) % 2:                               # "- Title*, place" in 05 Teaching
        s = re.sub(r"^(- )", r"\1*", s) if s.startswith("- ") else s + "*"
    return s.rstrip()


def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", r'<a href="\2">\1</a>', s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<em>\1</em>", s)
    s = re.sub(r"(?<!\w)\*(\w[^*]*?)\*", r"<em>\1</em>", s)
    return s


def grant(reg, gid):
    line = next(l for l in reg.splitlines() if l.rstrip().endswith("^grant-" + gid))
    m = re.match(r"^- \*\*(\d{4}) — (.+?)\*\* — (.*)$", line)
    year, title, rest = m.groups()
    field = lambda k: (re.search(k + r": (.+?)\. (?:[A-Z][\w /&]+:|\^)", rest + " ^") or [None, ""])[1]
    scheme, role = field("Sponsor / Scheme"), field("My Role")
    scheme = re.sub(r"\s*\((?:internal|industry|commercial)[^)]*\)|\s*\(DFAT, #\d+\)", " (DFAT)" if "DFAT" in scheme else "", scheme)
    return f"- **{title}**, {scheme}, {year}. Role: {role}."


def convert(md, reg):
    out, para, li, sub_cont = [], [], None, []
    state = {"list": False, "skip": False, "skiplevel": 9, "drop_item": False}

    def flush_li():
        nonlocal li, sub_cont
        if li is not None:
            body = li + "".join(f'<span class="cv-note">{c}</span>' for c in sub_cont)
            out.append(f"<li>{body}</li>")
        li, sub_cont = None, []

    def close_list():
        flush_li()
        if state["list"]:
            out.append("</ul>")
            state["list"] = False

    lines = md.splitlines()
    i = 0
    while i < len(lines):
        raw = lines[i]
        i += 1
        h = re.match(r"^(#{1,3}) (.+)$", raw)
        if h:
            level, text = len(h.group(1)), h.group(2).strip()
            if state["skip"] and level <= state["skiplevel"]:
                state["skip"] = False
            if text in SKIP_HEADINGS:
                close_list()
                state.update(skip=True, skiplevel=level)
                continue
            if state["skip"]:
                continue
            close_list()
            tag = f"h{level + 1}"
            sid = f' id="{re.sub(r"[^a-z]+", "-", text.lower()).strip("-")}"' if level == 1 else ""
            out.append(f"<{tag}{sid}>{inline(text)}</{tag}>")
            continue
        if state["skip"]:
            continue
        g = re.match(r"^!\[\[Grant Applications List \(2019-\)#\^grant-(\w+)\]\]", raw)
        if g:
            if g.group(1) not in GRANTS:
                continue
            raw = grant(reg, g.group(1))
        t = re.match(r"^!\[\[10 Publications#\^([\w-]+)(?:\|[^\]]*)?\]\]", raw.strip())
        if t:                                                                    # an awarded paper, under its award
            cit = PUBS.get(t.group(1).lower())
            if cit and li is not None:
                sub_cont.append(cit)
            continue
        s = strip_obsidian(raw)
        if not s.strip():
            continue
        if s.startswith("|"):
            close_list()
            rows = [s]
            while i < len(lines) and lines[i].startswith("|"):
                rows.append(lines[i])
                i += 1
            cells = [[c.strip() for c in r.strip().strip("|").split("|")] for r in rows if not re.match(r"^\|[\s:|-]+\|$", r.strip())]
            head = "".join(f"<th>{inline(c)}</th>" for c in cells[0])
            body = "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in cells[1:])
            out.append(f'<div class="cv-table"><table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table></div>')
            continue
        if s.startswith("- "):
            flush_li()
            if s.startswith(tuple("- " + x for x in SKIP_ITEMS)):
                state["drop_item"] = True
                continue
            state["drop_item"] = False
            item = s[2:]
            if CURRENT.search(item) and "supervision" in item.lower() and re.match(r"\*\*[^*]+\*\* \(\d{4}–", item):
                item = re.sub(r", \*[^*]+\*", "", item, count=1)                 # current student: no thesis title
            if not state["list"]:
                out.append("<ul>")
                state["list"] = True
            li = inline(item)
            continue
        if s.startswith("  ") and li is not None:
            if not state["drop_item"] and s.strip().startswith(KEEP_NOTES):
                sub_cont.append(inline(s.strip()))
            continue
        if state["drop_item"]:
            continue
        close_list()
        if s.startswith("Note:"):
            continue                                                             # dated working note
        out.append(f"<p>{inline(s.strip())}</p>")
    close_list()
    return "\n".join(out)


def main(base):
    cvdir = os.path.join(base, "1 CV")
    reg = open(os.path.join(base, "A2. Grant Applications", "Grant Applications List (2019-).md"), encoding="utf-8").read()
    parts = []
    for name in FILES:
        md = open(os.path.join(cvdir, name + ".md"), encoding="utf-8").read()
        md = re.sub(r"\A---\n.*?\n---\n", "", md, flags=re.S)                    # frontmatter
        parts.append(convert(md, reg))
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("<!-- Generated by tools/import_cv_full.py from the CV section files. Do not edit by hand. -->\n")
        f.write("\n".join(parts) + "\n")
    print(f"wrote {os.path.relpath(OUT, ROOT)}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
