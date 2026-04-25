import type { Profile, ProfileId, WorkoutEntry, PR, Exercise } from "./types";
import { getRepsMin, getRepsMax } from "./types";
import { oneRepMax } from "./fitness";
import {
  getDailyRange, listDailyDates, getDaily,
  getPRs, savePRs, getTogetherDaily,
} from "./storage";
import { todayISO, isoAddDays } from "./date";

// ── Exercise history ─────────────────────────────────────────────────────────
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

// ── PR detection ─────────────────────────────────────────────────────────────
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

// ── Double progression ───────────────────────────────────────────────────────
// Returns: { type: "increase", newWeight } | { type: "tooHeavy", prevWeight } | null
export type ProgressionResult =
  | { type: "increase"; newWeight: number; resetRepsTo: number }
  | { type: "tooHeavy"; suggestedWeight: number }
  | null;

export async function doubleProgressionCheck(
  id: ProfileId, exercise: Exercise
): Promise<ProgressionResult> {
  if (exercise.type !== "strength" || !exercise.targetWeightKg) return null;

  const repsMin = getRepsMin(exercise);
  const repsMax = getRepsMax(exercise);
  const bump = exercise.bodyPart === "lower" ? 5 : 2.5;

  const history = await getExerciseHistory(id, exercise.id, 5);
  if (!history.length) return null;

  const latest = history[0];
  const sets = latest.entry.sets ?? [];
  if (!sets.length) return null;

  // Check if any set fell below minimum reps
  const tooHeavy = sets.some((s) => s.reps < repsMin);
  if (tooHeavy) {
    const prevWeight = exercise.targetWeightKg - bump;
    return { type: "tooHeavy", suggestedWeight: Math.max(prevWeight, bump) };
  }

  // Check if ALL sets hit the max reps ceiling for 2 consecutive sessions
  const hitsMax = (entry: WorkoutEntry) =>
    (entry.sets ?? []).length >= 1 &&
    (entry.sets ?? []).every((s) => s.reps >= repsMax && s.weightKg >= exercise.targetWeightKg!);

  if (history.length >= 2 && hitsMax(history[0].entry) && hitsMax(history[1].entry)) {
    return {
      type: "increase",
      newWeight: exercise.targetWeightKg + bump,
      resetRepsTo: repsMin,
    };
  }

  return null;
}

// ── Deload suggestion ────────────────────────────────────────────────────────
export async function deloadSuggestion(
  id: ProfileId, exercise: Exercise
): Promise<number | null> {
  if (exercise.type !== "strength" || !exercise.targetWeightKg) return null;
  const history = await getExerciseHistory(id, exercise.id, 60);
  if (history.length < 8) return null;

  const byWeek = new Map<string, number>();
  for (const { date, entry } of history) {
    if (!entry.sets?.length) continue;
    const maxW = Math.max(...entry.sets.map((s) => s.weightKg));
    const d = new Date(date + "T12:00:00Z");
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setUTCDate(d.getUTCDate() + diff);
    const wk = d.toISOString().slice(0, 10);
    byWeek.set(wk, Math.max(byWeek.get(wk) ?? 0, maxW));
  }

  const weeks = Array.from(byWeek.entries()).sort(([a], [b]) => a.localeCompare(b));
  if (weeks.length < 4) return null;
  const last4 = weeks.slice(-4);
  let progressing = true;
  for (let i = 1; i < last4.length; i++) {
    if (last4[i][1] < last4[i - 1][1]) { progressing = false; break; }
  }
  if (progressing && last4[3][1] > last4[0][1]) {
    return Math.round(exercise.targetWeightKg * 0.8 * 10) / 10;
  }
  return null;
}

// ── Habit streak ─────────────────────────────────────────────────────────────
export async function computeHabitStreak(id: ProfileId, habitId: string): Promise<number> {
  const today = todayISO();
  let streak = 0;
  let cursor = today;
  for (let i = 0; i < 365; i++) {
    const rec = await getDaily(id, cursor);
    if (rec.habitsCompleted.includes(habitId)) {
      streak++;
      cursor = isoAddDays(cursor, -1);
    } else {
      if (i === 0) { cursor = isoAddDays(cursor, -1); continue; }
      break;
    }
  }
  return streak;
}

// ── Couple streak ────────────────────────────────────────────────────────────
export async function coupleStreak(): Promise<number> {
  const today = todayISO();
  let streak = 0;
  let cursor = today;
  for (let i = 0; i < 365; i++) {
    const rec = await getTogetherDaily(cursor);
    const allDone =
      rec.habits.length > 0 &&
      rec.habits.every((h) => h.completedBy.includes("viet") && h.completedBy.includes("jullie"));
    if (allDone) {
      streak++;
      cursor = isoAddDays(cursor, -1);
    } else {
      if (i === 0) { cursor = isoAddDays(cursor, -1); continue; }
      break;
    }
  }
  return streak;
}

// ── Weekly stats ─────────────────────────────────────────────────────────────
export interface WeeklyStats {
  workouts: number;
  volumeKg: number;
  habitCompletionPct: number;
  topStreak: number;
}

export async function weeklyStats(
  profile: Profile, weekStart: string, weekEnd: string
): Promise<WeeklyStats> {
  const daily = await getDailyRange(profile.id, weekStart, weekEnd);
  const workoutDays = new Set(daily.filter((d) => d.workouts.length > 0).map((d) => d.date));
  let volume = 0;
  for (const d of daily)
    for (const w of d.workouts)
      for (const s of w.sets ?? [])
        volume += s.reps * s.weightKg;

  const totalHabits = profile.personalHabits.length * 7;
  const completed = daily.reduce(
    (acc, d) => acc + d.habitsCompleted.filter((h) => profile.personalHabits.some((p) => p.id === h)).length, 0
  );
  const pct = totalHabits > 0 ? Math.round((completed / totalHabits) * 100) : 0;

  let topStreak = 0;
  for (const h of profile.personalHabits) {
    const s = await computeHabitStreak(profile.id, h.id);
    if (s > topStreak) topStreak = s;
  }

  return { workouts: workoutDays.size, volumeKg: Math.round(volume), habitCompletionPct: pct, topStreak };
}
