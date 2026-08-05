# Implementation Prompt — Advanced Solar Tech Website (complete build spec)

Give this to a code/design tool (Claude Code, Cursor, v0) or a developer. It specifies **one reusable structure used across every page**, the SEO / AI-search (AIO) / lead-generation requirements, the site's information architecture, data models, and a definition of done. **Build the structure, templates and plumbing first; real content and the live quote calculator come in a later task.**

---

## Role & objective
You are a senior front-end engineer + technical SEO. Build a **fast, accessible, professional solar-company website** from **one reusable structure applied consistently to every page**. It must be optimised for SEO and AI-search, engineered to generate leads, and built so new service, brand and location pages are added **from data without duplicating layout** — enabling expansion from Victoria to all of Australia.

## Business context
- **Advanced Solar Tech** — designs, supplies and installs solar panels, battery storage and EV chargers for homes and businesses.
- Currently Victoria; **architecture must scale to multiple states/cities.**
- Keep the logo: `https://advancedsolartec.com.au/wp-content/uploads/2022/11/Advanced-solar-Logo-01.png` (with text fallback). Phone `+61 403 657 585`. Primary action everywhere: **Get a Quote**.

## Tech approach (component-based & data-driven — required)
Recommended: **Astro** (static, fast, great SEO) — or Next.js, or a WordPress **block theme** if staying on WordPress. Whatever the stack, it MUST have: a shared base layout, a small set of page templates, a reusable component library, centralised design tokens, and **content stored as data** (JSON/Markdown/CMS) so pages are generated, never hand-copied.

---

## 1 — Information architecture (the site map)
Build these routes. Today's site has ~69 pages, many thin/duplicated — this consolidates them into a clean, scalable tree.

```
/                         Home (short)
/services/                Services overview
  /services/solar-panels/         ServiceTemplate
  /services/battery-storage/      ServiceTemplate
  /services/ev-chargers/          ServiceTemplate
  /services/commercial-solar/     ServiceTemplate
/products/                Products overview
  /products/panels/               BrandTemplate group
  /products/inverters/
  /products/batteries/
  /products/ev-chargers/
  /brands/[brand]/                one page per brand (from data)
/locations/               Service-area hub (national scaling)
  /locations/[state]/             LocationTemplate (e.g. /locations/victoria/)
  /locations/[state]/[city]/      optional city pages (from data)
/about/                   About
/contact/                 Contact + quote form
/quote/                   Get a Quote (lead form; calculator lives here later)
/resources/               Blog / guides hub
  /resources/[slug]/              ArticleTemplate
/privacy/  /terms/         LegalTemplate
```
**Consolidation rule:** every current duplicate/near-duplicate brand page (e.g. `solaredge`, `solaredge-2`, `solaredge-3`; `huawei`/`huawei-2`; `goodwe`/`goodwe-2`; `saj`/`saj-2`; `sungrow`/`sungrow-2`; `lg-energy-solution`/`-2`; `residential`/`residential-2`) collapses into **one** page, with 301s from the old URLs (see §7). Delete placeholders (`/sample-page/`, `/check-form/`).

## 2 — The reusable structure (core requirement)

### Design tokens (single source of truth)
Define once, use everywhere — no hard-coded values in components:
- Colours: navy `#0A2540`, solar gold `#FFB020`, green `#10B981`, bg `#F5F8FC`, surface `#FFFFFF`, text `#1E2A38`, muted `#5B6B7C`, line `#E4EDF4`.
- Fonts: headings *Plus Jakarta Sans* (700/800), body *Inter*.
- Spacing scale, radius, shadows, breakpoints (mobile ≤600, tablet ≤960, desktop).

### Base layout (wraps EVERY page)
`BaseLayout` renders in order: (1) `<head>` SEO block — dynamic title, meta description, canonical, OG/Twitter, JSON-LD slot; (2) skip-link; (3) `SiteHeader` (logo, nav, click-to-call, sticky **Get a Quote**, mobile menu); (4) `<main>` slot; (5) `CtaBand`; (6) `SiteFooter` (NAP, links, service areas, socials, legal); (7) minimal global JS (menu, accordion, scroll-reveal). Every page = BaseLayout + one template + components, so header/footer/spacing are identical by construction.

### Page templates (all extend BaseLayout)
`HomeTemplate` (short: hero → services overview → 3-point why-us → one stats band → CtaBand), `ServiceTemplate`, `LocationTemplate`, `BrandTemplate`, `ArticleTemplate`, `ContactTemplate`, `QuoteTemplate`, `LegalTemplate`.

### Component library (reused across templates)
`InnerHero`, `SectionHeader`, `FeatureCardGrid`, `SplitFeature`, `StatsBand`, `TestimonialGrid`, `LogoStrip`, `RebateCards`, `StepsProcess`, `FAQAccordion`, `TrustBar`, `LeadForm`, `CtaBand`, `Breadcrumbs`, and a `QuoteCalculator` **placeholder shell** (styled, empty; wired later). Components are presentational, driven by props/data.

### Folder structure
```
src/
  tokens/        design tokens (colours, type, spacing)
  layouts/       BaseLayout
  templates/     Home, Service, Location, Brand, Article, Contact, Quote, Legal
  components/    the component library above
  data/          services.json, brands.json, locations.json,
                 testimonials.json, faqs.json, nav.json, business.json
  styles/        global styles built from tokens
  pages/         routes mapping to templates + data
public/          robots.txt, sitemap.xml (generated), llms.txt, images, favicon
README.md        how to add a service / brand / location from data
```

## 3 — Data-driven content (makes scale safe)
Templates loop over `data/` to generate pages. **Adding a location or service = adding a data entry, not writing layout.**

```jsonc
// data/business.json  (single source for NAP + schema)
{ "name":"Advanced Solar Tech", "phone":"+61 403 657 585",
  "email":"info@advancedsolartec.com.au", "areaServed":"Victoria, Australia",
  "social":["https://www.facebook.com/Advanced.solartech"] }

// data/services.json (one entry per service page)
[{ "slug":"battery-storage", "title":"Battery Storage",
   "metaTitle":"Solar Battery Storage in Victoria | Advanced Solar Tech",
   "metaDescription":"Store your solar and cut evening bills...",
   "intro":"...", "benefits":["...","..."], "faqs":["faq-battery-cost"] }]

// data/locations.json (national scaling — unique local content each)
[{ "slug":"victoria", "state":"Victoria",
   "rebateSummary":"Federal STC + ~30% federal battery rebate, PLUS the Victorian solar rebate & interest-free loans.",
   "metaTitle":"Solar Panels in Victoria | Advanced Solar Tech",
   "servicedByPartner":false }]
```
Location pages must be **genuinely unique** (state rebates differ: federal STC + ~30% federal battery rebate are national; VIC/ACT/WA/SA have extra state schemes; NSW/QLD/TAS/NT are largely federal-only). Never generate a per-suburb page with only the name swapped.

## 4 — SEO requirements (from the start)
- Per-page, data-driven `<title>` (keyword + location) + unique meta description + `canonical` + OG/Twitter.
- Semantic HTML: exactly one `<h1>`/page, ordered headings, landmarks, descriptive `alt` on every meaningful image.
- **JSON-LD per template** — provide these (example shells):
```html
<!-- site-wide -->
<script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness",
"name":"Advanced Solar Tech","telephone":"+61 403 657 585","areaServed":"Victoria, Australia",
"url":"https://advancedsolartec.com.au","sameAs":["https://www.facebook.com/Advanced.solartech"]}</script>
<!-- service pages: Service · brand pages: Product · articles: Article · FAQs: FAQPage · inner pages: BreadcrumbList · real reviews: AggregateRating -->
```
- Auto-generated XML sitemap; clean URLs; internal linking between related services/brands/locations.
- Performance/Core Web Vitals (see §8). Accessibility WCAG 2.1 AA.

## 5 — AIO requirements (AI-search readiness)
- Valid structured data (above) so AI can extract entity facts.
- Reusable **"Key facts" block** + **FAQ content** as concise factual Q&A with `FAQPage` markup.
- State services, service areas, accreditations, brands, warranties as plain factual sentences; keep NAP/claims identical everywhere.
- Add `public/llms.txt`:
```
# Advanced Solar Tech
> Solar panel, battery & EV charger installation across Victoria, Australia.
## Key pages
- /services/ : Solar, battery, EV charging & commercial solar
- /locations/ : Service areas & state rebates
- /quote/ : Get an instant quote
- /contact/ : Phone +61 403 657 585
```
- Keep AI crawlers allowed (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) in `robots.txt`.

## 6 — Lead-generation requirements
- `LeadForm` — **short step 1 (4–6 fields):** first name, last name, phone, email, suburb/postcode, property type (Residential/Commercial). Optional **step 2** (progressive, after step 1): interest (solar / solar+battery / EV / not sure), quarterly bill range, notes. Client-side validation, honeypot + rate-limit, clear success state, built to POST to email/CRM (leave the endpoint configurable).
- **Sticky header Get-a-Quote CTA** on all pages + **mobile click-to-call bar**.
- `TrustBar` (CEC/accreditation badges) + `TestimonialGrid` (real reviews) surfaced on key pages; `CtaBand` closes every page.
- `QuoteCalculator` placeholder on `/quote/`: later takes an address → estimates roof/solar potential via **Google Maps Platform Solar API** → applies a price list → shows an **indicative** estimate → captures the lead. Build the shell so it drops in with no layout change.

## 7 — Redirects (protect existing rankings)
Produce a `redirects` map (301) covering every consolidated/removed URL → its new home, e.g. `/solaredge-2/ → /brands/solaredge/`, `/residential-2/ → /services/solar-panels/`, `/sample-page/ → /`. No old ranking URL may 404.

## 8 — Performance & quality targets (definition of done)
- **Core Web Vitals (mobile):** LCP < 2.5s, CLS < 0.1, INP < 200ms. Total initial page weight target < 1 MB; images lazy-loaded, WebP/AVIF, sized to prevent layout shift; JS minimal.
- **Lighthouse:** ≥ 90 on Performance, SEO, Accessibility, Best Practices.
- **DRY:** no duplicated markup — one header/footer/component set; editing the header once updates every page.
- Valid HTML; all structured data passes Google's Rich Results test; every page has one h1, a title, a meta description, and canonical.
- Clean, documented, consistently formatted code; components small and single-purpose; all internal links relative; works in local preview.
- README explains adding a service/brand/location from data.

## 9 — Build sequence (do in this order)
1. Design tokens + global styles.
2. `BaseLayout` + `SiteHeader` + `SiteFooter` + `CtaBand`.
3. Component library.
4. Page templates wired to `data/`.
5. Sample pages: Home, one Service, one Brand, one Location, Contact/Quote.
6. SEO/AIO plumbing: meta, JSON-LD, sitemap, robots, llms.txt, redirect map.
7. `QuoteCalculator` placeholder shell.
8. QA against §8 checklist.

## What to build now vs later
- **Now:** the reusable structure — tokens, BaseLayout, all templates, component library, the sample pages above, full SEO/AIO plumbing, redirect map, and the calculator placeholder.
- **Later (separate task):** full content across all pages, the live calculator (Google Solar API + price list + CRM/email wiring).

## Deliverable
A component-based codebase where **every page is composed from the same layout, templates and components**, is SEO- and AIO-ready out of the box, engineered for lead capture, meets the §8 targets, and grows to new services and Australian locations by adding data — not by rewriting layout. Consistent, fast, accessible, professional throughout.
