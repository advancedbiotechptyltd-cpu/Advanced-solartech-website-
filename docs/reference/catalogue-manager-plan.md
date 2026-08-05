# Admin "Supplier Catalogue Manager" — plan

A tool in your website admin that stores the product database and refreshes supplier data over time — automating what was done manually. Hand this to your developer / code tool. Honest about what's automatable and what isn't.

---

## What it is
An admin page (**Catalogue Manager**) backed by a service on **Railway** that:
1. Stores the master product catalogue (the 247-line database) in a database.
2. **Auto-refreshes** the suppliers whose sites are public, on a schedule.
3. Lets you **import/enter** the login-only suppliers via CSV or a form.
4. Compares supplier prices per product and **feeds your quote calculator**.

## Honest scope (read this first)
- **Auto-scrape works only for public, server-readable suppliers:** OSW, AC Solar Warehouse, Luxco, Krannich, Go Solar. Even these paginate, so the scraper needs a real headless browser to page through them.
- **Cannot reliably auto-scrape:** Tradezone (blocks bots — 403), MMEM & Solar Juice & Raystech (login-only / no public models). Automating these means storing your trade logins and scraping as you — fragile, high-maintenance, and typically **against the supplier's terms of service**. Recommended: handle these by **CSV import or manual entry**, not scraping.
- **Scrapers break when suppliers change their sites** — this needs occasional maintenance, not "set and forget."
- **Best long-term source is a supplier feed/API or price file.** Ask each wholesaler if they provide a trade price list (CSV/Excel) or API — most do for trade customers. A clean feed beats scraping every time.

## Architecture
- **Backend (Railway):** Node.js service + **Playwright** (headless Chromium) for the JS/paginated sites + **PostgreSQL** for the catalogue.
- **Scheduler:** a cron job (e.g. weekly) runs each public supplier's scraper, upserts products, records changes.
- **Admin UI (on your website):** a protected page to view the catalogue, trigger a refresh, upload CSVs, edit prices, and export.
- **Feeds the calculator:** the calculator reads product data + your prices from the same database.

## Data model (core tables)
- `products` — id, category, brand, model, power/capacity, specs, datasheet_url, manual_url, image_url.
- `suppliers` — id, code (OSW/ACW/…), name, colour, type (auto | csv | manual), login_required.
- `supplier_products` — product_id, supplier_id, supplier_sku, **your_price**, last_seen, source (scrape/csv/manual). One row per product-per-supplier (matches the coded sheet).
- `price_history` — track price changes over time.

## Admin page features
1. **Catalogue table** — filter by category/brand/supplier; the coded/coloured view you already have.
2. **"Refresh from suppliers"** button + schedule — runs the public-supplier scrapers, shows what changed (new / removed / updated).
3. **CSV import** — upload a supplier's exported price list; map columns; merge into the catalogue (this is how the login-only suppliers get in).
4. **Manual add/edit** — for one-off products or price updates.
5. **Price comparison** — per product, cheapest supplier highlighted.
6. **Datasheet/manual/image management** — store links / upload files.
7. **Export** — CSV/Excel of the whole catalogue.
8. **Feed to quote calculator** — mark which product+price to use for quoting.

## Build order (MVP first)
1. Database + import the existing 247-line catalogue as the seed data.
2. Admin catalogue page (view/filter/edit/export) — useful immediately, no scraping needed.
3. CSV import (covers every supplier, including login-only) — this alone gets you "all data in future" with minimal fragility.
4. Then add auto-scrapers for the 5 public suppliers, one at a time, with the weekly schedule.
5. Wire the catalogue + your prices into the quote calculator.

## Important caveats to accept before building
- **Terms of service / legal:** scraping behind a supplier login can breach your trade agreement. Prefer official price feeds or CSV export. I'm not a lawyer — confirm with each supplier or your own advice before credential-based scraping.
- **Credentials security:** if you ever store supplier logins, they must be encrypted and access-controlled on the backend, never in the website front-end.
- **Maintenance:** budget for occasional scraper fixes when sites change.

## Recommendation
Build steps 1–3 first (database + admin page + CSV import). That gives you a living catalogue you fully control and can update forever, with zero scraping risk. Add the public-supplier auto-scrapers (step 4) as a convenience on top. Treat scraping login-only suppliers as out of scope unless a supplier explicitly permits it or gives you a feed.
