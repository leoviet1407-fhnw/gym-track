"use client";
import { useState, useEffect, useCallback } from "react";
import type { Profile, Exercise, WorkoutEntry, LoggedSet, DailyRecord } from "@/lib/types";
import { getRepsMin, getRepsMax } from "@/lib/types";
import { todayISO, formatDate, formatShort } from "@/lib/date";
import { oneRepMax } from "@/lib/fitness";
import { Card, Card2, Btn, Input, Select, SectionTitle, Modal, Spinner, Divider } from "./UI";
import RestTimer from "./RestTimer";

type ProfileName = "viet" | "jullie";

interface PRResult { type: string; exerciseName: string; value: number; previousValue: number }
interface ProgressionResult {
  type: "increase" | "tooHeavy";
  newWeight?: number;
  resetRepsTo?: number;
  suggestedWeight?: number;
}
interface AutoResult { prs: PRResult[]; progression: ProgressionResult | null; deload: number | null }

// ── Exercise history (last 3 sessions) ──────────────────────────────────────
function ExerciseHistory({ exerciseId, profileId }: { exerciseId: string; profileId: string }) {
  const [history, setHistory] = useState<Array<{ date: string; entry: WorkoutEntry }>>([]);
  useEffect(() => {
    fetch(`/api/workout?id=${profileId}&exerciseId=${exerciseId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setHistory(d.history ?? []));
  }, [exerciseId, profileId]);
  if (!history.length) return <div className="text-xs text-muted py-2">No previous sessions</div>;
  return (
    <div className="flex flex-col gap-1 mt-2">
      <div className="text-xs text-muted font-semibold uppercase tracking-wide mb-1">Last sessions</div>
      {history.slice(0, 3).map((h, i) => {
        const sets = h.entry.sets ?? [];
        const maxRM = sets.length ? Math.max(...sets.map((s) => oneRepMax(s.weightKg, s.reps))) : 0;
        return (
          <div key={i} className="flex justify-between text-xs bg-surface rounded-lg px-2 py-1.5 gap-2">
            <span className="text-muted shrink-0">{formatDate(h.date)}</span>
            <span className="text-text">{sets.map((s) => `${s.reps}×${s.weightKg}kg`).join(", ")}</span>
            {maxRM > 0 && <span className="text-accent2 shrink-0">1RM≈{maxRM}kg</span>}
          </div>
        );
      })}
    </div>
  );
}

// ── Set logger with double progression cards ────────────────────────────────
function SetLogger({
  exercise, profileId, onLog, onLogged,
}: {
  exercise: Exercise;
  profileId: string;
  onLog: (sets: LoggedSet[]) => Promise<AutoResult>;
  onLogged: () => void;
}) {
  const repsMin = getRepsMin(exercise);
  const repsMax = getRepsMax(exercise);

  const [sets, setSets] = useState<LoggedSet[]>(
    Array.from({ length: 3 }, () => ({
      reps: repsMin,
      weightKg: exercise.targetWeightKg ?? 0,
    }))
  );
  const [logging, setLogging] = useState(false);
  const [result, setResult] = useState<AutoResult | null>(null);
  const [accepted, setAccepted] = useState(false);

  function updateSet(i: number, field: "reps" | "weightKg", val: string) {
    setSets((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: parseFloat(val) || 0 } : s));
  }
  function addSet() {
    setSets((prev) => [...prev, { reps: repsMin, weightKg: exercise.targetWeightKg ?? 0 }]);
  }
  function removeSet(i: number) {
    setSets((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleLog() {
    setLogging(true);
    const res = await onLog(sets);
    setResult(res);
    setLogging(false);
    onLogged();
  }

  async function acceptIncrease(newWeight: number) {
    await fetch(`/api/workout?id=${profileId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ acceptWeightIncrease: { exerciseId: exercise.id, newWeight } }),
    });
    setAccepted(true);
  }

  return (
    <div className="mt-3">
      {/* Rep range hint */}
      <div className="text-xs text-muted mb-2">
        Target: <span className="text-text font-bold">{exercise.targetWeightKg}kg</span> ·
        Rep range: <span className="text-text font-bold">{repsMin}–{repsMax}</span>
      </div>

      {/* Set grid */}
      <div className="grid grid-cols-12 gap-1 mb-1 text-xs text-muted px-1">
        <div className="col-span-1">#</div>
        <div className="col-span-5">Weight (kg)</div>
        <div className="col-span-5">Reps</div>
        <div className="col-span-1" />
      </div>
      {sets.map((s, i) => (
        <div key={i} className="grid grid-cols-12 gap-1 mb-2 items-center">
          <div className="col-span-1 text-xs text-muted text-center">{i + 1}</div>
          <input type="number" value={s.weightKg}
            onChange={(e) => updateSet(i, "weightKg", e.target.value)}
            step="0.5" min="0"
            className="col-span-5 bg-surface2 border border-border rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:border-accent" />
          <input type="number" value={s.reps}
            onChange={(e) => updateSet(i, "reps", e.target.value)}
            min="1" max="100"
            className={`col-span-5 bg-surface2 border rounded-lg px-2 py-2 text-sm text-center focus:outline-none transition-colors ${
              s.reps >= repsMax ? "border-success focus:border-success" :
              s.reps < repsMin ? "border-accent focus:border-accent" :
              "border-border focus:border-accent"
            }`} />
          <button onClick={() => removeSet(i)} className="col-span-1 text-muted text-sm">×</button>
        </div>
      ))}

      <div className="flex gap-2 mt-2">
        <Btn size="sm" variant="secondary" onClick={addSet}>+ Set</Btn>
        <Btn size="sm" onClick={handleLog} disabled={logging} className="flex-1">
          {logging ? "Logging…" : "Log Session"}
        </Btn>
      </div>

      {/* Automation result cards */}
      {result && (
        <div className="mt-3 flex flex-col gap-2">
          {/* PRs */}
          {result.prs.map((pr, i) => (
            <div key={i} className="bg-accent2/10 border border-accent2/40 rounded-xl p-3 pr-pop">
              <div className="font-bold text-accent2 text-sm">
                🏆 New PR! {pr.type === "weight" ? "Heaviest weight" : pr.type === "reps" ? "Most reps" : "Best 1RM"}
              </div>
              <div className="text-xs text-muted mt-0.5">{pr.value}{pr.type === "reps" ? " reps" : "kg"} (was {pr.previousValue}{pr.type === "reps" ? " reps" : "kg"})</div>
            </div>
          ))}

          {/* Double progression: increase */}
          {result.progression?.type === "increase" && !accepted && (
            <div className="bg-success/10 border border-success/40 rounded-xl p-3">
              <div className="font-bold text-success text-sm">📈 Double progression complete!</div>
              <div className="text-xs text-muted mt-1 mb-2">
                You hit {repsMax} reps twice in a row at {exercise.targetWeightKg}kg.
                Increase to <span className="text-text font-bold">{result.progression.newWeight}kg</span> and
                reset back to <span className="text-text font-bold">{result.progression.resetRepsTo} reps</span>.
              </div>
              <Btn size="sm" onClick={() => acceptIncrease(result.progression!.newWeight!)}>
                Accept → {result.progression.newWeight}kg
              </Btn>
            </div>
          )}
          {accepted && (
            <div className="bg-success/10 border border-success/40 rounded-xl p-3">
              <div className="font-bold text-success text-sm">✅ Weight updated!</div>
            </div>
          )}

          {/* Double progression: too heavy */}
          {result.progression?.type === "tooHeavy" && (
            <div className="bg-accent/10 border border-accent/40 rounded-xl p-3">
              <div className="font-bold text-accent text-sm">⚠️ Weight too heavy</div>
              <div className="text-xs text-muted mt-1">
                You dropped below {repsMin} reps. Consider dropping back
                to <span className="text-text font-bold">{result.progression.suggestedWeight}kg</span> to
                stay in your rep range and progress properly.
              </div>
            </div>
          )}

          {/* Deload */}
          {result.deload && (
            <div className="bg-accent2/10 border border-accent2/30 rounded-xl p-3">
              <div className="font-bold text-accent2 text-sm">⚠️ Consider a deload week</div>
              <div className="text-xs text-muted mt-1">
                4+ weeks of progression. Drop to ~{result.deload}kg for one week to recover.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Cardio logger ────────────────────────────────────────────────────────────
function CardioLogger({ exercise, onLog, onLogged }: {
  exercise: Exercise;
  onLog: (dur: number, dist: number) => Promise<void>;
  onLogged: () => void;
}) {
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [logging, setLogging] = useState(false);
  async function handle() {
    setLogging(true);
    await onLog(parseFloat(duration) || 0, parseFloat(distance) || 0);
    setLogging(false);
    setDuration(""); setDistance("");
    onLogged();
  }
  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <Input label="Duration" type="number" value={duration} onChange={setDuration} suffix="min" placeholder="0" />
        <Input label="Distance" type="number" value={distance} onChange={setDistance} suffix="km" placeholder="0" />
      </div>
      <Btn onClick={handle} disabled={logging || (!duration && !distance)}>
        {logging ? "Logging…" : "Log Cardio"}
      </Btn>
    </div>
  );
}

// ── Today's log ──────────────────────────────────────────────────────────────
function TodayLog({ workouts, onDelete, onEdit }: {
  workouts: WorkoutEntry[];
  onDelete: (loggedAt: string) => void;
  onEdit: (entry: WorkoutEntry) => void;
}) {
  if (!workouts.length) return null;
  return (
    <Card className="border border-success/30 bg-success/5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-success text-lg">✓</span>
        <div className="font-bold text-sm text-success">Today's Log</div>
        <div className="text-xs text-muted ml-auto">{workouts.length} exercise{workouts.length > 1 ? "s" : ""}</div>
      </div>
      <div className="flex flex-col gap-2">
        {workouts.map((w, i) => (
          <div key={i} className="bg-surface2 rounded-xl px-3 py-2">
            <div className="flex items-center justify-between mb-1">
              <div className="font-semibold text-sm">{w.exerciseName}</div>
              <div className="flex gap-1">
                <button onClick={() => onEdit(w)}
                  className="text-muted text-xs bg-surface px-2 py-1 rounded-lg border border-border">✏️</button>
                <button onClick={() => onDelete(w.loggedAt)}
                  className="text-accent text-xs bg-surface px-2 py-1 rounded-lg border border-border">🗑️</button>
              </div>
            </div>
            {w.type === "strength" && w.sets?.length ? (
              <div className="text-xs text-muted flex flex-wrap gap-1">
                {w.sets.map((s, j) => (
                  <span key={j} className="bg-surface px-2 py-0.5 rounded-full">{s.reps}×{s.weightKg}kg</span>
                ))}
                <span className="text-accent2 px-1">
                  1RM≈{Math.max(...w.sets.map((s) => oneRepMax(s.weightKg, s.reps)))}kg
                </span>
              </div>
            ) : (
              <div className="text-xs text-muted">
                {w.durationMin ? `${w.durationMin} min` : ""}
                {w.distanceKm ? ` · ${w.distanceKm} km` : ""}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Main WorkoutTab ──────────────────────────────────────────────────────────
export default function WorkoutTab({
  profile, onProfileUpdate, profileName,
}: {
  profile: Profile;
  onProfileUpdate: (p: Profile) => Promise<void>;
  profileName: ProfileName;
}) {
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [expandedEx, setExpandedEx] = useState<string | null>(null);
  const [addExModal, setAddExModal] = useState(false);
  const [addCardioModal, setAddCardioModal] = useState(false);
  const [todayWorkouts, setTodayWorkouts] = useState<WorkoutEntry[]>([]);
  const [newEx, setNewEx] = useState({
    name: "", muscleGroup: "", bodyPart: "upper" as "upper" | "lower",
    targetWeightKg: "", targetRepsMin: "8", targetRepsMax: "12", template: "",
  });
  const [newCardio, setNewCardio] = useState({ name: "" });
  const [editTemplateModal, setEditTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editTemplateName, setEditTemplateName] = useState("");
  const [editExModal, setEditExModal] = useState(false);
  const [editingEx, setEditingEx] = useState<Exercise | null>(null);
  const [editEx, setEditEx] = useState({ name: "", muscleGroup: "", bodyPart: "upper" as "upper"|"lower", targetWeightKg: "", targetRepsMin: "8", targetRepsMax: "12", template: "" });
  const [confirmDeleteTemplate, setConfirmDeleteTemplate] = useState<string | null>(null);
  const [confirmDeleteEx, setConfirmDeleteEx] = useState<string | null>(null);
  const [confirmDeleteLog, setConfirmDeleteLog] = useState<string | null>(null);
  const [editLogModal, setEditLogModal] = useState(false);
  const [editingLog, setEditingLog] = useState<WorkoutEntry | null>(null);
  const [editLogSets, setEditLogSets] = useState<LoggedSet[]>([]);
  const [editLogDuration, setEditLogDuration] = useState("");
  const [editLogDistance, setEditLogDistance] = useState("");
  const today = todayISO();

  const templates = Array.from(new Set(
    profile.exerciseLibrary.filter((e) => e.template).map((e) => e.template!)
  ));
  const cardioExercises = profile.exerciseLibrary.filter((e) => e.type === "cardio");
  const templateExercises = activeTemplate
    ? profile.exerciseLibrary.filter((e) => e.template === activeTemplate)
    : [];

  const loadTodayWorkouts = useCallback(async () => {
    const rec: DailyRecord = await fetch(`/api/daily?id=${profile.id}&date=${today}`, { cache: "no-store" }).then((r) => r.json());
    setTodayWorkouts(rec.workouts ?? []);
  }, [profile.id, today]);

  useEffect(() => { loadTodayWorkouts(); }, [loadTodayWorkouts]);

  async function deleteLogEntry(loggedAt: string) {
    await fetch(`/api/workout?id=${profile.id}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date: today, loggedAt }),
    });
    setConfirmDeleteLog(null);
    loadTodayWorkouts();
  }

  function openEditLog(entry: WorkoutEntry) {
    setEditingLog(entry);
    setEditLogSets(entry.sets ? entry.sets.map((s) => ({ ...s })) : []);
    setEditLogDuration(entry.durationMin ? String(entry.durationMin) : "");
    setEditLogDistance(entry.distanceKm ? String(entry.distanceKm) : "");
    setEditLogModal(true);
  }

  async function saveEditLog() {
    if (!editingLog) return;
    const rec: DailyRecord = await fetch(`/api/daily?id=${profile.id}&date=${today}`, { cache: "no-store" }).then((r) => r.json());
    rec.workouts = rec.workouts.map((w) =>
      w.loggedAt === editingLog.loggedAt
        ? {
            ...w,
            sets: editingLog.type === "strength" ? editLogSets : undefined,
            durationMin: editingLog.type === "cardio" ? parseFloat(editLogDuration) || 0 : undefined,
            distanceKm: editingLog.type === "cardio" ? parseFloat(editLogDistance) || 0 : undefined,
          }
        : w
    );
    await fetch(`/api/daily?id=${profile.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(rec),
    });
    setEditLogModal(false);
    setEditingLog(null);
    loadTodayWorkouts();
  }

  async function logStrength(exercise: Exercise, sets: LoggedSet[]): Promise<AutoResult> {
    const entry: WorkoutEntry = {
      exerciseId: exercise.id, exerciseName: exercise.name,
      type: "strength", sets, loggedAt: new Date().toISOString(),
    };
    const res = await fetch(`/api/workout?id=${profile.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ entry, date: today }),
    });
    return res.json();
  }

  async function logCardio(exercise: Exercise, durationMin: number, distanceKm: number) {
    const entry: WorkoutEntry = {
      exerciseId: exercise.id, exerciseName: exercise.name,
      type: "cardio", durationMin, distanceKm, loggedAt: new Date().toISOString(),
    };
    await fetch(`/api/workout?id=${profile.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ entry, date: today }),
    });
  }

  async function addStrengthExercise() {
    if (!newEx.name.trim()) return;
    const ex: Exercise = {
      id: `ex-${Date.now()}`,
      name: newEx.name.trim(),
      type: "strength",
      bodyPart: newEx.bodyPart,
      muscleGroup: newEx.muscleGroup,
      targetWeightKg: parseFloat(newEx.targetWeightKg) || 0,
      targetRepsMin: parseInt(newEx.targetRepsMin) || 8,
      targetRepsMax: parseInt(newEx.targetRepsMax) || 12,
      template: newEx.template || undefined,
    };
    await onProfileUpdate({ ...profile, exerciseLibrary: [...profile.exerciseLibrary, ex] });
    setAddExModal(false);
    setNewEx({ name: "", muscleGroup: "", bodyPart: "upper", targetWeightKg: "", targetRepsMin: "8", targetRepsMax: "12", template: "" });
  }

  async function addCardioExercise() {
    if (!newCardio.name.trim()) return;
    const ex: Exercise = { id: `cardio-${Date.now()}`, name: newCardio.name.trim(), type: "cardio" };
    await onProfileUpdate({ ...profile, exerciseLibrary: [...profile.exerciseLibrary, ex] });
    setAddCardioModal(false);
    setNewCardio({ name: "" });
  }

  async function removeExercise(id: string) {
    await onProfileUpdate({ ...profile, exerciseLibrary: profile.exerciseLibrary.filter((e) => e.id !== id) });
    setConfirmDeleteEx(null);
  }

  async function renameTemplate(oldName: string, newName: string) {
    if (!newName.trim() || newName === oldName) { setEditTemplateModal(false); return; }
    const updated = profile.exerciseLibrary.map((e) =>
      e.template === oldName ? { ...e, template: newName } : e
    );
    await onProfileUpdate({ ...profile, exerciseLibrary: updated });
    if (activeTemplate === oldName) setActiveTemplate(newName);
    setEditTemplateModal(false);
    setEditingTemplate(null);
  }

  async function deleteTemplate(name: string) {
    const updated = profile.exerciseLibrary.filter((e) => e.template !== name);
    await onProfileUpdate({ ...profile, exerciseLibrary: updated });
    if (activeTemplate === name) setActiveTemplate(null);
    setConfirmDeleteTemplate(null);
  }

  async function saveEditExercise() {
    if (!editingEx || !editEx.name.trim() || !editEx.template.trim()) return;
    const updated = profile.exerciseLibrary.map((e) =>
      e.id === editingEx.id ? {
        ...e,
        name: editEx.name.trim(),
        muscleGroup: editEx.muscleGroup,
        bodyPart: editEx.bodyPart as "upper"|"lower",
        targetWeightKg: parseFloat(editEx.targetWeightKg) || 0,
        targetRepsMin: parseInt(editEx.targetRepsMin) || 8,
        targetRepsMax: parseInt(editEx.targetRepsMax) || 12,
        template: editEx.template.trim(),
      } : e
    );
    await onProfileUpdate({ ...profile, exerciseLibrary: updated });
    setEditExModal(false);
    setEditingEx(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle>Workout</SectionTitle>

      {/* Today's log */}
      <TodayLog
        workouts={todayWorkouts}
        onDelete={(loggedAt) => setConfirmDeleteLog(loggedAt)}
        onEdit={openEditLog}
      />

      {/* Rest timer */}
      <RestTimer />

      {/* Template selector */}
      {templates.length > 0 && (
        <Card>
          <div className="font-bold text-sm mb-3">Templates</div>
          <div className="flex flex-col gap-2">
            {templates.map((t) => (
              <div key={t} className="flex items-center gap-2">
                <button onClick={() => setActiveTemplate(activeTemplate === t ? null : t)}
                  className={`flex-1 text-left px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                    activeTemplate === t ? "bg-accent text-white" : "bg-surface2 text-text border border-border"
                  }`}>
                  {t}
                  <span className="text-xs font-normal ml-2 opacity-70">
                    ({profile.exerciseLibrary.filter((e) => e.template === t).length} exercises)
                  </span>
                </button>
                <button onClick={() => { setEditingTemplate(t); setEditTemplateName(t); setEditTemplateModal(true); }}
                  className="text-muted text-xs bg-surface2 border border-border px-2 py-2 rounded-lg">✏️</button>
                <button onClick={() => setConfirmDeleteTemplate(t)}
                  className="text-accent text-xs bg-surface2 border border-border px-2 py-2 rounded-lg">🗑️</button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Template exercises */}
      {activeTemplate && (
        <div className="flex flex-col gap-3">
          <div className="font-bold text-sm text-muted uppercase tracking-wider">{activeTemplate}</div>
          {templateExercises.map((ex) => {
            const rMin = getRepsMin(ex);
            const rMax = getRepsMax(ex);
            return (
              <Card key={ex.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-sm">{ex.name}</div>
                    <div className="text-xs text-muted mt-0.5">
                      {ex.targetWeightKg}kg · {rMin}–{rMax} reps · {ex.bodyPart}
                    </div>
                    {ex.targetWeightKg && (
                      <div className="text-xs text-accent2 mt-0.5">
                        Est 1RM @ {rMin} reps: {oneRepMax(ex.targetWeightKg, rMin)}kg
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setExpandedEx(expandedEx === ex.id ? null : ex.id)}
                      className="text-accent text-xs font-bold bg-accent/10 px-3 py-1.5 rounded-lg">
                      {expandedEx === ex.id ? "Close" : "Log"}
                    </button>
                    <button onClick={() => { setEditingEx(ex); setEditEx({ name: ex.name, muscleGroup: ex.muscleGroup||"", bodyPart: ex.bodyPart||"upper", targetWeightKg: String(ex.targetWeightKg||""), targetRepsMin: String(ex.targetRepsMin||8), targetRepsMax: String(ex.targetRepsMax||12), template: ex.template||"" }); setEditExModal(true); }}
                      className="text-muted text-xs bg-surface2 border border-border px-2 py-1.5 rounded-lg">✏️</button>
                    <button onClick={() => setConfirmDeleteEx(ex.id)} className="text-muted text-xs bg-surface2 border border-border px-2 py-1.5 rounded-lg">🗑️</button>
                  </div>
                </div>
                {expandedEx === ex.id && (
                  <>
                    <ExerciseHistory exerciseId={ex.id} profileId={profile.id} />
                    <Divider />
                    <SetLogger
                      exercise={ex}
                      profileId={profile.id}
                      onLog={(sets) => logStrength(ex, sets)}
                      onLogged={loadTodayWorkouts}
                    />
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Cardio */}
      {cardioExercises.length > 0 && (
        <Card>
          <div className="font-bold text-sm mb-3">Cardio</div>
          <div className="flex flex-col gap-3">
            {cardioExercises.map((ex) => (
              <div key={ex.id}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{ex.name}</span>
                  <div className="flex gap-1">
                    <button onClick={() => setExpandedEx(expandedEx === ex.id ? null : ex.id)}
                      className="text-accent text-xs font-bold bg-accent/10 px-3 py-1.5 rounded-lg">
                      {expandedEx === ex.id ? "Close" : "Log"}
                    </button>
                    <button onClick={() => removeExercise(ex.id)} className="text-muted text-lg px-1">×</button>
                  </div>
                </div>
                {expandedEx === ex.id && (
                  <CardioLogger
                    exercise={ex}
                    onLog={(dur, dist) => logCardio(ex, dur, dist)}
                    onLogged={loadTodayWorkouts}
                  />
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Add buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Btn variant="secondary" onClick={() => setAddExModal(true)}>+ Strength</Btn>
        <Btn variant="secondary" onClick={() => setAddCardioModal(true)}>+ Cardio</Btn>
      </div>

      {/* Add strength modal */}
      <Modal open={addExModal} onClose={() => setAddExModal(false)} title="Add Exercise">
        <div className="flex flex-col gap-3">
          <Input label="Exercise name" value={newEx.name} onChange={(v) => setNewEx({ ...newEx, name: v })}
            placeholder="e.g. Bulgarian Split Squat" />
          <Input label="Muscle group" value={newEx.muscleGroup} onChange={(v) => setNewEx({ ...newEx, muscleGroup: v })}
            placeholder="e.g. legs" />
          <Select label="Body part" value={newEx.bodyPart}
            onChange={(v) => setNewEx({ ...newEx, bodyPart: v as "upper" | "lower" })}
            options={[{ value: "upper", label: "Upper body (+2.5kg on increase)" }, { value: "lower", label: "Lower body (+5kg on increase)" }]} />
          <Input label="Starting weight" type="number" value={newEx.targetWeightKg}
            onChange={(v) => setNewEx({ ...newEx, targetWeightKg: v })} suffix="kg" step={0.5} min={0} />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Min reps" type="number" value={newEx.targetRepsMin}
              onChange={(v) => setNewEx({ ...newEx, targetRepsMin: v })} min={1} max={30} />
            <Input label="Max reps" type="number" value={newEx.targetRepsMax}
              onChange={(v) => setNewEx({ ...newEx, targetRepsMax: v })} min={1} max={50} />
          </div>

          {/* Template — mandatory */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted font-semibold uppercase tracking-wider">
              Template <span className="text-accent">*</span>
            </label>
            {templates.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-1">
                {templates.map((t) => (
                  <button key={t} type="button"
                    onClick={() => setNewEx({ ...newEx, template: t })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      newEx.template === t
                        ? "bg-accent text-white"
                        : "bg-surface2 text-muted border border-border"
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            )}
            <input
              value={templates.includes(newEx.template) ? "" : newEx.template}
              onChange={(e) => setNewEx({ ...newEx, template: e.target.value })}
              placeholder="Or type a new template name…"
              className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-text text-sm focus:outline-none focus:border-accent transition-colors"
            />
            {newEx.template && !templates.includes(newEx.template) && (
              <div className="text-xs text-success mt-0.5">✓ New template "{newEx.template}" will be created</div>
            )}
            {!newEx.template && (
              <div className="text-xs text-accent mt-0.5">Template is required</div>
            )}
          </div>

          <Btn size="lg" onClick={addStrengthExercise}
            disabled={!newEx.name.trim() || !newEx.template.trim()}>
            Add Exercise
          </Btn>
        </div>
      </Modal>

      {/* Add cardio modal */}
      <Modal open={addCardioModal} onClose={() => setAddCardioModal(false)} title="Add Cardio">
        <Input label="Exercise name" value={newCardio.name}
          onChange={(v) => setNewCardio({ ...newCardio, name: v })} placeholder="e.g. Running, Cycling" />
        <Btn size="lg" className="mt-4" onClick={addCardioExercise} disabled={!newCardio.name.trim()}>
          Add Cardio
        </Btn>
      </Modal>

      {/* Edit template modal */}
      <Modal open={editTemplateModal} onClose={() => setEditTemplateModal(false)} title="Rename Template">
        <Input label="Template name" value={editTemplateName} onChange={setEditTemplateName} placeholder="e.g. Push Day" />
        <Btn size="lg" className="mt-4" onClick={() => renameTemplate(editingTemplate!, editTemplateName)}
          disabled={!editTemplateName.trim()}>Save</Btn>
      </Modal>

      {/* Delete template confirm */}
      <Modal open={!!confirmDeleteTemplate} onClose={() => setConfirmDeleteTemplate(null)} title="Delete Template">
        <div className="text-sm text-muted mb-4">
          Delete <span className="text-text font-bold">"{confirmDeleteTemplate}"</span> and all its exercises? This cannot be undone.
        </div>
        <div className="flex gap-3">
          <Btn variant="secondary" onClick={() => setConfirmDeleteTemplate(null)} className="flex-1">Cancel</Btn>
          <Btn variant="danger" onClick={() => deleteTemplate(confirmDeleteTemplate!)} className="flex-1">Delete</Btn>
        </div>
      </Modal>

      {/* Edit exercise modal */}
      <Modal open={editExModal} onClose={() => setEditExModal(false)} title="Edit Exercise">
        <div className="flex flex-col gap-3">
          <Input label="Exercise name" value={editEx.name} onChange={(v) => setEditEx({ ...editEx, name: v })} />
          <Input label="Muscle group" value={editEx.muscleGroup} onChange={(v) => setEditEx({ ...editEx, muscleGroup: v })} />
          <Select label="Body part" value={editEx.bodyPart}
            onChange={(v) => setEditEx({ ...editEx, bodyPart: v as "upper"|"lower" })}
            options={[{ value: "upper", label: "Upper body (+2.5kg)" }, { value: "lower", label: "Lower body (+5kg)" }]} />
          <Input label="Target weight" type="number" value={editEx.targetWeightKg}
            onChange={(v) => setEditEx({ ...editEx, targetWeightKg: v })} suffix="kg" step={0.5} min={0} />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Min reps" type="number" value={editEx.targetRepsMin}
              onChange={(v) => setEditEx({ ...editEx, targetRepsMin: v })} min={1} max={30} />
            <Input label="Max reps" type="number" value={editEx.targetRepsMax}
              onChange={(v) => setEditEx({ ...editEx, targetRepsMax: v })} min={1} max={50} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted font-semibold uppercase tracking-wider">Template <span className="text-accent">*</span></label>
            <div className="flex flex-wrap gap-2 mb-1">
              {templates.map((t) => (
                <button key={t} type="button" onClick={() => setEditEx({ ...editEx, template: t })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${editEx.template === t ? "bg-accent text-white" : "bg-surface2 text-muted border border-border"}`}>
                  {t}
                </button>
              ))}
            </div>
            <input value={templates.includes(editEx.template) ? "" : editEx.template}
              onChange={(e) => setEditEx({ ...editEx, template: e.target.value })}
              placeholder="Or type a new template name…"
              className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-text text-sm focus:outline-none focus:border-accent" />
          </div>
          <Btn size="lg" onClick={saveEditExercise} disabled={!editEx.name.trim() || !editEx.template.trim()}>Save Changes</Btn>
        </div>
      </Modal>

      {/* Delete exercise confirm */}
      <Modal open={!!confirmDeleteEx} onClose={() => setConfirmDeleteEx(null)} title="Delete Exercise">
        <div className="text-sm text-muted mb-4">Delete this exercise? This cannot be undone.</div>
        <div className="flex gap-3">
          <Btn variant="secondary" onClick={() => setConfirmDeleteEx(null)} className="flex-1">Cancel</Btn>
          <Btn variant="danger" onClick={() => removeExercise(confirmDeleteEx!)} className="flex-1">Delete</Btn>
        </div>
      </Modal>

      {/* Delete logged entry confirm */}
      <Modal open={!!confirmDeleteLog} onClose={() => setConfirmDeleteLog(null)} title="Delete Log Entry">
        <div className="text-sm text-muted mb-4">Remove this entry from today's log? This cannot be undone.</div>
        <div className="flex gap-3">
          <Btn variant="secondary" onClick={() => setConfirmDeleteLog(null)} className="flex-1">Cancel</Btn>
          <Btn variant="danger" onClick={() => deleteLogEntry(confirmDeleteLog!)} className="flex-1">Delete</Btn>
        </div>
      </Modal>

      {/* Edit logged entry modal */}
      <Modal open={editLogModal} onClose={() => setEditLogModal(false)} title={`Edit: ${editingLog?.exerciseName ?? ""}`}>
        {editingLog?.type === "strength" ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-12 gap-1 text-xs text-muted px-1 mb-1">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Weight (kg)</div>
              <div className="col-span-5">Reps</div>
              <div className="col-span-1" />
            </div>
            {editLogSets.map((s, i) => (
              <div key={i} className="grid grid-cols-12 gap-1 items-center">
                <div className="col-span-1 text-xs text-muted text-center">{i + 1}</div>
                <input type="number" value={s.weightKg} step="0.5" min="0"
                  onChange={(e) => setEditLogSets((prev) => prev.map((x, idx) => idx === i ? { ...x, weightKg: parseFloat(e.target.value) || 0 } : x))}
                  className="col-span-5 bg-surface2 border border-border rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:border-accent" />
                <input type="number" value={s.reps} min="1"
                  onChange={(e) => setEditLogSets((prev) => prev.map((x, idx) => idx === i ? { ...x, reps: parseInt(e.target.value) || 0 } : x))}
                  className="col-span-5 bg-surface2 border border-border rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:border-accent" />
                <button onClick={() => setEditLogSets((prev) => prev.filter((_, idx) => idx !== i))}
                  className="col-span-1 text-muted text-sm">×</button>
              </div>
            ))}
            <Btn size="sm" variant="secondary"
              onClick={() => setEditLogSets((prev) => [...prev, { reps: 8, weightKg: editLogSets[editLogSets.length - 1]?.weightKg ?? 0 }])}>
              + Set
            </Btn>
            <Btn size="lg" onClick={saveEditLog}>Save Changes</Btn>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Input label="Duration" type="number" value={editLogDuration} onChange={setEditLogDuration} suffix="min" />
            <Input label="Distance" type="number" value={editLogDistance} onChange={setEditLogDistance} suffix="km" />
            <Btn size="lg" onClick={saveEditLog}>Save Changes</Btn>
          </div>
        )}
      </Modal>
    </div>
  );
}
