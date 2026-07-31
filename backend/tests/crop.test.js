import test from "node:test";
import assert from "node:assert/strict";
import { cropAt, cropExpr, buildShots, validateShots } from "../services/crop.js";

const shots = [
  { start: 10, x: 0.2, pan: null },
  { start: 15, x: 0.8, pan: { at: 16, dur: 1, x: 0.4 } }
];

test("framing jumps at shot boundaries", () => {
  assert.equal(cropAt(shots, 12), 0.2);
  assert.equal(cropAt(shots, 15), 0.8);
});

test("pan eases from start to end framing", () => {
  assert.equal(cropAt(shots, 15.9), 0.8);
  assert.equal(cropAt(shots, 16.5), 0.6);   // smoothstep midpoint
  assert.equal(cropAt(shots, 17.5), 0.4);
});

test("expression is clip-relative and even-clamped", () => {
  const e = cropExpr(shots, 10);
  assert.match(e, /2\*floor/);
  assert.match(e, /gte\(t,5\.0000\)/); // second shot at +5s
  assert.ok(!e.includes("'"));
});

test("buildShots carries framing across a range change", () => {
  const next = buildShots([10, 15, 22], 10, 25, shots);
  assert.equal(next.length, 3);
  assert.equal(next[1].x, 0.8);
  assert.equal(next[2].x, 0.5);
});

test("validateShots rejects overlong pans", () => {
  const bad = [{ start: 10, x: 0.5, pan: { at: 10, dur: 3, x: 0.9 } }];
  assert.match(validateShots(bad, { start: 10, end: 20 }), /0-2s/);
});

test("validateShots rejects a pan spilling into the next shot", () => {
  const bad = [
    { start: 10, x: 0.5, pan: { at: 14.5, dur: 1.5, x: 0.9 } },
    { start: 15, x: 0.5, pan: null }
  ];
  assert.match(validateShots(bad, { start: 10, end: 20 }), /past the shot/);
});