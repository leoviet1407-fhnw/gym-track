import { sql } from "@vercel/postgres";
export { sql };

// Run schema on cold start (idempotent — IF NOT EXISTS)
let schemaReady = false;
export async function ensureSchema() {
  if (schemaReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS daily_records (
      profile_id TEXT NOT NULL,
      date TEXT NOT NULL,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (profile_id, date)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS weight_entries (
      profile_id TEXT NOT NULL,
      date TEXT NOT NULL,
      weight_kg NUMERIC(6,2) NOT NULL,
      PRIMARY KEY (profile_id, date)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS prs (
      id SERIAL PRIMARY KEY,
      profile_id TEXT NOT NULL,
      date TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      exercise_name TEXT NOT NULL,
      type TEXT NOT NULL,
      value NUMERIC(8,2) NOT NULL,
      previous_value NUMERIC(8,2) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS together_config (
      id TEXT PRIMARY KEY DEFAULT 'singleton',
      data JSONB NOT NULL
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS together_daily (
      date TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      profile_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TIMESTAMPTZ DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS insights_cache (
      profile_id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      generated_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_daily_profile ON daily_records(profile_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_weights_profile ON weight_entries(profile_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_prs_profile ON prs(profile_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_chat_profile ON chat_messages(profile_id)`;
  schemaReady = true;
}
