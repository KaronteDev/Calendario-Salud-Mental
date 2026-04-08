import { randomUUID } from "crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSession, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { exchangeOAuthCode, fetchOAuthProfile, getOAuthConfig } from "@/lib/oauth";
import type { OAuthProvider, Role } from "@/lib/types";

const providers: OAuthProvider[] = ["google", "facebook", "instagram", "linkedin"];

function appUrl(path: string) {
  return new URL(path, process.env.APP_BASE_URL || "http://localhost:3001");
}

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;

  if (!providers.includes(provider as OAuthProvider)) {
    return NextResponse.redirect(appUrl("/login?oauthError=failed"));
  }

  if (!getOAuthConfig(provider as OAuthProvider)) {
    return NextResponse.redirect(appUrl("/login?oauthError=unavailable"));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(`wellflow_oauth_state_${provider}`)?.value;
  cookieStore.delete(`wellflow_oauth_state_${provider}`);

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(appUrl("/login?oauthError=cancelled"));
  }

  try {
    const accessToken = await exchangeOAuthCode(provider as OAuthProvider, code);
    const profile = await fetchOAuthProfile(provider as OAuthProvider, accessToken);

    if (!profile.providerAccountId) {
      return NextResponse.redirect(appUrl("/login?oauthError=failed"));
    }

    const existingSocial = await db.socialAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId: profile.providerAccountId,
        },
      },
      include: { user: true },
    });

    if (existingSocial) {
      await createSession({ id: existingSocial.user.id, role: existingSocial.user.role as Role });
      return NextResponse.redirect(appUrl("/"));
    }

    const normalizedEmail = profile.email?.toLowerCase() ?? `${provider}-${profile.providerAccountId}@oauth.wellflow.local`;
    const existingUser = await db.user.findUnique({ where: { email: normalizedEmail } });

    if (existingUser) {
      await db.socialAccount.create({
        data: {
          userId: existingUser.id,
          provider,
          providerAccountId: profile.providerAccountId,
        },
      });

      await createSession({ id: existingUser.id, role: existingUser.role });
      return NextResponse.redirect(appUrl("/"));
    }

    const userCount = await db.user.count();
    let role: Role = userCount === 0 ? "admin" : "user";
    let invitationTokenToAccept: string | null = null;

    if (userCount > 0) {
      if (!profile.email) {
        return NextResponse.redirect(appUrl("/login?oauthError=invitation_required"));
      }

      const invitation = await db.invitation.findFirst({
        where: {
          email: profile.email.toLowerCase(),
          acceptedAt: null,
        },
        orderBy: { createdAt: "desc" },
      });

      if (!invitation) {
        return NextResponse.redirect(appUrl("/login?oauthError=invitation_required"));
      }

      role = invitation.role;
      invitationTokenToAccept = invitation.token;
    }

    const user = await db.user.create({
      data: {
        name: profile.name,
        email: normalizedEmail,
        passwordHash: await hashPassword(randomUUID()),
        role,
        preferredLocale: "es",
        themeMode: "dark",
        socialAccounts: {
          create: {
            provider,
            providerAccountId: profile.providerAccountId,
          },
        },
      },
    });

    if (invitationTokenToAccept) {
      await db.invitation.update({
        where: { token: invitationTokenToAccept },
        data: { acceptedAt: new Date() },
      });
    }

    await createSession({ id: user.id, role: user.role });
    return NextResponse.redirect(appUrl("/"));
  } catch {
    return NextResponse.redirect(appUrl("/login?oauthError=failed"));
  }
}