# Badminton categories

This template uses `ranked/league/friendly/casual` as the single badminton category scheme. Both badminton pages work out of the box with this scheme.

## Strava naming conventions

The classification logic in `getTrainingCategory()` (`ui/client/src/lib/activities.ts`) maps activity names to categories like this:

| Strava activity name | Category |
|---|---|
| `Badminton: Ranked #N` | `badminton_ranked` |
| `Badminton: League #N` | `badminton_league` |
| `Badminton: Friendly #N` | `badminton_friendly` |
| `Badminton: Casual #N` | `badminton_casual` |
| Any `sport_type === "Badminton"` fallback | `badminton_casual` |

## What each page shows

- **`/badminton`** (`BadmintonAnalytics.tsx`) - training load page. Filters for all four badminton categories and shows TRIMP-based load charts, HR zone breakdowns, fitness/fatigue trends, and session history. The "Ranked vs All" distinction doesn't matter here - all sessions feed the load charts regardless of sub-category.

- **`/badminton-match-analytics`** (`BadmintonMatchAnalytics.tsx`) - match analytics page. Shows win/loss records, match scores, partner/opponent stats, and a Ranked vs All toggle. The toggle uses `badminton_ranked` for Ranked mode and all four categories for All mode. Also parses structured win/loss data from Strava activity descriptions - see `ui/client/src/lib/matchParser.ts` for the expected description formats.

## If you want to remove one of the pages

- To remove `/badminton-match-analytics`: delete `ui/client/src/pages/BadmintonMatchAnalytics.tsx`, `ui/client/src/components/badminton-match-analytics/`, `ui/client/src/lib/matchParser.ts`, and its route + nav link in `App.tsx` / `CommandStrip.tsx`.
- To remove `/badminton`: delete `ui/client/src/pages/BadmintonAnalytics.tsx`, `ui/client/src/components/badminton-analytics/`, and its route + nav link.
