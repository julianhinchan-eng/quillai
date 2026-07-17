import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InstallAppButton } from "@/components/InstallAppButton";
import { useI18n } from "@/lib/i18n";
import { isStandaloneMode } from "@/lib/pwa";
import { highlightPlanNames } from "@/lib/highlight-plans";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MessageSquare, Image as ImageIcon, FileSearch, Sparkles, Film, UserCheck, Check, Box, Mic, Wallet, ChevronDown, Globe } from "lucide-react";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Landing,
});

function SectionFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`box-border w-full min-w-0 max-w-full ${className}`}>{children}</div>;
}

function Landing() {
  const navigate = useNavigate();
  const { t } = useI18n();
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) navigate({ to: "/ai-chat", replace: true });
      else if (isStandaloneMode()) {
        navigate({ to: "/auth", replace: true });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="relative min-h-screen w-full max-w-full overflow-x-hidden bg-background flex flex-col">
      <header className="relative px-6 py-5 flex items-center justify-between max-w-7xl mx-auto w-full z-10">
        <Link to="/" className="text-xl font-semibold tracking-tight">quillai.online</Link>
        <div className="flex items-center gap-2 md:gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            online
          </span>
          <LanguageSwitcher />
          <ThemeToggle />
          <Link to="/quillai-info" className="hidden md:inline-flex">
            <Button variant="ghost" size="sm" className="gap-1.5 rounded-full">
              <Sparkles className="h-3.5 w-3.5" />
              {t("landing.header.small_button")}
            </Button>
          </Link>
          <Link to="/auth">
            <Button variant="outline" size="sm" className="rounded-full border-foreground/20 hover:bg-foreground hover:text-background">{t("common.login")}</Button>
          </Link>
        </div>
      </header>

      <main className="relative flex-1 flex items-center px-6 z-10">
        <div className="max-w-7xl mx-auto w-full grid md:grid-cols-2 gap-12 lg:gap-16 items-center py-16 md:py-20">
          <div className="min-w-0 md:pr-12">
            <div className="inline-flex items-center gap-2 text-xs font-medium tracking-wide uppercase text-muted-foreground mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {t("landing.tagline")}
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight md:tracking-tighter leading-[1.05] text-foreground break-words">
              {t("landing.title1")}<br />
              <span className="italic font-normal text-muted-foreground">{t("landing.title2")}</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-md break-words">
              {highlightPlanNames(t("landing.subtitle"))}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/ai-chat">
                <Button size="lg" className="rounded-full px-8 bg-accent text-accent-foreground hover:bg-accent/90 shadow-[var(--shadow-card)]">
                  <Sparkles className="h-4 w-4" />
                  {t("landing.header.ai_cta")}
                </Button>
              </Link>
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button size="lg" variant="ghost" className="rounded-full px-8">{t("common.createAccount")}</Button>
              </Link>
            </div>
            <div className="mt-4">
              <InstallAppButton />
            </div>
          </div>

          <div className="hidden md:block md:pl-12">
            <div className="relative">
              <SectionFrame className="relative rounded-3xl border border-[#e0e0e0] dark:border-white/10 bg-card text-card-foreground p-6 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.15)] space-y-4">
                <div className="flex items-center justify-between text-[10px] tracking-[0.2em] uppercase text-muted-foreground pb-2 -mt-1">
                  <span>QuillAI Chat</span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    live
                  </span>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl px-4 py-2 bg-primary text-primary-foreground text-sm">
                    {t("landing.demo.user")}
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center text-accent-foreground shrink-0">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="text-sm text-foreground leading-relaxed">
                    {t("landing.demo.assistant")}
                  </div>
                </div>
              </SectionFrame>
            </div>
          </div>
        </div>
      </main>

      <section className="relative px-6 py-16 md:py-24 z-10 border-t-[0.5px] border-slate-200/70">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <span className="inline-block text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-4">// section_02</span>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tighter">
              {t("landing.discover_title")}
            </h2>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              {t("landing.discover_intro")}
            </p>
            <p className="mt-4 inline-block text-xs tracking-wide text-accent border-[0.5px] border-accent/30 bg-accent/5 rounded-full px-4 py-1.5">
              {highlightPlanNames(t("landing.volume_callout"))}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-12">
            {[
              { icon: MessageSquare, title: t("landing.highlight1_title"), desc: t("landing.highlight1_desc") },
              { icon: ImageIcon, title: t("landing.highlight2_title"), desc: t("landing.highlight2_desc") },
              { icon: FileSearch, title: t("landing.highlight3_title"), desc: t("landing.highlight3_desc") },
              { icon: Film, title: t("landing.highlight4_title"), desc: t("landing.highlight4_desc") },
              { icon: UserCheck, title: t("landing.highlight5_title"), desc: t("landing.highlight5_desc") },
              { icon: Box, title: t("landing.highlight6_title"), desc: t("landing.highlight6_desc") },
              { icon: Mic, title: t("landing.highlight7_title"), desc: t("landing.highlight7_desc") },
              { icon: Wallet, title: t("landing.highlight8_title"), desc: t("landing.highlight8_desc") },
            ].map(({ icon: Icon, title, desc }, i) => (
              <Fragment key={title}>
                <div
                  className="relative p-6 md:p-8 rounded-3xl bg-card border border-[#e0e0e0] dark:border-white/10 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] transition-shadow"
                >
                  <span className="absolute top-3 right-4 text-[10px] font-medium text-muted-foreground/60">0{i + 1}</span>
                  <div className="relative h-11 w-11 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-foreground" strokeWidth={1.5} />
                    {(Icon === Film || Icon === Box || Icon === Mic) && (
                      <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-accent" strokeWidth={1.5} aria-hidden />
                    )}
                  </div>
                  <h3 className="text-base font-semibold tracking-tight">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{highlightPlanNames(desc)}</p>
                </div>
                {Icon === ImageIcon && (
                  <Collapsible className="md:col-span-2">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="group flex items-center gap-2 px-0 h-auto py-1 text-muted-foreground hover:text-foreground">
                        <Globe className="h-4 w-4" />
                        <span className="text-sm">Hinweis zur Verfügbarkeit / Availability note — Lustify V8</span>
                        <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="rounded-2xl border border-border/60 bg-muted/50 p-4 text-sm text-muted-foreground space-y-3">
                        <div>
                          <p className="font-medium text-foreground mb-1">Deutsch</p>
                          <p className="mb-2">
                            L8 ist in folgenden Regionen nicht verfügbar: Deutschland (DE), Großbritannien (GB), Brasilien (BR), Australien (AU), Frankreich (FR) sowie in bestimmten US-Bundesstaaten.
                          </p>
                          <p>
                            In allen anderen erlaubten Regionen musst du vor der Nutzung die Nutzungsbedingungen bestätigen. Das Modell wird erst aktiviert, wenn du auf „Akzeptieren“ tippst.
                          </p>
                        </div>
                        <div className="border-t border-border/40 pt-3">
                          <p className="font-medium text-foreground mb-1">English</p>
                          <p className="mb-2">
                            L8 is not available in the following regions: Germany (DE), United Kingdom (GB), Brazil (BR), Australia (AU), France (FR), and certain US states.
                          </p>
                          <p>
                            In all other permitted regions, you must accept the Terms of Service before use. The model is only activated once you tap „Accept“.
                          </p>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </Fragment>
            ))}
          </div>

          <div className="mt-12">
            <div className="text-center mb-8">
              <span className="inline-block text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-3">// pricing</span>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tighter">{t("auth.pricing.title")}</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {(["standard", "ultimate"] as const).map((tier) => {
                const isUlt = tier === "ultimate";
                const keys = isUlt
                  ? ["ult_b1", "ult_b2", "ult_b3", "ult_b4", "ult_b5", "ult_b6", "ult_b7"]
                  : ["std_b1", "std_b2", "std_b3", "std_b4", "std_b5", "std_b6"];
                return (
                  <div
                    key={tier}
                    className={`relative rounded-3xl bg-card p-6 md:p-8 shadow-[var(--shadow-card)] border ${
                      isUlt ? "border-accent/50" : "border-[#e0e0e0] dark:border-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
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
                    <ul className="space-y-2.5">
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
          </div>

          <SectionFrame className="mt-12 rounded-3xl border border-[#e0e0e0] dark:border-white/10 bg-card text-card-foreground p-8 shadow-[var(--shadow-card)] text-center">
            <span className="inline-block text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-3">// get_started</span>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              {highlightPlanNames(t("landing.cta_text"))}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button size="lg" className="rounded-full px-8 bg-accent text-accent-foreground hover:bg-accent/90">{t("common.createAccount")}</Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="ghost" className="rounded-full px-8">{t("common.login")}</Button>
              </Link>
            </div>
          </SectionFrame>
        </div>
      </section>

      <footer className="relative px-6 py-6 text-center text-xs text-muted-foreground space-x-4 z-10">
        <span>{t("landing.footer")}</span>
        <Link to="/quillai-info" className="hover:text-foreground underline-offset-4 hover:underline">QuillAI</Link>
        <Link to="/safety" className="hover:text-foreground underline-offset-4 hover:underline">{t("nav.safety")}</Link>
        <Link to="/privacy" className="hover:text-foreground underline-offset-4 hover:underline">{t("nav.privacy")}</Link>
        <Link to="/terms" className="hover:text-foreground underline-offset-4 hover:underline">{t("nav.terms")}</Link>
      </footer>
    </div>
  );
}
