import path from "node:path";
import { run } from "../lib/exec.js";
import { ROOT } from "../lib/paths.js";

const raw = process.env.FFMPEG_BIN || "ffmpeg";
const BIN = /[\\/]/.test(raw)
  ? (path.isAbsolute(raw) ? raw : path.resolve(ROOT, raw))
  : raw;

export async function extractAudio(videoPath, wavPath) {
  await run(BIN, [
    "-y", "-i", videoPath,
    "-vn", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le",
    wavPath
  ]);
  return wavPath;
}

const PROBE_RAW = process.env.FFPROBE_BIN || raw.replace(/ffmpeg(\.exe)?$/i, "ffprobe$1");
const PROBE = /[\\/]/.test(PROBE_RAW)
  ? (path.isAbsolute(PROBE_RAW) ? PROBE_RAW : path.resolve(ROOT, PROBE_RAW))
  : PROBE_RAW;

export async function probeDuration(mediaPath) {
  const { stdout } = await run(PROBE, [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "csv=p=0",
    mediaPath
  ]);
  return parseFloat(stdout.trim());
}

// cut = { start, end, cropX }, mode = "crop" | "blur"
export async function renderClip(sourcePath, cut, outPath, mode = "crop") {
  const dur = (cut.end - cut.start).toFixed(3);
  const filter = mode === "blur" ? blurFilter() : cropFilter(cut.cropX ?? 0.5);

  await run(BIN, [
    "-y",
    "-ss", cut.start.toFixed(3),   // input seek + re-encode = frame-accurate
    "-t", dur,
    "-i", sourcePath,
    "-filter_complex", filter,
    "-map", "[v]", "-map", "0:a:0?",
    "-c:v", "libx264", "-preset", "medium", "-crf", "19",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k",
    "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
    "-movflags", "+faststart",
    outPath
  ]);
  return outPath;
}

// Scale to fill 1920 height, slide a 1080-wide window by normalized cropX (0=left, 1=right).
function cropFilter(cropX) {
  const x = Math.min(1, Math.max(0, cropX));
  return `[0:v]scale=-2:1920,crop=1080:1920:trunc((in_w-1080)*${x.toFixed(4)}/2)*2:0[v]`;
}

// Whole frame fits by width; blurred, zoomed copy of itself fills the letterbox.
function blurFilter() {
  return [
    "[0:v]split=2[bg][fg]",
    "[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=24,eq=brightness=-0.08[bgb]",
    "[fg]scale=1080:-2[fgs]",
    "[bgb][fgs]overlay=(W-w)/2:(H-h)/2[v]"
  ].join(";");
}