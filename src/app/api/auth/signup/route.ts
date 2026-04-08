import { NextResponse } from "next/server";
import { z } from "zod";

import { createSession, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  inviteToken: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de registro inválidos." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const existingUser = await db.user.findUnique({ where: { email } });

  if (existingUser) {
    return NextResponse.json({ error: "Ese email ya está registrado." }, { status: 409 });
  }

  const userCount = await db.user.count();
  let role: "admin" | "user" = userCount === 0 ? "admin" : "user";

  if (userCount > 0) {
    if (!parsed.data.inviteToken) {
      return NextResponse.json({ error: "Necesitas una invitación para crear una cuenta nueva." }, { status: 403 });
    }

    const invitation = await db.invitation.findUnique({ where: { token: parsed.data.inviteToken } });

    if (!invitation || invitation.acceptedAt) {
      return NextResponse.json({ error: "La invitación no es válida o ya fue utilizada." }, { status: 403 });
    }

    if (invitation.email.toLowerCase() !== email) {
      return NextResponse.json({ error: "La invitación no corresponde a este email." }, { status: 403 });
    }

    role = invitation.role;
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
      role,
      preferredLocale: "es",
      themeMode: "dark",
    },
  });

  if (parsed.data.inviteToken) {
    await db.invitation.update({
      where: { token: parsed.data.inviteToken },
      data: { acceptedAt: new Date() },
    });
  }

  await createSession({ id: user.id, role: user.role });
  return NextResponse.json({ ok: true });
}
