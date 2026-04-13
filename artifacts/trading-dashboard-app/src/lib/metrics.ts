import type { Trade } from "@/lib/mock-data";

export type PipSizeOverrides = Record<string, number>;

export type DashboardMetrics = {
  totalTrades: number;
  totalProfit: number;
  totalPips: number;
  openTradesCount: number;
  closedTradesCount: number;
  winRate: number;
};

const normalizeSymbolKey = (symbol: string) => {
  return String(symbol || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
};

export const getPipSize = (symbol: string): number | null => {
  const key = normalizeSymbolKey(symbol);

  if (key.includes("BTC") || key.includes("ETH")) return null;

  if (key.includes("XAU")) return 0.01;
  if (key.includes("XAG")) return 0.01;
  if (key.includes("USOIL") || key.includes("WTI")) return 0.01;

  if (key.includes("US30") || key.includes("NAS") || key.includes("SPX")) return 1;

  if (key.endsWith("JPY")) return 0.01;

  const looksLikeForex = /^[A-Z]{6}$/.test(key);
  if (looksLikeForex) return 0.0001;

  return 1;
};

export const calcTradePips = (trade: Trade, pipSizeOverrides?: PipSizeOverrides) => {
  if (trade.status !== "Closed") return 0;
  if (!Number.isFinite(trade.entryPrice)) return 0;
  if (!Number.isFinite(trade.closePrice)) return 0;

  const entry = trade.entryPrice;
  const close = trade.closePrice as number;
  const diff = trade.type === "Sell" ? entry - close : close - entry;

  const symbolKey = normalizeSymbolKey(trade.symbol);
  const override = pipSizeOverrides?.[symbolKey];
  const pipSize = override !== undefined ? override : getPipSize(trade.symbol);
  const rawPips = pipSize === null ? diff : diff / pipSize;

  if (!Number.isFinite(rawPips)) return 0;

  const clamped = Math.max(-1_000_000, Math.min(1_000_000, rawPips));
  return clamped;
};

export const dedupeTradesById = (trades: Trade[]) => {
  const map = new Map<string, Trade>();
  for (const t of trades) {
    if (!t || !t.id) continue;
    const existing = map.get(t.id);
    if (!existing) {
      map.set(t.id, t);
      continue;
    }

    if (existing.status !== "Closed" && t.status === "Closed") {
      map.set(t.id, t);
      continue;
    }

    map.set(t.id, { ...existing, ...t });
  }
  return Array.from(map.values());
};

export const calculateMetrics = (input: {
  openTrades: Trade[];
  closedTrades: Trade[];
  pipSizeOverrides?: PipSizeOverrides;
}): DashboardMetrics => {
  const uniqueOpen = dedupeTradesById(input.openTrades);
  const uniqueClosed = dedupeTradesById(input.closedTrades).filter((t) => t.status === "Closed");
  const uniqueAll = dedupeTradesById([...uniqueOpen, ...uniqueClosed]);

  const totalProfit = uniqueAll.reduce((sum, t) => sum + (Number.isFinite(t.profit) ? t.profit : 0), 0);
  const wins = uniqueClosed.filter((t) => (Number.isFinite(t.profit) ? t.profit : 0) > 0).length;
  const winRate = uniqueClosed.length > 0 ? Number(((wins / uniqueClosed.length) * 100).toFixed(1)) : 0;
  const totalPips = uniqueClosed.reduce((sum, t) => sum + calcTradePips(t, input.pipSizeOverrides), 0);

  return {
    totalTrades: uniqueAll.length,
    totalProfit,
    totalPips: Number.isFinite(totalPips) ? Number(totalPips.toFixed(1)) : 0,
    openTradesCount: uniqueOpen.length,
    closedTradesCount: uniqueClosed.length,
    winRate,
  };
};
