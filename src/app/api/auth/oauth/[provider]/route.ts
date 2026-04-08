import { randomUUID } from "crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { buildOAuthAuthorizationUrl } from "@/lib/oauth";
import type { OAuthProvider } from "@/lib/types";

const providers: OAuthProvider[] = ["google", "facebook", "instagram", "linkedin"];

export async function GET(_: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;

  if (!providers.includes(provider as OAuthProvider)) {
    return NextResponse.redirect(new URL("/login?oauthError=failed", process.env.APP_BASE_URL || "http://localhost:3001"));
  }

  const state = randomUUID();
  const authUrl = buildOAuthAuthorizationUrl(provider as OAuthProvider, state);

  if (!authUrl) {
    return NextResponse.redirect(new URL("/login?oauthError=unavailable", process.env.APP_BASE_URL || "http://localhost:3001"));
  }

  const cookieStore = await cookies();
  cookieStore.set(`wellflow_oauth_state_${provider}`, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return NextResponse.redirect(authUrl);
}