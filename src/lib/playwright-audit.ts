import type { AuditResult, ChecklistItem } from "@/types";

// ── Checklist categories and items ──────────────────────────

interface AuditChecklistDef {
  category: string;
  label: string;
  check: (page: any) => Promise<boolean>;
}

const AUDIT_CHECKLIST: AuditChecklistDef[] = [
  // ── Homepage ──────────────────────────────────
  {
    category: "Homepage",
    label: "Hero section has clear CTA",
    check: async (page) => {
      const cta = await page.$eval(
        "button, a[href*='checkout'], a[href*='shop']",
        (el: HTMLElement) => el?.textContent?.toLowerCase().includes("shop")
      ).catch(() => false);
      return !!cta;
    },
  },
  {
    category: "Homepage",
    label: "Products visible without scroll",
    check: async (page) => {
      const products = await page.locator("[data-testid='product'], .product")
        .count;
      return products > 0;
    },
  },
  {
    category: "Homepage",
    label: "Navigation menu accessible",
    check: async (page) => {
      const nav = await page.$eval(
        "nav, header",
        (el: HTMLElement) => el?.textContent?.length || 0
      ).catch(() => 0);
      return nav > 20;
    },
  },

  // ── Product Pages ──────────────────────────────
  {
    category: "Product Pages",
    label: "Product images load correctly",
    check: async (page) => {
      const images = await page.locator("img[src*='product'], img[alt]")
        .count;
      return images > 0;
    },
  },
  {
    category: "Product Pages",
    label: "Add to cart button prominent",
    check: async (page) => {
      const btn = await page.$eval(
        "button:has-text('Add'), button:has-text('Cart')",
        (el: HTMLElement) => {
          const styles = window.getComputedStyle(el);
          return parseInt(styles.fontSize) >= 14;
        }
      ).catch(() => false);
      return !!btn;
    },
  },
  {
    category: "Product Pages",
    label: "Product price displayed clearly",
    check: async (page) => {
      const price = await page.locator("span:has-text('$')")
        .first()
        .isVisible();
      return price;
    },
  },

  // ── Cart & Checkout ────────────────────────────
  {
    category: "Cart & Checkout",
    label: "Cart accessible from header",
    check: async (page) => {
      const cart = await page.$eval(
        "a[href*='cart'], button:has-text('Cart')",
        () => true
      ).catch(() => false);
      return !!cart;
    },
  },
  {
    category: "Cart & Checkout",
    label: "Checkout is 3 steps or fewer",
    check: async (page) => {
      const steps = await page.locator("[class*='step'], [class*='progress']")
        .count;
      return steps <= 3 || steps === 0; // 0 means not displayed/hard to find
    },
  },
  {
    category: "Cart & Checkout",
    label: "Security badges visible",
    check: async (page) => {
      const badge = await page.$eval(
        "img[src*='ssl'], img[src*='trust'], img[src*='secure']",
        () => true
      ).catch(() => false);
      return !!badge;
    },
  },

  // ── Mobile ────────────────────────────────────
  {
    category: "Mobile",
    label: "Mobile menu functional",
    check: async (page) => {
      await page.setViewportSize({ width: 375, height: 667 });
      const hamburger = await page.$eval(
        "button[class*='menu'], button[class*='hamburger']",
        () => true
      ).catch(() => false);
      return !!hamburger;
    },
  },
  {
    category: "Mobile",
    label: "Touch-friendly buttons (44px+)",
    check: async (page) => {
      await page.setViewportSize({ width: 375, height: 667 });
      const btn = await page.$eval("button", (el: HTMLElement) => {
        const rect = el.getBoundingClientRect();
        return rect.height >= 44 && rect.width >= 44;
      }).catch(() => false);
      return !!btn;
    },
  },
  {
    category: "Mobile",
    label: "Forms mobile-optimized",
    check: async (page) => {
      await page.setViewportSize({ width: 375, height: 667 });
      const input = await page.locator("input[type='text'], input[type='email']")
        .first();
      const isVisible = await input.isVisible().catch(() => false);
      return isVisible;
    },
  },

  // ── Trust & Social ────────────────────────────
  {
    category: "Trust & Social",
    label: "Customer reviews visible",
    check: async (page) => {
      const reviews = await page.$eval(
        "[class*='review'], [class*='testimonial'], [data-testid='review']",
        () => true
      ).catch(() => false);
      return !!reviews;
    },
  },
  {
    category: "Trust & Social",
    label: "Social proof/credibility indicators",
    check: async (page) => {
      const proof = await page.$eval(
        "img[alt*='award'], img[alt*='featured'], span:has-text('Trusted')",
        () => true
      ).catch(() => false);
      return !!proof;
    },
  },
  {
    category: "Trust & Social",
    label: "Social media links in footer",
    check: async (page) => {
      const socials = await page.locator(
        "a[href*='facebook'], a[href*='instagram'], a[href*='twitter']"
      ).count;
      return socials >= 1;
    },
  },

  // ── Performance ────────────────────────────────
  {
    category: "Performance",
    label: "Page loads in < 3 seconds",
    check: async (page) => {
      const metrics = await page.evaluate(() => {
        const perfData = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
        return (perfData?.loadEventEnd || 0) - (perfData?.fetchStart || 0);
      });
      return metrics < 3000;
    },
  },
  {
    category: "Performance",
    label: "Core Web Vitals: LCP < 2.5s",
    check: async (page) => {
      const lcp = await page.evaluate(() => {
        const entries = performance.getEntriesByType("largest-contentful-paint");
        return (entries[entries.length - 1]?.startTime || 0) as number;
      });
      return lcp < 2500;
    },
  },
];

// ── Audit runner ──────────────────────────────────────────

export async function runAudit(siteUrl: string): Promise<AuditResult> {
  // In production, import and use playwright/test here.
  // For demo, we'll mock the results based on checklist structure.

  const checklistItems: ChecklistItem[] = AUDIT_CHECKLIST.map(
    (item, index) => ({
      id: `check_${index}`,
      category: item.category,
      label: item.label,
      passed: Math.random() > 0.3, // Simulate 70% pass rate
      notes: null,
      screenshot_url: null,
    })
  );

  const passedChecks = checklistItems.filter((c) => c.passed).length;
  const totalChecks = checklistItems.length;
  const scorePct = Math.round((passedChecks / totalChecks) * 100);

  return {
    id: crypto.randomUUID(),
    site_id: "", // Will be set by caller
    checklist_items: checklistItems,
    total_checks: totalChecks,
    passed_checks: passedChecks,
    score_pct: scorePct,
    created_at: new Date().toISOString(),
  };
}

// ── For real implementation with Playwright ───────────────

export async function runPlaywrightAudit(
  siteUrl: string
): Promise<AuditResult> {
  // Placeholder: actual implementation would:
  // 1. import { chromium } from 'playwright';
  // 2. Launch browser with headless=true
  // 3. Navigate to siteUrl
  // 4. Run each check in AUDIT_CHECKLIST
  // 5. Take screenshots of failed checks
  // 6. Close browser
  // 7. Return AuditResult

  // For now, return mock results (same as runAudit)
  return runAudit(siteUrl);
}
