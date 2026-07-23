#!/usr/bin/env python3
"""Parse an eBadders HTML profile page to extract all session match data.

# ── CUSTOMIZE ────────────────────────────────────────────────────────────────
# PLAYER_NAME below must match how you're highlighted in your own eBadders
# export (the script looks for the "yellow" highlight style on your name).
"""

import json
import re
import sys
from pathlib import Path
from bs4 import BeautifulSoup

REPO_ROOT = Path(__file__).resolve().parent.parent

# ── CUSTOMIZE: not currently used for detection (that's done via highlight
# style below), kept here as a single place to note who this export is for.
PLAYER_NAME = "Player"


def parse_ebadders(html_path):
    soup = BeautifulSoup(Path(html_path).read_text(), "html.parser")

    sessions = []
    table = soup.find("table", class_="table")
    if not table:
        print("No table found")
        return []

    rows = table.find_all("tr")
    current_session = None

    for row in rows:
        # Session header
        h3 = row.find("h3")
        if h3:
            if current_session and current_session.get("matches"):
                sessions.append(current_session)

            link = h3.find("a")
            session_url = link.get("href", "") if link else ""
            session_text = h3.get_text(strip=True)

            # Extract session ID from parent tr
            session_id = row.get("id", "")

            current_session = {
                "session_id": session_id,
                "date_text": session_text,
                "url": session_url,
                "win_loss": None,
                "matches": [],
            }
            continue

        # Win/loss row
        td = row.find("td", colspan="10")
        if td and current_session:
            text = td.get_text(strip=True)
            if "Win/loss" in text:
                current_session["win_loss"] = text
            continue

        # Match row (has 3 tds: winners, score, opponents)
        tds = row.find_all("td")
        if len(tds) == 3 and current_session:
            winners_td, score_td, opponents_td = tds

            # Extract player names — the player is the one highlighted in yellow
            def get_players(td):
                spans = td.find_all("span")
                players = []
                for s in spans:
                    name = s.get_text(strip=True)
                    is_player = "yellow" in s.get("style", "")
                    if name:
                        players.append({"name": name, "is_player": is_player})
                return players

            winners = get_players(winners_td)
            opponents = get_players(opponents_td)
            score = score_td.get_text(strip=True)

            player_won = any(p["is_player"] for p in winners)

            match = {
                "winners": [p["name"] for p in winners],
                "opponents": [p["name"] for p in opponents],
                "score": score,
                "player_won": player_won,
                "player_team": "winners" if player_won else "opponents",
            }

            # Figure out partner and opposition
            if player_won:
                match["partner"] = [p["name"] for p in winners if not p["is_player"]]
                match["vs"] = [p["name"] for p in opponents]
            else:
                match["partner"] = [p["name"] for p in opponents if not p["is_player"]]
                match["vs"] = [p["name"] for p in winners]

            current_session["matches"].append(match)

    # Don't forget last session
    if current_session and current_session.get("matches"):
        sessions.append(current_session)

    return sessions


def parse_date(date_text):
    """Parse 'Mon 23 Mar 2026, 1pm' into ISO date."""
    # Remove day-of-week and time
    # Format: "Day DD Mon YYYY, Time"
    m = re.match(r'\w+ (\d+) (\w+) (\d+)', date_text)
    if m:
        day, month_str, year = m.groups()
        months = {'Jan':1,'Feb':2,'Mar':3,'Apr':4,'May':5,'Jun':6,
                  'Jul':7,'Aug':8,'Sep':9,'Oct':10,'Nov':11,'Dec':12}
        month = months.get(month_str, 1)
        return f"{year}-{month:02d}-{int(day):02d}"
    return None


if __name__ == "__main__":
    # CUSTOMIZE: pass your own eBadders HTML export path as the first argument,
    # e.g. `python3 strava/parse_ebadders.py path/to/your-ebadders-export.html`
    if len(sys.argv) < 2:
        sys.exit("Usage: parse_ebadders.py <path-to-ebadders-html-export>")
    html_path = sys.argv[1]
    sessions = parse_ebadders(html_path)

    # Enrich with parsed dates
    for s in sessions:
        s["date"] = parse_date(s["date_text"])
        wins = sum(1 for m in s["matches"] if m["player_won"])
        losses = len(s["matches"]) - wins
        s["wins"] = wins
        s["losses"] = losses
        s["total"] = len(s["matches"])
        s["win_pct"] = round(wins / len(s["matches"]) * 100) if s["matches"] else 0

    if not sessions:
        print("No sessions parsed.")
        sys.exit(0)

    # Sort by date (newest first as in HTML)
    print(f"Total sessions: {len(sessions)}")
    print(f"Date range: {sessions[-1]['date']} to {sessions[0]['date']}")
    print()

    for s in sessions:
        print(f"{s['date']} | W:{s['wins']} L:{s['losses']} ({s['win_pct']}%) | {s['total']} games | {s['date_text']}")

    # Save full data, relative to this repo's own training/ directory
    out_path = REPO_ROOT / "training" / "ebadders_history.json"
    out_path.write_text(json.dumps(sessions, indent=2) + "\n")
    print(f"\nSaved to {out_path}")
