import { getTestRun, updateTestRunStatus, getSiteById } from './db';
import { performAudit } from './playwright-audit';
import { generateTestPlan } from './claude-agent';
import { syncToAirtable } from './airtable';
import { notifySlack } from './slack';

export async function runAnalysisJob(testRunId: string): Promise<void> {
  const testRun = await getTestRun(testRunId);
  const site = await getSiteById(testRun.site_id);

  await updateTestRunStatus(testRunId, 'running');

  try {
    const auditResult = await performAudit(site.url);
    const testPlan = await generateTestPlan(site);

    const results = {
      audit_result: auditResult,
      test_plan: { tests: testPlan.tests, generated_at: new Date().toISOString() },
    };

    await updateTestRunStatus(testRunId, 'completed', results);

    await syncToAirtable(testRunId, results).catch((e) =>
      console.error('Airtable sync failed:', e)
    );

    await notifySlack(
      '✅ Analysis Complete',
      `Analysis for ${site.name} completed successfully`,
      {
        'Audit Score': `${auditResult.score_pct}%`,
        'Tests Found': `${testPlan.tests.length}`,
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
