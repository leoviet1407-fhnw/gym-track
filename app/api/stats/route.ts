import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/storage";
import { weeklyStats, coupleStreak } from "@/lib/automation";
import { todayISO, weekStartISO, isoAddDays } from "@/lib/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    return NextResponse.json({
      weekStart,
      weekEnd,
      viet: { name: viet.name, ...vietStats },
      jullie: { name: jullie.name, ...jullieStats },
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
