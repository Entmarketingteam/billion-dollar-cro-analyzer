import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { verifyAuditResults } from "@/lib/verify-results";
import type { TestPlanAnalysis } from "@/types";

describe("verify-results.ts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("verifyAuditResults", () => {
    it("returns a verification result with high confidence for coherent data", async () => {
      const auditResult = {
        checklist_items: [
          { category: "Trust", label: "SSL", passed: true },
          { category: "Trust", label: "Reviews", passed: true },
          { category: "Checkout", label: "Form Fields", passed: false },
        ],
        score_pct: 67,
      };

      const testPlan: TestPlanAnalysis = {
        site_industry: "apparel",
        benchmark_conversion_rate: 2.5,
        benchmark_aov: 75,
        tests: [
          {
            id: "test1",
            chapter: "Trust Signals",
            section: "Reviews",
            hypothesis: "Adding reviews will increase conversion",
            effort_hours: 8,
            expected_lift_min: 2,
            expected_lift_max: 5,
            priority_score: 85,
            status: "pending",
          },
          {
            id: "test2",
            chapter: "Checkout",
            section: "Form",
            hypothesis: "Reducing form fields will improve completion",
            effort_hours: 16,
            expected_lift_min: 3,
            expected_lift_max: 8,
            priority_score: 75,
            status: "pending",
          },
        ],
        generated_at: new Date().toISOString(),
        model: "claude-opus-4-1",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            {
              text: JSON.stringify({
                verified: true,
                confidence: 85,
                issues: [],
              }),
            },
          ],
        }),
      });

      const result = await verifyAuditResults(auditResult, testPlan);

      expect(result.verified).toBe(true);
      expect(result.confidence).toBe(85);
      expect(result.issues).toEqual([]);
      expect(result.verifiedAt).toBeDefined();
    });

    it("posts to the Anthropic API with correct structure", async () => {
      const auditResult = {
        checklist_items: [{ category: "Trust", label: "SSL", passed: true }],
        score_pct: 100,
      };

      const testPlan: TestPlanAnalysis = {
        site_industry: "electronics",
        benchmark_conversion_rate: 2.1,
        benchmark_aov: 250,
        tests: [
          {
            id: "t1",
            chapter: "Ch",
            section: "S",
            hypothesis: "H",
            effort_hours: 8,
            expected_lift_min: 1,
            expected_lift_max: 5,
            priority_score: 50,
            status: "pending",
          },
        ],
        generated_at: new Date().toISOString(),
        model: "claude-opus-4-1",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: JSON.stringify({ verified: true, confidence: 50, issues: [] }) }],
        }),
      });

      await verifyAuditResults(auditResult, testPlan);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.anthropic.com/v1/messages",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "x-api-key": expect.any(String),
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          }),
        })
      );
    });

    it("includes audit and test plan data in the prompt", async () => {
      const auditResult = {
        checklist_items: [
          { category: "Trust", label: "SSL", passed: true },
          { category: "Trust", label: "Reviews", passed: false },
          { category: "Checkout", label: "Fields", passed: true },
        ],
        score_pct: 67,
      };

      const testPlan: TestPlanAnalysis = {
        site_industry: "apparel",
        benchmark_conversion_rate: 2.5,
        benchmark_aov: 75,
        tests: [
          {
            id: "t1",
            chapter: "Trust Signals",
            section: "S",
            hypothesis: "H",
            effort_hours: 8,
            expected_lift_min: 1,
            expected_lift_max: 5,
            priority_score: 50,
            status: "pending",
          },
          {
            id: "t2",
            chapter: "Checkout",
            section: "S",
            hypothesis: "H",
            effort_hours: 8,
            expected_lift_min: 1,
            expected_lift_max: 5,
            priority_score: 50,
            status: "pending",
          },
        ],
        generated_at: new Date().toISOString(),
        model: "claude-opus-4-1",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: JSON.stringify({ verified: true, confidence: 50, issues: [] }) }],
        }),
      });

      await verifyAuditResults(auditResult, testPlan);

      const call = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);
      const prompt = body.messages[0].content;

      expect(prompt).toContain("Total Checks: 3");
      expect(prompt).toContain("Passed Checks: 2");
      expect(prompt).toContain("Pass Rate: 67%");
      expect(prompt).toContain("Trust");
      expect(prompt).toContain("Checkout");
      expect(prompt).toContain("Number of Tests: 2");
      expect(prompt).toContain("Trust Signals");
      expect(prompt).toContain("apparel");
    });

    it("returns low confidence with issues on API error (non-blocking)", async () => {
      const auditResult = {
        checklist_items: [{ category: "Trust", label: "SSL", passed: true }],
        score_pct: 100,
      };

      const testPlan: TestPlanAnalysis = {
        site_industry: "apparel",
        benchmark_conversion_rate: 2.5,
        benchmark_aov: 75,
        tests: [],
        generated_at: new Date().toISOString(),
        model: "claude-opus-4-1",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      const result = await verifyAuditResults(auditResult, testPlan);

      expect(result.verified).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.issues).toContain("Verification service unavailable");
      expect(result.verifiedAt).toBeDefined();
    });

    it("returns low confidence with issues on invalid JSON response", async () => {
      const auditResult = {
        checklist_items: [{ category: "Trust", label: "SSL", passed: true }],
        score_pct: 100,
      };

      const testPlan: TestPlanAnalysis = {
        site_industry: "apparel",
        benchmark_conversion_rate: 2.5,
        benchmark_aov: 75,
        tests: [],
        generated_at: new Date().toISOString(),
        model: "claude-opus-4-1",
      };

      const badResponse = {
        ok: true,
        json: async () => ({
          content: [{ text: "This is not JSON" }],
        }),
      };
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(badResponse)
        .mockResolvedValueOnce(badResponse);

      const result = await verifyAuditResults(auditResult, testPlan);

      expect(result.verified).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.issues).toContain("Invalid verification response");
    });

    it("returns low confidence on network error (non-blocking)", async () => {
      const auditResult = {
        checklist_items: [{ category: "Trust", label: "SSL", passed: true }],
        score_pct: 100,
      };

      const testPlan: TestPlanAnalysis = {
        site_industry: "apparel",
        benchmark_conversion_rate: 2.5,
        benchmark_aov: 75,
        tests: [],
        generated_at: new Date().toISOString(),
        model: "claude-opus-4-1",
      };

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network timeout"));

      const result = await verifyAuditResults(auditResult, testPlan);

      expect(result.verified).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.issues[0]).toContain("Network timeout");
    });

    it("clamps confidence to 0-100 range", async () => {
      const auditResult = {
        checklist_items: [{ category: "Trust", label: "SSL", passed: true }],
        score_pct: 100,
      };

      const testPlan: TestPlanAnalysis = {
        site_industry: "apparel",
        benchmark_conversion_rate: 2.5,
        benchmark_aov: 75,
        tests: [],
        generated_at: new Date().toISOString(),
        model: "claude-opus-4-1",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            {
              text: JSON.stringify({
                verified: true,
                confidence: 150, // Out of range
                issues: [],
              }),
            },
          ],
        }),
      });

      const result = await verifyAuditResults(auditResult, testPlan);

      expect(result.confidence).toBe(100);
    });

    it("handles negative confidence values", async () => {
      const auditResult = {
        checklist_items: [{ category: "Trust", label: "SSL", passed: true }],
        score_pct: 100,
      };

      const testPlan: TestPlanAnalysis = {
        site_industry: "apparel",
        benchmark_conversion_rate: 2.5,
        benchmark_aov: 75,
        tests: [],
        generated_at: new Date().toISOString(),
        model: "claude-opus-4-1",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            {
              text: JSON.stringify({
                verified: false,
                confidence: -50,
                issues: ["Some issue"],
              }),
            },
          ],
        }),
      });

      const result = await verifyAuditResults(auditResult, testPlan);

      expect(result.confidence).toBe(0);
    });

    it("converts issues array to empty array if missing", async () => {
      const auditResult = {
        checklist_items: [{ category: "Trust", label: "SSL", passed: true }],
        score_pct: 100,
      };

      const testPlan: TestPlanAnalysis = {
        site_industry: "apparel",
        benchmark_conversion_rate: 2.5,
        benchmark_aov: 75,
        tests: [],
        generated_at: new Date().toISOString(),
        model: "claude-opus-4-1",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            {
              text: JSON.stringify({
                verified: true,
                confidence: 75,
              }),
            },
          ],
        }),
      });

      const result = await verifyAuditResults(auditResult, testPlan);

      expect(result.issues).toEqual([]);
    });

    it("extracts issues from response even if not an array", async () => {
      const auditResult = {
        checklist_items: [{ category: "Trust", label: "SSL", passed: true }],
        score_pct: 100,
      };

      const testPlan: TestPlanAnalysis = {
        site_industry: "apparel",
        benchmark_conversion_rate: 2.5,
        benchmark_aov: 75,
        tests: [],
        generated_at: new Date().toISOString(),
        model: "claude-opus-4-1",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            {
              text: JSON.stringify({
                verified: true,
                confidence: 75,
                issues: ["Issue 1", "Issue 2"],
              }),
            },
          ],
        }),
      });

      const result = await verifyAuditResults(auditResult, testPlan);

      expect(result.issues).toEqual(["Issue 1", "Issue 2"]);
    });

    it("handles empty checklist items", async () => {
      const auditResult = {
        checklist_items: [],
        score_pct: 0,
      };

      const testPlan: TestPlanAnalysis = {
        site_industry: "apparel",
        benchmark_conversion_rate: 2.5,
        benchmark_aov: 75,
        tests: [],
        generated_at: new Date().toISOString(),
        model: "claude-opus-4-1",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: JSON.stringify({ verified: false, confidence: 20, issues: [] }) }],
        }),
      });

      const result = await verifyAuditResults(auditResult, testPlan);

      expect(result.verified).toBe(false);
      expect(result.confidence).toBe(20);
    });

    it("extracts JSON from markdown-formatted response", async () => {
      const auditResult = {
        checklist_items: [{ category: "Trust", label: "SSL", passed: true }],
        score_pct: 100,
      };

      const testPlan: TestPlanAnalysis = {
        site_industry: "apparel",
        benchmark_conversion_rate: 2.5,
        benchmark_aov: 75,
        tests: [],
        generated_at: new Date().toISOString(),
        model: "claude-opus-4-1",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            {
              text: 'Here is my analysis:\n```json\n{"verified": true, "confidence": 80, "issues": []}\n```\nEnd of analysis.',
            },
          ],
        }),
      });

      const result = await verifyAuditResults(auditResult, testPlan);

      expect(result.verified).toBe(true);
      expect(result.confidence).toBe(80);
    });

    it("sets verifiedAt to current timestamp", async () => {
      const auditResult = {
        checklist_items: [{ category: "Trust", label: "SSL", passed: true }],
        score_pct: 100,
      };

      const testPlan: TestPlanAnalysis = {
        site_industry: "apparel",
        benchmark_conversion_rate: 2.5,
        benchmark_aov: 75,
        tests: [],
        generated_at: new Date().toISOString(),
        model: "claude-opus-4-1",
      };

      const before = new Date();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            {
              text: JSON.stringify({ verified: true, confidence: 80, issues: [] }),
            },
          ],
        }),
      });

      const result = await verifyAuditResults(auditResult, testPlan);

      const after = new Date();

      expect(new Date(result.verifiedAt).getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(new Date(result.verifiedAt).getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("detects anomalies in audit results", async () => {
      const auditResult = {
        checklist_items: Array(20).fill(null).map((_, i) => ({
          category: "Trust",
          label: `Item ${i}`,
          passed: i < 2, // Only 2/20 passed = 10% — unusually low
        })),
        score_pct: 10,
      };

      const testPlan: TestPlanAnalysis = {
        site_industry: "apparel",
        benchmark_conversion_rate: 2.5,
        benchmark_aov: 75,
        tests: Array(10).fill(null).map((_, i) => ({
          id: `t${i}`,
          chapter: "Chapter",
          section: "Section",
          hypothesis: "Test hypothesis",
          effort_hours: 8,
          expected_lift_min: 1,
          expected_lift_max: 5,
          priority_score: 50,
          status: "pending" as const,
        })),
        generated_at: new Date().toISOString(),
        model: "claude-opus-4-1",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            {
              text: JSON.stringify({
                verified: false,
                confidence: 25,
                issues: ["Unusually low pass rate"],
              }),
            },
          ],
        }),
      });

      const result = await verifyAuditResults(auditResult, testPlan);

      expect(result.confidence).toBeLessThan(50);
      expect(result.issues.some((i) => i.toLowerCase().includes("pass rate"))).toBe(true);
    });
  });
});
