import { useEffect, useRef, useState } from "react";
import { cropAt, shotEnd } from "../api/crop.js";

export default function CropFramer({ sourceUrl, cut, shots, mode, onShots, onMode }) {
  const [sel, setSel] = useState(0);
  const [t, setT] = useState(cut.start);
  const videoRef = useRef(null);

  const i = Math.min(sel, shots.length - 1);
  const shot = shots[i];
  const end = shotEnd(shots, i, cut.end);
  const x = cropAt(shots, t);

  useEffect(() => {
    const v = videoRef.current;
    if (v && Math.abs(v.currentTime - t) > 0.05) v.currentTime = t;
  }, [t]);

  const patch = (idx, changes) =>
    onShots(shots.map((s, k) => (k === idx ? { ...s, ...changes } : s)));

  const addShot = () => {
    if (shots.some((s) => Math.abs(s.start - t) < 0.05)) return;
    const next = [...shots, { start: t, x, pan: null }].sort((a, b) => a.start - b.start);
    onShots(next);
    setSel(next.findIndex((s) => s.start === t));
  };

  const removeShot = () => {
    if (i === 0) return;
    onShots(shots.filter((_, k) => k !== i));
    setSel(Math.max(0, i - 1));
  };

  const togglePan = () => {
    const room = Math.min(2, end - shot.start - 0.1);
    patch(i, shot.pan ? { pan: null } : { pan: { at: shot.start, dur: Math.max(0.2, room), x: shot.x } });
  };

  const Slider = ({ label, value, min, max, step, onChange, disabled }) => (
    <label className="block">
      <span className="text-xs text-zinc-500">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-amber-400 disabled:opacity-30" />
    </label>
  );

  return (
    <div className="flex items-start gap-4">
      <div className="w-28 shrink-0 aspect-[9/16] overflow-hidden rounded-lg bg-black border border-zinc-800">
        <video ref={videoRef} src={sourceUrl} muted playsInline preload="metadata"
          onLoadedMetadata={(e) => { e.target.currentTime = cut.start; }}
          className={mode === "blur" ? "w-full h-full object-contain" : "w-full h-full object-cover"}
          style={mode === "blur" ? {} : { objectPosition: `${x * 100}% center` }} />
      </div>

      <div className="flex-1 min-w-0 space-y-3">
        <div className="flex gap-2 text-xs">
          {["crop", "blur"].map((m) => (
            <button key={m} onClick={() => onMode(m)}
              className={`rounded px-2 py-1 border ${mode === m ? "border-amber-400 text-amber-400" : "border-zinc-700 text-zinc-500"}`}>
              {m === "crop" ? "Crop" : "Blur fill"}
            </button>
          ))}
        </div>

        {mode === "blur" ? (
          <p className="text-xs text-zinc-600">Framing controls disabled in blur-fill mode.</p>
        ) : (
          <>
            <Slider label={`Scrub  ${(t - cut.start).toFixed(2)}s · framing ${x.toFixed(2)}`}
              value={t} min={cut.start} max={cut.end} step={0.05} onChange={setT} />

            <div className="flex flex-wrap items-center gap-1.5">
              {shots.map((s, k) => (
                <button key={s.start} onClick={() => { setSel(k); setT(s.start); }}
                  className={`rounded px-2 py-1 text-xs font-mono border ${
                    k === i ? "border-emerald-500 text-emerald-400" : "border-zinc-700 text-zinc-500"}`}>
                  {(s.start - cut.start).toFixed(1)}s{s.pan ? " ↝" : ""}
                </button>
              ))}
              <button onClick={addShot}
                className="rounded px-2 py-1 text-xs border border-zinc-700 text-zinc-400 hover:text-zinc-100">
                + here
              </button>
              <button onClick={removeShot} disabled={i === 0}
                className="rounded px-2 py-1 text-xs border border-zinc-800 text-zinc-600 hover:text-red-400 disabled:opacity-30">
                − shot
              </button>
            </div>

            <Slider label={`Shot framing (${shot.x.toFixed(2)})`} value={shot.x}
              min={0} max={1} step={0.01}
              onChange={(v) => { patch(i, { x: v }); setT(shot.start); }} />

            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <input type="checkbox" checked={Boolean(shot.pan)} onChange={togglePan}
                className="accent-amber-400" />
              Pan within this shot
            </label>

            {shot.pan && (
              <div className="space-y-2 rounded-lg border border-zinc-800 p-2">
                <Slider label={`Pan starts at +${(shot.pan.at - cut.start).toFixed(2)}s`}
                  value={shot.pan.at} min={shot.start} max={Math.max(shot.start, end - shot.pan.dur)}
                  step={0.05}
                  onChange={(v) => { patch(i, { pan: { ...shot.pan, at: v } }); setT(v); }} />
                <Slider label={`Duration ${shot.pan.dur.toFixed(2)}s`}
                  value={shot.pan.dur} min={0.2} max={Math.min(2, end - shot.pan.at)} step={0.05}
                  onChange={(v) => patch(i, { pan: { ...shot.pan, dur: v } })} />
                <Slider label={`Ends at framing ${shot.pan.x.toFixed(2)}`}
                  value={shot.pan.x} min={0} max={1} step={0.01}
                  onChange={(v) => { patch(i, { pan: { ...shot.pan, x: v } }); setT(shot.pan.at + shot.pan.dur); }} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}