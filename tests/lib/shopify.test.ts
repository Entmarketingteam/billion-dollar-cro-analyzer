import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { getShopifyAuthUrl, exchangeCodeForToken, fetchShopifyMetrics } from "@/lib/shopify";
import type { MetricsData } from "@/types";

describe("shopify.ts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

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

    it("handles domain without protocol", () => {
      const url = getShopifyAuthUrl("mystore.myshopify.com");
      expect(url).toContain("mystore.myshopify.com");
      expect(url).not.toContain("http://http");
    });
  });

  describe("exchangeCodeForToken", () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    it("successfully exchanges a code for an access token", async () => {
      const mockAccessToken = "shpat_1234567890abcdef";
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: mockAccessToken }),
      });

      const token = await exchangeCodeForToken("auth_code_123", "mystore.myshopify.com");

      expect(token).toBe(mockAccessToken);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://mystore.myshopify.com/admin/oauth/access_token",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    it("includes client_id, client_secret, and code in the request body", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "token" }),
      });

      await exchangeCodeForToken("code_xyz", "store.myshopify.com");

      const call = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body).toHaveProperty("client_id");
      expect(body).toHaveProperty("client_secret");
      expect(body.code).toBe("code_xyz");
    });

    it("throws an error when response is not ok", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      await expect(exchangeCodeForToken("bad_code", "store.myshopify.com")).rejects.toThrow(
        /Shopify OAuth token exchange failed/
      );
    });

    it("throws an error when no access_token is returned", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ some_field: "value" }),
      });

      await expect(exchangeCodeForToken("code", "store.myshopify.com")).rejects.toThrow(
        /no access token/
      );
    });

    it("throws an error on network failure", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

      await expect(exchangeCodeForToken("code", "store.myshopify.com")).rejects.toThrow(
        "Network error"
      );
    });
  });

  describe("fetchShopifyMetrics", () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    it("fetches orders and reports, returning metrics data", async () => {
      const mockOrders = [
        { total_price: "100.00" },
        { total_price: "75.50" },
      ];
      const mockReports = [{ values: [{ value: "500" }] }];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ orders: mockOrders }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ reports: mockReports }),
        });

      const metrics = await fetchShopifyMetrics("token_abc", "store.myshopify.com");

      expect(metrics.revenue).toBe(175.5); // 100 + 75.50
      expect(metrics.transactions).toBe(2);
      expect(metrics.sessions).toBe(500);
      expect(metrics.conversion_rate).toBeCloseTo(0.4); // (2 / 500) * 100
    });

    it("calculates AOV correctly", async () => {
      const mockOrders = [
        { total_price: "100" },
        { total_price: "200" },
        { total_price: "300" },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ orders: mockOrders }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ reports: [{ values: [{ value: "1000" }] }] }),
        });

      const metrics = await fetchShopifyMetrics("token", "store.myshopify.com");

      expect(metrics.aov).toBe(200); // (100 + 200 + 300) / 3
    });

    it("handles missing orders gracefully (empty array)", async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ orders: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ reports: [] }),
        });

      const metrics = await fetchShopifyMetrics("token", "store.myshopify.com");

      expect(metrics.transactions).toBe(0);
      expect(metrics.revenue).toBe(0);
      expect(metrics.aov).toBe(0);
      expect(metrics.conversion_rate).toBe(0);
    });

    it("handles reports fetch failure gracefully (sets sessions to 0)", async () => {
      const mockOrders = [{ total_price: "100" }];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ orders: mockOrders }),
        })
        .mockResolvedValueOnce({
          ok: false, // Reports endpoint fails
          status: 403,
          statusText: "Forbidden",
        });

      const metrics = await fetchShopifyMetrics("token", "store.myshopify.com");

      // Should not throw; sessions default to 0
      expect(metrics.sessions).toBe(0);
      expect(metrics.revenue).toBe(100);
      expect(metrics.transactions).toBe(1);
    });

    it("includes period_start and period_end timestamps", async () => {
      const before = new Date();

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ orders: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ reports: [] }),
        });

      const metrics = await fetchShopifyMetrics("token", "store.myshopify.com");

      const after = new Date();

      expect(metrics.period_start).toBeDefined();
      expect(metrics.period_end).toBeDefined();
      expect(new Date(metrics.period_end).getTime()).toBeLessThanOrEqual(after.getTime());
      expect(new Date(metrics.period_start).getTime()).toBeGreaterThanOrEqual(
        before.getTime() - 31 * 24 * 60 * 60 * 1000
      ); // roughly 30 days ago
    });

    it("returns device_breakdown (currently stubbed as zeros)", async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ orders: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ reports: [] }),
        });

      const metrics = await fetchShopifyMetrics("token", "store.myshopify.com");

      expect(metrics.device_breakdown).toEqual({ desktop: 0, mobile: 0, tablet: 0 });
    });

    it("rounds revenue and AOV to 2 decimal places", async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            orders: [{ total_price: "99.999" }, { total_price: "50.005" }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ reports: [] }),
        });

      const metrics = await fetchShopifyMetrics("token", "store.myshopify.com");

      // Should be rounded to 2 decimal places
      expect(Number.isInteger(metrics.revenue * 100)).toBe(true);
      expect(Number.isInteger(metrics.aov * 100)).toBe(true);
    });

    it("throws when orders fetch fails", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      await expect(fetchShopifyMetrics("bad_token", "store.myshopify.com")).rejects.toThrow(
        /Shopify orders fetch failed/
      );
    });

    it("handles malformed total_price gracefully (parseFloat)", async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            orders: [
              { total_price: "100.50" },
              { total_price: null },
              { total_price: undefined },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ reports: [] }),
        });

      const metrics = await fetchShopifyMetrics("token", "store.myshopify.com");

      // null/undefined should parse as NaN, then become 0
      expect(metrics.revenue).toBe(100.5);
      expect(metrics.transactions).toBe(3); // All 3 orders counted
    });

    it("uses correct date range (30 days)", async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ orders: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ reports: [] }),
        });

      await fetchShopifyMetrics("token", "store.myshopify.com");

      const ordersCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(ordersCall[0]).toContain("created_at_min=");
      // Should be approximately 30 days ago
      const url = ordersCall[0];
      expect(url).toMatch(/\d{4}-\d{2}-\d{2}T/); // ISO format check
    });
  });
});
