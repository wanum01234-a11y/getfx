import { pgTable, text, numeric, timestamp, integer } from "drizzle-orm/pg-core";

export const mt5AccountTable = pgTable("mt5_account", {
  id: text("id").primaryKey(),
  balance: numeric("balance", { precision: 18, scale: 2 }),
  equity: numeric("equity", { precision: 18, scale: 2 }),
  currency: text("currency"),
  timestamp: timestamp("timestamp", { withTimezone: true }),
  totalTrades: integer("total_trades").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
