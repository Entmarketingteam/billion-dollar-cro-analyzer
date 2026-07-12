import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, verifyShopifyHmac } from "@/lib/shopify";
import { createServerClient } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";

const STATE_COOKIE = "shopify_oauth_state";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  // Shopify sends the store hostname back as the `shop` param.
  const shop = params.get("shop");
  const state = params.get("state");

  if (!code || !shop) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  if (!verifyShopifyHmac(params)) {
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }

  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.json({ error: "Invalid state" }, { status: 401 });
  }

  try {
    const user = await getUserFromCookie();
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const accessToken = await exchangeCodeForToken(code, shop);

    // The myshopify handle is often auto-generated (e.g. 4dca35-2); ask the
    // Admin API for the store's real name and primary storefront domain.
    let name = shop.replace(/\.myshopify\.com$/, "");
    let url = `https://${shop}`;
    try {
      const shopInfo = await fetch(
        `https://${shop}/admin/api/2024-01/shop.json`,
        { headers: { "X-Shopify-Access-Token": accessToken } }
      );
      if (shopInfo.ok) {
        const { shop: info } = await shopInfo.json();
        if (info?.name) name = info.name;
        if (info?.domain) url = `https://${info.domain}`;
      }
    } catch {
      // Fall back to the myshopify handle.
    }

    const supabase = createServerClient();

    // Re-connecting an existing store refreshes its token instead of
    // creating a duplicate site.
    const { data: existing } = await supabase
      .from("sites")
      .select("id")
      .eq("shopify_domain", shop)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("sites")
        .update({ shopify_access_token: accessToken })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("sites").insert({
        user_id: user,
        name: shop.replace(/\.myshopify\.com$/, ""),
        url: `https://${shop}`,
        shopify_domain: shop,
        shopify_access_token: accessToken,
        industry: null,
      });
      if (error) throw error;
    }

    const response = NextResponse.redirect(
      new URL("/dashboard?success=store_added", request.url)
    );
    response.cookies.delete(STATE_COOKIE);
    return response;
  } catch (error) {
    console.error("Shopify OAuth callback error:", error);
    return NextResponse.json(
      { error: "OAuth exchange failed" },
      { status: 500 }
    );
  }
}
