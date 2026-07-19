/**
 * nameAliases.ts — Lightweight name normalization for match analytics.
 *
 * Maps variant names to canonical names and strips unicode decorations.
 * Applied at parse time so all widgets see consistent names.
 *
 * To add a new alias: add an entry to NAME_ALIASES below.
 */

/** Map of variant name (lowercase) → canonical display name */
const NAME_ALIASES: Record<string, string> = {
  johndoe: "John Doe",
};

/** Unicode prefixes/suffixes to strip (e.g., eBadders crowns) */
const UNICODE_DECORATIONS = /[\u2654-\u265F\u2660-\u2667\u2668-\u2671\u2672-\u267F\u2680-\u269F\u26A0-\u26FF\u2700-\u27BF\u{1F300}-\u{1F9FF}]/gu;

/**
 * Normalize a player name:
 * 1. Strip unicode decorations (crowns, emoji, etc.)
 * 2. Trim whitespace
 * 3. Apply alias mapping (case-insensitive)
 */
export function normalizeName(name: string): string {
  // Strip unicode decorations
  let cleaned = name.replace(UNICODE_DECORATIONS, "").trim();

  // Apply alias mapping
  const key = cleaned.toLowerCase();
  if (NAME_ALIASES[key]) {
    return NAME_ALIASES[key];
  }

  return cleaned;
}
