# E2E Test Suite for CRO Analyzer

This directory contains end-to-end tests for the Billion-Dollar CRO Analyzer using Playwright.

## Test Organization

### 1. `critical-workflows.spec.ts`
Tests the main user workflows:
- **Complete analysis workflow**: Triggering analysis, polling status, displaying results
- **Results detail page**: Loading results, polling updates, displaying all sections
- **Verification badge**: Showing confidence scores and verification details

Key tests:
- `should trigger analysis and display results` — Full happy path
- `should poll status endpoint repeatedly during analysis` — Polling behavior
- `should display verification badge with confidence score` — Badge rendering
- `should load and display all result sections` — Complete results page
- `should poll status correctly on results page` — Live polling
- `should allow scrolling through results` — Layout validation
- `should display audit items with pass/fail status` — Audit section
- `should display test plan items with effort and priority` — Test plan section

### 2. `error-handling.spec.ts`
Tests error scenarios and edge cases:
- **Invalid inputs**: Missing siteId, invalid site ID
- **Network failures**: Request failures, timeouts, concurrent requests
- **Error states**: Displaying error messages, recovery

Key tests:
- `should handle invalid site ID gracefully` — Invalid ID handling
- `should handle missing siteId parameter` — Missing parameter validation
- `should display error message when analysis fails` — Error display
- `should recover from network interruption` — Network resilience
- `should handle API timeout gracefully` — Timeout handling
- `should handle test-run endpoint without siteId` — Endpoint validation
- `should handle multiple analysis requests for same site` — Concurrency

### 3. `ui-interactions.spec.ts`
Tests user interactions and navigation:
- **Dashboard navigation**: Loading, navigating between pages
- **Button interactions**: Analyze button, View Results button
- **Results page interactions**: Sidebar selection, content updates
- **Loading states**: Spinners, transitions

Key tests:
- `should load dashboard with site cards` — Dashboard rendering
- `should navigate from homepage to dashboard` — Page navigation
- `should trigger analysis via Analyze button` — Button interaction
- `should display analysis history sidebar` — Sidebar rendering
- `should list test runs in sidebar` — Run listing
- `should update main panel when selecting different runs` — Selection handling
- `should transition from running to completed state` — State transitions

## Running the Tests

### Prerequisites
- Next.js dev server running on `http://localhost:3000`
- Database with test data (sites to analyze)

### Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in debug mode (slower, see every interaction)
npm run test:e2e:debug

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run specific test file
npx playwright test tests/e2e/critical-workflows.spec.ts

# Run specific test by name
npx playwright test -g "should trigger analysis"

# Run tests in headed mode (see browser)
npx playwright test --headed

# Generate test report
npx playwright show-report
```

## Test Helpers

The `helpers.ts` file provides utility functions for common operations:

```typescript
// Get first site ID from dashboard
const siteId = await getFirstSiteId(page);

// Trigger analysis via API
const testRunId = await triggerAnalysis(page, siteId);

// Poll test-run endpoint until completion
const result = await pollTestRunStatus(page, siteId);

// Wait for results sections to render
await waitForResultsToRender(page);

// Verify verification badge is visible
await verifyVerificationBadge(page);

// Get audit checklist items
const items = await getAuditItems(page);

// Get test plan items
const items = await getTestPlanItems(page);

// Scroll through results
await scrollThroughResults(page);

// Wait for status badge to show specific status
await waitForStatusBadge(page, 'completed');
```

## Test IDs Used

Components have been instrumented with `data-testid` attributes for reliable element selection:

- `[data-testid="site-card"]` — Site card on dashboard
- `[data-testid="status-badge"]` — Status badge (pending/running/completed/error)
- `[data-testid="verification-badge"]` — Verification badge on results
- `[data-testid="confidence-score"]` — Confidence score percentage
- `[data-testid="audit-display"]` — Audit results section
- `[data-testid="audit-item"]` — Individual audit checklist item
- `[data-testid="test-plan-display"]` — Test plan section
- `[data-testid="test-plan-item"]` — Individual test item
- `[data-testid="error-message"]` — Error message display

## Configuration

Tests are configured in `playwright.config.ts`:

- **Base URL**: `http://localhost:3000`
- **Timeout**: 30s per test
- **Retries**: 1 on CI, 0 locally
- **Workers**: 3 (parallel test execution)
- **Screenshots**: Captured on failure
- **Videos**: Recorded on failure
- **Trace**: Recorded on retry

The test server auto-starts with `npm run dev` before tests begin.

## Best Practices

1. **Use Test IDs**: Prefer `data-testid` selectors over CSS or XPath
2. **Wait for Elements**: Always wait for elements with explicit timeouts
3. **Poll, Don't Sleep**: Use `pollTestRunStatus()` instead of `page.waitForTimeout()`
4. **Clean Up Routes**: Unroute after mocking API responses
5. **Independent Tests**: Each test should be able to run in any order
6. **Fast & Focused**: Keep tests under 5 minutes by using API endpoints when possible

## Debugging

### View Test Report
```bash
npx playwright show-report
```

### Run in Debug Mode
```bash
npm run test:e2e:debug
```

### Run in UI Mode
```bash
npm run test:e2e:ui
```

### Inspect Element
Pause tests with `await page.pause()` to open browser inspector.

### View Trace
Failed tests record traces in `test-results/` directory. View with:
```bash
npx playwright show-trace test-results/trace.zip
```

## CI/CD Integration

In GitHub Actions, tests run automatically on:
- Push to main
- Pull requests
- Manual trigger

```yaml
- name: Run E2E tests
  run: npm run test:e2e
```

Failed tests will block merge. Screenshots and videos are stored as artifacts.

## Common Issues

### "Port 3000 already in use"
Kill the existing process:
```bash
lsof -ti:3000 | xargs kill -9
```

### "Tests timeout waiting for completion"
Increase `timeout` in `playwright.config.ts` or individual test:
```typescript
test('...', async ({ page }) => {
  // ...
}, { timeout: 120000 }); // 2 minutes
```

### "Flaky test - sometimes passes, sometimes fails"
Add explicit waits instead of relying on timeouts:
```typescript
await waitForElement(page, '[data-testid="element"]');
```

### "Results don't appear in time"
Analysis job might be slow. Check server logs and increase poll timeout:
```typescript
const result = await pollTestRunStatus(page, siteId, 120000); // 2 min
```

## Future Improvements

- [ ] Visual regression testing
- [ ] Performance testing (Lighthouse)
- [ ] Accessibility testing (a11y)
- [ ] Load testing (k6)
- [ ] Cross-browser testing (Firefox, Safari)
- [ ] Mobile responsiveness testing
- [ ] OAuth flow testing (with mock provider)
