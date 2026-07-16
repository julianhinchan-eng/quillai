import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery token from the URL hash and emits a
    // PASSWORD_RECOVERY event with a temporary session.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 4) {
      toast.error("Min. 4");
      return;
    }
    if (password !== confirm) {
      toast.error(t("auth.password_mismatch"));
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("auth.password_updated"));
    navigate({ to: "/ai-chat", replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-2">
          <LanguageSwitcher />
        </div>
        <div className="text-center mb-8">
          <Link to="/" className="inline-block text-2xl font-semibold tracking-tight">quillai.online</Link>
          <p className="text-sm text-muted-foreground mt-2">{t("auth.reset_title")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-card rounded-2xl border p-6 shadow-[var(--shadow-card)]">
          {!ready ? (
            <p className="text-sm text-muted-foreground">{t("auth.invalid_reset_link")}</p>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="new_password">{t("auth.new_password")}</Label>
                <Input id="new_password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm_password">{t("auth.confirm_password")}</Label>
                <Input id="confirm_password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
              </div>
              <Button type="submit" disabled={saving} className="w-full rounded-full" size="lg">
                {saving ? t("common.loading") : t("auth.save_password")}
              </Button>
            </>
          )}
          <p className="text-center text-sm text-muted-foreground pt-2">
            <Link to="/auth" className="text-foreground font-medium hover:underline">{t("auth.reset_back")}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
