"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { usePreferences } from "@/components/providers";

export function AuthCard({
  mode,
  inviteEmail,
  inviteToken,
}: {
  mode: "login" | "signup";
  inviteEmail?: string | null;
  inviteToken?: string | null;
}) {
  const router = useRouter();
  const { dictionary } = usePreferences();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(inviteEmail ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isSignup = mode === "signup";

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
          <p className="font-heading text-sm uppercase tracking-[0.3em] text-[var(--accent)]">WellFlow</p>
          <h1 className="font-heading text-4xl font-semibold">{isSignup ? dictionary.signUp : dictionary.signIn}</h1>
          <p className="text-sm text-[var(--muted)]">{isSignup ? dictionary.signUpSubtitle : dictionary.signInSubtitle}</p>
        </div>

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
