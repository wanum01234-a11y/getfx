import { Trade } from "@/lib/mock-data";

export const WHATSAPP_TEMPLATE_STORAGE_KEY = "nexus-whatsapp-share-template";

export const DEFAULT_WHATSAPP_TEMPLATE = `🚀 Trade Alert
Symbol: {symbol}
Type: {type}
Entry: {entry}
Profit: {profit}`;

export const whatsappVariables = [
  { key: "{symbol}", label: "Symbol", description: "Trading pair, for example BTC/USD" },
  { key: "{type}", label: "Type", description: "Buy or Sell" },
  { key: "{lot}", label: "Lot", description: "Trade lot size" },
  { key: "{entry}", label: "Entry", description: "Entry price" },
  { key: "{current}", label: "Current", description: "Current market price for open trades" },
  { key: "{close}", label: "Close", description: "Close price for closed trades" },
  { key: "{profit}", label: "Profit", description: "Profit or loss amount" },
  { key: "{status}", label: "Status", description: "Open or Closed" },
  { key: "{duration}", label: "Duration", description: "Trade duration when available" },
  { key: "{openedAt}", label: "Opened At", description: "Opened date" },
  { key: "{closedAt}", label: "Closed At", description: "Closed date when available" },
];

const formatPrice = (value?: number) => {
  if (value === undefined) return "N/A";
  return value.toLocaleString(undefined, { maximumFractionDigits: 5 });
};

const formatDate = (value?: string) => {
  if (!value) return "N/A";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getSavedWhatsAppTemplate = () => {
  if (typeof window === "undefined") return DEFAULT_WHATSAPP_TEMPLATE;
  return window.localStorage.getItem(WHATSAPP_TEMPLATE_STORAGE_KEY) || DEFAULT_WHATSAPP_TEMPLATE;
};

export const saveWhatsAppTemplate = (template: string) => {
  window.localStorage.setItem(WHATSAPP_TEMPLATE_STORAGE_KEY, template);
  window.dispatchEvent(new CustomEvent("whatsapp-template-updated", { detail: template }));
};

export const buildWhatsAppMessage = (trade: Trade, template = getSavedWhatsAppTemplate()) => {
  const values: Record<string, string> = {
    "{symbol}": trade.symbol,
    "{type}": trade.type,
    "{lot}": trade.lot.toFixed(2),
    "{entry}": formatPrice(trade.entryPrice),
    "{current}": formatPrice(trade.currentPrice),
    "{close}": formatPrice(trade.closePrice),
    "{profit}": `${trade.profit >= 0 ? "+" : ""}$${trade.profit.toFixed(2)}`,
    "{status}": trade.status,
    "{duration}": trade.duration || "N/A",
    "{openedAt}": formatDate(trade.openedAt),
    "{closedAt}": formatDate(trade.closedAt),
  };

  return Object.entries(values).reduce(
    (message, [variable, value]) => message.replaceAll(variable, value),
    template,
  );
};

export const openWhatsAppShare = (trade: Trade) => {
  const url = `https://wa.me/?text=${encodeURIComponent(buildWhatsAppMessage(trade))}`;
  window.open(url, "_blank");
};