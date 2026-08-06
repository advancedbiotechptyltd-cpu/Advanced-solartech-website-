# Brand logos

Drop `{brand_slug}.svg` here and it appears in the brand strip, on that brand's
page, and on every one of its product pages. Nothing else to change.

`npm run gaps` lists which are missing, ranked by how many product pages each
one would fix — the top ten brands cover far more pages than the bottom thirty.

## Filenames

The name must match `brand_slug` in `src/data/catalogue.json` exactly:
`fronius.svg`, `jinko.svg`, `alpha-ess.svg`, `ae-solar.svg`.

`.svg` is best — a few KB, sharp at any size. `.png` with a transparent
background also works. Logos render into a 120 × 44 box, scaled to fit.

## Where to get them

Each manufacturer's own press or partner page — search "<brand> logo press kit"
or "<brand> brand guidelines". Take the official file, not a screenshot and not
a Google Images result: those are usually outdated versions or the wrong
variant.

## Before you upload

These are other people's trademarks. Using a manufacturer's logo to say "we
supply and install this" is normal practice for a reseller, but the rules are
theirs:

- Follow the brand guidelines where they publish them. Most set a minimum size
  and clear space, and forbid recolouring or stretching the mark.
- Do not imply endorsement, partnership or authorisation you do not have.
  Listing a product is not the same claim as "authorised dealer".
- Remove the logo if you stop carrying the brand.

The site renders logos in greyscale by default and in colour on hover, which
keeps a strip of fifty from becoming a rainbow — that is a display treatment,
so check it against any guidelines that forbid recolouring.

## Until a logo is there

A monochrome wordmark fills the same box. With 51 brands that is the normal
state, not an error state — the strip looks deliberate whether two logos are
present or all of them. There is no rush and nothing is broken.
