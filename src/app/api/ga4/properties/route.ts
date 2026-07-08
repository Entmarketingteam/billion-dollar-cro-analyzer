import { NextRequest, NextResponse } from "next/server";
import { listGA4Properties, refreshGA4Token } from "@/lib/ga4";
import { getSiteById } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getUserFromCookie();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const siteId = request.nextUrl.searchParams.get("siteId");
  if (!siteId) {
    return NextResponse.json({ error: "Missing siteId" }, { status: 400 });
  }

  try {
    const site = await getSiteById(siteId);
    if (!site.ga4_refresh_token) {
      return NextResponse.json(
        { error: "GA4 not connected for this site" },
        { status: 400 }
      );
    }

    const accessToken = await refreshGA4Token(site.ga4_refresh_token);
    const properties = await listGA4Properties(accessToken);
    return NextResponse.json({ properties });
  } catch (error) {
    console.error("GA4 properties fetch error:", error);
    return NextResponse.json(
      { error: "Failed to list GA4 properties" },
      { status: 500 }
    );
  }
}
