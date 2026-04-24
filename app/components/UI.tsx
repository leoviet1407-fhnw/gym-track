"use client";
import { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-surface rounded-2xl p-4 ${className}`}>{children}</div>;
}

export function Card2({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-surface2 rounded-xl p-3 ${className}`}>{children}</div>;
}

export function Btn({
  children, onClick, variant = "primary", size = "md", disabled = false, className = "",
}: {
  children: ReactNode; onClick?: () => void; variant?: "primary"|"secondary"|"ghost"|"danger";
  size?: "sm"|"md"|"lg"; disabled?: boolean; className?: string;
}) {
  const base = "font-bold rounded-xl transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2";
  const sizes = { sm: "px-3 py-2 text-xs", md: "px-4 py-3 text-sm", lg: "px-5 py-4 text-base w-full" };
  const variants = {
    primary: "bg-accent text-white",
    secondary: "bg-surface2 text-text border border-border",
    ghost: "bg-transparent text-muted",
    danger: "bg-red-900/40 text-red-400 border border-red-800",
  };
  return (
    <button onClick={onClick} disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function Input({
  label, value, onChange, type = "text", placeholder = "", suffix, min, max, step,
}: {
  label?: string; value: string|number; onChange: (v: string) => void;
  type?: string; placeholder?: string; suffix?: string; min?: number; max?: number; step?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs text-muted font-semibold uppercase tracking-wider">{label}</label>}
      <div className="relative">
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} min={min} max={max} step={step}
          className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-text text-sm focus:outline-none focus:border-accent transition-colors" />
        {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-xs">{suffix}</span>}
      </div>
    </div>
  );
}

export function Select({
  label, value, onChange, options,
}: {
  label?: string; value: string; onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs text-muted font-semibold uppercase tracking-wider">{label}</label>}
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-text text-sm focus:outline-none focus:border-accent">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function Badge({ children, color = "default" }: { children: ReactNode; color?: "default"|"red"|"green"|"yellow" }) {
  const colors = { default: "bg-surface2 text-muted", red: "bg-accent/20 text-accent", green: "bg-success/20 text-success", yellow: "bg-accent2/20 text-accent2" };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colors[color]}`}>{children}</span>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="font-display text-xl font-black uppercase tracking-wide text-text mb-3">{children}</h2>;
}

export function Divider() { return <div className="h-px bg-border my-4" />; }

export function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-surface rounded-t-3xl p-6 pb-10 z-10 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg font-black uppercase">{title}</h3>
          <button onClick={onClose} className="text-muted text-2xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function CheckRow({ label, checked, onToggle, sub }: { label: string; checked: boolean; onToggle: () => void; sub?: string }) {
  return (
    <button onClick={onToggle}
      className="flex items-center gap-3 w-full py-3 px-1 active:bg-surface2 rounded-xl transition-colors text-left">
      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked ? "bg-accent border-accent" : "border-border"}`}>
        {checked && <span className="text-white text-sm leading-none">✓</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-semibold ${checked ? "line-through text-muted" : "text-text"}`}>{label}</div>
        {sub && <div className="text-xs text-muted">{sub}</div>}
      </div>
    </button>
  );
}
