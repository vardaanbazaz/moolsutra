"use client";

import { useState, useMemo } from "react";
import { SearchX, Filter } from "lucide-react";
import SearchBar from "./SearchBar";
import PramaanCard, { PramaanRecord } from "./PramaanCard";

interface PramaanVaultViewProps {
  records: PramaanRecord[];
}

export default function PramaanVaultView({ records }: PramaanVaultViewProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");

  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return records;

    const term = searchTerm.trim().toLowerCase();

    return records.filter((record) => {
      // 1. Topic Slug match
      const slugMatch = record.topic_slug.toLowerCase().includes(term);

      // 2. Original Script Text (Unicode Indic) match
      const scriptMatch = record.original_script_text.toLowerCase().includes(term);

      // 3. Translations Title (and content) match
      const translationMatch = Object.values(record.translations).some((t) =>
        t.title.toLowerCase().includes(term) ||
        t.popular_myth.toLowerCase().includes(term) ||
        t.verified_root.toLowerCase().includes(term)
      );

      // 4. Category & Source match
      const categoryMatch = record.category.toLowerCase().includes(term);
      const sourceMatch = record.primary_source.toLowerCase().includes(term);

      return slugMatch || scriptMatch || translationMatch || categoryMatch || sourceMatch;
    });
  }, [records, searchTerm]);

  return (
    <div className="w-full space-y-6">
      {/* Search Bar Container */}
      <div className="w-full max-w-3xl space-y-2">
        <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        
        {/* Results Counter / Filter Status */}
        {searchTerm.trim() && (
          <div className="flex items-center justify-between px-1 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Filter className="h-3 w-3 text-emerald-500" />
              Showing {filteredRecords.length} of {records.length} {records.length === 1 ? "record" : "records"} for &quot;<span className="font-semibold text-zinc-700 dark:text-zinc-300">{searchTerm}</span>&quot;
            </span>
            <button
              onClick={() => setSearchTerm("")}
              type="button"
              className="text-emerald-600 hover:underline dark:text-emerald-400 font-medium"
            >
              Reset filter
            </button>
          </div>
        )}
      </div>

      {/* No Matching Records State */}
      {filteredRecords.length === 0 && (
        <div className="w-full max-w-3xl rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/40 space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
            <SearchX className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            No etymology records match your query
          </h3>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            No records matched &quot;<span className="font-semibold text-zinc-700 dark:text-zinc-300">{searchTerm}</span>&quot;. Try searching for &quot;Koti&quot;, &quot;Brihadaranyaka&quot;, or Devanagari script like &quot;त्रयस्त्रिंशत्&quot;.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setSearchTerm("")}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors"
            >
              Clear search filter
            </button>
          </div>
        </div>
      )}

      {/* Filtered Pramaan Records */}
      {filteredRecords.length > 0 && (
        <div className="w-full space-y-6">
          {filteredRecords.map((record) => (
            <PramaanCard key={record.id} record={record} />
          ))}
        </div>
      )}
    </div>
  );
}
