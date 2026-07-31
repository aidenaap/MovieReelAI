import { useCallback, useMemo, useState } from "react";
import VideoPlayer from "./VideoPlayer.jsx";
import WordTimeline from "./WordTimeline.jsx";
import CropFramer from "./CropFramer.jsx";
import { api } from "../api/client.js";
import { normalizeShots } from "../api/crop.js";

export default function CandidateCard({ jobId, cut, words, onChange }) {
  const [local, setLocal] = useState({
    startIdx: cut.startIdx, endIdx: cut.endIdx,
    shots: normalizeShots(cut), mode: cut.mode ?? "crop"
  });
  const [srcTime, setSrcTime] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [videoKey, setVideoKey] = useState(0);

  const edited =
    local.startIdx !== cut.startIdx || local.endIdx !== cut.endIdx ||
    JSON.stringify(local.shots) !== JSON.stringify(normalizeShots(cut)) ||
    local.mode !== (cut.mode ?? "crop");
  const stale = cut.dirty || edited;

  const onTime = useCallback((t) => setSrcTime(cut.start + t), [cut.start]);

  const activeIdx = useMemo(() => {
    if (srcTime == null) return -1;
    for (let i = cut.startIdx; i <= cut.endIdx; i++) {
      const w = words[i];
      if (w && srcTime >= w.start && srcTime <= w.end) return i;
    }
    return -1;
  }, [srcTime, words, cut.startIdx, cut.endIdx]);

  const act = async (fn) => {
    setBusy(true); setErr(null);
    try { await fn(); } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const saveAndRerender = () => act(async () => {
    if (edited) onChange(await api.patchCut(jobId, cut.n, local));
    onChange(await api.rerender(jobId, cut.n));
    setVideoKey((k) => k + 1);
  });

  const setStatus = (status) => act(async () => {
    onChange(await api.patchCut(jobId, cut.n, { status }));
  });

  return (
    <div className={`rounded-xl border p-4 bg-zinc-900 ${
      cut.status === "approved" ? "border-emerald-600"
      : cut.status === "rejected" ? "border-red-900 opacity-60"
      : "border-zinc-800"}`}>
      <div className="flex gap-5">
        <div className="w-52 shrink-0">
          <VideoPlayer
            key={videoKey}
            src={`/api/clips/${jobId}/${cut.n}?v=${videoKey}`}
            onTime={onTime}
            className="w-full aspect-[9/16] rounded-lg bg-black"
          />
        </div>

        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium">“{cut.hook}”</p>
              <p className="text-sm text-zinc-500 mt-1">{cut.reason}</p>
            </div>
            <span className="shrink-0 text-sm font-mono rounded bg-zinc-800 px-2 py-1">
              {(cut.score * 100).toFixed(0)}%
            </span>
          </div>

          <WordTimeline
            words={words}
            startIdx={local.startIdx}
            endIdx={local.endIdx}
            activeIdx={activeIdx}
            onRangeChange={(s, e) => setLocal((l) => ({ ...l, startIdx: s, endIdx: e }))}
          />

          <CropFramer
            sourceUrl={`/api/clips/${jobId}/source`}
            cut={cut}
            shots={local.shots}
            mode={local.mode}
            onShots={(s) => setLocal((l) => ({ ...l, shots: s }))}
            onMode={(m) => setLocal((l) => ({ ...l, mode: m }))}
          />

          <div className="flex items-center gap-2 pt-1">
            <button onClick={() => setStatus("approved")} disabled={busy || stale}
              title={stale ? "Re-render before approving" : ""}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-3 py-1.5 text-sm">
              Approve
            </button>
            <button onClick={() => setStatus("rejected")} disabled={busy}
              className="rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 px-3 py-1.5 text-sm">
              Reject
            </button>
            <button onClick={saveAndRerender} disabled={busy || !stale}
              className="rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 px-3 py-1.5 text-sm">
              {busy ? "Rendering…" : "Save & re-render"}
            </button>
            {stale && <span className="text-xs text-amber-400">preview out of date</span>}
            {err && <span className="text-xs text-red-400">{err}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}