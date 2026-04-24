"use client";
import { useEffect, useState, useCallback, useRef } from "react";
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
  const [profileName, setProfileName] = useState<ProfileName | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState<Tab>("workout");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchRef = useRef<number>(0);

  // Step 1: read localStorage once on mount, set profileName
  useEffect(() => {
    const saved = localStorage.getItem("gymtrack_profile");
    const name: ProfileName = saved === "jullie" ? "jullie" : "viet";
    setProfileName(name);
  }, []);

  // Step 2: fetch profile whenever profileName is set/changed
  useEffect(() => {
    if (!profileName) return;
    localStorage.setItem("gymtrack_profile", profileName);

    const id = ++fetchRef.current;
    setLoading(true);
    setError(null);

    fetch(`/api/profile?id=${profileName}`)
      .then((r) => {
        if (!r.ok) throw new Error(`API error ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (fetchRef.current !== id) return; // stale, ignore
        setProfile(data);
        setLoading(false);
      })
      .catch((err) => {
        if (fetchRef.current !== id) return;
        setError(err.message ?? "Failed to load profile");
        setLoading(false);
      });
  }, [profileName]);

  const handleProfileUpdate = useCallback(async (p: Profile) => {
    setProfile(p);
    await fetch("/api/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(p),
    });
  }, []);

  const isReady = !loading && profile !== null && profileName !== null;

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
              <button
                key={n}
                onClick={() => setProfileName(n)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-colors ${
                  profileName === n ? "bg-accent text-white" : "text-muted"
                }`}
              >
                {n === "viet" ? "Viet" : "Jullie"}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Tab content */}
      <main className="px-4 pb-28 pt-4">
        {loading || profileName === null ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <div className="text-muted text-xs">Loading profile…</div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="text-4xl">⚠️</div>
            <div className="text-text font-bold text-center">Could not load profile</div>
            <div className="text-muted text-xs text-center max-w-xs">{error}</div>
            <div className="text-muted text-xs text-center max-w-xs">
              Make sure <code className="text-accent">BLOB_READ_WRITE_TOKEN</code> is set in your Vercel environment variables.
            </div>
            <button
              onClick={() => setProfileName((p) => (p === "viet" ? "viet" : "jullie"))}
              className="mt-2 px-5 py-3 bg-accent text-white rounded-xl font-bold text-sm active:scale-95"
            >
              Retry
            </button>
          </div>
        ) : isReady ? (
          <>
            {tab === "profile" && (
              <ProfileTab profile={profile!} onSave={handleProfileUpdate} />
            )}
            {tab === "workout" && (
              <WorkoutTab profile={profile!} onProfileUpdate={handleProfileUpdate} profileName={profileName!} />
            )}
            {tab === "supplements" && (
              <SupplementsTab profile={profile!} onProfileUpdate={handleProfileUpdate} profileName={profileName!} />
            )}
            {tab === "habits" && (
              <HabitsTab profile={profile!} onProfileUpdate={handleProfileUpdate} profileName={profileName!} />
            )}
            {tab === "compete" && <CompeteTab />}
            {tab === "coach" && <CoachTab profileName={profileName!} />}
          </>
        ) : null}
      </main>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
