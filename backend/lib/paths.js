import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, "..", "..");
export const WORK = path.join(ROOT, "work");
export const OUTPUT = path.join(ROOT, "output");

export function jobDir(jobId) {
  return path.join(WORK, jobId);
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function artifactExists(jobId, name) {
  return fs.existsSync(path.join(jobDir(jobId), name));
}

export function artifactPath(jobId, name) {
  return path.join(jobDir(jobId), name);
}