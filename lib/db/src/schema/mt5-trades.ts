import { pgTable, text, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";

export const mt5TradesTable = pgTable("mt5_trades", {
  id: text("id").primaryKey(),
  symbol: text("symbol").notNull(),
  type: text("type").notNull(),
  lot: numeric("lot", { precision: 18, scale: 4 }).notNull().default("0"),
  entryPrice: numeric("entry_price", { precision: 18, scale: 6 }).notNull().default("0"),
  currentPrice: numeric("current_price", { precision: 18, scale: 6 }),
  closePrice: numeric("close_price", { precision: 18, scale: 6 }),
  profit: numeric("profit", { precision: 18, scale: 2 }).notNull().default("0"),
  status: text("status").notNull(),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  raw: jsonb("raw"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
