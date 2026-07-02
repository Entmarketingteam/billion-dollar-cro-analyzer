-- ============================================================
-- CRO Analyzer — Initial Schema
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── sites ────────────────────────────────────────────────────
create table if not exists sites (
  id                    uuid primary key default gen_random_uuid(),
  user_id               text not null check (user_id in ('emily', 'ethan')),
  name                  text not null,
  url                   text not null,
  shopify_domain        text,
  shopify_access_token  text,
  industry              text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table sites enable row level security;

-- Service role bypasses RLS (MVP: all access via service key)
create policy "service_role_full_access" on sites
  using (true)
  with check (true);

-- ── test_plans ───────────────────────────────────────────────
create table if not exists test_plans (
  id            uuid primary key default gen_random_uuid(),
  site_id       uuid not null references sites(id) on delete cascade,
  analysis_json jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

alter table test_plans enable row level security;

create policy "service_role_full_access" on test_plans
  using (true)
  with check (true);

create index if not exists test_plans_site_id_idx on test_plans(site_id);

-- ── audit_results ────────────────────────────────────────────
create table if not exists audit_results (
  id              uuid primary key default gen_random_uuid(),
  site_id         uuid not null references sites(id) on delete cascade,
  checklist_items jsonb not null default '[]',
  total_checks    integer not null default 0,
  passed_checks   integer not null default 0,
  score_pct       numeric(5,2) not null default 0,
  created_at      timestamptz not null default now()
);

alter table audit_results enable row level security;

create policy "service_role_full_access" on audit_results
  using (true)
  with check (true);

create index if not exists audit_results_site_id_idx on audit_results(site_id);

-- ── metrics_snapshots ────────────────────────────────────────
create table if not exists metrics_snapshots (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references sites(id) on delete cascade,
  metrics     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

alter table metrics_snapshots enable row level security;

create policy "service_role_full_access" on metrics_snapshots
  using (true)
  with check (true);

create index if not exists metrics_snapshots_site_id_idx on metrics_snapshots(site_id);

-- ── updated_at trigger for sites ─────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger sites_updated_at
  before update on sites
  for each row execute function update_updated_at();
