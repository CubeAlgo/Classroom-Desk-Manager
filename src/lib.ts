import type { Level, LayoutType } from "./db";

// Visibility: low = needs front row (concern) = red, high = fine anywhere = green
export const VIS_COLORS: Record<Level, string> = {
  low:    "#d04a4a",
  medium: "#b08030",
  high:   "#3a8c5c",
};

// Behavior: low = calm/green, high = disruptive/red
export const BEH_COLORS: Record<Level, string> = {
  low:    "#3a8c5c",
  medium: "#b08030",
  high:   "#d04a4a",
};

export const VIS_LABELS: Record<Level, string> = {
  low: "Low — needs front",
  medium: "Medium",
  high: "High — any seat",
};

export const BEH_LABELS: Record<Level, string> = {
  low: "Calm — focused",
  medium: "Medium",
  high: "Energetic — needs watch",
};

export const LEVEL_LABELS: Record<Level, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

// Legacy alias still used in a few spots — keep for compatibility
export const LEVEL_COLORS = VIS_COLORS;

export const HEAR_LABELS: Record<Level, string> = {
  low: "Low — needs front",
  medium: "Medium",
  high: "Fine anywhere",
};

export const LAYOUTS: { id: LayoutType; short: string; title: string; desc: string; size: number }[] = [
  { id: "singles", short: "1s", title: "Singles", desc: "1 per desk", size: 1 },
  { id: "pairs", short: "Pairs", title: "Pairs", desc: "2 per desk", size: 2 },
  { id: "threes", short: "3s", title: "Threes", desc: "3 per table", size: 3 },
  { id: "fours", short: "4s", title: "Fours", desc: "4 per table", size: 4 },
  { id: "groups", short: "5s", title: "Fives", desc: "5 per table", size: 5 },
];
export const layoutSize = (l: LayoutType) => LAYOUTS.find((x) => x.id === l)?.size ?? 2;
export const layoutLabel = (l: LayoutType) => LAYOUTS.find((x) => x.id === l)?.title ?? "Pairs";
