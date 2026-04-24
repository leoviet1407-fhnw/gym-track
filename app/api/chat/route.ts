import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  getProfile,
  getChat,
  saveChat,
  getWeights,
  getPRs,
  getDailyRange,
} from "@/lib/storage";
import { todayISO, isoAddDays, formatDate } from "@/lib/date";
import { bmi, bmrCalories, oneRepMax } from "@/lib/fitness";
import type { ProfileId, ChatMessage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function pid(req: NextRequest): ProfileId {
  const id = req.nextUrl.searchParams.get("id");
  return id === "jullie" ? "jullie" : "viet";
}

async function buildContext(id: ProfileId): Promise<string> {
  const profile = await getProfile(id);
  const otherId: ProfileId = id === "viet" ? "jullie" : "viet";
  const other = await getProfile(otherId);

  const today = todayISO();
  const from30 = isoAddDays(today, -30);
  const weights = await getWeights(id);
  const prs = await getPRs(id);
  const daily = await getDailyRange(id, from30, today);
  const otherDaily = await getDailyRange(otherId, from30, today);

  const userBMI = bmi(profile.heightCm, profile.weightKg);
  const userCal = bmrCalories(profile.sex, profile.age, profile.heightCm, profile.weightKg);

  // Workouts per exercise (last 5 sessions)
  const perExercise = new Map<string, Array<{ date: string; sets: string; oneRM: number }>>();
  for (const d of [...daily].reverse()) {
    for (const w of d.workouts) {
      if (w.type !== "strength" || !w.sets?.length) continue;
      const setsStr = w.sets.map((s) => `${s.reps}x${s.weightKg}kg`).join(", ");
      const maxRM = Math.max(...w.sets.map((s) => oneRepMax(s.weightKg, s.reps)));
      const arr = perExercise.get(w.exerciseName) ?? [];
      if (arr.length < 5) {
        arr.push({ date: formatDate(d.date), sets: setsStr, oneRM: maxRM });
        perExercise.set(w.exerciseName, arr);
      }
    }
  }

  const exerciseSummary = Array.from(perExercise.entries())
    .map(
      ([name, sessions]) =>
        `• ${name}: ` +
        sessions
          .map((s) => `${s.date} [${s.sets}, est 1RM ${s.oneRM}kg]`)
          .join(" | ")
    )
    .join("\n");

  const recentWeights = weights.slice(-10).map((w) => `${formatDate(w.date)}: ${w.weightKg}kg`).join(", ");
  const recentPRs = prs
    .slice(-10)
    .map((p) => `${formatDate(p.date)} ${p.exerciseName} (${p.type}) ${p.value}`)
    .join("; ");

  // Habit completion rate
  const totalHabitDays = profile.personalHabits.length * daily.length;
  const doneDays = daily.reduce(
    (a, d) => a + d.habitsCompleted.filter((h) => profile.personalHabits.some((p) => p.id === h)).length,
    0
  );
  const habitPct = totalHabitDays > 0 ? Math.round((doneDays / totalHabitDays) * 100) : 0;

  const suppDays = daily.filter((d) => d.supplementsTaken.length > 0).length;

  // Partner summary
  const otherWorkouts = otherDaily.filter((d) => d.workouts.length > 0).length;
  const otherVolume = otherDaily.reduce(
    (a, d) => a + d.workouts.reduce((b, w) => b + (w.sets ?? []).reduce((c, s) => c + s.reps * s.weightKg, 0), 0),
    0
  );

  return `You are an AI personal trainer in the GymTrack app. Be direct, specific, and use the user's actual data. Keep responses concise and actionable. All dates you reference must use DD/MM/YYYY format.

Today's date: ${formatDate(today)}

USER PROFILE
Name: ${profile.name} (${profile.sex}, age ${profile.age})
Height: ${profile.heightCm}cm, Weight: ${profile.weightKg}kg
BMI: ${userBMI}, Baseline calories: ${userCal} kcal/day
Supplements: ${profile.supplements.map((s) => s.name).join(", ") || "none"}

RECENT WEIGHT (last 10 entries):
${recentWeights || "no entries"}

RECENT PRs:
${recentPRs || "none yet"}

LAST 30 DAYS — WORKOUTS PER EXERCISE:
${exerciseSummary || "no workouts logged"}

LAST 30 DAYS — HABITS:
${profile.personalHabits.length} habits, ${habitPct}% completion, supplements taken on ${suppDays}/${daily.length} days

PARTNER (${other.name}) — last 30 days:
${otherWorkouts} workouts logged, total volume ${Math.round(otherVolume)}kg

Guidelines:
- Base recommendations on the data above
- When suggesting weight/rep changes, be specific with numbers
- Use DD/MM/YYYY for any date references
- Be motivating but honest — if progress is stalled, say so`;
}

export async function GET(req: NextRequest) {
  const id = pid(req);
  const msgs = await getChat(id);
  return NextResponse.json(msgs);
}

export async function POST(req: NextRequest) {
  const id = pid(req);
  const { message } = (await req.json()) as { message: string };

  const history = await getChat(id);
  const userMsg: ChatMessage = {
    role: "user",
    content: message,
    timestamp: new Date().toISOString(),
  };

  const system = await buildContext(id);
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system,
    messages: [
      ...history.slice(-20).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ],
  });

  const text = response.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();

  const assistantMsg: ChatMessage = {
    role: "assistant",
    content: text,
    timestamp: new Date().toISOString(),
  };

  const updated = [...history, userMsg, assistantMsg];
  await saveChat(id, updated);

  return NextResponse.json({ reply: assistantMsg });
}

export async function DELETE(req: NextRequest) {
  const id = pid(req);
  await saveChat(id, []);
  return NextResponse.json({ ok: true });
}
