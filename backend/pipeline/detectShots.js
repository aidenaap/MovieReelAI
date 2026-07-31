import fs from "node:fs";
import { detectShots } from "../services/ffmpeg.js";
import { artifactPath } from "../lib/paths.js";
import { logger } from "../lib/logger.js";

const log = logger("shots");

export default {
  name: "detectShots",
  state: "extracting",
  artifact: "shots.json",
  async run(job) {
    const threshold = parseFloat(process.env.SCENE_THRESHOLD ?? "0.4");
    const boundaries = await detectShots(artifactPath(job.id, "source.mp4"), threshold);
    log.info(`${job.id} found ${boundaries.length} shot boundaries`);
    fs.writeFileSync(
      artifactPath(job.id, "shots.json"),
      JSON.stringify({ threshold, boundaries }, null, 2)
    );
  }
};