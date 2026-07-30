import test from "node:test";
import assert from "node:assert/strict";
import { findGaps, snapStart, snapEnd } from "../services/silence.js";

// words:      [0]        [1]        [2]         [3]          [4]
// timings: 1.0-1.3   1.35-1.6   2.0-2.4    2.45-2.9     4.0-4.5
// gaps:            .05        .40        .05          1.10
const words = [
  { i: 0, text: "look", start: 1.0, end: 1.3 },
  { i: 1, text: "at",   start: 1.35, end: 1.6 },
  { i: 2, text: "me",   start: 2.0, end: 2.4 },
  { i: 3, text: "im",   start: 2.45, end: 2.9 },
  { i: 4, text: "captain", start: 4.0, end: 4.5 }
];

test("findGaps respects 150ms threshold", () => {
  const gaps = findGaps(words);
  assert.equal(gaps.length, 2);
  assert.equal(gaps[0].afterIdx, 1); // 1.6 → 2.0
  assert.equal(gaps[1].afterIdx, 3); // 2.9 → 4.0
});

test("snapStart moves outward to preceding gap end", () => {
  const gaps = findGaps(words);
  // starting at word 3 (2.45): nearest preceding gap ends at 2.0
  assert.equal(snapStart(words, 3, gaps), 2.0);
});

test("snapStart with no preceding gap uses word start", () => {
  const gaps = findGaps(words);
  assert.equal(snapStart(words, 0, gaps), 1.0);
});

test("snapEnd moves outward to following gap start", () => {
  const gaps = findGaps(words);
  // ending at word 2 (2.4): nearest following gap starts at 2.9
  assert.equal(snapEnd(words, 2, gaps), 2.9);
});

test("snapEnd with no following gap clamps to duration", () => {
  const gaps = findGaps(words);
  assert.equal(snapEnd(words, 4, gaps, 10), 4.5);
});