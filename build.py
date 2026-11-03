#!/usr/bin/env python3
"""Assemble the site: src/pages/**/*.html (body fragments with a small header) + src/base.html -> ./**/*.html

Page header (first lines, until a blank line):
    title: Research
    nav: research          # which nav item is highlighted
    description: one line  # <meta name="description">
Everything after the blank line is the page body.

Tokens inside a body:
    {{papers:gravity}}      representative papers of that theme (rep: true), as a list with a "soon" tag
    {{papers-all:gravity}}  the remaining papers of that theme
    {{anims:gravity}}       cards linking to the theme's animation pages (papers with an "anim" path)
    {{cite:MMT2023}}        one-line citation of one paper, for its animation page
    {{publications}}        the full publication list, from src/data/publications.json (made by tools/import_cv.py)
Animation pages live in src/pages/papers/<key>.html and load their script from assets/anim/.
Data comes from src/data/papers.json. Pages under src/pages/_drafts/ are not built.

Run:  python3 build.py
"""
import html
import json
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src", "pages")
BASE = open(os.path.join(ROOT, "src", "base.html"), encoding="utf-8").read()
PAPERS = json.load(open(os.path.join(ROOT, "src", "data", "papers.json"), encoding="utf-8"))["papers"]
PUBS = json.load(open(os.path.join(ROOT, "src", "data", "publications.json"), encoding="utf-8"))["sections"]

NAV = [
    ("index.html", "home", "Home"),
    ("research/index.html", "research", "Research"),
    ("publications.html", "publications", "Publications"),
    ("talks-teaching.html", "talks", "Talks &amp; Teaching"),
    ("about.html", "about", "About"),
]

TYPE_LABEL = {"chapter": "Book chapter", "book": "Book", "patent": "Patent"}


def parse(text):
    head, _, body = text.partition("\n\n")
    meta = {}
    for line in head.splitlines():
        k, _, v = line.partition(":")
        meta[k.strip()] = v.strip()
    return meta, body


import hashlib, re as _re

def asset_version(rel_asset):
    """Short content hash of a file under assets/, so browsers fetch a changed file at once."""
    path = os.path.join(ROOT, "assets", rel_asset)
    try:
        with open(path, "rb") as fh:
            return hashlib.sha1(fh.read()).hexdigest()[:8]
    except OSError:
        return "0"

def stamp_assets(html):
    """Append ?v=<hash> to every local .css/.js reference (src= or href=) that points into assets/."""
    def sub(m):
        prefix, rel_asset, ext = m.group(1), m.group(2), m.group(3)
        return f'{prefix}{rel_asset}{ext}?v={asset_version(rel_asset + ext)}"'
    return _re.sub(r'((?:src|href)="(?:\.\./)*assets/)([^"?]+?)(\.css|\.js)"', sub, html)

def build_nav(active, root):
    items = []
    for href, key, label in NAV:
        cls = ' class="active" aria-current="page"' if key == active else ""
        items.append(f'<a href="{root}{href}"{cls}>{label}</a>')
    return "\n        ".join(items)


def paper_item(p, rep, root=""):
    e = html.escape
    title = e(p["title"])
    href = f'https://doi.org/{p["doi"]}' if p.get("doi") else p.get("url")
    link = ""
    if href:
        title = f'<a href="{e(href)}">{title}</a>'
        link = f' <a href="{e(href)}">{"doi" if p.get("doi") else "link"}</a>'
    tag = ""
    if p.get("anim"):
        tag = f' <a class="anim" href="{root}{e(p["anim"])}">animation</a>'
    elif rep:
        tag = ' <span class="soon">animation coming</span>'
    kind = TYPE_LABEL.get(p.get("type"), "")
    kind_html = f'<span class="kind">{kind}</span> ' if kind else ""
    note = f'<br><span class="note">{p["note"]}</span>' if p.get("note") else ""  # note may carry a link
    body = (f'{kind_html}<strong>{title}.</strong>{tag}<br>'
            f'<span class="venue">{e(p["authors"])}, <em>{e(p["venue"])}</em>, {p["year"]}.{link}</span>{note}')
    if p.get("mini"):
        # a small animated figure beside the entry, drawn by assets/anim/mini.js; "mini" holds its one-line caption
        aria = e(p.get("mini_alt") or p["mini"])
        return (f'<li class="has-mini"><svg class="mini" data-mini="{e(p["key"])}" viewBox="0 0 160 110" role="img" aria-label="{aria}"></svg>'
                f'<div>{body}<br><span class="mini-cap">{p["mini"]}</span></div></li>')
    return f'<li>{body}</li>'


def papers_html(theme, rep_only, root):
    sel = [p for p in PAPERS if p["theme"] == theme and bool(p.get("rep")) == rep_only]
    if rep_only:
        sel.sort(key=lambda p: -p["year"])
    else:
        sel.sort(key=lambda p: (p.get("type") is not None, -p["year"]))
    out = '<ul class="papers">\n' + "\n".join(paper_item(p, rep_only, root) for p in sel) + "\n</ul>"
    if any(p.get("mini") for p in sel):
        out += f'\n<script src="{root}assets/anim/mini.js" defer></script>'
    return out


def anims_html(theme, root):
    """Cards linking to the animation pages of a theme (papers with an `anim` field), newest first."""
    e = html.escape
    sel = sorted([p for p in PAPERS if p["theme"] == theme and p.get("anim")], key=lambda p: -p["year"])
    cards = []
    for p in sel:
        blurb = e(p.get("blurb", ""))
        cards.append(f'<a class="card anim-card" href="{root}{e(p["anim"])}"><span class="tag">Animation · {p["year"]}</span>'
                     f'<h3>{e(p.get("short", p["title"]))}</h3><p>{blurb}</p></a>')
    return '<div class="grid cols-2">\n' + "\n".join(cards) + "\n</div>"


def cite_html(key):
    """One-line citation of a paper, for the foot of its animation page."""
    e = html.escape
    p = next(q for q in PAPERS if q["key"] == key)
    href = f'https://doi.org/{p["doi"]}' if p.get("doi") else p.get("url")
    title = f'<a href="{e(href)}">{e(p["title"])}</a>' if href else e(p["title"])
    doi = f' doi:<a href="{e(href)}">{e(p["doi"])}</a>' if p.get("doi") else ""
    return (f'<p class="cite"><strong>The paper.</strong> {e(p["authors"])}, "{title}," '
            f'<em>{e(p["venue"])}</em>, {p["year"]}.{doi}</p>')


def publications_html(root):
    """The full list, one section per kind, newest first as in the CV; links to an animation page where one exists."""
    anim = {p["key"].lower(): p["anim"] for p in PAPERS if p.get("anim")}
    counts = " ".join(f'<a href="#{s["id"]}">{s["label"]} <span class="count">{len(s["items"])}</span></a>' for s in PUBS)
    out = [f'<nav class="pub-jump" aria-label="Sections">{counts}</nav>']
    for s in PUBS:
        out.append(f'<h2 id="{s["id"]}">{s["label"]}</h2>\n<ol class="pubs" reversed>')
        for it in sorted(s["items"], key=lambda it: -(it["year"] or 0)):   # stable: CV order within a year
            a = anim.get(it["key"].lower())
            tag = f' <a class="anim" href="{root}{html.escape(a)}">animation</a>' if a else ""
            out.append(f'<li id="{html.escape(it["key"])}">{it["html"]}{tag}</li>')
        out.append("</ol>")
    return "\n".join(out)


def expand_tokens(body, root):
    body = body.replace("{{publications}}", publications_html(root))
    body = re.sub(r"\{\{papers:(\w+)\}\}", lambda m: papers_html(m.group(1), True, root), body)
    body = re.sub(r"\{\{papers-all:(\w+)\}\}", lambda m: papers_html(m.group(1), False, root), body)
    body = re.sub(r"\{\{anims:(\w+)\}\}", lambda m: anims_html(m.group(1), root), body)
    body = re.sub(r"\{\{cite:(\w+)\}\}", lambda m: cite_html(m.group(1)), body)
    return body


SITE = "https://chkuo717.github.io/"


def write_sitemap(rels):
    """sitemap.xml (every built page except 404) and robots.txt pointing to it, for search engines."""
    urls = sorted(r.replace(os.sep, "/") for r in rels if r != "404.html")
    urls = [u[: -len("index.html")] if u.endswith("index.html") else u for u in urls]
    body = "\n".join(f"  <url><loc>{SITE}{html.escape(u)}</loc></url>" for u in urls)
    with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n'
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + body + "\n</urlset>\n")
    with open(os.path.join(ROOT, "robots.txt"), "w", encoding="utf-8") as f:
        f.write(f"User-agent: *\nAllow: /\n\nSitemap: {SITE}sitemap.xml\n")


def main():
    count = 0
    rels = []
    for dirpath, dirs, files in os.walk(SRC):
        dirs[:] = [d for d in dirs if not d.startswith("_")]
        for fn in sorted(files):
            if not fn.endswith(".html"):
                continue
            src_path = os.path.join(dirpath, fn)
            rel = os.path.relpath(src_path, SRC)
            depth = rel.count(os.sep)
            root = "../" * depth
            meta, body = parse(open(src_path, encoding="utf-8").read())
            title = meta.get("title", "")
            full_title = "Chin-Hsing Kuo" if meta.get("nav") == "home" else f"{title} · Chin-Hsing Kuo"
            page = (BASE.replace("{{title}}", full_title)
                        .replace("{{description}}", meta.get("description", ""))
                        .replace("{{root}}", root)
                        .replace("{{nav}}", build_nav(meta.get("nav", ""), root))
                        .replace("{{body_class}}", meta.get("nav", ""))
                        .replace("{{content}}", expand_tokens(body, root).strip()))
            page = stamp_assets(page)
            out_path = os.path.join(ROOT, rel)
            os.makedirs(os.path.dirname(out_path), exist_ok=True)
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(page)
            count += 1
            rels.append(rel)
    write_sitemap(rels)
    print(f"built {count} pages, sitemap.xml and robots.txt")


if __name__ == "__main__":
    main()
