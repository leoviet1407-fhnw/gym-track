import { NextRequest, NextResponse } from "next/server";
import { getDaily, saveDaily, getProfile, saveProfile } from "@/lib/storage";
import { todayISO } from "@/lib/date";
import {
  detectPRs,
  weightIncreaseSuggestion,
  deloadSuggestion,
  getExerciseHistory,
} from "@/lib/automation";
import type { ProfileId, WorkoutEntry } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pid(req: NextRequest): ProfileId {
  const id = req.nextUrl.searchParams.get("id");
  return id === "jullie" ? "jullie" : "viet";
}

// POST a workout entry for today
export async function POST(req: NextRequest) {
  const id = pid(req);
  const body = (await req.json()) as {
    entry: WorkoutEntry;
    date?: string;
    acceptWeightIncrease?: { exerciseId: string; newWeight: number };
  };
  const date = body.date ?? todayISO();
  const rec = await getDaily(id, date);

  // accept a suggested weight increase
  if (body.acceptWeightIncrease) {
    const profile = await getProfile(id);
    const exIdx = profile.exerciseLibrary.findIndex(
      (e) => e.id === body.acceptWeightIncrease!.exerciseId
    );
    if (exIdx >= 0) {
      profile.exerciseLibrary[exIdx].targetWeightKg =
        body.acceptWeightIncrease.newWeight;
      await saveProfile(profile);
    }
    return NextResponse.json({ ok: true });
  }

  // append or replace the entry (replace if same exercise + loggedAt)
  const entry: WorkoutEntry = {
    ...body.entry,
    loggedAt: body.entry.loggedAt || new Date().toISOString(),
  };
  rec.workouts.push(entry);
  await saveDaily(id, rec);

  // automations
  const profile = await getProfile(id);
  const ex = profile.exerciseLibrary.find((e) => e.id === entry.exerciseId);
  const prs = ex ? await detectPRs(id, ex, entry, date) : [];
  const weightSuggest = ex ? await weightIncreaseSuggestion(id, ex) : null;
  const deload = ex ? await deloadSuggestion(id, ex) : null;

  return NextResponse.json({
    ok: true,
    prs,
    weightSuggest,
    deload,
  });
}

// GET history for an exercise
export async function GET(req: NextRequest) {
  const id = pid(req);
  const exerciseId = req.nextUrl.searchParams.get("exerciseId");
  if (!exerciseId) return NextResponse.json({ history: [] });
  const history = await getExerciseHistory(id, exerciseId, 10);
  return NextResponse.json({ history });
}

// DELETE a workout entry
export async function DELETE(req: NextRequest) {
  const id = pid(req);
  const { date, loggedAt } = (await req.json()) as {
    date: string;
    loggedAt: string;
  };
  const rec = await getDaily(id, date);
  rec.workouts = rec.workouts.filter((w) => w.loggedAt !== loggedAt);
  await saveDaily(id, rec);
  return NextResponse.json({ ok: true });
}
