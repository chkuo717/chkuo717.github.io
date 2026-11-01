# chkuo717.github.io

Personal website of Chin-Hsing Kuo, served by GitHub Pages from the `main` branch.

- `src/base.html` — page template (header, nav, footer).
- `src/pages/**/*.html` — one body fragment per page, with a short header (`title`, `nav`, `description`).
- `build.py` — assembles the fragments into the published `*.html` files at the repository root. Run `python3 build.py` after editing anything in `src/`.
- `assets/` — stylesheet, script, favicon.

No framework and no build dependency beyond Python 3. `.nojekyll` disables GitHub's Jekyll processing.
