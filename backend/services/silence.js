// A "gap" is the silence between word[i].end and word[i+1].start.
export function findGaps(words, minGapSec = 0.15) {
  const gaps = [];
  for (let i = 0; i < words.length - 1; i++) {
    const size = words[i + 1].start - words[i].end;
    if (size >= minGapSec) {
      gaps.push({ afterIdx: i, start: words[i].end, end: words[i + 1].start, size });
    }
  }
  return gaps;
}

// Snap a start time OUTWARD (earlier) to the end of the nearest preceding gap.
export function snapStart(words, startIdx, gaps) {
  const target = words[startIdx].start;
  let best = null;
  for (const g of gaps) {
    if (g.end <= target && (!best || g.end > best.end)) best = g;
  }
  // cut inside the gap, just before speech resumes
  return best ? best.end : Math.max(0, target);
}

// Snap an end time OUTWARD (later) to the start of the nearest following gap.
export function snapEnd(words, endIdx, gaps, mediaDuration = Infinity) {
  const target = words[endIdx].end;
  let best = null;
  for (const g of gaps) {
    if (g.start >= target && (!best || g.start < best.start)) best = g;
  }
  return best ? best.start : Math.min(target, mediaDuration);
}