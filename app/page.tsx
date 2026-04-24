"use client";
import { useEffect, useState, useCallback } from "react";
import type { Profile } from "@/lib/types";
import BottomNav, { Tab } from "./components/BottomNav";
import ProfileTab from "./components/ProfileTab";
import WorkoutTab from "./components/WorkoutTab";
import SupplementsTab from "./components/SupplementsTab";
import HabitsTab from "./components/HabitsTab";
import CompeteTab from "./components/CompeteTab";
import CoachTab from "./components/CoachTab";

type ProfileName = "viet" | "jullie";

export default function Home() {
  const [profileName, setProfileName] = useState<ProfileName>("viet");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState<Tab>("workout");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("gymtrack_profile") : null;
    if (saved === "viet" || saved === "jullie") setProfileName(saved);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("gymtrack_profile", profileName);
    loadProfile(profileName);
  }, [profileName]);

  async function loadProfile(name: ProfileName) {
    setLoading(true);
    try {
      const r = await fetch(`/api/profile?id=${name}`);
      setProfile(await r.json());
    } finally {
      setLoading(false);
    }
  }

  const handleProfileUpdate = useCallback(async (p: Profile) => {
    setProfile(p);
    await fetch("/api/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(p),
    });
  }, []);

  return (
    <div className="min-h-screen max-w-md mx-auto">
      {/* Header */}
      <header className="sticky top-0 bg-bg/95 backdrop-blur-md z-30 border-b border-border">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="font-display font-black text-xl tracking-tight">
            GYM<span className="text-accent">TRACK</span>
          </div>
          <div className="flex gap-1 bg-surface2 rounded-full p-1">
            {(["viet", "jullie"] as ProfileName[]).map((n) => (
              <button key={n} onClick={() => setProfileName(n)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-colors ${
                  profileName === n ? "bg-accent text-white" : "text-muted"
                }`}>
                {n === "viet" ? "Viet" : "Jullie"}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Tab content */}
      <main className="px-4 pb-28 pt-4">
        {loading || !profile ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {tab === "profile" && <ProfileTab profile={profile} onSave={handleProfileUpdate} />}
            {tab === "workout" && <WorkoutTab profile={profile} onProfileUpdate={handleProfileUpdate} profileName={profileName} />}
            {tab === "supplements" && <SupplementsTab profile={profile} onProfileUpdate={handleProfileUpdate} profileName={profileName} />}
            {tab === "habits" && <HabitsTab profile={profile} onProfileUpdate={handleProfileUpdate} profileName={profileName} />}
            {tab === "compete" && <CompeteTab />}
            {tab === "coach" && <CoachTab profileName={profileName} />}
          </>
        )}
      </main>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
