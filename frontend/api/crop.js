export function normalizeShots(cut) {
  if (Array.isArray(cut.shots) && cut.shots.length) return cut.shots;
  return [{ start: cut.start, x: cut.cropX ?? 0.5, pan: null }];
}

export function cropAt(shots, t) {
  let s = shots[0];
  for (const sh of shots) if (t >= sh.start) s = sh;
  if (!s.pan) return s.x;
  const { at, dur, x: xe } = s.pan;
  if (t <= at) return s.x;
  if (t >= at + dur) return xe;
  const p = (t - at) / dur;
  return s.x + (xe - s.x) * p * p * (3 - 2 * p);
}

export function anchorShots(shots, t0, t1) {
  const kept = [...shots]
    .sort((a, b) => a.start - b.start)
    .filter((s, k) => k === 0 || (s.start > t0 && s.start < t1));
  return kept.map((s, k, arr) => {
    const start = k === 0 ? t0 : s.start;
    const end = arr[k + 1]?.start ?? t1;
    const pan = s.pan
      ? { ...s.pan, at: Math.min(Math.max(s.pan.at, start), Math.max(start, end - s.pan.dur)) }
      : null;
    return { ...s, start, pan };
  });
}

export const shotEnd = (shots, i, cutEnd) => shots[i + 1]?.start ?? cutEnd;