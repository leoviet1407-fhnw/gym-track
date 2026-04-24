"use client";
export default function CoachTab({ profileName }: { profileName: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="text-5xl">🤖</div>
      <div className="font-display font-black text-2xl text-center">AI Coach</div>
      <div className="text-muted text-sm text-center max-w-xs">
        Coming soon. The AI trainer will analyse your workout history, PRs, habits, and weight trend to give you personalised recommendations.
      </div>
    </div>
  );
}
