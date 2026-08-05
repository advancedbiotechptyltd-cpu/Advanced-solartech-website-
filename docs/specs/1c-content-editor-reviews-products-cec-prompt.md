# Implementation Prompt — Content editor + Google reviews + product pages + product reviews + CEC check

Give this to the code tool that built the Astro site (branch `claude/advanced-solartech-488d5g`). Five parts (A–E). Seed product data comes from the Catalogue Manager DB / `catalogue.json` (247 product-supplier lines).

## PROJECT ISOLATION (required — read first)
The Advanced Solar Tech website is currently sharing a repository with an unrelated project, and its files are getting mixed together. Fix this:
- **Keep 100% of Advanced Solar Tech code in ONE dedicated top-level folder** (the existing `site/` app folder) — frontend, backend, CMS config, data, and docs all under it. Do **not** place any solar files in shared or other-project directories.
- **Strongly preferred: move the Advanced Solar Tech project into its own separate git repository**, fully independent of the other project, so nothing is co-mingled. If a separate repo isn't possible right now, everything must at least be quarantined under the single `site/` folder.
- All new work in this prompt (CMS, reviews, product pages, CEC check, backend) goes **inside that one solar folder/repo** — never mixed with the other project's files.

---

## PART A — Content editor (CMS)
Add a **headless CMS** (Sveltia / Decap — free git-based; or TinaCMS — visual) so non-technical staff edit the site through a labelled form dashboard at `/admin`, behind staff login, with drag-and-drop image upload (required alt-text), preview, and auto-publish via the existing git → Netlify/Vercel deploy.
Editable: Home (hero, stats, CTA), Services (incl. **Heat Pumps**), Products/brands text, Locations, About, FAQs, Contact details, Blog/Resources. Logo & colours stay developer-controlled. **Testimonials are not manual — see Part B.** SEO title/meta editable per page with character counters. Structured fields only (no free HTML).

## PART B — Real Google reviews (replace placeholder testimonials)
The testimonials section shows the business's **real Google reviews** (star rating, name, date) with a link to the Google profile, auto-updating, with a clean fallback if it fails — never invented text.
- Google profile: **https://share.google/ArMy0rQPqSfrvBMew** → resolve to the Place ID (or ask the owner for exact name + suburb).
- Option A: Railway backend calls Google Places **Place Details** for the Place ID, caches ~daily, renders natively (official API returns up to ~5 reviews). Reuse the Google Maps Platform key from the roof-quote calculator. Option B: a reviews widget (Trustindex/Elfsight/Featurable). Pick one, justify.

## PART C — A dedicated page for every product
Generate **one page per product** in the catalogue, under its product line, using a single consistent product template.
- Route pattern: `/products/{category}/{brand}-{model-slug}/` (e.g. `/products/panels/jinko-tiger-neo-475w/`).
- Content per page: product name, brand, full specifications, description, **datasheet** and **installation manual** (download buttons), and **image(s)**.
- **Images & missing info:** use the manufacturer's official product image and spec sheet. If a field or image isn't in our data, fetch it from the **manufacturer's official website** and build out a complete information page. Use only manufacturer-authorised images/specs; host the images on our site; add alt text.
- Each product page also shows: a **"Get a quote for this product"** CTA, its **CEC approval** status (Part E), and its **reviews** (Part D).
- Data-driven: pages generate from the catalogue DB so new products automatically get a page. Group/link products by line (panels, inverters, batteries, EV chargers, heat pumps).

## PART D — Product reviews (from reputable AU sources)
On each product (or brand) page, show relevant review sentiment sourced from established Australian solar review sites (e.g. **SolarQuotes**, **SolarChoice**), displayed **on our page** so visitors don't need to leave.
- **Compliance (must follow — protects the business):** do NOT copy and republish full third-party reviews as if they were ours. That is likely copyright infringement and breaches those sites' terms. Instead:
  - Show the **aggregate rating** and a **short attributed excerpt** (1–2 sentences), clearly crediting the source by name (e.g. *"4.7★ — as rated on SolarQuotes"*). Keep excerpts minimal.
  - Prefer an **official widget / API / licensed feed** from the review site if one exists.
  - Present them explicitly as **third-party product reviews**, never as the business's own testimonials.
  - The owner should confirm permission before republishing any substantial content.
- Honour the "keep visitors on-site" intent by rendering on our page and not forcing an outbound click — but the **source attribution text must remain** even without a hyperlink.
- Fallback: if no review data is available for a product, hide the section cleanly.

## PART E — CEC approved-product check (on-page)
Add a **"CEC approved product" check** that lets a visitor confirm a product's Clean Energy Council approval **without leaving our page**.
- Ingest the **Clean Energy Council approved product lists** (approved PV modules, inverters, and batteries) into the catalogue DB, and match each of our products to its CEC listing; store approval status + listing reference.
- On each product page, show a **"CEC Approved ✓"** badge when listed. Add a **search box** ("Check CEC approval") where a visitor types a product/brand and sees the approval result **rendered on our page** from the ingested data — no redirect to the CEC site.
- **Do not iframe or live-scrape the CEC website** (fragile / against terms). Use their published approved-product data and refresh it periodically. An optional "View on CEC" link may be included but is not required; the status is shown from our own data.

---

## Code organisation — keep each part in its own files in git
Build each feature as a **separate, self-contained module committed to the repo** — do not tangle them into existing pages. Each must be independently maintainable and removable. Suggested layout (adapt to the stack):
- **CMS (Part A):** its own config — e.g. `src/cms/config.yml` (Sveltia/Decap) or `tina/` (TinaCMS). Do not scatter CMS settings across the codebase.
- **Google reviews (Part B):** backend `server/reviews/google-reviews.js` (fetch + cache) and frontend `src/components/GoogleReviews.astro`.
- **Product pages (Part C):** one route file `src/pages/products/[category]/[slug].astro` + one shared `src/templates/ProductPage.astro`; product data from the catalogue DB / `catalogue.json`. No per-product hand-written pages.
- **Product reviews (Part D):** backend `server/reviews/product-reviews.js` + frontend `src/components/ProductReviews.astro`.
- **CEC check (Part E):** backend `server/cec/cec-approved.js` + ingested data under `data/cec-approved/` + frontend `src/components/CecCheck.astro`.
- Commit each as its own clearly-named file(s) with a one-line header comment explaining what it does. Keep this prompt in the repo (e.g. `docs/`) as the feature spec.

## Deliverable
A secure `/admin` CMS for staff editing; a testimonials section driven by real Google reviews; a dedicated, consistent info page for every catalogue product (specs, datasheet, manual, manufacturer images, CTA); attributed third-party product reviews shown on-page; and an on-page CEC approved-product check — all data-driven, fast (Core Web Vitals green), and with no invented content and no infringing republished content anywhere.
