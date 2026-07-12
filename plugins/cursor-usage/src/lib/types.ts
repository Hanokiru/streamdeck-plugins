export type DisplayMode = "total" | "auto" | "api" | "totalPercent";

export type UsageUnit = "cents" | "percent" | "requests";

export type UsageMetric = {
  mode: DisplayMode;
  label: string;
  shortLabel: string;
  valueText: string;
  subtitle: string;
  used: number;
  limit: number;
  remaining: number;
  unit: UsageUnit;
  percentUsed: number;
};

export type CursorUsageSnapshot = {
  membershipType?: string;
  metrics: Record<DisplayMode, UsageMetric>;
  tooltip: string;
};

export const DISPLAY_MODES: DisplayMode[] = ["total", "auto", "api", "totalPercent"];

export const DISPLAY_MODE_LABELS: Record<DisplayMode, string> = {
  total: "Total Spend",
  auto: "Auto",
  api: "Composer / API",
  totalPercent: "Total %",
};
