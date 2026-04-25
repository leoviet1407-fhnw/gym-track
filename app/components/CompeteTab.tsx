"use client";
import { useState, useEffect } from "react";
import { todayISO, weekStartISO, isoAddDays, formatDate } from "@/lib/date";
import { Card, Card2, SectionTitle, Spinner } from "./UI";

interface Stats {
  name: string;
  workouts: number;
  volumeKg: number;
  habitCompletionPct: number;
  topStreak: number;
  weightGoalPct: number | null;
  currentWeight: number;
  desiredWeight: number | null;
}

interface CompeteData {
  weekStart: string;
  weekEnd: string;
  viet: Stats;
  jullie: Stats;
  coupleStreak: number;
}

function StatRow({ label, viet, jullie }: { label: string; viet: number | string; jullie: number | string }) {
  const vNum = typeof viet === "number" ? viet : 0;
  const jNum = typeof jullie === "number" ? jullie : 0;
  const vWins = vNum > jNum;
  const jWins = jNum > vNum;
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <div className={`flex-1 text-right font-bold text-sm ${vWins ? "text-accent" : "text-text"}`}>
        {viet}{vWins ? " 🏆" : ""}
      </div>
      <div className="text-xs text-muted text-center w-28 shrink-0">{label}</div>
      <div className={`flex-1 text-left font-bold text-sm ${jWins ? "text-accent" : "text-text"}`}>
        {jWins ? "🏆 " : ""}{jullie}
      </div>
    </div>
  );
}

export default function CompeteTab() {
  const [data, setData] = useState<CompeteData | null>(null);
  const [loading, setLoading] = useState(true);
  const today = todayISO();
  const weekStart = weekStartISO(today);

  useEffect(() => {
    fetch(`/api/stats?weekStart=${weekStart}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, [weekStart]);

  if (loading) return <div className="pt-10"><Spinner /></div>;
  if (!data) return <div className="text-muted text-center pt-10">Could not load stats</div>;

  const { viet, jullie, coupleStreak } = data;

  // Determine overall weekly winner by points (1 point per metric win)
  let vietPoints = 0, julliePoints = 0;
  if (viet.workouts > jullie.workouts) vietPoints++;
  else if (jullie.workouts > viet.workouts) julliePoints++;
  if (viet.volumeKg > jullie.volumeKg) vietPoints++;
  else if (jullie.volumeKg > viet.volumeKg) julliePoints++;
  if (viet.habitCompletionPct > jullie.habitCompletionPct) vietPoints++;
  else if (jullie.habitCompletionPct > viet.habitCompletionPct) julliePoints++;
  if (viet.topStreak > jullie.topStreak) vietPoints++;
  else if (jullie.topStreak > viet.topStreak) julliePoints++;

  const weekLabel = `${formatDate(data.weekStart)} – ${formatDate(data.weekEnd)}`;

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle>Compete</SectionTitle>

      {/* Couple streak */}
      <div className="bg-gradient-to-r from-accent/20 to-accent2/20 border border-accent/30 rounded-2xl p-5 text-center">
        <div className="text-4xl mb-1">💑</div>
        <div className="font-display font-black text-3xl text-accent">{coupleStreak}</div>
        <div className="text-sm text-muted mt-1">Day couple streak</div>
        {coupleStreak === 0 && <div className="text-xs text-muted mt-1">Complete all together habits to start your streak</div>}
      </div>

      {/* Weekly winner banner */}
      {vietPoints !== julliePoints && (
        <div className="bg-accent/10 border border-accent/30 rounded-2xl p-4 text-center">
          <div className="text-xs text-muted mb-1">This week's leader</div>
          <div className="font-display font-black text-2xl text-accent">
            {vietPoints > julliePoints ? `🏆 ${viet.name}` : `🏆 ${jullie.name}`}
          </div>
          <div className="text-xs text-muted mt-1">{vietPoints > julliePoints ? vietPoints : julliePoints}/4 metrics</div>
        </div>
      )}
      {vietPoints === julliePoints && vietPoints > 0 && (
        <div className="bg-accent2/10 border border-accent2/30 rounded-2xl p-4 text-center">
          <div className="font-display font-black text-2xl text-accent2">🤝 Tied!</div>
          <div className="text-xs text-muted mt-1">Both at {vietPoints}/4 metrics — dead even</div>
        </div>
      )}

      {/* Head-to-head stats */}
      <Card>
        <div className="flex justify-between mb-1">
          <span className="font-display font-black text-base text-accent">{viet.name}</span>
          <span className="font-display font-black text-base text-accent">{jullie.name}</span>
        </div>
        <div className="text-xs text-muted text-center mb-3">{weekLabel}</div>
        <StatRow label="Workouts" viet={viet.workouts} jullie={jullie.workouts} />
        <StatRow label="Volume (kg)" viet={`${viet.volumeKg.toLocaleString()} kg`} jullie={`${jullie.volumeKg.toLocaleString()} kg`} />
        <StatRow label="Habit %" viet={`${viet.habitCompletionPct}%`} jullie={`${jullie.habitCompletionPct}%`} />
        <StatRow label="Top streak" viet={`${viet.topStreak}d`} jullie={`${jullie.topStreak}d`} />
      </Card>

      {/* Individual summaries */}
      <div className="grid grid-cols-2 gap-3">
        {[viet, jullie].map((p) => (
          <Card2 key={p.name} className="flex flex-col gap-2">
            <div className="font-bold text-sm text-accent">{p.name}</div>
            <div className="text-xs text-muted">Workouts <span className="text-text font-bold">{p.workouts}</span></div>
            <div className="text-xs text-muted">Volume <span className="text-text font-bold">{p.volumeKg.toLocaleString()} kg</span></div>
            <div className="text-xs text-muted">Habits <span className="text-text font-bold">{p.habitCompletionPct}%</span></div>
            <div className="text-xs text-muted">Streak <span className="text-text font-bold">{p.topStreak}d 🔥</span></div>
          </Card2>
        ))}
      </div>

      {/* Weight goal progress */}
      {(viet.desiredWeight || jullie.desiredWeight) && (
        <Card>
          <div className="font-bold text-sm mb-4">Weight Goal Progress</div>
          <div className="flex flex-col gap-4">
            {[viet, jullie].map((p) => {
              if (!p.desiredWeight) return null;
              const pct = p.weightGoalPct ?? 0;
              const done = Math.abs(p.currentWeight - p.desiredWeight) < 0.1;
              return (
                <div key={p.name}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-bold text-text">{p.name}</span>
                    <span className={`font-bold ${done ? "text-success" : "text-accent"}`}>
                      {done ? "🎯 Goal reached!" : `${pct}%`}
                    </span>
                  </div>
                  <div className="h-2.5 bg-border rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: done ? "#4ade80" : "linear-gradient(90deg,#ff3d3d,#ff7a5a)" }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted mt-1">
                    <span>{p.currentWeight} kg now</span>
                    <span>Goal: {p.desiredWeight} kg</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
