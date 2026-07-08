import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { generateTestPlanFromMetrics } from "@/lib/claude-agent";

describe("claude-agent.ts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("generateTestPlanFromMetrics", () => {
    it("generates a test plan with valid JSON structure", async () => {
      const mockTestsJson = {
        tests: [
          {
            id: "test_1",
            chapter: "Trust Signals",
            section: "Reviews",
            hypothesis: "Adding customer reviews will increase conversion",
            effort_hours: 8,
            expected_lift_min: 2,
            expected_lift_max: 5,
            priority_score: 85,
          },
          {
            id: "test_2",
            chapter: "Checkout",
            section: "Form",
            hypothesis: "Reducing form fields will improve completion",
            effort_hours: 16,
            expected_lift_min: 3,
            expected_lift_max: 8,
            priority_score: 75,
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: JSON.stringify(mockTestsJson) }],
        }),
      });

      const result = await generateTestPlanFromMetrics({
        siteUrl: "https://example.com",
        industry: "apparel",
        conversionRate: 2.0,
        aov: 65,
        revenue: 10000,
        sessions: 5000,
        transactions: 100,
        deviceBreakdown: { desktop: 3000, mobile: 1800, tablet: 200 },
      });

      expect(result.tests.length).toBe(2);
      expect(result.tests[0].chapter).toBe("Trust Signals");
      expect(result.tests[0].hypothesis).toContain("customer reviews");
      expect(result.benchmark_conversion_rate).toBe(2.5); // apparel benchmark
      expect(result.benchmark_aov).toBe(75);
      expect(result.site_industry).toBe("apparel");
      expect(result.model).toBe("claude-opus-4-1");
    });

    it("posts to the Anthropic API with correct headers", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: JSON.stringify({ tests: [] }) }],
        }),
      });

      await generateTestPlanFromMetrics({
        siteUrl: "https://example.com",
        industry: null,
        conversionRate: 2,
        aov: 100,
        revenue: 5000,
        sessions: 2500,
        transactions: 50,
        deviceBreakdown: { desktop: 1500, mobile: 900, tablet: 100 },
      });

      const call = (global.fetch as jest.Mock).mock.calls[0];
      expect(call[0]).toBe("https://api.anthropic.com/v1/messages");
      expect(call[1].headers).toHaveProperty("x-api-key");
      expect(call[1].headers["anthropic-version"]).toBe("2023-06-01");
    });

    it("includes site metrics in the prompt", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: JSON.stringify({ tests: [] }) }],
        }),
      });

      const input = {
        siteUrl: "https://mystore.com",
        industry: "beauty",
        conversionRate: 2.8,
        aov: 60,
        revenue: 15000,
        sessions: 5000,
        transactions: 140,
        deviceBreakdown: { desktop: 3000, mobile: 1800, tablet: 200 },
      };

      await generateTestPlanFromMetrics(input);

      const call = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);
      const prompt = body.messages[0].content;

      expect(prompt).toContain("https://mystore.com");
      expect(prompt).toContain("2.8%");
      expect(prompt).toContain("beauty");
      expect(prompt).toContain("$15000");
    });

    it("uses correct industry benchmarks", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: JSON.stringify({ tests: [] }) }],
        }),
      });

      await generateTestPlanFromMetrics({
        siteUrl: "https://example.com",
        industry: "jewelry",
        conversionRate: 1.5,
        aov: 250,
        revenue: 8000,
        sessions: 4000,
        transactions: 60,
        deviceBreakdown: { desktop: 2400, mobile: 1400, tablet: 200 },
      });

      const call = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);
      const prompt = body.messages[0].content;

      expect(prompt).toContain("benchmark: 1.9%");
      expect(prompt).toContain("benchmark: $300");
    });

    it("clamps effort_hours to 2-40 range", async () => {
      const mockTestsJson = {
        tests: [
          {
            id: "test_1",
            chapter: "Chapter",
            section: "Section",
            hypothesis: "Test hypothesis",
            effort_hours: 1, // Below minimum
            expected_lift_min: 1,
            expected_lift_max: 5,
            priority_score: 50,
          },
          {
            id: "test_2",
            chapter: "Chapter",
            section: "Section",
            hypothesis: "Test hypothesis",
            effort_hours: 100, // Above maximum
            expected_lift_min: 1,
            expected_lift_max: 5,
            priority_score: 50,
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: JSON.stringify(mockTestsJson) }],
        }),
      });

      const result = await generateTestPlanFromMetrics({
        siteUrl: "https://example.com",
        industry: null,
        conversionRate: 2,
        aov: 100,
        revenue: 5000,
        sessions: 2500,
        transactions: 50,
        deviceBreakdown: { desktop: 1500, mobile: 900, tablet: 100 },
      });

      expect(result.tests[0].effort_hours).toBe(2);
      expect(result.tests[1].effort_hours).toBe(40);
    });

    it("clamps priority_score to 0-100 range", async () => {
      const mockTestsJson = {
        tests: [
          {
            id: "test_1",
            chapter: "Chapter",
            section: "Section",
            hypothesis: "Test",
            effort_hours: 8,
            expected_lift_min: 1,
            expected_lift_max: 5,
            priority_score: 150, // Above 100
          },
          {
            id: "test_2",
            chapter: "Chapter",
            section: "Section",
            hypothesis: "Test",
            effort_hours: 8,
            expected_lift_min: 1,
            expected_lift_max: 5,
            priority_score: -10, // Below 0
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: JSON.stringify(mockTestsJson) }],
        }),
      });

      const result = await generateTestPlanFromMetrics({
        siteUrl: "https://example.com",
        industry: null,
        conversionRate: 2,
        aov: 100,
        revenue: 5000,
        sessions: 2500,
        transactions: 50,
        deviceBreakdown: { desktop: 1500, mobile: 900, tablet: 100 },
      });

      expect(result.tests[0].priority_score).toBe(100);
      expect(result.tests[1].priority_score).toBe(0);
    });

    it("sets generated_at timestamp", async () => {
      const before = new Date();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: JSON.stringify({ tests: [] }) }],
        }),
      });

      const result = await generateTestPlanFromMetrics({
        siteUrl: "https://example.com",
        industry: null,
        conversionRate: 2,
        aov: 100,
        revenue: 5000,
        sessions: 2500,
        transactions: 50,
        deviceBreakdown: { desktop: 1500, mobile: 900, tablet: 100 },
      });

      const after = new Date();

      expect(result.generated_at).toBeDefined();
      expect(new Date(result.generated_at).getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(new Date(result.generated_at).getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("handles null industry by using default benchmark", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: JSON.stringify({ tests: [] }) }],
        }),
      });

      const result = await generateTestPlanFromMetrics({
        siteUrl: "https://example.com",
        industry: null,
        conversionRate: 2,
        aov: 100,
        revenue: 5000,
        sessions: 2500,
        transactions: 50,
        deviceBreakdown: { desktop: 1500, mobile: 900, tablet: 100 },
      });

      expect(result.site_industry).toBe("Unknown");
      expect(result.benchmark_conversion_rate).toBe(2.5); // default
      expect(result.benchmark_aov).toBe(100); // default
    });

    it("extracts JSON from response even with markdown formatting", async () => {
      const testJson = { tests: [{ id: "t1", chapter: "Ch", section: "S", hypothesis: "H", effort_hours: 8, expected_lift_min: 1, expected_lift_max: 5, priority_score: 50 }] };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            {
              text: `Here's the analysis:\n\`\`\`json\n${JSON.stringify(testJson)}\n\`\`\`\n\nThis is my recommendation.`,
            },
          ],
        }),
      });

      const result = await generateTestPlanFromMetrics({
        siteUrl: "https://example.com",
        industry: null,
        conversionRate: 2,
        aov: 100,
        revenue: 5000,
        sessions: 2500,
        transactions: 50,
        deviceBreakdown: { desktop: 1500, mobile: 900, tablet: 100 },
      });

      expect(result.tests.length).toBe(1);
      expect(result.tests[0].id).toBe("t1");
    });

    it("throws on invalid JSON response", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: "This is not JSON at all" }],
        }),
      });

      await expect(
        generateTestPlanFromMetrics({
          siteUrl: "https://example.com",
          industry: null,
          conversionRate: 2,
          aov: 100,
          revenue: 5000,
          sessions: 2500,
          transactions: 50,
          deviceBreakdown: { desktop: 1500, mobile: 900, tablet: 100 },
        })
      ).rejects.toThrow(/did not contain valid JSON/);
    });

    it("throws on API error (non-ok response)", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      });

      await expect(
        generateTestPlanFromMetrics({
          siteUrl: "https://example.com",
          industry: null,
          conversionRate: 2,
          aov: 100,
          revenue: 5000,
          sessions: 2500,
          transactions: 50,
          deviceBreakdown: { desktop: 1500, mobile: 900, tablet: 100 },
        })
      ).rejects.toThrow(/Claude API error/);
    });

    it("throws on network failure", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

      await expect(
        generateTestPlanFromMetrics({
          siteUrl: "https://example.com",
          industry: null,
          conversionRate: 2,
          aov: 100,
          revenue: 5000,
          sessions: 2500,
          transactions: 50,
          deviceBreakdown: { desktop: 1500, mobile: 900, tablet: 100 },
        })
      ).rejects.toThrow("Network error");
    });

    it("sets test status to 'pending'", async () => {
      const mockTestsJson = {
        tests: [
          {
            id: "test_1",
            chapter: "Chapter",
            section: "Section",
            hypothesis: "Test hypothesis",
            effort_hours: 8,
            expected_lift_min: 2,
            expected_lift_max: 5,
            priority_score: 50,
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: JSON.stringify(mockTestsJson) }],
        }),
      });

      const result = await generateTestPlanFromMetrics({
        siteUrl: "https://example.com",
        industry: null,
        conversionRate: 2,
        aov: 100,
        revenue: 5000,
        sessions: 2500,
        transactions: 50,
        deviceBreakdown: { desktop: 1500, mobile: 900, tablet: 100 },
      });

      expect(result.tests[0].status).toBe("pending");
    });

    it("generates UUID for missing test IDs", async () => {
      const mockTestsJson = {
        tests: [
          {
            chapter: "Chapter",
            section: "Section",
            hypothesis: "Test",
            effort_hours: 8,
            expected_lift_min: 1,
            expected_lift_max: 5,
            priority_score: 50,
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: JSON.stringify(mockTestsJson) }],
        }),
      });

      const result = await generateTestPlanFromMetrics({
        siteUrl: "https://example.com",
        industry: null,
        conversionRate: 2,
        aov: 100,
        revenue: 5000,
        sessions: 2500,
        transactions: 50,
        deviceBreakdown: { desktop: 1500, mobile: 900, tablet: 100 },
      });

      // Either an ID was provided or generated (non-empty string)
      expect(result.tests[0].id).toBeDefined();
      expect(typeof result.tests[0].id).toBe("string");
      expect(result.tests[0].id.length).toBeGreaterThan(0);
    });
  });

});
