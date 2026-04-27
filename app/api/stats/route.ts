import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/storage";
import { weeklyStats, coupleStreak } from "@/lib/automation";
import { todayISO, weekStartISO, isoAddDays } from "@/lib/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const weekStart =
    req.nextUrl.searchParams.get("weekStart") ?? weekStartISO(todayISO());
  const weekEnd = isoAddDays(weekStart, 6);

  try {
    const [viet, jullie] = await Promise.all([
      getProfile("viet"),
      getProfile("jullie"),
    ]);

    const [vietStats, jullieStats, couple] = await Promise.all([
      weeklyStats(viet, weekStart, weekEnd),
      weeklyStats(jullie, weekStart, weekEnd),
      coupleStreak(),
    ]);

    // Weight goal progress per profile
    async function weightGoalPct(profile: typeof viet) {
      if (!profile.desiredWeightKg) return null;
      const weights = await import("@/lib/storage").then(m => m.getWeights(profile.id));
      if (!weights.length) return null;
      const startW = weights[0].weightKg;
      const currentW = profile.weightKg;
      const goalW = profile.desiredWeightKg;
      const isGain = goalW > startW;
      const totalChange = Math.abs(goalW - startW);
      if (totalChange === 0) return 100;
      const progress = isGain ? currentW - startW : startW - currentW;
      return Math.max(0, Math.min(100, Math.round((progress / totalChange) * 100)));
    }

    const [vietWeightPct, jullieWeightPct] = await Promise.all([
      weightGoalPct(viet),
      weightGoalPct(jullie),
    ]);

    return NextResponse.json({
      weekStart,
      weekEnd,
      viet: { name: viet.name, ...vietStats, weightGoalPct: vietWeightPct, currentWeight: viet.weightKg, desiredWeight: viet.desiredWeightKg ?? null },
      jullie: { name: jullie.name, ...jullieStats, weightGoalPct: jullieWeightPct, currentWeight: jullie.weightKg, desiredWeight: jullie.desiredWeightKg ?? null },
      coupleStreak: couple,
    });
  } catch (err) {
    console.error("Stats error:", err);
    return NextResponse.json(
      { error: "Failed to load stats" },
      { status: 500 }
    );
  }
}
