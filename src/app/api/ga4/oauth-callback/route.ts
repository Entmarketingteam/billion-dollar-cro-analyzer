import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, GA4_CALLBACK_PATH } from "@/lib/ga4";
import { createServerClient } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";

const NONCE_COOKIE = "ga4_oauth_nonce";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  // Google echoes back the `state` we sent from /api/ga4/authorize: "siteId:nonce"
  const state = request.nextUrl.searchParams.get("state") || "";
  const [siteId, nonce] = state.split(":");

  if (!code || !siteId || !nonce) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const expectedNonce = request.cookies.get(NONCE_COOKIE)?.value;
  if (!expectedNonce || nonce !== expectedNonce) {
    return NextResponse.json({ error: "Invalid state" }, { status: 401 });
  }

  try {
    const user = await getUserFromCookie();
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Token exchange must use the exact redirect_uri sent on authorize.
    const redirectUri = new URL(
      GA4_CALLBACK_PATH,
      request.nextUrl.origin
    ).toString();
    const { refresh_token } = await exchangeCodeForToken(code, redirectUri);

    const supabase = createServerClient();
    const { error } = await supabase
      .from("sites")
      .update({ ga4_refresh_token: refresh_token })
      .eq("id", siteId);
    if (error) throw error;

    // Property selection is the required next step — GA4 metrics need it.
    const response = NextResponse.redirect(
      new URL(`/dashboard/${siteId}/ga4-setup`, request.url)
    );
    response.cookies.delete(NONCE_COOKIE);
    return response;
  } catch (error) {
    console.error("GA4 OAuth callback error:", error);
    return NextResponse.json({ error: "OAuth exchange failed" }, { status: 500 });
  }
}
