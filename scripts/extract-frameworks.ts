#!/usr/bin/env npx ts-node

/**
 * Extract Billion Dollar Websites Frameworks
 *
 * This script generates structured CRO frameworks (benchmarks, tests, checklist items)
 * from the Billion Dollar Websites book.
 *
 * MVP Approach: Uses hardcoded data based on the book's key frameworks.
 * Future: Will integrate PDF parsing via Claude API when PDFs are available.
 *
 * Output: JSON structure for Claude agent and audit checklist
 * Usage: doppler run -- npx ts-node scripts/extract-frameworks.ts > src/lib/frameworks.json
 */

interface Benchmark {
  conversion_rate: number;
  aov: number;
}

interface Test {
  id: string;
  chapter: string;
  section: string;
  hypothesis: string;
  effort_hours: number;
  expected_lift_min: number;
  expected_lift_max: number;
  applies_to: string[];
}

interface ChecklistItem {
  id: string;
  chapter: string;
  item: string;
  auto_check: boolean;
}

interface Frameworks {
  benchmarks: {
    education: Benchmark;
    ecommerce: Benchmark;
    saas: Benchmark;
  };
  tests: Test[];
  checklist_items: ChecklistItem[];
}

// Hardcoded frameworks based on Billion Dollar Websites book
const frameworks: Frameworks = {
  benchmarks: {
    education: {
      conversion_rate: 2.1,
      aov: 45,
    },
    ecommerce: {
      conversion_rate: 2.5,
      aov: 65,
    },
    saas: {
      conversion_rate: 3.0,
      aov: 120,
    },
  },
  tests: [
    // Checkout & Cart Tests
    {
      id: "checkout-single-step",
      chapter: "Chapter 8",
      section: "Rule 5 - Simplify Checkout",
      hypothesis: "Single-step checkout reduces cart abandonment and increases conversion",
      effort_hours: 6,
      expected_lift_min: 3,
      expected_lift_max: 8,
      applies_to: ["ecommerce"],
    },
    {
      id: "remove-form-fields",
      chapter: "Chapter 8",
      section: "Rule 5 - Checkout Optimization",
      hypothesis: "Removing non-essential form fields decreases friction",
      effort_hours: 4,
      expected_lift_min: 2,
      expected_lift_max: 5,
      applies_to: ["ecommerce", "saas"],
    },
    {
      id: "trust-badges-checkout",
      chapter: "Chapter 6",
      section: "Rule 3 - Build Trust",
      hypothesis: "Security badges near payment form increase checkout completion",
      effort_hours: 2,
      expected_lift_min: 1,
      expected_lift_max: 4,
      applies_to: ["ecommerce", "saas"],
    },
    // Headline & Copy Tests
    {
      id: "headline-power-words",
      chapter: "Chapter 7",
      section: "Rule 4 - Compelling Headlines",
      hypothesis: "Headlines with 3+ power words improve engagement and dwell time",
      effort_hours: 3,
      expected_lift_min: 2,
      expected_lift_max: 6,
      applies_to: ["education", "saas", "ecommerce"],
    },
    {
      id: "benefit-driven-copy",
      chapter: "Chapter 7",
      section: "Rule 4 - Messaging",
      hypothesis: "Benefit-driven copy outperforms feature-driven copy",
      effort_hours: 4,
      expected_lift_min: 3,
      expected_lift_max: 7,
      applies_to: ["education", "saas"],
    },
    // CTA & Button Tests
    {
      id: "cta-button-contrast",
      chapter: "Chapter 5",
      section: "Rule 2 - Call-to-Action",
      hypothesis: "High-contrast CTA buttons increase click-through rates",
      effort_hours: 2,
      expected_lift_min: 2,
      expected_lift_max: 5,
      applies_to: ["education", "saas", "ecommerce"],
    },
    {
      id: "action-oriented-cta-text",
      chapter: "Chapter 5",
      section: "Rule 2 - CTA Copy",
      hypothesis: "Action-oriented CTA text (e.g., 'Get Started Now') outperforms generic text",
      effort_hours: 1,
      expected_lift_min: 1,
      expected_lift_max: 4,
      applies_to: ["education", "saas"],
    },
    // Value Proposition Tests
    {
      id: "unique-value-prop-above-fold",
      chapter: "Chapter 4",
      section: "Rule 1 - Value Prop",
      hypothesis: "Unique value proposition visible above fold increases engagement",
      effort_hours: 3,
      expected_lift_min: 2,
      expected_lift_max: 5,
      applies_to: ["education", "saas", "ecommerce"],
    },
    {
      id: "social-proof-testimonials",
      chapter: "Chapter 6",
      section: "Rule 3 - Social Proof",
      hypothesis: "Customer testimonials with photos increase conversion rates",
      effort_hours: 4,
      expected_lift_min: 3,
      expected_lift_max: 8,
      applies_to: ["education", "saas", "ecommerce"],
    },
    // Page Layout & Design Tests
    {
      id: "hero-section-video",
      chapter: "Chapter 4",
      section: "Rule 1 - Visual Engagement",
      hypothesis: "Hero section with video increases scroll depth and engagement",
      effort_hours: 8,
      expected_lift_min: 4,
      expected_lift_max: 9,
      applies_to: ["education", "saas", "ecommerce"],
    },
    {
      id: "reduce-page-clutter",
      chapter: "Chapter 5",
      section: "Rule 2 - Visual Design",
      hypothesis: "Reducing visual clutter and white space improves focus and conversion",
      effort_hours: 6,
      expected_lift_min: 2,
      expected_lift_max: 6,
      applies_to: ["education", "saas", "ecommerce"],
    },
    // Pricing & Offer Tests
    {
      id: "tiered-pricing-display",
      chapter: "Chapter 9",
      section: "Rule 6 - Pricing Strategy",
      hypothesis: "Tiered pricing with recommended tier highlighted increases avg revenue",
      effort_hours: 5,
      expected_lift_min: 3,
      expected_lift_max: 7,
      applies_to: ["saas", "education"],
    },
    {
      id: "scarcity-urgency-messaging",
      chapter: "Chapter 8",
      section: "Rule 5 - Urgency",
      hypothesis: "Scarcity/urgency messaging increases conversion velocity",
      effort_hours: 2,
      expected_lift_min: 2,
      expected_lift_max: 5,
      applies_to: ["education", "ecommerce", "saas"],
    },
    // Form & Lead Gen Tests
    {
      id: "progressive-profiling",
      chapter: "Chapter 8",
      section: "Rule 5 - Form Optimization",
      hypothesis: "Progressive form fields reduce abandonment and improve data quality",
      effort_hours: 6,
      expected_lift_min: 3,
      expected_lift_max: 7,
      applies_to: ["education", "saas"],
    },
    {
      id: "single-step-lead-form",
      chapter: "Chapter 8",
      section: "Rule 5 - Lead Capture",
      hypothesis: "Single-step email capture form increases lead volume vs multi-step",
      effort_hours: 3,
      expected_lift_min: 2,
      expected_lift_max: 6,
      applies_to: ["education", "saas"],
    },
    // Navigation & Discovery Tests
    {
      id: "sticky-navigation-bar",
      chapter: "Chapter 3",
      section: "Rule 0 - Navigation",
      hypothesis: "Sticky navigation bar reduces bounce and improves secondary CTR",
      effort_hours: 2,
      expected_lift_min: 1,
      expected_lift_max: 3,
      applies_to: ["education", "saas", "ecommerce"],
    },
  ],
  checklist_items: [
    // Headline Checklist
    {
      id: "headline-power-words-3",
      chapter: "Chapter 7",
      item: "Headline uses 3+ power words (proven, guaranteed, exclusive, limited, etc.)",
      auto_check: false,
    },
    {
      id: "headline-benefit-driven",
      chapter: "Chapter 7",
      item: "Headline clearly states customer benefit, not just product feature",
      auto_check: false,
    },
    {
      id: "headline-length-optimal",
      chapter: "Chapter 7",
      item: "Headline length is 6-12 words (optimal for comprehension and impact)",
      auto_check: false,
    },
    // Value Proposition Checklist
    {
      id: "value-prop-above-fold",
      chapter: "Chapter 4",
      item: "Unique value proposition is visible above the fold (no scrolling required)",
      auto_check: true,
    },
    {
      id: "value-prop-specific-benefit",
      chapter: "Chapter 4",
      item: "Value proposition specifies exact benefit (e.g., '50% faster results')",
      auto_check: false,
    },
    // CTA Checklist
    {
      id: "cta-action-oriented",
      chapter: "Chapter 5",
      item: "CTA uses action-oriented verbs (Get, Start, Learn, Download, etc.)",
      auto_check: false,
    },
    {
      id: "cta-high-contrast",
      chapter: "Chapter 5",
      item: "CTA button has high visual contrast against page background",
      auto_check: true,
    },
    {
      id: "cta-single-primary",
      chapter: "Chapter 5",
      item: "Page has ONE primary CTA (secondary CTAs de-emphasized)",
      auto_check: true,
    },
    // Trust & Social Proof Checklist
    {
      id: "trust-badges-displayed",
      chapter: "Chapter 6",
      item: "Security/trust badges (SSL, payment icons, awards) are prominently displayed",
      auto_check: true,
    },
    {
      id: "social-proof-testimonials",
      chapter: "Chapter 6",
      item: "Customer testimonials include names, photos, and credibility markers",
      auto_check: false,
    },
    {
      id: "social-proof-numbers",
      chapter: "Chapter 6",
      item: "Page displays social proof metrics (customers, reviews, success rate %)",
      auto_check: true,
    },
    // Visual Design Checklist
    {
      id: "visual-hierarchy-clear",
      chapter: "Chapter 5",
      item: "Visual hierarchy guides eye to CTA (size, color, whitespace)",
      auto_check: false,
    },
    {
      id: "images-product-focused",
      chapter: "Chapter 5",
      item: "Hero images show product/benefit in action (not abstract/generic)",
      auto_check: false,
    },
    {
      id: "mobile-responsive-check",
      chapter: "Chapter 3",
      item: "Layout is responsive and optimized for mobile devices",
      auto_check: true,
    },
    // Checkout Checklist (Ecommerce)
    {
      id: "checkout-guest-option",
      chapter: "Chapter 8",
      item: "Checkout allows guest purchase (no account required)",
      auto_check: true,
    },
    {
      id: "checkout-progress-indicator",
      chapter: "Chapter 8",
      item: "Checkout displays progress indicator (step 1 of 3, etc.)",
      auto_check: true,
    },
    {
      id: "checkout-form-fields-minimal",
      chapter: "Chapter 8",
      item: "Checkout form has ≤5 required fields (name, email, address, card, zip)",
      auto_check: false,
    },
    // Form Checklist
    {
      id: "form-field-labels",
      chapter: "Chapter 8",
      item: "All form fields have clear, descriptive labels",
      auto_check: true,
    },
    {
      id: "form-placeholder-text",
      chapter: "Chapter 8",
      item: "Form fields include helpful placeholder text examples",
      auto_check: true,
    },
    // Performance Checklist
    {
      id: "page-load-time-fast",
      chapter: "Chapter 2",
      item: "Page load time is under 3 seconds (tested on 4G)",
      auto_check: false,
    },
    {
      id: "no-auto-play-video",
      chapter: "Chapter 3",
      item: "Auto-play media is muted or disabled (respects user preferences)",
      auto_check: false,
    },
  ],
};

// Output the frameworks as JSON
console.log(JSON.stringify(frameworks, null, 2));
