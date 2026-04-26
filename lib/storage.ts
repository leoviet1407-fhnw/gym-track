import { sql, ensureSchema } from "./db";
import type {
  Profile, ProfileId, DailyRecord, WeightEntry, PR,
  ChatMessage, TogetherDaily, TogetherConfig,
} from "./types";
import { defaultProfile } from "./defaults";

// ── Profiles ──────────────────────────────────────────────────────────────────
export async function getProfile(id: ProfileId): Promise<Profile> {
  await ensureSchema();
  const { rows } = await sql`SELECT data FROM profiles WHERE id = ${id}`;
  if (rows.length) return rows[0].data as Profile;
  const seed = defaultProfile(id);
  await sql`INSERT INTO profiles (id, data) VALUES (${id}, ${JSON.stringify(seed)})`;
  return seed;
}

export async function saveProfile(p: Profile): Promise<void> {
  await ensureSchema();
  await sql`
    INSERT INTO profiles (id, data, updated_at) VALUES (${p.id}, ${JSON.stringify(p)}, NOW())
    ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(p)}, updated_at = NOW()
  `;
}

// ── Daily records ─────────────────────────────────────────────────────────────
export async function getDaily(id: ProfileId, date: string): Promise<DailyRecord> {
  await ensureSchema();
  const { rows } = await sql`
    SELECT data FROM daily_records WHERE profile_id = ${id} AND date = ${date}
  `;
  if (rows.length) return rows[0].data as DailyRecord;
  return { date, workouts: [], supplementsTaken: [], habitsCompleted: [] };
}

export async function saveDaily(id: ProfileId, rec: DailyRecord): Promise<void> {
  await ensureSchema();
  await sql`
    INSERT INTO daily_records (profile_id, date, data, updated_at)
    VALUES (${id}, ${rec.date}, ${JSON.stringify(rec)}, NOW())
    ON CONFLICT (profile_id, date) DO UPDATE SET data = ${JSON.stringify(rec)}, updated_at = NOW()
  `;
}

export async function listDailyDates(id: ProfileId): Promise<string[]> {
  await ensureSchema();
  const { rows } = await sql`
    SELECT date FROM daily_records WHERE profile_id = ${id} ORDER BY date ASC
  `;
  return rows.map((r) => r.date as string);
}

export async function getDailyRange(
  id: ProfileId, fromISO: string, toISO: string
): Promise<DailyRecord[]> {
  await ensureSchema();
  const { rows } = await sql`
    SELECT data FROM daily_records
    WHERE profile_id = ${id} AND date >= ${fromISO} AND date <= ${toISO}
    ORDER BY date ASC
  `;
  return rows.map((r) => r.data as DailyRecord);
}

// ── Weight entries ────────────────────────────────────────────────────────────
export async function getWeights(id: ProfileId): Promise<WeightEntry[]> {
  await ensureSchema();
  const { rows } = await sql`
    SELECT date, weight_kg FROM weight_entries WHERE profile_id = ${id} ORDER BY date ASC
  `;
  return rows.map((r) => ({ date: r.date as string, weightKg: parseFloat(r.weight_kg) }));
}

export async function saveWeights(id: ProfileId, entries: WeightEntry[]): Promise<void> {
  await ensureSchema();
  for (const e of entries) {
    await sql`
      INSERT INTO weight_entries (profile_id, date, weight_kg)
      VALUES (${id}, ${e.date}, ${e.weightKg})
      ON CONFLICT (profile_id, date) DO UPDATE SET weight_kg = ${e.weightKg}
    `;
  }
}

export async function upsertWeight(id: ProfileId, entry: WeightEntry): Promise<WeightEntry[]> {
  await ensureSchema();
  await sql`
    INSERT INTO weight_entries (profile_id, date, weight_kg)
    VALUES (${id}, ${entry.date}, ${entry.weightKg})
    ON CONFLICT (profile_id, date) DO UPDATE SET weight_kg = ${entry.weightKg}
  `;
  return getWeights(id);
}

// ── PRs ───────────────────────────────────────────────────────────────────────
export async function getPRs(id: ProfileId): Promise<PR[]> {
  await ensureSchema();
  const { rows } = await sql`
    SELECT date, exercise_id, exercise_name, type, value, previous_value
    FROM prs WHERE profile_id = ${id} ORDER BY created_at ASC
  `;
  return rows.map((r) => ({
    date: r.date,
    exerciseId: r.exercise_id,
    exerciseName: r.exercise_name,
    type: r.type as PR["type"],
    value: parseFloat(r.value),
    previousValue: parseFloat(r.previous_value),
  }));
}

export async function savePRs(id: ProfileId, prs: PR[]): Promise<void> {
  await ensureSchema();
  const existing = await getPRs(id);
  const existingKeys = new Set(existing.map((p) => `${p.date}|${p.exerciseId}|${p.type}`));
  for (const pr of prs) {
    const key = `${pr.date}|${pr.exerciseId}|${pr.type}`;
    if (!existingKeys.has(key)) {
      await sql`
        INSERT INTO prs (profile_id, date, exercise_id, exercise_name, type, value, previous_value)
        VALUES (${id}, ${pr.date}, ${pr.exerciseId}, ${pr.exerciseName}, ${pr.type}, ${pr.value}, ${pr.previousValue})
      `;
      existingKeys.add(key);
    }
  }
}

// ── Chat messages ─────────────────────────────────────────────────────────────
export async function getChat(id: ProfileId): Promise<ChatMessage[]> {
  await ensureSchema();
  const { rows } = await sql`
    SELECT role, content, timestamp FROM chat_messages
    WHERE profile_id = ${id} ORDER BY timestamp ASC
  `;
  return rows.map((r) => ({
    role: r.role as "user" | "assistant",
    content: r.content,
    timestamp: r.timestamp,
  }));
}

export async function saveChat(id: ProfileId, msgs: ChatMessage[]): Promise<void> {
  await ensureSchema();
  await sql`DELETE FROM chat_messages WHERE profile_id = ${id}`;
  for (const m of msgs) {
    await sql`
      INSERT INTO chat_messages (profile_id, role, content, timestamp)
      VALUES (${id}, ${m.role}, ${m.content}, ${m.timestamp})
    `;
  }
}

// ── Together habits ───────────────────────────────────────────────────────────
export async function getTogetherConfig(): Promise<TogetherConfig> {
  await ensureSchema();
  const { rows } = await sql`SELECT data FROM together_config WHERE id = 'singleton'`;
  if (rows.length) return rows[0].data as TogetherConfig;
  return { habits: [] };
}

export async function saveTogetherConfig(cfg: TogetherConfig): Promise<void> {
  await ensureSchema();
  await sql`
    INSERT INTO together_config (id, data) VALUES ('singleton', ${JSON.stringify(cfg)})
    ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(cfg)}
  `;
}

export async function getTogetherDaily(date: string): Promise<TogetherDaily> {
  await ensureSchema();
  const cfg = await getTogetherConfig();
  const { rows } = await sql`SELECT data FROM together_daily WHERE date = ${date}`;
  if (rows.length) {
    const existing = rows[0].data as TogetherDaily;
    const habits = cfg.habits.map((h) => {
      const prev = existing.habits.find((x) => x.id === h.id);
      return { id: h.id, name: h.name, completedBy: prev?.completedBy ?? [] as ProfileId[] };
    });
    return { date, habits };
  }
  return {
    date,
    habits: cfg.habits.map((h) => ({ id: h.id, name: h.name, completedBy: [] as ProfileId[] })),
  };
}

export async function saveTogetherDaily(rec: TogetherDaily): Promise<void> {
  await ensureSchema();
  await sql`
    INSERT INTO together_daily (date, data, updated_at)
    VALUES (${rec.date}, ${JSON.stringify(rec)}, NOW())
    ON CONFLICT (date) DO UPDATE SET data = ${JSON.stringify(rec)}, updated_at = NOW()
  `;
}

export async function listTogetherDates(): Promise<string[]> {
  await ensureSchema();
  const { rows } = await sql`SELECT date FROM together_daily ORDER BY date ASC`;
  return rows.map((r) => r.date as string);
}

// ── Insights cache ────────────────────────────────────────────────────────────
interface InsightCache {
  generatedAt: string;
  cards: Array<{ title: string; body: string; tone: string }>;
}

export async function getInsights(id: ProfileId): Promise<InsightCache | null> {
  await ensureSchema();
  const { rows } = await sql`SELECT data FROM insights_cache WHERE profile_id = ${id}`;
  if (rows.length) return rows[0].data as InsightCache;
  return null;
}

export async function saveInsights(id: ProfileId, cache: InsightCache): Promise<void> {
  await ensureSchema();
  await sql`
    INSERT INTO insights_cache (profile_id, data, generated_at)
    VALUES (${id}, ${JSON.stringify(cache)}, NOW())
    ON CONFLICT (profile_id) DO UPDATE SET data = ${JSON.stringify(cache)}, generated_at = NOW()
  `;
}
