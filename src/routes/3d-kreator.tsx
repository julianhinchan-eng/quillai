import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Upload, X, Box, Loader2, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createTripoTask, getTripoTask, getMy3DUsage } from "@/lib/tripo.functions";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { useSubscriptionStatus } from "@/lib/use-subscription";
import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/3d-kreator")({
  ssr: false,
  component: ThreeDKreatorRoute,
  head: () => ({
    meta: [
      { title: "3D-Kreator – QuillAI" },
      { name: "description", content: "Erstelle 3D-Modelle aus Prompts und Referenzbildern." },
    ],
    scripts: [
      {
        type: "module",
        src: "https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js",
      },
    ],
  }),
});

type MeshType = "triangle" | "quad";

// Ambient type so TS accepts the <model-viewer> custom element.
type ModelViewerProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement> & Record<string, unknown>,
  HTMLElement
>;
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": ModelViewerProps;
    }
  }
}

function ThreeDKreatorRoute() {
  return (
    <AppShell>
      <ThreeDKreator />
    </AppShell>
  );
}

function ThreeDKreator() {
  const { t, lang } = useI18n();
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [meshType, setMeshType] = useState<MeshType>("triangle");
  const [symmetric, setSymmetric] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { status: subStatus, hasActiveSubscription } = useSubscriptionStatus();
  const tier = subStatus?.subscription?.tier ?? null;
  const isUltimate = hasActiveSubscription && tier === "ultimate";
  const fetchUsage = useServerFn(getMy3DUsage);
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);

  useEffect(() => {
    if (!isUltimate) return;
    fetchUsage().then((u) => setUsage({ used: u.used, limit: u.limit })).catch(() => {});
  }, [isUltimate, fetchUsage]);

  const acceptFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(t("kreator.err_image_type"));
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error(t("kreator.err_image_size"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(String(reader.result));
      setImageName(file.name);
      setImageMime(file.type);
    };
    reader.readAsDataURL(file);
  }, [t]);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) acceptFile(file);
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) acceptFile(file);
    e.target.value = "";
  }

  async function onGenerate() {
    if (!isUltimate) {
      toast.error(t("kreator.err_ultimate"));
      return;
    }
    if (!prompt.trim()) {
      toast.error(t("kreator.err_prompt"));
      return;
    }
    setGenerating(true);
    setStatus("queued");
    setModelUrl(null);
    setPreviewUrl(null);
    try {
      const imgB64 = imageUrl?.includes(",") ? imageUrl.split(",")[1] : undefined;
      const { taskId } = await createTripoTask({
        data: {
          prompt,
          imageBase64: imgB64,
          imageMime: imgB64 ? imageMime ?? "image/png" : undefined,
          meshType,
          symmetric,
          modelVersion: "v3.0-20250812",
        },
      });
      // Poll every 3s, up to ~5 min
      for (let i = 0; i < 100; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const res = await getTripoTask({ data: { taskId } });
        setStatus(res.status);
        if (res.status === "success") {
          setModelUrl(res.modelUrl);
          setPreviewUrl(res.previewUrl);
          toast.success(t("kreator.success"));
          break;
        }
        if (res.status === "failed" || res.status === "cancelled") {
          throw new Error(`Task ${res.status}`);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("kreator.err_generation"));
      setStatus(null);
    } finally {
      setGenerating(false);
      fetchUsage().then((u) => setUsage({ used: u.used, limit: u.limit })).catch(() => {});
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Box className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{t("kreator.title")}</h1>
            <div
              className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-secondary/40 text-[10px] font-medium text-muted-foreground"
              title={lang === "en" ? "Active AI model" : "Aktives KI-Modell"}
            >
              <Sparkles className="h-2.5 w-2.5" />
              {t("kreator.model_badge")}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{t("kreator.subtitle")}</p>
        </div>
      </header>

      {!isUltimate && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <Lock className="mt-0.5 h-5 w-5 text-amber-500" />
          <div className="flex-1">
            <p className="text-sm font-medium">{t("kreator.lock_title")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("kreator.lock_desc")}</p>
            <Button asChild size="sm" className="mt-3">
              <Link to="/settings">{t("kreator.lock_cta")}</Link>
            </Button>
          </div>
        </div>
      )}
      {isUltimate && usage && (
        <p className="text-xs text-muted-foreground">
          {t("kreator.usage", { used: usage.used, limit: usage.limit })}
        </p>
      )}

      <section className="flex flex-col gap-2">
        <label htmlFor="prompt" className="text-sm font-medium">
          {t("kreator.prompt")}
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t("kreator.prompt_placeholder")}
          rows={4}
          className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
      </section>

      <section className="flex flex-col gap-2">
        <label className="text-sm font-medium">{t("kreator.reference")}</label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={
            "group relative flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition " +
            (dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/60 hover:bg-muted/40")
          }
        >
          {imageUrl ? (
            <div className="flex w-full items-center gap-4">
              <img
                src={imageUrl}
                alt={t("kreator.reference")}
                className="h-24 w-24 rounded-lg object-cover"
              />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium truncate">{imageName}</p>
                <p className="text-xs text-muted-foreground">{t("kreator.replace")}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setImageUrl(null);
                  setImageName(null);
                  setImageMime(null);
                }}
                aria-label={t("kreator.remove_image")}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <Upload className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm">
                {t("kreator.drop_hint")}{" "}
                <span className="text-primary underline">{t("kreator.choose")}</span>
              </p>
              <p className="text-xs text-muted-foreground">{t("kreator.file_types")}</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPickFile}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">{t("kreator.settings")}</h2>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-muted-foreground">{t("kreator.mesh_type")}</label>
          <div className="inline-flex w-fit rounded-lg border border-border bg-background p-1">
            {(
              [
                { key: "triangle", label: t("kreator.mesh_triangle") },
                { key: "quad", label: t("kreator.mesh_quad") },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setMeshType(opt.key)}
                className={
                  "rounded-md px-3 py-1.5 text-sm transition " +
                  (meshType === opt.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={symmetric}
            onChange={(e) => setSymmetric(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          {t("kreator.symmetric")}
        </label>
      </section>

      <Button
        onClick={onGenerate}
        disabled={generating || !isUltimate || (usage ? usage.used >= usage.limit : false)}
        className="self-start"
      >
        {!isUltimate ? (
          <>
            <Lock className="mr-2 h-4 w-4" />
            {t("kreator.lock_short")}
          </>
        ) : usage && usage.used >= usage.limit ? (
          <>
            <Lock className="mr-2 h-4 w-4" />
            {t("kreator.limit_reached")}
          </>
        ) : generating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {status ? `${t("kreator.generating")} (${status})` : t("kreator.generating")}
          </>
        ) : (
          <>
            <Box className="mr-2 h-4 w-4" />
            {t("kreator.generate")}
          </>
        )}
      </Button>

      {(previewUrl || modelUrl) && (
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">{t("kreator.result")}</h2>
          {modelUrl ? (
            <model-viewer
              src={modelUrl}
              alt={t("kreator.title")}
              camera-controls
              auto-rotate
              shadow-intensity="1"
              exposure="1"
              environment-image="neutral"
              style={{
                width: "100%",
                height: "520px",
                background: "transparent",
                borderRadius: "0.75rem",
              }}
            />
          ) : previewUrl ? (
            <img src={previewUrl} alt={t("kreator.result")} className="w-full max-w-sm rounded-lg" />
          ) : null}
          {modelUrl && (
            <a
              href={modelUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary underline self-start"
            >
              {t("kreator.download")}
            </a>
          )}
        </section>
      )}

      {generating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-8 py-6 shadow-xl">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <Box className="absolute inset-0 m-auto h-5 w-5 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">{t("kreator.overlay_title")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("kreator.overlay_hint")}
                {status ? ` · ${status}` : ""}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
