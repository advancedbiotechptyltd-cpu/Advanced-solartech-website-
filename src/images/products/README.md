# Product photos

Drop `product-{slug}.jpg` here and it replaces the category illustration on that
product's page. The slug is the `slug` field in `src/data/catalogue.json`, e.g.
`product-fronius-primo-gen24-plus-3-10kw.jpg`.

`npm run gaps` writes `catalogue-gaps.csv` listing every product still without
one, alongside its page address.

## Where to get them

The manufacturer's official product image, from their own site or dealer portal.
`image_url` in the catalogue is where to record the source — the site does not
render from that URL, because hotlinking someone else's server breaks the day
they reorganise it, and serving their bandwidth is not ours to spend.

So: record the URL, download the file, drop it here.

## Rules

- Manufacturer-official images only, used to show a product we supply. Do not
  take photos from a competitor's website or a stock library and present them
  as the product.
- No borrowed lifestyle shots. A plain product image on a white background is
  both more useful and less likely to belong to somebody else.
- If a manufacturer's terms restrict image use to authorised dealers, check that
  applies before uploading.

## Until a photo is there

The category illustration stands in — a drawn panel, inverter, battery or
charger. It is obviously generic, which is the point: nobody mistakes it for
the specific product, and the page still has a picture.
