import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Sparkles, Settings, LogOut, Plus, Trash2, Loader2, Box, Pencil, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getSignedUrl } from "@/lib/media";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { InstallAppButton } from "@/components/InstallAppButton";
import { useI18n } from "@/lib/i18n";
import { useAuthUser } from "@/lib/use-auth";
import { BalanceBadge } from "@/components/BalanceBadge";
import {
  listConversations,
  deleteConversation,
} from "@/lib/ai-conversations.functions";

interface Me {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export function AppShell({ children, guest = false }: { children: React.ReactNode; guest?: boolean }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t, lang } = useI18n();
  const { user: authUser, loading: authLoading } = useAuthUser();
  const isGuest = guest || (!authLoading && !authUser);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const activeChatId = typeof search?.c === "string" ? (search.c as string) : null;
  const isChat = pathname === "/ai-chat";
  const [me, setMe] = useState<Me | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);

  const listFn = useServerFn(listConversations);
  const deleteFn = useServerFn(deleteConversation);

  const convosQ = useQuery({
    queryKey: ["ai-conversations"],
    queryFn: () => listFn(),
    enabled: !!me && !guest,
  });

  function startNewChat() {
    // Don't pre-create an empty conversation in the DB. We create it
    // lazily on the first message, otherwise reloads land in an empty
    // chat and look like the history is gone.
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("quill.lastChatId");
      window.sessionStorage.setItem("quill.skipResume", "1");
    }
    navigate({ to: "/ai-chat", search: {} as any });
    setMobileHistoryOpen(false);
  }

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["ai-conversations"] });
      qc.removeQueries({ queryKey: ["ai-messages", id] });
      if (activeChatId === id) navigate({ to: "/ai-chat", search: {} as any });
    },
  });

  useEffect(() => {
    if (guest) return;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .eq("id", auth.user.id)
        .single();
      if (data) {
        setMe(data);
        setAvatarSrc(await getSignedUrl(data.avatar_url));
      }
    })();
  }, [guest]);

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function goToAuth() {
    navigate({ to: "/auth", replace: true });
  }

  const navItems = [
    { to: "/ai-chat", label: t("nav.ai_chat"), icon: Sparkles },
    { to: "/3d-kreator", label: "3D-Kreator", icon: Box },
    { to: "/settings", label: t("nav.settings"), icon: Settings },
  ];

  const newChatLabel = lang === "en" ? "+ New Chat" : "+ Neuer Chat";
  const historyLabel = lang === "en" ? "History" : "Verlauf";
  const emptyHistory = lang === "en" ? "No chats yet" : "Noch keine Chats";
  const conversations = convosQ.data ?? [];

  return (
    <div className={`bg-background ${isChat ? "h-[calc(100dvh-68px)] md:h-screen overflow-hidden" : "min-h-screen"}`}>
      <div className={`${isChat ? "h-full" : "min-h-screen"}`}>
        <aside className="hidden md:flex fixed left-0 top-0 h-screen w-[264px] flex-col py-6 px-6 border-r-[0.5px] border-slate-200/80 overflow-hidden z-10">
          <Link to="/ai-chat" className="text-2xl font-semibold tracking-tight px-3 mb-2">
            quillai.online
          </Link>
          <div className="px-3 mb-6">
            <span className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              QuillAI
            </span>
          </div>
          <button
            onClick={startNewChat}
            className="mx-2 mb-3 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-medium bg-accent text-accent-foreground hover:opacity-90 transition"
          >
            <Plus className="h-4 w-4" />
            {newChatLabel}
          </button>
          <InstallAppButton variant="sidebar" />
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.to;
              const Icon = item.icon;
              const node = (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-full text-sm font-medium transition-colors ${
                    active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {item.label}
                </Link>
              );
              if (item.to !== "/ai-chat") return node;
              return (
                <div key={item.label}>
                  {node}
                  <div className="mt-2 mb-1 px-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {historyLabel}
                  </div>
                  <div className="max-h-[40vh] overflow-y-auto pr-1 space-y-0.5">
                    {convosQ.isLoading ? (
                      <div className="px-3 py-1.5 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin inline" />
                      </div>
                    ) : conversations.length === 0 ? (
                      <div className="px-3 py-1.5 text-xs text-muted-foreground">{emptyHistory}</div>
                    ) : (
                      conversations.map((c) => {
                        const isActive = activeChatId === c.id && pathname === "/ai-chat";
                        return (
                          <div
                            key={c.id}
                            className={`group flex items-center gap-1 rounded-lg pr-1 ${
                              isActive ? "bg-secondary" : "hover:bg-secondary/60"
                            }`}
                          >
                            <Link
                              to="/ai-chat"
                              search={{ c: c.id } as any}
                              className={`flex-1 min-w-0 px-2 py-1.5 text-sm truncate ${
                                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                              }`}
                              title={c.title}
                            >
                              {c.title}
                            </Link>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (confirm(lang === "en" ? "Delete this chat?" : "Diesen Chat löschen?")) {
                                  deleteMut.mutate(c.id);
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive transition"
                              title={lang === "en" ? "Delete" : "Löschen"}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="my-2 border-t border-slate-200/60" />
                </div>
              );
            })}
            <button
              onClick={isGuest ? goToAuth : handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-full text-sm font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
            >
              <LogOut className="h-[18px] w-[18px]" />
              {isGuest ? t("common.login") : t("nav.signout")}
            </button>
          </nav>

          <div className="mt-auto pt-4 border-t space-y-2">
            <div className="px-3 pt-2 flex items-center justify-between">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
            {me && (
              <div className="flex items-center gap-2 px-3 py-2">
                <Avatar className="h-9 w-9">
                  {avatarSrc && <AvatarImage src={avatarSrc} />}
                  <AvatarFallback className="bg-gradient-to-br from-accent to-accent/60 text-accent-foreground text-sm font-medium">
                    {me.display_name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{me.display_name}</div>
                  <div className="text-xs text-muted-foreground truncate">@{me.username}</div>
                </div>
              </div>
            )}
          </div>
        </aside>

        <main className={`min-w-0 flex flex-col px-4 md:px-6 lg:pl-10 md:ml-[264px] ${isChat ? "h-full overflow-hidden py-0 md:py-6" : "min-h-screen py-6"}`}>
          <div className="flex items-center justify-between gap-2 mb-3">
            {pathname === "/ai-chat" && (
              <div className="md:hidden flex items-center gap-1.5">
                <Button
                  type="button"
                  onClick={startNewChat}
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 shrink-0 rounded-lg"
                  aria-label={newChatLabel}
                  title={newChatLabel}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Sheet open={mobileHistoryOpen} onOpenChange={setMobileHistoryOpen}>
                  <SheetTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 shrink-0 rounded-lg"
                      aria-label={historyLabel}
                      title={historyLabel}
                    >
                      <History className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[88vw] max-w-sm p-5">
                    <SheetHeader className="text-left mb-5">
                      <SheetTitle>{historyLabel}</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-2">
                      {convosQ.isLoading ? (
                        <div className="px-2 py-3 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : conversations.length === 0 ? (
                        <div className="px-2 py-3 text-sm text-muted-foreground">{emptyHistory}</div>
                      ) : (
                        conversations.map((c) => {
                          const isActive = activeChatId === c.id && pathname === "/ai-chat";
                          return (
                            <div
                              key={c.id}
                              className={`group flex items-center gap-2 rounded-lg pr-1 ${
                                isActive ? "bg-secondary" : "hover:bg-secondary/60"
                              }`}
                            >
                              <Link
                                to="/ai-chat"
                                search={{ c: c.id } as any}
                                onClick={() => setMobileHistoryOpen(false)}
                                className={`flex-1 min-w-0 px-3 py-2 text-sm truncate ${
                                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                                }`}
                                title={c.title}
                              >
                                {c.title}
                              </Link>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (confirm(lang === "en" ? "Delete this chat?" : "Diesen Chat löschen?")) {
                                    deleteMut.mutate(c.id);
                                  }
                                }}
                                className="p-2 rounded text-muted-foreground hover:text-destructive transition"
                                title={lang === "en" ? "Delete" : "Löschen"}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            )}
            <div className="ml-auto">
              <BalanceBadge />
            </div>
          </div>
          <div className="md:hidden mb-3 flex justify-center">
            <InstallAppButton variant="compact" />
          </div>
          <div className={`${isChat ? "flex-1 min-h-0 overflow-hidden" : "flex-1"}`}>{children}</div>
          {!isChat && (
            <footer className="mt-12 pt-6 border-t flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <Link to="/safety" className="hover:text-foreground">{t("nav.safety")}</Link>
              <Link to="/privacy" className="hover:text-foreground">{t("nav.privacy")}</Link>
              <Link to="/terms" className="hover:text-foreground">{t("nav.terms")}</Link>
            </footer>
          )}
        </main>
      </div>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t grid py-2 px-1 z-50"
        style={{ gridTemplateColumns: `repeat(4, minmax(0, 1fr))` }}
      >
        {navItems.map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 min-w-0 px-0.5 py-1.5 rounded-md ${
                active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="text-[9px] leading-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                {item.label}
              </span>
            </Link>
          );
        })}
        <button
          onClick={isGuest ? goToAuth : handleSignOut}
          className="flex flex-col items-center gap-0.5 min-w-0 px-0.5 py-1.5 rounded-md text-muted-foreground"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="text-[9px] leading-tight">{isGuest ? t("common.login") : t("nav.signout")}</span>
        </button>
      </nav>
    </div>
  );
}
