"use client";

import { Search, X } from "lucide-react";

interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  searchTerm,
  setSearchTerm,
  placeholder = "Search by topic, Indic script (e.g. त्रयस्त्रिंशत्), title, or source...",
}: SearchBarProps) {
  return (
    <div className="relative w-full">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
        <Search className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
      </div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder={placeholder}
        aria-label="Search etymology records"
        className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-10 pr-10 text-sm text-zinc-900 placeholder-zinc-400 shadow-xs transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20"
      />
      {searchTerm && (
        <button
          onClick={() => setSearchTerm("")}
          type="button"
          aria-label="Clear search query"
          className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
