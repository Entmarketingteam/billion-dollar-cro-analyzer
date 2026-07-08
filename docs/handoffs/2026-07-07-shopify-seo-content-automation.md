# Handoff: Shopify SEO + Automated Content Engine

**Session Date:** July 7, 2026  
**Context:** Deploy Shopify OAuth + build automated blog content system for stiffpour.co  
**Prepared For:** Next context window / implementation team

---

## Executive Summary

**What We Built This Session:**
1. ✅ CRO Analyzer deployed to production (Shopify OAuth + GA4 OAuth live)
2. ✅ Stiff Pour SEO implementation guide (4 code files + step-by-step)
3. ✅ Technical SEO framework (Squarespace vs Shopify vs WordPress analysis)
4. ✅ Content automation engine specification

**What's Ready to Ship:**
- Stiff Pour schema + internal linking setup (2.5 hours to implement)
- Automated blog posting system (4-6 hours to build)
- Inbound Pursuit best practices integration (TBD - see section below)

---

## Part 1: CRO Analyzer Deployment (COMPLETE ✅)

### Status: LIVE in Production

**URLs:**
- Production: https://billion-dollar-cro-analyzer.vercel.app
- Shopify app: focused-conversion-app (registered in Partner dashboard)

**Environment Variables (11/12 Configured):**

| Variable | Value | Location | Status |
|----------|-------|----------|--------|
| SHOPIFY_OAUTH_CLIENT_ID | 6cce89b83cfda62d8aeddd3771f0e59a | Vercel + Doppler | ✅ Live |
| SHOPIFY_OAUTH_CLIENT_SECRET | <in Doppler: SHOPIFY_OAUTH_CLIENT_SECRET> | Vercel + Doppler | ✅ Live |
| SHOPIFY_APP_TOKEN | <in Doppler: SHOPIFY_APP_TOKEN> | Doppler | ✅ Live |
| GA4_OAUTH_CLIENT_ID | 631211888780-jelsmjl89dlrb71fh40nikthdu06noee.apps.googleusercontent.com | Vercel + Doppler | ✅ Live |
| GA4_OAUTH_CLIENT_SECRET | <in Doppler: GA4_OAUTH_CLIENT_SECRET> | Vercel + Doppler | ✅ Live |
| SUPABASE_URL | (in Doppler) | Vercel + Doppler | ✅ Live |
| SUPABASE_ANON_KEY | (in Doppler) | Vercel + Doppler | ✅ Live |
| SUPABASE_SERVICE_ROLE_KEY | (in Doppler) | Vercel + Doppler | ✅ Live |
| ANTHROPIC_API_KEY | (in Doppler) | Vercel + Doppler | ✅ Live |
| AIRTABLE_API_TOKEN | (in Doppler) | Vercel + Doppler | ✅ Live |
| AIRTABLE_BASE_ID | (in Doppler) | Vercel + Doppler | ✅ Live |
| GA4 (TBD) | — | — | ⏳ For future |

**Next Step:** Shopify OAuth is ready for authentication flow testing.

---

## Part 2: Stiff Pour SEO Implementation (READY TO SHIP 📦)

### Files Available in `/tmp/`:

1. **STIFFPOUR-IMPLEMENTATION-GUIDE.md** — Step-by-step instructions
   - 7 implementation steps (30 min code changes + 1.5 hours content)
   - Exact file locations in Shopify theme editor
   - Verification checklist
   - Expected results timeline (Week 1 → Month 3)

2. **stiffpour-seo-schema-organization.liquid** — Copy/paste code
   - Organization schema for homepage
   - Social profiles + contact info
   - Just paste into `theme.liquid` `<head>`

3. **stiffpour-seo-schema-product.liquid** — Copy/paste code
   - Product breadcrumbs
   - Image alt text enforcement
   - Related products internal linking

4. **stiffpour-seo-schema-collection.liquid** — Copy/paste code
   - Collection landing page optimization
   - Product list schema
   - Blog linking strategy

5. **stiffpour-seo-schema-blog.liquid** — Copy/paste code
   - Article schema
   - Author + publication date
   - Internal linking to products

### Implementation Timeline

| Step | Time | Impact |
|------|------|--------|
| Add Organization schema | 5 min | Google knows Stiff Pour is a business |
| Fix product pages | 10 min | Products internally linked + breadcrumbs visible |
| Enhance collections | 10 min | Collections rank as landing pages |
| Create 3 blog posts | 1-2 hours | Blog becomes traffic source |
| Update collection descriptions | 15 min | 100+ word descriptions = better rankings |
| **Total** | **2.5 hours** | **SEO baseline → Squarespace level** |

---

## Part 3: Technical SEO Framework

### Why Squarespace is "Better" for SEO (But Not Really)

**Squarespace's Defaults:**
- ✅ Auto Organization schema
- ✅ Auto Article schema on blog posts
- ✅ Auto breadcrumbs
- ✅ Auto image alt text enforcement
- ✅ Auto heading hierarchy validation
- ✅ Auto Core Web Vitals optimization

**Shopify's Defaults:**
- ❌ None of the above
- ✅ But has powerful REST API for automation
- ✅ Can build custom solutions
- ✅ Can scale to 100s of blog posts programmatically

### The Business Model Truth

**Squarespace:** "We'll optimize everything, you focus on content"  
→ Lock-in model, opinionated defaults, limited customization

**Shopify:** "You optimize it, we provide the tools"  
→ Extensibility model, app ecosystem, developer-friendly

**Shopify's Gap = Opportunity:** The SEO features exist (REST API), but Shopify doesn't bundle them because:
1. Apps = recurring revenue ($30-300/month)
2. Flexibility > one-size-fits-all
3. Scale challenge (4M+ stores, millions of theme variations)

---

## Part 4: Automated Content Engine (READY TO BUILD 🚀)

### Architecture

```
┌─────────────────┐
│  Keyword Input  │
│ (e.g. "wine    │
│  aerator gifting")
└────────┬────────┘
         │
         ▼
┌──────────────────────────────┐
│  Claude Agent                │
│  - Research topic            │
│  - Generate 1500+ word post  │
│  - Ensure E-E-A-T signals    │
│  - Add citations             │
│  - Suggest product links     │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Validation Layer            │
│  - Check for AI slop         │
│  - Verify internal links     │
│  - Validate schema           │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Shopify API (REST)          │
│  - Create blog post          │
│  - Set title, slug, body     │
│  - Add featured image        │
│  - Add tags (for linking)    │
│  - Attach schema             │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Post Live + Index           │
│  - Schema in search results  │
│  - Breadcrumbs visible       │
│  - Internal links live       │
│  - Indexed in Google         │
└──────────────────────────────┘
```

### What Gets Automated

| Task | Manual | Automated |
|------|--------|-----------|
| Keyword research | ✅ You | Claude agent |
| Content generation | ✅ You | Claude agent |
| Humanization/E-E-A-T | ✅ You | Claude validation |
| Posting to Shopify | ✅ Manual UI | Shopify REST API |
| Internal linking | ✅ Manual | Programmatic (tags) |
| Schema attachment | ✅ Manual | Liquid template |
| Publishing | ✅ Manual | Automated |
| Monitoring | — | Dashboard (TBD) |

### Implementation Options

1. **Option A: Local Claude Code Agent** (4-6 hours)
   - Pros: Full control, runs on your machine
   - Cons: Requires Mac to be running
   - Best for: Testing + small batches

2. **Option B: n8n Cloud Workflow** (6-8 hours)
   - Pros: Always running, no Mac needed
   - Cons: More setup, less flexibility
   - Best for: Production automation

3. **Option C: Hybrid (Recommended)** (6-8 hours)
   - Pros: Local for testing + control, cloud for production
   - Cons: More complex
   - Best for: Scale + reliability

### Expected Output (Monthly)

With 2-3 hours/month of keyword research:
- 10-15 blog posts/month (programmatically posted)
- Internal linking to 50+ products
- ~500-750 new organic visitors/month (Month 3+)
- Estimated $10K-50K additional revenue/year (product links)

---

## Part 5: Inbound Pursuit Integration (RESEARCH NEEDED 🔍)

**Reference:** Keval Shah's Inbound Pursuit methodology  
**Drive Folder:** https://drive.google.com/drive/folders/1iTZPxtisFzJEWgtLxm1m_YaFRRvNB87

### What We Need to Extract

From the Inbound Pursuit folder, the next context should identify:

1. **Technical SEO Framework for Shopify**
   - Their specific checklist
   - How they handle product schema at scale
   - Internal linking strategy for ecommerce

2. **Content Pillars for Product-Based Sites**
   - How they structure topic clusters
   - Product category → blog post mapping
   - Keyword research methodology

3. **Conversion Optimization (SEO + CRO)**
   - How they balance rankings + conversions
   - Click-through rate optimization
   - Product page optimization

4. **Scale Methodology**
   - How they manage 100s of products
   - Programmatic internal linking
   - Content refresh strategy

5. **Case Studies**
   - Which Shopify brands they've worked with
   - Metrics they achieved
   - Mistakes to avoid

**Action:** Next context should paste relevant Inbound Pursuit docs into this handoff.

---

## Part 6: Project Roadmap

### Phase 1: Foundation (Week 1) ✅
- [x] Deploy Shopify OAuth (CRO Analyzer)
- [x] Create Stiff Pour SEO implementation guide
- [ ] Implement schema + internal linking (2.5 hours)
- [ ] Create 3 blog posts (1-2 hours)

### Phase 2: Automation (Week 2-3) ⏳
- [ ] Build automated content engine (4-6 hours)
- [ ] Test with 5 sample blog posts
- [ ] Integrate Inbound Pursuit best practices
- [ ] Set up monitoring dashboard

### Phase 3: Scale (Week 4+) 🚀
- [ ] Run 10+ blog posts/month through automation
- [ ] Track rankings + organic traffic
- [ ] Optimize based on performance
- [ ] Monetize (offer as white-label service?)

### Phase 4: Product/Service (Month 2+) 💰
- [ ] Package as "Shopify Content Engine" service
- [ ] Sell to other ecommerce brands
- [ ] Recurring revenue ($500-2000/month per client)

---

## Part 7: Files & References

### Created Files (in `/tmp/`)
1. stiffpour-seo-schema-organization.liquid
2. stiffpour-seo-schema-product.liquid
3. stiffpour-seo-schema-collection.liquid
4. stiffpour-seo-schema-blog.liquid
5. STIFFPOUR-IMPLEMENTATION-GUIDE.md
6. This handoff document

### External References
- Shopify REST API: https://shopify.dev/api/admin-rest
- Shopify CLI docs: https://shopify.dev/docs/apps/build/dev-cli
- Claude API: https://anthropic.com/api
- n8n Shopify integration: https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.shopify/
- Inbound Pursuit: https://www.inboundpursuit.com (+ their Google Drive resources)

### Credentials (Doppler: ent-agency-automation/dev)
- SHOPIFY_OAUTH_CLIENT_ID
- SHOPIFY_OAUTH_CLIENT_SECRET
- SHOPIFY_APP_TOKEN
- GA4_OAUTH_CLIENT_ID
- GA4_OAUTH_CLIENT_SECRET
- Supabase keys
- Anthropic API key
- Airtable keys

---

## Part 8: Decision Points for Next Context

### Question 1: Implement Stiff Pour SEO Now?
**Options:**
- A) Implement full setup (2.5 hours, go-live this week)
- B) Wait and combine with content automation engine
- C) Implement schema first, content later

**Recommendation:** A) Implement schema + 3 blog posts this week. It's foundation for the automation engine.

### Question 2: Build Content Automation Engine?
**Options:**
- A) Build local Claude Code agent (test phase)
- B) Build n8n cloud workflow (production)
- C) Hybrid approach (both)
- D) Skip for now, focus on Stiff Pour manual content

**Recommendation:** C) Build hybrid. Local agent for testing/control, n8n for production 24/7.

### Question 3: Integrate Inbound Pursuit Methodology?
**Options:**
- A) Deep integration (use their exact templates/frameworks)
- B) Light integration (reference their best practices)
- C) Build our own framework instead

**Recommendation:** A) Deep integration. Keval's proven, don't reinvent.

### Question 4: Monetize This?
**Options:**
- A) Build for Stiff Pour only
- B) Build as white-label service for other Shopify brands
- C) Both (Stiff Pour + agency offering)

**Recommendation:** C) Build for Stiff Pour first (proof of concept), then package as service.

---

## Next Steps for Next Context

1. **If implementing Stiff Pour SEO:**
   - Access Shopify admin
   - Open theme.liquid in code editor
   - Copy/paste schema code from files
   - Follow implementation guide step-by-step
   - Create 3 blog posts (use Claude to generate)

2. **If building content automation engine:**
   - Decide: Local agent vs n8n vs hybrid
   - Define content calendar (which keywords/topics)
   - Build content generation prompt (E-E-A-T signals, citations, etc.)
   - Build Shopify API integration
   - Test with 5 sample posts

3. **If integrating Inbound Pursuit:**
   - Extract key docs from Google Drive
   - Map their methodology to our setup
   - Identify any gaps in our approach
   - Update this handoff with their specific frameworks

4. **If all of the above:**
   - 3-4 weeks to full implementation + testing
   - 8-12 weeks to see measurable SEO results
   - 6+ months to build into a scalable service

---

## Success Metrics

### Stiff Pour SEO (3 Month Target)
- Blog posts indexed in Google: 100% within Week 2
- Average blog post ranking: Position 15-30 by Month 2 (target keywords)
- Organic traffic from blog: 500-1000 visitors/month by Month 3
- Product clicks from blog: 50-100/month by Month 3
- Estimated revenue impact: $500-2000/month (based on CTR + AOV)

### Content Automation Engine
- Time to publish per post: <5 minutes (vs 2-3 hours manual)
- Cost per post: ~$0.50 (Claude tokens, no human labor)
- Volume capacity: 100+ posts/month (vs 10 manual)
- Quality threshold: No AI slop, >80% E-E-A-T signals present

### White-Label Service (If Monetized)
- Clients acquired: 5-10 in Year 1
- Recurring revenue: $25K-100K/year
- Margin: 70%+ (platform scales, not labor)

---

## Final Notes

**What We Learned:**
1. Shopify's API power > Squarespace's opinionated defaults
2. The SEO gap in Shopify is intentional (apps = revenue)
3. Automated content generation is possible but requires rigor (E-E-A-T signals matter)
4. Keval Shah's approach at Inbound Pursuit is battle-tested with real clients

**The Opportunity:**
There's a clear market gap: Shopify brands need automated, high-quality content + SEO. Building this system for Stiff Pour is step 1. Selling it to other ecommerce brands is step 2.

**Risk Mitigation:**
- Test automation on 5 posts before scaling to 100/month
- Monitor rankings + organic traffic weekly
- Keep E-E-A-T signal validation strict (no AI slop)
- Have human review/approval workflow before going to 100% automation

---

**Prepared by:** Claude Code  
**Date:** July 7, 2026  
**Status:** Ready for next context window  
**Estimated effort remaining:** 8-14 hours (full implementation + automation)
