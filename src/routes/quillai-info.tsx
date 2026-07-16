import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, MessageSquare, Image as ImageIcon, FileText, Wand2, Film, UserCheck, Box, Plus, ArrowLeft, Mic, Wallet } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { highlightPlanNames } from "@/lib/highlight-plans";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const Route = createFileRoute("/quillai-info")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "QuillAI Assistant — Social meets Intelligence" },
      { name: "description", content: "Discover QuillAI: free unlimited text chat, premium image analysis, document summarization and AI image generation — built into your social network." },
      { property: "og:title", content: "QuillAI Assistant" },
      { property: "og:description", content: "The AI assistant fused into quillai.online — chat, vision, documents and image generation." },
    ],
  }),
  component: QuillAIInfo,
});

function Crosshair({ className = "" }: { className?: string }) {
  return <Plus className={`absolute h-3 w-3 text-slate-300 ${className}`} strokeWidth={1} aria-hidden />;
}

function SectionFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute -top-px -left-px h-3 w-3 border-t border-l border-slate-300/80" />
      <span className="pointer-events-none absolute -top-px -right-px h-3 w-3 border-t border-r border-slate-300/80" />
      <span className="pointer-events-none absolute -bottom-px -left-px h-3 w-3 border-b border-l border-slate-300/80" />
      <span className="pointer-events-none absolute -bottom-px -right-px h-3 w-3 border-b border-r border-slate-300/80" />
      {children}
    </div>
  );
}

type Copy = {
  back: string;
  status: string;
  eyebrow: string;
  title: string;
  
  free_badge: string;
  premium_badge: string;
  f1_title: string;
  f1_desc: string;
  f2_title: string;
  f2_desc: string;
  f3_title: string;
  f3_desc: string;
  f4_title: string;
  f4_desc: string;
  f5_title: string;
  f5_desc: string;
  f6_title: string;
  f6_desc: string;
  f7_title: string;
  f7_desc: string;
  f8_title: string;
  f8_desc: string;
  f9_title: string;
  f9_desc: string;
  cta_title: string;
  cta_text: string;
  cta_btn: string;
  footer: string;
  section02: string;
  features_label: string;
};

const COPY: Record<"de" | "en", Copy> = {
  de: {
    back: "Zurück",
    status: "SYSTEM STATUS: SECURE",
    eyebrow: "// quillai_assistant",
    title: "QuillAI Assistant",
    
    free_badge: "KOSTENLOS",
    premium_badge: "PREMIUM",
    f1_title: "Unbegrenzter Text-Chat",
    f1_desc: "Präzise Text-Intelligenz via Google Gemini 2.5 Flash. Unser kostenloser Chat wird von einem der schnellsten und effizientesten Sprachmodelle der Welt angetrieben.",
    f2_title: "Multimodale Bild-Analyse",
    f2_desc: "Erweiterte Vision- & Dateianalyse. Dank der nativen multimodalen Fähigkeiten von Google Gemini 2.5 Flash kann QuillAI hochgeladene PDFs, Texte und Fotos lesen, übersetzen und visuelle Objekte präzise erkennen.",
    f3_title: "Dokumenten-Analyse & CSV-Kuration",
    f3_desc: "Erweiterte Datei-Analyse. Gemini 2.5 Flash verarbeitet hochgeladene PDFs, DOCX, TXT und CSV-Dateien direkt im Chat — fasst zusammen, übersetzt und extrahiert strukturierte Informationen.",
    f4_title: "Kreative Bildgenerierung",
    f4_desc: "Kreative Bildwelten mit Google Gemini 2.5 Flash Image oder FLUX.1 Schnell. Inklusive intelligentem Image-to-Image, um deine eigenen Fotos direkt im Chat per Textbefehl in neue Stile zu verwandeln. Standard Pro: 500 Bilder im Monat (3,90 €). Ultimate Video: 900 Bilder im Monat (10,00 €).",
    f5_title: "Kreative KI-Videogenerierung",
    f5_desc: "Powered by Runway (Veo 3.1 Fast & Gen-4 Turbo) – Nur im Ultimate Video Tarif (10,00 € im Monat): bis zu 15 hochwertige KI-Videoclips pro Monat. Erschaffe kurze Videoclips und hochwertige Animationen aus Textbeschreibungen oder erwecke deine eigenen hochgeladenen Bilder zum Leben (Image-to-Video). Jeder Clip hat 8 Sekunden Laufzeit und kann einmalig um weitere 8 Sekunden verlängert werden (insgesamt 16 Sekunden).",
    f6_title: "Maßgeschneiderte KI-Experten",
    f6_desc: "Verwandle QuillAI per Klick in einen spezialisierten Assistenten. Ob als erfahrener Business-Berater, präziser Code-Experte, kreativer Copywriter oder geduldiger Lehrer – die KI passt ihren Fokus, ihr Fachwissen und ihren Tonfall exakt an deine Herausforderung an.",
    f7_title: "3D-Kreator",
    f7_desc: "Erstelle detaillierte 3D-Modelle aus Textbeschreibungen oder lade ein Referenzbild hoch, um die Gestaltung zu steuern. Powered by Tripo3D (v3.0-20250812). Exklusiv im Ultimate Video Tarif verfügbar: bis zu 20 3D-Modelle pro Monat.",
    f8_title: "Live-Sprachchat (Realtime Voice)",
    f8_desc: "Sprich in Echtzeit mit QuillAI – powered by OpenAI GPT-4o mini Realtime mit natürlicher weiblicher Stimme (shimmer). Tippe im AI-Chat auf das Mikrofon und führe ein fließendes Gespräch mit sofortiger Sprachantwort und Live-Wellenform. Exklusiv im Ultimate Video Tarif (10,00 € im Monat) – 20 Live-Minuten pro Monat inklusive, mit sichtbarem Countdown und automatischer Sperre beim Erreichen des Limits.",
    f9_title: "5-€ Universalguthaben (Top-up)",
    f9_desc: "Sobald dein monatliches Inklusiv-Kontingent aufgebraucht ist, greift das Universalguthaben automatisch: Live-Sprache 0,20 €/Min., Bilder 0,03 €/Stück, Videos 0,40 €/Clip. Einmalig 5,00 € per PayPal aufladen – stapelbar und jederzeit verfügbar. Nur für Premium-Nutzer.",
    cta_title: "// get_started",
    cta_text: "Zwei Tarife zur Auswahl: Standard Pro für 3,90 € im Monat (500 KI-Bilder) oder Ultimate Video für 10,00 € im Monat (900 Bilder + 15 KI-Videos + 20 3D-Modelle, 8 s je Clip, einmalig erweiterbar auf 16 s). Monatlich kündbar.",
    cta_btn: "Tarif wählen",
    footer: "quillai.online · QuillAI Assistant · v1.0",
    section02: "// section_02",
    features_label: "FEATURES · 09",
  },
  en: {
    back: "Back",
    status: "SYSTEM STATUS: SECURE",
    eyebrow: "// quillai_assistant",
    title: "QuillAI Assistant",
    
    free_badge: "FREE",
    premium_badge: "PREMIUM",
    f1_title: "Unlimited Text Chat",
    f1_desc: "Precise text intelligence via Google Gemini 2.5 Flash. Our free chat is powered by one of the fastest and most efficient language models in the world.",
    f2_title: "Multimodal Image Analysis",
    f2_desc: "Advanced vision & file analysis. Thanks to the native multimodal capabilities of Google Gemini 2.5 Flash, QuillAI can read, translate, and analyze uploaded PDFs, texts, and photos with high precision.",
    f3_title: "Document & Data Analysis",
    f3_desc: "Advanced file analysis. Gemini 2.5 Flash processes uploaded PDFs, DOCX, TXT, and CSV files directly in chat — summarizing, translating, and extracting structured information.",
    f4_title: "AI Image Generation",
    f4_desc: "Creative visuals with Google Gemini 2.5 Flash Image or FLUX.1 Fast. Includes intelligent Image-to-Image to transform your own photos into new styles directly in chat using text prompts. Standard Pro: 500 images per month ($3.90). Ultimate Video: 900 images per month ($10.00).",
    f5_title: "AI Video Generation",
    f5_desc: "Powered by Runway (Veo 3.1 Fast & Gen-4 Turbo) – Ultimate Video tier only ($10.00 per month): up to 15 high-quality AI video clips per month. Create short video clips and high-quality animations from text prompts or bring your own uploaded images to life (Image-to-Video). Each clip runs 8 seconds and can be extended once by another 8 seconds (16 seconds total).",
    f6_title: "Tailored AI Specialists",
    f6_desc: "Transform QuillAI into a specialized assistant with a single click. Whether acting as an experienced business advisor, precise code expert, creative copywriter, or patient tutor – the AI adapts its focus, knowledge, and tone perfectly to your challenge.",
    f7_title: "3D Creator",
    f7_desc: "Create detailed 3D models from text descriptions or upload a reference image to guide the design. Powered by Tripo3D (v3.0-20250812). Available exclusively in the Ultimate Video tier: up to 20 3D models per month.",
    f8_title: "Live Voice Chat (Realtime)",
    f8_desc: "Talk to QuillAI in real time – powered by OpenAI GPT-4o mini Realtime with a natural female voice (shimmer). Tap the microphone in the AI chat and enjoy a flowing conversation with instant spoken replies and a live waveform. Exclusive to the Ultimate Video tier ($10.00 per month) – 20 live minutes per month included, with a visible countdown and automatic lock once the limit is reached.",
    f9_title: "5 € Universal Balance (Top-up)",
    f9_desc: "Once your monthly inclusive quota is used up, universal balance kicks in automatically: live voice 0.20 €/min., images 0.03 € each, videos 0.40 €/clip. Top up 5.00 € via PayPal once – stackable and always available. Premium users only.",
    cta_title: "// get_started",
    cta_text: "Two tiers to choose from: Standard Pro for $3.90 per month (500 AI images) or Ultimate Video for $10.00 per month (900 images + 15 AI videos + 20 3D models, 8 s per clip, extendable once to 16 s). Cancel anytime.",
    cta_btn: "Choose plan",
    footer: "quillai.online · QuillAI Assistant · v1.0",
    section02: "// section_02",
    features_label: "FEATURES · 09",
  },
};

function QuillAIInfo() {
  const { lang } = useI18n();
  const c = COPY[lang];

  const features = [
    { icon: MessageSquare, badge: c.free_badge, free: true, title: c.f1_title, desc: c.f1_desc },
    { icon: ImageIcon, badge: c.premium_badge, free: false, title: c.f2_title, desc: c.f2_desc },
    { icon: FileText, badge: c.premium_badge, free: false, title: c.f3_title, desc: c.f3_desc },
    { icon: Wand2, badge: c.premium_badge, free: false, title: c.f4_title, desc: c.f4_desc },
    { icon: Film, badge: c.premium_badge, free: false, title: c.f5_title, desc: c.f5_desc, sparkle: true },
    { icon: UserCheck, badge: c.free_badge, free: true, title: c.f6_title, desc: c.f6_desc },
    { icon: Box, badge: c.premium_badge, free: false, title: c.f7_title, desc: c.f7_desc },
    { icon: Mic, badge: c.premium_badge, free: false, title: c.f8_title, desc: c.f8_desc, sparkle: true },
    { icon: Wallet, badge: c.premium_badge, free: false, title: c.f9_title, desc: c.f9_desc },
  ];

  return (
    <div className="relative min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Tech grid background */}
      <div className="pointer-events-none absolute inset-0 tech-grid-bg" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(1_0_0_/_0.6),_transparent_60%)]" aria-hidden />

      {/* Side rails */}
      <div className="pointer-events-none absolute top-0 bottom-0 left-6 hidden lg:flex flex-col items-center gap-6" aria-hidden>
        <div className="h-24 w-px bg-gradient-to-b from-transparent via-slate-300/60 to-transparent" />
        <span className="text-[9px] tracking-[0.3em] text-slate-400 [writing-mode:vertical-rl] rotate-180">QUILLAI · MODULE · 002</span>
        <div className="flex-1 w-px bg-gradient-to-b from-slate-200/60 via-slate-200/30 to-transparent" />
      </div>
      <div className="pointer-events-none absolute top-0 bottom-0 right-6 hidden lg:flex flex-col items-center gap-6" aria-hidden>
        <div className="h-24 w-px bg-gradient-to-b from-transparent via-slate-300/60 to-transparent" />
        <span className="text-[9px] tracking-[0.3em] text-slate-400 [writing-mode:vertical-rl]">{c.status}</span>
        <div className="flex-1 w-px bg-gradient-to-b from-slate-200/60 via-slate-200/30 to-transparent" />
      </div>

      <Crosshair className="top-32 left-16 hidden md:block" />
      <Crosshair className="top-64 right-20 hidden md:block" />
      <Crosshair className="top-[120vh] left-12 hidden md:block" />

      {/* Header */}
      <header className="relative px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full border-b-[0.5px] border-slate-200/80 z-10">
        <Link to="/" className="text-xl font-semibold tracking-tight inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          quill.
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {c.status}
          </span>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Hero */}
      <main className="relative flex-1 px-6 z-10">
        <section className="max-w-5xl mx-auto py-16 md:py-20">
          <div className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground mb-6">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            {c.eyebrow}
          </div>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tighter leading-[1.02] text-foreground">
            {c.title}
          </h1>

          <div className="mt-10 flex items-center gap-4 text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
            <span className="h-px flex-1 bg-slate-200/70" />
            <span>{c.features_label}</span>
            <span className="h-px flex-1 bg-slate-200/70" />
          </div>

          <p className="mt-8 inline-block text-xs tracking-wide text-accent border-[0.5px] border-accent/30 bg-accent/5 rounded-full px-4 py-1.5">
            {lang === "de"
              ? "Angetrieben von Google Gemini 2.5 Flash, Google Gemini 2.5 Flash Image, FLUX.1 Schnell & Runway Veo 3.1 Fast – Schalte das volle Premium-Paket frei: Inklusive unbegrenztem Text-Chat, 900 KI-Bildgenerierungen, 15 hochwertigen KI-Videoclips und 20 3D-Modellen pro Monat (8 s, einmalig erweiterbar auf 16 s). Alles für nur 10,00 € im Monat."
              : "Powered by Google Gemini 2.5 Flash, Google Gemini 2.5 Flash Image, FLUX.1 Fast & Runway Veo 3.1 Fast – Unlock the ultimate Premium package: Includes unlimited text chat, 900 AI image generations, 15 high-quality AI video clips, and 20 3D models per month (8 s, extendable once to 16 s). All for just $10.00 per month."}
          </p>
        </section>

        {/* Features grid */}
        <section className="max-w-5xl mx-auto pb-16">
          <div className="grid md:grid-cols-2 border-[0.5px] border-slate-200/80 rounded-xl overflow-hidden bg-card/60 backdrop-blur-sm divide-y md:divide-y-0 divide-slate-200/70 [&>*:nth-child(odd)]:md:border-r [&>*:nth-child(odd)]:md:border-slate-200/70 [&>*:not(:last-child)]:md:border-b [&>*:not(:last-child)]:md:border-slate-200/70">
            {features.map(({ icon: Icon, badge, free, title, desc, sparkle }, i) => (
              <div key={title} className="relative p-7 md:p-8 group hover:bg-white/60 transition-colors">
                <span className="absolute top-3 right-4 text-[9px] tracking-[0.2em] text-muted-foreground/60">0{i + 1}</span>
                <div className="flex items-center justify-between mb-5">
                  <div className="relative h-11 w-11 rounded-xl bg-secondary flex items-center justify-center border-[0.5px] border-slate-200/80 corner-marks">
                    <Icon className="h-5 w-5 text-foreground" strokeWidth={1.5} />
                    {sparkle && (
                      <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-accent" strokeWidth={1.5} aria-hidden />
                    )}
                  </div>
                  <span
                    className={`text-[9px] tracking-[0.25em] px-2 py-1 rounded-full border-[0.5px] ${
                      free
                        ? "border-emerald-500/40 text-emerald-700 bg-emerald-50/60"
                        : "border-accent/40 text-accent bg-accent/5"
                    }`}
                  >
                    {badge}
                  </span>
                </div>
                <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
                <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">{highlightPlanNames(desc)}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <SectionFrame className="mt-12 rounded-xl border-[0.5px] border-slate-200/80 bg-white/70 backdrop-blur-xl p-8 md:p-10 shadow-[var(--shadow-card)] text-center">
            <span className="inline-block text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-3">{c.cta_title}</span>
            <p className="text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              {highlightPlanNames(c.cta_text)}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-8 py-3 text-sm font-medium corner-marks tech-glow"
              >
                {c.cta_btn}
              </Link>
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-xl px-8 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {c.back}
              </Link>
            </div>
          </SectionFrame>
        </section>
      </main>

      <footer className="relative px-6 py-6 text-center text-xs text-muted-foreground border-t-[0.5px] border-slate-200/70 z-10">
        {c.footer}
      </footer>
    </div>
  );
}
