import { useEffect, useState } from "react";
import { api } from "../api/client.js";

const STATE_COLORS = {
  awaiting_review: "text-amber-400",
  approved: "text-emerald-400",
  published: "text-emerald-400",
  failed: "text-red-400"
};

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 hover:text-red-600">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5" />
    </svg>
  );
}

export default function JobList() {
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState(null);

  const load = () => api.jobs().then(setJobs).catch(() => {});
  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);

  const remove = async (id) => {
    if (!window.confirm(`Delete job ${id} and all its files?`)) return;
    setError(null);
    try { await api.remove(id); load(); }
    catch (err) { setError(err.message); }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Jobs</h1>
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3 text-left font-medium">Job ID</th>
              <th className="px-4 py-3 text-left font-medium">Source</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-center font-medium w-16">Delete</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {jobs.map((j) => (
              <tr key={j.id} className="hover:bg-zinc-800/40">
                <td className="px-4 py-3">
                  <a href={`#/jobs/${j.id}`} className="font-mono hover:text-emerald-400">
                    {j.id}
                  </a>
                </td>
                <td className="px-4 py-3">
                  <a href={j.source} target="_blank" rel="noreferrer"
                    className="inline-block rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-100">
                    Open source ↗
                  </a>
                </td>
                <td className={`px-4 py-3 ${STATE_COLORS[j.state] ?? "text-zinc-400"}`}>
                  {j.state}{j.failed_stage ? ` (${j.failed_stage})` : ""}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center">
                    <button onClick={() => remove(j.id)} title="Delete job"
                      className="rounded p-1.5 text-zinc-600 hover:text-red-600 hover:bg-red-950/40">
                      <TrashIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!jobs.length && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">No jobs yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}