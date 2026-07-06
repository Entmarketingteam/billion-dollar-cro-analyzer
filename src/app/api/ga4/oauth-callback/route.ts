import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/ga4";
import { createServerClient } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const siteId = request.nextUrl.searchParams.get("siteId");

  if (!code || !siteId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    const user = await getUserFromCookie();
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { refresh_token } = await exchangeCodeForToken(code);

    const supabase = createServerClient();
    await supabase
      .from("sites")
      .update({ ga4_refresh_token: refresh_token })
      .eq("id", siteId)
      .eq("user_id", user);

    return NextResponse.redirect(
      new URL(`/dashboard/${siteId}?ga4=connected`, request.url)
    );
  } catch (error) {
    console.error("GA4 OAuth callback error:", error);
    return NextResponse.json({ error: "OAuth exchange failed" }, { status: 500 });
  }
}
