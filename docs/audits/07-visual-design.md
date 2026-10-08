# Audit 07 — Visual Design System

- **Date:** 2026-10-07
- **Scope:** Every colour, type, spacing, radius, shadow, border and icon decision in `src/` on branch `phase2-auth` (HEAD `b1d00e9`): the inventory, its semantic meaning, light and dark mode, the de facto components, brand presentation and cultural neutrality. It also proposes a token set, a type scale, a minimal component set and a Tailwind v4 migration path that meet the Audit 05 and Audit 06 Decisions.
- **Mode:** Read-only for the repo. The only file created is this document. The working tree was clean at the start of the session (session git snapshot), and `git status --porcelain` after the dev server ran showed only this document. Commands run:
  - A Python script (scratch directory, outside the repo) that tokenises every `className` string and template literal in `src/**/*.tsx` and counts each Tailwind class. Responsive, state and `dark:` variants are counted as separate classes. A class inside a `.map()` counts once, so counts are source occurrences, not rendered instances. Audit 06 U-05 merged responsive variants into the base size (`text-sm` 22 + `sm:text-sm` 5 = 27; `text-base` 8 + `sm:text-base` 3 = 11). This audit lists them separately, so the numbers differ only in method.
  - A second script that converts the Tailwind 4.3.3 `oklch` palette in `node_modules/tailwindcss/theme.css` to sRGB and computes WCAG 2.2 contrast ratios. It reproduces Audit 06's values (zinc-400 `#9f9fa9`, emerald-600 `#009966`).
  - `next dev` on a spare port, with `NEXT_PUBLIC_SUPABASE_URL` pointed at an unreachable loopback address and a dummy anon key, as in Audit 06. Headless Chromium came from the existing Playwright cache in the user's home directory; nothing was installed. It took screenshots of `/login` and `/pramaan` at 360 px in light and dark (`--blink-settings=preferredColorScheme=0`), and PIL sampled the page background pixels.
  - `fc-list` to check which locally installed fonts cover the IAST letters. `pdftotext` and `pdftoppm` on the Idea Thread PDF.
  - Read-only `grep`, `sed` and `node -e` over the repo and `node_modules`: the Tailwind theme and dark variant, the `next/font` Google font data and docs (`node_modules/next/dist/docs/01-app/03-api-reference/02-components/font.md`), and `lucide-react` exports.
- **Prior audits:** Audits 01-06 in `docs/audits/`. Their Decisions sections override the proposals above them. Findings already covered there are referenced, not repeated. In particular: U-05 (sizes), U-08 (contrast failures), U-13 (fonts and Indic typography), U-17 (targets), U-22 (motion), U-23 and F-07/C-09 (theme toggle, removed in step 2), C-11 (duplicated markup), C-14 (scaffold copy), K-11 and the Audit 05 copy review (verification wording and the `ShieldCheck`/`CheckCircle2` rows).
- **Floors this system must meet** (Audit 06 Decisions OQ 5 and OQ 6, Audit 05 Decision OQ 6):
  - 18 px record body and bullets, 16 px minimum reading text, nothing below 12 px, 44 px primary targets;
  - self-hosted Noto Sans Devanagari and Noto Sans Tamil plus a Latin family with full IAST coverage, through `next/font`;
  - no letter-spacing or synthetic bold on Indic text;
  - the U-08 contrast replacements and one visible focus style;
  - a neutral palette for unreviewed content, with no green check or red alert unless status is `reviewed`;
  - status badges told apart by words and shape, not colour.
- **Judgement calls.** Section 7 of the brief (cultural neutrality) is partly a matter of judgement, and no network was used, so no source on Indian colour or symbol associations was retrieved. Those passages are labelled **Judgement call** and rest on reasoning, not evidence (the Audit 05 rule).
- **This document is public** (the repo is public). It contains repo-relative paths only.

---

## Summary

1. There is no design system. 180 distinct colour classes (666 uses), 17 font-size classes, 69 spacing values, 6 radii and 5 shadows are chosen per element. Meaning lives only in class strings, so it drifts (V-01, V-06, V-09, V-10).
2. Colour meaning conflicts with the Audit 05 rules. Emerald means "Pramaan section", "verified", "success", "focus", "link" and "live" at once. Five `ShieldCheck` placements and the `CheckCircle2` success icon make authority claims that the copy review did not list. Saffron-range amber is the colour of original-script text and citations, and also of warnings (V-02, V-03, V-05).
3. The page background and text colour come from unlayered `globals.css` variables (`#ffffff`/`#0a0a0a` measured), not from the `body` classes. Audit 01 F-13 has this backwards, and fix step 2's "delete dead code" would change the page colour (V-04).
4. The brand reads as a developer dashboard: "MS" monogram set with a `font-mono` class that falls back to Arial, the default Next.js favicon, `Cpu` icons and a "Module Routes Active" pulse. No form of the name in an Indian script appears in the UI (V-08).
5. A token set is proposed: warm neutral (stone) base, one ink-indigo accent for interaction only, neutral status and solid notices. All 44 text and non-text pairs are computed in both themes, with a type scale meeting the 18/16/12 px floor, eleven components and a step-by-step migration inside the existing fix steps.

---

## Inventory tables

All counts are source occurrences in `src/**/*.tsx`, by the method above.

### Colour

| Hue | Uses | `dark:` uses | Shades used | Alpha steps in use | Where it appears (roles) |
|-----|------|--------------|-------------|--------------------|--------------------------|
| zinc | 431 | 214 | all 11 (50-950) | all 10 below | Every surface, text, border; primary buttons (`zinc-900` fill); avatar and emblem squares |
| emerald | 95 | 44 | all 11 | /10, /30, /40, /50, /60, /70, /80, /90 | Pramaan identity (`page.tsx:28-44`, `pramaan/page.tsx:67`); "verified" section and chip (`PramaanCard.tsx:97-102`, `SutraPostCard.tsx:92-121`, `ComposeSutra.tsx:367-400`); success notices (`login/page.tsx:94`, `ComposeSutra.tsx:307`); focus border (`SearchBar.tsx:27`, `ComposeSutra.tsx:456`); text link "Reset filter" (`PramaanVaultView.tsx:58`); spinner (`ComposeSutra.tsx:464`); "live" pulse (`layout.tsx:29-30`); picker hover (`ComposeSutra.tsx:484,487`); filter icon (`PramaanVaultView.tsx:52`) |
| amber | 56 | 25 | 10 (no 100) | /5, /10, /20, /30, /40, /50, /60, /80, /90 | Warnings: "Database Notice" (`pramaan/page.tsx:81-90`, `sutra/page.tsx:92-101`); citation pill (`PramaanCard.tsx:62-66`); original-script title and excerpt (`PramaanCard.tsx:75,169`, `SutraPostCard.tsx:103`); scholar panel (`PramaanCard.tsx:161-174`); decorative `Sparkles` and `BookOpen` (`page.tsx:9`, `PramaanCard.tsx:146`, `ComposeSutra.tsx:495`); `Sun` (`ThemeToggle.tsx:48`) |
| indigo | 40 | 16 | 9 | /20, /50, /60 | Sutra identity (`page.tsx:53-69`, `sutra/page.tsx:66`); focus border and ring (`login/page.tsx:123,143`, `ComposeSutra.tsx:296,346`); script toggle (`ScriptToggle.tsx:17-23`); "Sign Up" and "Add card" icons (`login/page.tsx:165`, `ComposeSutra.tsx:359`); sign-in prompt (`ComposeSutra.tsx:249`) |
| rose | 21 | 10 | 9 | /30, /40, /50, /70 | Error notices (`login/page.tsx:93`, `ComposeSutra.tsx:306`); "Popular Misconception" callout (`PramaanCard.tsx:86-91`); delete hover (`ComposeSutra.tsx:331`) |
| white / black / transparent | 21 / 1 / 1 | 0 | — | `black/50` | Card and input fills; modal overlay (`ComposeSutra.tsx:430`); gradient wordmark (`Navbar.tsx:30`) |

- **Totals:** 180 distinct colour classes, 666 uses. By property: `text-` 318, `bg-` 187, `border-` 137, `ring-` 10, `placeholder-` 8, gradient stops 6.
- **Alpha:** 107 uses across 10 opacity steps (`/5` to `/90`). Their contrast depends on what they are stacked over (V-11).
- **Defined colour variables:** two, `--background` and `--foreground` (`globals.css:3-6,15-19`). They are mapped to `bg-background`/`text-foreground` in `@theme inline` (`globals.css:8-13`), and those utilities are used 0 times in `src/`.

### Type

| Class | Uses | px | Notes |
|-------|------|----|-------|
| `text-[10px]` | 2 | 10 | Picker slug chips (`ComposeSutra.tsx:375,490`). Below the 12 px floor |
| `text-[11px]` | 7 | 11 | Dates, slugs, toggle glyphs, footer pill. Below the floor |
| `text-xs` | 62 | 12 | Most common size: buttons, labels, notices, helper text |
| `text-sm` / `sm:text-sm` | 22 / 5 | 14 | Bullets, inputs, nav, post nodes on phones |
| `text-base` / `sm:text-base` | 8 / 3 | 16 | Page intros, empty-state titles |
| `text-lg` / `sm:text-lg` | 3 / 1 | 18 | Wordmark, composer title |
| `text-xl` | 2 | 20 | Home card titles |
| `text-2xl` | 2 | 24 | Login title, card title (roman) |
| `text-3xl` / `sm:text-3xl` | 4 / 1 | 30 | Page `h1`s, Indic title |
| `text-4xl` / `sm:text-4xl` | 1 / 4 | 36 | Home `h1`, page `h1`s at `sm` |
| `sm:text-5xl` / `lg:text-5xl` | 1 / 1 | 48 | Home `h1`, scholar excerpt |

| Weight | Uses | | Family | Uses | Resolves to |
|--------|------|-|--------|------|-------------|
| `font-normal` | 2 | | `font-sans` | 1 (`layout.tsx:19`) | Arial: overridden by the unlayered `body` rule (U-13) |
| `font-medium` | 26 | | `font-mono` | 21 | `var(--font-geist-mono)`, which is undefined, so the declaration is invalid at computed-value time and the element inherits Arial (U-13 mechanism) |
| `font-semibold` | 25 | | `font-serif` | 3 | Tailwind's serif stack, no Indic face (U-13) |
| `font-bold` | 23 | | | | |
| `font-extrabold` | 2 | | | | |

| Tracking / leading | Uses | Where |
|--------------------|------|-------|
| `tracking-wider` | 10 | All with `uppercase` at 12 px: micro-labels ("ANALYSIS VIEW", "MODULE 1"…) |
| `tracking-tight` | 6 | Headings, including the Indic title (`PramaanCard.tsx:73`) |
| `tracking-wide` | 1 | Indic excerpt (`PramaanCard.tsx:169`) |
| `leading-relaxed` | 9 | Body copy |
| `leading-snug` | 1 | Indic excerpt |
| `uppercase` | 12 | Micro-labels, category tag |

### Spacing and layout

| Group | Distinct | Uses | Most used | One-offs (1-2 uses) |
|-------|----------|------|-----------|---------------------|
| Padding, margin, gap, space | 69 | 283 | `gap-2` 31, `gap-1.5` 17, `mx-auto` 14, `px-4` 12, `space-y-3` 11, `px-3` 10 | 33 classes, e.g. `sm:p-7`, `pl-10`, `pr-3.5`, `space-y-10`, `space-y-5`, `pb-6`, `px-5`, `py-3`, `mt-0.5` |
| Half-steps (`*.5`) | 15 | 61 | `gap-1.5`, `py-1.5`, `py-0.5`, `py-2.5`, `px-2.5`, `p-3.5`, `px-3.5` | — |
| Card padding | 9 | — | `p-5 sm:p-7` (vault card), `p-5 sm:p-6` (post, composer), `p-6 sm:p-8` (login), `p-6` (home cards), `p-8` (empty states), `p-5` (modal), `p-4 sm:p-5` (card sections), `p-3.5` (post nodes), `p-3` (chips, notices) | — |
| Max widths | 8 | 31 | `max-w-2xl` 11 (feed, composer, home grid), `max-w-3xl` 6 (vault, card), `max-w-md` 6, `max-w-7xl` 3 (layout, header) | `max-w-xl` 2, `max-w-lg` 1, `max-w-[100px]` / `sm:max-w-[140px]` 1 each |

### Radius, shadow, border, motion

| Radius | Uses | | Shadow | Uses | | Border | Uses |
|--------|------|-|--------|------|-|--------|------|
| `rounded` (4 px) | 5 | | `shadow-xs` | 15 | | `border` (1 px) | 48 |
| `rounded-md` (6 px) | 5 | | `shadow-sm` | 5 | | `border-b` | 7 |
| `rounded-lg` (8 px) | 18 | | `shadow-md` | 1 (vault card) | | `border-t` | 5 |
| `rounded-xl` (12 px) | 25 | | `hover:shadow-md` | 2 | | `border-dashed` | 5 |
| `rounded-2xl` (16 px) | 11 | | `shadow-xl` | 1 (modal) | | | |
| `rounded-full` | 13 | | | | | | |

Motion: `transition-all` 20, `transition-colors` 18, `transition-transform` 4, `animate-pulse` 2, `animate-spin` 2, `backdrop-blur-md`/`-xs` 1 each.

### Icons (lucide-react 1.32.0)

33 distinct icons, imported by their legacy alias names in six cases (V-12). Sizes: `h-3` 3, `h-3.5` 18, `h-4` 29, `h-5` 6, `h-6` 4.

| Icon | Uses | Locations | What it signals today | Audit 05 rule |
|------|------|-----------|-----------------------|---------------|
| `ShieldCheck` | 8 | `page.tsx:32`; `pramaan/page.tsx:68`; `SutraPostCard.tsx:96`; `Navbar.tsx:15` (desktop and mobile nav); `ComposeSutra.tsx:250,369,400,434` | Pramaan section; "verified"; also the sign-in prompt | **Authority claim.** Rows for `page.tsx:32`, `pramaan/page.tsx:68`, `SutraPostCard.tsx:96` already in the copy review; the other five are new (V-03) |
| `CheckCircle2` | 3 | `PramaanCard.tsx:99`; `login/page.tsx:100`; `ComposeSutra.tsx:313` | "Verified Vedic Root"; success | **Authority claim** on the card (copy review row `PramaanCard.tsx:100`); the same glyph on success notices (V-03) |
| `Sparkles` | 2 | `page.tsx:9`; `PramaanCard.tsx:146` | Hero badge; "Key Takeaways" | Widely read as "AI" or "magic" (V-03) |
| `AlertCircle` | 3 | `PramaanCard.tsx:88`; `login/page.tsx:98`; `ComposeSutra.tsx:311` | "Popular Misconception"; error | Red alert on content: copy review row `PramaanCard.tsx:89` |
| `AlertTriangle` | 2 | `pramaan/page.tsx:83`; `sutra/page.tsx:94` | Database warning | — |
| `BookOpen` | 2 | `PramaanCard.tsx:63`; `ComposeSutra.tsx:495` | Citation | Neutral; candidate replacement for `ShieldCheck` |
| `Cpu` | 3 | `page.tsx:57`; `sutra/page.tsx:67`; `Navbar.tsx:16` | Sutra (social posts) | Wrong metaphor (V-12) |
| `Layers` | 1 | `Navbar.tsx:14` | Home | Wrong metaphor (V-12) |
| `Languages` | 1 | `ScriptToggle.tsx:17` | Script toggle | Removed with the toggle (step 6) |
| `GraduationCap`, `ListFilter` | 1 each | `PramaanCard.tsx:136,124` | Scholar/Summary switch | Removed with the switch (step 6) |
| `Quote` | 1 | `PramaanCard.tsx:163` | "Textual Evidence" | Keep only for real quotations (Audit 05) |
| `Tag` | 1 | `PramaanCard.tsx:53` | Category | Neutral |
| `Sun`, `Moon` | 1 each | `ThemeToggle.tsx:48,50` | Theme | Removed in step 2 |
| `ArrowRight` 4, `ArrowLeft` 1, `X` 3, `Search` 2, `SearchX` 1, `Filter` 1, `Inbox` 2, `Loader2` 2, `Plus` 1, `Trash2` 1, `Send` 1, `PenSquare` 1, `LogIn` 2, `LogOut` 1, `UserIcon` 2, `UserPlus` 1, `Mail` 1, `Lock` 1 | — | Various | Functional | Neutral |

No religious, regional or political symbol appears anywhere. `grep` for ॐ, 卐, 卍, ☪, ✝, ੴ, ☸ and 🕉 in `src/`, `public/` and `README.md`: 0 hits. `public/` holds only the create-next-app SVGs (`file`, `globe`, `next`, `vercel`, `window`), which Audit 01 F-13 already lists as dead.

---

## Findings table

| ID | Severity | Title | Evidence |
|----|----------|-------|----------|
| V-01 | HIGH | No token layer: 180 distinct colour classes (666 uses) and every size, space and radius chosen per element; meaning lives only in class strings | Inventory; `globals.css:1-26` (2 colour variables, both unused as utilities) |
| V-02 | HIGH | Emerald carries six meanings (Pramaan section, "verified", success, focus, link, live status), which conflicts with the Audit 05 rule that green means `reviewed` only | Colour inventory, emerald row; Audit 05 Decision OQ 6 |
| V-03 | HIGH | Authority icons beyond the copy-review rows: `ShieldCheck` in the nav, the sign-in prompt, the attach button, the attached box and the picker title; `CheckCircle2` shared by "verified" and success; `Sparkles` on AI-drafted bullets | Icon inventory; `Navbar.tsx:15`; `ComposeSutra.tsx:250,369,400,434`; `login/page.tsx:100` |
| V-04 | MEDIUM | Page background and text colour come from the unlayered `globals.css` rule, not the `body` classes; Audit 01 F-13 has this backwards, and fix step 2 would change the page colour | Pixel samples `#ffffff`/`#0a0a0a`; `globals.css:22-26`; `layout.tsx:19`; Audit 01 F-13 row `globals.css:3-26` |
| V-05 | MEDIUM | Saffron-range amber is the colour of original-script text and citations (including Tamil), and also of warnings | amber-500 `oklch(0.769 0.188 70.1)`, amber-600 hue 58.3 vs `#FF9933` hue 60.3; `PramaanCard.tsx:62-66,75,161-174`; `SutraPostCard.tsx:103`; `pramaan/page.tsx:81-90` |
| V-06 | MEDIUM | No type scale: 17 size classes including 2 arbitrary px values, 5 weights including extrabold, 10 uppercase tracked micro-labels, monospace used as decoration on 21 elements | Type inventory |
| V-07 | MEDIUM | De facto components drift and lack states: 13 button styles, 10 pill/chip styles, 5 input styles with 2 focus colours, no `focus-visible` style, no input error state, disabled shown only as `opacity-50` | Component inventory below |
| V-08 | MEDIUM | Brand presentation: "MS" monogram in a fallback face, default Next.js favicon, gradient wordmark, developer-dashboard tone; no form of the name in any Indian script in the UI, Devanagari only in the README | `Navbar.tsx:27-32`; `login/page.tsx:77-79`; `src/app/favicon.ico` (rendered: the Vercel triangle); `README.md:1`; `layout.tsx:29-31` |
| V-09 | MEDIUM | Spacing and layout: 69 spacing values (61 half-step uses), 9 card paddings, 8 max widths; reading measure differs between vault (768 px) and feed (672 px) | Spacing inventory |
| V-10 | LOW | Radius and elevation: 6 radii, 5 shadows, the vault card `shadow-md` vs the feed card `shadow-sm`; shadows carry no elevation in dark mode | Radius/shadow inventory; `PramaanCard.tsx:48`; `SutraPostCard.tsx:46` |
| V-11 | LOW | Dark mode: no `color-scheme` declared, so native scrollbars and autofill stay light; 107 alpha-tinted uses make dark contrast depend on stacking; 38 colour class strings have no `dark:` counterpart | `grep -rn color-scheme src` (only the media query); class scan below |
| V-12 | LOW | Icon system: 33 icons in 5 sizes, inconsistent metaphors (`Cpu` for posts, `Layers` for Home, `AlertCircle` for both error and content), six legacy alias names | Icon inventory; `lucide-react.d.ts` export list |
| V-13 | LOW | `transition-all` on 20 elements animates every property, including layout, on low-end phones | Motion inventory |
| V-14 | INFO | Tailwind v4 config: `@theme inline` maps two colour variables and two undefined font variables; the `dark:` variant is `prefers-color-scheme`, which already matches the OS-driven decision | `globals.css:8-13`; `tailwindcss/dist/lib.js` (`"dark",["@media (prefers-color-scheme: dark)"]`) |

---

## Detailed findings

### V-01 — No token layer (HIGH)

**Evidence**
- `globals.css` defines two colour variables (`--background`, `--foreground`) and two font variables, both undefined (`--font-geist-sans/mono`, F-13). The `bg-background`/`text-foreground` utilities they create are used 0 times.
- Everything else is a raw palette class: 180 distinct colour classes in 666 uses, across 5 hues, all 11 shades of zinc and emerald, and 10 alpha steps.
- The same role is spelled differently in different files. Examples:
  - Secondary text: `text-zinc-500`, `text-zinc-500 dark:text-zinc-400`, `text-zinc-500 dark:text-zinc-500` (`layout.tsx:25`), `text-zinc-600 dark:text-zinc-400`.
  - Card border in dark: `dark:border-zinc-800`, `dark:border-zinc-800/80`, `dark:border-zinc-800/60`, `dark:border-zinc-800/40`.
  - Card surface in dark: `dark:bg-zinc-900`, `/90`, `/70`, `/60`, `/40`.
- Because the meaning is not named, the U-08 fixes would have to be applied class by class, and they would drift again.

**Fix**
- Add the semantic token layer proposed below (raw values on `:root` and in the `prefers-color-scheme: dark` block, mapped through `@theme inline`).
- Migrate by role (surface, ink, line, accent, focus, notice, status), one file at a time, as each fix step touches the file (Migration plan).
- Ratchet the count of raw palette classes in CI until it reaches zero.

### V-02 — Emerald means six things (HIGH)

**Evidence** (emerald row of the colour inventory)

| Meaning | Where |
|---------|-------|
| Pramaan section identity | `page.tsx:28-44`; `pramaan/page.tsx:67` |
| "Verified" content | `PramaanCard.tsx:97-102`; `SutraPostCard.tsx:92-121`; `ComposeSutra.tsx:367-400,434` |
| Success | `login/page.tsx:94`; `ComposeSutra.tsx:307` |
| Focus | `SearchBar.tsx:27`; `ComposeSutra.tsx:456` (indigo elsewhere) |
| Link / action | `PramaanVaultView.tsx:58`; `page.tsx:44` |
| Live status | `layout.tsx:29-30` ("Module Routes Active") |

- Audit 05 Decision OQ 6 and the Audit 06 record-card principles reserve green, and check icons, for `reviewed` records. No record can be `reviewed` at launch (Audit 05 step 9 gate).
- If emerald keeps any of the other five meanings, a green focus ring around a search box, or a green "Published" message next to an attached record, tells a reader something about the record that is not true.
- The "verified" uses are already removed by the copy review (step 6). This finding is about the colour itself: unless green is retired from every other role, the rule cannot be read off the screen.

**Fix**
- Green has exactly one meaning: `status-reviewed`. Until a record is `reviewed`, no green appears anywhere in the UI.
- Focus uses the single `focus` token (indigo, U-08). Links use `accent`.
- Section identity is not colour-coded (see V-08 and Open question 7).
- Success notices use the `info` notice palette, not green (Open question 2).
- The footer pill goes with C-14.

### V-03 — Authority icons beyond the copy review (HIGH)

**Evidence**
- `ShieldCheck` (a check on a shield) appears at 8 sites. The Audit 05 copy review covers three of them (`page.tsx:32`, `pramaan/page.tsx:68`, `SutraPostCard.tsx:96`). Not listed there:
  - `Navbar.tsx:15`: the Pramaan nav item, rendered on every page in both the desktop and mobile nav;
  - `ComposeSutra.tsx:250`: the "sign in to post" prompt, where the icon has nothing to do with records;
  - `ComposeSutra.tsx:369`: the attached-record box;
  - `ComposeSutra.tsx:400`: the "Attach" button;
  - `ComposeSutra.tsx:434`: the picker modal title.
- `CheckCircle2` is used for "Verified Vedic Root" (`PramaanCard.tsx:99`, covered by the copy review) and for success notices (`login/page.tsx:100`, `ComposeSutra.tsx:313`). The same glyph means "this record is verified" in one place and "your action worked" in another.
- `Sparkles` sits on the hero badge (`page.tsx:9`) and on "Key Takeaways" (`PramaanCard.tsx:146`). Many products use sparkles to mark AI-generated content. Here it decorates bullets that are AI-drafted and unreviewed, without saying so. The Audit 05 copy review kept the label "Key Takeaways" but did not rule on the icon, and the Audit 06 card mock-up has no bullet heading at all.

**Fix**
- Replace `ShieldCheck` everywhere with a neutral source icon: `BookOpen` or `BookText` for Pramaan and records, `MessagesSquare` for Sutra (V-12), and `LogIn` for the sign-in prompt.
- Reserve `BadgeCheck` for the future `reviewed` badge only. Notices never use it.
- Success notices use `Check`, a plain mark not enclosed in a badge or shield, in the `info` palette. Audit 05's rule is about record content, so a success message is outside it. Keeping `Notice` and `StatusBadge` on different glyphs stops the two from being confused.
- Drop `Sparkles` from the card. Follow the Audit 06 mock-up, where provenance ("AI-drafted, not reviewed") is stated in words, not implied by an icon.

### V-04 — Page colours come from `globals.css`, not the body classes (MEDIUM)

**Evidence**
- `layout.tsx:19` puts `bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100` on `<body>`.
- `globals.css:22-26` sets `body { background: var(--background); color: var(--foreground); … }` outside any cascade layer. Tailwind v4 emits utilities inside `@layer utilities`, and unlayered rules beat layered ones whatever their specificity. This is the same mechanism that makes `<body>` Arial (U-13, measured).
- Measured: the page background in headless Chromium at 360 px is `#ffffff` in light mode and `#0a0a0a` in dark mode on both `/login` and `/pramaan`. zinc-50 would be `#fafafa` and zinc-950 `#09090b`. So the `body` colour classes have no effect, and text renders `#171717`/`#ededed`, not zinc-900/zinc-100 (derived by the same cascade, not sampled).
- Audit 01 F-13 lists "`globals.css:3-26` … Overridden by `body` classes in `layout.tsx:19`" as dead code. The direction is reversed: the classes are dead, and the variables are live.
- **Consequence for fix step 2** ("Delete dead code", "no feature change"): deleting the variables per F-13 would switch the page to zinc-50/zinc-950, a visible change in a step that promises none.
- **Consequence for U-08:** rows computed on zinc-50 sit on white in reality. The verdicts do not change: zinc-400 on white is 2.62, still FAIL. zinc-500 on white is 4.83, still PASS.

**Fix**
- In step 2, delete the dead `body` colour classes in `layout.tsx:19`, not the variables. That keeps the rendered page identical.
- Point the `body` `background`/`color` declarations at the new tokens in step 2. Move the `html`/`body` base rules into `@layer base` only in step 6, together with the font change, because moving the `font-family` rule earlier changes the rendered font (see the step 2 row of the Migration plan).
- Replace `--background`/`--foreground` with the `page`/`ink` tokens when the token layer lands (Migration plan, step 2).
- Note against F-13 in `CLAUDE.md` (step 1) that its `globals.css:3-26` row is reversed.

### V-05 — Saffron-range amber on scripts and citations (MEDIUM)

**Evidence (factual part)**
- Amber is used in two unrelated roles:
  - warnings: the "Database Notice" (`pramaan/page.tsx:81-90`, `sutra/page.tsx:92-101`);
  - the colour of original-language text and sources: the citation pill (`PramaanCard.tsx:62-66`), the Indic title class (`PramaanCard.tsx:75`; inert, U-13), the 30-48 px excerpt (`PramaanCard.tsx:169`), the scholar panel (`PramaanCard.tsx:161-174`), the feed chip in Indic mode (`SutraPostCard.tsx:103`), and `BookOpen` in the picker (`ComposeSutra.tsx:495`).
- So "original script" and "something is wrong" share a hue. Record 4's Tamil term would render in the same treatment as record 1's Sanskrit.
- Computed hues: amber-500 is `oklch(0.769 0.188 70.1)`, amber-600 is `oklch(0.666 0.179 58.3)`. `#FF9933` (a common sRGB rendering of the saffron in the national flag) is `oklch(0.774 0.163 60.3)`. amber-500 matches it in lightness and is 10° away in hue; amber-600 is 2° away. The icons and tints in question are perceptibly in the saffron family.

**Judgement call**
- In current Indian public life, saffron is strongly associated with Hindu religious practice and with Hindu-nationalist politics. Rendering scriptural Sanskrit in saffron-gold, inside a panel framed as "Textual Evidence", reads as a devotional or sectarian framing. Rendering Tamil the same way assimilates it to that framing. Both work against the brand intent: an identity that belongs to every community (Idea Thread PDF pp. 14-15 and 27-28).
- No colour is free of association in India:
  - green is linked with Islam and with several parties;
  - blue with the Ambedkarite movement;
  - red with the Left;
  - black and red with Dravidian parties.

  The defensible rule is therefore not "pick the neutral hue". It is "colour never encodes a script, a tradition, a region or a community".

**Fix**
- Original-language text uses `ink` (the same colour as the English text), set apart by size, script and the `lang` attribute, never by hue.
- Citations use `ink-secondary`.
- Amber is used only by the `warning` notice.
- Do not introduce saffron, or any party-flag pairing (saffron with green, black with red, the tricolour), as brand or accent colours.

### V-06 — No type scale (MEDIUM)

**Evidence**
- 17 font-size classes, including the arbitrary `text-[10px]` and `text-[11px]` (U-05 already covers the floor).
- Headings use five sizes for the same level: page `h1` is `text-3xl sm:text-4xl` in two pages, `text-2xl` on login and `text-4xl sm:text-5xl` on home. Card `h2` is `text-2xl sm:text-3xl` (vault), `text-xl` (home cards) or `text-lg` (composer).
- Weights: `font-extrabold` (800) on the home `h1` and the record title, which also renders Indic text (U-13: risk of synthetic bold).
- 10 `uppercase tracking-wider` labels at 12 px. Tracking and caps make short labels harder to read, and U-05 already replaces them with sentence case.
- `font-mono` on 21 elements: slugs, citations and locators (user-visible content that will hold IAST), "Module N" labels, the "MS" emblem, `<code>` in error text and the toggle glyphs. Mono here is decoration, not code. It sets a technical tone, and the configured mono variable is undefined (V-14).

**Fix**
- Adopt the type scale below. It has seven sizes, each with a Latin and an Indic line-height, and two weights (400, 600).
- Use mono only for code. Citations and locators use the sans face.
- Sentence-case labels at the `caption` size (14 px) or larger.

### V-07 — Component variants drift and lack states (MEDIUM)

C-11 covers the duplication itself. This finding is about the variants and missing states the fix-phase components must settle. Current de facto components:

| Component | Distinct styles | Examples | Missing states |
|-----------|-----------------|----------|----------------|
| Filled primary button | 5 | `px-3.5 py-1.5 text-xs rounded-lg` (`AuthButtonClient.tsx:48`); `px-4 py-2 text-xs rounded-xl` (`ComposeSutra.tsx:263`); `px-5 py-2.5 text-sm rounded-xl shadow-sm` (`ComposeSutra.tsx:411`); `px-4 py-2.5 text-xs rounded-xl` (`login/page.tsx:153`); `px-4 py-2 text-sm rounded-lg` (`pramaan/page.tsx:119`, `sutra/page.tsx:137`) | `focus-visible` (default browser ring only), loading label, `aria-disabled` |
| Outline / soft button | 5 | `AuthButtonClient.tsx:36`; `login/page.tsx:163`; `pramaan/page.tsx:126`; `ComposeSutra.tsx:398`; `PramaanVaultView.tsx:82` | Same |
| Dashed "add" button | 1 | `ComposeSutra.tsx:357` | Same |
| Text button / link | 2 | Emerald (`PramaanVaultView.tsx:58`); zinc (`login/page.tsx:175`) | Underline (the link colour is under 3:1 against the body text; see the contrast table) |
| Icon button | 5 | `SearchBar.tsx:34`; `ComposeSutra.tsx:331,389,442`; `ThemeToggle.tsx:45` | Target size (U-17), focus style |
| Pill / chip / tag | 10 | Hero pill (`page.tsx:8`); section pills (`pramaan/page.tsx:67`, `sutra/page.tsx:66`); footer pill (`layout.tsx:29`); category tag (`PramaanCard.tsx:52`); citation pill (`:62`); bullet number (`:152`); slug chips (`SutraPostCard.tsx:111`, `ComposeSutra.tsx:375,490`); email chip (`AuthButtonClient.tsx:23`) | No `StatusBadge` yet |
| Card | 9 paddings | Vault, post, composer, login, home link, empty, modal, inner section, post node | Interactive card has hover but no focus style (`page.tsx:28,53`) |
| Notice | 2 logics | Rose/emerald status banner (`login/page.tsx:91`, `ComposeSutra.tsx:304`); amber database notice (`pramaan/page.tsx:81`, `sutra/page.tsx:92`) | Live region (U-09), info variant |
| Empty state | 4 | `pramaan/page.tsx:97`; `sutra/page.tsx:108`; `PramaanVaultView.tsx:68`; `ComposeSutra.tsx:248` | — |
| Input / textarea | 5 | Search: `py-3 pl-10 text-sm`, emerald focus (`SearchBar.tsx:27`); login: `py-2.5 pl-9 text-sm`, indigo ring (`login/page.tsx:123,143`); textarea `p-3.5` (`ComposeSutra.tsx:346`); handle `px-2.5 py-1 text-xs` (`:296`); picker search `text-xs`, emerald (`:456`) | Error state (`aria-invalid` plus visible message), contrast of border (U-08), placeholder contrast (U-08) |
| Modal | 1 | `ComposeSutra.tsx:430-445` | Semantics (C-19) |
| Nav link | 2 | Desktop `text-sm`, mobile `text-xs` (`Navbar.tsx:43,73`) | `aria-current` (U-11) |
| Segmented control | 1 | `PramaanCard.tsx:114-139` | Removed in step 6 |

- Disabled is `disabled:opacity-50` in 3 places. Opacity applied to `zinc-900` buttons in dark mode (`dark:bg-zinc-100`) gives a mid-grey that reads like a hover state. Disabled controls are exempt from 1.4.3, but they still need to look unavailable.
- No component uses `focus-visible:`. Five inputs use `focus:outline-none` plus a border or 20 % ring (U-08 covers the contrast).

**Fix:** the component set below. Build each on tokens at the step where Audit 04 already places it.

### V-08 — Brand presentation (MEDIUM)

**Evidence**
- The emblem is a `zinc-900` square holding "MS" in `font-mono font-semibold` (`Navbar.tsx:27-29`, repeated at `login/page.tsx:77-79`). The mono variable is undefined, so it renders in Arial (V-06). A Latin-initials monogram says nothing about what the product is.
- The wordmark "MoolSutra" uses a zinc gradient with `bg-clip-text text-transparent` (`Navbar.tsx:30`). In forced-colours mode, whether the text stays visible depends on the browser's handling of `background-clip: text` (**UNVERIFIED**).
- The favicon is the create-next-app default. Rendered from `src/app/favicon.ico` (16 and 32 px), it shows the white triangle on a black disc (Vercel's mark).
- Tone: `Cpu` icons for the discussion section, monospace labels, "Module 1/2", a pulsing green "Module Routes Active" pill (`layout.tsx:29-31`), a glassy blurred header and gradient text. Together they read as a developer dashboard, not a place to read about texts, words and history. The scaffold copy is C-14; this finding is the visual layer.
- **Script presentation:**
  - The README titles the project "MoolSutra (मूलसूत्र)" (`README.md:1`), Devanagari only.
  - The Idea Thread's own brand plan gives the name in Devanagari, Tamil and Telugu, and describes Tamil "Moola-Soothiram" and Telugu/Kannada/Malayalam "Moola-Sootram" forms (PDF p. 17, read from the rendered page; the extracted text is garbled, and the spellings are **UNVERIFIED** by a native reader).
  - The UI shows no form of the name in any Indian script.
  - The script toggle used "अ" and "Indic (Devanagari)" as the sign for all Indian scripts (`ScriptToggle.tsx:14,24`; removed in step 6).

**Judgement call**
- A Devanagari-only secondary name reads as Hindi or Sanskrit first. That pulls against the "every language" intent the Idea Thread states for the name itself (PDF p. 15: "the name cannot be colloquial Northern slang (which alienates the South and East)").
- Showing no Indian script at all is neutral, but it loses the warmth the name carries.

**Fix**
- **Header wordmark:** "MoolSutra" in the Latin family at weight 600, in `ink`, with no gradient and no monogram.
- **Name in Indian scripts:** where the brand is introduced (home footer, an about section), show it in several scripts together, each form checked by a native reader and marked up with `lang`. Never show Devanagari alone as "the" Indian name. Owner decision: Open question 3.
- **Emblem and favicon:** replace both. A simple abstract mark is enough at launch.
  - **Judgement call:** if the name's "thread" or "root" is drawn, avoid anything that resembles a sacred thread (*janeu*/*yajñopavīta*, which carries caste meaning) or a wrist thread (*kalava*/*mauli*).
  - Avoid any religious symbol, the national emblem and the Aśoka chakra, any party election symbol (for example the lotus or the hand), and outline maps of India.
  - Legal restrictions on the national emblem and on map depictions exist (**UNVERIFIED** here: no network). Check before any such use.
- **Tone:** an editorial, library-like feel: warm paper-neutral surfaces, ink text, one restrained accent, a generous reading measure and few pills. Remove the pulse, gradients and `Cpu`/`Layers` icons (with C-14).

### V-09 — Spacing, layout and density (MEDIUM)

**Evidence**
- 69 spacing values in 283 uses. 61 uses are half-steps (2, 6, 10 and 14 px). 33 values occur only once or twice.
- 9 different card paddings (inventory).
- The vault card stacks its sections with `space-y-6` (24 px) inside `p-5 sm:p-7`. The post card uses `space-y-4` inside `p-5 sm:p-6`.
- Reading width: the vault is `max-w-3xl` (768 px); the feed and composer are `max-w-2xl` (672 px). At the 18 px record size, 768 px is about 85 characters per line and 672 px about 75 (estimated at 0.5 em average advance for Latin; Devanagari and Tamil differ, **UNVERIFIED**).
- The page container is `max-w-7xl` (1280 px) with `py-8`. Headers are left-aligned on `/pramaan` and centred at `sm:` on `/sutra` (`sutra/page.tsx:65`).
- **The Audit 06 record card** at 360 px needs:
  - its status, provenance, title, term and three 18 px bullets in the first screen;
  - the 121 px sticky header reduced (U-07);
  - card padding of 16 px, not 20 or 28;
  - 12-16 px between blocks, not 24.

  With the current `p-5`/`space-y-6`, the meta row and two callouts alone use most of the first screen (U-05 estimate).

**Fix**
- Spacing scale on the 4 px base: 4, 8, 12, 16, 24, 32, 48 px (Tailwind `1, 2, 3, 4, 6, 8, 12`). Allow half-steps only inside controls, to centre an icon.
- Card padding is `p-4 sm:p-6` (16 px below `sm`, 24 px at `sm` and above). Blocks inside a card are 12 px apart (`gap-3`); sections are 24 px apart.
- Two widths:
  - `container-reading`: 42 rem (672 px) for records, the feed and forms, which is about 75 characters at 18 px;
  - `container-page`: 64 rem (1024 px) for the header and list pages.

  The current 1280 px container is wider than any content needs.
- One alignment rule: left-aligned page headers everywhere.

### V-10 — Radius and elevation (LOW)

**Evidence**
- Six radii: 4, 6, 8, 12, 16 px and full.
- Cards are 16 px, while the sections inside them are 12 px. The modal is 16 px. Inputs and buttons mix 8 and 12 px within one form (login: inputs `rounded-xl`, the email icon wrapper none).
- Shadows: the vault card is `shadow-md`, the post card `shadow-sm` and the home cards `shadow-xs hover:shadow-md`.
- In dark mode the black shadows are invisible on `#0a0a0a`, so elevation there is carried only by the border and the alpha surfaces.

**Fix**
- Three radii: `control` 8 px (buttons, inputs, chips), `card` 12 px (cards, notices, modal), `full` (status pill, avatar).
- No shadow on in-flow cards: a 1 px `line` border in both themes.
- One `shadow-overlay` for the modal and menus, paired with a `line-strong` border, so it still reads in dark mode.

### V-11 — Dark mode gaps (LOW)

**Evidence**
- Every surface in the two rendered screens (`/login`, `/pramaan` at 360 px) has a dark treatment (screenshots). The structure is complete. The failures are the contrast items already in U-08.
- **No `color-scheme`:** `grep -rn color-scheme src` finds only the media query. Without `color-scheme: light dark`, the browser draws the scrollbar (for example in the picker list, `ComposeSutra.tsx:461`), autofill backgrounds and native controls in light style on dark surfaces (**UNVERIFIED** per browser).
- **107 alpha-tinted colour uses** (for example `dark:bg-zinc-900/90` cards, `dark:bg-emerald-950/30` sections, `text-amber-800/80`). The contrast of text on these depends on whatever lies beneath, which is why U-08 had to composite layers by hand.
- **38 colour class strings with no `dark:` counterpart** (class scan). Classified:
  - 22 colour icons or icon wrappers (`text-zinc-400`, `text-zinc-500`, `text-emerald-500`, `text-amber-500`, `text-indigo-500`), each next to a text label, two of them in `ThemeToggle` (removed in step 2);
  - 8 are `text-zinc-400` text, which passes on dark surfaces (5.66-7.56, U-08);
  - 3 are `text-zinc-500` text, which fails on dark cards (U-08 rows: `PramaanCard.tsx:111`, `page.tsx:37,62`);
  - 5 are the footer pill and its dot, the modal overlay and two amber borders.
- Shadows do not show in dark mode (V-10).

**Fix**
- Declare `color-scheme: light dark` on `:root` in the token block (a visible change, so step 6, not step 2).
- Use solid surface tokens; no alpha on text or surfaces. Keep alpha only for the modal scrim.
- Every token has a light and a dark value, so no component needs a `dark:` class at all. After migration, `dark:` should appear only in `globals.css`.

### V-12 — Icon system (LOW)

**Evidence**
- 33 icons in five sizes (12, 14, 16, 20, 24 px), picked per element.
- Metaphors: `Cpu` (a processor) for a discussion feed; `Layers` for Home; `AlertCircle` for both a form error and the content callout "Popular Misconception"; `CheckCircle2` for both success and "verified" (V-03).
- Six imports use legacy alias names. In `lucide-react` 1.32.0 they are re-exports of canonical names:

  | Alias | Canonical |
  |-------|-----------|
  | `AlertCircle` | `CircleAlert` |
  | `AlertTriangle` | `TriangleAlert` |
  | `CheckCircle2` | `CircleCheck` |
  | `Loader2` | `LoaderCircle` |
  | `PenSquare` | `SquarePen` |
  | `Filter` | `Funnel` |

  `UserIcon` is a local rename (`User as UserIcon`, `AuthButtonClient.tsx:5`), not a library alias. No deprecation marker was found in the type declarations, so this is consistency, not breakage.

**Fix**
- Two icon sizes: 16 px inline with text, 20 px in 44 px controls. Icons in buttons are `aria-hidden`, and the label carries the meaning.
- One meaning per icon:

  | Purpose | Icon |
  |---------|------|
  | Pramaan / records | `BookOpen` |
  | Sutra / discussion | `MessagesSquare` |
  | Home | `House` |
  | Draft badge | `CircleDashed` |
  | Contested badge | `Diamond` |
  | Reviewed badge (future) | `BadgeCheck` |
  | Error notice | `CircleAlert` |
  | Warning notice | `TriangleAlert` |
  | Info notice | `Info` |
  | Success notice | `Check` |
  | Loading | `LoaderCircle` |

  "Common claim", when it ever renders, uses no alert icon.
- Use canonical names in new code.

### V-13 — `transition-all` (LOW)

**Evidence:** 20 elements use `transition-all`, including every card and most buttons. It transitions every animatable property (padding, width, shadow, transform), so any layout change animates and the compositor does extra work on low-end phones. U-22 covers reduced motion.

**Fix:** use `transition-colors` (plus `transition-[box-shadow]` only where needed), 150 ms. Wrap any movement in `motion-safe:`.

### V-14 — Tailwind v4 configuration (INFO)

**Evidence**
- `globals.css` is the only theme file. Its `@theme inline` block maps `--color-background`, `--color-foreground`, `--font-sans: var(--font-geist-sans)` and `--font-mono: var(--font-geist-mono)` (`globals.css:8-13`). The last two variables are undefined, so `font-sans`/`font-mono` resolve to nothing and the elements inherit Arial (U-13).
- The `dark:` variant compiles to `@media (prefers-color-scheme: dark)` (`tailwindcss/dist/lib.js`). That is why `ThemeToggle` is a no-op (F-07). It is also exactly the OS-driven behaviour decided in Audit 04 OQ 1, so no `@custom-variant` is needed.

**Fix:** see "Implementation in Tailwind v4" below.

---

## Proposed design tokens

### Principles

1. **Neutral first.** The base is a warm neutral (Tailwind `stone`: hue 49-106°, chroma 0.001-0.013), close to paper and ink. It replaces the cool zinc. Warm neutral is chosen for warmth without a hue that encodes a community. **Judgement call**, see Open question 1.
2. **One accent, for interaction only.** Ink-indigo marks links, focus and the selected nav item. It never marks a script, a tradition, a section or a record. **Judgement call:** indigo is a widely used pan-Indian dye (*nīl*) rather than a party colour, but blue has political associations too (V-05). Its job is kept small so that the association stays small.
3. **Green means `reviewed`, and only that.** It is defined now and used by nothing at launch.
4. **Notices use solid, low-chroma tints.** Error is rose, warning is amber, info and success are indigo. Red never marks content.
5. **Solid values, no alpha** (except the modal scrim).
6. **Every pair is computed.** Text needs 4.5:1 (all text here is under 24 px, or under 18.66 px bold); UI components and focus indicators need 3:1.

### Colour tokens

Values are Tailwind 4.3.3 palette entries converted to sRGB by the script above.

| Token (`--color-*`) | Role | Light | Dark |
|---------------------|------|-------|------|
| `page` | Page background | stone-50 `#fafaf9` | stone-950 `#0c0a09` |
| `surface` | Cards, inputs, header | white `#ffffff` | stone-900 `#1c1917` |
| `surface-muted` | Inset sections, `<details>` body, disabled fill, hover | stone-100 `#f5f5f4` | stone-800 `#292524` |
| `ink` | Body text, headings, original-language text | stone-900 `#1c1917` | stone-100 `#f5f5f4` |
| `ink-secondary` | Provenance line, citations, helper text | stone-700 `#44403b` | stone-300 `#d6d3d1` |
| `ink-muted` | Dates, counters, placeholders (lightest allowed text) | stone-600 `#57534d` | stone-400 `#a6a09b` |
| `line` | Decorative borders and dividers (cards, sections) | stone-200 `#e7e5e4` | stone-700 `#44403b` (not stone-800, which equals dark `surface-muted`, so dividers on inset sections would vanish) |
| `line-strong` | Input borders, status-pill outline, "Scholars disagree" box, overlay border | stone-500 `#79716b` | stone-500 `#79716b` |
| `accent` | Links, selected nav text | indigo-700 `#432dd7` | indigo-300 `#a3b3ff` |
| `accent-strong` | Link hover | indigo-800 `#372aac` | indigo-200 `#c6d2ff` |
| `focus` | Focus outline (2 px, offset 2 px) | indigo-600 `#4f39f6` | indigo-400 `#7c86ff` |
| `primary` | Primary button fill | stone-900 `#1c1917` | stone-100 `#f5f5f4` |
| `primary-hover` | Primary button fill on hover | stone-700 `#44403b` | stone-300 `#d6d3d1` |
| `on-primary` | Primary button text | white `#ffffff` | stone-900 `#1c1917` |
| `status-ink` | Draft and contested badge text | stone-800 `#292524` | stone-200 `#e7e5e4` |
| `status-reviewed` | Reviewed badge text and outline (**not used at launch**) | emerald-800 `#006045` (text), emerald-700 `#007a55` (outline) | emerald-300 `#5ee9b5` (text), emerald-400 `#00d492` (outline) |
| `error-surface` / `error-ink` / `error-line` | Error notice | rose-50 `#fff1f2` / rose-800 `#a50036` / rose-300 `#ffa1ad` | rose-950 `#4d0218` / rose-200 `#ffccd3` / rose-800 `#a50036` |
| `field-error` | Invalid input border and message | rose-700 `#c70036` | rose-300 `#ffa1ad` (message), rose-400 `#ff637e` (border) |
| `warning-surface` / `warning-ink` / `warning-line` | Warning notice | amber-50 `#fffbeb` / amber-900 `#7b3306` / amber-300 `#ffd230` | amber-950 `#461901` / amber-200 `#fee685` / amber-800 `#973c00` |
| `info-surface` / `info-ink` / `info-line` | Info and success notice | indigo-50 `#eef2ff` / indigo-900 `#312c85` / indigo-200 `#c6d2ff` | indigo-950 `#1e1a4d` / indigo-200 `#c6d2ff` / indigo-800 `#372aac` |
| `scrim` | Modal backdrop | black at 50 % | black at 60 % |

### Contrast, every pair the components use

Ratios are WCAG 2.2 relative-luminance ratios. ✓ means it meets the requirement, ✗ that it does not, — that it is decorative and has no requirement.

| Pair (where it occurs) | Need | Light | Ratio | Dark | Ratio |
|------------------------|------|-------|-------|------|-------|
| `ink` / `page` | 4.5 | stone-900 / stone-50 | 16.74 ✓ | stone-100 / stone-950 | 18.11 ✓ |
| `ink` / `surface` | 4.5 | stone-900 / white | 17.49 ✓ | stone-100 / stone-900 | 16.03 ✓ |
| `ink` / `surface-muted` | 4.5 | stone-900 / stone-100 | 16.03 ✓ | stone-100 / stone-800 | 13.90 ✓ |
| `ink-secondary` / `page` | 4.5 | stone-700 / stone-50 | 9.85 ✓ | stone-300 / stone-950 | 13.26 ✓ |
| `ink-secondary` / `surface` | 4.5 | stone-700 / white | 10.28 ✓ | stone-300 / stone-900 | 11.74 ✓ |
| `ink-secondary` / `surface-muted` | 4.5 | stone-700 / stone-100 | 9.43 ✓ | stone-300 / stone-800 | 10.18 ✓ |
| `ink-muted` / `page` | 4.5 | stone-600 / stone-50 | 7.31 ✓ | stone-400 / stone-950 | 7.64 ✓ |
| `ink-muted` / `surface` (includes placeholder) | 4.5 | stone-600 / white | 7.64 ✓ | stone-400 / stone-900 | 6.76 ✓ |
| `ink-muted` / `surface-muted` | 4.5 | stone-600 / stone-100 | 7.00 ✓ | stone-400 / stone-800 | 5.87 ✓ |
| `accent` / `page` | 4.5 | indigo-700 / stone-50 | 7.75 ✓ | indigo-300 / stone-950 | 9.83 ✓ |
| `accent` / `surface` | 4.5 | indigo-700 / white | 8.09 ✓ | indigo-300 / stone-900 | 8.70 ✓ |
| `accent` / `surface-muted` | 4.5 | indigo-700 / stone-100 | 7.42 ✓ | indigo-300 / stone-800 | 7.55 ✓ |
| `accent-strong` / `surface` | 4.5 | indigo-800 / white | 10.05 ✓ | indigo-200 / stone-900 | 11.71 ✓ |
| `accent` / `error-surface` (link inside a notice) | 4.5 | indigo-700 / rose-50 | 7.37 ✓ | indigo-300 / rose-950 | 7.81 ✓ |
| `accent` / `warning-surface` | 4.5 | indigo-700 / amber-50 | 7.80 ✓ | indigo-300 / amber-950 | 7.46 ✓ |
| `accent` / `info-surface` | 4.5 | indigo-700 / indigo-50 | 7.24 ✓ | indigo-300 / indigo-950 | 7.98 ✓ |
| `accent` vs surrounding `ink` (link in running text, 1.4.1) | 3 | indigo-700 vs stone-900 | 2.16 ✗ | indigo-300 vs stone-100 | 1.84 ✗ |
| `on-primary` / `primary` | 4.5 | white / stone-900 | 17.49 ✓ | stone-900 / stone-100 | 16.03 ✓ |
| `on-primary` / `primary-hover` | 4.5 | white / stone-700 | 10.28 ✓ | stone-900 / stone-300 | 11.74 ✓ |
| `primary` / `surface` (button boundary) | 3 | stone-900 / white | 17.49 ✓ | stone-100 / stone-900 | 16.03 ✓ |
| `primary` / `page` | 3 | stone-900 / stone-50 | 16.74 ✓ | stone-100 / stone-950 | 18.11 ✓ |
| `status-ink` / `surface` | 4.5 | stone-800 / white | 15.17 ✓ | stone-200 / stone-900 | 13.93 ✓ |
| `status-ink` / `surface-muted` (compact badge in picker rows) | 4.5 | stone-800 / stone-100 | 13.90 ✓ | stone-200 / stone-800 | 12.08 ✓ |
| `status-ink` / `page` | 4.5 | stone-800 / stone-50 | 14.52 ✓ | stone-200 / stone-950 | 15.73 ✓ |
| `status-reviewed` text / `surface` (future) | 4.5 | emerald-800 / white | 7.61 ✓ | emerald-300 / stone-900 | 11.49 ✓ |
| `status-reviewed` text / `surface-muted` (future) | 4.5 | emerald-800 / stone-100 | 6.98 ✓ | emerald-300 / stone-800 | 9.97 ✓ |
| `status-reviewed` outline / `surface` (future) | 3 | emerald-700 / white | 5.36 ✓ | emerald-400 / stone-900 | 9.02 ✓ |
| `error-ink` / `error-surface` | 4.5 | rose-800 / rose-50 | 7.21 ✓ | rose-200 / rose-950 | 11.09 ✓ |
| `warning-ink` / `warning-surface` | 4.5 | amber-900 / amber-50 | 8.73 ✓ | amber-200 / amber-950 | 12.05 ✓ |
| `info-ink` / `info-surface` | 4.5 | indigo-900 / indigo-50 | 10.26 ✓ | indigo-200 / indigo-950 | 10.73 ✓ |
| `field-error` message / `surface` | 4.5 | rose-700 / white | 6.03 ✓ | rose-300 / stone-900 | 9.12 ✓ |
| `field-error` message / `page` | 4.5 | rose-700 / stone-50 | 5.78 ✓ | rose-300 / stone-950 | 10.30 ✓ |
| `field-error` border / `surface` | 3 | rose-700 / white | 6.03 ✓ | rose-400 / stone-900 | 6.11 ✓ |
| `line-strong` / `surface` (input border, badge outline) | 3 | stone-500 / white | 4.79 ✓ | stone-500 / stone-900 | 3.65 ✓ |
| `line-strong` / `page` | 3 | stone-500 / stone-50 | 4.58 ✓ | stone-500 / stone-950 | 4.13 ✓ |
| `line-strong` / `surface-muted` | 3 | stone-500 / stone-100 | 4.39 ✓ | stone-500 / stone-800 | 3.17 ✓ |
| `focus` / `page` | 3 | indigo-600 / stone-50 | 6.19 ✓ | indigo-400 / stone-950 | 6.31 ✓ |
| `focus` / `surface` | 3 | indigo-600 / white | 6.46 ✓ | indigo-400 / stone-900 | 5.59 ✓ |
| `focus` / `surface-muted` | 3 | indigo-600 / stone-100 | 5.93 ✓ | indigo-400 / stone-800 | 4.85 ✓ |
| `focus` / `primary` (outline touching the button) | 3 | indigo-600 / stone-900 | 2.71 ✗ | indigo-400 / stone-100 | 2.87 ✗ |
| `line` / `surface` (decorative card border) | — | stone-200 / white | 1.26 | stone-700 / stone-900 | 1.70 |
| `line` / `surface-muted` (divider on an inset section) | — | stone-200 / stone-100 | 1.15 | stone-700 / stone-800 | 1.48 |
| `line` / `page` | — | stone-200 / stone-50 | 1.20 | stone-700 / stone-950 | 1.92 |
| `error-line` / `error-surface` (notice border; the tint and text carry it) | — | rose-300 / rose-50 | 1.75 | rose-800 / rose-950 | 1.98 |

**Reading the three ✗ rows**
- **Link vs surrounding text.** The proposed accent passes 4.5:1 on every background but is under 3:1 against the body text. A mid-tone in the narrow band that satisfies both exists in principle, but it would be a weak, greyish link colour. So links inside running text are always **underlined**, and colour is never the only cue (1.4.1). Stand-alone links (nav, "Sources", "Report an error") are identified by position and may drop the underline until hover.
- **Focus vs `primary`.** The focus outline is drawn with `outline-offset: 2px`, so the pixels next to the ring are the `surface` or `page` colour behind the button, not the button fill. The relevant pairs are `focus`/`surface` and `focus`/`page` (5.59-6.46, pass). This is why the offset is part of the token contract, not a style choice. An outline with no offset on a primary button would fail.
- **Decorative lines** (`line`, `error-line`) are not the only boundary of any control. Inputs and anything a user must locate use `line-strong`.

**Notes**
- **Disabled** controls (exempt from 1.4.3) use `surface-muted` fill and `ink-muted` text (7.00 / 5.87), not opacity. They stay legible but look inert.
- **Dark `line-strong` on `surface-muted`** is 3.17: a pass, but the narrowest margin in the table. Inputs never sit on `surface-muted`. The narrow pair is only the compact status badge in a hovered picker row.

### Type scale

The floor is 18 px for record body, 16 px for any reading text and 12 px for anything, from Audit 06 OQ 5. The smallest token here is 14 px, so the 12 px floor holds with margin. Sizes are in `rem`, so browser text-size settings scale them.

| Token (`--text-*`) | Size | Latin line-height | Indic line-height | Weight | Use |
|--------------------|------|-------------------|-------------------|--------|-----|
| `caption` | 14 px (0.875 rem) | 1.5 | 1.7 | 400 / 600 | Status badge, provenance line, dates, counters, helper and label text |
| `body` | 16 px (1 rem) | 1.6 | 1.75 | 400 | Minimum reading text: posts, notices, form text, nav, buttons |
| `record` | 18 px (1.125 rem) | 1.65 | 1.8 | 400 | Record bullets, caveat sentence, `source_summary`, original-language term |
| `title-sm` | 20 px (1.25 rem) | 1.4 | 1.6 | 600 | Section headings inside a record ("Scholars disagree", `<summary>` labels at 18-20 px) |
| `title` | 24 px (1.5 rem) | 1.3 | 1.5 | 600 | Record title on phones; page `h1` on phones |
| `title-lg` | 30 px (1.875 rem) | 1.25 | 1.45 | 600 | Record title and page `h1` at `sm` and above |
| `display` | 36 px (2.25 rem) | 1.2 | 1.4 | 600 | Home purpose line only |

**Pairing**
- **Latin:** Noto Sans. Verified on this machine, the full Noto Sans font covers all 22 IAST and Tamil-transliteration letters checked: ā ī ū ṛ ṝ ḷ ḹ ṃ ḥ ṅ ñ ṭ ḍ ṇ ś ṣ ē ō ṉ ṟ ḻ ḵ (`fc-list ":charset=…"`, which also matches Liberation Sans, DejaVu Sans and Noto Serif).
  - Whether `next/font`'s `latin` + `latin-ext` subsets of Noto Sans include U+1E00-1EFF in full could not be checked offline (**UNVERIFIED**). Check it in step 6 by rendering record 4's ṉ and ṟ.
  - Noto Sans is designed as one family with Noto Sans Devanagari and Tamil, so x-heights and stroke weights already match. That is the main reason to pick it over another Latin family.
- **Devanagari and Tamil:** Noto Sans Devanagari and Noto Sans Tamil, as decided.
  - In `next/font`'s font data, both are variable on `wght` 100-900, so 400 and 600 are real weights, not synthetic.
  - Noto Sans itself offers a `devanagari` subset but no `tamil`. Request only `latin` + `latin-ext` from Noto Sans, so Devanagari is not loaded twice.
  - Noto Serif has no Devanagari subset, so a serif excerpt style would need two more families (Open question 4).
- **Stack:** `--font-sans: var(--font-latin, ui-sans-serif), var(--font-deva, ui-sans-serif), var(--font-taml, ui-sans-serif), system-ui, sans-serif`. Each `var()` has a fallback, because one undefined variable without a fallback makes the whole declaration invalid (the Geist failure in V-14). The browser picks per character, so mixed text (an English bullet containing शून्य) works without markup. `lang` is still required (Audit 06 OQ 3).
- **Weights:** 400 and 600 only. 700 and 800 are retired (V-06).

**Indic rules** (Audit 06 OQ 6)
- **No `tracking-*` on any element that contains Indic text.** In Tailwind v4, a `:lang(sa)` rule in `@layer base` cannot override a `tracking-*` or `leading-*` utility, because the utilities layer wins. So the rule is enforced by the component: the `OriginalTerm` component (below) owns its classes (`font-sans text-record leading-indic tracking-normal`), and callers cannot pass tracking.
- Line-height comes from the `leading-indic` token (1.8 at `record` size), applied by the component. Not by `:lang()` in the base layer.
- Watch the `:lang()` trap: `:lang(sa)` also matches `sa-Latn`, the IAST transliteration line.
- `font-synthesis-weight: none` on `OriginalTerm` and on `body`. Both families have real 400 and 600, so nothing legitimate is lost.
- **Indic line-heights are starting values (UNVERIFIED on devices).** Devanagari vowel signs above the headstroke and below the baseline, and Tamil's tall glyphs, need more room than Latin. Test the 360 px record card with record 1 (Devanagari, 24-character term) and record 4 (Tamil) in step 9. Tamil words are long and wrap often; if 18 px Tamil looks larger than the Latin around it, size-adjusting the Tamil face is a step 9 check, not a launch requirement.

### Spacing, radius, elevation, widths

| Token | Value | Use |
|-------|-------|-----|
| `--spacing` | 0.25 rem (Tailwind default) | Use steps 1, 2, 3, 4, 6, 8, 12 (4-48 px). Half-steps only inside controls |
| Card padding | `p-4 sm:p-6` | Every card |
| Block gap inside a card | `gap-3` (12 px) | Badge to title to term to bullets |
| Section gap | `gap-6` (24 px) | Between cards and page sections |
| `--radius-control` | 0.5 rem (8 px) | Buttons, inputs, chips |
| `--radius-card` | 0.75 rem (12 px) | Cards, notices, modal, the "Scholars disagree" box |
| `rounded-full` | — | Status pill, avatar |
| `--shadow-overlay` | `0 10px 30px -10px rgb(0 0 0 / 0.35)` | Modal and menus only, always with a `line-strong` border |
| `--container-reading` | 42 rem (672 px) | Record pages, feed, forms |
| `--container-page` | 64 rem (1024 px) | Header, list pages, home |
| Control height | `min-h-11` (44 px) | Primary buttons and inputs (Audit 06 OQ 5) |

### Draft `@theme` block

Not written to any file. Step 2 adds only the `--ms-*` colour variables and the colour mappings (with `--ms-page`/`--ms-ink` at today's values); everything else here (`color-scheme`, the `html`/`body` rules, `:focus-visible`, fonts, type, radius, widths) lands in step 6 (Migration plan). Raw values live on `:root`, matching the current `globals.css` pattern, and are mapped through `@theme inline` so the utilities follow the media query. No media query goes inside `@theme`.

```css
@import "tailwindcss";

/* Raw values. Prefix --ms- so they never collide with Tailwind's --color-* namespace. */
@layer base {
  :root {
    color-scheme: light dark;            /* step 6: visible change (scrollbars, autofill) */

    --ms-page: #fafaf9;                  /* stone-50 */
    --ms-surface: #ffffff;
    --ms-surface-muted: #f5f5f4;         /* stone-100 */
    --ms-ink: #1c1917;                   /* stone-900 */
    --ms-ink-secondary: #44403b;         /* stone-700 */
    --ms-ink-muted: #57534d;             /* stone-600 */
    --ms-line: #e7e5e4;                  /* stone-200 */
    --ms-line-strong: #79716b;           /* stone-500 */
    --ms-accent: #432dd7;                /* indigo-700 */
    --ms-accent-strong: #372aac;         /* indigo-800 */
    --ms-focus: #4f39f6;                 /* indigo-600 */
    --ms-primary: #1c1917;
    --ms-primary-hover: #44403b;         /* stone-700 */
    --ms-on-primary: #ffffff;
    --ms-status-ink: #292524;            /* stone-800 */
    --ms-status-reviewed: #006045;       /* emerald-800; not used at launch */
    --ms-status-reviewed-line: #007a55;  /* emerald-700 */
    --ms-error-surface: #fff1f2;
    --ms-error-ink: #a50036;
    --ms-error-line: #ffa1ad;
    --ms-field-error: #c70036;           /* rose-700: border and message */
    --ms-field-error-line: #c70036;
    --ms-warning-surface: #fffbeb;
    --ms-warning-ink: #7b3306;
    --ms-warning-line: #ffd230;
    --ms-info-surface: #eef2ff;
    --ms-info-ink: #312c85;
    --ms-info-line: #c6d2ff;
    --ms-scrim: rgb(0 0 0 / 0.5);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --ms-page: #0c0a09;                /* stone-950 */
      --ms-surface: #1c1917;             /* stone-900 */
      --ms-surface-muted: #292524;       /* stone-800 */
      --ms-ink: #f5f5f4;
      --ms-ink-secondary: #d6d3d1;
      --ms-ink-muted: #a6a09b;
      --ms-line: #44403b;                /* stone-700 */
      --ms-line-strong: #79716b;
      --ms-accent: #a3b3ff;              /* indigo-300 */
      --ms-accent-strong: #c6d2ff;       /* indigo-200 */
      --ms-focus: #7c86ff;               /* indigo-400 */
      --ms-primary: #f5f5f4;
      --ms-primary-hover: #d6d3d1;       /* stone-300 */
      --ms-on-primary: #1c1917;
      --ms-status-ink: #e7e5e4;
      --ms-status-reviewed: #5ee9b5;
      --ms-status-reviewed-line: #00d492;
      --ms-error-surface: #4d0218;
      --ms-error-ink: #ffccd3;
      --ms-error-line: #a50036;
      --ms-field-error: #ffa1ad;         /* rose-300: message */
      --ms-field-error-line: #ff637e;    /* rose-400: border */
      --ms-warning-surface: #461901;
      --ms-warning-ink: #fee685;
      --ms-warning-line: #973c00;
      --ms-info-surface: #1e1a4d;
      --ms-info-ink: #c6d2ff;
      --ms-info-line: #372aac;
      --ms-scrim: rgb(0 0 0 / 0.6);
    }
  }

  html { scroll-padding-top: var(--ms-header-h, 4rem); }     /* U-07 */
  body {
    background: var(--ms-page);
    color: var(--ms-ink);
    font-family: var(--font-sans);
    font-synthesis-weight: none;
  }
  :focus-visible { outline: 2px solid var(--ms-focus); outline-offset: 2px; }
}

@theme inline {
  --color-page: var(--ms-page);
  --color-surface: var(--ms-surface);
  --color-surface-muted: var(--ms-surface-muted);
  --color-ink: var(--ms-ink);
  --color-ink-secondary: var(--ms-ink-secondary);
  --color-ink-muted: var(--ms-ink-muted);
  --color-line: var(--ms-line);
  --color-line-strong: var(--ms-line-strong);
  --color-accent: var(--ms-accent);
  --color-accent-strong: var(--ms-accent-strong);
  --color-focus: var(--ms-focus);
  --color-primary: var(--ms-primary);
  --color-primary-hover: var(--ms-primary-hover);
  --color-on-primary: var(--ms-on-primary);
  --color-status-ink: var(--ms-status-ink);
  --color-status-reviewed: var(--ms-status-reviewed);
  --color-status-reviewed-line: var(--ms-status-reviewed-line);
  --color-error-surface: var(--ms-error-surface);
  --color-error-ink: var(--ms-error-ink);
  --color-error-line: var(--ms-error-line);
  --color-field-error: var(--ms-field-error);
  --color-field-error-line: var(--ms-field-error-line);
  --color-warning-surface: var(--ms-warning-surface);
  --color-warning-ink: var(--ms-warning-ink);
  --color-warning-line: var(--ms-warning-line);
  --color-info-surface: var(--ms-info-surface);
  --color-info-ink: var(--ms-info-ink);
  --color-info-line: var(--ms-info-line);
  --color-scrim: var(--ms-scrim);

  /* Fonts: variables come from next/font on <html> (step 6). */
  /* Each var() has a fallback: one undefined variable would otherwise void the whole stack. */
  --font-sans: var(--font-latin, ui-sans-serif), var(--font-deva, ui-sans-serif),
    var(--font-taml, ui-sans-serif), system-ui, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  /* Type scale. --text-X--line-height is the Latin default. */
  --text-caption: 0.875rem;  --text-caption--line-height: 1.5;
  --text-body: 1rem;         --text-body--line-height: 1.6;
  --text-record: 1.125rem;   --text-record--line-height: 1.65;
  --text-title-sm: 1.25rem;  --text-title-sm--line-height: 1.4;
  --text-title: 1.5rem;      --text-title--line-height: 1.3;
  --text-title-lg: 1.875rem; --text-title-lg--line-height: 1.25;
  --text-display: 2.25rem;   --text-display--line-height: 1.2;
  --leading-indic: 1.8;
  --leading-indic-heading: 1.5;

  --radius-control: 0.5rem;
  --radius-card: 0.75rem;
  --shadow-overlay: 0 10px 30px -10px rgb(0 0 0 / 0.35);
  --container-reading: 42rem;
  --container-page: 64rem;
}
```

Resulting classes: `bg-page`, `bg-surface`, `text-ink`, `text-ink-muted`, `border-line`, `border-line-strong`, `text-accent`, `bg-primary text-on-primary`, `bg-error-surface text-error-ink border-error-line`, `text-caption`, `text-record`, `leading-indic`, `rounded-card`, `shadow-overlay`, `max-w-reading`.

The colour token names do not collide with the type tokens (`text-body` is a size; no colour is called `body`).

---

## Proposed component set

Built in the steps Audit 04 (as revised by Audits 05 and 06) already assigns:
- step 4: `Notice`, `EmptyState`, `StatusBadge`;
- step 5: composer fields;
- step 6: `Button`, the card and the rest.

Each component takes only semantic props, never colour classes.

Common states for every interactive component:

| State | Treatment |
|-------|-----------|
| Hover | One token step: `primary` to `primary-hover`; `surface` to `surface-muted`; links `accent` to `accent-strong` |
| Focus-visible | The global `:focus-visible` outline: 2 px `focus`, offset 2 px. Never `outline-none` without a replacement |
| Active | Same as hover. No scale transform |
| Disabled | `aria-disabled` or `disabled`; `surface-muted` fill, `ink-muted` text, `cursor-not-allowed`. No opacity |
| Loading | Label kept, `LoaderCircle` before it, `aria-busy="true"`, the control disabled |

| Component | Variants | Specifics | Replaces |
|-----------|----------|-----------|----------|
| **Button** / **LinkButton** | `primary` (`bg-primary text-on-primary`); `secondary` (`bg-surface border-line-strong text-ink`); `quiet` (text only, `text-accent`, underline on hover). Sizes: `md` = `min-h-11` (44 px), `text-body`, `px-4`, default and required for primary actions; `sm` = `min-h-9` (36 px), `text-caption`, for secondary in-card actions. `icon` = 44 × 44, or 32 × 32 for the remove-card target (Audit 06 step 5) | `rounded-control`. Destructive actions are a `secondary` button with `text-error-ink`, never a red fill | The 13 button styles in V-07 |
| **StatusBadge** | `draft` (`CircleDashed`); `contested` (`Diamond`), with a "see readings" link to `#readings`; `under_review` and `reviewed` exist in the type but render nothing until requirement 7 data exists (Audit 05 step 6); `reviewed` alone uses `status-reviewed` and `BadgeCheck`. Sizes: `full` (card; the full Audit 05 wording, `text-caption`); `compact` (picker, feed chip, list; the status word visible and the full wording `sr-only`) | Outlined pill: `rounded-full border border-line-strong text-status-ink bg-surface`. Draft and contested differ in words and icon shape, not colour. Icon `aria-hidden`. Rendered as a `<p>` (Audit 06 details) | — (new) |
| **Notice** | `error` (`role="alert"`, `CircleAlert`); `warning` (`TriangleAlert`); `info` (`Info`); `success`, which uses the info palette and `Check` (`role="status"`) | `rounded-card border p-4 text-body`. Always-present live container (Audit 06 step 4). Fixed copy (S-09) | `login/page.tsx:89-104`, `ComposeSutra.tsx:302-317`, the two database notices |
| **EmptyState** | `empty`; `no-results` (offers to clear the search); `signed-out` (sign-in prompt) | Neutral icon (`Inbox`, `SearchX`, `LogIn`) in `ink-muted`; title `text-title-sm`; body `text-body text-ink-secondary`; optional Button. Solid `border-line` and `rounded-card`, not dashed | The 4 empty states |
| **Card** | `default`; `interactive` (whole card is a link: hover `border-line-strong`, focus-visible outline on the card); `inset` (`bg-surface-muted`, no border, for `<details>` bodies); `callout` (`border-line-strong` plus a visible label, used only for "Scholars disagree" with `id="readings"`) | `bg-surface border border-line rounded-card p-4 sm:p-6`. No shadow | 9 card paddings |
| **RecordCard** | `full` (record page; Audit 06 mock-up); `preview` (list and home: badge `compact`, title, term, first bullet, link) | Order: StatusBadge, provenance (`text-caption text-ink-secondary`), title (`text-title`/`sm:text-title-lg`, weight 600), OriginalTerm, caveat (`text-record`), bullets (`text-record`), `<details>` ×2, "Report an error". Gap `gap-3` | `PramaanCard` |
| **OriginalTerm** | `inline`; `block` (under the title) | Props: `text`, `lang` (BCP 47, required), optional `translit` (rendered with `lang="<x>-Latn"`). Owns `text-record leading-indic tracking-normal font-sans text-ink`; accepts no `className` for typography | The indic title and excerpt branches |
| **Field** (Input, Textarea, Search) | States: default (`border-line-strong`); focus-visible; `invalid` (`border-field-error-line`, message in `text-field-error` with `CircleAlert`, linked by `aria-describedby`, `aria-invalid`); disabled; read-only | Visible `<label>` (`text-caption` 600, `text-ink`); optional hint (`text-caption text-ink-secondary`); counter (`text-caption text-ink-muted`). `min-h-11`, `text-body` (16 px also stops iOS zoom-on-focus, **UNVERIFIED** here), `rounded-control`, `bg-surface`; placeholder `ink-muted` and never the only instruction (U-10) | 5 input styles |
| **Dialog** | One | `bg-surface border border-line-strong rounded-card shadow-overlay max-w-lg`; scrim `bg-scrim`. Semantics per C-19 | Picker modal |
| **Disclosure** | One | Native `<details>`/`<summary>`, summary `text-title-sm` with a chevron icon `aria-hidden`; body Card `inset` | Summary/Scholar switch |
| **NavLink** | `default`; `current` (`aria-current="page"`, `text-ink` 600 with a 2 px `accent` underline bar, so the state is not colour alone) | `text-body`, `min-h-11` on mobile | `Navbar.tsx:40-51,70-81` |

Explicitly not built: a theme toggle (removed), a script toggle (removed), a segmented control (removed), a red "myth" callout (Audit 05), any green element before `reviewed` exists.

---

## Brand and cultural-neutrality notes

Everything in this section except the measured hue values and the `grep` results is a **Judgement call**. No external source was consulted.

1. **What is there now.**
   - No religious, regional or political symbol exists in `src/`, `public/` or the README (`grep`: 0 hits).
   - The palette's only problem in this respect is the saffron-range amber on scripture and citations (V-05).
   - The brand marks are placeholders: a Latin "MS" monogram and the Next.js default favicon (V-08).
2. **The intent** (Idea Thread PDF pp. 14-15, 27-28): a name and identity that belong to every religion, region and language. The brand plan pairs the Latin name with Devanagari, Tamil and Telugu forms (p. 17).
3. **Colour.**
   - Every saturated hue carries some association in India (V-05). The visuals stay neutral by rule, not by finding a neutral hue:
     - warm neutral surfaces;
     - one accent restricted to interaction;
     - no colour ever encoding a script, a tradition, a community, a region or a content category;
     - no flag or party pairings (saffron with green, black with red, the tricolour).
   - Green is held back for `reviewed` (Audit 05).
4. **Symbols to avoid** in emblem, illustration or decoration:
   - religious marks (Om, swastika, crescent, cross, khanda, dharmachakra, trident, conch, tilak);
   - temple, mosque, church or gurdwara silhouettes;
   - the national emblem and the Aśoka chakra;
   - party election symbols (lotus, hand and the rest);
   - outline maps of India;
   - for a brand built on "thread", any depiction resembling the sacred thread or the wrist thread.
5. **Scripts.**
   - No single script stands for "Indian". Wherever the name or a sample word appears in an Indian script, show several scripts together, or the script that the content itself is in, with `lang`.
   - The `OriginalTerm` component already does the second: record 4 shows Tamil, records 1-3 and 5 show the script of their source term.
   - Each brand rendering of the name needs a native reader (Open question 3).
6. **A warm direction that stays neutral.**
   - Paper-and-ink surfaces (stone).
   - Generous reading measure and line-height (the type scale).
   - Real Indic typefaces rendered well, at reading size and given space. That signals respect for the scripts better than ornament.
   - A plain Latin wordmark, with the multi-script name in one considered place.
   - Warmth comes from typography and spacing, not from motif.

---

## Migration plan for the fix phase

Steps follow the Audit 04 order as revised by the Audit 05 and Audit 06 Decisions, strictly one at a time (Audit 04 Decision B). No new step is added. No new dependencies.

| Step | Visual-system work | Behaviour change |
|------|--------------------|------------------|
| **1. Guardrails** | `CLAUDE.md` gets a "Design tokens" section:<ul><li>use semantic token classes in any line you write or edit;</li><li>no raw palette classes (`zinc-`, `emerald-`, `amber-`, `indigo-`, `rose-`, `stone-`) and no `dark:` in components;</li><li>green and check icons only for `reviewed`;</li><li>colour never encodes a script, tradition or region;</li><li>`OriginalTerm` for any Indic text;</li><li>weights 400/600 only;</li><li>no `transition-all`;</li><li>underline links in running text.</li></ul>Also record that Audit 01 F-13's `globals.css:3-26` row is reversed (V-04) | None |
| **2. Mechanical cleanup** | Colour only; every font rule waits for step 6:<ul><li>Delete the dead `body` colour classes in `layout.tsx:19` (`bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100`), not the `globals.css` variables (V-04). Keep `font-sans` on `<body>` for now.</li><li>Add the `--ms-*` colour variables and the `@theme inline` colour mappings from the draft, with `--ms-page` and `--ms-ink` set to today's rendered values (`#ffffff`/`#0a0a0a`, `#171717`/`#ededed`), and point the existing `body` `background`/`color` declarations at them.</li><li>Leave untouched until step 6: the unlayered `body { font-family: Arial… }` rule, the Geist `--font-sans`/`--font-mono` mappings, `:focus-visible`, `scroll-padding-top`, `font-synthesis-weight` and `color-scheme`. Each of these changes what renders: moving the font rule into `@layer base` lets the `font-sans` utility (still pointing at the undefined Geist variable) win, and deleting the Geist mappings turns the 21 `font-mono` elements from inherited Arial into a real monospace stack. This narrows Audit 04 step 2's "delete dead code" for `globals.css:11-12` (F-13).</li></ul>Tokens exist; nothing uses them | None. Verify before and after at 360 px in both themes: screenshots, a page-background pixel sample, and the computed `font-family` of `<body>` and of one `font-mono` element (for example the slug at `PramaanCard.tsx:56`) |
| **2. CI ratchet** | Add the raw-palette check below to the CI from step 1. It fails if the count of raw palette classes in `src/` is above a limit written in the script. The limit starts at today's count (665, measured with the same pattern) and each later step lowers it. The count must only go down | None |
| **4. Data layer and primitives** | Build `Notice`, `EmptyState` and `StatusBadge` on tokens only, with the variants and states above. Replace the four notice and empty-state copies (C-11). Lower the ratchet | Notices gain live regions (already decided); colours move to tokens |
| **5. Composer** | `Field`, `Button` (`md`, 44 px) and `Dialog` for the composer and `PramaanPicker`. Picker rows use `StatusBadge compact`. Remove `ShieldCheck` (`ComposeSutra.tsx:250,369,400,434`) and the emerald focus. Lower the ratchet | As already decided for step 5 |
| **6. UI consistency, record card, typography** | In this order, one commit each:<ol><li>fonts via `next/font` (Noto Sans `latin`/`latin-ext`, Noto Sans Devanagari, Noto Sans Tamil; `variable`, weights 400/600; whether Indic faces are preloaded is Audit 08's call); `--font-sans` composed with fallbacks; the Geist mappings deleted and `--font-mono` set to a system monospace stack; the `html`/`body` base rules moved into `@layer base` with the `font-family` rule replaced; `:focus-visible`, `scroll-padding-top` and `font-synthesis-weight: none` added;</li><li>type scale tokens applied, sentence-case labels;</li><li>switch `--ms-page`/`--ms-ink` to the stone values and add `color-scheme: light dark`;</li><li>`Button`, `Card`, `Disclosure`, `NavLink`;</li><li>`RecordCard` and `OriginalTerm` per Audit 06; remove `ScriptToggle`;</li><li>pages, nav, layout and home rebuilt on components; icon replacements (V-03, V-12); remove gradients, pulse and `transition-all`;</li><li>lower the ratchet to 0;</li><li>optionally add `--color-*: initial;` in a plain `@theme { }` block (not `@theme inline`), before the token mappings, so the default palette is no longer generated. Unknown classes are dropped silently, so the grep ratchet stays the real guard.</li></ol> | The visible redesign, as decided in Audits 05-06 |
| **6. Brand placeholders** | Replace the "MS" monogram with the plain wordmark. Keep the default favicon until a mark exists, or use a neutral one-letter favicon in `ink` on `page` (Open question 3) | Visible |
| **7. Auth flows** | Login on `Field`, `Button`, `Notice`. No new styles | As decided |
| **9. Launch checklist** | Add to the Audit 06 step 9 checklist:<ul><li>both themes on every page;</li><li>a page-background pixel check;</li><li>spot-check five token pairs with a contrast tool;</li><li>record 1 (Devanagari) and record 4 (Tamil) cards at 320/360 px, with line-height and no clipped vowel signs;</li><li>IAST letters ṉ ṟ ṃ ṭ in the Latin face (no fallback font mixing);</li><li>Windows High Contrast or forced colours on the header and status badges (**UNVERIFIED** today);</li><li>the ratchet is at 0</li></ul> | None |
| **Audit 08** | Sizes the three font families with the subsets above; decides `preload` for the Indic faces and whether a single variable file per family is acceptable | — |

The ratchet script for step 2 (a shell script, no dependency; it follows the repo owner's bash rules: `[[ ]]`, `$(...)`, no `set -e`):

```bash
#!/usr/bin/env bash
# Fails when raw Tailwind palette classes increase. Lower LIMIT at each fix step; the target is 0.
LIMIT=665
pattern='\b(text|bg|border|ring|outline|placeholder|from|via|to|fill|stroke)-(zinc|stone|emerald|amber|indigo|rose|white|black)(-[0-9]{2,3})?(/[0-9]+)?\b'
count=$(grep -rEo "$pattern" src | wc -l)
if [[ "$count" -gt "$LIMIT" ]]; then
  echo "Raw palette classes: $count (limit $LIMIT). Use the semantic tokens in globals.css." >&2
  exit 1
fi
echo "Raw palette classes: $count (limit $LIMIT)"
```

Files touched in a step are migrated completely in that step. Files not yet touched keep their raw classes until their step, which is why the ratchet exists instead of a big-bang rewrite.

---

## Open questions for the owner

1. **Base and accent.** Adopt the warm neutral (stone) base and the single ink-indigo accent, restricted to interaction (recommended)? Or keep the cool zinc base, or choose a different accent? Either way, the rule "colour never encodes a script, tradition, region or section" is recommended.
2. **Success messages.** Show success ("Published", "Signed out") in the neutral info palette with a plain check (recommended, so green means only `reviewed`)? Or allow green for success?
3. **Name and marks.**
   - (a) Header: Latin wordmark "MoolSutra" only (recommended)?
   - (b) Where should the name appear in Indian scripts (home footer, an about section), and in which scripts? Who checks each spelling? The Idea Thread lists Devanagari, Tamil and Telugu.
   - (c) Should the README keep "(मूलसूत्र)" alone, or list several scripts, or none?
   - (d) Commission an emblem and favicon now, or ship a plain wordmark and a neutral placeholder favicon and decide after Audit 10?
4. **Serif.** Sans only at launch (recommended: no extra families)? Or a serif for excerpts and titles, which needs Noto Serif Devanagari and Noto Serif Tamil as well (Audit 08 cost)?
5. **Original-language term colour.** Same `ink` as the English text, set apart by size and script (recommended)? Or a distinct but non-saffron treatment?
6. **Dark mode in launch scope.** It stays OS-driven (Audit 04 OQ 1). Confirm that the step 9 checklist covers both themes on every page, and that dark-mode defects block launch?
7. **Section colours.** Drop the emerald/indigo identity for Pramaan and Sutra (recommended: sections are named, with icons and subtitles)? Or keep a subtle non-green marker?
8. **Indic readers for visual QA.** Step 9 needs at least one Devanagari reader and one Tamil reader to judge line-height, size balance and rendering on a low-cost Android phone. Who are they?

---

## Decisions (owner, 2026-10-07)

These decisions override the proposals, recommendations and open questions above where they conflict. Nothing above this section has been edited.

### Open question answers

1. **Base and accent:** adopted as proposed. The base is the warm neutral (stone) palette, and a single ink-indigo accent is used only for interaction: links, focus and the selected nav item. Adopted rule: colour never encodes a script, tradition, region, community or section.
2. **Success messages:** shown in the neutral info palette with a plain `Check` icon. Green is reserved for `reviewed` and nothing else.
3. **Name and marks:**
   - (a) The header shows the Latin wordmark "MoolSutra" only.
   - (b) The name in Indian scripts appears only after native readers have checked each spelling. Where it appears is decided after Audit 10.
   - (c) The Devanagari-only "(मूलसूत्र)" is removed from the README title in fix step 9. It stays out until checked forms in several scripts exist.
   - (d) Launch ships the plain wordmark and a neutral placeholder favicon. The emblem is decided after Audit 10.
4. **Serif:** sans only at launch. No serif families.
5. **Original-language term colour:** the same `ink` as English text. The term is set apart by size, script and `lang`, not by colour.
6. **Dark mode:** in launch scope. The step 9 checklist covers both themes on every page, and dark-mode defects block launch.
7. **Section colours:** dropped. Pramaan and Sutra are told apart by name, icon and subtitle only.
8. **Indic readers for visual QA:** one Devanagari reader and one Tamil reader, both still to be found before step 9. They check the pages on a low-cost Android phone at step 9.

### Impact on the fix phase

Changes to the migration plan above and to the fix-phase order as already revised by the Audit 04, 05 and 06 Decisions. Steps still run strictly one at a time, in order (Audit 04 Decision B). No step is added or moved. Audit 10 may still revise steps 5, 6 and 10 (Audit 04 Decision C).

| Step | Change | Decision |
|------|--------|----------|
| Step 1 | The `CLAUDE.md` "Design tokens" rules from the migration plan become owner rules. Rules that change or are added:<ul><li>"Colour never encodes a script, tradition or region" becomes "a script, tradition, region, community or section".</li><li>"Green and check icons only for `reviewed`" is narrowed so that it does not conflict with OQ 2. Green, and check icons on records (`BadgeCheck`, `CheckCircle2`), appear only for `reviewed`. The success `Notice` uses the info palette and a plain `Check`, never green.</li><li>Sans only: no serif family and no `font-serif`.</li><li>Original-language text is `ink`, never a distinct colour.</li><li>The header shows only the Latin wordmark. The name never appears in an Indian script in the UI or the README until native readers have checked each form.</li><li>Dark mode is a launch requirement: every UI change is checked in both themes.</li></ul> | OQ 1-7 |
| Step 2 | No change. The colour token values in the draft `@theme` block are now approved, so the `--ms-*` variables and mappings are added as drafted. The ratchet limit stays 665 | OQ 1 |
| Step 4 | No change to the proposal. `Notice` `success` uses `info-surface`/`info-ink`/`info-line`, the `Check` icon and `role="status"`. No success or green token is added. `StatusBadge` is unchanged: `reviewed` alone uses `status-reviewed`, and it renders nothing at launch | OQ 2 |
| Step 5 | The composer success message ("Published", `ComposeSutra.tsx:302-317`) uses `Notice` `success`. This replaces the emerald box and `CheckCircle2` at `:313`. The emerald focus and picker styling move to the neutral tokens and `accent`, with no section colour | OQ 2, OQ 7 |
| Step 6, fonts | The `next/font` sub-step loads only the three sans families: Noto Sans (`latin`/`latin-ext`), Noto Sans Devanagari and Noto Sans Tamil. No serif family is loaded. The three `font-serif` uses (`PramaanCard.tsx:75,169`, `SutraPostCard.tsx:103`) are removed with the `OriginalTerm` work. No Telugu face is needed, because the name is not shown in Telugu at launch | OQ 3b, OQ 4 |
| Step 6, colour | `OriginalTerm` renders in `ink`. Every `amber-*` treatment of original-script text and citations (V-05) is removed, with no replacement colour. The section identity is removed everywhere: emerald for Pramaan (including the attached-record chip in `SutraPostCard.tsx:92-121`) and indigo for Sutra, in page headers, home sections and cards. The section icons (`BookOpen` for Pramaan, `MessagesSquare` for Sutra, replacing `ShieldCheck` and `Cpu`) are drawn in a neutral ink token, never `accent`. The subtitles are owner copy (Audit 06 OQ 8) | OQ 1, 5, 7 |
| Step 6, brand | The "Brand placeholders" row of the migration plan is narrowed:<ul><li>"MoolSutra" in the Latin family at weight 600 in `ink` replaces the "MS" monogram and the gradient wordmark (`Navbar.tsx:27-32`, `login/page.tsx:77-79`).</li><li>The option to keep the default favicon is dropped. A neutral placeholder replaces the Vercel mark at `src/app/favicon.ico`, for example a one-letter mark in `ink` on `page`, with no symbol from the "Symbols to avoid" list. Its file format and the app-icon file convention are checked in the Next 16 docs at this step.</li><li>The UI gets no form of the name in an Indian script, and no emblem work is done.</li></ul> | OQ 3a, 3b, 3d |
| Step 7 | The sign-in success message and the sign-out status (Audit 06 U-20) use `Notice` `success`. This replaces the emerald box and `CheckCircle2` at `login/page.tsx:94-100`. This only applies the existing step 7 plan to use `Notice` | OQ 2 |
| Step 9, README | The README title becomes "MoolSutra", dropping "(मूलसूत्र)". This adds `README.md:1` to the README rows from the Audit 05 copy review that are already applied here | OQ 3c |
| Step 9, checklist | Both themes on every page is already on the list. Added: any defect in either theme blocks launch, not only defects in light mode. The Devanagari and Tamil checks (record 1 and record 4 cards at 320 and 360 px, line-height, no clipped vowel signs, size balance) are done by the two native readers on the low-cost Android phone that Audit 06 already requires. They also confirm that original-language terms in `ink` stand out enough through size and script alone | OQ 5, 6, 8 |
| Before step 9 | Find the Devanagari and the Tamil reader. Step 9 cannot sign off the Indic checks without them | OQ 8 |
| Audit 08 | Sizes only the three sans families. The serif families in Open question 4 are out of scope | OQ 4 |
| Audit 10 | Adds three questions: where the name appears in Indian scripts and in which scripts; who checks each spelling; and the emblem and final favicon. The multi-script name in the V-08 fix and in brand note 6 waits for these answers | OQ 3b, 3d |
