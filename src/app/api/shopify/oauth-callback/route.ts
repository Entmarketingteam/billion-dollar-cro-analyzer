import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/shopify";
import { createServerClient } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  // Shopify sends the store hostname back as the `shop` param.
  const shop = request.nextUrl.searchParams.get("shop");

  if (!code || !shop) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    const user = await getUserFromCookie();
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const accessToken = await exchangeCodeForToken(code, shop);

    const supabase = createServerClient();
    const { error } = await supabase.from("sites").insert({
      user_id: user,
      name: shop.replace(/\.myshopify\.com$/, ""),
      url: `https://${shop}`,
      shopify_domain: shop,
      shopify_access_token: accessToken,
      industry: null,
    });

    if (error) throw error;

    return NextResponse.redirect(
      new URL("/dashboard?success=store_added", request.url)
    );
  } catch (error) {
    console.error("Shopify OAuth callback error:", error);
    return NextResponse.json(
      { error: "OAuth exchange failed" },
      { status: 500 }
    );
  }
}
