import { NextRequest, NextResponse } from "next/server";
import { fetchShopifyMetrics } from "@/lib/shopify";
import { createServerClient } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";

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
    const { data: site } = await supabase
      .from("sites")
      .select()
      .eq("id", siteId)
      .eq("user_id", user)
      .single();

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    if (!site.shopify_domain || !site.shopify_access_token) {
      return NextResponse.json(
        { error: "Site is not connected to Shopify" },
        { status: 400 }
      );
    }

    const metrics = await fetchShopifyMetrics(
      site.shopify_access_token,
      site.shopify_domain
    );

    const { error } = await supabase
      .from("metrics_snapshots")
      .insert({ site_id: siteId, metrics });

    if (error) throw error;

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Shopify metrics fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
