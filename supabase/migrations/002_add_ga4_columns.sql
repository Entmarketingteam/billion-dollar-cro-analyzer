-- ── add GA4 OAuth columns to sites ───────────────────────────
alter table sites add column if not exists ga4_property_id text;
alter table sites add column if not exists ga4_refresh_token text;
