import Link from "next/link";
import { ShieldCheck, Cpu, ArrowRight, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-10">
      {/* Hero Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-zinc-200 bg-white/80 dark:border-zinc-800 dark:bg-zinc-900/80 text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-xs">
        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
        <span>MoolSutra Platform Architecture</span>
      </div>

      {/* Main Title & Subtitle */}
      <div className="space-y-4 max-w-2xl">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
          Modular Intelligence & Verification System
        </h1>
        <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed">
          Welcome to MoolSutra. The routing environment has been successfully configured for both core operational modules.
        </p>
      </div>

      {/* Module Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl text-left">
        {/* Module 1: Pramaan */}
        <Link
          href="/pramaan"
          className="group relative rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/70 transition-all hover:border-emerald-500/50 dark:hover:border-emerald-500/50 flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Pramaan
            </h2>
            <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider">
              Module 1
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Verification and validation engine route.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <span>Verify Route</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        {/* Module 2: Sutra */}
        <Link
          href="/sutra"
          className="group relative rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/70 transition-all hover:border-indigo-500/50 dark:hover:border-indigo-500/50 flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Cpu className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              Sutra
            </h2>
            <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider">
              Module 2
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Rule generation and execution engine route.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <span>Verify Route</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      </div>
    </div>
  );
}
