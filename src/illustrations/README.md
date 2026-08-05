# Interim illustrations

Vector artwork that holds every image slot on the site until real photographs
arrive. Drawn for this project, in the palette from `src/tokens/tokens.css`, so
they belong to the same design system as the pages rather than looking like
clip art dropped in.

## How they are replaced

Nothing. Drop `hero-install.jpg` into `src/images/` and it takes over from
`hero-install.svg` automatically — same name, photo wins. No edit to any
template, no file to delete. See `src/components/Figure.astro`:

```
src/images/<name>.<jpg|png|webp|avif>   →  used if present
src/illustrations/<name>.svg            →  otherwise
styled placeholder                      →  if neither
```

`npm run check:content` prints which slots are still on an illustration, so the
shot list stays visible instead of quietly becoming permanent.

## Why illustrations rather than stock photos

Stock is the better answer once someone can license and choose it. These exist
because they can be made here and now, they are 4–20KB each, they stay sharp at
any size, and — unlike a stock photo of somebody else's install — they make no
claim about work this business has done.

## Editing them

`scripts/make-illustrations.py` regenerates the set. Panels are tiled from the
roof plane's own edge vectors rather than drawn as skewed rectangles, which is
what stops a panel overhanging the roof it sits on; the same helper places
windows on wall planes. Change a scene there and re-run, rather than hand-editing
the SVG output.

## What is still missing

These cover categories, not this business. A photograph of an actual install, an
actual switchboard and actual installers will outperform any illustration for
trust — which is the whole point of the page. Treat these as scaffolding.
