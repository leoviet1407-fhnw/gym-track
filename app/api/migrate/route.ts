import { NextRequest, NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db";
import {
  saveProfile, saveDaily, saveWeights, savePRs,
  saveTogetherConfig, saveTogetherDaily, saveChat, saveInsights,
} from "@/lib/storage";
import type { Profile, ProfileId, DailyRecord, WeightEntry, PR, ChatMessage, TogetherConfig, TogetherDaily } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

async function fetchBlob<T>(pathname: string): Promise<T | null> {
  if (!BLOB_TOKEN) return null;
  try {
    // list blobs to find URL
    const listRes = await fetch(
      `https://blob.vercel-storage.com?prefix=${encodeURIComponent(pathname)}&limit=1`,
      { headers: { Authorization: `Bearer ${BLOB_TOKEN}` } }
    );
    if (!listRes.ok) return null;
    const listData = await listRes.json();
    const blobs = listData.blobs ?? [];
    const hit = blobs.find((b: { pathname: string }) => b.pathname === pathname);
    if (!hit) return null;
    const res = await fetch(hit.url, {
      headers: { Authorization: `Bearer ${BLOB_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch { return null; }
}

async function listBlobPrefix(prefix: string): Promise<string[]> {
  if (!BLOB_TOKEN) return [];
  try {
    const res = await fetch(
      `https://blob.vercel-storage.com?prefix=${encodeURIComponent(prefix)}&limit=1000`,
      { headers: { Authorization: `Bearer ${BLOB_TOKEN}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.blobs ?? []).map((b: { pathname: string }) => b.pathname);
  } catch { return []; }
}

export async function GET(req: NextRequest) {
  // Basic protection — only allow if CRON_SECRET matches or no secret set
  const secret = req.nextUrl.searchParams.get("secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await ensureSchema();

  const log: string[] = [];
  let migrated = 0;
  let skipped = 0;

  // ── Profiles ────────────────────────────────────────────────
  for (const profileId of ["viet", "jullie"] as ProfileId[]) {
    const profile = await fetchBlob<Profile>(`profiles/${profileId}.json`);
    if (profile) {
      await saveProfile(profile);
      log.push(`Profile ${profileId}: migrated`);
      migrated++;
    } else {
      log.push(`Profile ${profileId}: not found in blob, skipping`);
      skipped++;
    }
  }

  // ── Daily records ────────────────────────────────────────────
  for (const profileId of ["viet", "jullie"] as ProfileId[]) {
    const paths = await listBlobPrefix(`daily/${profileId}/`);
    for (const path of paths) {
      const date = path.replace(`daily/${profileId}/`, "").replace(".json", "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      const rec = await fetchBlob<DailyRecord>(path);
      if (rec) {
        await saveDaily(profileId, rec);
        migrated++;
      }
    }
    log.push(`Daily records ${profileId}: ${paths.length} dates processed`);
  }

  // ── Weight entries ───────────────────────────────────────────
  for (const profileId of ["viet", "jullie"] as ProfileId[]) {
    const weights = await fetchBlob<WeightEntry[]>(`history/${profileId}/weights.json`);
    if (weights?.length) {
      await saveWeights(profileId, weights);
      log.push(`Weights ${profileId}: ${weights.length} entries migrated`);
      migrated += weights.length;
    } else {
      log.push(`Weights ${profileId}: none found`);
    }
  }

  // ── PRs ─────────────────────────────────────────────────────
  for (const profileId of ["viet", "jullie"] as ProfileId[]) {
    const prs = await fetchBlob<PR[]>(`history/${profileId}/prs.json`);
    if (prs?.length) {
      await savePRs(profileId, prs);
      log.push(`PRs ${profileId}: ${prs.length} entries migrated`);
      migrated += prs.length;
    } else {
      log.push(`PRs ${profileId}: none found`);
    }
  }

  // ── Together config ──────────────────────────────────────────
  const togConfig = await fetchBlob<TogetherConfig>("together/config.json");
  if (togConfig) {
    await saveTogetherConfig(togConfig);
    log.push(`Together config: migrated (${togConfig.habits.length} habits)`);
    migrated++;
  }

  // ── Together daily ───────────────────────────────────────────
  const togPaths = await listBlobPrefix("together/");
  for (const path of togPaths) {
    const date = path.replace("together/", "").replace(".json", "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const rec = await fetchBlob<TogetherDaily>(path);
    if (rec) {
      await saveTogetherDaily(rec);
      migrated++;
    }
  }
  log.push(`Together daily: ${togPaths.filter((p) => /\d{4}-\d{2}-\d{2}/.test(p)).length} dates`);

  // ── Chat history ─────────────────────────────────────────────
  for (const profileId of ["viet", "jullie"] as ProfileId[]) {
    const chat = await fetchBlob<ChatMessage[]>(`chat/${profileId}/history.json`);
    if (chat?.length) {
      await saveChat(profileId, chat);
      log.push(`Chat ${profileId}: ${chat.length} messages migrated`);
      migrated += chat.length;
    }
  }

  return NextResponse.json({
    ok: true,
    migrated,
    skipped,
    log,
    message: "Migration complete. Your Blob data is untouched — it stays as a backup.",
  });
}
