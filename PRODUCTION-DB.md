# Production Database Setup Guide

**Project:** CRO Analyzer SaaS  
**Database:** Supabase (PostgreSQL)  
**Production Project ID:** `gljfknhbnmjgkfpsalzu` (current — development/staging)  
**Verified:** 2026-07-06

## Overview

This guide covers how to set up a separate production Supabase project for the CRO Analyzer, run migrations, and configure secure connections. It also documents critical security findings that must be addressed before production deployment.

---

## 1. Database Schema Verification

### Current Live State
- **Project:** `cro-analyzer` (ref: `gljfknhbnmjgkfpsalzu`)
- **Status:** ACTIVE_HEALTHY
- **Region:** us-east-1
- **PostgreSQL Version:** 17.6.1.141

### Tables Created ✅
All required tables exist with correct schemas:

| Table | Rows | Purpose |
|-------|------|---------|
| `sites` | 0 | Store site URLs, Shopify/GA4 OAuth tokens, metadata |
| `test_plans` | 0 | Claude-generated CRO test plans (JSON) |
| `audit_results` | 0 | Playwright audit checklist results |
| `metrics_snapshots` | 0 | Historical Shopify/GA4 metrics snapshots |
| `test_runs` | 0 | Test execution tracking (status, start/end times) |

### Indexes Created ✅
All performance indexes are in place:
- `test_plans_site_id_idx` — fast site lookups
- `audit_results_site_id_idx` — fast site lookups
- `metrics_snapshots_site_id_idx` — fast site lookups
- `idx_test_runs_site_id` — fast test run lookups
- `idx_test_runs_status` — fast status queries
- `idx_test_runs_created_at` — fast timestamp sorting

### Triggers Created ✅
- `sites_updated_at` — auto-updates `updated_at` timestamp on site modifications

---

## 2. Migrations — Source vs. Live

### Applied to Live Database
- **Only ONE migration applied:** `20260702195137` (init_schema)

### Migration Files in Repository
| File | Status | Applied | Notes |
|------|--------|---------|-------|
| `001_init_schema.sql` | ✅ | Yes | Initial schema + RLS setup. Timestamp: `20260702195137` |
| `002_add_ga4_columns.sql` | ❌ | No | Adds `ga4_property_id` and `ga4_refresh_token` columns to sites |
| `003_*.sql` | ❌ | Missing | No migration 003 — file does not exist in repo |
| `004_test_runs_table.sql` | ❌ | No | Adds test_runs table + FKs to test_plans/audit_results |

### Discrepancy Found ⚠️
The live database has `ga4_property_id` and `ga4_refresh_token` columns on the `sites` table (visible via Supabase Console), but migration `002_add_ga4_columns.sql` was never formally applied. These columns were likely added via the Supabase Console UI or a manual push, bypassing the migration system.

**Implication:** Running migrations from the file system on a fresh production database will produce a live state slightly diverged from the current development DB. Migration `002` must be applied before `004`.

---

## 3. Row-Level Security (RLS) — CRITICAL SECURITY FINDINGS

### Finding: RLS Policies Are Overly Permissive (WARN Level)

**Issue:** The RLS policies on `sites`, `test_plans`, `audit_results`, and `metrics_snapshots` tables use the pattern:
```sql
create policy "service_role_full_access" on sites
  using (true)
  with check (true);
```

Without an explicit `TO role` clause, these policies default to `TO public`, which means **the anon key (shipped to the browser) has full read/write access to all rows**, bypassing row-level security.

### Security Impact — HIGH

- **`sites` table:** Stores plaintext `shopify_access_token` and `ga4_refresh_token` OAuth tokens. The anon key can read and modify these tokens. **This is a critical data leak vulnerability.**
- **`test_plans` table:** Can be read/written by unauthenticated users.
- **`audit_results` table:** Can be read/written by unauthenticated users.
- **`metrics_snapshots` table:** Can be read/written by unauthenticated users.

### Comparison: Correct Implementation

Migration `004_test_runs_table.sql` implements the pattern correctly:
```sql
CREATE POLICY allow_service_role ON test_runs
  AS PERMISSIVE
  FOR ALL
  TO service_role  -- ✅ Explicit role scoping
  USING (true)
  WITH CHECK (true);
```

By specifying `TO service_role`, access is **limited to the service role only** (server-side, never exposed to the browser).

### Remediation SQL (Do NOT apply — document only)

To fix this in production, run:
```sql
-- Drop overly permissive policies
DROP POLICY IF EXISTS "service_role_full_access" ON sites;
DROP POLICY IF EXISTS "service_role_full_access" ON test_plans;
DROP POLICY IF EXISTS "service_role_full_access" ON audit_results;
DROP POLICY IF EXISTS "service_role_full_access" ON metrics_snapshots;

-- Create service-role-scoped policies
CREATE POLICY allow_service_role ON sites
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY allow_service_role ON test_plans
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY allow_service_role ON audit_results
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY allow_service_role ON metrics_snapshots
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

**Before deploying to production, you MUST either:**
1. Create a new migration file `005_fix_rls_policies.sql` with the above SQL and apply it, OR
2. Manually apply the above SQL to the production database immediately after creation.

---

## 4. Creating a Production Supabase Project

### Step 1: Create a New Project
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click **New Project**
3. **Project name:** `cro-analyzer-prod`
4. **Organization:** Same organization as development
5. **Region:** us-east-1 (match development for consistency)
6. **Database Password:** Generate a strong password; store in Doppler (see Step 5)

### Step 2: Note Project Credentials
After creation, note:
- **Project ID** (visible in Project Settings → General → Reference ID)
- **Project URL** (visible in Project Settings)
- **Anon Key** (visible in Project Settings → API)
- **Service Role Key** (visible in Project Settings → API)

### Step 3: Store Secrets in Doppler
Add the following to Doppler (`ent-agency-automation` / `prod` config):
```
CRO_SUPABASE_URL_PROD=https://<your-project-id>.supabase.co
CRO_SUPABASE_ANON_KEY_PROD=<anon-key>
CRO_SUPABASE_SERVICE_ROLE_KEY_PROD=<service-role-key>
```

### Step 4: Configure Environment
Create `.env.production`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Existing vars (keep consistent)
SHOPIFY_OAUTH_CLIENT_ID=<from-doppler>
SHOPIFY_OAUTH_CLIENT_SECRET=<from-doppler>
GA4_OAUTH_CLIENT_ID=<from-doppler>
GA4_OAUTH_CLIENT_SECRET=<from-doppler>
ANTHROPIC_API_KEY=<from-doppler>
AIRTABLE_API_TOKEN=<from-doppler>
AIRTABLE_BASE_ID=<from-doppler>
```

**Never commit `.env.production` to git.**

---

## 5. Running Migrations on Production

### Option A: Using Supabase CLI (Recommended)

1. **Install Supabase CLI** (if not already installed):
   ```bash
   brew install supabase/tap/supabase
   ```

2. **Link project to local setup** (one-time):
   ```bash
   supabase link --project-ref <prod-project-id>
   ```

3. **Push migrations to production:**
   ```bash
   supabase db push --linked
   ```

   This will:
   - Run all `.sql` files in `supabase/migrations/` in order
   - Apply only migrations not yet applied
   - Report success/failure

4. **Verify applied migrations:**
   ```bash
   supabase migration list --linked
   ```

### Option B: Using Supabase Dashboard

1. Go to **Project Settings → SQL Editor**
2. Open each `.sql` file from `supabase/migrations/` and run manually
3. **Order matters:** Run in sequence: 001 → 002 → 004

### Option C: Using MCP Tools (from Claude Code)

```bash
# Verify migrations before applying
mcp__claude_ai_Supabase__list_migrations --project_id "<prod-project-id>"

# Apply a migration
mcp__claude_ai_Supabase__apply_migration \
  --project_id "<prod-project-id>" \
  --query "$(cat supabase/migrations/001_init_schema.sql)"
```

### Critical: Apply RLS Fix Before Going Live

Before any users access the production database:
1. Run migrations 001, 002, 004 as above
2. Immediately run the RLS fix SQL (from Section 3)
3. Verify with:
   ```bash
   mcp__claude_ai_Supabase__get_advisors --project_id "<prod-project-id>" --type "security"
   ```

---

## 6. Connection Pooling Recommendations

### Development (localhost:3000)
- **Direct Connection:** Use `db.*.supabase.co:5432` (default)
- **Engine:** Transaction mode (fine for dev)
- **Max connections:** Auto-scaled by Supabase

### Production (Next.js on Vercel/Railway)
Use **PgBouncer Connection Pooling** to reduce Postgres connection overhead:

1. **Enable in Supabase Console:**
   - Go to **Project Settings → Database → Connection Pooling**
   - **Pooler Mode:** Transaction
   - **Max Pool Size:** 20 (default, sufficient for serverless)

2. **Use pooler connection string for app queries:**
   ```
   postgresql://postgres:[password]@db.[project-id].pooler.supabase.co:6543/postgres
   ```
   (Note: port **6543** instead of 5432)

3. **Use direct connection for migrations:**
   ```
   postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres
   ```
   (Migrations require direct connection to avoid transaction mode issues)

### db.ts Client Configuration (Already Correct)
The app already uses the correct factory pattern:
```typescript
// Browser-safe (anon key)
export function createBrowserClient() { ... }

// Server-side (service role key — bypasses RLS)
export function createServerClient() { ... }
```

**For production:** Only update `NEXT_PUBLIC_SUPABASE_URL` to point to the pooler URL if using the URL directly in queries. The SDK handles connection pooling internally.

---

## 7. Backup Strategy

### Automated Backups (Supabase Default)
- **Daily backups** are automatically taken and retained for 7 days
- **Weekly backups** are retained for 4 weeks
- Restore via **Project Settings → Backups**

### Manual Backup Before Critical Changes
Before running migrations in production:
```bash
# Export schema + data
pg_dump \
  --host db.[project-id].supabase.co \
  --port 5432 \
  --username postgres \
  --dbname postgres \
  --schema-only \
  > schema_backup_$(date +%Y%m%d).sql

# Full data dump (optional, large)
pg_dump \
  --host db.[project-id].supabase.co \
  --port 5432 \
  --username postgres \
  --dbname postgres \
  > full_backup_$(date +%Y%m%d).sql
```

### Disaster Recovery
1. **If migrations fail:** Use Supabase **Restore from backup** (automatic backups)
2. **If data is corrupted:** Restore to a point-in-time snapshot
3. **If project is compromised:** Create a new project and restore from backup

---

## 8. Environment Variable Setup

### Development (`.env.local`)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://gljfknhbnmjgkfpsalzu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Production (via Doppler, pulled at runtime)
```bash
CRO_SUPABASE_URL_PROD=https://<prod-project-id>.supabase.co
CRO_SUPABASE_ANON_KEY_PROD=<prod-anon-key>
CRO_SUPABASE_SERVICE_ROLE_KEY_PROD=<prod-service-role-key>
```

### How Secrets Are Stored
1. **Local development:** `.env.local` (gitignored) — never commit
2. **Doppler (recommended):** CLI pulls at deploy/runtime
3. **Vercel/Railway:** Use platform environment variables (pull from Doppler in CI)

### Verification Checklist
- [ ] `.env.local` is in `.gitignore` ✅ (confirmed)
- [ ] `.env.production` is NOT committed to git
- [ ] Service role key is **never exposed** in client-side code
- [ ] Anon key is used only for browser clients (public)
- [ ] All secrets are rotated if ever leaked

---

## 9. Monitoring & Alerts

### Key Metrics to Monitor
1. **Database size:** Project Settings → Database → Size
2. **Connection count:** Monitor via `pg_stat_activity`
3. **Slow queries:** Enable Query Performance Insights (Project Settings)
4. **RLS violations:** Monitor logs for permission denied errors

### Set Up Slack Alerts (Recommended)
Via the Supabase app marketplace or custom webhook:
- Alert on database size > 90% of quota
- Alert on connection pool exhaustion
- Alert on replication lag (if using Read Replicas)

---

## 10. Testing the Production Database

### Connection Test (No Data)
```bash
# SSH into production database
PGPASSWORD=<db-password> psql \
  -h db.<prod-project-id>.supabase.co \
  -U postgres \
  -d postgres \
  -c "SELECT count(*) FROM sites;"
```

Expected output:
```
 count
-------
     0
(1 row)
```

### Application-Level Test
1. Deploy app to production environment
2. Hit **`/api/analyze`** endpoint with a test site UUID
3. Verify:
   - Query succeeds (no connection errors)
   - Test run is created in `test_runs` table
   - Data is persisted (query `sites` directly, confirm count > 0)

### Verify RLS is Fixed
After applying the RLS fix from Section 3:
```bash
# From Claude Code MCP
mcp__claude_ai_Supabase__get_advisors \
  --project_id "<prod-project-id>" \
  --type "security"
```

Should show **zero WARN-level RLS findings**.

---

## 11. Known Limitations & Future Work

| Issue | Current | Fix |
|-------|---------|-----|
| RLS overly permissive | ⚠️ WARN | Apply migration 005 (Section 3) |
| No user authentication | MVP | Implement Supabase Auth in Phase 5 |
| Function search_path mutable | ⚠️ WARN | Update trigger function with `SET search_path = public` |
| OAuth tokens in plaintext | ⚠️ WARN | Encrypt tokens at rest using PGcrypto or KMS |
| No audit logging | MVP | Add `audit_log` table + triggers |
| No automated backups to S3 | MVP | Set up pg_dump cron or Supabase backup export |

---

## 12. Rollback Procedure

If production deployment goes wrong:

### Quick Rollback (via Supabase Console)
1. **Project Settings → Backups**
2. Select the most recent successful backup
3. Click **Restore**
4. Confirm; ~5 minutes to restore

### Database Rollback (if partial migration applied)
```bash
# Drop problematic tables (example: if 004 partially applied)
psql -h db.<prod-project-id>.supabase.co ...
DROP TABLE IF EXISTS test_runs CASCADE;
```

Then re-run the full migration sequence.

### Application Rollback
If the app deployment also needs to revert:
1. Rollback app code to previous commit
2. Optionally restore database to a matching backup
3. Redeploy app

---

## 13. Production Checklist

Before going live with production:

- [ ] New Supabase project created (`cro-analyzer-prod`)
- [ ] All secrets added to Doppler (`prod` config)
- [ ] Migrations 001, 002, 004 applied
- [ ] RLS fix (migration 005 equivalent) applied
- [ ] `get_advisors` security scan shows no WARN findings
- [ ] Connection test succeeds
- [ ] `.env.production` created but not committed
- [ ] Backup strategy documented and tested
- [ ] Monitoring alerts configured
- [ ] Team trained on disaster recovery
- [ ] Production URL updated in Shopify/GA4 OAuth callback URIs

---

## References

- [Supabase Database Docs](https://supabase.com/docs/guides/database)
- [Supabase RLS Guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooling)
- [Supabase Backups & Restore](https://supabase.com/docs/guides/database/backups)
- [PostgreSQL Security Best Practices](https://www.postgresql.org/docs/current/sql-syntax.html)
