import fs from "node:fs";
import path from "node:path";
import { Jobs } from "../db/index.js";
import { artifactPath, OUTPUT, ensureDir } from "../lib/paths.js";
import { startExport, tryFetchExport, downloadTo } from "../services/canva.js";
import { logger } from "../lib/logger.js";

const log = logger("finalize");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function finalizeJob(jobId) {
  const designs = JSON.parse(fs.readFileSync(artifactPath(jobId, "canva.json"), "utf8"));
  ensureDir(OUTPUT);
  Jobs.setState(jobId, "publishing", "pulling exports");

  const outputs = [];
  for (const d of designs) {
    if (d.manual) continue;
    log.info(`${jobId} exporting design ${d.designId}`);
    const exportId = await startExport(d.designId);

    let result;
    const deadline = Date.now() + 5 * 60 * 1000;
    do {
      await sleep(3000);
      result = await tryFetchExport(exportId);
      if (Date.now() > deadline) throw new Error("export timed out after 5 minutes");
    } while (result.status === "in_progress");

    if (result.status !== "success") {
      throw new Error(`export failed: ${JSON.stringify(result.error ?? result)}`);
    }
    const dest = path.join(OUTPUT, `${jobId}-${d.n}.mp4`);
    await downloadTo(result.downloadUrl, dest);
    outputs.push(dest);
    d.exported = dest;
  }

  fs.writeFileSync(artifactPath(jobId, "canva.json"), JSON.stringify(designs, null, 2));
  Jobs.setState(jobId, "published", `${outputs.length} file(s) in /output`);
  return outputs;
}