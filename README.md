# Advanced Solar Tech — website

A component-based, data-driven marketing site built with [Astro](https://astro.build).
Every page is composed from one base layout, one of eight templates, and a shared
component library. Content lives in `src/data` as JSON, so new services, brands and
locations are added by editing data — never by copying layout.

```
npm install
npm run dev             # local dev server
npm run build           # production build for the DOMAIN ROOT → dist/
npm run build:staging   # staging build for the /new SUBFOLDER → dist/ + upload .zip
npm run preview         # serve the built site
npm run verify          # root build, then both quality gates
npm run check:staging   # gate the staging build (asserts every path is under /new)
```

---

## Content editor (`/admin/`)

Staff edit the site through a form dashboard at `https://advancedsolartec.com.au/new/admin/`
(or `/admin/` once live). No code, no HTML — just labelled fields.

**What's editable:** home page copy, services, service areas, product brands,
FAQs, guides, business contact details, and the menus. Each page's SEO title and
description too, with length limits enforced as you type.

**What isn't, deliberately:** layout, colours, the logo and page structure. A CMS
that can change the design is a CMS that can break the design.

**Rules baked into the fields:** no free-HTML input anywhere, so a paste from
Word can't inject markup. Every image field requires alt text. URL slugs are
pattern-checked. Accreditations, statistics and testimonials stay switched off
behind a "not verified yet" toggle until they're real.

### No setup at all

The editor is a convenience, not a requirement. Anyone who can sign in to GitHub
can change any wording on the site straight from a browser — no token, nothing
installed. See `docs/EDITING.md` for a link per file.

### Signing in

The editor commits to GitHub, so it needs a GitHub identity. There are two ways
to give it one.

**One-click (recommended once set up).** Deploy the Cloudflare Worker in
`oauth-worker/` — free, about ten minutes, once — and set `base_url` in
`public/admin/config.yml`. After that **Sign In with GitHub** just works, for
everyone, forever. New staff need nothing but repository access. Full guide in
`oauth-worker/README.md`.

**Access token (works today, no setup).** Until the Worker is deployed, the
GitHub button dead-ends at Netlify's auth service — the editor's default when no
proxy is configured — so use a token instead:

1. GitHub → Settings → Developer settings → **Fine-grained personal access tokens**
   → **Generate new token**
2. Repository access: **Only select repositories** →
   `advancedbiotechptyltd-cpu/Advanced-solartech-website-`
3. Permissions → Repository permissions:
   - **Contents: Read and write** — this is the one that matters
   - **Metadata: Read-only** — GitHub adds this automatically; leave it
   - Nothing else
4. Expiration: 90 days is a sensible default. A token that never expires is one
   nobody ever gets around to revoking.
5. Generate, and copy the token — GitHub shows it once.
6. At `/admin/`, choose **Sign In Using Access Token** and paste it.

One token per staff member, so access can be revoked individually. Scope it to
the one repository — a broader token is a much bigger loss if it leaks.

**The `/admin/` page itself is public**, because it is a static file on a static
host. That is fine: it is an empty shell until someone supplies a token, and the
token is the actual access control. Anyone without one sees a sign-in prompt and
nothing else. If that still feels wrong, put an `.htaccess` password on the
`/admin/` directory in cPanel — belt and braces, and it costs nothing.

If you later want one-click "Sign in with GitHub", that needs an OAuth proxy
(a small Cloudflare Worker). See the comment at the top of
`public/admin/config.yml`.

### How an edit reaches the live site

```
Staff edit at /admin/  →  commit to GitHub  →  GitHub Action builds
                       →  FTP upload to cPanel  →  live
```

`.github/workflows/deploy-site.yml` does the build and upload. Without it a
git-based CMS just files changes nobody ships — the edit happens, the website
doesn't change, and staff stop trusting the tool inside a week.

**Setup (once).** Add four repository secrets under
Settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `FTP_SERVER` | e.g. `ftp.advancedsolartec.com.au` |
| `FTP_USERNAME` | a **dedicated** cPanel FTP account |
| `FTP_PASSWORD` | that account's password |
| `FTP_SERVER_DIR` | the production web root, e.g. `/public_html/` |

Staging deploys to `<FTP_SERVER_DIR>new/`, derived rather than hard-coded, so
this works on a host whose web root is not `public_html`.

Create the FTP account in cPanel scoped to the directory it deploys into — don't
use the main cPanel login. These credentials live in GitHub, and a scoped
account limits what a leak can reach.

**Where it deploys.** Commits go to `public_html/new/` (the staging preview)
automatically. Production is manual: Actions → Deploy website → Run workflow →
`production`. A content edit should never reach the live site without someone
choosing to publish it.

The workflow runs `check:html` before uploading and refuses to deploy a build
that fails — a broken canonical is easier to catch there than after it's live.

---

## Two build targets

The same source tree builds both, with no file edits between them:

| | `npm run build` | `npm run build:staging` |
|---|---|---|
| Served at | `https://advancedsolartec.com.au/` | `https://advancedsolartec.com.au/new/` |
| Astro `base` | `/` | `/new` |
| Robots | indexable | `noindex, nofollow` on every page |
| Extras | — | `.htaccess` (`X-Robots-Tag`), disallow-all `robots.txt`, upload `.zip` |

`base` comes from the `SITE_BASE` env var and staging from `PUBLIC_STAGING`, both
set by `scripts/build-staging.mjs`. **Going live at the root is just running
`npm run build`** — no config edit, no find-and-replace.

### Why internal links need a helper

Astro prefixes bundled assets (`/_astro/…`) with `base` automatically, but it does
**not** rewrite hand-written `href` values — those are opaque strings to the compiler.
So internal paths are stored canonically (`/services/`) and prefixed at render time by
`href()` from `src/lib/site.js`.

Any new internal link must go through it:

```astro
---
import { href } from "../lib/site.js";
---
<a href={href("/services/solar-panels/")}>Solar panels</a>   <!-- correct -->
<a href="/services/solar-panels/">Solar panels</a>            <!-- 404s under /new -->
```

`npm run check:staging` fails the build if any `href` or `src` in `dist/` escapes the
base, so a forgotten helper cannot ship silently. (It caught exactly that during the
first staging build — `SplitFeature`'s CTA.)

### Deploying the staging zip to cPanel

`npm run build:staging` writes `advanced-solar-tech-staging-new.zip` containing the
**contents** of `dist/`, not the folder. Upload it into `public_html/new/` and Extract
there; `index.html` must land at `public_html/new/index.html` with no nested folder.
Then open `https://advancedsolartec.com.au/new/` — with the trailing slash.

The Netlify/nginx redirect files are excluded from the staging zip: they do nothing on
Apache, and the legacy 301s belong at the domain root, not under `/new`.

---

## How it fits together

```
src/
  tokens/      tokens.css — every colour, size, radius and shadow. Single source of truth.
  styles/      global.css — reset, layout primitives, buttons, prose. Built from tokens.
  layouts/     BaseLayout.astro — wraps EVERY page: head/SEO, header, main, CTA band, footer.
  templates/   Home, Service, Location, Brand, Article, Contact, Quote, Legal.
  components/  The shared library. Presentational, driven entirely by props.
  lib/         site.js (data access) and schema.js (JSON-LD builders).
  data/        The content. JSON today, swappable for a CMS behind lib/site.js.
  pages/       Routes. Each one maps data to a template and does nothing else.
public/        robots.txt, llms.txt, favicon. Sitemap is generated at build.
scripts/       Build-time generation and the two quality gates.
```

The rule that keeps it consistent: **a page never renders its own header, footer or
CTA band.** `BaseLayout` does that. Edit the header once and all 40 pages change.

Components never hard-code a colour or a spacing value either. If a value is needed
that is not in `tokens.css`, it gets added there first.

---

## Adding content

### A new service

Add an entry to `src/data/services.json`. The page, its navigation entry, its
`Service` JSON-LD, its FAQ block and its internal links all follow.

```jsonc
{
  "slug": "hot-water-heat-pumps",
  "title": "Hot Water Heat Pumps",
  "summary": "One-line summary used on cards.",
  "icon": "bolt",                       // key from components/Icon.astro
  "metaTitle": "… | Advanced Solar Tech",   // aim for <= 60 characters
  "metaDescription": "…",                   // aim for 70–165 characters
  "heroKicker": "…", "heroHeading": "…", "heroBody": "…",
  "intro": "Paragraphs separated by \n\n",
  "benefits": [{ "title": "…", "body": "…" }],
  "process": "standard-install",        // key from data/process.json
  "faqs": ["solar-payback"],            // ids from data/faqs.json
  "relatedBrandCategory": "panels",
  "relatedServices": ["solar-panels"],
  "keyFacts": [{ "label": "…", "value": "…" }]
}
```

Then add it to `nav.json` under Services (primary and footer).

### A new brand

Add an entry to `src/data/brands.json` with a `category` matching one of
`PRODUCT_CATEGORIES` in `lib/site.js`. It appears on `/brands/<slug>/`, in its
category listing, and in the LogoStrip automatically.

`considerations` is required, not optional. A brand page that only lists strengths
reads as marketing copy to a person and as thin promotional content to a crawler.

If the brand replaces old URLs, list them in `consolidatedFrom` **and** add matching
rules to `redirects.json` — the content gate fails the build if you do one without
the other.

### A new location (this is how the site scales nationally)

Add a state or territory to `src/data/locations.json`:

```jsonc
{
  "slug": "new-south-wales",
  "state": "New South Wales",
  "abbr": "NSW",
  "serviced": false,          // true once installers operate there
  "metaTitle": "…", "metaDescription": "…", "heroHeading": "…",
  "intro": "What is genuinely different about solar in this state.",
  "rebateSummary": "One-sentence summary of what applies here.",
  "rebates": [{ "name": "…", "scope": "National" | "<State>", "detail": "…" }],
  "localNotes": "Networks, climate, roof stock — the local constraints.",
  "cities": ["…"]
}
```

Add cities to `src/data/cities.json` with a `state` matching a location slug.

**Location pages must be genuinely different from one another.** `npm run check:content`
fails the build if two locations share an identical `intro` or `localNotes`, because
near-duplicate pages with the place name swapped are how a local-SEO site gets
classified as doorway pages and demoted. Write about the actual local difference —
network export limits, irradiance, climate, roof stock, state schemes — or do not add
the page.

---

## SEO and AIO

Handled centrally, so a new page gets it without doing anything:

| Concern | Where |
|---|---|
| `<title>`, meta description, canonical, OG, Twitter | `BaseLayout.astro` (required props — the build throws if missing) |
| LocalBusiness + WebSite JSON-LD | `BaseLayout.astro`, every page |
| Service / Product / Article / FAQPage / BreadcrumbList | `lib/schema.js`, passed in by the template |
| XML sitemap | `@astrojs/sitemap`, generated at build |
| `robots.txt` (AI crawlers allowed) | `public/robots.txt` |
| `llms.txt` | `public/llms.txt` — update when key pages change |
| Key-facts blocks | `KeyFacts.astro` on every service, brand and location page |
| FAQ content | `FAQAccordion.astro` — answers are in the HTML, not behind JS |

Two rules worth keeping:

- **FAQ answers ship in the HTML.** The accordion collapses them after load. A crawler
  that does not run JavaScript still reads every answer, which is what makes the
  `FAQPage` markup legitimate.
- **JSON-LD is built from the same data as the visible page.** Never hand-write schema
  in a template; add a builder to `lib/schema.js` instead.

---

## Redirects

`src/data/redirects.json` is the single source. `npm run build` generates:

- `dist/_redirects` — Netlify / Cloudflare Pages
- `dist/redirects.nginx.conf` — `include` from an nginx `server` block
- `dist/redirects.json` — for any other host

All rules are **301**. Every URL on the old WordPress site must appear here or resolve
unchanged; a ranking URL that starts returning 404 loses its equity permanently.

---

## Quality gates

`npm run verify` runs the build and both gates.

**`check:html`** — runs against `dist/`. Fails on: a missing or duplicate title or meta
description, a missing canonical, zero or multiple `<h1>`, a missing OG tag, an `<img>
without alt, invalid JSON-LD, an internal link to a page that does not exist, or a
missing `robots.txt` / `llms.txt` / sitemap / `_redirects`.

**`check:content`** — runs against `src/data`. Fails on: placeholder content still marked
`placeholder: true`, a location missing its unique fields, two locations sharing prose,
a redirect pointing at a route that does not exist, or a brand's `consolidatedFrom` URL
with no redirect rule.

### The placeholder guard

Three things are deliberately shipped empty, and the components that use them render
**nothing** until real data replaces them:

| Data | Component | Why it is empty |
|---|---|---|
| `testimonials.json` | `TestimonialGrid` | Invented reviews are a misrepresentation under the Australian Consumer Law. |
| `business.accreditations` | `TrustBar` | Claiming CEC approved-retailer or accredited-installer status without the certificate is a false trade claim. |
| `business.stats` | `StatsBand` | Install counts and similar figures must be evidenced from job records. |
| `business.reviews` | `AggregateRating` JSON-LD | A fabricated rating is both a manual-action risk with Google and a misrepresentation. |

The guard is in `lib/site.js`, not only in the check script, so unverified claims cannot
reach a built page even if someone skips the gate. Set `placeholder: false` once the
real data is in.

---

## Still to do

1. **Content pass.** Replace the placeholder data above with verified material.
2. **Lead form endpoint.** Set `PUBLIC_LEAD_ENDPOINT` at build time. Until it is set the
   form does not submit — it shows a neutral "give us a call instead" panel with a
   tappable phone number, rather than a red error or a silent drop. That is deliberate
   for staging: the enquiry still has somewhere to go.
3. **Quote calculator.** `QuoteCalculator.astro` is an inert shell at final size — it
   collects nothing and estimates nothing. Wiring notes are in the file header:
   Google Places for the address, Google Maps Platform Solar API `buildingInsights` for
   roof geometry and irradiance, a price list, then hand off to `LeadForm` pre-filled.
   Keep the output a range with its assumptions beside it.
4. **Self-host the logo and fonts.** `business.logo.src` points at the existing
   WordPress upload, which costs a third-party DNS + TLS round trip on first paint. Drop
   the file into `public/` and change the path. Same for the two Google fonts.
5. **Legal review.** `/privacy/` and `/terms/` carry visible template notices. They have
   the right structure but have not been reviewed by a lawyer.

---

## Verified state

Built and measured, not assumed. Lighthouse (mobile emulation, headless Chromium) across
home, service, location, brand, product, article, contact and quote pages:

| | |
|---|---|
| Performance | 100 |
| Accessibility | 100 |
| SEO | 100 |
| Best Practices | 96 |
| LCP | 1.1 s |
| CLS | 0.002 |
| TBT | 0 ms |

Best Practices sits at 96 because of console errors from two external requests that this
build environment blocks — the WordPress-hosted logo and Google Fonts. Both resolve on a
normal network, and item 4 above removes them entirely.

`check:html`: 40 pages, 0 errors, 0 warnings.
