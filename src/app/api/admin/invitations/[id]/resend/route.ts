import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendInvitationEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentUser();

  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id } = await context.params;
  const invitation = await db.invitation.findUnique({ where: { id } });

  if (!invitation) {
    return NextResponse.json({ error: "Invitación no encontrada." }, { status: 404 });
  }

  const inviteUrl = `${process.env.APP_BASE_URL ?? new URL(request.url).origin}/signup?invite=${invitation.token}`;
  const delivery = await sendInvitationEmail({
    to: invitation.email,
    inviteUrl,
    role: invitation.role,
    invitedByName: admin.name,
  });

  const updated = await db.invitation.update({
    where: { id },
    data: {
      sentAt: delivery.sent ? new Date() : invitation.sentAt,
      lastDeliveryError: delivery.sent ? null : delivery.error,
    },
  });

  return NextResponse.json({
    inviteUrl,
    deliveryStatus: delivery.sent ? "sent" : delivery.error === "SMTP_NOT_CONFIGURED" ? "pending" : "failed",
    invitation: {
      id: updated.id,
      sentAt: updated.sentAt?.toISOString() ?? null,
      lastDeliveryError: updated.lastDeliveryError,
    },
  });
}