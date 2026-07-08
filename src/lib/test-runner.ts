import { getTestRun, updateTestRunStatus, getSiteById, createServerClient } from './db';
import { performAudit } from './playwright-audit';
import { generateTestPlanFromMetrics } from './claude-agent';
import { fetchShopifyMetrics } from './shopify';
import { fetchGA4Metrics, refreshGA4Token } from './ga4';
import { notifySlack } from './slack';
import { verifyAuditResults } from './verify-results';
import type { MetricsData, Site } from '@/types';

function emptyMetrics(): MetricsData {
  const periodEnd = new Date();
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - 30);
  return {
    conversion_rate: 0,
    aov: 0,
    revenue: 0,
    sessions: 0,
    transactions: 0,
    device_breakdown: { desktop: 0, mobile: 0, tablet: 0 },
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
  };
}

// Best-effort: Shopify first, GA4 layered on top (GA4 has real sessions +
// device data, which Shopify's REST API can't provide). Returns null when
// no source is connected so callers can tell "no data" from "all zeros".
export async function fetchSiteMetrics(site: Site): Promise<MetricsData | null> {
  let metrics: MetricsData | null = null;

  if (site.shopify_access_token && site.shopify_domain) {
    try {
      metrics = await fetchShopifyMetrics(
        site.shopify_access_token,
        site.shopify_domain
      );
    } catch (error) {
      console.warn(`Shopify metrics fetch failed for ${site.id}:`, error);
    }
  }

  if (site.ga4_refresh_token && site.ga4_property_id) {
    try {
      const accessToken = await refreshGA4Token(site.ga4_refresh_token);
      const ga4Metrics = await fetchGA4Metrics(accessToken, site.ga4_property_id);
      metrics = { ...(metrics ?? emptyMetrics()), ...ga4Metrics };
    } catch (error) {
      console.warn(`GA4 metrics fetch failed for ${site.id}:`, error);
    }
  }

  return metrics;
}

export async function runAnalysisJob(testRunId: string): Promise<void> {
  const testRun = await getTestRun(testRunId);
  const site = (await getSiteById(testRun.site_id)) as Site;

  await updateTestRunStatus(testRunId, 'running');

  try {
    const metrics = await fetchSiteMetrics(site);

    if (metrics) {
      const supabase = createServerClient();
      const { error } = await supabase
        .from('metrics_snapshots')
        .insert({ site_id: site.id, metrics });
      if (error) console.warn('Metrics snapshot save failed:', error);
    }

    const effectiveMetrics = metrics ?? emptyMetrics();
    const auditResult = await performAudit(site.url);
    const testPlanFull = await generateTestPlanFromMetrics({
      siteUrl: site.url,
      industry: site.industry ?? null,
      conversionRate: effectiveMetrics.conversion_rate,
      aov: effectiveMetrics.aov,
      revenue: effectiveMetrics.revenue,
      sessions: effectiveMetrics.sessions,
      transactions: effectiveMetrics.transactions,
      deviceBreakdown: effectiveMetrics.device_breakdown,
    });

    const results: any = {
      audit_result: auditResult,
      test_plan: { tests: testPlanFull.tests, generated_at: new Date().toISOString() },
      metrics: metrics
        ? {
            conversion_rate: metrics.conversion_rate,
            aov: metrics.aov,
            sessions: metrics.sessions,
          }
        : undefined,
    };

    // Run verification (non-blocking on error)
    try {
      // Pass the full test plan analysis to verification
      const verification = await verifyAuditResults(auditResult, testPlanFull);
      results.verification = verification;
    } catch (verifyError) {
      console.warn('Verification failed (non-critical):', verifyError);
    }

    await updateTestRunStatus(testRunId, 'completed', results);

    await notifySlack(
      '✅ Analysis Complete',
      `Analysis for ${site.name} completed successfully`,
      {
        'Audit Score': `${auditResult.score_pct}%`,
        'Tests Found': `${testPlanFull.tests.length}`,
        'Conv. Rate': metrics ? `${metrics.conversion_rate}%` : 'no metrics source',
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateTestRunStatus(testRunId, 'error', undefined, message);
    await notifySlack(
      '❌ Analysis Failed',
      `Analysis for ${site.name} failed: ${message}`
    );
    throw error;
  }
}
