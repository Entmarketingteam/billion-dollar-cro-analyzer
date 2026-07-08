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
