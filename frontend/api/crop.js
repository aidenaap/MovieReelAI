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

export const shotEnd = (shots, i, cutEnd) => shots[i + 1]?.start ?? cutEnd;