# E2E Testing Guide — Billion-Dollar CRO Analyzer

## Quick Start

```bash
# Terminal 1: Start the dev server
npm run dev

# Terminal 2: Run all E2E tests
npm run test:e2e
```

## What's Tested

### Critical Workflows
- ✅ User clicks "Analyze" on a site
- ✅ System responds with 202 (accepted)
- ✅ User navigates to results page
- ✅ System polls test-run endpoint every 2 seconds
- ✅ Results appear when analysis completes
- ✅ Verification badge shows with confidence score
- ✅ Audit section displays all checklist items
- ✅ Test plan section displays all recommendations

### Error Handling
- ✅ Invalid site ID handled gracefully
- ✅ Missing siteId parameter returns 400
- ✅ Network failures don't crash the app
- ✅ API timeouts handled with retry
- ✅ Error messages displayed to user
- ✅ Concurrent requests don't conflict

### UI Interactions
- ✅ Dashboard loads with site cards
- ✅ Navigation between pages works
- ✅ Buttons respond to clicks
- ✅ Loading states display correctly
- ✅ Results transitions from running to completed
- ✅ Sidebar allows selecting previous runs
- ✅ Scrolling through results works

## Test Files

```
tests/e2e/
├── playwright.config.ts          # Playwright configuration
├── helpers.ts                    # Shared test utilities
├── critical-workflows.spec.ts    # Main workflows (13 tests)
├── error-handling.spec.ts        # Error scenarios (9 tests)
├── ui-interactions.spec.ts       # UI interactions (12 tests)
└── README.md                     # Detailed documentation
```

**Total: 34 E2E tests covering critical workflows**

## Running Tests

### Run All Tests
```bash
npm run test:e2e
```

### Run Specific Test File
```bash
npx playwright test tests/e2e/critical-workflows.spec.ts
```

### Run Tests Matching Pattern
```bash
npx playwright test -g "should trigger analysis"
```

### Debug Mode (Step Through Each Interaction)
```bash
npm run test:e2e:debug
```

### UI Mode (Interactive Test Runner)
```bash
npm run test:e2e:ui
```

### Headed Mode (See Browser)
```bash
npx playwright test --headed
```

### View Test Report
```bash
npx playwright show-report
```

## Test Structure

Each test follows this pattern:

```typescript
test('should do something', async ({ page }) => {
  // 1. Navigate to a page
  await page.goto('/dashboard');

  // 2. Interact with elements using test IDs
  const siteId = await page.locator('[data-testid="site-card"]')
    .first()
    .getAttribute('data-site-id');

  // 3. Perform actions (click, type, etc.)
  await triggerAnalysis(page, siteId);

  // 4. Wait for results
  const result = await pollTestRunStatus(page, siteId);

  // 5. Assert expectations
  expect(result.status).toBe('completed');
});
```

## Test Utilities

Available helpers in `tests/e2e/helpers.ts`:

```typescript
// Get site ID from dashboard
const siteId = await getFirstSiteId(page);

// Trigger analysis (POST /api/analyze-async)
const testRunId = await triggerAnalysis(page, siteId);

// Poll until complete (repeatedly GET /api/test-run)
const result = await pollTestRunStatus(page, siteId, timeout?);

// Wait for results to render
await waitForResultsToRender(page, timeout?);

// Verify verification badge
await verifyVerificationBadge(page);

// Get audit items
const items = await getAuditItems(page);
// => [{ name: "...", passed: boolean }, ...]

// Get test plan items
const tests = await getTestPlanItems(page);
// => [{ name: "...", effort: "...", priority: "..." }, ...]

// Scroll page
await scrollThroughResults(page);

// Check error state
const hasError = await isErrorMessageDisplayed(page);
const msg = await getErrorMessage(page);

// Wait for status
await waitForStatusBadge(page, 'completed');
```

## Test IDs Added to Components

All components have been instrumented with test IDs for reliable selection:

| Component | Test ID | Location |
|-----------|---------|----------|
| Site Card | `[data-testid="site-card"]` | SiteCard.tsx |
| Status Badge | `[data-testid="status-badge"]` | StatusBadge.tsx |
| Verification Badge | `[data-testid="verification-badge"]` | [siteId]/page.tsx |
| Audit Display | `[data-testid="audit-display"]` | AuditDisplay.tsx |
| Audit Item | `[data-testid="audit-item"]` | AuditDisplay.tsx |
| Test Plan Display | `[data-testid="test-plan-display"]` | TestPlanDisplay.tsx |
| Test Plan Item | `[data-testid="test-plan-item"]` | TestPlanDisplay.tsx |
| Error Message | `[data-testid="error-message"]` | [siteId]/page.tsx |

## Configuration

File: `playwright.config.ts`

```typescript
{
  baseURL: 'http://localhost:3000',
  timeout: 30000,                    // 30 seconds per test
  retries: 1,                        // Retry once on CI
  workers: 3,                        // Parallel workers
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  trace: 'on-first-retry',
}
```

## Common Commands Cheat Sheet

```bash
# Development
npm run dev                       # Start dev server
npm run test:e2e                 # Run all tests
npm run test:e2e:debug           # Debug mode
npm run test:e2e:ui              # Interactive UI

# Specific tests
npx playwright test critical     # Run critical-workflows
npx playwright test error        # Run error-handling
npx playwright test ui           # Run ui-interactions

# Single test
npx playwright test -g "should trigger analysis"

# Options
npx playwright test --headed     # Show browser
npx playwright test --debug      # Step through
npx playwright test --ui         # Interactive
npx playwright test --update     # Update snapshots

# Reporting
npx playwright show-report       # View HTML report
npx playwright show-trace <zip>  # View trace
```

## Expected Test Results

When running `npm run test:e2e`, you should see:

```
critical-workflows.spec.ts (6 tests)
  ✓ should trigger analysis and display results (45s)
  ✓ should poll status endpoint repeatedly (60s)
  ✓ should display verification badge (50s)
  ✓ should load and display all result sections (50s)
  ✓ should poll status correctly on results page (65s)
  ✓ should allow scrolling through results (40s)
  ✓ should display audit items (45s)
  ✓ should display test plan items (45s)

error-handling.spec.ts (9 tests)
  ✓ should handle invalid site ID (30s)
  ✓ should handle missing siteId (5s)
  ✓ should display error message (60s)
  ✓ should recover from network (20s)
  ✓ should handle API timeout (30s)
  ✓ should display error state (60s)
  ✓ should handle endpoint without siteId (5s)
  ✓ should handle malformed JSON (10s)
  ✓ should handle empty response (10s)
  ✓ should handle concurrent requests (60s)

ui-interactions.spec.ts (12 tests)
  ✓ should load dashboard (10s)
  ✓ should navigate homepage to dashboard (5s)
  ✓ should display site info (5s)
  ✓ should trigger via button (60s)
  ✓ should show view results button (5s)
  ✓ should navigate via button (5s)
  ✓ should display history (10s)
  ✓ should list test runs (10s)
  ✓ should update on selection (20s)
  ✓ should display audit (50s)
  ✓ should display test plan (50s)
  ✓ should display error (60s)
  ✓ should show loading spinner (60s)
  ✓ should transition to completed (90s)

34 passed (45m 30s)
```

## Troubleshooting

### Tests Timeout
- Analysis job is taking too long
- Database is slow
- Network is slow
- Increase timeout: `test('...', async () => {...}, { timeout: 120000 })`

### Elements Not Found
- Element test ID might have changed
- Element loads after longer delay
- Add explicit wait: `await page.locator('[data-testid="..."]').waitFor()`

### Port 3000 In Use
```bash
lsof -ti:3000 | xargs kill -9
```

### Database Not Seeded
Tests expect at least one site in the database. Add test data via:
```bash
# Use Supabase Studio or direct SQL
INSERT INTO sites (name, url, created_by) 
VALUES ('Test Store', 'https://test.example.com', 'ethan');
```

## Best Practices

1. **Use test IDs, not selectors**: More stable across CSS changes
2. **Wait explicitly**: Use `.waitFor()` instead of hard sleeps
3. **Use helpers**: Reduces boilerplate and improves readability
4. **One assertion per test**: Keep tests focused and fast
5. **Test user workflows**: Not implementation details
6. **Run locally before pushing**: Catch issues early
7. **Check failure screenshots**: Provided in test-results/

## CI/CD Integration

Tests automatically run on:
- Push to any branch
- Pull requests
- Manual trigger

Failed tests block merge. Fix before pushing.

## Next Steps

- [ ] Add visual regression tests
- [ ] Add performance benchmarks
- [ ] Test OAuth flows with mock provider
- [ ] Add accessibility testing (a11y)
- [ ] Add mobile responsiveness testing
- [ ] Add load testing (k6)
- [ ] Integrate with Slack notifications
