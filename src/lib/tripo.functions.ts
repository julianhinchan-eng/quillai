import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TRIPO_BASE = "https://api.tripo3d.ai/v2/openapi";

const CreateTaskInput = z.object({
  prompt: z.string().min(1).max(1024),
  imageBase64: z.string().optional(),
  imageMime: z.string().optional(),
  meshType: z.enum(["triangle", "quad"]).default("triangle"),
  symmetric: z.boolean().default(false),
  modelVersion: z.string().default("v2.5-20250123"),
  smartLowPoly: z.boolean().default(false),
  pbr: z.boolean().default(false),
});

async function tripoFetch(path: string, init: RequestInit) {
  const key = process.env.TRIPO_API_KEY;
  if (!key) throw new Error("TRIPO_API_KEY missing");
  const res = await fetch(`${TRIPO_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const json = (await res.json().catch(() => ({}))) as { code?: number; message?: string; data?: unknown };
  if (!res.ok || (typeof json.code === "number" && json.code !== 0)) {
    throw new Error(json.message || `Tripo request failed (${res.status})`);
  }
  return json.data as Record<string, unknown>;
}

async function uploadImage(base64: string, mime: string) {
  const key = process.env.TRIPO_API_KEY;
  if (!key) throw new Error("TRIPO_API_KEY missing");
  const bin = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const form = new FormData();
  const ext = mime.split("/")[1] || "png";
  form.append("file", new Blob([bin], { type: mime }), `ref.${ext}`);
  const res = await fetch(`${TRIPO_BASE}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  const json = (await res.json().catch(() => ({}))) as { code?: number; message?: string; data?: { image_token?: string } };
  if (!res.ok || json.code !== 0 || !json.data?.image_token) {
    throw new Error(json.message || `Tripo upload failed (${res.status})`);
  }
  return { image_token: json.data.image_token, type: ext };
}

export const createTripoTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateTaskInput.parse(input))
  .handler(async ({ data, context }) => {
    // Gate: only Ultimate Video tier, ≤ 20 generations per month.
    const { data: incRes, error: incErr } = await context.supabase.rpc("increment_3d_usage");
    if (incErr) {
      const msg = incErr.message || "";
      if (msg.includes("ULTIMATE_REQUIRED")) {
        throw new Error("Diese Funktion ist nur im Ultimate Video Tarif verfügbar.");
      }
      if (msg.includes("MONTHLY_3D_LIMIT")) {
        throw new Error("Monatliches Limit erreicht (20 3D-Modelle pro Monat).");
      }
      if (msg.includes("NOT_AUTHENTICATED")) {
        throw new Error("Bitte melde dich an.");
      }
      throw new Error(msg || "3D-Kontingent konnte nicht geprüft werden.");
    }
    void incRes;
    let body: Record<string, unknown>;
    if (data.imageBase64 && data.imageMime) {
      const file = await uploadImage(data.imageBase64, data.imageMime);
      body = {
        type: "image_to_model",
        file,
        prompt: data.prompt,
        model_version: data.modelVersion,
        quad: data.meshType === "quad",
        texture: true,
        pbr: data.pbr,
        smart_low_poly: data.smartLowPoly,
        auto_size: true,
        orientation: data.symmetric ? "align_image" : "default",
      };
    } else {
      body = {
        type: "text_to_model",
        prompt: data.prompt,
        model_version: data.modelVersion,
        quad: data.meshType === "quad",
        texture: true,
        pbr: data.pbr,
        smart_low_poly: data.smartLowPoly,
      };
    }
    const result = await tripoFetch("/task", { method: "POST", body: JSON.stringify(body) });
    return { taskId: (result as { task_id: string }).task_id };
  });

export const getTripoTask = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ taskId: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const result = (await tripoFetch(`/task/${encodeURIComponent(data.taskId)}`, { method: "GET" })) as {
      status: string;
      progress?: number;
      output?: { model?: string; pbr_model?: string; rendered_image?: string };
    };
    return {
      status: result.status,
      progress: result.progress ?? 0,
      modelUrl: result.output?.pbr_model || result.output?.model || null,
      previewUrl: result.output?.rendered_image || null,
    };
  });

export const getMy3DUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ps = new Date();
    const periodStart = new Date(Date.UTC(ps.getUTCFullYear(), ps.getUTCMonth(), 1))
      .toISOString()
      .slice(0, 10);
    const { data } = await context.supabase
      .from("premium_usage")
      .select("models_3d_generated, period_start")
      .eq("user_id", context.userId)
      .eq("period_start", periodStart)
      .maybeSingle();
    return {
      used: (data?.models_3d_generated as number | undefined) ?? 0,
      limit: 20,
      periodStart,
    };
  });