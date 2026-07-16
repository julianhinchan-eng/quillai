export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

declare global {
  interface Window {
    __deferredInstallPrompt?: BeforeInstallPromptEvent;
    __pwaInstallListenersReady?: boolean;
  }
}

const PREVIEW_HOSTS = [
  "lovableproject.com",
  "lovableproject-dev.com",
  "beta.lovable.dev",
];

export function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
}

function isPreviewHost(hostname: string) {
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    PREVIEW_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`))
  );
}

function shouldSkipServiceWorker() {
  if (typeof window === "undefined") return true;
  const killed = new URLSearchParams(window.location.search).get("sw") === "off";
  return (
    !import.meta.env.PROD ||
    window.self !== window.top ||
    killed ||
    isPreviewHost(window.location.hostname)
  );
}

export function getDeferredInstallPrompt() {
  if (typeof window === "undefined") return undefined;
  return window.__deferredInstallPrompt;
}

export function clearDeferredInstallPrompt() {
  if (typeof window !== "undefined") window.__deferredInstallPrompt = undefined;
}

export async function unregisterMatchingServiceWorkers() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      registrations.map((registration) => {
        const scriptUrl = registration.active?.scriptURL ?? registration.installing?.scriptURL ?? registration.waiting?.scriptURL ?? "";
        return scriptUrl.endsWith("/sw.js") ? registration.unregister() : Promise.resolve(false);
      }),
    );
  } catch {
    // Browser blocked SW access; ignore.
  }
}

export async function registerServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  if (shouldSkipServiceWorker()) {
    await unregisterMatchingServiceWorkers();
    return;
  }

  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch {
    // Installability should fail silently if the browser refuses SW registration.
  }
}

if (typeof window !== "undefined" && !window.__pwaInstallListenersReady) {
  window.__pwaInstallListenersReady = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    window.__deferredInstallPrompt = event as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent("pwa:installable"));
  });

  window.addEventListener("appinstalled", () => {
    clearDeferredInstallPrompt();
    window.dispatchEvent(new CustomEvent("pwa:installed"));
  });
}