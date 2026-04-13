import { pgTable, serial, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const pipSettingsTable = pgTable("pip_settings", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull().unique(),
  category: text("category").notNull(),
  pipSize: numeric("pip_size", { precision: 18, scale: 8 }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
