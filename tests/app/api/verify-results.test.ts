/** @jest-environment node */
import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";

// Mock dependencies BEFORE importing the route
jest.mock("@/lib/db", () => ({
  getTestRun: jest.fn(),
  updateTestRunStatus: jest.fn(),
  createServerClient: jest.fn(),
}));

jest.mock("@/lib/verify-results", () => ({
  verifyAuditResults: jest.fn(),
}));

import { POST } from "@/app/api/verify-results/route";

const { getTestRun, updateTestRunStatus } = require("@/lib/db");
const { verifyAuditResults } = require("@/lib/verify-results");

describe("POST /api/verify-results", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns 400 when testRunId is missing from request body", async () => {
    const req = {
      json: async () => ({}),
    };

    const response = await POST(req as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Missing testRunId");
    expect(getTestRun).not.toHaveBeenCalled();
  });

  it("returns 400 when testRunId is null", async () => {
    const req = {
      json: async () => ({ testRunId: null }),
    };

    const response = await POST(req as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Missing testRunId");
  });

  it("fetches the test run by ID", async () => {
    const mockTestRun = {
      id: "tr-123",
      status: "completed",
      results: {
        audit_result: { checklist_items: [], score_pct: 75 },
        test_plan: { tests: [], generated_at: "2026-07-06T10:00:00Z" },
      },
    };

    getTestRun.mockResolvedValueOnce(mockTestRun);
    verifyAuditResults.mockResolvedValueOnce({
      verified: true,
      confidence: 80,
      issues: [],
      verifiedAt: new Date().toISOString(),
    });
    updateTestRunStatus.mockResolvedValueOnce({ ...mockTestRun });

    const req = {
      json: async () => ({ testRunId: "tr-123" }),
    };

    await POST(req as any);

    expect(getTestRun).toHaveBeenCalledWith("tr-123");
  });

  it("returns 400 when test run has no audit_result", async () => {
    const mockTestRun = {
      id: "tr-123",
      status: "completed",
      results: {
        test_plan: { tests: [] },
      },
    };

    getTestRun.mockResolvedValueOnce(mockTestRun);

    const req = {
      json: async () => ({ testRunId: "tr-123" }),
    };

    const response = await POST(req as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("audit result");
  });

  it("returns 400 when test run has no test_plan", async () => {
    const mockTestRun = {
      id: "tr-123",
      status: "completed",
      results: {
        audit_result: { checklist_items: [], score_pct: 75 },
      },
    };

    getTestRun.mockResolvedValueOnce(mockTestRun);

    const req = {
      json: async () => ({ testRunId: "tr-123" }),
    };

    const response = await POST(req as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("test plan");
  });

  it("returns 400 when results object is null", async () => {
    const mockTestRun = {
      id: "tr-123",
      status: "completed",
      results: null,
    };

    getTestRun.mockResolvedValueOnce(mockTestRun);

    const req = {
      json: async () => ({ testRunId: "tr-123" }),
    };

    const response = await POST(req as any);
    const body = await response.json();

    expect(response.status).toBe(400);
  });

  it("calls verifyAuditResults with audit result and test plan", async () => {
    const mockTestRun = {
      id: "tr-123",
      status: "completed",
      results: {
        audit_result: { checklist_items: [], score_pct: 75 },
        test_plan: {
          site_industry: "apparel",
          benchmark_conversion_rate: 2.5,
          benchmark_aov: 75,
          tests: [],
          generated_at: "2026-07-06T10:00:00Z",
          model: "claude-opus-4-1",
        },
      },
    };

    getTestRun.mockResolvedValueOnce(mockTestRun);
    verifyAuditResults.mockResolvedValueOnce({
      verified: true,
      confidence: 80,
      issues: [],
      verifiedAt: new Date().toISOString(),
    });
    updateTestRunStatus.mockResolvedValueOnce(mockTestRun);

    const req = {
      json: async () => ({ testRunId: "tr-123" }),
    };

    await POST(req as any);

    expect(verifyAuditResults).toHaveBeenCalledWith(
      mockTestRun.results.audit_result,
      mockTestRun.results.test_plan
    );
  });

  it("updates test run with verification result", async () => {
    const mockTestRun = {
      id: "tr-123",
      status: "completed",
      results: {
        audit_result: { checklist_items: [], score_pct: 75 },
        test_plan: { tests: [], generated_at: "2026-07-06T10:00:00Z" },
      },
    };

    const mockVerification = {
      verified: true,
      confidence: 85,
      issues: [],
      verifiedAt: "2026-07-06T11:00:00Z",
    };

    getTestRun.mockResolvedValueOnce(mockTestRun);
    verifyAuditResults.mockResolvedValueOnce(mockVerification);
    updateTestRunStatus.mockResolvedValueOnce({
      ...mockTestRun,
      results: { ...mockTestRun.results, verification: mockVerification },
    });

    const req = {
      json: async () => ({ testRunId: "tr-123" }),
    };

    await POST(req as any);

    expect(updateTestRunStatus).toHaveBeenCalledWith(
      "tr-123",
      "completed",
      expect.objectContaining({
        verification: mockVerification,
      })
    );
  });

  it("returns the verification result", async () => {
    const mockTestRun = {
      id: "tr-123",
      status: "completed",
      results: {
        audit_result: { checklist_items: [], score_pct: 75 },
        test_plan: { tests: [], generated_at: "2026-07-06T10:00:00Z" },
      },
    };

    const mockVerification = {
      verified: true,
      confidence: 85,
      issues: [],
      verifiedAt: "2026-07-06T11:00:00Z",
    };

    getTestRun.mockResolvedValueOnce(mockTestRun);
    verifyAuditResults.mockResolvedValueOnce(mockVerification);
    updateTestRunStatus.mockResolvedValueOnce({
      ...mockTestRun,
      results: { ...mockTestRun.results, verification: mockVerification },
    });

    const req = {
      json: async () => ({ testRunId: "tr-123" }),
    };

    const response = await POST(req as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.verified).toBe(true);
    expect(body.confidence).toBe(85);
    expect(body.issues).toEqual([]);
  });

  it("returns 500 on verification error", async () => {
    const mockTestRun = {
      id: "tr-123",
      status: "completed",
      results: {
        audit_result: { checklist_items: [], score_pct: 75 },
        test_plan: { tests: [], generated_at: "2026-07-06T10:00:00Z" },
      },
    };

    getTestRun.mockResolvedValueOnce(mockTestRun);
    verifyAuditResults.mockRejectedValueOnce(new Error("Verification service error"));

    const req = {
      json: async () => ({ testRunId: "tr-123" }),
    };

    const response = await POST(req as any);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toContain("Verification service error");
  });

  it("returns 500 on database fetch error", async () => {
    getTestRun.mockRejectedValueOnce(new Error("Database connection failed"));

    const req = {
      json: async () => ({ testRunId: "tr-123" }),
    };

    const response = await POST(req as any);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Database connection failed");
  });

  it("returns 500 on database update error", async () => {
    const mockTestRun = {
      id: "tr-123",
      status: "completed",
      results: {
        audit_result: { checklist_items: [], score_pct: 75 },
        test_plan: { tests: [], generated_at: "2026-07-06T10:00:00Z" },
      },
    };

    getTestRun.mockResolvedValueOnce(mockTestRun);
    verifyAuditResults.mockResolvedValueOnce({
      verified: true,
      confidence: 85,
      issues: [],
      verifiedAt: "2026-07-06T11:00:00Z",
    });
    updateTestRunStatus.mockRejectedValueOnce(new Error("Update failed"));

    const req = {
      json: async () => ({ testRunId: "tr-123" }),
    };

    const response = await POST(req as any);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Update failed");
  });

  it("returns JSON response with correct content-type", async () => {
    const mockTestRun = {
      id: "tr-123",
      status: "completed",
      results: {
        audit_result: { checklist_items: [], score_pct: 75 },
        test_plan: { tests: [], generated_at: "2026-07-06T10:00:00Z" },
      },
    };

    getTestRun.mockResolvedValueOnce(mockTestRun);
    verifyAuditResults.mockResolvedValueOnce({
      verified: true,
      confidence: 80,
      issues: [],
      verifiedAt: new Date().toISOString(),
    });
    updateTestRunStatus.mockResolvedValueOnce(mockTestRun);

    const req = {
      json: async () => ({ testRunId: "tr-123" }),
    };

    const response = await POST(req as any);

    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("handles low confidence verification result", async () => {
    const mockTestRun = {
      id: "tr-123",
      status: "completed",
      results: {
        audit_result: { checklist_items: [], score_pct: 10 },
        test_plan: { tests: [], generated_at: "2026-07-06T10:00:00Z" },
      },
    };

    const mockVerification = {
      verified: false,
      confidence: 25,
      issues: ["Unusually low pass rate", "Few tests planned"],
      verifiedAt: "2026-07-06T11:00:00Z",
    };

    getTestRun.mockResolvedValueOnce(mockTestRun);
    verifyAuditResults.mockResolvedValueOnce(mockVerification);
    updateTestRunStatus.mockResolvedValueOnce({
      ...mockTestRun,
      results: { ...mockTestRun.results, verification: mockVerification },
    });

    const req = {
      json: async () => ({ testRunId: "tr-123" }),
    };

    const response = await POST(req as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.verified).toBe(false);
    expect(body.confidence).toBe(25);
    expect(body.issues).toHaveLength(2);
  });

  it("handles verification with multiple issues", async () => {
    const mockTestRun = {
      id: "tr-123",
      status: "completed",
      results: {
        audit_result: { checklist_items: Array(20).fill({ passed: false }), score_pct: 5 },
        test_plan: {
          tests: Array(50).fill({}),
          generated_at: "2026-07-06T10:00:00Z",
        },
      },
    };

    const mockVerification = {
      verified: false,
      confidence: 15,
      issues: [
        "Extremely low audit pass rate",
        "Excessive number of tests planned",
        "Major inconsistency between findings",
      ],
      verifiedAt: "2026-07-06T11:00:00Z",
    };

    getTestRun.mockResolvedValueOnce(mockTestRun);
    verifyAuditResults.mockResolvedValueOnce(mockVerification);
    updateTestRunStatus.mockResolvedValueOnce({
      ...mockTestRun,
      results: { ...mockTestRun.results, verification: mockVerification },
    });

    const req = {
      json: async () => ({ testRunId: "tr-123" }),
    };

    const response = await POST(req as any);
    const body = await response.json();

    expect(body.issues).toHaveLength(3);
  });
});
