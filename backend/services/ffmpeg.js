import { run } from "../lib/exec.js";

const BIN = process.env.FFMPEG_BIN || "ffmpeg";

export async function extractAudio(videoPath, wavPath) {
  await run(BIN, [
    "-y", "-i", videoPath,
    "-vn", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le",
    wavPath
  ]);
  return wavPath;
}