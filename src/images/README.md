# Photos go here

Drop image files into this folder and they appear on the site. That is the
whole process — no code change, no resizing, no format conversion.

```
src/images/hero-rooftop.jpg   →   <Figure name="hero-rooftop" alt="…" />
```

The build automatically: resizes to 480/760/1120px wide, converts to WebP,
generates a `srcset` so phones download the small version, and stamps
width/height so the image cannot shift the layout as it loads.

## The filenames the site is currently waiting for

Every one of these currently shows an interim illustration from
`src/illustrations/` — the site looks finished, but none of it is a photograph
of this business's work. Drop a file in with the matching name and it takes over
automatically; there is nothing to delete and no code to change.

`npm run check:content` lists which slots are still on an illustration.

| Filename | Where it appears | What to shoot |
|---|---|---|
| `hero-install.jpg` | Home page hero | Your best rooftop array. Landscape, taken from ground level or a drone, ideally with sky. This is the first thing anyone sees. |
| `service-solar-panels.jpg` | Home + solar panels page | Panels being installed, or a finished array on a recognisable Victorian roof. |
| `service-battery-storage.jpg` | Home + battery page | A wall-mounted battery, neatly installed. Clean switchboard work sells competence. |
| `service-ev-chargers.jpg` | Home + EV page | A charger on a garage or carport wall, ideally with a car plugged in. |
| `service-heat-pump-hot-water.jpg` | Home + heat pump page | A heat pump hot water unit installed outside a house. |
| `service-commercial-solar.jpg` | Home + commercial page | A large flat-roof or warehouse array. Scale is the message. |
| `work-1.jpg` … `work-4.jpg` | Home page work gallery | Four varied jobs — a tiled residential roof, a battery, a heat pump, a commercial array. See the stock note below before filling these. |
| `team-install.jpg` | About page + home "how it works" | Your installers actually working. Faces build more trust than hardware. |

Product photos are separate: those come from each manufacturer's official media
kit, under the terms of your dealer agreement, and are handled per the product
page spec in `docs/specs/`.

## Practical notes

**Shoot landscape.** Every slot on the site is wider than it is tall.

**Big is fine.** Upload straight off the phone or camera — 3000px wide, 5MB is
no problem. The build makes the small versions. Do *not* pre-shrink; you cannot
add detail back.

**Formats:** `.jpg`, `.png`, `.webp` or `.avif`. JPG is right for photographs.

## Stock photos: where they are fine and where they are not

Licensed stock is fine as a stand-in for the hero, the service cards and the
About photo. Those slots illustrate a category — "this is what solar
installation looks like" — and no visitor reads them as a specific job.

One switch governs all of it, in `src/data/business.json`:

```json
"photos": { "own": false }
```

While it is `false`, nothing on the site — no heading, no caption, no alt text —
says this business installed what is shown. Stock is safe everywhere.

Set it to `true` once every photo in this folder is genuinely this business's
own work. That swaps in the stronger wording: "every job on this page is ours",
"an Advanced Solar Tech installer", and so on. `npm run check:content` fails the
build if the flag is on while any photo slot is still empty.

Alt text matters as much as the visible heading here. "An Advanced Solar Tech
installer working on a switchboard", written over a stock photo of a stranger,
is the same false claim — and it is the version nobody proofreads. That is why
the switch drives both.

Never present a manufacturer's marketing photo, or another installer's work, as
your own. That is a misleading representation under the Australian Consumer Law
as well as a copyright problem, and customers who visit and see a different
standard of work notice.

**Where to get stock:** Unsplash and Pexels are free for commercial use with no
attribution required. Read the licence for the specific photo — a few carry
restrictions — and download the full-size original rather than a preview.

**Alt text is required** and it is not decoration — it is what a blind visitor
hears and what Google reads. Describe what is in the frame:

```astro
<Figure name="work-1" alt="6.6kW array on a tiled roof in Geelong" />
```

Not "solar panels". Not "image1".

**Faces need permission.** A customer's house or a recognisable person needs
their OK before it goes on a public website.
