import { Router, type IRouter } from "express";

type Mt5TradePayload = {
  ticket: string | number;
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
  trade?: Mt5TradePayload;
  balance?: number;
  equity?: number;
  currency?: string;
  timestamp?: string;
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

const generateSecret = () => {
  return `mt5_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
};

const getMt5Secret = () => {
  return process.env.MT5_WEBHOOK_SECRET || process.env.MT5_SECRET || process.env.WEBHOOK_SECRET || generateSecret();
};

const MT5_SECRET = getMt5Secret();

const allowNoKey = () => {
  return String(process.env.MT5_WEBHOOK_ALLOW_NO_KEY ?? "").toLowerCase() === "true";
};

const hasDatabase = () => Boolean(process.env.DATABASE_URL);

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
  const id = coalesceString(payload.ticket);
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
    hasSecretFromEnv: Boolean(process.env.MT5_WEBHOOK_SECRET || process.env.MT5_SECRET || process.env.WEBHOOK_SECRET),
  });
});

router.post("/webhook/mt5", async (req, res) => {
  const key = String(req.query.key ?? "");
  const requireKey = !allowNoKey();
  if (requireKey && (!key || key !== MT5_SECRET)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const rawBody: unknown = req.body;
  if (!rawBody || typeof rawBody !== "object") {
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }

  const body = rawBody as Mt5WebhookPayload;
  const trades = Array.isArray(body.trades)
    ? body.trades
    : body.trade
      ? [body.trade]
      : [];

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
      if (existing && existing.status === "Open" && merged.status === "Closed") events.push({ kind: "closed", trade: merged });
    }
  }

  store.lastAccountSnapshot = {
    balance: coalesceNumber(body.balance) ?? store.lastAccountSnapshot.balance,
    equity: coalesceNumber(body.equity) ?? store.lastAccountSnapshot.equity,
    currency: coalesceString(body.currency) ?? store.lastAccountSnapshot.currency,
    timestamp: coalesceString(body.timestamp) ?? new Date().toISOString(),
  };

  if (hasDatabase()) {
    try {
      const client = await getDbClient();
      if (!client) {
        res.status(500).json({ error: "Database is not available" });
        return;
      }

      const { db, mt5TradesTable, mt5AccountTable, appSettingsTable, eq } = client;

      for (const { trade, raw } of mappedTrades) {
        const tradeSet: Record<string, unknown> = {
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

        await db
          .insert(mt5TradesTable)
          .values({
            id: trade.id,
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
          })
          .onConflictDoUpdate({
            target: mt5TradesTable.id,
            set: tradeSet as never,
          });
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
              "../lib/whatsapp-automation"
            );

            for (const event of events) {
              if (event.kind === "open" && !settings.sendOpenAlerts) continue;
              if (event.kind === "closed" && !settings.sendClosedAlerts) continue;

              const template = settings.template || DEFAULT_WHATSAPP_TEMPLATE;
              const message = buildWhatsAppMessage(event.trade, template);
              await sendWhatsAppMessage(settings, message);
            }
          }
        } catch {
          // ignore automation errors to avoid breaking webhook
        }
      }
    } catch {
      res.status(500).json({ error: "Failed to persist MT5 data" });
      return;
    }
  }

  res.json({ ok: true, processed: mappedTrades.length });
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
