import { useEffect, useState } from "react";
import { api } from "../api/client.js";

export default function CanvaHandoff({ jobId, job, canva }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [outputs, setOutputs] = useState(null);

  useEffect(() => { api.canvaStatus().then(setStatus).catch(() => {}); }, []);

  const pull = async () => {
    setBusy(true); setError(null);
    try {
      const r = await api.finalize(jobId);
      setOutputs(r.outputs);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const manual = job.state === "awaiting_canva_manual";

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <h1 className="text-xl font-semibold">Canva handoff</h1>
      <p className="text-sm text-zinc-500 font-mono mt-1">{jobId} · {job.state}</p>

      {manual && (
        <div className="mt-6 rounded-xl border border-amber-700/50 bg-amber-950/20 p-4">
          <p className="text-sm text-amber-300">
            Canva isn't connected. Upload these files manually, then add captions via
            Text → Captions in the Canva editor.
          </p>
          {status?.configured && (
            <a href="/api/canva/connect"
              className="inline-block mt-3 rounded-lg bg-amber-600 hover:bg-amber-500 px-4 py-2 text-sm">
              Connect Canva
            </a>
          )}
          <ul className="mt-3 space-y-1">
            {(canva ?? []).map((d) => (
              <li key={d.n} className="font-mono text-xs text-zinc-300 break-all">{d.localFile}</li>
            ))}
          </ul>
        </div>
      )}

      {!manual && (
        <div className="mt-6 space-y-3">
          {(canva ?? []).map((d) => (
            <div key={d.n}
              className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
              <div className="min-w-0">
                <span className="font-mono text-sm">clip {d.n}</span>
                {d.assetName && (
                  <p className="font-mono text-xs text-zinc-500 truncate">{d.assetName}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {d.exported && <span className="text-xs text-emerald-400">exported</span>}
                <a href={d.editUrl} target="_blank" rel="noreferrer"
                  className="rounded-lg bg-violet-600 hover:bg-violet-500 px-3 py-1.5 text-sm">
                  Open in Canva
                </a>
              </div>
            </div>
          ))}

          <div className="pt-2">
            <p className="text-xs text-zinc-500 mb-2 leading-relaxed">
              In each Canva design: open <span className="text-zinc-300">Uploads</span> and drag in
              the clip (named <span className="font-mono text-zinc-300">{"<job>-<n>.mp4"}</span>),
              resize to fill the frame, then enable auto-captions via{" "}
              <span className="text-zinc-300">Text → Captions</span> and style with your brand kit.
              When done:
            </p>
            <button onClick={pull} disabled={busy || job.state !== "awaiting_canva"}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-4 py-2 text-sm font-medium">
              {busy ? "Exporting…" : "Pull exports → /output"}
            </button>
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
            {outputs && (
              <ul className="mt-3 space-y-1">
                {outputs.map((o) => (
                  <li key={o} className="font-mono text-xs text-emerald-300 break-all">{o}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}