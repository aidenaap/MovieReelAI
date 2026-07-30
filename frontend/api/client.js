async function j(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}
const post = (url, body) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  }).then(j);

export const api = {
  jobs: () => fetch("/api/jobs").then(j),
  job: (id) => fetch(`/api/jobs/${id}`).then(j),
  create: (sourceUrl) => post("/api/jobs", { sourceUrl }),
  retry: (id) => post(`/api/jobs/${id}/retry`),
  artifacts: (id) => fetch(`/api/jobs/${id}/artifacts`).then(j),
  patchCut: (id, n, body) =>
    fetch(`/api/jobs/${id}/cuts/${n}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(j),
  rerender: (id, n) => post(`/api/jobs/${id}/cuts/${n}/rerender`),
  approve: (id) => post(`/api/jobs/${id}/approve`),
  canvaStatus: () => fetch("/api/canva/status").then(j),
  finalize: (id) => post(`/api/canva/jobs/${id}/finalize`),
  remove: (id) => fetch(`/api/jobs/${id}`, { method: "DELETE" }).then(j)
};