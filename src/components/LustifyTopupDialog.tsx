import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Bitcoin } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import {
  createLustifyTopupCharge,
  getMyLustifyBalance,
  LUSTIFY_PACKS,
  type LustifyPack,
} from "@/lib/coinbase.functions";

export function LustifyTopupDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { lang } = useI18n();
  const qc = useQueryClient();
  const createCharge = useServerFn(createLustifyTopupCharge);
  const fetchBalance = useServerFn(getMyLustifyBalance);
  const [loading, setLoading] = useState<LustifyPack | null>(null);
  const [pending, setPending] = useState<{ code: string; cents: number } | null>(null);
  const [startBalance, setStartBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    fetchBalance().then((b) => setStartBalance(b.cents)).catch(() => {});
  }, [open, fetchBalance]);

  // Poll after charge is opened, up to 5 min
  useEffect(() => {
    if (!pending || startBalance == null) return;
    let stopped = false;
    const started = Date.now();
    const tick = async () => {
      if (stopped) return;
      try {
        const b = await fetchBalance();
        if (b.cents > startBalance) {
          toast.success(
            lang === "en"
              ? "Lustify credit received!"
              : "Lustify-Guthaben gutgeschrieben!",
          );
          qc.invalidateQueries({ queryKey: ["lustify-balance"] });
          setPending(null);
          onOpenChange(false);
          return;
        }
      } catch { /* noop */ }
      if (Date.now() - started > 5 * 60_000) { setPending(null); return; }
      setTimeout(tick, 4000);
    };
    const id = setTimeout(tick, 4000);
    return () => { stopped = true; clearTimeout(id); };
  }, [pending, startBalance, fetchBalance, lang, onOpenChange, qc]);

  const buy = async (pack: LustifyPack) => {
    setLoading(pack);
    try {
      const r = await createCharge({ data: { pack } });
      window.open(r.hostedUrl, "_blank", "noopener");
      setPending({ code: r.code, cents: LUSTIFY_PACKS[pack].creditCents });
      toast.info(
        lang === "en"
          ? "Complete payment in the new tab. Credit appears automatically."
          : "Zahlung im neuen Tab abschließen — Guthaben erscheint automatisch.",
      );
    } catch (e: any) {
      toast.error(e?.message ?? "NOWPayments error");
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bitcoin className="h-5 w-5 text-accent" />
            {lang === "en" ? "Top up Lustify V8" : "Lustify V8 aufladen"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {lang === "en"
              ? "Lustify V8 is billed exclusively in crypto via NOWPayments — independent from any PayPal subscription. 0,05 € per image."
              : "Lustify V8 wird ausschließlich per Krypto über NOWPayments bezahlt — unabhängig vom PayPal-Abo. 0,05 € pro Bild."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 pt-1">
          {(Object.keys(LUSTIFY_PACKS) as LustifyPack[]).map((p) => {
            const pk = LUSTIFY_PACKS[p];
            const imgs = Math.floor(pk.creditCents / 5);
            return (
              <Button
                key={p}
                type="button"
                variant="outline"
                disabled={!!loading}
                onClick={() => buy(p)}
                className="justify-between h-auto py-3"
              >
                <span className="flex flex-col items-start">
                  <span className="font-semibold">{pk.label}
                    {pk.bonus && <span className="ml-2 text-xs text-accent">{pk.bonus}</span>}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ≈ {imgs} {lang === "en" ? "images" : "Bilder"}
                  </span>
                </span>
                {loading === p ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bitcoin className="h-4 w-4" />}
              </Button>
            );
          })}
        </div>

        {pending && (
          <div className="pt-2 text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            {lang === "en"
              ? "Waiting for on-chain confirmation…"
              : "Warte auf Krypto-Bestätigung…"}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}