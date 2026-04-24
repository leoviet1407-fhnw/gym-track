"use client";
import { useState, useEffect, useCallback } from "react";
import type { Profile, Exercise, WorkoutEntry, LoggedSet } from "@/lib/types";
import { todayISO, formatDate, formatShort } from "@/lib/date";
import { oneRepMax } from "@/lib/fitness";
import { Card, Card2, Btn, Input, Select, SectionTitle, Modal, Spinner, Divider } from "./UI";
import RestTimer from "./RestTimer";

type ProfileName = "viet" | "jullie";

interface PRResult { type: string; exerciseName: string; value: number; previousValue: number }
interface AutoResult { prs: PRResult[]; weightSuggest: number | null; deload: number | null }

function ExerciseHistory({ exerciseId, profileId }: { exerciseId: string; profileId: string }) {
  const [history, setHistory] = useState<Array<{ date: string; entry: WorkoutEntry }>>([]);
  useEffect(() => {
    fetch(`/api/workout?id=${profileId}&exerciseId=${exerciseId}`)
      .then((r) => r.json())
      .then((d) => setHistory(d.history ?? []));
  }, [exerciseId, profileId]);
  if (!history.length) return <div className="text-xs text-muted py-2">No history yet</div>;
  return (
    <div className="flex flex-col gap-1 mt-2">
      {history.slice(0, 3).map((h, i) => {
        const sets = h.entry.sets ?? [];
        const maxRM = sets.length ? Math.max(...sets.map((s) => oneRepMax(s.weightKg, s.reps))) : 0;
        return (
          <div key={i} className="flex justify-between text-xs text-muted">
            <span>{formatDate(h.date)}</span>
            <span>{sets.map((s) => `${s.reps}×${s.weightKg}kg`).join(", ")}</span>
            {maxRM > 0 && <span className="text-accent2">1RM≈{maxRM}kg</span>}
          </div>
        );
      })}
    </div>
  );
}

function SetLogger({ exercise, onLog }: { exercise: Exercise; onLog: (sets: LoggedSet[]) => Promise<AutoResult> }) {
  const [sets, setSets] = useState<LoggedSet[]>(
    Array.from({ length: 3 }, () => ({ reps: exercise.targetReps ?? 8, weightKg: exercise.targetWeightKg ?? 0 }))
  );
  const [logging, setLogging] = useState(false);
  const [result, setResult] = useState<AutoResult | null>(null);
  const [accepted, setAccepted] = useState(false);

  function updateSet(i: number, field: "reps" | "weightKg", val: string) {
    setSets((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: parseFloat(val) || 0 } : s));
  }
  function addSet() { setSets((prev) => [...prev, { reps: exercise.targetReps ?? 8, weightKg: exercise.targetWeightKg ?? 0 }]); }
  function removeSet(i: number) { setSets((prev) => prev.filter((_, idx) => idx !== i)); }

  async function handleLog() {
    setLogging(true);
    const res = await onLog(sets);
    setResult(res);
    setLogging(false);
  }

  async function acceptWeightIncrease(newWeight: number) {
    await fetch(`/api/workout?id=${exercise.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ acceptWeightIncrease: { exerciseId: exercise.id, newWeight } }),
    });
    setAccepted(true);
  }

  return (
    <div className="mt-3">
      <div className="grid grid-cols-12 gap-1 mb-1 text-xs text-muted px-1">
        <div className="col-span-1">#</div>
        <div className="col-span-5">Weight (kg)</div>
        <div className="col-span-5">Reps</div>
        <div className="col-span-1" />
      </div>
      {sets.map((s, i) => (
        <div key={i} className="grid grid-cols-12 gap-1 mb-2 items-center">
          <div className="col-span-1 text-xs text-muted text-center">{i + 1}</div>
          <input type="number" value={s.weightKg} onChange={(e) => updateSet(i, "weightKg", e.target.value)}
            step="0.5" min="0"
            className="col-span-5 bg-surface2 border border-border rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:border-accent" />
          <input type="number" value={s.reps} onChange={(e) => updateSet(i, "reps", e.target.value)}
            min="1" max="100"
            className="col-span-5 bg-surface2 border border-border rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:border-accent" />
          <button onClick={() => removeSet(i)} className="col-span-1 text-muted text-sm">×</button>
        </div>
      ))}
      <div className="flex gap-2 mt-2">
        <Btn size="sm" variant="secondary" onClick={addSet}>+ Set</Btn>
        <Btn size="sm" onClick={handleLog} disabled={logging} className="flex-1">
          {logging ? "Logging…" : "Log Session"}
        </Btn>
      </div>

      {/* Automation results */}
      {result && (
        <div className="mt-3 flex flex-col gap-2">
          {result.prs.map((pr, i) => (
            <div key={i} className="bg-accent2/10 border border-accent2/40 rounded-xl p-3 pr-pop">
              <div className="font-bold text-accent2 text-sm">🏆 New PR! {pr.type === "weight" ? "Heaviest weight" : pr.type === "reps" ? "Most reps" : "Best 1RM"}</div>
              <div className="text-xs text-muted mt-0.5">{pr.value} (was {pr.previousValue})</div>
            </div>
          ))}
          {result.weightSuggest && !accepted && (
            <div className="bg-success/10 border border-success/40 rounded-xl p-3">
              <div className="font-bold text-success text-sm">📈 Time to increase weight!</div>
              <div className="text-xs text-muted mt-0.5 mb-2">You've hit your target twice in a row. Suggested: {result.weightSuggest}kg</div>
              <Btn size="sm" onClick={() => acceptWeightIncrease(result.weightSuggest!)}>Accept → {result.weightSuggest}kg</Btn>
            </div>
          )}
          {result.deload && (
            <div className="bg-accent2/10 border border-accent2/30 rounded-xl p-3">
              <div className="font-bold text-accent2 text-sm">⚠️ Consider a deload week</div>
              <div className="text-xs text-muted mt-0.5">You've been progressing for 4+ weeks. Drop to ~{result.deload}kg for one week to recover.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CardioLogger({ exercise, onLog }: { exercise: Exercise; onLog: (dur: number, dist: number) => Promise<void> }) {
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [logging, setLogging] = useState(false);
  async function handle() {
    setLogging(true);
    await onLog(parseFloat(duration) || 0, parseFloat(distance) || 0);
    setLogging(false);
    setDuration(""); setDistance("");
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
  const [newEx, setNewEx] = useState({ name: "", muscleGroup: "", bodyPart: "upper" as "upper"|"lower", targetWeightKg: "", targetReps: "8", template: "" });
  const [newCardio, setNewCardio] = useState({ name: "" });
  const today = todayISO();

  const templates = Array.from(new Set(profile.exerciseLibrary.filter((e) => e.template).map((e) => e.template!)));
  const cardioExercises = profile.exerciseLibrary.filter((e) => e.type === "cardio");
  const templateExercises = activeTemplate
    ? profile.exerciseLibrary.filter((e) => e.template === activeTemplate)
    : [];

  async function logStrength(exercise: Exercise, sets: LoggedSet[]): Promise<AutoResult> {
    const entry: WorkoutEntry = {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      type: "strength",
      sets,
      loggedAt: new Date().toISOString(),
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
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      type: "cardio",
      durationMin,
      distanceKm,
      loggedAt: new Date().toISOString(),
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
      targetReps: parseInt(newEx.targetReps) || 8,
      template: newEx.template || undefined,
    };
    await onProfileUpdate({ ...profile, exerciseLibrary: [...profile.exerciseLibrary, ex] });
    setAddExModal(false);
    setNewEx({ name: "", muscleGroup: "", bodyPart: "upper", targetWeightKg: "", targetReps: "8", template: "" });
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
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle>Workout</SectionTitle>

      {/* Rest timer */}
      <RestTimer />

      {/* Template selector */}
      {templates.length > 0 && (
        <Card>
          <div className="font-bold text-sm mb-3">Templates</div>
          <div className="flex flex-col gap-2">
            {templates.map((t) => (
              <button key={t} onClick={() => setActiveTemplate(activeTemplate === t ? null : t)}
                className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                  activeTemplate === t ? "bg-accent text-white" : "bg-surface2 text-text border border-border"
                }`}>
                {t}
                <span className="text-xs font-normal ml-2 opacity-70">
                  ({profile.exerciseLibrary.filter((e) => e.template === t).length} exercises)
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Template exercises */}
      {activeTemplate && (
        <div className="flex flex-col gap-3">
          <div className="font-bold text-sm text-muted uppercase tracking-wider">{activeTemplate}</div>
          {templateExercises.map((ex) => (
            <Card key={ex.id}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-sm">{ex.name}</div>
                  <div className="text-xs text-muted mt-0.5">
                    Target: {ex.targetWeightKg}kg × {ex.targetReps} reps · {ex.bodyPart}
                  </div>
                  {ex.targetWeightKg && ex.targetReps && (
                    <div className="text-xs text-accent2 mt-0.5">
                      Est 1RM: {oneRepMax(ex.targetWeightKg, ex.targetReps)}kg
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setExpandedEx(expandedEx === ex.id ? null : ex.id)}
                    className="text-accent text-xs font-bold bg-accent/10 px-3 py-1.5 rounded-lg">
                    {expandedEx === ex.id ? "Close" : "Log"}
                  </button>
                  <button onClick={() => removeExercise(ex.id)} className="text-muted text-lg px-1">×</button>
                </div>
              </div>
              {expandedEx === ex.id && (
                <>
                  <ExerciseHistory exerciseId={ex.id} profileId={profile.id} />
                  <Divider />
                  <SetLogger
                    exercise={ex}
                    onLog={(sets) => logStrength(ex, sets)}
                  />
                </>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Cardio section */}
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
                  <CardioLogger exercise={ex} onLog={(dur, dist) => logCardio(ex, dur, dist)} />
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Add exercise buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Btn variant="secondary" onClick={() => setAddExModal(true)}>+ Strength</Btn>
        <Btn variant="secondary" onClick={() => setAddCardioModal(true)}>+ Cardio</Btn>
      </div>

      {/* Add strength modal */}
      <Modal open={addExModal} onClose={() => setAddExModal(false)} title="Add Exercise">
        <div className="flex flex-col gap-3">
          <Input label="Exercise name" value={newEx.name} onChange={(v) => setNewEx({ ...newEx, name: v })} placeholder="e.g. Bulgarian Split Squat" />
          <Input label="Muscle group" value={newEx.muscleGroup} onChange={(v) => setNewEx({ ...newEx, muscleGroup: v })} placeholder="e.g. legs" />
          <Select label="Body part" value={newEx.bodyPart}
            onChange={(v) => setNewEx({ ...newEx, bodyPart: v as "upper"|"lower" })}
            options={[{ value: "upper", label: "Upper body (+2.5kg)" }, { value: "lower", label: "Lower body (+5kg)" }]} />
          <Input label="Starting weight" type="number" value={newEx.targetWeightKg}
            onChange={(v) => setNewEx({ ...newEx, targetWeightKg: v })} suffix="kg" step={0.5} min={0} />
          <Input label="Target reps" type="number" value={newEx.targetReps}
            onChange={(v) => setNewEx({ ...newEx, targetReps: v })} min={1} max={50} />
          <Input label="Template (optional)" value={newEx.template}
            onChange={(v) => setNewEx({ ...newEx, template: v })}
            placeholder={templates[0] || "e.g. Chest + Triceps"} />
          <Btn size="lg" onClick={addStrengthExercise} disabled={!newEx.name.trim()}>Add Exercise</Btn>
        </div>
      </Modal>

      {/* Add cardio modal */}
      <Modal open={addCardioModal} onClose={() => setAddCardioModal(false)} title="Add Cardio">
        <Input label="Exercise name" value={newCardio.name}
          onChange={(v) => setNewCardio({ ...newCardio, name: v })} placeholder="e.g. Running, Cycling" />
        <Btn size="lg" className="mt-4" onClick={addCardioExercise} disabled={!newCardio.name.trim()}>Add Cardio</Btn>
      </Modal>
    </div>
  );
}
