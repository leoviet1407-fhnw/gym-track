// All storage dates are ISO (YYYY-MM-DD). Display uses DD/MM/YYYY.
// "Today" is always computed in Europe/Zurich timezone.

export function todayISO(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
}

export function yesterdayISO(fromISO?: string): string {
  const base = fromISO ? new Date(fromISO + "T12:00:00Z") : new Date();
  base.setUTCDate(base.getUTCDate() - 1);
  return base.toISOString().slice(0, 10);
}

export function isoAddDays(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// DD/MM/YYYY
export function formatDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// DD/MM short
export function formatShort(iso: string): string {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

// Monday of the week containing the given ISO date (Europe/Zurich)
export function weekStartISO(iso: string): string {
  const d = new Date(iso + "T12:00:00Z");
  const day = d.getUTCDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function weekDaysISO(iso: string): string[] {
  const start = weekStartISO(iso);
  return Array.from({ length: 7 }, (_, i) => isoAddDays(start, i));
}
