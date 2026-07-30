import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalize } from "../services/whisper.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(path.join(here, "fixtures", "whispercpp.json"), "utf8")
);

test("normalizes whisper.cpp output to word-level shape", () => {
  const t = normalize({ kind: "whispercpp", data: fixture });

  assert.equal(t.language, "en");
  assert.equal(t.words.length, 7);
  assert.deepEqual(t.words[0], { i: 0, text: "Look", start: 1.24, end: 1.41 });
  assert.equal(t.words[6].text, "now.");

  assert.equal(t.segments.length, 2);
  assert.equal(t.segments[0].text, "Look at me.");
  assert.equal(t.segments[1].text, "I'm the captain now.");
  assert.equal(t.segments[1].start, 2.6);
});

test("indices are contiguous and timings ordered", () => {
  const t = normalize({ kind: "whispercpp", data: fixture });
  t.words.forEach((w, idx) => {
    assert.equal(w.i, idx);
    assert.ok(w.end >= w.start);
  });
});