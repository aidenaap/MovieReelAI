import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import "../lib/env.js";

test("env file loads from repo root", () => {
  const bin = process.env.YTDLP_BIN;
  assert.ok(bin, "YTDLP_BIN not set — is /.env present at repo root?");
});

test("configured binaries exist on disk", () => {
  for (const key of ["YTDLP_BIN", "FFMPEG_BIN", "WHISPER_BIN", "WHISPER_MODEL"]) {
    const v = process.env[key];
    if (!v || !/[\\/]/.test(v)) continue; // PATH-resolved names skipped
    assert.ok(fs.existsSync(v), `${key} points at missing file: ${v}`);
  }
});