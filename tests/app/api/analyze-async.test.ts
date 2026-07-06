/** @jest-environment node */
import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";

// Mock environment variables FIRST
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "fake-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-key";

// Create mock implementations before mocking
const createTestRunMock = jest.fn();
const runAnalysisJobMock = jest.fn();

// Mock the database module BEFORE importing the route
jest.mock("@/lib/db", () => ({
  createTestRun: createTestRunMock,
  createServerClient: jest.fn(),
}));

// Mock the test runner module
jest.mock("@/lib/test-runner", () => ({
  runAnalysisJob: runAnalysisJobMock,
}));

import { POST } from "@/app/api/analyze-async/route";

describe("POST /api/analyze-async", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createTestRunMock.mockClear();
    runAnalysisJobMock.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns 202 Accepted with testRunId on successful job creation", async () => {
    const mockTestRun = {
      id: "test-run-123",
      site_id: "site-456",
      status: "pending",
      created_at: new Date().toISOString(),
    };

    createTestRunMock.mockResolvedValueOnce(mockTestRun);

    const req = {
      json: async () => ({ siteId: "site-456" }),
    };

    const response = await POST(req as any);
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body.testRunId).toBe("test-run-123");
    expect(body.status).toBe("pending");
  });

  it("calls createTestRun with the provided siteId", async () => {
    const mockTestRun = { id: "tr-123", site_id: "site-789" };
    createTestRunMock.mockResolvedValueOnce(mockTestRun);

    const req = {
      json: async () => ({ siteId: "site-789" }),
    };

    await POST(req as any);

    expect(createTestRun).toHaveBeenCalledWith("site-789");
    expect(createTestRun).toHaveBeenCalledTimes(1);
  });

  it("fire-and-forget runAnalysisJob (does not await)", async () => {
    const mockTestRun = { id: "tr-456" };
    createTestRunMock.mockResolvedValueOnce(mockTestRun);
    runAnalysisJob.mockResolvedValueOnce(undefined);

    const req = {
      json: async () => ({ siteId: "site-123" }),
    };

    const response = await POST(req as any);

    // Response should return immediately (202) without waiting for runAnalysisJob
    expect(response.status).toBe(202);
    // runAnalysisJob is called but not awaited
    expect(runAnalysisJob).toHaveBeenCalledWith("tr-456");
  });

  it("returns 400 when siteId is missing", async () => {
    const req = {
      json: async () => ({ other_field: "value" }),
    };

    const response = await POST(req as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("siteId required");
    expect(createTestRun).not.toHaveBeenCalled();
  });

  it("returns 400 when siteId is null", async () => {
    const req = {
      json: async () => ({ siteId: null }),
    };

    const response = await POST(req as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("siteId required");
  });

  it("returns 400 when siteId is empty string", async () => {
    const req = {
      json: async () => ({ siteId: "" }),
    };

    const response = await POST(req as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("siteId required");
  });

  it("propagates createTestRun errors (no try/catch)", async () => {
    const mockError = new Error("Database connection failed");
    createTestRunMock.mockRejectedValueOnce(mockError);

    const req = {
      json: async () => ({ siteId: "site-123" }),
    };

    await expect(POST(req as any)).rejects.toThrow("Database connection failed");
  });

  it("handles runAnalysisJob errors gracefully (fire-and-forget)", async () => {
    const mockTestRun = { id: "tr-789" };
    createTestRunMock.mockResolvedValueOnce(mockTestRun);
    const mockError = new Error("Analysis failed");
    runAnalysisJob.mockRejectedValueOnce(mockError);

    const req = {
      json: async () => ({ siteId: "site-123" }),
    };

    // POST should still return 202 even if runAnalysisJob errors
    // (because we don't await it)
    const response = await POST(req as any);

    expect(response.status).toBe(202);
  });

  it("returns JSON response with correct content-type", async () => {
    const mockTestRun = { id: "tr-123" };
    createTestRunMock.mockResolvedValueOnce(mockTestRun);

    const req = {
      json: async () => ({ siteId: "site-456" }),
    };

    const response = await POST(req as any);

    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("accepts siteId in request body", async () => {
    const mockTestRun = { id: "tr-123", site_id: "my-custom-site-id" };
    createTestRunMock.mockResolvedValueOnce(mockTestRun);

    const req = {
      json: async () => ({ siteId: "my-custom-site-id" }),
    };

    await POST(req as any);

    expect(createTestRun).toHaveBeenCalledWith("my-custom-site-id");
  });
});
