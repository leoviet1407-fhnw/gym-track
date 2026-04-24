export type ProfileId = "viet" | "jullie";
export type Sex = "male" | "female";
export type ExerciseType = "strength" | "cardio";
export type BodyPart = "upper" | "lower";

export interface Exercise {
  id: string;
  name: string;
  type: ExerciseType;
  bodyPart?: BodyPart; // strength only
  targetWeightKg?: number; // strength only
  targetReps?: number; // strength only
  muscleGroup?: string; // free text: "chest", "back", etc.
  template?: string; // template name, e.g. "Chest + Triceps"
}

export interface Supplement {
  id: string;
  name: string;
}

export interface Habit {
  id: string;
  name: string;
}

export interface Profile {
  id: ProfileId;
  name: string;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  supplements: Supplement[];
  personalHabits: Habit[];
  exerciseLibrary: Exercise[];
}

export interface LoggedSet {
  reps: number;
  weightKg: number;
}

export interface WorkoutEntry {
  exerciseId: string;
  exerciseName: string;
  type: ExerciseType;
  sets?: LoggedSet[]; // strength
  durationMin?: number; // cardio
  distanceKm?: number; // cardio
  loggedAt: string; // ISO timestamp
}

export interface DailyRecord {
  date: string; // YYYY-MM-DD
  workouts: WorkoutEntry[];
  supplementsTaken: string[];
  habitsCompleted: string[];
}

export interface TogetherHabit {
  id: string;
  name: string;
}

export interface TogetherDaily {
  date: string;
  habits: Array<{ id: string; name: string; completedBy: ProfileId[] }>;
}

export interface TogetherConfig {
  habits: TogetherHabit[];
}

export interface WeightEntry {
  date: string; // YYYY-MM-DD
  weightKg: number;
}

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

// Alias used in page.tsx
export type ProfileName = ProfileId;
