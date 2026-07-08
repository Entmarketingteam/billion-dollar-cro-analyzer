const AIRTABLE_API_TOKEN = process.env.AIRTABLE_API_TOKEN || "";
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "";
const AIRTABLE_ANALYSES_TABLE = "Analyses";

interface AirtableRecord {
  id: string;
  fields: Record<string, any>;
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
