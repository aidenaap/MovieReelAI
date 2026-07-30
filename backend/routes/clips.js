import { Router } from "express";
import fs from "node:fs";
import { artifactPath } from "../lib/paths.js";

const router = Router();

function streamFile(req, res, file) {
  if (!fs.existsSync(file)) return res.status(404).json({ error: "not found" });
  const { size } = fs.statSync(file);
  const range = req.headers.range;
  if (range) {
    const [s, e] = range.replace("bytes=", "").split("-");
    const start = parseInt(s, 10);
    const end = e ? parseInt(e, 10) : size - 1;
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      "Content-Type": "video/mp4"
    });
    fs.createReadStream(file, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { "Content-Length": size, "Content-Type": "video/mp4" });
    fs.createReadStream(file).pipe(res);
  }
}

router.get("/:jobId/source", (req, res) =>
  streamFile(req, res, artifactPath(req.params.jobId, "source.mp4"))
);

router.get("/:jobId/:n", (req, res) =>
  streamFile(req, res, artifactPath(req.params.jobId, `clips/${parseInt(req.params.n, 10)}.mp4`))
);

export default router;