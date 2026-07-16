import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Sparkles, Send, Loader2, ImagePlus, Paperclip, Video, ChevronDown, Check, Mic, Lock, MessageCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { askQuillAIGuest, type Specialization } from "@/lib/ai-chat.functions";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

type SpecOption = {
  id: Specialization;
  emoji: string;
  label: { de: string; en: string };
  desc: { de: string; en: string };
};

const SPEC_OPTIONS: SpecOption[] = [
  { id: "universal", emoji: "🤖", label: { de: "Universal-Assistent", en: "Universal Assistant" }, desc: { de: "Der normale, flexible Standard-Modus", en: "The flexible default mode" } },
  { id: "business", emoji: "💼", label: { de: "Business & Startup-Berater", en: "Business & Startup Advisor" }, desc: { de: "Businesspläne, Marketingstrategien und E-Mails", en: "Business plans, marketing strategies, emails" } },
  { id: "copywriter", emoji: "📝", label: { de: "Copywriter & Content-Creator", en: "Copywriter & Content Creator" }, desc: { de: "Packende Social-Media-Posts, Blogs und kreative Texte", en: "Punchy social posts, blogs, creative copy" } },
  { id: "code", emoji: "💻", label: { de: "Code-Experte & Debugger", en: "Code Expert & Debugger" }, desc: { de: "Sauberer Programmiercode, Logik und Fehlersuche", en: "Clean code, logic, debugging" } },
  { id: "teacher", emoji: "🎓", label: { de: "Lehrer & Erklär-Assistent", en: "Teacher & Explainer" }, desc: { de: "Komplexe Themen einfach erklärt, Lernpläne", en: "Simple explanations and learning plans" } },
  { id: "legal", emoji: "⚖️", label: { de: "Recht & Bürokratie-Helfer", en: "Legal & Bureaucracy Helper" }, desc: { de: "Verträge und offizielle Briefe verstehen", en: "Understand contracts and official letters" } },
];

const IMAGE_TRIGGERS = [
  /^\s*\/image\b/i,
  /\bgenerate (an?|the) image\b/i,
  /\bcreate (an?|the) (image|picture)\b/i,
  /\bdraw (an?|the|me) /i,
  /\bzeichne (ein|mir) /i,
  /\bmal(e)? (ein|mir) /i,
  /\berstelle (ein|mir ein) bild\b/i,
  /\bgeneriere (ein|mir ein) bild\b/i,
];

const VIDEO_TRIGGERS = [
  /^\s*\/video\b/i,
  /\bgenerate (an?|the) video\b/i,
  /\bcreate (an?|the) (video|clip|movie)\b/i,
  /\bmake (an?|the|me) video\b/i,
  /\berstelle (ein|mir ein) video\b/i,
  /\bgeneriere (ein|mir ein) video\b/i,
  /\bvideo (erstellen|generieren)\b/i,
];

function looksLikeImageRequest(text: string) {
  return IMAGE_TRIGGERS.some((r) => r.test(text));
}

function looksLikeVideoRequest(text: string) {
  return VIDEO_TRIGGERS.some((r) => r.test(text));
}

const DAILY_LIMIT = 10;
const COUNT_KEY_PREFIX = "quill.guest.count.";

function todayKey() {
  const d = new Date();
  return `${COUNT_KEY_PREFIX}${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function getCount(): number {
  if (typeof window === "undefined") return 0;
  return Number(window.localStorage.getItem(todayKey()) ?? "0");
}

function bumpCount() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(todayKey(), String(getCount() + 1));
}

export function GuestChat() {
  const { t, lang } = useI18n();
  const ask = useServerFn(askQuillAIGuest);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [specialization, setSpecialization] = useState<Specialization>("universal");
  const [imageMode, setImageMode] = useState(false);
  const [videoMode, setVideoMode] = useState(false);
  const [imageModel, setImageModel] = useState<"gemini" | "flux" | "lustify">("gemini");
  const [lustifyGateOpen, setLustifyGateOpen] = useState(false);
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLimitReached(getCount() >= DAILY_LIMIT);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = useCallback(
    async (raw: string) => {
      const value = raw.trim();
      if (!value || sending) return;
      if (imageMode || videoMode || looksLikeImageRequest(value) || looksLikeVideoRequest(value)) {
        if (looksLikeImageRequest(value)) {
          setImageMode(true);
          setVideoMode(false);
        } else if (looksLikeVideoRequest(value)) {
          setVideoMode(true);
          setImageMode(false);
        }
        toast.info(
          lang === "en"
            ? "Please sign in to generate images or videos."
            : "Bitte anmelden, um Bilder oder Videos zu generieren.",
        );
        return;
      }
      if (getCount() >= DAILY_LIMIT) {
        setLimitReached(true);
        return;
      }

      const nextMsgs: Msg[] = [...messages, { role: "user", content: value }];
      setMessages(nextMsgs);
      setInput("");
      setSending(true);
      try {
        const { reply } = await ask({ data: { messages: nextMsgs, specialization } });
        bumpCount();
        setMessages((m) => [...m, { role: "assistant", content: reply }]);
        if (getCount() >= DAILY_LIMIT) setLimitReached(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg === "GUEST_LIMIT") {
          setLimitReached(true);
        } else if (msg === "RATE_LIMIT") {
          toast.error(lang === "en" ? "Too many requests. Please wait a moment." : "Zu viele Anfragen. Bitte kurz warten.");
        } else {
          toast.error(lang === "en" ? "Something went wrong." : "Etwas ist schiefgelaufen.");
        }
        setMessages(messages);
      } finally {
        setSending(false);
      }
    },
    [ask, lang, messages, sending, specialization, imageMode, videoMode],
  );

  const premiumClick = () => {
    toast.info(
      lang === "en"
        ? "Please sign in to use this feature."
        : "Bitte anmelden um diese Funktion zu nutzen.",
    );
  };

  const handleTextButton = () => {
    setImageMode(false);
    setVideoMode(false);
  };

  const handleImageButton = () => {
    setImageMode((v) => !v);
    setVideoMode(false);
  };

  const handleVideoButton = () => {
    setVideoMode((v) => !v);
    setImageMode(false);
  };

  const activeModelLabel = videoMode
    ? "Runway Veo 3.1 Fast"
    : imageMode
    ? imageModel === "flux"
      ? lang === "en"
        ? "FLUX.1 Fast"
        : "FLUX.1 Schnell"
      : imageModel === "lustify"
      ? "Lustify V8 (SDXL)"
      : "Gemini 2.5 Flash Image"
    : "Gemini 2.5 Flash";


  const remaining = Math.max(0, DAILY_LIMIT - getCount());
  const activeSpec = SPEC_OPTIONS.find((o) => o.id === specialization) ?? SPEC_OPTIONS[0];
  const empty = messages.length === 0;

  return (
    <AppShell guest>
      <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
        <div className="pb-2 flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 flex-1 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div className="min-w-0">
              <div className="text-base font-semibold leading-tight flex items-center gap-2">
                <span>QuillAI Chat</span>
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-secondary/40 text-[10px] font-medium text-muted-foreground"
                  title={lang === "en" ? "Active AI model" : "Aktives KI-Modell"}
                >
                  <Sparkles className="h-2.5 w-2.5" />
                  {activeModelLabel}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {lang === "en"
                  ? `Guest mode · ${remaining} free left today`
                  : `Gast-Modus · ${remaining} freie heute übrig`}
              </div>
            </div>
          </div>
          <div className="flex-1 min-w-0 sm:hidden">
            <div className="text-[11px] text-muted-foreground">
              {lang === "en"
                ? `Guest mode · ${remaining} free left today`
                : `Gast-Modus · ${remaining} freie heute übrig`}
            </div>
            <div
              className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-secondary/40 text-[10px] font-medium text-muted-foreground w-fit"
              title={lang === "en" ? "Active AI model" : "Aktives KI-Modell"}
            >
              <Sparkles className="h-2.5 w-2.5" />
              {activeModelLabel}
            </div>
          </div>
          <Link to="/auth" search={{ mode: "signup" } as any}>
            <Button size="sm" className="rounded-full">{t("common.createAccount")}</Button>
          </Link>
        </div>
        <div className="border-b" />

        <div ref={scrollRef} className="flex-1 overflow-y-auto py-6 min-h-0">
          {empty ? (
            <div className="h-full" aria-hidden="true" />
          ) : (
            <div className="space-y-5">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={
                      m.role === "user"
                        ? "max-w-[85%] rounded-2xl px-4 py-2.5 bg-primary text-primary-foreground whitespace-pre-wrap break-words text-sm"
                        : "max-w-[85%] whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground"
                    }
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {lang === "en" ? "QuillAI is thinking…" : "QuillAI denkt nach…"}
                </div>
              )}
              {!sending && (
                <div className="text-center text-xs text-muted-foreground pt-2">
                  <Link to="/auth" search={{ mode: "signup" } as any} className="underline underline-offset-2 hover:text-foreground">
                    {lang === "en" ? "Sign up to save your chat history" : "Registrieren, um den Verlauf zu speichern"}
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {limitReached && (
          <div className="mt-4 rounded-xl border border-accent/40 bg-accent/5 p-4 text-center">
            <p className="text-sm font-medium">
              {lang === "en" ? "Daily free limit reached" : "Tages-Limit erreicht"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {lang === "en"
                ? "Create a free account to keep chatting."
                : "Erstelle einen kostenlosen Account, um weiter zu chatten."}
            </p>
            <div className="mt-3 flex justify-center gap-2">
              <Link to="/auth" search={{ mode: "signup" } as any}>
                <Button size="sm">{t("common.createAccount")}</Button>
              </Link>
              <Link to="/auth">
                <Button size="sm" variant="ghost">{t("common.login")}</Button>
              </Link>
            </div>
          </div>
        )}

        <div className="pt-2 pb-3 md:pb-0">
          <div className="mb-1.5 flex items-center gap-2 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-card hover:bg-secondary/60 text-xs transition-colors"
                  title={lang === "en" ? "Choose AI specialization" : "KI-Spezialisierung wählen"}
                >
                  <span className="text-sm leading-none">{activeSpec.emoji}</span>
                  <span className="font-medium">
                    {lang === "en" ? "Active: " : "Aktiv: "}
                    {activeSpec.label[lang === "en" ? "en" : "de"]}
                  </span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80">
                <DropdownMenuLabel className="text-xs">
                  {lang === "en" ? "AI specialization" : "KI-Spezialisierung"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {SPEC_OPTIONS.map((opt) => {
                  const active = opt.id === specialization;
                  return (
                    <DropdownMenuItem
                      key={opt.id}
                      onSelect={() => setSpecialization(opt.id)}
                      className="flex items-start gap-2 py-2 cursor-pointer"
                    >
                      <span className="text-base leading-5">{opt.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium leading-tight">
                          {opt.label[lang === "en" ? "en" : "de"]}
                        </div>
                        <div className="text-[11px] text-muted-foreground leading-snug">
                          {opt.desc[lang === "en" ? "en" : "de"]}
                        </div>
                      </div>
                      {active && <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {imageMode && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <div className="px-3 py-1.5 rounded-full bg-accent/10 text-xs text-accent inline-flex items-center gap-1.5">
                <ImagePlus className="h-3 w-3" />
                {lang === "en"
                  ? "Image mode — describe the image you want to create (optional: attach an image)"
                  : "Bildmodus — beschreibe das gewünschte Bild ( optional: hänge ein Bild an )"}
                <Lock className="h-3 w-3 ml-1" />
              </div>
              <div className="flex flex-wrap items-center gap-1 rounded-2xl border p-1 text-xs max-w-full" title={lang === "en" ? "Sign in to use image models" : "Zum Nutzen der Bildmodelle anmelden"}>
                <span className="px-2 text-muted-foreground shrink-0">
                  {lang === "en" ? "Model:" : "Modell:"}
                </span>
                <button
                  type="button"
                  onClick={() => setImageModel("gemini")}
                  className={`px-2.5 py-1 rounded-full transition ${imageModel === "gemini" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Gemini
                </button>
                <button
                  type="button"
                  onClick={() => setImageModel("flux")}
                  className={`px-2.5 py-1 rounded-full transition ${imageModel === "flux" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  title={lang === "en" ? "FLUX.1 Fast" : "FLUX.1 Schnell"}
                >
                  {lang === "en" ? "Flux.1 Fast" : "Flux.1 Schnell"}
                </button>
                <button
                  type="button"
                  onClick={() => setLustifyGateOpen(true)}
                  className="px-2.5 py-1 rounded-full transition text-muted-foreground hover:text-foreground"
                  title="Lustify V8 (SDXL, NSFW)"
                >
                  Lustify V8
                </button>
              </div>
            </div>
          )}

          {videoMode && (
            <div className="mb-2 px-3 py-1.5 rounded-full bg-accent/10 text-xs text-accent inline-flex items-center gap-1.5">
              <Video className="h-3 w-3" />
              {lang === "en"
                ? "Video mode — describe the video you want to create (optional: attach an image)"
                : "Videomodus — beschreibe das gewünschte Video ( optional: hänge ein Bild an )"}
              <Lock className="h-3 w-3 ml-1" />
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-end gap-1.5 rounded-xl border bg-card p-1.5 shadow-sm focus-within:ring-1 focus-within:ring-ring"
          >
            <Button type="button" size="icon" variant="ghost" onClick={premiumClick} className="rounded-full shrink-0 h-8 w-8" title={lang === "en" ? "Attach document (sign in)" : "Dokument anhängen (anmelden)"}>
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant={!imageMode && !videoMode ? "default" : "ghost"}
              onClick={handleTextButton}
              className="rounded-full shrink-0 hidden sm:inline-flex h-8 w-8"
              title={lang === "en" ? "Normal chat mode" : "Normaler Chat-Modus"}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant={imageMode ? "default" : "ghost"}
              onClick={handleImageButton}
              className="rounded-full shrink-0 hidden sm:inline-flex h-8 w-8"
              title={lang === "en" ? "Image generation mode (sign in to use)" : "Bildgenerierungs-Modus (zum Nutzen anmelden)"}
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant={videoMode ? "default" : "ghost"}
              onClick={handleVideoButton}
              className="rounded-full shrink-0 hidden sm:inline-flex h-8 w-8"
              title={lang === "en" ? "Video generation mode (sign in to use)" : "Videogenerierungs-Modus (zum Nutzen anmelden)"}
            >
              <Video className="h-4 w-4" />
            </Button>
            <Button type="button" size="icon" variant="ghost" onClick={premiumClick} className="rounded-full shrink-0 hidden sm:inline-flex h-8 w-8" title={lang === "en" ? "Voice chat (sign in)" : "Sprach-Chat (anmelden)"}>
              <Mic className="h-4 w-4" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="rounded-full shrink-0 sm:hidden h-8 w-8"
                  title={lang === "en" ? "More options" : "Weitere Optionen"}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-auto p-1.5 flex items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant={!imageMode && !videoMode ? "default" : "ghost"}
                  onClick={handleTextButton}
                  className="rounded-full h-8 w-8"
                  title={lang === "en" ? "Normal chat mode" : "Normaler Chat-Modus"}
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant={imageMode ? "default" : "ghost"}
                  onClick={handleImageButton}
                  className="rounded-full h-8 w-8"
                  title={lang === "en" ? "Image generation mode (sign in to use)" : "Bildgenerierungs-Modus (zum Nutzen anmelden)"}
                >
                  <ImagePlus className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant={videoMode ? "default" : "ghost"}
                  onClick={handleVideoButton}
                  className="rounded-full h-8 w-8"
                  title={lang === "en" ? "Video generation mode (sign in to use)" : "Videogenerierungs-Modus (zum Nutzen anmelden)"}
                >
                  <Video className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={premiumClick}
                  className="rounded-full h-8 w-8"
                  title={lang === "en" ? "Voice chat (sign in)" : "Sprach-Chat (anmelden)"}
                >
                  <Mic className="h-4 w-4" />
                </Button>
              </PopoverContent>
            </Popover>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              disabled={limitReached || sending}
              placeholder={
                limitReached
                  ? lang === "en" ? "Sign in to continue…" : "Zum Fortfahren anmelden…"
                  : imageMode
                  ? lang === "en"
                    ? "Sign in to generate images…"
                    : "Zum Bilder-Generieren anmelden…"
                  : videoMode
                  ? lang === "en"
                    ? "Sign in to generate videos…"
                    : "Zum Video-Generieren anmelden…"
                  : lang === "en"
                  ? "Ask QuillAI anything..."
                  : "Frage QuillAI etwas..."
              }
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground max-h-40 disabled:cursor-not-allowed min-h-[34px]"
            />
            <Button type="submit" size="icon" disabled={sending || !input.trim() || limitReached} className="rounded-full h-8 w-8">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>
      <AlertDialog open={lustifyGateOpen} onOpenChange={setLustifyGateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {lang === "en" ? "Registration required" : "Registrierung erforderlich"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {lang === "en"
                ? "This feature is only available to registered and verified users. Please create an account or sign in."
                : "Diese Funktion steht nur registrierten und verifizierten Nutzern zur Verfügung. Bitte erstelle ein Konto oder logge dich ein."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {lang === "en" ? "Cancel" : "Abbrechen"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setLustifyGateOpen(false);
                navigate({ to: "/auth" });
              }}
            >
              {lang === "en" ? "Sign in / Register now" : "Jetzt einloggen / Registrieren"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}