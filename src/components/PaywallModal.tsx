import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Check, Sparkles, Zap, Crown, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { createPayPalSubscription, getPayPalConfig, recordSubscriptionApproval, devActivateSubscription, type SubscriptionTier } from "@/lib/paywall.functions";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

declare global {
  interface Window {
    paypal?: any;
  }
}

const sdkLoaders = new Map<string, Promise<void>>();
let activeSdkKey: string | null = null;
function loadPayPalSdk(clientId: string, locale: string, currency: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const key = `${clientId}|${locale}|${currency}`;
  const existing = sdkLoaders.get(key);
  if (existing && activeSdkKey === key && window.paypal) return existing;
  if (existing) sdkLoaders.delete(key);
  const p = new Promise<void>((resolve, reject) => {
    // Remove any previously injected PayPal SDK so the new locale/currency takes effect
    document.querySelectorAll<HTMLScriptElement>("script[data-paypal-sdk]").forEach((el) => el.remove());
    try { delete (window as any).paypal; } catch { /* ignore */ }

    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&vault=true&intent=subscription&currency=${encodeURIComponent(currency)}&locale=${encodeURIComponent(locale)}`;
    s.async = true;
    s.dataset.sdkIntegrationSource = "button-factory";
    s.dataset.paypalSdk = "1";
    s.onload = () => {
      activeSdkKey = key;
      resolve();
    };
    s.onerror = () => {
      sdkLoaders.delete(key);
      reject(new Error("PayPal SDK konnte nicht geladen werden"));
    };
    document.head.appendChild(s);
  });
  sdkLoaders.set(key, p);
  return p;
}

export type PaywallVariant = "default" | "video" | "save";

export function PaywallModal({
  open,
  onOpenChange,
  onSuccess,
  title,
  description,
  forceTier,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
  variant?: PaywallVariant;
  title?: string;
  description?: React.ReactNode;
  /** When set, only this tier is shown (e.g. upgrade-to-Ultimate flow). */
  forceTier?: SubscriptionTier;
}) {
  const standardRef = useRef<HTMLDivElement>(null);
  const ultimateRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<"sandbox" | "live">("live");
  const fetchConfig = useServerFn(getPayPalConfig);
  const createSubscription = useServerFn(createPayPalSubscription);
  const recordApproval = useServerFn(recordSubscriptionApproval);
  const devActivate = useServerFn(devActivateSubscription);
  const [devLoading, setDevLoading] = useState(false);
  const { t, lang } = useI18n();
  const ppLocale = lang === "en" ? "en_US" : "de_DE";
  const ppCurrency = lang === "en" ? "USD" : "EUR";
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setLoading(true);

    (async () => {
      try {
        const cfg = await fetchConfig();
        if (cancelled) return;
        setEnvironment(cfg.environment);
        if (!cfg.clientId) {
          setError(t("paywall.config_incomplete"));
          setLoading(false);
          return;
        }
        await loadPayPalSdk(cfg.clientId, ppLocale, ppCurrency);
        if (cancelled) return;

        const renderTier = (
          el: HTMLDivElement | null,
          tier: SubscriptionTier,
        ) => {
          if (!el) return;
          el.innerHTML = "";
          window.paypal
            .Buttons({
              style: { layout: "vertical", color: tier === "ultimate" ? "black" : "blue", shape: "pill", label: "subscribe" },
              createSubscription: async () => {
                try {
                  const res = await createSubscription({ data: { currencyCode: ppCurrency, tier } });
                  return res.subscriptionId;
                } catch (err: any) {
                  toast.error(err?.message ?? t("paywall.toast_error"));
                  throw err;
                }
              },
              onApprove: async (data: { subscriptionID: string }) => {
                try {
                  const res = await recordApproval({
                    data: { subscriptionId: data.subscriptionID, tier },
                  });
                  if (res.status === "active") toast.success(t("paywall.toast_active"));
                  else toast.success(t("paywall.toast_pending"));
                  onSuccess();
                  onOpenChange(false);
                } catch (e: any) {
                  toast.error(e.message ?? t("paywall.toast_failed"));
                }
              },
              onError: (err: any) => {
                console.error("[PayPalButtons] onError", tier, err);
                toast.error(err?.message ?? t("paywall.toast_error"));
              },
            })
            .render(el);
        };

        if (!forceTier || forceTier === "standard") renderTier(standardRef.current, "standard");
        if (!forceTier || forceTier === "ultimate") renderTier(ultimateRef.current, "ultimate");
        setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message ?? t("paywall.unknown_error"));
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, fetchConfig, createSubscription, recordApproval, onSuccess, onOpenChange, ppLocale, ppCurrency, t, forceTier]);

  const standardPrice = lang === "en" ? "$3.90" : "3,90\u00A0€";
  const ultimatePrice = lang === "en" ? "$10.00" : "10,00\u00A0€";
  const perMonth = lang === "en" ? "per month" : "im Monat";

  const standardFeatures = [
    { ok: true, text: lang === "en" ? "Unlimited text chat" : "Unbegrenzter Text-Chat" },
    { ok: true, text: lang === "en" ? "All expert modes" : "Alle Experten-Modi" },
    { ok: true, text: lang === "en" ? "Document & image analysis" : "Dokumenten- & Bildanalyse" },
    { ok: true, text: lang === "en" ? "500 AI images per month" : "500 KI-Bilder im Monat" },
    { ok: false, text: lang === "en" ? "No AI video generation" : "Keine KI-Videogenerierung" },
  ];
  const ultimateFeatures = [
    { ok: true, text: lang === "en" ? "Unlimited text chat" : "Unbegrenzter Text-Chat" },
    { ok: true, text: lang === "en" ? "All expert modes" : "Alle Experten-Modi" },
    { ok: true, text: lang === "en" ? "Document & image analysis" : "Dokumenten- & Bildanalyse" },
    { ok: true, text: lang === "en" ? "900 AI images per month" : "900 KI-Bilder im Monat" },
    { ok: true, text: lang === "en" ? "15 Runway AI videos per month" : "15 Runway KI-Videos im Monat" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={forceTier ? "sm:max-w-md" : "sm:max-w-3xl"}>
        <DialogHeader>
          <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center border border-accent/30">
            <Sparkles className="h-6 w-6 text-accent" />
          </div>
          <DialogTitle className="text-center text-xl tracking-tight">
            {title ?? (forceTier === "ultimate"
              ? (lang === "en" ? "Upgrade to Ultimate Video" : "Upgrade auf Ultimate Video")
              : t("paywall.default_title"))}
          </DialogTitle>
          <DialogDescription className="text-center text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            {description ?? (forceTier === "ultimate"
              ? (lang === "en" ? "// video_generation requires ultimate" : "// videogenerierung benötigt ultimate")
              : (lang === "en" ? "// choose_your_plan" : "// wähle deinen tarif"))}
          </DialogDescription>
        </DialogHeader>

        <div className={`grid gap-4 ${forceTier ? "grid-cols-1" : "md:grid-cols-2"}`}>
          {(!forceTier || forceTier === "standard") && (
            <TierCard
              accent="neutral"
              icon={<Zap className="h-5 w-5" />}
              eyebrow={lang === "en" ? "// tier_01" : "// tarif_01"}
              name="Standard Pro"
              tagline={lang === "en" ? "For creatives & casual users" : "Für Kreative & Gelegenheitsnutzer"}
              price={standardPrice}
              per={perMonth}
              features={standardFeatures}
              buttonContainerRef={standardRef}
            />
          )}
          {(!forceTier || forceTier === "ultimate") && (
            <TierCard
              accent="accent"
              highlighted
              icon={<Crown className="h-5 w-5" />}
              eyebrow={lang === "en" ? "// tier_02" : "// tarif_02"}
              name="Ultimate Video"
              tagline={lang === "en" ? "For power users" : "Für Power-User"}
              price={ultimatePrice}
              per={perMonth}
              features={ultimateFeatures}
              buttonContainerRef={ultimateRef}
              badge={lang === "en" ? "RECOMMENDED" : "EMPFOHLEN"}
            />
          )}
        </div>

        {error && <div className="text-sm text-destructive text-center py-2">{error}</div>}
        {loading && !error && (
          <div className="text-sm text-muted-foreground text-center pt-2">{t("paywall.loading_paypal")}</div>
        )}
        {isDev && (
        <div className="mt-2 border-t border-dashed border-amber-400/40 pt-3 grid grid-cols-2 gap-2">
          {(["standard", "ultimate"] as SubscriptionTier[])
            .filter((tt) => !forceTier || tt === forceTier)
            .map((tt) => (
              <Button
                key={tt}
                type="button"
                variant="outline"
                size="sm"
                disabled={devLoading}
                onClick={async () => {
                  setDevLoading(true);
                  try {
                    await devActivate({ data: { tier: tt } });
                    toast.success(`DEV: ${tt === "standard" ? "Standard" : "Ultimate"} aktiviert`);
                    onSuccess();
                    onOpenChange(false);
                  } catch (e: any) {
                    toast.error(e?.message ?? "DEV activation failed");
                  } finally {
                    setDevLoading(false);
                  }
                }}
                className="border-amber-500/60 text-amber-600 hover:bg-amber-500/10"
              >
                🧪 DEV {tt}
              </Button>
            ))}
        </div>
        )}
        <p className="text-[11px] text-muted-foreground text-center pt-2">
          {environment === "sandbox" ? t("paywall.footer_note_sandbox") : t("paywall.footer_note_live")}
        </p>
      </DialogContent>
    </Dialog>
  );
}

function TierCard({
  accent,
  highlighted,
  icon,
  eyebrow,
  name,
  tagline,
  price,
  per,
  features,
  buttonContainerRef,
  badge,
}: {
  accent: "neutral" | "accent";
  highlighted?: boolean;
  icon: React.ReactNode;
  eyebrow: string;
  name: string;
  tagline: string;
  price: string;
  per: string;
  features: Array<{ ok: boolean; text: string }>;
  buttonContainerRef: React.RefObject<HTMLDivElement | null>;
  badge?: string;
}) {
  return (
    <div
      className={`relative rounded-xl border bg-card text-card-foreground p-5 ${
        highlighted ? "border-accent/60 shadow-[0_0_0_1px_oklch(0.7_0.18_220/0.25)]" : "border-border/70"
      }`}
    >
      {/* Corner marks */}
      <span className="pointer-events-none absolute -top-px -left-px h-2.5 w-2.5 border-t border-l border-accent/60" />
      <span className="pointer-events-none absolute -top-px -right-px h-2.5 w-2.5 border-t border-r border-accent/60" />
      <span className="pointer-events-none absolute -bottom-px -left-px h-2.5 w-2.5 border-b border-l border-accent/60" />
      <span className="pointer-events-none absolute -bottom-px -right-px h-2.5 w-2.5 border-b border-r border-accent/60" />

      {badge && (
        <span className="absolute -top-2 right-4 text-[9px] tracking-[0.25em] px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
          {badge}
        </span>
      )}

      <div className="flex items-center justify-between text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3">
        <span>{eyebrow}</span>
        <span
          className={`h-7 w-7 rounded-md flex items-center justify-center border ${
            accent === "accent" ? "bg-accent/10 text-accent border-accent/40" : "bg-secondary text-foreground border-border"
          }`}
        >
          {icon}
        </span>
      </div>
      <h3 className="text-lg font-bold tracking-tight">{name}</h3>
      <p className="text-xs text-muted-foreground mt-0.5">{tagline}</p>

      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-3xl font-semibold tracking-tight">{price}</span>
        <span className="text-xs text-muted-foreground">{per}</span>
      </div>

      <ul className="mt-4 space-y-1.5 text-sm">
        {features.map((f) => (
          <li key={f.text} className="flex items-start gap-2">
            {f.ok ? (
              <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <XIcon className="h-4 w-4 text-muted-foreground/60 shrink-0 mt-0.5" />
            )}
            <span className={f.ok ? "" : "text-muted-foreground/70 line-through"}>{f.text}</span>
          </li>
        ))}
      </ul>

      <div ref={buttonContainerRef} className="min-h-[50px] mt-4" />
    </div>
  );
}
