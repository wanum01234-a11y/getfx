import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
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
    await client.db.transaction(async (tx) => {
      await tx.delete(client.mt5TradesTable).execute();
      await tx.delete(client.mt5AccountTable).execute();
    });

    clearMt5InMemoryStore();

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to clear dashboard data");
    res.status(500).json({ error: "FailedToClearData" });
  }
});

export default router;
