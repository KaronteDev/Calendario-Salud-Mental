import type { OAuthProvider } from "@/lib/types";

type OAuthProfile = {
  providerAccountId: string;
  email: string | null;
  name: string;
};

type OAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

function getBaseUrl() {
  return (process.env.APP_BASE_URL || "http://localhost:3001").replace(/\/$/, "");
}

export function getOAuthConfig(provider: OAuthProvider): OAuthConfig | null {
  const upper = provider.toUpperCase();
  const clientId = process.env[`${upper}_CLIENT_ID` as keyof NodeJS.ProcessEnv];
  const clientSecret = process.env[`${upper}_CLIENT_SECRET` as keyof NodeJS.ProcessEnv];

  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    redirectUri: `${getBaseUrl()}/api/auth/oauth/${provider}/callback`,
  };
}

export function buildOAuthAuthorizationUrl(provider: OAuthProvider, state: string) {
  const config = getOAuthConfig(provider);

  if (!config) {
    return null;
  }

  const search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    state,
  });

  if (provider === "google") {
    search.set("scope", "openid email profile");
    search.set("access_type", "offline");
    search.set("prompt", "consent");
    return `https://accounts.google.com/o/oauth2/v2/auth?${search.toString()}`;
  }

  if (provider === "facebook") {
    search.set("scope", "email,public_profile");
    return `https://www.facebook.com/v19.0/dialog/oauth?${search.toString()}`;
  }

  if (provider === "instagram") {
    search.set("scope", "user_profile");
    return `https://api.instagram.com/oauth/authorize?${search.toString()}`;
  }

  search.set("scope", "openid profile email");
  return `https://www.linkedin.com/oauth/v2/authorization?${search.toString()}`;
}

export async function exchangeOAuthCode(provider: OAuthProvider, code: string) {
  const config = getOAuthConfig(provider);

  if (!config) {
    throw new Error("missing_config");
  }

  if (provider === "facebook") {
    const search = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code,
    });
    const response = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${search.toString()}`);
    if (!response.ok) {
      throw new Error("token_exchange_failed");
    }
    const data = (await response.json()) as { access_token?: string };
    if (!data.access_token) {
      throw new Error("token_missing");
    }
    return data.access_token;
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    code,
    grant_type: "authorization_code",
  });

  const response = await fetch(
    provider === "google"
      ? "https://oauth2.googleapis.com/token"
      : provider === "instagram"
        ? "https://api.instagram.com/oauth/access_token"
        : "https://www.linkedin.com/oauth/v2/accessToken",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );

  if (!response.ok) {
    throw new Error("token_exchange_failed");
  }

  const data = (await response.json()) as { access_token?: string };

  if (!data.access_token) {
    throw new Error("token_missing");
  }

  return data.access_token;
}

export async function fetchOAuthProfile(provider: OAuthProvider, accessToken: string): Promise<OAuthProfile> {
  if (provider === "google") {
    const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await response.json()) as { sub?: string; email?: string; name?: string };

    return {
      providerAccountId: data.sub ?? "",
      email: data.email?.toLowerCase() ?? null,
      name: data.name ?? data.email ?? "Google User",
    };
  }

  if (provider === "facebook") {
    const response = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`);
    const data = (await response.json()) as { id?: string; email?: string; name?: string };

    return {
      providerAccountId: data.id ?? "",
      email: data.email?.toLowerCase() ?? null,
      name: data.name ?? data.email ?? "Facebook User",
    };
  }

  if (provider === "instagram") {
    const response = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`);
    const data = (await response.json()) as { id?: string; username?: string };

    return {
      providerAccountId: data.id ?? "",
      email: null,
      name: data.username ?? "Instagram User",
    };
  }

  const response = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await response.json()) as { sub?: string; email?: string; name?: string };

  return {
    providerAccountId: data.sub ?? "",
    email: data.email?.toLowerCase() ?? null,
    name: data.name ?? data.email ?? "LinkedIn User",
  };
}