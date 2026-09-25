# Audit 01 — Repository Baseline

- **Date:** 2026-09-25
- **Scope:** Working tree at `/home/vardaanbazaz/Git Projects/moolsutra`, branch `main`, HEAD `1977fb3`, plus uncommitted changes.
- **Mode:** Read-only. The only file created is this document. `npm run build` regenerated `.next/` and `next-env.d.ts`, which are both gitignored. `git status --short` was identical before and after the audit.
- **Database evidence:** Every database fact below comes from `supabase_backup/db_cluster-25-08-2026@15-35-18.backup.gz`, a dump taken 2026-08-25. The live database was not queried, so its current state is **UNVERIFIED**.

---

## Summary

1. The build passes (exit 0) with one deprecation warning. Lint fails with **17 errors and 4 warnings**, which contradicts the "Lint Errors: 0" claim in `docs/context/`.
2. **Anyone can write to the database without logging in.** The dump shows `FOR INSERT WITH CHECK (true)` policies on `sutra_posts` and `sutra_card_nodes`. The only login check is a client-side UI gate that exists only in uncommitted code.
3. All Phase 2 auth work is uncommitted and untracked: `src/utils/`, `src/middleware.ts`, `src/app/login/`, `src/app/auth/` and the AuthButton files. The deployed HEAD has no auth.
4. `supabase_backup/` (a full DB cluster dump) and `docs/context/` are untracked and **not gitignored**, so one `git add .` would publish them. No secrets were ever committed to git history.
5. The only Phase 2 work that exists is the email/password auth scaffolding. The oral vault, submissions, pg_trgm search, OAuth/OTP, transliteration and fuzzy search do not exist. The theme toggle does not change the theme.

---

## Findings table

| ID | Severity | Title | Evidence |
|----|----------|-------|----------|
| F-01 | CRITICAL (if still live) | Anonymous INSERT allowed on `sutra_posts` / `sutra_card_nodes`; auth gate is client-side only | backup policies 5813, 5820 + `GRANT ALL ... TO anon` 7006, 7015; `src/components/ComposeSutra.tsx:176-179`; `src/lib/supabaseClient.ts:5-8` |
| F-02 | HIGH | `supabase_backup/` DB dump untracked and not gitignored | `git status` `?? supabase_backup/`; `.gitignore:1-41` has no rule |
| F-03 | HIGH | All Phase 2 auth code is uncommitted: not on remote, not deployed | `git status --short`; `git log --all` shows 4 commits, none touching `src/utils`, `src/middleware.ts`, `src/app/login` |
| F-04 | HIGH | Lint fails: 17 errors, 4 warnings | `npm run lint` output (exit 1) |
| F-05 | MEDIUM | Open redirect in auth callback via `next` param | `src/app/auth/callback/route.ts:7,13` |
| F-06 | MEDIUM | Posts are not bound to user identity; `author_handle` is free text, derived from email, and spoofable; `author_id` is never written | `ComposeSutra.tsx:36,57,69,191-193,290-297`; backup `COPY public.sutra_posts (... author_id)` |
| F-07 | MEDIUM | Theme toggle has no visual effect: Tailwind `dark:` compiles to `prefers-color-scheme`, not `.dark` | `src/components/ThemeToggle.tsx:17-28`; `src/app/globals.css` (no `@custom-variant`); `.next/static/chunks/0gk3h4jis36eu.css` shows `.dark\:bg-zinc-950` nested under `@media (prefers-color-scheme:dark)` |
| F-08 | MEDIUM | Duplicate Supabase client patterns; server pages query as anon without user cookies | `src/lib/supabaseClient.ts` vs `src/utils/supabase/{client,server}.ts`; `src/app/pramaan/page.tsx:5`, `src/app/sutra/page.tsx:5` |
| F-09 | MEDIUM | `docs/context/` PDFs untracked and not ignored; contain local paths, LAN IP, full SQL schema | `pdftotext` scan: 35 hits for `/home/vardaanbazaz`, 1 for `192.168.` |
| F-10 | MEDIUM | Non-atomic two-step post insert; orphaned posts on node failure | `ComposeSutra.tsx:202-230` |
| F-11 | MEDIUM | `middleware.ts` uses deprecated Next 16 convention (renamed `proxy.ts`) | build warning; `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/middleware.md:11` |
| F-12 | LOW | Debug `console.log` left in shipped code (commit `1977fb3`) | `src/lib/supabaseClient.ts:1` |
| F-13 | LOW | Dead / fallback code paths | `ComposeSutra.tsx:206-213`, `:23,237`; `sutra/page.tsx:47`; `Navbar.tsx:60`; `globals.css:11-12`; `public/*.svg` |
| F-14 | LOW | `data/seed_pramaan.json` unused and out of sync with DB (1 record vs 5) | no import in `src/`; backup `public.pramaan_vault` 5 rows |
| F-15 | LOW | `handle_new_user()` is `SECURITY DEFINER` without `SET search_path`, `GRANT ALL ... TO anon` | backup lines 1001-1020, 6566 |
| F-16 | LOW | Extraneous packages in `node_modules` | `npm ls --depth=0` (6 `extraneous`) |
| F-17 | LOW | README out of date (no auth, file tree missing 7 files, overstated features) | `README.md:28-31,84-111` |
| F-18 | INFO | No secrets ever committed to git history | `git log --all -p` scan; `.env.local` values: 0 hits |
| F-19 | INFO | Git author email looks mistyped (`@gmal.com`) | `git log --format='%ae'` → `vardaanbazaz@gmal.com` on all 4 commits |
| F-20 | INFO | `signUp` sets no `emailRedirectTo`; `/auth/callback` reachability UNVERIFIED | `src/app/login/page.tsx:51-54` |
| F-21 | INFO | No tests, no test script, no CI config | `package.json:5-10`; file tree |

---

## Detailed findings

### F-01 — Anonymous writes allowed; "Public Read, Authenticated Write" not enforced (CRITICAL / HIGH)

**Evidence**
- DB dump (2026-08-25):
  - line 5813: `CREATE POLICY "Allow public insert on sutra_card_nodes" ON public.sutra_card_nodes FOR INSERT WITH CHECK (true);`
  - line 5820: `CREATE POLICY "Allow public insert on sutra_posts" ON public.sutra_posts FOR INSERT WITH CHECK (true);`
  - lines 7006 and 7015: `GRANT ALL ON TABLE public.sutra_card_nodes TO anon;` and `GRANT ALL ON TABLE public.sutra_posts TO anon;`. Both the RLS policy and the table privilege are present, so an anonymous insert succeeds at the database layer.
- `docs/context/MoolSutra Coding Thread Gemini.pdf` describes adding these as a temporary Phase 1 MVP measure: "we will allow anonymous inserts so you can test publishing immediately". No later step revokes them.
- The anon key is a `NEXT_PUBLIC_*` variable (`src/utils/supabase/client.ts:5-6`), so it is bundled into every browser.
- The only login check is in React: `ComposeSutra.tsx:176-179` (`if (!user) { ... return; }`) and the render gate at `:246`. No server-side check exists.
- The deployed HEAD (`1977fb3`) has no gate at all. Its `ComposeSutra.tsx` imports the anon singleton from `@/lib/supabaseClient` (see the `git diff` of that file).

**Impact:** Anyone holding the public anon key (i.e. anyone who loads the site) can POST directly to the PostgREST endpoint and create posts and card nodes with any `author_handle`, bypassing the UI. This allows spam and impersonation.

**Severity basis:** The rating is CRITICAL if the policy is still live, which the owner needs to confirm. If the policies were revoked after 2026-08-25 and no authenticated INSERT policy was added, then logged-in users cannot post either. In that case this becomes a functional bug (a broken composer) rather than a security finding. Either way, the code has no server-side enforcement and writes no `author_id` (F-06).

### F-02 — Database dump sitting unignored in repo root (HIGH)

- `supabase_backup/db_cluster-25-08-2026@15-35-18.backup.gz` (40 KB, 7,449 lines uncompressed) and `<project-ref>.storage.zip` (an empty zip archive, per `file`).
- `.gitignore` covers `.env*` (line 34), but nothing covers `supabase_backup/`, `*.backup.gz` or `*.sql`.
- Current contents of the dump:
  - full schema, including RLS policies, functions, grants, 45 role statements and a `\restrict` token;
  - public data rows: 5 `pramaan_vault`, 5 `pramaan_translations`, 1 `sutra_posts`, 2 `sutra_card_nodes`;
  - **0** `auth.users` rows;
  - no `jwt_secret` or `service_role` strings, and no password hashes.
- The present risk is limited to schema disclosure. It becomes a real PII risk if a future dump is dropped in the same place after users sign up.
- The Supabase project ref is in the zip filename. It matches the project behind `.env.local` (checked without printing the value).

### F-03 — Phase 2 auth exists only in the working tree (HIGH)

`git status --short` shows the following.

**Modified:**
- `package.json` (adds `@supabase/ssr ^0.12.4`)
- `package-lock.json` (+26 lines: `@supabase/ssr`, `cookie`)
- `src/app/layout.tsx`
- `src/components/ComposeSutra.tsx`
- `src/components/Navbar.tsx`

**Untracked:**
- `src/app/auth/`
- `src/app/login/`
- `src/components/AuthButton.tsx`
- `src/components/AuthButtonClient.tsx`
- `src/middleware.ts`
- `src/utils/`
- `docs/`
- `supabase_backup/`

**Consequences:**
- The remote (`origin/main` = `1977fb3`) and any Vercel deployment built from it have **no authentication**.
- Nothing is backed up. A disk loss or an accidental `git checkout .` / `git clean` would lose this work.

**Build results cover the working tree only:** the build and lint results in this audit were run on the working tree (HEAD plus uncommitted changes). The build and lint state of HEAD alone is **UNVERIFIED**.

### F-04 — Lint fails (HIGH)

`npm run lint` exits 1 with `✖ 21 problems (17 errors, 4 warnings)`.

| File | Errors | Warnings | Rules |
|------|--------|----------|-------|
| `src/app/pramaan/page.tsx` | 3 | 0 | `no-explicit-any` (36, 38, 59) |
| `src/app/sutra/page.tsx` | 4 | 0 | `no-explicit-any` (38, 41×2, 58) |
| `src/components/AuthButtonClient.tsx` | 1 | 1 | `no-explicit-any` (8); `no-img-element` (25) |
| `src/components/ComposeSutra.tsx` | 8 | 2 | `no-explicit-any` ×7 (31, 109, 111, 191, 199, 200, 238); `react-hooks/immutability` (81: `fetchPramaanRecords` accessed before declaration); `exhaustive-deps` (76, 83) |
| `src/components/ThemeToggle.tsx` | 1 | 0 | `react-hooks/set-state-in-effect` (11) |
| `src/middleware.ts` | 0 | 1 | `no-unused-vars` (`options`, 18) |

`npm run build` (Next.js 16.3.1, Turbopack) exits 0 with one warning:

```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
```

- TypeScript finished with no errors.
- All six routes are dynamic (`ƒ`): `/`, `/_not-found`, `/auth/callback`, `/login`, `/pramaan`, `/sutra`.
- `Supabase URL: EXISTS` was printed twice during page-data collection. This comes from F-12.
- Next 16 does not run lint during `next build`, which is why the build passes despite 17 lint errors.

### F-05 — Open redirect in `/auth/callback` (MEDIUM)

`src/app/auth/callback/route.ts:7` takes `next` from the query string and line 13 redirects to `` `${origin}${next}` `` without validating it.

- A value like `next=@evil.com` produces `https://moolsutra.app@evil.com`, which browsers resolve to host `evil.com`.
- `next=.evil.example` can behave similarly, depending on the origin.
- The redirect only fires after a successful `exchangeCodeForSession`. Even so, a phishing link that goes through a real login flow is the classic abuse of this pattern.

### F-06 — Posts not tied to authenticated user (MEDIUM)

- **Handle defaults:** `authorHandle` defaults to `"@DharmaExplorer"` (`ComposeSutra.tsx:36`) and is overwritten with the email local part (`:57`, `:69`).
- **Handle is editable:** the handle stays a free-text input (`:290-297`) that is sent as-is (`:191-193`).
- **No identity written:** `author_id` exists in the DB schema (backup `COPY public.sutra_posts (..., author_id)`), but the insert never sets it. The single existing post has `author_id = \N`.
- **Result:**
  - any logged-in user can post as any handle;
  - by default, part of the user's email address is published publicly (privacy / DPDP concern);
  - a future RLS rule like `auth.uid() = author_id` cannot work until the code writes `author_id`.

### F-07 — Theme toggle is a no-op (MEDIUM)

- `ThemeToggle.tsx` adds and removes the `dark` class on `<html>`.
- `globals.css` has no `@custom-variant dark (...)`, so Tailwind v4 uses its default `prefers-color-scheme` media strategy.
- **Verified in built CSS:** `.dark\:bg-zinc-950{...}` is nested inside `@media (prefers-color-scheme:dark)` within `@layer utilities` (`.next/static/chunks/0gk3h4jis36eu.css`).
- **Effect:**
  - The UI follows the OS setting only. Clicking the toggle changes only its own icon.
  - A dark-OS user cannot switch to light.
- Nothing is persisted either (no `localStorage`).

### F-08 — Duplicate Supabase clients (MEDIUM)

There are three ways the code creates a client:
1. `src/lib/supabaseClient.ts`: a module-level `createClient` singleton from `@supabase/supabase-js`, anon, cookie-less. Used by `src/app/pramaan/page.tsx:5` and `src/app/sutra/page.tsx:5` (both server components).
2. `src/utils/supabase/client.ts`: `createBrowserClient` from `@supabase/ssr`. Used by `login/page.tsx`, `ComposeSutra.tsx` and `AuthButtonClient.tsx`.
3. `src/utils/supabase/server.ts`: `createServerClient` with cookies. Used by `AuthButton.tsx` and `auth/callback/route.ts`.

- `src/middleware.ts:9` also constructs its own server client inline, which is the standard pattern.
- The PDF walkthrough itself calls #1 a "Legacy client helper".
- **Risk:** the server pages read as anonymous even when the user is logged in. Once any RLS rule depends on `auth.uid()` (drafts, own submissions), those pages will silently return the wrong data.
- `ComposeSutra.tsx:28` calls `createClient()` on every render. This is harmless in the browser, because `@supabase/ssr` caches a singleton browser client (`node_modules/@supabase/ssr/dist/main/createBrowserClient.js:9-13`).

### F-09 — Chat-export PDFs unignored (MEDIUM)

- `docs/context/MoolSutra Coding Thread Gemini.pdf` (7 pages) and `MoolSutra Idea Thread Gemini.pdf` (32 pages) are untracked and not ignored.
- Text extraction found:
  - no real keys (the only `eyJ` hit is the literal placeholder text "starting with eyJ...", and the Supabase URLs are `xxxxxxxxxxxx`/`xyz` placeholders);
  - 35 occurrences of the local home path;
  - one LAN IP (`192.168.x.x`, from a pasted `npm run dev` log);
  - both Gemini share URLs;
  - the full SQL schema and RLS design (including F-01's permissive policies);
  - co-founder / business discussion.
- **Owner decision:** whether these are meant to be public if committed.

### F-10 — Non-atomic post creation (MEDIUM)

- `ComposeSutra.tsx:202` inserts `sutra_posts`, then `:226` inserts `sutra_card_nodes`.
- If the second insert fails, an empty post remains, and nothing cleans it up.
- The retry at `:207-213` can also fire on any error, not just a missing column, which can produce a duplicate post attempt.
- An RPC or DB function would make the two inserts atomic.

### F-11 — Deprecated `middleware.ts` (MEDIUM)

- Next 16 docs (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/middleware.md:11`): "The `middleware.js` file convention has been **deprecated** in Next.js 16 and renamed to `proxy.js`."
- A codemod exists: `npx @next/codemod@canary middleware-to-proxy .`
- The build output already labels it `ƒ Proxy (Middleware)`.

### F-12 — Debug log committed (LOW)

- `src/lib/supabaseClient.ts:1`: `console.log('Supabase URL:', ... ? 'EXISTS' : 'MISSING');`.
- It was added in `1977fb3` as a temporary Vercel debug step, which the PDF says to remove once resolved.
- It logs only presence, not the value.
- Two further `console.error` calls are in `ComposeSutra.tsx:107,134`.

### F-13 — Dead or leftover code (LOW)

| Location | What | Why dead |
|----------|------|----------|
| `ComposeSutra.tsx:206-213` | Retry insert with `pramaan_id` column | The DB column is `attached_pramaan_id` (backup `COPY public.sutra_posts`); `pramaan_id` does not exist on `sutra_posts` |
| `ComposeSutra.tsx:23,237` | `onPostPublished` prop | Never passed (`sutra/page.tsx:87` renders `<ComposeSutra />`) |
| `sutra/page.tsx:47` | `row.attached_pramaan` fallback | Not a selected column; always undefined |
| `Navbar.tsx:60` | `authButton \|\| <AuthButtonClient user={null} />` | `layout.tsx:21` always passes `authButton` |
| `Navbar.tsx:8` | import of `AuthButtonClient` | Only used by the dead fallback above |
| `globals.css:11-12` | `--font-geist-sans/mono` | Geist fonts were removed from `layout.tsx`; the variables are undefined, so `body` falls back to Arial (`:25`) |
| `globals.css:3-26` | `--background`/`--foreground` vars | Overridden by `body` classes in `layout.tsx:19` |
| `public/{file,globe,next,vercel,window}.svg` | create-next-app boilerplate | 0 references in `src/` |
| `PramaanCard.tsx:38,41,45` | `lang` prop | Never passed; only `en` is ever fetched (`pramaan/page.tsx:31`) |

### F-14 — Seed JSON unused and stale (LOW)

- `data/seed_pramaan.json` holds 1 record (`33-koti-devatas`). No file in `src/` imports it.
- The DB dump has 5 `pramaan_vault` and 5 `pramaan_translations` rows. The PDF says 5 records were seeded via SQL, and "we can completely skip the static local JSON file".
- The README (`:88-89`) still lists it as the "Seed etymology records".

### F-15 — `handle_new_user` hardening (LOW, for Audit on DB)

- Backup lines 1001-1020: `CREATE FUNCTION public.handle_new_user() ... LANGUAGE plpgsql SECURITY DEFINER`, with no `SET search_path`.
- Line 6566: `GRANT ALL ON FUNCTION public.handle_new_user() TO anon;` (Supabase default grants).
- The trigger is attached at line 5443.
- Supabase's linter flags a mutable `search_path` on SECURITY DEFINER functions.
- There is a separate latent bug: the generated `handle` (`LOWER(SPLIT_PART(email,'@',1)) || '_' || SUBSTRING(id,1,4)`) can exceed `VARCHAR(50)`. That would make sign-up fail. **UNVERIFIED**, pending the DB audit.

### F-16 — Extraneous packages (LOW)

`npm ls --depth=0` lists these as `extraneous`:
- `@emnapi/core`, `@emnapi/runtime`, `@emnapi/wasi-threads`
- `@img/sharp-wasm32`
- `@napi-rs/wasm-runtime`
- `@tybys/wasm-util`

These are leftovers in `node_modules`, likely optional wasm fallbacks. They are not part of the manifest and do not affect a clean `npm ci`.

### F-17 — README drift (LOW)

The README was written at `5861f7b`, before auth.
- It omits `login/`, `auth/callback`, `utils/supabase/`, `middleware.ts`, `AuthButton*.tsx` and `LICENSE`.
- It claims "Native Indic Scripts (Devanagari, Tamil, etc.)" and "Translates card titles ... dynamically" (`:30-31`). In the code, script mode only swaps in the single stored `original_script_text` field. There is no transliteration, and no Tamil handling beyond whatever text is stored in the row.
- It claims a "Live Social Feed ... in real-time" (`:26`). No Supabase realtime `channel(` subscription exists; the feed updates only on `router.refresh()` after the user's own post.

### F-18 — No secrets in history (INFO)

- `git log --all -- '*.env*' '.env*'` returns nothing.
- The full `git log --all -p` contains 0 occurrences of the `.env.local` URL value and 0 of the anon key value (checked by exact match, values not printed), and 0 occurrences of the project ref.
- The only env references in history are README placeholders (`your-supabase-anon-key`).
- `.env.local` is ignored by `.gitignore:34` (`.env*`).
- There is no `.env.example` in the repo.

### F-19 — Commit email typo (INFO)

- All 4 commits are authored by `vardaanbazaz <vardaanbazaz@gmal.com>`.
- If this is a typo for `gmail.com`, GitHub will not link the commits to the owner's account.

### F-20 — Email confirmation redirect (INFO)

- `supabase.auth.signUp({ email, password })` (`login/page.tsx:51-54`) passes no `options.emailRedirectTo`.
- Whether confirmation emails land on `/auth/callback` depends on the Supabase dashboard's Site URL and Redirect URL settings. **UNVERIFIED.**

### F-21 — No tests or CI (INFO)

- The scripts are only `dev`, `build`, `start` and `lint` (`package.json:5-10`).
- There is no test framework, no `.github/workflows/`, and no `vercel.json`.

---

## Repository facts

### File tree (excluding `node_modules`, `.next`, `.git`)

```
AGENTS.md                         tracked
CLAUDE.md                         tracked (contains only "@AGENTS.md")
LICENSE                           tracked  (MIT, "Copyright (c) 2026 MoolSutra")
README.md                         tracked
data/seed_pramaan.json            tracked  — unused (F-14)
docs/context/*.pdf (2)            UNTRACKED, not ignored (F-09)
.env.local                        ignored
eslint.config.mjs, next.config.ts (empty config), postcss.config.mjs, tsconfig.json
next-env.d.ts                     ignored, generated
package.json, package-lock.json   modified
public/*.svg (5)                  tracked — unused boilerplate
src/app/{layout,page}.tsx, globals.css, favicon.ico
src/app/pramaan/page.tsx, src/app/sutra/page.tsx
src/app/login/page.tsx            UNTRACKED
src/app/auth/callback/route.ts    UNTRACKED
src/components/ (11 files; AuthButton.tsx, AuthButtonClient.tsx UNTRACKED)
src/lib/supabaseClient.ts         tracked (legacy client)
src/utils/supabase/{client,server}.ts  UNTRACKED
src/middleware.ts                 UNTRACKED
supabase_backup/ (2 files)        UNTRACKED, not ignored (F-02)
```

**Missing:**
- `.env.example`
- tests
- CI
- SQL migrations / `supabase/` directory. The schema lives only in the PDFs and the dump.
- `proxy.ts` (the non-deprecated name)

### Dependencies (`package.json`)

| Package | Declared | Installed | Used? |
|---------|----------|-----------|-------|
| `@supabase/ssr` | ^0.12.4 (uncommitted) | 0.12.4 | Yes, `utils/supabase/*`, `middleware.ts` |
| `@supabase/supabase-js` | ^2.112.3 | 2.112.3 | Yes, `lib/supabaseClient.ts` (and peer of ssr) |
| `lucide-react` | ^1.32.0 | 1.32.0 | Yes, most components |
| `next` | 16.3.1 | 16.3.1 | Yes |
| `react` / `react-dom` | 19.2.8 | 19.2.8 | Yes |
| `@tailwindcss/postcss` | ^4 | 4.3.3 | Yes, `postcss.config.mjs` |
| `tailwindcss` | ^4 | 4.3.3 | Yes |
| `@types/node` | ^20 | 20.19.43 | Yes (local Node is v22.23.1; minor mismatch) |
| `@types/react`, `@types/react-dom` | ^19 | 19.2.18 / 19.2.4 | Yes |
| `eslint` / `eslint-config-next` | ^9 / 16.3.1 | 9.39.5 / 16.3.1 | Yes |
| `typescript` | ^5 | 5.9.3 | Yes |

- **Unused declared dependencies:** none.
- **Missing dependencies:** none for the current code. A transliteration library (e.g. `@indic-transliteration/sanscript`, named in the idea-thread report) is **not** installed, consistent with the feature being absent.
- **Scripts:** `dev`, `build`, `start`, `lint`. There is no `test`, `typecheck` or `format` script.
- **No `engines` field.**

### Git

- **Branch:** `main`, tracking `origin/main` (`https://github.com/vardaanbazaz/moolsutra.git`), in sync (`## main...origin/main`). No other branches, no stashes.
- **History** (all 2026-08-18, IST):
  - `c9ca2d8` Initial commit from Create Next App
  - `7fce36f` feat: launch Phase 1 MVP — Pramaan Vault, Sutra Feed, and Global Script Transcoder (17 files, +1621/−82)
  - `5861f7b` docs: add comprehensive README and MIT License
  - `1977fb3` chore: add debug log for Supabase URL
- **Deleted files in history:** none.
- **Uncommitted changes:** see F-03.

### `.gitignore` coverage

**Covered:**
- `node_modules`, `.next`, `out`, `build`, `coverage`
- `.env*`
- `*.pem`
- `.vercel`
- `*.tsbuildinfo`, `next-env.d.ts`
- debug logs, `.DS_Store`

**Gaps:**
- `supabase_backup/` or `*.backup.gz` / `*.sql` / `*.dump` (F-02)
- `docs/context/`, if the PDFs are private (F-09)
- `supabase/.temp/`, `supabase/.branches/`, if the Supabase CLI is adopted later
- editor directories (`.vscode/`, `.idea/`)
- `.antigravity/` or other IDE agent state, if any is created. **UNVERIFIED** whether one exists; none is present today.

**Side effect:** `.env*` also ignores a future `.env.example`. That file would need a `!.env.example` negation.

### `CLAUDE.md` and `AGENTS.md`

- `CLAUDE.md` contains exactly one line: `@AGENTS.md`, which imports AGENTS.md.
- `AGENTS.md` contains only the Next.js-managed block (`<!-- BEGIN:nextjs-agent-rules -->`). It says:
  - This Next.js version has breaking changes. Read `node_modules/next/dist/docs/` before coding and heed deprecation notices. **Verified:** the docs directory exists (`01-app`, `02-pages`, `03-architecture`, `04-community`, `index.md`).
  - The block is written and re-added by `next dev`, per `node_modules/next/dist/server/lib/generate-agent-files.js`. **Verified:** that file generates both `AGENTS.md` and `CLAUDE.md` (`CLAUDE_MD_CONTENT = '@AGENTS.md\n'`, lines 64, 78-93).
- **Assessment:**
  - Not stale and not contradictory. It is accurate: Next 16 does rename middleware to proxy (F-11), which is exactly the kind of breaking change it warns about.
  - It contains **no project-specific guidance**. It says nothing about the Supabase client conventions, RLS expectations, the "public read / authenticated write" rule, the lint gate, or `supabase_backup/` handling.
  - The project's own code already violates the deprecation advice (F-11).

---

## Claims vs reality

Sources:
- **CT:** `docs/context/MoolSutra Coding Thread Gemini.pdf`
- **IT:** `docs/context/MoolSutra Idea Thread Gemini.pdf`
- **RM:** `README.md`
- **DB:** backup dump as of 2026-08-25

### Phase 1

| # | Claim | Source | Verdict | Evidence |
|---|-------|--------|---------|----------|
| 1 | Next.js 16 App Router + React 19 + Tailwind v4 + Supabase + Lucide | RM:37-41, CT | CONFIRMED | `package.json:11-27` |
| 2 | Pramaan Vault at `/pramaan`, server component reading `pramaan_vault` + `pramaan_translations` (en) | RM:16, CT | CONFIRMED | `src/app/pramaan/page.tsx:14-31` |
| 3 | Popular-myth red callout, verified-root green section | RM:18-19 | CONFIRMED | `PramaanCard.tsx:85-104` |
| 4 | Summary Mode / Scholar Mode dual view | RM:20 | CONFIRMED | `PramaanCard.tsx:42,115-175` |
| 5 | "Immutable" truth records | RM:17, CT | NOT FOUND (in code). DB has only SELECT policies on `pramaan_vault` (DB 5834), which blocks anon writes, but nothing enforces immutability for the service role/dashboard | DB 5827-5834 |
| 6 | Sutra feed at `/sutra`, posts + ordered card nodes + attached Pramaan chip | RM:22-26 | CONFIRMED | `sutra/page.tsx:14-56`, `SutraPostCard.tsx` |
| 7 | Composer: 1-4 cards, Attach Truth Citation modal querying vault | RM:24-25, CT | CONFIRMED | `ComposeSutra.tsx:147-157,78-138,429-504` |
| 8 | "Live Social Feed ... in real-time" | RM:26 | CONTRADICTED | No realtime subscription; `revalidate = 0` + `router.refresh()` only (`sutra/page.tsx:7`, `ComposeSutra.tsx:236`) |
| 9 | Unified Indic **fuzzy** search | CT spec, IT report ("instant in-memory fuzzy search") | CONTRADICTED | Plain `toLowerCase().includes()` substring match (`PramaanVaultView.tsx:18-38`) |
| 10 | Search indexes Roman + Indic text | IT, CT | CONFIRMED (substring only) | `PramaanVaultView.tsx:25` matches `original_script_text` |
| 11 | Dynamic Script Transcoder / Transliteration Engine (ISO-15919 ⇄ Devanagari ⇄ Dravidian) | CT spec, commit `7fce36f` title | CONTRADICTED | `ScriptContext` is a boolean-like mode; cards swap title for the stored `original_script_text` (`PramaanCard.tsx:79-81`, `SutraPostCard.tsx` ~102-107). No transliteration library or logic |
| 12 | Toggle UI between Romanized and "Native Indic Scripts (Devanagari, Tamil, etc.)" | RM:30-31 | CONTRADICTED | Only titles/chips change; the rest of the UI stays English; no per-script selection |
| 13 | "Citation Needed" community tag | CT Phase 1 mind map | NOT FOUND | No match in `src/` |
| 14 | Replies / threaded debates (`parent_post_id`), likes | CT schema | NOT FOUND in UI | Columns exist (DB `COPY public.sutra_posts`); no code references `parent_post_id` or `likes_count` |
| 15 | Multi-language translations rendered | CT | NOT FOUND | Only `language_code = 'en'` fetched (`pramaan/page.tsx:31`) |
| 16 | Light/Dark mode switcher | RM:100, CT | CONTRADICTED | F-07: the toggle does not affect styles |
| 17 | `data/seed_pramaan.json` holds seed records | RM:89, CT | CONTRADICTED (stale/unused) | F-14 |
| 18 | 5 canonical records seeded | CT | CONFIRMED (as of dump) | DB: 5 `pramaan_vault`, 5 `pramaan_translations` rows |
| 19 | Deployed on Vercel | CT, IT | UNVERIFIED | No `vercel.json`/`.vercel` locally; PDF shows a Vercel build log for `7fce36f` |
| 20 | Supabase region Mumbai (ap-south-1) | IT | UNVERIFIED | Not derivable from repo |
| 21 | "$0/month" zero-cost stack | IT | UNVERIFIED | Out of scope |

### Phase 2 (auth and features)

| # | Claim | Source | Verdict | Evidence |
|---|-------|--------|---------|----------|
| 22 | Auth via `@supabase/ssr`: browser + server client helpers | CT walkthrough | CONFIRMED (uncommitted) | `src/utils/supabase/client.ts`, `server.ts`; F-03 |
| 23 | Middleware refreshes session, keeps `/`, `/pramaan`, `/sutra` public | CT | CONFIRMED (uncommitted) | `src/middleware.ts:33`; no redirects |
| 24 | Email/password sign-in and sign-up at `/login`; redirect to `/sutra` | CT | CONFIRMED (uncommitted) | `login/page.tsx:27-69` |
| 25 | `/auth/callback` code exchange route | CT | CONFIRMED (uncommitted), with open redirect | `auth/callback/route.ts`; F-05 |
| 26 | AuthButton (server) + AuthButtonClient in Navbar | CT | CONFIRMED (uncommitted) | `layout.tsx:21`, `Navbar.tsx:60` |
| 27 | Protected composer ("Sign in to compose a Sutra") | CT | CONFIRMED (UI only) | `ComposeSutra.tsx:246-271` |
| 28 | "Public Read, Authenticated Write" enforced / "only verified users can alter the cultural record" | CT response, IT | CONTRADICTED | F-01 (DB 5813, 5820) |
| 29 | Build: exit 0, TypeScript errors 0 | CT walkthrough | CONFIRMED | `npm run build` |
| 30 | **Lint errors: 0** | CT walkthrough | CONTRADICTED | 17 errors (F-04) |
| 31 | Route list `/`, `/_not-found`, `/auth/callback`, `/login`, `/pramaan`, `/sutra` + Proxy | CT walkthrough | CONFIRMED | build output |
| 32 | Walkthrough file tree (utils/supabase, middleware, login, auth/callback, AuthButton*, lib/supabaseClient as "legacy") | CT | CONFIRMED | file tree above |
| 33 | `profiles` table + `on_auth_user_created` trigger | CT, IT | CONFIRMED (DB) | DB lines 3661, 1004, 5443; not referenced by any app code |
| 34 | `sutra_posts.author_id` linked to profiles | CT, IT ("author_handle / author_id") | PARTIAL: column exists, never written | F-06 |
| 35 | Google OAuth / "Sign In (Email/Password or OAuth)" | IT report | CONTRADICTED | Only `signInWithPassword`/`signUp` (`login/page.tsx`); CT says OAuth was dropped for email/password |
| 36 | Passwordless / OTP / phone login | IT spec | NOT FOUND | — |
| 37 | Oral Vault (recorder, `oral_recordings`, R2/S3 uploads, player) | CT/IT Phase 2 spec | NOT FOUND | No code; no table in DB dump; empty storage zip |
| 38 | Peer-review pipeline (`pramaan_submissions`, submit form, admin dashboard) | CT/IT Phase 2 spec | NOT FOUND | No code; no table in DB |
| 39 | pg_trgm fuzzy search | CT/IT Phase 2 spec | NOT FOUND | No `pg_trgm` in DB dump or code |
| 40 | Cross-script transliteration engine | Phase 2 spec | NOT FOUND | See #11 |
| 41 | "Authentication ... operational" in live deployment | IT report | CONTRADICTED / UNVERIFIED | Auth code is not committed (F-03), so the deployed `origin/main` cannot include it |
| 42 | LICENSE MIT, "Copyright (c) 2026 MoolSutra" | CT | CONFIRMED | `LICENSE:1-3` |

---

## Open questions for the owner

1. Are the `Allow public insert` policies on `sutra_posts` / `sutra_card_nodes` still live in the production Supabase project? This decides whether F-01 is CRITICAL or HIGH.
2. Is the uncommitted auth work intended to be committed as-is? Has any of it been deployed some other way (e.g. `vercel` CLI from the working tree)?
3. What is `supabase_backup/` for? Should it live outside the repo, or should it be gitignored?
4. Are `docs/context/*.pdf` meant to be committed (public repo?) or kept private?
5. Is the GitHub repo public or private? This changes the impact of F-02 and F-09. **UNVERIFIED**: the GitHub MCP server failed to connect this session, and `gh repo view` returned `error connecting to api.github.com`.
6. Is `vardaanbazaz@gmal.com` intentional?
7. Which Vercel project and domain serve production, and which commit is live?
8. Supabase dashboard: what are the Site URL and redirect allow-list, is email confirmation on, and are any other auth providers enabled?
9. Is `data/seed_pramaan.json` still meant to be a source of truth (e.g. for future migrations), or can it be dropped?
10. Should posts show a profile handle (`profiles.handle`) instead of the free-text/email-derived `author_handle`?
11. Is there a canonical SQL schema/migration file anywhere outside the PDFs?

---

## Inputs needed for later audits

- **Live DB state:** a fresh schema-only dump or `supabase db dump --schema public` output (policies, grants, functions), plus the Supabase security advisor/linter output. The 2026-08-25 dump may be stale.
- **Supabase Auth settings:** providers, email confirmation, redirect URLs, rate limits, password policy, CAPTCHA.
- **Vercel:** project settings, env var scopes (confirm no `service_role` key is set as `NEXT_PUBLIC_*`), production commit, domain, and whether Vercel Analytics or Speed Insights is enabled.
- **GitHub:** repo visibility, branch protection, and whether secret scanning is on. The GitHub MCP server failed to connect this session, so this was not checked.
- **Decision on F-01 remediation direction:** an RLS insert policy with `auth.uid() = author_id`, plus code writing `author_id`, before any auth / API audit.
- **DPDP triggers present:**
  - the login form collects email and password;
  - the DB stores user-submitted posts;
  - the email local part is published as a handle.
  
  Later audits should check for:
  - a privacy notice at `/login` and at the composer;
  - a retention / deletion approach. Account deletion cascades to `profiles`, but `sutra_posts_author_id_fkey` has no `ON DELETE` rule (dump lines 5658-5662), so deleting a profile with posts will fail;
  - RLS bound to `auth.uid()` on every table;
  - rate limiting on sign-up / sign-in (Supabase-side);
  - server-side validation of card length and count. The 1-4 limit is enforced by a DB CHECK (`sutra_card_nodes_card_order_check`, dump line 3685); there is no content length limit.
- **Clean build of HEAD alone** (e.g. `git archive HEAD` into a temp dir), to confirm what is actually deployed.
- **Phase 2 scope decision:** which of the oral vault, submissions and pg_trgm are in scope for the next audits, since none exist yet.
