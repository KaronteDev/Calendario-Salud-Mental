import { addDays, endOfMonth, endOfWeek, format, isValid, parse, startOfMonth, startOfWeek } from "date-fns";

import type { EntryRecord } from "@/lib/types";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function getTodayKey() {
  return format(new Date(), "yyyy-MM-dd");
}

export function getCurrentMonthKey() {
  return format(new Date(), "yyyy-MM");
}

export function ensureMonthKey(value?: string | null) {
  if (!value) {
    return getCurrentMonthKey();
  }

  const parsed = parse(value, "yyyy-MM", new Date());
  return isValid(parsed) ? format(parsed, "yyyy-MM") : getCurrentMonthKey();
}

export function monthLabel(monthKey: string, locale: string) {
  const parsed = parse(`${monthKey}-01`, "yyyy-MM-dd", new Date());
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(parsed);
}

export function buildMonthMatrix(monthKey: string) {
  const monthStart = startOfMonth(parse(`${monthKey}-01`, "yyyy-MM-dd", new Date()));
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 });

  const days: Date[] = [];
  let cursor = gridStart;

  while (cursor <= gridEnd) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return days;
}

export function getMoodColorClass(entry?: EntryRecord | null) {
  if (!entry) {
    return "bg-white/5 border-white/10";
  }

  if (entry.mood <= 2) {
    return "bg-rose-500/25 border-rose-300/50";
  }

  if (entry.mood === 3) {
    return "bg-amber-400/25 border-amber-200/50";
  }

  return "bg-emerald-500/25 border-emerald-300/50";
}

export function hasGoalCompletion(entry?: EntryRecord | null) {
  return Boolean(entry && (entry.nutritionDone || entry.exerciseDone || entry.leisureDone));
}

export function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function percentage(part: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return (part / total) * 100;
}

export function round(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}
