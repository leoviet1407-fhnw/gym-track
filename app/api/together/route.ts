import { NextRequest, NextResponse } from "next/server";
import {
  getTogetherConfig,
  saveTogetherConfig,
  getTogetherDaily,
  saveTogetherDaily,
} from "@/lib/storage";
import { todayISO } from "@/lib/date";
import type { ProfileId, TogetherConfig, TogetherDaily } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const scope = req.nextUrl.searchParams.get("scope"); // "config" | "daily"
  if (scope === "config") {
    const cfg = await getTogetherConfig();
    return NextResponse.json(cfg);
  }
  const date = req.nextUrl.searchParams.get("date") ?? todayISO();
  const rec = await getTogetherDaily(date);
  return NextResponse.json(rec);
}

export async function POST(req: NextRequest) {
  const scope = req.nextUrl.searchParams.get("scope");
  if (scope === "config") {
    const body = (await req.json()) as TogetherConfig;
    await saveTogetherConfig(body);
    return NextResponse.json({ ok: true });
  }
  if (scope === "toggle") {
    const { date, habitId, profileId } = (await req.json()) as {
      date: string;
      habitId: string;
      profileId: ProfileId;
    };
    const rec = await getTogetherDaily(date);
    const hab = rec.habits.find((h) => h.id === habitId);
    if (hab) {
      const has = hab.completedBy.includes(profileId);
      hab.completedBy = has
        ? hab.completedBy.filter((p) => p !== profileId)
        : [...hab.completedBy, profileId];
      await saveTogetherDaily(rec);
    }
    return NextResponse.json({ ok: true, record: rec });
  }
  const body = (await req.json()) as TogetherDaily;
  await saveTogetherDaily(body);
  return NextResponse.json({ ok: true });
}
