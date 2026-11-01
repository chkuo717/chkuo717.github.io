#!/usr/bin/env python3
"""Assemble the site: src/pages/**/*.html (body fragments with a small header) + src/base.html -> ./**/*.html

Page header (first lines, until a blank line):
    title: Research
    nav: research          # which nav item is highlighted
    description: one line  # <meta name="description">
Everything after the blank line is the page body.
Run:  python3 build.py
"""
import os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src", "pages")
BASE = open(os.path.join(ROOT, "src", "base.html"), encoding="utf-8").read()

NAV = [
    ("index.html", "home", "Home"),
    ("research/index.html", "research", "Research"),
    ("playground.html", "playground", "Playground"),
    ("talks-teaching.html", "talks", "Talks &amp; Teaching"),
    ("notes.html", "notes", "Notes"),
    ("collection.html", "collection", "Collection"),
    ("about.html", "about", "About"),
]


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


def main():
    count = 0
    for dirpath, _, files in os.walk(SRC):
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
            html = (BASE.replace("{{title}}", full_title)
                        .replace("{{description}}", meta.get("description", ""))
                        .replace("{{root}}", root)
                        .replace("{{nav}}", build_nav(meta.get("nav", ""), root))
                        .replace("{{body_class}}", meta.get("nav", ""))
                        .replace("{{content}}", body.strip()))
            out_path = os.path.join(ROOT, rel)
            os.makedirs(os.path.dirname(out_path), exist_ok=True)
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(html)
            count += 1
    print(f"built {count} pages")


if __name__ == "__main__":
    main()
