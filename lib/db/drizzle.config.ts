import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: [
    "./src/schema/mt5-trades.ts",
    "./src/schema/mt5-account.ts",
    "./src/schema/app-settings.ts",
    "./src/schema/settings.ts",
    "./src/schema/pip-settings.ts",
  ],
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
