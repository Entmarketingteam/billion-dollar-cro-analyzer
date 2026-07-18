-- Applied 2026-07-18 via Supabase MCP to project gljfknhbnmjgkfpsalzu (cro-analyzer).
-- Mirror of remote migration `fix_advisor_findings_rls_and_hardening`
-- (already live; recorded in supabase_migrations.schema_migrations — do not re-run blindly).
--
-- 1. CRITICAL: "service_role_full_access" policies were granted to role public (anon included)
--    with USING true — full anon read/write. Rescope to service_role.
drop policy "service_role_full_access" on public.audit_results;
create policy "service_role_full_access" on public.audit_results for all to service_role using (true) with check (true);
drop policy "service_role_full_access" on public.metrics_snapshots;
create policy "service_role_full_access" on public.metrics_snapshots for all to service_role using (true) with check (true);
drop policy "service_role_full_access" on public.sites;
create policy "service_role_full_access" on public.sites for all to service_role using (true) with check (true);
drop policy "service_role_full_access" on public.test_plans;
create policy "service_role_full_access" on public.test_plans for all to service_role using (true) with check (true);

-- 2. Pin search_path on flagged trigger function
alter function public.update_updated_at() set search_path = public;

-- 3. Index unindexed foreign keys
create index if not exists idx_audit_results_test_run_id on public.audit_results (test_run_id);
create index if not exists idx_test_plans_test_run_id on public.test_plans (test_run_id);
