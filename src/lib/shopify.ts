import type { MetricsData } from "@/types";

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_OAUTH_CLIENT_ID || "";
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_OAUTH_CLIENT_SECRET || "";
const SHOPIFY_REDIRECT_URI = process.env.SHOPIFY_REDIRECT_URI || "";

const API_VERSION = "2024-01";
const SCOPES = "read_products,read_orders,read_fulfillments";

// Normalize a user-entered store URL to its bare myshopify hostname.
function toDomain(storeUrl: string): string {
  const withProtocol = storeUrl.startsWith("http")
    ? storeUrl
    : `https://${storeUrl}`;
  return new URL(withProtocol).hostname;
}

export function getShopifyAuthUrl(storeUrl: string): string {
  const domain = toDomain(storeUrl);
  const state = Math.random().toString(36).substring(2);

  const params = new URLSearchParams({
    client_id: SHOPIFY_CLIENT_ID,
    scope: SCOPES,
    redirect_uri: SHOPIFY_REDIRECT_URI,
    state,
  });

  return `https://${domain}/admin/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(
  code: string,
  storeUrl: string
): Promise<string> {
  const domain = toDomain(storeUrl);

  const response = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: SHOPIFY_CLIENT_ID,
      client_secret: SHOPIFY_CLIENT_SECRET,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Shopify OAuth token exchange failed: ${response.status} ${response.statusText}`
    );
  }

  const { access_token } = await response.json();
  if (!access_token) throw new Error("Shopify OAuth returned no access token");
  return access_token;
}

// Fetches last-30d metrics. Returns MetricsData; the caller wraps it in a
// metrics_snapshots row ({ site_id, metrics }).
export async function fetchShopifyMetrics(
  accessToken: string,
  storeUrl: string
): Promise<MetricsData> {
  const domain = toDomain(storeUrl);

  const periodEnd = new Date();
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - 30);

  const ordersUrl =
    `https://${domain}/admin/api/${API_VERSION}/orders.json` +
    `?status=any&created_at_min=${periodStart.toISOString()}`;

  const ordersResponse = await fetch(ordersUrl, {
    headers: { "X-Shopify-Access-Token": accessToken },
  });

  if (!ordersResponse.ok) {
    throw new Error(
      `Shopify orders fetch failed: ${ordersResponse.status} ${ordersResponse.statusText}`
    );
  }

  const { orders = [] } = await ordersResponse.json();

  const transactions = orders.length;
  const revenue = orders.reduce(
    (sum: number, order: { total_price?: string }) =>
      sum + parseFloat(order.total_price ?? "0"),
    0
  );
  const aov = transactions > 0 ? revenue / transactions : 0;

  // Sessions come from the Analytics reports endpoint. Not all plans expose it,
  // so treat a failure as "0 sessions" rather than failing the whole fetch.
  let sessions = 0;
  try {
    const reportsResponse = await fetch(
      `https://${domain}/admin/api/${API_VERSION}/reports.json?name=sessions`,
      { headers: { "X-Shopify-Access-Token": accessToken } }
    );
    if (reportsResponse.ok) {
      const { reports = [] } = await reportsResponse.json();
      sessions = Number(reports[0]?.values?.[0]?.value ?? 0);
    }
  } catch {
    sessions = 0;
  }

  const conversionRate =
    sessions > 0 ? (transactions / sessions) * 100 : 0;

  const round = (n: number) => Math.round(n * 100) / 100;

  return {
    conversion_rate: round(conversionRate),
    aov: round(aov),
    revenue: round(revenue),
    sessions,
    transactions,
    device_breakdown: { desktop: 0, mobile: 0, tablet: 0 },
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
  };
}
