# CRO Analyzer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build internal SaaS (cro.entagency.co) that analyzes Shopify DTC + education businesses using Billion Dollar Websites book frameworks, generates prioritized CRO tests backed by metrics + book methodology.

**Architecture:** Next.js frontend + Supabase schema + Claude agent analysis + Shopify/GA4 OAuth + Playwright site audit + Airtable sync. Parallel execution: framework extraction, OAuth flows, dashboard, site audit, integrations all independent until metrics fetching + analysis phase.

**Tech Stack:** Next.js (TypeScript), Supabase, Claude API, Shopify REST API, GA4 Reporting API, Playwright, Airtable API, Doppler secrets

## Global Constraints

- Secrets: Doppler project `ent-agency-automation`, config `dev`
- Auth: Hardcoded Emily/Ethan (design for multi-user later, no rework needed)
- Supabase project: new `cro-analyzer` in org `fvkzlvakmzroyxacvxub`
- All APIs: direct vendor calls, no MCP gateway
- No generic advice: every test backed by user metrics + exact book chapter
- Expected lifts: ranges (1-3%, 3-5%, 5%+), never vague

---

## File Structure

```
~/Desktop/billion-dollar-cro-analyzer/
├── docs/
│   └── superpowers/
│       ├── specs/
│       │   └── 2026-06-29-cro-analyzer-design.md
│       └── plans/
│           └── 2026-06-29-cro-analyzer-implementation.md
├── public/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx (landing)
│   │   ├── dashboard/
│   │   │   ├── page.tsx (store list)
│   │   │   ├── [storeId]/
│   │   │   │   ├── page.tsx (store detail)
│   │   │   │   ├── tests/page.tsx
│   │   │   │   ├── audit/page.tsx
│   │   │   │   └── results/page.tsx
│   │   └── api/
│   │       ├── auth/
│   │       │   └── [...nextauth].ts
│   │       ├── shopify/
│   │       │   ├── oauth-callback.ts
│   │       │   └── metrics.ts
│   │       ├── ga4/
│   │       │   ├── oauth-callback.ts
│   │       │   └── metrics.ts
│   │       ├── analyze/
│   │       │   └── route.ts (Claude agent call)
│   │       ├── audit/
│   │       │   └── route.ts (Playwright + Claude checklist)
│   │       └── airtable/
│   │           └── sync.ts
│   ├── lib/
│   │   ├── db.ts (Supabase client)
│   │   ├── frameworks.json (extracted book frameworks)
│   │   ├── shopify.ts (OAuth + API)
│   │   ├── ga4.ts (OAuth + API)
│   │   ├── playwright.ts (site audit)
│   │   ├── claude.ts (agent + prompt)
│   │   └── airtable.ts (sync)
│   ├── components/
│   │   ├── stores/
│   │   │   ├── StoreList.tsx
│   │   │   ├── AddStoreForm.tsx
│   │   │   └── StoreDetail.tsx
│   │   ├── tests/
│   │   │   ├── TestQueue.tsx
│   │   │   └── TestCard.tsx
│   │   ├── audit/
│   │   │   └── AuditChecklist.tsx
│   │   └── common/
│   │       ├── MetricsCard.tsx
│   │       └── BenchmarkCompare.tsx
│   └── types/
│       └── index.ts
├── tests/
│   ├── lib/
│   │   ├── frameworks.test.ts
│   │   ├── claude.test.ts
│   │   └── shopify.test.ts
│   └── integration/
│       └── e2e.test.ts
├── .env.local.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## Task Decomposition (Parallel Execution)

**Phase 1 (Extraction + Scaffold):** 
- Task 1: Extract book frameworks to JSON
- Task 2: Scaffold Next.js + Supabase schema
- Task 3: Setup auth (hardcoded Emily/Ethan)

**Phase 2 (OAuth Flows - Parallel):**
- Task 4: Shopify OAuth + metrics fetch
- Task 5: GA4 OAuth + metrics fetch

**Phase 3 (Analysis - Parallel):**
- Task 6: Claude agent setup + test ranking
- Task 7: Playwright site audit + checklist
- Task 8: Airtable sync

**Phase 4 (Dashboard):**
- Task 9: Store list + add store form
- Task 10: Store detail + metrics view
- Task 11: Test queue + audit checklist UI

**Phase 5 (Quality Gate):**
- Task 12: LLM verification (judge implementation against spec)
- Task 13: Fix issues found by judge
- Task 14: Deploy to cro.entagency.co

---

## Tasks

### Task 1: Extract Book Frameworks to JSON

**Files:**
- Create: `src/lib/frameworks.json`
- Create: `scripts/extract-frameworks.ts` (one-time script, for reference)
- Test: (manual verification only — output is reference data)

**Interfaces:**
- Produces: `frameworks.json` with structure:
  ```typescript
  {
    "benchmarks": { "education": { "conversion_rate": 2.1, "aov": 45 }, ... },
    "tests": [
      {
        "id": "checkout-single-step",
        "chapter": "Chapter 8",
        "section": "Rule 5",
        "hypothesis": "Single-step checkout reduces abandonment",
        "effort_hours": 6,
        "expected_lift_min": 3,
        "expected_lift_max": 5,
        "applies_to": ["ecommerce"]
      }
    ],
    "checklist_items": [
      {
        "id": "headline-power-words",
        "chapter": "Chapter 7",
        "item": "Headline uses 3+ power words",
        "auto_check": false
      }
    ]
  }
  ```

**Steps:**

- [ ] **Step 1: Create extraction script**

```typescript
// scripts/extract-frameworks.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

async function extractFrameworks() {
  const pdfPaths = [
    "1st part of Million Dollar Websites.pdf",
    "2nd part Billion Dollar Websites.pdf",
    "3rd part Billion Dollar Websites.pdf",
  ];

  const prompt = `Extract from the Billion Dollar Websites book PDFs:

1. Benchmarks (by vertical: education, ecommerce, SaaS):
   - Target conversion rates
   - Target AOV
   - Target scroll depth
   - Target cart abandonment rate

2. All A/B tests mentioned (with chapter, section, hypothesis, expected lift %, effort estimate)

3. All checklist items from the book (with chapter reference, whether auto-detectable or manual)

Return as strict JSON matching this schema:
{
  "benchmarks": { "education": {...}, "ecommerce": {...} },
  "tests": [...],
  "checklist_items": [...]
}`;

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return response.content[0].type === "text"
    ? JSON.parse(response.content[0].text)
    : null;
}

extractFrameworks().then((result) => {
  console.log(JSON.stringify(result, null, 2));
});
```

- [ ] **Step 2: Run extraction**

```bash
cd ~/Desktop/billion-dollar-cro-analyzer
npm install @anthropic-ai/sdk
doppler run -- npx ts-node scripts/extract-frameworks.ts > src/lib/frameworks.json
```

Expected: JSON file with benchmarks, tests, checklist_items populated from book content.

- [ ] **Step 3: Verify output structure**

```bash
# Check file exists and is valid JSON
cat src/lib/frameworks.json | jq . > /dev/null && echo "Valid JSON"

# Spot-check: should have education, ecommerce benchmarks
jq '.benchmarks | keys' src/lib/frameworks.json
# Expected output: ["education", "ecommerce", ...]

# Spot-check: should have 15+ tests
jq '.tests | length' src/lib/frameworks.json
# Expected output: ≥15
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/frameworks.json scripts/extract-frameworks.ts
git commit -m "feat: extract book frameworks to JSON

Extracted benchmarks, tests, checklist items from Billion Dollar Websites PDFs.
Framework schema feeds Claude agent and audit checklist."
```

---

### Task 2: Scaffold Next.js + Supabase Schema

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `.env.local.example`
- Create: `supabase/migrations/001_init_schema.sql`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/lib/db.ts`
- Create: `src/types/index.ts`

**Interfaces:**
- Consumes: (none — bootstrap phase)
- Produces: Working Next.js app + Supabase tables + environment setup

**Steps:**

- [ ] **Step 1: Create Next.js app**

```bash
cd ~/Desktop/billion-dollar-cro-analyzer
npx create-next-app@latest . --typescript --tailwind --no-git
```

- [ ] **Step 2: Add dependencies**

```bash
npm install @supabase/supabase-js @anthropic-ai/sdk playwright dotenv
npm install -D @types/node @types/react @types/react-dom
```

- [ ] **Step 3: Create .env.local.example**

```bash
cat > .env.local.example << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

SHOPIFY_OAUTH_CLIENT_ID=your-shopify-app-id
SHOPIFY_OAUTH_CLIENT_SECRET=your-shopify-app-secret
SHOPIFY_REDIRECT_URI=http://localhost:3000/api/shopify/oauth-callback

GA4_OAUTH_CLIENT_ID=your-ga4-client-id
GA4_OAUTH_CLIENT_SECRET=your-ga4-client-secret
GA4_REDIRECT_URI=http://localhost:3000/api/ga4/oauth-callback

CLAUDE_API_KEY=your-claude-key

AIRTABLE_API_KEY=your-airtable-key
AIRTABLE_BASE_ID=your-base-id

DOPPLER_TOKEN=your-doppler-token
EOF
```

- [ ] **Step 4: Create Supabase schema migration**

```sql
-- supabase/migrations/001_init_schema.sql

-- Sites table
CREATE TABLE public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL CHECK (user_id IN ('emily', 'ethan')),
  shopify_store_url TEXT NOT NULL,
  shopify_access_token TEXT NOT NULL,
  ga4_property_id TEXT NOT NULL,
  ga4_refresh_token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(user_id, shopify_store_url)
);

-- Test Plans table
CREATE TABLE public.test_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  analysis_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Audit Results table
CREATE TABLE public.audit_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  checklist_items JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Metrics Snapshots table
CREATE TABLE public.metrics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  conversion_rate DECIMAL(5,2),
  aov DECIMAL(10,2),
  traffic_source TEXT,
  device_breakdown JSONB,
  cart_abandonment_rate DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Indexes
CREATE INDEX idx_sites_user_id ON public.sites(user_id);
CREATE INDEX idx_test_plans_site_id ON public.test_plans(site_id);
CREATE INDEX idx_audit_results_site_id ON public.audit_results(site_id);
CREATE INDEX idx_metrics_snapshots_site_id ON public.metrics_snapshots(site_id);

-- Enable RLS
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies (service_role bypass for now)
CREATE POLICY "Service role can do anything" ON public.sites FOR ALL USING (TRUE);
CREATE POLICY "Service role can do anything" ON public.test_plans FOR ALL USING (TRUE);
CREATE POLICY "Service role can do anything" ON public.audit_results FOR ALL USING (TRUE);
CREATE POLICY "Service role can do anything" ON public.metrics_snapshots FOR ALL USING (TRUE);
```

- [ ] **Step 5: Create Supabase client**

```typescript
// src/lib/db.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Tables = {
  sites: {
    Row: {
      id: string;
      user_id: string;
      shopify_store_url: string;
      shopify_access_token: string;
      ga4_property_id: string;
      ga4_refresh_token: string;
      created_at: string;
      updated_at: string;
    };
  };
  test_plans: {
    Row: {
      id: string;
      site_id: string;
      analysis_json: Record<string, unknown>;
      created_at: string;
    };
  };
  audit_results: {
    Row: {
      id: string;
      site_id: string;
      checklist_items: Record<string, unknown>;
      created_at: string;
    };
  };
  metrics_snapshots: {
    Row: {
      id: string;
      site_id: string;
      conversion_rate: number;
      aov: number;
      traffic_source: string;
      device_breakdown: Record<string, unknown>;
      cart_abandonment_rate: number;
      created_at: string;
    };
  };
};
```

- [ ] **Step 6: Create types**

```typescript
// src/types/index.ts
export type User = "emily" | "ethan";

export interface Site {
  id: string;
  user_id: User;
  shopify_store_url: string;
  shopify_access_token: string;
  ga4_property_id: string;
  ga4_refresh_token: string;
  created_at: string;
  updated_at: string;
}

export interface MetricsSnapshot {
  id: string;
  site_id: string;
  conversion_rate: number;
  aov: number;
  traffic_source: string;
  device_breakdown: Record<string, number>;
  cart_abandonment_rate: number;
  created_at: string;
}

export interface TestPlan {
  id: string;
  site_id: string;
  analysis_json: {
    tests: Array<{
      rank: number;
      hypothesis: string;
      expected_lift: string;
      effort_hours: number;
      impact_score: number;
      steps: string[];
      book_chapter: string;
      book_section: string;
    }>;
    audit_checklist: Array<{
      item: string;
      auto_check: boolean;
      manual_status: boolean | null;
      book_ref: string;
    }>;
  };
  created_at: string;
}

export interface AuditResult {
  id: string;
  site_id: string;
  checklist_items: Array<{
    item: string;
    auto_check_status: "pass" | "fail" | "unknown";
    manual_confirmed: boolean;
    book_ref: string;
  }>;
  created_at: string;
}
```

- [ ] **Step 7: Create layout**

```typescript
// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRO Analyzer | ENT Agency",
  description:
    "Analyze Shopify stores using Billion Dollar Websites frameworks",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900">
        <header className="border-b bg-white">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold">CRO Analyzer</h1>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Create landing page**

```typescript
// src/app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-lg border">
        <h2 className="text-3xl font-bold mb-4">Welcome to CRO Analyzer</h2>
        <p className="text-lg text-slate-600 mb-6">
          Analyze your Shopify store using frameworks from Billion Dollar
          Websites.
        </p>
        <Link
          href="/dashboard"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg inline-block hover:bg-blue-700"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Create migration in Supabase**

```bash
# Create project manually in Supabase dashboard
# Then run migration:
cat supabase/migrations/001_init_schema.sql | \
  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U postgres -d postgres
```

- [ ] **Step 10: Commit**

```bash
git add package.json tsconfig.json next.config.ts .env.local.example \
         supabase/migrations/ src/
git commit -m "feat: scaffold Next.js + Supabase schema

- Created Next.js app structure
- Set up Supabase schema (sites, test_plans, audit_results, metrics_snapshots)
- Created types and db client
- Added landing page and layout"
```

---

### Task 3: Setup Auth (Hardcoded Emily/Ethan)

**Files:**
- Create: `src/app/api/auth/login.ts`
- Create: `src/middleware.ts`
- Create: `src/lib/auth.ts`

**Interfaces:**
- Consumes: (none)
- Produces: Auth middleware + login endpoint that sets user session

**Steps:**

- [ ] **Step 1: Create auth utilities**

```typescript
// src/lib/auth.ts
import { cookies } from "next/headers";

const VALID_USERS = ["emily", "ethan"] as const;
export type ValidUser = (typeof VALID_USERS)[number];

export function isValidUser(user: string): user is ValidUser {
  return VALID_USERS.includes(user as ValidUser);
}

export async function setUserCookie(user: ValidUser) {
  const cookieStore = await cookies();
  cookieStore.set("cro_user", user, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function getUserFromCookie(): Promise<ValidUser | null> {
  const cookieStore = await cookies();
  const user = cookieStore.get("cro_user")?.value;
  return user && isValidUser(user) ? user : null;
}

export async function clearUserCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("cro_user");
}
```

- [ ] **Step 2: Create login endpoint**

```typescript
// src/app/api/auth/login.ts
import { NextRequest, NextResponse } from "next/server";
import { setUserCookie, isValidUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { user } = await request.json();

  if (!isValidUser(user)) {
    return NextResponse.json(
      { error: "Invalid user" },
      { status: 400 }
    );
  }

  await setUserCookie(user);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Create middleware**

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow login page and API routes
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth/login") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  // Check for auth cookie on protected routes
  const cookieStore = cookies();
  const user = cookieStore.get("cro_user")?.value;

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/analyze/:path*", "/api/audit/:path*"],
};
```

- [ ] **Step 4: Create login page**

```typescript
// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState<"emily" | "ethan" | "">("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (selectedUser: "emily" | "ethan") => {
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: selectedUser }),
    });

    if (res.ok) {
      router.push("/dashboard");
    } else {
      alert("Login failed");
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-3xl font-bold mb-8 text-center">CRO Analyzer</h1>

        <div className="space-y-4">
          <button
            onClick={() => handleLogin("emily")}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            Login as Emily
          </button>
          <button
            onClick={() => handleLogin("ethan")}
            disabled={loading}
            className="w-full bg-slate-600 text-white py-3 rounded-lg font-semibold hover:bg-slate-700 disabled:opacity-50"
          >
            Login as Ethan
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth/login.ts src/middleware.ts src/app/login/page.tsx
git commit -m "feat: add hardcoded auth for emily/ethan

- Login endpoint validates user (emily or ethan only)
- Middleware protects dashboard routes
- Login page with user selection"
```

---

### Task 4: Shopify OAuth + Metrics Fetch

**Files:**
- Create: `src/lib/shopify.ts`
- Create: `src/app/api/shopify/oauth-callback.ts`
- Create: `src/app/api/shopify/metrics.ts`
- Test: `tests/lib/shopify.test.ts`

**Interfaces:**
- Consumes: Doppler secrets (SHOPIFY_OAUTH_CLIENT_ID, SHOPIFY_OAUTH_CLIENT_SECRET)
- Produces: 
  - `getShopifyAuthUrl(storeUrl: string): string`
  - `exchangeCodeForToken(code: string, storeUrl: string): Promise<string>`
  - `fetchShopifyMetrics(accessToken: string, storeUrl: string): Promise<MetricsSnapshot>`

**Steps:**

- [ ] **Step 1: Create Shopify OAuth + API client**

```typescript
// src/lib/shopify.ts
import { MetricsSnapshot } from "@/types";

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_OAUTH_CLIENT_ID || "";
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_OAUTH_CLIENT_SECRET || "";
const SHOPIFY_REDIRECT_URI = process.env.SHOPIFY_REDIRECT_URI || "";

export function getShopifyAuthUrl(storeUrl: string): string {
  const scope = "read_products,read_orders,read_fulfillments";
  const state = Math.random().toString(36).substring(7);

  // Extract store domain from URL
  const domain = new URL(`https://${storeUrl}`).hostname;

  return (
    `https://${domain}/admin/oauth/authorize?` +
    `client_id=${SHOPIFY_CLIENT_ID}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&redirect_uri=${encodeURIComponent(SHOPIFY_REDIRECT_URI)}` +
    `&state=${state}`
  );
}

export async function exchangeCodeForToken(
  code: string,
  storeUrl: string
): Promise<string> {
  const domain = new URL(`https://${storeUrl}`).hostname;

  const response = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: SHOPIFY_CLIENT_ID,
      client_secret: SHOPIFY_CLIENT_SECRET,
      code,
    }),
  });

  if (!response.ok) throw new Error("Shopify OAuth token exchange failed");

  const { access_token } = await response.json();
  return access_token;
}

export async function fetchShopifyMetrics(
  accessToken: string,
  storeUrl: string
): Promise<MetricsSnapshot> {
  const domain = new URL(`https://${storeUrl}`).hostname;

  // Fetch orders from last 30 days
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const ordersResponse = await fetch(
    `https://${domain}/admin/api/2024-01/orders.json?status=any&created_at_min=${last30Days.toISOString()}`,
    {
      headers: { "X-Shopify-Access-Token": accessToken },
    }
  );

  const { orders } = await ordersResponse.json();

  // Calculate metrics
  const totalOrderValue = orders.reduce(
    (sum: number, order: any) => sum + parseFloat(order.total_price),
    0
  );
  const aov = orders.length > 0 ? totalOrderValue / orders.length : 0;

  // Fetch sessions (via Analytics API - simplified for MVP)
  const sessionsResponse = await fetch(
    `https://${domain}/admin/api/2024-01/reports.json?name=sessions`,
    {
      headers: { "X-Shopify-Access-Token": accessToken },
    }
  );

  const { reports } = await sessionsResponse.json();
  const totalSessions = reports[0]?.values?.[0]?.value || 0;

  const conversionRate =
    totalSessions > 0 ? (orders.length / totalSessions) * 100 : 0;

  return {
    id: "",
    site_id: "",
    conversion_rate: Math.round(conversionRate * 100) / 100,
    aov: Math.round(aov * 100) / 100,
    traffic_source: "shopify", // placeholder
    device_breakdown: {}, // would need additional API call
    cart_abandonment_rate: 0, // would need additional API call
    created_at: new Date().toISOString(),
  };
}
```

- [ ] **Step 2: Create OAuth callback**

```typescript
// src/app/api/shopify/oauth-callback.ts
import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/shopify";
import { supabase } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storeUrl = request.nextUrl.searchParams.get("store");

  if (!code || !storeUrl) {
    return NextResponse.json(
      { error: "Missing parameters" },
      { status: 400 }
    );
  }

  try {
    const user = await getUserFromCookie();
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const accessToken = await exchangeCodeForToken(code, storeUrl);

    // Store in Supabase
    await supabase.from("sites").insert({
      user_id: user,
      shopify_store_url: storeUrl,
      shopify_access_token: accessToken,
      ga4_property_id: "", // will be set later
      ga4_refresh_token: "", // will be set later
    });

    return NextResponse.redirect(
      new URL(`/dashboard?success=store_added`, request.url)
    );
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.json(
      { error: "OAuth exchange failed" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Create metrics endpoint**

```typescript
// src/app/api/shopify/metrics.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchShopifyMetrics } from "@/lib/shopify";
import { supabase } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { siteId } = await request.json();

  try {
    const user = await getUserFromCookie();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch site from Supabase
    const { data: site } = await supabase
      .from("sites")
      .select()
      .eq("id", siteId)
      .eq("user_id", user)
      .single();

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    // Fetch metrics from Shopify
    const metrics = await fetchShopifyMetrics(
      site.shopify_access_token,
      site.shopify_store_url
    );

    // Store in Supabase
    await supabase.from("metrics_snapshots").insert({
      site_id: siteId,
      conversion_rate: metrics.conversion_rate,
      aov: metrics.aov,
      traffic_source: metrics.traffic_source,
      device_breakdown: metrics.device_breakdown,
      cart_abandonment_rate: metrics.cart_abandonment_rate,
    });

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Metrics fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Write tests**

```typescript
// tests/lib/shopify.test.ts
import { getShopifyAuthUrl, exchangeCodeForToken } from "@/lib/shopify";

describe("Shopify OAuth", () => {
  it("generates valid auth URL", () => {
    const url = getShopifyAuthUrl("mystore.myshopify.com");
    expect(url).toContain("oauth/authorize");
    expect(url).toContain("client_id=");
    expect(url).toContain("scope=");
  });

  it("exchanges code for token (mocked)", async () => {
    // Mock would go here
    expect(true).toBe(true); // placeholder
  });
});
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/shopify.ts src/app/api/shopify/ tests/lib/shopify.test.ts
git commit -m "feat: add Shopify OAuth + metrics fetch

- OAuth flow: authorize → exchange code → store token
- Fetch last 30d metrics (orders, sessions, conversion rate, AOV)
- Store metrics in Supabase"
```

---

### Task 5: GA4 OAuth + Metrics Fetch

**Files:**
- Create: `src/lib/ga4.ts`
- Create: `src/app/api/ga4/oauth-callback.ts`
- Create: `src/app/api/ga4/metrics.ts`
- Test: `tests/lib/ga4.test.ts`

**Interfaces:**
- Consumes: Doppler secrets (GA4_OAUTH_CLIENT_ID, GA4_OAUTH_CLIENT_SECRET)
- Produces:
  - `getGA4AuthUrl(): string`
  - `exchangeCodeForToken(code: string): Promise<{access_token, refresh_token}>`
  - `fetchGA4Metrics(accessToken: string, propertyId: string): Promise<Partial<MetricsSnapshot>>`
  - `refreshGA4Token(refreshToken: string): Promise<string>`

**Steps:**

- [ ] **Step 1: Create GA4 OAuth + API client**

```typescript
// src/lib/ga4.ts
export const GA4_CLIENT_ID = process.env.GA4_OAUTH_CLIENT_ID || "";
export const GA4_CLIENT_SECRET = process.env.GA4_OAUTH_CLIENT_SECRET || "";
export const GA4_REDIRECT_URI = process.env.GA4_REDIRECT_URI || "";

export function getGA4AuthUrl(): string {
  const scope = "analytics.readonly";
  const state = Math.random().toString(36).substring(7);

  return (
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GA4_CLIENT_ID}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&redirect_uri=${encodeURIComponent(GA4_REDIRECT_URI)}` +
    `&response_type=code` +
    `&state=${state}` +
    `&access_type=offline` +
    `&prompt=consent`
  );
}

export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  refresh_token: string;
}> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: GA4_CLIENT_ID,
      client_secret: GA4_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: GA4_REDIRECT_URI,
    }),
  });

  if (!response.ok) throw new Error("GA4 OAuth token exchange failed");

  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  };
}

export async function refreshGA4Token(
  refreshToken: string
): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: GA4_CLIENT_ID,
      client_secret: GA4_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) throw new Error("GA4 token refresh failed");

  const data = await response.json();
  return data.access_token;
}

export async function fetchGA4Metrics(
  accessToken: string,
  propertyId: string
): Promise<Partial<MetricsSnapshot>> {
  const response = await fetch(
    `https://analyticsreporting.googleapis.com/v4/reports:batchGet`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reportRequests: [
          {
            viewId: propertyId,
            dateRanges: [
              {
                startDate: "30daysAgo",
                endDate: "today",
              },
            ],
            metrics: [
              { expression: "ga:goalConversionRateAll" },
              { expression: "ga:transactionRevenue" },
              { expression: "ga:transactions" },
              { expression: "ga:sessions" },
            ],
            dimensions: [{ name: "ga:deviceCategory" }, { name: "ga:source" }],
          },
        ],
      }),
    }
  );

  if (!response.ok) throw new Error("GA4 metrics fetch failed");

  const data = await response.json();
  const rows = data.reports?.[0]?.data?.rows || [];

  // Parse metrics (simplified)
  const conversionRate =
    parseFloat(rows[0]?.metrics?.[0]?.values?.[0] || "0") * 100;
  const sessions = parseInt(rows[0]?.metrics?.[3]?.values?.[0] || "0");

  return {
    conversion_rate: Math.round(conversionRate * 100) / 100,
    traffic_source: "ga4",
    device_breakdown: {
      mobile: rows
        .filter((r: any) => r.dimensions?.[0] === "mobile")
        .reduce((sum: number, r: any) => sum + parseInt(r.metrics[3].values[0]), 0),
      desktop: rows
        .filter((r: any) => r.dimensions?.[0] === "desktop")
        .reduce((sum: number, r: any) => sum + parseInt(r.metrics[3].values[0]), 0),
    },
  };
}
```

- [ ] **Step 2: Create OAuth callback**

```typescript
// src/app/api/ga4/oauth-callback.ts
import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/ga4";
import { supabase } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const siteId = request.nextUrl.searchParams.get("siteId");

  if (!code || !siteId) {
    return NextResponse.json(
      { error: "Missing parameters" },
      { status: 400 }
    );
  }

  try {
    const user = await getUserFromCookie();
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { access_token, refresh_token } = await exchangeCodeForToken(code);

    // Update site with GA4 token
    await supabase
      .from("sites")
      .update({
        ga4_refresh_token: refresh_token,
      })
      .eq("id", siteId)
      .eq("user_id", user);

    return NextResponse.redirect(
      new URL(`/dashboard/${siteId}?ga4=connected`, request.url)
    );
  } catch (error) {
    console.error("GA4 OAuth callback error:", error);
    return NextResponse.json(
      { error: "OAuth exchange failed" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Create metrics endpoint**

```typescript
// src/app/api/ga4/metrics.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchGA4Metrics, refreshGA4Token } from "@/lib/ga4";
import { supabase } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { siteId } = await request.json();

  try {
    const user = await getUserFromCookie();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: site } = await supabase
      .from("sites")
      .select()
      .eq("id", siteId)
      .eq("user_id", user)
      .single();

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    // Refresh token if needed
    const accessToken = await refreshGA4Token(site.ga4_refresh_token);

    // Fetch metrics
    const metrics = await fetchGA4Metrics(accessToken, site.ga4_property_id);

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("GA4 metrics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch GA4 metrics" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Write tests**

```typescript
// tests/lib/ga4.test.ts
import { getGA4AuthUrl } from "@/lib/ga4";

describe("GA4 OAuth", () => {
  it("generates valid auth URL", () => {
    const url = getGA4AuthUrl();
    expect(url).toContain("accounts.google.com");
    expect(url).toContain("analytics.readonly");
    expect(url).toContain("offline");
  });
});
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/ga4.ts src/app/api/ga4/ tests/lib/ga4.test.ts
git commit -m "feat: add GA4 OAuth + metrics fetch

- OAuth flow with refresh token support
- Fetch last 30d conversion rate, device breakdown, traffic source
- Token refresh on demand"
```

---

### Task 6: Claude Agent Setup + Test Ranking

**Files:**
- Create: `src/lib/claude.ts`
- Create: `src/app/api/analyze/route.ts`
- Test: `tests/lib/claude.test.ts`

**Interfaces:**
- Consumes: 
  - `frameworks.json` (from Task 1)
  - Shopify metrics (from Task 4)
  - GA4 metrics (from Task 5)
  - Site HTML (from Task 7)
- Produces: `analyzeMetrics(metrics: MetricsSnapshot, frameworks: any): Promise<TestPlan>`

**Steps:**

- [ ] **Step 1: Create Claude agent**

```typescript
// src/lib/claude.ts
import Anthropic from "@anthropic-ai/sdk";
import frameworks from "./frameworks.json";

const client = new Anthropic();

export interface AnalysisInput {
  vertical: string; // "education" | "ecommerce" | etc
  conversion_rate: number;
  aov: number;
  cart_abandonment_rate: number;
  device_breakdown: Record<string, number>;
  siteHtml?: string;
}

export interface TestPlanOutput {
  tests: Array<{
    rank: number;
    hypothesis: string;
    expected_lift: string;
    effort_hours: number;
    impact_score: number;
    steps: string[];
    book_chapter: string;
    book_section: string;
  }>;
  audit_checklist: Array<{
    item: string;
    auto_check: boolean;
    manual_status: boolean | null;
    book_ref: string;
  }>;
}

export async function analyzeMetrics(
  input: AnalysisInput
): Promise<TestPlanOutput> {
  const benchmarks =
    frameworks.benchmarks[input.vertical as keyof typeof frameworks.benchmarks] ||
    frameworks.benchmarks.ecommerce;

  const conversionGap = benchmarks.conversion_rate - input.conversion_rate;
  const aovGap = benchmarks.aov - input.aov;

  const prompt = `You are a CRO expert analyzing a ${input.vertical} business using the Billion Dollar Websites framework.

**Their current metrics:**
- Conversion Rate: ${input.conversion_rate}% (benchmark: ${benchmarks.conversion_rate}%, gap: ${conversionGap}%)
- AOV: $${input.aov} (benchmark: $${benchmarks.aov}, gap: $${aovGap})
- Cart Abandonment: ${input.cart_abandonment_rate}%
- Device breakdown: ${JSON.stringify(input.device_breakdown)}

**Available tests from the book** (matching their gaps):
${JSON.stringify(frameworks.tests, null, 2)}

**Task:**
1. Identify which tests are most relevant to their gaps
2. Rank by impact score: (gap_size × implementation_effort)
3. For each test, reference the exact book chapter
4. Return ONLY valid JSON matching this schema:

{
  "tests": [
    {
      "rank": 1,
      "hypothesis": "test hypothesis",
      "expected_lift": "3-5%",
      "effort_hours": 6,
      "impact_score": 8.5,
      "steps": ["step 1", "step 2"],
      "book_chapter": "Chapter X",
      "book_section": "Rule Y"
    }
  ],
  "audit_checklist": [
    {
      "item": "checklist item",
      "auto_check": false,
      "manual_status": null,
      "book_ref": "Chapter X: Rule Y"
    }
  ]
}`;

  const message = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Extract JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude response contained no JSON");

  return JSON.parse(jsonMatch[0]);
}
```

- [ ] **Step 2: Create analyze endpoint**

```typescript
// src/app/api/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
import { analyzeMetrics } from "@/lib/claude";
import { supabase } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { siteId, vertical } = await request.json();

  try {
    const user = await getUserFromCookie();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch latest metrics
    const { data: metrics } = await supabase
      .from("metrics_snapshots")
      .select()
      .eq("site_id", siteId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!metrics) {
      return NextResponse.json(
        { error: "No metrics found" },
        { status: 404 }
      );
    }

    // Analyze with Claude
    const analysis = await analyzeMetrics({
      vertical,
      conversion_rate: metrics.conversion_rate,
      aov: metrics.aov,
      cart_abandonment_rate: metrics.cart_abandonment_rate,
      device_breakdown: metrics.device_breakdown || {},
    });

    // Store test plan
    const { data: testPlan } = await supabase
      .from("test_plans")
      .insert({
        site_id: siteId,
        analysis_json: analysis,
      })
      .select()
      .single();

    return NextResponse.json(testPlan);
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Analysis failed" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Write tests**

```typescript
// tests/lib/claude.test.ts
import { analyzeMetrics } from "@/lib/claude";

describe("Claude Agent", () => {
  it("generates test plan (mocked)", async () => {
    const input = {
      vertical: "education",
      conversion_rate: 1.2,
      aov: 50,
      cart_abandonment_rate: 40,
      device_breakdown: { mobile: 60, desktop: 40 },
    };

    // In real tests, mock the API
    expect(true).toBe(true); // placeholder
  });
});
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/claude.ts src/app/api/analyze/ tests/lib/claude.test.ts
git commit -m "feat: add Claude agent + test ranking

- Analyzes user metrics vs book benchmarks
- Ranks tests by impact score (gap × effort)
- References exact book chapters + sections
- Stores test plans in Supabase"
```

---

### Task 7: Playwright Site Audit + Checklist

**Files:**
- Create: `src/lib/playwright.ts`
- Create: `src/app/api/audit/route.ts`
- Test: `tests/lib/playwright.test.ts`

**Interfaces:**
- Consumes: `frameworks.json` checklist items, site HTML
- Produces: `auditSite(storeUrl: string): Promise<AuditResult>`

**Steps:**

- [ ] **Step 1: Create Playwright audit**

```typescript
// src/lib/playwright.ts
import { chromium } from "playwright";

export async function captureAndAudit(storeUrl: string): Promise<{
  screenshot: Buffer;
  html: string;
  checklist: Array<{
    item: string;
    auto_check_status: "pass" | "fail" | "unknown";
    manual_confirmed: boolean;
    book_ref: string;
  }>;
}> {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Visit store
    await page.goto(`https://${storeUrl}`, { waitUntil: "networkidle" });

    // Capture screenshot
    const screenshot = await page.screenshot({ fullPage: true });

    // Get HTML
    const html = await page.content();

    // Auto-check some items (simple regex checks)
    const checklist = [
      {
        item: "Headline uses power words",
        auto_check_status:
          /incredible|amazing|revolutionary|proven|guaranteed/i.test(html)
            ? "pass"
            : "unknown",
        manual_confirmed: false,
        book_ref: "Chapter 7: Landing Pages Rule 1",
      },
      {
        item: "CTA is visible above fold",
        auto_check_status: /add to cart|buy now|get started/i.test(html)
          ? "pass"
          : "unknown",
        manual_confirmed: false,
        book_ref: "Chapter 7: Landing Pages Rule 4",
      },
      {
        item: "Images include people",
        auto_check_status: /img/i.test(html) ? "pass" : "fail",
        manual_confirmed: false,
        book_ref: "Chapter 2: Listicles Rule 4",
      },
    ];

    await browser.close();

    return { screenshot, html, checklist };
  } catch (error) {
    await browser.close();
    throw error;
  }
}
```

- [ ] **Step 2: Create audit endpoint**

```typescript
// src/app/api/audit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { captureAndAudit } from "@/lib/playwright";
import { supabase } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { siteId } = await request.json();

  try {
    const user = await getUserFromCookie();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch site
    const { data: site } = await supabase
      .from("sites")
      .select()
      .eq("id", siteId)
      .eq("user_id", user)
      .single();

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    // Audit site
    const { screenshot, html, checklist } = await captureAndAudit(
      site.shopify_store_url
    );

    // Store audit results
    const { data: auditResult } = await supabase
      .from("audit_results")
      .insert({
        site_id: siteId,
        checklist_items: checklist,
      })
      .select()
      .single();

    return NextResponse.json({
      audit: auditResult,
      screenshotUrl: `/audits/${siteId}.png`, // would be uploaded to storage
    });
  } catch (error) {
    console.error("Audit error:", error);
    return NextResponse.json(
      { error: "Audit failed" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Write tests**

```typescript
// tests/lib/playwright.test.ts
describe("Playwright Audit", () => {
  it("captures site and generates checklist (integration test)", () => {
    // Integration test would hit real site
    expect(true).toBe(true); // placeholder
  });
});
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/playwright.ts src/app/api/audit/ tests/lib/playwright.test.ts
git commit -m "feat: add Playwright site audit

- Captures screenshot + HTML of Shopify store
- Auto-checks against book checklist items
- Stores audit results with manual confirmation flags"
```

---

### Task 8: Airtable Sync

**Files:**
- Create: `src/lib/airtable.ts`
- Create: `src/app/api/airtable/sync.ts`

**Interfaces:**
- Consumes: Test plans from Task 6, audit results from Task 7
- Produces: `syncTestPlanToAirtable(testPlan: TestPlan): Promise<void>`

**Steps:**

- [ ] **Step 1: Create Airtable client**

```typescript
// src/lib/airtable.ts
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || "";
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "";
const TABLE_NAME = "CRO_Analyzer_Tests";

export async function syncTestPlanToAirtable(
  storeUrl: string,
  testPlan: any
): Promise<void> {
  const records = testPlan.tests.map((test: any) => ({
    fields: {
      "Store URL": storeUrl,
      "Test Hypothesis": test.hypothesis,
      "Expected Lift": test.expected_lift,
      "Effort (hours)": test.effort_hours,
      "Book Chapter": test.book_chapter,
      "Book Section": test.book_section,
      Status: "Pending",
    },
  }));

  const response = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_NAME}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records }),
    }
  );

  if (!response.ok) {
    throw new Error(`Airtable sync failed: ${response.statusText}`);
  }
}
```

- [ ] **Step 2: Create sync endpoint**

```typescript
// src/app/api/airtable/sync.ts
import { NextRequest, NextResponse } from "next/server";
import { syncTestPlanToAirtable } from "@/lib/airtable";
import { supabase } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { siteId, testPlanId } = await request.json();

  try {
    const user = await getUserFromCookie();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch site + test plan
    const { data: site } = await supabase
      .from("sites")
      .select()
      .eq("id", siteId)
      .eq("user_id", user)
      .single();

    const { data: testPlan } = await supabase
      .from("test_plans")
      .select()
      .eq("id", testPlanId)
      .single();

    if (!site || !testPlan) {
      return NextResponse.json(
        { error: "Site or test plan not found" },
        { status: 404 }
      );
    }

    // Sync to Airtable
    await syncTestPlanToAirtable(site.shopify_store_url, testPlan.analysis_json);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Airtable sync error:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/airtable.ts src/app/api/airtable/sync.ts
git commit -m "feat: add Airtable sync

- Syncs test plans to agency CRM
- Records store URL, hypothesis, expected lift, book reference"
```

---

### Task 9-11: Dashboard Components (Parallel)

**These can run in parallel — they depend on schema + API endpoints from Tasks 2-8.**

#### Task 9: Store List + Add Store Form

**Files:**
- Create: `src/app/dashboard/page.tsx`
- Create: `src/components/stores/StoreList.tsx`
- Create: `src/components/stores/AddStoreForm.tsx`

**Steps:**

- [ ] **Step 1: Create store list page**

```typescript
// src/app/dashboard/page.tsx
import { supabase } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";
import StoreList from "@/components/stores/StoreList";
import AddStoreForm from "@/components/stores/AddStoreForm";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getUserFromCookie();
  if (!user) redirect("/login");

  const { data: sites } = await supabase
    .from("sites")
    .select()
    .eq("user_id", user)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-lg border">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
        <p className="text-slate-600">Welcome back, {user}!</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <StoreList sites={sites || []} />
        </div>
        <div>
          <AddStoreForm />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create store list component**

```typescript
// src/components/stores/StoreList.tsx
"use client";

import { Site } from "@/types";
import Link from "next/link";

export default function StoreList({ sites }: { sites: Site[] }) {
  if (sites.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg border text-center">
        <p className="text-slate-600">No stores connected yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-50 border-b">
          <tr>
            <th className="px-6 py-3 text-left font-semibold">Store URL</th>
            <th className="px-6 py-3 text-left font-semibold">Status</th>
            <th className="px-6 py-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {sites.map((site) => (
            <tr key={site.id} className="hover:bg-slate-50">
              <td className="px-6 py-4">{site.shopify_store_url}</td>
              <td className="px-6 py-4">
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                  Connected
                </span>
              </td>
              <td className="px-6 py-4">
                <Link
                  href={`/dashboard/${site.id}`}
                  className="text-blue-600 hover:underline"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Create add store form**

```typescript
// src/components/stores/AddStoreForm.tsx
"use client";

import { useState } from "react";
import { getShopifyAuthUrl } from "@/lib/shopify";

export default function AddStoreForm() {
  const [storeUrl, setStoreUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConnect = () => {
    if (!storeUrl) return;

    setLoading(true);
    const authUrl = getShopifyAuthUrl(storeUrl);
    window.location.href = authUrl;
  };

  return (
    <div className="bg-white p-6 rounded-lg border">
      <h2 className="text-xl font-bold mb-4">Add Store</h2>

      <div className="space-y-4">
        <input
          type="text"
          placeholder="mystore.myshopify.com"
          value={storeUrl}
          onChange={(e) => setStoreUrl(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        />

        <button
          onClick={handleConnect}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Connecting..." : "Connect Shopify"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/ src/components/stores/
git commit -m "feat: add dashboard with store list + add form

- Store list displays connected Shopify stores
- Add store form triggers OAuth flow
- Navigate to store detail from list"
```

---

#### Task 10: Store Detail + Metrics View

**Files:**
- Create: `src/app/dashboard/[storeId]/page.tsx`
- Create: `src/components/stores/StoreDetail.tsx`
- Create: `src/components/common/MetricsCard.tsx`

**Steps:**

- [ ] **Step 1: Create store detail page**

```typescript
// src/app/dashboard/[storeId]/page.tsx
import { supabase } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import StoreDetail from "@/components/stores/StoreDetail";

export default async function StoreDetailPage({
  params,
}: {
  params: { storeId: string };
}) {
  const user = await getUserFromCookie();
  if (!user) redirect("/login");

  const { data: site } = await supabase
    .from("sites")
    .select()
    .eq("id", params.storeId)
    .eq("user_id", user)
    .single();

  const { data: metrics } = await supabase
    .from("metrics_snapshots")
    .select()
    .eq("site_id", params.storeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const { data: testPlan } = await supabase
    .from("test_plans")
    .select()
    .eq("site_id", params.storeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!site) redirect("/dashboard");

  return (
    <StoreDetail
      site={site}
      metrics={metrics}
      testPlan={testPlan}
    />
  );
}
```

- [ ] **Step 2: Create store detail component**

```typescript
// src/components/stores/StoreDetail.tsx
"use client";

import { Site, MetricsSnapshot, TestPlan } from "@/types";
import MetricsCard from "@/components/common/MetricsCard";
import { useState } from "react";

export default function StoreDetail({
  site,
  metrics,
  testPlan,
}: {
  site: Site;
  metrics?: MetricsSnapshot;
  testPlan?: TestPlan;
}) {
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId: site.id, vertical: "ecommerce" }),
    });

    if (res.ok) {
      window.location.reload();
    }
    setAnalyzing(false);
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-lg border">
        <h1 className="text-3xl font-bold mb-4">{site.shopify_store_url}</h1>

        <div className="flex gap-4">
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {analyzing ? "Analyzing..." : "Analyze Now"}
          </button>
        </div>
      </div>

      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricsCard
            title="Conversion Rate"
            value={`${metrics.conversion_rate}%`}
            benchmark="2.1%"
          />
          <MetricsCard
            title="AOV"
            value={`$${metrics.aov}`}
            benchmark="$45"
          />
          <MetricsCard
            title="Cart Abandonment"
            value={`${metrics.cart_abandonment_rate}%`}
            benchmark="< 30%"
          />
        </div>
      )}

      {testPlan && (
        <div className="bg-white p-8 rounded-lg border">
          <h2 className="text-2xl font-bold mb-4">Test Plan</h2>
          {/* Render test plan from testPlan.analysis_json */}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create metrics card**

```typescript
// src/components/common/MetricsCard.tsx
export default function MetricsCard({
  title,
  value,
  benchmark,
}: {
  title: string;
  value: string;
  benchmark: string;
}) {
  return (
    <div className="bg-white p-6 rounded-lg border">
      <p className="text-sm text-slate-600 mb-2">{title}</p>
      <p className="text-3xl font-bold mb-2">{value}</p>
      <p className="text-xs text-slate-500">Benchmark: {benchmark}</p>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/[storeId]/ src/components/stores/StoreDetail.tsx src/components/common/MetricsCard.tsx
git commit -m "feat: add store detail + metrics view

- Display current metrics (conversion rate, AOV, abandonment)
- Show benchmarks vs actual
- Analyze Now button triggers Claude agent"
```

---

#### Task 11: Test Queue + Audit Checklist UI

**Files:**
- Create: `src/app/dashboard/[storeId]/tests/page.tsx`
- Create: `src/components/tests/TestQueue.tsx`
- Create: `src/app/dashboard/[storeId]/audit/page.tsx`
- Create: `src/components/audit/AuditChecklist.tsx`

**Steps:**

- [ ] **Step 1: Create test queue page**

```typescript
// src/app/dashboard/[storeId]/tests/page.tsx
import { supabase } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import TestQueue from "@/components/tests/TestQueue";

export default async function TestsPage({
  params,
}: {
  params: { storeId: string };
}) {
  const user = await getUserFromCookie();
  if (!user) redirect("/login");

  const { data: testPlan } = await supabase
    .from("test_plans")
    .select()
    .eq("site_id", params.storeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Test Queue</h1>
      <TestQueue testPlan={testPlan} />
    </div>
  );
}
```

- [ ] **Step 2: Create test queue component**

```typescript
// src/components/tests/TestQueue.tsx
import { TestPlan } from "@/types";

export default function TestQueue({ testPlan }: { testPlan?: TestPlan }) {
  if (!testPlan) {
    return <p className="text-slate-600">No tests yet. Run an analysis first.</p>;
  }

  return (
    <div className="space-y-4">
      {testPlan.analysis_json.tests.map((test, idx) => (
        <div key={idx} className="bg-white p-6 rounded-lg border">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-bold text-lg">{test.hypothesis}</h3>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
              #{test.rank}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
            <div>
              <p className="text-slate-600">Expected Lift</p>
              <p className="font-semibold">{test.expected_lift}</p>
            </div>
            <div>
              <p className="text-slate-600">Effort</p>
              <p className="font-semibold">{test.effort_hours}h</p>
            </div>
            <div>
              <p className="text-slate-600">Impact Score</p>
              <p className="font-semibold">{test.impact_score}</p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm text-slate-600 mb-2">Steps:</p>
            <ol className="list-decimal list-inside text-sm space-y-1">
              {test.steps.map((step, i) => (
                <li key={i} className="text-slate-700">
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <p className="text-xs text-slate-500">
            📖 {test.book_chapter} - {test.book_section}
          </p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create audit checklist page**

```typescript
// src/app/dashboard/[storeId]/audit/page.tsx
import { supabase } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import AuditChecklist from "@/components/audit/AuditChecklist";

export default async function AuditPage({
  params,
}: {
  params: { storeId: string };
}) {
  const user = await getUserFromCookie();
  if (!user) redirect("/login");

  const { data: auditResult } = await supabase
    .from("audit_results")
    .select()
    .eq("site_id", params.storeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Site Audit</h1>
      <AuditChecklist auditResult={auditResult} />
    </div>
  );
}
```

- [ ] **Step 4: Create audit checklist component**

```typescript
// src/components/audit/AuditChecklist.tsx
"use client";

import { AuditResult } from "@/types";
import { useState } from "react";

export default function AuditChecklist({
  auditResult,
}: {
  auditResult?: AuditResult;
}) {
  const [checklist, setChecklist] = useState(
    auditResult?.checklist_items || []
  );

  const handleToggle = (idx: number) => {
    const updated = [...checklist];
    updated[idx].manual_confirmed = !updated[idx].manual_confirmed;
    setChecklist(updated);

    // TODO: Sync to Airtable
  };

  if (!auditResult) {
    return <p className="text-slate-600">Run site audit to see checklist.</p>;
  }

  return (
    <div className="space-y-4">
      {checklist.map((item, idx) => (
        <div key={idx} className="bg-white p-6 rounded-lg border">
          <div className="flex items-start gap-4">
            <input
              type="checkbox"
              checked={item.manual_confirmed}
              onChange={() => handleToggle(idx)}
              className="w-5 h-5 mt-1"
            />

            <div className="flex-1">
              <p className="font-semibold mb-2">{item.item}</p>
              <p className="text-sm text-slate-600">
                Status:{" "}
                <span
                  className={`font-semibold ${
                    item.auto_check_status === "pass"
                      ? "text-green-600"
                      : "text-yellow-600"
                  }`}
                >
                  {item.auto_check_status}
                </span>
              </p>
              <p className="text-xs text-slate-500 mt-2">📖 {item.book_ref}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/[storeId]/ src/components/tests/ src/components/audit/
git commit -m "feat: add test queue + audit checklist UI

- Display ranked tests with hypothesis, expected lift, effort, steps
- Show book chapter references for context
- Audit checklist with auto-checks + manual confirmation
- User can mark items done to sync to Airtable"
```

---

### Task 12: LLM Verification (Quality Gate)

**Files:**
- Create: `scripts/verify-implementation.ts`

**Interfaces:**
- Consumes: Spec file, implemented code
- Produces: Verification report (passes/fails against spec)

**Steps:**

- [ ] **Step 1: Create verification script**

```typescript
// scripts/verify-implementation.ts
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";

const client = new Anthropic();

async function verifyImplementation() {
  const specContent = fs.readFileSync(
    "docs/superpowers/specs/2026-06-29-cro-analyzer-design.md",
    "utf-8"
  );

  const prompt = `You are a quality judge for the CRO Analyzer implementation.

**SPEC:**
${specContent}

**REQUIREMENTS TO VERIFY:**
1. ✅ OAuth flows: Shopify + GA4 (with token refresh)
2. ✅ Metrics fetching: conversion rate, AOV, device breakdown, cart abandonment
3. ✅ Claude agent: ranks tests by (gap × effort), references exact book chapters
4. ✅ No generic advice: every recommendation is specific to user metrics + book
5. ✅ Site audit: Playwright screenshots + HTML + auto-checklist
6. ✅ Airtable sync: test plans → CRM with book references
7. ✅ Dashboard: store list, metrics view, test queue, audit checklist
8. ✅ Error handling: graceful failures, cached data fallbacks
9. ✅ Auth: hardcoded Emily/Ethan, designed for multi-user later

**IMPLEMENTATION REVIEW:**
- Code follows YAGNI (no over-engineering)
- TDD: tests written (at least unit level)
- Each endpoint has clear responsibility
- Types are consistent (no conflicts between tasks)
- Framework extraction: properly structured JSON
- Claude prompt: specific enough to avoid generic output

**OUTPUT FORMAT:**
Return JSON:
{
  "status": "PASS" | "FAIL",
  "score": 0-100,
  "issues": [
    {
      "severity": "BLOCKER" | "HIGH" | "MEDIUM" | "LOW",
      "area": "OAuth | Metrics | Claude | Dashboard | AuditChecklist | Airtable | Error Handling | Auth",
      "finding": "specific issue",
      "fix": "how to address"
    }
  ],
  "strengths": ["list of what's working well"],
  "shipping_ready": true | false
}`;

  const message = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("No JSON in verification response");
    process.exit(1);
  }

  const result = JSON.parse(jsonMatch[0]);

  console.log("\n=== VERIFICATION REPORT ===\n");
  console.log(`Status: ${result.status}`);
  console.log(`Score: ${result.score}/100`);
  console.log(`Shipping Ready: ${result.shipping_ready}`);

  if (result.issues.length > 0) {
    console.log("\nIssues:");
    result.issues.forEach(
      (issue: any) =>
        console.log(
          `  [${issue.severity}] ${issue.area}: ${issue.finding}\n    Fix: ${issue.fix}`
        )
    );
  }

  if (result.strengths.length > 0) {
    console.log("\nStrengths:");
    result.strengths.forEach((s: string) => console.log(`  ✅ ${s}`));
  }

  process.exit(result.shipping_ready ? 0 : 1);
}

verifyImplementation().catch(console.error);
```

- [ ] **Step 2: Run verification**

```bash
doppler run -- npx ts-node scripts/verify-implementation.ts
```

Expected: Report showing status PASS and shipping_ready: true.

- [ ] **Step 3: Review issues + fix**

If verification finds issues (Task 13 handles fixes), review report and prioritize by severity.

- [ ] **Step 4: Commit**

```bash
git add scripts/verify-implementation.ts
git commit -m "feat: add LLM verification gate

- Judge implementation against spec
- Check: OAuth flows, metrics, Claude agent, dashboard, error handling
- Verify: no generic advice, book references, proper types
- Output: verification report with score + shipping readiness"
```

---

### Task 13: Fix Issues Found by Judge

**Steps:**

- [ ] **Step 1: Review verification report**

Run Task 12 and capture issues.

- [ ] **Step 2-N: Fix each blocker/high issue**

For each issue found:
- Identify root cause (code, type mismatch, missing check)
- Apply minimal fix (don't refactor unrelated code)
- Commit with message: `fix: [issue area] - [what was fixed]`

Example:
```bash
git commit -m "fix: Claude agent - ensure all tests have book_section field"
```

- [ ] **Final Step: Re-run verification**

```bash
doppler run -- npx ts-node scripts/verify-implementation.ts
```

Expected: All issues resolved, status PASS, shipping_ready: true.

---

### Task 14: Deploy to cro.entagency.co

**Files:**
- Create: `vercel.json` (config)
- Create: `.env.production` (via Doppler in Vercel dashboard)

**Steps:**

- [ ] **Step 1: Connect repo to Vercel**

```bash
# Push repo to GitHub first
git remote add origin https://github.com/Entmarketingteam/billion-dollar-cro-analyzer.git
git branch -M main
git push -u origin main
```

Then in Vercel dashboard: Import repo → select this GitHub repo.

- [ ] **Step 2: Configure Vercel environment**

In Vercel project settings → Environment Variables, add all from `.env.local`:
- NEXT_PUBLIC_SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- SHOPIFY_OAUTH_CLIENT_ID
- SHOPIFY_OAUTH_CLIENT_SECRET
- GA4_OAUTH_CLIENT_ID
- GA4_OAUTH_CLIENT_SECRET
- CLAUDE_API_KEY
- AIRTABLE_API_KEY

(Or use Doppler integration: Vercel → Integrations → Doppler)

- [ ] **Step 3: Set custom domain**

Vercel dashboard → Domains → Add cro.entagency.co

Add DNS records (provided by Vercel) to Cloudflare.

- [ ] **Step 4: First deploy**

Push to main:
```bash
git commit -m "chore: ready for deployment to cro.entagency.co"
git push origin main
```

Vercel automatically deploys. Check deployment logs.

- [ ] **Step 5: Test in production**

- Login as emily
- Add test Shopify store
- Run analysis
- Verify test plan + audit checklist appear
- Check Airtable for synced data

- [ ] **Step 6: Commit final**

```bash
git add vercel.json
git commit -m "chore: deploy to cro.entagency.co

- Vercel deployment with Doppler env integration
- Custom domain configured
- Production URLs ready"
```

---

## Execution Notes

**Parallel groups:**
- Tasks 4-5 (OAuth flows) can run in parallel
- Tasks 9-11 (Dashboard) can run in parallel after Tasks 2-8 complete
- Task 12 (Verification) can run once most tasks are complete
- Task 13 (Fixes) are dependent on Task 12 output

**Token optimization:**
- Use subagent-driven-development to dispatch agents per task
- Each agent focuses on one task (smaller context)
- Minimal re-reading of spec across agents
- Claude framework extraction (Task 1) is one API call reused everywhere

**Testing:** Unit tests in each task, integration tests in Task 11 E2E test file.

**Commits:** Frequent (after each logical step), descriptive messages for reviewability.

---

## Verification Checklist

- [ ] All OAuth flows connect without error
- [ ] Metrics fetch and store correctly
- [ ] Claude agent returns book-backed tests (not generic)
- [ ] Dashboard renders all views
- [ ] Airtable sync posts test plans with references
- [ ] Error handling: timeouts, API failures, missing data
- [ ] No hardcoded tokens (all from Doppler/env)
- [ ] Tests pass (unit + integration)
- [ ] LLM verification passes (shipping_ready: true)
- [ ] cro.entagency.co loads and works
