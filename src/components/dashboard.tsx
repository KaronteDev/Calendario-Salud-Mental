"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Apple, BedDouble, ChevronLeft, ChevronRight, Dumbbell, Moon, Sparkles, Sun, X } from "lucide-react";
import { useState } from "react";

import { usePreferences } from "@/components/providers";
import { buildMonthlyAnalytics } from "@/lib/analytics";
import { localeOptions } from "@/lib/i18n";
import type { EntryRecord, PublicUser } from "@/lib/types";
import { buildMonthMatrix, cn, getMoodColorClass, getTodayKey, hasGoalCompletion, monthLabel } from "@/lib/utils";

function LogoutButton({ label }: { label: string }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--text)]" onClick={handleLogout} type="button">
      {label}
    </button>
  );
}

export function Dashboard({ user, monthKey, entries }: { user: PublicUser; monthKey: string; entries: EntryRecord[] }) {
  const router = useRouter();
  const { locale, theme, dictionary, setLocale, toggleTheme } = usePreferences();
  const analytics = buildMonthlyAnalytics(entries);
  const [activeTab, setActiveTab] = useState<"trends" | "sleep" | "profile" | "goals">("trends");
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const days = buildMonthMatrix(monthKey);
  const entryMap = new Map(entries.map((entry) => [entry.dateKey, entry]));
  const selectedEntry = selectedDateKey ? entryMap.get(selectedDateKey) ?? null : null;
  const todayKey = getTodayKey();

  function navigateMonth(direction: -1 | 1) {
    const base = new Date(`${monthKey}-01T12:00:00`);
    base.setMonth(base.getMonth() + direction);
    router.push(`/?month=${format(base, "yyyy-MM")}`);
  }

  const chartTabs = [
    { key: "trends", label: dictionary.trends },
    { key: "sleep", label: dictionary.sleepChart },
    { key: "profile", label: dictionary.profile },
    { key: "goals", label: dictionary.goals },
  ] as const;

  return (
    <main className="page-shell mx-auto max-w-7xl">
      <div className="mesh-overlay" />
      <section className="glass-panel relative overflow-hidden rounded-[2rem] p-5 md:p-7">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-r from-[var(--primary)]/16 via-transparent to-[var(--accent)]/14" />
        <header className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="font-heading text-sm uppercase tracking-[0.35em] text-[var(--accent)]">WellFlow</p>
            <div className="mt-3 flex items-end gap-4">
              <div>
                <h1 className="font-heading text-4xl font-semibold md:text-5xl">{dictionary.appName}</h1>
                <p className="mt-2 text-[var(--muted)]">{dictionary.appSubtitle}</p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--muted)]">
                  <Sparkles size={14} className="text-[var(--accent)]" />
                  {user.name}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link className="rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white" href={`/day/${todayKey}`}>
              {dictionary.today}
            </Link>
            {user.role === "admin" ? (
              <Link className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--text)]" href="/admin/users">
                {dictionary.manageUsers}
              </Link>
            ) : null}
            <select className="field min-w-36 max-w-44" value={locale} onChange={(event) => setLocale(event.target.value as typeof locale)}>
              {localeOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.flag} {option.label}
                </option>
              ))}
            </select>
            <button className="rounded-2xl border border-white/10 p-3 text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--text)]" onClick={toggleTheme} type="button">
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <LogoutButton label={dictionary.logout} />
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <div className="space-y-6">
            <section className="surface-card rounded-[1.75rem] p-5">
              <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-[var(--accent)]">{dictionary.monthSummary}</p>
                  <h2 className="font-heading mt-2 text-3xl font-semibold capitalize">{monthLabel(monthKey, locale)}</h2>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--text)]" onClick={() => navigateMonth(-1)} type="button">
                    <ChevronLeft size={18} />
                  </button>
                  <button className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--text)]" onClick={() => navigateMonth(1)} type="button">
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-3 text-xs text-[var(--muted)]">
                <span className="rounded-full border border-white/10 px-3 py-1">🔴 {dictionary.legendBad}</span>
                <span className="rounded-full border border-white/10 px-3 py-1">🟡 {dictionary.legendNormal}</span>
                <span className="rounded-full border border-white/10 px-3 py-1">🟢 {dictionary.legendGreat}</span>
                <span className="rounded-full border border-white/10 px-3 py-1">🔵 {dictionary.legendGoal}</span>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
                {dictionary.weekdays.map((weekday) => (
                  <div key={weekday} className="py-2">{weekday}</div>
                ))}
              </div>

              <div className="mt-2 grid grid-cols-7 gap-2">
                {days.map((day) => {
                  const dateKey = format(day, "yyyy-MM-dd");
                  const entry = entryMap.get(dateKey);
                  const isCurrentMonth = dateKey.startsWith(monthKey);

                  return (
                    <button
                      key={dateKey}
                      className={cn(
                        "relative min-h-24 rounded-[1.35rem] border p-3 text-left transition hover:translate-y-[-1px]",
                        getMoodColorClass(entry),
                        isCurrentMonth ? "opacity-100" : "opacity-40",
                        dateKey === todayKey ? "ring-1 ring-[var(--accent)]" : "",
                      )}
                      onClick={() => setSelectedDateKey(dateKey)}
                      type="button"
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-semibold">{format(day, "d")}</span>
                        {hasGoalCompletion(entry) ? <span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> : null}
                      </div>
                      {entry ? (
                        <div className="mt-5 text-xs text-[var(--muted)]">
                          <p>{dictionary.mood}: {dictionary.moodLabels[entry.mood]}</p>
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <article className="surface-card rounded-[1.5rem] p-4">
                <div className="mb-3 flex items-center justify-between text-[var(--muted)]"><Sparkles size={16} /><span className="text-xs uppercase tracking-[0.2em]">Mood</span></div>
                <p className="text-sm text-[var(--muted)]">{dictionary.avgMood}</p>
                <p className="font-heading mt-3 text-3xl font-semibold">{analytics.summary.avgMood}</p>
              </article>
              <article className="surface-card rounded-[1.5rem] p-4">
                <div className="mb-3 flex items-center justify-between text-[var(--muted)]"><Activity size={16} /><span className="text-xs uppercase tracking-[0.2em]">Mind</span></div>
                <p className="text-sm text-[var(--muted)]">{dictionary.avgMental}</p>
                <p className="font-heading mt-3 text-3xl font-semibold">{analytics.summary.avgMental}</p>
              </article>
              <article className="surface-card rounded-[1.5rem] p-4">
                <div className="mb-3 flex items-center justify-between text-[var(--muted)]"><Activity size={16} /><span className="text-xs uppercase tracking-[0.2em]">Body</span></div>
                <p className="text-sm text-[var(--muted)]">{dictionary.avgPhysical}</p>
                <p className="font-heading mt-3 text-3xl font-semibold">{analytics.summary.avgPhysical}</p>
              </article>
              <article className="surface-card rounded-[1.5rem] p-4">
                <div className="mb-3 flex items-center justify-between text-[var(--muted)]"><BedDouble size={16} /><span className="text-xs uppercase tracking-[0.2em]">Sleep</span></div>
                <p className="text-sm text-[var(--muted)]">{dictionary.avgSleep}</p>
                <p className="font-heading mt-3 text-3xl font-semibold">{analytics.summary.avgSleep}</p>
              </article>
              <article className="surface-card rounded-[1.5rem] p-4">
                <div className="mb-3 flex items-center justify-between text-[var(--muted)]"><Dumbbell size={16} /><span className="text-xs uppercase tracking-[0.2em]">Goal</span></div>
                <p className="text-sm text-[var(--muted)]">{dictionary.exercise}</p>
                <p className="font-heading mt-3 text-3xl font-semibold">{analytics.summary.exerciseCompletion}%</p>
              </article>
              <article className="surface-card rounded-[1.5rem] p-4">
                <div className="mb-3 flex items-center justify-between text-[var(--muted)]"><Apple size={16} /><span className="text-xs uppercase tracking-[0.2em]">Food</span></div>
                <p className="text-sm text-[var(--muted)]">{dictionary.food}</p>
                <p className="font-heading mt-3 text-3xl font-semibold">{analytics.summary.nutritionCompletion}%</p>
              </article>
            </section>
          </div>

          <div className="space-y-6">
            <section className="surface-card rounded-[1.75rem] p-5">
              <div className="mb-5 flex flex-wrap gap-2">
                {chartTabs.map((tab) => (
                  <button
                    key={tab.key}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm transition",
                      activeTab === tab.key ? "bg-[var(--primary)] text-white" : "bg-white/5 text-[var(--muted)] hover:text-[var(--text)]",
                    )}
                    onClick={() => setActiveTab(tab.key)}
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="h-80">
                {entries.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-white/10 bg-white/5 text-center">
                    <h3 className="font-heading text-2xl">{dictionary.monthEmptyTitle}</h3>
                    <p className="mt-3 max-w-sm text-sm text-[var(--muted)]">{dictionary.monthEmptyBody}</p>
                  </div>
                ) : activeTab === "trends" ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.trends}>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
                      <XAxis dataKey="day" stroke="currentColor" />
                      <YAxis domain={[1, 5]} stroke="currentColor" />
                      <Tooltip />
                      <Line dataKey="mood" stroke="#60a5fa" strokeWidth={2.4} type="monotone" />
                      <Line dataKey="mental" stroke="#f59e0b" strokeWidth={2.1} type="monotone" />
                      <Line dataKey="physical" stroke="#34d399" strokeWidth={2.1} type="monotone" />
                      <Line dataKey="sleep" stroke="#d5b36a" strokeWidth={2.1} type="monotone" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : activeTab === "sleep" ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.sleep}>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
                      <XAxis dataKey="day" stroke="currentColor" />
                      <YAxis stroke="currentColor" />
                      <Tooltip />
                      <Bar dataKey="hours" fill="#60a5fa" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : activeTab === "profile" ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" data={analytics.profile} outerRadius="70%">
                      <PolarGrid stroke="rgba(255,255,255,0.1)" />
                      <PolarAngleAxis dataKey="metric" />
                      <Radar dataKey="value" fill="#60a5fa" fillOpacity={0.5} stroke="#60a5fa" />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.goals} layout="vertical">
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
                      <XAxis domain={[0, 100]} stroke="currentColor" type="number" />
                      <YAxis dataKey="metric" stroke="currentColor" type="category" width={80} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#d5b36a" radius={[0, 10, 10, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {activeTab === "sleep" ? (
                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-[1.25rem] bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{dictionary.average}</p>
                    <p className="mt-2 text-xl font-semibold">{analytics.summary.avgSleepHours}</p>
                  </div>
                  <div className="rounded-[1.25rem] bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{dictionary.maximum}</p>
                    <p className="mt-2 text-xl font-semibold">{analytics.summary.sleepMax}</p>
                  </div>
                  <div className="rounded-[1.25rem] bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{dictionary.minimum}</p>
                    <p className="mt-2 text-xl font-semibold">{analytics.summary.sleepMin}</p>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="surface-card rounded-[1.75rem] p-5">
              <h2 className="font-heading mb-4 text-2xl font-semibold">{dictionary.quickView}</h2>
              <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/5 p-5">
                <p className="text-sm text-[var(--muted)]">{dictionary.selectDayHint}</p>
              </div>
            </section>
          </div>
        </div>
      </section>

      {selectedDateKey ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/45 backdrop-blur-sm" onClick={() => setSelectedDateKey(null)}>
          <div className="w-full max-w-4xl rounded-t-[2rem] border border-white/10 bg-[var(--surface-strong)] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mx-auto mb-5 h-1.5 w-20 rounded-full bg-white/12" />
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="font-heading text-sm uppercase tracking-[0.3em] text-[var(--accent)]">{dictionary.quickView}</p>
                <h3 className="font-heading mt-2 text-3xl font-semibold">{selectedDateKey}</h3>
              </div>
              <button className="rounded-2xl border border-white/10 p-3 text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--text)]" onClick={() => setSelectedDateKey(null)} type="button">
                <X size={18} />
              </button>
            </div>

            {selectedEntry ? (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="rounded-[1.5rem] bg-white/5 p-4">
                    <p className="text-sm text-[var(--muted)]">{dictionary.mood}</p>
                    <p className="mt-3 text-2xl font-semibold">{dictionary.moodLabels[selectedEntry.mood]}</p>
                  </div>
                  <div className="rounded-[1.5rem] bg-white/5 p-4">
                    <p className="text-sm text-[var(--muted)]">{dictionary.mentalState}</p>
                    <p className="mt-3 text-2xl font-semibold">{selectedEntry.mentalState}/5</p>
                  </div>
                  <div className="rounded-[1.5rem] bg-white/5 p-4">
                    <p className="text-sm text-[var(--muted)]">{dictionary.physicalState}</p>
                    <p className="mt-3 text-2xl font-semibold">{selectedEntry.physicalState}/5</p>
                  </div>
                  <div className="rounded-[1.5rem] bg-white/5 p-4">
                    <p className="text-sm text-[var(--muted)]">{dictionary.sleepHoursLabel}</p>
                    <p className="mt-3 text-2xl font-semibold">{selectedEntry.sleepHours}h</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-[1.5rem] bg-white/5 p-4">
                    <p className="text-sm text-[var(--muted)]">{dictionary.completedGoals}</p>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3"><span>{dictionary.foodGoal}</span><span>{selectedEntry.nutritionDone ? "✓" : "—"}</span></div>
                      <div className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3"><span>{dictionary.exerciseGoal}</span><span>{selectedEntry.exerciseDone ? "✓" : "—"}</span></div>
                      <div className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3"><span>{dictionary.leisureGoal}</span><span>{selectedEntry.leisureDone ? "✓" : "—"}</span></div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[1.5rem] bg-white/5 p-4 text-sm text-[var(--muted)]">
                      <p>{dictionary.exerciseDetail}: {selectedEntry.exerciseDone ? `${selectedEntry.exerciseType ?? dictionary.exercise} · ${selectedEntry.exerciseMinutes ?? 0} ${dictionary.minutes}` : "-"}</p>
                      <p className="mt-2">{dictionary.leisureDetail}: {selectedEntry.leisureDone ? selectedEntry.leisureActivity ?? dictionary.leisure : "-"}</p>
                      <p className="mt-2">{dictionary.notesDetail}: {selectedEntry.notes || "-"}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Link className="inline-flex rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white" href={`/day/${selectedDateKey}`}>
                        {dictionary.editRecord}
                      </Link>
                      <button className="inline-flex rounded-2xl border border-white/10 px-4 py-3 text-sm text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--text)]" onClick={() => setSelectedDateKey(null)} type="button">
                        {dictionary.close}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/5 p-5">
                <p className="text-sm text-[var(--muted)]">{dictionary.noRecord} {selectedDateKey}</p>
                <Link className="mt-4 inline-flex rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white" href={`/day/${selectedDateKey}`}>
                  {dictionary.createRecord}
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
