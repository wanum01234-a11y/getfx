import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Trade } from "@/lib/mock-data";
import { buildWhatsAppMessage, getSavedWhatsAppTemplate } from "@/lib/whatsapp-template";

type Props = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  trades: Trade[];
  initialSelectedTradeId?: string;
};

const parseTradeTime = (trade: Trade) => {
  const raw = trade.closedAt || trade.openedAt || "";
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
};

const pickDefaultTradeId = (trades: Trade[]) => {
  if (trades.length === 0) return "";

  const sorted = [...trades].sort((a, b) => {
    const pa = Number.isFinite(a.profit) ? a.profit : 0;
    const pb = Number.isFinite(b.profit) ? b.profit : 0;
    if (pb !== pa) return pb - pa; // highest profit first

    const ta = parseTradeTime(a);
    const tb = parseTradeTime(b);
    return tb - ta; // most recent
  });

  return sorted[0]?.id ?? "";
};

export function WhatsAppTradeShareDialog({ open, onOpenChange, trades, initialSelectedTradeId }: Props) {
  const defaultTradeId = useMemo(() => {
    if (initialSelectedTradeId && trades.some((t) => t.id === initialSelectedTradeId)) return initialSelectedTradeId;
    return pickDefaultTradeId(trades);
  }, [initialSelectedTradeId, trades]);

  const [selectedId, setSelectedId] = useState<string>(defaultTradeId);

  const selectedTrade = useMemo(() => trades.find((t) => t.id === selectedId), [selectedId, trades]);

  const previewMessage = useMemo(() => {
    if (!selectedTrade) return "";
    return buildWhatsAppMessage(selectedTrade, getSavedWhatsAppTemplate());
  }, [selectedTrade]);

  const handleOpenWhatsApp = () => {
    if (!selectedTrade) return;
    const url = `https://wa.me/?text=${encodeURIComponent(previewMessage)}`;
    window.open(url, "_blank");
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) setSelectedId(defaultTradeId);
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Select a trade to share</DialogTitle>
          <DialogDescription>Choose which trade should be used for template variables.</DialogDescription>
        </DialogHeader>

        {trades.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-black/40 p-6 text-sm text-muted-foreground">
            No trades available
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2 max-h-[420px] overflow-auto pr-2">
              {trades.map((t) => {
                const selected = t.id === selectedId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={cn(
                      "w-full text-left rounded-xl border p-4 transition-all",
                      selected
                        ? "border-primary/60 bg-primary/10"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-white font-semibold">{t.symbol}</div>
                      <div
                        className={cn(
                          "text-xs font-semibold px-2 py-1 rounded-md border",
                          t.type === "Buy"
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20",
                        )}
                      >
                        {t.type}
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>
                        <div className="uppercase tracking-wider">Profit</div>
                        <div className={cn("font-semibold", t.profit >= 0 ? "text-green-400" : "text-red-400")}>
                          {t.profit >= 0 ? "+" : ""}${Number.isFinite(t.profit) ? t.profit.toFixed(2) : "0.00"}
                        </div>
                      </div>
                      <div>
                        <div className="uppercase tracking-wider">Entry</div>
                        <div className="text-white font-semibold">
                          {Number.isFinite(t.entryPrice) ? t.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 5 }) : "N/A"}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Message Preview</div>
              <pre className="text-sm text-white whitespace-pre-wrap leading-relaxed min-h-[220px]">
                {selectedTrade ? previewMessage : ""}
              </pre>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleOpenWhatsApp} disabled={!selectedTrade}>
            Share
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
