import type { Sex } from "./types";

export function bmi(heightCm: number, weightKg: number): number {
  if (!heightCm || !weightKg) return 0;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export function bmiCategory(v: number): { label: string; color: string } {
  if (v === 0) return { label: "—", color: "text-muted" };
  if (v < 18.5) return { label: "Underweight", color: "text-accent2" };
  if (v < 25) return { label: "Normal", color: "text-success" };
  if (v < 30) return { label: "Overweight", color: "text-accent2" };
  return { label: "Obese", color: "text-accent" };
}

// Mifflin-St Jeor — sedentary baseline
export function bmrCalories(
  sex: Sex,
  age: number,
  heightCm: number,
  weightKg: number
): number {
  if (!age || !heightCm || !weightKg) return 0;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const bmr = sex === "male" ? base + 5 : base - 161;
  return Math.round(bmr * 1.2); // sedentary factor
}

// Epley 1RM estimate
export function oneRepMax(weightKg: number, reps: number): number {
  if (!weightKg || !reps) return 0;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}
