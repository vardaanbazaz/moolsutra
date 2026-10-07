# Audit 06 — UI/UX & Accessibility

- **Date:** 2026-10-07
- **Scope:** Every screen and state in `src/` on branch `phase2-auth` (HEAD `265f63c`): user journeys, information architecture, fit for the two audiences in `docs/context/`, presentation of uncertain content, WCAG 2.2 AA, mobile and slow-network behaviour, Indic typography, and microcopy outside the Audit 05 verification wording.
- **Mode:** Read-only for the repo. The only file created is this document. Commands run:
  - `next dev` on a spare port, with `NEXT_PUBLIC_SUPABASE_URL` overridden to an unreachable loopback address and a dummy anon key. This kept the app from making any outbound request and reproduced the error states the deleted database produces. `curl` fetched the rendered HTML and CSS of `/`, `/pramaan`, `/sutra`, `/login` and a 404.
  - Headless Chromium, taken from a Playwright browser cache that already existed in the user's home directory (nothing was installed), for screenshots at 320 and 360 px and for layout measurements. The measurements ran through a small same-origin proxy in a scratch directory outside the repo, which served a probe page and forwarded everything else to the dev server.
  - A Python script (scratch directory) that converts the Tailwind 4.3.3 `oklch` palette in `node_modules/tailwindcss/theme.css` to sRGB, composites alpha layers and computes WCAG contrast ratios. Its hex output matches Tailwind's published hex values (e.g. zinc-400 `#9f9fa9`, emerald-600 `#009966`).
  - A Node script (scratch directory) that runs a verbatim copy of the vault search predicate against the Audit 05 corrected drafts.
  - `pdftotext` on the Idea Thread PDF; a read of the stored English titles in the local, gitignored `supabase_backup/` dump (records 3 and 5 are not quoted in Audit 05).
  - Read-only `grep`, `sed` and `git` over the repo and `node_modules`, including the bundled Next 16 docs (`node_modules/next/dist/docs/`) for every Next API this document recommends.

  `next dev` regenerated `.next/`, which is gitignored. The dev server and proxy were stopped afterwards. `git status --short` was clean before the audit and shows only this file after it; `next dev` did not modify `AGENTS.md`, `CLAUDE.md` or any tracked file.
- **Prior audits:** Audits 01-05 in `docs/audits/`. Their "Decisions" sections override the proposals above them. Findings already covered there (`F-`, `D-`, `S-`, `C-`, `K-` IDs) are referenced, not repeated. In particular: C-05 (composer flash), C-08 (states and boundaries), C-10 (script mode reset and missing `lang`), C-14 (scaffold copy), C-19 (login labels, modal semantics, index keys), S-03 (handle input), S-06 (confirmation flow), S-08 (no reset), S-09 (raw errors), K-11 and the Audit 05 copy review and status badges. The theme toggle is removed in fix step 2 (Audit 04 Decision OQ 1), so it is not assessed beyond one INFO line.
- **Audiences** (Idea Thread PDF): a young reader who should understand a record "in under 30 seconds" (p. 5-6, where "Summary Mode" is described as "Plain English / simple Hindi"), and elders, for whom the thread promises "large text, audio narrations, and content available natively in Indic scripts rather than forced English transliteration" (p. 4) and an "Elder / Rural Mode" with audio-first narration (p. 3). Multilingual, typo-tolerant search over "English phonetics (e.g., typing "33 koti" …) and native Indic scripts" is promised on p. 5.
- **Method limit:** the database is deleted, so the success states were reviewed from the code, not rendered. Signed-in states could not be rendered either. Where a size or layout is computed from Tailwind classes rather than measured, it says so. Device- and font-dependent claims are marked **UNVERIFIED**.
- **This document is public** (the repo is public). It contains repo-relative paths only.

---

## Summary

1. A first-time visitor cannot tell what MoolSutra is or does. The home page has no example record, no search box and no plain statement of purpose, and no record has its own URL, so nothing can be shared or linked (U-01, U-02, U-15).
2. The "multilingual" promise is not delivered. The interface and all record text are English-only (the query hard-codes `en`), and the script toggle swaps one field for a different field, not a rendering of the same text. Search for the Idea Thread's own example, "33 koti", returns nothing against the corrected drafts (U-03, U-04, U-06).
3. The UI is built for neither audience's needs. For elders: 12 px text is the most common size, there is no audio, and there are no large targets. For young readers: jargon, slugs and a long stacked card (U-05, U-19). The record card can be made honest and still readable in 30 seconds (proposal below).
4. WCAG 2.2 AA fails on contrast, reflow at 320 px, page titles, input purpose, labels, state and status announcements, language of parts and one target size. The basics are sound: native controls, default focus rings and landmarks (U-07 to U-11, U-16, U-17).
5. On a slow or unreachable backend, `/pramaan` and `/sutra` show a blank wait of about 7 s, then a technical error. Before hydration, the login form silently reloads and drops what was typed. No Indic font is loaded, and letter-spacing is applied to Devanagari and Tamil (U-12, U-13).

---

## Journey maps

States marked *code* were read from source; *rendered* were seen in the dev server (error and signed-out states only, because the DB is gone).

### J1. First visit to the home page

| Step | What the user sees | Problems |
|------|--------------------|----------|
| Open `/` | *Rendered:* pill "MoolSutra Platform Architecture", heading "Modular Intelligence & Verification System", text "The routing environment has been successfully configured…", two cards "Pramaan / MODULE 1" and "Sutra / MODULE 2", each with "Verify Route" (`src/app/page.tsx:8-74`) | No statement of what the product is or who it is for. No example record, no search. The cards describe engines and routes. Copy is C-14/Audit 05; the missing structure is U-01 |
| Scroll | Footer "© 2026 MoolSutra Architecture" and a pulsing "Module Routes Active" pill (`src/app/layout.tsx:25-35`) | The fake status pill is already scheduled for removal (C-14) |
| Choose a card | Navigates to `/pramaan` or `/sutra` | The visitor has to guess which word means "look things up" (U-01, U-19) |
| Loading | None. The home page is static, but every other page waits on Supabase before sending any HTML (U-12) | — |
| Error / empty | Not applicable on `/` | — |

### J2. Browsing the vault (`/pramaan`)

| Step | What the user sees | Problems |
|------|--------------------|----------|
| Navigate | *Rendered:* nothing for about 7 s (server waiting), then the page (U-12) | No loading state (C-08) |
| Error | *Rendered:* amber "Database Notice: Could not retrieve records from Supabase: `TypeError: fetch failed`. Ensure the `pramaan_vault` and `pramaan_translations` tables exist…" (`src/app/pramaan/page.tsx:80-93`) | Developer text shown to readers (S-09, C-14). No retry and no explanation in plain words |
| Empty | *Code:* "No Records Found in Pramaan Vault … no records matching `language_code = 'en'`" (`:96-108`) | Table and column names shown to readers (C-14) |
| Success | *Code:* search bar, then every record as a full card, stacked (`src/components/PramaanVaultView.tsx:91-96`). Each card shows category, slug, source badge, title, red "Popular Misconception" box, green "Verified Vedic Root" box, a Summary/Scholar switch and three bullets (`src/components/PramaanCard.tsx:48-180`) | No index or list view: five long cards in one scroll. No per-record URL (U-02). Labels and colours are replaced under the Audit 05 decisions; the order and density remain (U-05) |
| Leave | "Proceed to Sutra (Module 2)" / "Back to Home" (`pramaan/page.tsx:116-130`) | — |

### J3. Searching (Roman and Indic input)

| Step | What the user sees | Problems |
|------|--------------------|----------|
| Focus search | Placeholder "Search by topic, Indic script (e.g. त्रयस्त्रिंशत्), title, or source..." (`src/components/SearchBar.tsx:14`) | The placeholder is the only instruction, and it disappears on typing. The example string still finds record 1 after `0005`, because it is a substring of the corrected excerpt (U-04) |
| Type "33 koti" | *Code + script:* the predicate (`PramaanVaultView.tsx:15-40`) does a lower-case substring match on slug, script text, title, myth, root, category and source | Against the corrected drafts: **0 results** for "33 koti", "puram", "shoonya", "trayastrimshat", "33 crore", "हिन्दू", "कोटि" (U-04) |
| Results | "Showing N of M records for "…"" with "Reset filter" (`:49-63`) | Not announced to screen readers (U-09) |
| No match | "No etymology records match your query", with a hint (`:67-88`) | The hint is K-19. "Etymology" is wrong for most records |
| Type Devanagari | Matches only `original_script_text`, never English text | No cross-script matching: "शून्य" finds record 3 only because its keyword is that word; "हिन्दू" finds nothing |

### J4. Reading a record (summary vs scholar view)

| Step | What the user sees | Problems |
|------|--------------------|----------|
| Read card top | Category pill (uppercase 12 px), slug `#33-koti-devatas` (12 px mono, zinc-400 on white: 2.63:1), source badge | The slug is internal data shown as content (U-19); contrast fails (U-08) |
| Read title, myth, root | `text-2xl`/`text-3xl` title; myth and root in `text-sm sm:text-base` (14 px on phones) | Body text is 14 px on phones (U-05). Under Audit 05 decisions the myth box disappears for all 5 records at launch, and the root becomes "What the sources say" |
| Summary view (default) | "Key Takeaways", three numbered bullets, `text-sm` (`PramaanCard.tsx:143-159`) | Fine for scanning; 14 px |
| Switch to "Scholar Mode" | Only the `original_script_text` in 30-48 px, plus "Source: … (…)" (`:160-177`) | No transliteration, no translation, no locator explanation (U-06). The switch state is not exposed to assistive tech (U-09) |
| Share or bookmark | Not possible: no record URL (U-02) | Dead end |

### J5. Switching script

| Step | What the user sees | Problems |
|------|--------------------|----------|
| Find the control | "A / अ" button in the header, 11 px glyphs, inactive glyph in zinc-400 (2.52:1 on zinc-50) (`src/components/ScriptToggle.tsx:10-27`) | Meaning is not obvious. The accessible name "Toggle script transliteration mode" does not include the visible "A / अ" and does not say the state (U-09, WCAG 2.5.3) |
| Press on `/`, `/login`, `/sutra` with no attached posts | Nothing changes | No feedback; the control appears on every page but works on two components only (U-03) |
| Press on `/pramaan` | Each card title is replaced by `original_script_text` (`PramaanCard.tsx:79-81`) | Record 2's title "Origin of the term "Hindu"" becomes "सिन्धु", a different thing. Record 4 shows Tamil although the tooltip says "Indic (Devanagari)" (U-03) |
| Reload | Back to Roman (C-10; persistence by cookie is decided, Audit 04 OQ 4) | — |

### J6. Signing up, confirming and signing in

| Step | What the user sees | Problems |
|------|--------------------|----------|
| Open `/login` | "Sign In to MoolSutra", subtitle "Access the Pramaan Vault and publish Sutra threads", email and password fields, "Sign In" (submit) and "Sign Up" (secondary) side by side (`src/app/login/page.tsx:72-183`) | The subtitle implies the vault needs an account; it does not. Sign-up is shown although launch is invite-only (Audit 03 OQ 7) (U-14) |
| New user types details and presses Enter | Enter submits "Sign In", not "Sign Up" → raw "Invalid login credentials" (S-09) | A new user's most natural action fails (U-14) |
| Press "Sign Up" | "Account created! Check your email to confirm registration or sign in." (`:64-67`) | No password rules shown before submit; the message is ambiguous ("or sign in") (U-14) |
| Click the email link | Lands on `/` with no message; confirmation does not complete (S-06) | Dead end (S-06) |
| Sign in | "Signed in successfully! Redirecting..." then always `/sutra` (`:36-38`) | Returns to `/sutra` even if the user came from `/pramaan` (U-14) |
| Forgot password | Nothing (S-08) | Dead end (S-08) |
| JS not yet loaded | Pressing "Sign In" does a native form submit. The inputs have no `name`, so the page reloads with nothing sent and the typed values are lost (U-12) | — |

### J7. Composing a Sutra and attaching a record

| Step | What the user sees | Problems |
|------|--------------------|----------|
| Open `/sutra` signed out | *Rendered (server HTML):* the full composer, then on hydration "Sign in to compose a Sutra" (C-05) | C-05 |
| Signed in | "Draft Sutra Thread", editable "Handle:" (S-03 removes it), "Card 1 of 4" textarea with placeholder only (`src/components/ComposeSutra.tsx:274-350`) | Textareas have no accessible name (U-10). No character count, although a 500-character limit is decided (S-03) (U-21) |
| Add / remove cards | "Add Card (1/4)"; trash icon 14×14 px (computed) | Target too small (U-17); focus lost on removal (C-19) |
| "Attach Truth Citation" | Modal "Attach Verified Pramaan" with search input and list (`:429-504`) | Modal semantics (C-19); search input has no label (U-10); load failure looks like empty (C-08); wording (Audit 05) |
| Pick a record | Green box with title, slug and source (`:366-393`) | — |
| Publish | "Publishing…" then "Sutra thread published successfully!" (`:233`) | Not announced (U-09); the success banner never clears. Line breaks typed in cards are lost when the post renders (U-18) |
| Error | Raw DB message (S-09, D-11) | — |

### J8. Signing out

| Step | What the user sees | Problems |
|------|--------------------|----------|
| Header while signed in | Full email address in a chip, then "Sign Out" (`src/components/AuthButtonClient.tsx:22-41`) | The email is visible on shared family phones; the handle is enough (U-20). The header likely overflows at 360 px (U-07, UNVERIFIED) |
| Press "Sign Out" | `signOut()` then `router.refresh()`; the user stays on the same page with no message (`:12-15`) | No confirmation; errors ignored (C-08) (U-20) |

---

## Findings table

| ID | Severity | Title | Evidence |
|----|----------|-------|----------|
| U-01 | HIGH | The home page does not say what the product is, for whom, or let the visitor do anything useful (no search, no example record) | `src/app/page.tsx:6-75`; rendered `/` at 320 px |
| U-02 | HIGH | Records have no URL: they cannot be shared, bookmarked or linked, and the feed chip lands on the whole vault | route list (`git ls-files src/app`); `SutraPostCard.tsx:90-92`; `PramaanVaultView.tsx:91-96` |
| U-03 | HIGH | "Multilingual" is not delivered: English-only UI and content, and the script toggle swaps a different field into the title slot | `pramaan/page.tsx:31`; `PramaanCard.tsx:45,79-81`; `ScriptToggle.tsx:13-14`; `SutraPostCard.tsx:107-109` |
| U-04 | HIGH | Search misses the product's own example queries: no diacritic folding, transliteration, cross-script or Unicode normalisation; bullets not searched | `PramaanVaultView.tsx:15-40`; search script output (U-04) |
| U-05 | HIGH | Elder audience not served: small text (12 px most common, 10-11 px in places), 14 px body on phones, uppercase micro-labels, no audio, no large-target mode | class counts (U-05); `PramaanCard.tsx:91,102,151`; Idea Thread p. 3-4 |
| U-06 | MEDIUM | The scholar view shows an original-script string with no transliteration, translation or language tag | `PramaanCard.tsx:160-177`; Idea Thread p. 6 |
| U-07 | MEDIUM | Reflow fails at 320 px (13 px horizontal scroll); the sticky mobile header is 121 px tall | headless measurement (U-07); `Navbar.tsx:20-85` |
| U-08 | MEDIUM | Text and non-text contrast failures in light and dark mode | contrast table (U-08) |
| U-09 | MEDIUM | Toggle states and status messages are not exposed to assistive tech | `ScriptToggle.tsx:10-16`; `PramaanCard.tsx:115-138`; `login/page.tsx:89-104`; `ComposeSutra.tsx:302-317`; `PramaanVaultView.tsx:49-63` |
| U-10 | MEDIUM | Composer textareas and the picker search have no accessible name; login fields lack `autocomplete` and `name` | `ComposeSutra.tsx:337-347,451-457`; `login/page.tsx:117-124,137-144` |
| U-11 | MEDIUM | On mobile there is no `nav` landmark; no `aria-current`; the mobile tab bar hides its overflow with no cue | `Navbar.tsx:35,65-84`; rendered `/` at 320 px |
| U-12 | MEDIUM | Unreachable or paused backend: about 7 s blank, then technical text; before hydration, login reloads and drops input | dev log timing; `@supabase/postgrest-js` `dist/index.mjs:5,13,368-382`; `login/page.tsx:107,117-144` |
| U-13 | MEDIUM | Indic typography: no Indic font loaded, body forced to Arial, serif request has no Indic face, letter-spacing on Devanagari and Tamil, tight heading line-height | `globals.css:22-26`; computed styles (U-13); `PramaanCard.tsx:72-77,169` |
| U-14 | MEDIUM | Login page: Enter always signs in, sign-up shown despite invite-only launch, no password rules, fixed redirect, misleading subtitle | `login/page.tsx:18-70,83-85,107-168` |
| U-15 | MEDIUM | Feed chip says "Attached Citation" and shows a slug instead of the record title; status cannot be shown because the query does not fetch it | `SutraPostCard.tsx:100-117`; `sutra/page.tsx:25-31` |
| U-16 | LOW | Heading structure gaps; every page has the same `<title>` | rendered HTML; `layout.tsx:7-10` |
| U-17 | LOW | Remove-card button is 14×14 px (fails 2.5.8); other targets sit at the 24 px minimum, well below what elders need | `ComposeSutra.tsx:327-334`; class arithmetic (U-17) |
| U-18 | LOW | Post text loses line breaks; dates use US format | `SutraPostCard.tsx:61-65,77-82` |
| U-19 | LOW | Jargon and internal identifiers in the interface beyond the Audit 05 copy review | list in U-19 |
| U-20 | LOW | Sign-out gives no feedback; the header shows the full email | `AuthButtonClient.tsx:12-15,19,29` |
| U-21 | LOW | Composer gives no length feedback and leaves stale success messages | `ComposeSutra.tsx:233,302-317,337-347` |
| U-22 | INFO | No `prefers-reduced-motion` handling (2.3.3 is AAA) | `grep -c prefers-reduced-motion` on compiled CSS: 0 |
| U-23 | INFO | Theme toggle: removal decided (Audit 04 OQ 1); contrast below assumes OS-driven light and dark | `ThemeToggle.tsx`; Audit 04 Decisions |

---

## Detailed findings

### U-01 — Home page communicates architecture, not the product (HIGH)

**Evidence**
- `src/app/page.tsx:6-75` holds the whole page: a badge, an `h1`, one paragraph about routing, and two link cards labelled "Module 1" and "Module 2". There is no search field, no example record, no statement of who it is for, and no mention of sources, India, culture or languages.
- The rendered page at 320 px puts the heading and the routing paragraph above the fold. The first card starts at about 580 px (screenshot), so a phone user sees no content at all on the first screen.
- The Idea Thread's Phase 1 deliverable is a "read-only, zero-friction web portal" where people "look up misunderstood concepts … in under 30 seconds" (p. 6). The home page does not offer a way to look anything up.
- The words are owner-written after Audit 10 (Audit 04 OQ 6; Audit 05 decision 6 already fixes the tagline and card text). This finding is about structure, which the wording change does not fix.

**Fix** (structure only; copy from the owner)
- Lead with a one-line statement of purpose and the vault search box on the home page itself. Submitting it goes to `/pramaan?q=…` (this also needs the query in the URL, see U-04).
- Below it, show 3-5 record previews (title, status badge, first bullet) linking to record pages (U-02). An honest "Most records are drafts under review" line sits next to them, as Audit 05 already proposes for `/pramaan`.
- Put Sutra (the feed) second, described as discussion that can link to records.
- Drop the "Module 1/2" scaffolding (C-14).
- Place: fix step 6, with the C-14 copy.

### U-02 — Records have no address (HIGH)

**Evidence**
- `git ls-files src/app` lists `page.tsx`, `pramaan/page.tsx`, `sutra/page.tsx`, `login/page.tsx` and `auth/callback/route.ts`. There is no `pramaan/[slug]`.
- All records render as full cards in one list (`PramaanVaultView.tsx:91-96`).
- The feed chip "View Pramaan →" links to `/pramaan`, not the record (`SutraPostCard.tsx:90-92`), so a reader who taps it lands at the top of the whole vault. WCAG 2.4.4 is PARTIAL on this account.
- The search term lives only in React state (`PramaanVaultView.tsx:13`), so a search cannot be shared either.
- For the young audience, sharing a link (in practice, on messaging apps) is how a "30-second" answer travels. UNVERIFIED as a usage claim, but no record can be linked at all.

**Fix**
- Add `/pramaan/[slug]` as a server-rendered record page using the same card. Use `generateMetadata` for a per-record `<title>` and description; in Next 16 `params` is a Promise and must be awaited (`next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md:54-63`). This also fixes 2.4.2 (U-16).
- `/pramaan` becomes a list of compact previews (title, status, first bullet) linking to record pages.
- Point the feed chip and picker results at the record page.
- Keep the search term in `?q=` (`useSearchParams` + `router.replace`). Wrap the client component that reads it in `<Suspense>` so the rest of the page still prerenders (`next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md:80-86`). Alternatively, read `searchParams` in the server page and pass it down.
- Slugs are stable public identifiers from then on. Record 1's slug `33-koti-devatas` repeats the framing Audit 05 corrected; decide before launch whether to keep it (Open question 2).
- Place: fix step 6. A new route is a small feature, not copy.

### U-03 — The multilingual promise vs what the toggle does (HIGH)

**Evidence**
- The interface is English-only. There is no i18n library, no locale routing and no translated strings; `<html lang="en">` is fixed (`layout.tsx:18`).
- Record content is English-only by construction: the vault query filters `pramaan_translations.language_code = 'en'` (`pramaan/page.tsx:31`), and `PramaanCard` receives `lang = "en"` by default and is never passed another value (`PramaanCard.tsx:41,45`; `PramaanVaultView.tsx:94`).
- The Idea Thread promises "Plain English / simple Hindi" for Summary Mode (p. 6) and "content available natively in Indic scripts rather than forced English transliteration" for elders (p. 4).
- What the script toggle actually does (`ScriptToggle.tsx`, `ScriptContext.tsx`):
  - In `PramaanCard`, it replaces the English **title** with `original_script_text` (`:79-81`). That field is not the title in another script; it is a keyword or excerpt (Audit 05 K-12, requirement 6). After `0005`: record 1 shows the quotation "त्रयस्त्रिंशत्त्वेव देवाः" as its title, record 2 "सिन्धु" (the source word, not "Hindu"), record 3 "शून्य", record 4 "அகம் / புறம்", record 5 "अनेकान्तवाद". The English title disappears.
  - In `SutraPostCard`, it replaces the label "Attached Citation" with the same field (`:107-109`).
  - Nothing else reacts: not the bullets, not the source summary, not the UI, not the home page, not the composer.
- The button's name says "transliteration" (`ScriptToggle.tsx:13`); that misnaming is Audit 01 claim #11 / F-17 (see C-10). New here: its title says "Indic (Devanagari)" (`:14`), but record 4 is Tamil.
- Honest assessment: the toggle is a cosmetic switch that shows one stored non-Latin string in place of the title. It is not multilingual and not transliteration. Calling it either would repeat the K-11 problem (labels that claim more than the product does).

**Fix**
- **Short term (launch):** keep the English title always. Show the original-script keyword or excerpt *under* it, always, with a `lang` attribute (U-06), and remove the global toggle. With nothing left to toggle, the C-10 cookie work in step 8 is not needed. Describe the product honestly as "English, with original-language terms" (owner wording).
- **If a toggle stays**, rename it to say what it does ("Show original script"), expose its state (U-09), scope it to record pages, and stop it replacing the title.
- **Real multilingual support** is a product decision (Open question 3):
  - UI strings: a message catalogue, e.g. `next-intl`; Hindi first.
  - Content: the existing `pramaan_translations` rows per language. Each translation needs its own review status (Audit 05 requirement 11).
  - A language switch that changes `lang` on `<html>` per route.
  - Audio is a later phase (Idea Thread p. 6: added "Only then").

### U-04 — Search misses the product's own examples (HIGH)

**Evidence.** The predicate at `PramaanVaultView.tsx:15-40` was copied verbatim into a Node script. It was run against the five records as `0005` will load them under Audit 05 Decision OQ 2: the corrected drafts, empty `popular_myth`, corrected titles where the draft gives one (records 1 and 4), and stored titles otherwise ("Origin of the term "Hindu"", "Śūnya (Zero)", "Anekāntavāda (Plural Truth)"). The result is conditional on that decision, since the DB is gone.

| Query | Hits | Note |
|-------|------|------|
| `33 koti` | **0** | Title has "33 koṭi" (ṭ); slug has a hyphen; myth is empty. This is the Idea Thread's own example (p. 5) |
| `koti` | 1 | Only through the slug `33-koti-devatas` |
| `33 crore` | **0** | Only matched the now-empty myth |
| `33 करोड़` | 0 | |
| `sangam` | 1 | Only through the slug |
| `puram` | **0** | Text says "Puṟam" (ṟ) |
| `akam` | 1 | |
| `hindu` | 1 | |
| `हिन्दू` | **0** | No cross-script matching |
| `shunya` | 1 | Slug |
| `shoonya` | **0** | Common Indian spelling |
| `zero`, `jain`, `anekanta`, `brahmagupta`, `sindhu` | 1 each | |
| `त्रयस्त्रिंशत्` | 1 | Substring of the new excerpt |
| `trayastrimshat` | **0** | |
| `कोटि` | **0** | The corrected excerpt no longer contains it |
| `शून्य`, `सिन्धु`, `புறம்` | 1 each | |

Other gaps:
- `summary_bullets` are not searched (`:28-32`).
- No `String.prototype.normalize()` anywhere in `src/` (`grep normalize`: 0 hits). Devanagari and IAST text typed on different keyboards can differ in composition (e.g. precomposed vs combining nukta or dot-below). Mismatch in practice is **UNVERIFIED**.
- The no-match hint is K-19 (not repeated).

**Fix**
- **Now, client-side** (the vault is 5 records):
  - build one search string per record from all English fields plus bullets;
  - `normalize("NFD")`, strip combining marks (U+0300-036F), lower-case;
  - collapse hyphens and spaces;
  - add a small hand-written alias list per record (`koti`, `crore`, `shoonya`, `shunya`, `sunya`, `puram`, `sangam`, `hindu`, `हिन्दू` …) as an `aliases text[]` column, or a constant until the schema has one.
  - Test with the queries above (fix step 4 has Vitest for the mapper and filter).
- **Later:** server-side search as an RPC with parameters (S-18 note), with transliteration (e.g. an ITRANS/IAST-to-Devanagari mapping), or the Meilisearch/Typesense plan in the Idea Thread (p. 4). This is a Phase 2 decision (Open question 7).
- Put the query in `?q=` (U-02) and give the input a visible label.

### U-05 — Text size and density do not serve elders (HIGH)

**Evidence**
- Class counts in `src/`: `text-xs` (12 px) 62, `text-sm` (14 px) 27, `text-base` (16 px) 11, `text-[11px]` 7, `text-[10px]` 2. So 12 px is the dominant size, and 11 and 10 px appear in slugs, dates, status pills and the toggle glyphs (`ComposeSutra.tsx:375,490`; `SutraPostCard.tsx:60,111`; `ScriptToggle.tsx:18`; `PramaanCard.tsx:66`).
- Reading text on phones is 14 px: the myth and root use `text-sm sm:text-base` (`PramaanCard.tsx:91,102`), and the bullets use `text-sm` at every width (`:151`). All buttons and form labels are 12 px (`login/page.tsx:110,130,153,163`).
- Ten `uppercase tracking-wider` micro-labels at 12 px (e.g. "ANALYSIS VIEW", "KEY TAKEAWAYS", "POPULAR MISCONCEPTION").
- Sizes are in `rem`, so browser text-size settings scale them (1.4.4 likely PASS, UNVERIFIED on Android Chrome's text-scaling setting).
- No audio anywhere. The Idea Thread defers audio to a later phase (p. 6), but promises "large text" for elders (p. 4).
- Per record, the card stacks seven blocks before the bullets (meta row, title, myth, root, view switch, label, bullets). On a 360 px phone the bullets of the first record start well below the first screen (estimated from class heights, not measured with data).

**Fix**
- Set 16 px as the minimum for any reading text and 18 px for record body and bullets, using `text-base`/`text-lg`. Never go below 12 px. Drop the `text-[10px]`/`text-[11px]` sizes.
- Replace the uppercase micro-labels with sentence-case labels at 14 px or more.
- Order the card for a 30-second read (see the record-card proposal).
- Make primary targets at least 44 px tall (U-17).
- Decide whether elders are a launch audience (Open question 5). If they are, add a "Larger text" preference stored with the script cookie, which scales the root font size. Audio follows in its own phase.
- Visual scale and tokens belong to Audit 07; the minimums above are the accessibility floor.

### U-06 — Scholar view: an excerpt nobody can read (MEDIUM)

**Evidence**
- `PramaanCard.tsx:160-177` renders `original_script_text` at 30-48 px with "Source: {primary_source} ({source_citation})". There is no transliteration, translation, gloss or explanation of the locator.
- The Idea Thread describes Scholar Mode as "Devanagari / Indic script verse, word-by-word grammatical breakdown, and historical commentaries" (p. 6).
- A young reader who does not read Sanskrit, or a Tamil-reading elder looking at Devanagari, gets a large string with no meaning attached.
- There is no `lang` on the text (C-10). C-10 suggests `lang="sa"`, but record 4 is Tamil (`ta`), and the schema has no field for the excerpt's language.

**Fix**
- Show the excerpt with its transliteration (IAST) and a plain-English gloss beneath it, all three marked up: `<p lang="sa">`, `<p lang="sa-Latn">`, `<p>`.
- Extend Audit 05 requirement 6 with `excerpt_lang` (BCP 47: `sa`, `ta`, `pi`, `pra` …) and `excerpt_translit`; fix C-10 using that field, not a hard-coded `sa`. If the step 3 schema cannot take these, render the excerpt without a gloss but with a hard-coded `lang` per record from `0005` data, and track the gap.
- Show the locator in words ("Bṛhadāraṇyaka Upaniṣad 3.9.2, Kāṇva recension"), as the structured sources of Audit 05 requirement 1 allow.
- Rename per Audit 05 ("Sources").

### U-07 — Reflow at 320 px; tall sticky header (MEDIUM)

**Evidence** (headless Chromium, signed-out state, all four pages). Raw probe output for one page:

```
w=320 / scrollWidth=333 header=121 overflow=[DIV.flex items-center gap-3 right=333; A.flex items-center gap-1.5 px-3.5 py-1.5  right=333] small=[]
w=360 /pramaan scrollWidth=360 header=121 overflow=[] small=[]
```

- At 320 px wide, `document.documentElement.scrollWidth` is **333**. The overflowing elements are the header's right-hand group (`Navbar.tsx:57-61`) and the "Sign In" link (`AuthButtonClient.tsx:46-52`), whose right edge is at 333 px. "Sign In" and "A / अ" both wrap to two lines inside their buttons (screenshot).
- At 360 px there is no overflow signed out.
- Signed in, the right group gains the email chip (`max-w-[100px]` plus icon and padding) and "Sign Out" (`AuthButtonClient.tsx:22-41`), roughly 150 px wider than "Sign In" by class arithmetic. It would overflow at 360 px too. **UNVERIFIED** (signed-in state could not be rendered).
- The sticky header measures **121 px** on mobile (`h-16` row plus the mobile tab bar). That is 15 % of an 800 px-tall viewport, and far more in landscape or at 200 % zoom. There is no `scroll-padding-top`, so content scrolled to by focus can sit under it (2.4.11, UNVERIFIED).
- The mobile tab bar (`Navbar.tsx:65`) uses `overflow-x-auto`; at 320 px "Sutra (Module 2)" is cut off at the edge with no scroll cue (U-11).

**Fix**
- On narrow widths, collapse the header right group: icon-only script control (if kept, U-03) with a visible label in a menu, and the account in a single icon button that opens a small menu (handle and Sign out).
- Shorten nav labels (drop "(Module N)", C-14) so the three items fit at 320 px without scrolling.
- Make only the top row sticky, or make the header non-sticky on small screens.
- Add `scroll-padding-top` equal to the sticky height.
- Re-measure at 320 and 360 px, signed in and out, in the step 9 checklist.

### U-08 — Contrast (MEDIUM)

Computed from the Tailwind 4.3.3 palette with alpha layers composited onto the actual parent backgrounds. Light mode uses `bg-white`/`bg-zinc-50`. Dark mode follows `prefers-color-scheme` (Audit 04 OQ 1), with cards `zinc-900/90` over `zinc-950`. Text needs 4.5:1 (all failing items are under 18.66 px bold or 24 px), and UI components need 3:1.

| Mode | Foreground / background | Ratio | Used at | Result |
|------|-------------------------|-------|---------|--------|
| Light | zinc-400 / white | 2.63 | Slugs (`PramaanCard.tsx:56`), "Card N of 4" and "Handle:" (`ComposeSutra.tsx:287,324`), dates (`SutraPostCard.tsx:60`), picker loading/empty/slug text (`ComposeSutra.tsx:463,470,490`), placeholders (`placeholder-zinc-400`) | FAIL |
| Light | zinc-400 / zinc-50 | 2.52 | "Primary Input Area" (`sutra/page.tsx:85`), inactive script glyph (`ScriptToggle.tsx:19,23`) | FAIL |
| Light | zinc-400 / zinc-100 | 2.39 | Picker slug chip (`ComposeSutra.tsx:490`) | FAIL |
| Light | emerald-600 / white | 3.67 | "Verify Route" (`page.tsx:44`), "Reset filter" (`PramaanVaultView.tsx:58`) | FAIL |
| Light | emerald-600 / emerald-500 10 % over zinc-50 | 3.20 | Footer pill, 11 px (`layout.tsx:29`; removed per C-14) | FAIL |
| Light | amber-800 80 % / amber-500 5 % over white | 4.47 | Scholar "Source:" line, 12 px (`PramaanCard.tsx:174`) | FAIL (marginal) |
| Light | zinc-500 / white, zinc-50 | 4.83, 4.62 | Helper text, section labels, footer | PASS (marginal) |
| Light | rose-700, emerald-700, amber-700 labels on their tints | 5.67, 5.17, 4.86 | Card section labels | PASS |
| Light | emerald-800 80 % / emerald-50 60 % | 4.61 | Chip source line | PASS (marginal) |
| Dark | zinc-500 / zinc-900 90 % over zinc-950 | 3.73 | Slugs (`PramaanCard.tsx:56`), dates (`SutraPostCard.tsx:60`), "Analysis View" and "Module N" (no `dark:` override: `PramaanCard.tsx:111`, `page.tsx:37,62`) | FAIL |
| Dark | zinc-500 / zinc-950 | 4.12 | Footer (`layout.tsx:25`) | FAIL |
| Dark | zinc-500 placeholder / zinc-800, zinc-900 | 3.08, 3.67 | Login fields, search | FAIL |
| Dark | zinc-400 on dark surfaces | 5.66-7.56 | Composer and picker labels | PASS |
| Dark | Coloured labels and banners | 6.24-11.99 | Card labels, notices, banners | PASS |
| Light (non-text) | zinc-200 border / white | 1.27 | All input borders | FAIL (1.4.11) |
| Light (non-text) | emerald-500 focus border / white | 2.46 | Search and picker inputs on focus (`SearchBar.tsx:27`, `ComposeSutra.tsx:456`) | FAIL (focus indicator) |
| Light (non-text) | indigo-500 focus border / white | 4.58 | Login and composer inputs on focus | PASS |
| Light (non-text) | zinc-400 focus ring / zinc-50 | 2.52 | Script toggle focus ring (`ScriptToggle.tsx:15`) | FAIL |
| Dark (non-text) | zinc-800 border / zinc-900; zinc-700 / zinc-800 | 1.19; 1.42 | Input borders | FAIL (1.4.11) |
| Dark (non-text) | zinc-600 focus ring / zinc-900 | 2.29 | Script toggle | FAIL |
| Light (non-text) | zinc-400 icon / white | 2.63 | Trash and modal close icons (`ComposeSutra.tsx:331,442`) | FAIL |

The 20 %-alpha focus rings (`focus:ring-indigo-500/20`, `focus:ring-emerald-500/20`) add almost no contrast. On text inputs the border colour change carries the indicator.

Placeholder text is not among the 1.4.3 exceptions (incidental, decorative or inactive text), so it must meet 4.5:1. Here it is also the only instruction for the card textareas and the picker search (U-10).

**Fix**
- Use zinc-500 as the lightest text colour on white in light mode, and zinc-400 as the lightest on dark surfaces. Add `dark:text-zinc-400` wherever `text-zinc-500` lacks a dark override. Use emerald-700 (5.37:1 on white, 5.17:1 on its tint) for green text links.
- Input borders: zinc-500 (4.83:1 on white). zinc-400 is not enough (2.63:1). Dark: zinc-600 on zinc-900 is 2.29:1, so zinc-500 (3.67:1) is needed.
- Focus: one consistent `focus-visible:outline-2 outline-offset-2` in a colour with at least 3:1 on both themes, e.g. indigo-600 light (6.44:1 on white) and indigo-400 dark (5.68:1 on zinc-900). Remove the `outline-none` plus faint ring patterns.
- The palette itself is Audit 07; these are the minimums it must meet.

### U-09 — State and status not exposed (MEDIUM)

**Evidence**
- The script toggle is a plain `<button>` whose name, "Toggle script transliteration mode", does not change with state (`ScriptToggle.tsx:10-16`). State is shown only by bold and colour on "A" or "अ". There is no `aria-pressed`. (4.1.2 FAIL; 2.5.3 PARTIAL, because the visible label "A / अ" is not part of the name.)
- The Summary/Scholar switch is two buttons with no `aria-pressed`, `role="tab"` or grouping (`PramaanCard.tsx:114-139`). State is shown only by a white background and shadow.
- No element in `src/` has `role="status"`, `role="alert"` or `aria-live` (`grep role=`: 0 hits; the 7 `aria-` uses are labels). So none of these is announced (4.1.3 FAIL):
  - the login banners (`login/page.tsx:89-104`);
  - the composer banners (`ComposeSutra.tsx:302-317`);
  - "Publishing…" (`:413-417`);
  - the search count "Showing N of M" (`PramaanVaultView.tsx:49-63`);
  - the picker "Loading Pramaan Vault…" (`ComposeSutra.tsx:462-467`).

**Fix**
- Toggles: `aria-pressed={on}` on a single toggle button with a stable name ("Show original script"), or a `role="radiogroup"` / segmented control for Summary/Sources with `aria-checked`.
- Put banners in a container that is always in the DOM. Use `role="alert"` for errors and `role="status"` for success and progress. Keep the search count in a `role="status"` element (polite).
- Build these into the `Notice` primitive (C-08/C-11, fix step 4) so every use inherits them.

### U-10 — Unlabelled fields and missing input purpose (MEDIUM)

**Evidence** (extends C-19, which covers the login `<label>` association and the modal semantics)
- The card textareas have only a placeholder. The visible "Card 1 of 4" is a `<span>` with no association (`ComposeSutra.tsx:324-347`). Rendered HTML confirms: `<textarea placeholder="Express your core principle…" rows="3">` with no `id`, `aria-label` or `aria-labelledby`.
- The picker search input has no label of any kind (`ComposeSutra.tsx:451-457`).
- The login inputs have no `autocomplete` and no `name` (`login/page.tsx:117-124,137-144`; rendered HTML: no `autocomplete` attribute on the page). 1.3.5 FAIL. Password managers and phone keyboards' saved-email suggestions work worse without them. 3.3.8 (Accessible Authentication) is still PASS, because nothing blocks paste and no cognitive test is required.

**Fix**
- `<label htmlFor>` (visually styled like the current "Card N of 4") per textarea, with a stable id from C-19's per-card id. A visually hidden `<label>` for the picker search.
- `name="email" autocomplete="email" inputMode="email"`. Use `autocomplete="current-password"` in sign-in mode and `new-password` in sign-up or invite-accept mode (U-14).

### U-11 — Mobile navigation semantics (MEDIUM)

**Evidence**
- The only `<nav>` is `hidden md:flex` (`Navbar.tsx:35`). Below 768 px it is `display: none`, so it leaves the accessibility tree. The mobile bar is a plain `<div>` (`:65`). Screen-reader users on phones get no navigation landmark.
- No link has `aria-current="page"`. The active item is shown only by a background colour (`:43-47,73-77`).
- At 320 px the third item is cut off by `overflow-x-auto` with no visible scroll affordance (screenshot).

**Fix:** render one `<nav aria-label="Main">` whose layout changes by breakpoint, or wrap the mobile bar in its own `<nav>`. Add `aria-current="page"` on the active link. Shorten labels so all items fit (U-07).

### U-12 — Slow or unreachable backend; slow JavaScript (MEDIUM)

**Evidence**
- With the backend unreachable, `/pramaan` and `/sutra` took **7.9 s and 7.6 s** to respond, 7.1 s of it in application code, against 0.12 s for `/`. Dev server log:

  ```
  GET / 200 in 121ms (next.js: 6ms, proxy.ts: 9ms, application-code: 105ms)
  GET /pramaan 200 in 7.9s (next.js: 782ms, proxy.ts: 6ms, application-code: 7.1s)
  GET /sutra 200 in 7.6s (next.js: 424ms, proxy.ts: 10ms, application-code: 7.1s)
  ```

- The cause is `@supabase/postgrest-js` 2.112.3, which retries idempotent requests after a network error up to 3 times with 1 s, 2 s and 4 s back-off (`node_modules/@supabase/postgrest-js/dist/index.mjs:5,13,368-382`).
- Pages render on the server only after the query settles, with no `loading.tsx` (C-08), so the user sees the previous page or a blank tab for the whole wait, then the technical "Database Notice" (S-09).
- The same applies when a Supabase project is paused or slow. Whether a free-tier project pause applies to the new project is **UNVERIFIED**. Latency on real Indian mobile networks was not measured (**UNVERIFIED**); the retry delay is added on top of whatever the network costs.
- **When JavaScript is slow:**
  - The server HTML already contains the vault cards and feed (both are server-rendered), so reading works before hydration. That is good.
  - Search, the Summary/Scholar switch, the script toggle and every form are inert until hydration.
  - The login form has no `action`/`method` and its inputs have no `name` (`login/page.tsx:107,117-144`). Pressing "Sign In" before hydration does a native GET to `/login`, reloads the page and drops everything typed. Nothing leaks, because nothing has a name.
  - The composer briefly shows the full form to signed-out users (C-05).
- No web fonts are loaded (U-13), so there is no font-loading delay. Bundle size is Audit 08.

**Fix**
- Add `loading.tsx` skeletons for `/pramaan` and `/sutra` (C-08, step 6; `next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md`), so navigation shows something at once.
- Turn the retry off for page loads: postgrest-js exposes `.retry(false)` per query (`dist/index.mjs:334-338`) and supabase-js passes a client-wide `db: { retry }` setting (`supabase-js/dist/index.mjs:670`). Add a short timeout (`.abortSignal(AbortSignal.timeout(…))`), and show a plain-language error with a "Try again" button (C-08).
- Sign-in: render the submit button `disabled` until hydrated, or give the form a Server Function so it works without JS (`next/dist/docs/01-app/01-getting-started/07-mutating-data.md`; it notes they are reachable by direct POST, so they need the S-17 review). Disabling until hydration is the smaller change.
- Measure on a throttled profile ("Slow 4G" in DevTools, plus a real low-end Android phone) in the step 9 checklist.

### U-13 — Indic typography (MEDIUM)

**Evidence**
- No font is loaded. There is no `next/font` import, no `@font-face` in the compiled CSS (0 matches), and `--font-geist-sans`/`--font-geist-mono` are referenced (`globals.css:11-12`) but never defined (F-13).
- The computed `font-family` of `<body>` is **`Arial, Helvetica, sans-serif`** (measured in headless Chromium). The unlayered `body { font-family: Arial… }` in `globals.css:22-26` beats Tailwind's layered `font-sans` utility. The Tailwind default stack, which includes "Noto Sans", is never used. The `font-mono` classes on citations resolve to the undefined Geist variable and so also inherit Arial.
- Arial has no Devanagari or Tamil glyphs, so every Indic character is drawn by the browser's per-character system fallback. Which face that is depends on the device:
  - this Linux machine has Noto Sans/Serif Devanagari and Tamil installed;
  - Android normally ships Noto Devanagari and Tamil;
  - Windows has Nirmala UI;
  - older or low-cost devices and in-app browsers may differ.

  All **UNVERIFIED** beyond this machine. Missing-glyph boxes are unlikely on current Android and likelier on old feature-phone browsers (**UNVERIFIED**).
- `font-serif` on Indic text (`PramaanCard.tsx:75,169`; `SutraPostCard.tsx:103`) requests `ui-serif, Georgia, Cambria, "Times New Roman", Times, serif`, which has no Indic face. Whether the fallback is serif or sans is left to the system.
- Letter-spacing is applied to Indic text: the card title has `tracking-tight` (computed −0.9 px at 36 px font size, in an 800 px-wide viewport, `sm:` active) and the scholar excerpt has `tracking-wide` (+0.75 px at 30 px, 360 px viewport). Devanagari depends on joined glyphs along the headstroke. On this machine's Noto fonts the headstroke stayed visually joined in the screenshot, but letter-spacing on connected scripts is a known source of broken shaping. Effect on other fonts is **UNVERIFIED**.
- Weights 800 (title) and 600 (excerpt) are requested. Where the fallback font has no such weight, the browser synthesises bold, which thickens conjuncts and vowel signs. **UNVERIFIED** per device.
- Line height:
  - the indic title uses `text-3xl`/`sm:text-4xl` line-heights of 1.2 and 1.11 (computed 40 px line at 36 px font size, 800 px viewport). Devanagari vowel signs above and below the line need more room when a title wraps (record 1's corrected excerpt is 24 characters);
  - the excerpt has `leading-snug` (1.375), which is adequate;
  - Indic words inside 14 px body text (e.g. the search hint) are small for conjunct legibility.
- In indic mode the title carries both `text-zinc-900` and `text-amber-900` (`PramaanCard.tsx:73-75`). It renders zinc-900 (screenshot), so the intended colour change does not happen. This is cosmetic.
- Latin diacritics: the corrected drafts use IAST letters such as ṭ, ṛ, ṃ, ṉ and ṟ (Audit 05 drafts). Whether Arial (or Liberation Sans as its substitute) covers U+1E49 and U+1E5F on every platform is **UNVERIFIED**. Font mixing within one word is likely where coverage is missing.

**Fix**
- Load fonts with `next/font/google` (`next/dist/docs/01-app/03-api-reference/02-components/font.md`; self-hosted at build time, so no third-party request at runtime, which also matters for the S-05 CSP):
  - one Latin family with full Latin Extended Additional coverage;
  - Noto Sans Devanagari and Noto Sans Tamil (or Noto Serif variants if the design wants serif excerpts), `display: "swap"`, the needed subsets and two weights at most.
- Expose each as a CSS variable and define `--font-sans` as Latin, then Devanagari, then Tamil, then system.
- Delete the `body { font-family: Arial… }` rule.
- Weigh the font payload in Audit 08.
- Never apply `tracking-*` or synthetic bold to Indic text: use `tracking-normal`, and a weight the font actually has.
- Give Indic text `leading-normal` (1.5) or more, at least 18 px in body copy, and the `lang` attribute (U-06), which also lets the browser pick locale-correct glyph forms.
- Test on a low-cost Android phone and in at least one in-app browser in the step 9 checklist.

### U-14 — Login page friction (MEDIUM)

**Evidence** (`src/app/login/page.tsx`)
- One form, two actions. Enter submits "Sign In" (`:107,150-157`), and "Sign Up" is a secondary `type="button"` (`:159-167`). A new user who fills the form and presses Enter gets a sign-in error (raw text, S-09).
- Sign-up is offered to everyone, but sign-up at launch is closed, then invite-only (Audit 03 Decision OQ 7). Supabase will reject public sign-ups once disabled, and the user sees an error after filling the form.
- No password requirements are shown before submit. No show-password control.
- The success text "Account created! Check your email to confirm registration or sign in." (`:66`) offers "or sign in", which fails while unconfirmed.
- The subtitle "Access the Pramaan Vault and publish Sutra threads" (`:84`) implies the vault is behind sign-in. It is public.
- After sign-in the user always goes to `/sutra` (`:37,61`), whatever page they came from.
- The only exit is "Return to Sutra Town Square" (`:173-179`).

**Fix** (fix step 7, together with S-06/S-08/S-09)
- Separate the modes. At launch there is only sign-in, plus "Have an invite? Check your email for the link"; the invite link lands on a set-password page.
- If public sign-up opens later, make it a separate view whose submit button is "Create account". Show the password rules up front and add a show-password toggle.
- Carry `?next=` (validated by the S-04 `safeRedirect`) so the user returns where they started.
- Subtitle: "Sign in to post in Sutra. Reading is open to everyone." (owner wording).

### U-15 — Feed chip hides which record is attached (MEDIUM)

**Evidence**
- In Roman mode the chip's main label is the fixed text "Attached Citation", followed by the slug, e.g. `#33-koti-devatas` (`SutraPostCard.tsx:107-113`).
- The feed query selects no translation, so the title is not available, and no `status` either (`sutra/page.tsx:25-31`).
- After Audit 05, the chip must show the record's status badge (Audit 05 decision, step 6), which this query cannot supply.

**Fix:** select the English title and `status` in the feed query (in the step 4 data layer). The chip shows the status badge, the title and the source, and links to `/pramaan/[slug]` (U-02). The `original_script_text` goes in a secondary line with `lang` (U-06), not in place of the label.

### U-16 — Headings and page titles (LOW)

**Evidence**
- Every route has `<title>MoolSutra Platform</title>` (rendered HTML of `/`, `/pramaan`, `/sutra`, `/login`; `layout.tsx:8`). 2.4.2 FAIL in practice: tabs, history and screen-reader page announcements cannot tell the pages apart.
- Heading levels:
  - `/pramaan` with no records jumps from `h1` to the empty-state `h3` (`pramaan/page.tsx:101`);
  - `/sutra` signed out goes from `h1` to the `h3` "Sign in to compose a Sutra" (`ComposeSutra.tsx:253`);
  - feed posts are `<article>`s with no heading at all (`SutraPostCard.tsx:46-127`), so heading navigation skips every post;
  - the picker title is an `h3` inside a modal with no dialog semantics (C-19).

**Fix:** set `export const metadata` (or `generateMetadata`) per route: "Pramaan records · MoolSutra", "Sutra · MoolSutra", "Sign in · MoolSutra", and the record title on record pages (U-02). Use `h2` for empty-state and sign-in prompts directly under the page `h1`. Give each post a visually hidden `h2` ("Post by @handle, 7 Oct 2026").

### U-17 — Target sizes (LOW)

**Computed from classes, not measured** (the composer could not be rendered signed in):

| Control | Size | 2.5.8 (24 px or spacing) |
|---------|------|--------------------------|
| Remove card (`ComposeSutra.tsx:327-334`): 14 px icon, no padding | 14×14 | FAIL. The textarea starts 4 px below (`space-y-1`), so a 24 px circle centred on the button overlaps it and the spacing exception does not apply |
| Summary/Scholar buttons (`PramaanCard.tsx:115-138`): `py-1` + 16 px line | ≈ 24 tall | PASS (at the minimum) |
| Search clear (`SearchBar.tsx:30-37`): full input height × (16 + 14 px) | ≈ 46×30 | PASS |
| "Reset filter" (`PramaanVaultView.tsx:55-61`): 12 px text | ≈ 16 tall | PASS by spacing (nearest target 8 px away) |
| Detach (`ComposeSutra.tsx:385-392`): `p-1` + 16 px | 24×24 | PASS (at the minimum) |
| Mobile nav links (measured), handle input (computed) | 24 tall | PASS (at the minimum) |
| "Return to Sutra Town Square" (measured 173×16) | 16 tall | PASS by spacing (no adjacent target) |

**Fix:** remove-card button at least `p-1.5` with a 20 px icon (32 px target). For the elder audience, primary actions (search, the view switch, the attach/publish buttons and nav) should be at least 44 px tall, which matches common platform guidance. Audit 07 sets the component sizes.

### U-18 — Post rendering details (LOW)

**Evidence**
- Card text is rendered as `{textContent}` in a `div` without `whitespace-pre-line` (`SutraPostCard.tsx:77-82`), so line breaks typed in the composer collapse into one paragraph.
- Dates use `toLocaleDateString("en-US", …)` (`:61-65`), e.g. "Oct 7, 2026". Indian readers expect day-month order.

**Fix:** add `whitespace-pre-line break-words` to the card body. Format dates with `en-IN` (or the UI locale once U-03 exists), e.g. "7 Oct 2026", inside a `<time dateTime>` element.

### U-19 — Jargon and internal identifiers (LOW)

Outside the Audit 05 copy review and C-14 (which already handle "Verified", "Truth", "Module", "Rule engine" and table names), these strings make the product harder for both audiences:

| Location | Text | Problem | Suggested direction (owner writes final copy) |
|----------|------|---------|-----------------------------------------------|
| `Navbar.tsx:15-16`, page `h1`s | "Pramaan", "Sutra" with no gloss | Sanskrit brand names mean nothing to a first-time visitor, and nothing in English to non-Hindi speakers | Keep as names, with a plain subtitle wherever they are introduced ("Pramaan: source records"; "Sutra: discussion") (Open question 8) |
| `PramaanCard.tsx:57`, `ComposeSutra.tsx:376,491`, `SutraPostCard.tsx:112` | `#33-koti-devatas` | A database slug shown as content | Hide slugs; show the title |
| `PramaanCard.tsx:111` | "Analysis View" | Unclear | Remove the label; a two-option switch needs none |
| `PramaanCard.tsx:125,137` | "Summary Mode" / "Scholar Mode" | "Mode" is UI jargon; "Scholar" is renamed "Sources" by Audit 05 | "Summary" / "Sources" |
| `sutra/page.tsx:83,85` | "Town Square Composer", "Primary Input Area" | Developer labels | Remove; the composer heading is enough |
| `ComposeSutra.tsx:279,282,288,325,360,421` | "Draft Sutra Thread", "sequential cards", "Handle:", "Card 1 of 4", "Add Card (1/4)", "Publish Thread" | "Thread"/"card" model is not explained; "Draft" collides with the vault status `draft` | One sentence explaining that a post has up to 4 short parts; "Part 1" / "Add a part" / "Post"; never "Draft" for posts |
| `ComposeSutra.tsx:342-343` | "Express your core principle or sutra premise…" | Abstract | A concrete example prompt |
| `ComposeSutra.tsx:257` | "You must be authenticated to publish…" | "Authenticated" is technical | "Sign in to post." |
| `pramaan/page.tsx:84`, `sutra/page.tsx:95` | "Database Notice" | Technical framing for a reader | "We couldn't load records right now" + "Try again" (with S-09/C-08) |
| `PramaanVaultView.tsx:73` | "No etymology records match your query" | Most records are not etymology | "No records match "…"" |
| `login/page.tsx:36,60` | "Signed in successfully! Redirecting..." | Fine, but exclamation-heavy tone throughout (`:66`, `ComposeSutra.tsx:233`) | Calm, short confirmations |
| `ScriptToggle.tsx:13-14` | "transliteration", "Indic (Devanagari)" | Inaccurate (U-03) | Per U-03 |

Tone overall: the interface reads like an engineering dashboard ("module", "route", "engine", "vault", "primary input"), not like a reference work for a 16-year-old or a grandparent.

### U-20 — Sign-out and account display (LOW)

**Evidence**
- `handleSignOut` awaits `signOut()`, ignores its error, and calls `router.refresh()` (`AuthButtonClient.tsx:12-15`). The user stays on the page with no message. On `/sutra` the composer switches to the signed-out prompt through `onAuthStateChange` (`ComposeSutra.tsx:64-71`).
- The header shows the full email address (`AuthButtonClient.tsx:19,29`). On a shared family phone, which is common for the elder audience (**UNVERIFIED** as a usage claim), this exposes it to anyone holding the phone. S-13 already narrows the prop to `{ email }` or `{ handle }`.

**Fix:** show the handle, not the email (choose the S-13 `handle` option). After sign-out, show a short "Signed out" status (U-09) and keep the user on public pages. Handle the error per C-08.

### U-21 — Composer feedback (LOW)

**Evidence**
- S-03 already adds `maxLength={500}`. There is no counter (`ComposeSutra.tsx:337-347`), so users meet the limit only when typing stops working, with no explanation.
- The success banner "Sutra thread published successfully!" (`:233`) stays until the next submit, even after the user starts a new post.
- The composer and picker structure is otherwise covered by C-04, C-05, C-19 and S-03.

**Fix:** next to the S-03 `maxLength`, a live counter ("320 / 500") that becomes a polite announcement near the limit. Clear the success banner on the next edit, or show it as a status toast (U-09). Do this in fix step 5.

### U-22 — Motion (INFO)

**Evidence**
- `prefers-reduced-motion` appears 0 times in the compiled CSS.
- Moving elements:
  - the infinite `animate-pulse` dot (`layout.tsx:30`, removed per C-14). Until then it is also a 2.2.2 issue, because it starts automatically, lasts more than 5 s, and has no pause control;
  - the ThemeToggle placeholder pulse (removed in step 2);
  - the publishing spinner;
  - a 4 px arrow nudge on hover (`page.tsx:46,71`).
- 2.3.3 is AAA. Nothing here is a vestibular risk.

**Fix:** use `motion-safe:` for the decorative transitions when the home page is rebuilt. Nothing else is needed.

### U-23 — Theme toggle (INFO)

Removed in fix step 2 (Audit 04 Decision OQ 1), so it is not assessed further. The contrast table above covers both OS-driven themes.

---

## WCAG 2.2 AA checklist

Level A and AA success criteria relevant to this app. N/A rows are omitted except where useful.

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 1.1.1 Non-text Content | PARTIAL | Lucide icons render with `aria-hidden="true"` (rendered HTML). The modal close button is icon-only with no name (C-19). The avatar `alt="User Avatar"` goes away with S-12 |
| 1.3.1 Info and Relationships | FAIL | Login labels not associated (C-19); card textareas unlabelled (U-10); toggles without grouping or state (U-09); heading gaps and headingless posts (U-16) |
| 1.3.2 Meaningful Sequence | PASS | DOM order matches visual order on all rendered pages |
| 1.3.4 Orientation | PASS | No orientation lock |
| 1.3.5 Identify Input Purpose | FAIL | No `autocomplete` on email or password (U-10) |
| 1.4.1 Use of Color | PARTIAL | Card sections have text labels as well as colour (PASS). Active nav item (U-11) and script-toggle state (U-09) are shown by colour and background only |
| 1.4.3 Contrast (Minimum) | FAIL | zinc-400 on white 2.63; emerald-600 on white 3.67; dark zinc-500 on card 3.73; placeholders 3.08 (U-08) |
| 1.4.4 Resize Text | UNVERIFIED | Sizes in `rem`; 200 % zoom not tested. The 121 px sticky header (U-07) will take a large share of the screen at 200 % |
| 1.4.5 Images of Text | PASS | None |
| 1.4.10 Reflow | FAIL | 333 px content width in a 320 px viewport (U-07) |
| 1.4.11 Non-text Contrast | FAIL | Input borders 1.27 (light) and 1.19 (dark); emerald focus border 2.46; toggle focus rings 2.52 and 2.29 (U-08) |
| 1.4.12 Text Spacing | UNVERIFIED | `truncate` on chips and the email (`ComposeSutra.tsx:372,379`; `SutraPostCard.tsx:101,115`; `AuthButtonClient.tsx:29`) may clip text under user spacing overrides |
| 1.4.13 Content on Hover or Focus | PASS | Only a native `title` tooltip (`ScriptToggle.tsx:14`) |
| 2.1.1 Keyboard | PASS | All controls are native `button`, `a`, `input` and `textarea` |
| 2.1.2 No Keyboard Trap | PASS | The modal has no trap at all, the opposite problem (2.4.3) |
| 2.2.2 Pause, Stop, Hide | FAIL (scheduled) | Infinite pulse in the footer (`layout.tsx:30`); removed per C-14 |
| 2.3.1 Three Flashes | PASS | None |
| 2.4.1 Bypass Blocks | PASS | `header`/`main`/`footer` landmarks exist. A skip link is still advised, given the 121 px header and up to 7 header tab stops |
| 2.4.2 Page Titled | FAIL | Same `<title>` on every route (U-16) |
| 2.4.3 Focus Order | FAIL | Modal: focus not moved in or returned, and the background stays tabbable (C-19). Focus is lost when a card is removed (C-19) |
| 2.4.4 Link Purpose (In Context) | PARTIAL | "View Pramaan →" goes to the whole vault, not the record (U-02) |
| 2.4.5 Multiple Ways | PASS | Header nav, home cards and footer links; records are not separate pages yet (U-02) |
| 2.4.6 Headings and Labels | PARTIAL | "Analysis View", "Primary Input Area" and "Handle:" are unclear (U-19) |
| 2.4.7 Focus Visible | PASS | Links and buttons keep the browser outline (only `:-moz-focusring` is set in preflight; no global `outline: none`). Inputs replace the outline with a border colour change |
| 2.4.11 Focus Not Obscured (Minimum) | UNVERIFIED | 121 px sticky header with no `scroll-padding-top` (U-07) |
| 2.5.1 Pointer Gestures / 2.5.2 Pointer Cancellation | PASS | Click only |
| 2.5.3 Label in Name | PARTIAL | The visible "A / अ" is not in the name "Toggle script transliteration mode" (U-09) |
| 2.5.7 Dragging Movements | N/A | — |
| 2.5.8 Target Size (Minimum) | FAIL | Remove-card button 14×14, computed (U-17) |
| 3.1.1 Language of Page | PASS | `lang="en"` matches the English UI |
| 3.1.2 Language of Parts | FAIL | No `lang` on Devanagari or Tamil text (C-10; U-06 for the Tamil case) |
| 3.2.1 On Focus / 3.2.2 On Input | PASS | No context change on focus or input; search filters in place |
| 3.2.3 Consistent Navigation | PASS | Same header on every page |
| 3.2.4 Consistent Identification | PARTIAL | The same thing is called "Pramaan", "Truth Citation", "Verified Pramaan" and "Attached Citation". Audit 05 fixes most of these; U-15 the last |
| 3.2.6 Consistent Help | N/A | No help mechanism exists |
| 3.3.1 Error Identification | PARTIAL | Errors are shown as text, but not tied to fields or announced (U-09); some are raw (S-09) |
| 3.3.2 Labels or Instructions | FAIL | Placeholder-only fields (U-10); no password rules (U-14) |
| 3.3.3 Error Suggestion | PARTIAL | Raw server messages give no suggestion (S-09) |
| 3.3.7 Redundant Entry | PASS | Nothing is asked twice |
| 3.3.8 Accessible Authentication (Minimum) | PASS | Paste is allowed and there is no cognitive test; missing `autocomplete` degrades password managers (U-10) |
| 4.1.2 Name, Role, Value | FAIL | Toggle states not exposed (U-09); modal without dialog role (C-19); unnamed modal close button (C-19) |
| 4.1.3 Status Messages | FAIL | No live regions anywhere (U-09) |

---

## Proposed record-card presentation for draft and contested content

Built only from decided pieces:
- the Audit 05 badge wording;
- the "AI-drafted, not reviewed" provenance line;
- "Common claim" rendered only when filled and sourced (empty for all 5 records in `0005`);
- "What the sources say" in a neutral colour;
- no green check or red alert unless `reviewed`;
- "Sources" for the scholar view.

This section describes; it does not build.

### Principles

1. **Status before content, never hidden.** The status is the first line of the card, in text, not just colour or an icon. A reader who reads only one line still learns that the record is unreviewed.
2. **One neutral palette for unreviewed content.** `draft` and `contested` use the same neutral surface (zinc border, white or zinc-900 card). The badge is distinguished by an outlined pill and its words. Green and check icons are reserved for `reviewed` (Audit 05 decision 6). Red is not used for content.
3. **The 30-second path is the top of the card:**
   - status line;
   - title;
   - original-language term;
   - three bullets in 18 px.

   That is about 60-80 words. At the 200-250 words per minute often cited for adult silent reading (an estimate, not measured on this audience), it takes 20-25 seconds. Everything else is one tap away.
4. **A caveat that changes the reading is never collapsed.** If `source_summary` corrects something the title or bullets could suggest, that sentence is shown above the bullets, not inside a closed section. Record 1 is the case: its title pairs "33 koṭi" with "the Upaniṣadic count", and only `source_summary` says "The word *koṭi* does not appear in this passage." Either keep the first sentence(s) of `source_summary` visible, or adopt an editorial rule (Editorial policy addition) that such a caveat must also appear as a bullet. The mock-up below shows the first option.
5. **Disagreement is stated in the main text, not only in the badge.** For `contested` records the corrected drafts already put the disagreement in a bullet: record 1's bullet 3 ("scholars disagree on which applies") and record 4's bullet 3 ("Dating … debated"). The card shows that bullet with a "Scholars disagree" label, so the badge's claim is backed by visible content.
6. **Details collapse, they don't disappear.** "What the sources say" (`source_summary`) and "Sources" (citation, excerpt with transliteration and gloss) sit in `<details>` elements, closed by default on phones and open on record pages at wide widths. Native `<details>` works before hydration (U-12) and is keyboard- and screen-reader-accessible without extra code.

### Layout at 360 px (draft)

```
┌──────────────────────────────────────┐
│ ◌ Draft: not yet reviewed by a       │  ← badge: outlined pill, 14 px,
│   subject expert                     │    zinc-700 text on white (≥ 9:1)
│ AI-drafted, not reviewed             │  ← provenance, 14 px zinc-600
│                                      │
│ Śūnya (Zero)                         │  ← title, 24-28 px, English always
│ शून्य  · śūnya                        │  ← lang="sa" + lang="sa-Latn", 18 px
│                                      │
│ 1  Zero (śūnya) as a number with     │  ← bullets, 18 px, leading 1.6
│    stated rules: Brahmagupta,        │
│    BSS 18.30-35 (628 CE).            │
│ 2  The Bakhshālī MS writes zero as   │
│    a dot; its folios carbon-date to  │
│    different centuries …             │
│ 3  Fibonacci's Liber abaci (1202) …  │
│                                      │
│ ▸ What the sources say               │  ← <details>, neutral
│ ▸ Sources (2)                        │  ← <details>: citation list,
│                                      │    excerpt + transliteration + gloss
│ Report an error                      │  ← Editorial policy §6
└──────────────────────────────────────┘
```

### Layout at 360 px (contested)

```
┌──────────────────────────────────────┐
│ ◇ Contested: scholars disagree;      │  ← same neutral pill, different
│   see readings                       │    icon shape + words (not colour)
│ AI-drafted, not reviewed             │
│                                      │
│ 33 devas — "33 koṭi" and the         │
│ Upaniṣadic count                     │
│ त्रयस्त्रिंशत्त्वेव देवाः                    │  ← lang="sa"
│ trayastriṃśattveva devāḥ             │  ← lang="sa-Latn" (reviewer confirms)
│                                      │
│ The word koṭi does not appear in the │  ← caveat from source_summary,
│ cited Upaniṣad passage.              │    always visible (principle 4)
│                                      │
│ 1  The Upaniṣad counts 33 gods and   │
│    treats bigger numbers as their    │
│    powers (BAU 3.9.2).               │
│ 2  Its 33 are 8 Vasus, 11 Rudras,    │
│    12 Ādityas, Indra and Prajāpati … │
│ ┌ Scholars disagree ───────────────┐ │  ← the bullet that carries the
│ │ 3  Dictionaries record koṭi as   │ │    disagreement, boxed with a
│ │    "ten million" and as "highest │ │    neutral border and label;
│ │    point"; scholars disagree on  │ │    target of "see readings"
│ │    which applies in "33 koṭi".   │ │    (id="readings")
│ └──────────────────────────────────┘ │
│                                      │
│ ▸ Common claim                       │  ← only if filled AND sourced;
│                                      │    absent at launch (all empty)
│ ▸ What the sources say               │
│ ▸ Sources (6)                        │
│ Report an error                      │
└──────────────────────────────────────┘
```

### Details

- **Badge markup:** an element with role `note` (or a plain `<p>`) containing the full badge text. Do not use a `title` tooltip or an icon alone. The icon is `aria-hidden`; the text carries the meaning (1.4.1).
- **"see readings"** in the contested badge should be a same-page link to the disagreement block (`#readings`). The interim schema has no readings structure (Audit 05 requirement 4 is deferred), so which bullet is "the disagreement" needs a marker:
  - a `contested_bullet_index`,
  - a convention such as "the last bullet",
  - or a change to the badge wording at launch.

  This is Open question 4. Do not leave "see readings" pointing at nothing.
- **Provenance:** one fixed line, "AI-drafted, not reviewed", either from the provenance column or as a constant, whichever step 3 decides (Audit 05 impact table). It sits directly under the badge so the two read as one statement. For `draft` it partly repeats the badge; keep both, because the badge is about review and the provenance is about authorship, and they diverge once a human edits or reviews a record.
- **Compact variants** (picker rows, feed chip, `/pramaan` list):
  - status word in a small pill ("Draft" or "Contested", full badge text in the visually hidden part);
  - title;
  - source.

  No slug. Same neutral palette.
- **Summary vs Sources:** the two-button switch is replaced by the collapsible sections, which removes a control and the U-09 state problem. If the owner wants to keep a switch, use the U-09 fix.
- **Changes since attached** (Audit 05 requirement 8) is deferred; leave space for a one-line notice on the feed chip later.
- **Reviewed (future):** the same layout, with "Reviewed by [name], [date]" in the badge and, only then, a check icon and a green accent (Audit 05 decision 6). Do not build it until requirement 7 exists (Audit 05 impact, step 6).

---

## Open questions for the owner

1. **Home page job.** Should `/` become the search-first entry to the vault (recommended, U-01), or stay a two-way chooser between Pramaan and Sutra with better copy?
2. **Record pages and slugs.** Add `/pramaan/[slug]` before launch (recommended, U-02)? If yes, keep `33-koti-devatas` as record 1's permanent slug, or change it now to match the corrected title before any link is shared?
3. **Language at launch.** Is the honest launch statement "English interface and records, with original-language terms" (recommended; U-03), or must Hindi UI and Hindi summaries ship at launch? Hindi content would need its own reviewer, because translations carry their own review status (Audit 05 requirement 11). Should the global script toggle be removed in favour of always showing the original term under the title?
4. **Contested badge and readings.** The decided badge says "see readings", but the interim schema cannot hold readings. Pick one:
   - (a) mark one bullet per contested record as the disagreement and link to it (recommended; needs a field or a convention at step 3);
   - (b) change the badge wording at launch;
   - (c) add a minimal readings field at step 3.
5. **Elders at launch.** Is the elder audience in scope for the invite-only launch? If yes, adopt the 18 px reading size, 44 px targets and a "Larger text" preference now (U-05, U-17). If no, keep the 16 px minimum and plan the elder mode with the audio phase.
6. **Fonts.** Self-host Noto Devanagari and Tamil through `next/font` (recommended, U-13), accepting the payload cost that Audit 08 will size, or rely on system fonts and document the risk?
7. **Search depth before launch.** Is client-side diacritic folding plus a per-record alias list enough for 5 records (recommended, U-04)? Or should transliteration-aware server search be pulled into launch scope?
8. **Section names.** Keep "Pramaan" and "Sutra" as brand names with a plain-language subtitle wherever they appear (recommended), or rename the sections in English?
9. **Script-mode cookie.** If question 3 removes the global toggle, Audit 04's step 8 cookie work for script mode can be dropped. Confirm?

---

## Decisions (owner, 2026-10-07)

These decisions override the proposals, recommendations and open questions above where they conflict. Nothing above this section has been edited.

### Open question answers

1. **Home page:** search-first entry to the vault, with 3-5 record previews, and Sutra second (U-01).
2. **Record pages:** `/pramaan/[slug]` is added before launch (U-02). Record 1's slug changes now, before any link is shared, to `33-devas`. Slugs are permanent from launch.
3. **Language at launch:** English interface and records. The original-language term is always shown under the English title, with `lang` attributes. The global script toggle is removed. Hindi UI and content come later, with their own reviewer.
4. **Contested badge:** option (a). A `contested_bullet_index` column (nullable `smallint`) is added at fix step 3. For contested records, "see readings" links to that bullet.
5. **Elders:** not a launch audience. The readability floor is adopted anyway:
   - 18 px for record body and bullets;
   - 16 px minimum for any reading text;
   - nothing below 12 px;
   - 44 px minimum height for primary targets.

   The "Larger text" preference and audio wait for the elder phase.
6. **Fonts:** self-host Noto Sans Devanagari and Noto Sans Tamil, plus a Latin family with full IAST coverage, via `next/font`. Audit 08 sizes the payload.
7. **Search:** for launch, client-side diacritic folding, Unicode normalisation and a per-record alias list. Server-side, transliteration-aware search is Phase 2.
8. **Section names:** keep "Pramaan" and "Sutra", with a plain-language subtitle wherever they are introduced.
9. **Script-mode cookie:** dropped, since the global toggle is removed. The Audit 04 step 8 cookie work is removed.

### Additional decisions

- **A. Audience gap:** the gap between the original audience vision (elders, voice-first, native languages) and the built product (English, text-only feed) is recorded as a primary question for Audit 10.

### Impact on the fix phase

Changes to the fix-phase order as already revised by the Audit 04 and Audit 05 Decisions. Steps still run strictly one at a time, in order (Audit 04 Decision B). Audit 10 may still revise steps 5, 6 and 10 (Audit 04 Decision C).

| Step | Change | Decision |
|------|--------|----------|
| Step 1 | The `CLAUDE.md` written here carries the Audit 06 rules (see the table below) | OQ 2, 3, 5, 6 |
| Step 2 | No change. The theme toggle is still removed here. The script toggle is **not** removed in step 2: it is a behaviour change and goes with the record card in step 6 | OQ 3 |
| Step 3 | Add `pramaan_vault.contested_bullet_index smallint NULL`. It must be NULL unless `status = 'contested'`, and, when set, must point at an existing element of that record's `summary_bullets` (CHECK or trigger, with pgTAP tests). The index base (0 or 1) is fixed here and recorded in `CLAUDE.md` | OQ 4 |
| Step 3 | `supabase/seed.sql` uses slug `33-devas` for record 1 (UUID `11111111-…` unchanged) and sets `contested_bullet_index` for records 1 and 4 to their bullet 3, which carries the disagreement in the Audit 05 corrected drafts | OQ 2, OQ 4 |
| Step 3 | The original-language term needs a language for its `lang` attribute (record 4 is Tamil, the others Sanskrit). The interim schema has no such field. Owner choice at step 3: add a column (e.g. `original_script_lang text`, BCP 47, set by `0005` and `seed.sql`), or derive it from the script in the data layer. A column is the closer fit to Audit 05 requirement 6 | OQ 3 |
| Step 3 | Storage for the per-record search aliases: a column (`aliases text[]`), or a constant in the step 4 data layer. Owner choice at step 3, as for the language field. Aliases are search data, never displayed | OQ 7 |
| Step 4 | The vault mapper and types include `contested_bullet_index`, the term's language and, if stored, the aliases. The feed query also selects each attached record's English title, `status` and slug (U-15) | OQ 2, 3, 4, 7 |
| Step 4 | Search: one search string per record from all English fields plus bullets and aliases; `normalize("NFD")`, strip combining marks, lower-case, collapse hyphens and spaces. Vitest cases cover every query in the U-04 table, and "33 koti", "puram", "shoonya", "33 crore" and "हिन्दू" must find their records | OQ 7 |
| Step 4 | Page-level reads turn off postgrest retries (`.retry(false)` or client `db: { retry: false }`) and use a short `AbortSignal` timeout, so a dead or paused backend fails fast instead of waiting about 7 s (U-12) | — |
| Step 4 | `Notice` uses `role="alert"` for errors and `role="status"` for success and progress, in an always-present container (U-09). `StatusBadge` renders its full text, with the icon `aria-hidden` | — |
| Step 5 | Composer: labelled textareas and picker search (U-10); a counter beside the S-03 `maxLength` and a success message that clears on the next edit (U-21); remove-card target at least 32 px (U-17); primary buttons 44 px tall; picker results and the attached box show title and status, not the slug | OQ 5 |
| Step 6 | Add `/pramaan/[slug]` (server-rendered, `generateMetadata` with awaited `params`). `/pramaan` becomes a list of compact previews linking to it. The search term lives in `?q=`. The feed chip and picker link to record pages (U-02, U-15) | OQ 2, OQ 7 |
| Step 6 | Rebuild `/` as search-first: purpose line (owner copy), search box submitting to `/pramaan?q=`, 3-5 record previews, then Sutra (U-01) | OQ 1 |
| Step 6 | Record card per the proposal above: status badge, provenance line, English title, original-language term under it with `lang` (and transliteration where the data has one), caveat sentence from `source_summary` kept visible where it changes the reading, bullets, and the `contested_bullet_index` bullet boxed as "Scholars disagree" with `id` as the target of "see readings". "What the sources say" and "Sources" in `<details>`. The Summary/Scholar switch is removed | OQ 3, OQ 4 |
| Step 6 | Remove `ScriptToggle.tsx` and `ScriptContext.tsx`, the `ScriptProvider` in the root layout, and every `scriptMode` branch. This also lets `SutraPostCard` become a server component (C-18). C-10 closes here: no mode to persist, and `lang` attributes are added | OQ 3, OQ 9 |
| Step 6 | Typography floor: 18 px record body and bullets, 16 px minimum reading text, nothing below 12 px (remove `text-[10px]`/`text-[11px]`), sentence-case labels instead of uppercase micro-labels, 44 px primary targets (U-05, U-17) | OQ 5 |
| Step 6 | Fonts: `next/font/google` for the Latin family, Noto Sans Devanagari and Noto Sans Tamil, exposed as CSS variables and composed into `--font-sans`; delete the `body { font-family: Arial… }` rule and the undefined Geist variables. No `tracking-*` and no unsupported weights on Indic text; `leading-normal` or more (U-13). Self-hosting adds no third-party origin to the S-05 CSP | OQ 6 |
| Step 6 | Accessibility fixes from U-07, U-08, U-11, U-16 and U-18: header reflow at 320 px and `scroll-padding-top`; the contrast replacements in U-08 and one visible focus style; a `nav` landmark on mobile with `aria-current`; per-route `<title>`s and heading fixes; `whitespace-pre-line` and `en-IN` dates in posts. `loading.tsx` for `/pramaan` and `/sutra` was already in this step (C-08) | OQ 5 |
| Step 6 | Section names stay "Pramaan" and "Sutra", with a plain-language subtitle wherever introduced. The subtitle wording is owner copy (Audit 04 OQ 6) | OQ 8 |
| Step 7 | Login per U-14: sign-in only at launch, plus an invite path; `?next=` through `safeRedirect`; `autocomplete` and `name` on the fields (U-10); submit disabled until hydrated (U-12). Header shows the handle, not the email, and sign-out shows a status message (U-20) | — |
| Step 8 | Remove the script-mode cookie work added by Audit 04 Decision OQ 4. The step now closes S-05 only (C-10 closed in step 6) | OQ 9 |
| Step 9 | The manual launch checklist adds: layout at 320 and 360 px signed in and out; a throttled "Slow 4G" run plus one low-cost Android phone and one in-app browser; Devanagari, Tamil and IAST rendering; keyboard-only and screen-reader passes over search, a record page and the composer; the U-04 search queries | OQ 5, 6, 7 |
| Step 10 | `0005` uses slug `33-devas` for record 1 and sets `contested_bullet_index` for records 1 and 4 (and the term-language field, if step 3 adds one). Slugs are permanent from launch: any later change needs a redirect | OQ 2, OQ 4 |
| Audit 10 | Decision A is a primary question for Audit 10, alongside reviewer recruitment and launch topics (Audit 05 OQ 7, OQ 9) | A |

**CLAUDE.md draft**

| Section | Change | Decision |
|---------|--------|----------|
| "Where decisions live" | Add Audit 06 (`U-` IDs) | — |
| "Code conventions" | Remove the Audit 04 rule "Script mode (`roman`/`indic`) is persisted in a cookie…". Replace it with: "There is no script toggle. The original-language term is always shown under the English title, with a `lang` attribute (`sa`, `ta`, …). Never replace the English title with it" | OQ 3, OQ 9 |
| "Code conventions" | Add the typography floor: record body and bullets 18 px, reading text 16 px minimum, nothing below 12 px, primary targets 44 px tall. No letter-spacing and no synthetic bold on Indic text. Fonts come only from `next/font`; no other font loading | OQ 5, OQ 6 |
| "Code conventions" | Add: every status or error message goes through `Notice` (live region); every control's state is exposed (`aria-pressed`, `aria-current`, `aria-checked`) | — |
| "Never" | Add: never change a published record slug without a redirect; record 1's slug is `33-devas` | OQ 2 |
| "Target schema" | Add `pramaan_vault.contested_bullet_index` (nullable `smallint`, set only for `contested` records, index base as fixed at step 3), and the term-language and alias fields if step 3 adds them | OQ 3, 4, 7 |
| "Supabase conventions" | Add: page-level reads disable retries and set a timeout | — |
