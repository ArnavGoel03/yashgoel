"use client";

import { useEffect, useState } from "react";
import { useClientValue } from "@/lib/use-client-value";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

const STORAGE_KEY = "yashgoel-theme";
// Dark is the house style: the editorial stone-on-near-black aesthetic
// looks right by default. Users who prefer light can still toggle, and
// the choice is persisted for next visit.
const DEFAULT_THEME: Theme = "dark";

function apply(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
}

function storedTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function ThemeToggle() {
  // The stored preference is read, not copied into state on mount. A
  // click overrides it for the rest of the page. Painting the class onto
  // <html> stays in an effect because it is a real DOM side effect, and
  // it runs for the stored value too, not only for clicks.
  const stored = useClientValue<Theme>(storedTheme, DEFAULT_THEME);
  const [override, setOverride] = useState<Theme | null>(null);
  const theme = override ?? stored;

  useEffect(() => {
    apply(theme);
  }, [theme]);

  function set(next: Theme) {
    setOverride(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // private mode: the choice still applies for this page
    }
  }

  const resolved: "light" | "dark" = theme;

  const isLight = resolved === "light";
  const isDark = resolved === "dark";

  return (
    <div
      role="group"
      aria-label="Theme"
      className="relative inline-flex items-center rounded-full border border-stone-200 bg-stone-50 p-0.5 dark:border-stone-800 dark:bg-stone-900"
    >
      <button
        type="button"
        onClick={() => set("light")}
        aria-label="Light mode"
        aria-pressed={isLight}
        title="Light mode"
        className={
          "relative z-10 inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors lg:h-7 lg:w-7 " +
          (isLight
            ? "bg-white text-stone-900 shadow-sm"
            : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200")
        }
      >
        <Sun className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => set("dark")}
        aria-label="Dark mode"
        aria-pressed={isDark}
        title="Dark mode"
        className={
          "relative z-10 inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors lg:h-7 lg:w-7 " +
          (isDark
            ? "bg-stone-800 text-stone-100 shadow-sm"
            : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200")
        }
      >
        <Moon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// The inline pre-hydration init script lives in lib/theme-script.ts so
// proxy.ts (Edge runtime) and app/layout.tsx (RSC) can share a single
// byte-exact source whose SHA-256 is authorized in CSP.
