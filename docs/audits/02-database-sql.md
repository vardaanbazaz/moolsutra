# Audit 02 — Database & SQL

- **Date:** 2026-09-25
- **Scope:** The `public` schema of the deleted Supabase project, as recorded in the local cluster dump, plus every Supabase call in `src/`. Also covers the Phase 2 SQL proposed in `docs/context/` and `data/seed_pramaan.json`.
- **Mode:** Read-only. No database, network service or local Postgres was contacted. The only file created is this document. The SQL in this document has **not been executed or syntax-checked** against any server.
- **Primary evidence:** `supabase_backup/db_cluster-25-08-2026@15-35-18.backup/db_cluster-25-08-2026@15-35-18.backup`. This is the plain-text file (7,449 lines) extracted from the `.gz` of the same name, a `pg_dumpall` taken 2026-08-25 from PostgreSQL 17.6 (dump line 199). **Every "dump line N" in this document refers to that extracted file.**
- **Severity basis:** The project is deleted, so nothing is exploitable today. Severities describe the impact **if this schema is carried forward or restored as-is**, which is the decision this audit informs.
- **Redactions:** The project ref (in the storage zip filename, written here as `<project-ref>.storage.zip`) and the dump's `\restrict` tokens (dump lines 5, 148, 164, 185, 197, 7444) are not reproduced. The dump contains no role passwords: the `CREATE ROLE`/`ALTER ROLE` statements at dump lines 16-45 carry no `PASSWORD` clause, and `auth.users` has 0 rows.
- **Prior findings referenced, not repeated:** F-01, F-06, F-08, F-10, F-13, F-14, F-15, F-17 from `docs/audits/01-repo-baseline.md`. F-02 and F-09 (dump and PDFs not ignored) are now resolved: `.gitignore` now covers them (`.gitignore:44` `supabase_backup/`, `:45` `*.backup.gz`, `:49` `docs/context/`).

---

## Summary

1. The schema has 5 tables. RLS is enabled on all of them, but the policies are permissive: anyone (including anon) can insert posts and cards with arbitrary authors, like counts and timestamps, and can append cards to other people's posts (D-01, D-03, D-06).
2. Any signed-in user can make themselves `admin` through the profile UPDATE policy (D-02). This does nothing today, but the proposed Phase 2 review design would turn it into write access to the Pramaan vault (D-20).
3. `handle_new_user` breaks sign-up in several realistic cases: no email, a long email, or a handle collision. It was never exercised (0 users). Account deletion is blocked once a user has posted, which blocks DPDP erasure (D-04, D-05).
4. The dump cannot be restored as-is into a new hosted Supabase project, and there is nothing worth restoring (13 public rows, 0 users). Rebuild from migrations and move the 10 Pramaan rows into a seed/data migration (D-18).
5. A corrected schema, RLS design and migration layout are proposed below. All current app queries keep working under it, except that anonymous writes are rejected by design and cards must now respect the new length limits.

---

## Findings table

| ID | Severity | Title | Evidence |
|----|----------|-------|----------|
| D-01 | CRITICAL | Anyone, including anon, can INSERT posts and cards; cards can be appended to any existing post (extends F-01) | dump 5813, 5820, 7006-7008, 7015-7017; 3682, 3685, 4826-4827 |
| D-02 | HIGH | `profiles.role` (and `handle`) self-writable: users can promote themselves to `admin` | dump 5862, 6997-6999, 3661-3671 |
| D-03 | HIGH | Posts are not bound to an author at the DB level: `author_id` is nullable, unchecked and client-settable (DB side of F-06) | dump 3695-3704, 5661-5662, 5820; `ComposeSutra.tsx:191-202` |
| D-04 | HIGH | `handle_new_user` fails sign-up on NULL email, long email or handle collision; no `search_path`; never exercised (extends F-15) | dump 1004-1020, 3531, 3548, 3561, 3663, 4802-4803, 5443, 6566 |
| D-05 | HIGH | Deleting a user who has posted fails (FK NO ACTION), so there is no erasure path | dump 5637-5638, 5661-5662 |
| D-06 | HIGH | Server-owned columns are client-writable on INSERT: `likes_count`, `created_at`, `id`, `parent_post_id`; likes cannot be implemented as designed | dump 3695-3704, 5820; no UPDATE policy on `sutra_posts` |
| D-07 | MEDIUM | Vault "immutability" is not enforced; it relies only on missing policies, and `service_role`/dashboard can UPDATE/DELETE, with cascade to translations | dump 5827, 5834, 5629-5630, 6979-6990 |
| D-08 | MEDIUM | `GRANT ALL` on every public table and function to `anon`/`authenticated`, plus default privileges that repeat it for every future object | dump 6566-6577, 6979-7017, 7255-7308 |
| D-09 | MEDIUM | Missing NOT NULL on FK and bookkeeping columns; NULL `post_id` cards escape the UNIQUE constraint | dump 3627-3704 |
| D-10 | MEDIUM | No length or format limits on free text, JSON shape, language codes or URLs | dump 3627-3704; `PramaanCard.tsx:150`; `ComposeSutra.tsx` has no `maxLength` |
| D-11 | MEDIUM | `varchar(50)` overflow on `author_handle` from the composer; the raw DB error is shown to the user | dump 3699; `ComposeSutra.tsx:57,69,192,216,239` |
| D-12 | MEDIUM | `parent_post_id` self-FK: NO ACTION on delete, no self-loop CHECK, and the feed query does not exclude replies | dump 3697, 5669-5670; `sutra/page.tsx:14-33` |
| D-13 | LOW | Missing indexes on 3 `sutra_posts` FKs and on the feed sort column | dump 4770-4835 (only PK/UNIQUE); no `CREATE INDEX` on `public.*` |
| D-14 | LOW | `profiles` is fully public-readable, including the email-derived handle, dialect and role | dump 5855, 1008-1011 |
| D-15 | LOW | Post creation is non-atomic and there is no DB function to make it atomic (DB side of F-10) | `ComposeSutra.tsx:202-230`; no RPC function in dump `public` |
| D-16 | LOW | Structural issues in existing data: demo post has NULL `author_id`, `@`-prefixed handle, and fabricated `likes_count`; the seed JSON diverges from the DB (extends F-14) | dump 4253, 4209, 4222; `data/seed_pramaan.json:14-19` |
| D-17 | INFO | Schema was built by hand in the SQL editor: no migration history; RLS auto-enable is a project-level event trigger | dump: no `supabase_migrations` schema; 1026-1055, 7369-7374 |
| D-18 | INFO | The cluster dump cannot be restored as-is into a new hosted project; restore is not recommended | dump 16-45, 158, 191, 218-281, 7369-7449 |
| D-19 | INFO | Phase 2 tables `oral_recordings` and `pramaan_submissions` never existed, contradicting the Idea Thread's "Executed" claim | dump: 0 hits; `storage.buckets` 0 rows (4358); Idea Thread PDF p.31 |
| D-20 | HIGH (design) | The proposed Phase 2 SQL repeats D-01/D-02/D-03 and adds public exposure of elders' personal data | Coding Thread PDF p.6-7; Idea Thread PDF p.31 |

---

## Detailed findings

### D-01 — Unauthenticated and cross-post writes (CRITICAL)

F-01 covers the core issue: the policies at dump 5813 and 5820 are `FOR INSERT WITH CHECK (true)` with no `TO` clause, so they apply to every role, and dump 7006-7017 grant `ALL` to `anon`. This audit adds two things.

- **Card injection into other people's posts.** The card INSERT policy (dump 5813) never checks who owns the post. Anyone can insert `{post_id: <any post>, card_order: n, content: ...}`. The only limits are `card_order BETWEEN 1 AND 4` (dump 3685) and `UNIQUE (post_id, card_order)` (dump 4826-4827). The seeded demo post (dump 4253) has cards 1-2 only (dump 4243-4244), so slots 3-4 are open to anyone. Real posts with fewer than 4 cards would be equally open.
- **Orphan cards.** `post_id` is nullable (dump 3682). A row with `post_id = NULL` passes the FK and escapes the UNIQUE constraint, because NULLs are distinct. Unlimited orphan rows are possible, and they are publicly readable (dump 5841).

**Fix:** D-01/D-03 in the proposed schema. Authenticated-only INSERT policies, `author_id = auth.uid()`, card INSERT only when the caller owns the parent post, and `post_id NOT NULL`.

### D-02 — Self-escalation through `profiles` UPDATE (HIGH)

- Dump 5862: `CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING ((auth.uid() = id));`. There is no `WITH CHECK`, so Postgres reuses the `USING` expression. That stops a user changing `id` to someone else's, but places **no restriction on other columns**.
- Dump 6998: `GRANT ALL ON TABLE public.profiles TO authenticated`. This includes UPDATE on every column.
- **Result:** a signed-in user can `PATCH /rest/v1/profiles?id=eq.<own id>` with `{"role":"admin"}` (allowed by the CHECK at dump 3670) or with any unused `handle` (for example `admin`, `moolsutra`, or a well-known scholar's name).
- **Impact today:** no policy or app code reads `role`, so escalation grants nothing yet. Impact of the handle change: impersonation, once handles are shown (see D-03).
- **Impact if carried forward:** any policy of the form `... WHERE role IN ('scholar','admin')`, which is what the Phase 2 review queue needs (D-20), would let any user approve their own submissions into the vault.

**Fix:** column-level UPDATE grants that exclude `role` and `id`, an explicit `WITH CHECK`, and a `SECURITY DEFINER` `is_admin()` helper. Only `service_role` or a migration changes `role`.

### D-03 — No author binding on posts (HIGH)

- `sutra_posts.author_id uuid` is nullable (dump 3703). It has an FK to `profiles` (dump 5661-5662), but the INSERT policy (dump 5820) never compares it to `auth.uid()`.
- **Impact:** a client can:
  - omit `author_id`, which is what the app does today (`ComposeSutra.tsx:191-193`); or
  - set it to **any** profile's id, attributing a post to another user.
- `author_handle` is independent free text (dump 3699), so the displayed author and the recorded author can disagree. F-06 covers the app side.

**Fix:** `author_id NOT NULL DEFAULT auth.uid()`, a policy `WITH CHECK (author_id = (select auth.uid()))`, and a BEFORE INSERT trigger that sets `author_handle` from `profiles.handle`.

### D-04 — `handle_new_user` failure modes (HIGH)

The function is at dump 1004-1020 and the trigger `on_auth_user_created AFTER INSERT ON auth.users` at dump 5443. The generated handle is:

```sql
LOWER(SPLIT_PART(NEW.email, '@', 1)) || '_' || SUBSTRING(NEW.id::text, 1, 4)
```

It is written into `handle character varying(50) NOT NULL` with a UNIQUE constraint (dump 3663, 4802-4803). Because the trigger runs inside the `auth.users` INSERT transaction, **any error here aborts the sign-up itself**. Failure modes:

| Case | What happens | Evidence |
|------|--------------|----------|
| No email: phone sign-up, anonymous sign-in, or an OAuth provider that returns no email | `SPLIT_PART(NULL, …)` is NULL, the whole concatenation is NULL, NOT NULL is violated and sign-up fails | `auth.users.email` is nullable (dump 3531); `phone` (3548) and `is_anonymous` (3561) exist |
| Email local part longer than 45 characters | 45 + `_` + 4 = 50; anything longer raises `22001 value too long` and sign-up fails. RFC 5321 allows local parts up to 64 characters | dump 3663 |
| Two users with the same local part (`admin@a.com`, `admin@b.com`) and the same first 4 hex digits of their UUIDs | UNIQUE violation and sign-up fails. The chance is 1 in 65,536 per pair, and it grows quickly for common local parts such as `info` or `contact` | dump 4802-4803 |
| Local part with `+`, `.` or other characters | Allowed, so handles like `a.b+tag_1f2e` are generated | no CHECK on `handle` |
| Privacy | The handle publishes the email local part to everyone through the public SELECT on `profiles` (dump 5855) | see D-14 |

Hardening gaps (F-15): `SECURITY DEFINER` without `SET search_path` (dump 1005-1006), and `GRANT ALL ON FUNCTION ... TO anon` (dump 6566). The EXECUTE grant is not practically exploitable, because a `RETURNS trigger` function cannot be called through `/rpc`. It is still hygiene debt.

**Never exercised:** `auth.users` has 0 rows (checked by counting the COPY block at dump 4184) and `profiles` has 0 rows (dump 4234-4235). No sign-up ever succeeded in this project, so "the trigger works" is **UNVERIFIED**.

**Fix:** generate the handle from the user id only (`'user_' || 12 hex chars`, which fits, has no email, and a 48-bit collision space), `SET search_path = ''`, and revoke EXECUTE.

### D-05 — Account deletion blocked (HIGH)

- `profiles.id → auth.users(id) ON DELETE CASCADE` (dump 5637-5638).
- `sutra_posts.author_id → profiles(id)` has no ON DELETE clause, so the default is NO ACTION (dump 5661-5662).
- **Result:** once `author_id` is populated (which the corrected design requires), deleting the auth user cascades to `profiles`, then fails on the posts FK. The whole delete rolls back.
- There is no erasure path for a user's account, which is a DPDP right-to-erasure gap.
- Today it is masked only because `author_id` is never written (F-06).

**Fix:** `ON DELETE CASCADE` on `author_id`, subject to an owner decision on tombstones versus hard delete (Open question 4).

### D-06 — Server-owned columns writable by clients (HIGH)

With `WITH CHECK (true)` (dump 5820), `GRANT ALL` (dump 7015-7016) and no column restrictions, an INSERT can set every column in dump 3695-3704:

- **`likes_count`:** any value, for example 1,000,000. Its default of 0 (dump 3701) is only a default.
- **Likes cannot work as designed.** There is no UPDATE policy on `sutra_posts`, so a legitimate "like" cannot increment the counter from the client. The column can only be faked at insert time. No code references it (F-13, Audit 01 claim #14).
- **`created_at`:** any timestamp. The feed orders by `created_at DESC` (`sutra/page.tsx:33`), so a post dated 2099 pins itself to the top of the feed.
- **`id`:** client-chosen UUIDs. Low impact on its own, but it enables the next point.
- **`parent_post_id`:** any existing post, or the row's own `id` (a self-loop in a single INSERT). There is no CHECK against it.
- **`attached_pramaan_id`:** any vault record. This is intended, but nothing requires the vault record to exist in the author's language, and so on.

**Fix:** column-level INSERT grants, a BEFORE INSERT trigger that forces `created_at`, `likes_count` and `author_*`, a `sutra_likes` table with a counter trigger, and `CHECK (parent_post_id <> id)`.

### D-07 — Vault immutability not enforced (MEDIUM)

- The README and CT PDF describe Pramaan records as "immutable" (Audit 01 claim #5).
- **In the DB:** `pramaan_vault` and `pramaan_translations` have SELECT-only policies (dump 5827, 5834). That blocks `anon`/`authenticated` writes, but only because no write policy exists. The table privileges are still `GRANT ALL` to both roles (dump 6979-6990). One future permissive policy, for example a copy-paste of the `sutra_*` insert policies, would open the vault.
- **`service_role`** has `BYPASSRLS` (dump 29) and `GRANT ALL`, and so do the dashboard and table editor. Any of them can UPDATE or DELETE vault rows with no trigger, audit trail or versioning.
- **Cascade:** `pramaan_translations.pramaan_id → pramaan_vault ON DELETE CASCADE` (dump 5629-5630), so deleting a vault row silently deletes all its translations.
- **Partial accidental protection:** `sutra_posts.attached_pramaan_id` has NO ACTION (dump 5653-5654), so a vault row that is cited by a post cannot be deleted.

**Fix:** a BEFORE UPDATE/DELETE/TRUNCATE trigger that rejects every role except the migration owner (with a caveat about postgres-owned SECURITY DEFINER functions, noted in the SQL). Also make `pramaan_translations` FK `ON DELETE RESTRICT` and grant only SELECT to client roles. Whether corrections should create new versions instead is Open question 3.

### D-08 — Blanket grants and default privileges (MEDIUM)

- **Tables:** `GRANT ALL ON TABLE public.<each of 5 tables> TO anon, authenticated, service_role` (dump 6979-7017). `ALL` includes TRUNCATE, REFERENCES and TRIGGER, which RLS does not govern.
  - These extra privileges are **not reachable** through the Data API. PostgREST exposes only SELECT/INSERT/UPDATE/DELETE, `anon` and `authenticated` are `NOLOGIN` (dump 17, 19), and `pg_graphql` is not installed: only the `graphql_public.graphql` placeholder exists (dump 943), and there is no `CREATE EXTENSION pg_graphql` among the extensions at dump 290-332.
  - Rated as defence-in-depth, not exploitable.
- **Functions:** `GRANT ALL ON FUNCTION public.handle_new_user()` and `public.rls_auto_enable()` to `anon`/`authenticated` (dump 6566-6577). Neither is callable as RPC (they return `trigger` / `event_trigger`).
- **Default privileges** (dump 7255-7308): for objects created by `postgres` or `supabase_admin` in `public`, every future table, sequence and function is automatically `GRANT ALL` to `anon` and `authenticated`.
  - With the RLS auto-enable event trigger (D-17), new tables get RLS on but full grants. Any permissive policy then becomes a full write path.
  - **New SECURITY DEFINER functions are callable by `anon` by default.** This is the more dangerous half. Any RPC added later, such as an approval function, is anon-executable unless it is explicitly revoked.

**Fix:** revoke per table and per function in every migration, and change the default privileges in the first migration. Note that `PUBLIC`'s EXECUTE on functions is a *global* default, so it must be revoked with `ALTER DEFAULT PRIVILEGES ... REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC` **without** `IN SCHEMA`, because per-schema defaults can only add privileges. Whether `postgres` may alter `supabase_admin`'s defaults on the new platform is **UNVERIFIED**.

### D-09 — Missing NOT NULL (MEDIUM)

| Column | Dump line | Problem |
|--------|-----------|---------|
| `pramaan_translations.pramaan_id` | 3629 | Translation rows with no parent are allowed and escape `UNIQUE (pramaan_id, language_code)` |
| `sutra_card_nodes.post_id` | 3682 | Orphan cards are allowed (D-01) |
| `sutra_posts.author_id` | 3703 | D-03 |
| `sutra_posts.likes_count` | 3701 | `NULL` is allowed, and the UI would have to handle it |
| `profiles.role` | 3668 | NULL passes the CHECK (a CHECK over NULL is not false), so a "no role" state exists |
| `profiles.preferred_language` | 3666 | nullable despite the default |
| every `created_at` | 3651, 3669, 3702 | nullable. `pramaan_translations` and `sutra_card_nodes` have no `created_at` at all |

### D-10 — No length, format or shape limits (MEDIUM)

- **`sutra_card_nodes.content text NOT NULL`** (dump 3684): unbounded. One card can be megabytes. It is publicly readable and rendered in every feed load. The client has no `maxLength` either (`grep maxLength src/components/ComposeSutra.tsx` returns nothing).
- **`pramaan_translations.summary_bullets jsonb NOT NULL`** (dump 3634): the JSON shape is not checked. `PramaanCard.tsx:150` calls `translation.summary_bullets.map(...)`, so a non-array value (an object, string or number) crashes the page render. The `|| []` fallback in `pramaan/page.tsx:53` only catches falsy values.
- **`profiles.full_name`, `profiles.avatar_url`** (dump 3664-3665): unbounded `text`. `avatar_url` has no scheme check. Today the app reads avatars from `user_metadata`, not `profiles` (`AuthButtonClient.tsx:18`). But `handle_new_user` copies user-supplied `raw_user_meta_data` into `profiles` unvalidated (dump 1012-1013), and `signUp` lets the client set that metadata.
- **Language codes** (`varchar(10)`, dump 3630, 3666, 3700): no format check. `"EN"`, `"english"` and `""` are all accepted.
- **`topic_slug`** (dump 3645): no format check (spaces and uppercase are allowed), yet it is intended as a URL slug.
- **Empty strings** pass every `NOT NULL`. There is no `char_length(...) > 0` anywhere.

### D-11 — `author_handle` overflow (MEDIUM)

- The composer sets `authorHandle` to `'@' + email local part` (`ComposeSutra.tsx:57, 69`) and sends it (`:192`) into `varchar(50)` (dump 3699). A local part of 50+ characters fails with `22001`. The user can also type any length into the handle field.
- `:216` and `:239` show `postError.message` verbatim to the user, which leaks DB error text.
- This is a second overflow path, separate from D-04.
- It disappears in the corrected design, because the handle comes from `profiles` and is limited to 30 characters.

### D-12 — Self-referencing `parent_post_id` (MEDIUM)

- **FK behaviour:** `sutra_posts_parent_post_id_fkey ... REFERENCES public.sutra_posts(id)` (dump 5669-5670), no ON DELETE, so NO ACTION.
  - **Deleting a post that has replies fails.** That blocks moderation deletes and, combined with a CASCADE on `author_id`, blocks account deletion again: a deleted user's post that others replied to would roll back the whole deletion.
- **Cycles:** there is no `CHECK (parent_post_id <> id)`, so a self-loop is possible in one INSERT (D-06). Longer cycles need UPDATE, which no policy allows today and none is proposed.
- **Depth:** nothing limits nesting. That is a product decision (Open question 6).
- **Feed:** `sutra/page.tsx:14-33` selects all `sutra_posts` with no `parent_post_id IS NULL` filter. As soon as replies exist, they appear as top-level feed items.

**Fix:** `ON DELETE SET NULL` (or a tombstone; see Open question 4), a self-loop CHECK, and a feed filter (app change, recorded in the compatibility table).

### D-13 — Missing indexes (LOW)

- **Existing indexes** come only from PK/UNIQUE constraints (dump 4770-4835). There is no `CREATE INDEX` on any `public.*` table.
- **Already covered:** `pramaan_translations.pramaan_id` and `sutra_card_nodes.post_id` are the leading columns of their composite UNIQUE constraints (dump 4778-4779, 4826-4827), so FK lookups and cascades on them are indexed.
- **Not covered:**
  - `sutra_posts.author_id` (needed for RLS ownership checks, "my posts", and cascade on user delete);
  - `sutra_posts.parent_post_id` (needed for the reply lookup and ON DELETE handling on the parent);
  - `sutra_posts.attached_pramaan_id` (needed for "posts citing this record" and FK checks on vault delete);
  - `sutra_posts.created_at` (the feed sort, `sutra/page.tsx:33`).
- At 1 row this does not matter. It will matter at feed scale, where the anon `statement_timeout` is 3 s (dump 55).

### D-14 — `profiles` fully public (LOW)

- `"Public profiles are viewable by everyone." ... FOR SELECT USING (true)` (dump 5855), with `GRANT ALL` to `anon`.
- Every column is readable by anyone: `full_name`, `avatar_url`, `native_dialect`, `preferred_language`, `role`, `created_at`, and the email-derived `handle` (D-04).
- `native_dialect` can act as a proxy for region, community or ethnicity.
- Low today because there are 0 profiles and no app reads the table. It is a DPDP concern once real users exist.

### D-15 — Non-atomic post creation (LOW)

F-10 covers the app side. On the DB side, no RPC exists in `public` (the only functions are `handle_new_user` and `rls_auto_enable`, dump 1004 and 1026), so the client has no way to insert a post and its cards atomically. The proposed `create_sutra()` function closes this.

### D-16 — Structural data issues in existing rows (LOW)

This is structure only. Content accuracy belongs to Audit 05.

- **Demo post** (dump 4253):
  - `author_id = \N` violates the corrected `NOT NULL`, so it cannot be migrated as-is (Open question 5).
  - `author_handle = '@DharmaExplorer'` uses an `@` prefix, but trigger-generated handles have none. The UI strips a leading `@` (`SutraPostCard.tsx:51, 56`), which hides the inconsistency.
  - `likes_count = 42` is fabricated: no likes mechanism exists (D-06).
  - Fixed, non-random UUID `aaaaaaaa-…` (dump 4253), and vault ids `11111111-…` through `55555555-…` (dump 4222-4226). Fixed UUIDs are fine for seeds, but they should be declared as seed identifiers, not mixed with generated ones.
- **Translations:** only `en` rows exist (dump 4209-4213). The multilingual design is unused (Audit 01 claim #15).
- **Seed JSON vs DB** (extends F-14):
  - `data/seed_pramaan.json` has 1 record, matching dump row 4222 / 4209 by `id`.
  - A field-by-field comparison shows 8 fields identical and 2 different: `verified_root` (110 characters in the DB vs 140 in the JSON) and `summary_bullets` (bullet 1 is worded differently).
  - So the JSON is a divergent earlier or later draft, not a copy. There are two sources of truth for the same record.

### D-17 — No migration history; platform-level RLS trigger (INFO)

- The dump has no `supabase_migrations` schema, so the schema was created in the SQL editor. This matches the CT PDF ("Head over to your Supabase SQL Editor ... run this exact script", p.7).
- `public.rls_auto_enable()` (dump 1026-1055) plus `EVENT TRIGGER ensure_rls ON ddl_command_end` (dump 7369-7374) auto-enable RLS on new `public` tables. This looks like a Supabase project-level feature, not app code, which is **UNVERIFIED**.
- Do not copy it into migrations. Enable RLS explicitly in each table's migration, so the schema does not depend on a project toggle.

### D-18 — Restore feasibility (INFO)

The file is a **`pg_dumpall` cluster dump**, not a `pg_dump` of one database. Restoring it into a new hosted Supabase project as-is would fail or conflict in these places:

| Statement | Dump lines | Conflict on a fresh hosted project |
|-----------|-----------|--------------------------------------|
| `CREATE ROLE anon/authenticated/…/supabase_admin` | 16-45 | Roles already exist, so errors. `ALTER ROLE supabase_admin WITH SUPERUSER` (31) and `ALTER ROLE postgres ... BYPASSRLS` (27) require superuser, which the project's `postgres` role is not (it is `NOSUPERUSER`, dump 27) |
| Role config and memberships (`GRANT anon TO authenticator …`, `GRANTED BY supabase_admin`) | 46-146 | Need superuser or admin option; already present |
| `\restrict` / `\unrestrict` meta-commands | 5, 148, 164, 185, 197, 7444 | Need a recent `psql` that understands them. Older clients fail. Which versions support them is **UNVERIFIED** |
| `\connect template1`, `\connect postgres` | 158, 191 | Writes into `template1`, which is not appropriate on a managed instance |
| `CREATE SCHEMA auth/extensions/graphql/graphql_public/pgbouncer/realtime/storage/vault` | 218-281 | Already exist and are owned by platform roles |
| `CREATE EXTENSION … supabase_vault`, `COMMENT ON EXTENSION` | 290-332 | Extensions pre-installed; comments require ownership |
| Full `auth`, `storage`, `realtime` DDL and `schema_migrations` data | e.g. 3401, 3526, 4075, 4261, 4382 | The new platform will have a newer GoTrue/Storage/Realtime version. Restoring older DDL and migration versions over it would corrupt those services |
| Event triggers owned by `supabase_admin` | 7369-7449 | Cannot be created or owned by `postgres` |
| `CREATE PUBLICATION supabase_realtime` | 5953 | Already exists |

**Recommendation: do not restore.**
- There is nothing worth restoring: 0 users, 0 profiles, 0 storage buckets (dump 4358), 0 storage objects, and an empty storage zip.
- The only data is 5 vault rows, 5 translations, 1 demo post and 2 demo cards.
- **Safest path:**
  1. Create the new project.
  2. Apply the migrations proposed below with the Supabase CLI.
  3. Load the 10 Pramaan rows from a data migration hand-built from the COPY blocks at dump 4208-4227, after Audit 05 has approved the content.
  4. Keep the dump offline as an archive. It is already gitignored.
- If a partial restore is ever wanted, run `pg_restore`/`psql` on a **public-schema, data-only** extract, never on the cluster file.

### D-19 — Phase 2 tables never existed (INFO)

- `grep -n -iE 'oral_recordings|pramaan_submissions|pg_trgm'` over the whole dump returns **0 hits**.
- `storage.buckets` has 0 rows (dump 4358-4359). The Oral Vault's audio storage was never provisioned in Supabase Storage; the design targeted R2/S3 anyway.
- The **Idea Thread PDF (p.31)** heads its SQL "Executed Phase 2 Database Extensions & RLS Policies". The dump contradicts that for `oral_recordings` and `pramaan_submissions`. The `profiles` table and trigger from the same block *do* exist (dump 3661, 1004, 5443), and so does `sutra_posts.author_id` (dump 3703). So the block was only partly run, or the Phase 2 tables were dropped before 2026-08-25. **UNVERIFIED** which one.
- Audit 01 claims #37-#39 agree.

### D-20 — Flaws in the proposed Phase 2 SQL (HIGH, design)

The SQL appears in the Coding Thread PDF (p.6-7, "Step 1: The Phase 2 Database Migration") and in the Idea Thread PDF (p.31). An earlier variant in the Coding Thread (p.5) used `contributor_handle` / `contributor_email VARCHAR(100)` instead of `contributor_id`. The flaws below should not be repeated:

1. **INSERT policies check login, not ownership.** Both use `WITH CHECK (auth.uid() IS NOT NULL)`, so a user can insert `recorded_by` / `contributor_id` as **another user's id**, or as NULL. With NULL, "Users can view their own submissions" (`auth.uid() = contributor_id`) hides the row from its own author. This is the same defect as D-03.
2. **Workflow state is client-writable.**
   - `pramaan_submissions.status`, `reviewer_notes` and `reviewed_at` can be set at INSERT, so a user can submit a row already marked `'APPROVED'`.
   - `oral_recordings.is_verified` can be inserted as `true`.
   - With D-02 (self-promotion to admin), a reviewer policy keyed on `role` would let a user approve their own submission. The spec's "approving … automatically writes the record into the primary `pramaan_vault` table" then makes that a vault write.
3. **No reviewer/admin policies at all.** The comment says "Admins see all", but no policy implements it, so review would have to run through `service_role` from the browser or dashboard. The design gives no server-side review path.
4. **No UPDATE/DELETE policies.** Contributors cannot withdraw a submission or delete their recording, which is a DPDP erasure gap, and moderators cannot remove content.
5. **Elders' personal data is fully public.**
   - `oral_recordings` has `SELECT USING (true)` over `speaker_name` (default `'Elder / Anonymous'`), `speaker_age_bracket`, `region_state`, `dialect_language` and the voice recording itself.
   - Voice is biometric-adjacent personal data of a **third party** who is not the account holder ("Grandchild-Assisted" mode, CT p.6).
   - There is no consent record, no consent-by-whom field, no withdrawal path, and no minor or guardian flag.
   - In the earlier variant, `contributor_email` would have been stored in a table with a public or own-row read path.
6. **`audio_url TEXT NOT NULL` "public URL".**
   - It stores any client-provided URL, so a user can point the field at arbitrary hosts (tracking pixels, malicious files).
   - It also implies public-read buckets, so recordings cannot be withdrawn once the URL has been shared.
   - Store an object key in a known bucket instead, and issue signed URLs server-side. `manuscript_proof_url` has the same problem.
7. **No bounds.**
   - `duration_seconds INT NOT NULL` has no CHECK, although the spec says "up to 5 minutes".
   - `transcription_text` and other free text are unbounded.
   - `category`, `dialect_language` and `speaker_age_bracket` are free text rather than constrained vocabularies.
8. **FK hygiene.**
   - `recorded_by`, `contributor_id` and `associated_pramaan_id` are nullable with NO ACTION on delete, which repeats D-05 (user deletion blocked once they have contributed).
   - No indexes on any of them (D-13).
9. **Inconsistent conventions.** `status` uses uppercase values (`'PENDING'`); `role` uses lowercase (`'contributor'`). Both use `VARCHAR(n)`.
10. **Default privileges (D-08)** mean both tables would also be `GRANT ALL` to `anon`, so a single later `USING (true)` write policy would open them to unauthenticated users.

**Rules for the Phase 2 migration, when it is written:**
- owner column `NOT NULL DEFAULT auth.uid()` with `WITH CHECK (owner = (select auth.uid()))`;
- workflow columns excluded from client INSERT/UPDATE grants and changed only by a `SECURITY DEFINER` function that checks `is_admin()` / scholar;
- approval into the vault through one audited function, not direct table writes;
- recordings private by default (`SELECT` for owner and reviewers), published only after consent and review;
- a consent table (who consented, for whom, when, withdrawn_at);
- storage object keys, not URLs;
- CHECKs on duration and lengths;
- `ON DELETE CASCADE` (or anonymise) for user FKs;
- indexes on every FK.

---

## Inventory (public schema, as found)

**Extensions** (all in `extensions` or `vault`, none in `public`): `pg_stat_statements` (290), `pgcrypto` (304), `supabase_vault` (318), `uuid-ossp` (332). `gen_random_uuid()` is core Postgres. `pg_trgm` and `pg_graphql` are absent.

**Tables** (all owned by `postgres`, all with RLS enabled at dump 5869-5893, none with `FORCE ROW LEVEL SECURITY`):

| Table | Column | Type | Null | Default | Constraints |
|-------|--------|------|------|---------|-------------|
| `pramaan_vault` (3644) | `id` | uuid | NOT NULL | `gen_random_uuid()` | PK (4794-4795) |
| | `topic_slug` | varchar(120) | NOT NULL | | UNIQUE (4786-4787) |
| | `category` | varchar(50) | NOT NULL | | |
| | `primary_source` | varchar(255) | NOT NULL | | |
| | `source_citation` | varchar(100) | NOT NULL | | |
| | `original_script_text` | text | null | | |
| | `created_at` | timestamptz | null | `now()` | |
| `pramaan_translations` (3627) | `id` | uuid | NOT NULL | `gen_random_uuid()` | PK (4770-4771) |
| | `pramaan_id` | uuid | null | | FK → `pramaan_vault(id)` ON DELETE CASCADE, ON UPDATE NO ACTION (5629-5630); UNIQUE (`pramaan_id`, `language_code`) (4778-4779) |
| | `language_code` | varchar(10) | NOT NULL | | |
| | `title` | varchar(255) | NOT NULL | | |
| | `popular_myth` | text | null | | |
| | `verified_root` | text | NOT NULL | | |
| | `summary_bullets` | jsonb | NOT NULL | | |
| `profiles` (3661) | `id` | uuid | NOT NULL | | PK (4810-4811); FK → `auth.users(id)` ON DELETE CASCADE, ON UPDATE NO ACTION (5637-5638) |
| | `handle` | varchar(50) | NOT NULL | | UNIQUE (4802-4803) |
| | `full_name` | text | null | | |
| | `avatar_url` | text | null | | |
| | `preferred_language` | varchar(10) | null | `'en'` | |
| | `native_dialect` | varchar(50) | null | | |
| | `role` | varchar(20) | null | `'contributor'` | CHECK in (`contributor`, `scholar`, `admin`) (3670) |
| | `created_at` | timestamptz | null | `now()` | |
| `sutra_posts` (3695) | `id` | uuid | NOT NULL | `gen_random_uuid()` | PK (4834-4835) |
| | `parent_post_id` | uuid | null | | FK → `sutra_posts(id)`, ON DELETE/UPDATE NO ACTION (5669-5670) |
| | `attached_pramaan_id` | uuid | null | | FK → `pramaan_vault(id)`, ON DELETE/UPDATE NO ACTION (5653-5654) |
| | `author_handle` | varchar(50) | NOT NULL | | |
| | `default_language_code` | varchar(10) | NOT NULL | `'en'` | |
| | `likes_count` | integer | null | `0` | |
| | `created_at` | timestamptz | null | `now()` | |
| | `author_id` | uuid | null | | FK → `profiles(id)`, ON DELETE/UPDATE NO ACTION (5661-5662) |
| `sutra_card_nodes` (3680) | `id` | uuid | NOT NULL | `gen_random_uuid()` | PK (4818-4819) |
| | `post_id` | uuid | null | | FK → `sutra_posts(id)` ON DELETE CASCADE, ON UPDATE NO ACTION (5645-5646); UNIQUE (`post_id`, `card_order`) (4826-4827) |
| | `card_order` | integer | NOT NULL | | CHECK 1..4 (3685) |
| | `content` | text | NOT NULL | | |

No FK specifies `ON UPDATE`, so all use the default NO ACTION. There are no sequences, views, types or domains in `public`, and no `CREATE INDEX` on `public` tables.

**Row counts:** `pramaan_vault` 5, `pramaan_translations` 5, `profiles` 0, `sutra_posts` 1, `sutra_card_nodes` 2. Also `auth.users` 0 and `storage.buckets` 0.

**Functions (public):**
- `handle_new_user()` — `plpgsql SECURITY DEFINER`, no `search_path`, owner `postgres` (1004-1020).
- `rls_auto_enable()` — `plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'`, owner `postgres` (1026-1055).

**Triggers touching public:**
- `on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()` (5443).
- Event trigger `ensure_rls ON ddl_command_end` runs `public.rls_auto_enable()` (7369-7374).
- `grep 'CREATE TRIGGER'` finds no triggers on any `public` table (the other hits at 5450-5478 are in `realtime`/`storage`).

**Policies:** 8 in total, at dump 5813-5862. None has a `TO` clause, so all apply to `PUBLIC`.

**Grants:**
- `USAGE` on schema `public` to `postgres`, `anon`, `authenticated`, `service_role` (5984-5987).
- `ALL` on each table to the same three client roles (6979-7017).
- `ALL` on both functions to the same three (6566-6577).
- Default privileges `ALL` on tables, sequences and functions for objects created by `postgres` or `supabase_admin` (7255-7308).
- There are no column-level grants on `public` tables.

**Realtime:** `CREATE PUBLICATION supabase_realtime` has no tables (5953), which confirms F-17's "no realtime" finding.

---

## Role × table permission matrix (as found)

Effective = table privilege AND RLS. "Y" = allowed, "—" = denied. `service_role` has `BYPASSRLS` (dump 29) plus `GRANT ALL`, so it can do everything on every table.

| Table | anon S | anon I | anon U | anon D | auth S | auth I | auth U | auth D | service_role |
|-------|--------|--------|--------|--------|--------|--------|--------|--------|--------------|
| `pramaan_vault` | Y all rows | — | — | — | Y all rows | — | — | — | Y SIUD |
| `pramaan_translations` | Y all rows | — | — | — | Y all rows | — | — | — | Y SIUD |
| `profiles` | Y all rows, all columns | — (no policy) | — (`auth.uid()` is NULL) | — | Y all rows, all columns | — (trigger only) | **Y own row, any column incl. `role`, `handle`** | — | Y SIUD |
| `sutra_posts` | Y all rows | **Y any values** | — | — | Y all rows | **Y any values, any `author_id`** | — | — | Y SIUD |
| `sutra_card_nodes` | Y all rows | **Y into any post, or NULL post** | — | — | Y all rows | **Y into any post** | — | — | Y SIUD |

- **Not shown:** TRUNCATE, REFERENCES and TRIGGER are granted to `anon`/`authenticated` on all 5 tables. They are not reachable through the Data API (see D-08).
- **Consequences of having no UPDATE/DELETE policies:**
  - no user can edit or delete their own post or card;
  - no user can like a post (D-06);
  - nobody except `service_role` can moderate.

---

## App query compatibility table

"Current" = against the dumped schema. "Corrected" = against the proposed schema below. Every Supabase call in `src/` is listed. The `auth.*` calls in `middleware.ts:33`, `AuthButton.tsx:8`, `AuthButtonClient.tsx:13`, `auth/callback/route.ts:11`, `login/page.tsx:27` and `ComposeSutra.tsx:54,66` touch no `public` tables and are unaffected.

| # | Location | Operation | Current | Corrected | Action needed |
|---|----------|-----------|---------|-----------|---------------|
| Q1 | `src/app/pramaan/page.tsx:14-31` | `pramaan_vault.select(id, topic_slug, category, primary_source, source_citation, original_script_text, pramaan_translations!inner(language_code, title, popular_myth, verified_root, summary_bullets)).eq('pramaan_translations.language_code','en')`, via the anon singleton (F-08) | Works. All columns exist; embedding uses the single FK at 5629 | Works. Same columns, public SELECT | None. The `summary_bullets` array CHECK removes the crash risk (D-10) |
| Q2 | `src/components/ComposeSutra.tsx:88-104` | Same select without `!inner` and without a filter | Works | Works | None |
| Q3 | `src/app/sutra/page.tsx:14-33` | `sutra_posts.select(id, author_handle, created_at, sutra_card_nodes(id, card_order, content), pramaan_vault(id, topic_slug, primary_source, source_citation, original_script_text)).order('created_at', desc)` | Works. The `pramaan_vault` embed resolves through the only posts→vault FK (5653) | Works. `author_handle` is kept (trigger-populated) | Add `.is('parent_post_id', null)` once replies exist (D-12). **Keep exactly one FK from `sutra_posts` to `pramaan_vault`**: a second FK would make the embed ambiguous. There is no pagination, so add `.range()` at scale (D-13) |
| Q4 | `ComposeSutra.tsx:191-204` | `sutra_posts.insert({author_handle, attached_pramaan_id?}).select().single()` | Works for **anon and authenticated** (D-01). `author_id` stays NULL | Works for authenticated: `author_id` defaults to `auth.uid()` and the trigger overwrites `author_handle` from `profiles`. **Anon gets 42501** (intended) | The editable handle input (`:290-297`) becomes cosmetic, so remove it and show `profiles.handle`. Stop echoing raw DB errors (D-11) |
| Q5 | `ComposeSutra.tsx:206-213` | Retry insert with `pramaan_id` | Always fails (`PGRST204`: no such column), and **replaces** the original error message | Always fails (the column is not in the INSERT grant or the table) | Delete this code (F-13) |
| Q6 | `ComposeSutra.tsx:219-230` | `sutra_card_nodes.insert([{post_id, card_order, content}, …])` | Works for anyone, on any post | Works when the caller owns `post_id`, which is always true in this flow. Fails on empty or >1000-character content (D-10) | Switch Q4+Q6 to `rpc('create_sutra', {p_cards, p_attached_pramaan_id})` to make it atomic (D-15/F-10). Add a client `maxLength` matching the CHECK |
| Q7 | `src/app/login/page.tsx:51-54` | `auth.signUp({email, password})`, which fires `handle_new_user` | Fails for local parts over 45 characters, handle collisions, and any future phone/anonymous/no-email OAuth sign-ups (D-04) | Always creates the profile (`user_…` handle) | Offer handle editing in a profile page later (column grant allows it) |
| — | Not referenced anywhere in `src/` | `profiles`, `parent_post_id`, `likes_count`, `pramaan_vault.created_at`, `sutra_posts.author_id` | — | — | The new `sutra_likes` table and `create_sutra`/`my_profile` RPCs need new client code when features are built |

**Queries that would break under a corrected RLS design:** only the anonymous insert paths (Q4 and Q6 when not signed in), which is intended. Q5 is already broken. The server pages (Q1, Q3) read as anon with no cookies (F-08). That is fine under the corrected design, because every read policy is public. It would break any future owner-only read (drafts, own submissions, own likes).

---

## Proposed corrected schema (reference only, not executed)

Conventions applied throughout:
- `text` with `CHECK (char_length(...))` instead of `varchar(n)` (fixes D-10/D-11), with the same maximums as today unless noted;
- `NOT NULL` wherever a value is always required (D-09);
- every policy has a `TO` clause and wraps `auth.uid()` as `(select auth.uid())` so it is evaluated once per statement;
- every function has `SET search_path = ''` and schema-qualified names (D-04/F-15);
- every function's EXECUTE is revoked from `public` and `anon` and re-granted only where needed (D-08);
- privileges are revoked and re-granted per table and per column (D-02, D-06, D-08).

All seed lengths were measured against these CHECKs and fit. The longest seed values are a 30-character `primary_source`, a 110-character `verified_root`, and cards of 140 characters.

```sql
-- =====================================================================
-- 0001_privileges.sql
-- =====================================================================

-- D-08: stop every future table/sequence/function in public being
-- auto-granted to anon/authenticated (dump 7255-7308). Only objects created
-- by `postgres` are covered; whether postgres may alter supabase_admin's
-- defaults on the new platform is UNVERIFIED.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;
-- PUBLIC's EXECUTE on functions is a global default; per-schema defaults can
-- only add, so this one must be global (no IN SCHEMA).
alter default privileges for role postgres
  revoke execute on functions from public;


-- =====================================================================
-- 0002_profiles.sql
-- =====================================================================

create table public.profiles (
  id                 uuid primary key
                     references auth.users (id) on delete cascade,
  -- D-04/D-14: lowercase, bounded, no email-derived content required.
  -- D-02: reserved names cannot be claimed (list is an owner decision,
  -- Open question 13).
  handle             text not null unique
                     check (handle ~ '^[a-z0-9_]{3,30}$')
                     check (handle not in ('admin', 'administrator', 'moderator',
                                           'moolsutra', 'support', 'system', 'root')),
  -- D-10: bounded display name.
  full_name          text check (char_length(full_name) <= 100),
  -- D-10: https only, bounded.
  avatar_url         text check (
                       avatar_url is null
                       or (avatar_url ~ '^https://' and char_length(avatar_url) <= 500)
                     ),
  -- D-09/D-10: NOT NULL + BCP-47-ish format.
  preferred_language text not null default 'en'
                     check (preferred_language ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
  -- D-10/D-14: bounded; private (not in the public column grant below).
  native_dialect     text check (char_length(native_dialect) <= 50),
  -- D-09: NOT NULL so the CHECK is meaningful.
  role               text not null default 'contributor'
                     check (role in ('contributor', 'scholar', 'admin')),
  created_at         timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- D-02/D-08/D-14: no blanket grants. Public columns only; preferences are
-- read by the owner through my_profile(). `role` is readable (needed to show
-- badges) but never client-writable.
revoke all on public.profiles from anon, authenticated;
grant select (id, handle, full_name, avatar_url, role, created_at)
  on public.profiles to anon, authenticated;
-- D-02: column-level UPDATE; `id` and `role` are deliberately excluded.
grant update (handle, full_name, avatar_url, preferred_language, native_dialect)
  on public.profiles to authenticated;

create policy profiles_select_public
  on public.profiles for select
  to anon, authenticated
  using (true);

-- D-02: explicit WITH CHECK; column grants stop role changes.
create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
-- No INSERT policy (rows come from the trigger); no DELETE policy (rows go
-- via ON DELETE CASCADE from auth.users).

-- D-04: handle derived from the user id only. Never NULL, always 17 chars,
-- 48-bit collision space, no email leak. Metadata is length/scheme-checked.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, handle, full_name, avatar_url)
  values (
    new.id,
    'user_' || left(replace(new.id::text, '-', ''), 12),
    nullif(left(btrim(new.raw_user_meta_data ->> 'full_name'), 100), ''),
    case
      when new.raw_user_meta_data ->> 'avatar_url' ~ '^https://'
       and char_length(new.raw_user_meta_data ->> 'avatar_url') <= 500
      then new.raw_user_meta_data ->> 'avatar_url'
    end
  );
  return new;
end;
$$;

-- D-04/D-08: trigger functions need no client EXECUTE.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- D-02/D-20: single source of truth for admin checks in policies and RPCs.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- D-14: owner reads their private preference columns without making them
-- public.
create or replace function public.my_profile()
returns public.profiles
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.profiles where id = (select auth.uid());
$$;
revoke execute on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;


-- =====================================================================
-- 0003_pramaan.sql
-- =====================================================================

create table public.pramaan_vault (
  id                   uuid primary key default gen_random_uuid(),
  -- D-10: slug format enforced (all 5 existing slugs match).
  topic_slug           text not null unique
                       check (char_length(topic_slug) <= 120
                              and topic_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- D-10: non-empty, bounded text (same maximums as today; 10000 is new).
  category             text not null check (char_length(category) between 1 and 50),
  primary_source       text not null check (char_length(primary_source) between 1 and 255),
  source_citation      text not null check (char_length(source_citation) between 1 and 100),
  original_script_text text check (char_length(original_script_text) <= 10000),
  created_at           timestamptz not null default now()          -- D-09
);

create table public.pramaan_translations (
  id              uuid primary key default gen_random_uuid(),
  -- D-09: NOT NULL. D-07: RESTRICT, not CASCADE, so a vault delete cannot
  -- silently remove translations.
  pramaan_id      uuid not null
                  references public.pramaan_vault (id) on delete restrict,
  language_code   text not null
                  check (language_code ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),   -- D-10
  -- D-10: non-empty, bounded text (previously unbounded apart from title).
  title           text not null check (char_length(title) between 1 and 255),
  popular_myth    text check (char_length(popular_myth) <= 2000),
  verified_root   text not null check (char_length(verified_root) between 1 and 5000),
  -- D-10: must be a non-empty JSON array (PramaanCard.tsx:150 calls .map).
  summary_bullets jsonb not null
                  check (jsonb_typeof(summary_bullets) = 'array'
                         and jsonb_array_length(summary_bullets) between 1 and 10),
  created_at      timestamptz not null default now(),   -- D-09: new, audit timestamp
  unique (pramaan_id, language_code)  -- also serves as the FK index (D-13)
);

alter table public.pramaan_vault enable row level security;
alter table public.pramaan_translations enable row level security;

-- D-07/D-08: clients read only. service_role may INSERT (for the future
-- approval path) but never UPDATE/DELETE/TRUNCATE.
revoke all on public.pramaan_vault, public.pramaan_translations
  from anon, authenticated, service_role;
grant select on public.pramaan_vault, public.pramaan_translations
  to anon, authenticated, service_role;
grant insert on public.pramaan_vault, public.pramaan_translations
  to service_role;

create policy pramaan_vault_select_public
  on public.pramaan_vault for select
  to anon, authenticated
  using (true);

create policy pramaan_translations_select_public
  on public.pramaan_translations for select
  to anon, authenticated
  using (true);

-- D-07: immutability enforced in the DB. service_role (BYPASSRLS) is still
-- blocked, because triggers are not bypassed by RLS bypass. Exemption caveat:
-- current_user is also 'postgres' inside any SECURITY DEFINER function owned
-- by postgres, so such functions (e.g. a future approval RPC) pass this check.
-- Keep every postgres-owned definer function free of vault UPDATE/DELETE, or
-- switch the test to session_user (through PostgREST session_user should be
-- 'authenticator' even inside definer functions: UNVERIFIED).
create or replace function public.forbid_vault_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Pramaan records are immutable (% on %)', tg_op, tg_table_name
      using errcode = '42501';
  end if;
  if tg_level = 'STATEMENT' then
    return null;
  elsif tg_op = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$;
revoke execute on function public.forbid_vault_mutation() from public, anon, authenticated;

create trigger pramaan_vault_immutable
  before update or delete on public.pramaan_vault
  for each row execute function public.forbid_vault_mutation();
create trigger pramaan_vault_no_truncate
  before truncate on public.pramaan_vault
  for each statement execute function public.forbid_vault_mutation();
create trigger pramaan_translations_immutable
  before update or delete on public.pramaan_translations
  for each row execute function public.forbid_vault_mutation();
create trigger pramaan_translations_no_truncate
  before truncate on public.pramaan_translations
  for each statement execute function public.forbid_vault_mutation();


-- =====================================================================
-- 0004_sutra.sql
-- =====================================================================

create table public.sutra_posts (
  id                    uuid primary key default gen_random_uuid(),
  -- D-12: deleting a parent keeps replies (detached) instead of blocking the
  -- delete. See Open question 4 for a tombstone alternative.
  parent_post_id        uuid references public.sutra_posts (id) on delete set null,
  -- D-07: explicit RESTRICT; a cited record cannot disappear.
  attached_pramaan_id   uuid references public.pramaan_vault (id) on delete restrict,
  -- D-03/D-09: always the caller. D-05: CASCADE so account deletion works.
  author_id             uuid not null default auth.uid()
                        references public.profiles (id) on delete cascade,
  -- D-03/D-11: denormalised copy of profiles.handle, set by trigger only.
  -- Kept because Q3 selects it.
  author_handle         text not null check (char_length(author_handle) between 1 and 50),
  default_language_code text not null default 'en'
                        check (default_language_code ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
  -- D-06/D-09: server-maintained counter.
  likes_count           integer not null default 0 check (likes_count >= 0),
  created_at            timestamptz not null default now(),
  -- D-12: no self-loop (longer cycles need UPDATE, which is not granted).
  constraint sutra_posts_no_self_parent check (parent_post_id is null or parent_post_id <> id)
);

-- D-13: FK and feed indexes.
create index sutra_posts_created_at_idx          on public.sutra_posts (created_at desc);
create index sutra_posts_author_id_idx           on public.sutra_posts (author_id);
create index sutra_posts_parent_post_id_idx      on public.sutra_posts (parent_post_id)
  where parent_post_id is not null;
create index sutra_posts_attached_pramaan_id_idx on public.sutra_posts (attached_pramaan_id)
  where attached_pramaan_id is not null;

create table public.sutra_card_nodes (
  id         uuid primary key default gen_random_uuid(),
  -- D-01/D-09: NOT NULL, so no orphans and no UNIQUE escape.
  post_id    uuid not null references public.sutra_posts (id) on delete cascade,
  card_order integer not null check (card_order between 1 and 4),
  -- D-10: bounded on the stored value, and not blank. The 1000 limit is an
  -- owner decision (Open question 7).
  content    text not null check (char_length(content) <= 1000 and btrim(content) <> ''),
  created_at timestamptz not null default now(),   -- D-09: new, audit timestamp
  unique (post_id, card_order)  -- also the FK index (D-13)
);

-- D-06: likes as rows, one per user per post.
create table public.sutra_likes (
  post_id    uuid not null references public.sutra_posts (id) on delete cascade,
  user_id    uuid not null default auth.uid()
             references public.profiles (id) on delete cascade,   -- D-05
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index sutra_likes_user_id_idx on public.sutra_likes (user_id);  -- D-13

alter table public.sutra_posts      enable row level security;
alter table public.sutra_card_nodes enable row level security;
alter table public.sutra_likes      enable row level security;

-- D-06/D-08: column-level INSERT. `author_handle` stays grantable only
-- because the current client sends it (Q4); the trigger overwrites it.
-- id, author_id, likes_count and created_at are not client-writable.
revoke all on public.sutra_posts, public.sutra_card_nodes, public.sutra_likes
  from anon, authenticated;
grant select on public.sutra_posts, public.sutra_card_nodes to anon, authenticated;
grant insert (author_handle, attached_pramaan_id, parent_post_id, default_language_code)
  on public.sutra_posts to authenticated;
grant delete on public.sutra_posts to authenticated;
grant insert (post_id, card_order, content) on public.sutra_card_nodes to authenticated;
grant select, delete on public.sutra_likes to authenticated;
grant insert (post_id) on public.sutra_likes to authenticated;

-- D-01: read is public; write is authenticated and owner-bound.
create policy sutra_posts_select_public
  on public.sutra_posts for select
  to anon, authenticated
  using (true);

create policy sutra_posts_insert_own
  on public.sutra_posts for insert
  to authenticated
  with check (author_id = (select auth.uid()));                       -- D-03

create policy sutra_posts_delete_own_or_admin
  on public.sutra_posts for delete
  to authenticated
  using (author_id = (select auth.uid()) or (select public.is_admin()));

create policy sutra_card_nodes_select_public
  on public.sutra_card_nodes for select
  to anon, authenticated
  using (true);

-- D-01: cards only on the caller's own posts.
create policy sutra_card_nodes_insert_own_post
  on public.sutra_card_nodes for insert
  to authenticated
  with check (
    exists (
      select 1 from public.sutra_posts p
      where p.id = post_id
        and p.author_id = (select auth.uid())
    )
  );

-- Likes are private to the liker (Open question 8); the count is public.
create policy sutra_likes_select_own
  on public.sutra_likes for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy sutra_likes_insert_own
  on public.sutra_likes for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy sutra_likes_delete_own
  on public.sutra_likes for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- D-03/D-06/D-11: force the server-owned columns on every insert. For
-- client roles, author_id is always auth.uid(). A migration or service_role
-- seed (auth.uid() is NULL) must supply author_id explicitly.
create or replace function public.sutra_posts_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is not null then
    new.author_id := v_uid;
  end if;
  new.author_handle := (select p.handle from public.profiles p where p.id = new.author_id);
  if new.author_handle is null then
    raise exception 'author profile not found' using errcode = '23503';
  end if;
  new.likes_count := 0;
  new.created_at  := now();
  return new;
end;
$$;
revoke execute on function public.sutra_posts_before_insert() from public, anon, authenticated;

create trigger sutra_posts_before_insert
  before insert on public.sutra_posts
  for each row execute function public.sutra_posts_before_insert();

-- D-06: counter maintained server-side. SECURITY DEFINER because clients
-- have no UPDATE on sutra_posts.
create or replace function public.sutra_likes_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.sutra_posts set likes_count = likes_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.sutra_posts set likes_count = greatest(likes_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;
revoke execute on function public.sutra_likes_count() from public, anon, authenticated;

create trigger sutra_likes_count
  after insert or delete on public.sutra_likes
  for each row execute function public.sutra_likes_count();

-- D-03/D-16: keep the denormalised author_handle in sync when a user
-- renames themselves (profile handle is user-editable via the column grant).
create or replace function public.profiles_propagate_handle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.sutra_posts set author_handle = new.handle where author_id = new.id;
  return null;
end;
$$;
revoke execute on function public.profiles_propagate_handle() from public, anon, authenticated;

create trigger profiles_propagate_handle
  after update of handle on public.profiles
  for each row
  when (old.handle is distinct from new.handle)
  execute function public.profiles_propagate_handle();

-- D-15/F-10: atomic post + cards. SECURITY INVOKER so all RLS policies and
-- column grants above still apply; one function call = one transaction.
create or replace function public.create_sutra(
  p_cards               text[],
  p_attached_pramaan_id uuid default null,
  p_parent_post_id      uuid default null,
  p_language_code       text default 'en'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_post_id uuid;
  v_count   integer := coalesce(array_length(p_cards, 1), 0);
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if v_count < 1 or v_count > 4 then
    raise exception 'a sutra needs 1 to 4 cards' using errcode = '22023';
  end if;

  insert into public.sutra_posts (attached_pramaan_id, parent_post_id, default_language_code)
  values (p_attached_pramaan_id, p_parent_post_id, p_language_code)
  returning id into v_post_id;

  insert into public.sutra_card_nodes (post_id, card_order, content)
  select v_post_id, t.ord::integer, btrim(t.card)
  from unnest(p_cards) with ordinality as t (card, ord);

  return v_post_id;
end;
$$;
revoke execute on function public.create_sutra(text[], uuid, uuid, text) from public, anon;
grant execute on function public.create_sutra(text[], uuid, uuid, text) to authenticated;
```

Notes on the SQL:
- The `sutra_posts` INSERT inside `create_sutra` names only granted columns. `author_id` comes from its default and the trigger; `author_handle` comes from the trigger (NOT NULL is checked after BEFORE triggers).
- `sutra_posts_before_insert` is `SECURITY DEFINER` only so it can read `profiles.handle` regardless of future column-grant changes. It writes only `NEW`.
- The `ON DELETE SET NULL` on `parent_post_id` is performed by the RI trigger as the table owner, so it does not need a client UPDATE grant.
- `create trigger ... on auth.users` from a migration follows the documented Supabase pattern, but whether the new project permits it for `postgres` is **UNVERIFIED** until applied.

---

## Proposed migration file layout and seed strategy

```
supabase/
  config.toml                        # from `supabase init`
  migrations/
    <ts>_0001_privileges.sql         # default-privilege revokes (D-08)
    <ts>_0002_profiles.sql           # profiles, handle_new_user, is_admin, my_profile
    <ts>_0003_pramaan.sql            # vault, translations, immutability triggers
    <ts>_0004_sutra.sql              # posts, cards, likes, triggers, create_sutra
    <ts>_0005_pramaan_data_v1.sql    # the 5 vault + 5 translation rows (canonical data)
  seed.sql                           # local-dev-only fixtures: demo user/post/cards
  tests/                             # optional pgTAP RLS tests (see below)
```

- **Naming:** the Supabase CLI orders migrations by a leading numeric version (`<timestamp>_name.sql`). The exact rule is **UNVERIFIED** here (no docs lookup was allowed). Use whatever `supabase migration new <name>` generates, and keep the `0001`-style ordinal in the name for readability.
- **Pramaan content goes in a migration, not `seed.sql`:**
  - It is canonical product data that must exist in production.
  - `seed.sql` is intended for local resets. Whether `db push` applies it to hosted projects is **UNVERIFIED**, so do not rely on it.
  - Build `0005` from dump COPY blocks 4221-4227 and 4208-4214, using the same fixed UUIDs so any saved links stay valid.
  - Write it only after Audit 05 has approved the wording and chosen between the DB and JSON variants of record 1 (D-16).
  - Because of the immutability trigger, later corrections become new migrations. That is the intended audit trail.
- **Demo post and cards (dump 4253, 4243-4244):**
  - Exclude them from production. The post has no author and fake likes (D-16).
  - If a demo is wanted locally, `seed.sql` can insert a fixture `auth.users` row, which fires the trigger and creates the profile, then insert the post with that `author_id`.
- **RLS regression tests:** add pgTAP or SQL tests for the matrix below before first deploy. They should cover:
  - anon insert is denied;
  - a user cannot insert a post with another user's `author_id`;
  - a user cannot append cards to another user's post;
  - a user cannot update `role`;
  - `service_role` cannot update the vault.
- **`data/seed_pramaan.json`: delete it** once migration `0005` exists.
  - `src/` does not import it (F-14).
  - It holds one record that exists in the DB under the same id, with two fields worded differently (D-16). Hand those two wordings to Audit 05 before deleting.
  - Keeping it would leave a third copy of the content (JSON, dump, migration) with no owner.
  - Also remove its README reference (`README.md:89`, F-17).

Target permission matrix after these migrations:

| Table | anon | authenticated | service_role |
|-------|------|---------------|--------------|
| `profiles` | S (public columns) | S (public columns); U own row, non-role columns; own full row via `my_profile()` | all (BYPASSRLS) |
| `pramaan_vault` / `pramaan_translations` | S | S | S, I; U/D/TRUNCATE blocked by trigger |
| `sutra_posts` | S | S; I own (server-set author, time, likes); D own (or any, if admin) | all |
| `sutra_card_nodes` | S | S; I on own posts; D via post cascade | all |
| `sutra_likes` | — | S/I/D own rows | all |

---

## DPDP notes (triggered: auth, user-submitted content in DB, public profile data)

- **Privacy notice:** needed at `/login` and at the composer. It should state that the handle and posts are public.
- **Erasure:** D-05 blocks it today. The corrected CASCADE fixes it for posts and likes. Decide tombstone vs hard delete for replies (Open question 4).
- **Public profile columns:** limit them to handle, name, avatar and role (D-14). Drop the email-derived handle (D-04).
- **RLS:** enabled on every table, and every policy bound to `auth.uid()` where it writes. Covered by the proposed schema.
- **Phase 2 (D-20):**
  - Third-party voice and personal data of elders needs explicit consent capture and withdrawal.
  - Minors (grandchildren operating accounts) may need verifiable parental consent under DPDP.
  - Recordings should be private by default.

---

## Open questions for the owner

1. **Restore vs rebuild:** confirm that nothing outside this dump (users, uploads) needs to survive. The dump shows 0 users and 0 storage objects.
2. **Admin bootstrap:** who is the first `admin`, and how are they promoted? This should happen once, via `service_role` or the SQL editor, and never from the client.
3. **Vault corrections:** should a corrected Pramaan record replace the old one (via migration, as proposed) or be versioned (for example a `supersedes_id` column, with the old version kept and marked)?
4. **Deleted content:** when a user deletes their account or a post that has replies, should replies be kept (proposed: `SET NULL`, shown as detached), tombstoned ("[deleted]"), or deleted with the parent?
5. **Demo post:** drop `@DharmaExplorer`'s post entirely (proposed), or recreate it under a real system account?
6. **Replies:** are threaded replies in scope? If so, what is the maximum depth, and should the feed show top-level posts only?
7. **Limits:** what are the card length (proposed 1000), handle rules (proposed `[a-z0-9_]{3,30}`) and `summary_bullets` count (proposed 1-10)?
8. **Likes:** should who-liked-what be private (proposed) or public?
9. **Categories and language codes:** free text with CHECKs (proposed), or lookup tables / enums?
10. **Profile columns:** is `native_dialect` needed at all? If so, should it be private (proposed, read via `my_profile()`)?
11. **Region:** is the new project going back to Mumbai (`ap-south-1`)? This matters for DPDP data localisation posture. **UNVERIFIED** for the old project (Audit 01 claim #20).
12. **Phase 2 storage:** Supabase Storage (private buckets and signed URLs) or R2/S3 as in the spec? This decides whether the Phase 2 tables store object keys or bucket and key pairs.
13. **Reserved handles:** which names should be unclaimable (the proposed CHECK lists `admin`, `administrator`, `moderator`, `moolsutra`, `support`, `system`, `root`)? Should look-alikes (`admin_1`, `moolsutra_official`) also be blocked, which would need a pattern or a lookup table?

---

## Decisions (owner, 2026-09-25)

These decisions override the proposals and open questions above where they conflict. Nothing above this section has been edited.

### Open questions

1. Rebuild from migrations; do not restore the dump.
2. First admin: the owner, promoted once via the SQL editor. Never from the client.
3. Vault corrections: versioned records with a status field, not immutability. Detailed design deferred until after Audit 05.
4. Replies on parent delete: ON DELETE SET NULL, as proposed.
5. Demo post by @DharmaExplorer: dropped, not migrated.
6. Replies: out of scope for now. Feed shows top-level posts only (parent_post_id IS NULL).
7. Limits: card content max 500 characters; handle rule as proposed; summary_bullets 1-5 items.
8. Likes: feature dropped entirely (see Decision B).
9. Categories and language codes: CHECK constraints, no lookup tables.
10. native_dialect: dropped from profiles.
11. Region: Mumbai (ap-south-1).
12. Phase 2 storage: deferred; Supabase Storage preferred when needed.
13. Reserved handles: accept the proposed list, plus block any handle starting with "moolsutra".

### Design decisions

- **A. Vault:** build an INTERIM vault now.
  - Keep the proposed columns, CHECK constraints, read-only client grants and the fixed UUIDs of the 5 existing records.
  - Add a status column (text, NOT NULL, default 'draft', CHECK in ('draft','under_review','reviewed','contested')).
  - Do NOT add the immutability triggers (forbid_vault_mutation and the four triggers using it).
  - Richer structure (multiple sources, interpretations, versioning) is deferred until after Audit 05.
  - Migration 0005 (vault data) waits for Audit 05's content review.
- **B. Likes:** drop sutra_likes, likes_count, sutra_likes_count() and its trigger, and all related grants and policies.
- **C. author_handle:** drop the column from sutra_posts, and drop profiles_propagate_handle() and its trigger.
  - sutra_posts_before_insert keeps only setting author_id and created_at.
  - The feed must read the handle by joining profiles.

### Impact on the proposed SQL

Everything in the "Proposed corrected schema" section, grouped by migration file. Anything not listed is unchanged.

**`0001_privileges.sql`:** no change.

**`0002_profiles.sql`**

| Object | Action | Detail | Decision |
|--------|--------|--------|----------|
| `profiles.handle` CHECK | Change | Keep `^[a-z0-9_]{3,30}$` and the reserved-name list (`admin`, `administrator`, `moderator`, `moolsutra`, `support`, `system`, `root`). Add `and handle !~ '^moolsutra'` (prefix block). The prefix rule makes the `'moolsutra'` list entry redundant, but it is harmless | OQ 7, OQ 13 |
| `profiles.native_dialect` column and its comment | Remove | | OQ 10 |
| `grant update (...) on public.profiles to authenticated` | Change | Column list becomes `(handle, full_name, avatar_url, preferred_language)` | OQ 10 |
| `public.my_profile()` | Keep | It returns `public.profiles`, so it follows the column removal automatically. Its only private column is now `preferred_language` | OQ 10 |
| `public.handle_new_user()`, trigger `on_auth_user_created` | No change | Generated `user_<12 hex>` handles pass the new prefix rule | — |
| `public.is_admin()` | No change | The first admin is set by the owner once via the SQL editor (for example `update public.profiles set role = 'admin' where id = '<owner uuid>'`). This goes in no migration or seed, and no client path exists | OQ 2 |

**`0003_pramaan.sql`**

| Object | Action | Detail | Decision |
|--------|--------|--------|----------|
| `pramaan_vault.status` | Add | `status text not null default 'draft' check (status in ('draft', 'under_review', 'reviewed', 'contested'))` | A |
| `pramaan_vault` other columns and CHECKs | Keep | As proposed. The fixed UUIDs `11111111-…` to `55555555-…` are kept for the 5 records in 0005 | A |
| `pramaan_translations.summary_bullets` CHECK | Change | `jsonb_array_length(summary_bullets) between 1 and 5` (was 1 and 10). The existing rows have 3 bullets each (dump 4209-4213), so they fit | OQ 7 |
| `pramaan_translations.language_code`, `pramaan_vault.category` | Keep | CHECK-constrained text, no lookup tables | OQ 9 |
| `revoke all … / grant select … to anon, authenticated, service_role / grant insert … to service_role` | Keep | Client roles stay read-only | A |
| `public.forbid_vault_mutation()` and its `revoke execute` | Remove | | A |
| Triggers `pramaan_vault_immutable`, `pramaan_vault_no_truncate`, `pramaan_translations_immutable`, `pramaan_translations_no_truncate` | Remove | | A |
| The "D-07: immutability enforced in the DB" comment block | Remove | Replace with a note that the vault is interim and versioning is deferred until after Audit 05 | A, OQ 3 |
| `pramaan_translations.pramaan_id … on delete restrict`; `sutra_posts.attached_pramaan_id … on delete restrict` | Keep | These are FK safety rules, not immutability | — |
| RLS policies `pramaan_vault_select_public`, `pramaan_translations_select_public` | Keep as written | See consequence 1 below | A |

**`0004_sutra.sql`**

| Object | Action | Detail | Decision |
|--------|--------|--------|----------|
| `sutra_posts.author_handle` column and its comment | Remove | | C |
| `sutra_posts.likes_count` column and its comment | Remove | | B |
| `sutra_posts.parent_post_id … on delete set null`, `sutra_posts_no_self_parent` CHECK, `sutra_posts_parent_post_id_idx` | Keep | See consequence 3 below | OQ 4, OQ 6 |
| `sutra_posts.author_id … references public.profiles (id) on delete cascade` | Keep | This is now the join path for the handle. Keep it as the **only** FK from `sutra_posts` to `profiles`, so the PostgREST embed `profiles(handle)` is unambiguous | C |
| `sutra_posts_created_at_idx` | Change (suggested) | The feed now always filters `parent_post_id is null`. Consider `on public.sutra_posts (created_at desc) where parent_post_id is null` | OQ 6 |
| `sutra_card_nodes.content` CHECK | Change | `char_length(content) <= 500 and btrim(content) <> ''` (was 1000). The existing demo cards were 140 and 122 characters, but they are dropped anyway | OQ 7, OQ 5 |
| Table `public.sutra_likes`, index `sutra_likes_user_id_idx`, `alter table public.sutra_likes enable row level security` | Remove | | B |
| `revoke all on public.sutra_posts, public.sutra_card_nodes, public.sutra_likes …` | Change | Drop `public.sutra_likes` from the list | B |
| `grant insert (author_handle, attached_pramaan_id, parent_post_id, default_language_code) on public.sutra_posts` | Change | Becomes `(attached_pramaan_id, parent_post_id, default_language_code)`. Also remove the comment explaining why `author_handle` was grantable | C |
| `grant select, delete on public.sutra_likes …`, `grant insert (post_id) on public.sutra_likes …` | Remove | | B |
| Policies `sutra_likes_select_own`, `sutra_likes_insert_own`, `sutra_likes_delete_own` and the comment above them | Remove | | B |
| `public.sutra_posts_before_insert()` | Change | The body keeps only `if v_uid is not null then new.author_id := v_uid; end if; new.created_at := now(); return new;`. Remove the `author_handle` lookup, the `'author profile not found'` raise (the NOT NULL FK on `author_id` already rejects a missing profile), and `new.likes_count := 0`. Its only reason for `SECURITY DEFINER` was reading `profiles.handle`, so it can become `SECURITY INVOKER`; keep `set search_path = ''` and the `revoke execute` either way. Update its header comment (drop D-06/D-11 references) | C, B |
| Trigger `sutra_posts_before_insert` | Keep | | C |
| `public.sutra_likes_count()`, its `revoke execute`, trigger `sutra_likes_count` | Remove | | B |
| `public.profiles_propagate_handle()`, its `revoke execute`, trigger `profiles_propagate_handle`, and its comment | Remove | | C |
| `public.create_sutra(...)` | Keep | Its INSERT never named `author_handle` or `likes_count`. See consequence 3 about `p_parent_post_id` | — |
| Existing policies `sutra_posts_*` and `sutra_card_nodes_*` | Keep | | — |

**Prose around the SQL and the migration plan**

| Location | Change | Decision |
|----------|--------|----------|
| "Notes on the SQL", first bullet | Drop "`author_handle` comes from the trigger (NOT NULL is checked after BEFORE triggers)" | C |
| "Notes on the SQL", second bullet (about `sutra_posts_before_insert` being `SECURITY DEFINER`) | Remove, or rewrite to match the new body | C |
| Migration layout, `0004_sutra.sql` comment | `posts, cards, triggers, create_sutra` (no likes) | B |
| Migration layout, `0005_pramaan_data_v1.sql` | Blocked until Audit 05 approves content. Set each row's `status` explicitly (see consequence 1) | A |
| Migration layout, `seed.sql` | No demo post in any environment. A local fixture user is still optional | OQ 5 |
| Target permission matrix | Remove the `sutra_likes` row. In the `sutra_posts` row, drop "likes". In the vault row, replace "U/D/TRUNCATE blocked by trigger" with "no U/D grant; status and content changes go through the SQL editor or migrations as `postgres`" | A, B |
| Compatibility table Q3 (`sutra/page.tsx:14-33`) | The select must replace `author_handle` with the embed `profiles(handle)` and add `.is('parent_post_id', null)`. `SutraPostCard` must read `post.profiles.handle` or the page must map it. Without this the query **fails** (column not found) | C, OQ 6 |
| Compatibility table Q4 (`ComposeSutra.tsx:191-204`) | The payload must stop sending `author_handle`. Otherwise the insert **fails** (`PGRST204`, and the column is not in the INSERT grant). Remove the handle input | C |
| Compatibility table Q6 | Client `maxLength` becomes 500 | OQ 7 |
| Compatibility table, "not referenced" row | Remove the mention of `sutra_likes` | B |
| DPDP "Erasure" bullet | "posts and likes" becomes "posts" | B |

**Consequences for the owner to confirm before the fix phase.** These are not decided; the decisions above leave them open.

1. **Draft visibility.** `pramaan_vault.status` defaults to `'draft'`, and the proposed SELECT policies are `using (true)`, so drafts are publicly readable. Two things are undecided:
   - whether the public policy should filter by status (for example exclude `'draft'`);
   - which status 0005 assigns to the 5 records.
2. **Who changes `status`.** Client roles and `service_role` have no UPDATE grant on the vault. As written, status changes are possible only as `postgres` (SQL editor or migrations). Granting `service_role` UPDATE, or adding an `is_admin()`-checked RPC, would be a new design choice.
3. **Reply plumbing.** Replies are out of scope, but `parent_post_id` is still in the `sutra_posts` INSERT grant and `create_sutra` still takes `p_parent_post_id`, so a client could still create replies that the feed hides. Options:
   - remove both until replies are in scope; or
   - add `CHECK (parent_post_id is null)` for now.

### Consequences resolved

1. **Draft visibility:** vault SELECT policies stay `using (true)`. Drafts are public, and the UI must show a visible status badge (e.g. "Draft — sources under review") on every record whose status is not `'reviewed'`. Audit 05 decides the status each of the 5 records gets in migration 0005.
2. **Status changes:** owner only, as `postgres` via the SQL editor or migrations. No UPDATE grant on the vault to any client role or `service_role`, and no admin RPC for now.
3. **Replies:** removed entirely until in scope.
   - Remove `sutra_posts.parent_post_id`, its self-FK, `sutra_posts_no_self_parent`, `sutra_posts_parent_post_id_idx`, `parent_post_id` from the INSERT grant, and the `p_parent_post_id` parameter of `create_sutra` (update its revoke/grant signatures to match).
   - Decisions 4 and 6 become moot until replies return.
   - The feed needs no parent filter, and `sutra_posts_created_at_idx` stays a plain `(created_at desc)` index.

**Impact**

| Object | Action | Detail | Item |
|--------|--------|--------|------|
| Policies `pramaan_vault_select_public`, `pramaan_translations_select_public` | Keep | `using (true)`; drafts stay publicly readable | 1 |
| Vault reads Q1 (`pramaan/page.tsx:14-31`) and Q2 (`ComposeSutra.tsx:88-104`) | Change (app) | Add `status` to the selected columns so the UI can render the badge | 1 |
| Status badge on every Pramaan record where `status <> 'reviewed'` | Add (app) | Covers the vault cards and the attached-Pramaan chip in the feed. Wording example: "Draft — sources under review" | 1 |
| Migration `0005_pramaan_data_v1.sql` | Change | Sets `status` per record as decided by Audit 05 | 1 |
| Vault grants (`select` to client roles and `service_role`; `insert` to `service_role`) | Keep | No UPDATE grant to `anon`, `authenticated` or `service_role` | 2 |
| Admin status-change RPC | Not added | Status changes are made only as `postgres` (SQL editor or migrations) | 2 |
| `sutra_posts.parent_post_id` column and its self-FK (`references public.sutra_posts (id) on delete set null`) | Remove | | 3 |
| CHECK `sutra_posts_no_self_parent` | Remove | | 3 |
| Index `sutra_posts_parent_post_id_idx` | Remove | | 3 |
| `grant insert (...) on public.sutra_posts to authenticated` | Change | Becomes `(attached_pramaan_id, default_language_code)` | 3 |
| `public.create_sutra(...)` | Change | Signature becomes `(p_cards text[], p_attached_pramaan_id uuid default null, p_language_code text default 'en')`. Its INSERT becomes `insert into public.sutra_posts (attached_pramaan_id, default_language_code) values (p_attached_pramaan_id, p_language_code)` | 3 |
| `revoke execute` / `grant execute` on `create_sutra` | Change | Both use the signature `public.create_sutra(text[], uuid, text)` | 3 |
| `sutra_posts_created_at_idx` | Keep | Plain `(created_at desc)`. This supersedes the partial-index suggestion in "Impact on the proposed SQL" | 3 |
| Compatibility table Q3 feed query | Change | No `.is('parent_post_id', null)` filter. This supersedes that part of the Q3 row above; the `profiles(handle)` embed still applies | 3 |
| "Notes on the SQL", third bullet (ON DELETE SET NULL via the RI trigger) | Remove | | 3 |
| Decisions OQ 4 and OQ 6; "Consequences for the owner to confirm", item 3 | Moot / resolved | These return only when replies are brought back into scope | 3 |
