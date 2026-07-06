# CRO Analyzer SaaS — Project Context

## Overview
Building a CRO (Conversion Rate Optimization) analyzer SaaS that integrates Shopify + GA4 metrics analysis using Claude AI and automated Playwright audits.

## Technology Stack
- **Frontend:** Next.js 15 + React 19 + Tailwind CSS
- **Backend:** Next.js API Routes (TypeScript)
- **Database:** Supabase (PostgreSQL)
- **AI:** Claude Opus 4.1 API (test plan generation)
- **Auditing:** Playwright (automated site audit)
- **CMS:** Airtable (results sync)
- **Auth:** Custom session-based (hardcoded users: emily, ethan)

## Project Structure
```
src/
  app/
    api/
      auth/login/             # Session login
      shopify/                # Shopify OAuth flow
      ga4/                    # GA4 OAuth flow
      shopify/metrics/        # Shopify metrics fetch
      ga4/metrics/            # GA4 metrics fetch
      analyze/                # Phase 3: Analysis orchestrator
    page.tsx                  # Home / dashboard
    login/page.tsx            # Login page
  lib/
    db.ts                     # Supabase typed client
    shopify.ts                # Shopify API helpers
    ga4.ts                    # GA4 API helpers
    claude-agent.ts           # Phase 3: Claude test plan generation
    playwright-audit.ts       # Phase 3: Automated site audit
    airtable.ts               # Phase 3: Airtable sync
    auth.ts                   # Session utilities
  types/index.ts              # Shared TypeScript types
```

## Database Schema (Supabase)
Four main tables:
- **sites:** Store details (URL, domain, OAuth tokens)
- **test_plans:** Claude-generated CRO test plans (JSON analysis)
- **audit_results:** Playwright checklist results (JSON items)
- **metrics_snapshots:** Historical Shopify/GA4 metrics

Migrations stored in `supabase/migrations/`.

## Phases Completed

### Phase 1: Authentication (✅ DONE)
- Hardcoded user login (emily/ethan)
- Session management via cookies

### Phase 2: OAuth Flows (✅ DONE)
- Shopify OAuth (authorize → token exchange → store auth token)
- GA4 OAuth (authorize → token refresh → store refresh token)
- Both metrics endpoints working + data stored in metrics_snapshots

### Phase 3: Analysis & Auditing (🚀 IN PROGRESS)
- **Claude Agent:** Generates prioritized CRO test plans using Billion Dollar Websites framework
- **Playwright Audit:** Automated checklist covering homepage, product pages, checkout, mobile, trust signals
- **Airtable Sync:** Pushes all results to Airtable base for stakeholder review
- **API Endpoint:** `/api/analyze` orchestrates all three services

## Environment Variables Required

### Supabase
- `NEXT_PUBLIC_SUPABASE_URL` — project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key (public)
- `SUPABASE_SERVICE_ROLE_KEY` — service role (server-only, bypasses RLS)

### Shopify
- `SHOPIFY_OAUTH_CLIENT_ID` — from Shopify app settings
- `SHOPIFY_OAUTH_CLIENT_SECRET` — from Shopify app settings
- `SHOPIFY_REDIRECT_URI` — callback URL (e.g., http://localhost:3000/api/shopify/oauth-callback)

### GA4
- `GA4_OAUTH_CLIENT_ID` — from Google Cloud Console
- `GA4_OAUTH_CLIENT_SECRET` — from Google Cloud Console
- `GA4_REDIRECT_URI` — callback URL (e.g., http://localhost:3000/api/ga4/oauth-callback)

### Claude API
- `ANTHROPIC_API_KEY` — sk-ant-... key for Claude API calls

### Airtable (Phase 3)
- `AIRTABLE_API_TOKEN` — personal access token (pat...)
- `AIRTABLE_BASE_ID` — base ID (app...)

See `.env.example` for reference.

## Running Locally

```bash
# Install dependencies
npm install

# Set up environment (copy .env.example → .env.local and fill in values)
cp .env.example .env.local
# Edit .env.local with your credentials

# Run dev server
npm run dev

# Open http://localhost:3000
```

## Current Status

✅ **Phase 2 Complete:**
- Shopify OAuth flow working
- GA4 OAuth flow working
- Metrics fetching working
- All 5 API routes registered and tested

🚀 **Phase 3 Complete:**
- Claude agent for test plan generation
- Playwright audit checklist (20+ checks across 6 categories)
- Airtable sync service
- `/api/analyze` endpoint orchestrates all services

⏭️ **Next Steps (Phase 4):**
1. Build UI to trigger analysis and display results
2. Add live Playwright browser automation (currently mocked)
3. Create Airtable base schema + test sync
4. Add results visualization dashboard
5. Implement test tracking (status = pending/running/completed)
6. Add notification system (Slack/email on analysis completion)

## Known Limitations

- Playwright currently returns mock audit results (simulated 70% pass rate)
  - Real implementation needs browser automation
  - Recommendation: Use `@playwright/test` with headless=true
- Airtable sync is best-effort (non-blocking if fail)
- GA4 property_id never written to DB (needs site-settings UI form in Phase 4)
- Industry benchmarks are hardcoded; should pull from external data source in production

## Testing the API

```bash
# Trigger analysis for an existing site
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"siteId": "site-uuid-here"}'
```

Expected response:
```json
{
  "siteId": "...",
  "siteName": "...",
  "metrics": { "conversion_rate": 2.5, "aov": 75, ... },
  "testPlan": { "tests": [...], "generated_at": "...", ... },
  "auditResult": { "checklist_items": [...], "score_pct": 72, ... },
  "completedAt": "..."
}
```

## Code Discipline
- Minimum code; no speculative features
- Surgical changes only
- Types enforced by TypeScript
- No error handling for impossible scenarios
- Testing via manual API calls for now (will formalize in Phase 4)
