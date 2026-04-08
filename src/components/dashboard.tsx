"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
import { ChevronLeft, ChevronRight, Languages, Moon, Plus, Sun, X } from "lucide-react";
import { useState } from "react";

import { usePreferences } from "@/components/providers";
import { buildMonthlyAnalytics } from "@/lib/analytics";
import { localeOptions } from "@/lib/i18n";
import type { EntryRecord, PublicUser } from "@/lib/types";
import { buildMonthMatrix, cn, getTodayKey, hasGoalCompletion } from "@/lib/utils";

function LogoutButton({ label }: { label: string }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button className="flex w-full rounded-2xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50" onClick={handleLogout} type="button">
      {label}
    </button>
  );
}

function HeaderIconButton({
  ariaLabel,
  children,
  onClick,
}: {
  ariaLabel: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-950"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function formatMonthHeading(monthKey: string, locale: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1, 12);
  const formatted = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date).replace(/\s+de\s+/g, " ");

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatFiveScale(value: number) {
  return `${value.toFixed(1)}/5`;
}

function getMoodSurface(entry?: EntryRecord | null) {
  if (!entry) {
    return "border-transparent bg-transparent";
  }

  if (entry.mood <= 2) {
    return "border-rose-200 bg-rose-50";
  }

  if (entry.mood === 3) {
    return "border-amber-200 bg-amber-50";
  }

  return "border-emerald-200 bg-emerald-50";
}

function getMoodDot(entry?: EntryRecord | null) {
  if (!entry) {
    return "";
  }

  if (entry.mood <= 2) {
    return "bg-rose-400";
  }

  if (entry.mood === 3) {
    return "bg-amber-400";
  }

  return "bg-emerald-400";
}

function getMoodOrb(entry?: EntryRecord | null) {
  if (!entry) {
    return "bg-transparent";
  }

  if (entry.mood <= 2) {
    return "bg-rose-400";
  }

  if (entry.mood === 3) {
    return "bg-amber-400";
  }

  return "bg-emerald-400";
}

export function Dashboard({ user, monthKey, entries }: { user: PublicUser; monthKey: string; entries: EntryRecord[] }) {
  const router = useRouter();
  const { locale, theme, dictionary, setLocale, toggleTheme } = usePreferences();
  const analytics = buildMonthlyAnalytics(entries);
  const [activeTab, setActiveTab] = useState<"trends" | "sleep" | "profile" | "goals">("trends");
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [isLocaleMenuOpen, setIsLocaleMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

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

  const summaryCards = [
    {
      eyebrow: "MOOD",
      emoji: "😊",
      iconClass: "bg-emerald-100 text-emerald-700",
      label: dictionary.avgMood,
      value: formatFiveScale(analytics.summary.avgMood),
    },
    {
      eyebrow: "MIND",
      emoji: "🧠",
      iconClass: "bg-sky-100 text-sky-700",
      label: dictionary.avgMental,
      value: formatFiveScale(analytics.summary.avgMental),
    },
    {
      eyebrow: "BODY",
      emoji: "💪",
      iconClass: "bg-amber-100 text-amber-700",
      label: dictionary.avgPhysical,
      value: formatFiveScale(analytics.summary.avgPhysical),
    },
    {
      eyebrow: "SLEEP",
      emoji: "😴",
      iconClass: "bg-violet-100 text-violet-700",
      label: dictionary.avgSleep,
      value: formatFiveScale(analytics.summary.avgSleep),
      subvalue: `${analytics.summary.avgSleepHours.toFixed(1)}h ${dictionary.avgSleepHours.replace(/^h\s*/, "")}`,
    },
    {
      eyebrow: "GOAL",
      emoji: "🏃",
      iconClass: "bg-emerald-100 text-emerald-700",
      label: dictionary.exercise,
      value: `${analytics.summary.exerciseCompletion}%`,
      subvalue: dictionary.daysAchieved,
    },
    {
      eyebrow: "FOOD",
      emoji: "🍽️",
      iconClass: "bg-amber-100 text-amber-700",
      label: dictionary.food,
      value: `${analytics.summary.nutritionCompletion}%`,
      subvalue: dictionary.daysAchieved,
    },
  ] as const;

  const chartTitle =
    activeTab === "trends"
      ? dictionary.dailyRatings
      : activeTab === "sleep"
        ? dictionary.sleepHoursPerDay
        : activeTab === "profile"
          ? dictionary.wellnessProfile
          : dictionary.goalsCompletion;

  return (
    <main className="min-h-screen w-full bg-[#f5f7fc] px-4 py-4 text-slate-900 sm:px-6 lg:px-8">
      <section className="relative mx-auto max-w-4xl overflow-hidden py-3 md:py-6">
        <header className="relative mb-8 flex flex-col gap-5 border-b border-slate-200 pb-6 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-semibold text-slate-950 md:text-4xl">{dictionary.appName}</h1>
            <p className="mt-2 text-lg text-slate-500">{dictionary.appSubtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <HeaderIconButton ariaLabel={theme === "dark" ? dictionary.lightMode : dictionary.darkMode} onClick={toggleTheme}>
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </HeaderIconButton>

            <div className="relative">
              <HeaderIconButton
                ariaLabel={dictionary.language}
                onClick={() => {
                  setIsLocaleMenuOpen((current) => !current);
                  setIsProfileMenuOpen(false);
                }}
              >
                <Languages size={18} />
              </HeaderIconButton>
              {isLocaleMenuOpen ? (
                <div className="absolute right-0 z-20 mt-2 min-w-44 rounded-[1.25rem] border border-slate-200 bg-white p-2 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
                  {localeOptions.map((option) => (
                    <button
                      key={option.code}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm transition",
                        locale === option.code ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50",
                      )}
                      onClick={() => {
                        setLocale(option.code);
                        setIsLocaleMenuOpen(false);
                      }}
                      type="button"
                    >
                      <span className="text-xs font-semibold uppercase tracking-[0.2em]">{option.flag}</span>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <Link
              className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--primary)] px-4 text-sm font-semibold text-white shadow-[0_16px_40px_-24px_rgba(29,78,216,0.95)] transition hover:translate-y-[-1px]"
              href={`/day/${todayKey}`}
            >
              <Plus size={18} />
              {dictionary.today}
            </Link>

            <div className="relative">
              <button
                aria-label={user.name}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-bold text-[var(--primary)] transition hover:border-slate-300 hover:bg-white"
                onClick={() => {
                  setIsProfileMenuOpen((current) => !current);
                  setIsLocaleMenuOpen(false);
                }}
                type="button"
              >
                {user.name.charAt(0).toUpperCase()}
              </button>
              {isProfileMenuOpen ? (
                <div className="absolute right-0 z-20 mt-2 min-w-56 rounded-[1.25rem] border border-slate-200 bg-white p-2 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
                  <div className="rounded-2xl px-3 py-2 text-sm text-slate-500">
                    <p className="font-semibold text-slate-950">{user.name}</p>
                    <p className="mt-1 text-xs">{user.email}</p>
                  </div>
                  {user.role === "admin" ? (
                    <Link
                      className="mt-1 flex rounded-2xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                      href="/admin/users"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      {dictionary.manageUsers}
                    </Link>
                  ) : null}
                  <div className="mt-1">
                    <LogoutButton label={dictionary.logout} />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="relative space-y-10">
          <section className="rounded-[2rem] bg-transparent p-2 md:p-0">
            <div className="mb-7 flex items-center justify-between gap-4">
              <button className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-700 transition hover:bg-white hover:text-slate-950" onClick={() => navigateMonth(-1)} type="button">
                <ChevronLeft size={18} />
              </button>
              <h2 className="font-heading text-center text-3xl font-semibold text-slate-950 md:text-4xl">{formatMonthHeading(monthKey, locale)}</h2>
              <button className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-700 transition hover:bg-white hover:text-slate-950" onClick={() => navigateMonth(1)} type="button">
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-y-5 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 md:text-sm">
                {dictionary.weekdays.map((weekday) => (
                  <div key={weekday} className="py-2">{weekday}</div>
                ))}
              </div>

              <div className="mt-2 grid grid-cols-7 gap-x-1 gap-y-6 md:gap-y-7">
                {days.map((day) => {
                  const dateKey = format(day, "yyyy-MM-dd");
                  const entry = entryMap.get(dateKey);
                  const isCurrentMonth = dateKey.startsWith(monthKey);
                  const isActiveDay = dateKey === todayKey || dateKey === selectedDateKey;

                  return (
                    <button
                      key={dateKey}
                      className={cn(
                        "flex min-h-24 flex-col items-center justify-start rounded-[1.8rem] border px-2 py-3 text-center transition md:min-h-28",
                        isCurrentMonth ? "text-slate-950" : "text-slate-300",
                        isActiveDay
                          ? "border-[var(--primary)] bg-white shadow-[0_20px_45px_-28px_rgba(59,130,246,0.45)]"
                          : entry
                            ? "border-transparent bg-transparent"
                            : "border-transparent bg-transparent",
                        !entry && isCurrentMonth ? "hover:bg-white/60" : "",
                      )}
                      onClick={() => setSelectedDateKey(dateKey)}
                      type="button"
                    >
                      <span className={cn("text-2xl font-medium md:text-3xl", isActiveDay ? "text-[var(--primary)]" : "")}>{format(day, "d")}</span>
                      {entry && isActiveDay ? (
                        <div className="mt-2 flex flex-col items-center">
                          <span className={cn("h-8 w-8 rounded-full", getMoodOrb(entry))} />
                          {hasGoalCompletion(entry) ? (
                            <div className="mt-2 flex items-center gap-1.5">
                              {entry.nutritionDone ? <span className="h-2 w-2 rounded-full bg-sky-500" /> : null}
                              {entry.exerciseDone ? <span className="h-2 w-2 rounded-full bg-sky-500" /> : null}
                              {entry.leisureDone ? <span className="h-2 w-2 rounded-full bg-sky-500" /> : null}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
              <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-rose-400" />{dictionary.legendBad}</span>
              <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-400" />{dictionary.legendNormal}</span>
              <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-400" />{dictionary.legendGreat}</span>
              <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-sky-500" />{dictionary.legendGoal}</span>
            </div>
          </section>

          <section>
            <h3 className="font-heading text-4xl font-semibold text-slate-950">{dictionary.monthSummary}</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {summaryCards.map((card) => (
                <article key={card.eyebrow} className="rounded-[1.6rem] border border-slate-200 bg-white px-5 py-4 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.24)]">
                  <div className="flex items-start gap-4">
                    <div className={cn("flex h-12 w-12 items-center justify-center rounded-[1rem] text-xl", card.iconClass)}>{card.emoji}</div>
                    <div>
                      <p className="text-sm text-slate-500">{card.label}</p>
                      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">{card.value}</p>
                      {card.subvalue ? <p className="mt-1 text-sm text-slate-500">{card.subvalue}</p> : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-heading text-4xl font-semibold text-slate-950">{dictionary.monthCharts}</h3>
            <div className="mt-5 rounded-[1.7rem] bg-slate-100 p-1.5">
                {chartTabs.map((tab) => (
                  <button
                    key={tab.key}
                    className={cn(
                      "w-1/4 rounded-full px-4 py-3 text-sm font-medium transition",
                      activeTab === tab.key ? "bg-white text-slate-950 shadow-[0_12px_30px_-22px_rgba(15,23,42,0.35)]" : "text-slate-500 hover:text-slate-700",
                    )}
                    onClick={() => setActiveTab(tab.key)}
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
            </div>

            <div className="mt-5 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.3)]">
              <p className="text-sm font-medium text-slate-500">{chartTitle}</p>
              <div className="mt-4 h-80 min-w-0">
                {entries.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 text-center">
                    <h3 className="font-heading text-2xl text-slate-950">{dictionary.monthEmptyTitle}</h3>
                    <p className="mt-3 max-w-sm text-sm text-slate-500">{dictionary.monthEmptyBody}</p>
                  </div>
                ) : activeTab === "trends" ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.trends}>
                      <CartesianGrid stroke="#dbe4f0" strokeDasharray="3 3" vertical={true} />
                      <XAxis dataKey="day" stroke="#94a3b8" tickLine={false} axisLine={false} />
                      <YAxis domain={[1, 5]} stroke="#94a3b8" tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 20px 50px -30px rgba(15,23,42,0.3)" }} />
                      <Legend iconType="circle" />
                      <Line dataKey="mood" name={dictionary.chartMood} stroke="#2f80ed" strokeWidth={2.4} type="monotone" dot={{ r: 4, fill: "#2f80ed", strokeWidth: 0 }} />
                      <Line dataKey="mental" name={dictionary.chartMental} stroke="#48a8f0" strokeWidth={2.1} type="monotone" dot={{ r: 4, fill: "#48a8f0", strokeWidth: 0 }} />
                      <Line dataKey="physical" name={dictionary.chartPhysical} stroke="#ebb529" strokeWidth={2.1} type="monotone" dot={{ r: 4, fill: "#ebb529", strokeWidth: 0 }} />
                      <Line dataKey="sleep" name={dictionary.chartSleep} stroke="#8b5cf6" strokeWidth={2.1} type="monotone" dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : activeTab === "sleep" ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.sleep}>
                      <CartesianGrid stroke="#dbe4f0" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day" stroke="#94a3b8" tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 20px 50px -30px rgba(15,23,42,0.3)" }} />
                      <Bar dataKey="hours" name={dictionary.chartHours} fill="#60a5fa" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : activeTab === "profile" ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" data={analytics.profile} outerRadius="70%">
                      <PolarGrid stroke="#dbe4f0" />
                      <PolarAngleAxis dataKey="metric" />
                      <Radar dataKey="value" fill="#60a5fa" fillOpacity={0.45} stroke="#2f80ed" />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.goals} layout="vertical">
                      <CartesianGrid stroke="#dbe4f0" strokeDasharray="3 3" horizontal={false} />
                      <XAxis domain={[0, 100]} stroke="#94a3b8" tickLine={false} axisLine={false} type="number" />
                      <YAxis dataKey="metric" stroke="#94a3b8" tickLine={false} axisLine={false} type="category" width={80} />
                      <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 20px 50px -30px rgba(15,23,42,0.3)" }} />
                      <Bar dataKey="value" fill="#d5b36a" radius={[0, 10, 10, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              {activeTab === "sleep" ? (
                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-[1.25rem] bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{dictionary.average}</p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">{analytics.summary.avgSleepHours}</p>
                  </div>
                  <div className="rounded-[1.25rem] bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{dictionary.maximum}</p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">{analytics.summary.sleepMax}</p>
                  </div>
                  <div className="rounded-[1.25rem] bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{dictionary.minimum}</p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">{analytics.summary.sleepMin}</p>
                  </div>
                </div>
              ) : null}
            </div>

          </section>
        </div>
      </section>

      {selectedDateKey ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/45 backdrop-blur-sm" onClick={() => setSelectedDateKey(null)}>
          <div className="w-full max-w-4xl rounded-t-[2rem] border border-slate-200 bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mx-auto mb-5 h-1.5 w-20 rounded-full bg-slate-200" />
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="font-heading text-sm uppercase tracking-[0.3em] text-[var(--accent)]">{dictionary.quickView}</p>
                <h3 className="font-heading mt-2 text-3xl font-semibold text-slate-950">{selectedDateKey}</h3>
              </div>
              <button className="rounded-2xl border border-slate-200 p-3 text-slate-500 hover:border-slate-300 hover:text-slate-900" onClick={() => setSelectedDateKey(null)} type="button">
                <X size={18} />
              </button>
            </div>

            {selectedEntry ? (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="rounded-[1.5rem] bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">{dictionary.mood}</p>
                    <p className="mt-3 text-2xl font-semibold text-slate-950">{dictionary.moodLabels[selectedEntry.mood]}</p>
                  </div>
                  <div className="rounded-[1.5rem] bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">{dictionary.mentalState}</p>
                    <p className="mt-3 text-2xl font-semibold text-slate-950">{selectedEntry.mentalState}/5</p>
                  </div>
                  <div className="rounded-[1.5rem] bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">{dictionary.physicalState}</p>
                    <p className="mt-3 text-2xl font-semibold text-slate-950">{selectedEntry.physicalState}/5</p>
                  </div>
                  <div className="rounded-[1.5rem] bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">{dictionary.sleepHoursLabel}</p>
                    <p className="mt-3 text-2xl font-semibold text-slate-950">{selectedEntry.sleepHours}h</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-[1.5rem] bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">{dictionary.completedGoals}</p>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3"><span>{dictionary.foodGoal}</span><span>{selectedEntry.nutritionDone ? "✓" : "—"}</span></div>
                      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3"><span>{dictionary.exerciseGoal}</span><span>{selectedEntry.exerciseDone ? "✓" : "—"}</span></div>
                      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3"><span>{dictionary.leisureGoal}</span><span>{selectedEntry.leisureDone ? "✓" : "—"}</span></div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[1.5rem] bg-slate-50 p-4 text-sm text-slate-500">
                      <p>{dictionary.exerciseDetail}: {selectedEntry.exerciseDone ? `${selectedEntry.exerciseType ?? dictionary.exercise} · ${selectedEntry.exerciseMinutes ?? 0} ${dictionary.minutes}` : "-"}</p>
                      <p className="mt-2">{dictionary.leisureDetail}: {selectedEntry.leisureDone ? selectedEntry.leisureActivity ?? dictionary.leisure : "-"}</p>
                      <p className="mt-2">{dictionary.notesDetail}: {selectedEntry.notes || "-"}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Link className="inline-flex rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white" href={`/day/${selectedDateKey}`}>
                        {dictionary.editRecord}
                      </Link>
                      <button className="inline-flex rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-500 hover:border-slate-300 hover:text-slate-900" onClick={() => setSelectedDateKey(null)} type="button">
                        {dictionary.close}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-5">
                <p className="text-sm text-slate-500">{dictionary.noRecord} {selectedDateKey}</p>
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
