import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const VOICE_MONTHLY_LIMIT_SECONDS = 20 * 60;
export const VOICE_CENTS_PER_MINUTE = 20;

function balanceSecondsAvailable(cents: number) {
  // 20 ct / min → 3 sec per cent
  return Math.max(0, Math.floor(cents * 60 / VOICE_CENTS_PER_MINUTE));
}

/** Returns remaining live-voice seconds for the current month. */
export const getVoiceUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase.rpc("get_voice_usage");
    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    const used = row?.voice_seconds_used ?? 0;
    const limit = row?.monthly_limit_seconds ?? VOICE_MONTHLY_LIMIT_SECONDS;
    const balanceCents = row?.balance_cents ?? 0;
    const freeRemaining = Math.max(0, limit - used);
    return {
      used,
      limit,
      freeRemaining,
      balanceCents,
      balanceSeconds: balanceSecondsAvailable(balanceCents),
      remaining: freeRemaining + balanceSecondsAvailable(balanceCents),
    };
  });

/** Adds consumed seconds. Server clamps at the monthly limit. */
export const consumeVoiceSeconds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { seconds: number }) => ({
    seconds: Math.max(0, Math.min(600, Math.floor(input?.seconds ?? 0))),
  }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rpc, error } = await supabase.rpc("consume_voice_seconds", {
      _seconds: data.seconds,
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(rpc) ? rpc[0] : rpc;
    const used = row?.voice_seconds_used ?? 0;
    const limit = row?.monthly_limit_seconds ?? VOICE_MONTHLY_LIMIT_SECONDS;
    const balanceCents = row?.balance_cents ?? 0;
    const freeRemaining = Math.max(0, limit - used);
    return {
      used,
      limit,
      freeRemaining,
      balanceCents,
      balanceSeconds: balanceSecondsAvailable(balanceCents),
      remaining: freeRemaining + balanceSecondsAvailable(balanceCents),
    };
  });

/**
 * Mints a short-lived OpenAI Realtime API ephemeral client_secret for WebRTC.
 * Any active paid subscription can obtain a token if they have either free
 * voice quota (Ultimate) or Universalguthaben available.
 */
export const createRealtimeVoiceSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Verify ultimate subscription
    const { data: sub, error: subErr } = await supabase
      .from("subscriptions")
      .select("status, tier, current_period_end")
      .eq("user_id", userId)
      .maybeSingle();

    if (subErr) throw new Error("SUBSCRIPTION_CHECK_FAILED");
    const active =
      sub &&
      sub.status === "active" &&
      (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
    if (!active) {
      throw new Error("PREMIUM_REQUIRED");
    }

    // Check remaining monthly minutes
    const { data: usage, error: usageErr } = await supabase.rpc("get_voice_usage");
    if (usageErr) throw new Error("VOICE_USAGE_CHECK_FAILED");
    const row = Array.isArray(usage) ? usage[0] : usage;
    const used = row?.voice_seconds_used ?? 0;
    const limit = row?.monthly_limit_seconds ?? VOICE_MONTHLY_LIMIT_SECONDS;
    const balanceCents = row?.balance_cents ?? 0;
    const freeRemaining = sub?.tier === "ultimate" ? Math.max(0, limit - used) : 0;
    const balanceSecs = balanceSecondsAvailable(balanceCents);
    if (freeRemaining + balanceSecs <= 0) throw new Error("VOICE_LIMIT_REACHED");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY missing");

    const res = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-realtime-preview-2024-12-17",
        voice: "shimmer",
        modalities: ["audio", "text"],
        instructions:
          "You are QuillAI, a friendly, helpful multimodal voice assistant. Speak concisely and naturally. Always respond in the same language the user speaks (German or English are common). Be respectful and safe.",
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("OpenAI realtime session error", res.status, txt);
      throw new Error("REALTIME_SESSION_FAILED");
    }
    const data = (await res.json()) as {
      client_secret?: { value: string; expires_at: number };
      model?: string;
    };
    if (!data.client_secret?.value) throw new Error("REALTIME_SESSION_FAILED");

    return {
      clientSecret: data.client_secret.value,
      expiresAt: data.client_secret.expires_at,
      model: data.model ?? "gpt-4o-mini-realtime-preview-2024-12-17",
      remainingSeconds: freeRemaining + balanceSecs,
      limitSeconds: limit,
      freeRemainingSeconds: freeRemaining,
      balanceCents,
    };
  });