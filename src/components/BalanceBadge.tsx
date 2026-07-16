import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { getMyBalance, createTopupOrder, captureTopupOrder } from "@/lib/balance.functions";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window { paypal?: any }
}

let orderSdkLoader: Promise<void> | null = null;
async function loadOrderSdk(clientId: string) {
  if (typeof window === "undefined") return;
  if (window.paypal && (window as any).__paypal_intent === "capture") return;
  if (orderSdkLoader) return orderSdkLoader;
  orderSdkLoader = new Promise<void>((resolve, reject) => {
    document.querySelectorAll<HTMLScriptElement>("script[data-paypal-capture]").forEach((el) => el.remove());
    try { delete (window as any).paypal; } catch { /* noop */ }
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=EUR&intent=capture&components=buttons&locale=de_DE`;
    s.async = true;
    s.dataset.paypalCapture = "1";
    s.onload = () => { (window as any).__paypal_intent = "capture"; resolve(); };
    s.onerror = () => { orderSdkLoader = null; reject(new Error("PayPal SDK failed to load")); };
    document.head.appendChild(s);
  });
  return orderSdkLoader;
}

export function BalanceBadge() {
  const { lang } = useI18n();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => { if (mounted) setSignedIn(!!data.user); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      if (mounted) setSignedIn(!!sess?.user);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const balanceFn = useServerFn(getMyBalance);
  const q = useQuery({
    queryKey: ["my-balance"],
    queryFn: () => balanceFn(),
    enabled: !!signedIn,
    staleTime: 15_000,
  });

  if (!signedIn) return null;

  const euro = ((q.data?.cents ?? 0) / 100).toFixed(2).replace(".", lang === "en" ? "." : ",");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-background/70 backdrop-blur px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/60 transition-colors"
        title={lang === "en" ? "Universal balance" : "Universalguthaben"}
      >
        <Wallet className="h-3.5 w-3.5 text-accent" />
        <span className="tabular-nums">
          {q.isLoading ? "…" : lang === "en" ? `€${euro}` : `${euro} €`}
        </span>
      </button>

      <TopupDialog
        open={open}
        onOpenChange={setOpen}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["my-balance"] })}
      />
    </>
  );
}

function TopupDialog({
  open, onOpenChange, onSuccess,
}: { open: boolean; onOpenChange: (v: boolean) => void; onSuccess: () => void }) {
  const { lang } = useI18n();
  const btnRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const createOrder = useServerFn(createTopupOrder);
  const captureOrder = useServerFn(captureTopupOrder);

  useEffect(() => {
    if (!open) { setDone(false); setError(null); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const cfgFn = (await import("@/lib/paywall.functions")).getPayPalConfig;
        const cfg = await cfgFn();
        if (cancelled) return;
        if (!cfg.clientId) { setError("PayPal ist nicht konfiguriert."); setLoading(false); return; }
        await loadOrderSdk(cfg.clientId);
        if (cancelled) return;
        if (!btnRef.current) { setLoading(false); return; }
        btnRef.current.innerHTML = "";
        window.paypal.Buttons({
          style: { layout: "vertical", color: "gold", shape: "pill", label: "pay" },
          createOrder: async () => {
            try {
              const r = await createOrder();
              return r.orderId;
            } catch (e: any) {
              toast.error(e?.message ?? "Fehler");
              throw e;
            }
          },
          onApprove: async (data: { orderID: string }) => {
            try {
              await captureOrder({ data: { orderId: data.orderID } });
              toast.success(lang === "en" ? "5,00 € added to balance." : "5,00 € auf Guthaben gebucht.");
              setDone(true);
              onSuccess();
            } catch (e: any) {
              toast.error(e?.message ?? "Fehler bei der Zahlung");
            }
          },
          onError: (err: any) => {
            console.error("[topup] onError", err);
            toast.error(err?.message ?? "PayPal-Fehler");
          },
        }).render(btnRef.current);
        setLoading(false);
      } catch (e: any) {
        if (!cancelled) { setError(e?.message ?? "Fehler"); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [open, createOrder, captureOrder, onSuccess, lang]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle>
            {lang === "en" ? "Top up Universal balance" : "Universalguthaben aufladen"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {lang === "en"
              ? "Add 5,00 € once. Balance is used automatically after your monthly inclusive quota."
              : "Einmalig 5,00 € aufladen. Wird automatisch verwendet, sobald dein monatliches Inklusiv-Kontingent verbraucht ist."}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl bg-secondary/40 p-3 text-xs text-muted-foreground space-y-1">
          <div>• {lang === "en" ? "Voice: 0,20 € / min (billed per second)" : "Live-Sprache: 0,20 € / Min. (sekundengenau)"}</div>
          <div>• {lang === "en" ? "Image: 0,03 € per image" : "Bildgenerierung: 0,03 € pro Bild"}</div>
          <div>• {lang === "en" ? "Video: 0,40 € per clip" : "Videoclip: 0,40 € pro Clip"}</div>
        </div>

        <div className="min-h-[120px] flex items-center justify-center pt-2">
          {done ? (
            <div className="text-sm text-accent font-medium">
              {lang === "en" ? "Payment received — balance updated." : "Zahlung erhalten — Guthaben gutgeschrieben."}
            </div>
          ) : error ? (
            <div className="text-sm text-destructive text-center">{error}</div>
          ) : (
            <div className="w-full relative">
              <div ref={btnRef} className="w-full min-h-[45px]" />
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
