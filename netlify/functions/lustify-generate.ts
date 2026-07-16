import type { Config } from "@netlify/functions";

const MODELSLAB_TEXT2IMG_URL = "https://modelslab.com/api/v6/images/text2img";
const MODELSLAB_FETCH_URL = "https://modelslab.com/api/v6/images/fetch";
const DEFAULT_LUSTIFY_MODEL_ID = "lustify-sdxl-nsfw-checkpoint-olt-fixed-textures-1768513751";
const BLOCKED_COUNTRIES = new Set(["DE", "GB", "BR", "AU", "FR"]);
const BLOCKED_US_REGIONS = new Set(["AL", "AZ", "AR", "FL", "GA", "ID", "IA", "IN", "KS", "KY", "LA", "MS", "MO", "MT", "NE", "NC", "ND", "OH", "OK", "SC", "SD", "TN", "TX", "UT", "VA", "WV", "WY"]);

type ModelsLabResponse = { status?: string; id?: string | number; output?: string[]; message?: string; eta?: number };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

async function modelsLabPost(url: string, body: Record<string, unknown>, signal: AbortSignal) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  const data = (await response.json().catch(() => ({}))) as ModelsLabResponse;
  if (!response.ok || data.status === "error") throw new Error(data.message || `ModelsLab request failed (${response.status})`);
  return data;
}

export default async (request: Request, context: any) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const country = String(context?.geo?.country?.code || "").toUpperCase();
  const region = String(context?.geo?.subdivision?.code || "").toUpperCase().replace(/^US-/, "");
  if (BLOCKED_COUNTRIES.has(country) || (country === "US" && BLOCKED_US_REGIONS.has(region))) return json({ error: "LUSTIFY_GEO_BLOCKED" }, 403);

  const apiKey = process.env.MODELSLAB_API_KEY;
  if (!apiKey) return json({ error: "AI service not configured" }, 500);

  let body: { prompt?: unknown };
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) return json({ error: "prompt required" }, 400);
  if (prompt.length > 2000) return json({ error: "prompt too long" }, 400);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 50_000);
  try {
    const modelId = process.env.MODELSLAB_LUSTIFY_MODEL_ID || DEFAULT_LUSTIFY_MODEL_ID;
    let result = await modelsLabPost(MODELSLAB_TEXT2IMG_URL, {
      key: apiKey, model_id: modelId, prompt,
      negative_prompt: "worst quality, low quality, blurry, deformed, bad anatomy, extra limbs",
      width: 1024, height: 1024, samples: 1, num_inference_steps: 30, guidance_scale: 7.5,
      enhance_prompt: "yes", safety_checker: false, base64: false, temp: false,
    }, controller.signal);

    if (result.status === "processing" && result.id) {
      for (let attempt = 0; attempt < 16 && !controller.signal.aborted; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        result = await modelsLabPost(MODELSLAB_FETCH_URL, { key: apiKey, request_id: String(result.id) }, controller.signal);
        if (result.status === "success" && result.output?.[0]) break;
      }
    }
    const imageUrl = result.output?.[0];
    return imageUrl ? json({ imageUrl }) : json({ error: "ModelsLab generation timed out or returned no image" }, 504);
  } catch (error) {
    const message = error instanceof Error ? error.message : "LUSTIFY_GENERATION_FAILED";
    if (error instanceof Error && error.name === "AbortError") return json({ error: "LUSTIFY_GENERATION_TIMEOUT" }, 504);
    if (/rate|429/i.test(message)) return json({ error: "RATE_LIMIT" }, 429);
    if (/credit|balance|402/i.test(message)) return json({ error: "CREDITS_EXHAUSTED" }, 402);
    console.error("[Lustify/ModelsLab]", message);
    return json({ error: "LUSTIFY_GENERATION_FAILED" }, 502);
  } finally { clearTimeout(timeout); }
};

export const config: Config = { path: "/.netlify/functions/lustify-generate" };
