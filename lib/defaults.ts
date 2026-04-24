import type { Profile, ProfileId, Exercise } from "./types";

function ex(
  id: string,
  name: string,
  template: string,
  bodyPart: "upper" | "lower",
  targetWeightKg: number,
  targetReps = 8,
  muscleGroup = ""
): Exercise {
  return {
    id,
    name,
    type: "strength",
    bodyPart,
    targetWeightKg,
    targetReps,
    muscleGroup,
    template,
  };
}

const vietExercises: Exercise[] = [
  // Chest + Triceps
  ex("bench-press", "Barbell Bench Press", "Chest + Triceps", "upper", 50, 8, "chest"),
  ex("db-incline-press", "Dumbbell Incline Press", "Chest + Triceps", "upper", 45, 8, "chest"),
  ex("chest-fly-machine", "Chest Fly Machine", "Chest + Triceps", "upper", 15, 8, "chest"),
  ex("cable-chest-fly", "Cable Chest Fly", "Chest + Triceps", "upper", 40, 8, "chest"),
  ex("tricep-rope", "Tricep Rope Pulldown", "Chest + Triceps", "upper", 20, 8, "triceps"),
  ex("overhead-tri", "Overhead Tricep Cable Extension", "Chest + Triceps", "upper", 15, 8, "triceps"),
  // Back + Biceps
  ex("lat-pulldown", "Cable Lat Pulldown", "Back + Biceps", "upper", 60, 8, "back"),
  ex("machine-pulldown", "Machine Pulldown", "Back + Biceps", "upper", 65, 10, "back"),
  ex("seated-row", "Seated Machine Row", "Back + Biceps", "upper", 27.5, 8, "back"),
  ex("reverse-pulldown", "Reverse Grip Pulldown", "Back + Biceps", "upper", 40, 8, "back"),
  ex("arm-curl", "Arm Curl", "Back + Biceps", "upper", 25, 8, "biceps"),
  // Legs + Shoulders
  ex("leg-press", "Leg Press", "Legs + Shoulders", "lower", 100, 8, "legs"),
  ex("leg-curl", "Leg Curl", "Legs + Shoulders", "lower", 30, 8, "legs"),
  ex("hamstring-curl", "Hamstring Curl", "Legs + Shoulders", "lower", 30, 8, "legs"),
  ex("shoulder-press", "Shoulder Press", "Legs + Shoulders", "upper", 20, 8, "shoulders"),
  ex("shoulder-raises", "Shoulder Raises", "Legs + Shoulders", "upper", 10, 8, "shoulders"),
];

export function defaultProfile(id: ProfileId): Profile {
  if (id === "viet") {
    return {
      id: "viet",
      name: "Viet",
      sex: "male",
      age: 25,
      heightCm: 175,
      weightKg: 70,
      supplements: [{ id: "creatine", name: "Creatine" }],
      personalHabits: [],
      exerciseLibrary: vietExercises,
    };
  }
  return {
    id: "jullie",
    name: "Jullie",
    sex: "female",
    age: 25,
    heightCm: 165,
    weightKg: 60,
    supplements: [{ id: "omega369", name: "Omega 3-6-9" }],
    personalHabits: [],
    exerciseLibrary: [],
  };
}
