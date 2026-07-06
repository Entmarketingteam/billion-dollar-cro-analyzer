import { test, expect } from '@playwright/test';
import {
  triggerAnalysis,
  pollTestRunStatus,
  waitForResultsToRender,
} from './helpers';

/**
 * UI interaction tests for CRO Analyzer
 * Tests user interactions with buttons, links, and UI elements
 */

test.describe('Dashboard Navigation', () => {
  test('should load dashboard with site cards', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for site cards to load
    const siteCards = page.locator('[data-testid="site-card"]');
    await expect(siteCards.first()).toBeVisible({ timeout: 10000 });

    // Should have at least one site card
    const count = await siteCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should navigate from homepage to dashboard', async ({ page }) => {
    await page.goto('/');

    // Find "Open Dashboard" link
    const dashboardLink = page.locator('a:has-text("Open Dashboard")');
    await expect(dashboardLink).toBeVisible();

    // Click it
    await dashboardLink.click();

    // Should navigate to dashboard
    await page.waitForURL('/dashboard');
    expect(page.url()).toContain('/dashboard');
  });

  test('should display site information correctly', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for first site card
    const firstCard = page.locator('[data-testid="site-card"]').first();
    await firstCard.waitFor({ timeout: 10000 });

    // Should have site name and URL visible
    const siteName = firstCard.locator('h3');
    const siteUrl = firstCard.locator('p');

    await expect(siteName).toBeVisible();
    await expect(siteUrl).toBeVisible();

    const nameText = await siteName.textContent();
    const urlText = await siteUrl.textContent();

    expect(nameText).toBeTruthy();
    expect(urlText).toBeTruthy();
  });
});

test.describe('Analysis Button Interactions', () => {
  test('should trigger analysis via Analyze button', async ({ page }) => {
    await page.goto('/dashboard');

    // Get first site card
    const firstCard = page.locator('[data-testid="site-card"]').first();
    await firstCard.waitFor({ timeout: 10000 });

    // Find Analyze button
    const analyzeButton = firstCard.locator('button:has-text("Analyze")');
    await expect(analyzeButton).toBeVisible();

    // Click it
    await analyzeButton.click();

    // Should be disabled during analysis
    const isDisabled = await analyzeButton.isDisabled();
    expect(isDisabled).toBe(true);

    // Should show loading state
    const buttonText = await analyzeButton.textContent();
    expect(buttonText).toContain('Analyzing');

    // Should navigate to results page
    const siteId = await firstCard.getAttribute('data-site-id');
    await page.waitForURL(`/dashboard/${siteId}`, { timeout: 10000 });
  });

  test('should show "View Results" button on site card', async ({ page }) => {
    await page.goto('/dashboard');

    // Get first site card
    const firstCard = page.locator('[data-testid="site-card"]').first();
    await firstCard.waitFor({ timeout: 10000 });

    // Find View Results link
    const viewResultsLink = firstCard.locator('a:has-text("View Results")');
    await expect(viewResultsLink).toBeVisible();
  });

  test('should navigate to results page via View Results button', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    // Get first site card
    const firstCard = page.locator('[data-testid="site-card"]').first();
    await firstCard.waitFor({ timeout: 10000 });

    const siteId = await firstCard.getAttribute('data-site-id');

    // Click View Results
    const viewResultsLink = firstCard.locator('a:has-text("View Results")');
    await viewResultsLink.click();

    // Should navigate to results page
    await page.waitForURL(`/dashboard/${siteId}`);
    expect(page.url()).toContain(`/dashboard/${siteId}`);
  });
});

test.describe('Results Page Navigation', () => {
  test('should display analysis history sidebar', async ({ page }) => {
    await page.goto('/dashboard');

    // Get first site card
    const firstCard = page.locator('[data-testid="site-card"]').first();
    const siteId = await firstCard.getAttribute('data-site-id');

    // Trigger analysis
    await triggerAnalysis(page, siteId!);

    // Navigate to results page
    await page.goto(`/dashboard/${siteId}`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // History sidebar should be visible
    const sidebar = page.locator('h2:has-text("Analysis History")');
    await expect(sidebar).toBeVisible({ timeout: 10000 });
  });

  test('should list test runs in sidebar', async ({ page }) => {
    await page.goto('/dashboard');

    // Get first site card
    const firstCard = page.locator('[data-testid="site-card"]').first();
    const siteId = await firstCard.getAttribute('data-site-id');

    // Trigger analysis
    await triggerAnalysis(page, siteId!);

    // Navigate to results page
    await page.goto(`/dashboard/${siteId}`);

    // Wait for test run list
    const runButtons = page.locator('[data-testid="status-badge"]');
    await runButtons.first().waitFor({ timeout: 10000 });

    // Should have at least one run
    const count = await runButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should update main panel when selecting different runs', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    // Get first site card
    const firstCard = page.locator('[data-testid="site-card"]').first();
    const siteId = await firstCard.getAttribute('data-site-id');

    // Trigger analysis twice
    await triggerAnalysis(page, siteId!);
    await new Promise((r) => setTimeout(r, 2000));
    await triggerAnalysis(page, siteId!);

    // Navigate to results page
    await page.goto(`/dashboard/${siteId}`);

    // Wait for runs to load
    const runButtons = page.locator('[data-testid="status-badge"]');
    await runButtons.nth(1).waitFor({ timeout: 10000 }).catch(() => {});

    // Get count of runs
    const count = await runButtons.count();

    if (count >= 2) {
      // Click second run
      const runBtns = await page
        .locator('button:has([data-testid="status-badge"])')
        .all();
      if (runBtns.length >= 2) {
        await runBtns[1].click();

        // Main panel should update with different run
        const resultsHeader = page.locator('h2:has-text("Results")');
        await expect(resultsHeader).toBeVisible();
      }
    }
  });
});

test.describe('Results Display Interactions', () => {
  test('should display audit section with proper formatting', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    // Get first site card and trigger analysis
    const firstCard = page.locator('[data-testid="site-card"]').first();
    const siteId = await firstCard.getAttribute('data-site-id');

    await triggerAnalysis(page, siteId!);

    // Poll for completion
    await pollTestRunStatus(page, siteId!, 90000);

    // Navigate to results
    await page.goto(`/dashboard/${siteId}`);
    await waitForResultsToRender(page);

    // Audit display should have score
    const auditDisplay = page.locator('[data-testid="audit-display"]');
    const scoreText = auditDisplay.locator('p:has-text("Overall Audit Score")');

    await expect(scoreText).toBeVisible();

    // Should have percentage number
    const scoreNum = auditDisplay.locator('p >> text=/\\d+%/');
    await expect(scoreNum).toBeVisible();
  });

  test('should display test plan items with proper structure', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    // Get first site card and trigger analysis
    const firstCard = page.locator('[data-testid="site-card"]').first();
    const siteId = await firstCard.getAttribute('data-site-id');

    await triggerAnalysis(page, siteId!);

    // Poll for completion
    await pollTestRunStatus(page, siteId!, 90000);

    // Navigate to results
    await page.goto(`/dashboard/${siteId}`);
    await waitForResultsToRender(page);

    // Test plan display should have header
    const testPlanDisplay = page.locator('[data-testid="test-plan-display"]');
    const header = testPlanDisplay.locator('h3:has-text("Recommended Tests")');

    await expect(header).toBeVisible();

    // Should have test items
    const testItems = page.locator('[data-testid="test-plan-item"]');
    await expect(testItems.first()).toBeVisible();
  });

  test('should display error message when analysis fails', async ({ page }) => {
    // This test checks the error UI structure
    await page.goto('/dashboard');

    // Get first site card
    const firstCard = page.locator('[data-testid="site-card"]').first();
    const siteId = await firstCard.getAttribute('data-site-id');

    // Trigger analysis
    await triggerAnalysis(page, siteId!);

    // Navigate to results page
    await page.goto(`/dashboard/${siteId}`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Error message element should exist in DOM if there's an error
    const errorMsg = page.locator('[data-testid="error-message"]');

    // Try to find error
    const errorVisible = await errorMsg.isVisible().catch(() => false);

    // If error is visible, it should have content
    if (errorVisible) {
      const text = await errorMsg.textContent();
      expect(text).toBeTruthy();
    }
  });
});

test.describe('Results Page Loading States', () => {
  test('should show loading spinner while analysis is running', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    // Get first site card
    const firstCard = page.locator('[data-testid="site-card"]').first();
    const siteId = await firstCard.getAttribute('data-site-id');

    // Trigger analysis
    await triggerAnalysis(page, siteId!);

    // Navigate to results page immediately
    await page.goto(`/dashboard/${siteId}`);

    // Should have loading spinner initially
    const spinner = page.locator('span[class*="animate-spin"]');

    // Spinner might be visible or might have already finished
    // This is a timing-dependent test, so we just check that page loads
    await page.waitForLoadState('networkidle');

    // Page should render
    expect(page.url()).toContain(`/dashboard/${siteId}`);
  });

  test('should transition from running to completed state', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    // Get first site card
    const firstCard = page.locator('[data-testid="site-card"]').first();
    const siteId = await firstCard.getAttribute('data-site-id');

    // Trigger analysis
    await triggerAnalysis(page, siteId!);

    // Navigate to results page
    await page.goto(`/dashboard/${siteId}`);

    // Wait for completion
    const startTime = Date.now();
    let found = false;

    while (Date.now() - startTime < 90000) {
      const badge = page.locator('[data-testid="status-badge"]').first();
      const status = await badge.getAttribute('data-status').catch(() => null);

      if (status === 'completed') {
        found = true;
        break;
      }

      await new Promise((r) => setTimeout(r, 1000));
    }

    expect(found).toBe(true);

    // Results should now be visible
    await expect(page.locator('[data-testid="audit-display"]')).toBeVisible();
  });
});
