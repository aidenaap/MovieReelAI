import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client.js";
import { normalizeShots, shotEnd } from "../api/crop.js";
import Panel from "./Panel.jsx";
import PreviewStage from "./PreviewStage.jsx";
import EditorTimeline from "./EditorTimeline.jsx";
import WordTimeline from "./WordTimeline.jsx";

const FRAME = 1 / 30;
const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, "0")}`;

export default function ClipEditor({ jobId, cut, words, onChange }) {
  const [local, setLocal] = useState({
    startIdx: cut.startIdx, endIdx: cut.endIdx,
    shots: normalizeShots(cut), mode: cut.mode ?? "crop"
  });
  const [sel, setSel] = useState(0);
  const [t, setT] = useState(words[cut.startIdx].start);
  const [playing, setPlaying] = useState(false);
  const [view, setView] = useState("edit");
  const [videoKey, setVideoKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const videoRef = useRef(null);

  const t0 = words[local.startIdx].start;
  const t1 = words[local.endIdx].end;
  const shots = local.shots;
  const selIdx = Math.min(sel, shots.length - 1);
  const shot = shots[selIdx];
  const end = shotEnd(shots, selIdx, t1);

  const rendered = view === "render";
  const lo = rendered ? cut.start : t0;
  const hi = rendered ? cut.end : t1;
  const off = rendered ? cut.start : 0;

  const edited =
    local.startIdx !== cut.startIdx || local.endIdx !== cut.endIdx ||
    JSON.stringify(local.shots) !== JSON.stringify(normalizeShots(cut)) ||
    local.mode !== (cut.mode ?? "crop");
  const stale = cut.dirty || edited;

  const seek = (time) => {
    const s = Math.min(hi, Math.max(lo, time));
    if (videoRef.current) videoRef.current.currentTime = s - off;
    setT(s);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      if (v.currentTime + off >= hi - FRAME) v.currentTime = lo - off;
      v.play(); setPlaying(true);
    } else { v.pause(); setPlaying(false); }
  };

  useEffect(() => {
    let raf;
    const loop = () => {
      const v = videoRef.current;
      if (v) {
        const srcT = v.currentTime + off;
        if (!v.paused && srcT >= hi) { v.pause(); setPlaying(false); }
        setT(srcT);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [hi, off]);

  const snapWord = (which) => {
    let best = which === "in" ? local.startIdx : local.endIdx;
    let dist = Infinity;
    const from = which === "in" ? 0 : local.startIdx + 1;
    const to = which === "in" ? local.endIdx : words.length;
    for (let i = from; i < to; i++) {
      const d = Math.abs((which === "in" ? words[i].start : words[i].end) - t);
      if (d < dist) { dist = d; best = i; }
    }
    setLocal((l) => which === "in" ? { ...l, startIdx: best } : { ...l, endIdx: best });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest("input, textarea, [contenteditable]")) return;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); seek(t - (e.shiftKey ? 1 : FRAME)); }
      else if (e.key === "ArrowRight") { e.preventDefault(); seek(t + (e.shiftKey ? 1 : FRAME)); }
      else if (e.key === "i") snapWord("in");
      else if (e.key === "o") snapWord("out");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const activeIdx = useMemo(() => {
    for (let i = local.startIdx; i <= local.endIdx; i++) {
      const w = words[i];
      if (w && t >= w.start && t <= w.end) return i;
    }
    return -1;
  }, [t, words, local.startIdx, local.endIdx]);

  const activeShot = shots.reduce((a, s, i) => (t >= s.start ? i : a), 0);
  const setShotX = (i, x) =>
    setLocal((l) => ({ ...l, shots: l.shots.map((s, k) => (k === i ? { ...s, x } : s)) }));
  const patchSel = (changes) =>
    setLocal((l) => ({ ...l, shots: l.shots.map((s, k) => (k === selIdx ? { ...s, ...changes } : s)) }));
  const nudge = (which, d) =>
    setLocal((l) => which === "in"
      ? { ...l, startIdx: Math.min(l.endIdx - 1, Math.max(0, l.startIdx + d)) }
      : { ...l, endIdx: Math.min(words.length - 1, Math.max(l.startIdx + 1, l.endIdx + d)) });

  const act = async (fn) => {
    setBusy(true); setErr(null);
    try { await fn(); } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };
  const saveAndRerender = () => act(async () => {
    if (edited) onChange(await api.patchCut(jobId, cut.n, local));
    onChange(await api.rerender(jobId, cut.n));
    setVideoKey((k) => k + 1); setView("render");
  });
  const setStatus = (status) => act(async () => onChange(await api.patchCut(jobId, cut.n, { status })));

  const Slider = ({ label, value, min, max, step, onChange, disabled }) => (
    <label className="block">
      <span className="text-xs text-zinc-500">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-sky-500 disabled:opacity-30" />
    </label>
  );
  const tBtn = "rounded border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400 hover:text-zinc-100 hover:border-zinc-500";

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium truncate">“{cut.hook}”</p>
          <p className="text-xs text-zinc-500 truncate">{cut.reason}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0 text-xs">
          {["edit", "render"].map((v) => (
            <button key={v} onClick={() => { setView(v); setPlaying(false); }}
              title={v === "edit" ? "Live source preview with framing" : "Last rendered output"}
              className={`rounded px-2 py-1 border ${view === v
                ? "border-sky-500 text-sky-400" : "border-zinc-700 text-zinc-500 hover:text-zinc-300"}`}>
              {v === "edit" ? "Source" : "Rendered"}
            </button>
          ))}
          <span className="ml-2 font-mono rounded bg-zinc-800 px-2 py-1">
            {(cut.score * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="flex gap-3 items-stretch">
        <div className="flex-1 min-w-0 rounded-xl border border-zinc-800 bg-zinc-950 p-3 flex flex-col items-center">
          <div className="h-[46vh]">
            <PreviewStage
              key={`${view}-${videoKey}`}
              videoRef={videoRef}
              src={rendered ? `/api/clips/${jobId}/${cut.n}?v=${videoKey}` : `/api/clips/${jobId}/source`}
              mode={local.mode} shots={shots} t={t} initialTime={lo - off} editable={!rendered}
              onDragX={(x) => { setShotX(activeShot, x); setSel(activeShot); }}
            />
          </div>
          <div className="flex items-center gap-2 mt-2 text-zinc-400">
            <button className={tBtn} title="Back 1 frame (←)" onClick={() => seek(t - FRAME)}>⏮</button>
            <button onClick={togglePlay} title="Play / pause (Space)"
              className="rounded-full w-9 h-9 border border-zinc-600 hover:border-sky-500 hover:text-sky-400">
              {playing ? "❚❚" : "▶"}
            </button>
            <button className={tBtn} title="Forward 1 frame (→)" onClick={() => seek(t + FRAME)}>⏭</button>
            <span className="ml-3 text-[10px] text-zinc-600">
              Space play · ←/→ frame · ⇧←/→ 1s · I/O set in/out
            </span>
          </div>
        </div>

        <aside className="w-80 shrink-0 max-h-[52vh] overflow-y-auto space-y-2 pr-0.5">
          <Panel title="Timing" right={<span className="font-mono normal-case">{(t1 - t0).toFixed(2)}s</span>}>
            {[["In", "in", fmt(t0)], ["Out", "out", fmt(t1)]].map(([label, which, val]) => (
              <div key={which} className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">{label}</span>
                <span className="flex items-center gap-1.5">
                  <button className={tBtn} title={`${label} −1 word`} onClick={() => nudge(which, -1)}>‹</button>
                  <span className="font-mono text-zinc-200 w-16 text-center">{val}</span>
                  <button className={tBtn} title={`${label} +1 word`} onClick={() => nudge(which, 1)}>›</button>
                </span>
              </div>
            ))}
            <p className="text-[10px] text-zinc-600">Drag the white handles on the timeline, or press I / O at the playhead.</p>
          </Panel>

          <Panel title="Crop">
            <div className="flex gap-2 text-xs">
              {["crop", "blur"].map((m) => (
                <button key={m} onClick={() => setLocal((l) => ({ ...l, mode: m }))}
                  className={`rounded px-2 py-1 border ${local.mode === m
                    ? "border-sky-500 text-sky-400" : "border-zinc-700 text-zinc-500"}`}>
                  {m === "crop" ? "Crop" : "Blur fill"}
                </button>
              ))}
            </div>
            {local.mode === "crop" ? (
              <>
                <Slider label={`Shot framing (${shot.x.toFixed(2)})`} value={shot.x}
                  min={0} max={1} step={0.01}
                  onChange={(v) => { patchSel({ x: v }); seek(shot.start); }} />
                <p className="text-[10px] text-zinc-600">Or drag directly on the preview to reframe the current shot.</p>
              </>
            ) : (
              <p className="text-xs text-zinc-600">Framing disabled in blur-fill mode.</p>
            )}
          </Panel>

          <Panel title="Pan & Zoom" defaultOpen={false}>
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <input type="checkbox" checked={Boolean(shot.pan)} className="accent-sky-500"
                onChange={() => {
                  const room = Math.min(2, end - shot.start - 0.1);
                  patchSel(shot.pan ? { pan: null }
                    : { pan: { at: shot.start, dur: Math.max(0.2, room), x: shot.x } });
                }} />
              Pan within selected shot
            </label>
            {shot.pan && (
              <>
                <Slider label={`Starts at +${(shot.pan.at - t0).toFixed(2)}s`} value={shot.pan.at}
                  min={shot.start} max={Math.max(shot.start, end - shot.pan.dur)} step={0.05}
                  onChange={(v) => { patchSel({ pan: { ...shot.pan, at: v } }); seek(v); }} />
                <Slider label={`Duration ${shot.pan.dur.toFixed(2)}s`} value={shot.pan.dur}
                  min={0.2} max={Math.min(2, end - shot.pan.at)} step={0.05}
                  onChange={(v) => patchSel({ pan: { ...shot.pan, dur: v } })} />
                <Slider label={`Ends at framing ${shot.pan.x.toFixed(2)}`} value={shot.pan.x}
                  min={0} max={1} step={0.01}
                  onChange={(v) => { patchSel({ pan: { ...shot.pan, x: v } }); seek(shot.pan.at + shot.pan.dur); }} />
              </>
            )}
          </Panel>

          <Panel title="Transcript">
            <WordTimeline
              words={words} startIdx={local.startIdx} endIdx={local.endIdx} activeIdx={activeIdx}
              onRangeChange={(s, e) => setLocal((l) => ({ ...l, startIdx: s, endIdx: e }))}
              onWordClick={(w) => seek(w.start)}
            />
          </Panel>
        </aside>
      </div>

      <EditorTimeline
        words={words} startIdx={local.startIdx} endIdx={local.endIdx}
        shots={shots} sel={selIdx} t={t}
        onSeek={seek}
        onRange={(s, e) => setLocal((l) => ({ ...l, startIdx: s, endIdx: e }))}
        onShots={(s) => setLocal((l) => ({ ...l, shots: s }))}
        onSelect={setSel}
      />

      <div className="sticky bottom-3 z-20 flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/95 backdrop-blur px-4 py-2.5 shadow-xl shadow-black/50">
        <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
          <span title="Clip duration">{(t1 - t0).toFixed(2)}s</span>
          <span title="Output aspect ratio">9:16 · 1080×1920</span>
          <span title="Estimated output file" className="hidden lg:inline text-zinc-600">
            {jobId}-{cut.n}.mp4
          </span>
        </div>
        {stale && <span className="text-xs text-amber-400">preview out of date</span>}
        {err && <span className="text-xs text-red-400 truncate">{err}</span>}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setStatus("rejected")} disabled={busy}
            className="rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 px-3 py-1.5 text-sm">
            Reject
          </button>
          <button onClick={saveAndRerender} disabled={busy || !stale}
            className="rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 px-3 py-1.5 text-sm">
            {busy ? "Rendering…" : "Save & re-render"}
          </button>
          <button onClick={() => setStatus("approved")} disabled={busy || stale}
            title={stale ? "Re-render before approving" : "Approve clip"}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-3 py-1.5 text-sm font-medium">
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}