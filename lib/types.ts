export type ProfileId = "viet" | "jullie";
export type Sex = "male" | "female";
export type ExerciseType = "strength" | "cardio";
export type BodyPart = "upper" | "lower";

export interface Exercise {
  id: string;
  name: string;
  type: ExerciseType;
  bodyPart?: BodyPart;
  targetWeightKg?: number;
  targetReps?: number;       // legacy — kept for backward compat
  targetRepsMin?: number;    // double progression lower bound (default 8)
  targetRepsMax?: number;    // double progression upper bound (default 12)
  muscleGroup?: string;
  template?: string;
}

// Resolve rep range with defaults
export function getRepsMin(ex: Exercise): number {
  return ex.targetRepsMin ?? ex.targetReps ?? 8;
}
export function getRepsMax(ex: Exercise): number {
  return ex.targetRepsMax ?? 12;
}

export interface Supplement { id: string; name: string; }
export interface Habit { id: string; name: string; }

export interface Profile {
  id: ProfileId;
  name: string;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  desiredWeightKg?: number;
  supplements: Supplement[];
  personalHabits: Habit[];
  exerciseLibrary: Exercise[];
}

export interface LoggedSet { reps: number; weightKg: number; }

export interface WorkoutEntry {
  exerciseId: string;
  exerciseName: string;
  type: ExerciseType;
  sets?: LoggedSet[];
  durationMin?: number;
  distanceKm?: number;
  loggedAt: string;
}

export interface DailyRecord {
  date: string;
  workouts: WorkoutEntry[];
  supplementsTaken: string[];
  habitsCompleted: string[];
}

export interface TogetherHabit { id: string; name: string; }

export interface TogetherDaily {
  date: string;
  habits: Array<{ id: string; name: string; completedBy: ProfileId[] }>;
}

export interface TogetherConfig { habits: TogetherHabit[]; }

export interface WeightEntry { date: string; weightKg: number; }

export type PRType = "weight" | "reps" | "1rm";
export interface PR {
  date: string;
  exerciseId: string;
  exerciseName: string;
  type: PRType;
  value: number;
  previousValue: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export type ProfileName = ProfileId;
