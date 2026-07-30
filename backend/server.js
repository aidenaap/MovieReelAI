import "./lib/env.js";
import express from "express";
import jobsRouter from "./routes/jobs.js";
import { startWorker } from "./queue/worker.js";

const app = express();
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.use("/api/jobs", jobsRouter);

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`backend listening on :${port}`);
  startWorker();
});