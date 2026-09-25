# Audit 03 — Security & Auth (application layer)

- **Date:** 2026-09-25
- **Scope:** Application-layer security of branch `phase2-auth` (HEAD `ef5b90f`): auth flows, sessions, the client/server boundary, output handling, mutations, HTTP headers, abuse controls, dependencies, public-repo exposure, Vercel previews, and a day-one Auth checklist for the new Supabase project.
- **Mode:** Read-only. The only network access was `npm audit`. The only file created is this document. No code or config was changed.
- **Out of scope:** Database RLS, grants and functions. Those are covered by Audit 02 (`D-` findings) together with its "Decisions (owner, 2026-09-25)" section, which overrides the proposals above it. This audit cites `D-`/`F-` IDs wherever the app layer depends on them.
- **Severity basis:** The Supabase project is deleted, so nothing is exploitable today. Severities describe the impact **at launch of the new project with the code as it stands on `phase2-auth`**, assuming the Audit 02 corrected schema (with decisions) is deployed.
- **Redactions:** No keys, tokens, or project refs appear in this document. Where a Supabase origin is needed, it is written as `<project-ref>`.
- **This document is public** (the repo is public). It gives no exploit detail beyond what Audit 01 already published.

---

## Summary

1. Most urgent: exact-pinned `next@16.3.1` carries two critical RCE advisories that `npm audit fix` cannot fix (S-01).
2. Every write goes browser → PostgREST, so the composer's auth gate, handle and validation are client-side only and real enforcement must be the Audit 02 DB design (S-03).
3. No abuse controls exist (no CAPTCHA, no post throttle), and the throttle must be a DB trigger because PostgREST bypasses Next (S-02).
4. No CSP or other security headers, while session cookies are JS-readable by design, so any future XSS means account takeover; no sink exists today (S-05, S-18).
5. Auth flows are incomplete: latent F-05 open redirect (tested fix below), confirmation never reaches `/auth/callback`, no password reset (S-04, S-06, S-08).

---

## Threat model

**Who would attack MoolSutra, and why.** The app publishes "verified" claims about contested religious and cultural etymology, and runs a public feed. That profile attracts:

- **Ideological trolls and brigades.** They want to deface or discredit the vault, flood the feed with counter-claims or abuse, and impersonate handles such as `moolsutra`, `admin` or known scholars.
- **Spammers and bots.** They want free, indexed text on a public page (SEO or scam links), and they will script mass sign-ups.
- **Credential stuffers.** They want accounts to reuse elsewhere, and email addresses. Email addresses are personal data under DPDP.
- **Opportunistic scanners.** They mass-exploit known Next.js CVEs regardless of what the app does.
- **A curious insider-level user.** They read this public repo and the audit docs, then hit PostgREST directly with the public anon key to see what the UI is hiding.

**What they want, most valuable first:**
1. Write access that the UI does not offer: posting as someone else, editing the vault, becoming `admin` (D-01, D-02, D-03).
2. Volume: many accounts and many posts.
3. Other users' sessions or emails.
4. The server itself, through framework CVEs.

**Most likely attack paths, in order:**
1. Direct PostgREST calls with the anon key and a self-registered JWT, bypassing every client-side check (S-03, S-02; DB side is D-01/D-03).
2. Scripted sign-ups followed by post flooding (S-02).
3. Known-CVE exploitation of an unpatched Next.js (S-01).
4. Misconfigured Auth redirect allow-list or a preview deployment pointing at production (S-07, checklist).
5. XSS leading to session theft. This is unlikely today because no sink exists, but the impact is high because cookies are not `HttpOnly` (S-05).

---

## Findings table

| ID | Severity | Title | Evidence |
|----|----------|-------|----------|
| S-01 | CRITICAL | `next@16.3.1` has 2 critical advisories; `sharp` (via next) and `js-yaml` (dev) are high. `next` is exact-pinned, so `npm audit fix` cannot fix it | `npm audit` output; `package.json` `"next": "16.3.1"`, `"eslint-config-next": "16.3.1"`; `npm ls js-yaml sharp` |
| S-02 | HIGH | No abuse controls: no CAPTCHA, no post throttle, no app-side rate limit. Everything depends on Supabase defaults (UNVERIFIED) | `login/page.tsx:27-30,51-54` (no `captchaToken`); `ComposeSutra.tsx:172-243`; Audit 02 `create_sutra` (lines 868-902) has no throttle |
| S-03 | MEDIUM | The composer trusts client state for auth, authorship and validation, and uses a non-atomic two-step insert with a silent retry | `ComposeSutra.tsx:50-76,176-179,191-213,220-226,290-297` |
| S-04 | MEDIUM | Open redirect in `/auth/callback` (F-05). Latent, because nothing sets `next` today | `src/app/auth/callback/route.ts:7,13` |
| S-05 | MEDIUM | No security headers at all (CSP, frame-ancestors, HSTS, nosniff, Referrer-Policy, Permissions-Policy). Session cookies are JS-readable, so an XSS becomes a session takeover | `next.config.ts:3-5` (empty); `@supabase/ssr/dist/main/utils/constants.js:7` `httpOnly: false` |
| S-06 | MEDIUM | The email-confirmation round-trip does not complete: no `emailRedirectTo`, the callback is unreachable, PKCE only works in the same browser, and failure is silent | `login/page.tsx:51-54`; `auth/callback/route.ts:9-17`; `@supabase/ssr/dist/main/createBrowserClient.js:40` `flowType: "pkce"` |
| S-07 | MEDIUM (UNVERIFIED) | Vercel preview deployments of a public repo: env var scope, protection and fork-PR handling are unknown. `phase2-auth` is pushed | `git branch -a` shows `remotes/origin/phase2-auth`; no `vercel.json` |
| S-08 | LOW | No password reset, password change or account deletion flow | grep for `resetPasswordForEmail\|updateUser\|emailRedirectTo\|verifyOtp` in `src/`: 0 hits |
| S-09 | LOW | Raw auth and DB error text is shown to users. Account enumeration depends on dashboard settings | `login/page.tsx:33,57`; `pramaan/page.tsx:34,87`; `sutra/page.tsx:36,98`; `ComposeSutra.tsx:216,229,239`; `GoTrueClient.d.ts:298-299` |
| S-10 | LOW | Middleware drops the no-cache headers that `@supabase/ssr` passes with refreshed cookies; the file uses the deprecated `middleware.ts` name (F-11) | `src/middleware.ts:17-27`; `@supabase/ssr/dist/main/types.d.ts:28-52,113-120`; `cookies.js:500` |
| S-11 | LOW | Auth cookie flags: no `Secure`, `maxAge` of 400 days, `HttpOnly` off (the last is by design) | `@supabase/ssr/dist/main/utils/constants.js:4-11`; no `secure` in `cookies.js` (grep) |
| S-12 | LOW | Avatar URL from user-writable `user_metadata` is rendered as `<img src>` without validation | `AuthButtonClient.tsx:18,25` |
| S-13 | LOW | The whole Supabase `User` object (typed `any`) is serialized into client props | `AuthButton.tsx:6-10`; `AuthButtonClient.tsx:8` |
| S-14 | LOW | No DPDP privacy notice at `/login` or at the composer | `login/page.tsx:72-183`; `ComposeSutra.tsx:273-317` |
| S-15 | LOW | Public-repo exposure: audit docs list open weaknesses; no `SECURITY.md`; no Dependabot config; `.env*` also ignores a future `.env.example` | `docs/audits/*`; no `.github/`, no `SECURITY.md`; `.gitignore:34` |
| S-16 | INFO | Client/server boundary is clean: only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` exist, and no server secret is present. No `server-only` guard | `.env.local` var names; grep `process.env` in `src/`; `.next/static` hit |
| S-17 | INFO | CSRF posture is sound today: bearer-token writes, no Server Actions, and the one GET route is PKCE-protected | grep `use server` in `src/`: 0 hits; `next/dist/docs/01-app/02-guides/data-security.md:544-552` |
| S-18 | INFO | No XSS sink and no filter-string injection found | grep `dangerouslySetInnerHTML\|innerHTML\|href={\|src={\|.or(\|.filter(\|textSearch\|rpc(` in `src/` |
| S-19 | INFO | Sign-out is client-only with the default `global` scope; already-issued access JWTs stay valid until they expire | `AuthButtonClient.tsx:12-15`; `GoTrueClient.js:3398` |
| S-20 | INFO | CORS, file uploads, server-side validation: status per the project checklist | `git ls-files`: only one route handler (`src/app/auth/callback/route.ts`), no upload code (grep `upload\|FormData\|storage.from` in `src/`: 0 hits); `.gitignore:34`; Audit 02 D-10 |

---

## Detailed findings

### S-01 — Vulnerable `next`, `sharp`, `js-yaml` (CRITICAL)

`npm audit` (run 2026-09-25) reports 3 vulnerabilities (1 critical, 2 high):

| Package | Installed | Path | Advisories | Fix |
|---------|-----------|------|------------|-----|
| `next` | 16.3.1 (direct, exact pin) | — | GHSA-p293-qw3h-jr36 (unauthenticated RCE on Windows-hosted servers), GHSA-2xp9-vwfh-vxw4 (unauthenticated RCE in the Image Optimization API with AVIF), both `>=16.0.0 <16.3.3` | 16.3.6 (npm reports "outside the stated dependency range" because of the exact pin) |
| `sharp` | 0.35.3 | `next@16.3.1 > sharp` | GHSA-rgj7-g3m4-5g8c (libheif) | `>=0.35.4` |
| `js-yaml` | 4.3.1 | `eslint > @eslint/eslintrc > js-yaml` (dev only) | GHSA-2883-xcg3-v3hh (CPU DoS) | `>=4.3.2` |

- Whether either `next` advisory is reachable on Vercel depends on the hosting OS and on how the image optimizer is served. This audit cannot check either, so the severity is not lowered on that basis.
- The app does not import `next/image` (grep), but the `/_next/image` endpoint is part of the framework. Whether it is active on this deployment is **UNVERIFIED**.
- `js-yaml` is a dev and lint-time dependency. It is not shipped, so its risk is low.
- "Outdated" packages: `npm outdated` needs network access beyond `npm audit`, so it was not run. Which other dependencies are behind their latest release is **UNVERIFIED**.

**Fix:**
1. Bump `next` and `eslint-config-next` together to the same patched version (16.3.6 or later), keeping exact pins if you prefer them.
2. Run `npm install`, then `npm audit fix` for the transitive `js-yaml`.
3. Re-run `npm audit`. Whether `sharp` resolves after the Next upgrade is **UNVERIFIED**; if it does not, add an `overrides` entry for `sharp`.
4. Rebuild, and re-check that lint still passes (F-04).
5. Turn on Dependabot alerts and security updates in the GitHub repo settings (see S-15).

### S-02 — No abuse controls (HIGH)

**What the app does:** nothing.
- Sign-in and sign-up call Supabase directly from the browser with no `captchaToken` (`login/page.tsx:27-30,51-54`).
- The only throttling in the UI is a `loading` flag that disables the buttons (`login/page.tsx:15,152,162`), which a script ignores.
- Posting has no limit beyond the UI's four-card cap (`ComposeSutra.tsx:147-151`).

**Why an app-side limiter alone would not help:** the browser talks to PostgREST at `https://<project-ref>.supabase.co` with the public anon key plus the user's JWT (`utils/supabase/client.ts:4-7`). Anyone can replay those calls with `curl` and skip Next entirely. Under the corrected schema:
- `authenticated` keeps a direct column INSERT on `sutra_posts` (Audit 02, consequence 3 impact table: `grant insert (attached_pramaan_id, default_language_code)`), plus EXECUTE on `create_sutra`.
- A throttle that lives only inside `create_sutra` is therefore bypassable through a direct `insert`.

**Card flooding** is already bounded per post: `card_order BETWEEN 1 AND 4` plus `UNIQUE (post_id, card_order)` (Audit 02, dump 3685 and 4826-4827, carried into the corrected schema). Card volume is therefore at most 4 times post volume, and a post throttle bounds both.

**Fix, in order of value:**
1. **Keep email confirmation on** (checklist). An unconfirmed user gets no session, so cannot write at all.
2. **DB throttle trigger** on `public.sutra_posts BEFORE INSERT`, in migration 0004. It should count the caller's posts in a recent window, for example:
   - `select count(*) from public.sutra_posts where author_id = auth.uid() and created_at > now() - interval '10 minutes'`
   - raise `42501`/`P0001` with a generic message above a limit (for example 5 per 10 minutes and 30 per day; this is the owner's call).
   - The existing `sutra_posts_before_insert` trigger is the natural place.
   - The count needs an index on `(author_id, created_at)` (Audit 02 D-13 already proposes an `author_id` index).
   - Because the trigger fires on both the direct INSERT and the insert inside `create_sutra`, it cannot be bypassed.
3. **CAPTCHA** (Cloudflare Turnstile or hCaptcha) on sign-up, sign-in and (later) password reset.
   - Enable it in Supabase Auth, then pass `options: { captchaToken }` to `signUp`, `signInWithPassword` and `resetPasswordForEmail`. `captchaToken` is a supported option (`GoTrueClient.d.ts:220`).
   - Availability on the free plan: **UNVERIFIED**.
   - Once enabled, update the CSP (S-05) with the provider's script and frame origins.
4. **Supabase Auth rate limits:** review and tighten them in the dashboard (checklist). The defaults and the configurable ranges are **UNVERIFIED**; record the values you set.
5. **Custom SMTP.** The built-in email sender is not meant for production. Its limits are **UNVERIFIED**; record them. A custom SMTP provider also stops one attacker from exhausting the sign-up email quota for everyone.
6. Later, when moderation arrives: a `banned` flag checked in RLS or the trigger, and an admin-only way to set it (D-02 style column grants).

### S-03 — Composer trusts client state (MEDIUM)

`ComposeSutra.tsx`:
- **Auth gate is UI only.** `getUser()` at line 54 and `onAuthStateChange` at line 66 set `user`. Publishing is blocked only by `if (!user)` at lines 176-179. Real enforcement is RLS plus the INSERT grant (D-01, fixed in Audit 02's 0004). Keep the UI gate for user experience, and treat it as nothing more.
- **Authorship is client-controlled.** The handle is an editable input (lines 290-297), seeded from the email local part (lines 57, 69), and sent as `author_handle` (line 192). Decision C drops the column. After that, the insert **fails** with this payload (Audit 02 compatibility table Q4). Remove the input, and show `profiles.handle` read from the DB.
- **No length validation.** There is no `maxLength` on the card textareas (line 337). The DB CHECK is 500 characters (decision OQ 7). Add `maxLength={500}` for user experience; the DB remains the authority.
- **Silent retry path.** Lines 206-213 retry the insert with a different column name whenever the first insert fails for any reason, including RLS denial. Remove it (F-13).
- **Non-atomic write** at lines 202 and 226 (F-10/D-15).

**Fix:** replace lines 190-230 with a single `supabase.rpc('create_sutra', { p_cards: validCards, p_attached_pramaan_id: selectedPramaan?.id ?? null })`, using the post-decision signature `create_sutra(text[], uuid, text)`. On error, show a generic message (see S-09).

**Severity note:** this is MEDIUM rather than CRITICAL only because the corrected schema moves enforcement into the DB. If the app ships against a schema without D-01/D-03 fixed, this becomes CRITICAL (F-01).

### S-04 — Open redirect in `/auth/callback` (MEDIUM, latent) — F-05 exact fix

`route.ts:7` reads `next` from the query string, and line 13 redirects to `` `${origin}${next}` ``. String concatenation lets `next=@evil.com` produce a URL whose host is `evil.com` (Audit 01).

**Why it is latent:** nothing in `src/` sets `next`, and `signUp` sends no `emailRedirectTo` (S-06). So no legitimate flow carries `next` today. The attack becomes practical once any code forwards `next` or `emailRedirectTo` from user input, for example `/login?next=...`. **This fix is mandatory before that plumbing lands.**

**Exact fix:** resolve the value against the request origin, then verify the result is same-origin. This was tested locally with `node`. Every input below resolved to `https://<origin>/`, apart from the legitimate `/sutra?x=1#y` and two percent-encoded paths that stay on the origin:

`@evil.com`, `//evil.com`, `/\evil.com`, `/\/evil.com`, `/..//evil.com`, `/sutra/..//evil.com`, `/%2e%2e//evil.com`, `/./\evil.com`, `/\t/evil.com`, `/\n/evil.com`, `https://evil.com`, `javascript:alert(1)`, `" /x"`, empty, `null`.

`/%2F%2Fevil.com` and `/%5Cevil.com` stay on the origin as literal encoded paths.

**Do not simplify this to returning `pathname + search + hash`.** `/..//evil.com` normalises to the pathname `//evil.com`, which a later `new URL(path, origin)` resolves to `evil.com`. The version below returns the verified `URL` object and rejects `//`-leading pathnames.

```ts
// src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

function safeRedirect(raw: string | null, origin: string): URL {
  const fallback = new URL("/", origin);
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return fallback;
  }
  let url: URL;
  try {
    url = new URL(raw, origin);
  } catch {
    return fallback;
  }
  if (url.origin !== origin || url.pathname.startsWith("//")) return fallback;
  return url;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(safeRedirect(searchParams.get("next"), origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth_callback", origin));
}
```

- Take `origin` from `request.url` only. Do **not** rebuild it from `X-Forwarded-Host`, which the client may control depending on the proxy.
- Optionally tighten further with a path allow-list (`/`, `/sutra`, `/pramaan`) if `next` is only ever one of a few pages.
- On failure, redirect to `/login?error=auth_callback`, and have `/login` show a fixed, generic message for that code. Today a failed exchange silently lands on `/` (line 17).

### S-05 — No security headers; JS-readable session cookies (MEDIUM)

`next.config.ts:3-5` is empty, and nothing in `src/middleware.ts` sets response headers. As a result:
- No `Content-Security-Policy`.
- No `frame-ancestors` or `X-Frame-Options`, so `/login` and the composer can be framed (clickjacking).
- No `Strict-Transport-Security`. What Vercel adds on its own domains is **UNVERIFIED**.
- No `X-Content-Type-Options`, no `Referrer-Policy` (the browser default applies), no `Permissions-Policy`.
- `X-Powered-By: Next.js` is on by default (`poweredByHeader` doc).

**Why this matters more than usual:** `@supabase/ssr` writes the session (access and refresh token) to cookies with `httpOnly: false` (`utils/constants.js:7`). This is intentional, because the browser client must read them. The consequence is that any script running on the origin can read the refresh token and keep the session after the tab closes. CSP is the main control standing between an XSS bug and account takeover.

**Fix (two layers):**

1. **Static headers** via `headers()` in `next.config.ts` for `source: '/(.*)'`, plus `poweredByHeader: false`:
   - `X-Frame-Options: DENY` (legacy backup for `frame-ancestors`)
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()`. Phase 2 oral recordings will need `microphone=(self)` on the recording route only.
   - `Strict-Transport-Security: max-age=63072000; includeSubDomains`. Add `preload` only after deciding the production domain; preload is hard to undo.

2. **Nonce-based CSP in the proxy.** The root layout renders `AuthButton`, which reads cookies (`layout.tsx:21`, `AuthButton.tsx:5-8`), so every page already renders dynamically. That makes the nonce approach in `next/dist/docs/01-app/02-guides/content-security-policy.md:34-68,181-193` feasible, without the `'unsafe-inline'` fallback shown at lines 417-446. Generate a nonce per request in `proxy.ts`, set `x-nonce` on the forwarded request headers, and send:

   ```
   default-src 'self';
   script-src 'self' 'nonce-<n>' 'strict-dynamic';
   style-src 'self' 'nonce-<n>';
   img-src 'self' data: blob:;
   font-src 'self';
   connect-src 'self' https://<project-ref>.supabase.co wss://<project-ref>.supabase.co;
   object-src 'none';
   base-uri 'self';
   form-action 'self';
   frame-ancestors 'none';
   upgrade-insecure-requests;
   ```

   - In development only, add `'unsafe-eval'` to `script-src` (docs line 42).
   - Ship it as `Content-Security-Policy-Report-Only` first, fix any violations, then enforce.
   - Integrate it with the Supabase cookie refresh. The nonce request headers must be passed into the same `NextResponse.next({ request: { headers } })` that `setAll` rebuilds (`middleware.ts:21-23`); otherwise the refresh drops them.
   - Adding CAPTCHA (S-02) needs the provider's origins in `script-src`/`frame-src`/`connect-src`.
   - Allowing external avatars (S-12) would need `img-src` entries.
   - Vercel preview toolbars inject scripts, so previews may need their own policy (**UNVERIFIED**).

### S-06 — Email confirmation round-trip incomplete (MEDIUM)

Evidence:
- `signUp` passes only `{ email, password }` (`login/page.tsx:51-54`), with no `options.emailRedirectTo`.
- Per the `signUp` doc (`GoTrueClient.d.ts:292-296`), confirmation redirects to the Site URL by default. The app has no handler there: `/` is `src/app/page.tsx`, a static landing page.
- The browser and server clients use `flowType: "pkce"` (`createBrowserClient.js:40`, `createServerClient.js:33`). The `code` is only exchangeable with the code verifier stored in the **same browser**. A user who confirms on their phone after signing up on a laptop cannot complete the exchange.
- `/auth/callback` is therefore never reached in the normal flow. When it is reached and the exchange fails, it silently redirects to `/` (`route.ts:17`).
- Where the Site URL points in the new project, and whether confirmation completes sign-in, is **UNVERIFIED**.

**Risk:** confirmation is the main anti-abuse gate (S-02). A confusing confirmation experience creates pressure to switch confirmation off. Switching it off also turns on sign-up enumeration (S-09).

**Fix:**
1. Add a `src/app/auth/confirm/route.ts` that reads `token_hash` and `type` and calls `supabase.auth.verifyOtp({ token_hash, type })`. `VerifyTokenHashParams { token_hash, type }` exists at `auth-js/dist/main/lib/types.d.ts:724-728`. This flow does not depend on the PKCE verifier cookie, so it works across browsers.
2. Change the "Confirm signup" (and later "Reset password") email templates in the dashboard to link to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`. The template variable names are **UNVERIFIED** against current Supabase docs; confirm them in the dashboard editor.
3. Use the same `safeRedirect` helper as S-04 for any `next` on `/auth/confirm`.
4. Pass ``options.emailRedirectTo: `${location.origin}/auth/callback` `` (or `/auth/confirm`) in `signUp`, and make sure that exact URL is in the Redirect URL allow-list.
5. Keep `/auth/callback` for PKCE and OAuth, with the S-04 fix.

### S-07 — Vercel preview deployments (MEDIUM, UNVERIFIED)

Confirmed from the repo:
- The repo is public (per the audit brief).
- `phase2-auth` exists on the remote (`remotes/origin/phase2-auth`).
- There is no `vercel.json`.

Everything else is **UNVERIFIED**, because the Vercel dashboard is not visible from the repo:
- whether the Git integration is connected;
- whether a preview for `phase2-auth` exists and at what URL;
- which environments `NEXT_PUBLIC_SUPABASE_*` are scoped to;
- whether Deployment Protection is on for previews;
- whether fork-PR builds need authorization.

**Risks if the defaults are loose:**
- If the Supabase env vars are scoped to "Preview" and point at the **production** project, every pushed branch deploys unreviewed code against production users and data, at a public `*.vercel.app` URL.
- Preview origins are not in the Auth redirect allow-list. Adding a broad wildcard such as `https://*.vercel.app/**` to fix that would allow redirects to **any** Vercel customer's deployment. PKCE limits what a stolen `code` is worth, but the implicit and magic-link flows and the reset flow still rely on the allow-list.
- A public repo can receive fork PRs. If fork builds run with project env vars, a contributor's code runs with your preview configuration.

**Fix:**
1. Use a **separate** Supabase project (or a Supabase branch) for Preview and Development. Scope the production URL and key to "Production" only.
2. Never add a secret or `service_role` key to any environment unless there is server code that needs it. Never prefix it `NEXT_PUBLIC_`.
3. Turn on Deployment Protection (Vercel Authentication) for previews. Which plans include it by default is **UNVERIFIED**.
4. Keep fork-PR builds behind manual authorization.
5. In the allow-list, use only exact URLs: production URLs on the production project, and exact per-branch preview URLs (or a custom preview domain you own) on the preview project. A glob such as `https://moolsutra-*-<team-slug>.vercel.app/**` is **UNVERIFIED-safe**: whether another Vercel account could claim a hostname matching it cannot be checked from here, so avoid it.
6. Record all of the above in the answers to the open questions.

### S-08 — No password reset, change, or account deletion (LOW)

- A grep of `src/` for `resetPasswordForEmail|updateUser|emailRedirectTo|verifyOtp` returns **0 hits**.
- `/login` has only Sign In and Sign Up (`login/page.tsx:150-167`).
- A user who forgets their password has no recovery path. There is also no way to change a password or delete an account. The account-deletion gap matters for DPDP erasure; D-05 fixes the DB side.

**Fix, when building it:**
- Reset request page: call `resetPasswordForEmail(email, { redirectTo: <origin>/auth/confirm?next=/account/password, captchaToken })`. Always show the same "If an account exists, we've sent a link" message.
- `/auth/confirm` verifies `type=recovery`, then `/account/password` calls `updateUser({ password })`.
- Turn on "Secure password change" / reauthentication in Auth settings (availability **UNVERIFIED**).
- Account deletion requires the `service_role` key, so it must run server-side: a Route Handler or Server Action that calls `auth.getUser()`, then uses a server-only admin client. See S-16 for the guard.

### S-09 — Raw error text and account enumeration (LOW)

- **Auth errors are shown verbatim:** `setMessage({ text: error.message })` at `login/page.tsx:33` and `:57`. Users see strings such as "Email not confirmed" (error code `email_not_confirmed` exists in `lib/error-codes.d.ts:6`). That message confirms an unconfirmed account exists for the email, even without the password.
- **Sign-up enumeration depends on the dashboard.** Per `GoTrueClient.d.ts:298-299`, `signUp` on an existing confirmed email returns an obfuscated fake user only when **both** "Confirm email" and "Confirm phone" are enabled, even if the phone provider is disabled. Otherwise it returns `User already registered`. The app currently relays either (`:57` or the "Account created!" branch at `:64-67`).
- **DB errors are shown to every visitor:** `pramaan/page.tsx:34,87` and `sutra/page.tsx:36,98` render `error.message` inside a "Database Notice" box, with table names (lines 90, 101). `ComposeSutra.tsx:216,229,239` shows PostgREST messages from the insert (D-11).

**Fix:**
- Map auth error `code` values to fixed messages. Sign-in: "Email or password is incorrect" for both `invalid_credentials` and `email_not_confirmed`, plus a separate "Resend confirmation" action that always answers generically.
- Sign-up: always show "Check your email to continue".
- Enable both confirm settings (checklist).
- Replace the page-level `fetchError` rendering with a generic "Couldn't load right now" message, and log details server-side only.

### S-10 — Middleware drops no-cache headers; deprecated file convention (LOW)

- `@supabase/ssr` 0.12.4 calls `setAll(cookiesToSet, headers)` with `Cache-Control: private, no-cache, no-store, must-revalidate, max-age=0`, `Expires: 0` and `Pragma: no-cache` (`cookies.js:500`). Its types warn that responses carrying refreshed auth cookies must not be cached by a CDN, "otherwise one user's session token can be served to a different user" (`types.d.ts:28-33`), and the example applies the headers to the response (`:42-48`).
- `src/middleware.ts:17-27` ignores the second argument.
- Today every page is dynamic (S-05 reasoning), which lowers the chance that the response is cached. The actual Vercel cache behaviour for these responses is **UNVERIFIED**.
- `middleware.ts` is deprecated in Next 16 in favour of `proxy.ts` (F-11).
- The middleware calls `getUser()` on every matched request (`:33`), which is a network round-trip to Supabase Auth whenever a session cookie is present. `getClaims()` exists in this `auth-js` (`GoTrueClient.d.ts:2538`) and is recommended alongside `getUser()` in the `getSession` notice (`:1408,1413`). With asymmetric signing keys it can verify locally. Whether the new project uses asymmetric keys is **UNVERIFIED**. `getUser()` is the safe choice until then.

**Fix:**
1. Rename to `src/proxy.ts` with `export async function proxy(...)` (codemod in F-11).
2. In `setAll(cookiesToSet, headers)`, after setting cookies, add `Object.entries(headers).forEach(([k, v]) => supabaseResponse.headers.set(k, v))`.
3. Merge the CSP work from S-05 into the same file.
4. Keep `getUser()` (or `getClaims()` once asymmetric keys are confirmed). Never use `getSession()` for authorization on the server. The code currently never calls `getSession()` (grep).

### S-11 — Cookie flags (LOW)

`DEFAULT_COOKIE_OPTIONS` = `{ path: "/", sameSite: "lax", httpOnly: false, maxAge: 400 days }` (`utils/constants.js:4-11`). No `secure` appears anywhere in `cookies.js` (grep).

- `httpOnly: false` is required by the browser client. The compensating control is CSP (S-05).
- `SameSite=Lax` is appropriate.
- A missing `Secure` means a plain-HTTP request to the domain (before any HSTS applies) would carry the tokens. `maxAge` only bounds the cookie; the real session lifetime is the refresh-token and session policy (checklist).

**Fix:** pass `cookieOptions: { secure: process.env.NODE_ENV === "production" }` to `createBrowserClient` and to both `createServerClient` calls (`utils/supabase/client.ts`, `utils/supabase/server.ts`, `middleware.ts`), and ship HSTS (S-05). Whether `cookieOptions` merges `secure` into every write path is **UNVERIFIED**; confirm in the browser devtools after the change.

### S-12 — Unvalidated avatar URL (LOW)

`AuthButtonClient.tsx:18` reads `user.user_metadata?.avatar_url`, and `:25` renders `<img src={avatarUrl}>`. Any user can write their own `user_metadata` (via `signUp` `options.data` or `updateUser`).

- Today the avatar is shown only to its owner, so the impact is self-only.
- `img` does not execute `javascript:` URLs in current browsers.
- Once avatars are shown to other users, an arbitrary `https://` URL lets the poster log every viewer's IP address and user agent.

**Fix:**
- Read the avatar from `profiles.avatar_url`, which the Audit 02 corrected schema limits to `^https://` and 500 characters. Do not read it from `user_metadata`.
- Restrict `img-src` in the CSP to your own storage origin, once avatars are uploaded to Supabase Storage rather than hot-linked.
- Until then, render the avatar only when the URL starts with `https://`.

### S-13 — Whole `User` object sent to the client (LOW)

`AuthButton.tsx:10` passes `user` (the full `User`: `app_metadata`, `user_metadata`, `identities`, `phone`, timestamps) into a `"use client"` component typed `user: any` (`AuthButtonClient.tsx:8`). It is serialized into the RSC payload. It goes only to the same user, so nothing leaks today. The pattern will leak, though, once a server component passes another user's record the same way.

**Fix:** pass only `{ email, avatarUrl }` (or `{ handle, avatarUrl }` from `profiles`). Type the prop, and never pass raw auth or DB rows to client components.

### S-14 — No privacy notice (LOW, DPDP)

The DPDP checklist is triggered: a login form collects email and password, the DB stores user-submitted posts, and handles are public. Neither `/login` (`page.tsx:72-183`) nor the composer (`ComposeSutra.tsx:273-317`) says what is collected, that posts and handles are public, how long data is kept, or how to delete it. See Audit 02 "DPDP notes".

**Fix:** add a short notice with a link to a privacy page at both collection points. Pair it with S-08 account deletion and the D-05 erasure fix.

### S-15 — Public-repo exposure (LOW)

- **Secrets:** a count-only check of `git log --all -p` for the old project ref and the old anon key finds **0 hits** for each, including the two newest commits (F-18 still holds). `.env.local` is ignored (`.gitignore:34`).
- **Audit docs** (`docs/audits/01-*.md`, `02-*.md`, and this file) publish the full intended RLS design, the known weaknesses of the deleted schema, and open items such as "no CAPTCHA" and "no rate limit". Security should not depend on hiding the design, and the schema is public by design. The practical risk is **timing**: if the new project launches before these fixes, the docs are a checklist of what is open.
- Audit 01 publishes the owner's local home path (`01-repo-baseline.md:4`) and the mistyped commit email. F-19 is resolved for the two newest commits (`git log --all --format='%ae'` shows the corrected address on `ca94f63` and `ef5b90f`); the four older commits keep the typo.
- There is no `SECURITY.md`, no `.github/` directory (so no Dependabot config), and no CI (F-21). GitHub secret scanning and push protection status: **UNVERIFIED**.
- `.gitignore:34` `.env*` would also ignore a future `.env.example`, so contributors would not see the variable names except in the README (`README.md:70-72`).

**Fix:**
- Launch the new project only after the S-01 to S-05 and D-01 to D-06 fixes land. Every branch of a public repo is public: `git branch -r --contains ef5b90f` shows Audit 02 (and `ca94f63`) already on `origin/phase2-auth`. If future audits should stay private until fixes ship, keep them in a private repo or a gitignored path such as `docs/context/`. Removing a doc from HEAD does not remove it from history or from existing clones.
- Add `SECURITY.md` with a contact address.
- Enable Dependabot alerts and security updates, secret scanning and push protection in the repo settings.
- Add `!.env.example` to `.gitignore` if you want an example file.
- Optionally redact the home path from Audit 01.

### S-16 — Client/server boundary (INFO)

- `src/` reads only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (grep `process.env`: `middleware.ts:10-11`, `utils/supabase/server.ts:8-9`, `utils/supabase/client.ts:5-6`, `lib/supabaseClient.ts:1,5-6`). `.env.local` defines only those two names (names checked, values not printed).
- Both are public by design. A local `.next/static` chunk contains the project URL, which confirms the inlining mechanism. The local `.next` may be a dev build, so this says nothing about what is deployed.
- No `service_role` or secret key exists anywhere, so none can be bundled.
- Client components (11, from grep `"use client"`): `SearchBar`, `SutraPostCard`, `login/page`, `PramaanVaultView`, `ComposeSutra`, `Navbar`, `ThemeToggle`, `PramaanCard`, `ScriptToggle`, `ScriptContext`, `AuthButtonClient`.
  - None receives data beyond public vault or feed rows and the current user's own `User` (S-13).
  - `ComposeSutra` fetches the full vault in the browser (`:88-104`), which is public by decision.
- `src/lib/supabaseClient.ts` is a module-level anon client used by server pages (F-08). It carries no user session, so it cannot leak one user's data to another.

**Fix (preventive):**
- Add `import "server-only"` at the top of `src/utils/supabase/server.ts` and of any future admin-client module.
- Name the secret key without `NEXT_PUBLIC_` (for example `SUPABASE_SECRET_KEY`).
- If the new project issues the newer publishable/secret key format, use the publishable key in place of the anon key (format and defaults **UNVERIFIED**).
- Remove the `console.log` at `supabaseClient.ts:1` (F-12).

### S-17 — CSRF posture (INFO)

- There are no Server Actions (grep `use server`: 0 hits) and one Route Handler, `GET /auth/callback`.
- All writes go browser → Supabase with the JWT in an `Authorization` header, not an ambient cookie, so cross-site forms cannot trigger them.
- The callback's state change (setting a session) needs a `code` that matches the PKCE verifier in the victim's own browser, which blocks login-CSRF with an attacker's code.
- For future Server Actions: Next compares `Origin` with `Host`/`X-Forwarded-Host` and allows only POST (`data-security.md:544-552`). Still check auth inside every action (`:281-291`), and do not widen `serverActions.allowedOrigins`.

### S-18 — XSS and injection (INFO)

- There are no `dangerouslySetInnerHTML`, `innerHTML`, or `eval` calls in `src/`.
- All user content (`SutraPostCard.tsx:81`, handles `:51,56`, vault fields in `PramaanCard.tsx`) renders as React text children, which React escapes.
- All `href` values are constants (`Navbar.tsx:42,72`, and literal `Link` targets).
- The only `src` from data is S-12.
- Search is an in-memory filter (`PramaanVaultView.tsx:15-40`, `ComposeSutra.tsx:160-169`). No user input reaches `.or()`, `.filter()`, `textSearch` or `rpc()` strings.
- **For Phase 2 search (pg_trgm):** pass user input as RPC parameters. Never interpolate it into PostgREST filter strings such as ``.or(`title.ilike.%${q}%`)``, where commas and parentheses change the filter.

### S-19 — Sign-out semantics (INFO)

- `AuthButtonClient.tsx:13` calls the browser `signOut()`, whose default scope is `global` (`GoTrueClient.js:3398`). That revokes the user's refresh tokens on all devices, then clears the JS-readable cookies.
- An access JWT already issued stays valid at PostgREST until `exp`, because PostgREST checks only the signature and expiry.

**Fix:** keep the JWT expiry short (checklist). If "sign out this device only" is wanted, pass `{ scope: 'local' }`.

### S-20 — Checklist items: CORS, uploads, validation (INFO)

- **CORS:** the app has no Next API routes that other origins call. Supabase's API CORS settings are **UNVERIFIED**. Security there rests on RLS and grants (Audit 02), not on origin checks, because the anon key is public.
- **File uploads:** none exist. Phase 2 audio will need server-enforced size and MIME limits (Storage bucket settings plus RLS), which should be designed with D-20.
- **Server-side validation:** it lives in DB CHECKs and triggers (Audit 02 D-10, decision OQ 7), which is the only server that sees every write. Client checks are for user experience only.
- **RLS on every table:** covered by Audit 02.
- **Secrets gitignored:** yes (`.gitignore:34`).
- **Rate limiting:** see S-02.

---

## Auth flow walkthrough

Weak points are marked **[S-xx]**.

### Sign-up (`/login`, "Sign Up")
1. The user types an email and password. The only check is client-side non-empty (`login/page.tsx:45-48`). There is no password guidance, no CAPTCHA **[S-02]** and no privacy notice **[S-14]**.
2. `supabase.auth.signUp({ email, password })` is called from the browser, with PKCE (`createBrowserClient.js:40`) and no `emailRedirectTo` **[S-06]**. Supabase applies its password policy and rate limits (dashboard, **UNVERIFIED**).
3. The DB trigger `handle_new_user` creates `profiles` with a `user_<hex>` handle (Audit 02 corrected design, D-04).
4. The UI branches:
   - error: raw message shown **[S-09]**;
   - `data.session` present (confirmation off): redirect to `/sutra`;
   - otherwise: "Check your email".
   Existing accounts may be distinguishable here, depending on the confirm settings **[S-09]**.

### Email confirmation
5. The email link goes to Supabase `/verify`, then redirects to the Site URL with `?code=` **[S-06]**. `/` does not handle it, so the session is not established, but the address is confirmed.
6. If the user opens the link in another browser, even a `/auth/callback` target would fail, because the PKCE verifier is missing **[S-06]**.
7. The user returns to `/login` and signs in.

### Sign-in (`/login`, "Sign In")
8. `signInWithPassword` is called from the browser. There is no CAPTCHA; brute force is limited only by Supabase's per-IP limits **[S-02]**. The raw error message is shown **[S-09]**.
9. On success, `@supabase/ssr` writes the session to cookies: `SameSite=Lax`, not `HttpOnly`, not `Secure`, 400-day `maxAge` **[S-11]**. The client then runs `router.push('/sutra')` and `router.refresh()`.

### Every request
10. `middleware.ts` runs on all non-asset paths and calls `getUser()`. If the access token expired, it refreshes it and writes new cookies, but without the no-cache headers **[S-10]**. It is also the deprecated file convention **[S-10]**. No headers are set **[S-05]**.
11. The root layout's `AuthButton` (server) calls `getUser()` and passes the full `User` to the client **[S-13]**. The avatar renders unvalidated **[S-12]**.
12. The server pages `/pramaan` and `/sutra` read through the cookie-less anon client (F-08) and render raw DB errors on failure **[S-09]**.

### Posting
13. `ComposeSutra` checks `getUser()` and `onAuthStateChange` in the browser **[S-03]**, and lets the user edit the handle **[S-03]**.
14. It makes two separate inserts from the browser straight to PostgREST, with a silent retry **[S-03]**. There is no throttle **[S-02]**. Under the corrected schema, RLS plus `sutra_posts_before_insert` set `author_id = auth.uid()`, and the CHECKs enforce limits (D-01, D-03, D-10).

### `/auth/callback`
15. `?code=` is exchanged for a session using the PKCE verifier cookie. Then the app redirects to `${origin}${next}` **[S-04]**. On failure it silently redirects to `/` **[S-04]**.

### Sign-out
16. The browser calls `signOut()` (global scope), then `router.refresh()`. Issued JWTs stay valid until they expire **[S-19]**.

### Password reset
17. **Does not exist [S-08].**

---

## Day-one Supabase Auth hardening checklist (new project)

Record the chosen value next to each item. No limits, defaults or plan tiers are quoted from memory. Anything marked **UNVERIFIED** must be checked in the dashboard, and its value recorded.

**URL configuration**
- [ ] **Site URL:** set to the exact production origin (`https://<prod-domain>`). Do not use `localhost`.
- [ ] **Redirect URLs allow-list:** exact entries only.
  - `https://<prod-domain>/auth/callback` and `https://<prod-domain>/auth/confirm`.
  - No `https://*.vercel.app/**`.
  - `localhost` entries belong only in the development/preview project (S-07).

**Email provider**
- [ ] **Confirm email: ON.**
- [ ] **Confirm phone: ON** as well, even though phone is disabled, so that `signUp` obfuscates existing accounts (`GoTrueClient.d.ts:298`) **[S-09]**.
- [ ] **Secure email change** (confirm on both old and new address): ON. Availability and default **UNVERIFIED**.
- [ ] **Secure password change / reauthentication** for password updates: ON. Availability **UNVERIFIED**.
- [ ] **Email templates:** "Confirm signup" and "Reset password" link to `/auth/confirm?token_hash=…&type=…` **[S-06]**. Template variable names **UNVERIFIED**.
- [ ] **Custom SMTP** configured before launch. Built-in sender limits **UNVERIFIED**.

**Providers and sign-up**
- [ ] Disable every provider not in use: phone, anonymous sign-ins, all OAuth. Manual identity linking OFF.
- [ ] "Allow new users to sign up": ON only when you are ready. Consider OFF until the S-01 to S-05 fixes ship.

**Password policy**
- [ ] Minimum length raised above the default (for example 10 or more) and character requirements set. Configurable options and default **UNVERIFIED**.
- [ ] **Leaked password protection** (HaveIBeenPwned): ON if the plan allows. Plan availability **UNVERIFIED**.

**Attack protection**
- [ ] **CAPTCHA** (Turnstile or hCaptcha) enabled, with the app passing `captchaToken` **[S-02]**. Free-plan availability **UNVERIFIED**.
- [ ] **Rate limits** reviewed and tightened: sign-up/sign-in per IP, token refresh, OTP/verify, emails sent per hour. Defaults and ranges **UNVERIFIED**; record them.

**Sessions and JWT**
- [ ] **JWT expiry:** keep it short (the current default is **UNVERIFIED**; 1 hour or less is a reasonable target) **[S-19]**.
- [ ] **Refresh token rotation:** ON, with a short reuse interval. Default **UNVERIFIED**.
- [ ] **Session time-box / inactivity timeout / single session per user:** set if available. Plan availability **UNVERIFIED**.
- [ ] **JWT signing keys:** note whether the project uses asymmetric keys, since this decides `getClaims()` vs `getUser()` in the proxy **[S-10]**. Default for new projects **UNVERIFIED**.
- [ ] **API keys:** note whether the project issues the publishable/secret key format, and use the publishable key client-side. The secret key is never set in Vercel "Preview", and never with a `NEXT_PUBLIC_` prefix **[S-16]**.

**Project-wide**
- [ ] Region `ap-south-1` (decision OQ 11).
- [ ] Run the Security Advisor / linter after the migrations, and record the output (**UNVERIFIED** tool name and availability).
- [ ] MFA (TOTP) enabled for the **owner's Supabase dashboard account** and the owner's GitHub and Vercel accounts.
- [ ] Separate project for Preview/Development **[S-07]**.

---

## Open questions for the owner

1. **Vercel:** is the Git integration connected? Does a `phase2-auth` preview exist? Which environments are `NEXT_PUBLIC_SUPABASE_*` scoped to? Is Deployment Protection on for previews, and do fork PRs need authorization? **[S-07]**
2. **Production domain:** what is it? This is needed for Site URL, the allow-list, HSTS `preload`, and CSP.
3. **Preview/dev backend:** will you run a second Supabase project (or a branch) for previews and local development, or should previews be disabled until then?
4. **Post throttle numbers:** for example 5 posts per 10 minutes and 30 per day. Should the limit be stricter for accounts younger than N days? **[S-02]**
5. **CAPTCHA provider:** Turnstile or hCaptcha? Is adding the provider's script to the CSP acceptable? **[S-02, S-05]**
6. **Password reset and account deletion:** are both in scope before public launch? Deletion needs server code with the secret key (the first server-only secret) **[S-08]**.
7. **Sign-up at launch:** open, invite-only, or closed until the fixes ship? **[checklist]**
8. **Audit docs visibility:** keep them public, or put future audits in a private repo or gitignored path until the new project is hardened? Audits 01-02 are already public on `origin/phase2-auth`. **[S-15]**
9. **Avatars:** are they a feature? If yes, uploaded to Supabase Storage (recommended), or hot-linked URLs? **[S-12]**
10. **Sign-out scope:** all devices (current default) or this device only? **[S-19]**
