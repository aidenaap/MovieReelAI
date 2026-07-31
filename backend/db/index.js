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
    const job = this.get(id);
    const postApproval = ["handoffCanva", "finalize"].includes(job?.failed_stage);
    const state = postApproval ? "approved" : "queued";
    db.prepare(
      "UPDATE jobs SET state = ?, failed_stage = NULL, error = NULL, updated_at = datetime('now') WHERE id = ?"
    ).run(state, id);
    logEvent.run(id, state, "retry");
  },

  claimNextQueued() {
    return db.prepare(
      "SELECT * FROM jobs WHERE state IN ('queued','approved') ORDER BY created_at LIMIT 1"
    ).get();
  },

  reclaimOrphans() {
    const terminal = "('queued','awaiting_review','approved','awaiting_canva','awaiting_canva_manual','published','failed')";
    const rows = db.prepare(`SELECT id, state FROM jobs WHERE state NOT IN ${terminal}`).all();
    for (const r of rows) {
      db.prepare(
        "UPDATE jobs SET state='failed', failed_stage=?, error=?, updated_at=datetime('now') WHERE id=?"
      ).run(r.state, "interrupted by server restart", r.id);
      logEvent.run(r.id, "failed", `orphaned in ${r.state}`);
    }
    return rows.length;
  },

  remove(id) {
    db.prepare("DELETE FROM job_events WHERE job_id = ?").run(id);
    db.prepare("DELETE FROM jobs WHERE id = ?").run(id);
  },
};

if (!db.prepare("PRAGMA table_info(jobs)").all().some((c) => c.name === "name")) {
  db.exec("ALTER TABLE jobs ADD COLUMN name TEXT");
}

export function renameJob(id, name) {
  const r = db.prepare("UPDATE jobs SET name = ? WHERE id = ?").run(name, id);
  return r.changes ? db.prepare("SELECT * FROM jobs WHERE id = ?").get(id) : null;
}

export default db;