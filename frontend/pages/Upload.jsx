import { useState } from "react";
import { api } from "../api/client.js";
import DownloadPanel from "../components/DownloadPanel.jsx";

export default function Upload() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const job = await api.create(url);
      window.location.hash = `#/jobs/${job.id}`;
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="max-w-lg mx-auto mt-16">
      <h1 className="text-xl font-semibold mb-4">New clip job</h1>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://www.youtube.com/watch?v=…"
        className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
      />
      <button
        onClick={submit}
        disabled={busy || !url}
        className="mt-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-4 py-2 text-sm font-medium"
      >
        {busy ? "Creating…" : "Create job"}
      </button>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <DownloadPanel />
    </div>
  );
}