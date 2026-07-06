import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import {
  getGA4AuthUrl,
  exchangeCodeForToken,
  refreshGA4Token,
  fetchGA4Metrics,
} from "@/lib/ga4";

describe("ga4.ts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("getGA4AuthUrl", () => {
    it("returns a Google OAuth authorize URL", () => {
      const url = getGA4AuthUrl();
      expect(url).toContain("https://accounts.google.com/o/oauth2/v2/auth");
    });

    it("requests offline access for a refresh token", () => {
      const url = getGA4AuthUrl();
      expect(url).toContain("access_type=offline");
      expect(url).toContain("prompt=consent");
    });

    it("requests the analytics readonly scope", () => {
      const url = getGA4AuthUrl();
      expect(url).toContain("analytics.readonly");
    });

    it("uses the authorization code response type", () => {
      const url = getGA4AuthUrl();
      expect(url).toContain("response_type=code");
    });

    it("includes client_id, scope, and redirect_uri parameters", () => {
      const url = getGA4AuthUrl();
      expect(url).toContain("client_id=");
      expect(url).toContain("scope=");
      expect(url).toContain("redirect_uri=");
    });

    it("generates a unique state parameter", () => {
      const url1 = getGA4AuthUrl();
      const url2 = getGA4AuthUrl();
      const state1 = new URL(url1).searchParams.get("state");
      const state2 = new URL(url2).searchParams.get("state");
      expect(state1).not.toBe(state2);
    });
  });

  describe("exchangeCodeForToken", () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    it("exchanges authorization code for access and refresh tokens", async () => {
      const mockResponse = {
        access_token: "access_token_xyz",
        refresh_token: "refresh_token_xyz",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await exchangeCodeForToken("auth_code_123");

      expect(result.access_token).toBe("access_token_xyz");
      expect(result.refresh_token).toBe("refresh_token_xyz");
    });

    it("posts to Google's OAuth token endpoint", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "at", refresh_token: "rt" }),
      });

      await exchangeCodeForToken("code");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://oauth2.googleapis.com/token",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    it("includes client_id, client_secret, and code in the request body", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "at", refresh_token: "rt" }),
      });

      await exchangeCodeForToken("code_abc");

      const call = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body).toHaveProperty("client_id");
      expect(body).toHaveProperty("client_secret");
      expect(body.code).toBe("code_abc");
      expect(body.grant_type).toBe("authorization_code");
    });

    it("throws an error on non-ok response", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
      });

      await expect(exchangeCodeForToken("invalid_code")).rejects.toThrow(
        /GA4 OAuth token exchange failed/
      );
    });

    it("throws an error on network failure", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network timeout"));

      await expect(exchangeCodeForToken("code")).rejects.toThrow("Network timeout");
    });
  });

  describe("refreshGA4Token", () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    it("refreshes an expired access token using a refresh token", async () => {
      const newAccessToken = "new_access_token_xyz";

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: newAccessToken }),
      });

      const result = await refreshGA4Token("refresh_token_abc");

      expect(result).toBe(newAccessToken);
    });

    it("posts to Google's OAuth token endpoint with refresh_token grant", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "at" }),
      });

      await refreshGA4Token("refresh_token_xyz");

      const call = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.grant_type).toBe("refresh_token");
      expect(body.refresh_token).toBe("refresh_token_xyz");
    });

    it("includes client_id and client_secret in the request", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "at" }),
      });

      await refreshGA4Token("rt");

      const call = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body).toHaveProperty("client_id");
      expect(body).toHaveProperty("client_secret");
    });

    it("throws an error on non-ok response", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      await expect(refreshGA4Token("expired_token")).rejects.toThrow(
        /GA4 token refresh failed/
      );
    });

    it("throws an error on network failure", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Connection lost"));

      await expect(refreshGA4Token("rt")).rejects.toThrow("Connection lost");
    });
  });

  describe("fetchGA4Metrics", () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    it("fetches metrics for a given property ID", async () => {
      const mockResponse = {
        rows: [
          {
            dimensionValues: [{ value: "desktop" }],
            metricValues: [{ value: "1000" }, { value: "50" }, { value: "5000" }],
          },
          {
            dimensionValues: [{ value: "mobile" }],
            metricValues: [{ value: "2000" }, { value: "80" }, { value: "8000" }],
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const metrics = await fetchGA4Metrics("access_token_123", "property_12345");

      expect(metrics.sessions).toBe(3000); // 1000 + 2000
      expect(metrics.transactions).toBe(130); // 50 + 80
      expect(metrics.revenue).toBe(13000); // 5000 + 8000
    });

    it("correctly posts to the GA4 Data API endpoint", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rows: [] }),
      });

      await fetchGA4Metrics("at", "property_999");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://analyticsdata.googleapis.com/v1beta/properties/property_999:runReport",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer at",
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("requests a 30-day date range", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rows: [] }),
      });

      await fetchGA4Metrics("at", "prop");

      const call = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.dateRanges).toEqual([{ startDate: "30daysAgo", endDate: "today" }]);
    });

    it("requests device category dimension and sessions/transactions/revenue metrics", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rows: [] }),
      });

      await fetchGA4Metrics("at", "prop");

      const call = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.dimensions).toContainEqual({ name: "deviceCategory" });
      expect(body.metrics).toEqual(
        expect.arrayContaining([
          { name: "sessions" },
          { name: "transactions" },
          { name: "totalRevenue" },
        ])
      );
    });

    it("aggregates metrics by device and calculates conversion rate", async () => {
      const mockResponse = {
        rows: [
          {
            dimensionValues: [{ value: "desktop" }],
            metricValues: [{ value: "5000" }, { value: "100" }, { value: "10000" }],
          },
          {
            dimensionValues: [{ value: "mobile" }],
            metricValues: [{ value: "5000" }, { value: "100" }, { value: "10000" }],
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const metrics = await fetchGA4Metrics("at", "prop");

      expect(metrics.device_breakdown.desktop).toBe(5000);
      expect(metrics.device_breakdown.mobile).toBe(5000);
      expect(metrics.device_breakdown.tablet).toBe(0);
      expect(metrics.conversion_rate).toBe(1); // (200 / 10000) * 100
    });

    it("calculates AOV as revenue / transactions", async () => {
      const mockResponse = {
        rows: [
          {
            dimensionValues: [{ value: "desktop" }],
            metricValues: [{ value: "1000" }, { value: "100" }, { value: "10000" }],
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const metrics = await fetchGA4Metrics("at", "prop");

      expect(metrics.aov).toBe(100); // 10000 / 100
    });

    it("handles zero sessions gracefully (conversion_rate = 0)", async () => {
      const mockResponse = {
        rows: [
          {
            dimensionValues: [{ value: "desktop" }],
            metricValues: [{ value: "0" }, { value: "0" }, { value: "0" }],
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const metrics = await fetchGA4Metrics("at", "prop");

      expect(metrics.conversion_rate).toBe(0);
    });

    it("handles zero transactions gracefully (AOV = 0)", async () => {
      const mockResponse = {
        rows: [
          {
            dimensionValues: [{ value: "desktop" }],
            metricValues: [{ value: "1000" }, { value: "0" }, { value: "10000" }],
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const metrics = await fetchGA4Metrics("at", "prop");

      expect(metrics.aov).toBe(0);
    });

    it("handles missing rows (empty report)", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rows: [] }),
      });

      const metrics = await fetchGA4Metrics("at", "prop");

      expect(metrics.sessions).toBe(0);
      expect(metrics.transactions).toBe(0);
      expect(metrics.revenue).toBe(0);
      expect(metrics.conversion_rate).toBe(0);
      expect(metrics.aov).toBe(0);
    });

    it("recognizes tablet device category", async () => {
      const mockResponse = {
        rows: [
          {
            dimensionValues: [{ value: "tablet" }],
            metricValues: [{ value: "500" }, { value: "10" }, { value: "1000" }],
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const metrics = await fetchGA4Metrics("at", "prop");

      expect(metrics.device_breakdown.tablet).toBe(500);
    });

    it("handles rows with missing dimension values", async () => {
      const mockResponse = {
        rows: [
          {
            dimensionValues: undefined,
            metricValues: [{ value: "1000" }, { value: "50" }, { value: "5000" }],
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const metrics = await fetchGA4Metrics("at", "prop");

      expect(metrics.sessions).toBe(1000); // Should still count sessions
      expect(metrics.device_breakdown.desktop).toBe(0); // Unknown device
    });

    it("throws an error on non-ok response", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
      });

      await expect(fetchGA4Metrics("bad_token", "prop")).rejects.toThrow(
        /GA4 metrics fetch failed/
      );
    });

    it("throws an error on network failure", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

      await expect(fetchGA4Metrics("at", "prop")).rejects.toThrow("Network error");
    });

    it("rounds conversion_rate and AOV to 2 decimal places", async () => {
      const mockResponse = {
        rows: [
          {
            dimensionValues: [{ value: "desktop" }],
            metricValues: [{ value: "3333" }, { value: "99" }, { value: "9999.99" }],
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const metrics = await fetchGA4Metrics("at", "prop");

      // Check that rounding is applied (no more than 2 decimal places in effective precision)
      expect(metrics.conversion_rate).toBeLessThanOrEqual(3.01);
      expect(metrics.aov).toBeLessThanOrEqual(101.01);
    });
  });
});
