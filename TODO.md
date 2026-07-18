# coach-phelps-template — TODO

## Done (v1)
- [x] SOUL.md — generic Phelps identity + First Session Protocol
- [x] training/state.md — blank athlete template
- [x] training/challenge_v2.json — parameterized quest schema (config-driven patterns, no hardcoded sport logic)
- [x] scripts/generate_quest_log.py — fully config-driven (weekly_targets + main quest regex from JSON)
- [x] Strava sync scripts — fetch_strava.py, query_history.py, strava_api.py, oauth_reauth.py
- [x] SETUP.md — clone → Strava auth → HR zones → first session guide
- [x] .gitignore, .env.example
- [x] README.md, CLAUDE.md

---

## Done (v2)
- [x] **Automated sync pipeline** — `scripts/run_sync_pipeline.py` + `.github/workflows/sync.yml`, manually triggered by default (`workflow_dispatch`), can be put on a cron schedule per SETUP.md step 8.
- [x] **Workout template system** — `templates/` folder with generic starter templates (calisthenics, strength, foundation, recovery). `ui/scripts/build-data.mjs` compiles templates plus any coach-written `sessions/*.json` overrides into the dashboard's workout data automatically on every `npm run dev`/`build`.
- [x] **Dashboard on Vercel** — `ui/` deploys via Vercel (`vercel.json`, `ui/api/trigger-sync.ts`), includes three example analytics pages (Badminton/Run/Monthly) as reference implementations.
- [x] **Activity rename system** — `strava/rename_core.py` + `rename_activities.py` for consistent naming.
- [x] **Multi-agent setup** — `.github/agents/` (Tech Lead, UI Expert, Bob the Builder) for engineering work on the repo itself, routed via `CLAUDE.md`.

## P1 — V2 Enhancements

- [ ] **SOUL.md v2** — iterate on First Session Protocol and coaching quality after first 2-3 real users. Expected gaps: quest setup flow, weekly planning for unfamiliar sports, goal-setting depth.

- [ ] **Sport-agnostic analytics option** — the three analytics pages (`BadmintonAnalytics`, `RunAnalytics`, `MonthlyAnalytics`) are provided as examples from one real setup. A user doing a different sport has to build their own page from scratch rather than adapt a generic one. Consider adding a lightweight generic analytics page alongside them (activity heatmap, volume by sport type, HR zone distribution, streak counters) that works for any sport out of the box.

---

## P2 — Later

- [ ] **Proactive morning briefing** — scheduled task (GitHub Action or cron) that generates a daily briefing from state.md + quest_log.md and surfaces it via a notification or commit.

- [ ] **Milestone quest type** — schema already supports `milestone` type but it's undocumented and unrendered in generate_quest_log.py. Document and implement rendering.

- [ ] **Structured memory system** — when `training/coach_notes.md` exceeds ~600 lines, distill permanent patterns into `training/key_insights.md` and archive old notes. Relevant ~6 months in for active users.

- [ ] **Travel/bodyweight mode** — Coach detects travel context and switches to a bodyweight-only plan. Return protocol to ramp back up. Define in SOUL.md.

- [ ] **Readiness score** — daily 1-100 score derived from sleep, soreness, PRE, and streak data. Helps Coach calibrate session intensity without asking every time.
