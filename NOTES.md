# ANN — AI News Network · how it works (frontend-only)

No backend, no database. The whole site is static files on Cloudflare Pages.
Content lives in plain JS files; the pages read them directly in the browser.

## Files
| File | Role |
|---|---|
| `index.html` | homepage — reads `window.ANN_DATA` from `news-data.js` |
| `article.html` | story detail — today from `news-data.js`; archived via `?date=` |
| `archive.html` | browse past editions (dropdown) |
| `style.css` | shared dark-mode styling |
| `news-data.js` | **today's** edition: `window.ANN_DATA = { ... }` |
| `archive/manifest.js` | list of available dates: `window.ANN_ARCHIVE = [...]` |
| `archive/YYYY-MM-DD.js` | one snapshot per day: `window.ANN_EDITIONS["DATE"] = {...}` |

## How data flows
- Homepage / article load `news-data.js` with a normal `<script>` tag — that's it.
- Archive loads `archive/manifest.js` for the date list, then injects
  `archive/<date>.js` on demand (script injection, so it works on the live site
  **and** when opening the file locally — no fetch/CORS needed).

## Daily updates (the scheduler)
The `ann-ai-news-daily` task runs each morning (~7am, only while the Claude app is open).
Each run it regenerates locally:
1. `news-data.js` (today's edition)
2. `archive/<today>.js` (a dated snapshot)
3. `archive/manifest.js` (rebuilt from the dated files present)

**It does NOT git push.** The files update on your machine; the live Cloudflare
site changes only when *you* push:
```bash
git add . && git commit -m "Update edition" && git push
```
Cloudflare auto-redeploys on push. So the archive only grows on the live site for the
days you choose to push.

> Want daily LIVE updates later without pushing yourself? Two options: (a) switch the
> task to auto commit+push, or (b) add a backend (e.g. Cloudflare D1) — both were set
> aside for now.

## Local preview
Just open `index.html` in a browser. Everything (home, article, archive, read toggle,
copy-prompt) works offline because it's all static + localStorage.

## Notes
- The read/seen toggle is stored in your browser's `localStorage` (per browser/device).
- YouTube cards link to YouTube *search* URLs so they always resolve to fresh results.
- To wipe the archive, delete files in `/archive` (keep `manifest.js` or let the task
  rebuild it) and push.
