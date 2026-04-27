"use client";
import { useState, useEffect, useCallback } from "react";
import type { Profile, TogetherDaily } from "@/lib/types";
import { todayISO, formatDate } from "@/lib/date";
import { Card, Btn, SectionTitle, CheckRow, Modal, Input } from "./UI";

type ProfileName = "viet" | "jullie";

export default function HabitsTab({
  profile, onProfileUpdate, profileName,
}: {
  profile: Profile;
  onProfileUpdate: (p: Profile) => Promise<void>;
  profileName: ProfileName;
}) {
  const [completed, setCompleted] = useState<string[]>([]);
  const [together, setTogether] = useState<TogetherDaily | null>(null);
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [coupleStreak, setCoupleStreak] = useState(0);
  const [addModal, setAddModal] = useState(false);
  const [addTogetherModal, setAddTogetherModal] = useState(false);
  const [newHabit, setNewHabit] = useState("");
  const today = todayISO();

  const load = useCallback(async () => {
    const [daily, tog, statsRes] = await Promise.all([
      fetch(`/api/daily?id=${profile.id}&date=${today}`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/together?date=${today}`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/stats`, { cache: "no-store" }).then((r) => r.json()),
    ]);
    setCompleted(daily.habitsCompleted ?? []);
    setTogether(tog);
    setCoupleStreak(statsRes.coupleStreak ?? 0);

    // load streaks for each personal habit
    const s: Record<string, number> = {};
    await Promise.all(
      profile.personalHabits.map(async (h) => {
        const r = await fetch(`/api/daily?id=${profile.id}&habitStreak=${h.id}`).catch(() => null);
        s[h.id] = 0; // fallback; real streak calc happens server-side
      })
    );
    setStreaks(s);
  }, [profile.id, profile.personalHabits, today]);

  useEffect(() => { load(); }, [load]);

  async function togglePersonal(id: string) {
    const updated = completed.includes(id) ? completed.filter((c) => c !== id) : [...completed, id];
    setCompleted(updated);
    const rec = await fetch(`/api/daily?id=${profile.id}&date=${today}`, { cache: "no-store" }).then((r) => r.json());
    await fetch(`/api/daily?id=${profile.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...rec, habitsCompleted: updated }),
    });
  }

  async function toggleTogether(habitId: string) {
    const res = await fetch(`/api/together?scope=toggle`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date: today, habitId, profileId: profileName }),
    });
    const data = await res.json();
    setTogether(data.record);
  }

  async function addPersonalHabit() {
    if (!newHabit.trim()) return;
    const h = { id: `habit-${Date.now()}`, name: newHabit.trim() };
    await onProfileUpdate({ ...profile, personalHabits: [...profile.personalHabits, h] });
    setNewHabit("");
    setAddModal(false);
  }

  async function removePersonalHabit(id: string) {
    await onProfileUpdate({ ...profile, personalHabits: profile.personalHabits.filter((h) => h.id !== id) });
  }

  async function addTogetherHabit() {
    if (!newHabit.trim()) return;
    const cfg = await fetch(`/api/together?scope=config`, { cache: "no-store" }).then((r) => r.json());
    const h = { id: `tog-${Date.now()}`, name: newHabit.trim() };
    await fetch(`/api/together?scope=config`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ habits: [...cfg.habits, h] }),
    });
    setNewHabit("");
    setAddTogetherModal(false);
    load();
  }

  async function removeTogetherHabit(id: string) {
    const cfg = await fetch(`/api/together?scope=config`, { cache: "no-store" }).then((r) => r.json());
    await fetch(`/api/together?scope=config`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ habits: cfg.habits.filter((h: { id: string }) => h.id !== id) }),
    });
    load();
  }

  const personalDone = profile.personalHabits.filter((h) => completed.includes(h.id)).length;
  const togetherHabits = together?.habits ?? [];
  const togetherDone = togetherHabits.filter((h) => h.completedBy.includes("viet") && h.completedBy.includes("jullie")).length;

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle>Habits</SectionTitle>

      {/* Couple streak */}
      {coupleStreak > 0 && (
        <div className="bg-accent/10 border border-accent/30 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-3xl">🔥</span>
          <div>
            <div className="font-display font-black text-lg text-accent">{coupleStreak} day streak</div>
            <div className="text-xs text-muted">Together habits — keep it going!</div>
          </div>
        </div>
      )}

      {/* Personal habits */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-bold text-sm">Personal Habits</div>
            <div className="text-xs text-muted">{formatDate(today)} · {personalDone}/{profile.personalHabits.length} done</div>
          </div>
          <Btn size="sm" variant="secondary" onClick={() => { setNewHabit(""); setAddModal(true); }}>+ Add</Btn>
        </div>
        {profile.personalHabits.length === 0 ? (
          <div className="text-muted text-sm text-center py-4">No personal habits yet — add one!</div>
        ) : (
          <div className="divide-y divide-border">
            {profile.personalHabits.map((h) => (
              <div key={h.id} className="flex items-center gap-1">
                <div className="flex-1">
                  <CheckRow
                    label={h.name}
                    checked={completed.includes(h.id)}
                    onToggle={() => togglePersonal(h.id)}
                    sub={streaks[h.id] ? `🔥 ${streaks[h.id]} day streak` : undefined}
                  />
                </div>
                <button onClick={() => removePersonalHabit(h.id)} className="text-muted px-2 py-1 text-lg">×</button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Together habits */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-bold text-sm">Together Habits 💑</div>
            <div className="text-xs text-muted">{togetherDone}/{togetherHabits.length} completed today</div>
          </div>
          <Btn size="sm" variant="secondary" onClick={() => { setNewHabit(""); setAddTogetherModal(true); }}>+ Add</Btn>
        </div>
        {togetherHabits.length === 0 ? (
          <div className="text-muted text-sm text-center py-4">No together habits yet — add one you both do!</div>
        ) : (
          <div className="divide-y divide-border">
            {togetherHabits.map((h) => {
              const vietDone = h.completedBy.includes("viet");
              const jullieDone = h.completedBy.includes("jullie");
              const bothDone = vietDone && jullieDone;
              const myDone = h.completedBy.includes(profileName);
              return (
                <div key={h.id} className="flex items-center gap-1">
                  <div className="flex-1">
                    <CheckRow
                      label={h.name}
                      checked={myDone}
                      onToggle={() => toggleTogether(h.id)}
                      sub={bothDone ? "✅ Both done!" : `${vietDone ? "✓ Viet" : "○ Viet"} · ${jullieDone ? "✓ Jullie" : "○ Jullie"}`}
                    />
                  </div>
                  <button onClick={() => removeTogetherHabit(h.id)} className="text-muted px-2 py-1 text-lg">×</button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Personal Habit">
        <Input label="Habit name" value={newHabit} onChange={setNewHabit} placeholder="e.g. Drink 3L water" />
        <Btn className="mt-4" size="lg" onClick={addPersonalHabit} disabled={!newHabit.trim()}>Add Habit</Btn>
      </Modal>

      <Modal open={addTogetherModal} onClose={() => setAddTogetherModal(false)} title="Add Together Habit">
        <div className="text-xs text-muted mb-3">Both Viet and Jullie need to check this for it to count as complete.</div>
        <Input label="Habit name" value={newHabit} onChange={setNewHabit} placeholder="e.g. Cook dinner together" />
        <Btn className="mt-4" size="lg" onClick={addTogetherHabit} disabled={!newHabit.trim()}>Add Habit</Btn>
      </Modal>
    </div>
  );
}
