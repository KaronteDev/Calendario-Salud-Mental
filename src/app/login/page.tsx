import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth-card";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return <AuthCard mode="login" />;
}
