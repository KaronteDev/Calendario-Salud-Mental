"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { usePreferences } from "@/components/providers";
import type { EntryRecord } from "@/lib/types";

function RatingInput({
  label,
  value,
  onChange,
  moodLabels,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  moodLabels: string[];
}) {
  return (
    <div className="space-y-3 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <span className="font-medium">{label}</span>
        <span className="text-sm text-[var(--accent)]">{moodLabels[value]}</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((item) => (
          <button
            key={item}
            className={`rounded-2xl border px-0 py-3 text-sm font-semibold transition ${
              item === value
                ? "border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--text)]"
                : "border-white/10 bg-white/5 text-[var(--muted)] hover:border-[var(--primary)]"
            }`}
            onClick={() => onChange(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DayLogForm({ dateKey, entry }: { dateKey: string; entry: EntryRecord | null }) {
  const router = useRouter();
  const { dictionary } = usePreferences();
  const [form, setForm] = useState({
    mood: entry?.mood ?? 3,
    mentalState: entry?.mentalState ?? 3,
    physicalState: entry?.physicalState ?? 3,
    sleepQuality: entry?.sleepQuality ?? 3,
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
    <main className="page-shell mx-auto max-w-5xl">
      <div className="mesh-overlay" />
      <section className="glass-panel relative overflow-hidden rounded-[2rem] p-6 md:p-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-heading text-sm uppercase tracking-[0.3em] text-[var(--accent)]">{dictionary.dailyLog}</p>
            <h1 className="font-heading mt-2 text-4xl font-semibold">{dateKey}</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">{dictionary.howAreYou}</p>
          </div>
          <Link className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--text)]" href={`/?month=${dateKey.slice(0, 7)}`}>
            {dictionary.backToDashboard}
          </Link>
        </div>

        <form className="space-y-6" onSubmit={handleSave}>
          <div className="grid gap-4 md:grid-cols-2">
            <RatingInput label={dictionary.mood} moodLabels={dictionary.moodLabels} onChange={(value) => updateField("mood", value)} value={form.mood} />
            <RatingInput label={dictionary.mentalState} moodLabels={dictionary.moodLabels} onChange={(value) => updateField("mentalState", value)} value={form.mentalState} />
            <RatingInput label={dictionary.physicalState} moodLabels={dictionary.moodLabels} onChange={(value) => updateField("physicalState", value)} value={form.physicalState} />
            <RatingInput label={dictionary.sleepQuality} moodLabels={dictionary.moodLabels} onChange={(value) => updateField("sleepQuality", value)} value={form.sleepQuality} />
          </div>

          <label className="block space-y-2 text-sm text-[var(--muted)]">
            <span>{dictionary.sleepHours}</span>
            <input className="field" min="0" step="0.1" type="number" value={form.sleepHours} onChange={(event) => updateField("sleepHours", Number(event.target.value))} />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm text-[var(--muted)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span>{dictionary.nutrition}</span>
                <input checked={form.nutritionDone} onChange={(event) => updateField("nutritionDone", event.target.checked)} type="checkbox" />
              </div>
              <p>🍽️</p>
            </label>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm text-[var(--muted)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span>{dictionary.exerciseDone}</span>
                <input checked={form.exerciseDone} onChange={(event) => updateField("exerciseDone", event.target.checked)} type="checkbox" />
              </div>
              {form.exerciseDone ? (
                <div className="space-y-3">
                  <input className="field" placeholder={dictionary.exercisePlaceholder} value={form.exerciseType} onChange={(event) => updateField("exerciseType", event.target.value)} />
                  <input className="field" min="0" type="number" value={form.exerciseMinutes} onChange={(event) => updateField("exerciseMinutes", Number(event.target.value))} />
                </div>
              ) : (
                <p>🏃</p>
              )}
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm text-[var(--muted)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span>{dictionary.leisureDone}</span>
                <input checked={form.leisureDone} onChange={(event) => updateField("leisureDone", event.target.checked)} type="checkbox" />
              </div>
              {form.leisureDone ? (
                <input className="field" placeholder={dictionary.leisurePlaceholder} value={form.leisureActivity} onChange={(event) => updateField("leisureActivity", event.target.value)} />
              ) : (
                <p>🎨</p>
              )}
            </div>
          </div>

          <label className="block space-y-2 text-sm text-[var(--muted)]">
            <span>{dictionary.notes}</span>
            <textarea className="field min-h-40 resize-y" placeholder={dictionary.notesPlaceholder} value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
          </label>

          {error ? <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
          {message ? <p className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</p> : null}

          <div className="flex flex-col gap-3 md:flex-row md:justify-between">
            <div className="flex gap-3">
              <button className="rounded-2xl bg-[var(--primary)] px-5 py-3 font-semibold text-white" disabled={pending} type="submit">
                {pending ? dictionary.saving : dictionary.save}
              </button>
              {entry ? (
                <button className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-5 py-3 text-rose-200" disabled={pending} onClick={handleDelete} type="button">
                  {dictionary.deleteRecord}
                </button>
              ) : null}
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}
