import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Crown, Image as ImageIcon, Video, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import {
  cancelMySubscription,
  getMySubscription,
  type SubscriptionDetails,
} from "@/lib/paywall.functions";
import { getMyPremiumUsage } from "@/lib/ai-chat.functions";
import { InlinePlanSelector } from "@/components/InlinePlanSelector";

export function SubscriptionCard() {
  const { t, lang } = useI18n();
  const [sub, setSub] = useState<SubscriptionDetails>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const fetchSub = useServerFn(getMySubscription);
  const cancelFn = useServerFn(cancelMySubscription);
  const fetchUsage = useServerFn(getMyPremiumUsage);

  const usageQ = useQuery({
    queryKey: ["premium-usage"],
    queryFn: () => fetchUsage(),
    enabled: sub?.status === "active",
    staleTime: 10_000,
  });

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(t("sub.date_locale"), {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  const STATUS_TONE: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    cancelled: "bg-muted text-muted-foreground",
    suspended: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    inactive: "bg-muted text-muted-foreground",
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await fetchSub();
      setSub(s);
    } finally {
      setLoading(false);
    }
  }, [fetchSub]);

  useEffect(() => {
    load();
  }, [load]);

  async function onCancel() {
    setCancelling(true);
    try {
      await cancelFn();
      toast.success(t("sub.cancel_success"));
      await load();
    } catch (e: any) {
      toast.error(e.message ?? t("sub.cancel_failed"));
    } finally {
      setCancelling(false);
    }
  }

  const effectiveStatus = sub?.status ?? "inactive";
  const tone = STATUS_TONE[effectiveStatus] ?? STATUS_TONE.inactive;
  const badgeLabel = t(`sub.status.${effectiveStatus}`);
  const tier = sub?.tier ?? "ultimate";
  const tierName = tier === "standard" ? "Standard Pro" : "Ultimate Video";
  const priceLabel =
    tier === "standard"
      ? (lang === "en" ? "$3.90 per month" : "3,90\u00A0€ im Monat")
      : (lang === "en" ? "$10.00 per month" : "10,00\u00A0€ im Monat");
  const isActive = effectiveStatus === "active";

  return (
    <>
      <div className="bg-card rounded-2xl border p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
              <Crown className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="font-semibold text-base leading-tight">QuillAI <span className="font-bold">{tierName}</span></h2>
              <p className="text-xs text-muted-foreground">{priceLabel}</p>
            </div>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${tone}`}>
            {badgeLabel}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" /> {t("sub.loading")}
          </div>
        ) : (
          <>
            <dl className="text-sm space-y-2 py-3 border-y">
              {sub && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    {effectiveStatus === "cancelled" ? t("sub.expires_on") : t("sub.next_billing")}
                  </dt>
                  <dd className="font-medium">{formatDate(sub.current_period_end)}</dd>
                </div>
              )}
              {sub?.cancelled_at && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("sub.cancelled_on")}</dt>
                  <dd className="font-medium">{formatDate(sub.cancelled_at)}</dd>
                </div>
              )}
            </dl>

            {sub?.status === "active" && usageQ.data && (
              <div className="pt-4 space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                  {t("usage.title")}
                </div>
                <div className={`grid gap-2 ${usageQ.data.videoLimit > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
                  <div className="rounded-lg border bg-secondary/30 p-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <ImageIcon className="h-3 w-3" /> {t("usage.images_remaining")}
                    </div>
                    <div className="text-base font-semibold mt-1">
                      {Math.max(0, usageQ.data.imageLimit - usageQ.data.imagesGenerated)} / {usageQ.data.imageLimit}
                    </div>
                  </div>
                  {usageQ.data.videoLimit > 0 && (
                    <div className="rounded-lg border bg-secondary/30 p-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Video className="h-3 w-3" /> {t("usage.videos_remaining")}
                      </div>
                      <div className="text-base font-semibold mt-1">
                        {Math.max(0, usageQ.data.videoLimit - usageQ.data.videosGenerated)} / {usageQ.data.videoLimit}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">{t("usage.resets_note")}</p>
              </div>
            )}

            <div className="pt-4 flex justify-end gap-2">
              {effectiveStatus === "active" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="rounded-full" disabled={cancelling}>
                      {cancelling ? t("sub.cancelling") : t("sub.cancel")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("sub.cancel_confirm_title")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("sub.cancel_confirm_desc")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("sub.keep")}</AlertDialogCancel>
                      <AlertDialogAction onClick={onCancel}>{t("sub.confirm_cancel")}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </>
        )}
      </div>

      <InlinePlanSelector
        onSuccess={load}
        currentTier={isActive ? tier : null}
      />
    </>
  );
}
