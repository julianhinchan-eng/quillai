import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LustifyPack = "small" | "medium" | "large";

export const LUSTIFY_PACKS: Record<
  LustifyPack,
  { amountEur: number; creditCents: number; label: string; bonus?: string }
> = {
  small: { amountEur: 5, creditCents: 500, label: "5 €" },
  medium: { amountEur: 10, creditCents: 1050, label: "10 €", bonus: "+5 % Bonus" },
  large: { amountEur: 25, creditCents: 2750, label: "25 €", bonus: "+10 % Bonus" },
};

export const getMyLustifyBalance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ cents: number }> => {
    const { data, error } = await context.supabase.rpc("get_my_lustify_balance");
    if (error) throw new Error(error.message);
    return { cents: (data as number) ?? 0 };
  });

export const createLustifyTopupCharge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { pack: LustifyPack }) => {
    if (!d || !LUSTIFY_PACKS[d.pack]) throw new Error("invalid pack");
    return { pack: d.pack };
  })
  .handler(async ({ data, context }): Promise<{ hostedUrl: string; code: string }> => {
    const key = process.env.NOWPAYMENTS_API_KEY;
    if (!key) throw new Error("NOWPayments not configured");
    const pack = LUSTIFY_PACKS[data.pack];

    // order_id encodes user + credit atomically; parsed in the IPN webhook.
    const nonce = Math.random().toString(36).slice(2, 10);
    const orderId = `lustify:${context.userId}:${pack.creditCents}:${nonce}`;

    const origin = "https://steady-circle.lovable.app";
    const res = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
      },
      body: JSON.stringify({
        price_amount: pack.amountEur,
        price_currency: "EUR",
        order_id: orderId,
        order_description: `Lustify V8 – ${pack.label} (${(pack.creditCents / 100).toFixed(2)} € Bildbudget)`,
        ipn_callback_url: `${origin}/api/public/nowpayments-webhook`,
        success_url: `${origin}/ai-chat?lustify=success`,
        cancel_url: `${origin}/ai-chat?lustify=cancel`,
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("[nowpayments] create invoice error", res.status, t);
      throw new Error(`NOWPayments: ${res.status}`);
    }
    const j = (await res.json()) as {
      id?: string | number;
      invoice_url?: string;
      order_id?: string;
    };
    if (!j.invoice_url || !j.id) throw new Error("NOWPayments: bad response");
    return { hostedUrl: j.invoice_url, code: String(j.id) };
  });