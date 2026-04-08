import { NextResponse } from "next/server";
import { z } from "zod";

import { comparePassword, createSession } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Credenciales inválidas." }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });

  if (!user) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
  }

  const passwordOk = await comparePassword(parsed.data.password, user.passwordHash);

  if (!passwordOk) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
  }

  await createSession({ id: user.id, role: user.role });
  return NextResponse.json({ ok: true });
}
