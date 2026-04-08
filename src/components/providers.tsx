"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { getDictionary } from "@/lib/i18n";
import type { LocaleKey, ThemeMode, TranslationDictionary } from "@/lib/types";

type PreferencesContextValue = {
  locale: LocaleKey;
  theme: ThemeMode;
  dictionary: TranslationDictionary;
  setLocale: (locale: LocaleKey) => void;
  toggleTheme: () => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function Providers({
  children,
  initialLocale,
  initialTheme,
  isAuthenticated,
}: {
  children: ReactNode;
  initialLocale: LocaleKey;
  initialTheme: ThemeMode;
  isAuthenticated: boolean;
}) {
  const [locale, setLocaleState] = useState<LocaleKey>(() => {
    if (typeof window === "undefined") {
      return initialLocale;
    }

    return (window.localStorage.getItem("wellflow-locale") as LocaleKey | null) ?? initialLocale;
  });
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return initialTheme;
    }

    return (window.localStorage.getItem("wellflow-theme") as ThemeMode | null) ?? initialTheme;
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("wellflow-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem("wellflow-locale", locale);
  }, [locale]);

  async function syncPreferences(next: Partial<{ locale: LocaleKey; theme: ThemeMode }>) {
    if (!isAuthenticated) {
      return;
    }

    try {
      await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
    } catch {
      // Best-effort persistence to the server.
    }
  }

  const value: PreferencesContextValue = {
    locale,
    theme,
    dictionary: getDictionary(locale),
    setLocale: (nextLocale) => {
      setLocaleState(nextLocale);
      void syncPreferences({ locale: nextLocale });
    },
    toggleTheme: () => {
      const nextTheme = theme === "dark" ? "light" : "dark";
      setTheme(nextTheme);
      void syncPreferences({ theme: nextTheme });
    },
  };

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);

  if (!context) {
    throw new Error("usePreferences must be used within Providers");
  }

  return context;
}
