import fetch from "node-fetch";
import { decommissionedModels } from "./aiChatController.js";

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Probe configured models for availability
export const status = async (req, res) => {
  try {
    const candidateModels = (process.env.GROQ_CANDIDATE_MODELS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (candidateModels.length === 0) {
      return res.status(400).json({
        message:
          "No candidate models configured. Set GROQ_CANDIDATE_MODELS environment variable.",
      });
    }

    if (!GROQ_API_KEY) {
      return res.status(400).json({ message: "GROQ_API_KEY not set" });
    }

    const results = [];

    // small probe message
    const probeMessages = [
      { role: "system", content: "You are a lightweight availability probe." },
      { role: "user", content: "Hello" },
    ];

    // Use AbortController to timeout probes
    const probeTimeoutMs = Number(process.env.GROQ_PROBE_TIMEOUT_MS || 5000);

    for (const model of candidateModels) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), probeTimeoutMs);

      try {
        const resp = await fetch(GROQ_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: probeMessages,
            max_tokens: 1,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!resp) {
          results.push({ model, ok: false, error: "no response" });
          continue;
        }

        if (!resp.ok) {
          const body = await resp.text().catch(() => "(unable to read body)");
          let parsed = {};
          try {
            parsed = JSON.parse(body || "{}");
          } catch (e) {
            // ignore
          }
          results.push({
            model,
            ok: false,
            status: resp.status,
            body: parsed || body,
          });
          continue;
        }

        // success
        results.push({ model, ok: true, status: resp.status });
      } catch (err) {
        clearTimeout(timeout);
        const isAbort = err.name === "AbortError";
        results.push({
          model,
          ok: false,
          error: isAbort ? "timeout" : err.message,
        });
      }
    }

    return res.status(200).json({
      models: results,
      guidance:
        "If models are decommissioned, update GROQ_CANDIDATE_MODELS. See https://console.groq.com/docs/deprecations",
    });
  } catch (err) {
    console.error("aiModels status error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// GET /api/ai-models/blacklist - list currently blacklisted (decommissioned) models
export const getBlacklist = async (req, res) => {
  try {
    const list = Array.from(decommissionedModels.values());
    return res.status(200).json({ blacklist: list });
  } catch (err) {
    console.error("getBlacklist error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// POST /api/ai-models/blacklist/clear - clear the in-memory blacklist
export const clearBlacklist = async (req, res) => {
  try {
    decommissionedModels.clear();
    console.info("Cleared in-memory decommissioned models blacklist");
    return res.status(200).json({ message: "Blacklist cleared" });
  } catch (err) {
    console.error("clearBlacklist error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};
