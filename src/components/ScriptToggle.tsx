"use client";

import { Languages } from "lucide-react";
import { useScript } from "./ScriptContext";

export default function ScriptToggle() {
  const { scriptMode, toggleScriptMode } = useScript();

  return (
    <button
      onClick={toggleScriptMode}
      type="button"
      aria-label="Toggle script transliteration mode"
      title={`Script Mode: ${scriptMode === "roman" ? "Romanized (English)" : "Indic (Devanagari)"}`}
      className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 transition-all hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 text-xs font-medium shadow-xs"
    >
      <Languages className="h-4 w-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
      <span className="font-mono text-[11px]">
        <span className={scriptMode === "roman" ? "font-bold text-indigo-600 dark:text-indigo-300" : "text-zinc-400"}>
          A
        </span>
        <span className="text-zinc-300 dark:text-zinc-600 mx-0.5">/</span>
        <span className={scriptMode === "indic" ? "font-bold text-indigo-600 dark:text-indigo-300" : "text-zinc-400"}>
          अ
        </span>
      </span>
    </button>
  );
}
