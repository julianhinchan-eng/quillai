import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============================================================
// PayPal configuration — strict separation of LIVE vs SANDBOX.
// ------------------------------------------------------------
// LIVE mode reads ONLY: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET,
//   PAYPAL_PLAN_ID, PAYPAL_PLAN_ID_USD, PAYPAL_WEBHOOK_ID
// SANDBOX mode reads ONLY: PAYPAL_SANDBOX_CLIENT_ID,
//   PAYPAL_SANDBOX_CLIENT_SECRET, PAYPAL_PLAN_ID_SANDBOX,
//   PAYPAL_PLAN_ID_USD_SANDBOX, PAYPAL_SANDBOX_WEBHOOK_ID
// Mode is selected by PAYPAL_ENV ("sandbox" | "live", default "live").
// In LIVE mode sandbox keys are never read, and vice versa.
// ============================================================

// ---------- Live plan IDs (hard-coded — two-tier model) ----------
// Standard Pro: 3.90 € / $3.90 — 500 images, no videos.
// Ultimate Video: 10.00 € / $10.00 — 900 images, 15 videos.
const PLAN_IDS_LIVE = {
  standard: {
    EUR: "P-2HB6725205170283GNJAYCYY",
    USD: "P-2AK54779BC1676032NJAYDTQ",
  },
  ultimate: {
    EUR: "P-4L992057DU656781YNI7KABI",
    USD: "P-6AYS12421W784834SNI7KAZY",
  },
} as const;

export type SubscriptionTier = "standard" | "ultimate";
export type CurrencyCode = "EUR" | "USD";

export const TIER_PRICING: Record<
  SubscriptionTier,
  { EUR: { amount: string; label: string }; USD: { amount: string; label: string } }
> = {
  standard: {
    EUR: { amount: "3.90", label: "3,90\u00A0€" },
    USD: { amount: "3.90", label: "$3.90" },
  },
  ultimate: {
    EUR: { amount: "10.00", label: "10,00\u00A0€" },
    USD: { amount: "10.00", label: "$10.00" },
  },
};

export const TIER_LIMITS: Record<
  SubscriptionTier,
  { images: number; videos: number }
> = {
  standard: { images: 500, videos: 0 },
  ultimate: { images: 900, videos: 15 },
};

export type PayPalMode = "sandbox" | "live";
export const getPayPalMode = (): PayPalMode =>
  process.env.PAYPAL_ENV === "sandbox" ? "sandbox" : "live";

const isPlanIdShape = (v: string) => /^P-[A-Z0-9]{10,}$/i.test(v);

export type PayPalConfig = {
  mode: PayPalMode;
  base: string;
  clientId: string;
  clientSecret: string;
  plans: Record<SubscriptionTier, Record<CurrencyCode, string>>;
  webhookId: string;
};

/** Resolve the active PayPal config with strict per-mode isolation. */
export function getPayPalServerConfig(): PayPalConfig {
  const mode = getPayPalMode();

  if (mode === "sandbox") {
    const clientId = process.env.PAYPAL_SANDBOX_CLIENT_ID ?? "";
    const clientSecret = process.env.PAYPAL_SANDBOX_CLIENT_SECRET ?? "";
    const webhookId = process.env.PAYPAL_SANDBOX_WEBHOOK_ID ?? "";
    // Sandbox has no two-tier setup configured; we reuse the same sandbox
    // plan for both tiers so test checkout still works end-to-end.
    const sandboxEur = process.env.PAYPAL_PLAN_ID_SANDBOX ?? "";
    const sandboxUsd = process.env.PAYPAL_PLAN_ID_USD_SANDBOX ?? "";
    return {
      mode,
      base: "https://api-m.sandbox.paypal.com",
      clientId,
      clientSecret,
      plans: {
        standard: { EUR: sandboxEur, USD: sandboxUsd },
        ultimate: { EUR: sandboxEur, USD: sandboxUsd },
      },
      webhookId,
    };
  }

  // LIVE — never read sandbox secrets here.
  return {
    mode: "live",
    base: "https://api-m.paypal.com",
    clientId: process.env.PAYPAL_CLIENT_ID ?? "",
    clientSecret: process.env.PAYPAL_CLIENT_SECRET ?? "",
    plans: {
      standard: { ...PLAN_IDS_LIVE.standard },
      ultimate: { ...PLAN_IDS_LIVE.ultimate },
    },
    webhookId: process.env.PAYPAL_WEBHOOK_ID ?? "",
  };
}

/** Throw a clear error if the active mode is missing required values. */
function assertConfigForCheckout(cfg: PayPalConfig, currency: CurrencyCode, tier: SubscriptionTier) {
  const missing: string[] = [];
  if (!cfg.clientId) missing.push(cfg.mode === "sandbox" ? "PAYPAL_SANDBOX_CLIENT_ID" : "PAYPAL_CLIENT_ID");
  if (!cfg.clientSecret) missing.push(cfg.mode === "sandbox" ? "PAYPAL_SANDBOX_CLIENT_SECRET" : "PAYPAL_CLIENT_SECRET");
  const plan = cfg.plans[tier][currency];
  const planVar =
    cfg.mode === "sandbox"
      ? currency === "EUR" ? "PAYPAL_PLAN_ID_SANDBOX" : "PAYPAL_PLAN_ID_USD_SANDBOX"
      : `PLAN_IDS_LIVE.${tier}.${currency}`;
  if (!plan) missing.push(planVar);
  if (missing.length) {
    throw new Error(
      `PayPal ${cfg.mode.toUpperCase()} not configured: missing ${missing.join(", ")}`,
    );
  }
  if (!isPlanIdShape(plan)) {
    throw new Error(
      `PayPal ${cfg.mode.toUpperCase()} ${planVar} has invalid shape (got "${plan}"). Expected P- followed by alphanumerics.`,
    );
  }
}

export const getPayPalBase = () => getPayPalServerConfig().base;

export type SubscriptionDetails = {
  status: string;
  paypal_subscription_id: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  tier: SubscriptionTier;
} | null;

export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SubscriptionDetails> => {
    const { data } = await context.supabase
      .from("subscriptions")
      .select("status, paypal_subscription_id, current_period_end, cancelled_at, tier")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!data) return null;
    return {
      status: data.status,
      paypal_subscription_id: data.paypal_subscription_id,
      current_period_end: data.current_period_end,
      cancelled_at: data.cancelled_at,
      tier: (data.tier === "standard" ? "standard" : "ultimate") as SubscriptionTier,
    };
  });

export const getPayPalConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const cfg = getPayPalServerConfig();
    return {
      clientId: cfg.clientId,
      plans: cfg.plans,
      environment: cfg.mode,
    };
  });

export const createPayPalSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { currencyCode: CurrencyCode; tier: SubscriptionTier }) => {
    if (d?.currencyCode !== "EUR" && d?.currencyCode !== "USD") {
      throw new Error("currencyCode required");
    }
    if (d?.tier !== "standard" && d?.tier !== "ultimate") {
      throw new Error("tier required");
    }
    return d;
  })
  .handler(async ({ data, context }) => {
    const cfg = getPayPalServerConfig();
    assertConfigForCheckout(cfg, data.currencyCode, data.tier);
    const { clientId, clientSecret: secret, base } = cfg;
    const planId = cfg.plans[data.tier][data.currencyCode];

    const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${clientId}:${secret}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string; error_description?: string };
    if (!tokenRes.ok || !tokenJson.access_token) {
      console.error("[createPayPalSubscription] PayPal token failed", tokenRes.status, tokenJson);
      throw new Error(
        `PayPal auth failed (${tokenRes.status}): ${tokenJson.error || ""} ${tokenJson.error_description || ""}`.trim(),
      );
    }

    const subRes = await fetch(`${base}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": crypto.randomUUID(),
      },
      body: JSON.stringify({
        plan_id: planId,
        custom_id: `${context.userId}|${data.tier}`,
        application_context: { shipping_preference: "NO_SHIPPING" },
      }),
    });
    const subJson = (await subRes.json()) as {
      id?: string;
      message?: string;
      name?: string;
      debug_id?: string;
      details?: Array<{ issue?: string; description?: string; field?: string }>;
    };
    if (!subRes.ok || !subJson.id) {
      console.error(
        "[createPayPalSubscription] PayPal create failed",
        subRes.status,
        JSON.stringify(subJson),
        "plan:",
        planId,
        "env:",
        cfg.mode,
      );
      const issueStr = (subJson.details ?? [])
        .map((d) => [d.issue, d.description, d.field].filter(Boolean).join(": "))
        .join(" | ");
      throw new Error(
        `PayPal ${subRes.status} ${subJson.name || ""}: ${subJson.message || "subscription create failed"}${
          issueStr ? ` [${issueStr}]` : ""
        }${subJson.debug_id ? ` (debug_id=${subJson.debug_id})` : ""} plan=${planId}`,
      );
    }
    return { subscriptionId: subJson.id, tier: data.tier };
  });

export const recordSubscriptionApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { subscriptionId: string; tier?: SubscriptionTier }) => {
    if (!d?.subscriptionId || typeof d.subscriptionId !== "string") {
      throw new Error("subscriptionId required");
    }
    if (d.tier && d.tier !== "standard" && d.tier !== "ultimate") {
      throw new Error("bad tier");
    }
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const cfg = getPayPalServerConfig();
    const { clientId, clientSecret: secret, base } = cfg;

    const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${clientId}:${secret}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    if (!tokenJson.access_token) throw new Error("PayPal auth failed");

    const subRes = await fetch(`${base}/v1/billing/subscriptions/${data.subscriptionId}`, {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    if (!subRes.ok) throw new Error("PayPal subscription lookup failed");
    const sub = (await subRes.json()) as {
      status?: string;
      custom_id?: string;
      billing_info?: { next_billing_time?: string };
      plan_id?: string;
    };

    // custom_id is "<userId>" (legacy) or "<userId>|<tier>".
    const customUid = (sub.custom_id ?? "").split("|")[0];
    if (customUid !== context.userId) {
      throw new Error("Subscription does not belong to this user");
    }

    // Resolve tier: explicit param > custom_id suffix > plan_id lookup > "ultimate".
    let tier: SubscriptionTier = data.tier ?? "ultimate";
    const customTier = (sub.custom_id ?? "").split("|")[1];
    if (!data.tier && (customTier === "standard" || customTier === "ultimate")) {
      tier = customTier;
    }
    if (!data.tier && !customTier && sub.plan_id) {
      for (const t of ["standard", "ultimate"] as SubscriptionTier[]) {
        if (sub.plan_id === cfg.plans[t].EUR || sub.plan_id === cfg.plans[t].USD) {
          tier = t;
          break;
        }
      }
    }

    const status =
      sub.status === "ACTIVE" ? "active" : sub.status === "APPROVED" ? "active" : "pending";
    const periodEnd = sub.billing_info?.next_billing_time ?? null;

    const { error } = await supabaseAdmin
      .from("subscriptions")
      .upsert(
        {
          user_id: context.userId,
          paypal_subscription_id: data.subscriptionId,
          status,
          current_period_end: periodEnd,
          tier,
          cancelled_at: null,
        },
        { onConflict: "user_id" },
      );
    if (error) throw error;
    return { status, tier };
  });

export const cancelMySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("paypal_subscription_id, status")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!sub?.paypal_subscription_id) throw new Error("Kein aktives Abo gefunden");
    if (sub.status === "cancelled") return { status: "cancelled" as const };

    // DEV-aktivierte Abos haben keine echte PayPal-Subscription — lokal abschließen.
    if (sub.paypal_subscription_id.startsWith("DEV-")) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("subscriptions")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("user_id", context.userId);
      return { status: "cancelled" as const };
    }

    const cfg = getPayPalServerConfig();
    const { clientId, clientSecret: secret, base } = cfg;

    const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${clientId}:${secret}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };
    if (!tokenRes.ok || !tokenJson.access_token) {
      console.error("[cancelMySubscription] PayPal auth failed", tokenRes.status, tokenJson);
      throw new Error(
        `PayPal-Auth fehlgeschlagen (${tokenRes.status}): ${tokenJson.error || ""} ${tokenJson.error_description || ""}`.trim(),
      );
    }

    const cancelRes = await fetch(
      `${base}/v1/billing/subscriptions/${sub.paypal_subscription_id}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenJson.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: "User requested cancellation" }),
      },
    );
    // 204 = OK; 404 = sub bei PayPal unbekannt (z. B. Test-/alte Sandbox-ID) → lokal abschließen;
    // 422 = bereits gekündigt → als Erfolg behandeln.
    if (!cancelRes.ok && cancelRes.status !== 422 && cancelRes.status !== 404) {
      const body = await cancelRes.text().catch(() => "");
      console.error(
        "[cancelMySubscription] PayPal cancel failed",
        cancelRes.status,
        body,
        "sub:",
        sub.paypal_subscription_id,
        "env:",
        cfg.mode,
      );
      throw new Error(
        `Kündigung bei PayPal fehlgeschlagen (${cancelRes.status})${body ? `: ${body.slice(0, 300)}` : ""}`,
      );
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("subscriptions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("user_id", context.userId);

    return { status: "cancelled" as const };
  });

// DEV ONLY — simulates a successful PayPal subscription without calling PayPal.
// Activates the current user as Premium for 30 days. Remove before production launch.
export const devActivateSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tier?: SubscriptionTier } | undefined) => {
    const tier = d?.tier === "standard" ? "standard" : "ultimate";
    return { tier } as { tier: SubscriptionTier };
  })
  .handler(async ({ data, context }) => {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DEV activation disabled in production");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabaseAdmin
      .from("subscriptions")
      .upsert(
        {
          user_id: context.userId,
          paypal_subscription_id: `DEV-${context.userId.slice(0, 8)}-${Date.now()}`,
          status: "active",
          current_period_end: periodEnd,
          cancelled_at: null,
          tier: data.tier,
        },
        { onConflict: "user_id" },
      );
    if (error) throw error;
    return { status: "active" as const, current_period_end: periodEnd, tier: data.tier };
  });
