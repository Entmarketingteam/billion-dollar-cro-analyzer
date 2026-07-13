import type { TestPlanAnalysis, FixPack } from "@/types";
import { claudeJson, CLAUDE_MODEL } from "./claude-json";
import type { AuditCheckItem, PageFacts } from "./playwright-real";
import frameworks from "./frameworks.json";

export interface AuditContext {
  failedChecks: AuditCheckItem[];
  pages: Array<Pick<PageFacts, "label" | "url" | "loadTimeMs" | "aboveFold">>;
}

interface AnalysisInput {
  siteUrl: string;
  industry: string | null;
  conversionRate: number;
  aov: number;
  revenue: number;
  sessions: number;
  transactions: number;
  deviceBreakdown: { desktop: number; mobile: number; tablet: number };
  auditContext?: AuditContext;
}

function describeAudit(ctx: AuditContext): string {
  const failures = ctx.failedChecks
    .map((c) => `- [${c.page ?? "site"}] ${c.label}: ${c.details ?? "failed"}`)
    .join("\n");

  const layout = ctx.pages
    .map(
      (p) =>
        `${p.label} (${p.url}, loaded in ${p.loadTimeMs}ms) — above-the-fold elements top to bottom:\n` +
        p.aboveFold
          .map((el) => `  ${el.y}px <${el.tag}> ${el.text}`)
          .join("\n")
    )
    .join("\n\n");

  return `Automated audit findings (checks that FAILED):
${failures || "- none"}

What a visitor actually sees above the fold on each page:
${layout || "(no layout data)"}`;
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

${input.auditContext ? describeAudit(input.auditContext) + "\n" : ""}
Reference test catalog from the "Billion Dollar Websites" framework (adapt, don't copy blindly):
${(frameworks.tests as Array<{ section: string; hypothesis: string }>)
  .map((t) => `- ${t.section}: ${t.hypothesis}`)
  .join("\n")}

Based on the "Billion Dollar Websites" framework by Joel Klettke AND the audit findings above, generate a prioritized test plan for this store. Ground every test in something observed in the metrics, failed checks, or above-the-fold layout — cite the observation inside the hypothesis.

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
    const parsed = await claudeJson(prompt, 2048);

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
      model: CLAUDE_MODEL,
    };
  } catch (error) {
    console.error("Claude analysis failed:", error);
    throw error;
  }
}

// Turns audit findings into concrete, implementable fixes — copy, steps,
// and (when apt) a code snippet — instead of just hypotheses.
export async function generateFixPacks(input: {
  siteUrl: string;
  siteName: string;
  industry: string | null;
  auditContext: AuditContext;
  tests: Array<{ section: string; hypothesis: string; priority_score: number }>;
}): Promise<FixPack[]> {
  const topTests = input.tests
    .slice(0, 5)
    .map((t) => `- (${t.priority_score}) ${t.section}: ${t.hypothesis}`)
    .join("\n");

  const prompt = `You are a senior CRO consultant delivering implementation-ready fixes for a Shopify store.

Store: ${input.siteName} (${input.siteUrl})
Industry: ${input.industry || "Unknown"}

${describeAudit(input.auditContext)}

Highest-priority test hypotheses already identified:
${topTests}

Produce the 4-6 highest-impact CONCRETE fixes. Every fix must be implementable by the store owner this week. Be specific to THIS store — reference the actual above-the-fold content and failed checks; never give generic advice that could apply to any store.

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "fixes": [
    {
      "id": "unique_slug",
      "finding": "what is wrong, citing the specific observation",
      "impact": "high" | "medium" | "low",
      "why": "the conversion mechanism this hurts, one or two sentences",
      "steps": ["step 1", "step 2", ...],
      "copy_example": "ready-to-paste headline/CTA/body copy in the store's voice, or null",
      "snippet": "a short Liquid/HTML/CSS snippet if a code change is the fix, or null",
      "shopify_apps": ["specific app name if an app is the fastest path, else empty array"]
    }
  ]
}

Rules:
- steps are numbered, actionable, and name the exact Shopify admin screen or theme section to touch
- copy_example must sound like this brand (look at the above-the-fold text for voice), not marketing boilerplate
- order fixes by impact, highest first
- if page load time exceeded 3000ms, one fix MUST address performance with specific culprits to check`;

  const parsed = await claudeJson(prompt, 4096);

  return (parsed.fixes || []).slice(0, 6).map(
    (f: {
      id?: string;
      finding?: string;
      impact?: string;
      why?: string;
      steps?: string[];
      copy_example?: string | null;
      snippet?: string | null;
      shopify_apps?: string[];
    }) => ({
      id: f.id || crypto.randomUUID(),
      finding: f.finding || "",
      impact: (["high", "medium", "low"].includes(f.impact || "")
        ? f.impact
        : "medium") as FixPack["impact"],
      why: f.why || "",
      steps: Array.isArray(f.steps) ? f.steps : [],
      copy_example: f.copy_example || null,
      snippet: f.snippet || null,
      shopify_apps: Array.isArray(f.shopify_apps) ? f.shopify_apps : [],
    })
  );
}
