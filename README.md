# marlonfs.github.io

Personal academic website, published via GitHub Pages. Bilingual: English (default) and Portuguese, toggled with the **EN / PT** button in the header — no build step, no dependencies.

Live at: https://marlonfs.github.io

## Structure

- `index.html` — page markup and the five sections (tabs): About, Research, Publications, Extension, Teaching.
- `assets/style.css` — all styling.
- `assets/translations.js` — every piece of visible text, in English and Portuguese. **Edit this file to update site content.**
- `assets/main.js` — tab switching and language toggle logic.

## Editing content

Open `assets/translations.js` and edit the strings under `en` and `pt` for the section you want to change (e.g. `research_p1_title`, `pub_1`, `teaching_1_course`). Keep both languages in sync. `index.html` only needs edits if you add or remove a section/card, not to change text.

## Local preview

Just open `index.html` in a browser, or serve the folder locally, e.g.:

```bash
python -m http.server 8000
```

## Deploying

Pages is served automatically from the `main` branch root for this repo (its name matches the `<username>.github.io` pattern). Push to `main` and the live site updates within a minute or two.
