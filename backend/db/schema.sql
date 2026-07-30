CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'url',
  state TEXT NOT NULL DEFAULT 'queued',
  failed_stage TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS job_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  state TEXT NOT NULL,
  detail TEXT,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);