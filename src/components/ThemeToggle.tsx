"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    // Check initial dark mode preference or html class
    const hasDarkClass = document.documentElement.classList.contains("dark");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (hasDarkClass || prefersDark) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  if (!mounted) {
    return (
      <div className="h-9 w-9 rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 animate-pulse" />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label="Toggle theme"
      className="relative flex items-center justify-center h-9 w-9 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
    >
      {isDark ? (
        <Sun className="h-4 w-4 transition-transform duration-200 rotate-0 hover:rotate-45 text-amber-400" />
      ) : (
        <Moon className="h-4 w-4 transition-transform duration-200 rotate-0 hover:-rotate-12 text-zinc-700" />
      )}
    </button>
  );
}
