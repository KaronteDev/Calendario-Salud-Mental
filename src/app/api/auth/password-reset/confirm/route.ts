import { NextResponse } from "next/server";
import { z } from "zod";

import { hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const resetToken = await db.passwordResetToken.findUnique({
    where: { token: parsed.data.token },
  });

  if (!resetToken) {
    return NextResponse.json({ error: "El enlace de recuperación no es válido." }, { status: 400 });
  }

  if (resetToken.expiresAt <= new Date()) {
    await db.passwordResetToken.delete({ where: { token: parsed.data.token } });
    return NextResponse.json({ error: "El enlace de recuperación ha caducado.", expired: true }, { status: 400 });
  }

  await db.user.update({
    where: { id: resetToken.userId },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });

  await db.passwordResetToken.deleteMany({ where: { userId: resetToken.userId } });

  return NextResponse.json({ message: "La contraseña se ha actualizado correctamente." });
}