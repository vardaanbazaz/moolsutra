"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { useScript } from "./ScriptContext";

export interface SutraCardNode {
  id: string;
  card_order: number;
  content: string;
  content_text?: string;
  text?: string;
}

export interface AttachedPramaan {
  id?: string;
  topic_slug: string;
  primary_source: string;
  source_citation?: string;
  original_script_text?: string;
}

export interface SutraPost {
  id: string;
  author_handle: string;
  created_at?: string;
  sutra_card_nodes: SutraCardNode[];
  attached_pramaan?: AttachedPramaan | null;
}

interface SutraPostCardProps {
  post: SutraPost;
}

export default function SutraPostCard({ post }: SutraPostCardProps) {
  const { scriptMode } = useScript();

  // Ensure card nodes are ordered by card_order ascending
  const sortedNodes = [...(post.sutra_card_nodes || [])].sort(
    (a, b) => (a.card_order || 0) - (b.card_order || 0)
  );

  const pramaan = post.attached_pramaan;

  return (
    <article className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90 transition-all space-y-4">
      {/* Author Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800/60">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 font-bold text-xs shadow-xs">
            {post.author_handle ? post.author_handle.replace(/^@/, "").slice(0, 2).toUpperCase() : "AU"}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">
                @{post.author_handle ? post.author_handle.replace(/^@/, "") : "anonymous"}
              </span>
            </div>
            {post.created_at && (
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block">
                {new Date(post.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Social-Feed Body: Sutra Card Nodes */}
      <div className="space-y-3 pt-1">
        {sortedNodes.map((node, index) => {
          const textContent = node.content || node.content_text || node.text || "";
          return (
            <div
              key={node.id || index}
              className="text-sm sm:text-base text-zinc-800 dark:text-zinc-200 leading-relaxed font-normal bg-zinc-50/60 dark:bg-zinc-800/30 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800/40"
            >
              {textContent}
            </div>
          );
        })}
      </div>

      {/* Attached Pramaan Citation Chip (Reacts to scriptMode) */}
      {pramaan && (
        <div className="pt-2">
          <Link
            href="/pramaan"
            className="group flex items-center justify-between gap-3 rounded-xl border border-emerald-200/90 bg-emerald-50/60 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/40 hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-zinc-50 dark:bg-emerald-500 dark:text-zinc-950">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold text-emerald-950 dark:text-emerald-200 truncate transition-all ${
                      scriptMode === "indic"
                        ? "font-serif text-sm font-bold text-amber-900 dark:text-amber-200"
                        : ""
                    }`}
                  >
                    {scriptMode === "indic" && pramaan.original_script_text
                      ? pramaan.original_script_text
                      : "Attached Citation"}
                  </span>
                  <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded">
                    #{pramaan.topic_slug}
                  </span>
                </div>
                <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 truncate">
                  Source: <span className="font-medium">{pramaan.primary_source}</span>
                  {pramaan.source_citation ? ` (${pramaan.source_citation})` : ""}
                </p>
              </div>
            </div>
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 group-hover:underline shrink-0">
              View Pramaan &rarr;
            </span>
          </Link>
        </div>
      )}
    </article>
  );
}
