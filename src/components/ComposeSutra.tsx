"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Plus,
  Trash2,
  Send,
  X,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  LogIn,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { PramaanRecord } from "./PramaanCard";

interface ComposeSutraProps {
  onPostPublished?: () => void;
}

export default function ComposeSutra({ onPostPublished }: ComposeSutraProps) {
  const router = useRouter();
  const supabase = createClient();

  // User Auth State
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  // State Management
  const [cards, setCards] = useState<string[]>([""]);
  const [authorHandle, setAuthorHandle] = useState<string>("@DharmaExplorer");
  const [selectedPramaan, setSelectedPramaan] = useState<PramaanRecord | null>(null);

  // Modal & Search State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [pramaanSearch, setPramaanSearch] = useState<string>("");
  const [pramaanList, setPramaanList] = useState<PramaanRecord[]>([]);
  const [isLoadingPramaan, setIsLoadingPramaan] = useState<boolean>(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  // Check user authentication on mount & subscribe to changes
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser);
      if (currentUser?.email) {
        setAuthorHandle(`@${currentUser.email.split("@")[0]}`);
      }
      setCheckingAuth(false);
    };

    fetchUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user?.email) {
        setAuthorHandle(`@${session.user.email.split("@")[0]}`);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch Pramaan records for selection when modal opens
  useEffect(() => {
    if (isModalOpen && pramaanList.length === 0) {
      fetchPramaanRecords();
    }
  }, [isModalOpen]);

  const fetchPramaanRecords = async () => {
    setIsLoadingPramaan(true);
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
          pramaan_translations (
            language_code,
            title,
            popular_myth,
            verified_root,
            summary_bullets
          )
        `);

      if (error) {
        console.error("Failed to fetch Pramaan records:", error);
      } else if (data) {
        const formatted: PramaanRecord[] = data.map((row: any) => {
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
                title: translationObj?.title || row.topic_slug,
                popular_myth: translationObj?.popular_myth || "",
                verified_root: translationObj?.verified_root || "",
                summary_bullets: translationObj?.summary_bullets || [],
              },
            },
          };
        });
        setPramaanList(formatted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingPramaan(false);
    }
  };

  // Card Management Functions
  const handleCardChange = (index: number, value: string) => {
    const nextCards = [...cards];
    nextCards[index] = value;
    setCards(nextCards);
  };

  const addCard = () => {
    if (cards.length < 4) {
      setCards([...cards, ""]);
    }
  };

  const removeCard = (index: number) => {
    if (cards.length > 1) {
      setCards(cards.filter((_, i) => i !== index));
    }
  };

  // Filtered Pramaan records for selection modal
  const filteredPramaan = pramaanList.filter((p) => {
    if (!pramaanSearch.trim()) return true;
    const term = pramaanSearch.toLowerCase();
    const title = p.translations?.en?.title || "";
    return (
      p.topic_slug.toLowerCase().includes(term) ||
      title.toLowerCase().includes(term) ||
      p.primary_source.toLowerCase().includes(term)
    );
  });

  // Submit Handler
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!user) {
      setStatusMessage({ type: "error", text: "You must be signed in to publish a Sutra." });
      return;
    }

    const validCards = cards.map((c) => c.trim()).filter((c) => c.length > 0);
    if (validCards.length === 0) {
      setStatusMessage({ type: "error", text: "Please enter text for at least one card." });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Insert parent post into sutra_posts
      const payload: any = {
        author_handle: authorHandle.startsWith("@") ? authorHandle : `@${authorHandle}`,
      };

      if (selectedPramaan) {
        payload.attached_pramaan_id = selectedPramaan.id;
      }

      let postData: any = null;
      let postError: any = null;

      const res = await supabase.from("sutra_posts").insert(payload).select().single();
      postData = res.data;
      postError = res.error;

      // Fallback if schema column name is pramaan_id
      if (postError && selectedPramaan) {
        delete payload.attached_pramaan_id;
        payload.pramaan_id = selectedPramaan.id;
        const res2 = await supabase.from("sutra_posts").insert(payload).select().single();
        postData = res2.data;
        postError = res2.error;
      }

      if (postError || !postData) {
        throw new Error(postError?.message || "Failed to insert parent sutra_post.");
      }

      // 2. Insert card nodes into sutra_card_nodes with card_order
      const nodeRows = validCards.map((text, idx) => ({
        post_id: postData.id,
        card_order: idx + 1,
        content: text,
      }));

      const { error: nodesError } = await supabase.from("sutra_card_nodes").insert(nodeRows);

      if (nodesError) {
        throw new Error(nodesError.message);
      }

      // Reset Form State
      setStatusMessage({ type: "success", text: "Sutra thread published successfully!" });
      setCards([""]);
      setSelectedPramaan(null);
      router.refresh();
      if (onPostPublished) onPostPublished();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "An error occurred while publishing." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // If user is not authenticated, display clean 'Sign in to compose a Sutra' state
  if (!checkingAuth && !user) {
    return (
      <div className="w-full max-w-2xl rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/60 space-y-4 shadow-xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
            Sign in to compose a Sutra
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            You must be authenticated to publish thought threads and attach verified truth citations to the Town Square.
          </p>
        </div>
        <div className="pt-1 flex items-center justify-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-xs font-semibold text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-all shadow-xs"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Sign In to Compose</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90 transition-all space-y-5">
      {/* Header & Author Handle Input */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800/60">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Draft Sutra Thread
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Compose up to 4 sequential cards linked with a verified truth citation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="author-handle-input" className="text-xs text-zinc-400 font-medium">
            Handle:
          </label>
          <input
            id="author-handle-input"
            type="text"
            value={authorHandle}
            onChange={(e) => setAuthorHandle(e.target.value)}
            placeholder="@DharmaExplorer"
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
      </div>

      {/* Status Notifications */}
      {statusMessage && (
        <div
          className={`flex items-center gap-2 rounded-xl p-3 text-xs font-medium ${
            statusMessage.type === "error"
              ? "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50"
              : "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50"
          }`}
        >
          {statusMessage.type === "error" ? (
            <AlertCircle className="h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Cards List Drafting Area */}
      <form onSubmit={handlePublish} className="space-y-4">
        <div className="space-y-3">
          {cards.map((cardText, index) => (
            <div key={index} className="group relative space-y-1">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-400 px-1">
                <span>Card {index + 1} of 4</span>
                {cards.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCard(index)}
                    aria-label={`Remove Card ${index + 1}`}
                    className="text-zinc-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <textarea
                value={cardText}
                onChange={(e) => handleCardChange(index, e.target.value)}
                placeholder={
                  index === 0
                    ? "Express your core principle or sutra premise..."
                    : "Elaborate further or add supporting logic..."
                }
                rows={3}
                className="w-full rounded-xl border border-zinc-200 bg-white p-3.5 text-sm text-zinc-900 placeholder-zinc-400 shadow-xs transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
              />
            </div>
          ))}
        </div>

        {/* Add Card Button (Disappears if cards.length === 4) */}
        {cards.length < 4 && (
          <button
            type="button"
            onClick={addCard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-zinc-300 text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:border-zinc-600 transition-all"
          >
            <Plus className="h-3.5 w-3.5 text-indigo-500" />
            <span>Add Card ({cards.length}/4)</span>
          </button>
        )}

        {/* Attached Pramaan Display or Attach Button */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 space-y-2">
          {selectedPramaan ? (
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/40">
              <div className="flex items-center gap-2.5 min-w-0">
                <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 truncate">
                      {selectedPramaan.translations?.en?.title || selectedPramaan.topic_slug}
                    </span>
                    <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                      #{selectedPramaan.topic_slug}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 truncate">
                    {selectedPramaan.primary_source} ({selectedPramaan.source_citation})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPramaan(null)}
                aria-label="Detach Pramaan citation"
                className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/50 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-all"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Attach Truth Citation</span>
            </button>
          )}
        </div>

        {/* Action Controls & Submit */}
        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-sm font-semibold text-zinc-50 hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-all shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Publish Thread</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Attach Pramaan Selection Modal / Dropdown */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50">
                  Attach Verified Pramaan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search Input inside Modal */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={pramaanSearch}
                onChange={(e) => setPramaanSearch(e.target.value)}
                placeholder="Search Pramaan by topic or source..."
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-9 pr-3 text-xs text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            {/* Pramaan Records Selection List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {isLoadingPramaan && (
                <div className="py-8 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                  <span>Loading Pramaan Vault...</span>
                </div>
              )}

              {!isLoadingPramaan && filteredPramaan.length === 0 && (
                <div className="py-8 text-center text-xs text-zinc-400">
                  No verified Pramaan records found.
                </div>
              )}

              {!isLoadingPramaan &&
                filteredPramaan.map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => {
                      setSelectedPramaan(record);
                      setIsModalOpen(false);
                    }}
                    className="w-full text-left p-3 rounded-xl border border-zinc-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-500/60 dark:hover:bg-emerald-950/30 transition-all space-y-1 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                        {record.translations?.en?.title || record.topic_slug}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                        #{record.topic_slug}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                      <BookOpen className="h-3 w-3 text-amber-500" />
                      <span>{record.primary_source}</span>
                      <span>({record.source_citation})</span>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
