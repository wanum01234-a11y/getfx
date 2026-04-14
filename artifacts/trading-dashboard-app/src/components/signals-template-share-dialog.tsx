import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Trade } from "@/lib/mock-data";

type Stats = {
  totalTrades?: number;
  winRate?: number;
  balance?: number;
  equity?: number;
};

type Props = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  trades: Trade[];
  templateContent: string;
  initialSelectedTradeId?: string;
  stats?: Stats;
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
    if (pb !== pa) return pb - pa;

    const ta = parseTradeTime(a);
    const tb = parseTradeTime(b);
    return tb - ta;
  });

  return sorted[0]?.id ?? "";
};

const formatPrice = (value?: number) => {
  if (value === undefined) return "-";
  if (!Number.isFinite(value)) return "-";
  return value.toLocaleString(undefined, { maximumFractionDigits: 5 });
};

const formatMoney = (value?: number) => {
  if (value === undefined) return "-";
  if (!Number.isFinite(value)) return "-";
  return `${value >= 0 ? "+" : ""}$${value.toFixed(2)}`;
};

export const buildSignalsMessage = (template: string, trade: Trade | undefined, stats?: Stats) => {
  const sl = trade?.stopLoss;
  const tp = trade?.tp1 ?? trade?.takeProfit;

  const values: Record<string, string> = {
    "{symbol}": trade?.symbol ?? "-",
    "{type}": trade?.type ?? "-",
    "{entry}": trade ? formatPrice(trade.entryPrice) : "-",
    "{sl}": formatPrice(sl),
    "{tp}": formatPrice(tp),
    "{profit}": trade ? formatMoney(trade.profit) : "-",
    "{total_trades}": String(Number(stats?.totalTrades ?? 0)),
    "{win_rate}": stats?.winRate === undefined || !Number.isFinite(stats.winRate) ? "-" : `${stats.winRate.toFixed(1)}%`,
    "{balance}": stats?.balance === undefined ? "-" : `$${stats.balance.toFixed(2)}`,
    "{equity}": stats?.equity === undefined ? "-" : `$${stats.equity.toFixed(2)}`,
  };

  return Object.entries(values).reduce((msg, [k, v]) => msg.split(k).join(v), template);
};

export function SignalsTemplateShareDialog({
  open,
  onOpenChange,
  trades,
  templateContent,
  initialSelectedTradeId,
  stats,
}: Props) {
  const defaultTradeId = useMemo(() => {
    if (initialSelectedTradeId && trades.some((t) => t.id === initialSelectedTradeId)) return initialSelectedTradeId;
    return pickDefaultTradeId(trades);
  }, [initialSelectedTradeId, trades]);

  const [selectedId, setSelectedId] = useState<string>(defaultTradeId);

  const selectedTrade = useMemo(() => trades.find((t) => t.id === selectedId), [selectedId, trades]);

  const previewMessage = useMemo(() => {
    return buildSignalsMessage(templateContent, selectedTrade, stats);
  }, [selectedTrade, stats, templateContent]);

  const handleShare = () => {
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
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Share Signal</DialogTitle>
          <DialogDescription>Select a trade (optional) and preview the final WhatsApp message.</DialogDescription>
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
                          {formatMoney(t.profit)}
                        </div>
                      </div>
                      <div>
                        <div className="uppercase tracking-wider">Entry</div>
                        <div className="text-white font-semibold">{formatPrice(t.entryPrice)}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Message Preview</div>
              <pre className="text-sm text-white whitespace-pre-wrap leading-relaxed min-h-[220px]">{previewMessage}</pre>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleShare}>
            Share
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
