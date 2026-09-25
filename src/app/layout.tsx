import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import AuthButton from "@/components/AuthButton";
import { ScriptProvider } from "@/components/ScriptContext";

export const metadata: Metadata = {
  title: "MoolSutra Platform",
  description: "MoolSutra Modular Architecture - Pramaan & Sutra Modules",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 font-sans selection:bg-zinc-200 dark:selection:bg-zinc-800 transition-colors">
        <ScriptProvider>
          <Navbar authButton={<AuthButton />} />
          <main className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <footer className="border-t border-zinc-200 dark:border-zinc-800/80 py-6 text-center text-xs text-zinc-500 dark:text-zinc-500">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span>&copy; {new Date().getFullYear()} MoolSutra Architecture</span>
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Module Routes Active
                </span>
              </div>
            </div>
          </footer>
        </ScriptProvider>
      </body>
    </html>
  );
}
