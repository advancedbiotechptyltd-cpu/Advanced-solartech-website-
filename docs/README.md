# Specs and reference

The written brief for this site, kept in the repo so the reasoning behind a
decision outlives the chat it was made in. Nothing here is built or published —
`docs/` sits outside `src/pages/` and `public/`, so it never reaches `dist/`.

`MASTER-BUILD.md` is the current source of truth; the numbered prompts in
`specs/` are the history behind it.

## specs/ — what was asked for

| File | Covers |
|---|---|
| `1a-website-build-prompt.md` | The Astro site: structure, SEO/AIO, lead generation, performance targets. **Built.** |
| `1b-catalogue-manager-prompt.md` | Supplier catalogue manager — admin page + backend, CSV-first, scraping as a later layer. **Not built here; see below.** |
| `1c-content-editor-reviews-products-cec-prompt.md` | Parts A–E: CMS, Google reviews, per-product pages, third-party reviews, CEC approval check. **Part A built.** |

## reference/ — background

| File | Covers |
|---|---|
| `website-audit.html` | Audit of the old WordPress site. The redirect map in `src/data/redirects.json` comes from this. |
| `improvement-plan.html` | The phased roadmap. |
| `catalogue-manager-plan.md` | Thinking behind the catalogue tool. |
| `heat-pump-page-content.md` | Owner-approved hot water heat pump copy, and the confirmation of CEC Approved Retailer / Accredited Installer status. Both are applied — see `src/data/services.json` and `src/data/business.json`. |

## What is deliberately not in this repo

**The supplier catalogue data** (`catalogue-seed.json` / `.csv` / the xlsx —
247 product-supplier lines) is not committed here, and neither is the catalogue
manager itself.

**This repository is public.** It is a marketing site, so that is fine for
everything in it — but it makes the catalogue question trivial to answer. The
catalogue is a list of who Advanced Solar Tech buys from, at what SKU, with a
price column meant to be filled in. That is the commercial core of the
business, and it cannot live in a public repository.

There is also a build-shape problem. `1b` specifies a Postgres database behind
staff authentication. This repository builds to flat files served by cPanel,
with no server-side runtime and no way to authenticate anyone. There is nowhere
in this deployment supplier data could sit and stay private, public repo or not.

So the catalogue gets its own private repository and its own backend on
Railway. Until that exists, the seed files stay outside version control.

The same reasoning applies to §9's pricing spreadsheet and §10's customer and
installer data.
