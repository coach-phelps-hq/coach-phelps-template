#!/usr/bin/env python3
"""
Parse raw match descriptions pasted into Strava and produce:
  1. A formatted Strava description string
  2. A structured dict for ebadders_history.json

Supports two input formats for ranked games:

Format A — manual entry:
    {partner} me vs {opp1}/{opp2} {our_score}-{their_score}

Format B — eBadders table copy-paste (tab-separated):
    Winners	Score	Opponents
    Riley + Player	21-14	Sam + Jordan

Both formats can include:
    [#notes Free text]
    [#rank N]
    [---]           (separator: ranked above, friendlies below)

Output format:
    {notes}

    {W}W-{L}L ({pct}%) [| Rank: #{rank}]

    Games:
    {W|L} {score} w/ {partner} vs {opp1} + {opp2}

    [Friendlies:]
    {W|L} {score} w/ {partner} vs {opp1} + {opp2}
"""

import re
from typing import Optional

# --- Format A: manual entry ---
# Regex for a game line: partner  me vs  opponents  score
GAME_RE = re.compile(r"^(.+?)\s+me\s+vs\s+(.+?)\s+(\d+-\d+)$", re.IGNORECASE)

# Detection: already formatted
FORMATTED_MARKER = "Games:\n"

# Detection: raw input (contains at least one "me vs" pattern)
RAW_MARKER_RE = re.compile(r"\bme\s+vs\b", re.IGNORECASE)

# --- Format B: eBadders table ---
# Header detection (tab-separated, case-insensitive)
EBADDERS_HEADER_RE = re.compile(r"^winners\s+score\s+opponents", re.IGNORECASE)

# eBadders game line: {team1} \t {score} \t {team2} [trailing tabs]
EBADDERS_LINE_RE = re.compile(
    r"^(.+?)\t+(\d+-\d+)\t+(.+?)(?:\t*)$"
)

# ── CUSTOMIZE: the player name to look for in eBadders table rows ───────────
PLAYER_NAME = "Player"
PLAYER_RE = re.compile(rf"\b{re.escape(PLAYER_NAME)}\b", re.IGNORECASE)


def is_already_formatted(description: str) -> bool:
    """Return True if the description already contains the formatted marker."""
    return FORMATTED_MARKER in description


def is_raw_input(description: str) -> bool:
    """Return True if the description looks like raw match input."""
    return bool(RAW_MARKER_RE.search(description)) or _has_ebadders_table(description)


def _has_ebadders_table(text: str) -> bool:
    """Return True if the text contains an eBadders table header."""
    for line in text.strip().splitlines():
        if EBADDERS_HEADER_RE.match(line.strip()):
            return True
    return False


def _parse_game_line(line: str) -> Optional[dict]:
    """Parse a single Format A game line. Returns dict or None if malformed."""
    line_clean = line.strip()

    pre_note = None
    post_note = None
    if " | " in line_clean:
        line_clean, mental = line_clean.split(" | ", 1)
        if " :: " in mental:
            pre_note, post_note = [s.strip() for s in mental.split(" :: ", 1)]
        else:
            pre_note = mental.strip()

    m = GAME_RE.match(line_clean)
    if not m:
        return None
    partner = m.group(1).strip()
    opponents_raw = m.group(2).strip()
    score_raw = m.group(3).strip()

    opponents = [o.strip() for o in opponents_raw.split("/")]
    our, theirs = score_raw.split("-")
    our, theirs = int(our), int(theirs)
    won = our > theirs

    result: dict = {
        "partner": partner,
        "vs": opponents,
        "score": score_raw,
        "player_won": won,
    }
    if pre_note is not None:
        result["pre_note"] = pre_note
    if post_note is not None:
        result["post_note"] = post_note
    return result


def _parse_ebadders_line(line: str) -> Optional[dict]:
    """
    Parse a single eBadders table row (tab-separated).
    Determines W/L based on which side contains PLAYER_NAME.
    Returns dict matching the same shape as _parse_game_line output, or None.
    """
    line_clean = line.strip()

    pre_note = None
    post_note = None
    if " | " in line_clean:
        line_clean, mental = line_clean.split(" | ", 1)
        if " :: " in mental:
            pre_note, post_note = [s.strip() for s in mental.split(" :: ", 1)]
        else:
            pre_note = mental.strip()

    m = EBADDERS_LINE_RE.match(line_clean)
    if not m:
        return None

    winners_raw = m.group(1).strip()
    score_raw = m.group(2).strip()
    losers_raw = m.group(3).strip()

    # Clean up any special characters (e.g., ♕)
    winners_clean = re.sub(r"[♕♔♛♚]", "", winners_raw).strip()
    losers_clean = re.sub(r"[♕♔♛♚]", "", losers_raw).strip()

    # Split teams by "+"
    winners = [p.strip() for p in winners_clean.split("+")]
    losers = [p.strip() for p in losers_clean.split("+")]

    # Determine which side the player is on
    player_in_winners = any(PLAYER_RE.search(p) for p in winners)
    player_in_losers = any(PLAYER_RE.search(p) for p in losers)

    if not player_in_winners and not player_in_losers:
        # Player not in this game — skip
        return None

    if player_in_winners:
        player_won = True
        partner_list = [p for p in winners if not PLAYER_RE.search(p)]
        opponents = losers
        # Score is already winners-losers from eBadders
    else:
        player_won = False
        partner_list = [p for p in losers if not PLAYER_RE.search(p)]
        opponents = winners
        # Flip the score so it's always the player's team score first
        parts = score_raw.split("-")
        score_raw = f"{parts[1]}-{parts[0]}"

    partner = partner_list[0] if partner_list else "Solo"

    result: dict = {
        "partner": partner,
        "vs": opponents,
        "score": score_raw,
        "player_won": player_won,
    }
    if pre_note is not None:
        result["pre_note"] = pre_note
    if post_note is not None:
        result["post_note"] = post_note
    return result


def parse_raw_description(raw: str) -> Optional[dict]:
    """
    Parse a raw match description string.

    Returns a dict with keys:
        notes:      str or None
        rank:       int or None
        ranked:     list[dict]   (games above ---)
        friendlies: list[dict]   (games below ---)
        warnings:   list[str]

    Returns None if the input is empty, already formatted, or has no parseable games.
    """
    if not raw or not raw.strip():
        return None

    if is_already_formatted(raw):
        return None

    notes = None
    rank = None
    pre_mental_state = None
    ranked_games: list[dict] = []
    friendly_games: list[dict] = []
    warnings: list[str] = []
    in_friendlies = False
    has_separator = False
    in_ebadders_table = False
    had_ebadders_table = False  # Track if we parsed any eBadders rows

    for i, line in enumerate(raw.strip().splitlines(), start=1):
        line_stripped = line.strip()
        if not line_stripped:
            continue

        # Metadata: #notes
        if line_stripped.lower().startswith("#notes "):
            notes = line_stripped[7:].strip()
            continue

        # Metadata: #rank
        m_rank = re.match(r"^#rank\s+(\d+)$", line_stripped, re.IGNORECASE)
        if m_rank:
            rank = int(m_rank.group(1))
            continue

        # Metadata: PRE: score, word
        m_pre = re.match(r"^PRE:\s*(\d+),\s*(.+)$", line_stripped, re.IGNORECASE)
        if m_pre:
            pre_mental_state = {"score": int(m_pre.group(1)), "word": m_pre.group(2).strip()}
            continue

        # Separator
        if line_stripped == "---":
            has_separator = True
            in_friendlies = True
            in_ebadders_table = False  # Table ends at separator
            continue

        # eBadders table header detection
        if EBADDERS_HEADER_RE.match(line_stripped):
            in_ebadders_table = True
            had_ebadders_table = True
            continue

        # Try eBadders table format first (if we're in a table)
        if in_ebadders_table and "\t" in line:
            game = _parse_ebadders_line(line)
            if game is not None:
                if in_friendlies:
                    friendly_games.append(game)
                else:
                    ranked_games.append(game)
                continue
            else:
                # Tab-separated line but couldn't parse — might be noise
                # (trailing empty rows from copy-paste)
                if not line_stripped.replace("\t", "").strip():
                    continue
                warnings.append(f"Line {i} skipped: malformed eBadders row '{line_stripped}'")
                continue

        # Even without header, try eBadders format if line has tabs and "+"
        if not in_ebadders_table and "\t" in line and "+" in line:
            game = _parse_ebadders_line(line)
            if game is not None:
                if in_friendlies:
                    friendly_games.append(game)
                else:
                    ranked_games.append(game)
                continue

        # Try Format A (manual entry)
        if RAW_MARKER_RE.search(line_stripped):
            game = _parse_game_line(line_stripped)
            if game is None:
                warnings.append(f"Line {i} skipped: malformed input '{line_stripped}'")
                continue
            if in_friendlies:
                friendly_games.append(game)
            else:
                ranked_games.append(game)
            continue

        # Unknown line — skip silently (noise from copy-paste)

    # eBadders table rows are in reverse chronological order (last game on top).
    # Reverse ranked games if they came from an eBadders table so game 1 is first.
    if had_ebadders_table and ranked_games:
        ranked_games.reverse()

    all_games = ranked_games + friendly_games
    if not all_games:
        return None

    return {
        "notes": notes,
        "rank": rank,
        "pre_mental_state": pre_mental_state,
        "ranked": ranked_games,
        "friendlies": friendly_games,
        "has_separator": has_separator,
        "warnings": warnings,
    }


def format_description(parsed: dict) -> str:
    """
    Turn a parsed dict into the formatted Strava description string.
    """
    lines: list[str] = []

    # Notes at top
    if parsed["notes"]:
        lines.append(parsed["notes"])
        lines.append("")

    # Summary line — W/L counts ranked games only if separator present,
    # otherwise all games count.
    if parsed["has_separator"]:
        count_games = parsed["ranked"]
    else:
        count_games = parsed["ranked"] + parsed["friendlies"]

    wins = sum(1 for g in count_games if g["player_won"])
    losses = len(count_games) - wins
    total = len(count_games)
    pct = round(wins / total * 100) if total else 0

    summary = f"{wins}W-{losses}L ({pct}%)"
    if parsed["rank"] is not None:
        summary += f" | Rank: #{parsed['rank']}"
    lines.append(summary)

    # Game lines helper
    def fmt_game(g: dict) -> str:
        result = "W" if g["player_won"] else "L"
        opp_str = " + ".join(g["vs"])
        return f"{result} {g['score']} w/ {g['partner']} vs {opp_str}"

    # Ranked / main games
    if parsed["ranked"]:
        lines.append("")
        lines.append("Games:")
        for g in parsed["ranked"]:
            lines.append(fmt_game(g))

    # Friendlies
    if parsed["friendlies"]:
        lines.append("")
        lines.append("Friendlies:")
        for g in parsed["friendlies"]:
            lines.append(fmt_game(g))

    return "\n".join(lines)


def build_structured_entry(parsed: dict, date: str, activity_id: int) -> dict:
    """
    Build a structured dict suitable for appending to ebadders_history.json.
    """
    all_games = parsed["ranked"] + parsed["friendlies"]
    wins = sum(1 for g in all_games if g["player_won"])
    losses = len(all_games) - wins
    total = len(all_games)
    pct = round(wins / total * 100) if total else 0

    def _build_match(g: dict) -> dict:
        m: dict = {
            "partner": g["partner"],
            "vs": g["vs"],
            "score": g["score"],
            "player_won": g["player_won"],
        }
        if g.get("pre_note") is not None:
            m["pre_note"] = g["pre_note"]
        if g.get("post_note") is not None:
            m["post_note"] = g["post_note"]
        return m

    return {
        "date": date,
        "activity_id": activity_id,
        "pre_mental_state": parsed.get("pre_mental_state"),
        "source": "manual",
        "wins": wins,
        "losses": losses,
        "total": total,
        "win_pct": pct,
        "matches": [_build_match(g) for g in all_games],
    }


def parse_and_format(raw: str) -> Optional[tuple[str, dict]]:
    """
    Convenience wrapper. Returns (formatted_description, parsed_dict) or None.
    """
    parsed = parse_raw_description(raw)
    if parsed is None:
        return None
    return format_description(parsed), parsed


PRE_RE = re.compile(r"^PRE:\s*(\d+),\s*(.+)$", re.IGNORECASE | re.MULTILINE)


def extract_pre_mental_state(description: str) -> Optional[dict]:
    """Extract PRE: score/word from any description (raw or already-formatted).

    Returns {"score": int, "word": str} or None if not present.
    PRE: is intentionally not written to Strava — this is for local storage only.
    """
    m = PRE_RE.search(description)
    if m:
        return {"score": int(m.group(1)), "word": m.group(2).strip()}
    return None
