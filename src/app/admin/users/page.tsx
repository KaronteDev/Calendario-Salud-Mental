import Link from "next/link";

import { AdminUsers } from "@/components/admin-users";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { LocaleKey, PublicUser } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireAdmin();
  const [users, invitations] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        preferredLocale: true,
        themeMode: true,
      },
    }),
    db.invitation.findMany({
      where: { acceptedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        token: true,
        acceptedAt: true,
        sentAt: true,
        lastDeliveryError: true,
        createdAt: true,
      },
    }),
  ]);

  return (
    <>
      <div className="page-shell pb-0">
        <Link className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--text)]" href="/">
          ← Dashboard
        </Link>
      </div>
      <AdminUsers
        invitations={invitations.map((item) => ({
          ...item,
          acceptedAt: item.acceptedAt?.toISOString() ?? null,
          sentAt: item.sentAt?.toISOString() ?? null,
          lastDeliveryError: item.lastDeliveryError,
          createdAt: item.createdAt.toISOString(),
        }))}
        users={users.map(
          (item): PublicUser => ({
            ...item,
            preferredLocale: item.preferredLocale as LocaleKey,
          }),
        )}
      />
    </>
  );
}