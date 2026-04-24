"use client";
import { useState, useEffect } from "react";
import type { Profile } from "@/lib/types";
import { bmi, bmiCategory, bmrCalories } from "@/lib/fitness";
import { formatDate, formatShort, todayISO } from "@/lib/date";
import { Card, Card2, Btn, Input, Select, SectionTitle, Divider, Spinner } from "./UI";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type ProfileName = "viet" | "jullie";

export default function ProfileTab({ profile, onSave }: { profile: Profile; onSave: (p: Profile) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(profile);
  const [saving, setSaving] = useState(false);
  const [weights, setWeights] = useState<Array<{ date: string; weightKg: number }>>([]);
  const [newWeight, setNewWeight] = useState("");
  const [loadingWeights, setLoadingWeights] = useState(true);

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
            <Select label="Sex" value={form.sex} onChange={(v) => setForm({ ...form, sex: v as "male" | "female" })}
              options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }]} />
            <Input label="Age" type="number" value={form.age} min={10} max={100}
              onChange={(v) => setForm({ ...form, age: parseInt(v) || 0 })} suffix="yrs" />
            <Input label="Height" type="number" value={form.heightCm} min={100} max={250}
              onChange={(v) => setForm({ ...form, heightCm: parseInt(v) || 0 })} suffix="cm" />
            <Input label="Weight" type="number" value={form.weightKg} min={20} max={300} step={0.1}
              onChange={(v) => setForm({ ...form, weightKg: parseFloat(v) || 0 })} suffix="kg" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            {[
              ["Name", form.name],
              ["Sex", form.sex],
              ["Age", `${form.age} yrs`],
              ["Height", `${form.heightCm} cm`],
              ["Weight", `${form.weightKg} kg`],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="text-muted text-xs">{k}</div>
                <div className="font-semibold capitalize">{v}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

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
    </div>
  );
}
