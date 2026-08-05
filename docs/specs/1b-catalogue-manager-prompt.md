# Implementation Prompt — Admin "Supplier Catalogue Manager"

Give this to the code tool that built the site. It builds an admin tool for managing the supplier product catalogue and refreshing supplier data over time. Seed data is provided (`catalogue.csv` / `catalogue.json`, 247 product-supplier lines).

---

## Role & objective
You are a senior full-stack engineer. Build a **"Catalogue Manager"** — a protected admin page on the Advanced Solar Tech website, backed by a service on **Railway** — that stores the product/supplier catalogue, lets staff update it (auto + CSV + manual), compares supplier prices, and feeds the quote calculator. **Build CSV-first (see build order); scraping is a later, optional layer.**

## Context
- The website is the Astro build on branch `claude/advanced-solartech-488d5g`. The dynamic backend runs on **Railway** (Node + Postgres).
- Seed the database from the attached **`catalogue.json`** (247 rows). Columns: `supplier_code, supplier, category, brand, model, power_or_capacity, specs, datasheet_url, manual_url, your_price`.
- Suppliers seen so far and how they must be handled:
  - **Auto-scrapable (public sites):** OSW, AC Solar Warehouse (ACW), Luxco (LUX), Krannich (KRN), Go Solar (GS), Energy Spurt (ES).
  - **CSV/manual only (login-gated or block bots — do NOT scrape):** Tradezone (TZ), MMEM AWM (MM), Solar Juice (SJ), Raystech (RS).

## Honest constraints (design around these)
- The public supplier sites are JavaScript apps that **paginate**; scraping them needs a real **headless browser (Playwright)**, and even then must page through each category.
- The login-only suppliers must NOT be scraped with stored credentials: it's fragile and typically breaches their trade terms. Handle them by **CSV import / manual entry** only.
- Scrapers break when sites change — build them as isolated, individually-runnable modules with clear logging, not a monolith.

## Architecture
- **Backend (Railway):** Node.js (or your stack) API + **PostgreSQL** + **Playwright** for scrapers. A **cron job** (e.g. weekly) runs enabled scrapers.
- **Admin UI:** a route like `/admin/catalogue`, behind authentication (staff login). Never expose it or the API publicly.
- **Calculator link:** the quote calculator reads product data + chosen prices from the same database.

## Data model (Postgres)
- `suppliers(id, code, name, colour, type[auto|csv|manual], login_required, scraper_enabled)`
- `products(id, category, brand, model, power_or_capacity, specs, datasheet_url, manual_url, image_url)`
- `supplier_products(id, product_id, supplier_id, supplier_sku, your_price, source[scrape|csv|manual], last_seen_at)`  — one row per product-per-supplier (matches the seed's coded lines)
- `price_history(id, supplier_product_id, price, recorded_at)`
- `scrape_runs(id, supplier_id, started_at, finished_at, added, updated, removed, status, log)`

## Admin page features
1. **Catalogue table** — the coded/coloured view: filter by category / brand / supplier; inline-edit `your_price`; sort so identical products across suppliers group together.
2. **CSV import** (build first) — upload a supplier's exported price/product list, map columns to the schema, preview, then upsert. This is how login-only suppliers get in.
3. **Manual add / edit** — add a product or a supplier line; edit prices/specs/links.
4. **"Refresh from suppliers"** — trigger the Playwright scrapers for the auto suppliers (individually or all), on demand and on the weekly schedule; show a diff (new / updated / removed) and the run log.
5. **Price comparison** — per product, list each supplier's price and highlight the cheapest.
6. **Docs & images** — store datasheet/manual URLs; upload/host product images.
7. **Export** — download the whole catalogue as CSV/Excel.
8. **Calculator feed** — mark, per product, which supplier price the quote calculator should use.

## Scrapers (the auto suppliers only)
- One module per supplier (`osw`, `acw`, `lux`, `krn`, `gosolar`, `energyspurt`), each: launches Playwright, visits each category, **pages through all results**, extracts brand/model/power/specs, and upserts into `supplier_products` (create the `product` if new). Records a `scrape_runs` row.
- Be resilient: per-item try/catch, sane timeouts, respect `robots.txt`, throttle requests, and **log what was skipped** rather than silently dropping. Prices are login-gated on these sites, so scrapers fill product data only — never invent prices.

## Build order (ship value early)
1. **Database + seed** from `catalogue.json` (247 rows). 
2. **Admin catalogue page**: view / filter / inline-edit prices / export. (Useful immediately, no scraping.)
3. **CSV import** — covers every supplier including login-only. This alone delivers "all data, updatable forever."
4. **Auto-scrapers** for the 6 public suppliers, one at a time, + weekly cron + diff view.
5. **Wire catalogue + chosen prices into the quote calculator.**

## Security & compliance
- Admin page and API behind staff authentication; catalogue/prices never exposed on the public site or in front-end code.
- If supplier credentials are ever stored (not recommended), encrypt at rest and restrict access; never in the front-end.
- Prefer official supplier price feeds / APIs over scraping where a supplier offers them — note in the UI which suppliers are `auto` vs `csv/manual`.

## Deliverable
A protected `/admin/catalogue` page + Railway backend that seeds from the provided data, lets staff view/edit/import/export the catalogue and compare supplier prices, optionally auto-refreshes the public suppliers on a schedule, and feeds the quote calculator — built CSV-first, with scraping as an isolated, maintainable add-on.
