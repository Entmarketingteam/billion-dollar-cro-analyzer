import { Page, expect } from '@playwright/test';

/**
 * Test helper utilities for CRO Analyzer E2E tests
 */

/**
 * Wait for an element to appear with a timeout
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout = 10000
): Promise<void> {
  await page.locator(selector).first().waitFor({ timeout });
}

/**
 * Get the first test site ID from the dashboard
 */
export async function getFirstSiteId(page: Page): Promise<string> {
  // Navigate to dashboard if not already there
  if (!page.url().includes('/dashboard')) {
    await page.goto('/dashboard');
  }

  // Wait for site cards to load
  await waitForElement(page, '[data-testid="site-card"]', 10000);

  // Get the first site card's site ID from the href
  const firstLink = page.locator('[data-testid="site-card"] a').first();
  const href = await firstLink.getAttribute('href');

  if (!href) {
    throw new Error('Could not find site ID from dashboard');
  }

  // Extract site ID from path like /dashboard/site-uuid
  const siteId = href.split('/').pop();
  if (!siteId) {
    throw new Error('Could not parse site ID from URL');
  }

  return siteId;
}

/**
 * Trigger analysis for a site
 * Returns 202 with testRunId in response
 */
export async function triggerAnalysis(
  page: Page,
  siteId: string
): Promise<string> {
  const response = await page.request.post('/api/analyze-async', {
    data: { siteId },
  });

  expect(response.status()).toBe(202);
  const data = await response.json();
  return data.testRunId;
}

/**
 * Analyze a site from the dashboard UI
 * Clicks the "Analyze" button on a site card and waits for navigation
 */
export async function analyzeFromUI(page: Page, siteId: string): Promise<void> {
  // Navigate to dashboard
  await page.goto('/dashboard');

  // Find the site card with matching ID
  const siteCard = page.locator(
    `[data-testid="site-card"][data-site-id="${siteId}"]`
  );

  // Click the Analyze button
  const analyzeButton = siteCard.locator('button:has-text("Analyze")');
  await analyzeButton.click();

  // Wait for navigation to results page
  await page.waitForURL(`/dashboard/${siteId}`);
}

/**
 * Poll the test-run endpoint until the status changes from initial state
 * or timeout is reached
 */
export async function pollTestRunStatus(
  page: Page,
  siteId: string,
  timeout = 60000
): Promise<{
  id: string;
  status: string;
  results?: object;
  error_message?: string;
}> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const response = await page.request.get(`/api/test-run?siteId=${siteId}`);
    expect(response.ok()).toBeTruthy();

    const runs = await response.json();
    if (runs.length === 0) {
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }

    const latestRun = runs[0];

    // Return if status is not pending or running
    if (latestRun.status === 'completed' || latestRun.status === 'error') {
      return latestRun;
    }

    // Wait before polling again
    await new Promise((r) => setTimeout(r, 2000));
  }

  throw new Error(`Test run did not complete within ${timeout}ms`);
}

/**
 * Wait for results to appear on the results page
 * Polls the page for sections to render
 */
export async function waitForResultsToRender(
  page: Page,
  timeout = 60000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    // Check if audit section is visible
    const auditSection = page.locator('[data-testid="audit-display"]');
    const testPlanSection = page.locator('[data-testid="test-plan-display"]');

    const auditVisible = await auditSection.isVisible().catch(() => false);
    const testPlanVisible = await testPlanSection.isVisible().catch(() => false);

    if (auditVisible && testPlanVisible) {
      return;
    }

    // Wait before checking again
    await new Promise((r) => setTimeout(r, 1000));
  }

  throw new Error(`Results did not render within ${timeout}ms`);
}

/**
 * Verify that the verification badge is visible and has expected structure
 */
export async function verifyVerificationBadge(page: Page): Promise<void> {
  const verificationBadge = page.locator('[data-testid="verification-badge"]');
  await verificationBadge.waitFor({ timeout: 10000 });
  await expect(verificationBadge).toBeVisible();

  // Check for confidence score
  const confidenceScore = page.locator(
    '[data-testid="verification-badge"] [data-testid="confidence-score"]'
  );
  await expect(confidenceScore).toBeVisible();

  // Confidence should be a number
  const scoreText = await confidenceScore.textContent();
  expect(scoreText).toMatch(/\d+%/);
}

/**
 * Get all audit checklist items
 */
export async function getAuditItems(
  page: Page
): Promise<Array<{ name: string; passed: boolean }>> {
  const items = await page.locator('[data-testid="audit-item"]').all();

  const results = [];
  for (const item of items) {
    const name = await item.locator('[data-testid="audit-item-name"]').textContent();
    const statusEl = item.locator('[data-testid="audit-item-status"]');
    const passed = (await statusEl.getAttribute('data-passed')) === 'true';

    if (name) {
      results.push({ name: name.trim(), passed });
    }
  }

  return results;
}

/**
 * Get all tests from the test plan
 */
export async function getTestPlanItems(
  page: Page
): Promise<Array<{ name: string; effort: string; priority: string }>> {
  const items = await page.locator('[data-testid="test-plan-item"]').all();

  const results = [];
  for (const item of items) {
    const name = await item.locator('[data-testid="test-name"]').textContent();
    const effort = await item.locator('[data-testid="test-effort"]').textContent();
    const priority = await item.locator('[data-testid="test-priority"]').textContent();

    if (name) {
      results.push({
        name: name.trim(),
        effort: effort?.trim() || '',
        priority: priority?.trim() || '',
      });
    }
  }

  return results;
}

/**
 * Scroll through results page to verify content is visible
 */
export async function scrollThroughResults(page: Page): Promise<void> {
  // Scroll to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 500));

  // Scroll to bottom
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise((r) => setTimeout(r, 500));

  // Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 500));
}

/**
 * Mock an API route to return an error
 */
export async function mockApiError(
  page: Page,
  route: string,
  statusCode: number = 500,
  errorMessage: string = 'Internal Server Error'
): Promise<void> {
  await page.route(route, (route) => {
    route.abort('serviceunavailable');
  });
}

/**
 * Check if an error message is displayed on the page
 */
export async function isErrorMessageDisplayed(page: Page): Promise<boolean> {
  const errorEl = page.locator('[data-testid="error-message"]');
  return await errorEl.isVisible().catch(() => false);
}

/**
 * Get the error message text
 */
export async function getErrorMessage(page: Page): Promise<string> {
  const errorEl = page.locator('[data-testid="error-message"]');
  return (await errorEl.textContent()) || '';
}

/**
 * Wait for status badge to show a specific status
 */
export async function waitForStatusBadge(
  page: Page,
  expectedStatus: string,
  timeout = 60000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const badge = page.locator('[data-testid="status-badge"]');
    const status = await badge.getAttribute('data-status').catch(() => null);

    if (status === expectedStatus) {
      return;
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  throw new Error(`Status badge did not show "${expectedStatus}" within ${timeout}ms`);
}
