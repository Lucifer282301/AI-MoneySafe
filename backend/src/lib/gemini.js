const env = require("../config/env");
const HttpError = require("./httpError");

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const RETRY_NEXT_MODEL = [404, 429, 500, 502, 503, 504];

async function callModel(model, body) {
  const res = await fetch(`${BASE}/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": env.geminiKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(
      `Gemini ${model} returned ${res.status}: ${text.slice(0, 300)}`,
    );
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || "")
    .join("");
  if (!text) throw new Error(`Gemini ${model} returned an empty response`);
  return text;
}

// Try each configured model in order. Throws a 502 HttpError if all of them fail.
async function generate(body) {
  let lastError;
  for (const model of env.geminiModels) {
    try {
      return await callModel(model, body);
    } catch (err) {
      lastError = err;
      const retry =
        err.name === "TimeoutError" || RETRY_NEXT_MODEL.includes(err.status);
      console.error(`Gemini model ${model} failed:`, err.message);
      if (!retry) break;
    }
  }
  console.error("All Gemini models failed:", lastError && lastError.message);
  throw new HttpError(
    502,
    "The AI service is unavailable right now. Please try again shortly.",
  );
}

module.exports = { generate };
