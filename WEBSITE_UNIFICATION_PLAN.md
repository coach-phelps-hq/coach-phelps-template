# Website Unification

**Status:** Design finalized — all open decisions resolved. Checkpoint branch exists. Execution
not started (Milestones 1-4).
**Source of truth for background:** `SCALING_PLAN.md` (repo root) covers the full three-repo
fork history plus everything only relevant past two users; this doc is the real, executable plan
for unifying Skanda and Akash onto one shared site now.
**Per-repo execution:** what changes in each person's own repo lives in `MIGRATION_SKANDA.md`
and `MIGRATION_AKASH.md` (repo root) — this doc covers the shared-site side of the work only.

---

## 1. Scope

Unify `coach-phelps` (Skanda's, running-focused, Vercel) and `akash-coach-phelps` (Akash's fork,
badminton-match-focused, Netlify) into one codebase: one merged UI, GitHub login, one Vercel
deployment that serves each logged-in user their own repo's data.

**Assumptions for this pass** (revisit later, not blocking):
- Every user has Strava Premium and a Claude Pro subscription already, including Akash.
- Sync-source pluggability (HealthKit/iOS) is out of scope.
- Reconciling Akash's rich badminton-match data model is out of scope — tracked as a filed issue
  (Section 9), not built now.
- Skanda and Akash both onboard via Section 6's **existing-repo** branch, not the new-user
  template-generate branch — they already have populated repos. That means the "new user's repo
  inherits an unused `ui/` folder from template-generate" gap doesn't apply to either of them; it
  only matters for friend #3+ and is tracked in `SCALING_PLAN.md`, not built now.

## 2. Checkpoint (done)

`checkpoint-before-unification` branched from `main` and pushed to origin before any unification
work started — a snapshot of the working, cloneable template as it existed pre-unification.
Excludes `UNIFICATION_PLAN.md` and this plan doc (planning artifacts, not product).

This branch is permanent — it lives in this same repo indefinitely as the pre-unification
reference point. It is not a step toward standing up a separate repo; see Section 4, decided.

## 3. Facts established by codebase comparison

| Area | Finding |
|---|---|
| Match-analytics UI | `coach-phelps-template` already has a genericized port of Akash's UI: `BadmintonMatchAnalytics.tsx` + `components/badminton-match-analytics/*` + a genericized `nameAliases.ts`, wired at `/badminton-match-analytics`. Not genericized: `matchParser.ts` still hardcodes `akash_won: boolean`. Akash's un-genericized `components/analytics/` is superseded, not ported. |
| Dependencies | `lucide-react` mismatch (`^1.23.0` template vs `^0.453.0` Akash — check for renamed icons). Package manager mismatch (npm/`package-lock.json` vs pnpm/`pnpm-lock.yaml`). |
| Deploy config | `ui/vercel.json` (template) already works — extend, don't replace. `ui/api/trigger-sync.ts` (template) is already a Vercel Edge function, already env-var driven (`GITHUB_REPO`, `GITHUB_WORKFLOW`, `GITHUB_PAT`) but single-tenant. Akash's Netlify equivalent hardcodes `"akash-suresh/coach-phelps"` and uses a different runtime API (`@netlify/functions` Handler vs Edge `fetch(req)`) — not portable, gets superseded. |
| Data build | `build-data.mjs` (template) reads the filesystem at build time and bakes one repo's data into the bundle — fundamentally incompatible with one deployment serving N repos, must be replaced by a runtime fetch. Template's version is the superset (produces `sleep_log.json`; Akash's doesn't). |
| Auth | No real auth exists in either repo. Both have inert "Login with Manus" chrome (`ManusDialog.tsx`) — dead, safe to remove. |
| UI primitives | Akash's `components/ui/` (shadcn) is a strict superset of template's — additive merge, no conflicts. |
| Dead code | Akash's `Map.tsx` (unused Google Maps/Forge proxy) and `Deprecated.tsx` — drop, don't port. |

## 4. Hosting repo — decided: `coach-phelps-template` itself

`coach-phelps-template` (`akash-suresh/coach-phelps-template`) hosts the unified site directly. No
separate repo is created to keep the template "pure" — the `checkpoint-before-unification` branch
already serves that purpose as a permanent, in-repo reference to the pre-unification state. This is
the `template_owner/template_repo` reference used in Section 6's provisioning step.

## 5. Auth architecture — decided: raw GitHub OAuth App

| | Raw GitHub OAuth App (chosen) | Supabase Auth (alternative, not chosen) |
|---|---|---|
| What it is | Register a GitHub OAuth App; write 4 Vercel Edge functions (`auth-login.ts`, `auth-callback.ts`, `auth-me.ts`, `auth-logout.ts`) handling the redirect/callback/session cookie ourselves. ~150-200 lines, one new dependency (`jose` for JWT signing, Edge-compatible). | Create a Supabase project, enable its GitHub provider (same underlying GitHub OAuth App, Supabase just owns the callback/session plumbing), use `@supabase/supabase-js` client-side. |
| Scaling to 50-100+ users | Fine either way — GitHub API rate limits are per-user-token (5000 req/hr each), not shared, so more users doesn't create a shared bottleneck. Login flow cost doesn't grow with user count. | Same — scaling isn't the differentiator here. |
| Real tradeoff | We own CSRF-state validation, cookie signing, and token handling correctness ourselves. Low stakes at 2 users; at 100 real GitHub accounts, a mistake here has real blast radius, and there's no vendor security team behind it. | Offloads that correctness to an audited, widely-used flow. Adds a third-party account/service dependency, which cuts against this project's "your data, your repo, no central dependency" philosophy — worth it mainly if Section 6 also needs Supabase for storage. |
| Decision | **Chosen.** Zero new service dependency, fits the project's existing ethos, and the team is willing to spend the extra implementation time to get it right. If confidence in the self-rolled implementation is ever in doubt, swapping to Supabase Auth later is a contained change (same GitHub OAuth App, same session concept — isolated to `ui/api/auth-*.ts` and the session-lookup call sites). | Fallback option if the raw flow proves too costly to maintain correctly, or if Section 6 lands on Supabase for storage anyway. |

**OAuth App ownership — decided:** registered under a new shared GitHub org (name TBD at
registration time — not blocking), with both Skanda and Akash as org owners. This replaces the
"one person's account + the other as admin" option from `UNIFICATION_PLAN.md`'s open questions,
and unblocks Milestone 2 (Section 4 is resolved, so there's no longer a dependency to wait on).

Concrete flow:
1. Register a GitHub OAuth App under the shared org. Scopes: `read:user`, `repo`.
2. `ui/api/auth-login.ts` — redirects to GitHub's authorize URL with a CSRF `state` nonce.
3. `ui/api/auth-callback.ts` — validates `state`, exchanges `code` for a token, fetches `GET /user`,
   sets an HttpOnly/Secure/SameSite=Lax session cookie: a signed JWT (`SESSION_SECRET` env var)
   containing `{github_user_id, login, iat, exp}`. The raw GitHub token lives only inside this
   short-lived (~8h) encrypted JWT — never persisted to storage, never sent to the client in
   readable form.
4. `ui/api/auth-me.ts` — reads the session cookie, returns `{github_user_id, login, repo_full_name}`
   or 401. SPA calls this on load to decide: login screen / onboarding / dashboard.
5. `ui/api/auth-logout.ts` — clears the cookie.

## 6. Provisioning flow

On first login with no stored repo mapping:
1. Redirect to `/onboarding`: "Do you have an existing Coach Phelps repo, or are you starting fresh?"
2. **Existing repo** → `list-my-repos.ts` lists the user's repos (via their token), filtered to ones
   containing `SOUL.md` + `training/challenge_v2.json` (cheap Contents-API heuristic). User picks
   one, mapping gets stored.
3. **New user** → text field for repo name → `provision-repo.ts` calls GitHub's repo-generate-from-
   template endpoint (`POST /repos/{template_owner}/{template_repo}/generate`, the API behind "Use
   this template") with `{owner: <user's login>, name, private: true}`. Requires the template repo
   to have `is_template: true` set — verify or set this on whichever repo Section 4 lands on.
4. Data population (Strava OAuth, first sync) still follows existing `SETUP.md` — this plan wires up
   *reading* the repo, not automating the rest of onboarding.

**Storage — decided: Vercel KV.**

| | Vercel KV (chosen) | Supabase table (alternative) |
|---|---|---|
| What it stores | Single key per user: `github_user_id → {login, repo_full_name}`. No secrets — the GitHub token lives only in the session JWT (Section 5), never persisted here. | Same schema, in Postgres. |
| Scaling | Trivial at any realistic scale for this project (kilobytes of data, low request volume even at hundreds of users) — this was never going to be the bottleneck. | Same. |
| Tradeoff | Fastest to wire up given we're already on Vercel; no relational queries, fine since it's a pure lookup. | Queryable (user counts, signup dates), free admin dashboard — but only worth the extra setup if Section 5 also picks Supabase Auth. |
| Decision | **Chosen**, paired with the raw-OAuth choice above — one less service dependency. Revisit if Supabase Auth is ever adopted instead (switch both together, not just one). | Fallback, contingent on Section 5's decision changing. |

## 7. Live data fetching (replaces build-time bundling)

`build-data.mjs` reads the filesystem at build time — incompatible with one deployment serving N
repos, and with data changing independently of redeploys (syncs run via `sync.yml`).

- New Edge function `ui/api/repo-file.ts`: session cookie → `repo_full_name` lookup (KV) → GitHub
  Contents API calls for `training/history/*`, `challenge_v2.json`, `templates/*.json` +
  `sessions/*.json`, `sleep_log.json`, `sync_status.json`.
- Extract `build-data.mjs`'s merge logic (history merge/sort, templates+sessions merge with 7-day
  pruning, sync_status fallback) into a shared `ui/api/_lib/mergeTrainingData.ts`, reused by both the
  build-time script (kept for local single-repo dev) and the new runtime function.
- Client: replace static `import x from "../data/y.json"` with a `useRepoData(path)` fetch hook,
  mirroring the old synchronous shape so component churn stays minimal.
- Cache Contents API responses (a few minutes TTL — data changes at most once/day).
- Local unauthenticated `npm run dev` path stays untouched — multi-tenant fetching only applies to
  the hosted deployment.

## 8. Codebase merge sequencing

1. Standardize on npm (template's lockfile, `vercel.json` already assumes it) — delete Akash's
   `pnpm-lock.yaml`, regenerate `package-lock.json`. Do first, blocks everything else in `ui/`.
2. Bump `lucide-react` to `^1.23.0`; check icon imports for breaking renames (small surface once
   step 3 drops the folders using most of Akash's icons).
3. Drop dead/superseded code: `Map.tsx`, un-genericized `components/analytics/`, `ManusDialog.tsx`.
4. Merge Akash-only `components/ui/` shadcn primitives — additive.
5. Confirm `/badminton-match-analytics` nav linkage (port the nav *link* if Akash's points elsewhere;
   the route itself already exists).
6. Keep template's `build-data.mjs` (superset).
7. `trigger-sync.ts` gets rewritten as part of Sections 5-7's work — resolve target repo from
   session, not a static env var. Akash's Netlify version is superseded, not ported.
8. Decommission **both** standalone deployments once the shared site is confirmed working
   end-to-end for both accounts: Akash's Netlify site, and Skanda's separate `coach-phelps`
   Vercel deployment. Neither of you needs your own deployment once the one shared deployment
   (Section 4) serves both — that's the whole point of unifying.

## 9. Deferred issue — filed, not built

**Filed:** [#12](https://github.com/akash-suresh/coach-phelps-template/issues/12) — `[ui-expert]
Generalize badminton match-analytics data model for multi-tenant use`. Spec below is the source
of truth for the issue body.

**Title:** Generalize the badminton match-analytics data model for multi-tenant use

**Body:**
- Context: the UI layer (`badminton-match-analytics/`) is already genericized; the data it consumes
  isn't. It'll render incorrectly or emptily for any repo that isn't Akash's until fixed.
- Needs generalizing:
  - `matchParser.ts` — rename `akash_won: boolean` (and `match.akash_won ? "W" : "L"`) to a generic
    field, e.g. `player_won`.
  - Akash's data-generation scripts (`parse_match_description.py`, `generate_analytics_snapshot.py`,
    `run_sync_pipeline.py`) that produce `akash_won` upstream — same rename, at the source.
  - `nameAliases.ts` — template's copy is already genericized (empty placeholder); document
    per-repo customization in `SETUP.md`.
  - No "does this repo have match data" capability check exists — nav should hide itself gracefully
    for repos without it.
- Non-goals: arbitrary N-player match formats; no urgency on Akash's own data (he keeps direct repo
  access).
- Acceptance criteria: field renamed consistently (TS + Python); alias customization documented;
  nav entry conditionally hidden; verified against a second real user's repo.

File in whichever repo Section 4 lands on.

## 10. Milestones

| # | What | Owner | Depends on | Exit criteria |
|---|---|---|---|---|
| -1 | Checkpoint branch (permanent reference, lives in this repo) | Tech Lead | — | **Done.** |
| 0 | File Section 9 issue + analytics-optionality issue (Section 12) | Tech Lead | — | **Done.** Issues filed, no code |
| 1 | Codebase merge (Section 8) | UI Expert, `ui/` only | — | `npm run build` succeeds, all routes reachable, `npm run dev` still works unauthenticated |
| 2 | Auth + provisioning (Sections 5-6) | Tech Lead / worker with `ui/api/` access | Sequenced after 1 | Fresh GitHub account can log in, choose new/existing, reach dashboard shell |
| 3 | Live data fetching (Section 7) | Tech Lead/worker + UI Expert coordination | 1, 2 | Two real accounts, each seeing only their own repo's data, no bleed |
| 4 | `trigger-sync.ts` rewrite + retirement of both standalone deployments (Section 8.7-8.8) | Tech Lead/worker | 2, 3 | Sync button triggers the right user's workflow; data updates without redeploy; Akash's Netlify site and Skanda's separate Vercel deployment both decommissioned |

Milestones 1 and 2 can run in parallel. Section 4 is resolved (see above), so Milestone 2 has no
remaining blocker before building `provision-repo.ts`'s template reference.

## 12. Open questions filed as issues, not blocking

These are real gaps but don't block Milestones 1-4. Full detail lives in `SCALING_PLAN.md`
(everything relevant only past two users) — kept here as a pointer, not duplicated:

- **Badminton match-analytics data model generalization** (`akash_won` → `player_won` etc.) —
  Section 9, [issue #12](https://github.com/akash-suresh/coach-phelps-template/issues/12).
  Relevant now (Milestone 1), not deferred.
- **Analytics page set configurable per user** — [issue
  #13](https://github.com/akash-suresh/coach-phelps-template/issues/13), deferred, see
  `SCALING_PLAN.md`.
- **New-user `ui/` leakage via template-generate** — friend #3+ only, see `SCALING_PLAN.md`.
- **IP boundary vs. local Claude Code, funding path for a hosted chat surface** — see
  `SCALING_PLAN.md`.

## 11. Verification

- Checkpoint: `git log --oneline -1 checkpoint-before-unification` matches pre-unification `main`.
- Milestone 1: `npm run build` + `npm run dev` succeed; click every route.
- Milestone 2: real GitHub login, both onboarding branches, end to end.
- Milestone 3: two GitHub accounts in two browser sessions, confirm no data bleed.
- Milestone 4: trigger sync from dashboard, confirm correct workflow fires and data updates.