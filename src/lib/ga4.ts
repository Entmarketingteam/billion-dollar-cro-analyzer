import type { MetricsData } from "@/types";

// ── OAuth config (from Doppler env vars) ─────────────────────

export const GA4_CLIENT_ID = process.env.GA4_OAUTH_CLIENT_ID || "";
export const GA4_CLIENT_SECRET = process.env.GA4_OAUTH_CLIENT_SECRET || "";
export const GA4_REDIRECT_URI = process.env.GA4_REDIRECT_URI || "";

const GA4_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

// ── OAuth flow ───────────────────────────────────────────────

export function getGA4AuthUrl(opts?: {
  state?: string;
  redirectUri?: string;
}): string {
  const state = opts?.state ?? Math.random().toString(36).substring(2);
  const redirectUri = opts?.redirectUri ?? GA4_REDIRECT_URI;

  return (
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(GA4_CLIENT_ID)}` +
    `&scope=${encodeURIComponent(GA4_SCOPE)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&state=${encodeURIComponent(state)}` +
    `&access_type=offline` +
    `&prompt=consent`
  );
}

export async function exchangeCodeForToken(
  code: string,
  redirectUri?: string
): Promise<{ access_token: string; refresh_token: string }> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: GA4_CLIENT_ID,
      client_secret: GA4_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri ?? GA4_REDIRECT_URI,
    }),
  });

  if (!response.ok) throw new Error("GA4 OAuth token exchange failed");

  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  };
}

export async function refreshGA4Token(refreshToken: string): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: GA4_CLIENT_ID,
      client_secret: GA4_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) throw new Error("GA4 token refresh failed");

  const data = await response.json();
  return data.access_token;
}

// ── Metrics fetch (GA4 Data API v1beta) ──────────────────────

interface GA4Row {
  dimensionValues?: { value: string }[];
  metricValues?: { value: string }[];
}

export async function fetchGA4Metrics(
  accessToken: string,
  propertyId: string
): Promise<Partial<MetricsData>> {
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        dimensions: [{ name: "deviceCategory" }],
        metrics: [
          { name: "sessions" },
          { name: "transactions" },
          { name: "totalRevenue" },
        ],
      }),
    }
  );

  if (!response.ok) throw new Error("GA4 metrics fetch failed");

  const data = await response.json();
  const rows: GA4Row[] = data.rows || [];

  const device_breakdown = { desktop: 0, mobile: 0, tablet: 0 };
  let sessions = 0;
  let transactions = 0;
  let revenue = 0;

  for (const row of rows) {
    const device = row.dimensionValues?.[0]?.value ?? "";
    const rowSessions = parseInt(row.metricValues?.[0]?.value || "0", 10);
    transactions += parseInt(row.metricValues?.[1]?.value || "0", 10);
    revenue += parseFloat(row.metricValues?.[2]?.value || "0");
    sessions += rowSessions;

    if (device === "desktop") device_breakdown.desktop += rowSessions;
    else if (device === "mobile") device_breakdown.mobile += rowSessions;
    else if (device === "tablet") device_breakdown.tablet += rowSessions;
  }

  const conversion_rate =
    sessions > 0 ? Math.round((transactions / sessions) * 10000) / 100 : 0;
  const aov =
    transactions > 0 ? Math.round((revenue / transactions) * 100) / 100 : 0;

  return {
    conversion_rate,
    aov,
    revenue: Math.round(revenue * 100) / 100,
    sessions,
    transactions,
    device_breakdown,
  };
}
