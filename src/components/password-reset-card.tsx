"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles } from "lucide-react";

import { usePreferences } from "@/components/providers";

function AppLogo() {
  return (
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-[linear-gradient(135deg,var(--primary)_0%,var(--accent)_100%)] shadow-[0_20px_50px_-25px_rgba(29,78,216,0.75)] sm:h-16 sm:w-16 sm:rounded-[1.5rem]">
      <div className="flex h-9 w-9 items-center justify-center rounded-[0.9rem] bg-white/90 text-[var(--primary)] sm:h-10 sm:w-10 sm:rounded-[1rem]">
        <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
    </div>
  );
}

export function PasswordResetCard({
  mode,
  token,
  tokenValid,
}: {
  mode: "request" | "confirm";
  token?: string | null;
  tokenValid?: boolean;
}) {
  const router = useRouter();
  const { dictionary } = usePreferences();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(tokenValid === false ? dictionary.resetPasswordInvalid : null);

  const isRequest = mode === "request";

  async function handleRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/auth/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string; resetUrl?: string };

    if (!response.ok) {
      setError(payload.error ?? dictionary.socialLoginFailed);
      setPending(false);
      return;
    }

    if (payload.resetUrl && typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(payload.resetUrl).catch(() => undefined);
      setMessage(dictionary.resetLinkCopied);
    } else {
      setMessage(payload.message ?? dictionary.resetLinkSent);
    }

    setPending(false);
  }

  async function handleConfirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setPending(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/auth/password-reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string; expired?: boolean };

    if (!response.ok) {
      setError(payload.expired ? dictionary.resetPasswordExpired : payload.error ?? dictionary.resetPasswordInvalid);
      setPending(false);
      return;
    }

    setMessage(payload.message ?? dictionary.resetPasswordSuccess);
    setPending(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="page-shell flex items-center justify-center">
      <div className="mesh-overlay" />
      <section className="glass-panel relative w-full max-w-md rounded-[1.75rem] p-5 sm:rounded-[2rem] sm:p-8">
        <div className="mb-6 space-y-2 text-center sm:mb-8 sm:space-y-3">
          <AppLogo />
          <p className="font-heading text-xs uppercase tracking-[0.28em] text-[var(--accent)] sm:text-sm sm:tracking-[0.3em]">WellFlow</p>
          <h1 className="font-heading text-3xl font-semibold sm:text-4xl">{isRequest ? dictionary.forgotPassword : dictionary.resetPassword}</h1>
          <p className="text-xs text-[var(--muted)] sm:text-sm">{isRequest ? dictionary.forgotPasswordSubtitle : dictionary.resetPasswordSubtitle}</p>
        </div>

        <form className="space-y-4" onSubmit={isRequest ? handleRequest : handleConfirm}>
          {isRequest ? (
            <label className="block space-y-2 text-xs text-[var(--muted)] sm:text-sm">
              <span>{dictionary.email}</span>
              <input className="field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
          ) : (
            <>
              <label className="block space-y-2 text-xs text-[var(--muted)] sm:text-sm">
                <span>{dictionary.newPassword}</span>
                <input className="field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </label>
              <label className="block space-y-2 text-xs text-[var(--muted)] sm:text-sm">
                <span>{dictionary.confirmNewPassword}</span>
                <input className="field" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
              </label>
            </>
          )}

          {error ? <p className="rounded-2xl bg-rose-500/12 px-4 py-3 text-xs text-rose-300 sm:text-sm">{error}</p> : null}
          {message ? <p className="rounded-2xl bg-emerald-500/12 px-4 py-3 text-xs text-emerald-200 sm:text-sm">{message}</p> : null}

          <button
            className="w-full rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px] hover:bg-[var(--primary-strong)] sm:text-base"
            disabled={pending || (!isRequest && tokenValid === false)}
            type="submit"
          >
            {pending ? dictionary.saving : isRequest ? dictionary.sendResetLink : dictionary.resetPassword}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-[var(--muted)] sm:mt-6 sm:text-sm">
          <Link className="text-[var(--primary)]" href="/login">
            {dictionary.backToLogin}
          </Link>
        </div>
      </section>
    </main>
  );
}