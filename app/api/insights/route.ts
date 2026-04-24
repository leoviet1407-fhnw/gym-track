import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  getProfile,
  getInsights,
  saveInsights,
  getDailyRange,
  getPRs,
} from "@/lib/storage";
import { todayISO, isoAddDays, formatDate } from "@/lib/date";
import { oneRepMax } from "@/lib/fitness";
import type { ProfileId } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function pid(req: NextRequest): ProfileId {
  const id = req.nextUrl.searchParams.get("id");
  return id === "jullie" ? "jullie" : "viet";
}

const SIX_HOURS = 6 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const id = pid(req);
  const cached = await getInsights(id);
  if (cached && Date.now() - new Date(cached.generatedAt).getTime() < SIX_HOURS) {
    return NextResponse.json(cached);
  }

  const profile = await getProfile(id);
  const today = todayISO();
  const from30 = isoAddDays(today, -30);
  const daily = await getDailyRange(id, from30, today);
  const prs = await getPRs(id);

  // Build brief context
  const workoutCount = daily.filter((d) => d.workouts.length > 0).length;
  const perExercise = new Map<string, Array<{ date: string; max: number }>>();
  for (const d of daily) {
    for (const w of d.workouts) {
      if (w.type !== "strength" || !w.sets?.length) continue;
      const max = Math.max(...w.sets.map((s) => oneRepMax(s.weightKg, s.reps)));
      const arr = perExercise.get(w.exerciseName) ?? [];
      arr.push({ date: formatDate(d.date), max });
      perExercise.set(w.exerciseName, arr);
    }
  }

  const exerciseLines = Array.from(perExercise.entries())
    .map(([name, arr]) => `${name}: ${arr.map((a) => `${a.date}=${a.max}kg`).join(", ")}`)
    .join("\n");
  const recentPRs = prs.slice(-5).map((p) => `${formatDate(p.date)} ${p.exerciseName}`).join(", ");

  const prompt = `You are generating 1-3 short proactive insight cards for ${profile.name} at the top of their gym tracker app. Respond ONLY with valid JSON, no markdown, no code fences, no commentary. Format:
{"cards":[{"title":"...","body":"...","tone":"positive|neutral|warning"}]}

Each title: max 6 words. Each body: max 20 words, concrete and actionable. Use DD/MM/YYYY if you mention dates.

DATA (last 30 days):
Workouts logged: ${workoutCount}
Recent PRs: ${recentPRs || "none"}
Exercise progression (est 1RM by date):
${exerciseLines || "no data yet"}

If there's no data, generate a single welcoming card encouraging them to log their first workout.`;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });
    const text = resp.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    // strip potential code fences
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean) as { cards: Array<{ title: string; body: string; tone: string }> };
    const result = {
      generatedAt: new Date().toISOString(),
      cards: parsed.cards ?? [],
    };
    await saveInsights(id, result);
    return NextResponse.json(result);
  } catch (err) {
    const fallback = {
      generatedAt: new Date().toISOString(),
      cards: [
        {
          title: "Keep logging",
          body: "Track every session to unlock trend insights and weight progression suggestions.",
          tone: "neutral",
        },
      ],
    };
    return NextResponse.json(fallback);
  }
}
