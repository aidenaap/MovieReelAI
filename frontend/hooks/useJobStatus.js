import { useEffect, useState } from "react";

export function useJobStatus(jobId) {
  const [job, setJob] = useState(null);
  useEffect(() => {
    if (!jobId) return;
    const es = new EventSource(`/api/jobs/${jobId}/stream`);
    es.onmessage = (e) => setJob(JSON.parse(e.data));
    return () => es.close();
  }, [jobId]);
  return job;
}