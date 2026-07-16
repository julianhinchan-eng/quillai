import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { deleteMyAccount } from "@/lib/account.functions";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hasActiveSub, setHasActiveSub] = useState(false);
  const deleteAccountFn = useServerFn(deleteMyAccount);

  async function openDeleteDialog() {
    setDeleteConfirmed(false);
    // Check for active subscription to swap the warning text
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status, paypal_subscription_id")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      setHasActiveSub(!!sub?.paypal_subscription_id && sub.status !== "cancelled");
    } else {
      setHasActiveSub(false);
    }
    setDeleteOpen(true);
  }

  async function handleDeleteAccount() {
    if (!deleteConfirmed) return;
    setDeleting(true);
    try {
      const res = await deleteAccountFn();
      await supabase.auth.signOut();
      if (res?.hadSubscription && !res.paypalCancelled) {
        toast.warning(t("settings.delete_paypal_check"));
      } else {
        toast.success(t("settings.delete_success"));
      }
      navigate({ to: "/", replace: true });
    } catch (e: any) {
      toast.error(e?.message ?? t("settings.delete_failed"));
      setDeleting(false);
    }
  }


  return (
    <AppShell>
      <div className="max-w-xl mx-auto pb-24 md:pb-6 space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("settings.title")}</h1>

        <SubscriptionCard />

        <div className="rounded-2xl border bg-card p-6 space-y-3">
          <h2 className="text-lg font-semibold">{t("settings.legal_title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("settings.legal_note")}{" "}
            <Link to="/terms" className="underline hover:text-foreground">
              {t("settings.terms_link")}
            </Link>
          </p>
        </div>

        <div className="rounded-2xl border-2 border-destructive/50 bg-destructive/5 p-6 space-y-3">
          <h2 className="text-lg font-semibold text-destructive">{t("settings.danger_zone")}</h2>
          <p className="text-sm text-muted-foreground">{t("settings.delete_account_desc")}</p>
          <Button variant="destructive" onClick={openDeleteDialog}>
            {t("settings.delete_account_btn")}
          </Button>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={(o) => { setDeleteOpen(o); if (!o) setDeleteConfirmed(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">{t("settings.delete_confirm_title")}</DialogTitle>
            <DialogDescription>{t("settings.delete_confirm_text")}</DialogDescription>
          </DialogHeader>
          {hasActiveSub && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
              {t("settings.delete_confirm_paypal_auto")}
            </div>
          )}
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <Checkbox checked={deleteConfirmed} onCheckedChange={(v) => setDeleteConfirmed(v === true)} className="mt-0.5" />
            <span>{t("settings.delete_confirm_check")}</span>
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>{t("settings.cancel")}</Button>
            <Button variant="destructive" disabled={!deleteConfirmed || deleting} onClick={handleDeleteAccount}>
              {deleting ? "..." : t("settings.delete_confirm_btn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
