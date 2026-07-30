import { transcribe } from "../services/whisper.js";
import { artifactPath } from "../lib/paths.js";

export default {
  name: "transcribe",
  state: "transcribing",
  artifact: "transcript.json",
  async run(job) {
    await transcribe(
      artifactPath(job.id, "audio.wav"),
      artifactPath(job.id, "transcript.json")
    );
  }
};