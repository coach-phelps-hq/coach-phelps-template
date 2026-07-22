# Scaling Coach Phelps Beyond Two People

**Tracked, not yet started — blocks onboarding anyone new:** there's no public repo for a
brand-new friend to fork. Every part of the login/auth flow (installing the GitHub App,
signing up) assumes the user already has a coach-phelps repo with `SOUL.md` and
`training/challenge_v2.json` in it — true for Skanda and Akash only because both started from
hand-built personal repos. Recommended approach: fork/scrub one of the two existing personal
repos into a clean public starter (keep `SOUL.md`, `templates/`, `scripts/`,
`.github/workflows/`, strip real training data and history) that a new friend forks, fills in
their own sync credentials, then installs Coach Phelps on via "Sign up with GitHub." See
[issue #32](https://github.com/coach-phelps-hq/coach-phelps-template/issues/32).

**Status:** Website unification itself (Skanda + Akash, real shared site) is underway — see
`WEBSITE_UNIFICATION_PLAN.md` for that executable plan. This doc is the parking lot for
everything that only matters once there's a friend #3: fork history/background, provisioning
for brand-new users, page-set configurability, sync-source pluggability, and the IP-boundary
and funding questions raised while planning unification. Nothing here blocks
`WEBSITE_UNIFICATION_PLAN.md`'s milestones.

## Context

Skanda and Akash both forked the original coach-phelps repo and diverged after Strava's
free-tier API limits broke the shared setup on 2026-07-01. Skanda bought Strava Premium and
kept the original pipeline; Akash built a native iOS app that reads Apple HealthKit directly
and pushes to GitHub, bypassing Strava. Both now want to unify into something a new person
(including non-technical friends) could adopt without needing GitHub/pipeline knowledge.

**Key discovery this round:** Skanda already has a third local repo, `coach-phelps-template`,
which turns out to be a substantially-built answer to exactly this problem — not a hosted
multi-tenant website, but a "use this template" clone-per-user model with genericized
SOUL.md/state.md and a real `SETUP.md` onboarding guide. This changes the recommendation
from my first pass: rather than building GitHub-OAuth-login + live-fetch-from-repo (a
sizeable new engineering project), the cheaper and more consistent path is to **converge
Akash's fork into `coach-phelps-template` as the canonical base**, folding Akash's genuinely
new work (HealthKit sync, badminton analytics, ios-builder agent) into it as optional
modules rather than hardcoded content.

Scope for today: design/reconciliation plan only, zero code changes. Only Skanda + Akash are
real users right now; the ~10-friends case should be a checklist against this template later,
not new architecture.

## What the Three-Repo Comparison Found

**`coach-phelps` (Skanda, baseline)** — Strava Premium sync, Vercel deploy, running-focused.

**`akash-coach-phelps` (Akash's fork)** — a strict superset structurally, badminton-focused,
notably more built out in places:
- **iOS app (`ios/CoachPhelps.xcodeproj`)** — reads HealthKit directly and commits activity
  JSON straight to GitHub via the Contents API (`GitHubAPIClient.swift`,
  `HealthKitSyncManager.swift`), bypassing Strava's rate limits entirely. This is the
  workaround the user described, and it's a real, working alternate sync mechanism, not a
  hack — it has retry/backoff/ETag caching and a proper `GitHubAuthManager.swift`.
- Deployed on **Netlify** (not Vercel), with `ui/netlify/functions/trigger-sync.ts`
  hardcoded to `akash-suresh/coach-phelps` — same single-owner pattern as baseline's Vercel
  function, just a different host.
- Extra pages: rich `Analytics` with badminton-specific components (FatigueCurve,
  HrVsWinRate, OpponentStats, PartnerStats, ScoreDistribution, WinRateTrend), a full
  `workout-timer/` flow, `Deprecated.tsx`.
- Extra `.github/agents/ios-builder.md` (a fourth agent role for the iOS app), extra Claude
  Code `skills/` (apple-fitness-screenshot-parser, ebadders-match-parser), extra docs/ (13
  design docs including ios-app-spec.md), an extra `validate-data.yml` workflow.
- SOUL.md is the same architecture/rules-engine skeleton as baseline (Boot Sequence →
  Guardrails → Identity → Philosophy → Situation Playbook → Rules Engine → Workflows →
  Commit Protocol) — just filled with badminton content (opponent tracking, ebadders) and
  one added step: a "freshness guard" checking Strava sync staleness, a direct symptom of
  the original problem.
- `training/state.md` uses the same rolling-notes/injury-flags/week-plan schema as baseline,
  and `challenge_v2.json` matches baseline's quest schema — **the core data model never
  actually diverged**, only the content and the sync mechanism did.

**`coach-phelps-template` (Skanda's existing genericization effort)** — ~19 commits of
deliberate templating work, further along than expected:
- Model chosen: **clone-your-own-copy** (GitHub "Use this template" → own repo → own Vercel
  deploy), not a hosted multi-tenant site. No auth/DB/login code exists anywhere in it.
- `SOUL.md`/`CLAUDE.md` genuinely rewritten to be generic, with a conversational "First
  Session Protocol" that intakes a new athlete instead of hardcoding one person — this is a
  better answer to "how does SOUL.md handle a new user" than the parameterization I
  originally proposed (a name/goal injection block).
- `training/state.md` fully blanked with instructional placeholders; `challenge_v2.json`
  genericized to an example challenge/quest structure.
- Real onboarding docs: `SETUP.md` (30-45 min guide: template button → PAT → Strava Premium
  OAuth → Vercel deploy → env var table), `HOW_IT_WORKS.md`, `TODO.md` tracking what's
  genericized vs. still gap.
- `trigger-sync.ts`/`sync.yml` were **already fully generic** (env-var driven: `GITHUB_REPO`,
  `GITHUB_WORKFLOW`, `GITHUB_PAT`, `PAT_TOKEN`) in the baseline itself — no work needed there.
- Documented gaps (from its own TODO.md): the three shipped analytics pages are "examples
  from one real setup," a new user with a different sport has to build their own page; one
  leftover personal field name (`akash_won` — this is in Akash's repo, see below) exists in
  match-parsing code; only Strava is supported as a sync source, no HealthKit/iOS path.

Note: `matchParser.ts`'s `akash_won: boolean` field lives in **Akash's fork**, not the
template — flagging it here because it's a concrete, small piece of Akash-specific naming
that needs genericizing (e.g. `player_won`) if his match-analytics pages get folded into the
shared template.

## Two Separate Problems, Not One

Skanda's follow-up question reframes this: *assume Akash's iOS/HealthKit app removes the
Strava Premium dependency entirely — what's next for unifying the website and scaling to
new users?* That's worth separating into two independent problems, because they have
different owners and different solutions:

1. **The sync problem (Strava Premium dependency)** — being solved by Akash's iOS app.
   Not blocking anything else below once it's real.
2. **The Claude Pro dependency** — explicitly *not* solved yet ("we haven't found a
   workaround"). This one doesn't have a workaround in the same sense the sync problem did,
   because it's not an API-limit problem, it's a "someone has to pay for or provide model
   access" problem. Any unified-website design has to either (a) keep assuming every user
   brings their own Claude Pro/Claude Code, same as today, or (b) centralize LLM cost onto
   whoever runs the website — a real ongoing expense, not a one-time engineering problem.
   **This plan keeps assuming (a) for now** — the unified site is a data/dashboard layer,
   not a hosted chat interface — because that's the only version of "scale to 10 friends"
   that doesn't require Skanda or Akash to personally fund everyone's Claude usage. Revisit
   this only if you're prepared to treat it as a paid product with real per-user API cost.

## Recommended Path: Template First, Then a Real Hosted Layer

`coach-phelps-template`'s clone-per-user model (Phase 1 below) already solves "give a new
user their own working instance." But it doesn't fully solve the "CS knowledge" barrier
Skanda is worried about — a non-technical friend still has to click through GitHub's
template button, generate a PAT, paste secrets into repo settings, and deploy to Vercel
themselves. That's a real barrier for someone from a non-CS background, even with a great
`SETUP.md`. So the plan has two phases: reconcile the forks into one solid template first
(cheap, mostly done already), then build a thin **hosted provisioning + dashboard layer** on
top of it that removes the manual repo/deploy/secrets steps — this is the part that actually
answers "how do we unify the website and scale."

### Phase 1 — Converge the forks into one template (cheap, do this first)

1. **Make sync mechanism pluggable, not Strava-only.** Akash's HealthKit/iOS path is a
   legitimately better solution to the free-tier problem than requiring Strava Premium from
   every friend (not everyone will want to pay for it). Add a documented "choose your sync
   source" step in `SETUP.md` — Strava Premium (existing pipeline) or HealthKit+iOS app
   (port Akash's `ios/CoachPhelps` project into the template, generalized). Both paths
   converge on the same `training/history/*.json` shape already, per the exploration above,
   so downstream pipeline/UI code doesn't need to know which source was used.

2. **Extract Akash's analytics pages into an optional module.** Badminton-specific
   components (OpponentStats, HrVsWinRate, etc.) become an installable/toggleable page set
   in the template rather than living only in his fork. This is the seed of the
   "plug-and-play pages" idea from the original ask — not a runtime feature-flag system for
   a shared site, but a documented "which page modules did you copy into your clone" choice
   at setup time, consistent with the clone-per-user model.

3. **Reconcile SOUL.md content, not structure** — the rules-engine skeleton already matches
   across all three repos. Akash's badminton-specific additions (opponent tracking, the
   freshness guard) should become optional sections the template's First Session Protocol
   can offer, not permanently baked in, so a runner and a badminton player both start from
   the same generic SOUL.md.

4. **Add the `ios-builder.md` agent role and its skills to the template** as an optional
   agent, documented as "only needed if you choose the HealthKit sync path" — same pattern
   as tech-lead/bob-the-builder/ui-expert, gated by which sync mechanism the user picked.

5. **Fix the known small issues while merging:** rename `akash_won` → something
   sport-agnostic if match-parsing logic gets pulled in; decide whether the template
   standardizes on Vercel or documents both Vercel and Netlify as supported deploy targets
   (Akash may have host preferences worth keeping optional too).

6. **Update `coach-phelps-template`'s own `TODO.md`** to reflect this merged scope once the
   above is decided, so it stays the single source of truth for "what's done, what's a gap."

### Phase 2 — One unified, hosted website (the actual "unify + scale" answer)

Once Phase 1 gives you a single clean template, build one shared site that removes the
manual GitHub/PAT/Vercel steps for new users, without touching how the coaching
conversation itself works (still local Claude Code / Claude Pro, per user, per repo).

**Architecture:**
- **Single Next.js/Vite app, one deploy** (keep Vercel — Skanda's existing setup, and the
  template already assumes it). This replaces both Skanda's Vercel site and Akash's Netlify
  site with one shared one.
- **Login with GitHub** (Auth.js/NextAuth's GitHub provider, or Supabase Auth's GitHub
  strategy — either is a few hours of setup, not a project). This is the only "account" a
  user needs — no separate password/signup system.
- **First-login auto-provisioning:** if the logged-in GitHub user has no coach repo yet, the
  site calls the GitHub API on their behalf (using the OAuth token's scopes) to instantiate
  `coach-phelps-template` into a new repo in *their* account — this is exactly what clicking
  "Use this template" does manually today, just automated. Store one row per user
  (`github_user_id → repo_full_name`) in a small Supabase table — this is the only "database"
  needed; it's a lookup, not a data store. All coaching data stays in the user's own repo,
  matching "your data, your repo."
- **Live data, not build-time bundling:** today `ui/client/src/data/*.json` is baked into the
  build for one specific user. The unified site instead fetches `training/challenge_v2.json`,
  `activities.json` etc. from the logged-in user's own repo via the GitHub Contents API at
  request time, scoped to their OAuth token. This is the one substantial piece of new code —
  everything else (charts, dashboard components, the badminton/running analytics pages from
  Phase 1) is reused as-is, just re-pointed at a dynamic data source instead of a static import.
- **Sync + secrets setup still needs a guided flow, not raw PAT-pasting:** the site can walk
  a new user through picking a sync source (Strava Premium OAuth button, or "install the
  iOS app" instructions once Akash's app is ready) and use the GitHub API to write the
  necessary repo secrets on their behalf during onboarding — removing the "generate a PAT
  and paste it into repo settings" step that's the actual CS-knowledge barrier today. This
  is real engineering work (GitHub API repo-secrets endpoint requires libsodium encryption
  client-side) but bounded and well-documented by GitHub.
- **New-user `ui/` leakage — file, don't build:** the `generate`-from-template endpoint (Section
  6, branch 3 in `WEBSITE_UNIFICATION_PLAN.md`) copies the *entire* template repo, `ui/` included,
  into a brand-new user's repo. Once the shared site is live, that `ui/` folder is dead weight —
  the new user never builds or deploys it, the shared site is the only UI. Doesn't affect Skanda
  or Akash (both onboard via the existing-repo branch, already-populated repos). Needs solving
  before friend #3: either strip `ui/`/`vercel.json`/`ui/api` from the repo right after
  `provision-repo.ts` creates it, or split into a data-only template used just for provisioning.
  Tracked as a filed issue, not designed yet.
- **Plug-and-play pages become a real toggle, not just a setup-time file copy:** with a
  shared site, the "which optional page modules did you install" question from Phase 1 can
  become an actual per-user settings toggle read from a small `features.json` in their repo,
  rendered dynamically — the runtime version of the idea, now that there's one codebase
  serving everyone.
- **Claude Pro / coaching conversation stays exactly as it is today** — the hosted site is a
  dashboard the user's coach data flows into, not a chat surface. Onboarding docs point the
  user at "open Claude Code, point it at your new repo" as the last setup step.

**What this buys a non-technical friend:** login with GitHub → click "set up my coach" →
pick a sync method → the site handles repo creation, secrets, and deploy — no manual PAT,
no manual Vercel account, no editing JSON by hand. What it does *not* remove: they still
need a GitHub account (unavoidable, since "your data, your repo" was the explicit design
choice) and their own Claude Pro subscription for the actual coaching sessions.

## Why This Scales to ~10 Friends

With Phase 1 done, onboarding is "clone the template, follow SETUP.md" — a real but
GitHub-literate-only barrier. With Phase 2 done, it drops to "log in with GitHub, click a
button, connect a sync method" — no manual repo/secret/deploy steps, closer to what a
non-CS friend can do unassisted. Either way, there's no centralized hosting bill for
coaching data or LLM usage: data lives in each user's own free GitHub repo, computed
dashboard views are served from one shared (cheap) Vercel deploy, and the Claude Pro
constraint is the one piece that remains genuinely unsolved and worth being upfront about
when inviting friend #3+.

## "Coach Phelps" Naming — Must Rename Before Any Public Launch

Surfaced while picking a name for the shared GitHub org. "Coach Phelps" is an unmistakable
reference to Michael Phelps — a specific, still-active, litigious-about-his-brand public figure
with his own commercial ventures in the same space (swim schools, a foundation, fitness/
supplement brands). That's a real legal exposure once this stops being private:

- **Right of publicity** — most US states (and many other countries) give a person legal control
  over commercial use of their name/identity, especially where it could suggest endorsement or
  affiliation. Applies even without using his photo — the name alone, used as a coaching
  persona, can be enough.
- **False endorsement (Lanham Act, in the US)** — separate federal claim if it reads like the app
  is "coached by" or affiliated with Michael Phelps when it isn't.
- **He actively defends his name commercially**, unlike a retired or lesser-known figure — raises
  both the odds of it being noticed and the seriousness of a response.

**Not a risk today** — private, non-commercial use between Skanda, Akash, and a couple of
friends is essentially zero exposure; nobody polices that. **Becomes a real risk the moment
Phase 2 (hosted, public-facing site) ships** — distributing something discoverable/shareable that
uses a real celebrity's name as the product persona.

**Action required before any public launch (not before Phase 1, not urgent yet):** rename the
public-facing persona/brand to something original, not tied to a real person. The coaching
concept doesn't need to change, just the name. Do this rename with plenty of runway — before
friends #3+ have "Coach Phelps" wired into their muscle memory, not after.

**GitHub org naming — interim decision, not the final brand:** the shared org is named
`coach-phelps-hq` for now (chosen while still private, easiest available option matching the
current internal name). GitHub orgs can be renamed later without losing the org's history/
membership/repos, but doing so means updating: any hardcoded org-name references (OAuth App
callback URLs, CI secrets, docs), and everyone's local git remotes (old-name → new-name; GitHub's
redirect for renamed orgs isn't guaranteed to last forever). **Bundle the org rename with the
public-brand rename above** — one coordinated pass, not two separate scrambles.

**Repo naming too — same bundle.** `coach-phelps-template` itself is also named after the
"Coach Phelps" persona and should be renamed in the same coordinated pass, not separately.
Renaming a GitHub repo mostly handles itself (GitHub redirects git/issue URLs for a while,
Vercel's Git integration tracks the repo by internal ID so it survives a rename), but still
needs manual follow-up: everyone's local git remotes, any hardcoded repo-name references (the
plan docs themselves currently spell out `coach-phelps-hq/coach-phelps-template` explicitly),
and Vercel's auto-generated `.vercel.app` domain — which is derived from the *project* name at
creation time, not the repo name, and needs a separate rename if you want it to match. If the
domain changes, the OAuth App's callback URL needs updating too.

## IP Boundary vs. Local Claude Code — Deferred, Genuinely Unresolved

Surfaced while explaining what the post-unification workflow looks like: the whole coaching
system runs on Claude Code reading `SOUL.md` (and the rest of the repo) from the filesystem it's
pointed at — there's no server-side "brain." That means "give a new user only the minimal
non-UI files, don't let them see SOUL.md / the coaching logic / how the rules engine works"
directly conflicts with "coaching runs locally on the user's own Claude Pro subscription, no
hosted LLM cost for us." You can't fully have both under the current architecture.

Three options, none decided, none needed while it's just Skanda + Akash (nothing to protect from
each other):

1. **Accept it's not protectable in the local-Claude-Code model.** Anyone invited can read
   SOUL.md, fork it, run their own instance independent of you. Probably fine for a
   friends-and-family tool — the real "product" is the ongoing coaching relationship/tuning, not
   a defensible secret. A values call, not a technical one.
2. **Move coaching to a hosted chat surface**, SOUL.md stays server-side. Reopens the Claude Pro
   cost problem below — this is the option that pairs with the funding-path note.
3. **Hybrid — minimal data-only repo per user, private "brain" repo you control**, with a
   bootstrap step that fetches SOUL.md from the private source at session start rather than
   committing it to the user's repo. Real new engineering, undesigned.

Revisit before inviting friend #3, not before.

## Funding Path for a Future Hosted Chat Surface

The "Claude Pro dependency" section above explicitly parks on option (a) — every user brings
their own subscription — because centralizing LLM cost is "a real ongoing expense, not a
one-time engineering problem." One idea raised while discussing the IP boundary above, worth
recording for whenever Phase 2 gets picked up: pair a hosted chat surface (option 2 above) with
a cheaper model path than everyone's own Claude Pro — a Gemini free tier, or a metered Claude API
integration billed centrally instead of per-user subscriptions. Not designed, not costed, just an
idea to start from instead of re-deriving the option space from scratch later.

## Ownership and Open Questions

Confirmed: `coach-phelps-template` (and the eventual Phase 2 hosted site) is jointly owned
by Skanda and Akash going forward — not one person's repo the other treats as upstream.

Remaining open questions, to work out as Phase 1/2 get built rather than block on now:
- ~~Whose analytics pages/components become the "default example"~~ — **Resolved:** all three
  existing pages (Run, Badminton, Badminton Match Analytics) ship to every user for now, no
  default/optional split. Making page inclusion configurable per user is tracked as a filed
  issue (see `WEBSITE_UNIFICATION_PLAN.md` Section 12), not designed yet.
- Once Akash's iOS app is real: does it stay iOS-only, or is Android/other-platform sync a
  future ask from other friends? (Not urgent — only matters once past friend #2-3. Still open.)
- ~~For Phase 2's auto-provisioning: does the GitHub OAuth app live under a shared org~~ —
  **Resolved:** a new shared GitHub org, with both Skanda and Akash as owners. See
  `WEBSITE_UNIFICATION_PLAN.md` Section 5.
