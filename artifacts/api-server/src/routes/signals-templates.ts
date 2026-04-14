import { Router, type IRouter } from "express";

type SignalsTemplateRow = {
  id: string;
  title: string;
  category: string;
  content: string;
  updatedAt: Date;
};

type CreateBody = {
  title?: unknown;
  category?: unknown;
  content?: unknown;
};

type UpdateBody = {
  id?: unknown;
  title?: unknown;
  category?: unknown;
  content?: unknown;
};

const DEFAULT_TEMPLATES: Array<{ id: string; title: string; category: string; content: string }> = [
  {
    id: "signal_new_trade",
    title: "New Trade Signal",
    category: "New Trade",
    content:
      "🚀 New Trade\nSymbol: {symbol}\nType: {type}\nEntry: {entry}\nSL: {sl}\nTP: {tp}\nTotal Trades: {total_trades}\nWin Rate: {win_rate}",
  },
  {
    id: "signal_profit_booked",
    title: "Profit Booked",
    category: "Profit Booked",
    content: "✅ Profit Booked\nSymbol: {symbol}\nProfit: {profit}\nTotal Trades: {total_trades}\nWin Rate: {win_rate}",
  },
  {
    id: "signal_sl_hit",
    title: "Stop Loss Hit",
    category: "Stop Loss",
    content: "🛑 Stop Loss Hit\nSymbol: {symbol}\nType: {type}\nEntry: {entry}\nSL: {sl}\nProfit: {profit}",
  },
  {
    id: "signal_daily_summary",
    title: "Daily Summary",
    category: "Daily Summary",
    content:
      "📊 Daily Summary\nTotal Trades: {total_trades}\nWin Rate: {win_rate}\nBalance: {balance}\nEquity: {equity}",
  },
];

const getDbClient = async () => {
  try {
    const mod = await import("@workspace/db");
    const orm = await import("drizzle-orm");
    return {
      db: mod.db,
      signalsTemplatesTable: mod.signalsTemplatesTable,
      eq: orm.eq,
    };
  } catch {
    return null;
  }
};

const sanitizeText = (value: unknown) => {
  const v = String(value ?? "").trim();
  return v;
};

const ensureSeeded = async () => {
  const client = await getDbClient();
  if (!client) return;

  const { db, signalsTemplatesTable } = client;

  try {
    for (const t of DEFAULT_TEMPLATES) {
      await db
        .insert(signalsTemplatesTable)
        .values({
          id: t.id,
          title: t.title,
          category: t.category,
          content: t.content,
          updatedAt: new Date(),
        } as never)
        .onConflictDoNothing();
    }
  } catch {
    // ignore seeding errors
  }
};

const router: IRouter = Router();

router.get("/signals-templates", async (_req, res) => {
  await ensureSeeded();

  const client = await getDbClient();
  if (!client) {
    res.status(503).json({ error: "DatabaseUnavailable" });
    return;
  }

  const { db, signalsTemplatesTable } = client;
  const rows = (await db.select().from(signalsTemplatesTable)) as unknown as SignalsTemplateRow[];
  const templates = rows
    .map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      content: r.content,
      updatedAt: r.updatedAt?.toISOString?.() ?? undefined,
    }))
    .sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")));

  res.json({ templates });
});

router.post("/signals-templates", async (req, res) => {
  const client = await getDbClient();
  if (!client) {
    res.status(503).json({ error: "DatabaseUnavailable" });
    return;
  }

  const body = (req.body || {}) as CreateBody;
  const title = sanitizeText(body.title);
  const category = sanitizeText(body.category);
  const content = sanitizeText(body.content);

  if (!title || !category || !content) {
    res.status(400).json({ error: "ValidationError", message: "title, category, content are required" });
    return;
  }

  const id = `sig_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;

  const { db, signalsTemplatesTable } = client;
  await db.insert(signalsTemplatesTable).values({ id, title, category, content, updatedAt: new Date() } as never);

  res.json({ ok: true, id });
});

router.put("/signals-templates", async (req, res) => {
  const client = await getDbClient();
  if (!client) {
    res.status(503).json({ error: "DatabaseUnavailable" });
    return;
  }

  const body = (req.body || {}) as UpdateBody;
  const id = sanitizeText(body.id);
  const title = sanitizeText(body.title);
  const category = sanitizeText(body.category);
  const content = sanitizeText(body.content);

  if (!id || !title || !category || !content) {
    res.status(400).json({ error: "ValidationError", message: "id, title, category, content are required" });
    return;
  }

  const { db, signalsTemplatesTable, eq } = client;
  await db
    .update(signalsTemplatesTable)
    .set({ title, category, content, updatedAt: new Date() } as never)
    .where(eq(signalsTemplatesTable.id, id));

  res.json({ ok: true });
});

router.delete("/signals-templates/:id", async (req, res) => {
  const client = await getDbClient();
  if (!client) {
    res.status(503).json({ error: "DatabaseUnavailable" });
    return;
  }

  const id = String(req.params.id || "").trim();
  if (!id) {
    res.status(400).json({ error: "ValidationError", message: "id is required" });
    return;
  }

  const { db, signalsTemplatesTable, eq } = client;
  await db.delete(signalsTemplatesTable).where(eq(signalsTemplatesTable.id, id));

  res.json({ ok: true });
});

export default router;
