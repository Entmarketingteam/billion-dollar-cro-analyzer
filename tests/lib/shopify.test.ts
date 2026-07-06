import { describe, it, expect } from "@jest/globals";
import { getShopifyAuthUrl } from "@/lib/shopify";

describe("getShopifyAuthUrl", () => {
  it("targets the store's oauth/authorize endpoint", () => {
    const url = getShopifyAuthUrl("mystore.myshopify.com");
    expect(url).toContain("mystore.myshopify.com/admin/oauth/authorize");
  });

  it("includes the required OAuth query params", () => {
    const url = getShopifyAuthUrl("mystore.myshopify.com");
    expect(url).toContain("client_id=");
    expect(url).toContain("scope=");
    expect(url).toContain("redirect_uri=");
    expect(url).toContain("state=");
  });

  it("requests the documented read scopes", () => {
    const url = getShopifyAuthUrl("mystore.myshopify.com");
    const parsed = new URL(url);
    expect(parsed.searchParams.get("scope")).toBe(
      "read_products,read_orders,read_fulfillments"
    );
  });

  it("normalizes a bare domain to a myshopify host", () => {
    const url = getShopifyAuthUrl("https://mystore.myshopify.com/");
    const parsed = new URL(url);
    expect(parsed.hostname).toBe("mystore.myshopify.com");
  });
});

describe("exchangeCodeForToken", () => {
  it("is exported and callable", async () => {
    const { exchangeCodeForToken } = await import("@/lib/shopify");
    expect(typeof exchangeCodeForToken).toBe("function");
  });
});
