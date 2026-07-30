import fs from "node:fs";
import { findGaps, snapStart, snapEnd } from "../services/silence.js";
import { probeDuration } from "../services/ffmpeg.js";
import { artifactPath } from "../lib/paths.js";

const HEAD_PAD = 0.12;  // spec: 120 ms head
const TAIL_PAD = 0.25;  // spec: 250 ms tail

export default {
  name: "resolveTimings",
  state: "rendering", // transitional; render stage keeps this state
  artifact: "cuts.json",
  async run(job) {
    const transcript = JSON.parse(fs.readFileSync(artifactPath(job.id, "transcript.json"), "utf8"));
    const candidates = JSON.parse(fs.readFileSync(artifactPath(job.id, "candidates.json"), "utf8"));
    const duration = await probeDuration(artifactPath(job.id, "source.mp4"));

    const gaps = findGaps(transcript.words);

    const cuts = candidates.map((c, n) => {
      const snappedStart = snapStart(transcript.words, c.startIdx, gaps);
      const snappedEnd = snapEnd(transcript.words, c.endIdx, gaps, duration);
      return {
        n,
        startIdx: c.startIdx,
        endIdx: c.endIdx,
        start: Math.max(0, snappedStart - HEAD_PAD),
        end: Math.min(duration, snappedEnd + TAIL_PAD),
        cropX: 0.5,          // review UI adjusts later
        hook: c.hook,
        score: c.score,
        reason: c.reason
      };
    });

    fs.writeFileSync(artifactPath(job.id, "cuts.json"), JSON.stringify(cuts, null, 2));
  }
};