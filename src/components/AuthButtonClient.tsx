"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function AuthButtonClient({ user }: { user: any }) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  if (user) {
    const avatarUrl = user.user_metadata?.avatar_url;
    const email = user.email || "User";

    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300">
          {avatarUrl ? (
            <img src={avatarUrl} alt="User Avatar" className="h-4 w-4 rounded-full object-cover" />
          ) : (
            <UserIcon className="h-3.5 w-3.5 text-zinc-400" />
          )}
          <span className="max-w-[100px] sm:max-w-[140px] truncate">{email}</span>
        </div>

        <button
          onClick={handleSignOut}
          type="button"
          aria-label="Sign Out"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors shadow-xs"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 text-xs font-semibold text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-all shadow-xs"
    >
      <UserIcon className="h-3.5 w-3.5" />
      <span>Sign In</span>
    </Link>
  );
}
