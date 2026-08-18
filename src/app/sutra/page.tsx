import Link from "next/link";
import { Cpu, ArrowRight, AlertTriangle, Inbox, PenSquare } from "lucide-react";
import SutraPostCard, { SutraPost } from "@/components/SutraPostCard";
import ComposeSutra from "@/components/ComposeSutra";
import { supabase } from "@/lib/supabaseClient";

export const revalidate = 0; // Ensure fresh server-rendered data

export default async function SutraPage() {
  let posts: SutraPost[] = [];
  let fetchError: string | null = null;

  try {
    const { data, error } = await supabase
      .from("sutra_posts")
      .select(`
        id,
        author_handle,
        created_at,
        sutra_card_nodes (
          id,
          card_order,
          content
        ),
        pramaan_vault (
          id,
          topic_slug,
          primary_source,
          source_citation,
          original_script_text
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      fetchError = error.message;
    } else if (data) {
      posts = data.map((row: any) => {
        // Sort card nodes by card_order ascending
        const sortedNodes = (row.sutra_card_nodes || []).sort(
          (a: any, b: any) => (a.card_order || 0) - (b.card_order || 0)
        );

        // Extract joined pramaan_vault record
        const pramaan = Array.isArray(row.pramaan_vault)
          ? row.pramaan_vault[0]
          : row.pramaan_vault || row.attached_pramaan;

        return {
          id: row.id,
          author_handle: row.author_handle || "anonymous",
          created_at: row.created_at,
          sutra_card_nodes: sortedNodes,
          attached_pramaan: pramaan || null,
        };
      });
    }
  } catch (err: any) {
    fetchError = err.message || "An unexpected error occurred while querying Sutra Feed.";
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-start py-6 space-y-8 w-full">
      {/* Centered Page Header */}
      <div className="space-y-3 max-w-2xl w-full text-left sm:text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300 text-xs font-medium">
          <Cpu className="h-3.5 w-3.5" />
          Module 2: Rule Generation & Social Feed
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
          Sutra (Module 2)
        </h1>
        <p className="text-base text-zinc-600 dark:text-zinc-400 max-w-xl sm:mx-auto">
          Rule engine and philosophical posts linked with verified Pramaan etymological citations.
        </p>
      </div>

      {/* Town Square Primary Input Area */}
      <div className="w-full max-w-2xl space-y-3 pb-6 border-b border-zinc-200 dark:border-zinc-800/80">
        <div className="flex items-center justify-between px-1 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1.5">
            <PenSquare className="h-3.5 w-3.5 text-indigo-500" />
            Town Square Composer
          </span>
          <span className="text-[11px] font-mono text-zinc-400 font-normal">Primary Input Area</span>
        </div>
        <ComposeSutra />
      </div>

      {/* Database Error Notice */}
      {fetchError && (
        <div className="w-full max-w-2xl rounded-xl border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-800 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Database Notice</span>
          </div>
          <p className="text-xs sm:text-sm text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
            Could not retrieve posts from Supabase: <code className="font-mono bg-amber-200/50 dark:bg-amber-900/40 px-1 py-0.5 rounded">{fetchError}</code>
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 pt-1">
            Ensure the <code className="font-mono">sutra_posts</code> and <code className="font-mono">sutra_card_nodes</code> tables are present in your Supabase project schema.
          </p>
        </div>
      )}

      {/* Empty State Fallback */}
      {!fetchError && posts.length === 0 && (
        <div className="w-full max-w-2xl rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/40 space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
            <Inbox className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            No Posts Found in Sutra Feed
          </h3>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            The database connected successfully, but no posts are currently available in the <code className="font-mono">sutra_posts</code> table. Use the Town Square composer above to publish your first thread!
          </p>
        </div>
      )}

      {/* Sutra Social Feed */}
      {!fetchError && posts.length > 0 && (
        <div className="w-full max-w-2xl space-y-6">
          <div className="px-1 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Sutra Feed ({posts.length})
          </div>
          {posts.map((post) => (
            <SutraPostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {/* Footer Navigation Link */}
      <div className="pt-4 flex items-center justify-center gap-4 max-w-2xl w-full">
        <Link
          href="/pramaan"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
        >
          Go to Pramaan (Module 1)
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
