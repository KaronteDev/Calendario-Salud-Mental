import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth-card";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);

  if (user) {
    redirect("/");
  }

  const inviteToken = typeof params.invite === "string" ? params.invite : undefined;
  const oauthError = typeof params.oauthError === "string" ? params.oauthError : null;
  const invitation = inviteToken
    ? await db.invitation.findUnique({ where: { token: inviteToken } })
    : null;

  return <AuthCard inviteEmail={invitation?.email ?? null} inviteToken={invitation?.token ?? null} mode="signup" oauthError={oauthError} />;
}
