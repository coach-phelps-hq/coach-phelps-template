---
name: apple-fitness-screenshot-parser
description: Extract structured workout data from Apple Fitness (Apple Watch) screenshot images. Use when the user provides one or more Apple Fitness workout summary screenshots and wants the data extracted into a formatted text block.
---

# Apple Fitness Screenshot Parser

Extract workout metrics from Apple Watch Fitness app screenshots or Strava API into a standardized text format.

## Method 1: Screenshots

1. Receive one or more screenshot images of an Apple Fitness workout summary.
2. Use the `file` tool with `view` action to read each screenshot.
3. Extract only the values visibly shown — never estimate or round.
4. If multiple screenshots cover the same workout, merge into one output block.
5. Output the formatted block and nothing else — no commentary or analysis.

## Method 2: Strava API

If the user asks to pull data from Strava (or says "log a workout" without providing screenshots), use this repo's own `strava/` scripts — no separate copy is bundled with this skill.

Token file location: `strava/strava_tokens.json` (gitignored — see `.env.example`/`SETUP.md` for how it's created). The scripts auto-refresh expired tokens via `strava/strava_api.py`.

### Usage

```bash
# Latest activity
python3 strava/fetch_strava.py --last 1

# Last N activities
python3 strava/fetch_strava.py --last 3

# Specific activity by ID
python3 strava/query_history.py --id 12345678901

# Activities on a specific date
python3 strava/query_history.py --from 2026-03-23 --to 2026-03-23
```

## Output Format

```
## Workout Data — [Date]
- **Activity:** [e.g., Badminton, Running]
- **Time:** [start]-[end]
- **Duration:** [Xh Xm]
- **Active Calories:** [X] kcal
- **Total Calories:** [X] kcal
- **Avg Heart Rate:** [X] BPM
- **Peak Heart Rate:** [X] BPM
- **Effort:** [X]/10 ([label])
- **HR Zones:**
  - Zone 1 (<[X] BPM): [time]
  - Zone 2 ([X]-[X] BPM): [time]
  - Zone 3 ([X]-[X] BPM): [time]
  - Zone 4 ([X]-[X] BPM): [time]
  - Zone 5 ([X]+ BPM): [time]
- **Post-Workout Recovery:** [X] BPM at 0min → [X] BPM at 1min
```

## Rules

- Extract only what is visible (screenshots) or available (API). Omit any field not present.
- Use exact values — do not estimate or round.
- HR zone boundaries vary per person — extract the exact BPM ranges shown.
- If multiple screenshots are provided for the same workout, merge into one block.
- Strava free tier does not provide active vs total calorie split. HR zones are computed from the raw HR stream using the personal zone boundaries hardcoded in `strava/fetch_strava.py`/`strava/query_history.py`.
- To update zone boundaries, edit the `HR_ZONES` list in those scripts (already marked `# CUSTOMIZE` there).
- Output the formatted data block only. No extra commentary.
