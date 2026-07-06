/** @jest-environment node */
import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";

// Mock environment variables FIRST
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "fake-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-key";

// Mock the database module BEFORE importing the route
jest.mock("@/lib/db", () => ({
  listTestRunsBySite: jest.fn(),
  createServerClient: jest.fn(),
}));

import { GET } from "@/app/api/test-run/route";

const { listTestRunsBySite } = require("@/lib/db");

describe("GET /api/test-run", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns 200 with list of test runs for a site", async () => {
    const mockRuns = [
      {
        id: "tr-1",
        site_id: "site-456",
        status: "completed",
        started_at: "2026-07-06T10:00:00Z",
        completed_at: "2026-07-06T10:15:00Z",
        created_at: "2026-07-06T10:00:00Z",
      },
      {
        id: "tr-2",
        site_id: "site-456",
        status: "pending",
        started_at: "2026-07-06T11:00:00Z",
        completed_at: null,
        created_at: "2026-07-06T11:00:00Z",
      },
    ];

    listTestRunsBySite.mockResolvedValueOnce(mockRuns);

    const req = {
      nextUrl: {
        searchParams: new URLSearchParams("siteId=site-456"),
      },
    };

    const response = await GET(req as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(mockRuns);
    expect(body).toHaveLength(2);
  });

  it("calls listTestRunsBySite with the siteId from query params", async () => {
    listTestRunsBySite.mockResolvedValueOnce([]);

    const req = {
      nextUrl: {
        searchParams: new URLSearchParams("siteId=my-site-id"),
      },
    };

    await GET(req as any);

    expect(listTestRunsBySite).toHaveBeenCalledWith("my-site-id");
    expect(listTestRunsBySite).toHaveBeenCalledTimes(1);
  });

  it("returns 400 when siteId query parameter is missing", async () => {
    const req = {
      nextUrl: {
        searchParams: new URLSearchParams(""),
      },
    };

    const response = await GET(req as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("siteId required");
    expect(listTestRunsBySite).not.toHaveBeenCalled();
  });

  it("returns empty array when site has no test runs", async () => {
    listTestRunsBySite.mockResolvedValueOnce([]);

    const req = {
      nextUrl: {
        searchParams: new URLSearchParams("siteId=site-with-no-runs"),
      },
    };

    const response = await GET(req as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([]);
    expect(Array.isArray(body)).toBe(true);
  });

  it("returns 500 on database error", async () => {
    const dbError = new Error("Database connection failed");
    listTestRunsBySite.mockRejectedValueOnce(dbError);

    const req = {
      nextUrl: {
        searchParams: new URLSearchParams("siteId=site-456"),
      },
    };

    const response = await GET(req as any);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Database connection failed");
  });

  it("returns test runs in expected order", async () => {
    const mockRuns = [
      { id: "tr-newer", created_at: "2026-07-06T11:00:00Z", status: "pending" },
      { id: "tr-older", created_at: "2026-07-06T10:00:00Z", status: "completed" },
    ];

    listTestRunsBySite.mockResolvedValueOnce(mockRuns);

    const req = {
      nextUrl: {
        searchParams: new URLSearchParams("siteId=site-456"),
      },
    };

    const response = await GET(req as any);
    const body = await response.json();

    expect(body[0].id).toBe("tr-newer");
    expect(body[1].id).toBe("tr-older");
  });

  it("returns mixed status test runs together", async () => {
    const mockRuns = [
      { id: "tr-1", status: "completed" },
      { id: "tr-2", status: "running" },
      { id: "tr-3", status: "pending" },
      { id: "tr-4", status: "error" },
    ];

    listTestRunsBySite.mockResolvedValueOnce(mockRuns);

    const req = {
      nextUrl: {
        searchParams: new URLSearchParams("siteId=site-456"),
      },
    };

    const response = await GET(req as any);
    const body = await response.json();

    expect(body).toHaveLength(4);
    expect(body.map((tr: any) => tr.status)).toEqual([
      "completed",
      "running",
      "pending",
      "error",
    ]);
  });

  it("returns JSON response with correct content-type", async () => {
    listTestRunsBySite.mockResolvedValueOnce([]);

    const req = {
      nextUrl: {
        searchParams: new URLSearchParams("siteId=site-456"),
      },
    };

    const response = await GET(req as any);

    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("returns test runs with all expected properties", async () => {
    const mockRuns = [
      {
        id: "tr-full",
        site_id: "site-456",
        status: "completed",
        started_at: "2026-07-06T10:00:00Z",
        completed_at: "2026-07-06T10:20:00Z",
        error_message: null,
        results: {
          audit_result: { score_pct: 85 },
          test_plan: { tests: [{ id: "t1" }] },
        },
        created_at: "2026-07-06T10:00:00Z",
        updated_at: "2026-07-06T10:20:00Z",
      },
    ];

    listTestRunsBySite.mockResolvedValueOnce(mockRuns);

    const req = {
      nextUrl: {
        searchParams: new URLSearchParams("siteId=site-456"),
      },
    };

    const response = await GET(req as any);
    const body = await response.json();

    expect(body[0]).toHaveProperty("id");
    expect(body[0]).toHaveProperty("site_id");
    expect(body[0]).toHaveProperty("status");
    expect(body[0]).toHaveProperty("started_at");
    expect(body[0]).toHaveProperty("completed_at");
    expect(body[0]).toHaveProperty("results");
    expect(body[0]).toHaveProperty("created_at");
  });

  it("handles error message from query param missing gracefully", async () => {
    const req = {
      nextUrl: {
        searchParams: new URLSearchParams("other_param=value"),
      },
    };

    const response = await GET(req as any);

    expect(response.status).toBe(400);
  });

  it("handles null siteId in query params", async () => {
    const req = {
      nextUrl: {
        searchParams: new URLSearchParams("siteId="),
      },
    };

    const response = await GET(req as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("siteId required");
  });

  it("returns large list of test runs", async () => {
    const mockRuns = Array.from({ length: 100 }, (_, i) => ({
      id: `tr-${i}`,
      site_id: "site-456",
      status: i % 2 === 0 ? "completed" : "pending",
      created_at: new Date(Date.now() - i * 3600000).toISOString(),
    }));

    listTestRunsBySite.mockResolvedValueOnce(mockRuns);

    const req = {
      nextUrl: {
        searchParams: new URLSearchParams("siteId=site-456"),
      },
    };

    const response = await GET(req as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveLength(100);
  });

  it("preserves test run details in list response", async () => {
    const mockRuns = [
      {
        id: "tr-details",
        site_id: "site-456",
        status: "completed",
        started_at: "2026-07-06T10:00:00Z",
        completed_at: "2026-07-06T10:30:00Z",
        error_message: null,
        results: {
          audit_result: {
            checklist_items: [{ category: "Trust", label: "SSL", passed: true }],
            score_pct: 85,
          },
          test_plan: {
            tests: [
              {
                id: "t1",
                chapter: "Trust",
                hypothesis: "Add reviews",
                priority_score: 85,
              },
            ],
          },
        },
        created_at: "2026-07-06T10:00:00Z",
        updated_at: "2026-07-06T10:30:00Z",
      },
    ];

    listTestRunsBySite.mockResolvedValueOnce(mockRuns);

    const req = {
      nextUrl: {
        searchParams: new URLSearchParams("siteId=site-456"),
      },
    };

    const response = await GET(req as any);
    const body = await response.json();

    expect(body[0].results.audit_result.score_pct).toBe(85);
    expect(body[0].results.test_plan.tests[0].priority_score).toBe(85);
  });
});
