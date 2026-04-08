import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  userId: z.string().min(1),
  role: z.enum(["admin", "user"]),
});

export async function POST(request: Request) {
  const admin = await getCurrentUser();

  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  if (admin.id === parsed.data.userId && parsed.data.role !== "admin") {
    return NextResponse.json({ error: "No puedes quitarte el rol de administrador desde aquí." }, { status: 400 });
  }

  await db.user.update({
    where: { id: parsed.data.userId },
    data: { role: parsed.data.role },
  });

  return NextResponse.json({ ok: true });
}
