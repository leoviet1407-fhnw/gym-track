"use client";
export type Tab = "profile" | "workout" | "supplements" | "habits" | "compete" | "coach";

const TABS: Array<{ key: Tab; label: string; icon: string }> = [
  { key: "profile",     label: "Profile",  icon: "👤" },
  { key: "workout",     label: "Workout",  icon: "🏋️" },
  { key: "supplements", label: "Supps",    icon: "💊" },
  { key: "habits",      label: "Habits",   icon: "✅" },
  { key: "compete",     label: "Compete",  icon: "🏆" },
];

export default function BottomNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-bg/95 backdrop-blur border-t border-border safe-bottom">
      <div className="max-w-md mx-auto flex">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => onChange(t.key)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-3 px-1 transition-colors ${
              active === t.key ? "text-accent" : "text-muted"
            }`}>
            <span className="text-xl leading-none">{t.icon}</span>
            <span className={`text-[10px] font-bold uppercase tracking-wide ${active === t.key ? "text-accent" : "text-muted"}`}>
              {t.label}
            </span>
            {active === t.key && <div className="w-1 h-1 rounded-full bg-accent mt-0.5" />}
          </button>
        ))}
      </div>
    </nav>
  );
}
