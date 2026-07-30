import { useEffect, useState } from "react";
import Upload from "./pages/Upload.jsx";
import JobList from "./pages/JobList.jsx";
import ClipReview from "./pages/ClipReview.jsx";

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash || "#/");
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

export default function App() {
  const hash = useHashRoute();
  const jobMatch = hash.match(/^#\/jobs\/([a-f0-9]+)/);

  return (
    <div className="min-h-screen">
      <nav className="border-b border-zinc-800 px-6 py-3 flex items-center gap-6">
        <a href="#/" className="font-semibold">Clipper</a>
        <a href="#/" className="text-sm text-zinc-400 hover:text-zinc-100">Jobs</a>
        <a href="#/new" className="text-sm text-zinc-400 hover:text-zinc-100">New</a>
      </nav>
      <main className="p-6">
        {jobMatch ? <ClipReview jobId={jobMatch[1]} />
          : hash === "#/new" ? <Upload />
          : <JobList />}
      </main>
    </div>
  );
}