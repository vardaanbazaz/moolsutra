import Link from "next/link";
import { ShieldCheck, ArrowRight, AlertTriangle, Inbox } from "lucide-react";
import { PramaanRecord } from "@/components/PramaanCard";
import PramaanVaultView from "@/components/PramaanVaultView";
import { supabase } from "@/lib/supabaseClient";

export const revalidate = 0; // Ensure fresh data on requests

export default async function PramaanPage() {
  let records: PramaanRecord[] = [];
  let fetchError: string | null = null;

  try {
    const { data, error } = await supabase
      .from("pramaan_vault")
      .select(`
        id,
        topic_slug,
        category,
        primary_source,
        source_citation,
        original_script_text,
        pramaan_translations!inner (
          language_code,
          title,
          popular_myth,
          verified_root,
          summary_bullets
        )
      `)
      .eq("pramaan_translations.language_code", "en");

    if (error) {
      fetchError = error.message;
    } else if (data) {
      records = data.map((row: any) => {
        const translationObj = Array.isArray(row.pramaan_translations)
          ? row.pramaan_translations.find((t: any) => t.language_code === "en") || row.pramaan_translations[0]
          : row.pramaan_translations;

        return {
          id: row.id,
          topic_slug: row.topic_slug,
          category: row.category,
          primary_source: row.primary_source,
          source_citation: row.source_citation,
          original_script_text: row.original_script_text,
          translations: {
            en: {
              title: translationObj?.title || "Untitled",
              popular_myth: translationObj?.popular_myth || "",
              verified_root: translationObj?.verified_root || "",
              summary_bullets: translationObj?.summary_bullets || [],
            },
          },
        };
      });
    }
  } catch (err: any) {
    fetchError = err.message || "An unexpected error occurred while fetching from Supabase.";
  }

  return (
    <div className="flex-1 flex flex-col items-start justify-start py-6 space-y-8 w-full">
      {/* Page Header */}
      <div className="space-y-3 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-medium">
          <ShieldCheck className="h-3.5 w-3.5" />
          Module 1: Verification Engine (Live Supabase)
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
          Pramaan (Module 1)
        </h1>
        <p className="text-base text-zinc-600 dark:text-zinc-400">
          Verification and truth core. Search and browse verified root etymologies and Vedic textual citations loaded directly from the Supabase Vault.
        </p>
      </div>

      {/* Fetch Error Graceful Fallback */}
      {fetchError && (
        <div className="w-full max-w-3xl rounded-xl border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-800 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Database Notice</span>
          </div>
          <p className="text-xs sm:text-sm text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
            Could not retrieve records from Supabase: <code className="font-mono bg-amber-200/50 dark:bg-amber-900/40 px-1 py-0.5 rounded">{fetchError}</code>
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 pt-1">
            Ensure the <code className="font-mono">pramaan_vault</code> and <code className="font-mono">pramaan_translations</code> tables exist in your Supabase project schema.
          </p>
        </div>
      )}

      {/* Empty State Fallback */}
      {!fetchError && records.length === 0 && (
        <div className="w-full max-w-3xl rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/40 space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
            <Inbox className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            No Records Found in Pramaan Vault
          </h3>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            The database connected successfully, but no records matching <code className="font-mono">language_code = &apos;en&apos;</code> were found.
          </p>
        </div>
      )}

      {/* Pramaan Vault View with Search Filtering */}
      {!fetchError && records.length > 0 && (
        <PramaanVaultView records={records} />
      )}

      {/* Footer Navigation Link */}
      <div className="pt-4 flex items-center gap-4">
        <Link
          href="/sutra"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
        >
          Proceed to Sutra (Module 2)
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
