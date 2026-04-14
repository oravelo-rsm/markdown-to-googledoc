# markdown-to-googledoc

Convert Markdown to Google Docs API-friendly formatting and back again.

This repository contains:

- A reusable JavaScript library for format conversion
- A single-page web app for manual conversion/testing
- A GitHub Pages workflow so the app can stay hosted on GitHub

## Project goals

- Keep conversion logic reusable across web apps
- Keep the demo app simple and static (no backend required)
- Support both directions:
  - Markdown -> Google Docs requests/document structure
  - Google Docs document structure -> Markdown

## Current status

This is a **starter scaffold** with a working but intentionally lightweight conversion core.

Currently supported (basic):

- Paragraphs
- Headings (`#` to `######`)
- Simple list markers (`-`, `*`, `+`, `1.`)

Planned (next):

- Inline styles (bold, italic, links)
- Better list nesting
- Tables/code blocks
- More accurate Google Docs style mapping

## Repository layout

```
.
├── .github/workflows/pages.yml   # GitHub Pages deployment (Actions)
├── src/
│   ├── converter.js               # Core conversion logic
│   ├── index.js                   # Library entry (ES module)
│   └── browser-entry.js           # Browser global entry (window.MarkdownGoogleDoc)
├── app.js                         # SPA behavior
├── styles.css                     # SPA styling
├── index.html                     # SPA page (GitHub Pages entry)
└── package.json
```

## Library usage

### ES module usage

```js
import {
  markdownToGoogleDocsRequests,
  googleDocsDocumentToMarkdown,
} from "./src/index.js";

const requests = markdownToGoogleDocsRequests("# Hello\nThis is a test.");
```

### Browser global usage

```html
<script type="module" src="./src/browser-entry.js"></script>
<script>
  // window.MarkdownGoogleDoc is available after module load
  const api = window.MarkdownGoogleDoc;
</script>
```

### API

- `markdownToGoogleDocsRequests(markdown: string): object[]`
  - Produces a Google Docs API `batchUpdate`-style request array
- `googleDocsDocumentToMarkdown(document: object): string`
  - Converts a Google Docs `documents.get` response shape into Markdown

## Run locally

Because this is a static app, run any local web server from the repo root:

```bash
npx serve .
```

Then open the shown local URL in your browser.

## GitHub Pages hosting

This repo includes `.github/workflows/pages.yml` to deploy the static app from GitHub Actions.

1. Push this repository to GitHub.
2. In **Settings > Pages**, set source to **GitHub Actions**.
3. Push to `main`.
4. GitHub will publish `index.html` and related files as your single-page app.

## Reusing in other apps

- Import `src/index.js` directly for ES-module based apps.
- Copy or publish the library entry as needed for your package strategy.
- Keep app UI (`index.html`, `app.js`) separate from conversion core (`src/`) so the core stays portable.

## License

MIT (see `LICENSE`).
