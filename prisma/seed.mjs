import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function buildEntry(dateKey, mood, mentalState, physicalState, sleepQuality, sleepLevel, sleepHours, goals = {}) {
  return {
    dateKey,
    mood,
    mentalState,
    physicalState,
    sleepQuality,
    sleepLevel,
    sleepHours,
    nutritionDone: goals.nutritionDone ?? false,
    exerciseDone: goals.exerciseDone ?? false,
    exerciseType: goals.exerciseType ?? null,
    exerciseMinutes: goals.exerciseMinutes ?? null,
    leisureDone: goals.leisureDone ?? false,
    leisureActivity: goals.leisureActivity ?? null,
    notes: goals.notes ?? null,
  };
}

const demoEntries = [
  buildEntry("2026-04-01", 3, 3, 3, 3, 3, 7.2, { nutritionDone: true, leisureDone: true, leisureActivity: "Leer y desconectar" }),
  buildEntry("2026-04-02", 4, 4, 3, 4, 4, 7.8, { nutritionDone: true, exerciseDone: true, exerciseType: "Correr", exerciseMinutes: 35 }),
  buildEntry("2026-04-03", 2, 2, 3, 2, 2, 5.9, { notes: "Día con más estrés del habitual." }),
  buildEntry("2026-04-04", 5, 4, 5, 4, 4, 8.4, { nutritionDone: true, exerciseDone: true, exerciseType: "Senderismo", exerciseMinutes: 90, leisureDone: true, leisureActivity: "Paseo largo" }),
  buildEntry("2026-04-05", 4, 4, 4, 5, 5, 8.1, { nutritionDone: true, leisureDone: true, leisureActivity: "Película" }),
  buildEntry("2026-04-06", 3, 3, 4, 3, 3, 6.8, { exerciseDone: true, exerciseType: "Yoga", exerciseMinutes: 25 }),
  buildEntry("2026-04-07", 4, 5, 4, 4, 4, 7.6, { nutritionDone: true, exerciseDone: true, exerciseType: "Gym", exerciseMinutes: 50, notes: "Muy buena concentración." }),
  buildEntry("2026-04-08", 5, 5, 4, 4, 4, 7.9, { nutritionDone: true, exerciseDone: true, exerciseType: "Bicicleta", exerciseMinutes: 40, leisureDone: true, leisureActivity: "Tiempo en familia" }),
  buildEntry("2026-04-09", 3, 3, 3, 3, 3, 6.9, { nutritionDone: true }),
  buildEntry("2026-04-10", 2, 3, 2, 2, 2, 5.4, { leisureDone: true, leisureActivity: "Descanso total", notes: "Dormí peor de lo esperado." }),
  buildEntry("2026-04-11", 4, 4, 5, 4, 4, 8.0, { nutritionDone: true, exerciseDone: true, exerciseType: "Natación", exerciseMinutes: 45 }),
  buildEntry("2026-04-12", 4, 4, 4, 5, 5, 8.6, { nutritionDone: true, leisureDone: true, leisureActivity: "Lectura en terraza" }),
];

async function main() {
  const adminPasswordHash = await bcrypt.hash("Admin123!", 10);
  const demoPasswordHash = await bcrypt.hash("Demo123!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@wellflow.local" },
    update: {
      name: "Admin WellFlow",
      role: "admin",
      preferredLocale: "es",
      themeMode: "dark",
      passwordHash: adminPasswordHash,
    },
    create: {
      email: "admin@wellflow.local",
      name: "Admin WellFlow",
      role: "admin",
      preferredLocale: "es",
      themeMode: "dark",
      passwordHash: adminPasswordHash,
    },
  });

  const demo = await prisma.user.upsert({
    where: { email: "demo@wellflow.local" },
    update: {
      name: "Demo User",
      role: "user",
      preferredLocale: "es",
      themeMode: "dark",
      passwordHash: demoPasswordHash,
    },
    create: {
      email: "demo@wellflow.local",
      name: "Demo User",
      role: "user",
      preferredLocale: "es",
      themeMode: "dark",
      passwordHash: demoPasswordHash,
    },
  });

  await prisma.dailyEntry.deleteMany({ where: { userId: demo.id } });
  await prisma.dailyEntry.createMany({
    data: demoEntries.map((entry) => ({
      userId: demo.id,
      ...entry,
    })),
  });

  await prisma.invitation.upsert({
    where: { token: "demo-invite-token" },
    update: {
      email: "nuevo@wellflow.local",
      role: "user",
      invitedById: admin.id,
    },
    create: {
      email: "nuevo@wellflow.local",
      role: "user",
      token: "demo-invite-token",
      invitedById: admin.id,
    },
  });

  console.log("Seed complete");
  console.log("Admin: admin@wellflow.local / Admin123!");
  console.log("Demo: demo@wellflow.local / Demo123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });