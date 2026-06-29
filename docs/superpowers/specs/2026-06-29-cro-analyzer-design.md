# CRO Analyzer SaaS — Design Spec

**Project:** Billion Dollar Websites CRO Analyzer  
**Subdomain:** cro.entagency.co  
**Date:** 2026-06-29  
**Status:** Design Approved  

---

## Overview

Internal SaaS tool for ENT Agency to analyze Shopify DTC + education businesses using frameworks from "Billion Dollar Websites" book. Users connect Shopify + GA4 (OAuth), Claude agent analyzes their metrics against book frameworks, returns prioritized test plans with site audit checklists.

**Goal:** Avoid generic advice. Every recommendation backed by:
- User's actual metrics (conversion rate, AOV, traffic source)
- Book methodology (specific chapter + framework)
- Expected lift quantified (2-5% improvement range)
- Concrete implementation steps

---

## Architecture

**Tech Stack:**
- **Frontend:** Next.js (TypeScript) + React
- **Backend:** Next.js API routes
- **Database:** Supabase (new project `cro-analyzer` in org `fvkzlvakmzroyxacvxub`)
- **Authentication:** Hardcoded Emily/Ethan (design accommodates multi-user OAuth later)
- **Integrations:**
  - Shopify REST API (OAuth, fetch metrics)
  - Google Analytics 4 Reporting API (OAuth, fetch 30d metrics)
  - Playwright (headless browser, capture screenshots + HTML)
  - Claude API (agent analysis)
  - Airtable API (sync results to agency CRM)
- **Secrets:** Doppler (project: `ent-agency-automation`, config: `dev`)
- **Deployment:** Vercel (Next.js app) + Supabase (managed postgres)

---

## Data Model

**Supabase Schema:**

```sql
-- Sites
CREATE TABLE sites (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL, -- hardcoded: "emily" or "ethan"
  shopify_store_url TEXT NOT NULL,
  shopify_access_token TEXT NOT NULL (encrypted),
  ga4_property_id TEXT NOT NULL,
  ga4_refresh_token TEXT NOT NULL (encrypted),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Test Plans (output from Claude analysis)
CREATE TABLE test_plans (
  id UUID PRIMARY KEY,
  site_id UUID REFERENCES sites(id),
  analysis_json JSONB, -- [{hypothesis, expected_lift, effort_level, steps, book_chapter}]
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Results (site health check)
CREATE TABLE audit_results (
  id UUID PRIMARY KEY,
  site_id UUID REFERENCES sites(id),
  checklist_items JSONB, -- [{item, auto_check_status, manual_confirmed, book_ref}]
  created_at TIMESTAMP DEFAULT NOW()
);

-- Metrics Snapshots (GA4 + Shopify metrics)
CREATE TABLE metrics_snapshots (
  id UUID PRIMARY KEY,
  site_id UUID REFERENCES sites(id),
  conversion_rate DECIMAL,
  aov DECIMAL,
  traffic_source TEXT,
  device_breakdown JSONB,
  cart_abandonment_rate DECIMAL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## User Flow

1. **Login:** Hardcoded (Emily/Ethan)
2. **Add Store:** User enters Shopify store URL
3. **OAuth Shopify:** Approve → store encrypted access token
4. **OAuth GA4:** Approve → store encrypted refresh token
5. **Auto-pull metrics:** Fetch last 30d conversion rate, AOV, traffic breakdown, cart abandonment
6. **Analyze:** Claude agent:
   - Loads pre-extracted book frameworks (JSON)
   - Compares user metrics vs benchmarks
   - Ranks tests by impact/effort
   - Returns structured test plan
7. **Site Audit:** Playwright captures screenshot + HTML → Claude auto-checks against book checklist
8. **Dashboard:** User sees:
   - Current metrics vs targets
   - Ranked test queue (hypothesis, expected lift, effort, book ref)
   - Auto-flagged audit issues + manual checklist
   - Historical results (if any)
9. **Track Progress:** User marks checklist items done → auto-syncs to Airtable

---

## Claude Agent Design

**Input:**
- User metrics (conversion rate, AOV, traffic source, device breakdown, cart abandonment)
- Site HTML + Playwright screenshot
- Pre-extracted book frameworks (JSON schema with chapters, test patterns, KPI benchmarks)

**Processing:**
1. Identify gaps (user's conversion rate vs book benchmark for their vertical)
2. Match gaps to book tests (e.g., "checkout has 34% abandonment → Chapter 8: single-step vs multi-step")
3. Score tests: `(gap_size × implementation_effort)` → rank by impact
4. Generate test plan with:
   - Hypothesis (backed by book chapter)
   - Expected lift % (ranges: 1-3%, 3-5%, 5%+)
   - Effort level (1-4 hours, 5-8 hours, 1+ week)
   - Step-by-step implementation
   - Exact book chapter + section reference

**Output Format (JSON):**
```json
{
  "tests": [
    {
      "rank": 1,
      "hypothesis": "Single-step checkout reduces abandonment by 3-5%",
      "expected_lift": "3-5%",
      "effort_hours": 6,
      "impact_score": 8.5,
      "steps": ["Shopify checkout settings → enable progress bar", "Test with 50% traffic"],
      "book_chapter": "Chapter 8: F*ck Conversion Rate",
      "book_section": "Rule 5: Sell HARD at the End"
    }
  ],
  "audit_checklist": [
    {
      "item": "Headline uses power words (3+ from Chapter 7 list)",
      "auto_check": false,
      "manual_status": null,
      "book_ref": "Chapter 7: Landing Pages Rule 1"
    }
  ]
}
```

---

## Dashboard Views

**Store List:**
- Connected stores, health status, last metrics refresh time
- Quick action: "Analyze Now" or "View Results"

**Store Detail:**
- Current metrics (conversion rate, AOV, traffic sources)
- Book benchmarks for their vertical (e.g., "Education businesses average 2.1% conversion")
- Gap analysis (visual: "You're 0.9% below benchmark")

**Test Queue:**
- Ranked tests (by impact score)
- Each test shows: hypothesis, expected lift, effort, book reference
- Quick actions: "Run Test", "Dismiss", "Learn More (book excerpt)"

**Site Audit:**
- Auto-checks from Playwright + HTML analysis
- Visual checklist: items pass/fail/unknown
- Manual confirmation: user checks off as they implement
- Airtable sync badge (shows if synced to CRM)

**Results (Historical):**
- Past tests + outcomes (if tracked)
- Before/after metrics by cohort (traffic source, device)
- Confidence score based on sample size

---

## Integration Points

**Shopify OAuth:**
- Scopes: `read_products`, `read_orders`, `read_fulfillments`
- Fetch: daily order count, conversion rate (orders / sessions), AOV
- Token refresh: refresh automatically if expired

**GA4 API:**
- Scopes: `analytics.readonly`
- Fetch: conversion rate, avg session duration, device breakdown, traffic source
- Query: last 30 days, daily granularity

**Playwright:**
- Headless browser, visit Shopify storefront (PDP, checkout, homepage)
- Capture full-page screenshot (mobile + desktop)
- Extract HTML (for Claude text analysis)
- Timeout: 30s per page

**Airtable:**
- Table: `CRO_Analyzer_Tests` (link to existing agency CRM)
- Fields: site name, test plan, status, results, book reference
- Sync: triggered when user confirms checklist items

---

## Error Handling

| Scenario | Response |
|----------|----------|
| OAuth fail | Clear error message + retry link |
| Shopify API limit | Queue refresh for later, show cached data |
| GA4 API limit | Show cached metrics, log error |
| Playwright timeout | Fallback to HTML-only analysis, flag as partial |
| Claude API error | Return cached previous analysis, log to Slack |
| No historical data | Show "Start with ranked tests from book baseline" |

---

## Testing Strategy

- **Unit:** Claude prompt → JSON parsing (mock frameworks)
- **Integration:** OAuth flow → Supabase storage → retrieval
- **E2E:** Add store → fetch metrics → generate test plan → confirm checklist

---

## Rollout

**Phase 1 (Week 1):** Extract book frameworks to JSON, scaffold Next.js + OAuth  
**Phase 2 (Week 2):** Claude agent integration, dashboard basics  
**Phase 3 (Week 2-3):** Playwright site audit, Airtable sync  
**Phase 4 (Week 3+):** Historical results tracking, refinement  

**MVP Launch:** Emily + Ethan use internally, iterate based on feedback before external release.

---

## Constraints & Assumptions

- Internal tool only (no public marketing yet)
- Emily/Ethan hardcoded auth (OAuth multi-user added later, no rework needed)
- One Shopify store per site entry (can expand to multi-store later)
- GA4 Property ID required (can work around if not available, but less powerful analysis)
- Book frameworks extracted once, updated manually when book updated or new insights found

---

## Success Criteria

- ✅ Users connect Shopify + GA4 without errors
- ✅ Test plans generated in <5 seconds (Claude response time)
- ✅ Site audit checklists auto-populated, user can manually confirm
- ✅ Results sync to Airtable without loss
- ✅ No generic advice (every test backed by book + user metrics)
- ✅ Emily/Ethan ship first client recommendations within 2 weeks
