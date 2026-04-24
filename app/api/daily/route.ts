import { NextRequest, NextResponse } from "next/server";
import { getDaily, saveDaily, listDailyDates } from "@/lib/storage";
import { todayISO, isoAddDays } from "@/lib/date";
import type { DailyRecord, ProfileId } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pid(req: NextRequest): ProfileId {
  const id = req.nextUrl.searchParams.get("id");
  return id === "jullie" ? "jullie" : "viet";
}

export async function GET(req: NextRequest) {
  const id = pid(req);
  const habitId = req.nextUrl.searchParams.get("streak");

  // Streak calculation
  if (habitId) {
    const today = todayISO();
    let streak = 0;
    let cursor = today;
    for (let i = 0; i < 365; i++) {
      const rec = await getDaily(id, cursor);
      const done = rec.habitsCompleted.includes(habitId);
      if (done) { streak++; cursor = isoAddDays(cursor, -1); }
      else { if (i === 0) { cursor = isoAddDays(cursor, -1); continue; } break; }
    }
    return NextResponse.json({ streak });
  }

  const date = req.nextUrl.searchParams.get("date") ?? todayISO();
  const rec = await getDaily(id, date);
  return NextResponse.json(rec);
}

export async function POST(req: NextRequest) {
  const id = pid(req);
  const body = (await req.json()) as DailyRecord;
  await saveDaily(id, body);
  return NextResponse.json({ ok: true });
}
