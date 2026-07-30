import fs from "node:fs";
import path from "node:path";
import { run } from "../lib/exec.js";
import { ROOT } from "../lib/paths.js";
import { logger } from "../lib/logger.js";

const log = logger("ytdlp");
const raw = process.env.YTDLP_BIN || "yt-dlp";
const BIN = /[\\/]/.test(raw)
  ? (path.isAbsolute(raw) ? raw : path.resolve(ROOT, raw))
  : raw;

export async function download(url, destPath) {
  const tmp = `${destPath}.part.mp4`;
  fs.rmSync(tmp, { force: true });

  let lastLogged = 0;
  await run(BIN, [
    "-f", "bv*[ext=mp4][height<=1080]+ba[ext=m4a]/b[ext=mp4]/b",
    "--merge-output-format", "mp4",
    "--no-playlist",
    "--newline",
    "--no-part",
    "--ffmpeg-location", path.dirname(process.env.FFMPEG_BIN
      ? path.resolve(ROOT, process.env.FFMPEG_BIN)
      : "ffmpeg"),
    "-o", tmp,
    url
  ], {
    stallMs: 180000,
    onStderr: (s) => log.warn(s.trim())
  });

  // yt-dlp prints progress to stdout; surface it via a lightweight tick
  if (!fs.existsSync(tmp)) throw new Error("yt-dlp finished but produced no file");
  fs.renameSync(tmp, destPath);
  log.info(`downloaded → ${destPath}`);
  return destPath;
}