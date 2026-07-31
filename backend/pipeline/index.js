import ingest from "./ingest.js";
import extractAudio from "./extractAudio.js";
import transcribe from "./transcribe.js";
import selectMoments from "./selectMoments.js";
import resolveTimings from "./resolveTimings.js";
import render from "./render.js";
import handoffCanva from "./handoffCanva.js";
import { Jobs } from "../db/index.js";
import { jobDir, ensureDir, artifactExists } from "../lib/paths.js";
import { logger } from "../lib/logger.js";
import detectShots from "./detectShots.js";

const log = logger("pipeline");

export const PRE_REVIEW = [
  ingest, detectShots, extractAudio, transcribe, selectMoments, resolveTimings, render
];
export const POST_APPROVAL = [handoffCanva];

async function runStages(job, stages) {
  for (const stage of stages) {
    if (stage.artifact && artifactExists(job.id, stage.artifact)) {
      log.info(`${job.id} skip ${stage.name} (artifact exists)`);
      continue;
    }
    Jobs.setState(job.id, stage.state, `stage:${stage.name}`);
    log.info(`${job.id} run ${stage.name}`);
    try {
      await stage.run(job);
    } catch (err) {
      Jobs.fail(job.id, stage.name, err?.message ?? err);
      log.error(`${job.id} failed at ${stage.name}`, err);
      return false;
    }
  }
  return true;
}

export async function runJob(job) {
  ensureDir(jobDir(job.id));

  if (job.state === "queued") {
    if (await runStages(job, PRE_REVIEW)) {
      Jobs.setState(job.id, "awaiting_review");
      log.info(`${job.id} → awaiting_review`);
    }
    return;
  }

  if (job.state === "approved") {
    // handoffCanva sets its own terminal state (awaiting_canva | awaiting_canva_manual)
    await runStages(job, POST_APPROVAL);
  }
}