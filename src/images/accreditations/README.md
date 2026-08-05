# Accreditation logos

Drop the official logo files here and they appear automatically — on the home
page, the About page, the quote page, and every service page. Nothing else to
change.

Until a file exists the badge shows an icon and the accreditation's name. That
is a complete trust signal on its own, so there is no rush and nothing looks
broken while you wait.

## Filenames

The name must match the `logo` value in `src/data/business.json`:

| File | Accreditation | Where to get it |
|---|---|---|
| `cec-approved-retailer.png` | CEC Approved Solar Retailer | Clean Energy Council retailer portal |
| `cec-approved-designer.png` | CEC Approved Designer | Solar Accreditation Australia portal |
| `tesla.png` | Tesla Certified Installer | Tesla partner portal |
| `solaredge.png` | SolarEdge Certified Installer | SolarEdge partner portal |

Four, and only four. Do not add a fifth without a certificate in hand — an
accreditation shown on a website is a trade claim, and these are the first
thing a regulator or a competitor checks.

`.svg` is best where the program supplies one — it stays sharp at any size and
is usually a few KB. `.png` with a transparent background is the next best.
`.jpg` works but its white box will show against coloured sections.

Logos render into an 84 × 52 box, scaled to fit. Supply them at roughly 2× that
(around 170px wide) so they stay crisp on high-density screens.

## Before you upload

These are other people's trademarks. Each program supplies its logo through a
partner portal along with brand guidelines covering minimum size, clear space,
which colour variant to use, and whether the mark may be altered.

- Download from the program's own partner portal or media kit. Do not pull one
  off Google Images — those are usually outdated versions, the wrong variant,
  or a competitor's screenshot.
- Follow the guidelines. Recolouring, stretching, or adding effects to a
  certification mark generally breaches the licence that lets you display it.
- Display a mark only while the accreditation is current. If one lapses, remove
  both the logo file and its entry in `business.json` the same day — a lapsed
  accreditation shown on a website is a false trade claim under Australian
  Consumer Law, and these particular claims are exactly what a regulator or a
  competitor would check.

## Wording

The `title` in `business.json` should match the wording on the certificate.
"Approved Retailer", "Accredited Installer" and "Approved Designer" are
distinct, separately-awarded statuses, and the programs are specific about
which is which — so copy the certificate rather than paraphrasing it.
