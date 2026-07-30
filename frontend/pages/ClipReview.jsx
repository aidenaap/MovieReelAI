import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client.js";
import { useJobStatus } from "../hooks/useJobStatus.js";
import CandidateCard from "../components/CandidateCard.jsx";
import CanvaHandoff from "./CanvaHandoff.jsx";

export default function ClipReview({ jobId }) {
  const job = useJobStatus(jobId);
  const [data, setData] = useState(null);
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

  const approvedCount = data.cuts.filter((c) => c.status === "approved").length;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
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
      <div className="space-y-6">
        {data.cuts.map((cut) => (
          <CandidateCard
            key={cut.n}
            jobId={jobId}
            cut={cut}
            words={data.transcript.words}
            onChange={onCutChange}
          />
        ))}
      </div>
    </div>
  );
}