import { Router, type IRouter } from "express";

type PipSettingRow = {
  id: number;
  symbol: string;
  category: string;
  pipSize: unknown;
  updatedAt: Date;
};

type PipSettingInput = {
  symbol?: unknown;
  category?: unknown;
  pipSize?: unknown;
};

const getDbClient = async () => {
  try {
    const mod = await import("@workspace/db");
    const orm = await import("drizzle-orm");
    return {
      db: mod.db,
      pipSettingsTable: mod.pipSettingsTable,
      eq: orm.eq,
    };
  } catch {
    return null;
  }
};

const normalizeSymbol = (value: unknown) => {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
};

const normalizeCategory = (value: unknown) => {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (raw === "forex" || raw === "crypto" || raw === "commodity" || raw === "index") return raw;
  return "forex";
};

const parsePipSize = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
};

const toDbNumeric = (value: number) => {
  return String(value);
};

const fromDbNumeric = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
};

const DEFAULT_SEED: Array<{ symbol: string; category: string; pipSize: number }> = [
  { symbol: "EURUSD", category: "forex", pipSize: 0.0001 },
  { symbol: "GBPUSD", category: "forex", pipSize: 0.0001 },
  { symbol: "USDJPY", category: "forex", pipSize: 0.01 },
  { symbol: "XAUUSD", category: "commodity", pipSize: 0.01 },
  { symbol: "XAGUSD", category: "commodity", pipSize: 0.01 },
  { symbol: "USOIL", category: "commodity", pipSize: 0.01 },
  { symbol: "BTCUSD", category: "crypto", pipSize: 0.1 },
  { symbol: "ETHUSD", category: "crypto", pipSize: 0.1 },
  { symbol: "US30", category: "index", pipSize: 1 },
  { symbol: "NAS100", category: "index", pipSize: 1 },
];

type CacheState = {
  rows: Array<{ id: number; symbol: string; category: string; pipSize: number; updatedAt: string }>;
  loadedAt: number;
};

 const isMissingPipSettingsTableError = (err: unknown) => {
   const anyErr = err as { code?: unknown; message?: unknown } | null;
   if (!anyErr) return false;
   // Postgres: undefined_table
   if (anyErr.code === "42P01") return true;
   const message = typeof anyErr.message === "string" ? anyErr.message : "";
   return message.toLowerCase().includes("pip_settings") && message.toLowerCase().includes("does not exist");
 };

const cache: CacheState = {
  rows: [],
  loadedAt: 0,
};

const CACHE_TTL_MS = 60_000;

const invalidateCache = () => {
  cache.loadedAt = 0;
  cache.rows = [];
};

const ensureSeeded = async () => {
  const client = await getDbClient();
  if (!client) return;

  try {
    const existing = (await client.db.select().from(client.pipSettingsTable).limit(1)) as unknown as PipSettingRow[];
    if (existing.length > 0) return;

    await client.db.transaction(async (tx) => {
      for (const item of DEFAULT_SEED) {
        await tx
          .insert(client.pipSettingsTable)
          .values({
            symbol: item.symbol,
            category: item.category,
            pipSize: toDbNumeric(item.pipSize),
          })
          .onConflictDoUpdate({
            target: client.pipSettingsTable.symbol,
            set: {
              category: item.category,
              pipSize: toDbNumeric(item.pipSize),
              updatedAt: new Date(),
            },
          });
      }
    });

    invalidateCache();
  } catch {
    // ignore
  }
};

const getCachedRows = async () => {
  const now = Date.now();
  if (cache.loadedAt && now - cache.loadedAt < CACHE_TTL_MS) return cache.rows;

  const client = await getDbClient();
  if (!client) return [];

  try {
    await ensureSeeded();

    const rows = (await client.db.select().from(client.pipSettingsTable)) as unknown as PipSettingRow[];
    cache.rows = rows.map((r) => ({
      id: r.id,
      symbol: r.symbol,
      category: r.category,
      pipSize: fromDbNumeric(r.pipSize) ?? 0,
      updatedAt: r.updatedAt?.toISOString?.() ? r.updatedAt.toISOString() : new Date().toISOString(),
    }));
    cache.loadedAt = now;
    return cache.rows;
  } catch (err) {
    // If migrations haven't been applied yet, do not crash the app.
    // Serve in-memory defaults so pip calculations stay sane.
    if (isMissingPipSettingsTableError(err)) {
      cache.rows = DEFAULT_SEED.map((r, idx) => ({
        id: idx + 1,
        symbol: r.symbol,
        category: r.category,
        pipSize: r.pipSize,
        updatedAt: new Date().toISOString(),
      }));
      cache.loadedAt = now;
      return cache.rows;
    }

    throw err;
  }
};

const router: IRouter = Router();

router.get("/pip-settings", async (req, res) => {
  try {
    const rows = await getCachedRows();
    res.json({ pipSettings: rows });
  } catch (err) {
    req.log.error({ err }, "Failed to load pip settings");
    res.status(500).json({ error: "FailedToLoadPipSettings" });
  }
});

router.post("/pip-settings", async (req, res) => {
  const client = await getDbClient();
  if (!client) {
    res.status(503).json({ error: "DatabaseUnavailable" });
    return;
  }

  const body = (req.body ?? {}) as PipSettingInput;
  const symbol = normalizeSymbol(body.symbol);
  const category = normalizeCategory(body.category);
  const pipSize = parsePipSize(body.pipSize);

  if (!symbol) {
    res.status(400).json({ error: "ValidationError", message: "symbol is required" });
    return;
  }
  if (pipSize === null || pipSize <= 0 || pipSize > 1_000_000) {
    res.status(400).json({ error: "ValidationError", message: "pip_size must be a positive number" });
    return;
  }

  try {
    const inserted = await client.db
      .insert(client.pipSettingsTable)
      .values({ symbol, category, pipSize: toDbNumeric(pipSize) })
      .onConflictDoUpdate({
        target: client.pipSettingsTable.symbol,
        set: { category, pipSize: toDbNumeric(pipSize), updatedAt: new Date() },
      })
      .returning();

    invalidateCache();

    const row = (inserted?.[0] as unknown as PipSettingRow | undefined) ?? null;
    res.json({ ok: true, pipSetting: row ? { id: row.id, symbol: row.symbol, category: row.category, pipSize } : null });
  } catch (err) {
    req.log.error({ err, symbol }, "Failed to create/update pip setting");
    res.status(500).json({ error: "FailedToSavePipSetting" });
  }
});

router.put("/pip-settings/:id", async (req, res) => {
  const client = await getDbClient();
  if (!client) {
    res.status(503).json({ error: "DatabaseUnavailable" });
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "ValidationError", message: "id is invalid" });
    return;
  }

  const body = (req.body ?? {}) as PipSettingInput;
  const symbol = body.symbol !== undefined ? normalizeSymbol(body.symbol) : undefined;
  const category = body.category !== undefined ? normalizeCategory(body.category) : undefined;
  const pipSize = body.pipSize !== undefined ? parsePipSize(body.pipSize) : undefined;

  if (pipSize !== undefined && (pipSize === null || pipSize <= 0 || pipSize > 1_000_000)) {
    res.status(400).json({ error: "ValidationError", message: "pip_size must be a positive number" });
    return;
  }

  try {
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (symbol !== undefined) set.symbol = symbol;
    if (category !== undefined) set.category = category;
    if (pipSize !== undefined) set.pipSize = toDbNumeric(pipSize);

    const updated = await client.db.update(client.pipSettingsTable).set(set).where(client.eq(client.pipSettingsTable.id, id)).returning();

    invalidateCache();

    const row = (updated?.[0] as unknown as PipSettingRow | undefined) ?? null;
    res.json({ ok: true, pipSetting: row ? { id: row.id, symbol: row.symbol, category: row.category, pipSize: fromDbNumeric(row.pipSize) } : null });
  } catch (err) {
    req.log.error({ err, id }, "Failed to update pip setting");
    res.status(500).json({ error: "FailedToUpdatePipSetting" });
  }
});

router.delete("/pip-settings/:id", async (req, res) => {
  const client = await getDbClient();
  if (!client) {
    res.status(503).json({ error: "DatabaseUnavailable" });
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "ValidationError", message: "id is invalid" });
    return;
  }

  try {
    await client.db.delete(client.pipSettingsTable).where(client.eq(client.pipSettingsTable.id, id)).execute();
    invalidateCache();
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err, id }, "Failed to delete pip setting");
    res.status(500).json({ error: "FailedToDeletePipSetting" });
  }
});

export default router;
