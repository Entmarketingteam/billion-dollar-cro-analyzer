import { NextRequest, NextResponse } from "next/server";
import { getShopifyAuthUrl, resolveShopDomain } from "@/lib/shopify";
import { getUserFromCookie } from "@/lib/auth";

const STATE_COOKIE = "shopify_oauth_state";

export async function GET(request: NextRequest) {
  const user = await getUserFromCookie();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const shopInput = request.nextUrl.searchParams.get("shop") || "";
  const shop = await resolveShopDomain(shopInput);
  if (!shop) {
    return NextResponse.redirect(
      new URL("/dashboard?error=invalid_shop_domain", request.url)
    );
  }

  const state = crypto.randomUUID();
  const redirectUri = new URL(
    "/api/shopify/oauth-callback",
    request.nextUrl.origin
  ).toString();

  const response = NextResponse.redirect(
    getShopifyAuthUrl(shop, { state, redirectUri })
  );
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
