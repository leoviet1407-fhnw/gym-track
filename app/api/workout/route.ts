import { NextRequest, NextResponse } from "next/server";
import { getDaily, saveDaily, getProfile, saveProfile } from "@/lib/storage";
import { todayISO } from "@/lib/date";
import { detectPRs, doubleProgressionCheck, deloadSuggestion } from "@/lib/automation";
import type { ProfileId, WorkoutEntry } from "@/lib/types";
import { getExerciseHistory } from "@/lib/automation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pid(req: NextRequest): ProfileId {
  return req.nextUrl.searchParams.get("id") === "jullie" ? "jullie" : "viet";
}

export async function POST(req: NextRequest) {
  const id = pid(req);
  const body = await req.json() as {
    entry?: WorkoutEntry;
    date?: string;
    acceptWeightIncrease?: { exerciseId: string; newWeight: number };
  };

  // Accept a weight increase
  if (body.acceptWeightIncrease) {
    const profile = await getProfile(id);
    const idx = profile.exerciseLibrary.findIndex((e) => e.id === body.acceptWeightIncrease!.exerciseId);
    if (idx >= 0) {
      const ex = profile.exerciseLibrary[idx];
      profile.exerciseLibrary[idx] = {
        ...ex,
        targetWeightKg: body.acceptWeightIncrease.newWeight,
        // reset reps back to min after weight increase
        targetRepsMin: ex.targetRepsMin ?? 8,
        targetRepsMax: ex.targetRepsMax ?? 12,
      };
      await saveProfile(profile);
    }
    return NextResponse.json({ ok: true });
  }

  if (!body.entry) return NextResponse.json({ error: "missing entry" }, { status: 400 });

  const date = body.date ?? todayISO();
  const rec = await getDaily(id, date);
  const entry: WorkoutEntry = { ...body.entry, loggedAt: body.entry.loggedAt || new Date().toISOString() };
  rec.workouts.push(entry);
  await saveDaily(id, rec);

  const profile = await getProfile(id);
  const ex = profile.exerciseLibrary.find((e) => e.id === entry.exerciseId);

  const prs = ex ? await detectPRs(id, ex, entry, date) : [];
  const progression = ex ? await doubleProgressionCheck(id, ex) : null;
  const deload = ex ? await deloadSuggestion(id, ex) : null;

  return NextResponse.json({ ok: true, prs, progression, deload });
}

export async function GET(req: NextRequest) {
  const id = pid(req);
  const exerciseId = req.nextUrl.searchParams.get("exerciseId");
  if (!exerciseId) return NextResponse.json({ history: [] });
  const history = await getExerciseHistory(id, exerciseId, 10);
  return NextResponse.json({ history });
}

export async function DELETE(req: NextRequest) {
  const id = pid(req);
  const { date, loggedAt } = await req.json() as { date: string; loggedAt: string };
  const rec = await getDaily(id, date);
  rec.workouts = rec.workouts.filter((w) => w.loggedAt !== loggedAt);
  await saveDaily(id, rec);
  return NextResponse.json({ ok: true });
}
