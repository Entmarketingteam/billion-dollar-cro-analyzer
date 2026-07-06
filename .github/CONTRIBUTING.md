# Contributing to CRO Analyzer

Thank you for contributing! This guide explains our development workflow, testing requirements, and CI/CD process.

## Development Workflow

### 1. Local Setup

```bash
# Clone the repository
git clone https://github.com/your-org/billion-dollar-cro-analyzer.git
cd billion-dollar-cro-analyzer

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Edit .env.local with your credentials
# Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, etc.
```

### 2. Running Tests Locally

Before submitting a PR, run these commands to verify your changes:

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Unit tests (with coverage)
npm run test:coverage

# Watch mode for active development
npm run test:watch

# Production build
npm run build
```

### 3. Creating a Branch

Create a feature branch for your work:

```bash
git checkout -b feature/your-feature-name
# or for bug fixes:
git checkout -b fix/bug-name
```

### 4. Making Changes

- Write clean, minimal code (see [Code Discipline](#code-discipline) below)
- Add tests for new features or bug fixes
- Update type definitions if needed
- Ensure all tests pass locally before pushing

### 5. Committing

```bash
# Stage your changes
git add .

# Create a meaningful commit
git commit -m "feat: add new feature" # or "fix: resolve issue", "docs: update README", etc.

# Push to your branch
git push origin feature/your-feature-name
```

## PR Checklist

Before opening a pull request, ensure:

- [ ] All tests pass locally: `npm test:coverage`
- [ ] Type checking passes: `npm run type-check`
- [ ] Linting passes: `npm run lint`
- [ ] Production build succeeds: `npm run build`
- [ ] Branch is up-to-date with `main`
- [ ] PR title clearly describes the change
- [ ] PR description explains why the change is needed
- [ ] No console errors or warnings introduced

## CI/CD Pipeline

### Automated Testing (On Push & PR)

When you push to any branch or open a pull request:

1. **Test Job** runs:
   - Type checking (`npm run type-check`)
   - Linting (`npm run lint`)
   - Unit tests with coverage (`npm run test:coverage`)
   - Coverage uploaded to Codecov (non-blocking if token missing)

2. **Build Job** runs:
   - Installs dependencies
   - Builds production bundle (`npm run build`)
   - Verifies `.next` output directory exists
   - Uploads build artifacts (24-hour retention)

### Branch Protection

The `main` branch is protected and requires:

- ✅ All checks pass (test + build)
- ✅ At least one review approval
- ✅ No merge conflicts

You **cannot merge to main** without passing CI.

### Deployment (Main Branch Only)

When you merge to `main`:

1. GitHub Actions runs all tests and builds
2. If tests pass, Vercel automatically deploys to production
3. Deployment URL is available in the Vercel dashboard
4. Rollback available in Vercel deployments tab

**Note:** Vercel has native GitHub integration configured. There is no separate deploy workflow — Vercel auto-deploys on push to main.

## Code Discipline

Keep changes minimal and focused:

- **No speculative features** — only code what was asked for
- **No refactoring unrelated code** — touch only what's needed
- **Match existing style** — follow the patterns in the codebase
- **Surgical edits** — if your change introduces dead code, remove it; don't remove pre-existing dead code unless asked
- **Test what you change** — if the change is testable, write a test
- **Be explicit about assumptions** — if you're uncertain about the intent, ask

Example: If asked to "add validation", write tests that prove invalid inputs are caught, then make those tests pass. That's it.

## Common Issues & Fixes

### Tests Failing Locally but Passing on CI (or vice versa)

- Check Node version: `node --version` (should be 20.x)
- Clear cache: `rm -rf node_modules package-lock.json && npm install`
- Check environment variables: all required vars must be in `.env.local`

### Build Succeeds Locally but Fails on CI

- Run `npm run build` locally to reproduce
- Check for missing environment variables
- Ensure `next.config.ts` and `tsconfig.json` have no syntax errors
- Verify all imported modules are in `dependencies` or `devDependencies`

### Linting Errors

Fix automatically:
```bash
npm run lint -- --fix
```

Then commit the changes.

### Coverage Reports Not Uploading

The Codecov step is non-blocking (fails don't stop the workflow). To debug:

1. Check that `CODECOV_TOKEN` is set in repo settings
2. Ensure `coverage/coverage-final.json` exists after `npm test:coverage`
3. View logs in the GitHub Actions workflow run

### How to Skip CI (Not Recommended)

If you absolutely must skip CI:

```bash
git commit -m "your message" --no-verify
git push --no-verify
```

**This bypasses all checks.** Only use for emergencies (e.g., undoing a bad merge). Never for normal PRs.

## Debugging CI Failures

1. **Check the workflow run:**
   - Go to **Actions** tab on GitHub
   - Click the failing workflow run
   - View logs for each step

2. **Reproduce locally:**
   ```bash
   # Simulate CI environment
   rm -rf node_modules package-lock.json
   npm ci
   npm run type-check
   npm run lint
   npm run test:coverage
   npm run build
   ```

3. **Check Node version:**
   ```bash
   node --version  # Should be 20.x
   npm --version
   ```

4. **Check dependencies:**
   ```bash
   npm list  # List all installed packages
   npm audit  # Check for vulnerabilities
   ```

## Adding New Tests

Unit tests go in the `tests/` directory with `.test.ts` or `.spec.ts` extensions:

```
tests/
  lib/
    my-feature.test.ts    # Test file for src/lib/my-feature.ts
```

Example test:

```typescript
import { myFunction } from '@/lib/my-feature';

describe('myFunction', () => {
  it('should return expected value', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });

  it('should handle edge case', () => {
    const result = myFunction('');
    expect(result).toThrow();
  });
});
```

Run tests:
```bash
npm test                    # Run all tests once
npm test:watch             # Watch mode (re-run on change)
npm run test:coverage      # Run with coverage report
```

## Performance Notes

- **Type checking:** ~5 seconds
- **Linting:** ~3 seconds
- **Unit tests:** ~8 seconds (varies with coverage)
- **Production build:** ~30-60 seconds
- **Total CI time:** ~3-5 minutes per workflow

If CI becomes slow:
1. Check for new heavy dependencies
2. Look for slow tests (use `--verbose` flag)
3. Consider splitting into parallel jobs (contact maintainers)

## Questions or Issues?

- Check the project's `CLAUDE.md` for technical context
- Review `DEPLOYMENT.md` for deployment details
- Open an issue for questions or suggestions
