import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  clearDeferredInstallPrompt,
  getDeferredInstallPrompt,
  isStandaloneMode,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa";

type InstallResult = "accepted" | "dismissed" | "prompted" | "unavailable" | "already-installed";

type PwaInstallContextValue = {
  canInstall: boolean;
  isInstalling: boolean;
  isStandalone: boolean;
  install: () => Promise<InstallResult>;
};

const PwaInstallContext = createContext<PwaInstallContextValue>({
  canInstall: false,
  isInstalling: false,
  isStandalone: false,
  install: async () => "unavailable",
});

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | undefined>(() => getDeferredInstallPrompt());
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const syncStandalone = () => setIsStandalone(isStandaloneMode());
    const syncPrompt = () => setPrompt(getDeferredInstallPrompt());

    syncStandalone();
    syncPrompt();

    media.addEventListener("change", syncStandalone);
    window.addEventListener("pwa:installable", syncPrompt);
    window.addEventListener("pwa:installed", syncStandalone);

    return () => {
      media.removeEventListener("change", syncStandalone);
      window.removeEventListener("pwa:installable", syncPrompt);
      window.removeEventListener("pwa:installed", syncStandalone);
    };
  }, []);

  const install = useCallback(async (): Promise<InstallResult> => {
    if (isStandaloneMode()) return "already-installed";

    const deferredPrompt = getDeferredInstallPrompt();
    if (!deferredPrompt) return "unavailable";

    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice?.catch(() => undefined);
      clearDeferredInstallPrompt();
      setPrompt(undefined);
      return choice?.outcome ?? "prompted";
    } catch {
      clearDeferredInstallPrompt();
      setPrompt(undefined);
      return "unavailable";
    } finally {
      setIsInstalling(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      canInstall: Boolean(prompt) && !isStandalone,
      isInstalling,
      isStandalone,
      install,
    }),
    [install, isInstalling, isStandalone, prompt],
  );

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
}

export function usePwaInstall() {
  return useContext(PwaInstallContext);
}