import { NextRequest, NextResponse } from "next/server";
import { refreshGA4Token, fetchGA4Metrics } from "@/lib/ga4";
import { createServerClient } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";
import type { MetricsData } from "@/types";

export async function POST(request: NextRequest) {
  const { siteId } = await request.json();

  if (!siteId) {
    return NextResponse.json({ error: "Missing siteId" }, { status: 400 });
  }

  try {
    const user = await getUserFromCookie();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();
    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("ga4_property_id, ga4_refresh_token")
      .eq("id", siteId)
      .eq("user_id", user)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    if (!site.ga4_property_id || !site.ga4_refresh_token) {
      return NextResponse.json(
        { error: "GA4 not connected for this site" },
        { status: 400 }
      );
    }

    const accessToken = await refreshGA4Token(site.ga4_refresh_token);
    const metrics = await fetchGA4Metrics(accessToken, site.ga4_property_id);

    const { data: snapshot, error: insertError } = await supabase
      .from("metrics_snapshots")
      .insert({ site_id: siteId, metrics: metrics as MetricsData })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to store metrics snapshot" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, snapshot });
  } catch (error) {
    console.error("GA4 metrics fetch error:", error);
    return NextResponse.json(
      { error: "Metrics fetch failed" },
      { status: 500 }
    );
  }
}
