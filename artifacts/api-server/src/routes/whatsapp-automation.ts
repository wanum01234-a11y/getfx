import { Router, type IRouter } from "express";

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

const SETTINGS_KEY = "whatsapp-automation";

const getDbClient = async () => {
  try {
    const mod = await import("@workspace/db");
    const orm = await import("drizzle-orm");
    return { db: mod.db, appSettingsTable: mod.appSettingsTable, eq: orm.eq };
  } catch {
    return null;
  }
};

const parseStored = (value: unknown): StoredWhatsAppAutomation | null => {
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

const sanitizeNumbers = (value: unknown) => {
  const v = String(value ?? "").trim();
  if (!v) return undefined;
  return v;
};

const router: IRouter = Router();

router.get("/settings/whatsapp-automation", async (_req, res) => {
  const client = await getDbClient();
  if (!client) {
    res.json({
      enabled: false,
      sendOpenAlerts: true,
      sendClosedAlerts: true,
      twilioAccountSid: "",
      twilioFromNumber: "",
      userToNumber: "",
      hasAuthToken: false,
      template: "",
    });
    return;
  }

  const { db, appSettingsTable, eq } = client;
  const rows = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, SETTINGS_KEY)).limit(1);
  const raw = (rows[0] as { value?: unknown } | undefined)?.value;
  const stored = parseStored(raw) || {
    enabled: false,
    sendOpenAlerts: true,
    sendClosedAlerts: true,
  };

  res.json({
    enabled: Boolean(stored.enabled),
    sendOpenAlerts: Boolean(stored.sendOpenAlerts),
    sendClosedAlerts: Boolean(stored.sendClosedAlerts),
    twilioAccountSid: stored.twilioAccountSid || "",
    twilioFromNumber: stored.twilioFromNumber || "",
    userToNumber: stored.userToNumber || "",
    hasAuthToken: Boolean(stored.twilioAuthToken),
    template: stored.template || "",
  });
});

router.post("/settings/whatsapp-automation", async (req, res) => {
  const body = (req.body || {}) as Partial<StoredWhatsAppAutomation>;

  const client = await getDbClient();
  if (!client) {
    res.status(500).json({ error: "Database is not available" });
    return;
  }

  const { db, appSettingsTable } = client;

  const next: StoredWhatsAppAutomation = {
    enabled: Boolean(body.enabled),
    sendOpenAlerts: Boolean(body.sendOpenAlerts),
    sendClosedAlerts: Boolean(body.sendClosedAlerts),
    twilioAccountSid: sanitizeNumbers(body.twilioAccountSid),
    twilioAuthToken: sanitizeNumbers(body.twilioAuthToken),
    twilioFromNumber: sanitizeNumbers(body.twilioFromNumber),
    userToNumber: sanitizeNumbers(body.userToNumber),
    template: typeof body.template === "string" ? body.template : undefined,
  };

  await db
    .insert(appSettingsTable)
    .values({ key: SETTINGS_KEY, value: JSON.stringify(next), updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettingsTable.key,
      set: { value: JSON.stringify(next), updatedAt: new Date() },
    });

  res.json({ ok: true });
});

router.post("/whatsapp-automation/test", async (req, res) => {
  const body = (req.body || {}) as { message?: string };

  const client = await getDbClient();
  if (!client) {
    res.status(500).json({ error: "Database is not available" });
    return;
  }

  const { db, appSettingsTable, eq } = client;
  const rows = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, SETTINGS_KEY)).limit(1);
  const raw = (rows[0] as { value?: unknown } | undefined)?.value;
  const stored = parseStored(raw);

  if (!stored?.enabled) {
    res.status(400).json({ error: "Automation is disabled" });
    return;
  }

  const { sendWhatsAppMessage } = await import("../lib/whatsapp-automation");
  const message = String(body.message || "✅ Test message from Fxprotrade WhatsApp Automation");

  try {
    await sendWhatsAppMessage(stored, message);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to send test message" });
  }
});

export default router;
