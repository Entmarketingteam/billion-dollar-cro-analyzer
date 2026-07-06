import type { TestPlanAnalysis } from "@/types";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

interface AnalysisInput {
  siteUrl: string;
  industry: string | null;
  conversionRate: number;
  aov: number;
  revenue: number;
  sessions: number;
  transactions: number;
  deviceBreakdown: { desktop: number; mobile: number; tablet: number };
}

// Industry benchmarks (simplified; in production, fetch from external source)
const BENCHMARKS: Record<string, { conversion_rate: number; aov: number }> = {
  apparel: { conversion_rate: 2.5, aov: 75 },
  beauty: { conversion_rate: 2.8, aov: 60 },
  electronics: { conversion_rate: 2.1, aov: 250 },
  home_garden: { conversion_rate: 2.3, aov: 120 },
  jewelry: { conversion_rate: 1.9, aov: 300 },
  sports: { conversion_rate: 2.4, aov: 90 },
  default: { conversion_rate: 2.5, aov: 100 },
};

function getBenchmark(
  industry: string | null
): { conversion_rate: number; aov: number } {
  if (!industry) return BENCHMARKS.default;
  const key = industry.toLowerCase().replace(/\s+/g, "_");
  return BENCHMARKS[key] || BENCHMARKS.default;
}

export async function generateTestPlanFromMetrics(
  input: AnalysisInput
): Promise<TestPlanAnalysis> {
  const benchmark = getBenchmark(input.industry);

  const prompt = `You are a CRO (Conversion Rate Optimization) expert analyzing a Shopify store.

Store URL: ${input.siteUrl}
Industry: ${input.industry || "Unknown"}

Current Performance:
- Conversion Rate: ${input.conversionRate}% (benchmark: ${benchmark.conversion_rate}%)
- AOV: $${input.aov} (benchmark: $${benchmark.aov})
- Monthly Revenue: $${input.revenue}
- Sessions: ${input.sessions}
- Transactions: ${input.transactions}
- Device Breakdown: Desktop ${input.deviceBreakdown.desktop}%, Mobile ${input.deviceBreakdown.mobile}%, Tablet ${input.deviceBreakdown.tablet}%

Based on the "Billion Dollar Websites" framework by Joel Klettke, generate a prioritized test plan for this store.

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "tests": [
    {
      "id": "unique_id",
      "chapter": "chapter_name",
      "section": "section_name",
      "hypothesis": "clear hypothesis statement",
      "effort_hours": number,
      "expected_lift_min": number (as percent),
      "expected_lift_max": number (as percent),
      "priority_score": number (0-100)
    }
  ]
}

Generate 5-8 tests that are:
1. Specific to the identified performance gaps
2. Based on Billion Dollar Websites best practices
3. Ordered by priority_score (highest first)
4. Realistic effort_hours (2-40 hours)
5. Conservative expected_lift estimates

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
        max_tokens: 2048,
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
      throw new Error(
        `Claude API error: ${response.status} ${error.substring(0, 200)}`
      );
    }

    const data = await response.json();
    const content = data.content[0]?.text || "";

    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Claude response did not contain valid JSON");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      site_industry: input.industry || "Unknown",
      benchmark_conversion_rate: benchmark.conversion_rate,
      benchmark_aov: benchmark.aov,
      tests: (parsed.tests || []).map(
        (test: {
          id: string;
          chapter: string;
          section: string;
          hypothesis: string;
          effort_hours: number;
          expected_lift_min: number;
          expected_lift_max: number;
          priority_score: number;
        }) => ({
          id: test.id || crypto.randomUUID(),
          chapter: test.chapter || "General",
          section: test.section || "Testing",
          hypothesis: test.hypothesis || "",
          effort_hours: Math.max(2, Math.min(40, test.effort_hours || 8)),
          expected_lift_min: Math.max(0, test.expected_lift_min || 1),
          expected_lift_max: Math.max(0, test.expected_lift_max || 5),
          priority_score: Math.max(0, Math.min(100, test.priority_score || 50)),
          status: "pending" as const,
        })
      ),
      generated_at: new Date().toISOString(),
      model: "claude-opus-4-1",
    };
  } catch (error) {
    console.error("Claude analysis failed:", error);
    throw error;
  }
}

// Accepts a Site object (url, industry) with zero-value metrics defaults.
// Used by test-runner where metrics are not available at run time.
export async function generateTestPlan(site: any): Promise<{ tests: Array<any> }> {
  return generateTestPlanFromMetrics({
    siteUrl: site.url,
    industry: site.industry ?? null,
    conversionRate: 0,
    aov: 0,
    revenue: 0,
    sessions: 0,
    transactions: 0,
    deviceBreakdown: { desktop: 0, mobile: 0, tablet: 0 },
  });
}
