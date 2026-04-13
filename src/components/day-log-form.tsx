"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";

import { usePreferences } from "@/components/providers";
import { cn } from "@/lib/utils";
import type { EntryRecord } from "@/lib/types";

const LOCALE_TAGS = {
  es: "es-ES",
  en: "en-GB",
  fr: "fr-FR",
  ru: "ru-RU",
} as const;

const SCALE_EMOJIS = ["😞", "😟", "😐", "🙂", "😊"];
const SLEEP_EMOJIS = ["😫", "😪", "😐", "😌", "💤"];
const SLEEP_LEVEL_EMOJIS = ["🌑", "🌒", "🌓", "🌔", "🌕"];
const PHYSICAL_EMOJIS = ["🛌", "😓", "🙂", "💪", "🔥"];

function formatDateLabel(dateKey: string, locale: keyof typeof LOCALE_TAGS) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);

  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function RatingInput({
  label,
  value,
  onChange,
  labels,
  emojis,
  accent,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  labels: string[];
  emojis: string[];
  accent: "emerald" | "amber";
}) {
  const selectedLabel = labels[value] ?? "";

  const activeClass =
    accent === "amber"
      ? "border-amber-300 bg-amber-50 text-amber-950 shadow-[0_20px_50px_-30px_rgba(217,119,6,0.7)]"
      : "border-emerald-300 bg-emerald-50 text-emerald-950 shadow-[0_20px_50px_-30px_rgba(16,185,129,0.75)]";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-900">{label}</span>
        <span className={cn("text-sm font-medium", accent === "amber" ? "text-amber-700" : "text-emerald-700")}>{selectedLabel}</span>
      </div>
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {[1, 2, 3, 4, 5].map((item, index) => (
          <button
            key={item}
            className={cn(
              "flex min-h-24 flex-col items-center justify-center rounded-[1.25rem] border px-2 py-3 text-center transition sm:min-h-28",
              item === value
                ? activeClass
                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white",
            )}
            onClick={() => onChange(item)}
            type="button"
          >
            <span className="text-2xl">{emojis[index]}</span>
            <span className="mt-2 text-[11px] font-medium leading-tight sm:text-xs">{labels[item]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function DayLogForm({ dateKey, entry }: { dateKey: string; entry: EntryRecord | null }) {
  const router = useRouter();
  const { dictionary, locale } = usePreferences();
  const [form, setForm] = useState({
    mood: entry?.mood ?? 3,
    mentalState: entry?.mentalState ?? 3,
    physicalState: entry?.physicalState ?? 3,
    sleepQuality: entry?.sleepQuality ?? 3,
    sleepLevel: entry?.sleepLevel ?? 3,
    sleepHours: entry?.sleepHours ?? 7,
    nutritionDone: entry?.nutritionDone ?? false,
    exerciseDone: entry?.exerciseDone ?? false,
    exerciseType: entry?.exerciseType ?? "",
    exerciseMinutes: entry?.exerciseMinutes ?? 30,
    leisureDone: entry?.leisureDone ?? false,
    leisureActivity: entry?.leisureActivity ?? "",
    notes: entry?.notes ?? "",
  });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const formattedDate = formatDateLabel(dateKey, locale);

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateKey, ...form }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };

    if (!response.ok) {
      setError(payload.error ?? "No se pudo guardar el registro.");
      setPending(false);
      return;
    }

    setMessage(payload.message ?? dictionary.saved);
    router.push(`/?month=${dateKey.slice(0, 7)}`);
    router.refresh();
  }

  async function handleDelete() {
    if (!entry) {
      return;
    }

    setPending(true);
    setError(null);

    const response = await fetch(`/api/entries?dateKey=${dateKey}`, { method: "DELETE" });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };

    if (!response.ok) {
      setError(payload.error ?? "No se pudo eliminar el registro.");
      setPending(false);
      return;
    }

    router.push(`/?month=${dateKey.slice(0, 7)}`);
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-5 text-slate-900 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_40%),linear-gradient(180deg,_#f8fbff_0%,_#eef4fb_100%)] p-3 sm:p-5">
        <form className="mx-auto max-w-2xl space-y-5" onSubmit={handleSave}>
          <header className="rounded-[2rem] border border-white/80 bg-white/90 px-5 py-5 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.4)] backdrop-blur">
            <Link
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-slate-300 hover:bg-white hover:text-slate-900"
              href={`/?month=${dateKey.slice(0, 7)}`}
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="sr-only">{dictionary.backToDashboard}</span>
            </Link>
            <div className="mt-5 space-y-1">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{dictionary.dailyLog}</h1>
              <p className="text-sm text-slate-500">{formattedDate}</p>
            </div>
          </header>

          <section className="rounded-[2rem] border border-white/70 bg-white px-5 py-5 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.35)]">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-950">{dictionary.howAreYou}</h2>
            </div>
            <div className="space-y-5">
              <RatingInput
                accent="emerald"
                emojis={SCALE_EMOJIS}
                label={dictionary.mood}
                labels={dictionary.moodLabels}
                onChange={(value) => updateField("mood", value)}
                value={form.mood}
              />
              <RatingInput
                accent="emerald"
                emojis={SCALE_EMOJIS}
                label={dictionary.mentalState}
                labels={dictionary.moodLabels}
                onChange={(value) => updateField("mentalState", value)}
                value={form.mentalState}
              />
              <RatingInput
                accent="amber"
                emojis={PHYSICAL_EMOJIS}
                label={dictionary.physicalState}
                labels={dictionary.moodLabels}
                onChange={(value) => updateField("physicalState", value)}
                value={form.physicalState}
              />
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/70 bg-white px-5 py-5 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.35)]">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-950">{dictionary.sleep}</h2>
            </div>
            <div className="space-y-5">
              <RatingInput
                accent="emerald"
                emojis={SLEEP_EMOJIS}
                label={dictionary.sleepQuality}
                labels={dictionary.moodLabels}
                onChange={(value) => updateField("sleepQuality", value)}
                value={form.sleepQuality}
              />

              <RatingInput
                accent="emerald"
                emojis={SLEEP_LEVEL_EMOJIS}
                label={dictionary.sleepLevel}
                labels={dictionary.sleepLevelLabels}
                onChange={(value) => updateField("sleepLevel", value)}
                value={form.sleepLevel}
              />

              <label className="block rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                <span className="text-sm font-medium text-slate-700">{dictionary.sleepHours}</span>
                <div className="mt-3 flex items-end gap-3">
                  <input
                    className="w-[6ch] min-w-[6ch] border-none bg-transparent text-3xl font-semibold text-slate-950 outline-none"
                    min="0"
                    step="0.1"
                    type="number"
                    value={form.sleepHours}
                    onChange={(event) => updateField("sleepHours", Number(event.target.value))}
                  />
                  <span className="pb-1 text-sm text-slate-500">h</span>
                </div>
              </label>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/70 bg-white px-5 py-5 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.35)]">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-950">{dictionary.dailyGoals}</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <button
                className={cn(
                  "flex min-h-28 flex-col items-center justify-center rounded-[1.5rem] border px-4 py-4 text-center transition",
                  form.nutritionDone
                    ? "border-emerald-300 bg-emerald-50 text-emerald-950 shadow-[0_20px_50px_-30px_rgba(16,185,129,0.8)]"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white",
                )}
                onClick={() => updateField("nutritionDone", !form.nutritionDone)}
                type="button"
              >
                <span className="text-3xl">🍽️</span>
                <span className="mt-3 text-sm font-semibold">{dictionary.nutrition}</span>
              </button>

              <button
                className={cn(
                  "flex min-h-28 flex-col items-center justify-center rounded-[1.5rem] border px-4 py-4 text-center transition",
                  form.exerciseDone
                    ? "border-amber-300 bg-amber-50 text-amber-950 shadow-[0_20px_50px_-30px_rgba(217,119,6,0.8)]"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white",
                )}
                onClick={() => updateField("exerciseDone", !form.exerciseDone)}
                type="button"
              >
                <span className="text-3xl">🏃</span>
                <span className="mt-3 text-sm font-semibold">{dictionary.exerciseDone}</span>
              </button>

              <button
                className={cn(
                  "flex min-h-28 flex-col items-center justify-center rounded-[1.5rem] border px-4 py-4 text-center transition",
                  form.leisureDone
                    ? "border-sky-300 bg-sky-50 text-sky-950 shadow-[0_20px_50px_-30px_rgba(14,165,233,0.7)]"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white",
                )}
                onClick={() => updateField("leisureDone", !form.leisureDone)}
                type="button"
              >
                <span className="text-3xl">🎨</span>
                <span className="mt-3 text-sm font-semibold">{dictionary.leisureDone}</span>
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {form.exerciseDone ? (
                <div className="grid gap-3 rounded-[1.5rem] border border-amber-100 bg-amber-50/80 p-4 sm:grid-cols-[1.6fr_0.8fr]">
                  <input
                    className="rounded-[1rem] border border-white bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-300"
                    placeholder={dictionary.exercisePlaceholder}
                    value={form.exerciseType}
                    onChange={(event) => updateField("exerciseType", event.target.value)}
                  />
                  <div className="flex items-center rounded-[1rem] border border-white bg-white px-4 py-3">
                    <input
                      className="w-full border-none bg-transparent text-sm text-slate-900 outline-none"
                      min="0"
                      type="number"
                      value={form.exerciseMinutes}
                      onChange={(event) => updateField("exerciseMinutes", Number(event.target.value))}
                    />
                    <span className="text-sm text-slate-500">{dictionary.minutes}</span>
                  </div>
                </div>
              ) : null}

              {form.leisureDone ? (
                <div className="rounded-[1.5rem] border border-sky-100 bg-sky-50/80 p-4">
                  <input
                    className="w-full rounded-[1rem] border border-white bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300"
                    placeholder={dictionary.leisurePlaceholder}
                    value={form.leisureActivity}
                    onChange={(event) => updateField("leisureActivity", event.target.value)}
                  />
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/70 bg-white px-5 py-5 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.35)]">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-950">{dictionary.notes}</h2>
            </div>
            <textarea
              className="min-h-36 w-full resize-y rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
              placeholder={dictionary.notesPlaceholder}
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
            />
          </section>

          {error ? <p className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
          {message ? <p className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}

          <div className="space-y-3 pb-2">
            <button
              className="flex w-full items-center justify-center rounded-[1.5rem] bg-[linear-gradient(135deg,#10233f_0%,#1b4a8f_100%)] px-5 py-4 text-sm font-semibold text-white shadow-[0_28px_60px_-28px_rgba(16,35,63,0.9)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
              disabled={pending}
              type="submit"
            >
              {pending ? dictionary.saving : dictionary.save}
            </button>
            {entry ? (
              <button
                className="w-full rounded-[1.5rem] border border-rose-200 bg-white px-5 py-4 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={pending}
                onClick={handleDelete}
                type="button"
              >
                {dictionary.deleteRecord}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </main>
  );
}
