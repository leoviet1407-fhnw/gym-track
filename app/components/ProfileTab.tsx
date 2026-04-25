"use client";
import { useState, useEffect, useCallback } from "react";
import type { Profile, DailyRecord, PR } from "@/lib/types";
import { bmi, bmiCategory, bmrCalories } from "@/lib/fitness";
import { formatDate, formatShort, todayISO } from "@/lib/date";
import { oneRepMax } from "@/lib/fitness";
import { Card, Card2, Btn, Input, Select, SectionTitle, Divider, Spinner, Modal } from "./UI";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Tab = "stats" | "history" | "prs";

function HistoryByDate({ profileId, exercises }: { profileId: string; exercises: Profile["exerciseLibrary"] }) {
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [record, setRecord] = useState<DailyRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/history?id=${profileId}&mode=dates`)
      .then((r) => r.json())
      .then((d) => { setDates(d.dates ?? []); setLoading(false); });
  }, [profileId]);

  async function selectDate(date: string) {
    if (selectedDate === date) { setSelectedDate(null); setRecord(null); return; }
    setSelectedDate(date);
    const rec = await fetch(`/api/history?id=${profileId}&mode=date&date=${date}`).then((r) => r.json());
    setRecord(rec);
  }

  if (loading) return <Spinner />;
  if (!dates.length) return <div className="text-muted text-sm text-center py-6">No workout history yet</div>;

  return (
    <div className="flex flex-col gap-2">
      {dates.map((d) => (
        <div key={d}>
          <button onClick={() => selectDate(d)}
            className={`w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition-all flex justify-between items-center ${
              selectedDate === d ? "bg-accent text-white" : "bg-surface2 text-text border border-border"
            }`}>
            <span>{formatDate(d)}</span>
            <span className="text-xs opacity-70">{selectedDate === d ? "▲" : "▼"}</span>
          </button>
          {selectedDate === d && record && (
            <div className="mt-1 flex flex-col gap-1 pl-2">
              {record.workouts.length === 0 ? (
                <div className="text-muted text-xs px-3 py-2">No workouts logged</div>
              ) : record.workouts.map((w, i) => (
                <div key={i} className="bg-surface rounded-xl px-3 py-2">
                  <div className="font-bold text-sm">{w.exerciseName}</div>
                  {w.type === "strength" && w.sets?.length ? (
                    <div className="text-xs text-muted mt-1 flex flex-wrap gap-1">
                      {w.sets.map((s, j) => (
                        <span key={j} className="bg-surface2 px-2 py-0.5 rounded-full">
                          {s.reps}×{s.weightKg}kg
                        </span>
                      ))}
                      <span className="text-accent2 px-2 py-0.5">
                        1RM≈{Math.max(...w.sets.map((s) => oneRepMax(s.weightKg, s.reps)))}kg
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-muted mt-1">
                      {w.durationMin ? `${w.durationMin} min` : ""}
                      {w.distanceKm ? ` · ${w.distanceKm} km` : ""}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function HistoryByExercise({ profileId, exercises }: { profileId: string; exercises: Profile["exerciseLibrary"] }) {
  const [selectedEx, setSelectedEx] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Array<{ date: string; sets: Array<{ reps: number; weightKg: number }>; oneRM: number }>>([]);
  const [loading, setLoading] = useState(false);

  const strengthExercises = exercises.filter((e) => e.type === "strength");

  async function selectExercise(id: string) {
    if (selectedEx === id) { setSelectedEx(null); setSessions([]); return; }
    setSelectedEx(id);
    setLoading(true);
    const data = await fetch(`/api/history?id=${profileId}&mode=exercise&exerciseId=${id}`).then((r) => r.json());
    setSessions(data.sessions ?? []);
    setLoading(false);
  }

  if (!strengthExercises.length) return <div className="text-muted text-sm text-center py-6">No exercises yet</div>;

  return (
    <div className="flex flex-col gap-2">
      {strengthExercises.map((ex) => (
        <div key={ex.id}>
          <button onClick={() => selectExercise(ex.id)}
            className={`w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition-all flex justify-between items-center ${
              selectedEx === ex.id ? "bg-accent text-white" : "bg-surface2 text-text border border-border"
            }`}>
            <span>{ex.name}</span>
            <span className="text-xs opacity-70">{selectedEx === ex.id ? "▲" : "▼"}</span>
          </button>
          {selectedEx === ex.id && (
            <div className="mt-1 pl-2">
              {loading ? <Spinner /> : sessions.length === 0 ? (
                <div className="text-muted text-xs px-3 py-2">No sessions logged yet</div>
              ) : (
                <>
                  {/* 1RM trend chart */}
                  {sessions.length > 1 && (
                    <div className="bg-surface rounded-xl p-3 mb-2">
                      <div className="text-xs text-muted mb-2">Estimated 1RM trend</div>
                      <ResponsiveContainer width="100%" height={100}>
                        <LineChart data={[...sessions].reverse().map((s) => ({ label: formatShort(s.date), rm: s.oneRM }))}>
                          <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#8a8a92" }} interval="preserveStartEnd" />
                          <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9, fill: "#8a8a92" }} width={28} />
                          <Tooltip contentStyle={{ background: "#141417", border: "1px solid #2a2a2f", borderRadius: 8, fontSize: 11 }}
                            itemStyle={{ color: "#ffd84d" }} />
                          <Line type="monotone" dataKey="rm" stroke="#ffd84d" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {/* Session list */}
                  <div className="flex flex-col gap-1">
                    {sessions.map((s, i) => (
                      <div key={i} className="bg-surface rounded-xl px-3 py-2 flex justify-between items-start">
                        <div>
                          <div className="text-xs text-muted">{formatDate(s.date)}</div>
                          <div className="text-xs text-text mt-0.5 flex flex-wrap gap-1">
                            {s.sets.map((set, j) => (
                              <span key={j} className="bg-surface2 px-2 py-0.5 rounded-full">
                                {set.reps}×{set.weightKg}kg
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-accent2 text-xs font-bold">1RM≈{s.oneRM}kg</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PRHistory({ profileId }: { profileId: string }) {
  const [prs, setPRs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/history?id=${profileId}&mode=prs`)
      .then((r) => r.json())
      .then((d) => { setPRs(d.prs ?? []); setLoading(false); });
  }, [profileId]);

  if (loading) return <Spinner />;
  if (!prs.length) return <div className="text-muted text-sm text-center py-6">No PRs yet — keep logging!</div>;

  const typeLabel = (t: string) => t === "weight" ? "Max Weight" : t === "reps" ? "Max Reps" : "Best 1RM";
  const typeIcon = (t: string) => t === "weight" ? "🏋️" : t === "reps" ? "🔢" : "⚡";

  return (
    <div className="flex flex-col gap-2">
      {prs.map((pr, i) => (
        <div key={i} className="bg-surface2 rounded-xl px-4 py-3 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span>{typeIcon(pr.type)}</span>
              <span className="font-bold text-sm">{pr.exerciseName}</span>
            </div>
            <div className="text-xs text-muted">{typeLabel(pr.type)} · {formatDate(pr.date)}</div>
          </div>
          <div className="text-right">
            <div className="font-display font-black text-accent text-lg">{pr.value}{pr.type === "reps" ? "" : "kg"}</div>
            <div className="text-xs text-muted">was {pr.previousValue}{pr.type === "reps" ? "" : "kg"}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProfileTab({ profile, onSave }: { profile: Profile; onSave: (p: Profile) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(profile);
  const [saving, setSaving] = useState(false);
  const [weights, setWeights] = useState<Array<{ date: string; weightKg: number }>>([]);
  const [newWeight, setNewWeight] = useState("");
  const [loadingWeights, setLoadingWeights] = useState(true);
  const [historyTab, setHistoryTab] = useState<"date" | "exercise">("date");

  useEffect(() => { setForm(profile); }, [profile]);

  useEffect(() => {
    fetch(`/api/weight?id=${profile.id}`)
      .then((r) => r.json())
      .then((d) => { setWeights(d); setLoadingWeights(false); });
  }, [profile.id]);

  const userBmi = bmi(form.heightCm, form.weightKg);
  const bmiCat = bmiCategory(userBmi);
  const calories = bmrCalories(form.sex, form.age, form.heightCm, form.weightKg);

  async function handleSave() {
    setSaving(true);
    await onSave(form);
    setSaving(false);
    setEditing(false);
  }

  async function logWeight() {
    const kg = parseFloat(newWeight);
    if (!kg || kg < 20 || kg > 300) return;
    const today = todayISO();
    const res = await fetch(`/api/weight?id=${profile.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date: today, weightKg: kg }),
    });
    const data = await res.json();
    setWeights(data.entries);
    setNewWeight("");
  }

  const last90 = weights.slice(-90);
  const chartData = last90.map((w) => ({ label: formatShort(w.date), kg: w.weightKg }));

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle>Profile</SectionTitle>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card2 className="text-center">
          <div className="text-2xl font-display font-black text-accent">{userBmi || "—"}</div>
          <div className={`text-xs font-bold mt-0.5 ${bmiCat.color}`}>{bmiCat.label}</div>
          <div className="text-xs text-muted mt-0.5">BMI</div>
        </Card2>
        <Card2 className="text-center">
          <div className="text-2xl font-display font-black text-text">{profile.weightKg}</div>
          <div className="text-xs text-muted mt-0.5">kg</div>
          <div className="text-xs text-muted mt-0.5">Weight</div>
        </Card2>
        <Card2 className="text-center">
          <div className="text-2xl font-display font-black text-text">{calories || "—"}</div>
          <div className="text-xs text-muted mt-0.5">kcal</div>
          <div className="text-xs text-muted mt-0.5">Baseline</div>
        </Card2>
      </div>

      {/* Edit form */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <span className="font-bold text-sm">Personal Info</span>
          {!editing ? (
            <Btn size="sm" variant="secondary" onClick={() => setEditing(true)}>Edit</Btn>
          ) : (
            <div className="flex gap-2">
              <Btn size="sm" variant="ghost" onClick={() => { setEditing(false); setForm(profile); }}>Cancel</Btn>
              <Btn size="sm" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Btn>
            </div>
          )}
        </div>
        {editing ? (
          <div className="flex flex-col gap-3">
            <Input label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Select label="Sex" value={form.sex}
              onChange={(v) => setForm({ ...form, sex: v as "male" | "female" })}
              options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }]} />
            <Input label="Age" type="number" value={form.age} min={10} max={100}
              onChange={(v) => setForm({ ...form, age: parseInt(v) || 0 })} suffix="yrs" />
            <Input label="Height" type="number" value={form.heightCm} min={100} max={250}
              onChange={(v) => setForm({ ...form, heightCm: parseInt(v) || 0 })} suffix="cm" />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Weight" type="number" value={form.weightKg} min={20} max={300} step={0.1}
                onChange={(v) => setForm({ ...form, weightKg: parseFloat(v) || 0 })} suffix="kg" />
              <Input label="Goal Weight" type="number" value={form.desiredWeightKg ?? ""} min={20} max={300} step={0.1}
                onChange={(v) => setForm({ ...form, desiredWeightKg: parseFloat(v) || undefined })} suffix="kg" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            {[
              ["Name", form.name],
              ["Sex", form.sex],
              ["Age", `${form.age} yrs`],
              ["Height", `${form.heightCm} cm`],
              ["Weight", `${form.weightKg} kg`],
              ["Goal Weight", form.desiredWeightKg ? `${form.desiredWeightKg} kg` : "—"],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="text-muted text-xs">{k}</div>
                <div className="font-semibold capitalize">{v}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Weight goal progress bar */}
      {profile.desiredWeightKg && weights.length > 0 && (() => {
        const startW = weights[0].weightKg;
        const currentW = profile.weightKg;
        const goalW = profile.desiredWeightKg!;
        const isGain = goalW > startW;
        const totalChange = Math.abs(goalW - startW);
        const progress = isGain ? currentW - startW : startW - currentW;
        const pct = totalChange > 0 ? Math.max(0, Math.min(100, (progress / totalChange) * 100)) : 0;
        const remaining = Math.abs(currentW - goalW);
        const done = remaining < 0.1;
        return (
          <Card>
            <div className="font-bold text-sm mb-3">Weight Goal</div>
            <div className="flex justify-between text-xs text-muted mb-2">
              <span>Start <span className="text-text font-bold">{startW} kg</span></span>
              <span className="text-accent font-bold">{Math.round(pct)}%</span>
              <span>Goal <span className="text-text font-bold">{goalW} kg</span></span>
            </div>
            <div className="h-3 bg-border rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: done ? "#4ade80" : "linear-gradient(90deg,#ff3d3d,#ff7a5a)" }} />
            </div>
            <div className="flex justify-between text-xs mt-2">
              <span className="text-muted">Current: <span className="text-text font-bold">{currentW} kg</span></span>
              {done
                ? <span className="text-success font-bold">🎯 Goal reached!</span>
                : <span className="text-muted">{remaining.toFixed(1)} kg to go</span>
              }
            </div>
          </Card>
        );
      })()}

      {/* Weight log */}
      <Card>
        <div className="font-bold text-sm mb-3">Weight Log</div>
        <div className="flex gap-2 mb-4">
          <input type="number" value={newWeight} onChange={(e) => setNewWeight(e.target.value)}
            placeholder="Today's weight" step="0.1" min="20" max="300"
            className="flex-1 bg-surface2 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent" />
          <Btn onClick={logWeight} disabled={!newWeight}>Log</Btn>
        </div>
        {loadingWeights ? <Spinner /> : chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={chartData}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#8a8a92" }} interval="preserveStartEnd" />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "#8a8a92" }} width={32} />
              <Tooltip contentStyle={{ background: "#141417", border: "1px solid #2a2a2f", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#8a8a92" }} itemStyle={{ color: "#ff3d3d" }} />
              <Line type="monotone" dataKey="kg" stroke="#ff3d3d" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-muted text-xs text-center py-4">Log at least 2 entries to see your trend</div>
        )}
        {weights.length > 0 && (
          <div className="mt-3 flex flex-col gap-1 max-h-32 overflow-y-auto no-scrollbar">
            {[...weights].reverse().slice(0, 10).map((w) => (
              <div key={w.date} className="flex justify-between text-xs px-1">
                <span className="text-muted">{formatDate(w.date)}</span>
                <span className="font-bold text-text">{w.weightKg} kg</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* History */}
      <Card>
        <div className="font-bold text-sm mb-3">Workout History</div>
        {/* Sub-tabs */}
        <div className="flex gap-1 bg-surface2 rounded-xl p-1 mb-4">
          {(["date", "exercise"] as const).map((t) => (
            <button key={t} onClick={() => setHistoryTab(t)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors capitalize ${
                historyTab === t ? "bg-accent text-white" : "text-muted"
              }`}>
              By {t}
            </button>
          ))}
        </div>
        {historyTab === "date" && (
          <HistoryByDate profileId={profile.id} exercises={profile.exerciseLibrary} />
        )}
        {historyTab === "exercise" && (
          <HistoryByExercise profileId={profile.id} exercises={profile.exerciseLibrary} />
        )}
      </Card>

      {/* PRs */}
      <Card>
        <div className="font-bold text-sm mb-3">Personal Records 🏆</div>
        <PRHistory profileId={profile.id} />
      </Card>
    </div>
  );
}
