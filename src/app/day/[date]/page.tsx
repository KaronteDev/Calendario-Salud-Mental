import { redirect } from "next/navigation";

import { DayLogForm } from "@/components/day-log-form";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const [{ date }, user] = await Promise.all([params, requireUser()]);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    redirect("/");
  }

  const entry = await db.dailyEntry.findUnique({
    where: {
      userId_dateKey: {
        userId: user.id,
        dateKey: date,
      },
    },
  });

  return <DayLogForm dateKey={date} entry={entry} />;
}
