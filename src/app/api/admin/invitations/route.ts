import { randomUUID } from "crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendInvitationEmail } from "@/lib/email";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "user"]),
});

export async function POST(request: Request) {
  const admin = await getCurrentUser();

  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const existingInvitation = await db.invitation.findFirst({
    where: {
      email,
      acceptedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  const invitation = existingInvitation
    ? await db.invitation.update({
        where: { id: existingInvitation.id },
        data: {
          role: parsed.data.role,
          invitedById: admin.id,
        },
      })
    : await db.invitation.create({
        data: {
          email,
          role: parsed.data.role,
          token: randomUUID(),
          invitedById: admin.id,
        },
      });

  const inviteUrl = `${process.env.APP_BASE_URL ?? new URL(request.url).origin}/signup?invite=${invitation.token}`;
  const delivery = await sendInvitationEmail({
    to: email,
    inviteUrl,
    role: parsed.data.role,
    invitedByName: admin.name,
  });

  await db.invitation.update({
    where: { id: invitation.id },
    data: {
      sentAt: delivery.sent ? new Date() : null,
      lastDeliveryError: delivery.sent ? null : delivery.error,
    },
  });

  const deliveryStatus = delivery.sent ? "sent" : delivery.error === "SMTP_NOT_CONFIGURED" ? "pending" : "failed";

  return NextResponse.json({
    invitationId: invitation.id,
    inviteUrl,
    deliveryStatus,
  });
}
