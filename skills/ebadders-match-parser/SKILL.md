---
name: ebadders-match-parser
description: Parse badminton match results from eBadders screenshots and Strava activity descriptions. Use when the user provides an eBadders screenshot, a Strava activity photo from ebadders.com, or a Strava description containing match scores.
---

# eBadders Match Parser

Extract structured badminton match data from two sources: eBadders app screenshots and Strava activity descriptions.

## Source 1: eBadders Screenshot

Use `file` tool with `view` action to read the screenshot. The layout is always:

- Header: Player name, venue, date, time
- Win/loss summary: e.g. "Win/loss: 29% (2 / 7)"
- Table with columns: **Winners** | **Score** | **Opponents**
- The player is highlighted in yellow

Extract into this format:

```
## Match Results — [Date], [Venue]
- **Session:** [time]
- **Win/Loss:** [X]/[Y] ([Z]%)
- **Games:**

| # | Partner | Score | Opponents | W/L |
|---|---------|-------|-----------|-----|
| 1 | [name]  | XX-XX | [name] + [name] | W/L |
```

Rules for the table:
- The player's partner is the other name on the player's side (Winners or Opponents column depending on which side the player is highlighted).
- If the player is on the Winners side, result is **W**. If on the Opponents side, result is **L**.
- List only the partner name, not the player. If the player has no partner listed (singles), write "Solo".
- Score is always as shown (winner's score first as displayed).

## Source 2: Strava Description

Strava descriptions follow this pattern:

```
[Notes]
Friendlies
[Player], [Partner] vs [Opp1], [Opp2] [Score]
[Player], [Partner] vs [Opp1], [Opp2] [Score]
```

Extract into the same table format. The score (e.g. "19-21") tells the result — if the first number is lower, it's a loss for the first-listed pair.

## Merging Sources

When both an eBadders screenshot and a Strava description are available for the same session, merge them:
- eBadders has the **club games** (mixed partners, assigned by rotation).
- Strava description has **friendlies** (self-organised games, usually listed under "Friendlies").
- Output two separate tables under headings `### Club Games` and `### Friendlies`.

## Output

Output only the formatted data block. No commentary or analysis.
