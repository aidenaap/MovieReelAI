import "./lib/env.js";
import express from "express";
import jobsRouter from "./routes/jobs.js";
import { startWorker } from "./queue/worker.js";
import clipsRouter from "./routes/clips.js";
import canvaRouter from "./routes/canva.js";
import { logger } from "./lib/logger.js";
import { downloadRouter } from './lib/download.js';
const log = logger("server");

const app = express();
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// Primary Routers
app.use("/api/jobs", jobsRouter);
app.use("/api/clips", clipsRouter);
app.use("/api/canva", canvaRouter);
app.use('/api', downloadRouter);

// Error Handling
app.use((err, req, res, next) => {
  log.error(`${req.method} ${req.originalUrl} → ${err.message}`, err.stack);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: err.message });
});
process.on("unhandledRejection", (err) => log.error("unhandledRejection", err?.stack ?? err));
process.on("uncaughtException", (err) => log.error("uncaughtException", err?.stack ?? err));


const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`backend listening on :${port}`);
  startWorker();
});