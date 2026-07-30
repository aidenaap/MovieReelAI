import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "../lib/exec.js";
import { ROOT } from "../lib/paths.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const resolveBin = (v) => (v ? (path.isAbsolute(v) ? v : path.resolve(ROOT, v)) : null);

const WHISPER = resolveBin(process.env.WHISPER_BIN);
const MODEL = resolveBin(process.env.WHISPER_MODEL);
const PYTHON = process.env.PYTHON_BIN || "python";

export async function transcribe(wavPath, outJsonPath) {
  let raw;
  if (WHISPER && fs.existsSync(WHISPER)) {
    raw = await runWhisperCpp(wavPath);
  } else {
    raw = await runFasterWhisper(wavPath);
  }
  const normalized = normalize(raw);
  assertWordLevel(normalized);
  fs.writeFileSync(outJsonPath, JSON.stringify(normalized, null, 2));
  return normalized;
}

async function runWhisperCpp(wavPath) {
  const outBase = wavPath.replace(/\.wav$/, "");
  await run(WHISPER, [
    "-m", MODEL,
    "-f", wavPath,
    "--output-json",
    "--max-len", "1",          // one word per segment → word-level timings
    "-of", outBase
  ]);
  return { kind: "whispercpp", data: JSON.parse(fs.readFileSync(`${outBase}.json`, "utf8")) };
}

async function runFasterWhisper(wavPath) {
  const script = path.join(here, "fasterwhisper.py");
  const { stdout } = await run(PYTHON, [script, wavPath]);
  return { kind: "fasterwhisper", data: JSON.parse(stdout) };
}

// Normalize either backend to: { language, words:[{i,text,start,end}], segments:[...] }
export function normalize(raw) {
  if (raw.kind === "whispercpp") return normalizeWhisperCpp(raw.data);
  if (raw.kind === "fasterwhisper") return raw.data; // python script emits normalized shape
  throw new Error(`unknown transcriber kind: ${raw.kind}`);
}

function normalizeWhisperCpp(data) {
  const words = [];
  const segments = [];
  let current = null;

  for (const t of data.transcription ?? []) {
    const text = t.text.trim();
    if (!text) continue;
    const start = t.offsets.from / 1000;
    const end = t.offsets.to / 1000;
    words.push({ i: words.length, text, start, end });

    // Rebuild sentence-ish segments from single-word entries
    if (!current) current = { start, end, text };
    else { current.end = end; current.text += ` ${text}`; }
    if (/[.!?…]$/.test(text)) { segments.push(current); current = null; }
  }
  if (current) segments.push(current);

  return {
    language: data.result?.language ?? "en",
    words,
    segments
  };
}

function assertWordLevel(t) {
  if (!Array.isArray(t.words) || t.words.length === 0) {
    throw new Error("transcriber produced no word-level timings — rejected");
  }
  const bad = t.words.find((w) => typeof w.start !== "number" || typeof w.end !== "number");
  if (bad) throw new Error(`word missing timings: ${JSON.stringify(bad)}`);
}