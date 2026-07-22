# Migration: coach-phelps (Skanda)

See `docs/website-unification-history.md` for the full story of how the shared site came
together. This doc lives in `coach-phelps-template` (the repo the shared site deploys from) and
describes what happens in Skanda's own repo, `skanda-2003/coach-phelps`, to make the shared
site work for him.

## Done

- Onboarding discoverability, login, and repo resolution — generic, no repo-specific code
  needed; `coach-phelps` already had `SOUL.md`/`training/challenge_v2.json` at the expected
  paths.
- `data/aggregate.json` publish step added to `sync.yml`, reusing `build-data.mjs`'s merge
  logic, idempotent commit.
- Sync dispatch from the shared site verified live, using Skanda's own token (not a shared bot
  account) against a real GitHub Actions run.

## Still open — the one real remaining item

**Remove `ui/` from `coach-phelps`, and decommission Skanda's personal Vercel deployment.**
Sequenced together, and sequenced last — no action until the shared site is confirmed fully
replacing this repo's own deployment, which it now is. Remove `ui/client`, `ui/api`,
`vercel.json`, `package.json`/`package-lock.json`, `ui/scripts`, `tsconfig.json`,
`vite.config.ts`, `ui/dist` once decommissioning the Vercel project. Optional, low-priority
alongside this: update `SETUP.md`/`README.md` references from "deploy to your own Vercel" to
"log into the shared site."

**Leave untouched:** `SOUL.md`, `training/`, `sessions/`, `templates/`, `scripts/`, `strava/`,
`.github/workflows/`, `.github/agents/`, `docs/`, `CLAUDE.md`, and Skanda's personal
history/notes docs (`STRAVA_SYNC_STATUS.md`, `SOUL_PLAN.md`, `SOUL_HISTORY.md`,
`rename_review.md`). None of this is affected by the unification work.

## What does NOT need to be added

No new files are needed in `coach-phelps` for GitHub auth. The GitHub App and session handling
live in the shared site (`coach-phelps-template`) only — no persistent storage layer needed
either (repo resolution is session-carried, not a KV lookup). This repo just needs to stay
discoverable and dispatchable — both already true today.
