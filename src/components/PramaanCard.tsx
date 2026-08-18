"use client";

import { useState } from "react";
import {
  BookOpen,
  AlertCircle,
  CheckCircle2,
  ListFilter,
  GraduationCap,
  Sparkles,
  Tag,
  Quote,
} from "lucide-react";
import { useScript } from "./ScriptContext";

export interface PramaanTranslation {
  title: string;
  popular_myth: string;
  verified_root: string;
  summary_bullets: string[];
}

export interface PramaanRecord {
  id: string;
  topic_slug: string;
  category: string;
  primary_source: string;
  source_citation: string;
  original_script_text: string;
  translations: {
    en: PramaanTranslation;
    [key: string]: PramaanTranslation;
  };
}

interface PramaanCardProps {
  record: PramaanRecord;
  lang?: string;
}

export default function PramaanCard({ record, lang = "en" }: PramaanCardProps) {
  const [viewMode, setViewMode] = useState<"summary" | "scholar">("summary");
  const { scriptMode } = useScript();

  const translation = record.translations[lang] || record.translations["en"];

  return (
    <article className="w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white p-5 sm:p-7 shadow-md dark:border-zinc-800 dark:bg-zinc-900/90 transition-colors space-y-6">
      {/* Top Meta Bar & Citation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800/80">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            <Tag className="h-3 w-3 text-zinc-500" />
            {record.category}
          </span>
          <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
            #{record.topic_slug}
          </span>
        </div>

        {/* Citation Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-200/80 bg-amber-50/60 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300 text-xs font-medium">
          <BookOpen className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span>{record.primary_source}</span>
          <span className="text-amber-400 dark:text-amber-600">•</span>
          <span className="font-mono text-[11px] opacity-90">{record.source_citation}</span>
        </div>
      </div>

      {/* Main Title (Reacts to scriptMode: 'indic' vs 'roman') */}
      <div className="space-y-1">
        <h2
          className={`font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 transition-all ${
            scriptMode === "indic"
              ? "font-serif text-3xl sm:text-4xl text-amber-900 dark:text-amber-200"
              : "text-2xl sm:text-3xl"
          }`}
        >
          {scriptMode === "indic" && record.original_script_text
            ? record.original_script_text
            : translation.title}
        </h2>
      </div>

      {/* 1. Bold Red Callout Section for popular_myth */}
      <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 sm:p-5 dark:border-rose-900/50 dark:bg-rose-950/30 space-y-2">
        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 text-xs font-bold uppercase tracking-wider">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Popular Misconception</span>
        </div>
        <p className="text-sm sm:text-base font-medium text-rose-950 dark:text-rose-200 leading-relaxed">
          {translation.popular_myth}
        </p>
      </div>

      {/* 2. Green / Verified Section for verified_root */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5 dark:border-emerald-900/50 dark:bg-emerald-950/30 space-y-2">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Verified Vedic Root</span>
        </div>
        <p className="text-sm sm:text-base font-medium text-emerald-950 dark:text-emerald-100 leading-relaxed">
          {translation.verified_root}
        </p>
      </div>

      {/* 4. Dual-View Toggle & Content Section */}
      <div className="pt-2 space-y-4">
        {/* Toggle Controls */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Analysis View
          </span>
          <div className="inline-flex rounded-lg p-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60">
            <button
              onClick={() => setViewMode("summary")}
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === "summary"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-50"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <ListFilter className="h-3.5 w-3.5" />
              Summary Mode
            </button>
            <button
              onClick={() => setViewMode("scholar")}
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === "scholar"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-50"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              Scholar Mode
            </button>
          </div>
        </div>

        {/* View Mode Content Container */}
        {viewMode === "summary" ? (
          <div className="space-y-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 p-4 border border-zinc-100 dark:border-zinc-800/60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Key Takeaways
            </h3>
            <ul className="space-y-2.5">
              {translation.summary_bullets.map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-700 text-xs font-semibold dark:bg-zinc-700 dark:text-zinc-200 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="space-y-4 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 p-6 border border-amber-500/20 text-center">
            <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Quote className="h-4 w-4 opacity-75" />
              <span>Original Script & Textual Evidence</span>
            </div>

            {/* Larger Indic Typography */}
            <div className="py-4">
              <span className="text-3xl sm:text-4xl lg:text-5xl font-serif font-semibold text-amber-900 dark:text-amber-200 tracking-wide block leading-snug">
                {record.original_script_text}
              </span>
            </div>

            <div className="text-xs text-amber-800/80 dark:text-amber-300/80 font-mono border-t border-amber-500/20 pt-3 max-w-md mx-auto">
              Source: {record.primary_source} ({record.source_citation})
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
