import { Router, type IRouter } from "express";
import fs from "node:fs";
import path from "node:path";
import { logger } from "../lib/logger";

type Mt5TradePayload = {
  trade_id?: string | number;
  tradeId?: string | number;
  ticket?: string | number;
  symbol?: string;
  type?: string;
  lot?: number;
  volume?: number;
  entryPrice?: number;
  openPrice?: number;
  currentPrice?: number;
  closePrice?: number;
  profit?: number;
  status?: string;
  openedAt?: string;
  closedAt?: string;
};

type Mt5WebhookPayload = {
  trades?: Mt5TradePayload[];
  closedTrades?: Mt5TradePayload[];
  trade?: Mt5TradePayload;
  balance?: number;
  equity?: number;
  currency?: string;
  timestamp?: string;
};

type Mt5ValidationIssue = {
  path: string;
  message: string;
};

export type UiTrade = {
  id: string;
  symbol: string;
  type: "Buy" | "Sell";
  lot: number;
  entryPrice: number;
  currentPrice?: number;
  closePrice?: number;
  profit: number;
  status: "Open" | "Closed";
  duration?: string;
  openedAt: string;
  closedAt?: string;
};

type Mt5Store = {
  tradesById: Map<string, UiTrade>;
  lastAccountSnapshot: {
    balance?: number;
    equity?: number;
    currency?: string;
    timestamp?: string;
  };
};

const store: Mt5Store = {
  tradesById: new Map<string, UiTrade>(),
  lastAccountSnapshot: {},
};

export const clearMt5InMemoryStore = () => {
  store.tradesById.clear();
  store.lastAccountSnapshot = {};
};

const generateSecret = () => {
  return `mt5_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
};

const readEnvFileIntoProcessEnv = () => {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "..", "..", ".env"),
  ];

  for (const filePath of candidates) {
    try {
      if (!fs.existsSync(filePath)) continue;
      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const idx = trimmed.indexOf("=");
        if (idx <= 0) continue;
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        if (!key) continue;
        if (process.env[key] !== undefined) continue;
        process.env[key] = value;
      }
      break;
    } catch {
      // ignore
    }
  }
};

type Mt5SecretInfo = {
  value: string;
  hasSecretFromEnv: boolean;
};

const getOrCreateMt5Secret = (): Mt5SecretInfo => {
  readEnvFileIntoProcessEnv();

  const fromEnv = (process.env.MT5_WEBHOOK_SECRET ?? "").trim();
  if (fromEnv && fromEnv.toUpperCase() !== "CHANGE_ME") {
    return { value: fromEnv, hasSecretFromEnv: true };
  }

  const secretFile = path.resolve(process.cwd(), ".mt5_webhook_secret");
  try {
    if (fs.existsSync(secretFile)) {
      const existing = fs.readFileSync(secretFile, "utf8").trim();
      if (existing) return { value: existing, hasSecretFromEnv: false };
    }
  } catch {
    // ignore
  }

  const generated = generateSecret();
  try {
    fs.writeFileSync(secretFile, `${generated}\n`, { encoding: "utf8" });
  } catch {
    // ignore
  }

  logger.warn(
    {
      secretFile,
    },
    "MT5_WEBHOOK_SECRET is not set; generated a local secret file for persistence. Set MT5_WEBHOOK_SECRET in environment for a stable configured secret.",
  );

  return { value: generated, hasSecretFromEnv: false };
};

const MT5_SECRET_INFO = getOrCreateMt5Secret();
const MT5_SECRET = MT5_SECRET_INFO.value;

const allowNoKey = () => {
  return String(process.env.MT5_WEBHOOK_ALLOW_NO_KEY ?? "").toLowerCase() === "true";
};

const hasDatabase = () => Boolean(process.env.DATABASE_URL);

const sanitizePossibleJsonText = (value: string) => {
  // MT5 WebRequest often appends a null terminator (\u0000) to the payload.
  // Remove null bytes and trim whitespace so JSON.parse can succeed.
  return value.replace(/\u0000/g, "").trim();
};

const parseIncomingWebhookBody = (rawBody: unknown): { ok: true; body: Mt5WebhookPayload } | { ok: false; error: string } => {
  if (rawBody && typeof rawBody === "object") {
    return { ok: true, body: rawBody as Mt5WebhookPayload };
  }

  if (typeof rawBody === "string") {
    try {
      const text = sanitizePossibleJsonText(rawBody);
      const parsed = JSON.parse(text) as unknown;
      if (!parsed || typeof parsed !== "object") return { ok: false, error: "Invalid JSON body" };
      return { ok: true, body: parsed as Mt5WebhookPayload };
    } catch {
      return { ok: false, error: "Invalid JSON body" };
    }
  }

  if (rawBody instanceof Uint8Array) {
    try {
      const text = new TextDecoder("utf-8").decode(rawBody);
      const parsed = JSON.parse(text) as unknown;
      if (!parsed || typeof parsed !== "object") return { ok: false, error: "Invalid JSON body" };
      return { ok: true, body: parsed as Mt5WebhookPayload };
    } catch {
      return { ok: false, error: "Invalid JSON body" };
    }
  }

  return { ok: false, error: "Invalid JSON body" };
};

const validateMt5WebhookPayload = (body: Mt5WebhookPayload): Mt5ValidationIssue[] => {
  const issues: Mt5ValidationIssue[] = [];

  const trades = Array.isArray(body.trades) ? body.trades : [];
  const closedTrades = Array.isArray(body.closedTrades) ? body.closedTrades : [];
  const single = body.trade ? [body.trade] : [];
  const allTrades = [...trades, ...closedTrades, ...single];

  const hasAnyTrade = allTrades.length > 0;
  const hasAccountSnapshot =
    body.balance !== undefined ||
    body.equity !== undefined ||
    (typeof body.currency === "string" && body.currency.trim().length > 0);

  if (!hasAnyTrade && !hasAccountSnapshot) {
    issues.push({
      path: "root",
      message: "Payload must include at least one trade (trades/trade/closedTrades) or account snapshot fields (balance/equity/currency).",
    });
  }

  allTrades.forEach((t, idx) => {
    if (!t || typeof t !== "object") {
      issues.push({ path: `trades[${idx}]`, message: "Trade must be an object." });
      return;
    }

    const trade = t as Mt5TradePayload;
    const ticketStr = coalesceString(trade.trade_id, trade.tradeId, trade.ticket);
    if (!ticketStr) {
      issues.push({ path: `trades[${idx}]`, message: "trade_id (or ticket) is required." });
    }

    const symbol = (t as Mt5TradePayload).symbol;
    if (symbol !== undefined && String(symbol).trim().length === 0) {
      issues.push({ path: `trades[${idx}].symbol`, message: "symbol cannot be empty when provided." });
    }
  });

  return issues;
};

type DbTradeRow = {
  id: string;
  symbol: string;
  type: string;
  lot: unknown;
  entryPrice: unknown;
  currentPrice: unknown;
  closePrice: unknown;
  profit: unknown;
  status: string;
  openedAt: Date;
  closedAt: Date | null;
};

type DbAccountRow = {
  id: string;
  balance: unknown;
  equity: unknown;
  currency: string | null;
  timestamp: Date | null;
};

const getDbClient = async () => {
  try {
    const mod = await import("@workspace/db");
    const orm = await import("drizzle-orm");
    return {
      db: mod.db,
      mt5TradesTable: mod.mt5TradesTable,
      mt5AccountTable: mod.mt5AccountTable,
      appSettingsTable: mod.appSettingsTable,
      eq: orm.eq,
    };
  } catch {
    return null;
  }
};

const SETTINGS_KEY = "whatsapp-automation";

type StoredWhatsAppAutomation = {
  enabled: boolean;
  sendOpenAlerts: boolean;
  sendClosedAlerts: boolean;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
  userToNumber?: string;
  template?: string;
};

const parseStoredSettings = (value: unknown): StoredWhatsAppAutomation | null => {
  try {
    if (!value) return null;
    if (typeof value !== "string") return null;
    const parsed = JSON.parse(value) as StoredWhatsAppAutomation;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
};

const hasOwn = (obj: unknown, key: string) => {
  if (!obj || typeof obj !== "object") return false;
  return Object.prototype.hasOwnProperty.call(obj, key);
};

const normalizeTradeType = (value: unknown): "Buy" | "Sell" => {
  const raw = String(value ?? "").toLowerCase();
  if (raw === "buy" || raw === "0" || raw === "long") return "Buy";
  return "Sell";
};

const normalizeStatus = (value: unknown): "Open" | "Closed" => {
  const raw = String(value ?? "").toLowerCase();
  if (raw === "closed" || raw === "close" || raw === "1") return "Closed";
  return "Open";
};

const toNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return undefined;
  return num;
};

const coalesceNumber = (...values: unknown[]): number | undefined => {
  for (const v of values) {
    const n = toNumber(v);
    if (n !== undefined) return n;
  }
  return undefined;
};

const coalesceString = (...values: unknown[]): string | undefined => {
  for (const v of values) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s.length > 0) return s;
  }
  return undefined;
};

const sanitizeSymbol = (value: unknown) => {
  const symbol = String(value ?? "").trim();
  if (!symbol) return "UNKNOWN";
  return symbol.replace(/[^A-Z0-9_./-]/gi, "");
};

const mapMt5TradeToUiTrade = (payload: Mt5TradePayload): UiTrade | null => {
  const id = coalesceString(payload.trade_id, payload.tradeId, payload.ticket);
  if (!id) return null;

  const status = normalizeStatus(payload.status);
  const openedAt = coalesceString(payload.openedAt) || new Date().toISOString();

  const entryPrice = coalesceNumber(payload.entryPrice, payload.openPrice) ?? 0;

  const uiTrade: UiTrade = {
    id: String(id),
    symbol: sanitizeSymbol(payload.symbol),
    type: normalizeTradeType(payload.type),
    lot: coalesceNumber(payload.lot, payload.volume) ?? 0,
    entryPrice,
    currentPrice: coalesceNumber(payload.currentPrice),
    closePrice: coalesceNumber(payload.closePrice),
    profit: coalesceNumber(payload.profit) ?? 0,
    status,
    openedAt,
    closedAt: status === "Closed" ? coalesceString(payload.closedAt) : undefined,
  };

  return uiTrade;
};

const getTicketFromPayload = (payload: Mt5TradePayload): string | undefined => {
  const t = coalesceString(payload.ticket);
  return t ? String(t) : undefined;
};

const mergeUiTrade = (existing: UiTrade | undefined, next: UiTrade): UiTrade => {
  if (!existing) return next;

  return {
    ...existing,
    ...next,
    currentPrice: next.currentPrice ?? existing.currentPrice,
    closePrice: next.closePrice ?? existing.closePrice,
    closedAt: next.closedAt ?? existing.closedAt,
  };
};

const getTrades = (status: "Open" | "Closed") => {
  return Array.from(store.tradesById.values()).filter((t) => t.status === status);
};

const toDbNumeric = (value?: number) => {
  if (value === undefined) return null;
  if (Number.isNaN(value)) return null;
  return String(value);
};

const toDbTimestamp = (value?: string) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const fromDbNumeric = (value: unknown): number | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number") return value;
  const n = Number(value);
  if (Number.isNaN(n)) return undefined;
  return n;
};

const rowToUiTrade = (row: DbTradeRow): UiTrade => {
  return {
    id: row.id,
    symbol: row.symbol,
    type: row.type === "Buy" ? "Buy" : "Sell",
    lot: fromDbNumeric(row.lot) ?? 0,
    entryPrice: fromDbNumeric(row.entryPrice) ?? 0,
    currentPrice: fromDbNumeric(row.currentPrice),
    closePrice: fromDbNumeric(row.closePrice),
    profit: fromDbNumeric(row.profit) ?? 0,
    status: row.status === "Closed" ? "Closed" : "Open",
    openedAt: row.openedAt.toISOString(),
    closedAt: row.closedAt ? row.closedAt.toISOString() : undefined,
  };
};

const router: IRouter = Router();

router.get("/settings/mt5", (req, res) => {
  const baseUrl = process.env.PUBLIC_BASE_URL;
  const inferredOrigin = `${req.protocol}://${req.get("host")}`;
  const origin = baseUrl || inferredOrigin;

  const noKeyUrl = `${origin}/api/webhook/mt5`;
  const withKeyUrl = `${noKeyUrl}?key=${encodeURIComponent(MT5_SECRET)}`;

  res.json({
    webhookUrl: withKeyUrl,
    webhookUrlWithKey: withKeyUrl,
    webhookUrlNoKey: noKeyUrl,
    requireKey: !allowNoKey(),
    hasSecretFromEnv: MT5_SECRET_INFO.hasSecretFromEnv,
  });
});

router.post("/webhook/mt5", async (req, res) => {
  try {
    const key = String(req.query.key ?? "");
    const requireKey = !allowNoKey();
    if (requireKey) {
      if (!key) {
        req.log.warn({ query: req.query }, "MT5 webhook missing key");
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      if (key !== MT5_SECRET) {
        req.log.warn({ query: req.query }, "MT5 webhook invalid key");
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      req.log.info("MT5 webhook key validated");
    }

    const rawBody: unknown = req.body;
    req.log.info(
      {
        contentType: req.get("content-type"),
        query: req.query,
        bodyType: rawBody === null ? "null" : typeof rawBody,
        body: typeof rawBody === "string" ? sanitizePossibleJsonText(rawBody) : rawBody,
      },
      "MT5 webhook received",
    );

    const parsed = parseIncomingWebhookBody(rawBody);
    if (!parsed.ok) {
      req.log.warn(
        {
          contentType: req.get("content-type"),
          query: req.query,
          bodyType: rawBody === null ? "null" : typeof rawBody,
          body: rawBody,
        },
        "MT5 webhook invalid JSON body",
      );
      res.status(400).json({ error: parsed.error });
      return;
    }

    const body = parsed.body;
    const issues = validateMt5WebhookPayload(body);
    if (issues.length > 0) {
      req.log.warn({ issues, body }, "MT5 webhook validation failed");
      res.status(400).json({ error: "ValidationError", issues });
      return;
    }

    const tradeList = Array.isArray(body.trades) ? body.trades : [];
    const closedTradeList = Array.isArray(body.closedTrades) ? body.closedTrades : [];
    const singleTrade = body.trade ? [body.trade] : [];
    const trades = [...tradeList, ...closedTradeList, ...singleTrade];

    const mappedTrades: Array<{ trade: UiTrade; raw: Mt5TradePayload; previous?: UiTrade }> = [];
    const events: Array<{ kind: "open" | "closed"; trade: UiTrade }> = [];
    for (const t of trades) {
      const mapped = mapMt5TradeToUiTrade(t);
      if (mapped) {
        const existing = store.tradesById.get(mapped.id);
        const merged = mergeUiTrade(existing, mapped);
        store.tradesById.set(mapped.id, merged);
        mappedTrades.push({ trade: merged, raw: t, previous: existing });

        if (!existing && merged.status === "Open") events.push({ kind: "open", trade: merged });
        if (existing && existing.status === "Open" && merged.status === "Closed") {
          events.push({ kind: "closed", trade: merged });
        }
      }
    }

    store.lastAccountSnapshot = {
      balance: coalesceNumber(body.balance) ?? store.lastAccountSnapshot.balance,
      equity: coalesceNumber(body.equity) ?? store.lastAccountSnapshot.equity,
      currency: coalesceString(body.currency) ?? store.lastAccountSnapshot.currency,
      timestamp: coalesceString(body.timestamp) ?? new Date().toISOString(),
    };

    let persisted = false;
    if (hasDatabase()) {
      try {
        const client = await getDbClient();
        if (!client) {
          req.log.error("MT5 webhook database client unavailable");
          res.status(500).json({ error: "Database is not available" });
          return;
        }

        const { db, mt5TradesTable, mt5AccountTable, appSettingsTable, eq } = client;

        for (const { trade, raw } of mappedTrades) {
          const ticket = getTicketFromPayload(raw);
          const tradeSet: Record<string, unknown> = {
            ticket: ticket ?? null,
            symbol: trade.symbol,
            type: trade.type,
            lot: toDbNumeric(trade.lot) ?? "0",
            entryPrice: toDbNumeric(trade.entryPrice) ?? "0",
            profit: toDbNumeric(trade.profit) ?? "0",
            status: trade.status,
            openedAt: toDbTimestamp(trade.openedAt) ?? new Date(),
            updatedAt: new Date(),
          };

          if (hasOwn(raw, "currentPrice")) tradeSet.currentPrice = toDbNumeric(trade.currentPrice) ?? null;
          if (hasOwn(raw, "closePrice")) tradeSet.closePrice = toDbNumeric(trade.closePrice) ?? null;
          if (hasOwn(raw, "profit")) tradeSet.profit = toDbNumeric(trade.profit) ?? "0";
          if (hasOwn(raw, "closedAt")) tradeSet.closedAt = toDbTimestamp(trade.closedAt) ?? null;
          if (hasOwn(raw, "openedAt")) tradeSet.openedAt = toDbTimestamp(trade.openedAt) ?? new Date();

          const insertValues: Record<string, unknown> = {
            id: trade.id,
            ticket: ticket ?? null,
            symbol: trade.symbol,
            type: trade.type,
            lot: toDbNumeric(trade.lot) ?? "0",
            entryPrice: toDbNumeric(trade.entryPrice) ?? "0",
            currentPrice: toDbNumeric(trade.currentPrice) ?? null,
            closePrice: toDbNumeric(trade.closePrice) ?? null,
            profit: toDbNumeric(trade.profit) ?? "0",
            status: trade.status,
            openedAt: toDbTimestamp(trade.openedAt) ?? new Date(),
            closedAt: toDbTimestamp(trade.closedAt) ?? null,
            raw,
          };

          if (ticket) {
            // Ticket-based upsert prevents duplicates when open/close use different ids.
            await db
              .insert(mt5TradesTable)
              .values(insertValues as never)
              .onConflictDoUpdate({
                target: mt5TradesTable.ticket,
                set: tradeSet as never,
              });
          } else {
            // Fallback: id-based upsert.
            await db
              .insert(mt5TradesTable)
              .values(insertValues as never)
              .onConflictDoUpdate({
                target: mt5TradesTable.id,
                set: tradeSet as never,
              });
          }
        }

        await db
          .insert(mt5AccountTable)
          .values({
            id: "default",
            balance: toDbNumeric(store.lastAccountSnapshot.balance),
            equity: toDbNumeric(store.lastAccountSnapshot.equity),
            currency: store.lastAccountSnapshot.currency ?? null,
            timestamp: toDbTimestamp(store.lastAccountSnapshot.timestamp),
          })
          .onConflictDoUpdate({
            target: mt5AccountTable.id,
            set: {
              balance: toDbNumeric(store.lastAccountSnapshot.balance),
              equity: toDbNumeric(store.lastAccountSnapshot.equity),
              currency: store.lastAccountSnapshot.currency ?? null,
              timestamp: toDbTimestamp(store.lastAccountSnapshot.timestamp),
              updatedAt: new Date(),
            },
          });

        if (events.length > 0) {
          try {
            const rows = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, SETTINGS_KEY)).limit(1);
            const raw = (rows[0] as { value?: unknown } | undefined)?.value;
            const settings = parseStoredSettings(raw);
            if (settings?.enabled) {
              const { buildWhatsAppMessage, DEFAULT_WHATSAPP_TEMPLATE, sendWhatsAppMessage } = await import(
                "../lib/whatsapp-automation",
              );

              for (const event of events) {
                if (event.kind === "open" && !settings.sendOpenAlerts) continue;
                if (event.kind === "closed" && !settings.sendClosedAlerts) continue;

                const template = settings.template || DEFAULT_WHATSAPP_TEMPLATE;
                const message = buildWhatsAppMessage(event.trade, template);
                await sendWhatsAppMessage(settings, message);
              }
            }
          } catch (err) {
            req.log.warn({ err }, "MT5 webhook WhatsApp automation error (ignored)");
          }
        }

        persisted = true;
      } catch (err) {
        const anyErr = err as {
          code?: string;
          cause?: { code?: string; message?: string };
          message?: string;
        };
        const code = anyErr?.code || anyErr?.cause?.code;
        const msg = String(anyErr?.message || anyErr?.cause?.message || "");
        const relationMissing = code === "42P01" || msg.includes("does not exist") || msg.includes("relation \"mt5_trades\"");

        if (relationMissing) {
          req.log.error({ err }, "MT5 webhook database schema missing (run drizzle push). Skipping persistence.");
          persisted = false;
        } else {
          req.log.error({ err, body }, "MT5 webhook failed to persist MT5 data");
          res.status(500).json({ error: "Failed to persist MT5 data" });
          return;
        }
      }
    }

    res.json({ ok: true, processed: mappedTrades.length, persisted });
  } catch (err) {
    req.log.error({ err }, "MT5 webhook unhandled error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.get("/mt5/trades/open", async (_req, res) => {
  if (hasDatabase()) {
    try {
      const client = await getDbClient();
      if (!client) throw new Error("DB unavailable");
      const { db, mt5TradesTable, eq } = client;
      const rows = await db.select().from(mt5TradesTable).where(eq(mt5TradesTable.status, "Open"));
      res.json({ trades: (rows as DbTradeRow[]).map(rowToUiTrade) });
      return;
    } catch {
      res.json({ trades: getTrades("Open") });
      return;
    }
  }

  res.json({ trades: getTrades("Open") });
});

router.get("/mt5/trades/closed", async (_req, res) => {
  if (hasDatabase()) {
    try {
      const client = await getDbClient();
      if (!client) throw new Error("DB unavailable");
      const { db, mt5TradesTable, eq } = client;
      const rows = await db.select().from(mt5TradesTable).where(eq(mt5TradesTable.status, "Closed"));
      res.json({ trades: (rows as DbTradeRow[]).map(rowToUiTrade) });
      return;
    } catch {
      res.json({ trades: getTrades("Closed") });
      return;
    }
  }

  res.json({ trades: getTrades("Closed") });
});

router.get("/mt5/account", async (_req, res) => {
  if (hasDatabase()) {
    try {
      const client = await getDbClient();
      if (!client) throw new Error("DB unavailable");
      const { db, mt5AccountTable, eq } = client;
      const rows = await db.select().from(mt5AccountTable).where(eq(mt5AccountTable.id, "default")).limit(1);
      const row = rows[0] as DbAccountRow | undefined;
      res.json({
        account: row
          ? {
              balance: fromDbNumeric(row.balance),
              equity: fromDbNumeric(row.equity),
              currency: row.currency ?? undefined,
              timestamp: row.timestamp ? row.timestamp.toISOString() : undefined,
            }
          : {},
      });
      return;
    } catch {
      res.json({ account: store.lastAccountSnapshot });
      return;
    }
  }

  res.json({ account: store.lastAccountSnapshot });
});

export default router;
