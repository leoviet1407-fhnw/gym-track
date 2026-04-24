"use client";
import { useState, useEffect, useRef } from "react";
import { Btn } from "./UI";

const PRESETS = [60, 90, 120, 180];

export default function RestTimer() {
  const [selected, setSelected] = useState(90);
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(90);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          clearInterval(intervalRef.current!);
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [running]);

  function start(secs: number) {
    clearInterval(intervalRef.current!);
    setSelected(secs);
    setRemaining(secs);
    setRunning(true);
  }

  function reset() {
    clearInterval(intervalRef.current!);
    setRunning(false);
    setRemaining(selected);
  }

  const pct = running ? (remaining / selected) * 100 : 100;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const done = remaining === 0;

  return (
    <div className="bg-surface2 rounded-2xl p-4">
      <div className="text-xs text-muted font-bold uppercase tracking-wider mb-3">Rest Timer</div>

      {/* Preset buttons */}
      <div className="flex gap-2 mb-4">
        {PRESETS.map((p) => (
          <button key={p} onClick={() => start(p)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              selected === p && running ? "bg-accent text-white" : "bg-surface text-muted border border-border"
            }`}>
            {p < 60 ? `${p}s` : `${p / 60}m`}
          </button>
        ))}
      </div>

      {/* Timer display */}
      <div className="flex items-center justify-between">
        <div className={`text-3xl font-display font-black tabular-nums ${done ? "text-success" : running ? "text-accent" : "text-text"}`}>
          {done ? "Done!" : `${mins}:${String(secs).padStart(2, "0")}`}
        </div>
        <div className="flex gap-2">
          {running ? (
            <Btn size="sm" variant="secondary" onClick={reset}>Reset</Btn>
          ) : (
            <Btn size="sm" onClick={() => start(selected)}>Start</Btn>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1 bg-border rounded-full overflow-hidden">
        <div className="h-full bg-accent rounded-full transition-all duration-1000"
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
