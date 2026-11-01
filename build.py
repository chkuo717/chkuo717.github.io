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

NAV = [
    ("index.html", "home", "Home"),
    ("research/index.html", "research", "Research"),
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


def build_nav(active, root):
    items = []
    for href, key, label in NAV:
        cls = ' class="active" aria-current="page"' if key == active else ""
        items.append(f'<a href="{root}{href}"{cls}>{label}</a>')
    return "\n        ".join(items)


def paper_item(p, rep):
    e = html.escape
    title = e(p["title"])
    href = f'https://doi.org/{p["doi"]}' if p.get("doi") else p.get("url")
    link = ""
    if href:
        title = f'<a href="{e(href)}">{title}</a>'
        link = f' <a href="{e(href)}">{"doi" if p.get("doi") else "link"}</a>'
    tag = ""
    if p.get("anim"):
        tag = f' <a class="anim" href="{e(p["anim"])}">animation</a>'
    elif rep:
        tag = ' <span class="soon">animation coming</span>'
    kind = TYPE_LABEL.get(p.get("type"), "")
    kind_html = f'<span class="kind">{kind}</span> ' if kind else ""
    note = f'<br><span class="note">{p["note"]}</span>' if p.get("note") else ""  # note may carry a link
    return (f'<li>{kind_html}<strong>{title}.</strong>{tag}<br>'
            f'<span class="venue">{e(p["authors"])}, <em>{e(p["venue"])}</em>, {p["year"]}.{link}</span>{note}</li>')


def papers_html(theme, rep_only):
    sel = [p for p in PAPERS if p["theme"] == theme and bool(p.get("rep")) == rep_only]
    if rep_only:
        sel.sort(key=lambda p: -p["year"])
    else:
        sel.sort(key=lambda p: (p.get("type") is not None, -p["year"]))
    return '<ul class="papers">\n' + "\n".join(paper_item(p, rep_only) for p in sel) + "\n</ul>"


def expand_tokens(body):
    body = re.sub(r"\{\{papers:(\w+)\}\}", lambda m: papers_html(m.group(1), True), body)
    body = re.sub(r"\{\{papers-all:(\w+)\}\}", lambda m: papers_html(m.group(1), False), body)
    return body


def main():
    count = 0
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
                        .replace("{{content}}", expand_tokens(body).strip()))
            out_path = os.path.join(ROOT, rel)
            os.makedirs(os.path.dirname(out_path), exist_ok=True)
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(page)
            count += 1
    print(f"built {count} pages")


if __name__ == "__main__":
    main()
