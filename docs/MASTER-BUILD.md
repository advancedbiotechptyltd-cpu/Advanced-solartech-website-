# Master build — status

Mirrors the owner's master prompt. Update the status here when a section moves.

| § | Feature | Status |
|---|---|---|
| 0 | Project isolation & deploy | **Done** — this repo, Action builds → FTP to cPanel, Apache redirects |
| 1 | Core site + content decisions | **Done** |
| 2 | Content editor (CMS) | **Built** — needs the owner's GitHub token + 4 FTP secrets |
| 3 | Real Google reviews | **Done** — fetched at build time, weekly refresh. Content gate passes |
| 4 | Page per product | **Done** — 245 products, 51 brands, all from catalogue.json |
| 5 | Third-party product reviews | **Parked** — no licensed feed |
| 6 | CEC approved-product check | **Blocked** — needs the CEC data file. Slot reserved on the product page |
| 7 | Multi-language | **Not started** |
| 8 | Catalogue manager | **Later** — own private repo + Railway |
| 9 | Roof-quote calculator | **Later** — Railway |
| 10 | Accounts, roles, installer job board | **Later** — Railway |

## §1 decisions as built

**Five services.** Solar Panels, Battery Storage, Hot Water Heat Pumps, EV
Chargers, Commercial Solar. No Maintenance.

**Four accreditations**, in `business.json` — CEC Approved Solar Retailer, CEC
Approved Designer, Tesla Certified Installer, SolarEdge Certified Installer.
Solar Accreditation Australia, Solar Victoria and the standalone CEC Accredited
Installer badge were removed. Logos drop into `src/images/accreditations/`; see
that folder's README for where each comes from and the trademark rules.

Worth verifying before launch: designer and installer accreditation is
administered by Solar Accreditation Australia, retailer approval by the Clean
Energy Council. "CEC Approved Designer" is the owner's wording — check it
against the certificate.

The line *"All installations are carried out by a fully accredited CEC installer
and a Grade A electrician"* renders under the badges on the home, quote and
service pages, and in the footer.

**No installations-completed stat.** Removed, and `check:content` reports the
empty stats band as a note rather than a warning so it never reads as a to-do.

**Coverage.** VIC and NSW direct; every other state fulfilled by accredited
partners. Leads are accepted from everywhere — only the fulfilment message
changes. One source of wording in `business.coverage`, consumed by the service
areas page, footer, state pages, contact page and the quote form's state
selector, which reveals the partner message the moment a partner state is
chosen.

`areaServed` in the LocalBusiness schema lists VIC and NSW only. Partner reach
is stated in the copy but deliberately not marked up — telling Google this
business installs in Perth would be a false local signal.

Two guards in `check:content` keep it honest: `serviced` and
`servicedByPartner` must be opposites, and `coverage.directStates` must match
the states actually flagged direct.

## Owner inputs still outstanding

| Needed | For | Notes |
|---|---|---|
| ~~Google Maps API key~~ | §3 | Supplied. Add as the `GOOGLE_MAPS_API_KEY` repository secret |
| GitHub token + `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_SERVER_DIR` | §2 | Fine-grained token, this repo, contents read/write |
| Accreditation logos ×4 | §1 | Each program's own partner portal |
| Real photos + logo | §1 | Drop into `src/images/` by filename; illustrations step aside automatically |
| CEC approved-product CSV/PDF | §6 | Ingested as a dated snapshot |
| Native-speaker review per language | §7 | Especially rebate and safety wording |
| Catalogue seed + pricing spreadsheet | §8, §9 | Private repo only — never here |

## §3 as built

Reviews come from Place ID `ChIJnztesYM51moRtCUs43kWhxU` — **Advanced Solartech,
14 Flowerdrum Cl, Templestowe VIC 3106**, 4.9★ from 51 ratings.

`scripts/fetch-google-reviews.mjs` runs before every deploy and weekly on its
own schedule, writing `src/data/testimonials.json`. The result is committed so a
build never depends on the API being up.

The script re-verifies the listing's address on every run and refuses to write
if it does not contain "Templestowe VIC". That guard exists because of
**Advanced Solar Technology Since 2009**, 26 Mumford Pl, Balcatta WA — a
different company with a confusingly similar name, whose reviews would
otherwise be publishable here by a single wrong character. Verified: pointing
the config at that Place ID makes the fetch refuse and leave the file untouched.

The key is used at build time only, from the repository secret. It is never in
committed data and never in shipped JavaScript — `.env.example` documents why it
must not carry Astro's `PUBLIC_` prefix.

AggregateRating in the LocalBusiness schema is derived from the fetched figures
rather than a hand-typed copy, so the structured data cannot drift from what the
page shows.

`check:content` fails if the snapshot passes 30 days, which is Google Maps
Platform's caching limit.

## §4 as built

`src/data/catalogue.json` is the PUBLIC catalogue: 245 products, 51 brands,
four categories. Brand, model, specification and manufacturer document links —
no supplier codes, no prices. The gate fails the build if a field matching
`price|cost|nett|supplier|margin|trade` ever appears, because this repository is
public and that would be a commercial disclosure rather than a formatting slip.

Everything under `/products` and `/brands` is generated from it. Adding a row
creates a product page and a card on its brand page; there are no hand-written
product pages.

- `/products` opens with a strip of all 51 brands, each linking to its page.
- `/products/{category}/` lists that category's brands and first twelve models.
- `/brands/{slug}/` lists that brand's full range.
- `/products/{category}/{slug}/` is the product page.

**Logos.** Drop `src/images/brands/{brand_slug}.svg` in and it appears. Until
then a monochrome wordmark fills the same box — with 51 brands the fallback is
the normal state, not an error state, and a broken-image icon in a row of
manufacturer logos reads as a dead site.

**Documents.** A button renders only when the catalogue holds that URL. Empty
means "not supplied yet" and is shown as "available on request". Nothing here
can produce a dead link. 28 of 245 currently have at least one document.

**Availability.** Every product is `unavailable` today, which shows a badge and
softens the call to action to "Enquire about this product". The page still
renders in full — specifications and documents stay visible, because someone
researching a product still needs them.

**Brand copy.** Six brands have hand-written strengths and trade-offs in
`brands.json`; that section is omitted for the other 45 rather than filled in
with something plausible. Writing a considered view on a brand nobody here has
one about is exactly the invention the content gate exists to stop.

**Reserved.** The product page leaves a slot for the CEC approved-product check
(§6) and third-party reviews (§5), empty rather than filled with a "coming
soon" panel repeated across 245 pages.

**Editing.** The CMS has a Products collection over `catalogue.json`, filtered
by availability, with a per-row summary — the owner will mostly toggle
availability and paste document links.

## Filling the catalogue in

`npm run gaps` reports what is missing and writes `catalogue-gaps.csv`, a row
per product. It ranks brand logos by how many product pages each would fix —
the top ten brands cover 162 of the 245 pages, so that is where an hour goes
furthest.

Current state: specifications complete for all 245; datasheets on 16; no brand
logos or product photos yet.

Logos go in `src/images/brands/{brand_slug}.svg`, photos in
`src/images/products/product-{slug}.jpg`. Both folders have a README covering
where to source them and the trademark rules that come with using a
manufacturer's mark as a reseller.

The research itself has to be done by a person with a browser: this build
environment's network policy blocks every manufacturer site, so nothing here
can fetch a logo, an image or a datasheet.
