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
import { Check, ChevronDown, ChevronLeft, ChevronRight, Languages, Moon, Plus, Sun, X } from "lucide-react";
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
    <button
      className="flex w-full rounded-2xl px-3 py-2 text-left text-sm text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--text)]"
      onClick={handleLogout}
      type="button"
    >
      {label}
    </button>
  );
}

function HeaderControlButton({
  ariaLabel,
  children,
  label,
  onClick,
  expanded = false,
}: {
  ariaLabel: string;
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  expanded?: boolean;
}) {
  return (
    <button
      aria-label={ariaLabel}
      aria-expanded={expanded}
      className="inline-flex h-11 items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-[var(--surface-strong)] px-4 text-sm font-medium text-[var(--muted)] shadow-[0_12px_32px_-24px_rgba(15,23,42,0.3)] transition hover:-translate-y-0.5 hover:text-[var(--text)]"
      onClick={onClick}
      type="button"
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
      {expanded ? <ChevronDown size={16} className="hidden sm:inline" /> : null}
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
  const selectedLocale = localeOptions.find((option) => option.code === locale) ?? localeOptions[0];
  const themeLabel = theme === "dark" ? dictionary.lightMode : dictionary.darkMode;
  const chartTextColor = theme === "dark" ? "#eef4ff" : "#0f172a";
  const chartMutedColor = theme === "dark" ? "#a9b7d0" : "#64748b";
  const chartGridColor = theme === "dark" ? "rgba(169, 183, 208, 0.14)" : "rgba(148, 163, 184, 0.22)";

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
      subvalue: undefined as string | undefined,
    },
    {
      eyebrow: "MIND",
      emoji: "🧠",
      iconClass: "bg-sky-100 text-sky-700",
      label: dictionary.avgMental,
      value: formatFiveScale(analytics.summary.avgMental),
      subvalue: undefined as string | undefined,
    },
    {
      eyebrow: "BODY",
      emoji: "💪",
      iconClass: "bg-amber-100 text-amber-700",
      label: dictionary.avgPhysical,
      value: formatFiveScale(analytics.summary.avgPhysical),
      subvalue: undefined as string | undefined,
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
    <main className="relative min-h-screen w-full overflow-hidden bg-[var(--bg)] px-4 py-4 text-[var(--text)] sm:px-6 lg:px-8">
      <div className="mesh-overlay" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.18),transparent_55%)]" />
      <section className="relative mx-auto max-w-5xl overflow-hidden py-3 md:py-6">
        <header className="glass-panel relative mb-8 flex flex-col gap-5 rounded-[2rem] p-5 md:flex-row md:items-start md:justify-between md:p-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">Wellness</p>
            <h1 className="font-heading text-3xl font-semibold text-[var(--text)] md:text-4xl">{dictionary.appName}</h1>
            <p className="mt-2 text-lg text-[var(--muted)]">{dictionary.appSubtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <HeaderControlButton ariaLabel={themeLabel} label={themeLabel} onClick={toggleTheme}>
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </HeaderControlButton>

            <div className="relative">
              <HeaderControlButton
                ariaLabel={dictionary.language}
                expanded
                label={`${selectedLocale.flag} ${selectedLocale.label}`}
                onClick={() => {
                  setIsLocaleMenuOpen((current) => !current);
                  setIsProfileMenuOpen(false);
                }}
              >
                <Languages size={18} />
              </HeaderControlButton>
              {isLocaleMenuOpen ? (
                <div className="absolute right-0 z-20 mt-2 min-w-52 rounded-[1.25rem] border border-[color:var(--surface-border)] bg-[var(--surface-strong)] p-2 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl">
                  {localeOptions.map((option) => (
                    <button
                      key={option.code}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm transition",
                        locale === option.code
                          ? "bg-[var(--primary)] text-white"
                          : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]",
                      )}
                      onClick={() => {
                        setLocale(option.code);
                        setIsLocaleMenuOpen(false);
                      }}
                      type="button"
                    >
                      <span className="text-xs font-semibold uppercase tracking-[0.2em]">{option.flag}</span>
                      <span>{option.label}</span>
                      {locale === option.code ? <Check size={15} className="ml-auto" /> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <Link
              className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--primary)] px-4 text-sm font-semibold text-white shadow-[0_16px_40px_-24px_rgba(29,78,216,0.95)] transition hover:-translate-y-0.5"
              href={`/day/${todayKey}`}
            >
              <Plus size={18} />
              {dictionary.today}
            </Link>

            <div className="relative">
              <HeaderControlButton
                ariaLabel={user.name}
                expanded
                label={user.name}
                onClick={() => {
                  setIsProfileMenuOpen((current) => !current);
                  setIsLocaleMenuOpen(false);
                }}
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--primary)_18%,transparent)] text-xs font-bold text-[var(--primary)]">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </HeaderControlButton>
              {isProfileMenuOpen ? (
                <div className="absolute right-0 z-20 mt-2 min-w-64 rounded-[1.25rem] border border-[color:var(--surface-border)] bg-[var(--surface-strong)] p-2 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl">
                  <div className="rounded-2xl px-3 py-2 text-sm text-[var(--muted)]">
                    <p className="font-semibold text-[var(--text)]">{user.name}</p>
                    <p className="mt-1 text-xs">{user.email}</p>
                  </div>
                  {user.role === "admin" ? (
                    <Link
                      className="mt-1 flex rounded-2xl px-3 py-2 text-sm text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--text)]"
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
          <section className="glass-panel rounded-[2rem] p-4 md:p-6">
            <div className="mb-7 flex items-center justify-between gap-4">
              <button className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface-strong)] hover:text-[var(--text)]" onClick={() => navigateMonth(-1)} type="button">
                <ChevronLeft size={18} />
              </button>
              <h2 className="font-heading text-center text-3xl font-semibold text-[var(--text)] md:text-4xl">{formatMonthHeading(monthKey, locale)}</h2>
              <button className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface-strong)] hover:text-[var(--text)]" onClick={() => navigateMonth(1)} type="button">
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-y-5 text-center text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)] md:text-sm">
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
                        isCurrentMonth ? "text-[var(--text)]" : "text-[color:color-mix(in_srgb,var(--muted)_45%,transparent)]",
                        isActiveDay
                          ? "border-[var(--primary)] bg-[var(--surface-strong)] shadow-[0_20px_45px_-28px_rgba(59,130,246,0.45)]"
                          : entry
                            ? "border-transparent bg-transparent"
                            : "border-transparent bg-transparent",
                        !entry && isCurrentMonth ? "hover:bg-[color:color-mix(in_srgb,var(--surface-strong)_70%,transparent)]" : "",
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

            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-[var(--muted)]">
              <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-rose-400" />{dictionary.legendBad}</span>
              <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-400" />{dictionary.legendNormal}</span>
              <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-400" />{dictionary.legendGreat}</span>
              <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-sky-500" />{dictionary.legendGoal}</span>
            </div>
          </section>

          <section>
            <h3 className="font-heading text-4xl font-semibold text-[var(--text)]">{dictionary.monthSummary}</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {summaryCards.map((card) => (
                <article key={card.eyebrow} className="glass-panel rounded-[1.6rem] px-5 py-4">
                  <div className="flex items-start gap-4">
                    <div className={cn("flex h-12 w-12 items-center justify-center rounded-[1rem] text-xl", card.iconClass)}>{card.emoji}</div>
                    <div>
                      <p className="text-sm text-[var(--muted)]">{card.label}</p>
                      <p className="mt-1 text-2xl font-semibold tracking-tight text-[var(--text)] md:text-3xl">{card.value}</p>
                      {card.subvalue ? <p className="mt-1 text-sm text-[var(--muted)]">{card.subvalue}</p> : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-heading text-4xl font-semibold text-[var(--text)]">{dictionary.monthCharts}</h3>
            <div className="mt-5 flex flex-wrap gap-2 rounded-[1.7rem] border border-[color:var(--surface-border)] bg-[color:color-mix(in_srgb,var(--surface)_88%,transparent)] p-1.5">
                {chartTabs.map((tab) => (
                  <button
                    key={tab.key}
                    className={cn(
                      "min-w-[calc(50%-0.25rem)] flex-1 rounded-full px-4 py-3 text-sm font-medium transition md:min-w-0",
                      activeTab === tab.key
                        ? "bg-[var(--surface-strong)] text-[var(--text)] shadow-[0_12px_30px_-22px_rgba(15,23,42,0.35)]"
                        : "text-[var(--muted)] hover:text-[var(--text)]",
                    )}
                    onClick={() => setActiveTab(tab.key)}
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
            </div>

            <div className="glass-panel mt-5 rounded-[2rem] p-5">
              <p className="text-sm font-medium text-[var(--muted)]">{chartTitle}</p>
              <div className="mt-4 h-80 min-w-0">
                {entries.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-[color:var(--surface-border)] bg-[color:color-mix(in_srgb,var(--surface)_75%,transparent)] text-center">
                    <h3 className="font-heading text-2xl text-[var(--text)]">{dictionary.monthEmptyTitle}</h3>
                    <p className="mt-3 max-w-sm text-sm text-[var(--muted)]">{dictionary.monthEmptyBody}</p>
                  </div>
                ) : activeTab === "trends" ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.trends}>
                      <CartesianGrid stroke={chartGridColor} strokeDasharray="3 3" vertical={true} />
                      <XAxis dataKey="day" stroke={chartMutedColor} tickLine={false} axisLine={false} />
                      <YAxis domain={[1, 5]} stroke={chartMutedColor} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid var(--surface-border)", background: "var(--surface-strong)", color: "var(--text)", boxShadow: "0 20px 50px -30px rgba(15,23,42,0.3)" }} />
                      <Legend iconType="circle" wrapperStyle={{ color: chartTextColor }} />
                      <Line dataKey="mood" name={dictionary.chartMood} stroke="#2f80ed" strokeWidth={2.4} type="monotone" dot={{ r: 4, fill: "#2f80ed", strokeWidth: 0 }} />
                      <Line dataKey="mental" name={dictionary.chartMental} stroke="#48a8f0" strokeWidth={2.1} type="monotone" dot={{ r: 4, fill: "#48a8f0", strokeWidth: 0 }} />
                      <Line dataKey="physical" name={dictionary.chartPhysical} stroke="#ebb529" strokeWidth={2.1} type="monotone" dot={{ r: 4, fill: "#ebb529", strokeWidth: 0 }} />
                      <Line dataKey="sleep" name={dictionary.chartSleep} stroke="#8b5cf6" strokeWidth={2.1} type="monotone" dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : activeTab === "sleep" ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.sleep}>
                      <CartesianGrid stroke={chartGridColor} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day" stroke={chartMutedColor} tickLine={false} axisLine={false} />
                      <YAxis stroke={chartMutedColor} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid var(--surface-border)", background: "var(--surface-strong)", color: "var(--text)", boxShadow: "0 20px 50px -30px rgba(15,23,42,0.3)" }} />
                      <Bar dataKey="hours" name={dictionary.chartHours} fill="#60a5fa" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : activeTab === "profile" ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" data={analytics.profile} outerRadius="70%">
                      <PolarGrid stroke={chartGridColor} />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: chartTextColor, fontSize: 12 }} />
                      <Radar dataKey="value" fill="#60a5fa" fillOpacity={0.45} stroke="#2f80ed" />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.goals} layout="vertical">
                      <CartesianGrid stroke={chartGridColor} strokeDasharray="3 3" horizontal={false} />
                      <XAxis domain={[0, 100]} stroke={chartMutedColor} tickLine={false} axisLine={false} type="number" />
                      <YAxis dataKey="metric" stroke={chartMutedColor} tickLine={false} axisLine={false} type="category" width={80} />
                      <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid var(--surface-border)", background: "var(--surface-strong)", color: "var(--text)", boxShadow: "0 20px 50px -30px rgba(15,23,42,0.3)" }} />
                      <Bar dataKey="value" fill="#d5b36a" radius={[0, 10, 10, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              {activeTab === "sleep" ? (
                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-[1.25rem] bg-[color:color-mix(in_srgb,var(--surface)_75%,transparent)] p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{dictionary.average}</p>
                    <p className="mt-2 text-xl font-semibold text-[var(--text)]">{analytics.summary.avgSleepHours}</p>
                  </div>
                  <div className="rounded-[1.25rem] bg-[color:color-mix(in_srgb,var(--surface)_75%,transparent)] p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{dictionary.maximum}</p>
                    <p className="mt-2 text-xl font-semibold text-[var(--text)]">{analytics.summary.sleepMax}</p>
                  </div>
                  <div className="rounded-[1.25rem] bg-[color:color-mix(in_srgb,var(--surface)_75%,transparent)] p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{dictionary.minimum}</p>
                    <p className="mt-2 text-xl font-semibold text-[var(--text)]">{analytics.summary.sleepMin}</p>
                  </div>
                </div>
              ) : null}
            </div>

          </section>
        </div>
      </section>

      {selectedDateKey ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-[rgba(2,8,23,0.52)] backdrop-blur-sm" onClick={() => setSelectedDateKey(null)}>
          <div className="glass-panel w-full max-w-4xl rounded-t-[2rem] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mx-auto mb-5 h-1.5 w-20 rounded-full bg-[color:color-mix(in_srgb,var(--muted)_35%,transparent)]" />
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="font-heading text-sm uppercase tracking-[0.3em] text-[var(--accent)]">{dictionary.quickView}</p>
                <h3 className="font-heading mt-2 text-3xl font-semibold text-[var(--text)]">{selectedDateKey}</h3>
              </div>
              <button className="rounded-2xl border border-[color:var(--surface-border)] p-3 text-[var(--muted)] hover:text-[var(--text)]" onClick={() => setSelectedDateKey(null)} type="button">
                <X size={18} />
              </button>
            </div>

            {selectedEntry ? (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="rounded-[1.5rem] bg-[color:color-mix(in_srgb,var(--surface)_75%,transparent)] p-4">
                    <p className="text-sm text-[var(--muted)]">{dictionary.mood}</p>
                    <p className="mt-3 text-2xl font-semibold text-[var(--text)]">{dictionary.moodLabels[selectedEntry.mood]}</p>
                  </div>
                  <div className="rounded-[1.5rem] bg-[color:color-mix(in_srgb,var(--surface)_75%,transparent)] p-4">
                    <p className="text-sm text-[var(--muted)]">{dictionary.mentalState}</p>
                    <p className="mt-3 text-2xl font-semibold text-[var(--text)]">{selectedEntry.mentalState}/5</p>
                  </div>
                  <div className="rounded-[1.5rem] bg-[color:color-mix(in_srgb,var(--surface)_75%,transparent)] p-4">
                    <p className="text-sm text-[var(--muted)]">{dictionary.physicalState}</p>
                    <p className="mt-3 text-2xl font-semibold text-[var(--text)]">{selectedEntry.physicalState}/5</p>
                  </div>
                  <div className="rounded-[1.5rem] bg-[color:color-mix(in_srgb,var(--surface)_75%,transparent)] p-4">
                    <p className="text-sm text-[var(--muted)]">{dictionary.sleepHoursLabel}</p>
                    <p className="mt-3 text-2xl font-semibold text-[var(--text)]">{selectedEntry.sleepHours}h</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-[1.5rem] bg-[color:color-mix(in_srgb,var(--surface)_75%,transparent)] p-4">
                    <p className="text-sm text-[var(--muted)]">{dictionary.completedGoals}</p>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex items-center justify-between rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-strong)] px-4 py-3"><span>{dictionary.foodGoal}</span><span>{selectedEntry.nutritionDone ? "✓" : "—"}</span></div>
                      <div className="flex items-center justify-between rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-strong)] px-4 py-3"><span>{dictionary.exerciseGoal}</span><span>{selectedEntry.exerciseDone ? "✓" : "—"}</span></div>
                      <div className="flex items-center justify-between rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-strong)] px-4 py-3"><span>{dictionary.leisureGoal}</span><span>{selectedEntry.leisureDone ? "✓" : "—"}</span></div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[1.5rem] bg-[color:color-mix(in_srgb,var(--surface)_75%,transparent)] p-4 text-sm text-[var(--muted)]">
                      <p>{dictionary.exerciseDetail}: {selectedEntry.exerciseDone ? `${selectedEntry.exerciseType ?? dictionary.exercise} · ${selectedEntry.exerciseMinutes ?? 0} ${dictionary.minutes}` : "-"}</p>
                      <p className="mt-2">{dictionary.leisureDetail}: {selectedEntry.leisureDone ? selectedEntry.leisureActivity ?? dictionary.leisure : "-"}</p>
                      <p className="mt-2">{dictionary.notesDetail}: {selectedEntry.notes || "-"}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Link className="inline-flex rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white" href={`/day/${selectedDateKey}`}>
                        {dictionary.editRecord}
                      </Link>
                      <button className="inline-flex rounded-2xl border border-[color:var(--surface-border)] px-4 py-3 text-sm text-[var(--muted)] hover:text-[var(--text)]" onClick={() => setSelectedDateKey(null)} type="button">
                        {dictionary.close}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-[color:var(--surface-border)] bg-[color:color-mix(in_srgb,var(--surface)_75%,transparent)] p-5">
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
