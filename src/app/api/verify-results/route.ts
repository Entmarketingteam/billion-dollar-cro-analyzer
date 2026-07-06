import { NextRequest, NextResponse } from "next/server";
import { getTestRun, updateTestRunStatus, createServerClient } from "@/lib/db";
import { verifyAuditResults } from "@/lib/verify-results";
import type { TestPlanAnalysis } from "@/types";

interface VerifyRequest {
  testRunId: string;
}

export async function POST(request: NextRequest) {
  try {
    const { testRunId } = (await request.json()) as VerifyRequest;

    if (!testRunId) {
      return NextResponse.json(
        { error: "Missing testRunId" },
        { status: 400 }
      );
    }

    // Fetch the test run
    const testRun = await getTestRun(testRunId);

    if (!testRun.results || !testRun.results.audit_result || !testRun.results.test_plan) {
      return NextResponse.json(
        { error: "Test run missing audit result or test plan" },
        { status: 400 }
      );
    }

    // Run verification
    const verification = await verifyAuditResults(
      testRun.results.audit_result,
      testRun.results.test_plan as TestPlanAnalysis
    );

    // Store verification result in test_run
    const updatedResults = {
      ...testRun.results,
      verification,
    };

    const updated = await updateTestRunStatus(testRunId, testRun.status, updatedResults);

    return NextResponse.json(verification);
  } catch (error) {
    console.error("Verification endpoint error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Verification failed",
      },
      { status: 500 }
    );
  }
}
