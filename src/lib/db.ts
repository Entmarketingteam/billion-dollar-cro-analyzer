import { createClient } from "@supabase/supabase-js";
import type { Site, TestPlan, AuditResult, MetricsSnapshot } from "@/types";

// ── Database schema type map ─────────────────────────────────

export interface Database {
  public: {
    Tables: {
      sites: {
        Row: Site;
        Insert: Omit<Site, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Site, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      test_plans: {
        Row: TestPlan;
        Insert: Omit<TestPlan, "id" | "created_at">;
        Update: Partial<Omit<TestPlan, "id" | "created_at">>;
        Relationships: [];
      };
      audit_results: {
        Row: AuditResult;
        Insert: Omit<AuditResult, "id" | "created_at">;
        Update: Partial<Omit<AuditResult, "id" | "created_at">>;
        Relationships: [];
      };
      metrics_snapshots: {
        Row: MetricsSnapshot;
        Insert: Omit<MetricsSnapshot, "id" | "created_at">;
        Update: Partial<Omit<MetricsSnapshot, "id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
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
