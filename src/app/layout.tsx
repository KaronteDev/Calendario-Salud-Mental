import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";

import { getCurrentUser } from "@/lib/auth";
import { Providers } from "@/components/providers";
import "./globals.css";

const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

const headingFont = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WellFlow",
  description: "Calendario de bienestar mental, físico y sueño con seguimiento diario.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang={user?.preferredLocale ?? "es"} suppressHydrationWarning>
      <body className={`${bodyFont.variable} ${headingFont.variable}`}>
        <Providers
          initialLocale={user?.preferredLocale ?? "es"}
          initialTheme={user?.themeMode ?? "dark"}
          isAuthenticated={Boolean(user)}
        >
          {children}
        </Providers>
      </body>
    </html>
  );
}
