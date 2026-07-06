-- Migration 004: Add test_runs table and FK updates for test tracking

-- Create test_runs table
CREATE TABLE IF NOT EXISTS test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'error')),
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  error_message text,
  results jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_test_runs_site_id ON test_runs (site_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_status ON test_runs (status);
CREATE INDEX IF NOT EXISTS idx_test_runs_created_at ON test_runs (created_at DESC);

-- Add test_run_id FK to test_plans
ALTER TABLE test_plans
  ADD COLUMN IF NOT EXISTS test_run_id uuid REFERENCES test_runs(id) ON DELETE CASCADE;

-- Add test_run_id FK to audit_results
ALTER TABLE audit_results
  ADD COLUMN IF NOT EXISTS test_run_id uuid REFERENCES test_runs(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE test_runs ENABLE ROW LEVEL SECURITY;

-- Policy: allow service_role full access
CREATE POLICY allow_service_role ON test_runs
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
