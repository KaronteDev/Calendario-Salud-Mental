import { redirect } from "next/navigation";

import { PasswordResetCard } from "@/components/password-reset-card";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);

  if (user) {
    redirect("/");
  }

  const token = typeof params.token === "string" ? params.token : null;
  const tokenRecord = token
    ? await db.passwordResetToken.findUnique({
        where: { token },
      })
    : null;

  const tokenValid = Boolean(tokenRecord && tokenRecord.expiresAt > new Date());

  return <PasswordResetCard mode="confirm" token={token} tokenValid={tokenValid} />;
}