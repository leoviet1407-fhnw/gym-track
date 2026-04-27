import { NextRequest, NextResponse } from "next/server";
import { getProfile, saveProfile } from "@/lib/storage";
import type { Profile, ProfileId } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

function pid(req: NextRequest): ProfileId {
  const id = req.nextUrl.searchParams.get("id");
  return id === "jullie" ? "jullie" : "viet";
}

export async function GET(req: NextRequest) {
  const id = pid(req);
  const profile = await getProfile(id);
  return NextResponse.json(profile);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Profile;
  await saveProfile(body);
  return NextResponse.json({ ok: true });
}
