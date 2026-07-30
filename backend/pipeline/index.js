import fs from "node:fs";
import { Jobs } from "../db/index.js";
import { jobDir, ensureDir, artifactExists, artifactPath } from "../lib/paths.js";
import { logger } from "../lib/logger.js";

const log = logger("pipeline");

import ingest from "./ingest.js";
import extractAudio from "./extractAudio.js";
import transcribe from "./transcribe.js";
import selectMoments from "./selectMoments.js";

export const STAGES = [ingest, extractAudio, transcribe, selectMoments];

export async function runJob(job) {
  ensureDir(jobDir(job.id));

  for (const stage of STAGES) {
    if (artifactExists(job.id, stage.artifact)) {
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
      return;
    }
  }

  Jobs.setState(job.id, "awaiting_review");
  log.info(`${job.id} → awaiting_review`);
}