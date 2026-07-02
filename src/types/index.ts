// ============================================================
// CRO Analyzer — Shared TypeScript Types
// ============================================================

// Hardcoded users (design for multi-user later)
export type User = "emily" | "ethan";

// ── Database row types ──────────────────────────────────────

export interface Site {
  id: string;
  user_id: User;
  name: string;
  url: string;
  shopify_domain: string | null;
  shopify_access_token: string | null;
  industry: string | null;
  created_at: string;
  updated_at: string;
}

// ── Analysis JSON structure inside test_plans ───────────────

export interface TestPlanItem {
  id: string;
  chapter: string;
  section: string;
  hypothesis: string;
  effort_hours: number;
  expected_lift_min: number;
  expected_lift_max: number;
  priority_score: number;
  status: "pending" | "running" | "completed" | "skipped";
}

export interface TestPlanAnalysis {
  site_industry: string;
  benchmark_conversion_rate: number;
  benchmark_aov: number;
  tests: TestPlanItem[];
  generated_at: string;
  model: string;
}

export interface TestPlan {
  id: string;
  site_id: string;
  analysis_json: TestPlanAnalysis;
  created_at: string;
}

// ── Audit checklist structure inside audit_results ──────────

export interface ChecklistItem {
  id: string;
  category: string;
  label: string;
  passed: boolean;
  notes: string | null;
  screenshot_url: string | null;
}

export interface AuditResult {
  id: string;
  site_id: string;
  checklist_items: ChecklistItem[];
  total_checks: number;
  passed_checks: number;
  score_pct: number;
  created_at: string;
}

// ── Metrics snapshot structure ───────────────────────────────

export interface DeviceBreakdown {
  desktop: number;
  mobile: number;
  tablet: number;
}

export interface MetricsData {
  conversion_rate: number;
  aov: number;
  revenue: number;
  sessions: number;
  transactions: number;
  device_breakdown: DeviceBreakdown;
  period_start: string;
  period_end: string;
}

export interface MetricsSnapshot {
  id: string;
  site_id: string;
  metrics: MetricsData;
  created_at: string;
}
