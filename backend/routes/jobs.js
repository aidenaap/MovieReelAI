import { Router } from "express";
import fs from "node:fs";
import { Jobs } from "../db/index.js";
import { enqueue } from "../queue/queue.js";
import { findGaps, snapStart, snapEnd } from "../services/silence.js";
import { probeDuration, renderClip } from "../services/ffmpeg.js";
import { artifactPath } from "../lib/paths.js";
import { jobDir } from "../lib/paths.js";
import { buildShots, validateShots } from "../services/crop.js";

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

const RUNNING = ["ingesting", "extracting", "transcribing", "selecting", "rendering", "publishing"];

router.delete("/:id", (req, res) => {
  const job = Jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: "not found" });
  if (RUNNING.includes(job.state)) {
    return res.status(409).json({ error: `job is ${job.state} — wait or let it fail first` });
  }
  Jobs.remove(job.id);
  fs.rmSync(jobDir(job.id), { recursive: true, force: true });
  res.json({ deleted: job.id });
});

const HEAD_PAD = 0.12;
const TAIL_PAD = 0.25;

function readJson(id, name) {
  const p = artifactPath(id, name);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
}
function writeCuts(id, cuts) {
  fs.writeFileSync(artifactPath(id, "cuts.json"), JSON.stringify(cuts, null, 2));
}

// GET /api/jobs/:id/artifacts → everything the review screen needs
router.get("/:id/artifacts", (req, res) => {
  const { id } = req.params;
  if (!Jobs.get(id)) return res.status(404).json({ error: "not found" });
  res.json({
    transcript: readJson(id, "transcript.json"),
    cuts: readJson(id, "cuts.json"),
    candidates: readJson(id, "candidates.json"),
    canva: readJson(id, "canva.json")
  });
});

// PATCH /api/jobs/:id/cuts/:n → edit range/crop/status; server re-snaps timings
router.patch("/:id/cuts/:n", async (req, res) => {
  const { id } = req.params;
  const n = parseInt(req.params.n, 10);
  const cuts = readJson(id, "cuts.json");
  const cut = cuts?.find((c) => c.n === n);
  if (!cut) return res.status(404).json({ error: "cut not found" });

  const { startIdx, endIdx, shots, mode, status } = req.body ?? {};

  if (startIdx != null || endIdx != null) {
    const transcript = readJson(id, "transcript.json");
    const s = startIdx ?? cut.startIdx;
    const e = endIdx ?? cut.endIdx;
    if (!Number.isInteger(s) || !Number.isInteger(e) || s < 0 || e >= transcript.words.length || e <= s) {
      return res.status(400).json({ error: "invalid index range" });
    }
    const gaps = findGaps(transcript.words);
    const duration = await probeDuration(artifactPath(id, "source.mp4"));
    cut.startIdx = s;
    cut.endIdx = e;
    cut.start = Math.max(0, snapStart(transcript.words, s, gaps) - HEAD_PAD);
    cut.end = Math.min(duration, snapEnd(transcript.words, e, gaps, duration) + TAIL_PAD);
    const shotData = readJson(id, "shots.json") ?? { boundaries: [] };
    cut.shots = buildShots(shotData.boundaries, cut.start, cut.end, cut.shots ?? []);
    cut.dirty = true;
  }
  if (shots != null) {
    const err = validateShots(shots, cut);
    if (err) return res.status(400).json({ error: err });
    cut.shots = [...shots].sort((a, b) => a.start - b.start);
    cut.dirty = true;
  }
  if (mode != null) {
    if (!["crop", "blur"].includes(mode)) return res.status(400).json({ error: "mode must be crop|blur" });
    cut.mode = mode; cut.dirty = true;
  }
  if (status != null) {
    if (!["approved", "rejected"].includes(status)) return res.status(400).json({ error: "status must be approved|rejected" });
    cut.status = status;
  }

  writeCuts(id, cuts);
  res.json(cut);
});

// POST /api/jobs/:id/cuts/:n/rerender → regenerate one clip with current cut params
router.post("/:id/cuts/:n/rerender", async (req, res) => {
  const { id } = req.params;
  const n = parseInt(req.params.n, 10);
  const cuts = readJson(id, "cuts.json");
  const cut = cuts?.find((c) => c.n === n);
  if (!cut) return res.status(404).json({ error: "cut not found" });

  const out = artifactPath(id, `clips/${n}.mp4`);
  fs.rmSync(out, { force: true });
  try {
    await renderClip(artifactPath(id, "source.mp4"), cut, out, cut.mode ?? "crop");
  } catch (err) {
    return res.status(500).json({ error: String(err.message ?? err) });
  }
  delete cut.dirty;
  writeCuts(id, cuts);
  res.json(cut);
});

// POST /api/jobs/:id/approve → gate passes only with ≥1 approved, clean clip
router.post("/:id/approve", (req, res) => {
  const { id } = req.params;
  const job = Jobs.get(id);
  if (!job) return res.status(404).json({ error: "not found" });
  if (job.state !== "awaiting_review") return res.status(409).json({ error: `job is ${job.state}` });
  const cuts = readJson(id, "cuts.json") ?? [];
  const approved = cuts.filter((c) => c.status === "approved");
  if (!approved.length) return res.status(409).json({ error: "no approved clips" });
  if (approved.some((c) => c.dirty)) return res.status(409).json({ error: "approved clip has unsaved re-render" });
  Jobs.setState(id, "approved", `approved ${approved.length} clip(s)`);
  res.json(Jobs.get(id));
});

// GET /api/jobs/:id/stream → SSE job state
router.get("/:id/stream", (req, res) => {
  const { id } = req.params;
  if (!Jobs.get(id)) return res.status(404).json({ error: "not found" });
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive"
  });
  let last = "";
  const send = () => {
    const s = JSON.stringify(Jobs.get(id));
    if (s !== last) { last = s; res.write(`data: ${s}\n\n`); }
  };
  send();
  const timer = setInterval(send, 2000);
  req.on("close", () => clearInterval(timer));
});

export default router;