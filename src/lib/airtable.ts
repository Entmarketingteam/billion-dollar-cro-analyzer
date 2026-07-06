import type { TestPlanAnalysis } from "@/types";
import type { AuditCheckItem } from "./playwright-real";

interface AuditResultInput {
  checklist_items: AuditCheckItem[];
  score_pct: number;
}

const AIRTABLE_API_TOKEN = process.env.AIRTABLE_API_TOKEN || "";
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "";
const AIRTABLE_ANALYSES_TABLE = "Analyses";
const AIRTABLE_TESTS_TABLE = "Tests";
const AIRTABLE_AUDIT_RESULTS_TABLE = "AuditResults";

interface AirtableRecord {
  id: string;
  fields: Record<string, any>;
}

export async function syncAnalysisToAirtable(
  siteId: string,
  siteName: string,
  siteUrl: string,
  analysis: TestPlanAnalysis,
  auditResult: AuditResultInput
): Promise<void> {
  if (!AIRTABLE_API_TOKEN || !AIRTABLE_BASE_ID) {
    console.warn("Airtable not configured; skipping sync");
    return;
  }

  try {
    // Create Analyses record
    const analysisRecord = await createAirtableRecord(
      AIRTABLE_ANALYSES_TABLE,
      {
        "Site ID": siteId,
        "Site Name": siteName,
        "Site URL": siteUrl,
        Industry: analysis.site_industry,
        "Benchmark CR": analysis.benchmark_conversion_rate,
        "Benchmark AOV": analysis.benchmark_aov,
        "Generated At": analysis.generated_at,
        Model: analysis.model,
        "Audit Score": auditResult.score_pct,
        "Total Checks": auditResult.checklist_items.length,
        "Passed Checks": auditResult.checklist_items.filter((c) => c.passed).length,
      }
    );

    // Create Test records linked to Analysis
    for (const test of analysis.tests) {
      await createAirtableRecord(AIRTABLE_TESTS_TABLE, {
        "Analysis ID": [analysisRecord.id], // Link to parent
        "Test ID": test.id,
        Chapter: test.chapter,
        Section: test.section,
        Hypothesis: test.hypothesis,
        "Effort Hours": test.effort_hours,
        "Expected Lift Min": test.expected_lift_min,
        "Expected Lift Max": test.expected_lift_max,
        "Priority Score": test.priority_score,
        Status: test.status,
      });
    }

    // Create Audit Result record linked to Analysis
    const auditItemsSummary = auditResult.checklist_items
      .map((item) => `${item.category}: ${item.label} (${item.passed ? "✓" : "✗"})`)
      .join("\n");

    await createAirtableRecord(AIRTABLE_AUDIT_RESULTS_TABLE, {
      "Analysis ID": [analysisRecord.id], // Link to parent
      "Score %": auditResult.score_pct,
      "Passed Checks": auditResult.checklist_items.filter((c) => c.passed).length,
      "Total Checks": auditResult.checklist_items.length,
      "Checklist Items": auditItemsSummary,
      "Created At": new Date().toISOString(),
    });

    console.log(
      `✓ Airtable sync complete for site ${siteId}:`,
      analysisRecord.id
    );
  } catch (error) {
    console.error("Airtable sync failed:", error);
    throw error;
  }
}

async function createAirtableRecord(
  tableName: string,
  fields: Record<string, any>
): Promise<AirtableRecord> {
  const response = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableName}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Airtable API error (${tableName}): ${JSON.stringify(error)}`
    );
  }

  return await response.json();
}

export async function getAllAnalysesFromAirtable(
  siteId?: string
): Promise<AirtableRecord[]> {
  if (!AIRTABLE_API_TOKEN || !AIRTABLE_BASE_ID) {
    return [];
  }

  try {
    let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_ANALYSES_TABLE}`;
    if (siteId) {
      url += `?filterByFormula={Site ID}='${siteId}'`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Airtable fetch failed: ${response.status}`);
    }

    const data = await response.json();
    return data.records || [];
  } catch (error) {
    console.error("Airtable fetch failed:", error);
    return [];
  }
}

// Best-effort sync for a completed test run. Logs a warning if Airtable is not configured.
export async function syncToAirtable(
  testRunId: string,
  results: {
    test_plan?: { tests: Array<any>; generated_at: string };
    audit_result?: { checklist_items: Array<any>; score_pct: number };
    metrics?: { conversion_rate: number; aov: number; sessions: number };
  } | null
): Promise<void> {
  if (!AIRTABLE_API_TOKEN || !AIRTABLE_BASE_ID) {
    console.warn("Airtable not configured; skipping sync");
    return;
  }
  await createAirtableRecord("TestRuns", {
    "Test Run ID": testRunId,
    "Audit Score": results?.audit_result?.score_pct ?? null,
    "Tests Found": results?.test_plan?.tests?.length ?? null,
    "Synced At": new Date().toISOString(),
  });
}
