import { NextRequest, NextResponse } from "next/server";
import { getDaily, saveDaily, getTogetherDaily, saveTogetherDaily } from "@/lib/storage";
import { todayISO } from "@/lib/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Protect endpoint
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  // Vercel adds Authorization header from CRON_SECRET env automatically
  if (process.env.CRON_SECRET && auth !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const today = todayISO();
  // Initialize today's records for both profiles + together (no-op if they exist)
  const viet = await getDaily("viet", today);
  await saveDaily("viet", viet);
  const jullie = await getDaily("jullie", today);
  await saveDaily("jullie", jullie);
  const together = await getTogetherDaily(today);
  await saveTogetherDaily(together);

  return NextResponse.json({ ok: true, date: today });
}
