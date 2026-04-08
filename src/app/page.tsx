import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureMonthKey } from "@/lib/utils";
import { Dashboard } from "@/components/dashboard";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const user = await requireUser();
  const monthKey = ensureMonthKey(typeof params.month === "string" ? params.month : undefined);

  const entries = await db.dailyEntry.findMany({
    where: {
      userId: user.id,
      dateKey: {
        startsWith: `${monthKey}-`,
      },
    },
    orderBy: { dateKey: "asc" },
  });

  return <Dashboard entries={entries} monthKey={monthKey} user={user} />;
}

