import type { CursorUsageSnapshot, DisplayMode, UsageMetric } from "./types";
import { DISPLAY_MODE_LABELS } from "./types";

const PURPLE = {
  dark: "#4C1D95",
  primary: "#7C3AED",
  light: "#A78BFA",
  text: "#F5F3FF",
  muted: "#DDD6FE",
  accent: "#C4B5FD",
  warn: "#F59E0B",
  danger: "#EF4444",
};

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function barColor(percentUsed: number, warningThreshold: number): string {
  if (percentUsed >= 100 - warningThreshold / 2) {
    return PURPLE.danger;
  }
  if (percentUsed >= 100 - warningThreshold) {
    return PURPLE.warn;
  }
  return PURPLE.light;
}

export function getMetric(
  snapshot: CursorUsageSnapshot,
  mode: DisplayMode,
): UsageMetric {
  return snapshot.metrics[mode];
}

export function formatKeyTitle(metric: UsageMetric): string {
  const lines = metric.valueText.split("\n");
  return lines.length > 1 ? `${lines[0]}\n${lines[1]}` : metric.valueText;
}

export function buildKeySvg(metric: UsageMetric, warningThreshold: number): string {
  const label = escapeXml(metric.shortLabel.toUpperCase());
  const lines = metric.valueText.split("\n");
  const valueMain = escapeXml(lines[0] ?? metric.valueText);
  const valueSub = escapeXml(lines[1] ?? "");
  const subtitle = escapeXml(metric.subtitle);
  const progress = Math.max(0, Math.min(100, metric.percentUsed));
  const fill = barColor(progress, warningThreshold);
  const barWidth = Math.round((progress / 100) * 120);

  const valueText = valueSub
    ? `<text x="72" y="74" text-anchor="middle" fill="${PURPLE.text}" font-size="26" font-family="Segoe UI, Arial, sans-serif" font-weight="700">${valueMain}</text>` +
      `<text x="72" y="98" text-anchor="middle" fill="${PURPLE.accent}" font-size="16" font-family="Segoe UI, Arial, sans-serif" font-weight="600">${valueSub}</text>`
    : `<text x="72" y="82" text-anchor="middle" fill="${PURPLE.text}" font-size="24" font-family="Segoe UI, Arial, sans-serif" font-weight="700">${valueMain}</text>`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">`,
    `<defs>`,
    `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">`,
    `<stop offset="0%" stop-color="${PURPLE.dark}"/>`,
    `<stop offset="100%" stop-color="${PURPLE.primary}"/>`,
    `</linearGradient>`,
    `</defs>`,
    `<rect width="144" height="144" rx="18" fill="url(#bg)"/>`,
    `<rect x="12" y="118" width="120" height="10" rx="5" fill="${PURPLE.dark}" opacity="0.55"/>`,
    `<rect x="12" y="118" width="${barWidth}" height="10" rx="5" fill="${fill}"/>`,
    `<text x="72" y="34" text-anchor="middle" fill="${PURPLE.muted}" font-size="13" font-family="Segoe UI, Arial, sans-serif" font-weight="600">${label}</text>`,
    valueText,
    `<text x="72" y="112" text-anchor="middle" fill="${PURPLE.accent}" font-size="11" font-family="Segoe UI, Arial, sans-serif">${subtitle}</text>`,
    `</svg>`,
  ].join("");
}

export function buildKeyErrorSvg(code: string): string {
  const label = escapeXml(code);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">`,
    `<defs>`,
    `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">`,
    `<stop offset="0%" stop-color="${PURPLE.dark}"/>`,
    `<stop offset="100%" stop-color="#5B21B6"/>`,
    `</linearGradient>`,
    `</defs>`,
    `<rect width="144" height="144" rx="18" fill="url(#bg)"/>`,
    `<text x="72" y="58" text-anchor="middle" fill="${PURPLE.muted}" font-size="13" font-family="Segoe UI, Arial, sans-serif" font-weight="600">ERROR</text>`,
    `<text x="72" y="92" text-anchor="middle" fill="${PURPLE.text}" font-size="28" font-family="Segoe UI, Arial, sans-serif" font-weight="700">${label}</text>`,
    `</svg>`,
  ].join("");
}

export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export function buildDialFeedback(metric: UsageMetric): Record<string, string | number> {
  return {
    title: DISPLAY_MODE_LABELS[metric.mode],
    value: metric.valueText.replace("\n", " "),
    subtitle: metric.subtitle,
    bar: Math.round(Math.max(0, Math.min(100, metric.percentUsed))),
  };
}

export function isWarning(metric: UsageMetric, warningThreshold: number): boolean {
  if (metric.unit === "percent" || metric.unit === "requests") {
    return metric.remaining <= warningThreshold;
  }

  if (metric.limit <= 0) {
    return false;
  }

  return (metric.remaining / metric.limit) * 100 <= warningThreshold;
}
