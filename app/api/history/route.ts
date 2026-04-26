import { NextRequest, NextResponse } from "next/server";
import { getDaily, getPRs } from "@/lib/storage";
import { sql, ensureSchema } from "@/lib/db";
import { oneRepMax } from "@/lib/fitness";
import type { ProfileId, DailyRecord, WorkoutEntry } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pid(req: NextRequest): ProfileId {
  return req.nextUrl.searchParams.get("id") === "jullie" ? "jullie" : "viet";
}

export async function GET(req: NextRequest) {
  const id = pid(req);
  const mode = req.nextUrl.searchParams.get("mode");
  await ensureSchema();

  // List all dates that have workouts
  if (mode === "dates") {
    const { rows } = await sql`
      SELECT date, data FROM daily_records
      WHERE profile_id = ${id}
      ORDER BY date DESC
    `;
    const withWorkouts = rows
      .filter((r) => {
        const rec = r.data as DailyRecord;
        return Array.isArray(rec.workouts) && rec.workouts.length > 0;
      })
      .map((r) => r.date as string);
    return NextResponse.json({ dates: withWorkouts });
  }

  // Get full record for a specific date
  if (mode === "date") {
    const date = req.nextUrl.searchParams.get("date");
    if (!date) return NextResponse.json({ error: "missing date" }, { status: 400 });
    const rec = await getDaily(id, date);
    return NextResponse.json(rec);
  }

  // Get all sessions for a specific exercise (strength or cardio)
  if (mode === "exercise") {
    const exerciseId = req.nextUrl.searchParams.get("exerciseId");
    if (!exerciseId) return NextResponse.json({ sessions: [] });

    const { rows } = await sql`
      SELECT date, data FROM daily_records
      WHERE profile_id = ${id}
      ORDER BY date DESC
    `;

    const sessions: Array<{
      date: string;
      type: string;
      sets?: Array<{ reps: number; weightKg: number }>;
      oneRM?: number;
      durationMin?: number;
      distanceKm?: number;
    }> = [];

    for (const row of rows) {
      const rec = row.data as DailyRecord;
      if (!Array.isArray(rec.workouts)) continue;
      const entry = rec.workouts.find((w: WorkoutEntry) => w.exerciseId === exerciseId);
      if (!entry) continue;
      if (entry.type === "strength" && entry.sets?.length) {
        const maxRM = Math.max(...entry.sets.map((s) => oneRepMax(s.weightKg, s.reps)));
        sessions.push({ date: row.date, type: "strength", sets: entry.sets, oneRM: maxRM });
      } else if (entry.type === "cardio" && (entry.durationMin || entry.distanceKm)) {
        sessions.push({ date: row.date, type: "cardio", durationMin: entry.durationMin, distanceKm: entry.distanceKm });
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
