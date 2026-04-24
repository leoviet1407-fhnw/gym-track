"use client";
import { useState, useEffect } from "react";
import type { Profile } from "@/lib/types";
import { todayISO, formatDate } from "@/lib/date";
import { Card, Btn, Input, SectionTitle, CheckRow, Divider } from "./UI";

export default function SupplementsTab({
  profile, onProfileUpdate, profileName,
}: {
  profile: Profile;
  onProfileUpdate: (p: Profile) => Promise<void>;
  profileName: string;
}) {
  const [taken, setTaken] = useState<string[]>([]);
  const [newSupp, setNewSupp] = useState("");
  const [loading, setLoading] = useState(true);
  const today = todayISO();

  useEffect(() => {
    fetch(`/api/daily?id=${profile.id}&date=${today}`)
      .then((r) => r.json())
      .then((d) => { setTaken(d.supplementsTaken ?? []); setLoading(false); });
  }, [profile.id, today]);

  async function toggle(id: string) {
    const updated = taken.includes(id) ? taken.filter((t) => t !== id) : [...taken, id];
    setTaken(updated);
    const rec = await fetch(`/api/daily?id=${profile.id}&date=${today}`).then((r) => r.json());
    await fetch(`/api/daily?id=${profile.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...rec, supplementsTaken: updated }),
    });
  }

  async function addSupp() {
    if (!newSupp.trim()) return;
    const supp = { id: `supp-${Date.now()}`, name: newSupp.trim() };
    const updated = { ...profile, supplements: [...profile.supplements, supp] };
    await onProfileUpdate(updated);
    setNewSupp("");
  }

  async function removeSupp(id: string) {
    const updated = { ...profile, supplements: profile.supplements.filter((s) => s.id !== id) };
    await onProfileUpdate(updated);
    setTaken((t) => t.filter((x) => x !== id));
  }

  const completed = profile.supplements.filter((s) => taken.includes(s.id)).length;
  const total = profile.supplements.length;

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle>Supplements</SectionTitle>

      {/* Progress */}
      {total > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold">{formatDate(today)}</span>
            <span className="text-sm font-bold text-accent">{completed}/{total} taken</span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all"
              style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }} />
          </div>
        </Card>
      )}

      {/* Checklist */}
      <Card>
        <div className="font-bold text-sm mb-2">Daily Checklist</div>
        {loading ? (
          <div className="text-muted text-sm py-4 text-center">Loading…</div>
        ) : profile.supplements.length === 0 ? (
          <div className="text-muted text-sm py-4 text-center">No supplements added yet</div>
        ) : (
          <div className="divide-y divide-border">
            {profile.supplements.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className="flex-1">
                  <CheckRow label={s.name} checked={taken.includes(s.id)} onToggle={() => toggle(s.id)} />
                </div>
                <button onClick={() => removeSupp(s.id)} className="text-muted text-lg px-2 py-1">×</button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add supplement */}
      <Card>
        <div className="font-bold text-sm mb-3">Add Supplement</div>
        <div className="flex gap-2">
          <input value={newSupp} onChange={(e) => setNewSupp(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSupp()}
            placeholder="e.g. Vitamin D"
            className="flex-1 bg-surface2 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent" />
          <Btn onClick={addSupp} disabled={!newSupp.trim()}>Add</Btn>
        </div>
      </Card>
    </div>
  );
}
