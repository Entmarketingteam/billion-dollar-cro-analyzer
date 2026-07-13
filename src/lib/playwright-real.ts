import type { Browser, Page } from 'playwright-core';

export interface AuditCheckItem {
  category: string;
  label: string;
  passed: boolean;
  details?: string;
  page?: string; // which crawled page the check ran on
}

export interface AboveFoldElement {
  tag: string;
  text: string;
  y: number;
}

export interface PageFacts {
  label: 'homepage' | 'homepage-mobile' | 'product' | 'cart';
  url: string;
  loadTimeMs: number;
  aboveFold: AboveFoldElement[];
  screenshotBase64?: string; // jpeg; uploaded to storage by the caller
}

export interface CrawlAuditResult {
  checklist_items: AuditCheckItem[];
  score_pct: number;
  pages: PageFacts[];
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

// Shopify stores expose /products.json — the deterministic way to find a
// real product page instead of guessing selectors on the homepage.
async function discoverProductUrl(baseUrl: string): Promise<string | null> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/products.json?limit=1`, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; CROAnalyzer/1.0)' },
      signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(10000) : undefined,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const handle = data.products?.[0]?.handle;
    return handle ? `${baseUrl.replace(/\/$/, '')}/products/${handle}` : null;
  } catch {
    return null;
  }
}

// Compact structural snapshot of what a visitor sees above the fold —
// enough for Claude to reason about layout without vision.
async function extractAboveFold(page: Page): Promise<AboveFoldElement[]> {
  return page.evaluate(() => {
    const els = Array.from(
      document.querySelectorAll('h1, h2, h3, a, button, img, p, [role="button"]')
    );
    const out: { tag: string; text: string; y: number }[] = [];
    const seen = new Set<string>();
    for (const el of els) {
      if (out.length >= 18) break;
      const r = el.getBoundingClientRect();
      if (r.top < 0 || r.top > 800 || r.width < 12 || r.height < 10) continue;
      const style = window.getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      const raw =
        el.tagName === 'IMG'
          ? ((el as HTMLImageElement).alt || '[image]')
          : (el.textContent || '').trim().replace(/\s+/g, ' ');
      const text = raw.slice(0, 70);
      if (!text) continue;
      const key = `${el.tagName}:${text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ tag: el.tagName.toLowerCase(), text, y: Math.round(r.top) });
    }
    return out;
  });
}

async function captureFacts(
  page: Page,
  label: PageFacts['label'],
  url: string,
  loadTimeMs: number,
  withScreenshot: boolean
): Promise<PageFacts> {
  const facts: PageFacts = {
    label,
    url,
    loadTimeMs,
    aboveFold: await extractAboveFold(page).catch(() => []),
  };
  if (withScreenshot) {
    try {
      const buf = await page.screenshot({ type: 'jpeg', quality: 55 });
      facts.screenshotBase64 = buf.toString('base64');
    } catch {
      // screenshot is best-effort
    }
  }
  return facts;
}

async function goto(page: Page, url: string): Promise<number> {
  const start = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  return Date.now() - start;
}

export async function runPlaywrightAudit(siteUrl: string): Promise<CrawlAuditResult> {
  const browser = await launchChromium();
  const checklist_items: AuditCheckItem[] = [];
  const pages: PageFacts[] = [];
  const base = siteUrl.replace(/\/$/, '');

  const push = (
    category: string,
    label: string,
    passed: boolean,
    details: string,
    pageLabel: string
  ) => checklist_items.push({ category, label, passed, details, page: pageLabel });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
    });
    const page = await context.newPage();

    // ── Homepage (desktop) ───────────────────────────────────
    const homeLoad = await goto(page, base);

    const heroText = await page
      .locator('[class*="hero"] h1, [class*="hero"] h2, h1')
      .first()
      .textContent()
      .catch(() => null);
    push(
      'Homepage',
      'Hero headline present',
      !!heroText && heroText.trim().length > 0,
      heroText?.trim().slice(0, 80) ?? 'No hero headline found',
      'homepage'
    );

    const productImgCount = await page
      .locator('img[src*="product"], img[src*="cdn/shop/files"], .product img, [class*="product"] img')
      .count()
      .catch(() => 0);
    push(
      'Homepage',
      'Product imagery visible on homepage',
      productImgCount > 0,
      `${productImgCount} product image(s) found`,
      'homepage'
    );

    const navText = await page.locator('nav, header').first().textContent().catch(() => null);
    push(
      'Homepage',
      'Navigation menu accessible',
      !!navText && navText.trim().length > 20,
      navText ? `Nav has ${navText.trim().length} characters of content` : 'No nav found',
      'homepage'
    );

    const ctaVisible = await page
      .locator('a[href*="collections"], a[href*="product"], button:has-text("Shop"), a:has-text("Shop")')
      .first()
      .isVisible()
      .catch(() => false);
    push(
      'Homepage',
      'Clear CTA on homepage',
      ctaVisible,
      ctaVisible ? 'Shop CTA found' : 'No shop CTA found',
      'homepage'
    );

    const cartLink = await page
      .locator('a[href*="cart"], button:has-text("Cart"), [class*="cart"]')
      .first()
      .isVisible()
      .catch(() => false);
    push(
      'Checkout',
      'Cart accessible from header',
      cartLink,
      cartLink ? 'Cart link/button found' : 'No cart link found',
      'homepage'
    );

    const reviews = await page
      .locator('[class*="review"], [class*="testimonial"], [class*="star"], [class*="rating"]')
      .first()
      .isVisible()
      .catch(() => false);
    push(
      'Trust & Social',
      'Reviews or testimonials visible on homepage',
      reviews,
      reviews ? 'Review/testimonial element found' : 'No reviews found',
      'homepage'
    );

    const socialCount = await page
      .locator(
        'a[href*="instagram.com"], a[href*="facebook.com"], a[href*="twitter.com"], a[href*="tiktok.com"]'
      )
      .count()
      .catch(() => 0);
    push(
      'Trust & Social',
      'Social media links present',
      socialCount >= 1,
      `${socialCount} social link(s) found`,
      'homepage'
    );

    push(
      'Performance',
      'Homepage loads in < 3 seconds',
      homeLoad < 3000,
      `Load time: ${homeLoad}ms`,
      'homepage'
    );

    const lcp = await page
      .evaluate(() => {
        const entries = performance.getEntriesByType('largest-contentful-paint');
        return entries.length > 0
          ? (entries[entries.length - 1] as PerformanceEntry).startTime
          : 0;
      })
      .catch(() => 0);
    push(
      'Performance',
      'LCP under 2.5 seconds',
      lcp === 0 || lcp < 2500,
      lcp === 0 ? 'LCP not recorded' : `LCP: ${Math.round(lcp)}ms`,
      'homepage'
    );

    pages.push(await captureFacts(page, 'homepage', base, homeLoad, true));

    // ── Homepage (mobile viewport) ───────────────────────────
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(400);

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth).catch(() => 9999);
    push(
      'Mobile',
      'Responsive at 375px viewport',
      bodyWidth <= 400,
      `Body scroll width at 375px: ${bodyWidth}px`,
      'homepage'
    );

    const mobileMenu = await page
      .locator(
        'button[class*="menu"], button[class*="hamburger"], button[aria-label*="menu" i], [class*="menu-drawer"], summary[class*="menu"], details[class*="menu"]'
      )
      .first()
      .isVisible()
      .catch(() => false);
    push(
      'Mobile',
      'Mobile menu button present',
      mobileMenu,
      mobileMenu ? 'Mobile menu button found' : 'No mobile menu button found',
      'homepage'
    );

    pages.push(await captureFacts(page, 'homepage-mobile', base, homeLoad, true));
    await page.setViewportSize({ width: 1280, height: 800 });

    // ── Product page (discovered via /products.json) ─────────
    const productUrl = await discoverProductUrl(base);
    if (productUrl) {
      const prodLoad = await goto(page, productUrl);

      const addToCart = await page
        .locator(
          'button:has-text("Add to cart"), button:has-text("Add to bag"), button[name="add"], [id*="AddToCart"]'
        )
        .first()
        .isVisible()
        .catch(() => false);
      push(
        'Product Page',
        'Add to cart button present',
        addToCart,
        addToCart ? 'Add to cart button found' : 'No add to cart button found',
        'product'
      );

      const productTitle = await page
        .locator('h1, [class*="product-title"], [class*="product__title"]')
        .first()
        .textContent()
        .catch(() => null);
      push(
        'Product Page',
        'Product title visible',
        !!productTitle && productTitle.trim().length > 0,
        productTitle?.trim().slice(0, 60) ?? 'No product title found',
        'product'
      );

      const priceVisible = await page
        .locator('[class*="price"], span:has-text("$")')
        .first()
        .isVisible()
        .catch(() => false);
      push(
        'Product Page',
        'Price clearly displayed',
        priceVisible,
        priceVisible ? 'Price element found' : 'No price element found',
        'product'
      );

      const productImages = await page
        .locator('[class*="product"] img, [class*="media"] img')
        .count()
        .catch(() => 0);
      push(
        'Product Page',
        'Product photos present',
        productImages > 0,
        `${productImages} image(s) on product page`,
        'product'
      );

      pages.push(await captureFacts(page, 'product', productUrl, prodLoad, true));
    } else {
      push(
        'Product Page',
        'Product page reachable',
        false,
        'Could not discover a product via /products.json',
        'product'
      );
    }

    // ── Cart page ────────────────────────────────────────────
    try {
      const cartLoad = await goto(page, `${base}/cart`);
      const checkoutBtn = await page
        .locator(
          'button[name="checkout"], a[href*="checkout"], button:has-text("Checkout"), a:has-text("Checkout")'
        )
        .first()
        .isVisible()
        .catch(() => false);
      // Empty carts on many themes hide the checkout button; presence of the
      // cart page itself + either button or empty-state counts as reachable.
      const cartBody = await page.locator('body').textContent().catch(() => '');
      const cartWorks = checkoutBtn || /cart/i.test(cartBody || '');
      push(
        'Checkout',
        'Cart page functional',
        cartWorks,
        checkoutBtn ? 'Checkout button found' : 'Cart page loads (empty cart)',
        'cart'
      );
      pages.push(await captureFacts(page, 'cart', `${base}/cart`, cartLoad, false));
    } catch {
      push('Checkout', 'Cart page functional', false, 'Cart page failed to load', 'cart');
    }

    const passed = checklist_items.filter((i) => i.passed).length;
    const score_pct = Math.round((passed / checklist_items.length) * 100);

    return { checklist_items, score_pct, pages };
  } finally {
    await browser.close();
  }
}
