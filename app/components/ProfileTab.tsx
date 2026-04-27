"use client";
import { useState, useEffect } from "react";
import type { Profile, DailyRecord, WorkoutEntry } from "@/lib/types";
import { bmi, bmiCategory, bmrCalories, oneRepMax } from "@/lib/fitness";
import { formatDate, formatShort, todayISO } from "@/lib/date";
import { Card, Card2, Btn, Input, Select, SectionTitle, Divider, Spinner, Modal } from "./UI";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// ── History by date ──────────────────────────────────────────────────────────
function HistoryByDate({ profileId, refreshKey }: { profileId: string; refreshKey: number }) {
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [record, setRecord] = useState<DailyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<{ date: string; loggedAt: string } | null>(null);
  const [editModal, setEditModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WorkoutEntry | null>(null);
  const [editSets, setEditSets] = useState<Array<{ reps: number; weightKg: number }>>([]);
  const [editDuration, setEditDuration] = useState("");
  const [editDistance, setEditDistance] = useState("");

  function loadDates() {
    setLoading(true);
    fetch(`/api/history?id=${profileId}&mode=dates`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { setDates(d.dates ?? []); setLoading(false); });
  }

  useEffect(() => { loadDates(); }, [profileId, refreshKey]);

  async function selectDate(date: string) {
    if (selectedDate === date) { setSelectedDate(null); setRecord(null); return; }
    setSelectedDate(date);
    const rec = await fetch(`/api/history?id=${profileId}&mode=date&date=${date}`).then((r) => r.json());
    setRecord(rec);
  }

  async function deleteEntry(date: string, loggedAt: string) {
    await fetch(`/api/workout?id=${profileId}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date, loggedAt }),
    });
    setConfirmDelete(null);
    const updated = await fetch(`/api/history?id=${profileId}&mode=date&date=${date}`).then((r) => r.json());
    setRecord(updated);
    if (!updated.workouts?.length) loadDates();
  }

  function openEdit(entry: WorkoutEntry) {
    setEditingEntry(entry);
    setEditSets(entry.sets ? entry.sets.map((s) => ({ ...s })) : []);
    setEditDuration(entry.durationMin ? String(entry.durationMin) : "");
    setEditDistance(entry.distanceKm ? String(entry.distanceKm) : "");
    setEditModal(true);
  }

  async function saveEdit() {
    if (!editingEntry || !selectedDate) return;
    const rec: DailyRecord = await fetch(`/api/history?id=${profileId}&mode=date&date=${selectedDate}`).then((r) => r.json());
    rec.workouts = rec.workouts.map((w) =>
      w.loggedAt === editingEntry.loggedAt ? {
        ...w,
        sets: editingEntry.type === "strength" ? editSets : undefined,
        durationMin: editingEntry.type === "cardio" ? parseFloat(editDuration) || 0 : undefined,
        distanceKm: editingEntry.type === "cardio" ? parseFloat(editDistance) || 0 : undefined,
      } : w
    );
    await fetch(`/api/daily?id=${profileId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(rec),
    });
    setEditModal(false);
    setEditingEntry(null);
    const refreshed = await fetch(`/api/history?id=${profileId}&mode=date&date=${selectedDate}`).then((r) => r.json());
    setRecord(refreshed);
  }

  if (loading) return <Spinner />;
  if (!dates.length) return <div className="text-muted text-sm text-center py-6">No workout history yet</div>;

  return (
    <>
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
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-sm">{w.exerciseName}</div>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(w)}
                          className="text-muted text-xs bg-surface2 px-2 py-1 rounded-lg border border-border">Edit</button>
                        <button onClick={() => setConfirmDelete({ date: d, loggedAt: w.loggedAt })}
                          className="text-accent text-xs bg-surface2 px-2 py-1 rounded-lg border border-border">Delete</button>
                      </div>
                    </div>
                    {w.type === "strength" && w.sets?.length ? (
                      <div className="text-xs text-muted flex flex-wrap gap-1">
                        {w.sets.map((s, j) => (
                          <span key={j} className="bg-surface2 px-2 py-0.5 rounded-full">{s.reps}x{s.weightKg}kg</span>
                        ))}
                        <span className="text-accent2 px-1">
                          1RM~{Math.max(...w.sets.map((s) => oneRepMax(s.weightKg, s.reps)))}kg
                        </span>
                      </div>
                    ) : (
                      <div className="text-xs text-muted">
                        {w.durationMin ? `${w.durationMin} min` : ""}
                        {w.distanceKm ? ` - ${w.distanceKm} km` : ""}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Entry">
        <div className="text-sm text-muted mb-4">Remove this workout entry? This cannot be undone.</div>
        <div className="flex gap-3">
          <Btn variant="secondary" onClick={() => setConfirmDelete(null)} className="flex-1">Cancel</Btn>
          <Btn variant="danger" onClick={() => deleteEntry(confirmDelete!.date, confirmDelete!.loggedAt)} className="flex-1">Delete</Btn>
        </div>
      </Modal>

      <Modal open={editModal} onClose={() => setEditModal(false)} title={`Edit: ${editingEntry?.exerciseName ?? ""}`}>
        {editingEntry?.type === "strength" ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-12 gap-1 text-xs text-muted px-1 mb-1">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Weight (kg)</div>
              <div className="col-span-5">Reps</div>
              <div className="col-span-1" />
            </div>
            {editSets.map((s, i) => (
              <div key={i} className="grid grid-cols-12 gap-1 items-center">
                <div className="col-span-1 text-xs text-muted text-center">{i + 1}</div>
                <input type="number" value={s.weightKg} step="0.5" min="0"
                  onChange={(e) => setEditSets((prev) => prev.map((x, idx) => idx === i ? { ...x, weightKg: parseFloat(e.target.value) || 0 } : x))}
                  className="col-span-5 bg-surface2 border border-border rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:border-accent" />
                <input type="number" value={s.reps} min="1"
                  onChange={(e) => setEditSets((prev) => prev.map((x, idx) => idx === i ? { ...x, reps: parseInt(e.target.value) || 0 } : x))}
                  className="col-span-5 bg-surface2 border border-border rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:border-accent" />
                <button onClick={() => setEditSets((prev) => prev.filter((_, idx) => idx !== i))} className="col-span-1 text-muted text-sm">x</button>
              </div>
            ))}
            <Btn size="sm" variant="secondary"
              onClick={() => setEditSets((prev) => [...prev, { reps: 8, weightKg: editSets[editSets.length - 1]?.weightKg ?? 0 }])}>
              + Set
            </Btn>
            <Btn size="lg" onClick={saveEdit}>Save Changes</Btn>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Input label="Duration" type="number" value={editDuration} onChange={setEditDuration} suffix="min" />
            <Input label="Distance" type="number" value={editDistance} onChange={setEditDistance} suffix="km" />
            <Btn size="lg" onClick={saveEdit}>Save Changes</Btn>
          </div>
        )}
      </Modal>
    </>
  );
}

// ── History by exercise ───────────────────────────────────────────────────────
interface SessionEntry {
  date: string;
  type: string;
  sets?: Array<{ reps: number; weightKg: number }>;
  oneRM?: number;
  durationMin?: number;
  distanceKm?: number;
}

function HistoryByExercise({ profileId, exercises }: { profileId: string; exercises: Profile["exerciseLibrary"] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [loading, setLoading] = useState(false);

  async function selectExercise(id: string) {
    if (selectedId === id) { setSelectedId(null); setSessions([]); return; }
    setSelectedId(id);
    setLoading(true);
    const data = await fetch(`/api/history?id=${profileId}&mode=exercise&exerciseId=${id}`).then((r) => r.json());
    setSessions(data.sessions ?? []);
    setLoading(false);
  }

  if (!exercises.length) return <div className="text-muted text-sm text-center py-6">No exercises in library yet</div>;

  return (
    <div className="flex flex-col gap-2">
      {exercises.map((ex) => (
        <div key={ex.id}>
          <button onClick={() => selectExercise(ex.id)}
            className={`w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition-all flex justify-between items-center ${
              selectedId === ex.id ? "bg-accent text-white" : "bg-surface2 text-text border border-border"
            }`}>
            <span>{ex.name}</span>
            <div className="flex items-center gap-2">
              {ex.type === "cardio" && <span className="text-xs text-muted">cardio</span>}
              <span className="text-xs opacity-70">{selectedId === ex.id ? "▲" : "▼"}</span>
            </div>
          </button>
          {selectedId === ex.id && (
            <div className="mt-1 pl-2">
              {loading ? <Spinner /> : sessions.length === 0 ? (
                <div className="text-muted text-xs px-3 py-2">No sessions logged yet</div>
              ) : ex.type === "strength" ? (
                <>
                  {sessions.length > 1 && (
                    <ResponsiveContainer width="100%" height={100}>
                      <LineChart data={sessions.map((s) => ({ label: formatShort(s.date), rm: s.oneRM ?? 0 })).reverse()}>
                        <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#8a8a92" }} />
                        <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9, fill: "#8a8a92" }} width={28} />
                        <Tooltip contentStyle={{ background: "#141417", border: "1px solid #2a2a2f", borderRadius: 8, fontSize: 11 }}
                          itemStyle={{ color: "#ffd84d" }} />
                        <Line type="monotone" dataKey="rm" stroke="#ffd84d" strokeWidth={1.5} dot={false} name="1RM" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                  <div className="flex flex-col gap-1 mt-1">
                    {sessions.slice(0, 8).map((s, i) => (
                      <div key={i} className="bg-surface rounded-xl px-3 py-1.5 flex justify-between text-xs">
                        <span className="text-muted">{formatDate(s.date)}</span>
                        <span className="text-text">{s.sets?.map((x) => `${x.reps}x${x.weightKg}kg`).join(", ")}</span>
                        <span className="text-accent2">1RM~{s.oneRM}kg</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {sessions.length > 1 && (
                    <ResponsiveContainer width="100%" height={100}>
                      <LineChart data={sessions.map((s) => ({ label: formatShort(s.date), km: s.distanceKm ?? 0, min: s.durationMin ?? 0 })).reverse()}>
                        <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#8a8a92" }} />
                        <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9, fill: "#8a8a92" }} width={28} />
                        <Tooltip contentStyle={{ background: "#141417", border: "1px solid #2a2a2f", borderRadius: 8, fontSize: 11 }}
                          itemStyle={{ color: "#4ade80" }} />
                        <Line type="monotone" dataKey="km" stroke="#4ade80" strokeWidth={1.5} dot={false} name="km" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                  <div className="flex flex-col gap-1 mt-1">
                    {sessions.slice(0, 8).map((s, i) => (
                      <div key={i} className="bg-surface rounded-xl px-3 py-1.5 flex justify-between text-xs">
                        <span className="text-muted">{formatDate(s.date)}</span>
                        {s.durationMin ? <span className="text-text">{s.durationMin} min</span> : null}
                        {s.distanceKm ? <span className="text-success">{s.distanceKm} km</span> : null}
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

// ── PR history ────────────────────────────────────────────────────────────────
function PRHistory({ profileId }: { profileId: string }) {
  const [prs, setPRs] = useState<Array<{ date: string; exerciseName: string; type: string; value: number; previousValue: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/history?id=${profileId}&mode=prs`)
      .then((r) => r.json())
      .then((d) => { setPRs(d.prs ?? []); setLoading(false); });
  }, [profileId]);

  if (loading) return <Spinner />;
  if (!prs.length) return <div className="text-muted text-sm text-center py-4">No PRs yet — keep logging!</div>;

  return (
    <div className="flex flex-col gap-2">
      {prs.slice(0, 20).map((pr, i) => (
        <div key={i} className="bg-surface2 rounded-xl px-3 py-2 flex items-center justify-between">
          <div>
            <div className="font-bold text-sm">{pr.exerciseName}</div>
            <div className="text-xs text-muted">{formatDate(pr.date)} · {pr.type}</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-accent2">{pr.value}{pr.type === "reps" ? " reps" : "kg"}</div>
            <div className="text-xs text-muted">was {pr.previousValue}{pr.type === "reps" ? " reps" : "kg"}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main ProfileTab ───────────────────────────────────────────────────────────
export default function ProfileTab({ profile, onSave }: { profile: Profile; onSave: (p: Profile) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(profile);
  const [saving, setSaving] = useState(false);
  const [weights, setWeights] = useState<Array<{ date: string; weightKg: number }>>([]);
  const [newWeight, setNewWeight] = useState("");
  const [loadingWeights, setLoadingWeights] = useState(true);
  const [historyTab, setHistoryTab] = useState<"date" | "exercise">("date");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

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

  // Weight goal progress
  const goalProgress = (() => {
    if (!profile.desiredWeightKg || !weights.length) return null;
    const startW = weights[0].weightKg;
    const currentW = profile.weightKg;
    const goalW = profile.desiredWeightKg;
    const isGain = goalW > startW;
    const totalChange = Math.abs(goalW - startW);
    if (totalChange === 0) return null;
    const progress = isGain ? currentW - startW : startW - currentW;
    const pct = Math.max(0, Math.min(100, Math.round((progress / totalChange) * 100)));
    const remaining = Math.abs(currentW - goalW);
    const done = remaining < 0.1;
    return { startW, currentW, goalW, pct, remaining, done };
  })();

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle>Profile</SectionTitle>

      {/* Stats row */}
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

      {/* Personal info card */}
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
            <Select label="Sex" value={form.sex} onChange={(v) => setForm({ ...form, sex: v as "male" | "female" })}
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
      {goalProgress && (
        <Card>
          <div className="font-bold text-sm mb-3">Weight Goal</div>
          <div className="flex justify-between text-xs text-muted mb-2">
            <span>Start <span className="text-text font-bold">{goalProgress.startW} kg</span></span>
            <span className="text-accent font-bold">{goalProgress.pct}%</span>
            <span>Goal <span className="text-text font-bold">{goalProgress.goalW} kg</span></span>
          </div>
          <div className="h-3 bg-border rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${goalProgress.pct}%`, background: goalProgress.done ? "#4ade80" : "linear-gradient(90deg,#ff3d3d,#ff7a5a)" }} />
          </div>
          <div className="flex justify-between text-xs mt-2">
            <span className="text-muted">Now: <span className="text-text font-bold">{goalProgress.currentW} kg</span></span>
            {goalProgress.done
              ? <span className="text-success font-bold">Goal reached!</span>
              : <span className="text-muted">{goalProgress.remaining.toFixed(1)} kg to go</span>
            }
          </div>
        </Card>
      )}

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
          <div className="text-muted text-xs text-center py-6">Log at least 2 entries to see your trend</div>
        )}
        {weights.length > 0 && (
          <div className="mt-3 flex flex-col gap-1 max-h-40 overflow-y-auto no-scrollbar">
            {[...weights].reverse().slice(0, 20).map((w) => (
              <div key={w.date} className="flex justify-between text-xs text-muted px-1">
                <span>{formatDate(w.date)}</span>
                <span className="font-bold text-text">{w.weightKg} kg</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Workout history */}
      <Card>
        <div className="font-bold text-sm mb-3">Workout History</div>
        <div className="flex gap-2 mb-4">
          {(["date", "exercise"] as const).map((t) => (
            <button key={t} onClick={() => { setHistoryTab(t); if (t === "date") setHistoryRefreshKey((k) => k + 1); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                historyTab === t ? "bg-accent text-white" : "bg-surface2 text-muted border border-border"
              }`}>
              By {t}
            </button>
          ))}
        </div>
        {historyTab === "date" && <HistoryByDate profileId={profile.id} refreshKey={historyRefreshKey} />}
        {historyTab === "exercise" && <HistoryByExercise profileId={profile.id} exercises={profile.exerciseLibrary} />}
      </Card>

      {/* PRs */}
      <Card>
        <div className="font-bold text-sm mb-3">Personal Records</div>
        <PRHistory profileId={profile.id} />
      </Card>
    </div>
  );
}
