#!/usr/bin/env python3
"""Merge eBadders match data into corresponding Strava activity JSON files.

Matches eBadders sessions to Monday badminton activities by date.
Adds 'ebadders' key with match results, win/loss, and session metadata.
"""

import json
from datetime import datetime
from pathlib import Path

REPO_DIR = Path(__file__).resolve().parent.parent
HISTORY_DIR = REPO_DIR / "training" / "history"
EBADDERS_PATH = REPO_DIR / "training" / "ebadders_history.json"


def main():
    ebadders = json.loads(EBADDERS_PATH.read_text())

    # Index eBadders sessions by date
    eb_by_date = {}
    for s in ebadders:
        if s.get("date"):
            eb_by_date[s["date"]] = s

    # Find all Monday badminton activities
    matched = 0
    already = 0
    no_match = 0

    for f in sorted(HISTORY_DIR.glob("*.json")):
        data = json.loads(f.read_text())
        sport = data.get("sport_type", data.get("type", ""))
        if sport != "Badminton":
            continue

        start = data.get("start_date_local", "")
        if not start:
            continue

        dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
        date_str = dt.strftime("%Y-%m-%d")

        # Check if we have eBadders data for this date
        if date_str not in eb_by_date:
            continue

        eb = eb_by_date[date_str]

        if "ebadders" in data:
            already += 1
            print(f"  SKIP (already has ebadders): {date_str} | {data.get('name')}")
            continue

        # Add eBadders data
        data["ebadders"] = {
            "session_id": eb["session_id"],
            "date_text": eb["date_text"],
            "url": eb["url"],
            "win_loss": eb["win_loss"],
            "wins": eb["wins"],
            "losses": eb["losses"],
            "total": eb["total"],
            "win_pct": eb["win_pct"],
            "matches": eb["matches"],
        }

        f.write_text(json.dumps(data, indent=2) + "\n")
        matched += 1
        print(f"  MERGED: {date_str} | {data.get('name')} | {eb['wins']}W-{eb['losses']}L")

    print(f"\nDone. Merged: {matched}, Already had data: {already}, eBadders sessions with no Strava match: {len(eb_by_date) - matched - already}")


if __name__ == "__main__":
    main()
