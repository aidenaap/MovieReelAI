import { Router } from "express";
import { Jobs } from "../db/index.js";
import { finalizeJob } from "../pipeline/finalize.js";
import { logger } from "../lib/logger.js";
import { isConfigured, isConnected, authorizeUrl, exchangeCode, redirectUri } from "../services/canvaAuth.js";

const log = logger("canva-routes");
const router = Router();

router.get("/status", (req, res) => {
  res.json({ configured: isConfigured(), connected: isConnected() });
});

router.get("/connect", (req, res) => {
  if (!isConfigured()) return res.status(409).json({ error: "CANVA_CLIENT_ID/SECRET not set" });
  res.redirect(authorizeUrl());
});

router.get("/callback", async (req, res) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    log.error(`canva denied authorization: ${error} ${error_description ?? ""}`);
    return res.status(400).send(`Canva returned: ${error} — ${error_description ?? ""}`);
  }
  if (isConnected()) {
    return res.redirect("http://localhost:5173/#/");
  }
  if (!code || !state) {
    return res.status(400).send("Missing code or state — start again at /api/canva/connect");
  }

  try {
    await exchangeCode(code, state);
    log.info("canva connected");
    res.redirect("http://localhost:5173/#/");
  } catch (err) {
    log.error("oauth callback failed", err);
    res.status(500).send(
      `Canva connect failed: ${err.message}\n\nRedirect URI sent: ${redirectUri()}`
    );
  }
});

router.post("/jobs/:id/finalize", async (req, res) => {
  const job = Jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: "not found" });
  if (job.state !== "awaiting_canva") {
    return res.status(409).json({ error: `job is ${job.state}, expected awaiting_canva` });
  }
  try {
    const outputs = await finalizeJob(job.id);
    res.json({ ...Jobs.get(job.id), outputs });
  } catch (err) {
    Jobs.fail(job.id, "finalize", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;