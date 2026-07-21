/**
 * matchParser.ts - Parse match descriptions from Strava activity descriptions.
 *
 * Handles two description formats:
 * 1. Enriched descriptions (from strava-enrichment pipeline)
 * 2. eBadders structured data (fallback)
 *
 * Score convention: scores are always winner-loser in ranked (ebadders) descriptions,
 * and player's-score-first in friendly descriptions. We use the W/L result to determine
 * myScore vs oppScore universally: W → myScore = max, L → myScore = min.
 */

import type { Activity } from "./activities";
import { normalizeName } from "./nameAliases";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ParsedGame {
  result: "W" | "L";
  score: string;           // "21-18"
  myScore: number;         // player's score
  oppScore: number;        // Opponent's score
  margin: number;          // positive for wins, negative for losses
  partner: string;
  opponents: string[];
  gameNumber: number;      // 1-indexed position in session (across games + friendlies)
  isFriendly: boolean;     // true if in the "Friendlies:" section
}

export interface ParsedMatch {
  wins: number;
  losses: number;
  winPct: number;
  comment: string | null;
  games: ParsedGame[];
  friendlies: ParsedGame[];
}

// ─── Description Parser ─────────────────────────────────────────────────────

const WL_SUMMARY_RE = /(\d+)W[–-](\d+)L\s*\((\d+)%?\)/;
const GAME_LINE_RE = /^(W|L)\s+(\d+)[–-](\d+)\s+w\/\s+(.+?)\s+vs\s+(.+)$/i;

function parseGameLine(line: string, gameNumber: number, isFriendly: boolean): ParsedGame | null {
  const m = line.trim().match(GAME_LINE_RE);
  if (!m) return null;

  const result = m[1].toUpperCase() as "W" | "L";
  const s1 = parseInt(m[2], 10);
  const s2 = parseInt(m[3], 10);
  const partner = normalizeName(m[4].trim());
  const opponents = m[5].split(/\s*\+\s*/).map((s) => normalizeName(s.trim())).filter(Boolean);

  // Determine Sky's score vs opponent's score from result
  const myScore = result === "W" ? Math.max(s1, s2) : Math.min(s1, s2);
  const oppScore = result === "W" ? Math.min(s1, s2) : Math.max(s1, s2);
  const margin = myScore - oppScore; // positive for wins, negative for losses

  return {
    result,
    score: `${s1}-${s2}`,
    myScore,
    oppScore,
    margin,
    partner,
    opponents,
    gameNumber,
    isFriendly,
  };
}

export function parseDescription(description: string | null): ParsedMatch | null {
  if (!description) return null;

  const lines = description.split("\n").map((l) => l.trim());

  // Find the W-L summary line
  let summaryIdx = -1;
  let summaryWins = 0;
  let summaryLosses = 0;
  let summaryPct = 0;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(WL_SUMMARY_RE);
    if (m) {
      summaryIdx = i;
      summaryWins = parseInt(m[1], 10);
      summaryLosses = parseInt(m[2], 10);
      summaryPct = parseInt(m[3], 10);
      break;
    }
  }

  if (summaryIdx === -1) return null;

  // Extract comment (free text before the W-L line)
  const commentLines = lines.slice(0, summaryIdx).filter((l) => l.length > 0);
  const comment = commentLines.length > 0 ? commentLines.join("\n") : null;

  // Find "Games:" marker
  let gamesStartIdx = -1;
  for (let i = summaryIdx + 1; i < lines.length; i++) {
    if (/^Games:/i.test(lines[i])) {
      gamesStartIdx = i + 1;
      break;
    }
  }

  // If no "Games:" section, return summary-only result
  if (gamesStartIdx === -1) {
    return {
      wins: summaryWins,
      losses: summaryLosses,
      winPct: summaryPct,
      comment,
      games: [],
      friendlies: [],
    };
  }

  // Parse game lines, splitting at "Friendlies:" separator
  const games: ParsedGame[] = [];
  const friendlies: ParsedGame[] = [];
  let inFriendlies = false;
  let gameNumber = 1;

  for (let i = gamesStartIdx; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    if (/^Friendlies:/i.test(line)) {
      inFriendlies = true;
      continue;
    }

    const game = parseGameLine(line, gameNumber, inFriendlies);
    if (game) {
      if (inFriendlies) {
        friendlies.push(game);
      } else {
        games.push(game);
      }
      gameNumber++;
    }
  }

  // Compute actual wins/losses from parsed games (may differ from summary if friendlies included)
  const allGames = [...games, ...friendlies];
  const actualWins = allGames.filter((g) => g.result === "W").length;
  const actualLosses = allGames.filter((g) => g.result === "L").length;
  const total = actualWins + actualLosses;

  return {
    wins: allGames.length > 0 ? actualWins : summaryWins,
    losses: allGames.length > 0 ? actualLosses : summaryLosses,
    winPct: total > 0 ? Math.round((actualWins / total) * 100) : summaryPct,
    comment,
    games,
    friendlies,
  };
}

// ─── eBadders Fallback Parser ───────────────────────────────────────────────

interface EbaddersMatch {
  player_won: boolean;
  score: string;
  partner: string[];
  vs: string[];
}

interface EbaddersData {
  wins: number;
  losses: number;
  total: number;
  win_pct: number;
  matches: EbaddersMatch[];
}

export function parseEbadders(ebadders: EbaddersData): ParsedMatch | null {
  if (!ebadders?.matches?.length) return null;

  const games: ParsedGame[] = [];
  let gameNumber = 1;

  for (const match of ebadders.matches) {
    const result: "W" | "L" = match.player_won ? "W" : "L";
    const scoreParts = match.score.split(/[–-]/).map((s) => parseInt(s.trim(), 10));
    if (scoreParts.length !== 2 || isNaN(scoreParts[0]) || isNaN(scoreParts[1])) continue;

    const [s1, s2] = scoreParts;
    const myScore = result === "W" ? Math.max(s1, s2) : Math.min(s1, s2);
    const oppScore = result === "W" ? Math.min(s1, s2) : Math.max(s1, s2);

    games.push({
      result,
      score: match.score,
      myScore,
      oppScore,
      margin: myScore - oppScore,
      partner: normalizeName(match.partner?.[0] ?? "Unknown"),
      opponents: (match.vs ?? []).map((v: string) => normalizeName(v)),
      gameNumber,
      isFriendly: false,
    });
    gameNumber++;
  }

  const wins = games.filter((g) => g.result === "W").length;
  const losses = games.filter((g) => g.result === "L").length;
  const total = wins + losses;

  return {
    wins,
    losses,
    winPct: total > 0 ? Math.round((wins / total) * 100) : 0,
    comment: null,
    games,
    friendlies: [],
  };
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

export function parseMatch(activity: Activity & { ebadders?: EbaddersData }): ParsedMatch | null {
  // Try description first
  const fromDesc = parseDescription(activity.description);
  if (fromDesc && (fromDesc.games.length > 0 || fromDesc.friendlies.length > 0)) {
    return fromDesc;
  }

  // Summary-only description (has W-L but no game lines) - still useful
  if (fromDesc) {
    // Try ebadders for full game data
    if (activity.ebadders) {
      const fromEb = parseEbadders(activity.ebadders);
      if (fromEb && fromEb.games.length > 0) {
        // Preserve the comment from description
        fromEb.comment = fromDesc.comment;
        return fromEb;
      }
    }
    return fromDesc;
  }

  // No description match - try ebadders fallback
  if (activity.ebadders) {
    return parseEbadders(activity.ebadders);
  }

  return null;
}

// ─── Utility: Get all games from a parsed match ─────────────────────────────

export function getAllGames(match: ParsedMatch): ParsedGame[] {
  return [...match.games, ...match.friendlies];
}

/** Get only ranked games (excludes friendlies section) */
export function getRankedGames(match: ParsedMatch): ParsedGame[] {
  return match.games;
}
