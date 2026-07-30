import fs from "node:fs";
import path from "node:path";
import { renderClip } from "../services/ffmpeg.js";
import { artifactPath, ensureDir } from "../lib/paths.js";

export default {
  name: "render",
  state: "rendering",
  artifact: "clips.json", // manifest written only after all clips succeed
  async run(job) {
    const cuts = JSON.parse(fs.readFileSync(artifactPath(job.id, "cuts.json"), "utf8"));
    const source = artifactPath(job.id, "source.mp4");
    const clipsDir = ensureDir(artifactPath(job.id, "clips"));

    const manifest = [];
    for (const cut of cuts) {
      const out = path.join(clipsDir, `${cut.n}.mp4`);
      if (!fs.existsSync(out)) {
        await renderClip(source, cut, out, cut.mode ?? "crop");
      }
      manifest.push({ n: cut.n, file: `clips/${cut.n}.mp4`, ...cut });
    }

    fs.writeFileSync(
      artifactPath(job.id, "clips.json"),
      JSON.stringify(manifest, null, 2)
    );
  }
};