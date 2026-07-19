/**
 * Shared utilities for analytics widgets.
 */
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { ParsedGame } from "@/lib/matchParser";

export type FormTrend = "up" | "down" | "flat";

/** Compute recent form from last 5 games: 3+ wins = up, 1 or fewer = down, else flat */
export function computeForm(games: ParsedGame[]): FormTrend {
  const last5 = games.slice(-5);
  const wins = last5.filter((g) => g.result === "W").length;
  if (wins >= 3) return "up";
  if (wins <= 1) return "down";
  return "flat";
}

export function FormArrow({ form }: { form: FormTrend }) {
  if (form === "up") return <TrendingUp className="w-3.5 h-3.5 text-green-600" />;
  if (form === "down") return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}
