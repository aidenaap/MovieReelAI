import fs from "node:fs";
import { download } from "../services/ytdlp.js";
import { artifactPath } from "../lib/paths.js";

export default {
  name: "ingest",
  state: "ingesting",
  artifact: "source.mp4",
  async run(job) {
    const dest = artifactPath(job.id, "source.mp4");
    if (job.source_type === "url") await download(job.source, dest);
    else fs.copyFileSync(job.source, dest);
  }
};