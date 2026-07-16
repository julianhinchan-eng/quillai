import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { PaywallModal } from "@/components/PaywallModal";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { highlightPlanNames } from "@/lib/highlight-plans";
import { useSubscriptionStatus } from "@/lib/use-subscription";
import { askQuillAI, extendQuillVideo, generateQuillImage, generateQuillVideo, getMyPremiumUsage, transformQuillImage } from "@/lib/ai-chat.functions";
import type { Specialization } from "@/lib/ai-chat.functions";
import { generateLustifyImage } from "@/lib/lustify-client";
import {
  createConversation,
  appendMessage,
  getConversationMessages,
  generateConversationTitle,
  listConversations,
  type StoredMsg,
} from "@/lib/ai-conversations.functions";
import {
  extractFileText,
  detectKind,
  MAX_ATTACHMENT_BYTES,
} from "@/lib/extract-file-text";
import { Sparkles, Send, Loader2, ImagePlus, Paperclip, FileText, X, Image as ImageIcon, Video, Download, ChevronDown, Check, Plus, Mic, MessageCircle } from "lucide-react";
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
import { toast } from "sonner";
import { useAuthUser } from "@/lib/use-auth";
import { GuestChat } from "@/components/GuestChat";
import { VoiceChat } from "@/components/VoiceChat";

export const Route = createFileRoute("/ai-chat")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    c: typeof s.c === "string" ? s.c : undefined,
  }),
  component: AiChatRoute,
});

function AiChatRoute() {
  const { user, loading } = useAuthUser();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <GuestChat />;
  return <AiChatPage />;
}

type Msg =
  | {
      role: "user";
      content: string;
      kind?: "text" | "image-request" | "video-request";
      fileName?: string;
      imagePreview?: string;
    }
  | {
      role: "assistant";
      content: string;
      kind?: "text" | "image" | "video";
      imageUrl?: string;
      videoUrl?: string;
      prompt?: string;
      isExtension?: boolean;
    };

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

// Phrases that, combined with an attached image, indicate the user wants
// an Image-to-Image transformation rather than vision analysis.
const IMAGE_TRANSFORM_TRIGGERS = [
  /\bmach(e)?\b.*\b(daraus|davon|bild)\b/i,
  /\bverwandle\b/i,
  /\bverändere\b.*\b(stil|bild|farbe|hintergrund)\b/i,
  /\bändere\b.*\b(stil|bild|farbe|hintergrund)\b/i,
  /\bim stil\b/i,
  /\bals (anime|ölgemälde|cartoon|skizze|zeichnung|aquarell|pixar|comic)\b/i,
  /\bzeichne\b/i,
  /\bmal(e)?\b/i,
  /\bturn (this|it|the image) into\b/i,
  /\bmake (it|this) (a|an|look)\b/i,
  /\bin the style of\b/i,
  /\bas (an? )?(anime|oil painting|cartoon|sketch|drawing|watercolor|pixar|comic)\b/i,
  /\bstyle (it|this) (as|like)\b/i,
  /\btransform\b/i,
  /\bredraw\b/i,
  /\brepaint\b/i,
];

function looksLikeImageTransform(text: string) {
  return IMAGE_TRANSFORM_TRIGGERS.some((r) => r.test(text));
}

const ACCEPT = ".pdf,.docx,.txt,.csv,.png,.jpg,.jpeg";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_EXT = /\.(png|jpe?g)$/i;
const LAST_CHAT_KEY = "quill.lastChatId";
const SKIP_RESUME_KEY = "quill.skipResume";
const SPECIALIZATION_KEY = "quill.specialization";

type SpecOption = {
  id: Specialization;
  emoji: string;
  label: { de: string; en: string };
  desc: { de: string; en: string };
};

const SPEC_OPTIONS: SpecOption[] = [
  {
    id: "universal",
    emoji: "🤖",
    label: { de: "Universal-Assistent", en: "Universal Assistant" },
    desc: {
      de: "Der normale, flexible Standard-Modus",
      en: "The flexible default mode",
    },
  },
  {
    id: "business",
    emoji: "💼",
    label: { de: "Business & Startup-Berater", en: "Business & Startup Advisor" },
    desc: {
      de: "Businesspläne, Marketingstrategien und E-Mails",
      en: "Business plans, marketing strategies, emails",
    },
  },
  {
    id: "copywriter",
    emoji: "📝",
    label: { de: "Copywriter & Content-Creator", en: "Copywriter & Content Creator" },
    desc: {
      de: "Packende Social-Media-Posts, Blogs und kreative Texte",
      en: "Punchy social posts, blogs, creative copy",
    },
  },
  {
    id: "code",
    emoji: "💻",
    label: { de: "Code-Experte & Debugger", en: "Code Expert & Debugger" },
    desc: {
      de: "Sauberer Programmiercode, Logik und Fehlersuche",
      en: "Clean code, logic, debugging",
    },
  },
  {
    id: "teacher",
    emoji: "🎓",
    label: { de: "Lehrer & Erklär-Assistent", en: "Teacher & Explainer" },
    desc: {
      de: "Komplexe Themen einfach erklärt, Lernpläne",
      en: "Simple explanations and learning plans",
    },
  },
  {
    id: "legal",
    emoji: "⚖️",
    label: { de: "Recht & Bürokratie-Helfer", en: "Legal & Bureaucracy Helper" },
    desc: {
      de: "Verträge und offizielle Briefe verstehen",
      en: "Understand contracts and official letters",
    },
  },
];

function isImageFile(file: File) {
  return file.type.startsWith("image/") || IMAGE_EXT.test(file.name);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

function looksLikeImageRequest(text: string) {
  return IMAGE_TRIGGERS.some((r) => r.test(text));
}

function stripImagePrefix(text: string) {
  return text.replace(/^\s*\/image\s*/i, "").trim();
}

function looksLikeVideoRequest(text: string) {
  return VIDEO_TRIGGERS.some((r) => r.test(text));
}

function stripVideoPrefix(text: string) {
  return text.replace(/^\s*\/video\s*/i, "").trim();
}

type Attachment =
  | { kind: "doc"; file: File; text: string }
  | { kind: "image"; file: File; dataUrl: string };

function AiChatPage() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const { c: activeId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { hasActiveSubscription, status, refresh } = useSubscriptionStatus();
  const currentTier = status?.subscription?.tier ?? null;
  const isStandardTier = currentTier === "standard";
  const ask = useServerFn(askQuillAI);
  const genImage = useServerFn(generateQuillImage);
  const transformImage = useServerFn(transformQuillImage);
  const genVideo = useServerFn(generateQuillVideo);
  const extendVideo = useServerFn(extendQuillVideo);
  const createConvo = useServerFn(createConversation);
  const appendMsg = useServerFn(appendMessage);
  const fetchMessages = useServerFn(getConversationMessages);
  const genTitle = useServerFn(generateConversationTitle);
  const listFn = useServerFn(listConversations);
  const fetchUsage = useServerFn(getMyPremiumUsage);

  const usageQ = useQuery({
    queryKey: ["premium-usage"],
    queryFn: () => fetchUsage(),
    enabled: hasActiveSubscription,
    staleTime: 10_000,
  });

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const [videoMode, setVideoMode] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [extendingIdx, setExtendingIdx] = useState<number | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallReason, setPaywallReason] = useState<"image-gen" | "file" | "image-analysis" | "video-gen" | "video-upgrade" | "voice">(
    "image-gen",
  );
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [specialization, setSpecialization] = useState<Specialization>("universal");
  const [imageModel, setImageModel] = useState<"gemini" | "flux" | "lustify">("gemini");
  const [ageGateOpen, setAgeGateOpen] = useState(false);
  const AGE_KEY = "lustify_age_confirmed_18";
  const TOS_KEY = "lustify_tos_accepted";
  const [tosOpen, setTosOpen] = useState(false);
  // Geo-block Lustify for users in regulated regions (client-side hint; server enforces).
  const isBlockedRegion = (() => {
    if (typeof window === "undefined") return false;
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      const blockedTz = [
        "Europe/Berlin", "Europe/Busingen",       // DE
        "Europe/London",                           // GB
        "Europe/Paris",                            // FR
        "Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane",
        "Australia/Perth", "Australia/Adelaide", "Australia/Hobart",
        "Australia/Darwin",                        // AU
        "America/Sao_Paulo", "America/Fortaleza", "America/Recife",
        "America/Bahia", "America/Belem", "America/Manaus",           // BR
      ];
      if (blockedTz.includes(tz)) return true;
      const langs = [navigator.language, ...(navigator.languages || [])];
      const blockedLangs = ["de-de", "en-gb", "fr-fr", "pt-br", "en-au"];
      if (langs.some((l) => l && blockedLangs.includes(l.toLowerCase()))) return true;
    } catch { /* ignore */ }
    return false;
  })();
  const handleSelectLustify = () => {
    if (isBlockedRegion) {
      toast.error(
        lang === "en"
          ? "Lustify V8 is not available in your region."
          : "Lustify V8 ist in deiner Region nicht verfügbar.",
      );
      return;
    }
    const ageOk = typeof window !== "undefined" && window.localStorage.getItem(AGE_KEY) === "1";
    const tosOk = typeof window !== "undefined" && window.localStorage.getItem(TOS_KEY) === "1";
    if (ageOk && tosOk) {
      setImageModel("lustify");
    } else if (!ageOk) {
      setAgeGateOpen(true);
    } else {
      setTosOpen(true);
    }
  };
  const confirmAgeGate = () => {
    try { window.localStorage.setItem(AGE_KEY, "1"); } catch { /* ignore */ }
    setAgeGateOpen(false);
    // After age confirmation, require ToS acceptance before enabling the module.
    if (typeof window !== "undefined" && window.localStorage.getItem(TOS_KEY) === "1") {
      setImageModel("lustify");
    } else {
      setTosOpen(true);
    }
  };
  const confirmTos = () => {
    try { window.localStorage.setItem(TOS_KEY, "1"); } catch { /* ignore */ }
    setTosOpen(false);
    setImageModel("lustify");
  };
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(SPECIALIZATION_KEY);
    if (stored && SPEC_OPTIONS.some((o) => o.id === stored)) {
      setSpecialization(stored as Specialization);
    }
  }, []);

  const setSpec = (id: Specialization) => {
    setSpecialization(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SPECIALIZATION_KEY, id);
    }
  };

  const activeSpec = SPEC_OPTIONS.find((o) => o.id === specialization) ?? SPEC_OPTIONS[0];
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Tracks which conversation id's server data we have already merged into
  // local state. Prevents an empty refetch from wiping optimistic messages
  // right after we navigate to a freshly created conversation.
  const loadedIdRef = useRef<string | null>(null);

  const messagesQ = useQuery({
    queryKey: ["ai-messages", activeId],
    queryFn: () => fetchMessages({ data: { conversationId: activeId! } }),
    enabled: !!activeId,
  });

  const conversationsQ = useQuery({
    queryKey: ["ai-conversations"],
    queryFn: () => listFn(),
    staleTime: 5_000,
  });

  // Resume a persisted conversation on direct loads/reloads without ?c=.
  // This uses the backend history, not only localStorage, so saved chats
  // still come back in fresh sessions. "+ New Chat" sets SKIP_RESUME_KEY
  // to intentionally keep the screen empty until the first new message.
  useEffect(() => {
    if (activeId) return;
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(SKIP_RESUME_KEY) === "1") {
      window.sessionStorage.removeItem(SKIP_RESUME_KEY);
      return;
    }
    if (conversationsQ.isLoading) return;

    const conversations = conversationsQ.data ?? [];
    const last = window.localStorage.getItem(LAST_CHAT_KEY);
    const restoreId =
      last && conversations.some((conversation) => conversation.id === last)
        ? last
        : conversations[0]?.id;

    if (restoreId) navigate({ search: { c: restoreId }, replace: true });
  }, [activeId, conversationsQ.data, conversationsQ.isLoading, navigate]);

  // Remember the active chat so a reload returns to it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeId) window.localStorage.setItem(LAST_CHAT_KEY, activeId);
  }, [activeId]);

  // Sync server messages → local state. Clear immediately when switching
  // to a different chat, then fill in once server data arrives. Don't
  // overwrite once loaded (refetches would wipe optimistic messages).
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      loadedIdRef.current = null;
      return;
    }
    const stored = messagesQ.data as unknown as Msg[] | undefined;
    if (loadedIdRef.current === activeId && (!stored || stored.length <= messages.length)) return;
    // New active id: clear stale messages from the previous chat right away.
    if (loadedIdRef.current !== activeId) setMessages([]);
    if (stored) {
      setMessages(stored);
      loadedIdRef.current = activeId;
    }
  }, [activeId, messagesQ.data, messages.length]);

  const cacheStoredMessage = useCallback(
    (conversationId: string, message: StoredMsg) => {
      qc.setQueryData<StoredMsg[]>(["ai-messages", conversationId], (old) => [
        ...(old ?? []),
        message,
      ]);
    },
    [qc],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);


  const openPaywall = (reason: "image-gen" | "file" | "image-analysis" | "video-gen" | "video-upgrade" | "voice") => {
    setPaywallReason(reason);
    setPaywallOpen(true);
  };

  // Free users: still open the file picker so we can show the right paywall
  // (document vs image analysis) based on what they selected.
  const handleFileButton = () => {
    fileInputRef.current?.click();
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const asImage = isImageFile(file);

    if (!hasActiveSubscription) {
      openPaywall(asImage ? "image-analysis" : "file");
      return;
    }

    if (!asImage && !detectKind(file)) {
      toast.error(
        lang === "en"
          ? "Unsupported file type. Allowed: PDF, DOCX, TXT, CSV, PNG, JPG."
          : "Dateityp nicht unterstützt. Erlaubt: PDF, DOCX, TXT, CSV, PNG, JPG.",
      );
      return;
    }

    const limit = asImage ? MAX_IMAGE_BYTES : MAX_ATTACHMENT_BYTES;
    if (file.size > limit) {
      toast.error(
        lang === "en"
          ? "File too large. Maximum size is 10 MB."
          : "Datei zu groß. Maximale Größe ist 10 MB.",
      );
      return;
    }

    setExtracting(true);
    try {
      if (asImage) {
        const dataUrl = await readAsDataUrl(file);
        setAttachment({ kind: "image", file, dataUrl });
      } else {
        const { text } = await extractFileText(file);
        if (!text) {
          toast.error(
            lang === "en"
              ? "Could not extract any text from this file."
              : "Aus dieser Datei konnte kein Text extrahiert werden.",
          );
          return;
        }
        setAttachment({ kind: "doc", file, text });
      }
    } catch (err) {
      console.error("[QuillAI] file parse error", err);
      toast.error(
        lang === "en" ? "Failed to read the file." : "Datei konnte nicht gelesen werden.",
      );
    } finally {
      setExtracting(false);
    }
  };

  const send = useCallback(
    async (rawText: string, forceImage = false) => {
      const value = rawText.trim();
      if ((!value && !attachment) || sending) return;

      // Ensure we have a conversation id before sending the first message.
      // If the URL points to a stale/deleted conversation, drop it and create a new one.
      const knownIds = conversationsQ.data?.map((c) => c.id) ?? [];
      const activeIsStale =
        !!activeId && conversationsQ.isSuccess && !knownIds.includes(activeId);
      let convoId = activeIsStale ? null : activeId ?? null;
      const isFirstMessage = !convoId || messages.length === 0;
      if (!convoId) {
        try {
          const row = await createConvo({
            data: { title: lang === "en" ? "New chat" : "Neuer Chat" },
          });
          convoId = row.id;
          // Mark this conversation as "already loaded" so the empty
          // refetch triggered by the URL change doesn't wipe the
          // optimistic user/assistant messages we set below.
          loadedIdRef.current = row.id;
          qc.setQueryData(["ai-messages", row.id], []);
          qc.setQueryData<Array<typeof row>>(["ai-conversations"], (old) => [
            row,
            ...(old ?? []).filter((conversation) => conversation.id !== row.id),
          ]);
          qc.invalidateQueries({ queryKey: ["ai-conversations"] });
          if (typeof window !== "undefined") {
            window.sessionStorage.removeItem(SKIP_RESUME_KEY);
            window.localStorage.setItem(LAST_CHAT_KEY, row.id);
          }
          navigate({ search: { c: row.id }, replace: true });
        } catch (e) {
          console.error("[QuillAI] create conversation failed", e);
          toast.error(lang === "en" ? "Could not start chat." : "Chat konnte nicht gestartet werden.");
          return;
        }
      }

      const isVideo = videoMode || (value && looksLikeVideoRequest(value));
      const isImageAttached = attachment?.kind === "image";
      const isImage =
        !isVideo &&
        (forceImage ||
          imageMode ||
          (value && looksLikeImageRequest(value)) ||
          (isImageAttached && value && looksLikeImageTransform(value)));

      if (isVideo) {
        if (!hasActiveSubscription) {
          openPaywall("video-gen");
          return;
        }
        if (isStandardTier) {
          openPaywall("video-upgrade");
          return;
        }
        const prompt = stripVideoPrefix(value);
        const videoImage = attachment?.kind === "image" ? attachment.dataUrl : undefined;
        const userMsg: Msg = {
          role: "user",
          content: value,
          kind: "video-request",
          imagePreview: videoImage,
          fileName: attachment?.kind === "image" ? attachment.file.name : undefined,
        };
        const next = [...messages, userMsg];
        setMessages(next);
        setInput("");
        setVideoMode(false);
        setAttachment(null);
        setSending(true);
        setGeneratingVideo(true);
        try {
          await appendMsg({
            data: { conversationId: convoId!, message: userMsg as StoredMsg },
          })
            .then(() => cacheStoredMessage(convoId!, userMsg as StoredMsg))
            .catch((e) => console.error("[QuillAI] persist user msg failed", e));
          const res = await genVideo({ data: { prompt, imageUrl: videoImage } });
          const aiMsg: Msg = {
            role: "assistant",
            kind: "video",
            videoUrl: res.videoUrl,
            prompt,
            content: lang === "en" ? "Here's your video:" : "Hier ist dein Video:",
          };
          setMessages((p) => [...p, aiMsg]);
          await appendMsg({
            data: { conversationId: convoId!, message: aiMsg as StoredMsg },
          })
            .then(() => cacheStoredMessage(convoId!, aiMsg as StoredMsg))
            .catch((e) => console.error("[QuillAI] persist ai video failed", e));
          qc.invalidateQueries({ queryKey: ["premium-usage"] });
          if (isFirstMessage) {
            genTitle({ data: { conversationId: convoId!, firstMessage: value || "Video" } })
              .then(() => qc.invalidateQueries({ queryKey: ["ai-conversations"] }))
              .catch(() => {});
          }
        } catch (e: any) {
          const msg = String(e?.message ?? "");
          setMessages(messages);
          if (msg.includes("VIDEO_REQUIRES_ULTIMATE")) openPaywall("video-upgrade");
          else if (msg.includes("PREMIUM_REQUIRED")) openPaywall("video-gen");
          else if (msg.includes("MONTHLY_VIDEO_LIMIT"))
            toast.error(t("paywall.limit_reached_video"));
          else toast.error(lang === "en" ? "Video generation failed." : "Videogenerierung fehlgeschlagen.");
        } finally {
          setGeneratingVideo(false);
          setSending(false);
          inputRef.current?.focus();
        }
        return;
      }

      if (isImage) {
        if (imageModel !== "lustify" && !hasActiveSubscription) {
          openPaywall("image-gen");
          return;
        }
        const prompt = stripImagePrefix(value);
        const sourceImage = attachment?.kind === "image" ? attachment.dataUrl : undefined;
        const sourceName = attachment?.kind === "image" ? attachment.file.name : undefined;
        const userMsg: Msg = {
          role: "user",
          content: value,
          kind: "image-request",
          imagePreview: sourceImage,
          fileName: sourceName,
        };
        const next = [...messages, userMsg];
        setMessages(next);
        setInput("");
        setImageMode(false);
        setAttachment(null);
        setSending(true);
        try {
          await appendMsg({
            data: { conversationId: convoId!, message: userMsg as StoredMsg },
          })
            .then(() => cacheStoredMessage(convoId!, userMsg as StoredMsg))
            .catch((e) => console.error("[QuillAI] persist user msg failed", e));
          const res = sourceImage
            ? await transformImage({ data: { prompt, imageUrl: sourceImage } })
            : imageModel === "lustify"
              ? await generateLustifyImage(prompt)
              : await genImage({ data: { prompt, model: imageModel } });
          const aiMsg: Msg = {
            role: "assistant",
            kind: "image",
            imageUrl: res.imageDataUrl,
            content: sourceImage
              ? lang === "en"
                ? "Here's your transformed image:"
                : "Hier ist dein verwandeltes Bild:"
              : lang === "en"
              ? "Here's your image:"
              : "Hier ist dein Bild:",
          };
          setMessages((p) => [...p, aiMsg]);
          await appendMsg({
            data: { conversationId: convoId!, message: aiMsg as StoredMsg },
          })
            .then(() => cacheStoredMessage(convoId!, aiMsg as StoredMsg))
            .catch((e) => console.error("[QuillAI] persist ai img failed", e));
          qc.invalidateQueries({ queryKey: ["premium-usage"] });
          if (isFirstMessage) {
            genTitle({ data: { conversationId: convoId!, firstMessage: value || "Image" } })
              .then(() => qc.invalidateQueries({ queryKey: ["ai-conversations"] }))
              .catch(() => {});
          }
        } catch (e: any) {
          const msg = String(e?.message ?? "");
          setMessages(messages);
          if (msg.includes("LUSTIFY_GEO_BLOCKED"))
            toast.error(lang === "en" ? "Lustify V8 is not available in your region." : "Lustify V8 ist in deiner Region nicht verfügbar.");
          else if (msg.includes("PREMIUM_REQUIRED")) openPaywall("image-gen");
          else if (msg.includes("MONTHLY_IMAGE_LIMIT"))
            toast.error(t("paywall.limit_reached_image"));
          else if (msg.includes("RATE_LIMIT"))
            toast.error(lang === "en" ? "Too many requests. Please try again shortly." : "Zu viele Anfragen. Bitte gleich nochmal versuchen.");
          else if (msg.includes("CREDITS_EXHAUSTED"))
            toast.error(lang === "en" ? "AI credits exhausted." : "KI-Guthaben aufgebraucht.");
          else toast.error(lang === "en" ? "Image generation failed." : "Bildgenerierung fehlgeschlagen.");
        } finally {
          setSending(false);
          inputRef.current?.focus();
        }
        return;
      }

      // Build display + payload content for text chat
      const isImageAttach = attachment?.kind === "image";
      const isDocAttach = attachment?.kind === "doc";

      const displayContent =
        value ||
        (isImageAttach
          ? lang === "en"
            ? "(Analyze this image)"
            : "(Dieses Bild analysieren)"
          : lang === "en"
          ? "(Analyze this document)"
          : "(Dieses Dokument analysieren)");

      const userMsg: Msg = {
        role: "user",
        content: displayContent,
        fileName: attachment?.file.name,
        imagePreview: isImageAttach ? attachment!.dataUrl : undefined,
      };

      // Build server payload
      let payloadContent:
        | string
        | Array<
            | { type: "text"; text: string }
            | { type: "image_url"; image_url: { url: string } }
          > = value;

      if (isDocAttach) {
        const header =
          lang === "en"
            ? `The user attached a document named "${attachment!.file.name}". Use its content below to answer their question.`
            : `Der Nutzer hat ein Dokument namens "${attachment!.file.name}" angehängt. Nutze dessen Inhalt unten, um die Frage zu beantworten.`;
        payloadContent =
          `${header}\n\n--- DOCUMENT START ---\n${attachment!.text}\n--- DOCUMENT END ---\n\n` +
          (value ||
            (lang === "en"
              ? "Please summarize and analyze this document."
              : "Bitte fasse dieses Dokument zusammen und analysiere es."));
      } else if (isImageAttach) {
        const ask =
          value ||
          (lang === "en"
            ? "Please describe and analyze this image in detail."
            : "Bitte beschreibe und analysiere dieses Bild ausführlich.");
        payloadContent = [
          { type: "text", text: ask },
          { type: "image_url", image_url: { url: attachment!.dataUrl } },
        ];
      }

      const next: Msg[] = [...messages, userMsg];
      setMessages(next);
      setInput("");
      const sentAttachment = attachment;
      setAttachment(null);
      setSending(true);
      try {
        await appendMsg({
          data: { conversationId: convoId!, message: userMsg as StoredMsg },
          })
            .then(() => cacheStoredMessage(convoId!, userMsg as StoredMsg))
            .catch((e) => console.error("[QuillAI] persist user msg failed", e));
        const textMessages = next
          .filter((m) => m.kind !== "image" && m.kind !== "image-request")
          .map((m, idx) => ({
            role: m.role,
            content: idx === next.length - 1 ? payloadContent : m.content,
          }));
        const res = await ask({ data: { messages: textMessages, specialization } });
        const aiMsg: Msg = { role: "assistant", content: res.reply || "…" };
        setMessages((prev) => [...prev, aiMsg]);
        await appendMsg({
          data: { conversationId: convoId!, message: aiMsg as StoredMsg },
        })
          .then(() => cacheStoredMessage(convoId!, aiMsg as StoredMsg))
          .catch((e) => console.error("[QuillAI] persist ai msg failed", e));
        if (isFirstMessage) {
          const seed = value || (isImageAttach ? "Image analysis" : "Document analysis");
          genTitle({ data: { conversationId: convoId!, firstMessage: seed } })
            .then(() => qc.invalidateQueries({ queryKey: ["ai-conversations"] }))
            .catch(() => {});
        }
      } catch (e: any) {
        const msg = String(e?.message ?? "");
        if (msg.includes("RATE_LIMIT")) {
          toast.error(lang === "en" ? "Too many requests. Please try again shortly." : "Zu viele Anfragen. Bitte gleich nochmal versuchen.");
        } else if (msg.includes("CREDITS_EXHAUSTED")) {
          toast.error(lang === "en" ? "AI credits exhausted." : "KI-Guthaben aufgebraucht.");
        } else {
          toast.error(lang === "en" ? "Something went wrong." : "Etwas ist schiefgelaufen.");
        }
        setMessages(messages);
        setAttachment(sentAttachment);
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [ask, genImage, genVideo, messages, sending, videoMode, lang, hasActiveSubscription, attachment, activeId, appendMsg, createConvo, genTitle, navigate, qc, cacheStoredMessage, specialization, conversationsQ.data],
  );

  const handleExtendVideo = useCallback(
    async (idx: number, prompt: string) => {
      if (!activeId || extendingIdx !== null || sending) return;
      if (!hasActiveSubscription) {
        openPaywall("video-gen");
        return;
      }
      if (isStandardTier) {
        openPaywall("video-upgrade");
        return;
      }
      setExtendingIdx(idx);
      setSending(true);
      setGeneratingVideo(true);
      try {
        const res = await extendVideo({ data: { prompt } });
        const aiMsg: Msg = {
          role: "assistant",
          kind: "video",
          videoUrl: res.videoUrl,
          prompt,
          isExtension: true,
          content:
            lang === "en"
              ? "Here are the extra 8 seconds (continuation):"
              : "Hier sind die zusätzlichen 8 Sekunden (Fortsetzung):",
        };
        setMessages((p) => [...p, aiMsg]);
        await appendMsg({
          data: { conversationId: activeId, message: aiMsg as StoredMsg },
        })
          .then(() => cacheStoredMessage(activeId, aiMsg as StoredMsg))
          .catch((e) => console.error("[QuillAI] persist extension failed", e));
        qc.invalidateQueries({ queryKey: ["premium-usage"] });
      } catch (e: any) {
        const msg = String(e?.message ?? "");
        if (msg.includes("VIDEO_REQUIRES_ULTIMATE")) openPaywall("video-upgrade");
        else if (msg.includes("PREMIUM_REQUIRED")) openPaywall("video-gen");
        else if (msg.includes("MONTHLY_VIDEO_LIMIT"))
          toast.error(t("paywall.limit_reached_video"));
        else
          toast.error(
            lang === "en"
              ? "Video extension failed."
              : "Videoverlängerung fehlgeschlagen.",
          );
      } finally {
        setExtendingIdx(null);
        setGeneratingVideo(false);
        setSending(false);
      }
    },
    [activeId, appendMsg, cacheStoredMessage, extendVideo, extendingIdx, hasActiveSubscription, isStandardTier, lang, qc, sending, t],
  );

  if (status === null) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </AppShell>
    );
  }

  const empty = messages.length === 0;

  const paywallCopy = (() => {
    if (paywallReason === "file") {
      return {
        title: lang === "en" ? "Document analysis is Premium" : "Dokumenten-Analyse ist Premium",
        desc:
          lang === "en"
            ? "Document analysis is a premium feature. Upgrade to Premium for $10.00 per month to upload files and analyze documents with QuillAI."
            : "Dokumenten-Analyse ist eine Premium-Funktion. Upgrade auf Premium für 10,00 € im Monat, um Dateien hochzuladen und Dokumente mit QuillAI zu analysieren.",
      };
    }
    if (paywallReason === "image-analysis") {
      return {
        title: lang === "en" ? "Image analysis is Premium" : "Bild-Analyse ist eine Premium-Funktion",
        desc:
          lang === "en"
            ? "Image analysis is a premium feature. Upgrade to Premium to analyze photos and documents with QuillAI."
            : "Upgrade auf Premium, um Fotos und Dokumente mit QuillAI zu analysieren.",
      };
    }
    if (paywallReason === "video-gen") {
      return {
        title: lang === "en" ? "Video generation is Premium" : "Videogenerierung ist Premium",
        desc:
          lang === "en"
            ? "Video generation is included in the Ultimate Video plan ($10.00 per month). Pick your plan to get started."
            : "Videogenerierung ist im Ultimate Video Tarif (10,00 € im Monat) enthalten. Wähle deinen Tarif, um loszulegen.",
      };
    }
    if (paywallReason === "video-upgrade") {
      return {
        title: lang === "en" ? "Upgrade to Ultimate Video" : "Upgrade auf Ultimate Video",
        desc:
          lang === "en"
            ? "Video generation is included only in the Ultimate Video plan ($10.00 per month). Upgrade now to create up to 15 Runway AI videos per month."
            : "Videogenerierung ist nur im Ultimate Video Tarif (10,00 € im Monat) enthalten. Upgrade jetzt und erstelle bis zu 15 Runway-KI-Videos pro Monat.",
      };
    }
    if (paywallReason === "voice") {
      return {
        title: lang === "en" ? "Live Voice is Ultimate only" : "Live-Sprache nur im Ultimate-Tarif",
        desc:
          lang === "en"
            ? "Real-time voice chat is available exclusively in the Ultimate Video plan ($10.00 per month). Upgrade now to talk live with QuillAI."
            : "Der Live-Sprachchat ist ausschließlich im Ultimate Video Tarif (10,00 € im Monat) verfügbar. Upgrade jetzt, um live mit QuillAI zu sprechen.",
      };
    }
    return {
      title: lang === "en" ? "Image generation is Premium" : "Bildgenerierung ist Premium",
      desc:
        lang === "en"
          ? "Image generation is a premium feature. Upgrade to Premium to create AI images."
          : "Bildgenerierung ist eine Premium-Funktion. Upgrade auf Premium, um KI-Bilder zu erstellen.",
    };
  })();
  const paywallTitle = paywallCopy.title;
  const paywallDesc = paywallCopy.desc;

  const handleTextButton = () => {
    setImageMode(false);
    setVideoMode(false);
    inputRef.current?.focus();
  };

  const handleImageButton = () => {
    // Lustify uses Coinbase credit only — allow entering image mode without a subscription.
    if (imageModel !== "lustify" && !hasActiveSubscription) {
      openPaywall("image-gen");
      return;
    }
    setImageMode((v) => !v);
    setVideoMode(false);
    inputRef.current?.focus();
  };

  const handleVideoButton = () => {
    if (!hasActiveSubscription) {
      openPaywall("video-gen");
      return;
    }
    if (isStandardTier) {
      openPaywall("video-upgrade");
      return;
    }
    setVideoMode((v) => !v);
    setImageMode(false);
    inputRef.current?.focus();
  };

  const activeModelLabel = videoMode
    ? "Runway Veo 3.1 Fast"
    : imageMode
    ? imageModel === "flux"
      ? lang === "en" ? "FLUX.1 Fast" : "FLUX.1 Schnell"
      : imageModel === "lustify"
      ? "Lustify V8 (SDXL)"
      : "Gemini 2.5 Flash Image"
    : "Gemini 2.5 Flash";

  return (
    <AppShell>
      <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
        <div className="hidden sm:flex items-center gap-2 pb-4 border-b">
          <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-accent" />
          </div>
          <div className="font-semibold">QuillAI Chat</div>
          <div
            className="ml-2 hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-secondary/40 text-[10px] font-medium text-muted-foreground"
            title={lang === "en" ? "Active AI model" : "Aktives KI-Modell"}
          >
            <Sparkles className="h-2.5 w-2.5" />
            {activeModelLabel}
          </div>
          {hasActiveSubscription && usageQ.data && (
            <div className="ml-auto hidden sm:flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                {Math.max(0, usageQ.data.imageLimit - usageQ.data.imagesGenerated)} / {usageQ.data.imageLimit}
              </span>
              {usageQ.data.videoLimit > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Video className="h-3 w-3" />
                  {Math.max(0, usageQ.data.videoLimit - usageQ.data.videosGenerated)} / {usageQ.data.videoLimit}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="sm:hidden pb-2 border-b">
          <div
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-secondary/40 text-[10px] font-medium text-muted-foreground"
            title={lang === "en" ? "Active AI model" : "Aktives KI-Modell"}
          >
            <Sparkles className="h-2.5 w-2.5" />
            {activeModelLabel}
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto py-6 min-h-0">
          {empty ? (
            <div className="h-full" aria-hidden="true" />
          ) : (
            <div className="space-y-5">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "assistant" && m.kind === "image" && m.imageUrl ? (
                    <div className="max-w-[85%] space-y-2">
                      <div className="text-sm text-muted-foreground">{m.content}</div>
                      <img
                        src={m.imageUrl}
                        alt="Generated"
                        className="rounded-2xl border max-w-full h-auto"
                      />
                    </div>
                  ) : m.role === "assistant" && m.kind === "video" && m.videoUrl ? (
                    (() => {
                      const nextMsg = messages[i + 1] as Msg | undefined;
                      const alreadyExtended =
                        !!m.prompt &&
                        !m.isExtension &&
                        !!(nextMsg && nextMsg.role === "assistant" && nextMsg.kind === "video" && (nextMsg as any).isExtension);
                      const canExtend =
                        !!m.prompt &&
                        !m.isExtension &&
                        !alreadyExtended &&
                        hasActiveSubscription &&
                        !isStandardTier;
                      const videoCreditsLeft = usageQ.data
                        ? Math.max(0, usageQ.data.videoLimit - usageQ.data.videosGenerated)
                        : null;
                      const outOfCredits = videoCreditsLeft === 0;
                      const isExtendingThis = extendingIdx === i;
                      return (
                        <div className="max-w-[85%] space-y-2">
                          <div className="text-sm text-muted-foreground">{m.content}</div>
                          <video
                            src={m.videoUrl}
                            controls
                            playsInline
                            className="rounded-2xl border max-w-full h-auto bg-black"
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <a
                              href={m.videoUrl}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border hover:bg-secondary/60 transition-colors"
                            >
                              <Download className="h-3 w-3" />
                              {lang === "en" ? "Download video" : "Video herunterladen"}
                            </a>
                            {canExtend && (
                              <button
                                type="button"
                                onClick={() => handleExtendVideo(i, m.prompt!)}
                                disabled={isExtendingThis || sending || outOfCredits}
                                title={
                                  outOfCredits
                                    ? lang === "en"
                                      ? "No video credits left this month"
                                      : "Keine Video-Credits mehr in diesem Monat"
                                    : undefined
                                }
                                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isExtendingThis ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Plus className="h-3 w-3" />
                                )}
                                {lang === "en"
                                  ? "Extend by 8s (1 credit)"
                                  : "Um 8 s verlängern (1 Credit)"}
                              </button>
                            )}
                            {alreadyExtended && (
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                {lang === "en" ? "Extended · 16s total" : "Verlängert · 16 s gesamt"}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div
                      className={
                        m.role === "user"
                          ? "max-w-[85%] rounded-2xl px-4 py-2.5 bg-primary text-primary-foreground whitespace-pre-wrap break-words text-sm space-y-1.5"
                          : "max-w-[85%] whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground"
                      }
                    >
                      {m.role === "user" && m.imagePreview && (
                        <img
                          src={m.imagePreview}
                          alt={m.fileName ?? "attachment"}
                          className="rounded-lg max-h-48 w-auto object-cover border border-primary-foreground/20"
                        />
                      )}
                      {m.role === "user" && m.fileName && !m.imagePreview && (
                        <div className="inline-flex items-center gap-1.5 text-xs bg-primary-foreground/15 rounded-md px-2 py-1">
                          <FileText className="h-3 w-3" />
                          <span className="truncate max-w-[200px]">{m.fileName}</span>
                        </div>
                      )}
                      <div>{m.content}</div>
                    </div>
                  )}
                </div>
              ))}
              {sending && (
                generatingVideo ? (
                  <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 font-mono text-xs text-accent space-y-2">
                    <div className="tracking-wider">
                      {"[SYSTEM: GENERATING_AI_VIDEO_CLIP... PLEASE WAIT]"}
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent/10">
                      <div className="h-full w-1/3 rounded-full bg-accent animate-[techbar_1.4s_ease-in-out_infinite]" />
                    </div>
                    <div className="text-[10px] text-muted-foreground tracking-widest">
                      {lang === "en"
                        ? "Rendering neural frames · this may take a moment"
                        : "Neuronale Frames werden gerendert · das kann einen Moment dauern"}
                    </div>
                  </div>
                ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {lang === "en" ? "QuillAI is thinking…" : "QuillAI denkt nach…"}
                </div>
                )
              )}
            </div>
          )}
        </div>

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
                      onSelect={() => setSpec(opt.id)}
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

          {imageMode && hasActiveSubscription && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <div className="px-3 py-1.5 rounded-full bg-accent/10 text-xs text-accent inline-flex items-center gap-1.5">
                <ImagePlus className="h-3 w-3" />
                  {lang === "en"
                    ? attachment?.kind === "image"
                      ? "Image-to-Image — describe how to transform the attached photo"
                      : "Image mode — describe the image you want to create (optional: attach an image)"
                    : attachment?.kind === "image"
                    ? "Image-to-Image — beschreibe, wie das Foto verwandelt werden soll"
                    : "Bildmodus — beschreibe das gewünschte Bild ( optional: hänge ein Bild an )"}
              </div>
              {!attachment && (
                <div className="flex flex-wrap items-center gap-1 rounded-2xl border p-1 text-xs max-w-full">
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
                  {!isBlockedRegion && (
                    <button
                      type="button"
                      onClick={handleSelectLustify}
                      className={`px-2.5 py-1 rounded-full transition ${imageModel === "lustify" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      title="Lustify V8 (SDXL, NSFW)"
                    >
                      Lustify V8
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {videoMode && hasActiveSubscription && (
            <div className="mb-2 px-3 py-1.5 rounded-full bg-accent/10 text-xs text-accent inline-flex items-center gap-1.5">
              <Video className="h-3 w-3" />
              {lang === "en"
                ? "Video mode — describe the video you want to create (optional: attach an image)"
                : "Videomodus — beschreibe das gewünschte Video ( optional: hänge ein Bild an )"}
            </div>
          )}

          {attachment && (
            <div className="mb-2 flex items-center gap-2 rounded-xl border bg-secondary/40 px-3 py-2 text-sm">
              {attachment.kind === "image" ? (
                <img
                  src={attachment.dataUrl}
                  alt={attachment.file.name}
                  className="h-14 w-14 rounded-lg object-cover shrink-0 border"
                />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-accent" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{attachment.file.name}</div>
                <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  {attachment.kind === "image" && <ImageIcon className="h-3 w-3" />}
                  {(attachment.file.size / 1024).toFixed(0)} KB ·{" "}
                  {attachment.kind === "image" && imageMode
                    ? lang === "en"
                      ? "ready for Image-to-Image"
                      : "bereit für Image-to-Image"
                    : attachment.kind === "image" && videoMode
                    ? lang === "en"
                      ? "ready for Image-to-Video"
                      : "bereit für Image-to-Video"
                    : lang === "en"
                    ? "ready to analyze"
                    : "bereit zur Analyse"}
                </div>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                onClick={() => setAttachment(null)}
                title={lang === "en" ? "Remove file" : "Datei entfernen"}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {extracting && (
            <div className="mb-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {lang === "en" ? "Reading file..." : "Datei wird gelesen..."}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={onFileSelected}
          />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input, imageMode);
            }}
            className="flex items-end gap-1.5 rounded-xl border bg-card p-1.5 shadow-sm focus-within:ring-1 focus-within:ring-ring"
          >
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleFileButton}
              disabled={extracting || sending}
              className="rounded-full shrink-0 h-8 w-8"
              title={lang === "en" ? "Attach document (Premium)" : "Dokument anhängen (Premium)"}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleTextButton}
              className={`rounded-full shrink-0 hidden sm:inline-flex h-8 w-8 ${!imageMode && !videoMode ? "text-accent bg-accent/10" : ""}`}
              title={lang === "en" ? "Normal chat mode" : "Normaler Chat-Modus"}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleImageButton}
              className={`rounded-full shrink-0 hidden sm:inline-flex h-8 w-8 ${imageMode ? "text-accent bg-accent/10" : ""}`}
              title={lang === "en" ? "Generate image (Premium)" : "Bild generieren (Premium)"}
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleVideoButton}
              className={`rounded-full shrink-0 hidden sm:inline-flex h-8 w-8 ${videoMode ? "text-accent bg-accent/10" : ""}`}
              title={lang === "en" ? "Generate video (Premium)" : "Video generieren (Premium)"}
            >
              <Video className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => {
                if (currentTier !== "ultimate") {
                  openPaywall("voice");
                  return;
                }
                setVoiceOpen(true);
              }}
              className="rounded-full shrink-0 hidden sm:inline-flex h-8 w-8"
              title={lang === "en" ? "Live voice (Ultimate)" : "Live-Sprache (Ultimate)"}
            >
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
                  variant="ghost"
                  onClick={handleTextButton}
                  className={`rounded-full h-8 w-8 ${!imageMode && !videoMode ? "text-accent bg-accent/10" : ""}`}
                  title={lang === "en" ? "Normal chat mode" : "Normaler Chat-Modus"}
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={handleImageButton}
                  className={`rounded-full h-8 w-8 ${imageMode ? "text-accent bg-accent/10" : ""}`}
                  title={lang === "en" ? "Generate image (Premium)" : "Bild generieren (Premium)"}
                >
                  <ImagePlus className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={handleVideoButton}
                  className={`rounded-full h-8 w-8 ${videoMode ? "text-accent bg-accent/10" : ""}`}
                  title={lang === "en" ? "Generate video (Premium)" : "Video generieren (Premium)"}
                >
                  <Video className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (currentTier !== "ultimate") {
                      openPaywall("voice");
                      return;
                    }
                    setVoiceOpen(true);
                  }}
                  className="rounded-full h-8 w-8"
                  title={lang === "en" ? "Live voice (Ultimate)" : "Live-Sprache (Ultimate)"}
                >
                  <Mic className="h-4 w-4" />
                </Button>
              </PopoverContent>
            </Popover>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input, imageMode);
                }
              }}
              rows={1}
              placeholder={
                videoMode
                  ? lang === "en"
                    ? "Describe the video to generate..."
                    : "Beschreibe das zu generierende Video..."
                  : imageMode
                  ? lang === "en"
                    ? "Describe the image to generate..."
                    : "Beschreibe das zu generierende Bild..."
                  : attachment
                  ? lang === "en"
                    ? "Ask something about this document..."
                    : "Stelle eine Frage zu diesem Dokument..."
                  : lang === "en"
                  ? "Ask QuillAI anything..."
                  : "Frage QuillAI etwas..."
              }
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground max-h-40 disabled:cursor-not-allowed min-h-[34px]"
              disabled={sending}
            />
            <Button
              type="submit"
              size="icon"
              disabled={sending || (!input.trim() && !attachment)}
              className="rounded-full h-8 w-8"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      <PaywallModal
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        onSuccess={() => {
          refresh();
        }}
        title={paywallTitle}
        description={highlightPlanNames(paywallDesc)}
        forceTier={paywallReason === "video-upgrade" || paywallReason === "voice" ? "ultimate" : undefined}
      />
      <VoiceChat open={voiceOpen} onOpenChange={setVoiceOpen} lang={lang} />
      <AlertDialog open={ageGateOpen} onOpenChange={setAgeGateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {lang === "en" ? "Age verification required" : "Altersverifikation erforderlich"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {lang === "en"
                ? "Lustify V8 generates explicit adult (NSFW) images. By continuing you confirm that you are at least 18 years old and legally permitted to view adult content in your jurisdiction. Content involving minors, non-consensual acts, or real persons without consent is strictly prohibited."
                : "Lustify V8 erzeugt explizite Erwachseneninhalte (NSFW). Mit dem Fortfahren bestätigst du, dass du mindestens 18 Jahre alt und in deiner Rechtsordnung berechtigt bist, Erwachseneninhalte zu sehen. Inhalte mit Minderjährigen, nicht-einvernehmliche Handlungen oder reale Personen ohne Einwilligung sind strikt untersagt."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {lang === "en" ? "Cancel" : "Abbrechen"}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmAgeGate}>
              {lang === "en" ? "I am 18+ — continue" : "Ich bin 18+ — fortfahren"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={tosOpen} onOpenChange={setTosOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {lang === "en" ? "Terms of Service" : "Nutzungsbedingungen"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {lang === "en"
                ? "Please accept the Terms of Service to proceed."
                : "Bitte akzeptiere die Nutzungsbedingungen, um fortzufahren."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {lang === "en" ? "Cancel" : "Abbrechen"}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmTos}>
              {lang === "en" ? "Accept" : "Akzeptieren"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
