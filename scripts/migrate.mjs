// Applies schema.sql to the database.
//   - Remote Turso: set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN, then run.
//   - Local dev:    no env vars needed; uses the file:local.db fallback.
//
// Usage: npm run db:migrate
import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, "..", "schema.sql"), "utf8");

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const target = process.env.TURSO_DATABASE_URL || "file:local.db";
console.log(`Applying schema.sql to ${target} ...`);

try {
  await db.executeMultiple(sql);
  console.log("✅ Schema applied successfully.");
} catch (err) {
  console.error("❌ Migration failed:", err.message);
  process.exitCode = 1;
} finally {
  db.close();
}
