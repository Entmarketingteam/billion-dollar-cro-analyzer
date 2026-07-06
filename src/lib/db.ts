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
