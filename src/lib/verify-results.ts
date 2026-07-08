import type { TestPlanAnalysis } from "@/types";
import { claudeJson, ClaudeApiError, ClaudeJsonError } from "./claude-json";

export interface ResultVerification {
  verified: boolean;
  confidence: number;
  issues: string[];
  verifiedAt: string;
}

interface AuditResultForVerification {
  checklist_items: Array<{ category: string; label: string; passed: boolean }>;
  score_pct: number;
}

export async function verifyAuditResults(
  auditResult: AuditResultForVerification,
  testPlan: TestPlanAnalysis
): Promise<ResultVerification> {
  const totalChecks = auditResult.checklist_items.length;
  const passedChecks = auditResult.checklist_items.filter((c) => c.passed).length;

  const prompt = `You are a CRO (Conversion Rate Optimization) expert auditing the validity of a conversion optimization analysis.

Audit Results:
- Total Checks: ${totalChecks}
- Passed Checks: ${passedChecks}
- Pass Rate: ${auditResult.score_pct}%
- Categories Checked: ${[...new Set(auditResult.checklist_items.map((c) => c.category))].join(", ")}

Test Plan:
- Industry: ${testPlan.site_industry}
- Number of Tests: ${testPlan.tests.length}
- Test Categories: ${[...new Set(testPlan.tests.map((t) => t.chapter))].join(", ")}
- Priority Range: ${Math.min(...testPlan.tests.map((t) => t.priority_score))}-${Math.max(...testPlan.tests.map((t) => t.priority_score))}

Evaluate the internal coherence and reasonableness of these results:
1. Is the audit pass rate (${auditResult.score_pct}%) reasonable for a typical ecommerce site?
2. Do the identified test categories align with typical CRO concerns?
3. Is the test plan length (${testPlan.tests.length} tests) appropriate for the audit findings?

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "verified": boolean,
  "confidence": number (0-100),
  "issues": [array of issue strings, can be empty]
}

Examples:
- Confidence 85-100: All metrics reasonable, strong coherence
- Confidence 70-84: Minor inconsistencies but generally sound
- Confidence 50-69: Some concerns about coherence
- Confidence 0-49: Major red flags, data quality issues

Do not include any text outside the JSON object.`;

  try {
    const parsed = await claudeJson(prompt, 1024);

    return {
      verified: Boolean(parsed.verified),
      confidence: Math.max(0, Math.min(100, parsed.confidence || 0)),
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      verifiedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Verification failed:", error);
    // Non-blocking: always return a low-confidence result instead of throwing
    const issue =
      error instanceof ClaudeApiError
        ? "Verification service unavailable"
        : error instanceof ClaudeJsonError
          ? "Invalid verification response"
          : error instanceof Error
            ? error.message
            : "Verification error";
    return {
      verified: false,
      confidence: 0,
      issues: [issue],
      verifiedAt: new Date().toISOString(),
    };
  }
}
