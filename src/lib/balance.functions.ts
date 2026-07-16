import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPayPalServerConfig } from "@/lib/paywall.functions";

// Universalguthaben pricing constants
export const TOPUP_AMOUNT_EUR = "5.00";
export const TOPUP_AMOUNT_CENTS = 500;
export const IMAGE_COST_CENTS = 3;
export const VIDEO_COST_CENTS = 40;
export const VOICE_CENTS_PER_MINUTE = 20;

async function paypalAccessToken() {
  const cfg = getPayPalServerConfig();
  if (!cfg.clientId || !cfg.clientSecret) throw new Error("PayPal not configured");
  const res = await fetch(`${cfg.base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${cfg.clientId}:${cfg.clientSecret}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const j = (await res.json()) as { access_token?: string };
  if (!j.access_token) throw new Error("PayPal auth failed");
  return { token: j.access_token, base: cfg.base };
}

/** Current signed-in user's Universalguthaben in cents. */
export const getMyBalance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("get_my_balance");
    if (error) throw new Error(error.message);
    const cents = typeof data === "number" ? data : 0;
    return { cents };
  });

/** Create a PayPal Order for a single 5.00 EUR Universalguthaben top-up. */
export const createTopupOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { token, base } = await paypalAccessToken();
    const res = await fetch(`${base}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": crypto.randomUUID(),
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: context.userId,
            description: "QuillAI Universalguthaben (5,00 €)",
            amount: { currency_code: "EUR", value: TOPUP_AMOUNT_EUR },
            custom_id: context.userId,
          },
        ],
        application_context: { shipping_preference: "NO_SHIPPING", user_action: "PAY_NOW" },
      }),
    });
    const j = (await res.json()) as { id?: string; message?: string; debug_id?: string };
    if (!res.ok || !j.id) {
      console.error("[createTopupOrder] failed", res.status, j);
      throw new Error(j.message ?? `PayPal order failed (${res.status})`);
    }
    return { orderId: j.id };
  });

/** Capture the PayPal Order and credit +500 cents to the user's balance (idempotent). */
export const captureTopupOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => {
    if (!d?.orderId || typeof d.orderId !== "string") throw new Error("orderId required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { token, base } = await paypalAccessToken();
    const res = await fetch(`${base}/v2/checkout/orders/${data.orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": crypto.randomUUID(),
      },
    });
    const j = (await res.json()) as {
      id?: string;
      status?: string;
      purchase_units?: Array<{
        custom_id?: string;
        payments?: {
          captures?: Array<{
            id?: string;
            status?: string;
            amount?: { currency_code?: string; value?: string };
          }>;
        };
      }>;
      message?: string;
    };
    // 422 with ORDER_ALREADY_CAPTURED is fine — we still credit idempotently below.
    const alreadyCaptured =
      res.status === 422 && JSON.stringify(j).includes("ORDER_ALREADY_CAPTURED");
    if (!res.ok && !alreadyCaptured) {
      console.error("[captureTopupOrder] failed", res.status, j);
      throw new Error(j.message ?? `PayPal capture failed (${res.status})`);
    }

    const capture = j.purchase_units?.[0]?.payments?.captures?.[0];
    const captureId = capture?.id ?? data.orderId;
    const custom = j.purchase_units?.[0]?.custom_id;
    if (custom && custom !== context.userId) {
      throw new Error("Order does not belong to this user");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: newBal, error } = await supabaseAdmin.rpc("credit_user_balance", {
      _user_id: context.userId,
      _cents: TOPUP_AMOUNT_CENTS,
      _ref: captureId,
    });
    if (error) {
      console.error("[captureTopupOrder] credit failed", error);
      throw new Error(error.message);
    }
    return { balance_cents: typeof newBal === "number" ? newBal : 0 };
  });
