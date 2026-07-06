import { createClient } from "@supabase/supabase-js";
import type { Site, TestPlan, AuditResult, MetricsSnapshot, TestRun, TestRunStatus } from "@/types";

// ── Database schema type map ─────────────────────────────────

// supabase-js's GenericTable requires Row/Insert/Update to satisfy
// Record<string, unknown>; interfaces lack an index signature, so map
// each into a plain object type to keep the typed client from collapsing to `never`.
type Table<Row, Ins, Upd> = {
  Row: { [K in keyof Row]: Row[K] };
  Insert: { [K in keyof Ins]: Ins[K] };
  Update: { [K in keyof Upd]: Upd[K] };
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      sites: Table<
        Site,
        Omit<Site, "id" | "created_at" | "updated_at" | "ga4_property_id" | "ga4_refresh_token"> &
          Partial<Pick<Site, "ga4_property_id" | "ga4_refresh_token">>,
        Partial<Omit<Site, "id" | "created_at" | "updated_at">>
      >;
      test_plans: Table<
        TestPlan,
        Omit<TestPlan, "id" | "created_at">,
        Partial<Omit<TestPlan, "id" | "created_at">>
      >;
      audit_results: Table<
        AuditResult,
        Omit<AuditResult, "id" | "created_at">,
        Partial<Omit<AuditResult, "id" | "created_at">>
      >;
      metrics_snapshots: Table<
        MetricsSnapshot,
        Omit<MetricsSnapshot, "id" | "created_at">,
        Partial<Omit<MetricsSnapshot, "id" | "created_at">>
      >;
      test_runs: Table<
        TestRun,
        Omit<TestRun, "id" | "created_at" | "updated_at" | "started_at" | "completed_at" | "error_message" | "results"> &
          Partial<Pick<TestRun, "completed_at" | "error_message" | "results">>,
        Partial<Omit<TestRun, "id" | "created_at">>
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// ── Client factory ───────────────────────────────────────────

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  return url;
}

function getAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
  return key;
}

// Browser-safe public client (anon key)
export function createBrowserClient() {
  return createClient<Database>(getSupabaseUrl(), getAnonKey());
}

// Server-side client (service role key — bypasses RLS)
export function createServerClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient<Database>(getSupabaseUrl(), serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Default export: browser client (safe for RSC / client components)
export const db = createBrowserClient;

// ── Test run helpers (server-side, service role) ─────────────

export async function createTestRun(siteId: string): Promise<TestRun> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("test_runs")
    .insert({ site_id: siteId, status: "pending" as TestRunStatus })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getTestRun(testRunId: string): Promise<TestRun> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("test_runs")
    .select()
    .eq("id", testRunId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateTestRunStatus(
  testRunId: string,
  status: TestRunStatus,
  results?: TestRun["results"],
  errorMessage?: string
): Promise<TestRun> {
  const supabase = createServerClient();
  const completedAt = (status === "completed" || status === "error")
    ? new Date().toISOString()
    : undefined;
  const { data, error } = await supabase
    .from("test_runs")
    .update({
      status,
      updated_at: new Date().toISOString(),
      ...(results !== undefined && { results }),
      ...(errorMessage !== undefined && { error_message: errorMessage }),
      ...(completedAt !== undefined && { completed_at: completedAt }),
    })
    .eq("id", testRunId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listTestRunsBySite(siteId: string, limit = 10): Promise<TestRun[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("test_runs")
    .select()
    .eq("site_id", siteId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getSiteById(siteId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("sites")
    .select()
    .eq("id", siteId)
    .single();
  if (error) throw error;
  return data;
}
