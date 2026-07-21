# Website Unification

**Status:** Design finalized — all open decisions resolved. Checkpoint branch exists. Execution
not started (Milestones 1-4).
**Source of truth for background:** `SCALING_PLAN.md` (repo root) covers the full three-repo
fork history plus everything only relevant past two users; this doc is the real, executable plan
for unifying Skanda and Akash onto one shared site now.
**Per-repo execution:** what changes in each person's own repo lives in `MIGRATION_SKANDA.md`
and `MIGRATION_AKASH.md` (repo root) — this doc covers the shared-site side of the work only.
**Detailed design cross-reference:** Akash independently designed the same auth/data/onboarding
work in `akash-suresh/coach-phelps#141` and sub-issues #137-140, written before he'd agreed
`coach-phelps-template` (not his own repo) would host the shared site. Sections 5-7 below are
reconciled with that design — where his was more thought-through (PKCE, repo-resolution
branching, the aggregate data model), it won and is reflected here.

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

`coach-phelps-template` (`coach-phelps-hq/coach-phelps-template`) hosts the unified site directly. No
separate repo is created to keep the template "pure" — the `checkpoint-before-unification` branch
already serves that purpose as a permanent, in-repo reference to the pre-unification state. This is
the `template_owner/template_repo` reference used in Section 6's provisioning step.

## 5. Auth architecture — decided: GitHub App (migrated from a classic OAuth App)

**Originally built as a classic GitHub OAuth App (issue #16), then migrated to a GitHub App
(issue #25).** The classic OAuth App's `repo` scope grants access to a user's *entire* account —
every repo, public and private — with no way for the user to grant access to just their coach
repo. That's fine at two trusted users who built the app themselves, but doesn't hold up once
friends are expected to authorize it (`SCALING_PLAN.md` Phase 2's actual audience): asking a
non-technical friend to grant "see everything in my GitHub account" to see their coach dashboard
is a bigger ask than it needs to be, and doesn't match the project's "your data, your repo"
philosophy. A **GitHub App** is the integration type that supports installing on specific repos
only, with a real repo picker during install — genuinely more correct, not just more cautious,
and it's GitHub's own recommended direction for repo-access integrations over classic OAuth Apps.

**GitHub App permissions:** Repository permissions → Contents: Read-only (covers sign-in, repo
resolution, and the live-data-fetch work in #17). No Organization or Account permissions needed.
No Actions permission — sync dispatch stays on the shared bot token (Section 8.7), not moved to
per-user tokens. "Request user authorization (OAuth) during installation" enabled, so install +
login happen as one flow. Webhook not active - not needed.

Concrete flow:
1. `ui/api/auth-login.ts` — redirects to the App's install-and-authorize flow
   (`https://github.com/apps/<slug>/installations/new`) with a CSRF `state` nonce and PKCE
   (code challenge/verifier).
2. User picks which repo(s) to install the App on, then GitHub carries them through OAuth
   consent and redirects to the callback with `code`, `state`, and `installation_id`.
3. `ui/api/auth-callback.ts` — validates `state` (and the PKCE verifier, best-effort — GitHub's
   PKCE support is documented primarily for the direct authorize entry point, not fully
   confirmed for the install-first path; verify during real end-to-end testing), exchanges
   `code` for a user-to-server token, fetches `GET /user`, sets an HttpOnly/Secure/SameSite=Lax
   session cookie: an encrypted JWE (`SESSION_SECRET` env var) containing
   `{github_user_id, login, gh_token, installation_id, repo_full_name?}`. The raw GitHub token
   lives only inside this short-lived (~8h) encrypted session — never persisted to storage,
   never sent to the client in readable form. `repo_full_name` is populated once Section 6's
   resolution flow runs (no persistent store — same reasoning as before, still applies).
4. `ui/api/auth-me.ts` — reads the session cookie, returns `{github_user_id, login, repo_full_name}`
   or 401. SPA calls this on load to decide: login screen / onboarding / dashboard.
5. `ui/api/auth-logout.ts` — clears the cookie.

**Deferred to a follow-up issue, not blocking:** instant session revocation and a "list all
users" admin view both require some persistent store (Vercel KV or similar) — genuinely useful
past two trusted users, not needed now. Tracked as a separate issue, tackled after Milestones
1-4 land, not before.

## 6. Provisioning / repo resolution flow

**Storage — decided: no persistent store.** Reconciled with Akash's design (issue #139), which
uses no server DB at all — resolved repo persisted client-side. This plan's version: store
`repo_full_name` inside the same signed session JWT from Section 5, rather than raw
`localStorage` — server-verified, no separate storage layer, slightly more tamper-resistant than
plain `localStorage` for free. Functionally the same conclusion Akash reached independently: a
Vercel KV lookup table isn't needed at two users. (Answers the "why is KV required?" question —
it isn't. See the deferred-issue note in Section 5 for what a future KV table would actually buy:
instant session revocation and an admin user list, neither urgent now.)

On first login with no `repo_full_name` in the session (updated for the GitHub App migration,
issue #25 — no name-pattern filtering anymore, candidates come directly from what the user
granted at install time):
1. **List candidates** — `GET /user/installations/{installation_id}/repositories` via the
   user's token. Already exactly the repo(s) this installation was granted — the whole point of
   the GitHub App migration over the classic OAuth App's blanket `repo` scope.
2. **Confirm each is real** — cheap marker check per candidate: does it contain
   `training/challenge_v2.json` (Contents API GET)? Guards against granting the App to the wrong
   repo by mistake.
3. **Branch on confirmed count:**
   - **0** → "no coach repo found" empty state, pointing the user at the GitHub App's install
     settings to check they granted the right repo, with a placeholder for the future "Create my
     coach" template-generate flow (see below — deferred, not built now).
   - **1** → select it automatically.
   - **2+** → a picker UI; user chooses.
4. **Persist the choice** — write the selected `repo_full_name` into the session JWT (re-issued
   with the updated claim). On subsequent requests within the session, skip re-resolution
   entirely. The stored `full_name` is the durable identity (survives the user later renaming
   their repo).
5. **Re-resolve on failure** — if the stored repo 404s (deleted, renamed, access revoked), clear
   the claim and re-run resolution from step 1.

**New-user template-generate path (`provision-repo.ts`, calling GitHub's
`POST /repos/{template_owner}/{template_repo}/generate` with `is_template: true` set on
`coach-phelps-template`) is explicitly deferred** — Skanda and Akash both onboard via the
existing-repo path above, so this isn't needed to unblock Milestones 1-4. Tracked in
`SCALING_PLAN.md` for friend #3+ (also where the "new repo inherits an unused `ui/` folder" gap
gets solved before this path is actually built).

## 7. Live data fetching — Repo-as-CDN aggregate (replaces build-time bundling)

`build-data.mjs` reads the filesystem at build time — incompatible with one deployment serving N
repos, and with data changing independently of redeploys (syncs run via `sync.yml`).

**Reconciled with Akash's design (issues #138/#140) — adopted over the original plan of live
per-file fetching.** Instead of the shared site fetching several raw files at request time and
merging them itself, each personal repo's own sync pipeline publishes one pre-merged file:

- `sync.yml` (in `coach-phelps` and `akash-coach-phelps`, each — see `MIGRATION_SKANDA.md` /
  `MIGRATION_AKASH.md`) gains a step that reuses `build-data.mjs`'s existing merge logic (history
  merge/sort, templates+sessions merge with 7-day pruning, sync_status fallback) — refactored so
  the merge produces an in-memory object writable either to `ui/client/src/data/*.json` (existing
  build-time behavior, kept for local single-repo dev) or to a new committed artifact,
  **`data/aggregate.json`**, at the repo root. Idempotent commit, mirroring
  `apply-coach-patch.yml`'s no-op-when-unchanged guard.
- `data/aggregate.json` shape: `activities`, `challenge_v2`, `current_week`, `workouts`,
  `sync_status`, plus a top-level **`schema_version`** and `generated_at`.
- New Edge function `ui/api/repo-file.ts`: session (`repo_full_name` from the JWT, Section 6) →
  **one** GitHub Contents API call for `data/aggregate.json` — not several raw files.
- Client: replace static `import x from "../data/y.json"` with a `useRepoData()` fetch hook that
  loads the aggregate, adapting its shape to what components already consume — a thin adapter,
  not a component rewrite.
- **Schema gate:** if the fetched aggregate's `schema_version` is outside the supported range,
  show a "repo needs updating" state instead of rendering garbage. **Akash owns the supported
  version-range policy** (per his issue #140).
- Loading/error/empty states wherever the app previously assumed data was just present.
- Cache the Contents API response (a few minutes TTL — data changes at most once/day, on sync).
- Local unauthenticated `npm run dev` path stays untouched — multi-tenant fetching only applies to
  the hosted deployment; `build-data.mjs`'s original output path is unaffected.

## 8. Codebase merge sequencing

1. Standardize on npm (template's lockfile, `vercel.json` already assumes it) — delete Akash's
   `pnpm-lock.yaml`, regenerate `package-lock.json`. Do first, blocks everything else in `ui/`.
2. Bump `lucide-react` to `^1.23.0`; check icon imports for breaking renames (small surface once
   step 3 drops the folders using most of Akash's icons).
3. Drop dead/superseded code: `Map.tsx`, un-genericized `components/analytics/`, `ManusDialog.tsx`.
4. ~~Merge Akash-only `components/ui/` shadcn primitives — additive.~~ **Investigated,
   skipped.** 24 of the 26 files that exist only in Akash's copy are unused anywhere in his real
   app, and their npm dependencies were never added to his `package.json` — leftover shadcn
   scaffold, not live code. The remaining 2 are only imported by two other files in that same
   unused set. Nothing here was worth porting.
5. Confirm `/badminton-match-analytics` nav linkage (port the nav *link* if Akash's points elsewhere;
   the route itself already exists). Both existing page implementations merge as-is — no visual/UX
   reconciliation now, confirmed with Akash ("leave both pages however it is, tackle later");
   tracked as a separate low-priority issue, not blocking.
6. Keep template's `build-data.mjs` (superset).
7. `trigger-sync.ts` gets rewritten as part of Sections 5-7's work — resolve target repo from
   session, not a static env var, but **keep using the existing shared bot token** to dispatch
   the workflow (not the logged-in user's own OAuth token). Reconciled with Akash's design: his
   OAuth App only requests `repo` scope, not `workflow` scope, and he explicitly defers "writes
   under user token, drop the shared PAT" to later. This plan matches that — no new OAuth scope
   needed, deployment retirement (step 8) doesn't have to wait on that deferred write-token
   migration. Akash's Netlify version is superseded, not ported.
8. Decommission **both** standalone deployments once the shared site is confirmed working
   end-to-end for both accounts: Akash's Netlify site, and Skanda's separate `coach-phelps`
   Vercel deployment. Neither of you needs your own deployment once the one shared deployment
   (Section 4) serves both — that's the whole point of unifying.

## 9. Deferred issue — filed, not built

**Filed:** [#12](https://github.com/coach-phelps-hq/coach-phelps-template/issues/12) — `[ui-expert]
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
  Section 9, [issue #12](https://github.com/coach-phelps-hq/coach-phelps-template/issues/12).
  Relevant now (Milestone 1), not deferred.
- **Analytics page set configurable per user** — [issue
  #13](https://github.com/coach-phelps-hq/coach-phelps-template/issues/13), deferred, see
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