import type { TestPlanAnalysis, AuditResult } from "@/types";

const AIRTABLE_API_TOKEN = process.env.AIRTABLE_API_TOKEN || "";
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "";
const AIRTABLE_ANALYSES_TABLE = "Analyses";
const AIRTABLE_TESTS_TABLE = "Tests";
const AIRTABLE_AUDIT_RESULTS_TABLE = "AuditResults";

interface AirtableRecord {
  fields: Record<string, any>;
}

export async function syncAnalysisToAirtable(
  siteId: string,
  siteName: string,
  siteUrl: string,
  analysis: TestPlanAnalysis,
  auditResult: AuditResult
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
        "Total Checks": auditResult.total_checks,
        "Passed Checks": auditResult.passed_checks,
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
      "Passed Checks": auditResult.passed_checks,
      "Total Checks": auditResult.total_checks,
      "Checklist Items": auditItemsSummary,
      "Created At": auditResult.created_at,
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
