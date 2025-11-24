#!/usr/bin/env node
import process from "node:process";

const normalizeBase = (value) => {
  if (!value) return undefined;
  const trimmed = value.trim().replace(/\/$/, "");
  return trimmed.length ? trimmed : undefined;
};

const apiBase =
  normalizeBase(process.env.API_BASE_URL) || "http://localhost:4000/api";
const rootBase = apiBase.endsWith("/api") ? apiBase.slice(0, -4) : apiBase;
const healthUrl = `${rootBase.replace(/\/$/, "")}/api/health`;
const rootUrl = `${rootBase.replace(/\/$/, "")}/`;
const loginUrl = `${apiBase.replace(/\/$/, "")}/auth/login`;

const log = (message) => console.log(`[check-backend] ${message}`);

const pretty = (data) => {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
};

async function ping(url, label) {
  log(`Pinging ${label} → ${url}`);
  const start = Date.now();
  const response = await fetch(url);
  const elapsed = Date.now() - start;
  let body;
  const text = await response.text();
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!response.ok) {
    throw new Error(
      `${label} responded with ${response.status}: ${pretty(body)}`
    );
  }
  log(`${label} OK (${response.status}) in ${elapsed}ms`);
  if (typeof body === "object") {
    log(`${label} payload: ${pretty(body)}`);
  }
}

async function tryLogin() {
  const email = process.env.TEST_EMAIL || process.env.LOGIN_EMAIL;
  const password = process.env.TEST_PASSWORD || process.env.LOGIN_PASSWORD;
  if (!email || !password) {
    log("Skipping login test (TEST_EMAIL/TEST_PASSWORD not provided).");
    return;
  }
  log(`Attempting login for ${email}`);
  const response = await fetch(loginUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Login failed (${response.status}): ${pretty(payload)}`);
  }
  const tokenPreview = payload?.accessToken
    ? `${payload.accessToken.slice(0, 12)}...`
    : "no-token";
  log(`Login succeeded. Token preview: ${tokenPreview}`);
}

async function main() {
  try {
    await ping(healthUrl, "health");
    await ping(rootUrl, "root");
    await tryLogin();
    log("Backend checks completed successfully.");
  } catch (err) {
    console.error("[check-backend] Error:", err.message || err);
    process.exit(1);
  }
}

main();
