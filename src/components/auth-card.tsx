"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import { usePreferences } from "@/components/providers";
import type { OAuthProvider } from "@/lib/types";

function AppLogo() {
  return (
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-[linear-gradient(135deg,var(--primary)_0%,var(--accent)_100%)] shadow-[0_20px_50px_-25px_rgba(29,78,216,0.75)] sm:h-16 sm:w-16 sm:rounded-[1.5rem]">
      <div className="flex h-9 w-9 items-center justify-center rounded-[0.9rem] bg-white/90 text-[var(--primary)] sm:h-10 sm:w-10 sm:rounded-[1rem]">
        <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
    </div>
  );
}

function SocialProviderIcon({ provider }: { provider: OAuthProvider }) {
  if (provider === "google") {
    return (
      <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
        <path d="M21.8 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.2c1.9-1.8 3.1-4.4 3.1-7.4Z" fill="#4285F4" />
        <path d="M12 22c2.7 0 4.9-.9 6.6-2.4l-3.2-2.6c-.9.6-2 1-3.4 1-2.6 0-4.7-1.7-5.5-4H3.2v2.7A10 10 0 0 0 12 22Z" fill="#34A853" />
        <path d="M6.5 14c-.2-.6-.4-1.3-.4-2s.1-1.4.4-2V7.3H3.2A10 10 0 0 0 2 12c0 1.6.4 3.1 1.2 4.7L6.5 14Z" fill="#FBBC05" />
        <path d="M12 6c1.5 0 2.8.5 3.8 1.5l2.8-2.8A9.9 9.9 0 0 0 12 2a10 10 0 0 0-8.8 5.3L6.5 10c.8-2.3 2.9-4 5.5-4Z" fill="#EA4335" />
      </svg>
    );
  }

  if (provider === "facebook") {
    return (
      <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
        <path d="M24 12a12 12 0 1 0-13.9 11.8v-8.3H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.3A12 12 0 0 0 24 12Z" fill="#1877F2" />
      </svg>
    );
  }

  if (provider === "instagram") {
    return (
      <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
        <defs>
          <linearGradient id="instagram-gradient" x1="0%" x2="100%" y1="100%" y2="0%">
            <stop offset="0%" stopColor="#f58529" />
            <stop offset="35%" stopColor="#feda77" />
            <stop offset="60%" stopColor="#dd2a7b" />
            <stop offset="85%" stopColor="#8134af" />
            <stop offset="100%" stopColor="#515bd4" />
          </linearGradient>
        </defs>
        <rect width="18" height="18" x="3" y="3" rx="5" fill="url(#instagram-gradient)" />
        <circle cx="12" cy="12" r="4" fill="none" stroke="#fff" strokeWidth="1.8" />
        <circle cx="17.1" cy="6.9" r="1.1" fill="#fff" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
      <path d="M20.45 20.45H16.9v-5.57c0-1.33-.02-3.05-1.86-3.05-1.86 0-2.15 1.45-2.15 2.95v5.67H9.34V9h3.4v1.56h.05c.47-.9 1.63-1.86 3.35-1.86 3.58 0 4.24 2.36 4.24 5.43v6.32ZM5.34 7.43A2.06 2.06 0 1 1 5.34 3.3a2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.8 0 0 .77 0 1.72v20.56C0 23.23.8 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" fill="#0A66C2" />
    </svg>
  );
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
      <section className="glass-panel relative w-full max-w-md rounded-[1.75rem] p-5 sm:rounded-[2rem] sm:p-8">
        <div className="mb-6 space-y-2 text-center sm:mb-8 sm:space-y-3">
          <AppLogo />
          <p className="font-heading text-xs uppercase tracking-[0.28em] text-[var(--accent)] sm:text-sm sm:tracking-[0.3em]">WellFlow</p>
          <h1 className="font-heading text-3xl font-semibold sm:text-4xl">{isSignup ? dictionary.signUp : dictionary.signIn}</h1>
          <p className="text-xs text-[var(--muted)] sm:text-sm">{isSignup ? dictionary.signUpSubtitle : dictionary.signInSubtitle}</p>
        </div>

        {!isSignup ? (
          <div className="mb-5 space-y-3 sm:mb-6">
            <p className="text-center text-[11px] uppercase tracking-[0.22em] text-[var(--muted)] sm:text-xs sm:tracking-[0.25em]">{dictionary.continueWith}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {socialProviders.map((item) => (
                <Link
                  key={item.provider}
                  className="flex items-center justify-between rounded-[1.1rem] border border-[var(--surface-border)] bg-[var(--surface-strong)] px-3.5 py-3 text-xs text-[var(--text)] transition hover:translate-y-[-1px] hover:border-[var(--primary)] sm:rounded-[1.25rem] sm:px-4 sm:text-sm"
                  href={`/api/auth/oauth/${item.provider}`}
                >
                  <span className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 sm:h-9 sm:w-9">
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
              <p className="relative mx-auto w-fit bg-[color:var(--surface)] px-3 text-[11px] uppercase tracking-[0.22em] text-[var(--muted)] sm:text-xs sm:tracking-[0.25em]">{dictionary.orContinueWith}</p>
            </div>
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {isSignup ? (
            <label className="block space-y-2 text-xs text-[var(--muted)] sm:text-sm">
              <span>{dictionary.name}</span>
              <input className="field" value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
          ) : null}

          <label className="block space-y-2 text-xs text-[var(--muted)] sm:text-sm">
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

          <label className="block space-y-2 text-xs text-[var(--muted)] sm:text-sm">
            <div className="flex items-center justify-between gap-3">
              <span>{dictionary.password}</span>
              {!isSignup ? (
                <Link className="text-[11px] text-[var(--primary)] sm:text-xs" href="/forgot-password">
                  {dictionary.forgotPassword}
                </Link>
              ) : null}
            </div>
            <input className="field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>

          {isSignup ? (
            <label className="block space-y-2 text-xs text-[var(--muted)] sm:text-sm">
              <span>{dictionary.confirmPassword}</span>
              <input className="field" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
            </label>
          ) : null}

          {isSignup ? <p className="text-[11px] text-[var(--muted)] sm:text-xs">{dictionary.invitationHelp}</p> : null}
          {error ? <p className="rounded-2xl bg-rose-500/12 px-4 py-3 text-xs text-rose-300 sm:text-sm">{error}</p> : null}

          <button
            className="w-full rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px] hover:bg-[var(--primary-strong)] sm:text-base"
            disabled={pending}
            type="submit"
          >
            {pending ? dictionary.saving : isSignup ? dictionary.signUp : dictionary.signIn}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-[var(--muted)] sm:mt-6 sm:text-sm">
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
