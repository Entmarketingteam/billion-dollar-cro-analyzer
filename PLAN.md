# CRO Analyzer — V1 Ship Plan

> **STATUS 2026-07-08: P0 SHIPPED** (commit `eefd31f`, deployed + smoke-tested in prod).
> Both connect flows live, analysis uses real metrics, serverless model fixed,
> Shopify app config deployed (redirect URLs + read scopes). Remaining before first
> real run: add `https://billion-dollar-cro-analyzer.vercel.app/api/ga4/oauth-callback`
> (+ localhost:3000 equivalent) to the Google Cloud OAuth client — console-only, no API.
> Then P1 (secret rotation, Airtable probe-or-drop, migration gap, LLM-JSON retry).

> Written 2026-07-08 from a full repo audit. Deployment is live at
> https://billion-dollar-cro-analyzer.vercel.app with all OAuth credentials configured
> (Shopify + GA4 in Vercel prod and Doppler `ent-agency-automation/dev`).
> **The credentials are done. The app around them is not.** This plan is the gap list.

## Where the app actually stands

What works today, end to end: login (emily/ethan cookie auth) → dashboard lists sites
from Supabase → "Analyze" fires `/api/analyze-async` → Claude generates a test plan →
Playwright runs 15 real DOM checks → results render on `/dashboard/[siteId]` with 2s
polling → optional Airtable/Slack sync.

What's broken or missing — the five findings that matter:

1. **Neither OAuth flow can be started from the app.** `getShopifyAuthUrl()`
   (`src/lib/shopify.ts:18`) and `getGA4AuthUrl()` (`src/lib/ga4.ts:13`) are dead code —
   no authorize route, no "Connect store" button anywhere. The callback handlers exist
   and work, but nothing can reach them. Sites can only appear via manual DB insert.
2. **GA4 is dead in practice even after OAuth.** `ga4_property_id` is never written by
   any code path, and both `/api/ga4/metrics` and `/api/analyze` require it. Also the
   redirect URI registered in Google Cloud (`/auth/callback`) doesn't match the actual
   callback route (`/api/ga4/oauth-callback`).
3. **The wired analysis ignores real metrics.** The UI calls `/api/analyze-async`, whose
   `runAnalysisJob()` passes all metrics as zeros (`claude-agent.ts:155-166`). The
   metrics-aware pipeline (`/api/analyze` — fetches Shopify + GA4, then analyzes) is
   fully built but orphaned: no UI calls it. Claude is currently generating CRO plans
   from a URL + industry string only.
4. **Two serverless landmines.** (a) `analyze-async` is fire-and-forget — on Vercel the
   function can be killed before the background job finishes. (b) Playwright launches
   full Chromium, which is not available in Vercel's serverless runtime; `vercel.json`
   caps functions at 60s, and a real run (2 Claude calls + 15 browser checks) won't fit.
5. **Secret hygiene.** `.env.local.ga4` held a live Google client secret untracked in
   the repo dir (now gitignored, this commit). Tokens are stored plaintext in Supabase
   (`shopify_access_token`, `ga4_refresh_token`) — acceptable behind RLS + service-role
   for V1, but the GA4 client secret exposed in chat/disk should be rotated.

---

## P0 — Make the core loop real (~1 day)

Goal: a user can connect a real Shopify store + GA4 property from the UI, and the
analysis that runs uses their real numbers.

### 1. Shopify connect flow
- Add `GET /api/shopify/authorize?shop=<domain>` → redirects to `getShopifyAuthUrl()`
  (the dead code becomes live). Store `state` in a short-lived cookie.
- Harden `api/shopify/oauth-callback`: validate `state`, verify Shopify HMAC on the
  callback query (currently neither is done).
- Dashboard: "Connect Shopify store" button + shop-domain input → hits the authorize
  route. Empty state points at it.
- **Verify:** connect stiffpour.co's store in prod; a `sites` row appears with a token;
  `POST /api/shopify/metrics` returns non-zero orders/revenue for last 30d.

### 2. GA4 connect flow + property capture
- Fix redirect URI in Google Cloud console to
  `https://billion-dollar-cro-analyzer.vercel.app/api/ga4/oauth-callback` (+ localhost).
- Add `GET /api/ga4/authorize?siteId=` → `getGA4AuthUrl()` with `state=siteId`.
- After token exchange, call the GA4 Admin API `accountSummaries.list` with the fresh
  token, and show a property picker (or accept manual entry as the smallest slice) —
  write `ga4_property_id` to the site row. This is the single blocker killing GA4.
- **Verify:** `POST /api/ga4/metrics` returns real sessions + device breakdown.

### 3. Unify the two analysis pipelines
- Fold the metrics fetch from the orphaned `/api/analyze` into `runAnalysisJob()`
  (`src/lib/test-runner.ts`): fetch Shopify metrics (+ GA4 when connected) → save a
  `metrics_snapshots` row → pass real numbers to `generateTestPlanFromMetrics()`.
  Degrade gracefully: missing GA4 → proceed with Shopify only, note the gap in results.
- Delete `/api/analyze` (or reduce it to a thin sync wrapper) so there is one pipeline.
- **Verify:** run analysis on a connected store; the saved `test_plans.analysis_json`
  references the store's actual conversion rate / AOV, not zeros.

### 4. Fix the serverless execution model
Decision needed — recommendation first:
- **Recommended (smallest slice):** keep it on Vercel. Use `waitUntil()` (Vercel
  functions API) instead of bare fire-and-forget, bump `vercel.json` `maxDuration` to
  300 (Pro plan), and swap Playwright to `playwright-core` + `@sparticuz/chromium` so a
  browser actually exists at runtime.
- **Fallback if runs exceed ~5 min or chromium-min misbehaves:** move `runAnalysisJob`
  to a Railway worker that polls `test_runs` for `status='pending'` rows
  (`SELECT ... FOR UPDATE SKIP LOCKED`). We already run `ent-agent-server` on Railway.
- **Verify (either path):** chaos test — trigger analysis, confirm the `test_runs` row
  reaches `completed` with a real `audit_results` score in prod, not just locally.

## P1 — Correctness & hygiene (~half day)

5. **Rotate the exposed GA4 client secret** in Google Cloud (it transited chat + sat
   unignored on disk), update Vercel + Doppler. Shopify secret same treatment if it was
   ever pasted outside Doppler — it was; rotate both.
6. **Airtable sync: probe before trusting.** `airtable.ts` writes to assumed tables
   (`Analyses`, `Tests`, `AuditResults`, `TestRuns`) that were never verified against a
   real base — classic T1 trap. Also decide the system of record: org rule is Airtable
   → Supabase one-way; this app pushes Supabase → Airtable. Either verify the base +
   document this as the sanctioned reverse sync, or drop the Airtable sync for V1
   (recommended: drop — Slack notify already covers visibility).
7. **Migrations:** sequence jumps 002 → 004. Confirm prod schema matches the files
   (print Supabase project ref before touching anything — T6), and either restore or
   renumber so a fresh environment can be built from migrations alone.
8. **LLM-JSON hardening:** `claude-agent.ts` extracts JSON by regex with no retry. Add
   parse → repair → one retry with the error fed back (quality-bars requirement for
   LLM-JSON endpoints). Same for `verify-results.ts`.
9. **Model bump:** both Claude calls use `claude-opus-4-1`. Move to `claude-sonnet-5`
   for the test plan (structured generation, cheaper) and keep one flagship call only
   if quality demands it.

## P2 — Product completeness (do after P0/P1 proves out)

10. **Metrics on the dashboard** — render the latest `metrics_snapshots` (conversion
    rate, AOV, revenue, device split) on `SiteCard` and the site detail page. Right now
    metrics are collected but never shown.
11. **Use `src/lib/frameworks.json`** — the extracted benchmark + test catalog is
    generated but never imported; the prompt uses a 9-line hardcoded table instead.
    Feed the real catalog into the Claude prompt.
12. **Logout button** (`clearUserCookie()` exists, nothing calls it) and a
    `/api/auth/logout` route.
13. **Email notifications** — `RESEND_API_KEY` is in `.env.example` but unused. Either
    wire Resend on run-completion or delete the env var. Recommended: defer, Slack
    covers it.
14. **Docs refresh** — `CLAUDE.md` in this repo is stale (says Next 15, says Playwright
    is mocked; it's Next 16 and Playwright is real). Update after P0 lands so the next
    session doesn't relearn the codebase.

## Explicitly out of scope for V1

- Multi-user auth (hardcoded emily/ethan stands until there's a third user).
- Token encryption at rest (RLS + service-role only access is the V1 bar).
- The Shopify blog/SEO content engine and Stiff Pour schema work — separate track,
  handoff preserved at `docs/handoffs/2026-07-07-shopify-seo-content-automation.md`.

## Definition of done (V1)

A cold user (Emily) can: log in → connect a Shopify store via OAuth → connect GA4 and
pick a property → click Analyze → within 5 minutes see a completed run whose test plan
cites the store's real conversion rate, with a Playwright audit score — all in prod,
no manual DB inserts, no zero-metrics plans.
