import { useEffect, useState } from "react";

export default function App() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ ok: false }));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-xl font-semibold">Clipper</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Backend:{" "}
          <span className={health?.ok ? "text-emerald-400" : "text-red-400"}>
            {health === null ? "checking…" : health.ok ? "healthy" : "unreachable"}
          </span>
        </p>
      </div>
    </div>
  );
}