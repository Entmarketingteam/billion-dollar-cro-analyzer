import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/db";
import { generateTestPlan } from "@/lib/claude-agent";
import { runPlaywrightAudit } from "@/lib/playwright-audit";
import { syncAnalysisToAirtable } from "@/lib/airtable";
import { fetchShopifyMetrics } from "@/lib/shopify";
import { fetchGA4Metrics, refreshGA4Token } from "@/lib/ga4";
import type { Site } from "@/types";

interface AnalyzeRequest {
  siteId: string;
}

export async function POST(request: NextRequest) {
  try {
    const { siteId } = (await request.json()) as AnalyzeRequest;

    if (!siteId) {
      return NextResponse.json(
        { error: "Missing siteId" },
        { status: 400 }
      );
    }

    const db = createServerClient();

    // ── 1. Fetch site details ────────────────────────────────

    const { data: siteData, error: siteError } = await db
      .from("sites")
      .select("*")
      .eq("id", siteId)
      .single();

    if (siteError || !siteData) {
      return NextResponse.json(
        { error: `Site not found: ${siteError?.message || siteId}` },
        { status: 404 }
      );
    }

    const site = siteData as Site;

    // ── 2. Fetch metrics from Shopify & GA4 ──────────────────

    let metrics = {
      conversion_rate: 0,
      aov: 0,
      revenue: 0,
      sessions: 0,
      transactions: 0,
      device_breakdown: { desktop: 0, mobile: 0, tablet: 0 },
    };

    // Shopify metrics
    if (site.shopify_access_token) {
      try {
        const shopifyMetrics = await fetchShopifyMetrics(
          site.shopify_access_token,
          site.shopify_domain || ""
        );
        metrics = { ...metrics, ...shopifyMetrics };
      } catch (error) {
        console.warn(`Shopify metrics fetch failed for ${siteId}:`, error);
      }
    }

    // GA4 metrics (if property_id is set)
    if (site.ga4_property_id && site.ga4_refresh_token) {
      try {
        const accessToken = await refreshGA4Token(site.ga4_refresh_token);
        const ga4Metrics = await fetchGA4Metrics(
          accessToken,
          site.ga4_property_id
        );
        // Merge GA4 metrics (prioritize GA4 data if both exist)
        metrics = { ...metrics, ...ga4Metrics };
      } catch (error) {
        console.warn(`GA4 metrics fetch failed for ${siteId}:`, error);
      }
    }

    // ── 3. Generate test plan using Claude ───────────────────

    const testPlan = await generateTestPlan({
      siteUrl: site.url,
      industry: site.industry,
      conversionRate: metrics.conversion_rate,
      aov: metrics.aov,
      revenue: metrics.revenue,
      sessions: metrics.sessions,
      transactions: metrics.transactions,
      deviceBreakdown: metrics.device_breakdown,
    });

    // ── 4. Run Playwright audit ──────────────────────────────

    const auditResult = await runPlaywrightAudit(site.url);
    const passedChecks = auditResult.checklist_items.filter((c) => c.passed).length;

    // ── 5. Save test plan to Supabase ────────────────────────

    const { error: testPlanError } = await db.from("test_plans").insert({
      site_id: siteId,
      analysis_json: testPlan,
    });

    if (testPlanError) {
      console.error("Test plan save failed:", testPlanError);
    }

    // ── 6. Save audit result to Supabase ─────────────────────

    const checklistItems = auditResult.checklist_items.map((item, i) => ({
      id: `check_${i}`,
      category: item.category,
      label: item.label,
      passed: item.passed,
      notes: item.details ?? null,
      screenshot_url: null,
    }));

    const { error: auditError } = await db.from("audit_results").insert({
      site_id: siteId,
      checklist_items: checklistItems,
      total_checks: checklistItems.length,
      passed_checks: passedChecks,
      score_pct: auditResult.score_pct,
    });

    if (auditError) {
      console.error("Audit result save failed:", auditError);
    }

    // ── 7. Sync to Airtable ──────────────────────────────────

    try {
      await syncAnalysisToAirtable(
        siteId,
        site.name,
        site.url,
        testPlan,
        auditResult
      );
    } catch (error) {
      console.warn("Airtable sync failed (non-critical):", error);
    }

    // ── 8. Return results ────────────────────────────────────

    return NextResponse.json({
      siteId,
      siteName: site.name,
      metrics,
      testPlan,
      auditResult,
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Analysis failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Analysis failed",
      },
      { status: 500 }
    );
  }
}
