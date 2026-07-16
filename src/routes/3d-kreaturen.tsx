import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Upload, X, Sparkles, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { createTripoTask, getTripoTask } from "@/lib/tripo.functions";

export const Route = createFileRoute("/3d-kreaturen")({
  ssr: false,
  component: RouteComponent,
  head: () => ({
    meta: [
      { title: "3D-Kreaturen – QuillAI" },
      {
        name: "description",
        content:
          "Erzeuge 3D-Kreaturen aus Text oder Bild – performante Quad-Meshes mit gebackenen PBR-Texturen, direkt im Browser drehbar.",
      },
    ],
    scripts: [
      {
        type: "module",
        src: "https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js",
      },
    ],
  }),
});

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

function RouteComponent() {
  return (
    <AppShell>
      <ThreeDCreatures />
    </AppShell>
  );
}

function ThreeDCreatures() {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const cancelRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => () => { cancelRef.current = true; }, []);

  const acceptFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Bitte eine Bilddatei ablegen.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Bild ist zu groß (max. 15 MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(String(reader.result));
      setImageName(file.name);
      setImageMime(file.type);
    };
    reader.readAsDataURL(file);
  }, []);

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
    if (!prompt.trim() && !imageUrl) {
      toast.error("Bitte einen Prompt eingeben oder ein Bild hochladen.");
      return;
    }
    setGenerating(true);
    setStatus("queued");
    setProgress(0);
    setModelUrl(null);
    setPreviewUrl(null);
    try {
      const imgB64 = imageUrl?.includes(",") ? imageUrl.split(",")[1] : undefined;
      const { taskId } = await createTripoTask({
        data: {
          prompt: prompt.trim() || "creature",
          imageBase64: imgB64,
          imageMime: imgB64 ? imageMime ?? "image/png" : undefined,
          meshType: "quad",
          symmetric: false,
          modelVersion: "v3.0-20250812",
          smartLowPoly: true,
          pbr: true,
        },
      });
      // Async polling loop – server function fetches Tripo status.
      for (let i = 0; i < 120; i++) {
        if (cancelRef.current) return;
        await new Promise((r) => setTimeout(r, 3000));
        const res = await getTripoTask({ data: { taskId } });
        setStatus(res.status);
        setProgress(res.progress ?? 0);
        if (res.status === "success") {
          setModelUrl(res.modelUrl);
          setPreviewUrl(res.previewUrl);
          toast.success("Deine 3D-Kreatur ist fertig.");
          break;
        }
        if (res.status === "failed" || res.status === "cancelled" || res.status === "banned") {
          throw new Error(`Task ${res.status}`);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler bei der Generierung.");
      setStatus(null);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">3D-Kreaturen</h1>
          <p className="text-sm text-muted-foreground">
            Text oder Bild → Quad-Mesh mit gebackenen PBR-Texturen. Direkt im Browser drehbar.
          </p>
        </div>
      </header>

      <section className="flex flex-col gap-2">
        <label htmlFor="creature-prompt" className="text-sm font-medium">
          Beschreibung
        </label>
        <textarea
          id="creature-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="z. B. Ein verspielter Waldgeist mit Moos-Fell, leuchtenden Augen und Pilzhut…"
          rows={4}
          className="w-full resize-y rounded-2xl border border-border bg-background px-4 py-3 text-sm shadow-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
        />
      </section>

      <section className="flex flex-col gap-2">
        <label className="text-sm font-medium">Referenzbild (optional, für Image-to-3D)</label>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={
            "group relative flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition " +
            (dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/60 hover:bg-muted/40")
          }
        >
          {imageUrl ? (
            <div className="flex w-full items-center gap-4">
              <img src={imageUrl} alt="Referenz" className="h-24 w-24 rounded-lg object-cover" />
              <div className="flex-1 text-left">
                <p className="truncate text-sm font-medium">{imageName}</p>
                <p className="text-xs text-muted-foreground">Klicken zum Ersetzen</p>
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
                aria-label="Bild entfernen"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <Upload className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm">
                Bild hierher ziehen oder <span className="text-primary underline">auswählen</span>
              </p>
              <p className="text-xs text-muted-foreground">PNG, JPG, WebP · max. 15 MB</p>
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

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onGenerate} disabled={generating} size="lg">
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {status ? `${status} · ${progress}%` : "Wird erstellt…"}
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              3D-Kreatur erstellen
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          Tripo v3.0 · Smart Low-Poly Quad-Mesh · PBR baked
        </p>
      </div>

      {(modelUrl || previewUrl) && (
        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Vorschau</h2>
            {modelUrl && (
              <a
                href={modelUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary underline"
              >
                <Download className="h-3.5 w-3.5" />
                .glb herunterladen
              </a>
            )}
          </div>
          {modelUrl ? (
            <model-viewer
              src={modelUrl}
              alt="3D-Kreatur"
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
            <img src={previewUrl} alt="Vorschau" className="w-full max-w-md rounded-lg" />
          ) : null}
        </section>
      )}
    </div>
  );
}