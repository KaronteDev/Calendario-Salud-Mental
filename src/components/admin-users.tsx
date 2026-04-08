"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, Mail, RotateCcw, ShieldCheck, UserRound, Users } from "lucide-react";

import { usePreferences } from "@/components/providers";
import type { DeliveryStatus } from "@/lib/types";
import type { InvitationRecord, PublicUser, Role } from "@/lib/types";

export function AdminUsers({ users, invitations }: { users: PublicUser[]; invitations: InvitationRecord[] }) {
  const router = useRouter();
  const { dictionary, locale } = usePreferences();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const adminCount = users.filter((user) => user.role === "admin").length;

  function deliveryStatus(invitation: InvitationRecord): DeliveryStatus {
    if (invitation.sentAt) {
      return "sent";
    }

    if (invitation.lastDeliveryError && invitation.lastDeliveryError !== "SMTP_NOT_CONFIGURED") {
      return "failed";
    }

    return "pending";
  }

  function deliveryLabel(status: DeliveryStatus) {
    if (status === "sent") {
      return dictionary.emailSent;
    }

    if (status === "failed") {
      return dictionary.emailFailed;
    }

    return dictionary.emailPending;
  }

  function feedbackMessage(status: DeliveryStatus) {
    if (status === "sent") {
      return dictionary.inviteCreatedWithEmail;
    }

    if (status === "failed") {
      return dictionary.inviteCreatedWithFailure;
    }

    return dictionary.inviteCreatedNoEmail;
  }

  async function handleRoleChange(userId: string, nextRole: Role) {
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role: nextRole }),
    });

    router.refresh();
  }

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const response = await fetch("/api/admin/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });

    const payload = (await response.json()) as { inviteUrl?: string; invitationId?: string; deliveryStatus?: DeliveryStatus; error?: string };

    if (!response.ok || !payload.deliveryStatus || !payload.inviteUrl) {
      setFeedback(payload.error ?? "No se pudo crear la invitación.");
      return;
    }

    setFeedback(feedbackMessage(payload.deliveryStatus));
    setEmail("");

    if (payload.deliveryStatus !== "sent") {
      await navigator.clipboard.writeText(payload.inviteUrl);
    }

    router.refresh();
  }

  async function copyLink(link: string) {
    await navigator.clipboard.writeText(link);
    setFeedback(dictionary.copied);
  }

  async function handleResend(invitationId: string) {
    setResendingId(invitationId);

    const response = await fetch(`/api/admin/invitations/${invitationId}/resend`, {
      method: "POST",
    });

    const payload = (await response.json()) as { inviteUrl?: string; deliveryStatus?: DeliveryStatus; error?: string };

    if (!response.ok || !payload.deliveryStatus || !payload.inviteUrl) {
      setFeedback(payload.error ?? "No se pudo reenviar la invitación.");
      setResendingId(null);
      return;
    }

    setFeedback(feedbackMessage(payload.deliveryStatus));

    if (payload.deliveryStatus !== "sent") {
      await navigator.clipboard.writeText(payload.inviteUrl);
    }

    setResendingId(null);
    router.refresh();
  }

  return (
    <main className="page-shell mx-auto max-w-6xl">
      <div className="mesh-overlay" />
      <section className="glass-panel relative rounded-[2rem] p-6 md:p-8">
        <div className="mb-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="font-heading text-sm uppercase tracking-[0.3em] text-[var(--accent)]">Admin</p>
            <h1 className="font-heading mt-2 text-4xl font-semibold">{dictionary.manageUsers}</h1>
            <p className="mt-3 max-w-2xl text-sm text-[var(--muted)]">Gestiona permisos, invitaciones y entrega de correos desde un único panel operativo.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="surface-card rounded-[1.5rem] p-4">
              <div className="mb-3 flex items-center justify-between text-[var(--muted)]">
                <Users size={18} />
                <span className="text-xs uppercase tracking-[0.2em]">Total</span>
              </div>
              <p className="font-heading text-3xl font-semibold">{users.length}</p>
            </div>
            <div className="surface-card rounded-[1.5rem] p-4">
              <div className="mb-3 flex items-center justify-between text-[var(--muted)]">
                <ShieldCheck size={18} />
                <span className="text-xs uppercase tracking-[0.2em]">Admins</span>
              </div>
              <p className="font-heading text-3xl font-semibold">{adminCount}</p>
            </div>
            <div className="surface-card rounded-[1.5rem] p-4">
              <div className="mb-3 flex items-center justify-between text-[var(--muted)]">
                <Mail size={18} />
                <span className="text-xs uppercase tracking-[0.2em]">Invites</span>
              </div>
              <p className="font-heading text-3xl font-semibold">{invitations.length}</p>
            </div>
          </div>
        </div>

        <form className="mb-8 grid gap-4 rounded-[1.9rem] border border-white/10 bg-gradient-to-br from-white/8 to-transparent p-5 md:grid-cols-[1fr_180px_220px]" onSubmit={handleInvite}>
          <input className="field" placeholder={dictionary.invitePlaceholder} type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <select className="field" value={role} onChange={(event) => setRole(event.target.value as Role)}>
            <option value="user">{dictionary.user}</option>
            <option value="admin">{dictionary.admin}</option>
          </select>
          <button className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 font-semibold text-white" type="submit">
            <Mail size={18} />
            {dictionary.inviteUser}
          </button>
        </form>

        {feedback ? <p className="mb-5 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{feedback}</p> : null}

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="surface-card rounded-[1.75rem] p-5">
            <h2 className="font-heading mb-4 text-2xl font-semibold">{dictionary.manageUsers}</h2>
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="rounded-[1.4rem] border border-white/10 bg-gradient-to-r from-white/7 to-transparent p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary)]/14 text-[var(--primary)]">
                        <UserRound size={18} />
                      </div>
                      <div>
                        <p className="font-semibold">{user.name}</p>
                        <p className="text-sm text-[var(--muted)]">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{user.role}</span>
                      <select className="field max-w-44" value={user.role} onChange={(event) => handleRoleChange(user.id, event.target.value as Role)}>
                        <option value="user">{dictionary.user}</option>
                        <option value="admin">{dictionary.admin}</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card rounded-[1.75rem] p-5">
            <h2 className="font-heading mb-4 text-2xl font-semibold">{dictionary.pendingInvites}</h2>
            <div className="space-y-3">
              {invitations.map((invitation) => {
                const link = typeof window === "undefined" ? `/signup?invite=${invitation.token}` : `${window.location.origin}/signup?invite=${invitation.token}`;
                const status = deliveryStatus(invitation);

                return (
                  <div key={invitation.id} className="rounded-[1.4rem] border border-white/10 bg-gradient-to-br from-white/7 to-transparent p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{invitation.email}</p>
                        <p className="mt-1 text-sm text-[var(--muted)]">{invitation.role}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${status === "sent" ? "bg-emerald-500/14 text-emerald-200" : status === "failed" ? "bg-rose-500/14 text-rose-200" : "bg-amber-500/14 text-amber-200"}`}>
                        {deliveryLabel(status)}
                      </span>
                    </div>

                    <div className="mt-4 space-y-1 text-xs text-[var(--muted)]">
                      <p>{dictionary.createdAt}: {format(new Date(invitation.createdAt), locale === "es" ? "dd/MM/yyyy HH:mm" : "yyyy-MM-dd HH:mm")}</p>
                      {invitation.sentAt ? <p>{dictionary.emailSent}: {format(new Date(invitation.sentAt), locale === "es" ? "dd/MM/yyyy HH:mm" : "yyyy-MM-dd HH:mm")}</p> : null}
                      {invitation.lastDeliveryError && invitation.lastDeliveryError !== "SMTP_NOT_CONFIGURED" ? <p className="text-rose-200">{invitation.lastDeliveryError}</p> : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-sm text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--text)]" onClick={() => copyLink(link)} type="button">
                        <Copy size={15} />
                        {dictionary.copyLink}
                      </button>
                      <button className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-sm text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--text)]" disabled={resendingId === invitation.id} onClick={() => handleResend(invitation.id)} type="button">
                        <RotateCcw size={15} />
                        {resendingId === invitation.id ? dictionary.saving : dictionary.resendInvite}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
