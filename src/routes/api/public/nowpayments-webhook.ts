import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

// Recursively sort object keys so JSON.stringify produces a canonical string
// that matches NOWPayments' signature computation.
function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      out[k] = sortDeep((value as Record<string, unknown>)[k]);
    }
    return out;
  }
  return value;
}

export const Route = createFileRoute("/api/public/nowpayments-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.NOWPAYMENTS_IPN_SECRET;
        if (!secret) return new Response("not configured", { status: 500 });

        const sigHeader = request.headers.get("x-nowpayments-sig") ?? "";
        const raw = await request.text();

        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(raw);
        } catch {
          return new Response("bad json", { status: 400 });
        }

        const canonical = JSON.stringify(sortDeep(parsed));
        const expected = createHmac("sha512", secret).update(canonical).digest("hex");
        const a = Buffer.from(sigHeader);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          console.error("[nowpayments] invalid signature");
          return new Response("invalid signature", { status: 401 });
        }

        const status = String(parsed.payment_status ?? "");
        // Credit only on terminal-success states.
        if (status !== "finished" && status !== "confirmed") {
          return new Response("ignored", { status: 200 });
        }

        const orderId = String(parsed.order_id ?? "");
        const paymentId = String(parsed.payment_id ?? "");
        // Expected shape: lustify:<userId>:<creditCents>:<nonce>
        const parts = orderId.split(":");
        if (parts.length < 3 || parts[0] !== "lustify") {
          console.error("[nowpayments] unexpected order_id", orderId);
          return new Response("bad order", { status: 400 });
        }
        const userId = parts[1];
        const cents = parseInt(parts[2], 10);
        if (!userId || !Number.isFinite(cents) || cents <= 0) {
          return new Response("bad order", { status: 400 });
        }

        const ref = `nowpayments:${paymentId || orderId}`;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.rpc("credit_lustify_balance", {
          _user_id: userId,
          _cents: cents,
          _ref: ref,
        });
        if (error) {
          console.error("[nowpayments] credit rpc error", error);
          return new Response("rpc error", { status: 500 });
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});