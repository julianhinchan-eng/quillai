import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LifeBuoy, X, Send } from "lucide-react";
import { askQuillSupport } from "@/lib/support.functions";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

export function SupportWidget() {
  const { lang } = useI18n();
  const ask = useServerFn(askQuillSupport);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const de = lang === "de";

  const greeting: Msg = {
    role: "assistant",
    content: de
      ? "Hi 👋 Ich bin Support und Info. Frag mich zu Tarifen, Installation oder Kündigung."
      : "Hi 👋 I am Support and Info. Ask me about plans, installation or cancellation.",
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await ask({ data: { messages: next, lang: de ? "de" : "en" } });
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch (e) {
      console.error("[SupportWidget] send", e);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: de
            ? "Hmm, gerade gibt's ein Problem. Bitte versuche es gleich noch einmal."
            : "Something went wrong. Please try again in a moment.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const displayMessages: Msg[] = messages.length ? messages : [greeting];

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3">
      {open && (
        <div className="relative w-[min(360px,calc(100vw-2rem))] rounded-xl border-[0.5px] border-border bg-card/95 text-card-foreground backdrop-blur-xl shadow-[0_20px_60px_-20px_oklch(0.18_0.015_270_/_0.25)] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="pointer-events-none absolute -top-px -left-px h-2.5 w-2.5 border-t border-l border-accent/60" />
          <span className="pointer-events-none absolute -top-px -right-px h-2.5 w-2.5 border-t border-r border-accent/60" />
          <span className="pointer-events-none absolute -bottom-px -left-px h-2.5 w-2.5 border-b border-l border-accent/60" />
          <span className="pointer-events-none absolute -bottom-px -right-px h-2.5 w-2.5 border-b border-r border-accent/60" />

          <div className="flex items-center justify-between border-b-[0.5px] border-border px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
                {de ? "Support und Info (KI)" : "Support and Info (AI)"}
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label={de ? "Schließen" : "Close"}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div ref={scrollRef} className="max-h-80 min-h-[200px] overflow-y-auto px-3 py-3 space-y-2.5 bg-background/40">
            {displayMessages.map((m, i) => (
              <div key={i} className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "text-sm leading-relaxed whitespace-pre-wrap max-w-[85%]",
                    m.role === "user"
                      ? "rounded-xl bg-primary text-primary-foreground px-3 py-2"
                      : "text-foreground",
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="text-xs text-muted-foreground tracking-wide">
                {de ? "… denkt nach" : "… thinking"}
              </div>
            )}
          </div>

          <div className="border-t-[0.5px] border-border px-2 py-2 flex items-center gap-2 bg-card/80">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={de ? "Frag Support und Info…" : "Ask Support and Info…"}
              className="flex-1 bg-transparent px-2 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none"
              disabled={busy}
            />
            <button
              onClick={send}
              disabled={busy || !input.trim()}
              className="h-7 w-7 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Support"
        title="Support"
        className="group relative h-12 w-12 rounded-full border-[0.5px] border-border bg-card/90 backdrop-blur-md text-foreground shadow-[0_10px_30px_-10px_oklch(0.18_0.015_270_/_0.25)] hover:bg-secondary transition-colors flex items-center justify-center"
      >
        <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-accent/20" />
        {open ? <X className="h-4 w-4" /> : <LifeBuoy className="h-5 w-5" strokeWidth={1.5} />}
        <span className="sr-only">Support</span>
        <span className="absolute -top-1 -right-1 text-[8px] tracking-[0.2em] uppercase text-muted-foreground bg-card border-[0.5px] border-border rounded px-1 py-px hidden sm:inline-block">
          Support
        </span>
      </button>
    </div>
  );
}