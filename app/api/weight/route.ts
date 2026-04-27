import { NextRequest, NextResponse } from "next/server";
import { getWeights, upsertWeight, getProfile, saveProfile } from "@/lib/storage";
import type { ProfileId, WeightEntry } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

function pid(req: NextRequest): ProfileId {
  return req.nextUrl.searchParams.get("id") === "jullie" ? "jullie" : "viet";
}

export async function GET(req: NextRequest) {
  const id = pid(req);
  const entries = await getWeights(id);
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const id = pid(req);
  const { date, weightKg } = (await req.json()) as WeightEntry;
  const entries = await upsertWeight(id, { date, weightKg });
  // update profile current weight
  const profile = await getProfile(id);
  profile.weightKg = weightKg;
  await saveProfile(profile);
  return NextResponse.json({ ok: true, entries });
}
