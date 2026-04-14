import twilio from "twilio";
import type { UiTrade } from "../routes/mt5";

export type WhatsAppAutomationSettings = {
  enabled: boolean;
  sendOpenAlerts: boolean;
  sendClosedAlerts: boolean;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
  userToNumber?: string;
};

export const DEFAULT_WHATSAPP_TEMPLATE = `🚀 Trade Alert\nSymbol: {symbol}\nType: {type}\nEntry: {entry}\nProfit: {profit}`;

const formatPrice = (value?: number) => {
  if (value === undefined) return "-";
  return value.toLocaleString(undefined, { maximumFractionDigits: 5 });
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const sanitizeSymbol = (value: string) => {
  const symbol = String(value || "").trim();
  if (!symbol) return "";
  return symbol.replace(/[^A-Z0-9_./-]/gi, "");
};

const guessPipSize = (symbolRaw: string) => {
  const symbol = sanitizeSymbol(symbolRaw).toUpperCase();
  if (!symbol) return 0.0001;
  if (symbol.includes("XAU") || symbol.includes("GOLD")) return 0.1;
  if (symbol.includes("XAG") || symbol.includes("SILVER")) return 0.01;
  if (symbol.includes("BTC") || symbol.includes("ETH") || symbol.includes("SOL") || symbol.includes("AVAX")) return 1;
  if (symbol.includes("JPY")) return 0.01;
  return 0.0001;
};

const calculateExpected = (trade: UiTrade) => {
  const tp1 = trade.tp1 ?? trade.takeProfit;
  const tp2 = trade.tp2;
  const tp3 = trade.tp3;
  const sl = trade.stopLoss;

  const refPrice = trade.status === "Closed" ? trade.closePrice : trade.currentPrice;
  const entry = trade.entryPrice;

  const directionDelta = (to?: number) => {
    if (to === undefined) return undefined;
    if (!Number.isFinite(entry) || entry === 0) return undefined;
    if (trade.type === "Buy") return to - entry;
    return entry - to;
  };

  const currentMove = directionDelta(refPrice);
  const profit = Number.isFinite(trade.profit) ? trade.profit : 0;
  const perPriceUnit = currentMove && currentMove !== 0 ? profit / currentMove : undefined;

  const expectedProfit = (() => {
    const d = directionDelta(tp1);
    if (d === undefined || perPriceUnit === undefined) return undefined;
    return perPriceUnit * d;
  })();

  const expectedLoss = (() => {
    const d = directionDelta(sl);
    if (d === undefined || perPriceUnit === undefined) return undefined;
    return perPriceUnit * d;
  })();

  const riskRewardRatio = (() => {
    if (expectedProfit === undefined) return undefined;
    if (expectedLoss === undefined) return undefined;
    const denom = Math.abs(expectedLoss);
    if (!Number.isFinite(denom) || denom === 0) return undefined;
    return Math.abs(expectedProfit) / denom;
  })();

  const expectedPips = (() => {
    const pipSize = guessPipSize(trade.symbol);
    const d = directionDelta(tp1);
    if (d === undefined) return undefined;
    if (!Number.isFinite(pipSize) || pipSize <= 0) return undefined;
    return Math.abs(d) / pipSize;
  })();

  const profitPercentage = (() => {
    if (refPrice === undefined) return undefined;
    if (!Number.isFinite(entry) || entry === 0) return undefined;
    const d = directionDelta(refPrice);
    if (d === undefined) return undefined;
    return (d / entry) * 100;
  })();

  return { tp1, tp2, tp3, expectedProfit, expectedLoss, riskRewardRatio, expectedPips, profitPercentage };
};

export const buildWhatsAppMessage = (trade: UiTrade, template: string) => {
  const expected = calculateExpected(trade);
  const sl = trade.stopLoss;
  const tp = expected.tp1;
  const values: Record<string, string> = {
    "{symbol}": trade.symbol,
    "{type}": trade.type,
    "{order_type}": trade.orderType || "-",
    "{lot}": trade.lot.toFixed(2),
    "{entry}": formatPrice(trade.entryPrice),
    "{pending_entry}": formatPrice(trade.entryPrice),
    "{sl}": formatPrice(sl),
    "{tp}": formatPrice(tp),
    "{current}": formatPrice(trade.currentPrice),
    "{close}": formatPrice(trade.closePrice),
    "{profit}": `${trade.profit >= 0 ? "+" : ""}$${trade.profit.toFixed(2)}`,
    "{status}": trade.status,
    "{duration}": trade.duration || "-",
    "{openedAt}": formatDate(trade.openedAt),
    "{closedAt}": formatDate(trade.closedAt),
    "{tp1}": formatPrice(expected.tp1),
    "{tp2}": formatPrice(expected.tp2),
    "{tp3}": formatPrice(expected.tp3),
    "{expected_profit}":
      expected.expectedProfit === undefined ? "-" : `${expected.expectedProfit >= 0 ? "+" : ""}$${expected.expectedProfit.toFixed(2)}`,
    "{expected_loss}":
      expected.expectedLoss === undefined ? "-" : `${expected.expectedLoss >= 0 ? "+" : ""}$${expected.expectedLoss.toFixed(2)}`,
    "{risk_reward_ratio}": expected.riskRewardRatio === undefined ? "-" : expected.riskRewardRatio.toFixed(2),
    "{expected_pips}": expected.expectedPips === undefined ? "-" : expected.expectedPips.toFixed(1),
    "{profit_percentage}":
      expected.profitPercentage === undefined
        ? "-"
        : `${expected.profitPercentage >= 0 ? "+" : ""}${expected.profitPercentage.toFixed(2)}%`,
  };

  return Object.entries(values).reduce(
    (message, [variable, value]) => message.split(variable).join(value),
    template,
  );
};

export const sendWhatsAppMessage = async (settings: WhatsAppAutomationSettings, body: string) => {
  if (!settings.twilioAccountSid || !settings.twilioAuthToken) throw new Error("Missing Twilio credentials");
  if (!settings.twilioFromNumber) throw new Error("Missing Twilio WhatsApp number");
  if (!settings.userToNumber) throw new Error("Missing user WhatsApp number");

  const client = twilio(settings.twilioAccountSid, settings.twilioAuthToken);
  await client.messages.create({
    from: settings.twilioFromNumber,
    to: settings.userToNumber,
    body,
  });
};
