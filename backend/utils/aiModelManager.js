const getApiKey = () => process.env.GROQ_API_KEY || "";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// A small list of recommended candidate models to probe automatically when
// `GROQ_CANDIDATE_MODELS` isn't set. You can adjust this list as needed.
const recommendedModels = [
  "mixtral-8x7b",
  "llama-3.1-70b-versatile",
  "llama-3.1-8b-instant",
  "gemma-7b-it",
];

let availableModels = [];
let initialized = false;

const probeModel = async (model, timeoutMs = 5000) => {
  const apiKey = getApiKey();
  if (!apiKey) return { model, ok: false, error: "no_api_key" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "probe" },
          { role: "user", content: "hi" },
        ],
        max_tokens: 1,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!resp) return { model, ok: false, error: "no_response" };
    if (!resp.ok) {
      const body = await resp.text().catch(() => "(unable to read body)");
      let parsed = null;
      try {
        parsed = JSON.parse(body);
      } catch (e) {
        parsed = body;
      }
      return { model, ok: false, status: resp.status, body: parsed };
    }
    return { model, ok: true, status: resp.status };
  } catch (err) {
    clearTimeout(timer);
    const isAbort = err.name === "AbortError";
    return { model, ok: false, error: isAbort ? "timeout" : err.message };
  }
};

export const init = async (opts = {}) => {
  if (initialized) return availableModels;
  initialized = true;

  const envList = (process.env.GROQ_CANDIDATE_MODELS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (envList.length > 0) {
    // If operator configured models, honor that list (we still probe to filter decommissioned ones)
    const candidates = envList;
    const results = [];
    console.log(
      `[aiModelManager] Probing ${
        candidates.length
      } configured models: ${candidates.join(", ")}`
    );
    for (const m of candidates) {
      const r = await probeModel(
        m,
        Number(process.env.GROQ_PROBE_TIMEOUT_MS || opts.timeoutMs || 5000)
      );
      console.log(`[aiModelManager] Probe result for ${m}:`, r);
      results.push(r);
    }
    availableModels = results.filter((r) => r.ok).map((r) => r.model);
    console.log(
      `[aiModelManager] Available models after probe: ${
        availableModels.join(", ") || "NONE"
      }`
    );
    return availableModels;
  }

  // No env config; probe recommended list and use any available
  const results = [];
  console.log(
    `[aiModelManager] No GROQ_CANDIDATE_MODELS set. Probing recommended models: ${recommendedModels.join(
      ", "
    )}`
  );
  for (const m of recommendedModels) {
    const r = await probeModel(
      m,
      Number(process.env.GROQ_PROBE_TIMEOUT_MS || opts.timeoutMs || 5000)
    );
    console.log(`[aiModelManager] Probe result for ${m}:`, r);
    results.push(r);
  }
  availableModels = results.filter((r) => r.ok).map((r) => r.model);
  console.log(
    `[aiModelManager] Available models after probe: ${
      availableModels.join(", ") || "NONE"
    }`
  );
  return availableModels;
};

export const getAvailableModels = () => availableModels.slice();

export const refresh = async () => {
  // re-run init probe (simple implementation)
  initialized = false;
  return await init();
};
