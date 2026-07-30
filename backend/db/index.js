import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(here, "clipper.db"));
db.pragma("journal_mode = WAL");
db.exec(readFileSync(path.join(here, "schema.sql"), "utf8"));

const logEvent = db.prepare(
  "INSERT INTO job_events (job_id, state, detail) VALUES (?, ?, ?)"
);

export const Jobs = {
  create(id, source, sourceType) {
    db.prepare("INSERT INTO jobs (id, source, source_type) VALUES (?, ?, ?)")
      .run(id, source, sourceType);
    logEvent.run(id, "queued", null);
    return this.get(id);
  },

  get(id) {
    return db.prepare("SELECT * FROM jobs WHERE id = ?").get(id);
  },

  list() {
    return db.prepare("SELECT * FROM jobs ORDER BY created_at DESC").all();
  },

  events(id) {
    return db.prepare("SELECT * FROM job_events WHERE job_id = ? ORDER BY id").all(id);
  },

  setState(id, state, detail = null) {
    db.prepare(
      "UPDATE jobs SET state = ?, error = NULL, updated_at = datetime('now') WHERE id = ?"
    ).run(state, id);
    logEvent.run(id, state, detail);
  },

  fail(id, stage, error) {
    db.prepare(
      "UPDATE jobs SET state = 'failed', failed_stage = ?, error = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(stage, String(error), id);
    logEvent.run(id, "failed", `${stage}: ${error}`);
  },

  requeue(id) {
    db.prepare(
      "UPDATE jobs SET state = 'queued', failed_stage = NULL, error = NULL, updated_at = datetime('now') WHERE id = ?"
    ).run(id);
    logEvent.run(id, "queued", "retry");
  },

  claimNextQueued() {
    return db.prepare(
      "SELECT * FROM jobs WHERE state = 'queued' ORDER BY created_at LIMIT 1"
    ).get();
  }
};

export default db;