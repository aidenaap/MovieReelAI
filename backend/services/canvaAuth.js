import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE = path.join(here, "..", "db", "canva-token.json");
const AUTH_BASE = "https://www.canva.com/api/oauth/authorize";
const TOKEN_URL = "https://api.canva.com/rest/v1/oauth/token";
const SCOPES = "asset:read asset:write design:content:read design:content:write design:meta:read";
const STATE_FILE = path.join(here, "..", "db", "canva-pending.json");

const pending = new Map(); // state → verifier

export function isConfigured() {
  return Boolean(process.env.CANVA_CLIENT_ID && process.env.CANVA_CLIENT_SECRET);
}
export function isConnected() {
  return isConfigured() && fs.existsSync(TOKEN_FILE);
}

function readPending() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); } catch { return {}; }
}
function writePending(obj) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(obj, null, 2));
}

export function redirectUri() {
  const v = (process.env.CANVA_REDIRECT_URI ?? "").trim();
  if (!v) throw new Error("CANVA_REDIRECT_URI not set");
  return v;
}


export function authorizeUrl() {
  const verifier = crypto.randomBytes(48).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  const state = crypto.randomBytes(16).toString("hex");

  const pending = readPending();
  pending[state] = { verifier, at: Date.now() };
  writePending(pending);

  const u = new URL(AUTH_BASE);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", process.env.CANVA_CLIENT_ID.trim());
  u.searchParams.set("redirect_uri", redirectUri());
  u.searchParams.set("scope", SCOPES);
  u.searchParams.set("code_challenge", challenge);
  u.searchParams.set("code_challenge_method", "S256");
  u.searchParams.set("state", state);
  return u.toString();
}

async function tokenRequest(params) {
  const basic = Buffer.from(
    `${process.env.CANVA_CLIENT_ID.trim()}:${process.env.CANVA_CLIENT_SECRET.trim()}`
  ).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams(params)
  });
  if (!res.ok) throw new Error(`canva token endpoint ${res.status}: ${await res.text()}`);
  const tok = await res.json();
  tok.expires_at = Date.now() + (tok.expires_in - 60) * 1000;
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tok, null, 2));
  return tok;
}

export async function exchangeCode(code, state) {
  const pending = readPending();
  const entry = pending[state];
  if (!entry) throw new Error("unknown OAuth state — restart the connect flow");
  delete pending[state];
  writePending(pending);
  return tokenRequest({
    grant_type: "authorization_code",
    code,
    code_verifier: entry.verifier,
    redirect_uri: redirectUri()
  });
}

export async function accessToken() {
  if (!fs.existsSync(TOKEN_FILE)) throw new Error("Canva not connected");
  let tok = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8"));
  if (Date.now() >= tok.expires_at) {
    tok = await tokenRequest({ grant_type: "refresh_token", refresh_token: tok.refresh_token });
  }
  return tok.access_token;
}