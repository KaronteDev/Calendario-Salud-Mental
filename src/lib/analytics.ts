import { parse } from "date-fns";

import type { EntryRecord } from "@/lib/types";
import { average, percentage, round } from "@/lib/utils";

export function buildMonthlyAnalytics(entries: EntryRecord[]) {
  const moodValues = entries.map((entry) => entry.mood);
  const mentalValues = entries.map((entry) => entry.mentalState);
  const physicalValues = entries.map((entry) => entry.physicalState);
  const sleepValues = entries.map((entry) => entry.sleepQuality);
  const sleepHoursValues = entries.map((entry) => entry.sleepHours);

  const sortedEntries = [...entries].sort((left, right) => left.dateKey.localeCompare(right.dateKey));

  return {
    summary: {
      avgMood: round(average(moodValues)),
      avgMental: round(average(mentalValues)),
      avgPhysical: round(average(physicalValues)),
      avgSleep: round(average(sleepValues)),
      avgSleepHours: round(average(sleepHoursValues)),
      exerciseCompletion: round(percentage(entries.filter((entry) => entry.exerciseDone).length, entries.length)),
      nutritionCompletion: round(percentage(entries.filter((entry) => entry.nutritionDone).length, entries.length)),
      leisureCompletion: round(percentage(entries.filter((entry) => entry.leisureDone).length, entries.length)),
      globalGoalAvg: round(
        average([
          percentage(entries.filter((entry) => entry.exerciseDone).length, entries.length),
          percentage(entries.filter((entry) => entry.nutritionDone).length, entries.length),
          percentage(entries.filter((entry) => entry.leisureDone).length, entries.length),
        ]),
      ),
      sleepMax: round(Math.max(...sleepHoursValues, 0)),
      sleepMin: round(entries.length ? Math.min(...sleepHoursValues) : 0),
    },
    trends: sortedEntries.map((entry) => ({
      day: formatDay(entry.dateKey),
      mood: entry.mood,
      mental: entry.mentalState,
      physical: entry.physicalState,
      sleep: entry.sleepQuality,
    })),
    sleep: sortedEntries.map((entry) => ({
      day: formatDay(entry.dateKey),
      hours: round(entry.sleepHours),
    })),
    profile: [
      { metric: "mood", value: round(average(moodValues)) },
      { metric: "mental", value: round(average(mentalValues)) },
      { metric: "physical", value: round(average(physicalValues)) },
      { metric: "sleep", value: round(average(sleepValues)) },
    ],
    goals: [
      { metric: "exercise", value: round(percentage(entries.filter((entry) => entry.exerciseDone).length, entries.length)) },
      { metric: "food", value: round(percentage(entries.filter((entry) => entry.nutritionDone).length, entries.length)) },
      { metric: "leisure", value: round(percentage(entries.filter((entry) => entry.leisureDone).length, entries.length)) },
    ],
  };
}

function formatDay(dateKey: string) {
  return parse(dateKey, "yyyy-MM-dd", new Date()).getDate().toString().padStart(2, "0");
}
