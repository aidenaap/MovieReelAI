import fs from "node:fs";
import { selectMoments } from "../services/claude.js";
import { artifactPath } from "../lib/paths.js";

export default {
  name: "selectMoments",
  state: "selecting",
  artifact: "candidates.json",
  async run(job) {
    const transcript = JSON.parse(
      fs.readFileSync(artifactPath(job.id, "transcript.json"), "utf8")
    );
    const candidates = await selectMoments(transcript);
    fs.writeFileSync(
      artifactPath(job.id, "candidates.json"),
      JSON.stringify(candidates, null, 2)
    );
  }
};