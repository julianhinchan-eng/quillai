import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPayPalServerConfig } from "@/lib/paywall.functions";

async function cancelPayPalSubscription(subscriptionId: string): Promise<void> {
  const { clientId, clientSecret: secret, base, mode } = getPayPalServerConfig();

  const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${clientId}:${secret}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) throw new Error(`PayPal ${mode} auth failed`);

  const cancelRes = await fetch(
    `${base}/v1/billing/subscriptions/${subscriptionId}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason: "Account deleted by user" }),
    },
  );
  // 204 = success, 422 = already cancelled (treat as success)
  if (!cancelRes.ok && cancelRes.status !== 422) {
    const body = await cancelRes.text().catch(() => "");
    throw new Error(`PayPal cancel failed (${cancelRes.status}): ${body}`);
  }
}

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Try to cancel active PayPal subscription first
    let paypalCancelled = false;
    let paypalError: string | null = null;
    let hadSubscription = false;

    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("paypal_subscription_id, status")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (sub?.paypal_subscription_id && sub.status !== "cancelled") {
      hadSubscription = true;
      try {
        await cancelPayPalSubscription(sub.paypal_subscription_id);
        paypalCancelled = true;
        await supabaseAdmin
          .from("subscriptions")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
          .eq("user_id", context.userId);
      } catch (err) {
        paypalError = err instanceof Error ? err.message : String(err);
        console.error("[deleteMyAccount] PayPal cancel failed", paypalError);
      }
    }

    // 2) Delete the user — cascades to all related public tables
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Error(error.message);

    return { ok: true, hadSubscription, paypalCancelled, paypalError };
  });
