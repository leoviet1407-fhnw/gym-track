import { put, list } from "@vercel/blob";
import type {
  Profile,
  ProfileId,
  DailyRecord,
  WeightEntry,
  PR,
  ChatMessage,
  TogetherDaily,
  TogetherConfig,
} from "./types";
import { defaultProfile } from "./defaults";

const JSON_OPTS = {
  access: "public" as const,
  contentType: "application/json",
  addRandomSuffix: false,
  allowOverwrite: true,
};

async function fetchJSON<T>(pathname: string): Promise<T | null> {
  try {
    const { blobs } = await list({ prefix: pathname, limit: 1 });
    const hit = blobs.find((b) => b.pathname === pathname);
    if (!hit) return null;
    const res = await fetch(hit.url, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function writeJSON(pathname: string, data: unknown) {
  await put(pathname, JSON.stringify(data), JSON_OPTS);
}

// ── Profiles ────────────────────────────────────────────────────────────────
export async function getProfile(id: ProfileId): Promise<Profile> {
  const p = await fetchJSON<Profile>(`profiles/${id}.json`);
  if (p) return p;
  // first access — seed defaults
  const seed = defaultProfile(id);
  await writeJSON(`profiles/${id}.json`, seed);
  return seed;
}

export async function saveProfile(p: Profile) {
  await writeJSON(`profiles/${p.id}.json`, p);
}

// ── Daily records ───────────────────────────────────────────────────────────
export async function getDaily(
  id: ProfileId,
  date: string
): Promise<DailyRecord> {
  const p = await fetchJSON<DailyRecord>(`daily/${id}/${date}.json`);
  if (p) return p;
  return { date, workouts: [], supplementsTaken: [], habitsCompleted: [] };
}

export async function saveDaily(id: ProfileId, rec: DailyRecord) {
  await writeJSON(`daily/${id}/${rec.date}.json`, rec);
}

export async function listDailyDates(id: ProfileId): Promise<string[]> {
  const { blobs } = await list({ prefix: `daily/${id}/`, limit: 1000 });
  return blobs
    .map((b) => b.pathname.replace(`daily/${id}/`, "").replace(".json", ""))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
}

export async function getDailyRange(
  id: ProfileId,
  fromISO: string,
  toISO: string
): Promise<DailyRecord[]> {
  const dates = (await listDailyDates(id)).filter(
    (d) => d >= fromISO && d <= toISO
  );
  const records = await Promise.all(dates.map((d) => getDaily(id, d)));
  return records;
}

// ── Weight history ──────────────────────────────────────────────────────────
export async function getWeights(id: ProfileId): Promise<WeightEntry[]> {
  return (await fetchJSON<WeightEntry[]>(`history/${id}/weights.json`)) ?? [];
}

export async function saveWeights(id: ProfileId, entries: WeightEntry[]) {
  await writeJSON(`history/${id}/weights.json`, entries);
}

// ── PRs ─────────────────────────────────────────────────────────────────────
export async function getPRs(id: ProfileId): Promise<PR[]> {
  return (await fetchJSON<PR[]>(`history/${id}/prs.json`)) ?? [];
}

export async function savePRs(id: ProfileId, prs: PR[]) {
  await writeJSON(`history/${id}/prs.json`, prs);
}

// ── Chat history ────────────────────────────────────────────────────────────
export async function getChat(id: ProfileId): Promise<ChatMessage[]> {
  return (await fetchJSON<ChatMessage[]>(`chat/${id}/history.json`)) ?? [];
}

export async function saveChat(id: ProfileId, msgs: ChatMessage[]) {
  await writeJSON(`chat/${id}/history.json`, msgs);
}

// ── Together habits ─────────────────────────────────────────────────────────
export async function getTogetherConfig(): Promise<TogetherConfig> {
  return (
    (await fetchJSON<TogetherConfig>(`together/config.json`)) ?? { habits: [] }
  );
}

export async function saveTogetherConfig(cfg: TogetherConfig) {
  await writeJSON(`together/config.json`, cfg);
}

export async function getTogetherDaily(date: string): Promise<TogetherDaily> {
  const cfg = await getTogetherConfig();
  const existing = await fetchJSON<TogetherDaily>(`together/${date}.json`);
  if (existing) {
    // sync with current config (new habits added/removed)
    const habits = cfg.habits.map((h) => {
      const prev = existing.habits.find((x) => x.id === h.id);
      return {
        id: h.id,
        name: h.name,
        completedBy: prev?.completedBy ?? [],
      };
    });
    return { date, habits };
  }
  return {
    date,
    habits: cfg.habits.map((h) => ({
      id: h.id,
      name: h.name,
      completedBy: [],
    })),
  };
}

export async function saveTogetherDaily(rec: TogetherDaily) {
  await writeJSON(`together/${rec.date}.json`, rec);
}

export async function listTogetherDates(): Promise<string[]> {
  const { blobs } = await list({ prefix: "together/", limit: 1000 });
  return blobs
    .map((b) => b.pathname.replace("together/", "").replace(".json", ""))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
}

// ── AI insight cache ────────────────────────────────────────────────────────
interface InsightCache {
  generatedAt: string;
  cards: Array<{ title: string; body: string; tone: string }>;
}

export async function getInsights(id: ProfileId): Promise<InsightCache | null> {
  return await fetchJSON<InsightCache>(`insights/${id}.json`);
}

export async function saveInsights(id: ProfileId, cache: InsightCache) {
  await writeJSON(`insights/${id}.json`, cache);
}
