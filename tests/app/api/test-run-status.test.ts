/** @jest-environment node */
import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";

// Mock environment variables FIRST
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "fake-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-key";

// Mock the database module BEFORE importing the route
jest.mock("@/lib/db", () => ({
  getTestRun: jest.fn(),
  createServerClient: jest.fn(),
}));

import { GET } from "@/app/api/test-run/[id]/status/route";

const { getTestRun } = require("@/lib/db");

describe("GET /api/test-run/[id]/status", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns 200 with test run data when found", async () => {
    const mockTestRun = {
      id: "test-run-123",
      site_id: "site-456",
      status: "running",
      started_at: new Date().toISOString(),
      completed_at: null,
      error_message: null,
      results: {
        audit_result: { score_pct: 75 },
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    getTestRun.mockResolvedValueOnce(mockTestRun);

    const params = Promise.resolve({ id: "test-run-123" });
    const response = await GET({} as any, { params });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe("test-run-123");
    expect(body.status).toBe("running");
  });

  it("calls getTestRun with the test run ID from params", async () => {
    const mockTestRun = {
      id: "tr-789",
      site_id: "site-456",
      status: "pending",
    };

    getTestRun.mockResolvedValueOnce(mockTestRun);

    const params = Promise.resolve({ id: "tr-789" });
    await GET({} as any, { params });

    expect(getTestRun).toHaveBeenCalledWith("tr-789");
    expect(getTestRun).toHaveBeenCalledTimes(1);
  });

  it("returns 404 when test run is not found", async () => {
    const notFoundError = new Error("Test run not found");
    getTestRun.mockRejectedValueOnce(notFoundError);

    const params = Promise.resolve({ id: "nonexistent-id" });
    const response = await GET({} as any, { params });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toContain("Test run not found");
  });

  it("returns completed test run with results", async () => {
    const mockTestRun = {
      id: "tr-completed",
      site_id: "site-456",
      status: "completed",
      started_at: "2026-07-06T10:00:00Z",
      completed_at: "2026-07-06T10:15:00Z",
      error_message: null,
      results: {
        audit_result: {
          checklist_items: [
            { category: "Trust", label: "SSL", passed: true },
          ],
          score_pct: 90,
        },
        test_plan: {
          tests: [{ id: "t1", chapter: "Ch", hypothesis: "H" }],
          generated_at: "2026-07-06T10:05:00Z",
        },
      },
      created_at: "2026-07-06T10:00:00Z",
      updated_at: "2026-07-06T10:15:00Z",
    };

    getTestRun.mockResolvedValueOnce(mockTestRun);

    const params = Promise.resolve({ id: "tr-completed" });
    const response = await GET({} as any, { params });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("completed");
    expect(body.results.audit_result.score_pct).toBe(90);
    expect(body.results.test_plan.tests).toHaveLength(1);
  });

  it("returns error test run with error_message", async () => {
    const mockTestRun = {
      id: "tr-error",
      site_id: "site-456",
      status: "error",
      started_at: "2026-07-06T10:00:00Z",
      completed_at: "2026-07-06T10:10:00Z",
      error_message: "Claude API call failed",
      results: null,
      created_at: "2026-07-06T10:00:00Z",
      updated_at: "2026-07-06T10:10:00Z",
    };

    getTestRun.mockResolvedValueOnce(mockTestRun);

    const params = Promise.resolve({ id: "tr-error" });
    const response = await GET({} as any, { params });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("error");
    expect(body.error_message).toBe("Claude API call failed");
    expect(body.results).toBeNull();
  });

  it("returns pending test run with no results yet", async () => {
    const mockTestRun = {
      id: "tr-pending",
      site_id: "site-456",
      status: "pending",
      started_at: "2026-07-06T10:00:00Z",
      completed_at: null,
      error_message: null,
      results: null,
      created_at: "2026-07-06T10:00:00Z",
      updated_at: "2026-07-06T10:00:00Z",
    };

    getTestRun.mockResolvedValueOnce(mockTestRun);

    const params = Promise.resolve({ id: "tr-pending" });
    const response = await GET({} as any, { params });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("pending");
    expect(body.results).toBeNull();
  });

  it("returns running test run mid-analysis", async () => {
    const mockTestRun = {
      id: "tr-running",
      site_id: "site-456",
      status: "running",
      started_at: "2026-07-06T10:00:00Z",
      completed_at: null,
      error_message: null,
      results: null,
      created_at: "2026-07-06T10:00:00Z",
      updated_at: "2026-07-06T10:02:00Z",
    };

    getTestRun.mockResolvedValueOnce(mockTestRun);

    const params = Promise.resolve({ id: "tr-running" });
    const response = await GET({} as any, { params });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("running");
    expect(body.completed_at).toBeNull();
  });

  it("returns JSON response with correct content-type", async () => {
    const mockTestRun = {
      id: "tr-123",
      site_id: "site-456",
      status: "pending",
    };

    getTestRun.mockResolvedValueOnce(mockTestRun);

    const params = Promise.resolve({ id: "tr-123" });
    const response = await GET({} as any, { params });

    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("handles generic error messages for 404", async () => {
    const genericError = new Error("not found");
    getTestRun.mockRejectedValueOnce(genericError);

    const params = Promise.resolve({ id: "bad-id" });
    const response = await GET({} as any, { params });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("not found");
  });

  it("handles database errors gracefully", async () => {
    const dbError = new Error("Database query timeout");
    getTestRun.mockRejectedValueOnce(dbError);

    const params = Promise.resolve({ id: "tr-123" });
    const response = await GET({} as any, { params });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toContain("Database query timeout");
  });

  it("correctly awaits async params in Next 15+", async () => {
    const mockTestRun = { id: "tr-123", status: "completed" };
    getTestRun.mockResolvedValueOnce(mockTestRun);

    const params = Promise.resolve({ id: "tr-correct-id" });
    await GET({} as any, { params });

    expect(getTestRun).toHaveBeenCalledWith("tr-correct-id");
  });

  it("returns full test run object with all properties", async () => {
    const mockTestRun = {
      id: "tr-full",
      site_id: "site-456",
      status: "completed",
      started_at: "2026-07-06T10:00:00Z",
      completed_at: "2026-07-06T10:20:00Z",
      error_message: null,
      results: {
        test_plan: {
          tests: [
            {
              id: "t1",
              chapter: "Trust",
              section: "Reviews",
              hypothesis: "Test hypothesis",
              effort_hours: 8,
              expected_lift_min: 2,
              expected_lift_max: 5,
              priority_score: 85,
              status: "pending",
            },
          ],
          generated_at: "2026-07-06T10:05:00Z",
          site_industry: "apparel",
          benchmark_conversion_rate: 2.5,
          benchmark_aov: 75,
          model: "claude-opus-4-1",
        },
        audit_result: {
          checklist_items: [
            { category: "Trust", label: "SSL", passed: true, notes: null },
          ],
          score_pct: 90,
        },
      },
      created_at: "2026-07-06T10:00:00Z",
      updated_at: "2026-07-06T10:20:00Z",
    };

    getTestRun.mockResolvedValueOnce(mockTestRun);

    const params = Promise.resolve({ id: "tr-full" });
    const response = await GET({} as any, { params });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(mockTestRun);
  });
});
