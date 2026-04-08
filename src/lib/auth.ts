import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import type { LocaleKey, PublicUser, Role, ThemeMode } from "@/lib/types";

const SESSION_COOKIE = "wellflow_session";

type SessionPayload = {
  sub: string;
  role: Role;
};

function getSecretKey() {
  return new TextEncoder().encode(process.env.AUTH_SECRET ?? "wellflow-local-dev-secret-change-me");
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function createSession(user: { id: string; role: Role }) {
  const token = await new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function readSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecretKey());

    return {
      sub: payload.sub ?? "",
      role: (payload.role as Role | undefined) ?? "user",
    };
  } catch {
    return null;
  }
}

function mapUser(user: {
  id: string;
  email: string;
  name: string;
  role: Role;
  preferredLocale: string;
  themeMode: ThemeMode;
}): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    preferredLocale: (user.preferredLocale as LocaleKey) ?? "es",
    themeMode: user.themeMode,
  };
}

export async function getCurrentUser() {
  const session = await readSession();

  if (!session?.sub) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      preferredLocale: true,
      themeMode: true,
    },
  });

  return user ? mapUser(user) : null;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();

  if (user.role !== "admin") {
    redirect("/");
  }

  return user;
}
