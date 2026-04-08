import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mood: z.number().int().min(1).max(5),
  mentalState: z.number().int().min(1).max(5),
  physicalState: z.number().int().min(1).max(5),
  sleepQuality: z.number().int().min(1).max(5),
  sleepHours: z.number().min(0).max(24),
  nutritionDone: z.boolean(),
  exerciseDone: z.boolean(),
  exerciseType: z.string(),
  exerciseMinutes: z.number().int().min(0),
  leisureDone: z.boolean(),
  leisureActivity: z.string(),
  notes: z.string(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "El formulario contiene datos inválidos." }, { status: 400 });
  }

  const data = parsed.data;

  await db.dailyEntry.upsert({
    where: {
      userId_dateKey: {
        userId: user.id,
        dateKey: data.dateKey,
      },
    },
    update: {
      mood: data.mood,
      mentalState: data.mentalState,
      physicalState: data.physicalState,
      sleepQuality: data.sleepQuality,
      sleepHours: data.sleepHours,
      nutritionDone: data.nutritionDone,
      exerciseDone: data.exerciseDone,
      exerciseType: data.exerciseDone ? data.exerciseType || null : null,
      exerciseMinutes: data.exerciseDone ? data.exerciseMinutes || 0 : null,
      leisureDone: data.leisureDone,
      leisureActivity: data.leisureDone ? data.leisureActivity || null : null,
      notes: data.notes || null,
    },
    create: {
      userId: user.id,
      dateKey: data.dateKey,
      mood: data.mood,
      mentalState: data.mentalState,
      physicalState: data.physicalState,
      sleepQuality: data.sleepQuality,
      sleepHours: data.sleepHours,
      nutritionDone: data.nutritionDone,
      exerciseDone: data.exerciseDone,
      exerciseType: data.exerciseDone ? data.exerciseType || null : null,
      exerciseMinutes: data.exerciseDone ? data.exerciseMinutes || 0 : null,
      leisureDone: data.leisureDone,
      leisureActivity: data.leisureDone ? data.leisureActivity || null : null,
      notes: data.notes || null,
    },
  });

  return NextResponse.json({ message: "Registro guardado correctamente" });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const url = new URL(request.url);
  const dateKey = url.searchParams.get("dateKey");

  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
  }

  await db.dailyEntry.deleteMany({
    where: {
      userId: user.id,
      dateKey,
    },
  });

  return NextResponse.json({ message: "Registro eliminado" });
}
