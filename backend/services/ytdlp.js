import path from "node:path";
import { run } from "../lib/exec.js";
import { ROOT } from "../lib/paths.js";

const raw = process.env.YTDLP_BIN || "yt-dlp";
const BIN = raw.includes("/") || raw.includes("\\")
  ? (path.isAbsolute(raw) ? raw : path.resolve(ROOT, raw))
  : raw;

export async function download(url, destPath) {
  await run(BIN, [
    "-f", "bv*[ext=mp4][height<=1080]+ba[ext=m4a]/b[ext=mp4]/b",
    "--merge-output-format", "mp4",
    "--no-playlist",
    "-o", destPath,
    url
  ]);
  return destPath;
}