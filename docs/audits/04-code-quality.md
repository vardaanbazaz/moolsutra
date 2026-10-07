# Audit 04 — Code Quality

- **Date:** 2026-10-07
- **Scope:** Application code on branch `phase2-auth` (HEAD `ab364e6`): TypeScript usage, lint, component architecture, client state, error handling, duplication and dead code, file organisation, testing, `CLAUDE.md`/`AGENTS.md`, and the order of the fix phase.
- **Mode:** Read-only. No network access. The only file created is this document. The commands run were `npm run lint` (and `npx eslint -f json .` for the same result in machine-readable form), `npx tsc --noEmit`, `npm run build`, `npm ls --depth=0`, and read-only `git`, `grep`, `find` and `sed` over the repo and `node_modules`. The build regenerated `.next/`, which is gitignored. `git status --short` was clean before the audit and shows only this file after it.
- **Prior audits:** Audits 01-03 in `docs/audits/`. Their "Decisions" sections override the proposals above them. Findings already covered there (`F-`, `D-`, `S-` IDs) are referenced, not repeated.
- **"Corrected schema"** in this document means the Audit 02 proposed schema, as changed by Audit 02 "Decisions (owner, 2026-09-25)" and "Consequences resolved", and by Audit 03 decision 9 (avatars dropped). In short: no `author_handle`, `likes_count`, `parent_post_id`, `native_dialect` or `avatar_url`; `pramaan_vault.status` added; no immutability triggers; card content up to 500 characters; `summary_bullets` 1-5 items; `create_sutra(text[], uuid, text)`; post throttle of 5 per 10 minutes and 20 per day; handles may not start with `moolsutra`.
- **Severity basis:** Impact on correctness and on how safely the fix phase can be carried out (by Claude Code, in this repo). No finding here is a security vulnerability on its own. Security impact is rated in Audits 02 and 03.
- **This document is public** (the repo is public). It contains repo-relative paths only.

---

## Summary

1. TypeScript is `strict`, `tsc` passes, and the build passes, but every Supabase row is typed `any` (15 lint errors) and the hand-written types already disagree with the corrected schema, so the schema change cannot be caught at compile time (C-01, C-02).
2. Lint is unchanged from F-04 (17 errors, 4 warnings). Only one rule is style noise. The rest point at the missing DB types, the composer's structure and the theme toggle, and each is cleared by a fix-phase step.
3. `ComposeSutra.tsx` (507 lines) does auth, data fetching, search, a modal and two inserts. It also briefly shows the composer to signed-out users. Data queries and mappers are duplicated across pages and components (C-04, C-05, C-06).
4. There are no route-level error, loading or not-found boundaries, and one latent null crash in vault search. There are no tests of any kind, and nothing verifies the RLS design that the whole security model depends on (C-03, C-08, C-15).
5. `CLAUDE.md`/`AGENTS.md` hold no project guidance. A draft is below, along with a 10-step fix order that closes every open F-/D-/S-/C- ID or marks it blocked.

---

## Findings table

| ID | Severity | Title | Evidence |
|----|----------|-------|----------|
| C-01 | HIGH | No generated DB types: every Supabase row is `any`, and the domain types are hand-written inside component files | 15 `no-explicit-any` (lint table); `PramaanCard.tsx:16-34`; `SutraPostCard.tsx:7-29`; no `Database` type or `src/types/` |
| C-02 | HIGH | Hand-written types disagree with the corrected schema; the breakage will show only at runtime | `SutraPostCard.tsx:11-12,25-28`; `PramaanCard.tsx:23-34`; `sutra/page.tsx:18,51`; Audit 02 Decisions C, A, consequence 1 |
| C-03 | MEDIUM | Vault search crashes when `original_script_text` is NULL | `PramaanVaultView.tsx:25`; `PramaanCard.tsx:29`; `pramaan/page.tsx:47`; Audit 02 inventory (nullable) and proposed `0003` (still nullable) |
| C-04 | MEDIUM | `ComposeSutra` is a 507-line component with seven responsibilities; its hook structure causes 3 of the lint problems | `ComposeSutra.tsx:26-507`; lint at `:76`, `:81`, `:83` |
| C-05 | MEDIUM | Composer shows the full form to signed-out users while auth loads; the user is fetched up to 3 times per page view | `ComposeSutra.tsx:32,50-76,246`; `AuthButton.tsx:5-8`; `middleware.ts:33` |
| C-06 | MEDIUM | Data access is scattered: the vault query and mapper are duplicated with divergent fallbacks; card sorting is done twice | `pramaan/page.tsx:14-57` vs `ComposeSutra.tsx:88-130`; `sutra/page.tsx:40-42` and `SutraPostCard.tsx:39-41` |
| C-07 | MEDIUM | Three different functions are named `createClient`; env vars are read with `!` in 8 places with no validation | `lib/supabaseClient.ts:3,5-6`; `utils/supabase/client.ts:3-6`; `utils/supabase/server.ts:4-9`; `middleware.ts:10-11` |
| C-08 | MEDIUM | No `error.tsx`/`loading.tsx`/`not-found.tsx`; error handling is inconsistent, and a failed picker fetch looks like an empty vault | `find src -name 'error.tsx' -o -name 'loading.tsx' ...`: 0 results; `ComposeSutra.tsx:106-107,133-134,469-473`; `AuthButtonClient.tsx:12-15` |
| C-09 | MEDIUM | Theme toggle code is structurally wrong (beyond F-07): set-state-in-effect, no persistence, no OS listener; a real fix needs an inline script that interacts with the CSP | `ThemeToggle.tsx:7-22,34-38`; lint `:11`; `next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md:244-296` |
| C-10 | LOW | Script mode resets on reload; context exposes an unused setter; Indic text carries no `lang` attribute | `ScriptContext.tsx:9,16,23`; `layout.tsx:18`; `PramaanCard.tsx:79-81,170`; `SutraPostCard.tsx:107-109` |
| C-11 | LOW | Duplicated UI markup: status banner, database notice, empty state, footer links, button class strings | `login/page.tsx:89-104` vs `ComposeSutra.tsx:302-317`; `pramaan/page.tsx:80-130` vs `sutra/page.tsx:91-148` |
| C-12 | LOW | Dead code not listed in F-13 | `SutraPostCard.tsx:11-12,75`; `ScriptContext.tsx:9,23`; `pramaan/page.tsx:37-39`; `sutra/page.tsx:7`, `pramaan/page.tsx:7` |
| C-13 | LOW | Flat folder layout with both `lib/` and `utils/`, and types exported from client components; it will not scale to Phase 2 | `git ls-files src`; `pramaan/page.tsx:3`, `ComposeSutra.tsx:20` import types from `PramaanCard.tsx` |
| C-14 | LOW | Scaffold naming and copy that contradict the product ("Rule generation engine", "Module 1/2", fake status pill) | `page.tsx:41,45,66,70`; `sutra/page.tsx:68,74`; `Navbar.tsx:15-16`; `layout.tsx:8-9,29-32`; `pramaan/page.tsx:69` |
| C-15 | HIGH | No executable verification of the RLS/DB design that all write security depends on; no test runner at all | `package.json:5-10`; no `supabase/`, no `*.test.*`; Audit 03 S-03 |
| C-16 | MEDIUM | `CLAUDE.md`/`AGENTS.md` contain no project guidance for the fix phase | `CLAUDE.md:1`; `AGENTS.md:1-9`; `generate-agent-files.js:90-102,145-160` |
| C-17 | LOW | `tsconfig` and scripts: no `noUncheckedIndexedAccess`, unused `allowJs`, no `typecheck`/`test` scripts; the build type-checks but does not lint | `tsconfig.json:5,7`; `package.json:5-10`; build log "Running TypeScript" |
| C-18 | LOW | Client boundary is wider than needed: the whole feed card is a client component just to read script mode | `SutraPostCard.tsx:1,36,100-110` |
| C-19 | LOW | Accessibility gaps: unlabelled inputs, a modal without dialog semantics or keyboard handling, index keys on editable cards | `login/page.tsx:110,130`; `ComposeSutra.tsx:323,429-445` |

---

## Detailed findings

### C-01 — No generated DB types; rows handled as `any` (HIGH)

**Evidence**
- Every Supabase result is mapped through `any`:
  - `pramaan/page.tsx:36,38,59`
  - `sutra/page.tsx:38,41` (×2), `:58`
  - `ComposeSutra.tsx:31,109,111,191,199,200,238`
  - `AuthButtonClient.tsx:8` (prop typed `any`; the prop's content is S-13)
- That is 15 `any`, all flagged by `@typescript-eslint/no-explicit-any`. There are 0 `as` casts. The only other assertions are 8 non-null `!` on env vars (C-07). `User as UserIcon` in `AuthButtonClient.tsx:5` is an import alias, not an assertion.
- The domain types are hand-written and live inside client component files:
  - `PramaanTranslation`, `PramaanRecord` in `PramaanCard.tsx:16-34`
  - `SutraCardNode`, `AttachedPramaan`, `SutraPost` in `SutraPostCard.tsx:7-29`
  - `ScriptMode` in `ScriptContext.tsx:5`
- There is no `Database` type, no `src/types/`, and no generic on any `createClient` call.
- **Duplicated types:**
  - The vault record shape exists twice: `PramaanRecord` (full) and `AttachedPramaan` (subset with every field optional except two).
  - The `{ type: "error" | "success"; text: string }` status message type is declared separately in `login/page.tsx:16` and `ComposeSutra.tsx:47`.
- `tsc --noEmit` exits 0, but only because `any` switches checking off at the exact boundary where the schema is about to change.

**Impact:** The fix phase changes the schema (Audit 02 migrations 0001-0004 with decisions). With `any` at every boundary, the compiler cannot report any query or mapper that the change breaks.

**Fix**
1. Once migrations exist, generate types with the Supabase CLI (`supabase gen types typescript --local > src/types/database.ts`). The exact flags are **UNVERIFIED** (no network). Run it against the local stack; the remote project is not needed.
2. Pass the generic everywhere: `createBrowserClient<Database>(...)`, `createServerClient<Database>(...)`.
3. Derive the app types from it, for example `type PramaanRow = Database["public"]["Tables"]["pramaan_vault"]["Row"]`. Let the query result types flow into the mappers instead of annotating rows.
4. Move the domain types to `src/types/` (or next to the data functions, see C-06). Use `import type` in consumers.
5. Replace `catch (err: any)` with `catch (err: unknown)` and a small `errorMessage(err)` helper. Per S-09, user-facing messages should be generic anyway.
6. Add a `typecheck` script and keep `no-explicit-any` as an error.

### C-02 — Types disagree with the corrected schema (HIGH)

| App type / code | Corrected schema | Effect after migration |
|-----------------|------------------|------------------------|
| `SutraPost.author_handle: string` (`SutraPostCard.tsx:25`); Q3 selects `author_handle` (`sutra/page.tsx:18`) and defaults to `"anonymous"` (`:51`) | Column dropped (Decision C). Handle comes from the embed `profiles(handle)` through `author_id` | Q3 fails with "column not found". The page shows the Database Notice box and an empty feed (Audit 02 compatibility row Q3). It does not fail silently, but nothing catches it before runtime |
| Composer sends `author_handle` (`ComposeSutra.tsx:191-193`) | Not in the INSERT grant or the table | Insert fails (Audit 02 Q4). Replaced by `create_sutra` in the fix phase anyway (S-03) |
| `PramaanRecord` and `AttachedPramaan` have no `status` | `pramaan_vault.status` NOT NULL, `draft`/`under_review`/`reviewed`/`contested` (Decision A) | The badge required by "Consequences resolved" item 1 cannot be rendered without adding `status` to Q1, Q2 and Q3 |
| `SutraCardNode.content_text?`, `text?` (`SutraPostCard.tsx:11-12`) | Do not exist in any schema version | Dead fallbacks (C-12) |
| `PramaanRecord.original_script_text: string` (`PramaanCard.tsx:29`) | Nullable `text` | Latent crash (C-03) |
| `popular_myth: string` (`PramaanCard.tsx:18`) | Nullable | Masked by `|| ""` in both mappers |
| `SutraPost.created_at?`, `AttachedPramaan.id?`, `source_citation?` optional | All NOT NULL | Unnecessary branches in `SutraPostCard.tsx:59,117` |
| `translations: { en; [key: string] }` (`PramaanCard.tsx:30-33`) | Rows of `pramaan_translations` keyed by `language_code` | App-invented shape. Only `en` is ever loaded (F-13 notes `lang` is never passed) |
| `create_sutra(text[], uuid, text)` | New RPC | No client typing exists. Generated types cover `Functions` too |

**Fix:** done together with C-01 and the Q1/Q2/Q3 query changes in fix step 4. Model the UI types on the generated row types (`Pick<>` of real columns, plus the `profiles` embed). Delete fields the schema does not have.

### C-03 — Vault search crashes on a NULL `original_script_text` (MEDIUM)

**Evidence**
- `PramaanVaultView.tsx:25`: `record.original_script_text.toLowerCase().includes(term)`. There is no null guard.
- `pramaan/page.tsx:47` passes `row.original_script_text` through unchanged.
- The column is nullable in the dumped schema (Audit 02 inventory, `pramaan_vault.original_script_text text null`). It stays nullable in proposed `0003` (`original_script_text text check (char_length(original_script_text) <= 10000)`).
- Whether any current row has NULL is **UNVERIFIED**. The 5 records are blocked on Audit 05 anyway.

**Impact:** the first keystroke in the vault search throws a `TypeError` in a client component. There is no error boundary (C-08), so the whole page is replaced by the default error screen.

**Fix:** type it `string | null` (C-02) and use `record.original_script_text?.toLowerCase().includes(term) ?? false`. `PramaanCard.tsx:79,170` already render it conditionally or harmlessly. Add a unit test for the filter with a NULL record (C-15).

### C-04 — `ComposeSutra` does too much (MEDIUM)

**Evidence:** `ComposeSutra.tsx` is 507 lines with 11 `useState` hooks (`:31,32,35,36,37,40,41,42,43,46,47`). It handles:
1. Auth: `getUser` plus an `onAuthStateChange` subscription (`:50-76`).
2. Handle derivation from the email (`:56-57,68-69`). The content problem is F-06/S-03.
3. The vault fetch and its mapping (`:85-138`). This duplicates the server page (C-06).
4. Client-side search over the vault (`:160-169`).
5. Card list state (`:141-157`) and the form.
6. A two-step insert with a silent retry (`:172-243`). Covered by F-10/S-03.
7. The modal UI (`:429-504`).

Three lint problems come from this structure:
- `react-hooks/immutability` at `:81`: `fetchPramaanRecords` is used in an effect before its `const` declaration (`:85`). This is **not a runtime bug**, because the effect runs after the render has initialised the const. It is a structure smell: the function is recreated each render and captured stale.
- `exhaustive-deps` at `:76` (`supabase.auth`) and `:83` (`fetchPramaanRecords`, `pramaanList.length`).

**Fix:** the fix phase rewrites this component anyway for `create_sutra` (S-03). Split it as part of that rewrite:
- `sutra/page.tsx` (server) gets the user and profile handle and passes `handle: string | null` (C-05).
- `components/sutra/ComposeSutra.tsx` (client) keeps only the card state, validation (`maxLength={500}`) and the `rpc('create_sutra', ...)` call.
- `components/pramaan/PramaanPicker.tsx` (client) owns the modal, search and selection. It gets its records either as a prop from the server page or via a fetch inside an event handler (no effect needed: fetch on open, in the click handler).
- Use a typed `createSutra()` wrapper in the data layer (C-06).

This removes all three lint problems without suppressions.

### C-05 — Auth flash in the composer; repeated `getUser` (MEDIUM)

**Evidence**
- `checkingAuth` starts as `true` (`:32`). The signed-out branch renders only when `!checkingAuth && !user` (`:246`). While the check runs, **the full composer form is rendered**, including the handle input pre-filled with `@DharmaExplorer` (`:36`). A signed-out visitor sees the form, then it flips to "Sign in to compose".
- For one page view of `/sutra` by a signed-in user, the user is fetched:
  1. in the middleware (`middleware.ts:33`);
  2. in `AuthButton` (`AuthButton.tsx:5-8`) on the server;
  3. in the composer (`ComposeSutra.tsx:54`) from the browser, which is a network round-trip to Supabase Auth.

**Fix:** read the user once on the server in `sutra/page.tsx` with the cookie-aware server client (this also resolves the F-08 anon read for that page). Pass `{ handle }` from `profiles` (S-13 says to pass only minimal fields) to the composer as a prop. Keep `onAuthStateChange` only if sign-out in another tab must update the composer. Otherwise `router.refresh()` after sign-out (already in `AuthButtonClient.tsx:14`) re-renders the server page.

### C-06 — Data fetching is scattered and duplicated (MEDIUM)

**Evidence**
- **Vault query and mapper duplicated:** `pramaan/page.tsx:14-57` and `ComposeSutra.tsx:88-130` run nearly the same select and the same row→`PramaanRecord` mapping, with differences:
  - title fallback `"Untitled"` (`pramaan/page.tsx:50`) vs `row.topic_slug` (`ComposeSutra.tsx:123`);
  - the page uses `!inner` + `.eq('pramaan_translations.language_code','en')`, then still runs `.find(t => t.language_code === "en") || [0]` (`:37-39`), which is redundant after that filter;
  - the composer fetches every language and picks `en` client-side.
- **Card sort duplicated:** `sutra/page.tsx:40-42` sorts the nodes, and `SutraPostCard.tsx:39-41` sorts them again.
- Queries live inline in pages and components. No module owns "how we read a Pramaan record".

**Fix:** create `src/lib/data/`:
- `pramaan.ts`: `listPramaan(lang)` and one `toPramaanRecord(row)` mapper.
- `sutra.ts`: `listFeed()` with the `profiles(handle)` embed, ordering cards in the query (`.order('card_order', { referencedTable: 'sutra_card_nodes' })`; the option exists in the installed `@supabase/postgrest-js` 2.112.3, `dist/index.d.cts:1168-1171`), and `createSutra(cards, pramaanId)`.
- Server-side modules import `server-only` (S-16). The composer's picker gets the list as a prop from the server page, or calls a browser-safe function from the same module.
- Delete the second sort.

### C-07 — Three functions named `createClient`; unchecked env (MEDIUM)

This extends F-08 (three client patterns, anon reads on server pages) with the naming and safety angle; it does not repeat it.

**Evidence**
- `lib/supabaseClient.ts:3` imports `createClient` from `@supabase/supabase-js`.
- `utils/supabase/client.ts:3` exports a browser `createClient()`.
- `utils/supabase/server.ts:4` exports an async server `createClient()`.
- All three have the same name and different semantics (sync vs `await`, cookies vs none, browser vs server). An auto-import, by a human or by Claude Code, can silently pick the wrong one. Importing the server one in a client component fails only at build time, and only because of `next/headers`.
- `process.env.NEXT_PUBLIC_SUPABASE_URL!` and `..._ANON_KEY!` appear 8 times in 4 files (`middleware.ts:10-11`, `server.ts:8-9`, `client.ts:5-6`, `supabaseClient.ts:5-6`). A missing variable gives an opaque error from inside supabase-js rather than a clear message. The debug `console.log` at `supabaseClient.ts:1` (F-12) was added to diagnose exactly this.

**Fix:**
- One folder, `src/lib/supabase/`, with:
  - `env.ts`: reads both variables once and throws `"NEXT_PUBLIC_SUPABASE_URL is not set"` if missing;
  - `browser.ts`: `createBrowserSupabase()`;
  - `server.ts`: `createServerSupabase()`, with `import "server-only"`;
  - `proxy.ts`: `updateSession(request)`, used by `src/proxy.ts`.
- Delete `src/lib/supabaseClient.ts` and `src/utils/` (F-08, F-12).
- Apply the S-11 `cookieOptions` in these three places only.

### C-08 — No route boundaries; inconsistent error handling (MEDIUM)

**Evidence**
- `find src -name error.tsx -o -name loading.tsx -o -name not-found.tsx -o -name global-error.tsx` returns nothing.
- The server pages `await` Supabase with no Suspense or `loading.tsx`, so navigation shows nothing new until the query returns.
- Render-time throws (C-03, or a non-array `summary_bullets` per D-10) fall through to Next's default error page.
- Each surface handles errors differently:

| Surface | On error | On empty |
|---------|----------|----------|
| `/pramaan` (`page.tsx:33-34,59-60,80-93`) | Inline amber "Database Notice" with raw message (S-09) | Dashed empty card (`:96-108`) |
| `/sutra` (`page.tsx:35-36,58-59,91-104`) | Same pattern, copied | Same pattern, copied |
| Composer picker (`ComposeSutra.tsx:106-107,133-134`) | `console.error` only; the modal then shows **"No verified Pramaan records found."** (`:469-473`) | Same message, so error and empty cannot be told apart |
| Composer publish (`:238-239`) | Rose banner with raw message (S-09/D-11) | — |
| `/login` (`page.tsx:32-34,56-58`) | Rose banner with raw message (S-09) | — |
| Sign-out (`AuthButtonClient.tsx:12-15`) | Error ignored; `router.refresh()` runs regardless | — |
| `/auth/callback` | Silent redirect to `/` (S-04) | — |

**Fix**
- Add `src/app/error.tsx` (a client component; in Next 16 it receives `retry`, not `reset`: `next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md:27-43`), `src/app/global-error.tsx`, `src/app/not-found.tsx`, and `loading.tsx` for `/pramaan` and `/sutra`.
- Build one `Notice` component (variants: error, success, info) and one `EmptyState` component (C-11). Use fixed copy per S-09.
- In the picker, track `error` separately from the list and show "Couldn't load the vault, try again" with a retry button.
- Handle the `signOut` error (show a toast or banner).

### C-09 — Theme toggle implementation (MEDIUM)

F-07 already established that the toggle has no visual effect. This finding is about the code, which a fix must replace rather than patch.

**Evidence** (`ThemeToggle.tsx`)
- `:10-22`: the effect calls `setMounted(true)` and `setIsDark(...)` synchronously. This is the `react-hooks/set-state-in-effect` lint error at `:11`.
- `:15-17`: if the OS prefers dark, the effect **adds** `.dark` to `<html>`. Once a class-based variant is configured, this hard-codes the OS value into the class with no way back.
- There is no persistence. The toggle lives in `Navbar`, which is in the root layout (`layout.tsx:21`), so its state survives client-side navigation but resets on every reload. There is no `matchMedia` change listener.
- `:34-38`: a pulse placeholder is rendered until mount, which shifts the navbar on every load.
- A correct persisted theme needs a script that runs before first paint (Next guide `preventing-flash-before-hydration.md:244-296`). That script uses `dangerouslySetInnerHTML` in `<head>`:
  - It introduces the first inline script and the first `dangerouslySetInnerHTML` (S-18 found none today).
  - It must carry the per-request nonce from the S-05 CSP, or the CSP will block it.

**Fix:** owner decision (Open question 1).
- **(a) Remove the toggle** and keep OS-driven `prefers-color-scheme`. This clears the lint error and F-07 at no risk. Recommended until after launch.
- **(b) Implement properly:**
  - `@custom-variant dark (&:where(.dark, .dark *));` in `globals.css`;
  - store the choice in a cookie or `localStorage`;
  - a nonce'd inline script in `layout.tsx` `<head>`, with `suppressHydrationWarning` on `<html>`;
  - `useSyncExternalStore` instead of the effect, with `getSnapshot` reading `document.documentElement.classList` and a `getServerSnapshot` that returns a fixed default. Do not use a lazy `useState` initializer that reads `document`: client components also render on the server, where `document` is undefined.

  Do this after S-05, because it needs the nonce.

### C-10 — Script mode state (LOW)

**Evidence**
- `ScriptProvider` (`ScriptContext.tsx:15-27`) holds `useState("roman")` and is mounted in the root layout (`layout.tsx:20`). So the mode **survives client-side navigation** (the layout persists) but **resets on reload, on a hard navigation and in a new tab**.
- `setScriptMode` is part of the context type (`:9`) and value (`:23`) but no consumer uses it. Only `scriptMode` and `toggleScriptMode` are used (`ScriptToggle.tsx:7`, `PramaanCard.tsx:43`, `SutraPostCard.tsx:36`).
- The context value is a new object on every provider render (`:23`). This is negligible today, because the provider re-renders only on its own state change.
- `<html lang="en">` (`layout.tsx:18`) is fixed, and the Devanagari text rendered in indic mode (`PramaanCard.tsx:79-81,170`, `SutraPostCard.tsx:107-109`) has no `lang` attribute. Screen readers will read it with English rules, and font fallback may differ.
- The "transliteration" naming mismatch is Audit 01 claim #11 and F-17, not repeated here.

**Fix**
- Persist the mode with the same mechanism chosen for the theme (C-09), or in a cookie. Every page already renders dynamically because the layout reads cookies (build output: all routes `ƒ`), so the server can read a `script` cookie and render the right mode with no flash and no inline script.
- Drop `setScriptMode` from the public type.
- Add `lang="sa"` (or the record's language) on elements that render `original_script_text`.

### C-11 — Duplicated UI markup (LOW)

**Evidence**
- The status banner is copied: `login/page.tsx:89-104` and `ComposeSutra.tsx:302-317` (same classes, same icon switch).
- The Database Notice and empty state are copied: `pramaan/page.tsx:80-108` and `sutra/page.tsx:91-119`.
- The footer navigation buttons are copied: `pramaan/page.tsx:116-130` and `sutra/page.tsx:134-148`.
- Primary and secondary button class strings are repeated across `login/page.tsx:153,163`, `ComposeSutra.tsx:263,411`, `AuthButtonClient.tsx:36,48` and the pages.

**Fix:** add a small `src/components/ui/` with `Notice`, `EmptyState`, `Button`/`LinkButton` and `StatusBadge` (the last is needed for vault `status`, Decision A consequence 1). Do not build more than the current screens need.

### C-12 — Dead code not covered by F-13 (LOW)

F-13 already lists `onPostPublished`, `row.attached_pramaan`, the `Navbar` fallback, the Geist variables, the `public/*.svg` files and the `lang` prop. These are additional:

| Location | What | Why dead |
|----------|------|----------|
| `SutraPostCard.tsx:11-12,75` | `content_text?`, `text?` fields and the `node.content \|\| node.content_text \|\| node.text` fallback | No schema version has these columns; the query selects `content` only (`sutra/page.tsx:23`) |
| `ScriptContext.tsx:9,23` | `setScriptMode` in the context API | No consumer |
| `PramaanCard.tsx:16`, `ScriptContext.tsx:5`, `SutraPostCard.tsx:7,15` | Exported types `PramaanTranslation`, `ScriptMode`, `SutraCardNode`, `AttachedPramaan` | Never imported outside their own file (`grep -rn "import.*\(PramaanTranslation\|ScriptMode\|SutraCardNode\|AttachedPramaan\)" src`: 0 hits). Only `PramaanRecord` and `SutraPost` are imported elsewhere. They become internal or move to `src/types/` (C-01) |
| `pramaan/page.tsx:37-39` | `.find(language_code === "en") \|\| [0]` | The query already filters to `en` with `!inner` |
| `SutraPostCard.tsx:39-41` | Second sort of card nodes | Already sorted in `sutra/page.tsx:40-42` (C-06) |
| `pramaan/page.tsx:7`, `sutra/page.tsx:7` | `export const revalidate = 0` | Harmless but redundant: every route is already dynamic because the root layout reads cookies (build: all routes `ƒ`). It stays valid without Cache Components, but is removed if Cache Components is ever enabled (`route-segment-config/index.md`, Version History `v16.0.0`) |
| `ComposeSutra.tsx:107,134` | `console.error` | F-12 mentions them; they go with the C-08 picker error state |

`data/seed_pramaan.json` is F-14/D-16. The decision is to delete it once migration `0005` exists. It stays until then, because Audit 05 needs its two divergent wordings.

### C-13 — Folder structure (LOW)

**Today**
- `src/components/` is flat, with 11 files mixing layout (`Navbar`, `ThemeToggle`, `ScriptToggle`), auth (`AuthButton*`), Pramaan (`PramaanCard`, `PramaanVaultView`, `SearchBar`), Sutra (`ComposeSutra`, `SutraPostCard`) and state (`ScriptContext`).
- Supabase helpers are split between `src/lib/` and `src/utils/`.
- Domain types are exported from client component files and imported by a server page (`pramaan/page.tsx:3` imports `PramaanRecord` from `"use client"` `PramaanCard.tsx`). This works, because type-only imports are erased, but it couples the data layer to a UI file.
- There is no `supabase/` directory (D-17).

**Phase 2 will add:** `/auth/confirm` (S-06), `/account/password` and account deletion (S-08), the oral vault (recorder, player, consent: D-20), submissions and review, and the status badge. In the flat layout all of these would land in the same `components/` folder, with data access inline in each.

**Proposed layout** (feature folders, no deeper than needed):

```
src/
  app/
    layout.tsx, page.tsx, error.tsx, global-error.tsx, not-found.tsx
    pramaan/   page.tsx, loading.tsx
    sutra/     page.tsx, loading.tsx
    login/     page.tsx
    auth/      callback/route.ts, confirm/route.ts
    account/   password/page.tsx, delete/route.ts      (S-08)
    oral/ ...  submit/ ...                              (Phase 2, after D-20 design)
  components/
    ui/        Notice, EmptyState, Button, StatusBadge
    layout/    Navbar, ScriptToggle, (ThemeToggle), AuthButton, AuthButtonClient
    pramaan/   PramaanCard, PramaanVaultView, PramaanPicker, SearchBar
    sutra/     ComposeSutra, SutraPostCard
  context/     ScriptContext.tsx
  lib/
    supabase/  env.ts, browser.ts, server.ts, proxy.ts, admin.ts (S-08, server-only)
    data/      pramaan.ts, sutra.ts, profiles.ts
    auth/      safe-redirect.ts, error-messages.ts       (S-04, S-09)
  types/       database.ts (generated), domain.ts
  proxy.ts
supabase/
  migrations/, seed.sql, tests/                          (Audit 02 layout)
```

**Fix:** move files in one mechanical commit with no behaviour change (fix step 2), before the larger rewrites, so later diffs stay readable.

### C-14 — Scaffold naming and copy (LOW)

**Evidence**
- Sutra is described as a "Rule generation and execution engine" (`page.tsx:66`) and "Rule Generation & Social Feed" / "Rule engine" (`sutra/page.tsx:68,74`), with a `Cpu` icon. The product is a discussion feed (README, Audit 01).
- The nav labels are "Pramaan (Module 1)" and "Sutra (Module 2)" (`Navbar.tsx:15-16`). Headings repeat "(Module 1)"/"(Module 2)".
- Metadata: title "MoolSutra Platform", description "MoolSutra Modular Architecture - Pramaan & Sutra Modules" (`layout.tsx:8-9`).
- The footer shows a pulsing "Module Routes Active" pill (`layout.tsx:29-32`) that reflects no real status.
- The home cards use "Verify Route" as the CTA (`page.tsx:45,70`) and "Verification and validation engine route" (`:41`). There is also a "Live Supabase" badge (`pramaan/page.tsx:69`).
- Empty states expose table names to visitors (`pramaan/page.tsx:105`, `sutra/page.tsx:116`). The error-box equivalent is S-09.

**Fix:** replace the scaffold copy when the pages are touched in fix steps 5-8. The wording itself belongs to the owner and Audit 05 (content). Remove the fake status pill.

### C-15 — No verification of the RLS design; no test runner (HIGH)

F-21 records "no tests, no CI" as INFO. The severity here is higher because of what the decisions since then rely on:
- Audit 03 S-03: all write enforcement is in the DB, and every client check is cosmetic.
- Audit 02 design: column grants, `WITH CHECK` policies, a `BEFORE INSERT` trigger, a throttle trigger, handle CHECKs and `create_sutra`.
- None of this can be checked by `tsc`, lint or the build. A single wrong grant in a migration reopens D-01/D-02 with no signal.

**Minimum useful setup, in priority order**

**P0 — DB tests (pgTAP via `supabase test db`).** Needs the Supabase CLI and Docker locally. Availability and exact commands are **UNVERIFIED** (no network). Write them in the same step as the migrations. Each test should run as `anon`, as `authenticated` (with `request.jwt.claims` set) and as `service_role` where relevant:

| # | Test | Closes / guards |
|---|------|-----------------|
| 1 | `anon` INSERT into `sutra_posts` and `sutra_card_nodes` is denied | D-01, F-01 |
| 2 | `authenticated` INSERT with another user's `author_id` ends up with `author_id = auth.uid()` (trigger), or is rejected | D-03 |
| 3 | User B cannot insert cards into user A's post | D-01 |
| 4 | `UPDATE profiles SET role = 'admin'` on your own row is denied (column grant) | D-02 |
| 5 | Handle CHECK: reserved names and any `moolsutra*` prefix are rejected; generated `user_<12 hex>` handles pass | D-02, Decision OQ 13 |
| 6 | `handle_new_user` creates a profile for an email-less user and for a 64-character local part | D-04 |
| 7 | Deleting an auth user who has posts succeeds and cascades the posts | D-05 |
| 8 | Client cannot set `created_at` or `id` (not in the column grant). `likes_count`/`parent_post_id` no longer exist | D-06, decisions B and "Consequences resolved" 3 |
| 9 | `anon`, `authenticated` **and `service_role`** have no UPDATE/DELETE privilege on `pramaan_vault`/`pramaan_translations`. This is a privilege test, not a trigger test: Decision A removed the immutability trigger | D-07, D-08, Decision A, consequence 2 |
| 10 | `create_sutra` rejects 0 and 5 cards, content over 500 characters and blank content; it is atomic (a failing card leaves no post) | D-10, D-15, F-10, Decision OQ 7 |
| 11 | The 6th post within 10 minutes and the 21st within a day fail with the generic error | S-02, Audit 03 decision 4 |
| 12 | `summary_bullets` must be a JSON array of 1-5 items | D-10, Decision OQ 7 |
| 13 | No function in `public` is executable by `anon` except those explicitly granted | D-08 |

**P0 — CI** (GitHub Actions on push and PR):
- `npm ci`, `npx tsc --noEmit`, `npm run build`, with dummy `NEXT_PUBLIC_SUPABASE_*` values. The build must not need a real project.
- `npm run lint -- --max-warnings=0` becomes a required check once lint reaches 0 (fix step 5). Do not add a baseline file to hide the current errors.
- `supabase test db` in CI is optional at first. It needs Docker in the runner, which is **UNVERIFIED**. Run it locally before every migration change until then.

**P1 — Unit tests (Vitest).** Following `next/dist/docs/01-app/02-guides/testing/vitest.md`: `vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths`. Vitest cannot render `async` Server Components (`vitest.md:9`), so test pure functions and client components:
- `safeRedirect`: turn every input from the Audit 03 S-04 table into a test case (S-04/F-05).
- Row mappers in `lib/data/*`, including a NULL `original_script_text` (C-03) and the `profiles(handle)` embed.
- The vault search filter.
- The auth error-code → message map (S-09).
- Composer validation (1-4 cards, 500 characters, trimming).

**P2 — E2E smoke (Playwright), later:** `/`, `/pramaan`, `/sutra` render against a local Supabase, and the signed-out composer shows the sign-in prompt with no form flash (C-05). Add it once the auth flows from S-06/S-08 exist.

Scripts to add: `"typecheck": "tsc --noEmit"`, `"test": "vitest run"`, and `"test:db": "supabase test db"` (UNVERIFIED command).

### C-16 — `CLAUDE.md` and `AGENTS.md` (MEDIUM)

**Evidence**
- `CLAUDE.md` is one line, `@AGENTS.md`.
- `AGENTS.md:1-9` is only the Next.js-managed block. It is accurate (this is Next 16.3.6 with breaking changes; for example `proxy.ts`, and `error.tsx` receiving `retry`), but it says nothing project-specific. That gap was already noted in Audit 01 "CLAUDE.md and AGENTS.md".
- Since then, Audits 02 and 03 have recorded owner decisions (Audit 02: 13 open-question answers, 3 design decisions, 3 resolved consequences; Audit 03: 10 answers and a 20-row status table) that the fix phase must obey, and nothing points Claude Code at them.

**Safe place to add content (verified in `node_modules/next/dist/server/lib/generate-agent-files.js`):**
- `upsertAgentRulesBlock` (`:145-160`) replaces only the text between `<!-- BEGIN:nextjs-agent-rules -->` and `<!-- END:nextjs-agent-rules -->`, and keeps everything before and after.
- `writeAgentFiles` (`:90-102`) upserts `AGENTS.md` and returns `claudeMd: 'skipped'` whenever `AGENTS.md` holds the block, so `next dev` never rewrites `CLAUDE.md` in this repo.

**Fix:** keep `@AGENTS.md` as the first line of `CLAUDE.md` and put the project rules below it (draft in "Proposed CLAUDE.md contents"). Keep the file short enough to be read in full, and link to the audits for detail. Update it at the end of each fix step whose conventions change (for example when `src/lib/supabase/` replaces `src/utils/`).

### C-17 — `tsconfig` and scripts (LOW)

**Evidence**
- `tsconfig.json:7`: `"strict": true` is already on.
- Not set: `noUncheckedIndexedAccess`. With it, `row.pramaan_translations[0]` (`pramaan/page.tsx:38`) and `record.translations[lang]` (`PramaanCard.tsx:45`) would be typed `T | undefined`, which they are at runtime.
- `allowJs: true` (`:5`) is unused: there are no `.js` files in `src/`, and the `include` globs list only `ts`, `tsx` and `mts`.
- The build runs TypeScript (build log: `Running TypeScript ... Finished TypeScript`) but not ESLint, so lint errors never block a deploy.
- `package.json:5-10` has no `typecheck` or `test` script. There is no `engines` field, and `@types/node ^20` is used with Node 22 locally (Audit 01 dependency table).
- `npm ls --depth=0` still lists 6 extraneous packages (F-16).

**Fix**
- Enable `noUncheckedIndexedAccess` after C-01 (it creates a small number of new errors in the mappers).
- Remove `allowJs`.
- Add the scripts from C-15 and `"engines": { "node": ">=22" }`, aligning `@types/node` to the runtime.
- Use `npm ci` in CI, which clears F-16.

### C-18 — Client boundary wider than needed (LOW)

**Evidence**
- `SutraPostCard.tsx` is `"use client"` (`:1`) only to call `useScript()` (`:36`) for the citation chip label (`:100-110`). So every feed post, including card text, is rendered as a client component.
- `PramaanCard` is legitimately client-side (view-mode state).
- `Navbar` is client-side (`usePathname`) and takes the server `AuthButton` through a prop slot (`layout.tsx:21`). That is the correct pattern; only its fallback is dead (F-13).

**Fix:** extract a tiny client `ScriptText` (props: `roman`, `indic`) and make `SutraPostCard` a server component. Do it during C-06/C-13. This is low priority: the payload is small today.

### C-19 — Accessibility gaps (LOW)

**Evidence**
- The login `<label>`s have no `htmlFor` and the inputs have no `id` (`login/page.tsx:110-124,130-144`).
- The vault picker modal (`ComposeSutra.tsx:429-504`) has:
  - no `role="dialog"`, `aria-modal` or `aria-labelledby`;
  - no Escape handling and no focus trap or return;
  - an icon-only close button with no `aria-label` (`:439-445`).
- Card textareas use `key={index}` (`:323`). Removing a middle card shifts identity, so focus and IME composition can jump to the wrong card. The values are controlled, so the text itself stays correct.

**Fix:** associate labels; use `<dialog>` (with `showModal()`) or add the ARIA attributes plus Escape and focus handling in `PramaanPicker` (C-04); give each card a stable id (`crypto.randomUUID()` on add).

---

## Lint breakdown

`npm run lint` on `phase2-auth` (`next@16.3.6`, `eslint-config-next@16.3.6`): exit 1, `✖ 21 problems (17 errors, 4 warnings)`. This is identical, line for line, to F-04 (recorded on 16.3.1). The S-01 bump changed nothing.

**By rule**

| Rule | Severity | Count | Files (lines) | Real problem or noise? | Cleared by |
|------|----------|-------|---------------|------------------------|------------|
| `@typescript-eslint/no-explicit-any` | error | 15 | `pramaan/page.tsx` (36, 38, 59); `sutra/page.tsx` (38, 41, 41, 58); `AuthButtonClient.tsx` (8); `ComposeSutra.tsx` (31, 109, 111, 191, 199, 200, 238) | **Real.** These are exactly the boundaries where the schema change will break (C-01, C-02) | Pages in step 4 (generated types); `AuthButtonClient` in step 2 (S-13 typed prop); composer in step 5 |
| `react-hooks/immutability` | error | 1 | `ComposeSutra.tsx` (81) | **Real, but structural, not a runtime crash:** the effect runs after the const exists. It signals a function recreated each render and captured by an effect (C-04) | Step 5 (composer split) |
| `react-hooks/set-state-in-effect` | error | 1 | `ThemeToggle.tsx` (11) | **Real.** The whole toggle needs replacing (C-09, F-07) | Step 2 (removed; re-added correctly in step 8 only if the owner wants it) |
| `react-hooks/exhaustive-deps` | warning | 2 | `ComposeSutra.tsx` (76: `supabase.auth`; 83: `fetchPramaanRecords`, `pramaanList.length`) | **Real** (stale closures), same root cause as `immutability` | Step 5 |
| `@next/next/no-img-element` | warning | 1 | `AuthButtonClient.tsx` (25) | **Moot.** Audit 03 decision 9 removes avatar rendering (S-12) | Step 2 |
| `@typescript-eslint/no-unused-vars` | warning | 1 | `middleware.ts` (18: `options`) | **Style noise** (the first `forEach` does not need `options`) | Step 2 (proxy rewrite, S-10) |

**By file**

| File | Errors | Warnings |
|------|--------|----------|
| `src/components/ComposeSutra.tsx` | 8 | 2 |
| `src/app/sutra/page.tsx` | 4 | 0 |
| `src/app/pramaan/page.tsx` | 3 | 0 |
| `src/components/AuthButtonClient.tsx` | 1 | 1 |
| `src/components/ThemeToggle.tsx` | 1 | 0 |
| `src/middleware.ts` | 0 | 1 |
| **Total** | **17** | **4** |

**Other gates on the same tree**
- `npx tsc --noEmit`: exit 0, no output.
- `npm run build`: exit 0. It prints one warning (`The "middleware" file convention is deprecated. Please use "proxy" instead.`, F-11) and `Supabase URL: EXISTS` twice (F-12). All 6 routes are dynamic (`ƒ`), plus `ƒ Proxy (Middleware)`.

The ESLint config (`eslint.config.mjs`) is the stock `core-web-vitals` + `typescript` set with no project rules. That is adequate. Optionally add `no-console: ["warn", { allow: ["error"] }]` once C-08 has replaced the debug logging.

---

## Proposed CLAUDE.md contents

Draft only; this audit does not write the file. Keep `@AGENTS.md` as line 1 (see C-16 for why content below it is safe from `next dev`). Items marked *(to add)* do not exist yet and become true as the fix steps land.

```markdown
@AGENTS.md

# MoolSutra — project rules for Claude Code

## What this is
Next.js 16.3.6 (App Router, Turbopack) + React 19 + Tailwind v4 + Supabase (@supabase/ssr).
Public repo. Two modules: Pramaan vault (/pramaan, read-only reference records) and
Sutra feed (/sutra, 1-4 card posts with an optional Pramaan citation). Email/password auth.
The old Supabase project is deleted; a new one is built from migrations (never from the dump).

## Where decisions live — read before changing anything
- docs/audits/01-repo-baseline.md (F-), 02-database-sql.md (D-), 03-security-auth.md (S-),
  04-code-quality.md (C-).
- Each audit's "Decisions" / "Decisions and status" / "Consequences resolved" sections OVERRIDE
  everything above them in that file. If a proposal and a decision conflict, the decision wins.
- Reference the finding ID(s) a change closes in your summary of the change.
- If a task conflicts with a decision, stop and ask. Do not re-decide.

## Commands
- npm run dev | npm run build | npm run lint | npx tsc --noEmit
- npm run typecheck, npm test (Vitest), npm run test:db (pgTAP via Supabase CLI)   (to add)
- Definition of done for any change: lint (no new errors; 0 from fix step 5 onward), tsc, build,
  and the tests for the touched area all pass. Paste the command output, don't summarise it.

## Never
- Never commit, push, merge, tag or open PRs. Stage changes and show the full diff; the owner
  commits manually.
- Never read, print or edit .env.local or any other real env file, supabase_backup/, or
  docs/context/ (private, gitignored). Only .env.example (names and placeholders, no values) may
  be created or edited.
- Never put a secret or service-role key in a NEXT_PUBLIC_* variable or in client code.
  Server-only modules start with `import "server-only"`.
- Never run SQL or `supabase db push` against a hosted Supabase project (dev or prod). Write
  migrations and run them only against the local stack (`supabase start` / `db reset`); the owner
  pushes to hosted projects. Never restore the old dump. Never edit a migration that has already
  been pushed: add a new migration instead.
- Never rely on client-side checks for authorization or validation. All write rules live in
  RLS, grants, CHECKs and triggers (S-03). Client checks are UX only.
- Never show raw Supabase/Postgres error text to users (S-09). Map to fixed messages.
- Never interpolate user input into PostgREST filter strings (.or/.filter); use RPC params (S-18).
- Never add `any`, `@ts-ignore`, eslint-disable, or a lint baseline file to make checks pass.
- Never use middleware.ts (Next 16 uses src/proxy.ts) or getSession() for server-side auth.

## Supabase conventions
- Browser: createBrowserSupabase() from src/lib/supabase/browser.ts            (to add; today: src/utils/supabase/client.ts)
- Server components / route handlers: createServerSupabase() from src/lib/supabase/server.ts
                                                                               (to add; today: src/utils/supabase/server.ts)
- Proxy session refresh: updateSession() in src/lib/supabase/proxy.ts          (to add)
- src/lib/supabaseClient.ts is legacy and is being deleted (F-08). Do not import it.
- Types come from src/types/database.ts, generated by the Supabase CLI. Never hand-write
  row types; regenerate after every migration.                                 (to add)
- Queries live in src/lib/data/*.ts, not inline in pages or components.        (to add)
- Target (after fix steps 3-5): posts are created only via
  rpc('create_sutra', { p_cards, p_attached_pramaan_id, p_language_code }), and the feed reads the
  author handle via the profiles(handle) embed. Until then the code still uses two inserts and
  author_handle; do not extend that code, replace it.

## Target schema (Audit 02 + decisions; true once fix step 3 lands)
- No likes, no replies (no likes_count, sutra_likes, parent_post_id), no native_dialect, no avatar_url.
- pramaan_vault has status (draft|under_review|reviewed|contested). Drafts are public; the UI shows
  a status badge whenever status <> 'reviewed'. No client role or service_role may UPDATE the vault.
- Card content 1-500 chars, 1-4 cards; summary_bullets 1-5 items; handles ^[a-z0-9_]{3,30}$,
  reserved list, and no handle starting with "moolsutra".
- Post throttle: 5 per 10 minutes, 20 per day (DB trigger).
- Migration 0005 (vault data) is BLOCKED until Audit 05 approves the content.
- Every new table: RLS enabled in its own migration, explicit revoke/grant per column,
  policies with a TO clause and (select auth.uid()), indexes on every FK, pgTAP tests.

## Next.js 16 specifics seen in this repo
- Read node_modules/next/dist/docs/ before using an API. error.tsx receives `retry` (not `reset`).
- Root layout reads cookies, so every route is dynamic.
- Any inline <script> needs the CSP nonce from src/proxy.ts (S-05).

## Code conventions
- TypeScript strict; `import type` for types; no default `any` in catch (use unknown).
- Server components by default; "use client" only for state, effects or browser APIs, and as low
  in the tree as possible.
- Feature folders: components/{ui,layout,pramaan,sutra}, lib/{supabase,data,auth}.
- Tailwind utility classes; shared UI (Notice, EmptyState, Button, StatusBadge) in components/ui.
- lucide-react for icons.

## DPDP (India)
Collection points (/login, composer, future oral vault) need a privacy notice; account deletion
must remain possible (D-05, S-08). Phase 2 oral recordings: private by default, consent records,
storage keys not URLs (D-20). Flag any new personal-data field before adding it.
```

---

## Proposed fix-phase order

**Principles**
- Mechanical, behaviour-neutral changes first, so later diffs are small.
- The DB is the security boundary, so migrations and their tests come before any app code that depends on them.
- Generated types come before rewriting queries.
- The CSP comes last among the security items, because it must include everything that adds scripts (Turnstile, any theme script).

Steps that can run in parallel are marked.

1. **Guardrails** (no app behaviour change)
   - Write `CLAUDE.md` from the draft above.
   - Add `.env.example` plus a `!.env.example` line in `.gitignore`.
   - Add CI with `npm ci` + `tsc` + `build` (lint not gated yet).
   - Add `SECURITY.md`, and enable Dependabot, secret scanning and push protection in GitHub settings.
   - **Closes:** C-16, C-17 (scripts, `engines`, `allowJs`), F-16 (`npm ci`), S-15, F-21 (CI part).

2. **Mechanical cleanup and structure** (one or two commits, no feature change)
   - Move files to the C-13 layout.
   - Consolidate the Supabase clients into `src/lib/supabase/` with distinct names and env validation. Delete `lib/supabaseClient.ts` and `utils/`.
   - Rename `middleware.ts` to `src/proxy.ts`, copying the `setAll` cache headers onto the response. Add `server-only` and `cookieOptions.secure`.
   - Delete dead code.
   - Remove `ThemeToggle` (UI stays OS-driven). If the owner wants a manual toggle (Open question 1), it is re-added correctly in step 8. This clears the `set-state-in-effect` lint error now.
   - `AuthButtonClient`: remove the avatar `<img>` and type the prop as `{ email: string | null }`, passed from `AuthButton`. No profile data is needed yet; it can switch to `{ handle }` in step 7.
   - **Closes:** C-07, C-12, C-13, F-08 (client consolidation), F-11, S-10, S-11, S-12, S-13, S-16, F-12, F-13, F-07 and C-09 (by removal), and the lint items `set-state-in-effect`, `no-img-element`, `no-unused-vars` and the `AuthButtonClient` `any`.
   - **Depends on:** 1.

3. **New Supabase dev project, migrations 0001-0004 and pgTAP tests**
   - Apply Audit 02's SQL with every decision. Add the S-02 throttle in `sutra_posts_before_insert` with an `(author_id, created_at)` index.
   - Write the 13 DB tests in C-15 alongside the migrations.
   - Needs the Supabase CLI and Docker (**UNVERIFIED** availability). Claude Code writes the migrations and tests and runs them only against the local stack. **The owner** creates the hosted dev project and runs `supabase db push` (Audit 03 OQ 3: one dev project until launch).
   - Region `ap-south-1`. Configure Auth per the Audit 03 day-one checklist. Sign-up stays closed (Audit 03 decision 7).
   - **Closes:** D-01-D-06, D-08-D-15, D-17, D-18, F-01, F-15, S-02 (DB throttle part), C-15 (P0 DB part).
   - **D-07** is closed by Decision A as revised (no vault UPDATE grant; test #9).
   - **Depends on:** 1. **Can run in parallel with 2.**
   - **Not included:** `0005` (blocked on Audit 05). See Open question 2 about local vault fixtures meanwhile.

4. **Generated types, data layer and shared UI primitives**
   - Create `components/ui` `Notice` and `EmptyState` first, so steps 5 and 7 reuse them instead of copying the banners again (C-11).
   - `supabase gen types` → `src/types/database.ts`; `createClient<Database>` everywhere.
   - `src/lib/data/{pramaan,sutra}.ts` with one mapper each.
   - Q1/Q2 select `status`; Q3 uses `profiles(handle)` and drops `author_handle`.
   - Server pages read through the server client.
   - Fix the NULL crash. Add Vitest and the mapper/filter tests. Enable `noUncheckedIndexedAccess`.
   - **Closes:** C-01, C-02, C-03, C-06, C-11 (primitives), F-08 (server pages no longer anon-only), the lint `no-explicit-any` group in the pages, C-15 (P1, part), C-17 (rest).
   - **Depends on:** 2 and 3.

5. **Composer rewrite**
   - Split into server page, composer and `PramaanPicker`.
   - `rpc('create_sutra', …)`; remove the handle input and show `profiles.handle` passed from the server.
   - `maxLength={500}`; generic errors; error vs empty state in the picker; modal accessibility; stable card keys.
   - **After this step lint is 0** (steps 2, 4 and 5 together clear all 21 problems; see the lint breakdown). Make `lint --max-warnings=0` a required CI check.
   - **Closes:** C-04, C-05, C-19 (composer part), F-06, F-10, D-11 (app side), D-15 (app side), S-03, the remaining lint errors.
   - **Depends on:** 4.

6. **UI consistency and boundaries**
   - `error.tsx` (with `retry`), `global-error.tsx`, `not-found.tsx`, and `loading.tsx` for `/pramaan` and `/sutra`.
   - Finish `components/ui` (`Button`, `StatusBadge`) and replace the remaining copied markup in the pages.
   - Vault status badge on cards and on the feed chip.
   - Generic page-level load errors.
   - Make `SutraPostCard` a server component with a client `ScriptText`.
   - Replace the scaffold copy (wording from the owner or Audit 05).
   - **Closes:** C-08, C-11 (rest), C-14, C-18, S-09 (page-level part), Audit 02 "Consequences resolved" item 1 (badge).
   - **Depends on:** 4. **Can run in parallel with 5.**

7. **Auth flows**
   - `safeRedirect` exactly as written in S-04, with unit tests; failed exchange goes to `/login?error=auth_callback`.
   - `/auth/confirm` with `verifyOtp`; `emailRedirectTo`.
   - Auth error-code mapping. Password reset, and account deletion through a server-only admin client.
   - Optionally switch `AuthButtonClient` from `{ email }` to `{ handle }` from `profiles`. Label the login inputs.
   - Privacy notice at `/login` and the composer.
   - Turnstile `captchaToken` before sign-ups open beyond the owner.
   - **Closes:** F-05, S-04, S-06, F-20, S-08, D-05 (app side; DB side in 3), S-09 (auth part), S-14, S-02 (CAPTCHA part), C-19 (login part).
   - **Depends on:** 2 (client helpers) and 3 (profiles, cascade). **Can run in parallel with 4-6.**

8. **Security headers and CSP**
   - Static headers and `poweredByHeader: false` in `next.config.ts`.
   - Nonce CSP in `src/proxy.ts`, Report-Only first, including the Turnstile origins.
   - Only if the owner wants a manual theme toggle: re-add it with `@custom-variant dark`, a nonce'd pre-paint script and `useSyncExternalStore` (C-09 option b). It must pass lint.
   - Persist script mode, by cookie (preferred: no inline script needed) or with the same nonce'd script. Add `lang` attributes.
   - **Closes:** S-05, C-10 (and the optional theme re-add).
   - **Depends on:** 2 (`proxy.ts`) and 7 (Turnstile).

9. **Docs and launch gate**
   - Update the README (stack, auth, file tree, honest feature list).
   - Update `CLAUDE.md` "to add" markers.
   - Re-run all gates and the Audit 03 checklist. Scope the env vars on the production project.
   - **Closes:** F-17, S-07 (remaining env-scope item), C-16 (final update).
   - **Depends on:** 1-8.

10. **Blocked until Audit 05 or later design work**
    - Migration `0005` vault data with per-record `status`, then delete `data/seed_pramaan.json`: F-14, D-16 (after Audit 05).
    - Vault versioning design (Audit 02 Decision A / OQ 3) (after Audit 05).
    - Phase 2 oral vault and submissions migrations (D-20 rules), D-19 (INFO, context only). These come after the Phase 2 scope and storage decisions (Audit 02 OQ 12).

**Already resolved, informational, or no action**

| ID | Status | Evidence |
|----|--------|----------|
| S-01 | Fixed | `45ae80a` on this branch; `package.json:15,25` show `16.3.6` |
| F-02, F-09 | Resolved | `.gitignore:43-49` |
| F-03 | Resolved | Auth files are tracked (`git ls-files src/utils src/middleware.ts src/app/login src/app/auth` lists 5 files); working tree clean at start |
| F-04 | Unchanged; tracked by the lint breakdown above | Cleared by steps 2, 4, 5 and 7 |
| F-18 | INFO | No secrets in history (Audit 03 S-15 re-checked) |
| F-19 | INFO, partly resolved | The 5 newest commits use the corrected domain; the 4 oldest keep the typo (`git log --format='%ae'`, counted by domain) |
| D-19 | INFO | Context for step 10 |
| S-17, S-18, S-19, S-20 | No action | Per Audit 03 decisions; S-18's rule is carried into the `CLAUDE.md` draft |

---

## Open questions for the owner

1. **Theme toggle:** the proposed order removes it in step 2 (UI stays OS-driven; clears F-07, C-09 and one lint error). Do you want a manual toggle re-added with persistence in step 8 (needs the S-05 nonce), or is OS-driven theming enough until after launch (recommended)?
2. **Local vault data before Audit 05:** `0005` is blocked, so `/pramaan`, the picker and the citation chip will be empty in the dev project. Audit 02 decisions forbid a demo **post** but do not mention vault rows. May `supabase/seed.sql` (local only, never applied to a hosted project) load the 5 existing records marked `draft` for development and tests?
3. **Supabase CLI and Docker:** are both available on the development machine? pgTAP tests (C-15) and type generation from the local stack (C-01) depend on them. Without Docker, types can be generated from the hosted dev project instead, but there is then no local DB for tests.
4. **Script mode persistence:** should the Roman/Indic choice persist across reloads (cookie, recommended) or reset per visit as today?
5. **Folder move timing:** is a one-time file move (C-13, step 2) acceptable even though it makes `git blame` noisier, or should files move only when they are rewritten?
6. **Copy ownership:** who writes the replacement copy for the scaffold text (C-14), the owner or Audit 05?
7. **CI scope:** is GitHub Actions acceptable for CI (the Hobby Vercel plan deploys only `main`)? Should `supabase test db` run in CI from the start (needs Docker in the runner), or locally only at first?
8. **E2E tests:** is Playwright (P2) wanted before launch, or after?

---

## Decisions (owner, 2026-10-07)

These decisions override the proposals and open questions above where they conflict. Nothing above this section has been edited.

### Open question answers

1. **Theme toggle:** removed in step 2. Theming stays OS-driven until after launch. The optional re-add in step 8 is dropped.
2. **Local vault data:** yes. `supabase/seed.sql` (local only, never applied to a hosted project) loads the 5 existing records with `status = 'draft'` for development and tests.
3. **Supabase CLI and Docker:** the machine has Podman 5.8.4, no Docker and no Supabase CLI.
   - Install the CLI per project with `npm i -D supabase`.
   - At step 3, first try the local stack on Podman through its Docker-compatible socket. If that is unreliable, install Fedora's `moby-engine` package.
   - Local setup is verified at step 3, not before.
4. **Script mode persistence:** cookie.
5. **Folder move:** a one-time move in step 2.
6. **Scaffold copy:** written by the owner after Audits 05 and 10.
7. **CI:** GitHub Actions. `supabase test db` runs in CI from the start, because GitHub runners provide Docker.
8. **E2E tests:** after launch. A manual test checklist covers the invite-only launch.

### Additional decisions

- **A. Branch:** the whole fix phase happens on a new branch, `fix-phase`, created from `phase2-auth`. It merges to `main` only at step 9. Vercel deploys only `main`.
- **B. Execution:** steps run strictly one at a time, in order. The "can run in parallel" notes are ignored.
- **C. Timing:** the fix phase starts only after Audits 05-11 are complete. Audits 05 and 10 may revise steps 5, 6 and 10.

### Impact on the fix-phase order and CLAUDE.md draft

**Fix-phase order**

| Step | Change | Decision |
|------|--------|----------|
| Before step 1 | The fix phase does not start until Audits 05-11 are complete. Re-read every later audit's Decisions section before step 1, because they may add to or reorder these steps | C |
| All steps | Run strictly in order, 1 to 10, one at a time. Remove "Can run in parallel with 2" (step 3), "Can run in parallel with 5" (step 6) and "Can run in parallel with 4-6" (step 7). The "Depends on" lines still hold; they are now always satisfied by the sequence | B |
| Step 1 | First action: create the branch `fix-phase` from `phase2-auth`. All later steps happen on `fix-phase` | A |
| Step 1 | The `CLAUDE.md` written here must also include any rules from Audits 05-11, not only the draft in this audit | C |
| Step 1 | The CI workflow (GitHub Actions) runs on pushes and PRs for `fix-phase`, not only `main`. Steps stay as proposed: `npm ci`, `tsc`, `build`; lint becomes required after step 5 | A, OQ 7 |
| Step 2 | `ThemeToggle` removal is final, not provisional. F-07 and C-09 are closed permanently by removal. C-09 option (b) is not pursued. Dark mode stays on Tailwind's default `prefers-color-scheme` strategy, with no `@custom-variant` | OQ 1 |
| Step 2 | The one-time C-13 folder move is confirmed. No change to its content | OQ 5 |
| Step 3 | Add the CLI as a dev dependency (`npm i -D supabase`) and use it through `npx supabase` or npm scripts; there is no global install | OQ 3 |
| Step 3 | Container runtime: first try the local Supabase stack on Podman 5.8.4 through its Docker-compatible socket. If it is unreliable, install Fedora's `moby-engine` and use that. Record which runtime worked, and any required environment (for example `DOCKER_HOST`), in `CLAUDE.md`. Whether the Supabase CLI works on Podman is **UNVERIFIED** until this step | OQ 3 |
| Step 3 | "Needs the Supabase CLI and Docker (**UNVERIFIED** availability)" is replaced by the item above. Local setup is verified here, and steps 1-2 must not depend on it | OQ 3 |
| Step 3 | Add `supabase/seed.sql`, local only, loading the 5 vault records and their 5 translations with `status = 'draft'` and the fixed UUIDs `11111111-…` to `55555555-…`. It must never be pushed to or run on a hosted project. Wording: use the Audit 05-approved text, since Audit 05 is complete before the fix phase starts. No demo post (Audit 02 Decision OQ 5) | OQ 2, C |
| Step 3 | Add a CI job that runs `supabase test db` (the CLI from devDependencies, Docker on GitHub runners) as soon as the first pgTAP tests exist. It is a required check from then on, not "optional at first" as C-15 proposed | OQ 7 |
| Step 3 | The vault-dependent DB tests (C-15 #9, #12) and the Vitest mapper and filter tests in step 4 can use the seeded records | OQ 2 |
| Step 4 | No change, apart from types now being generated from the Podman or moby local stack chosen in step 3 | OQ 3 |
| Step 5 | No change now. Audit 05 or 10 may revise it | C |
| Step 6 | The scaffold copy (C-14) is replaced with text the owner writes after Audits 05 and 10, not with wording from this phase. If that text is not ready when step 6 runs, C-14 stays open. The fake "Module Routes Active" pill and the table names in empty states are removed regardless, since that is a code change, not wording. Audit 05 or 10 may revise the rest of step 6 | OQ 6, C |
| Step 7 | No change, apart from running after step 6 instead of in parallel | B |
| Step 8 | Remove the bullet "Only if the owner wants a manual theme toggle: re-add it …". Step 8 contains no theme work | OQ 1 |
| Step 8 | Script mode persists in a cookie (for example `script=roman\|indic`). The root layout reads it on the server and passes the initial mode to `ScriptProvider`; `ScriptToggle` writes the cookie. No inline script is needed. The "or with the same nonce'd script" alternative is dropped | OQ 4 |
| Step 8 | Closes line becomes: S-05, C-10 | OQ 1, OQ 4 |
| Step 9 | Add: write and run a manual test checklist for the invite-only launch (sign-up by invite, confirm, sign-in, reset, delete account, post, throttle, vault browse and search, script toggle, headers/CSP). Put it in the repo, for example `docs/launch-checklist.md` (path is a suggestion) | OQ 8 |
| Step 9 | Add: the owner merges `fix-phase` into `main` only after all gates and the manual checklist pass. That merge is the first deploy of any fix-phase work, because Vercel builds only `main`. Re-check the production deployment after the merge | A |
| Step 10 | Timing change: Audit 05 is complete before the fix phase starts, so `0005`, the `data/seed_pramaan.json` deletion and the versioning design are no longer blocked by timing. Their placement is left to Audit 05's decisions (C allows it to revise step 10). When `0005` exists, remove the vault rows from `supabase/seed.sql` so a local `db reset` does not insert them twice | C, OQ 2 |
| C-15 | P0 CI: `supabase test db` runs in CI from step 3 (above). P2 Playwright E2E moves to after launch; the step 9 manual checklist replaces it for the invite-only launch | OQ 7, OQ 8 |

**CLAUDE.md draft**

| Section | Change | Decision |
|---------|--------|----------|
| New "Branch" rule (at the top of "Never", or its own section) | "All fix-phase work happens on branch `fix-phase`, created from `phase2-auth`. Never switch to, modify or merge into `main`. The owner merges `fix-phase` into `main` at step 9 only; Vercel deploys only `main`, so nothing on `fix-phase` is deployed" | A |
| New "Process" rule | "Fix steps run strictly one at a time in the order in `docs/audits/04-code-quality.md`, as revised by later audits' Decisions. Do not start a step until the previous one is done and verified. Ignore any 'can run in parallel' notes" | B |
| "Where decisions live" | List Audits 05-11 (and their ID prefixes) once they exist, and state that Audits 05 and 10 may override steps 5, 6 and 10 | C |
| "Commands" | The Supabase CLI is a dev dependency: use `npx supabase …` or the npm scripts, never a global install. `npm run test:db` (`supabase test db`) is in the to-add list, and the "(UNVERIFIED command)" note on it is resolved at step 3 | OQ 3 |
| "Commands" | Add a container-runtime note: "Local Supabase runs on Podman 5.8.4 via its Docker-compatible socket (set `DOCKER_HOST` as recorded at step 3), or on `moby-engine` if Podman proved unreliable. Do not install Docker Desktop or change the runtime without asking." Fill in the actual runtime and variable at step 3 | OQ 3 |
| "Commands" / "Definition of done" | Add: CI on GitHub Actions runs `tsc`, `build`, `supabase test db` (from step 3) and `lint --max-warnings=0` (from step 5). A change is not done until CI passes on `fix-phase` | OQ 7 |
| "Never" | Add: never apply or run `supabase/seed.sql` against a hosted project; it is local-only development data (5 vault records, status `draft`) | OQ 2 |
| "Target schema" | Add: local dev uses `supabase/seed.sql` for the 5 draft vault records. Once migration `0005` exists, the vault rows come out of `seed.sql`. Replace "Migration 0005 (vault data) is BLOCKED until Audit 05 approves the content" with "Migration 0005 follows Audit 05's decisions" | OQ 2, C |
| "Next.js 16 specifics" | Add: "There is no manual theme toggle. Dark mode follows `prefers-color-scheme`. Do not add a toggle or a `dark` class strategy before launch." The line "Any inline `<script>` needs the CSP nonce from `src/proxy.ts`" stays as a general rule | OQ 1 |
| "Code conventions" (or the context section) | Add: "Script mode (`roman`/`indic`) is persisted in a cookie read on the server in the root layout; do not use `localStorage` or an inline script for it" | OQ 4 |
| "Code conventions" | Add: copy and UI wording are written by the owner. Do not invent marketing or explanatory copy; leave placeholders and flag them | OQ 6 |
| "Commands" / testing | Add: there are no E2E tests before launch. The manual launch checklist (step 9) is the acceptance test for the invite-only launch | OQ 8 |
