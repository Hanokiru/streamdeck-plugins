import { refreshAccessToken } from "./auth";
import type { CursorUsageSnapshot, DisplayMode, UsageMetric } from "./types";
import { DISPLAY_MODE_LABELS } from "./types";

const API2_BASE = "https://api2.cursor.sh";
const CURSOR_WEB_BASE = "https://cursor.com";

type JsonRecord = Record<string, unknown>;

type FetchOutcome =
  | { ok: true; json: unknown }
  | { ok: false; status?: number; error: string };

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function num(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatSpendMetric(
  mode: DisplayMode,
  label: string,
  shortLabel: string,
  remainingCents: number,
  usedCents: number,
  limitCents: number,
): UsageMetric {
  const percentUsed = limitCents > 0 ? (usedCents / limitCents) * 100 : 0;
  return {
    mode,
    label,
    shortLabel,
    valueText: `${formatCents(remainingCents)}\nleft`,
    subtitle: `${formatCents(usedCents)} used`,
    used: usedCents,
    limit: limitCents,
    remaining: remainingCents,
    unit: "cents",
    percentUsed,
  };
}

function formatPercentMetric(
  mode: DisplayMode,
  label: string,
  shortLabel: string,
  usedPercent: number | undefined,
): UsageMetric {
  const used = usedPercent ?? 0;
  const remaining = Math.max(0, 100 - used);
  return {
    mode,
    label,
    shortLabel,
    valueText: `${Math.round(remaining)}%\nleft`,
    subtitle: `${used.toFixed(1)}% used`,
    used,
    limit: 100,
    remaining,
    unit: "percent",
    percentUsed: used,
  };
}

function buildSnapshotFromDashboard(json: unknown): CursorUsageSnapshot | undefined {
  if (!isRecord(json) || !isRecord(json.planUsage)) {
    return undefined;
  }

  const plan = json.planUsage;
  const limit = num(plan.limit) ?? 0;
  const remaining = num(plan.remaining) ?? Math.max(0, limit - (num(plan.includedSpend) ?? 0));
  const used =
    num(plan.includedSpend) ??
    (limit > 0 && remaining >= 0 ? Math.max(0, limit - remaining) : num(plan.totalSpend) ?? 0);

  const total = formatSpendMetric(
    "total",
    DISPLAY_MODE_LABELS.total,
    "Total",
    Math.max(0, remaining),
    Math.max(0, used),
    Math.max(0, limit),
  );

  const auto = formatPercentMetric(
    "auto",
    DISPLAY_MODE_LABELS.auto,
    "Auto",
    num(plan.autoPercentUsed),
  );
  const api = formatPercentMetric("api", DISPLAY_MODE_LABELS.api, "API", num(plan.apiPercentUsed));
  const totalPercent = formatPercentMetric(
    "totalPercent",
    DISPLAY_MODE_LABELS.totalPercent,
    "All",
    num(plan.totalPercentUsed),
  );

  const membership =
    typeof json.membershipType === "string" ? json.membershipType : undefined;

  return {
    membershipType: membership,
    metrics: { total, auto, api, totalPercent },
    tooltip: [
      `Cursor ${membership ?? "usage"}`,
      `${DISPLAY_MODE_LABELS.total}: ${formatCents(total.remaining)} left of ${formatCents(total.limit)}`,
      `${DISPLAY_MODE_LABELS.auto}: ${auto.remaining.toFixed(0)}% left`,
      `${DISPLAY_MODE_LABELS.api}: ${api.remaining.toFixed(0)}% left`,
    ].join("\n"),
  };
}

function buildSnapshotFromUsageSummary(json: unknown): CursorUsageSnapshot | undefined {
  if (!isRecord(json) || !isRecord(json.individualUsage) || !isRecord(json.individualUsage.plan)) {
    return undefined;
  }

  const plan = json.individualUsage.plan;
  const used = num(plan.used) ?? 0;
  const limit = num(plan.limit) ?? 0;
  const remaining = num(plan.remaining) ?? Math.max(0, limit - used);

  const total: UsageMetric =
    limit >= 10_000
      ? formatSpendMetric("total", DISPLAY_MODE_LABELS.total, "Total", remaining, used, limit)
      : {
          mode: "total",
          label: DISPLAY_MODE_LABELS.total,
          shortLabel: "Total",
          valueText: `${remaining}\nleft`,
          subtitle: `${used} used`,
          used,
          limit,
          remaining,
          unit: "requests",
          percentUsed: limit > 0 ? (used / limit) * 100 : 0,
        };

  const auto = formatPercentMetric(
    "auto",
    DISPLAY_MODE_LABELS.auto,
    "Auto",
    num(plan.autoPercentUsed),
  );
  const api = formatPercentMetric("api", DISPLAY_MODE_LABELS.api, "API", num(plan.apiPercentUsed));
  const totalPercent = formatPercentMetric(
    "totalPercent",
    DISPLAY_MODE_LABELS.totalPercent,
    "All",
    num(plan.totalPercentUsed),
  );

  return {
    membershipType:
      typeof json.membershipType === "string" ? json.membershipType : undefined,
    metrics: { total, auto, api, totalPercent },
    tooltip: `Cursor usage\nTotal remaining: ${total.valueText.replace("\n", " ")}`,
  };
}

async function fetchBearerJson(
  url: string,
  token: string,
  init?: RequestInit,
): Promise<FetchOutcome> {
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    const body = await response.text();
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: `Cursor API error ${response.status}: ${response.statusText}`,
      };
    }

    return {
      ok: true,
      json: body.length > 0 ? JSON.parse(body) : {},
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    return { ok: false, error: message };
  }
}

async function fetchCookieJson(
  url: string,
  sessionCookie: string,
  init?: RequestInit,
): Promise<FetchOutcome> {
  try {
    const method = init?.method ?? "GET";
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Referer: `${CURSOR_WEB_BASE}/dashboard?tab=usage`,
        Cookie: `WorkosCursorSessionToken=${sessionCookie}`,
        ...(method !== "GET" ? { Origin: CURSOR_WEB_BASE } : {}),
        ...(init?.headers ?? {}),
      },
    });

    const body = await response.text();
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: `Cursor web API error ${response.status}: ${response.statusText}`,
      };
    }

    return {
      ok: true,
      json: body.length > 0 ? JSON.parse(body) : {},
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    return { ok: false, error: message };
  }
}

async function fetchBearerWithRefresh(
  url: string,
  token: string,
  refreshToken: string | undefined,
  init?: RequestInit,
): Promise<FetchOutcome> {
  const first = await fetchBearerJson(url, token, init);
  if (first.ok) {
    return first;
  }

  if (!refreshToken || (first.status !== 401 && first.status !== 403)) {
    return first;
  }

  const refreshed = await refreshAccessToken(refreshToken);
  return fetchBearerJson(url, refreshed, init);
}

export async function fetchCursorUsageSnapshot(
  token: string,
  refreshToken?: string,
  sessionCookie?: string,
): Promise<CursorUsageSnapshot> {
  const cookie = sessionCookie ?? token;

  const [dashboard, webSummary, webDashboard] = await Promise.all([
    fetchBearerWithRefresh(
      `${API2_BASE}/aiserver.v1.DashboardService/GetCurrentPeriodUsage`,
      token,
      refreshToken,
      {
        method: "POST",
        body: "{}",
        headers: {
          "Connect-Protocol-Version": "1",
        },
      },
    ),
    fetchCookieJson(`${CURSOR_WEB_BASE}/api/usage-summary`, cookie),
    fetchCookieJson(`${CURSOR_WEB_BASE}/api/dashboard/get-current-period-usage`, cookie, {
      method: "POST",
      body: "{}",
    }),
  ]);

  const snapshot =
    (dashboard.ok ? buildSnapshotFromDashboard(dashboard.json) : undefined) ??
    (webDashboard.ok ? buildSnapshotFromDashboard(webDashboard.json) : undefined) ??
    (webSummary.ok ? buildSnapshotFromUsageSummary(webSummary.json) : undefined);

  if (snapshot) {
    return snapshot;
  }

  const errors = [dashboard, webSummary, webDashboard]
    .filter((result): result is Extract<FetchOutcome, { ok: false }> => !result.ok)
    .map((result) => result.error)
    .join(" | ");

  throw new Error(errors || "Could not parse Cursor usage data for this account type.");
}
