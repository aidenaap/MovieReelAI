import fs from "node:fs";
import { Jobs } from "../db/index.js";
import { artifactPath } from "../lib/paths.js";
import { isConnected, uploadClip, createDesignFromClip } from "../services/canva.js";
import { logger } from "../lib/logger.js";

const log = logger("canva");

export default {
  name: "handoffCanva",
  state: "publishing",
  artifact: "canva.json",
  async run(job) {
    const cuts = JSON.parse(fs.readFileSync(artifactPath(job.id, "cuts.json"), "utf8"));
    const approved = cuts.filter((c) => c.status === "approved");

    if (!isConnected()) {
      const manual = approved.map((c) => ({
        n: c.n,
        manual: true,
        localFile: artifactPath(job.id, `clips/${c.n}.mp4`)
      }));
      fs.writeFileSync(artifactPath(job.id, "canva.json"), JSON.stringify(manual, null, 2));
      Jobs.setState(job.id, "awaiting_canva_manual", "canva not connected");
      log.warn(`${job.id} → awaiting_canva_manual (no Canva credentials/connection)`);
      return;
    }

    const results = [];
    for (const c of approved) {
      const file = artifactPath(job.id, `clips/${c.n}.mp4`);
      const assetName = `${job.id}-${c.n}.mp4`;
      log.info(`${job.id} uploading clip ${c.n}`);
      const { assetId } = await uploadClip(file, assetName);
      const { designId, editUrl } = await createDesignFromClip(assetId, {
        title: `${c.hook} [${job.id}/${c.n}]`.slice(0, 50)
      });
      results.push({ n: c.n, assetId, assetName, designId, editUrl });
    }

    fs.writeFileSync(artifactPath(job.id, "canva.json"), JSON.stringify(results, null, 2));
    Jobs.setState(job.id, "awaiting_canva", `${results.length} design(s) created`);
  }
};