-- ANN — AI News Network · D1 (SQLite) schema
-- One row per daily edition. The whole day's ANN_DATA object is stored
-- as a JSON string in `data`. D1 is SQLite, so there is no JSONB type —
-- TEXT holds the JSON fine, and we query/sort by edition_date.

CREATE TABLE IF NOT EXISTS editions (
  edition_date TEXT PRIMARY KEY,                       -- 'YYYY-MM-DD'
  data         TEXT NOT NULL,                          -- JSON.stringify(ANN_DATA)
  created_at   TEXT NOT NULL DEFAULT (datetime('now')) -- UTC timestamp
);

-- Speeds up "latest edition" and archive-by-date lookups.
CREATE INDEX IF NOT EXISTS idx_editions_date ON editions(edition_date DESC);
