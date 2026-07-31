const EPS = 0.05;

export function normalizeShots(cut) {
  if (Array.isArray(cut.shots) && cut.shots.length) return cut.shots;
  return [{ start: cut.start, x: cut.cropX ?? 0.5, pan: null }];
}

// Numeric framing at time t (mirrors the ffmpeg expression below).
export function cropAt(shots, t) {
  let s = shots[0];
  for (const sh of shots) if (t >= sh.start) s = sh;
  if (!s.pan) return s.x;
  const { at, dur, x: xe } = s.pan;
  if (t <= at) return s.x;
  if (t >= at + dur) return xe;
  const p = (t - at) / dur;
  return s.x + (xe - s.x) * p * p * (3 - 2 * p); // smoothstep
}

// crop x expression in clip-relative time; even-clamped to avoid chroma fringing.
export function cropExpr(shots, clipStart, outW = 1080) {
  const f = (n) => Number(n).toFixed(4);

  const part = (s) => {
    const rel = Math.max(0, s.start - clipStart);
    if (!s.pan) return { rel, expr: f(s.x) };
    const a = Math.max(0, s.pan.at - clipStart);
    const d = Math.max(0.05, s.pan.dur);
    const u = `((t-${f(a)})/${f(d)})`;
    const eased = `${f(s.x)}+(${f(s.pan.x)}-${f(s.x)})*(${u}*${u}*(3-2*${u}))`;
    return {
      rel,
      expr: `if(lt(t,${f(a)}),${f(s.x)},if(gte(t,${f(a + d)}),${f(s.pan.x)},${eased}))`
    };
  };

  const parts = shots.map(part).sort((a, b) => a.rel - b.rel);
  let norm = parts[0].expr;
  for (let i = 1; i < parts.length; i++) {
    norm = `if(gte(t,${f(parts[i].rel)}),${parts[i].expr},${norm})`;
  }
  return `2*floor(min(max((in_w-${outW})*(${norm}),0),in_w-${outW})/2)`;
}

// Rebuild shot list for a range, carrying framing over from matching old shots.
export function buildShots(boundaries, start, end, previous = []) {
  const starts = [start, ...boundaries.filter((b) => b > start + EPS && b < end - EPS)];
  return starts.map((s) => {
    const prev = previous.find((p) => Math.abs(p.start - s) < EPS);
    return prev ? { ...prev, start: s } : { start: s, x: 0.5, pan: null };
  });
}

export function validateShots(shots, cut) {
  if (!Array.isArray(shots) || !shots.length) return "shots must be a non-empty array";
  const sorted = [...shots].sort((a, b) => a.start - b.start);
  if (Math.abs(sorted[0].start - cut.start) > EPS) return "first shot must start at cut start";

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    const next = sorted[i + 1]?.start ?? cut.end;
    if (typeof s.x !== "number" || s.x < 0 || s.x > 1) return `shot ${i}: x must be 0-1`;
    if (s.start < cut.start - EPS || s.start > cut.end) return `shot ${i}: start outside cut`;
    if (i && s.start <= sorted[i - 1].start) return `shot ${i}: starts out of order`;
    if (s.pan) {
      const { at, dur, x } = s.pan;
      if (typeof x !== "number" || x < 0 || x > 1) return `shot ${i}: pan x must be 0-1`;
      if (!(dur > 0) || dur > 2) return `shot ${i}: pan duration must be 0-2s`;
      if (at < s.start - EPS) return `shot ${i}: pan starts before its shot`;
      if (at + dur > next + EPS) return `shot ${i}: pan runs past the shot`;
    }
  }
  return null;
}