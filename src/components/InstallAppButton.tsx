import { useI18n } from "@/lib/i18n";
import { usePwaInstall } from "@/features/pwa-install";

export function InstallAppButton({ variant = "sidebar" }: { variant?: "sidebar" | "compact" }) {
  const { lang } = useI18n();
  const { canInstall, install, isInstalling, isStandalone } = usePwaInstall();

  if (isStandalone || !canInstall) return null;

  const label = isInstalling
    ? lang === "en" ? "Opening..." : "Öffnet..."
    : lang === "en" ? "📱 Download App" : "📱 App herunterladen";

  async function handleClick() {
    await install();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isInstalling}
      className={
        variant === "sidebar"
          ? "mx-2 mt-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full text-xs font-medium border border-slate-200/80 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition disabled:pointer-events-none disabled:opacity-60"
          : "inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition disabled:pointer-events-none disabled:opacity-60"
      }
    >
      <span className="inline">📱</span>
      <span className={variant === "compact" ? "hidden sm:inline" : "inline"}>{label.replace("📱 ", "")}</span>
    </button>
  );
}