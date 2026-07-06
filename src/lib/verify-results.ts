import type { TestPlanAnalysis } from "@/types";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

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
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-1",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Verification API error:", error);
      // Non-blocking: return low confidence on API error
      return {
        verified: false,
        confidence: 0,
        issues: ["Verification service unavailable"],
        verifiedAt: new Date().toISOString(),
      };
    }

    const data = await response.json();
    const content = data.content[0]?.text || "";

    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Invalid verification response:", content);
      return {
        verified: false,
        confidence: 0,
        issues: ["Invalid verification response"],
        verifiedAt: new Date().toISOString(),
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      verified: Boolean(parsed.verified),
      confidence: Math.max(0, Math.min(100, parsed.confidence || 0)),
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      verifiedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Verification failed:", error);
    // Non-blocking: return low confidence on error
    return {
      verified: false,
      confidence: 0,
      issues: [error instanceof Error ? error.message : "Verification error"],
      verifiedAt: new Date().toISOString(),
    };
  }
}
