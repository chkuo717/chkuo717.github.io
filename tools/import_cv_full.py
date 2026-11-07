#!/usr/bin/env python3
"""Import the CV section files into src/data/cv.html, the body of the CV page (cv.html).

The page is for colleagues who want the career at a glance, so it is shorter than the CV itself; the
publications are on their own page. Run this whenever a CV section file changes, then run build.py:

    python3 tools/import_cv_full.py "<path to>/00 Academic Profile MD"
    python3 build.py

What it leaves out, at the author's request (2026-11-07): the research profile, the editorship blurb,
the Fellow citation, the awarded papers, minor service roles, teaching, talks, all professional activities
except conference organization (shown as its own section), the supervision lists that repeat the HDR
Completions table (the Taiwan Tech master's students become one summary sentence under it), past students
in the PhD list (now "Current HDR Students"), and free paragraphs elsewhere.

What it leaves out because the site is public:
  - Research Impact (bibliometrics for promotion files; they go stale)
  - nominations of colleagues, and university agreements still under approval
  - the thesis titles of current research students (their topics are not public)
  - grants that are industry contracts or current unpublished projects, and all funding amounts
  - the indented notes under an entry (dossier evidence: how it was checked, who notified, society blurbs),
    except the recipients of student awards
  - Obsidian links, block ids, HTML comments and working notes (embargo dates, publication cross-links)
"""
import html
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src", "data", "cv.html")

FILES = ["01 Profile", "02 Leadership", "03 Awards", "04 Service", "06 Professional Activities",
         "08 Grants", "09 Supervision"]
SKIP_HEADINGS = {"Research Profile", "Institutional Governance", "Research Impact", "Teaching Award Nominations (Colleagues)",
                 "Grant Review", "Fellowship Review", "Thesis Review", "Other Visiting Appointments"}
SKIP_ITEMS = ("**Initiator and lead**",                      # alliance still in the approval pathway
              "**NCP Project Leader**", "**Section Leader**", "**Principal Researcher**")   # minor service
KEEP_PARAS = {"Education", "HDR Completions"}                 # elsewhere free paragraphs are blurbs
GRANTS = ["ncp2025", "uowsurrey2025", "aegis2022", "theomurphy2022", "eis2020", "umove2019", "jsps2023"]
KEEP_NOTES = ("Conferred to",)                               # other indented notes are blurbs or evidence
TOPICS = {"Zac Barry": "gravity compensation for rehabilitation",             # current students: a broad topic,
          "Muhammad Adeel Iqbal Nguyen": "soft actuators",                     # never the thesis title (2026-11-07)
          "Duc Dung Nguyen": "gravity compensation for adaptive building façades",
          "Shuojie Li": "continuum robots",
          "Adem Benten": "gravity compensation for robotic arms"}
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
    state = {"list": False, "skip": False, "skiplevel": 9, "drop_item": False, "head": ""}

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
            state["head"] = text
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
        if raw.strip().startswith("![[10 Publications"):                         # an awarded paper
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
            item = re.sub(r"\s*Awarded papers?[^:]*:\s*$", "", s[2:])
            if CURRENT.search(item) and "supervision" in item.lower() and re.match(r"\*\*[^*]+\*\* \((?:\w+, )?\d{4}–", item):
                item = re.sub(r", \*[^*]+\*", "", item, count=1)                 # current student: no thesis title
            if not state["list"]:
                out.append("<ul>")
                state["list"] = True
            li = inline(item)
            continue
        if s.startswith("  ") and li is not None:
            if not state["drop_item"] and s.strip().startswith(KEEP_NOTES):
                sub_cont.append(inline(s.strip().replace(", for the following paper:", ".")))
            continue
        if state["drop_item"]:
            continue
        close_list()
        if state["head"] not in KEEP_PARAS:
            continue
        out.append(f"<p>{inline(s.strip())}</p>")
    close_list()
    return "\n".join(out)


def completions(md):
    """HDR Completions table: the Outcome column becomes Thesis topic and Completion year, from the student lists."""
    theses = {m[0]: (m[2], m[1]) for m in re.findall(r"^- \*\*([^*]+)\*\* \((?:\d{4}–)?(\d{4})\), \*([^*]+)\*", md, flags=re.M)}

    def row(m):
        cells = [c.strip() for c in m.group(0).strip().strip("|").split("|")]
        if cells[0] == "Student":
            return "| " + " | ".join(cells[:4] + ["Thesis topic", "Completion year"]) + " |"
        if set(m.group(0)) <= set("|-: "):
            return "|---|---|---|---|---|---|"
        topic, year = theses[cells[0]]
        return "| " + " | ".join(cells[:4] + [f"*{topic}*", year]) + " |"

    head, sep, rest = md.partition("## HDR Completions")
    table, blank, tail = rest.partition("\n\n|")[2].partition("\n\n")
    table = re.sub(r"^\|.*\|$", row, "|" + table, flags=re.M)
    return head + sep + rest.partition("\n\n|")[0] + "\n\n" + table + blank + tail


def education(md):
    """Education as one sentence: the PhD only, with the year conferred."""
    table = re.search(r"(?<=## Education\n\n)(?:\|.*\n)+", md).group(0)
    inst, country, field, year = re.search(r"^\| *([^|]+?) *\| *([^|]+?) *\| *([^|]+?) *\| *Ph\.D\. *\|[^|]*?(\d{4}) *\|$",
                                           table, flags=re.M).groups()
    return md.replace(table, f"PhD in {field}, {inst}, {country}, {year}.\n")


def section(md, heading):
    """The text of one '## heading' section, up to the next heading."""
    m = re.search(r"^## " + re.escape(heading) + r"\n.*?(?=^#|\Z)", md, flags=re.S | re.M)
    return m.group(0) if m else ""


def supervision(md):
    """Completions table with topics, current students only, and the Taiwan Tech master's students as a count."""
    md = completions(md)
    years = re.findall(r"^- \*\*[^*]+\*\* \((\d{4})\), .*Taiwan Tech \(Principal", section(md, "Master by Research (MRes)"), flags=re.M)
    for h in ("Ph.D. @ Taiwan Tech", "Master of Philosophy (MPhil) @ UOW", "Master by Research (MRes)"):
        md = md.replace(section(md, h), "")
    phd = section(md, "Ph.D. @ UOW")
    current = re.sub(r"^- (?!.*(?:–current\)|–present\))).*\n(?:  .*\n)*", "", phd, flags=re.M)
    current = re.sub(r"^(- \*\*[^*]+\*\* \()", r"\1PhD, ", current, flags=re.M)              # degree type
    current = re.sub(r"^(- \*\*([^*]+)\*\* \([^)]*\)), \*[^*]+\*",                           # broad topic for the title
                     lambda m: f"{m.group(1)}, {TOPICS[m.group(2)].capitalize()}", current, flags=re.M)
    md = md.replace(phd, current.replace("## Ph.D. @ UOW", "## Current HDR Students"))
    note = (f"In addition, {len(years)} master's students completed their degrees under my principal supervision at "
            f"Taiwan Tech ({min(years)}–{max(years)}).")
    md = md.replace("## HDR Completions (Last 5 Years)", "## HDR Completions")
    return re.sub(r"^Note: .*$", note, md, count=1, flags=re.M)


def main(base):
    cvdir = os.path.join(base, "1 CV")
    reg = open(os.path.join(base, "A2. Grant Applications", "Grant Applications List (2019-).md"), encoding="utf-8").read()
    parts = []
    for name in FILES:
        md = open(os.path.join(cvdir, name + ".md"), encoding="utf-8").read()
        md = re.sub(r"\A---\n.*?\n---\n", "", md, flags=re.S)                    # frontmatter
        if name == "01 Profile":
            md = education(md)
            md = re.sub(r" \((?:e?merged) with other engineering schools[^)]*\)", "", md)    # the 2026 school merger note
        if name == "02 Leadership":                                              # repeats the section from 06
            md = re.sub(r"^## Conference Organization\n.*?(?=^#)", "", md, flags=re.S | re.M)
        if name == "06 Professional Activities":                                 # conference organization only, one level up
            md = md.replace("# Professional Activities\n", "").replace("## Conference Organization", "# Conference Organization")
        if name == "09 Supervision":
            md = supervision(md)
        parts.append(convert(md, reg))
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("<!-- Generated by tools/import_cv_full.py from the CV section files. Do not edit by hand. -->\n")
        f.write("\n".join(parts) + "\n")
    print(f"wrote {os.path.relpath(OUT, ROOT)}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
