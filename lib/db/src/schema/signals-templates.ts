import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const signalsTemplatesTable = pgTable("signals_templates", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  content: text("content").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
