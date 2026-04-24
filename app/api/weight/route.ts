import { NextRequest, NextResponse } from "next/server";
import { getWeights, saveWeights, getProfile, saveProfile } from "@/lib/storage";
import type { ProfileId, WeightEntry } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pid(req: NextRequest): ProfileId {
  const id = req.nextUrl.searchParams.get("id");
  return id === "jullie" ? "jullie" : "viet";
}

export async function GET(req: NextRequest) {
  const id = pid(req);
  const entries = await getWeights(id);
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const id = pid(req);
  const { date, weightKg } = (await req.json()) as WeightEntry;
  const entries = await getWeights(id);
  const idx = entries.findIndex((e) => e.date === date);
  if (idx >= 0) entries[idx] = { date, weightKg };
  else entries.push({ date, weightKg });
  entries.sort((a, b) => a.date.localeCompare(b.date));
  await saveWeights(id, entries);

  // also update profile's current weight
  const profile = await getProfile(id);
  profile.weightKg = weightKg;
  await saveProfile(profile);

  return NextResponse.json({ ok: true, entries });
}
