"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layers, ShieldCheck, Cpu } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import ScriptToggle from "./ScriptToggle";
import AuthButtonClient from "./AuthButtonClient";

export default function Navbar({ authButton }: { authButton?: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/", icon: Layers },
    { name: "Pramaan (Module 1)", href: "/pramaan", icon: ShieldCheck },
    { name: "Sutra (Module 2)", href: "/sutra", icon: Cpu },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80 transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 hover:opacity-90 transition-opacity"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 font-mono font-semibold text-sm shadow-sm">
              MS
            </div>
            <span className="font-semibold text-lg bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 dark:from-zinc-50 dark:via-zinc-300 dark:to-zinc-50 bg-clip-text text-transparent">
              MoolSutra
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    isActive
                      ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800/80 dark:text-zinc-50"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-400"}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ScriptToggle />
          <ThemeToggle />
          {authButton || <AuthButtonClient user={null} />}
        </div>
      </div>

      {/* Mobile navigation sub-bar */}
      <div className="flex md:hidden border-t border-zinc-200 dark:border-zinc-800/60 px-4 py-2 gap-2 overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                isActive
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.name}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
