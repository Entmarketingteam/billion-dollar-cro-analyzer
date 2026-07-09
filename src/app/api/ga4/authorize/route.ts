import { NextRequest, NextResponse } from "next/server";
import { getGA4AuthUrl, GA4_CALLBACK_PATH } from "@/lib/ga4";
import { getUserFromCookie } from "@/lib/auth";

const NONCE_COOKIE = "ga4_oauth_nonce";

export async function GET(request: NextRequest) {
  const user = await getUserFromCookie();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const siteId = request.nextUrl.searchParams.get("siteId");
  if (!siteId) {
    return NextResponse.json({ error: "Missing siteId" }, { status: 400 });
  }

  const nonce = crypto.randomUUID();
  // Google echoes `state` back on the callback; carry the siteId in it.
  const state = `${siteId}:${nonce}`;
  const redirectUri = new URL(
    "/api/ga4/oauth-callback",
    request.nextUrl.origin
  ).toString();

  const response = NextResponse.redirect(getGA4AuthUrl({ state, redirectUri }));
  response.cookies.set(NONCE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
