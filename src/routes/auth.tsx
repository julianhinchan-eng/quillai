import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { Check } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InstallAppButton } from "@/components/InstallAppButton";
import { useI18n } from "@/lib/i18n";


export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search.mode === "signup" ? "signup" as const : undefined,
  }),
  component: AuthPage,
});

const signUpSchema = z.object({
  email: z.string().trim().email("Ungültige Email"),
  password: z.string().min(4, "Mindestens 4 Zeichen"),
});

const signInSchema = z.object({
  email: z.string().trim().email("Ungültige Email"),
  password: z.string().min(1, "Bitte Passwort eingeben"),
});

function AuthPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(search.mode === "signup" ? "signup" : "signin");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [resetSent, setResetSent] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/ai-chat` },
      });
      if (error) {
        toast.error(error.message ?? "Google Sign-In fehlgeschlagen");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Google Sign-In fehlgeschlagen");
    } finally {
      setGoogleLoading(false);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/ai-chat", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const parsed = signUpSchema.safeParse(form);
        if (!parsed.success) {
          toast.error(parsed.error.errors[0].message);
          return;
        }
        const autoUsername = (parsed.data.email.split("@")[0] || "user")
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "_")
          .slice(0, 20) + Math.floor(Math.random() * 9000 + 1000);
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              username: autoUsername,
              display_name: autoUsername,
            },
          },
        });
        if (error) { toast.error(error.message); return; }
        toast.success(t("auth.welcome"));
        navigate({ to: "/ai-chat", replace: true });
      } else if (mode === "forgot") {
        const email = form.email.trim();
        if (!z.string().email().safeParse(email).success) {
          toast.error(t("auth.email"));
          return;
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) { toast.error(error.message); return; }
        setResetSent(true);
        toast.success(t("auth.reset_sent"));
      } else {
        const parsed = signInSchema.safeParse(form);
        if (!parsed.success) {
          toast.error(parsed.error.errors[0].message);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) { toast.error(error.message); return; }
        navigate({ to: "/ai-chat", replace: true });
      }
    } finally {
      setLoading(false);
    }
  }




  return (
    <div className="min-h-screen bg-background px-4 py-10 md:py-16">
      <div className="w-full max-w-md mx-auto">

        <div className="flex justify-end items-center gap-1 mb-2">
          <InstallAppButton variant="compact" />
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
        <div className="text-center mb-8">
          <Link to="/" className="inline-block text-2xl font-semibold tracking-tight">quill.</Link>
          <p className="text-sm text-muted-foreground mt-2">
            {mode === "signin" ? t("auth.welcome_back") : mode === "signup" ? t("auth.create_account") : t("auth.reset_title")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-card rounded-xl border-[0.5px] border-slate-200/80 p-6 shadow-[var(--shadow-card)]">
          {mode === "forgot" ? (
            resetSent ? (
              <>
                <p className="text-sm text-foreground">{t("auth.reset_sent")}</p>
                <Button type="button" variant="outline" className="w-full rounded-xl" onClick={() => { setMode("signin"); setResetSent(false); }}>
                  {t("auth.reset_back")}
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{t("auth.reset_desc")}</p>
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t("auth.email")}</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="du@example.com" />
                </div>
                <Button type="submit" disabled={loading} className="w-full rounded-xl" size="lg">
                  {loading ? t("auth.reset_sending") : t("auth.reset_submit")}
                </Button>
                <p className="text-center text-sm text-muted-foreground pt-2">
                  <button type="button" onClick={() => setMode("signin")} className="text-foreground font-medium hover:underline">
                    {t("auth.reset_back")}
                  </button>
                </p>
              </>
            )
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="du@example.com" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t("auth.password")}</Label>
                  {mode === "signin" && (
                    <button type="button" onClick={() => { setMode("forgot"); setResetSent(false); }} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                      {t("auth.forgot_password")}
                    </button>
                  )}
                </div>
                <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
              </div>

              <Button type="submit" disabled={loading} className="w-full rounded-xl" size="lg">
                {loading ? t("common.loading") : mode === "signin" ? t("common.login") : t("common.createAccount")}
              </Button>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200/80 dark:border-foreground/15" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground">{t("common.or")}</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                disabled={googleLoading}
                onClick={handleGoogleSignIn}
                className="w-full rounded-xl gap-2"
                size="lg"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
                </svg>
                {googleLoading ? t("common.loading") : t("auth.google")}
              </Button>

              <p className="text-center text-sm text-muted-foreground pt-2">
                {mode === "signin" ? t("auth.no_account") : t("auth.have_account")}{" "}
                <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-foreground font-medium hover:underline">
                  {mode === "signin" ? t("common.signup") : t("common.login")}
                </button>
              </p>
            </>
          )}
        </form>
        <p className="text-center text-xs text-muted-foreground mt-6">
          <Link to="/safety" className="hover:text-foreground underline-offset-4 hover:underline">{t("nav.safety")}</Link>
          <span className="mx-2">·</span>
          <Link to="/privacy" className="hover:text-foreground underline-offset-4 hover:underline">{t("nav.privacy")}</Link>
          <span className="mx-2">·</span>
          <Link to="/terms" className="hover:text-foreground underline-offset-4 hover:underline">{t("nav.terms")}</Link>
        </p>
      </div>

      <section className="w-full max-w-4xl mx-auto mt-16 md:mt-24">
        <h2 className="text-center text-sm font-medium uppercase tracking-wider text-muted-foreground mb-8">
          {t("auth.pricing.title")}
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {(["standard", "ultimate"] as const).map((tier) => {
            const isUlt = tier === "ultimate";
            const keys = isUlt
              ? ["ult_b1", "ult_b2", "ult_b3", "ult_b4", "ult_b5", "ult_b6", "ult_b7"]
              : ["std_b1", "std_b2", "std_b3", "std_b4", "std_b5", "std_b6"];
            return (
              <div
                key={tier}
                className={`relative rounded-xl border-[0.5px] bg-card p-8 shadow-[var(--shadow-card)] ${
                  isUlt ? "border-accent/50" : "border-slate-200/80 dark:border-foreground/15"
                }`}
              >
                <div className="flex items-center justify-between mb-6">
                  <span
                    className={`inline-flex items-center rounded-full text-xs font-bold px-3 py-1 ${
                      isUlt ? "bg-accent text-accent-foreground" : "bg-foreground text-background"
                    }`}
                  >
                    {t(isUlt ? "auth.pricing.ultimate_badge" : "auth.pricing.standard_badge")}
                  </span>
                  <div className="text-right">
                    <span className="text-3xl font-semibold tracking-tight">
                      {t(isUlt ? "auth.pricing.ultimate_price" : "auth.pricing.standard_price")}
                    </span>
                    <span className="ml-1 text-sm text-muted-foreground">{t("auth.pricing.per")}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  {t(isUlt ? "auth.pricing.ultimate_tagline" : "auth.pricing.standard_tagline")}
                </p>
                <ul className="space-y-3">
                  {keys.map((k) => {
                    const isNeg = k === "std_b5" || k === "std_b6";
                    return (
                      <li key={k} className="flex items-start gap-3 text-sm">
                        <span
                          className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                            isNeg ? "bg-muted text-muted-foreground" : "bg-secondary"
                          }`}
                        >
                          <Check className="h-3.5 w-3.5 text-foreground" strokeWidth={2.5} />
                        </span>
                        <span className={isNeg ? "text-muted-foreground line-through" : "text-foreground"}>
                          {t(`auth.pricing.${k}`)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground leading-relaxed">
          {t("auth.pricing.note")}
        </p>
      </section>
    </div>
  );
}
