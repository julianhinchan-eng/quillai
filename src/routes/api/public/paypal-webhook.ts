import { createFileRoute } from "@tanstack/react-router";
import { getPayPalServerConfig } from "@/lib/paywall.functions";

async function getAccessToken() {
  const cfg = getPayPalServerConfig();
  const res = await fetch(`${cfg.base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${cfg.clientId}:${cfg.clientSecret}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const j = (await res.json()) as { access_token?: string };
  if (!j.access_token) throw new Error(`PayPal ${cfg.mode} token failed`);
  return j.access_token;
}

async function verifySignature(headers: Headers, rawBody: string) {
  const cfg = getPayPalServerConfig();
  const webhookId = cfg.webhookId;
  if (!webhookId) return false;
  const token = await getAccessToken();
  const payload = {
    auth_algo: headers.get("paypal-auth-algo"),
    cert_url: headers.get("paypal-cert-url"),
    transmission_id: headers.get("paypal-transmission-id"),
    transmission_sig: headers.get("paypal-transmission-sig"),
    transmission_time: headers.get("paypal-transmission-time"),
    webhook_id: webhookId,
    webhook_event: JSON.parse(rawBody),
  };
  const res = await fetch(`${cfg.base}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const j = (await res.json()) as { verification_status?: string };
  return j.verification_status === "SUCCESS";
}

async function lookupSubscription(subId: string) {
  const cfg = getPayPalServerConfig();
  const token = await getAccessToken();
  const res = await fetch(`${cfg.base}/v1/billing/subscriptions/${subId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as {
    status?: string;
    billing_info?: { next_billing_time?: string };
    custom_id?: string;
  };
}

export const Route = createFileRoute("/api/public/paypal-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const ok = await verifySignature(request.headers, raw);
        if (!ok) return new Response("Invalid signature", { status: 401 });

        const event = JSON.parse(raw) as {
          event_type?: string;
          resource?: { id?: string; billing_agreement_id?: string };
        };

        const subId =
          event.resource?.id ?? event.resource?.billing_agreement_id ?? null;
        if (!subId) return new Response("ok");

        const sub = await lookupSubscription(subId);
        if (!sub) return new Response("ok");

        let status: string | null = null;
        let cancelledAt: string | null = null;
        switch (event.event_type) {
          case "BILLING.SUBSCRIPTION.ACTIVATED":
          case "PAYMENT.SALE.COMPLETED":
          case "BILLING.SUBSCRIPTION.UPDATED":
            status = "active";
            break;
          case "BILLING.SUBSCRIPTION.CANCELLED":
          case "BILLING.SUBSCRIPTION.EXPIRED":
            status = "cancelled";
            cancelledAt = new Date().toISOString();
            break;
          case "BILLING.SUBSCRIPTION.SUSPENDED":
          case "PAYMENT.SALE.DENIED":
            status = "suspended";
            break;
        }
        if (!status) return new Response("ok");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const patch: {
          status: string;
          current_period_end?: string | null;
          cancelled_at?: string | null;
        } = { status };
        if (sub.billing_info?.next_billing_time) {
          patch.current_period_end = sub.billing_info.next_billing_time;
        }
        if (cancelledAt) patch.cancelled_at = cancelledAt;

        await supabaseAdmin
          .from("subscriptions")
          .update(patch)
          .eq("paypal_subscription_id", subId);

        return new Response("ok");
      },
      GET: async () => new Response("ok"),
    },
  },
});
