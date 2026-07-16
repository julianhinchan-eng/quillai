import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequest } from "@tanstack/react-start/server";
import { TIER_LIMITS, type SubscriptionTier } from "@/lib/paywall.functions";

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };
type ChatMsg = { role: "user" | "assistant"; content: string | ContentPart[] };

const SYSTEM_PROMPT = `You are "QuillAI", a friendly, helpful multimodal AI assistant.
- You CAN see and analyze images the user attaches in the conversation (they arrive as image parts in the message). Never claim you cannot see images — describe what you see and answer the user's question about it.
- Answer concisely and clearly. Use markdown when helpful.
- Always respond in the same language the user writes to you in (German or English are common, but follow whatever the user uses).
- Be respectful and safe. Decline harmful, hateful or illegal requests politely.`;

export const SPECIALIZATIONS = [
  "universal",
  "business",
  "copywriter",
  "code",
  "teacher",
  "legal",
] as const;
export type Specialization = (typeof SPECIALIZATIONS)[number];

const SPECIALIZATION_PROMPTS: Record<Specialization, string> = {
  universal: SYSTEM_PROMPT,
  business: `${SYSTEM_PROMPT}

ROLE: You are a senior business & startup advisor. Specialize in business plans, go-to-market and marketing strategies, pricing, fundraising decks, investor and customer emails, lean canvas, OKRs, and competitor analysis. Give structured, actionable advice with concrete next steps, frameworks (e.g. SWOT, Porter, AARRR), and example numbers when useful. Prefer bullet points and short sections.`,
  copywriter: `${SYSTEM_PROMPT}

ROLE: You are an expert copywriter & content creator. Specialize in punchy social media posts (Instagram, LinkedIn, TikTok, X), blog articles, newsletters, ad copy, hooks, CTAs and storytelling. Match the requested tone and platform, use vivid language, strong openings, and offer 2-3 variations when relevant. Mind character limits where they apply.`,
  code: `${SYSTEM_PROMPT}

ROLE: You are a senior software engineer and debugging expert. Deliver clean, correct, production-ready code with helpful inline comments. Explain the reasoning briefly, point out edge cases, and when debugging, isolate the root cause before proposing a fix. Always use fenced code blocks with the correct language tag. Prefer modern idiomatic patterns.`,
  teacher: `${SYSTEM_PROMPT}

ROLE: You are a patient teacher and explainer. Break complex topics into simple steps using analogies and small, concrete examples. Check understanding with quick questions, suggest practice exercises, and offer structured learning plans (day-by-day or week-by-week) when asked. Avoid jargon unless you define it.`,
  legal: `${SYSTEM_PROMPT}

ROLE: You are a helpful assistant for understanding contracts, official letters, and bureaucratic documents in plain language. Summarize key clauses, flag obligations, deadlines, risks and unusual terms, and explain next steps. ALWAYS include a short disclaimer that you are not a lawyer and that the user should consult a qualified attorney for binding legal advice.`,
};

function resolveSystemPrompt(spec?: string) {
  if (spec && (SPECIALIZATIONS as readonly string[]).includes(spec)) {
    return SPECIALIZATION_PROMPTS[spec as Specialization];
  }
  return SYSTEM_PROMPT;
}

export type AiChatStatus = {
  hasActiveSubscription: boolean;
};

export const getAiChatStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AiChatStatus> => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", userId)
      .maybeSingle();
    const active =
      !!sub &&
      sub.status === "active" &&
      (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
    return { hasActiveSubscription: active };
  });

// Legacy exports kept for back-compat (Ultimate tier values).
export const MONTHLY_IMAGE_LIMIT = TIER_LIMITS.ultimate.images;
export const MONTHLY_VIDEO_LIMIT = TIER_LIMITS.ultimate.videos;

export type PremiumUsage = {
  imagesGenerated: number;
  videosGenerated: number;
  imageLimit: number;
  videoLimit: number;
  periodStart: string; // YYYY-MM-DD
  tier: SubscriptionTier | null;
};

export const getMyPremiumUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PremiumUsage> => {
    const { supabase } = context;
    const ps = new Date();
    const periodStart = `${ps.getUTCFullYear()}-${String(ps.getUTCMonth() + 1).padStart(2, "0")}-01`;
    const { data: subRow } = await supabase
      .from("subscriptions")
      .select("status, current_period_end, tier")
      .eq("user_id", context.userId)
      .maybeSingle();
    const active =
      !!subRow &&
      subRow.status === "active" &&
      (!subRow.current_period_end || new Date(subRow.current_period_end) > new Date());
    const tier: SubscriptionTier | null = active
      ? (subRow!.tier === "standard" ? "standard" : "ultimate")
      : null;
    const limits = tier ? TIER_LIMITS[tier] : TIER_LIMITS.ultimate;
    const { data } = await supabase
      .from("premium_usage")
      .select("images_generated, videos_generated, period_start")
      .eq("user_id", context.userId)
      .eq("period_start", periodStart)
      .maybeSingle();
    return {
      imagesGenerated: data?.images_generated ?? 0,
      videosGenerated: data?.videos_generated ?? 0,
      imageLimit: limits.images,
      videoLimit: limits.videos,
      periodStart,
      tier,
    };
  });

async function claimUsageSlot(supabase: any, kind: "image" | "video") {
  const { error } = await supabase.rpc("increment_premium_usage", { _kind: kind });
  if (error) {
    const msg = String(error.message ?? "");
    if (msg.includes("MONTHLY_IMAGE_LIMIT")) throw new Error("MONTHLY_IMAGE_LIMIT");
    if (msg.includes("MONTHLY_VIDEO_LIMIT")) throw new Error("MONTHLY_VIDEO_LIMIT");
    if (msg.includes("VIDEO_REQUIRES_ULTIMATE")) throw new Error("VIDEO_REQUIRES_ULTIMATE");
    if (msg.includes("PREMIUM_REQUIRED")) throw new Error("PREMIUM_REQUIRED");
    throw new Error(msg || "usage tracking failed");
  }
}

async function checkActiveSubscription(supabase: any, userId: string) {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();
  return (
    !!sub &&
    sub.status === "active" &&
    (!sub.current_period_end || new Date(sub.current_period_end) > new Date())
  );
}

export const askQuillAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { messages: ChatMsg[]; specialization?: string }) => {
    if (!d || !Array.isArray(d.messages)) throw new Error("messages required");
    if (d.messages.length === 0) throw new Error("messages empty");
    if (d.messages.length > 40) d.messages = d.messages.slice(-40);
    if (d.specialization !== undefined && typeof d.specialization !== "string") {
      throw new Error("bad specialization");
    }
    for (const m of d.messages) {
      if (m.role !== "user" && m.role !== "assistant") throw new Error("bad role");
      if (typeof m.content === "string") {
        if (m.content.length > 200_000) m.content = m.content.slice(0, 200_000);
      } else if (Array.isArray(m.content)) {
        if (m.content.length > 8) throw new Error("too many parts");
        for (const p of m.content) {
          if (p.type === "text") {
            if (typeof p.text !== "string") throw new Error("bad text part");
            if (p.text.length > 200_000) p.text = p.text.slice(0, 200_000);
          } else if (p.type === "image_url") {
            const url = p.image_url?.url;
            if (typeof url !== "string" || url.length > 15_000_000) throw new Error("bad image part");
          } else {
            throw new Error("bad part");
          }
        }
      } else {
        throw new Error("bad content");
      }
    }
    return d;
  })
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI service not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: resolveSystemPrompt(data.specialization) },
          ...data.messages,
        ],
      }),
    });

    if (res.status === 429) throw new Error("RATE_LIMIT");
    if (res.status === 402) throw new Error("CREDITS_EXHAUSTED");
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[QuillAI] gateway error", res.status, text);
      throw new Error("AI gateway error");
    }
    const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const reply = j.choices?.[0]?.message?.content?.trim() ?? "";
    return { reply };
  });

// ---------------- Guest (unauthenticated) chat ----------------
// In-memory per-IP counter, resets each UTC day. Edge Workers may run
// multiple instances so this is a soft limit; the client also throttles
// via localStorage. Good-enough abuse guard for a free tier.
const guestIpCounts = new Map<string, { day: string; count: number }>();
const GUEST_IP_DAILY_LIMIT = 20;

function getClientIp(): string {
  try {
    const req = getRequest();
    const h = req.headers;
    return (
      h.get("cf-connecting-ip") ||
      h.get("x-real-ip") ||
      (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ||
      "unknown"
    );
  } catch {
    return "unknown";
  }
}

function todayUtc(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

export const askQuillAIGuest = createServerFn({ method: "POST" })
  .inputValidator((d: { messages: Array<{ role: "user" | "assistant"; content: string }>; specialization?: string }) => {
    if (!d || !Array.isArray(d.messages)) throw new Error("messages required");
    if (d.messages.length === 0) throw new Error("messages empty");
    if (d.messages.length > 20) d.messages = d.messages.slice(-20);
    if (d.specialization !== undefined && typeof d.specialization !== "string") {
      throw new Error("bad specialization");
    }
    for (const m of d.messages) {
      if (m.role !== "user" && m.role !== "assistant") throw new Error("bad role");
      if (typeof m.content !== "string") throw new Error("bad content");
      if (m.content.length > 8000) m.content = m.content.slice(0, 8000);
    }
    return d;
  })
  .handler(async ({ data }) => {
    const ip = getClientIp();
    const today = todayUtc();
    const entry = guestIpCounts.get(ip);
    if (entry && entry.day === today) {
      if (entry.count >= GUEST_IP_DAILY_LIMIT) throw new Error("GUEST_LIMIT");
      entry.count += 1;
    } else {
      guestIpCounts.set(ip, { day: today, count: 1 });
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI service not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: resolveSystemPrompt(data.specialization) },
          ...data.messages,
        ],
      }),
    });

    if (res.status === 429) throw new Error("RATE_LIMIT");
    if (res.status === 402) throw new Error("CREDITS_EXHAUSTED");
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[QuillAI guest] gateway error", res.status, text);
      throw new Error("AI gateway error");
    }
    const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const reply = j.choices?.[0]?.message?.content?.trim() ?? "";
    return { reply };
  });

export const generateQuillImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { prompt: string; model?: "gemini" | "flux" | "lustify" }) => {
    if (!d || typeof d.prompt !== "string") throw new Error("prompt required");
    const prompt = d.prompt.trim();
    if (!prompt) throw new Error("prompt empty");
    if (prompt.length > 2000) throw new Error("prompt too long");
    const model =
      d.model === "flux" ? "flux" : d.model === "lustify" ? "lustify" : "gemini";
    return { prompt, model } as { prompt: string; model: "gemini" | "flux" | "lustify" };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const active = await checkActiveSubscription(supabase, userId);
    if (!active) throw new Error("PREMIUM_REQUIRED");

    await claimUsageSlot(supabase, "image");

    if (data.model === "flux") {
      const imageDataUrl = await generateFluxImage(data.prompt);
      return { imageDataUrl };
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI service not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: data.prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (res.status === 429) throw new Error("RATE_LIMIT");
    if (res.status === 402) throw new Error("CREDITS_EXHAUSTED");
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[QuillAI] image gen error", res.status, text);
      throw new Error("AI gateway error");
    }
    const j = (await res.json()) as { data?: Array<{ b64_json?: string }> };
    const b64 = j.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image returned");
    return { imageDataUrl: `data:image/png;base64,${b64}` };
  });

// Image-to-Image: takes an uploaded image as visual reference plus a text
// prompt and returns a NEW modified image generated by Gemini 2.5 Flash
// Image. Charges 1 image credit (same monthly limit as text-to-image).
export const transformQuillImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { prompt: string; imageUrl: string }) => {
    if (!d || typeof d.prompt !== "string") throw new Error("prompt required");
    const prompt = d.prompt.trim();
    if (!prompt) throw new Error("prompt empty");
    if (prompt.length > 2000) throw new Error("prompt too long");
    if (typeof d.imageUrl !== "string" || !d.imageUrl) throw new Error("imageUrl required");
    if (d.imageUrl.length > 15_000_000) throw new Error("imageUrl too large");
    return { prompt, imageUrl: d.imageUrl };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const active = await checkActiveSubscription(supabase, userId);
    if (!active) throw new Error("PREMIUM_REQUIRED");

    await claimUsageSlot(supabase, "image");

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI service not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: data.prompt },
              { type: "image_url", image_url: { url: data.imageUrl } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (res.status === 429) throw new Error("RATE_LIMIT");
    if (res.status === 402) throw new Error("CREDITS_EXHAUSTED");
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[QuillAI] image transform error", res.status, text);
      throw new Error("AI gateway error");
    }
    const j = (await res.json()) as { data?: Array<{ b64_json?: string }> };
    const b64 = j.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image returned");
    return { imageDataUrl: `data:image/png;base64,${b64}` };
  });

// Sample fallback clips used when no external video provider is configured.
// Replace with a real Luma/Runway/Pika integration when API keys are added.
const SAMPLE_VIDEOS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
];

export const generateQuillVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { prompt: string; imageUrl?: string }) => {
    if (!d || typeof d.prompt !== "string") throw new Error("prompt required");
    const prompt = d.prompt.trim();
    if (!prompt) throw new Error("prompt empty");
    if (prompt.length > 2000) throw new Error("prompt too long");
    let imageUrl: string | undefined;
    if (d.imageUrl !== undefined) {
      if (typeof d.imageUrl !== "string") throw new Error("bad imageUrl");
      if (d.imageUrl.length > 15_000_000) throw new Error("imageUrl too large");
      imageUrl = d.imageUrl;
    }
    return { prompt, imageUrl };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const active = await checkActiveSubscription(supabase, userId);
    if (!active) throw new Error("PREMIUM_REQUIRED");

    await claimUsageSlot(supabase, "video");

    const runwayKey = process.env.RUNWAY_API_KEY;
    if (runwayKey) {
      try {
        const videoUrl = await generateRunwayVideo(runwayKey, data.prompt, data.imageUrl);
        return { videoUrl, simulated: false as const };
      } catch (err) {
        console.error("[QuillAI] Runway generation failed", err);
        throw new Error("VIDEO_GENERATION_FAILED");
      }
    }

    // Fallback: simulated clip if no provider key is configured.
    let hash = 0;
    for (let i = 0; i < data.prompt.length; i++) hash = (hash * 31 + data.prompt.charCodeAt(i)) >>> 0;
    const videoUrl = SAMPLE_VIDEOS[hash % SAMPLE_VIDEOS.length];
    await new Promise((r) => setTimeout(r, 4000));
    return { videoUrl, simulated: true as const };
  });

// Extends an existing video by generating a second 8-second clip that
// continues the same scene. Costs one additional video credit (enforced via
// the same monthly RPC) and is blocked when the user has 0 credits left.
// The one-time-per-video rule is enforced client-side; the server still
// charges per call so refreshing and re-clicking will burn another credit
// — that is by design to protect API costs.
export const extendQuillVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { prompt: string; imageUrl?: string }) => {
    if (!d || typeof d.prompt !== "string") throw new Error("prompt required");
    const prompt = d.prompt.trim();
    if (!prompt) throw new Error("prompt empty");
    if (prompt.length > 2000) throw new Error("prompt too long");
    let imageUrl: string | undefined;
    if (d.imageUrl !== undefined) {
      if (typeof d.imageUrl !== "string") throw new Error("bad imageUrl");
      if (d.imageUrl.length > 15_000_000) throw new Error("imageUrl too large");
      imageUrl = d.imageUrl;
    }
    return { prompt, imageUrl };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const active = await checkActiveSubscription(supabase, userId);
    if (!active) throw new Error("PREMIUM_REQUIRED");

    // Charges another video credit; throws MONTHLY_VIDEO_LIMIT /
    // VIDEO_REQUIRES_ULTIMATE / PREMIUM_REQUIRED as appropriate.
    await claimUsageSlot(supabase, "video");

    const continuationPrompt =
      `Continuation of the previous scene — keep the same characters, ` +
      `style, lighting and camera. Original prompt: ${data.prompt}`;

    const runwayKey = process.env.RUNWAY_API_KEY;
    if (runwayKey) {
      try {
        const videoUrl = await generateRunwayVideo(runwayKey, continuationPrompt, data.imageUrl);
        return { videoUrl, simulated: false as const };
      } catch (err) {
        console.error("[QuillAI] Runway extension failed", err);
        throw new Error("VIDEO_GENERATION_FAILED");
      }
    }

    let hash = 0;
    for (let i = 0; i < continuationPrompt.length; i++)
      hash = (hash * 31 + continuationPrompt.charCodeAt(i)) >>> 0;
    const videoUrl = SAMPLE_VIDEOS[(hash + 1) % SAMPLE_VIDEOS.length];
    await new Promise((r) => setTimeout(r, 4000));
    return { videoUrl, simulated: true as const };
  });

// ---------------- Runway integration ----------------
// Docs: https://docs.dev.runwayml.com/api/
// Text-to-video uses Gen-4 Turbo. Returns a task id; we poll until SUCCEEDED.
const RUNWAY_BASE = "https://api.dev.runwayml.com/v1";
const RUNWAY_VERSION = "2024-11-06";

// ---------------- Together AI (FLUX.1 Schnell) ----------------
// Docs: https://docs.together.ai/reference/post_images-generations
async function generateFluxImage(prompt: string): Promise<string> {
  const key = process.env.TOGETHER_API_KEY;
  if (!key) throw new Error("AI service not configured");
  const res = await fetch("https://api.together.xyz/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "black-forest-labs/FLUX.1-schnell",
      prompt,
      width: 1024,
      height: 1024,
      steps: 4,
      n: 1,
      response_format: "b64_json",
    }),
  });
  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[Flux] image gen error", res.status, text);
    throw new Error("AI gateway error");
  }
  const j = (await res.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
  const b64 = j.data?.[0]?.b64_json;
  if (b64) return `data:image/png;base64,${b64}`;
  const url = j.data?.[0]?.url;
  if (url) {
    const imgRes = await fetch(url);
    if (!imgRes.ok) throw new Error("Flux: fetch image failed");
    const buf = new Uint8Array(await imgRes.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const b64Encoded = btoa(bin);
    return `data:image/png;base64,${b64Encoded}`;
  }
  throw new Error("No image returned");
}

async function generateRunwayVideo(
  apiKey: string,
  prompt: string,
  imageUrl?: string,
): Promise<string> {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "X-Runway-Version": RUNWAY_VERSION,
    "Content-Type": "application/json",
  };

  // Image-to-Video uses Runway's gen4_turbo image_to_video endpoint;
  // pure text prompts use Veo 3.1 Fast text_to_video.
  const endpoint = imageUrl ? "image_to_video" : "text_to_video";
  const body: Record<string, unknown> = imageUrl
    ? {
        model: "gen4_turbo",
        promptImage: imageUrl,
        promptText: prompt,
        ratio: "1280:720",
        duration: 8,
      }
    : {
        model: "veo3.1_fast",
        promptText: prompt,
        ratio: "1280:720",
        duration: 8,
      };
  const createRes = await fetch(`${RUNWAY_BASE}/${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!createRes.ok) {
    const txt = await createRes.text().catch(() => "");
    console.error("[Runway] create task failed", createRes.status, txt);
    throw new Error(`Runway ${createRes.status}`);
  }
  const created = (await createRes.json()) as { id?: string };
  const taskId = created.id;
  if (!taskId) throw new Error("Runway: missing task id");

  // Poll up to ~4 minutes (Veo 3.1 Fast clips usually finish in 60-180s).
  const deadline = Date.now() + 240_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 4000));
    const pollRes = await fetch(`${RUNWAY_BASE}/tasks/${taskId}`, { headers });
    if (!pollRes.ok) {
      const txt = await pollRes.text().catch(() => "");
      console.error("[Runway] poll failed", pollRes.status, txt);
      throw new Error(`Runway poll ${pollRes.status}`);
    }
    const task = (await pollRes.json()) as {
      status?: string;
      output?: string[];
      failure?: string;
      failureCode?: string;
    };
    if (task.status === "SUCCEEDED") {
      const url = task.output?.[0];
      if (!url) throw new Error("Runway: no output url");
      return url;
    }
    if (task.status === "FAILED" || task.status === "CANCELLED") {
      console.error("[Runway] task failed", task.failure, task.failureCode);
      throw new Error(task.failure || "Runway task failed");
    }
  }
  throw new Error("Runway timeout");
}
