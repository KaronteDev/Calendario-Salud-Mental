import { randomUUID } from "crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await db.user.findUnique({ where: { email } });

  if (!user) {
    return NextResponse.json({ message: "Si el email existe, te hemos enviado un enlace para restablecer la contraseña." });
  }

  await db.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const token = randomUUID();
  const resetRecord = await db.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    },
  });

  const resetUrl = `${process.env.APP_BASE_URL || "http://localhost:3001"}/reset-password?token=${resetRecord.token}`;
  const emailResult = await sendPasswordResetEmail({
    to: user.email,
    resetUrl,
    userName: user.name,
  });

  if (!emailResult.sent && emailResult.error === "SMTP_NOT_CONFIGURED") {
    return NextResponse.json({
      message: "SMTP no está configurado. Hemos generado un enlace local para que puedas continuar.",
      resetUrl,
    });
  }

  return NextResponse.json({ message: "Si el email existe, te hemos enviado un enlace para restablecer la contraseña." });
}