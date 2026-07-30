import fs from "node:fs";
import { accessToken, isConnected } from "./canvaAuth.js";

const API = "https://api.canva.com/rest/v1";

async function canvaFetch(pathname, init = {}) {
  const token = await accessToken();
  const res = await fetch(`${API}${pathname}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) }
  });
  if (!res.ok) throw new Error(`canva ${pathname} → ${res.status}: ${await res.text()}`);
  return res.json();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export { isConnected };

// uploadClip(filePath) -> { assetId }
export async function uploadClip(filePath, name = "clip.mp4") {
  const body = fs.readFileSync(filePath);
  const safeName = name.slice(0, 50);
  const job = await canvaFetch("/asset-uploads", {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Asset-Upload-Metadata": JSON.stringify({
        name_base64: Buffer.from(safeName).toString("base64")
      })
    },
    body
  });

  let status = job.job;
  while (status.status === "in_progress") {
    await sleep(2000);
    status = (await canvaFetch(`/asset-uploads/${status.id}`)).job;
  }
  if (status.status !== "success") {
    throw new Error(`asset upload failed: ${JSON.stringify(status.error ?? status)}`);
  }
  return { assetId: status.asset.id };
}

// createDesignFromClip(assetId, meta) -> { designId, editUrl }
export async function createDesignFromClip(assetId, meta = {}) {
  const design = await canvaFetch("/designs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      design_type: { type: "custom", width: 1080, height: 1920 },
      title: meta.title ?? "Clipper draft"
    })
  });
  return {
    designId: design.design.id,
    editUrl: design.design.urls.edit_url,
    assetId
  };
}

// tryFetchExport(designId) -> { status, downloadUrl | null }
export async function startExport(designId) {
  const res = await canvaFetch("/exports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      design_id: designId,
      format: { type: "mp4", quality: "vertical_1080p" }
    })
  });
  return res.job.id;
}

export async function tryFetchExport(exportJobId) {
  const { job } = await canvaFetch(`/exports/${exportJobId}`);
  if (job.status === "in_progress") return { status: "in_progress", downloadUrl: null };
  if (job.status === "success") return { status: "success", downloadUrl: job.urls[0] };
  return { status: "failed", downloadUrl: null, error: job.error };
}

export async function downloadTo(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`export download ${res.status}`);
  fs.writeFileSync(destPath, Buffer.from(await res.arrayBuffer()));
  return destPath;
}