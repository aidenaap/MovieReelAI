import { useEffect, useState } from "react";
import { api } from "../api/client.js";

const STATE_COLORS = {
  awaiting_review: "text-amber-400",
  approved: "text-emerald-400",
  published: "text-emerald-400",
  failed: "text-red-400"
};

export default function JobList() {
  const [jobs, setJobs] = useState([]);
  useEffect(() => {
    const load = () => api.jobs().then(setJobs).catch(() => {});
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Jobs</h1>
      <div className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900">
        {jobs.map((j) => (
          <a key={j.id} href={`#/jobs/${j.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/50">
            <div>
              <span className="font-mono text-sm">{j.id}</span>
              <p className="text-xs text-zinc-500 truncate max-w-md">{j.source}</p>
            </div>
            <span className={`text-sm ${STATE_COLORS[j.state] ?? "text-zinc-400"}`}>
              {j.state}{j.failed_stage ? ` (${j.failed_stage})` : ""}
            </span>
          </a>
        ))}
        {!jobs.length && <p className="px-4 py-8 text-sm text-zinc-500">No jobs yet.</p>}
      </div>
    </div>
  );
}