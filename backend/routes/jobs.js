import { Router } from "express";
import fs from "node:fs";
import { Jobs } from "../db/index.js";
import { enqueue } from "../queue/queue.js";

const router = Router();

router.post("/", (req, res) => {
  const { sourceUrl, sourcePath } = req.body ?? {};
  if (sourceUrl) {
    try { new URL(sourceUrl); } catch {
      return res.status(400).json({ error: "sourceUrl is not a valid URL" });
    }
    return res.status(202).json(enqueue(sourceUrl, "url"));
  }
  if (sourcePath) {
    if (!fs.existsSync(sourcePath)) {
      return res.status(400).json({ error: "sourcePath not found" });
    }
    return res.status(202).json(enqueue(sourcePath, "path"));
  }
  res.status(400).json({ error: "provide sourceUrl or sourcePath" });
});

router.get("/", (req, res) => res.json(Jobs.list()));

router.get("/:id", (req, res) => {
  const job = Jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: "not found" });
  res.json({ ...job, events: Jobs.events(job.id) });
});

router.post("/:id/retry", (req, res) => {
  const job = Jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: "not found" });
  if (job.state !== "failed") {
    return res.status(409).json({ error: "job is not in failed state" });
  }
  Jobs.requeue(job.id); // artifacts kept → completed stages skip on rerun
  res.json(Jobs.get(job.id));
});

export default router;