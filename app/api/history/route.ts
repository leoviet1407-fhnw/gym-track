import { NextRequest, NextResponse } from "next/server";
import { listDailyDates, getDaily, getPRs } from "@/lib/storage";
import { oneRepMax } from "@/lib/fitness";
import type { ProfileId } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pid(req: NextRequest): ProfileId {
  const id = req.nextUrl.searchParams.get("id");
  return id === "jullie" ? "jullie" : "viet";
}

export async function GET(req: NextRequest) {
  const id = pid(req);
  const mode = req.nextUrl.searchParams.get("mode");

  // List all dates that have workouts
  if (mode === "dates") {
    const allDates = await listDailyDates(id);
    const withWorkouts: string[] = [];
    for (const date of [...allDates].reverse()) {
      const rec = await getDaily(id, date);
      if (rec.workouts.length > 0) withWorkouts.push(date);
    }
    return NextResponse.json({ dates: withWorkouts });
  }

  // Get full record for a specific date
  if (mode === "date") {
    const date = req.nextUrl.searchParams.get("date");
    if (!date) return NextResponse.json({ error: "missing date" }, { status: 400 });
    const rec = await getDaily(id, date);
    return NextResponse.json(rec);
  }

  // Get all sessions for a specific exercise
  if (mode === "exercise") {
    const exerciseId = req.nextUrl.searchParams.get("exerciseId");
    if (!exerciseId) return NextResponse.json({ sessions: [] });
    const allDates = await listDailyDates(id);
    const sessions: Array<{ date: string; sets: Array<{ reps: number; weightKg: number }>; oneRM: number }> = [];
    for (const date of [...allDates].reverse()) {
      const rec = await getDaily(id, date);
      const entry = rec.workouts.find((w) => w.exerciseId === exerciseId);
      if (entry?.sets?.length) {
        const maxRM = Math.max(...entry.sets.map((s) => oneRepMax(s.weightKg, s.reps)));
        sessions.push({ date, sets: entry.sets, oneRM: maxRM });
      }
    }
    return NextResponse.json({ sessions });
  }

  // Get all PRs
  if (mode === "prs") {
    const prs = await getPRs(id);
    return NextResponse.json({ prs: [...prs].reverse() });
  }

  return NextResponse.json({ error: "invalid mode" }, { status: 400 });
}
