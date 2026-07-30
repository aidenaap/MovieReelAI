import { Jobs } from "../db/index.js";
import { runJob } from "../pipeline/index.js";
import { logger } from "../lib/logger.js";

const log = logger("worker");
let busy = false;

async function tick() {
  if (busy) return;
  const job = Jobs.claimNextQueued();
  if (!job) return;
  busy = true;
  try {
    await runJob(job);
  } finally {
    busy = false;
  }
}

export function startWorker(intervalMs = 1000) {
  log.info("worker started");
  setInterval(() => tick().catch((e) => log.error("tick error", e)), intervalMs);
}