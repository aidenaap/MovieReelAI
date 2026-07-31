import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client.js";
import { useJobStatus } from "../hooks/useJobStatus.js";
import ClipEditor from "../components/ClipEditor.jsx";
import CanvaHandoff from "./CanvaHandoff.jsx";

const DOT = {
  approved: "bg-emerald-500",
  rejected: "bg-red-500"
};

export default function ClipReview({ jobId }) {
  const job = useJobStatus(jobId);
  const [data, setData] = useState(null);
  const [selN, setSelN] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    api.artifacts(jobId).then(setData).catch(() => setData(null));
  }, [jobId]);

  useEffect(() => { load(); }, [load, job?.state]);

  const onCutChange = (updated) => {
    setData((d) => ({
      ...d,
      cuts: d.cuts.map((c) => (c.n === updated.n ? updated : c))
    }));
  };

  const approveJob = async () => {
    setError(null);
    try { await api.approve(jobId); } catch (e) { setError(e.message); }
  };

  if (!job) return <p className="text-zinc-500">Loading…</p>;

  if (["awaiting_canva", "awaiting_canva_manual", "publishing", "published"].includes(job.state)) {
    return <CanvaHandoff jobId={jobId} job={job} canva={data?.canva} />;
  }

  const reviewable = ["awaiting_review", "approved"].includes(job.state) && data?.cuts?.length;

  if (!reviewable) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <h1 className="font-mono text-lg">{jobId}</h1>
        <p className="mt-2 text-2xl capitalize">{job.state.replace(/_/g, " ")}</p>
        {job.error && <p className="mt-2 text-sm text-red-400">{job.error}</p>}
        {job.state === "failed" && (
          <button onClick={() => api.retry(jobId)}
            className="mt-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-sm">
            Retry from {job.failed_stage}
          </button>
        )}
        {!["failed"].includes(job.state) && (
          <p className="mt-4 text-sm text-zinc-500 animate-pulse">Pipeline running…</p>
        )}
      </div>
    );
  }

  const cuts = data.cuts;
  const cut = cuts.find((c) => c.n === selN) ?? cuts[0];
  const approvedCount = cuts.filter((c) => c.status === "approved").length;

  return (
    <div className="max-w-[1500px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Review candidates</h1>
          <p className="text-sm text-zinc-500 font-mono">{jobId} · {job.state}</p>
        </div>
        <div className="text-right">
          <button
            onClick={approveJob}
            disabled={!approvedCount || job.state !== "awaiting_review"}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-4 py-2 text-sm font-medium"
          >
            Finish review ({approvedCount} approved)
          </button>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </div>
      </div>

      <div className="flex gap-4 items-start">
        <aside className="w-56 shrink-0 space-y-2">
          {cuts.map((c) => (
            <button
              key={c.n}
              onClick={() => setSelN(c.n)}
              className={`w-full rounded-lg border p-2.5 text-left hover:bg-zinc-900 ${
                c.n === cut.n ? "border-sky-600 bg-zinc-900" : "border-zinc-800 bg-zinc-900/40"} ${
                c.status === "rejected" ? "opacity-50" : ""}`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-zinc-500">clip {c.n}</span>
                <span className="flex items-center gap-1.5 font-mono text-zinc-400">
                  {(c.score * 100).toFixed(0)}%
                  <span className={`w-2 h-2 rounded-full ${DOT[c.status] ?? "bg-zinc-600"}`} />
                </span>
              </div>
              <p className="mt-1 text-sm line-clamp-2">{c.hook}</p>
            </button>
          ))}
        </aside>

        <div className="flex-1 min-w-0">
          <ClipEditor
            key={cut.n}
            jobId={jobId}
            cut={cut}
            words={data.transcript.words}
            onChange={onCutChange}
          />
        </div>
      </div>
    </div>
  );
}