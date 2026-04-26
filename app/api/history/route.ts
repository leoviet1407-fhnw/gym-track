import { NextRequest, NextResponse } from "next/server";
import { getDaily, getPRs } from "@/lib/storage";
import { sql, ensureSchema } from "@/lib/db";
import { oneRepMax } from "@/lib/fitness";
import type { ProfileId } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pid(req: NextRequest): ProfileId {
  return req.nextUrl.searchParams.get("id") === "jullie" ? "jullie" : "viet";
}

export async function GET(req: NextRequest) {
  const id = pid(req);
  const mode = req.nextUrl.searchParams.get("mode");
  await ensureSchema();

  // List all dates that have workouts — single SQL query
  if (mode === "dates") {
    const { rows } = await sql`
      SELECT date, data FROM daily_records
      WHERE profile_id = ${id}
        AND jsonb_array_length(data->'workouts') > 0
      ORDER BY date DESC
    `;
    return NextResponse.json({ dates: rows.map((r) => r.date as string) });
  }

  // Get full record for a specific date
  if (mode === "date") {
    const date = req.nextUrl.searchParams.get("date");
    if (!date) return NextResponse.json({ error: "missing date" }, { status: 400 });
    const rec = await getDaily(id, date);
    return NextResponse.json(rec);
  }

  // Get all sessions for a specific exercise — single SQL query
  if (mode === "exercise") {
    const exerciseId = req.nextUrl.searchParams.get("exerciseId");
    if (!exerciseId) return NextResponse.json({ sessions: [] });

    const { rows } = await sql`
      SELECT date, data FROM daily_records
      WHERE profile_id = ${id}
        AND jsonb_array_length(data->'workouts') > 0
      ORDER BY date DESC
    `;

    const sessions: Array<{ date: string; sets: Array<{ reps: number; weightKg: number }>; oneRM: number }> = [];
    for (const row of rows) {
      const rec = row.data as { workouts: Array<{ exerciseId: string; sets?: Array<{ reps: number; weightKg: number }> }> };
      const entry = rec.workouts.find((w) => w.exerciseId === exerciseId);
      if (entry?.sets?.length) {
        const maxRM = Math.max(...entry.sets.map((s) => oneRepMax(s.weightKg, s.reps)));
        sessions.push({ date: row.date, sets: entry.sets, oneRM: maxRM });
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
