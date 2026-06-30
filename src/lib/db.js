import { createClient } from "@libsql/client";

// Turso (libSQL) client.
// - Production: set TURSO_DATABASE_URL (libsql://...) and TURSO_AUTH_TOKEN.
// - Local dev: falls back to an embedded SQLite file (file:local.db) so you
//   can develop without a Turso account. Run `npm run db:migrate` once to
//   create the schema (works for both the file fallback and a remote Turso DB).
//
// The schema lives in schema.sql and is applied by scripts/migrate.mjs — it is
// NOT created on import (libSQL is async, and a serverless app should not run
// DDL on every cold start).
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default db;
