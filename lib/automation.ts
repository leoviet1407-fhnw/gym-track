import type { Profile, ProfileId, WorkoutEntry, PR, Exercise } from "./types";
import { oneRepMax } from "./fitness";
import { getDaily, getDailyRange, listDailyDates, getPRs, savePRs, getTogetherDaily } from "./storage";
import { todayISO, isoAddDays } from "./date";

export async function getExerciseHistory(
  id: ProfileId, exerciseId: string, limit = 10
): Promise<Array<{ date: string; entry: WorkoutEntry }>> {
  const dates = (await listDailyDates(id)).reverse();
  const out: Array<{ date: string; entry: WorkoutEntry }> = [];
  for (const date of dates) {
    if (out.length >= limit) break;
    const rec = await getDaily(id, date);
    for (const e of rec.workouts.filter((w) => w.exerciseId === exerciseId)) {
      out.push({ date, entry: e });
      if (out.length >= limit) break;
    }
  }
  return out;
}

export async function detectPRs(
  id: ProfileId, exercise: Exercise, entry: WorkoutEntry, date: string
): Promise<PR[]> {
  if (entry.type !== "strength" || !entry.sets?.length) return [];
  const existing = await getPRs(id);
  const past = (await getExerciseHistory(id, exercise.id, 100)).filter((p) => p.date < date);

  let prevMaxWeight = 0, prevMaxReps = 0, prevMax1RM = 0;
  for (const { entry: e } of past) {
    for (const s of e.sets ?? []) {
      if (s.weightKg > prevMaxWeight) prevMaxWeight = s.weightKg;
      if (s.reps > prevMaxReps) prevMaxReps = s.reps;
      const est = oneRepMax(s.weightKg, s.reps);
      if (est > prevMax1RM) prevMax1RM = est;
    }
  }

  let curMaxWeight = 0, curMaxReps = 0, curMax1RM = 0;
  for (const s of entry.sets) {
    if (s.weightKg > curMaxWeight) curMaxWeight = s.weightKg;
    if (s.reps > curMaxReps) curMaxReps = s.reps;
    const est = oneRepMax(s.weightKg, s.reps);
    if (est > curMax1RM) curMax1RM = est;
  }

  const newPRs: PR[] = [];
  if (curMaxWeight > prevMaxWeight && prevMaxWeight > 0)
    newPRs.push({ date, exerciseId: exercise.id, exerciseName: exercise.name, type: "weight", value: curMaxWeight, previousValue: prevMaxWeight });
  if (curMaxReps > prevMaxReps && prevMaxReps > 0)
    newPRs.push({ date, exerciseId: exercise.id, exerciseName: exercise.name, type: "reps", value: curMaxReps, previousValue: prevMaxReps });
  if (curMax1RM > prevMax1RM && prevMax1RM > 0)
    newPRs.push({ date, exerciseId: exercise.id, exerciseName: exercise.name, type: "1rm", value: curMax1RM, previousValue: prevMax1RM });

  if (newPRs.length) await savePRs(id, [...existing, ...newPRs]);
  return newPRs;
}

export async function weightIncreaseSuggestion(id: ProfileId, exercise: Exercise): Promise<number | null> {
  if (exercise.type !== "strength" || !exercise.targetWeightKg || !exercise.targetReps) return null;
  const history = await getExerciseHistory(id, exercise.id, 5);
  if (history.length < 2) return null;
  const hitTarget = (e: WorkoutEntry) =>
    (e.sets ?? []).length >= 1 &&
    (e.sets ?? []).every((s) => s.weightKg >= exercise.targetWeightKg! && s.reps >= exercise.targetReps!);
  if (history.slice(0, 2).every((r) => hitTarget(r.entry))) {
    return exercise.targetWeightKg + (exercise.bodyPart === "lower" ? 5 : 2.5);
  }
  return null;
}

export async function deloadSuggestion(id: ProfileId, exercise: Exercise): Promise<number | null> {
  if (exercise.type !== "strength" || !exercise.targetWeightKg) return null;
  const history = await getExerciseHistory(id, exercise.id, 60);
  if (history.length < 8) return null;
  const byWeek = new Map<string, number>();
  for (const { date, entry } of history) {
    if (!entry.sets?.length) continue;
    const maxW = Math.max(...entry.sets.map((s) => s.weightKg));
    const d = new Date(date + "T12:00:00Z");
    const day = d.getUTCDay();
    d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
    const wk = d.toISOString().slice(0, 10);
    byWeek.set(wk, Math.max(byWeek.get(wk) ?? 0, maxW));
  }
  const weeks = Array.from(byWeek.entries()).sort(([a], [b]) => a.localeCompare(b));
  if (weeks.length < 4) return null;
  const last4 = weeks.slice(-4);
  const progressing = last4.every((w, i) => i === 0 || w[1] >= last4[i - 1][1]);
  if (progressing && last4[3][1] > last4[0][1])
    return Math.round(exercise.targetWeightKg * 0.8 * 10) / 10;
  return null;
}

export async function coupleStreak(): Promise<number> {
  let streak = 0, cursor = todayISO();
  for (let i = 0; i < 365; i++) {
    const rec = await getTogetherDaily(cursor);
    const allDone = rec.habits.length > 0 &&
      rec.habits.every((h) => h.completedBy.includes("viet") && h.completedBy.includes("jullie"));
    if (allDone) { streak++; cursor = isoAddDays(cursor, -1); }
    else { if (i === 0) { cursor = isoAddDays(cursor, -1); continue; } break; }
  }
  return streak;
}

export interface WeeklyStats { workouts: number; volumeKg: number; habitCompletionPct: number; topStreak: number; }

export async function weeklyStats(profile: Profile, weekStart: string, weekEnd: string): Promise<WeeklyStats> {
  const daily = await getDailyRange(profile.id, weekStart, weekEnd);
  const workoutDays = new Set(daily.filter((d) => d.workouts.length > 0).map((d) => d.date));
  let volume = 0;
  for (const d of daily)
    for (const w of d.workouts)
      for (const s of w.sets ?? []) volume += s.reps * s.weightKg;

  const totalHabits = profile.personalHabits.length * 7;
  const completed = daily.reduce((a, d) =>
    a + d.habitsCompleted.filter((h) => profile.personalHabits.some((p) => p.id === h)).length, 0);
  const pct = totalHabits > 0 ? Math.round((completed / totalHabits) * 100) : 0;

  let topStreak = 0;
  for (const h of profile.personalHabits) {
    let streak = 0, cursor = todayISO();
    for (let i = 0; i < 365; i++) {
      const rec = await getDaily(profile.id, cursor);
      if (rec.habitsCompleted.includes(h.id)) { streak++; cursor = isoAddDays(cursor, -1); }
      else { if (i === 0) { cursor = isoAddDays(cursor, -1); continue; } break; }
    }
    if (streak > topStreak) topStreak = streak;
  }

  return { workouts: workoutDays.size, volumeKg: Math.round(volume), habitCompletionPct: pct, topStreak };
}
