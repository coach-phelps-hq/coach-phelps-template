# Migration: akash-coach-phelps (Akash)

See `docs/website-unification-history.md` for the full story of how the shared site came
together — including his data-model reconciliation, the Strava-pipeline fix, and the credential
incident and how it was resolved. This doc lives in `coach-phelps-template` (the repo the
shared site deploys from) and describes what happens in Akash's own repo,
`akash-suresh/coach-phelps`, to make the shared site work for him.

## Done

- Onboarding discoverability, login, and repo resolution — generic, no repo-specific code
  needed; `akash-coach-phelps` already had `SOUL.md`/`training/challenge_v2.json` at the
  expected paths.
- `data/aggregate.json` publish step added to `sync.yml`, plus `quest_history` generation and
  `sleep_log` tracking (both entirely missing before, added to bring his repo to structural
  parity with Skanda's).
- Sync pipeline resilience: Strava's Step 1 failure no longer kills the pipeline, and the
  push trigger now watches the paths his iOS app actually writes to. His iOS commits auto-
  trigger the full pipeline and aggregate publish with zero manual step, verified against real
  syncs.
- Dashboard rendering fixed for his genuinely different coaching data model (season/phase/
  block/milestones, not Skanda's single fixed-duration challenge) — the shared dashboard
  tolerates a repo without the old shape, and his own pipeline derives a real "current period"
  display from his actual data.
- `strava/strava_tokens.json` gitignored and untracked, following the credential incident.

## Still open

**Remove `ui/` from `akash-coach-phelps`, and decommission the Netlify deployment.** Sequenced
together, and sequenced last — no action until the shared site is confirmed fully replacing
this repo's own deployment, which it now is. Optional, low-priority alongside this: update
`SETUP.md`/`README.md` to drop Netlify references and point at "log into the shared site."

**Rename `akash_won` at the source, in this repo.** `scripts/parse_match_description.py`,
`run_sync_pipeline.py`, and `generate_analytics_snapshot.py` all still use `akash_won`.
Cosmetic tech debt in his own scripts only — his real badminton match data reaches the shared
dashboard through the `description`-text parsing path (`matchParser.ts`'s `parseDescription()`),
not through `ebadders_history.json`/`leaderboard.json` (the files that actually use
`akash_won`, both entirely internal to his own pipeline, never read by the shared site). No
urgency; do whenever, doesn't block anything.

**Leave untouched:** `SOUL.md`, `training/`, `sessions/`, `templates/`, `scripts/`, `strava/`,
`ios/` (the HealthKit sync app — entirely orthogonal to website unification, keeps writing to
`training/history/*` in the same shape it does today), `.github/workflows/`,
`.github/agents/` (including `ios-builder.md` — still relevant to his sync mechanism), `docs/`,
`skills/`, `tests/`, `CLAUDE.md`.

## What does NOT need to be added

No new files are needed in `akash-coach-phelps` for GitHub auth. The GitHub App and session
handling live in the shared site (`coach-phelps-template`) only — no persistent storage layer
needed either (repo resolution is session-carried, not a KV lookup). This repo just needs to
stay discoverable and dispatchable — both already true today.
