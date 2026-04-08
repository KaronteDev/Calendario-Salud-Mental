"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, BriefcaseBusiness, Camera, Mail, MessageCircle, Sparkles } from "lucide-react";

import { usePreferences } from "@/components/providers";
import type { OAuthProvider } from "@/lib/types";

function AppLogo() {
  return (
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-[linear-gradient(135deg,var(--primary)_0%,var(--accent)_100%)] shadow-[0_20px_50px_-25px_rgba(29,78,216,0.75)]">
      <div className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-white/90 text-[var(--primary)]">
        <Sparkles className="h-5 w-5" />
      </div>
    </div>
  );
}

function SocialProviderIcon({ provider }: { provider: OAuthProvider }) {
  if (provider === "google") {
    return <Mail className="h-4 w-4" />;
  }

  if (provider === "facebook") {
    return <MessageCircle className="h-4 w-4" />;
  }

  if (provider === "instagram") {
    return <Camera className="h-4 w-4" />;
  }

  return <BriefcaseBusiness className="h-4 w-4" />;
}

export function AuthCard({
  mode,
  inviteEmail,
  inviteToken,
  oauthError,
}: {
  mode: "login" | "signup";
  inviteEmail?: string | null;
  inviteToken?: string | null;
  oauthError?: string | null;
}) {
  const router = useRouter();
  const { dictionary } = usePreferences();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(inviteEmail ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(() => {
    if (oauthError === "unavailable") {
      return dictionary.socialLoginUnavailable;
    }

    if (oauthError === "invitation_required") {
      return dictionary.socialLoginNeedsInvitation;
    }

    if (oauthError === "cancelled") {
      return dictionary.socialLoginCancelled;
    }

    if (oauthError === "failed") {
      return dictionary.socialLoginFailed;
    }

    return null;
  });
  const [pending, setPending] = useState(false);

  const isSignup = mode === "signup";
  const socialProviders: Array<{ provider: OAuthProvider; label: string }> = [
    { provider: "google", label: dictionary.googleLabel },
    { provider: "facebook", label: dictionary.facebookLabel },
    { provider: "instagram", label: dictionary.instagramLabel },
    { provider: "linkedin", label: dictionary.linkedinLabel },
  ];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (isSignup && password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setPending(true);

    const response = await fetch(isSignup ? "/api/auth/signup" : "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        inviteToken,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "No se pudo completar la operación.");
      setPending(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="page-shell flex items-center justify-center">
      <div className="mesh-overlay" />
      <section className="glass-panel relative w-full max-w-md rounded-[2rem] p-8">
        <div className="mb-8 space-y-3 text-center">
          <AppLogo />
          <p className="font-heading text-sm uppercase tracking-[0.3em] text-[var(--accent)]">WellFlow</p>
          <h1 className="font-heading text-4xl font-semibold">{isSignup ? dictionary.signUp : dictionary.signIn}</h1>
          <p className="text-sm text-[var(--muted)]">{isSignup ? dictionary.signUpSubtitle : dictionary.signInSubtitle}</p>
        </div>

        {!isSignup ? (
          <div className="mb-6 space-y-3">
            <p className="text-center text-xs uppercase tracking-[0.25em] text-[var(--muted)]">{dictionary.continueWith}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {socialProviders.map((item) => (
                <Link
                  key={item.provider}
                  className="flex items-center justify-between rounded-[1.25rem] border border-[var(--surface-border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--text)] transition hover:translate-y-[-1px] hover:border-[var(--primary)]"
                  href={`/api/auth/oauth/${item.provider}`}
                >
                  <span className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-[var(--primary)]">
                      <SocialProviderIcon provider={item.provider} />
                    </span>
                    <span>{item.label}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-[var(--muted)]" />
                </Link>
              ))}
            </div>
            <div className="relative py-1">
              <div className="absolute inset-x-0 top-1/2 h-px bg-[var(--surface-border)]" />
              <p className="relative mx-auto w-fit bg-[color:var(--surface)] px-3 text-xs uppercase tracking-[0.25em] text-[var(--muted)]">{dictionary.orContinueWith}</p>
            </div>
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {isSignup ? (
            <label className="block space-y-2 text-sm text-[var(--muted)]">
              <span>{dictionary.name}</span>
              <input className="field" value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
          ) : null}

          <label className="block space-y-2 text-sm text-[var(--muted)]">
            <span>{dictionary.email}</span>
            <input
              className="field"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={Boolean(inviteEmail)}
            />
          </label>

          <label className="block space-y-2 text-sm text-[var(--muted)]">
            <span>{dictionary.password}</span>
            <input className="field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>

          {isSignup ? (
            <label className="block space-y-2 text-sm text-[var(--muted)]">
              <span>{dictionary.confirmPassword}</span>
              <input className="field" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
            </label>
          ) : null}

          {isSignup ? <p className="text-xs text-[var(--muted)]">{dictionary.invitationHelp}</p> : null}
          {error ? <p className="rounded-2xl bg-rose-500/12 px-4 py-3 text-sm text-rose-300">{error}</p> : null}

          <button
            className="w-full rounded-2xl bg-[var(--primary)] px-4 py-3 font-semibold text-white transition hover:translate-y-[-1px] hover:bg-[var(--primary-strong)]"
            disabled={pending}
            type="submit"
          >
            {pending ? dictionary.saving : isSignup ? dictionary.signUp : dictionary.signIn}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-[var(--muted)]">
          {isSignup ? (
            <Link className="text-[var(--primary)]" href="/login">
              {dictionary.haveAccount}
            </Link>
          ) : (
            <Link className="text-[var(--primary)]" href="/signup">
              {dictionary.needAccount}
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
