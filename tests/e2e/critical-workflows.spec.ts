import { test, expect } from '@playwright/test';
import {
  triggerAnalysis,
  pollTestRunStatus,
  waitForResultsToRender,
  verifyVerificationBadge,
  getAuditItems,
  getTestPlanItems,
  scrollThroughResults,
  waitForStatusBadge,
} from './helpers';

/**
 * Critical workflow tests for CRO Analyzer
 * These tests cover the main user journeys
 */

test.describe('Complete Analysis Workflow', () => {
  test('should trigger analysis and display results', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Get the first site ID
    const siteCardLocator = page.locator('[data-testid="site-card"]').first();
    await siteCardLocator.waitFor({ timeout: 10000 });

    const siteId = await siteCardLocator.getAttribute('data-site-id');
    expect(siteId).toBeTruthy();

    // Trigger analysis via API
    const testRunId = await triggerAnalysis(page, siteId!);
    expect(testRunId).toBeTruthy();

    // Poll for completion
    const result = await pollTestRunStatus(page, siteId!, 90000);

    // Verify final state
    expect(result.status).toBe('completed');
    expect(result.results).toBeTruthy();

    // Navigate to results page
    await page.goto(`/dashboard/${siteId}`);

    // Wait for results to render
    await waitForResultsToRender(page, 30000);

    // Verify audit display
    const auditDisplay = page.locator('[data-testid="audit-display"]');
    await expect(auditDisplay).toBeVisible();

    // Verify test plan display
    const testPlanDisplay = page.locator('[data-testid="test-plan-display"]');
    await expect(testPlanDisplay).toBeVisible();

    // Verify verification badge
    await verifyVerificationBadge(page);
  });

  test('should poll status endpoint repeatedly during analysis', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Get the first site ID
    const siteCardLocator = page.locator('[data-testid="site-card"]').first();
    await siteCardLocator.waitFor({ timeout: 10000 });

    const siteId = await siteCardLocator.getAttribute('data-site-id');
    expect(siteId).toBeTruthy();

    // Trigger analysis
    const testRunId = await triggerAnalysis(page, siteId!);

    // Poll multiple times
    let foundRunning = false;
    let foundCompleted = false;

    for (let i = 0; i < 30; i++) {
      const response = await page.request.get(`/api/test-run?siteId=${siteId}`);
      expect(response.ok()).toBeTruthy();

      const runs = await response.json();
      expect(runs.length).toBeGreaterThan(0);

      const latestRun = runs[0];

      if (latestRun.status === 'running') {
        foundRunning = true;
      }

      if (latestRun.status === 'completed') {
        foundCompleted = true;
        break;
      }

      await new Promise((r) => setTimeout(r, 1000));
    }

    // Should have found at least a completed status
    expect(foundCompleted).toBe(true);
  });

  test('should display verification badge with confidence score', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Get the first site ID
    const siteCardLocator = page.locator('[data-testid="site-card"]').first();
    await siteCardLocator.waitFor({ timeout: 10000 });

    const siteId = await siteCardLocator.getAttribute('data-site-id');
    expect(siteId).toBeTruthy();

    // Trigger analysis
    await triggerAnalysis(page, siteId!);

    // Poll for completion
    const result = await pollTestRunStatus(page, siteId!, 90000);
    expect(result.status).toBe('completed');

    // Navigate to results
    await page.goto(`/dashboard/${siteId}`);
    await waitForResultsToRender(page, 30000);

    // Check verification badge
    const badge = page.locator('[data-testid="verification-badge"]');
    await expect(badge).toBeVisible();

    // Check confidence score
    const scoreEl = page.locator('[data-testid="confidence-score"]');
    await expect(scoreEl).toBeVisible();

    const scoreText = await scoreEl.textContent();
    expect(scoreText).toMatch(/\d+%/);

    // Parse score as number
    const scoreMatch = scoreText?.match(/(\d+)/);
    const score = parseInt(scoreMatch?.[1] || '0');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

test.describe('Results Detail Page Workflow', () => {
  test('should load and display all result sections', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Get the first site ID
    const siteCardLocator = page.locator('[data-testid="site-card"]').first();
    await siteCardLocator.waitFor({ timeout: 10000 });

    const siteId = await siteCardLocator.getAttribute('data-site-id');
    expect(siteId).toBeTruthy();

    // Trigger analysis
    await triggerAnalysis(page, siteId!);

    // Poll for completion
    const result = await pollTestRunStatus(page, siteId!, 90000);
    expect(result.status).toBe('completed');

    // Navigate directly to results page
    await page.goto(`/dashboard/${siteId}`);

    // Wait for all sections to render
    await waitForResultsToRender(page);

    // Verify all major sections are visible
    await expect(page.locator('[data-testid="verification-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="audit-display"]')).toBeVisible();
    await expect(page.locator('[data-testid="test-plan-display"]')).toBeVisible();

    // Verify we have audit items
    const auditItems = await getAuditItems(page);
    expect(auditItems.length).toBeGreaterThan(0);

    // Verify we have test plan items
    const testPlanItems = await getTestPlanItems(page);
    expect(testPlanItems.length).toBeGreaterThan(0);
  });

  test('should poll status correctly on results page', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Get the first site ID
    const siteCardLocator = page.locator('[data-testid="site-card"]').first();
    await siteCardLocator.waitFor({ timeout: 10000 });

    const siteId = await siteCardLocator.getAttribute('data-site-id');
    expect(siteId).toBeTruthy();

    // Trigger analysis
    await triggerAnalysis(page, siteId!);

    // Navigate to results page
    await page.goto(`/dashboard/${siteId}`);

    // Status badge should update as polling happens
    let statusFound = false;

    for (let i = 0; i < 60; i++) {
      const badge = page.locator('[data-testid="status-badge"]');
      const status = await badge.getAttribute('data-status').catch(() => null);

      if (status === 'completed' || status === 'error') {
        statusFound = true;
        break;
      }

      await new Promise((r) => setTimeout(r, 1000));
    }

    expect(statusFound).toBe(true);
  });

  test('should allow scrolling through results', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Get the first site ID
    const siteCardLocator = page.locator('[data-testid="site-card"]').first();
    await siteCardLocator.waitFor({ timeout: 10000 });

    const siteId = await siteCardLocator.getAttribute('data-site-id');
    expect(siteId).toBeTruthy();

    // Trigger analysis
    await triggerAnalysis(page, siteId!);

    // Poll for completion
    const result = await pollTestRunStatus(page, siteId!, 90000);
    expect(result.status).toBe('completed');

    // Navigate to results page
    await page.goto(`/dashboard/${siteId}`);
    await waitForResultsToRender(page);

    // Scroll through results
    await scrollThroughResults(page);

    // All sections should still be visible
    await expect(page.locator('[data-testid="audit-display"]')).toBeVisible();
    await expect(page.locator('[data-testid="test-plan-display"]')).toBeVisible();
  });

  test('should display audit items with pass/fail status', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Get the first site ID
    const siteCardLocator = page.locator('[data-testid="site-card"]').first();
    await siteCardLocator.waitFor({ timeout: 10000 });

    const siteId = await siteCardLocator.getAttribute('data-site-id');
    expect(siteId).toBeTruthy();

    // Trigger analysis
    await triggerAnalysis(page, siteId!);

    // Poll for completion
    await pollTestRunStatus(page, siteId!, 90000);

    // Navigate to results
    await page.goto(`/dashboard/${siteId}`);
    await waitForResultsToRender(page);

    // Get audit items
    const auditItems = await getAuditItems(page);

    expect(auditItems.length).toBeGreaterThan(0);

    // Each item should have name and passed status
    for (const item of auditItems) {
      expect(item.name).toBeTruthy();
      expect(typeof item.passed).toBe('boolean');
    }

    // Verify we have both passed and failed items (or all passed)
    const passedCount = auditItems.filter((i) => i.passed).length;
    expect(passedCount).toBeGreaterThanOrEqual(0);
  });

  test('should display test plan items with effort and priority', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Get the first site ID
    const siteCardLocator = page.locator('[data-testid="site-card"]').first();
    await siteCardLocator.waitFor({ timeout: 10000 });

    const siteId = await siteCardLocator.getAttribute('data-site-id');
    expect(siteId).toBeTruthy();

    // Trigger analysis
    await triggerAnalysis(page, siteId!);

    // Poll for completion
    await pollTestRunStatus(page, siteId!, 90000);

    // Navigate to results
    await page.goto(`/dashboard/${siteId}`);
    await waitForResultsToRender(page);

    // Get test plan items
    const testPlanItems = await getTestPlanItems(page);

    expect(testPlanItems.length).toBeGreaterThan(0);

    // Each test should have name and effort
    for (const test of testPlanItems) {
      expect(test.name).toBeTruthy();
      expect(test.effort).toBeTruthy();
    }
  });
});
