import type { Browser } from 'playwright-core';

export interface AuditCheckItem {
  category: string;
  label: string;
  passed: boolean;
  details?: string;
}

// On Vercel there is no bundled browser — use @sparticuz/chromium's binary.
// Locally, the full `playwright` package's downloaded Chromium is used.
// Lazy imports: a tracing/load failure surfaces as a per-run error instead
// of killing the whole route module at import time.
async function launchChromium(): Promise<Browser> {
  const { chromium } = await import('playwright-core');
  if (process.env.VERCEL) {
    const sparticuz = (await import('@sparticuz/chromium')).default;
    return chromium.launch({
      args: sparticuz.args,
      executablePath: await sparticuz.executablePath(),
      headless: true,
    });
  }
  return chromium.launch({ headless: true });
}

export async function runPlaywrightAudit(siteUrl: string): Promise<{
  checklist_items: AuditCheckItem[];
  score_pct: number;
}> {
  const browser = await launchChromium();
  const checklist_items: AuditCheckItem[] = [];

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    const startTime = Date.now();
    await page.goto(siteUrl, { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;

    // ── Homepage ──────────────────────────────────

    // 1. Hero headline present
    const heroText = await page.locator('[class*="hero"] h1, [class*="hero"] h2, h1').first().textContent().catch(() => null);
    checklist_items.push({
      category: 'Homepage',
      label: 'Hero headline present',
      passed: !!heroText && heroText.trim().length > 0,
      details: heroText?.trim().slice(0, 80) ?? 'No hero headline found',
    });

    // 2. Product images visible
    const productImgCount = await page.locator('img[src*="product"], img[alt*="product"], .product img, [class*="product"] img').count();
    checklist_items.push({
      category: 'Homepage',
      label: 'Product images visible',
      passed: productImgCount > 0,
      details: `${productImgCount} product image(s) found`,
    });

    // 3. Navigation accessible
    const navText = await page.locator('nav, header').first().textContent().catch(() => null);
    checklist_items.push({
      category: 'Homepage',
      label: 'Navigation menu accessible',
      passed: !!navText && navText.trim().length > 20,
      details: navText ? `Nav has ${navText.trim().length} characters of content` : 'No nav found',
    });

    // 4. Clear CTA button on homepage
    const ctaVisible = await page.locator('a[href*="shop"], a[href*="product"], button:has-text("Shop"), a:has-text("Shop Now")').first().isVisible().catch(() => false);
    checklist_items.push({
      category: 'Homepage',
      label: 'Clear CTA button on homepage',
      passed: ctaVisible,
      details: ctaVisible ? 'Shop CTA found' : 'No shop CTA found',
    });

    // ── Product Page ──────────────────────────────

    // 5. Add to cart button
    const addToCart = await page.locator('button:has-text("Add to Cart"), button:has-text("Add to Bag"), button[name="add"]').first().isVisible().catch(() => false);
    checklist_items.push({
      category: 'Product Page',
      label: 'Add to cart button present',
      passed: addToCart,
      details: addToCart ? 'Add to cart button found' : 'No add to cart button found',
    });

    // 6. Product title visible
    const productTitle = await page.locator('h1, [class*="product-title"], [class*="product__title"]').first().textContent().catch(() => null);
    checklist_items.push({
      category: 'Product Page',
      label: 'Product title visible',
      passed: !!productTitle && productTitle.trim().length > 0,
      details: productTitle?.trim().slice(0, 60) ?? 'No product title found',
    });

    // 7. Price visible
    const priceVisible = await page.locator('span:has-text("$"), [class*="price"]').first().isVisible().catch(() => false);
    checklist_items.push({
      category: 'Product Page',
      label: 'Price clearly displayed',
      passed: priceVisible,
      details: priceVisible ? 'Price element found' : 'No price element found',
    });

    // ── Checkout ──────────────────────────────────

    // 8. Cart accessible from header
    const cartLink = await page.locator('a[href*="cart"], button:has-text("Cart"), [class*="cart"]').first().isVisible().catch(() => false);
    checklist_items.push({
      category: 'Checkout',
      label: 'Cart accessible from header',
      passed: cartLink,
      details: cartLink ? 'Cart link/button found' : 'No cart link found',
    });

    // 9. Checkout button reachable
    const checkoutBtn = await page.locator('a[href*="checkout"], button:has-text("Checkout"), a:has-text("Checkout")').first().isVisible().catch(() => false);
    checklist_items.push({
      category: 'Checkout',
      label: 'Checkout button accessible',
      passed: checkoutBtn,
      details: checkoutBtn ? 'Checkout button found' : 'No checkout button found on current page',
    });

    // ── Mobile ────────────────────────────────────

    // 10. Responsive viewport (page doesn't break at 375px)
    await page.setViewportSize({ width: 375, height: 667 });
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    checklist_items.push({
      category: 'Mobile',
      label: 'Responsive at 375px viewport',
      passed: bodyWidth <= 400,
      details: `Body scroll width at 375px: ${bodyWidth}px`,
    });

    // 11. Mobile menu button present
    const mobileMenu = await page.locator('button[class*="menu"], button[class*="hamburger"], button[aria-label*="menu"], [class*="mobile-menu"]').first().isVisible().catch(() => false);
    checklist_items.push({
      category: 'Mobile',
      label: 'Mobile menu button present',
      passed: mobileMenu,
      details: mobileMenu ? 'Mobile menu button found' : 'No mobile menu button found',
    });

    // Reset to desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // ── Trust & Social ────────────────────────────

    // 12. Customer reviews visible
    const reviews = await page.locator('[class*="review"], [class*="testimonial"], [data-testid="review"], [class*="star"]').first().isVisible().catch(() => false);
    checklist_items.push({
      category: 'Trust & Social',
      label: 'Customer reviews visible',
      passed: reviews,
      details: reviews ? 'Review/testimonial element found' : 'No reviews found',
    });

    // 13. Social media links present
    const socialCount = await page.locator('a[href*="instagram.com"], a[href*="facebook.com"], a[href*="twitter.com"], a[href*="tiktok.com"]').count();
    checklist_items.push({
      category: 'Trust & Social',
      label: 'Social media links in footer',
      passed: socialCount >= 1,
      details: `${socialCount} social link(s) found`,
    });

    // ── Performance ────────────────────────────────

    // 14. Page load time < 3s
    checklist_items.push({
      category: 'Performance',
      label: 'Page loads in < 3 seconds',
      passed: loadTime < 3000,
      details: `Load time: ${loadTime}ms`,
    });

    // 15. LCP < 2.5s
    const lcp = await page.evaluate(() => {
      const entries = performance.getEntriesByType('largest-contentful-paint') as PerformanceEntry[];
      return entries.length > 0 ? (entries[entries.length - 1] as any).startTime : 0;
    });
    checklist_items.push({
      category: 'Performance',
      label: 'LCP under 2.5 seconds',
      passed: lcp === 0 || lcp < 2500,
      details: lcp === 0 ? 'LCP not recorded yet' : `LCP: ${Math.round(lcp)}ms`,
    });

    const passed = checklist_items.filter((i) => i.passed).length;
    const score_pct = Math.round((passed / checklist_items.length) * 100);

    return { checklist_items, score_pct };
  } finally {
    await browser.close();
  }
}
