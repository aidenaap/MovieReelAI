import test from "node:test";
import assert from "node:assert/strict";
import { validate } from "../services/claude.js";

const good = JSON.stringify([
  { startIdx: 0, endIdx: 50, hook: "Look at me.", score: 0.9, reason: "Iconic line." },
  { startIdx: 60, endIdx: 120, hook: "The turn.", score: 0.7, reason: "Tension peak." },
  { startIdx: 130, endIdx: 200, hook: "The reveal.", score: 0.6, reason: "Payoff." }
]);

test("accepts valid candidates", () => {
  const r = validate(good, 300);
  assert.ok(!r.errors);
  assert.equal(r.candidates.length, 3);
});

test("strips markdown fences", () => {
  const r = validate("```json\n" + good + "\n```", 300);
  assert.ok(!r.errors);
});

test("rejects out-of-range indices", () => {
  const r = validate(good, 100);
  assert.match(r.errors, /out of range/);
});

test("rejects overlapping spans", () => {
  const bad = JSON.stringify([
    { startIdx: 0, endIdx: 80, hook: "a", score: 0.5, reason: "x" },
    { startIdx: 70, endIdx: 150, hook: "b", score: 0.5, reason: "y" },
    { startIdx: 160, endIdx: 200, hook: "c", score: 0.5, reason: "z" }
  ]);
  const r = validate(bad, 300);
  assert.match(r.errors, /overlap/);
});

test("rejects non-JSON", () => {
  const r = validate("Sure! Here are the moments:", 300);
  assert.match(r.errors, /parseable/);
});

test("rejects timestamps disguised as indices", () => {
  const bad = JSON.stringify([
    { startIdx: 1.24, endIdx: 4.02, hook: "a", score: 0.5, reason: "x" }
  ]);
  const r = validate(bad, 300);
  assert.match(r.errors, /integers/);
});