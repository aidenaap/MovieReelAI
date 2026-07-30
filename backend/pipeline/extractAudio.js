import { extractAudio } from "../services/ffmpeg.js";
import { artifactPath } from "../lib/paths.js";

export default {
  name: "extractAudio",
  state: "extracting",
  artifact: "audio.wav",
  async run(job) {
    await extractAudio(
      artifactPath(job.id, "source.mp4"),
      artifactPath(job.id, "audio.wav")
    );
  }
};