import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { clearMt5InMemoryStore } from "./mt5";

type SettingsRow = {
  id: number;
  key: string;
  value: string;
};

const getDbClient = async () => {
  try {
    const mod = await import("@workspace/db");
    const orm = await import("drizzle-orm");
    return {
      db: mod.db,
      settingsTable: mod.settingsTable,
      mt5TradesTable: mod.mt5TradesTable,
      mt5AccountTable: mod.mt5AccountTable,
      eq: orm.eq,
    };
  } catch {
    return null;
  }
};

const router: IRouter = Router();

router.get("/settings", async (req, res) => {
  const client = await getDbClient();
  if (!client) {
    res.status(503).json({ error: "SettingsUnavailable" });
    return;
  }

  try {
    const rows = (await client.db.select().from(client.settingsTable)) as unknown as SettingsRow[];
    const settings: Record<string, string> = {};
    for (const row of rows) settings[row.key] = row.value;
    res.json({ settings });
  } catch (err) {
    req.log.error({ err }, "Failed to load settings");
    res.status(500).json({ error: "FailedToLoadSettings" });
  }
});

router.post("/settings", async (req, res) => {
  const client = await getDbClient();
  if (!client) {
    res.status(503).json({ error: "SettingsUnavailable" });
    return;
  }

  const key = String((req.body as { key?: unknown } | undefined)?.key ?? "").trim();
  const value = String((req.body as { value?: unknown } | undefined)?.value ?? "");
  if (!key) {
    res.status(400).json({ error: "ValidationError", message: "key is required" });
    return;
  }

  try {
    await client.db
      .insert(client.settingsTable)
      .values({ key, value })
      .onConflictDoUpdate({
        target: client.settingsTable.key,
        set: { value, updatedAt: new Date() },
      });

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err, key }, "Failed to save setting");
    res.status(500).json({ error: "FailedToSaveSetting" });
  }
});

router.post("/clear-data", async (req, res) => {
  const client = await getDbClient();
  if (!client) {
    res.status(503).json({ error: "DatabaseUnavailable" });
    return;
  }

  try {
    req.log.info("Clearing MT5 dashboard data");
    await client.db.transaction(async (tx) => {
      // Use TRUNCATE for a complete reset. Keep settings/system config tables intact.
      await tx.execute(sql.raw("TRUNCATE TABLE mt5_trades RESTART IDENTITY CASCADE"));
      await tx.execute(sql.raw("TRUNCATE TABLE mt5_account RESTART IDENTITY CASCADE"));

      await tx.insert(client.mt5AccountTable).values({ id: "default", totalTrades: 0 } as never);
    });

    clearMt5InMemoryStore();

    const tradeCountRows = await client.db
      .select({ count: sql<number>`count(*)` })
      .from(client.mt5TradesTable);
    const accountCountRows = await client.db
      .select({ count: sql<number>`count(*)` })
      .from(client.mt5AccountTable);

    const tradesCount = Number((tradeCountRows[0] as { count?: unknown } | undefined)?.count ?? 0);
    const accountCount = Number((accountCountRows[0] as { count?: unknown } | undefined)?.count ?? 0);

    req.log.info("Cleared MT5 dashboard data");

    req.log.info({ tradesCount, accountCount }, "Clear-data verification counts");

    res.json({ ok: true, counts: { mt5Trades: tradesCount, mt5Account: accountCount } });
  } catch (err) {
    req.log.error({ err }, "Failed to clear dashboard data");
    res.status(500).json({ error: "FailedToClearData" });
  }
});

export default router;
