# ANN — D1 + Pages Functions setup notes

This doc explains the architecture and the exact steps **you** need to do to make
the live site read from a database (Cloudflare D1) and refresh daily — without any
git push. Written for a frontend dev, so backend/devops terms are explained inline.

---

## 1. The big picture

```
  Daily task (Claude, your machine, 7am)
        │  generates today's edition, then upserts it
        ▼
  Cloudflare D1  ── the database (serverless SQLite). One row per day.
        ▲
        │  read-only queries
  Pages Functions  ── tiny serverless endpoints under /functions/api/*
        ▲            (no server to run; Cloudflare hosts them on its edge)
        │  fetch('/api/news')
  Browser (index.html / article.html / archive.html)
```

- **D1** = Cloudflare's free serverless SQL database (SQLite under the hood).
- **Pages Functions** = files in `/functions` that Cloudflare turns into live API
  endpoints automatically. `env.DB` inside them is the database "binding".
- **Binding** = a named handle (we use `DB`) that connects a Function to a specific
  D1 database. Set once in the dashboard.
- The website files never change daily — only the **data in D1** changes. That's why
  no git push is needed for daily updates.

### Files added/changed in the repo
| File | Role |
|---|---|
| `schema.sql` | the `editions` table definition |
| `wrangler.toml` | Cloudflare config + D1 binding (mainly for local dev) |
| `functions/api/news.js` | `GET /api/news` → latest edition |
| `functions/api/editions.js` | `GET /api/editions` → list of dates (archive dropdown) |
| `functions/api/edition/[date].js` | `GET /api/edition/YYYY-MM-DD` → one past edition |
| `index.html` | now `fetch('/api/news')`, falls back to `news-data.js` locally |
| `article.html` | fetches live; supports `?id=...&date=...` for archived stories |
| `archive.html` | NEW — browse past editions by date |
| `news-data.js` | kept as a **local/offline fallback seed** (not updated daily) |

---

## 2. One-time setup (do these in order)

### Step 1 — Create the D1 database
In a terminal, from the repo folder:
```bash
npx wrangler login                 # opens browser, authorize once
npx wrangler d1 create cnn-ai-db
```
This prints a **database_id**. Copy it.

### Step 2 — Put the database_id in wrangler.toml
Open `wrangler.toml` and replace `REPLACE_WITH_YOUR_DATABASE_ID` with the id from Step 1.
(Safe to commit — the database_id is not a secret. The API **token** is the secret, and
that never goes in the repo.)

### Step 3 — Create the table
```bash
npx wrangler d1 execute cnn-ai-db --remote --file=./schema.sql
```
`--remote` means "run against the real cloud database" (not a local copy).

### Step 4 — Bind the database to your Pages project
Cloudflare dashboard → your **cnn-ai** Pages project → **Settings → Functions →
D1 database bindings → Add binding**:
- **Variable name:** `DB`   (must be exactly this — the code uses `env.DB`)
- **D1 database:** `cnn-ai-db`

Then redeploy (push any commit, or hit **Retry deployment**) so the binding takes effect.

### Step 5 — Create the local secrets file (for the daily task)
The daily task writes to D1 using Cloudflare's HTTP API, which needs 3 values.
Create this file **outside the repo** so it's never committed:

```bash
cat > ~/.cnn-ai-secrets.env <<'EOF'
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_D1_DATABASE_ID=your_database_id
CLOUDFLARE_API_TOKEN=your_api_token
EOF
chmod 600 ~/.cnn-ai-secrets.env
```
- **account_id**: dashboard URL or any project's "Account ID".
- **database_id**: from Step 1.
- **API token**: dashboard → **My Profile → API Tokens → Create Token**. Give it
  permission **Account → D1 → Edit**. Copy the token (shown once).

### Step 6 — Seed the first edition
Open the **Scheduled** sidebar → the `ann-ai-news-daily` task → **Run now**.
It will generate today's content and upsert it into D1. Visit
`https://cnn-ai.pages.dev/api/news` — you should see JSON. The homepage will now load
from the database.

---

## 3. How daily updates work after setup
- 7:00am the task runs, generates a fresh edition, writes one row into D1.
- The live site picks it up immediately (the API reads the newest row; edge cache is 5 min).
- Every day is kept, so `archive.html` fills up automatically over time.
- **No git push, ever**, for content. You only push when you change the site's code/design.

---

## 4. Testing locally (optional)
Opening the files directly (`file://`) uses the `news-data.js` fallback — fine for
checking layout, but the API/archive won't work. To test the real API locally:
```bash
npx wrangler pages dev . --d1 DB=cnn-ai-db
```
Then open the printed `http://localhost:8788`.

---

## 5. Quick reference — API endpoints
| Endpoint | Returns |
|---|---|
| `GET /api/news` | newest edition (JSON object) |
| `GET /api/editions` | `["2026-06-14","2026-06-13", ...]` |
| `GET /api/edition/2026-06-13` | that day's edition (JSON object) |

---

## 6. Security notes
- **anon/public side:** the Functions are read-only (only `SELECT`). Visitors can't write.
- **secret side:** the only thing that can write is the daily task, using the API token
  in `~/.cnn-ai-secrets.env`. Keep that file off git. Consider adding `*.env` to
  `.gitignore` as a safety net even though the file lives in your home dir.
- The Supabase plan is now unnecessary — D1 covers both the live data and the archive.
