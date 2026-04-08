import { redirect } from "next/navigation";

import { PasswordResetCard } from "@/components/password-reset-card";
import { getCurrentUser } from "@/lib/auth";

export default async function ForgotPasswordPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return <PasswordResetCard mode="request" />;
}