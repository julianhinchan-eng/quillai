import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mic, MicOff, Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  createRealtimeVoiceSession,
  getVoiceUsage,
  consumeVoiceSeconds,
  VOICE_MONTHLY_LIMIT_SECONDS,
} from "@/lib/realtime-voice.functions";
import { toast } from "sonner";

type Status = "idle" | "connecting" | "live" | "error";

function fmtMinSec(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function VoiceChat({
  open,
  onOpenChange,
  lang,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lang: "en" | "de";
}) {
  const mintSession = useServerFn(createRealtimeVoiceSession);
  const fetchUsage = useServerFn(getVoiceUsage);
  const reportSeconds = useServerFn(consumeVoiceSeconds);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [remainingSec, setRemainingSec] = useState<number>(VOICE_MONTHLY_LIMIT_SECONDS);
  const [limitSec, setLimitSec] = useState<number>(VOICE_MONTHLY_LIMIT_SECONDS);
  const [usageLoaded, setUsageLoaded] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flushRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingSecondsRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const remainingRef = useRef<number>(VOICE_MONTHLY_LIMIT_SECONDS);

  const flushUsage = useCallback(
    async (force = false) => {
      const secs = pendingSecondsRef.current;
      if (secs < 1 && !force) return;
      if (secs < 1) return;
      pendingSecondsRef.current = 0;
      try {
        const res = await reportSeconds({ data: { seconds: secs } });
        setRemainingSec(res.remaining);
        setLimitSec(res.limit);
        remainingRef.current = res.remaining;
      } catch (e) {
        console.error("consumeVoiceSeconds failed", e);
      }
    },
    [reportSeconds],
  );

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    if (flushRef.current) clearInterval(flushRef.current);
    flushRef.current = null;
    startedAtRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    if (pcRef.current) {
      try {
        pcRef.current.getSenders().forEach((s) => s.track?.stop());
        pcRef.current.close();
      } catch {
        /* ignore */
      }
    }
    pcRef.current = null;
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    setSpeaking(false);
  }, []);

  const startVisualizer = useCallback((stream: MediaStream, remote: MediaStream | null) => {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    ctx.createMediaStreamSource(stream).connect(analyser);
    if (remote) {
      try {
        ctx.createMediaStreamSource(remote).connect(analyser);
      } catch {
        /* ignore */
      }
    }
    const data = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      const canvas = canvasRef.current;
      const a = analyserRef.current;
      if (!canvas || !a) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      a.getByteFrequencyData(data);
      const c = canvas.getContext("2d");
      if (!c) return;
      const W = canvas.width;
      const H = canvas.height;
      c.clearRect(0, 0, W, H);

      const bars = 48;
      const step = Math.floor(data.length / bars);
      const barW = W / bars;
      let sum = 0;
      for (let i = 0; i < bars; i++) {
        const v = data[i * step] ?? 0;
        sum += v;
        const h = Math.max(4, (v / 255) * H * 0.9);
        const y = (H - h) / 2;
        const x = i * barW + barW * 0.15;
        const w = barW * 0.7;
        c.fillStyle = "hsl(217 89% 51%)";
        c.beginPath();
        // rounded rect
        const r = Math.min(w / 2, 6);
        c.moveTo(x + r, y);
        c.arcTo(x + w, y, x + w, y + h, r);
        c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r);
        c.arcTo(x, y, x + w, y, r);
        c.closePath();
        c.fill();
      }
      setSpeaking(sum / bars > 12);
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
  }, []);

  const start = useCallback(async () => {
    setErrorMsg(null);
    if (remainingRef.current <= 0) {
      toast.error(
        lang === "en"
          ? "You have used all 20 monthly voice minutes."
          : "Du hast alle 20 monatlichen Live-Minuten aufgebraucht.",
      );
      return;
    }
    setStatus("connecting");
    try {
      const session = await mintSession();
      setRemainingSec(session.remainingSeconds);
      setLimitSec(session.limitSeconds);
      remainingRef.current = session.remainingSeconds;

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const remoteStream = new MediaStream();
      pc.ontrack = (e) => {
        e.streams[0]?.getAudioTracks().forEach((t) => remoteStream.addTrack(t));
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.play().catch(() => {});
        }
      };

      // Data channel required by realtime API
      pc.createDataChannel("oai-events");

      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = mic;
      mic.getAudioTracks().forEach((t) => pc.addTrack(t, mic));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const res = await fetch(
        `https://api.openai.com/v1/realtime?model=${encodeURIComponent(session.model)}`,
        {
          method: "POST",
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${session.clientSecret}`,
            "Content-Type": "application/sdp",
          },
        },
      );
      if (!res.ok) throw new Error(await res.text());
      const answerSdp = await res.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      startVisualizer(mic, remoteStream);
      setStatus("live");

      // Live countdown: tick every second, auto-stop at 0.
      startedAtRef.current = Date.now();
      let lastTick = Date.now();
      tickRef.current = setInterval(() => {
        const now = Date.now();
        const delta = Math.round((now - lastTick) / 1000);
        if (delta <= 0) return;
        lastTick = now;
        pendingSecondsRef.current += delta;
        const next = Math.max(0, remainingRef.current - delta);
        remainingRef.current = next;
        setRemainingSec(next);
        if (next <= 0) {
          void flushUsage(true).finally(() => {
            cleanup();
            setStatus("idle");
            toast.error(
              lang === "en"
                ? "Monthly voice limit reached. Mic disabled."
                : "Monatliches Sprachlimit erreicht. Mikrofon gesperrt.",
            );
          });
        }
      }, 1000);

      // Flush accumulated seconds to the server every ~10s
      flushRef.current = setInterval(() => {
        void flushUsage();
      }, 10000);
    } catch (err) {
      console.error("realtime start failed", err);
      cleanup();
      setStatus("error");
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      if (msg.includes("VOICE_LIMIT_REACHED")) {
        setRemainingSec(0);
        remainingRef.current = 0;
        toast.error(
          lang === "en"
            ? "Monthly voice limit reached."
            : "Monatliches Sprachlimit erreicht.",
        );
      } else {
        toast.error(
          lang === "en" ? "Could not start voice call" : "Sprachanruf konnte nicht gestartet werden",
        );
      }
    }
  }, [mintSession, startVisualizer, cleanup, lang, flushUsage]);

  const stop = useCallback(() => {
    void flushUsage(true);
    cleanup();
    setStatus("idle");
  }, [cleanup, flushUsage]);

  const toggleMute = useCallback(() => {
    const s = micStreamRef.current;
    if (!s) return;
    const next = !muted;
    s.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }, [muted]);

  // Cleanup when closed
  useEffect(() => {
    if (!open) {
      void flushUsage(true);
      cleanup();
      setStatus("idle");
      setMuted(false);
    }
    return () => {
      if (!open) cleanup();
    };
  }, [open, cleanup, flushUsage]);

  // Load remaining usage whenever the dialog opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const u = await fetchUsage();
        if (cancelled) return;
        setRemainingSec(u.remaining);
        setLimitSec(u.limit);
        remainingRef.current = u.remaining;
        setUsageLoaded(true);
      } catch (e) {
        console.error("getVoiceUsage failed", e);
        setUsageLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, fetchUsage]);

  const limitReached = usageLoaded && remainingSec <= 0;
  const remainingMinDisplay = Math.ceil(remainingSec / 60);
  const limitMinDisplay = Math.round(limitSec / 60);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle>{lang === "en" ? "Live Voice" : "Live-Sprache"}</DialogTitle>
          <DialogDescription>
            {lang === "en"
              ? "Talk to QuillAI in real time. Tap the microphone to start."
              : "Sprich in Echtzeit mit QuillAI. Tippe auf das Mikrofon zum Starten."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          <div
            className={`w-full rounded-2xl px-4 py-3 text-center text-sm font-medium ${
              limitReached
                ? "bg-destructive/10 text-destructive"
                : "bg-accent/10 text-foreground"
            }`}
            aria-live="polite"
          >
            {lang === "en" ? "Remaining live minutes: " : "Verbleibende Live-Minuten: "}
            <span className="font-semibold">
              {status === "live" ? fmtMinSec(remainingSec) : remainingMinDisplay}
            </span>
            {" / "}
            {limitMinDisplay} Min.
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={status === "live" ? stop : start}
              disabled={status === "connecting" || limitReached}
              className={`relative flex h-28 w-28 items-center justify-center rounded-full shadow-lg transition-all duration-300 ${
                status === "live"
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-accent text-accent-foreground hover:scale-105"
              } ${speaking ? "ring-4 ring-accent/40" : ""} ${
                limitReached ? "opacity-50 cursor-not-allowed" : ""
              }`}
              aria-label={status === "live" ? "Stop" : "Start"}
            >
              {status === "connecting" ? (
                <Loader2 className="h-10 w-10 animate-spin" />
              ) : status === "live" ? (
                <X className="h-10 w-10" />
              ) : (
                <Mic className="h-10 w-10" />
              )}
              {status === "live" && (
                <span className="absolute inset-0 rounded-full animate-ping bg-accent/20" />
              )}
            </button>
          </div>

          <canvas
            ref={canvasRef}
            width={320}
            height={80}
            className={`w-full max-w-sm h-20 transition-opacity ${
              status === "live" ? "opacity-100" : "opacity-30"
            }`}
          />

          <div className="text-sm text-muted-foreground min-h-[1.25rem] text-center">
            {status === "idle" &&
              (limitReached
                ? lang === "en"
                  ? "Monthly limit reached — mic locked."
                  : "Monatslimit erreicht — Mikrofon gesperrt."
                : lang === "en"
                ? "Ready"
                : "Bereit")}
            {status === "connecting" && (lang === "en" ? "Connecting..." : "Verbinden...")}
            {status === "live" && (lang === "en" ? "Listening — speak now" : "Zuhören — sprich jetzt")}
            {status === "error" && (
              <span className="text-destructive">{errorMsg ?? (lang === "en" ? "Error" : "Fehler")}</span>
            )}
          </div>

          {status === "live" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleMute}
              className="rounded-full"
            >
              {muted ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
              {muted
                ? lang === "en"
                  ? "Unmute"
                  : "Stumm aufheben"
                : lang === "en"
                ? "Mute"
                : "Stumm"}
            </Button>
          )}

          <audio ref={remoteAudioRef} autoPlay playsInline hidden />
        </div>
      </DialogContent>
    </Dialog>
  );
}