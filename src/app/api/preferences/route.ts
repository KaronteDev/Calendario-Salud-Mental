import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  locale: z.enum(["es", "en", "fr", "ru"]).optional(),
  theme: z.enum(["light", "dark"]).optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Preferencias inválidas." }, { status: 400 });
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      preferredLocale: parsed.data.locale,
      themeMode: parsed.data.theme,
    },
  });

  return NextResponse.json({ ok: true });
}
