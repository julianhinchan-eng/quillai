import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Crown, Sparkles, X as XIcon, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import {
  createPayPalSubscription,
  devActivateSubscription,
  getPayPalConfig,
  recordSubscriptionApproval,
  type SubscriptionTier,
} from "@/lib/paywall.functions";

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
    document.querySelectorAll<HTMLScriptElement>("script[data-paypal-sdk]").forEach((el) => el.remove());
    try { delete (window as any).paypal; } catch { /* ignore */ }
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&vault=true&intent=subscription&currency=${encodeURIComponent(currency)}&locale=${encodeURIComponent(locale)}`;
    s.async = true;
    s.dataset.sdkIntegrationSource = "button-factory";
    s.dataset.paypalSdk = "1";
    s.onload = () => { activeSdkKey = key; resolve(); };
    s.onerror = () => { sdkLoaders.delete(key); reject(new Error("PayPal SDK konnte nicht geladen werden")); };
    document.head.appendChild(s);
  });
  sdkLoaders.set(key, p);
  return p;
}

export function InlinePlanSelector({
  onSuccess,
  currentTier,
}: {
  onSuccess: () => void;
  currentTier?: SubscriptionTier | null;
}) {
  const standardRef = useRef<HTMLDivElement>(null);
  const ultimateRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<"sandbox" | "live">("live");
  const [devLoading, setDevLoading] = useState(false);
  const fetchConfig = useServerFn(getPayPalConfig);
  const createSubscription = useServerFn(createPayPalSubscription);
  const recordApproval = useServerFn(recordSubscriptionApproval);
  const devActivate = useServerFn(devActivateSubscription);
  const { t, lang } = useI18n();
  const ppLocale = lang === "en" ? "en_US" : "de_DE";
  const ppCurrency = lang === "en" ? "USD" : "EUR";
  const isDev = import.meta.env.DEV;

  useEffect(() => {
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

        const renderTier = (el: HTMLDivElement | null, tier: SubscriptionTier) => {
          if (!el) return;
          el.innerHTML = "";
          if (currentTier === tier) return; // hide button for current tier
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
                  const res = await recordApproval({ data: { subscriptionId: data.subscriptionID, tier } });
                  if (res.status === "active") toast.success(t("paywall.toast_active"));
                  else toast.success(t("paywall.toast_pending"));
                  onSuccess();
                } catch (e: any) {
                  toast.error(e.message ?? t("paywall.toast_failed"));
                }
              },
              onError: (err: any) => {
                console.error("[InlinePlanSelector] onError", tier, err);
                toast.error(err?.message ?? t("paywall.toast_error"));
              },
            })
            .render(el);
        };

        renderTier(standardRef.current, "standard");
        renderTier(ultimateRef.current, "ultimate");
        setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message ?? t("paywall.unknown_error"));
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [fetchConfig, createSubscription, recordApproval, onSuccess, ppLocale, ppCurrency, t, currentTier]);

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
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center border border-accent/30">
          <Sparkles className="h-4 w-4 text-accent" />
        </div>
        <div>
          <h3 className="text-sm font-semibold tracking-tight">
            {currentTier
              ? (lang === "en" ? "Switch plan" : "Tarif wechseln")
              : (lang === "en" ? "Choose your plan" : "Wähle deinen Tarif")}
          </h3>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            {lang === "en" ? "// quillai_plans" : "// quillai_tarife"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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
          current={currentTier === "standard"}
        />
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
          current={currentTier === "ultimate"}
        />
      </div>

      {error && <div className="text-sm text-destructive text-center py-2">{error}</div>}
      {loading && !error && (
        <div className="text-sm text-muted-foreground text-center pt-2">{t("paywall.loading_paypal")}</div>
      )}
      {isDev && (
        <div className="mt-3 border-t border-dashed border-amber-400/40 pt-3 grid grid-cols-2 gap-2">
          {(["standard", "ultimate"] as SubscriptionTier[]).map((tt) => (
            <Button
              key={tt}
              type="button"
              variant="outline"
              size="sm"
              disabled={devLoading || currentTier === tt}
              onClick={async () => {
                setDevLoading(true);
                try {
                  await devActivate({ data: { tier: tt } });
                  toast.success(`DEV: ${tt === "standard" ? "Standard" : "Ultimate"} aktiviert`);
                  onSuccess();
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
      <p className="text-[11px] text-muted-foreground text-center pt-3">
        {environment === "sandbox" ? t("paywall.footer_note_sandbox") : t("paywall.footer_note_live")}
      </p>
    </div>
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
  current,
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
  current?: boolean;
}) {
  return (
    <div
      className={`relative rounded-xl border bg-card text-card-foreground p-5 ${
        highlighted ? "border-accent/60 shadow-[0_0_0_1px_oklch(0.7_0.18_220/0.25)]" : "border-border/70"
      } ${current ? "ring-2 ring-emerald-500/50" : ""}`}
    >
      <span className="pointer-events-none absolute -top-px -left-px h-2.5 w-2.5 border-t border-l border-accent/60" />
      <span className="pointer-events-none absolute -top-px -right-px h-2.5 w-2.5 border-t border-r border-accent/60" />
      <span className="pointer-events-none absolute -bottom-px -left-px h-2.5 w-2.5 border-b border-l border-accent/60" />
      <span className="pointer-events-none absolute -bottom-px -right-px h-2.5 w-2.5 border-b border-r border-accent/60" />

      {current ? (
        <span className="absolute -top-2 right-4 text-[9px] tracking-[0.25em] px-2 py-0.5 rounded-full bg-emerald-500 text-white">
          AKTIV
        </span>
      ) : badge ? (
        <span className="absolute -top-2 right-4 text-[9px] tracking-[0.25em] px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
          {badge}
        </span>
      ) : null}

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

      {current ? (
        <div className="mt-4 text-center text-xs text-emerald-600 dark:text-emerald-400 font-medium py-2 rounded-full border border-emerald-500/30 bg-emerald-500/5">
          ✓ Dein aktueller Tarif
        </div>
      ) : (
        <div ref={buttonContainerRef} className="min-h-[50px] mt-4" />
      )}
    </div>
  );
}