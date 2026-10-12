import type { Level } from "./db";

// Visibility: low = needs front row (concern) = red, high = fine anywhere = green
export const VIS_COLORS: Record<Level, string> = {
  low:    "#d04a4a",
  medium: "#b08030",
  high:   "#3a8c5c",
};

// Behavior: low = calm = green, high = disruptive = red
export const BEH_COLORS: Record<Level, string> = {
  low:    "#3a8c5c",
  medium: "#b08030",
  high:   "#d04a4a",
};

export const LEVEL_LABELS: Record<Level, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

// Legacy alias still used in a few spots — keep for compatibility
export const LEVEL_COLORS = VIS_COLORS;
