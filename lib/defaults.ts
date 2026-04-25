import type { Profile, ProfileId, Exercise } from "./types";

function ex(
  id: string,
  name: string,
  template: string,
  bodyPart: "upper" | "lower",
  targetWeightKg: number,
  muscleGroup = "",
  targetRepsMin = 8,
  targetRepsMax = 12
): Exercise {
  return {
    id, name, type: "strength", bodyPart,
    targetWeightKg, targetRepsMin, targetRepsMax,
    muscleGroup, template,
  };
}

const vietExercises: Exercise[] = [
  // Chest + Triceps
  ex("bench-press",    "Barbell Bench Press",              "Chest + Triceps", "upper", 50,   "chest"),
  ex("db-incline-press","Dumbbell Incline Press",          "Chest + Triceps", "upper", 45,   "chest"),
  ex("chest-fly-machine","Chest Fly Machine",              "Chest + Triceps", "upper", 15,   "chest"),
  ex("cable-chest-fly","Cable Chest Fly",                  "Chest + Triceps", "upper", 40,   "chest"),
  ex("tricep-rope",    "Tricep Rope Pulldown",             "Chest + Triceps", "upper", 20,   "triceps"),
  ex("overhead-tri",   "Overhead Tricep Cable Extension",  "Chest + Triceps", "upper", 15,   "triceps"),
  // Back + Biceps
  ex("lat-pulldown",   "Cable Lat Pulldown",               "Back + Biceps",   "upper", 60,   "back"),
  ex("machine-pulldown","Machine Pulldown",                "Back + Biceps",   "upper", 65,   "back", 8, 12),
  ex("seated-row",     "Seated Machine Row",               "Back + Biceps",   "upper", 27.5, "back"),
  ex("reverse-pulldown","Reverse Grip Pulldown",           "Back + Biceps",   "upper", 40,   "back"),
  ex("arm-curl",       "Arm Curl",                         "Back + Biceps",   "upper", 25,   "biceps"),
  // Legs + Shoulders
  ex("leg-press",      "Leg Press",                        "Legs + Shoulders","lower", 100,  "legs"),
  ex("leg-curl",       "Leg Curl",                         "Legs + Shoulders","lower", 30,   "legs"),
  ex("hamstring-curl", "Hamstring Curl",                   "Legs + Shoulders","lower", 30,   "legs"),
  ex("shoulder-press", "Shoulder Press",                   "Legs + Shoulders","upper", 20,   "shoulders"),
  ex("shoulder-raises","Shoulder Raises",                  "Legs + Shoulders","upper", 10,   "shoulders"),
];

export function defaultProfile(id: ProfileId): Profile {
  if (id === "viet") {
    return {
      id: "viet", name: "Viet", sex: "male", age: 25,
      heightCm: 175, weightKg: 70,
      supplements: [{ id: "creatine", name: "Creatine" }],
      personalHabits: [],
      exerciseLibrary: vietExercises,
    };
  }
  return {
    id: "jullie", name: "Jullie", sex: "female", age: 25,
    heightCm: 165, weightKg: 60,
    supplements: [{ id: "omega369", name: "Omega 3-6-9" }],
    personalHabits: [],
    exerciseLibrary: [],
  };
}
