import { useState } from "react";

export default function DownloadPanel() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState(null);

  const download = async (format) => {
    setBusy(format); setErr(null);
    try {
      const r = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, format })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || r.statusText);
      const a = document.createElement("a");
      a.href = `/api/download/${encodeURIComponent(data.file)}`;
      a.click();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); download("mp4"); }}
      className="mt-10 pt-6 border-t border-zinc-800 space-y-2">
      <p className="text-sm font-medium text-zinc-300">Download as-is</p>
      <div className="flex gap-2">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…"
          className="flex-1 rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm focus:outline-none focus:border-zinc-500" />
        {["mp4", "mp3"].map((f) => (
          <button key={f} type="button" onClick={() => download(f)} disabled={!!busy || !url}
            className="rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 px-4 py-2 text-sm font-medium">
            {busy === f ? "…" : f.toUpperCase()}
          </button>
        ))}
      </div>
      {err && <p className="text-xs text-red-400">{err}</p>}
    </form>
  );
}