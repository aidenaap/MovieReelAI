import { useEffect, useRef, useState } from "react";
import { cropAt } from "../api/crop.js";

const FRAME = 1 / 30;
const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, "0")}`;

export default function EditorTimeline({
  words, startIdx, endIdx, shots, sel, t,
  onSeek, onRange, onShots, onSelect
}) {
  const [zoom, setZoom] = useState(80);
  const scroller = useRef(null);
  const drag = useRef(null);
  const live = useRef({});

  const t0 = words[startIdx].start;
  const t1 = words[endIdx].end;
  const d0 = Math.max(0, t0 - 2);
  const d1 = t1 + 2;
  const W = Math.ceil((d1 - d0) * zoom);
  const px = (s) => (s - d0) * zoom;

  live.current = { words, startIdx, endIdx, shots, t0, t1, d0, d1, zoom, onSeek, onRange, onShots };

  const toTime = (clientX) => {
    const { d0, d1, zoom } = live.current;
    const r = scroller.current.getBoundingClientRect();
    return Math.min(d1, Math.max(d0, d0 + (clientX - r.left + scroller.current.scrollLeft) / zoom));
  };

  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    const L = live.current;
    const time = toTime(e.clientX);
    if (d.kind === "play") L.onSeek(time);
    else if (d.kind === "in") {
      let best = L.startIdx, dist = Infinity;
      for (let i = 0; i < L.endIdx; i++) {
        const dd = Math.abs(L.words[i].start - time);
        if (dd < dist) { dist = dd; best = i; }
      }
      if (best !== L.startIdx) L.onRange(best, L.endIdx);
    } else if (d.kind === "out") {
      let best = L.endIdx, dist = Infinity;
      for (let i = L.startIdx + 1; i < L.words.length; i++) {
        const dd = Math.abs(L.words[i].end - time);
        if (dd < dist) { dist = dd; best = i; }
      }
      if (best !== L.endIdx) L.onRange(L.startIdx, best);
    } else if (d.kind === "shot") {
      if (d.i === 0) return; // first keyframe is pinned to the in-point
      const lo = (L.shots[d.i - 1]?.start ?? L.t0) + 0.1;
      const hi = (L.shots[d.i + 1]?.start ?? L.t1) - 0.1;
      const s = Math.min(hi, Math.max(lo, time));
      L.onShots(L.shots.map((sh, k) =>
        k === d.i
          ? { ...sh, start: s, pan: sh.pan ? { ...sh.pan, at: Math.max(s, sh.pan.at) } : null }
          : sh));
    }
  };
  const up = () => {
    drag.current = null;
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
  };
  const grab = (kind, i) => (e) => {
    e.preventDefault(); e.stopPropagation();
    drag.current = { kind, i };
    if (kind === "shot") onSelect(i);
    if (kind === "play") onSeek(toTime(e.clientX));
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const fit = () => {
    const el = scroller.current;
    if (el) setZoom(Math.max(24, Math.min(600, (el.clientWidth - 16) / (d1 - d0))));
  };
  useEffect(fit, []); // eslint-disable-line

  const addKF = () => {
    if (shots.some((s) => Math.abs(s.start - t) < 0.05)) return;
    const next = [...shots, { start: t, x: cropAt(shots, t), pan: null }]
      .sort((a, b) => a.start - b.start);
    onShots(next);
    onSelect(next.findIndex((s) => s.start === t));
  };
  const rmKF = () => {
    if (sel === 0) return;
    onShots(shots.filter((_, k) => k !== sel));
    onSelect(Math.max(0, sel - 1));
  };

  const step = zoom >= 300 ? 0.1 : zoom >= 120 ? 0.5 : zoom >= 48 ? 1 : 5;
  const ticks = [];
  for (let i = Math.ceil(d0 / step); i * step <= d1; i++) ticks.push(+(i * step).toFixed(2));
  const frameTicks = [];
  if (zoom >= 420)
    for (let i = Math.ceil(d0 / FRAME); i * FRAME <= d1; i++) frameTicks.push(i * FRAME);

  const btn = "rounded border border-zinc-700 px-1.5 py-0.5 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 disabled:opacity-30";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 shadow-lg shadow-black/30">
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-zinc-800 text-xs">
        <span className="font-mono tabular-nums text-zinc-100">{fmt(t)}</span>
        <span className="font-mono text-zinc-600">/ {fmt(t1)}</span>
        <div className="ml-auto flex items-center gap-1">
          <button className={btn} title="Add keyframe at playhead" onClick={addKF}>+ KF</button>
          <button className={btn} title="Remove selected keyframe" onClick={rmKF} disabled={sel === 0}>− KF</button>
          <span className="w-px h-4 bg-zinc-800 mx-1" />
          <button className={btn} title="Zoom out" onClick={() => setZoom((z) => Math.max(24, z / 1.5))}>−</button>
          <button className={btn} title="Fit clip to view" onClick={fit}>Fit</button>
          <button className={btn} title="Zoom in" onClick={() => setZoom((z) => Math.min(600, z * 1.5))}>+</button>
        </div>
      </div>

      <div ref={scroller} className="overflow-x-auto">
        <div className="relative h-[92px] select-none" style={{ width: W }}>
          <div className="absolute inset-x-0 top-0 h-6 border-b border-zinc-800/70 cursor-col-resize"
            onPointerDown={grab("play")} title="Click or drag to scrub">
            {ticks.map((s) => (
              <div key={s} className="absolute top-0 h-full border-l border-zinc-700/60"
                style={{ left: px(s) }}>
                <span className="absolute top-0.5 left-1 text-[10px] font-mono text-zinc-500">
                  {fmt(s)}
                </span>
              </div>
            ))}
            {frameTicks.map((s) => (
              <div key={s} className="absolute bottom-0 h-1.5 border-l border-zinc-700/40"
                style={{ left: px(s) }} />
            ))}
          </div>

          <div className="absolute inset-x-0 top-7 h-9">
            <div className="absolute inset-y-0 rounded bg-zinc-800/30" style={{ left: 0, width: px(t0) }} />
            <div className="absolute inset-y-0 rounded bg-zinc-800/30" style={{ left: px(t1), right: 0 }} />
            <div className="absolute inset-y-0 rounded-md bg-sky-950/50 border border-sky-800/60"
              style={{ left: px(t0), width: px(t1) - px(t0) }}>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-sky-300/70 truncate px-4">
                {(t1 - t0).toFixed(2)}s
              </span>
            </div>
            <div onPointerDown={grab("in")} title="In point — drag (snaps to words)"
              className="absolute top-0 h-full w-2 -ml-1 rounded-l bg-zinc-200 hover:bg-white cursor-ew-resize"
              style={{ left: px(t0) }} />
            <div onPointerDown={grab("out")} title="Out point — drag (snaps to words)"
              className="absolute top-0 h-full w-2 -ml-1 rounded-r bg-zinc-200 hover:bg-white cursor-ew-resize"
              style={{ left: px(t1) }} />
          </div>

          <div className="absolute inset-x-0 top-[70px] h-5">
            {shots.map((s, i) => (
              <div key={i}>
                {s.pan && (
                  <div title="Pan region"
                    className="absolute top-1 h-3 rounded-sm bg-gradient-to-r from-sky-500/50 to-sky-400/10 border border-sky-500/40"
                    style={{ left: px(s.pan.at), width: Math.max(2, s.pan.dur * zoom) }} />
                )}
                <div
                  onPointerDown={i === 0 ? undefined : grab("shot", i)}
                  onClick={i === 0 ? () => onSelect(0) : undefined}
                  title={i === 0
                    ? `Start keyframe (pinned to in-point) · framing ${s.x.toFixed(2)}`
                    : `Keyframe · framing ${s.x.toFixed(2)} · drag to retime`}
                  className={`absolute top-1 w-3 h-3 rotate-45 rounded-[2px] border ${
                    i === 0 ? "cursor-pointer" : "cursor-ew-resize"} ${
                    i === sel ? "bg-sky-400 border-sky-200" : "bg-zinc-600 border-zinc-400 hover:bg-zinc-500"}`}
                  style={{ left: px(s.start) - 6 }} />
              </div>
            ))}
          </div>

          <div className="absolute top-0 bottom-0 pointer-events-none z-10" style={{ left: px(t) }}>
            <div className="w-px h-full bg-sky-400" />
            <div className="absolute -top-px -left-[5px] border-x-[5px] border-t-[6px] border-x-transparent border-t-sky-400" />
          </div>
        </div>
      </div>
    </div>
  );
}