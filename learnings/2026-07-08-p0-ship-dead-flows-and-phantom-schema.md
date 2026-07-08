# P0/P1 ship: dead OAuth flows, phantom prod schema, browser on Vercel

**Problem** — App was "deployed with OAuth credentials configured" but could not actually be used: no way to start either OAuth flow, GA4 structurally broken, analysis ran on zero metrics, and (found last) the prod DB was missing the table the whole wired flow writes to.

**Approach**
1. Audited implementation state from code, not docs — repo CLAUDE.md claimed "Phase 2 complete, OAuth working"; grepping for *callers* of `getShopifyAuthUrl`/`getGA4AuthUrl` showed only tests called them. Helpers existing ≠ flow existing.
2. Traced what the UI actually invokes (`SiteCard` → `/api/analyze-async`) vs what was built (`/api/analyze` with real metrics, orphaned). The wired path passed hardcoded zeros to Claude. Merged the metrics fetch into the wired job rather than wiring the orphan.
3. Read the OAuth callbacks against what the *provider* actually sends: GA4 callback expected a `siteId` query param — Google only echoes `state`. Fixed by carrying `siteId:nonce` in `state`. Shopify callback verified neither HMAC nor state; added both.
4. Before declaring done, listed live prod tables via Supabase MCP against `supabase/migrations/` — `test_runs` didn't exist. Applied migration 004 to prod. Zero rows in every table confirmed nobody had ever completed a run; "verified deployed" had only ever meant "the build succeeded".
5. Probed the Airtable sync's credentials (`/v0/meta/whoami`) — token dead (401). Deleted the sync instead of fixing it (Slack already notifies; the base schema was never verified).
6. Vercel runtime: replaced `@playwright/test` chromium with `playwright-core` + `@sparticuz/chromium` behind an `if (process.env.VERCEL)` branch, `serverExternalPackages` in next.config, `waitUntil()` around the background job, `maxDuration: 300`.
7. Shopify app config (`shopify.app.toml` in the separate CLI app repo) still had template `example.com` URLs and demo metaobjects requiring `write_products` — deploy failed until the demo objects were deleted, then `shopify app deploy --allow-updates --allow-deletes --no-build` released it.

**Judgment calls**
- Did NOT renumber the 001→002→004 migration-file gap: alphabetical ordering is already correct; churn without benefit.
- Did NOT fix the Airtable sync or its token: no human ever looked at that base; retiring beats repairing a duplicate reporting channel (T7).
- Did NOT fix ~100 pre-existing `tsc --noEmit` mock-typing errors in tests: confirmed pre-existing (identical errors in files never touched), out of scope; jest + `next build` are the gates that matter.
- Worked on `main` locally but treated **push** as the deploy gate (Vercel auto-deploys main); pushed only after 144 tests + build green.

**Reusable rules**
- "OAuth is configured" is meaningless until you find the route that *initiates* the flow and the code that reads what the provider *actually sends back* (`state`, not your invented param).
- Before the first prod run of any deployed app, diff live DB schema against the migrations dir. Zero rows across all tables = the happy path has never executed, whatever the docs say.
- When a background sync has never been human-verified, probe its credentials first (`whoami`-style endpoint); a dead token means delete the sync, not repair it.

**Verification**
- `npx jest` → 144/144 green; `npm run build` → clean, route list shows new endpoints, orphan gone.
- Prod curls: unauth `/api/shopify/authorize` → 307 `/login`; authed → 307 to `stiffpour.myshopify.com/admin/oauth/authorize` with correct client_id + registered redirect_uri; old `/api/analyze` → 404.
- `mcp Supabase list_tables(gljfknhbnmjgkfpsalzu)` → all 5 tables incl. `test_runs`, RLS on.
- `vercel ls` → latest Production deployment ● Ready.
