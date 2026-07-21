# Migration: coach-phelps (Skanda)

See `WEBSITE_UNIFICATION_PLAN.md` for the full plan this executes. This doc lives in
`coach-phelps-template` (the repo the shared site deploys from) and describes what happens in
Skanda's own repo, `skanda-2003/coach-phelps`, to make the shared site work for him.

## Steps

1. **Wait for template-side prerequisites** — issue #14 (ui merge), issue #16 (auth +
   onboarding), issue #17 (live data fetch) all landed and working in `coach-phelps-template`
   before anything here happens.

2. **Confirm onboarding discoverability** — `coach-phelps` already has `SOUL.md` and
   `training/challenge_v2.json` at the expected paths, so `list-my-repos.ts`'s heuristic (issue
   #16) will pick it up automatically. Nothing to change.

3. **Log into the shared site** with the GitHub account that owns `coach-phelps`, choose it via
   the existing-repo onboarding branch, confirm the dashboard renders real data via the live
   fetch path (issue #17).

4. **Verify sync works through the shared site** — trigger a sync from the shared site's UI,
   confirm `.github/workflows/sync.yml`'s `workflow_dispatch` trigger fires correctly using the
   session's own GitHub token (issue #18). `sync.yml` already exists in this repo, unchanged.

5. **[Proposed — discuss with Akash first, not yet decided] Remove `ui/` from `coach-phelps`.**
   Once the shared site works, a personal deployment is redundant — remove `ui/client`, `ui/api`,
   `vercel.json`, `package.json`/`package-lock.json`, `ui/scripts`, `tsconfig.json`,
   `vite.config.ts`, `ui/dist`. **Do not execute this step until confirmed with Akash** — the
   template's `ui/` merge (issue #14) is where combined UI work lives going forward, but whether
   personal repos keep an inert copy as a fallback is still an open question.

6. **Decommission Skanda's personal Vercel project** for `coach-phelps` (account-level action, not
   a file change) — only after steps 3-4 confirm the shared site fully replaces it.

7. **Leave untouched:** `SOUL.md`, `training/`, `sessions/`, `templates/`, `scripts/`, `strava/`,
   `.github/workflows/`, `.github/agents/`, `docs/`, `CLAUDE.md`, and Skanda's personal
   history/notes docs (`STRAVA_SYNC_STATUS.md`, `SOUL_PLAN.md`, `SOUL_HISTORY.md`,
   `rename_review.md`). None of this is affected by the unification work.

8. **Optional doc cleanup (low priority):** once the shared site is confirmed stable, update
   `SETUP.md`/`README.md` references from "deploy to your own Vercel" to "log into the shared
   site."

## What does NOT need to be added

No new files are needed in `coach-phelps` for GitHub auth. The OAuth App, session handling, and
Vercel KV all live in the shared site (`coach-phelps-template`) only. This repo just needs to
stay discoverable (step 2) and dispatchable (step 4) — both already true today.
