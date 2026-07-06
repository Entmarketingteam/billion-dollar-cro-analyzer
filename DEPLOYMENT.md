# Vercel Deployment Guide

This guide walks through deploying the CRO Analyzer SaaS to Vercel production.

## Prerequisites

- Vercel account (https://vercel.com)
- GitHub repository connected to your Vercel account
- All required environment variables from `.env.example` ready
- Supabase project configured with database schema

## 1. Initial Vercel Setup

### Option A: Deploy from GitHub (Recommended)

1. Go to https://vercel.com and sign in
2. Click **"Add New"** → **"Project"**
3. Search for your GitHub repository (`billion-dollar-cro-analyzer`)
4. Click **"Import"**
5. Vercel auto-detects Next.js framework; confirm settings:
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
   - **Install Command:** `npm install`
6. Click **"Deploy"**

Vercel will perform an initial build. It will fail due to missing environment variables — this is expected.

### Option B: Deploy via CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# From project root, deploy
vercel --prod
```

When prompted:
- **Setup and deploy?** → Yes
- **Which scope?** → Select your personal account
- **Link to existing project?** → No (first deployment)
- **What's your project name?** → billion-dollar-cro-analyzer (suggested)
- **In which directory is your code?** → . (current)
- **Want to modify these settings before deploying?** → Yes → Accept defaults

## 2. Configure Environment Variables

### Via Vercel Dashboard

1. After project creation, go to **Settings** → **Environment Variables**

2. Add all required variables:

   **Supabase:**
   - `NEXT_PUBLIC_SUPABASE_URL` — Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Public anonymous key from Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` — Service role key from Supabase

   **Shopify OAuth:**
   - `SHOPIFY_OAUTH_CLIENT_ID` — From Shopify App settings
   - `SHOPIFY_OAUTH_CLIENT_SECRET` — From Shopify App settings
   - `SHOPIFY_REDIRECT_URI` — Update to: `https://yourdomain.com/api/shopify/oauth-callback`
     - Replace `yourdomain.com` with your actual domain

   **GA4 OAuth:**
   - `GA4_OAUTH_CLIENT_ID` — From Google Cloud Console
   - `GA4_OAUTH_CLIENT_SECRET` — From Google Cloud Console
   - `GA4_REDIRECT_URI` — Update to: `https://yourdomain.com/api/ga4/oauth-callback`

   **Claude API:**
   - `ANTHROPIC_API_KEY` — Your Claude API key (sk-ant-...)

   **Airtable:**
   - `AIRTABLE_API_TOKEN` — Airtable personal access token (pat...)
   - `AIRTABLE_BASE_ID` — Airtable base ID (app...)

   **Optional:**
   - `RESEND_API_KEY` — For email notifications
   - `SLACK_WEBHOOK_URL` — For Slack notifications

3. For each variable, select **Environments:**
   - `NEXT_PUBLIC_*` variables → **Production, Preview, Development**
   - Private keys (`SUPABASE_SERVICE_ROLE_KEY`, etc.) → **Production, Preview** (not Development)

4. Click **"Save"** after each variable

### Via Vercel CLI

```bash
# Set environment variable in production
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Follow prompts to enter value and select environments

# Repeat for each variable
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add SHOPIFY_OAUTH_CLIENT_ID
# ... etc
```

## 3. Update OAuth Redirect URIs

After your Vercel deployment completes, you'll have a production domain (usually `your-project-name.vercel.app`).

Update your OAuth applications to use production redirect URIs:

### Shopify App Settings
- **Redirect URI:** `https://your-project-name.vercel.app/api/shopify/oauth-callback`
- Save and deploy the Shopify app

### Google Cloud Console
- **Authorized redirect URIs:** `https://your-project-name.vercel.app/api/ga4/oauth-callback`
- Save

## 4. Custom Domain Setup (Optional)

To use a custom domain (e.g., `cro.yourbrand.com`):

1. In Vercel Project → **Settings** → **Domains**
2. Enter your custom domain name
3. Vercel provides DNS instructions
4. Add DNS records to your domain registrar:
   - Follow Vercel's specific DNS configuration for your domain provider
   - Common setup: Add CNAME record pointing to `cname.vercel-dns.com`

5. Update OAuth redirect URIs with your custom domain:
   - Shopify: `https://cro.yourbrand.com/api/shopify/oauth-callback`
   - Google: `https://cro.yourbrand.com/api/ga4/oauth-callback`

DNS propagation typically takes 24 hours but can be instant. Vercel will show domain status as "Valid" once propagated.

## 5. Deploy

### Automatic Deployments (Git-Connected)

Once GitHub is connected, every push to your main branch automatically triggers a production deployment.

To deploy:
```bash
git commit -am "Update feature X"
git push origin main
```

Vercel monitors GitHub and triggers builds automatically.

### Manual Deployment (CLI)

```bash
# Deploy to production
npm run deploy
# Same as: vercel --prod

# Deploy to preview environment (staging)
npm run preview
# Same as: vercel
```

## 6. Production vs Preview Environments

Vercel provides two deployment environments:

**Production (`--prod`)**
- Triggered by pushes to main branch
- Used for live customers
- All environment variables set to "Production"
- Full build + caching optimizations
- Custom domain points here

**Preview (Pull Request/Staging)**
- Triggered by pull requests or `vercel` CLI without `--prod`
- Used for testing before production
- Separate URL per PR (e.g., `pr-123.vercel.app`)
- All environment variables set to "Preview"
- Useful for testing OAuth flows or API integrations

## 7. Verify Deployment

After deploying, test that your app is working:

```bash
# Check if site is running
curl https://your-project.vercel.app

# Test login
# Visit: https://your-project.vercel.app/login

# Test Shopify OAuth
# Visit: https://your-project.vercel.app/api/shopify/oauth-callback

# Check API health
curl https://your-project.vercel.app/api/health 2>/dev/null || echo "No health endpoint"
```

### Debug Logs

If deployment fails:

1. Go to **Deployments** → click the failed build
2. View **Logs** tab to see build/runtime errors
3. Common issues:
   - **Missing environment variable:** Check all vars are added
   - **Type errors:** Run `npm run type-check` locally first
   - **Dependency missing:** Ensure `package.json` lists all imports

## 8. Monitoring & Maintenance

### Enable Vercel Analytics

1. **Settings** → **Analytics**
2. Enable **Web Analytics** to track:
   - Page load times
   - Core Web Vitals
   - User traffic patterns

### Enable Function Monitoring

1. **Settings** → **Monitoring**
2. View API route latency and error rates
3. Set alerts for:
   - High error rates (>5%)
   - Slow responses (>5s)
   - Function timeouts

### Logs & Error Tracking

- **Deployments** → click production build → **Logs** → see runtime errors
- Vercel captures unhandled errors automatically
- For custom error tracking, integrate Sentry or Rollbar

## 9. Scaling & Performance

### Function Timeouts

The `vercel.json` config sets a 60-second timeout for API routes:

```json
"functions": {
  "api/**/*.ts": {
    "maxDuration": 60
  }
}
```

For long-running async operations:
- If analysis takes >60s, use a task queue (e.g., Bull, Agenda)
- Return a task ID immediately; client polls `/api/test-run/[id]/status`
- The `/api/analyze-async` endpoint supports this pattern

### Edge Caching

Add caching headers to static API responses:

```typescript
// api/health.ts
export const dynamic = 'force-static';
export const revalidate = 3600; // Cache 1 hour

export async function GET() {
  return Response.json({ status: 'ok' });
}
```

## 10. Rolling Back Deployments

If a deployment has issues:

1. Go to **Deployments** tab
2. Find the previous stable build
3. Click **Redeploy** button
4. Vercel rebuilds and promotes that version to production

Alternatively, via CLI:

```bash
# List deployments
vercel list

# Promote an older deployment
vercel promote <DEPLOYMENT_ID>
```

## 11. Production Checklist

Before going live:

- [ ] All 12 environment variables set in Vercel
- [ ] OAuth redirect URIs updated in Shopify & Google
- [ ] Custom domain configured (if applicable)
- [ ] Database migrations run on Supabase
- [ ] Test login flow works
- [ ] Test Shopify OAuth flow works
- [ ] Test GA4 OAuth flow works
- [ ] Test analysis endpoint returns valid results
- [ ] Airtable base created with correct schema
- [ ] Monitoring/alerts enabled
- [ ] Error tracking configured

## Troubleshooting

### "Failed to find a valid build"
- Ensure `vercel.json` exists and `"framework": "nextjs"` is set
- Check `next.config.ts` for syntax errors
- Run `npm run build` locally to verify

### "Environment variable not defined"
- Variable must be added in Vercel dashboard before redeployment
- Redeploy after adding variables: go to **Deployments** → click latest → **Redeploy**
- Check that variable matches the environment filter (Production/Preview)

### "OAuth callback fails"
- Verify redirect URI exactly matches Vercel domain in OAuth app settings
- Use HTTPS (Vercel auto-enforces this)
- Check that OAuth app credentials haven't expired

### "Database connection timeout"
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct (not anon key)
- Check Supabase project is not paused
- Ensure IP allowlist is not blocking Vercel IPs (usually open by default)

### "Playwright/headless browser missing"
- Vercel provides Chromium/Firefox binaries in production
- If using Playwright, install: `npm install --save-dev @sparticuz/chromium`
- See: https://vercel.com/docs/functions/serverless-functions/supported-languages#node.js-dependencies

## Next Steps

After production deployment:

1. Monitor analytics and error rates for the first 24 hours
2. Set up automated backups of Supabase data
3. Implement automated test monitoring (e.g., daily analysis runs)
4. Create runbook for common operational tasks
5. Plan multi-region failover if needed (Vercel Premium)

---

**Questions?** Check [Vercel Docs](https://vercel.com/docs) or this project's CLAUDE.md for technical context.
