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

export const buildWhatsAppMessage = (trade: UiTrade, template: string) => {
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
