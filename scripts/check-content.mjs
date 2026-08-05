/**
 * Content gate — run before launch, and in CI.
 *
 * Two jobs:
 *  1. Stop placeholder content reaching production. Invented reviews, unverified
 *     accreditations and made-up statistics are misrepresentations, not
 *     placeholder text, so the build should refuse to call itself finished
 *     while any remain.
 *  2. Stop location pages degenerating into doorway pages. Near-identical pages
 *     with the place name swapped are the standard way a local-SEO site gets
 *     demoted, so identical prose across locations is a hard failure.
 */
import { readFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const data = (f) => resolve(here, "..", "src/data", f);
const read = async (f) => JSON.parse(await readFile(data(f), "utf8"));

/*
 * Resolve an image stem the way Figure does — any of the extensions it globs,
 * anywhere under src/images/. Checking only for `.jpg` would report a photo as
 * missing when a perfectly good `.webp` is sitting right there.
 */
const imagesDir = resolve(here, "..", "src/images");
const EXTS = ["jpg", "jpeg", "png", "webp", "avif"];
const imageStems = new Set();
const collect = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) collect(resolve(dir, entry.name));
    else {
      const [, stem, ext] = entry.name.match(/^(.*)\.([^.]+)$/) ?? [];
      if (ext && EXTS.includes(ext.toLowerCase())) imageStems.add(stem);
    }
  }
};
if (existsSync(imagesDir)) collect(imagesDir);
const image = (name) => (imageStems.has(name) ? imagesDir : "");

const errors = [];
const warnings = [];
// Neither a problem nor a to-do — a decision worth restating so nobody
// "fixes" it by inventing a number.
const notes = [];

const [business, testimonials, locations, cities, services, brands, articles, redirects, home, catalogueFile] =
  await Promise.all([
    read("business.json"),
    read("testimonials.json"),
    read("locations.json"),
    read("cities.json"),
    read("services.json"),
    read("brands.json"),
    read("articles.json"),
    read("redirects.json"),
    read("home.json"),
    read("catalogue.json"),
  ]);

// ── 1. Placeholders ──────────────────────────────────────────────────────────


if (business.accreditations?.placeholder)
  warnings.push(
    "business.accreditations is placeholder — TrustBar renders nothing. Add real accreditations, or leave it if the business has none to claim."
  );

/*
 * The "recent work" gallery is the one place on the site where an image itself
 * makes a factual claim. Stock photos are fine there; stock photos captioned as
 * this business's own installs are not — that is a misleading representation
 * under the Australian Consumer Law, and it is the kind of claim a competitor
 * notices. The flag is the switch, so the gate reports which way it is set.
 */
/*
 * `serviced` and `servicedByPartner` are two views of one fact, and the CMS
 * exposes both as separate switches. If they ever disagree, a state page would
 * describe direct install while the card beside it promised a partner.
 */
for (const l of locations) {
  if (l.serviced === l.servicedByPartner) {
    errors.push(
      `locations/${l.slug}: serviced and servicedByPartner are both ${l.serviced} — they are opposites. ` +
        `Exactly one must be true.`
    );
  }
}

const coverage = business.coverage ?? {};
const directAbbrs = [...(coverage.directStates ?? [])].sort().join(",");
const flaggedDirect = locations.filter((l) => l.serviced).map((l) => l.abbr).sort().join(",");
if (directAbbrs !== flaggedDirect) {
  errors.push(
    `business.coverage.directStates is [${directAbbrs}] but the states flagged as direct install are ` +
      `[${flaggedDirect}]. The copy and the state pages would contradict each other.`
  );
}

/*
 * Catalogue integrity.
 *
 * 245 rows generate 245 pages, so a bad row is a bad page nobody will notice.
 * These are the failures that would ship silently: a duplicate route, a slug
 * that cannot be a URL, a document link that is not a link, and a price or
 * supplier code finding its way into a public file.
 */
const catalogue = catalogueFile.products ?? [];
const CATEGORIES = ["Panel", "Inverter", "Battery", "EV charger"];
const URL_FIELDS = ["image_url", "datasheet_url", "manual_url", "warranty_url"];

const routeKeys = new Map();
for (const p of catalogue) {
  const label = `catalogue/${p.slug ?? "(no slug)"}`;

  for (const f of ["slug", "brand", "brand_slug", "category", "model"]) {
    if (!p[f]) errors.push(`${label}: missing ${f}.`);
  }
  for (const f of ["slug", "brand_slug"]) {
    if (p[f] && !/^[a-z0-9-]+$/.test(p[f]))
      errors.push(`${label}: ${f} "${p[f]}" is not usable in a URL — lowercase, numbers and hyphens only.`);
  }
  if (p.category && !CATEGORIES.includes(p.category))
    errors.push(`${label}: category "${p.category}" is not one of ${CATEGORIES.join(", ")}.`);
  if (p.availability && !["available", "unavailable"].includes(p.availability))
    errors.push(`${label}: availability must be "available" or "unavailable", not "${p.availability}".`);

  const key = `${p.category}/${p.slug}`;
  if (routeKeys.has(key)) errors.push(`${label}: duplicate — two products share the route ${key}.`);
  routeKeys.set(key, true);

  for (const f of URL_FIELDS) {
    const v = p[f];
    if (v && !/^https?:\/\//i.test(v))
      errors.push(`${label}: ${f} is not a URL ("${String(v).slice(0, 40)}"). Blank is fine; broken is not.`);
  }
}

/*
 * This repository is public. A price or supplier code in the catalogue is a
 * commercial disclosure, not a formatting problem, so it fails the build.
 */
const leakedFields = [...new Set(catalogue.flatMap((p) => Object.keys(p)))].filter((k) =>
  /price|cost|nett|supplier|margin|trade/i.test(k)
);
if (leakedFields.length)
  errors.push(
    `catalogue.json contains commercially sensitive field(s): ${leakedFields.join(", ")}. ` +
      `This repository is public — prices and supplier codes belong in the private catalogue.`
  );

const brandNames = new Map();
for (const p of catalogue) {
  if (!p.brand_slug) continue;
  const seen = brandNames.get(p.brand_slug);
  if (seen && seen !== p.brand)
    warnings.push(
      `catalogue: brand_slug "${p.brand_slug}" is used for both "${seen}" and "${p.brand}" — ` +
        `they will share one brand page under whichever name comes first.`
    );
  brandNames.set(p.brand_slug, seen ?? p.brand);
}

const withDocs = catalogue.filter((p) => p.datasheet_url || p.manual_url || p.warranty_url).length;
const available = catalogue.filter((p) => p.availability === "available").length;
notes.push(
  `Catalogue: ${catalogue.length} products across ${brandNames.size} brands. ` +
    `${available} marked available, ${withDocs} with at least one document.`
);

const ownPhotos = business.photos?.own === true;
const photoSlots = [
  home.hero?.image,
  home.processSection?.image,
  ...(home.workSection?.items ?? []).map((i) => i.image),
  ...services.map((s) => `service-${s.slug}`),
  "team-install",
].filter(Boolean);
// team-install fills two slots (About and the home "how it works" panel), so
// dedupe before counting — otherwise the tally reports one more than exists.
const uniqueSlots = [...new Set(photoSlots)];
const missingPhotos = uniqueSlots.filter((name) => !imageStems.has(name));

/*
 * Provenance, not just presence.
 *
 * Checking only that eleven files exist would let a full set of stock photos
 * satisfy the "all slots filled" test and unlock the ownership wording — which
 * is the exact claim the flag exists to prevent. So every slot must be recorded
 * as `own` in src/images/credits.json before photos.own can be true.
 */
const credits = JSON.parse(await readFile(resolve(here, "..", "src/images/credits.json"), "utf8"))
  .images ?? {};

const present = uniqueSlots.filter((n) => imageStems.has(n));
const uncredited = present.filter((n) => !credits[n]);
const notOwn = present.filter((n) => credits[n] && credits[n].source !== "own");
const stockMissingLicence = present.filter(
  (n) => credits[n]?.source === "stock" && !credits[n].licence
);

if (uncredited.length) {
  warnings.push(
    `${uncredited.length} photo(s) have no entry in src/images/credits.json (${uncredited.join(", ")}). ` +
      `Record where each came from — a stock licence you cannot evidence in a year is a licence you do not have.`
  );
}
if (stockMissingLicence.length) {
  warnings.push(
    `Stock photo(s) with no licence recorded: ${stockMissingLicence.join(", ")}. Add the licence and source URL.`
  );
}

if (ownPhotos && (notOwn.length || uncredited.length)) {
  errors.push(
    `business.photos.own is true, but ${notOwn.length + uncredited.length} photo(s) are not recorded as ours ` +
      `in src/images/credits.json (${[...notOwn, ...uncredited].join(", ")}). With the flag on, captions and ` +
      `alt text say this business installed what is shown — it cannot say that over a stock photo.`
  );
}

if (ownPhotos && missingPhotos.length) {
  errors.push(
    `business.photos.own is true, but ${missingPhotos.length} photo slot(s) are still empty ` +
      `(${missingPhotos.join(", ")}). With the flag on, captions and alt text say this business ` +
      `installed what is shown — a claim it cannot make over a placeholder. Add the photos, or set ` +
      `photos.own back to false.`
  );
} else if (!ownPhotos) {
  const ownCount = present.filter((n) => credits[n]?.source === "own").length;
  warnings.push(
    `business.photos.own is false — every caption and alt text stays neutral, so stock and the interim ` +
      `illustrations are safe to use. ${present.length}/${uniqueSlots.length} slots hold a photograph, ` +
      `${ownCount} of them ours` +
      (missingPhotos.length ? `; the rest fall back to illustrations (${missingPhotos.join(", ")})` : "") +
      `. The flag can only go true once all ${uniqueSlots.length} are recorded as ours in credits.json.`
  );
}

/*
 * Stats are optional by decision, not pending. An installations-completed
 * figure was deliberately removed and must not come back without a real,
 * evidenced number — so their absence is reported as information, and never
 * as something standing between this site and going live.
 */
if (business.stats?.placeholder)
  notes.push(
    "business.stats is off, so the numbers band does not render. That is a deliberate choice — add figures only if they can be evidenced from job records."
  );

/*
 * Reviews are fetched, not typed. What can go wrong is the snapshot going
 * stale: Google Maps Platform terms allow caching this content for 30 days,
 * and a build older than that is both out of date and out of terms.
 */
if (testimonials.placeholder) {
  errors.push(
    "testimonials.json is marked placeholder — no reviews will render. Run `npm run reviews` with GOOGLE_MAPS_API_KEY set."
  );
} else {
  const fetched = testimonials.fetchedAt ? new Date(testimonials.fetchedAt) : null;
  const days = fetched ? Math.floor((Date.now() - fetched.getTime()) / 86_400_000) : null;
  if (days === null) {
    warnings.push("testimonials.json has no fetchedAt date, so its age cannot be checked.");
  } else if (days > 30) {
    errors.push(
      `The Google reviews snapshot is ${days} days old. Google Maps Platform terms allow caching this ` +
        `content for 30 days — refresh it (Actions → Refresh Google reviews) before deploying.`
    );
  } else if (days > 14) {
    warnings.push(`The Google reviews snapshot is ${days} days old. The weekly refresh may not be running.`);
  }
  notes.push(
    `Reviews: ${testimonials.items.length} shown, ${testimonials.rating}★ from ${testimonials.reviewCount}, ` +
      `for "${testimonials.businessName}" (${testimonials.businessAddress}), fetched ${testimonials.fetchedAt}.`
  );
}

// ── 2. Location uniqueness ───────────────────────────────────────────────────
const required = ["intro", "localNotes", "metaTitle", "metaDescription", "heroHeading"];

for (const loc of locations) {
  for (const field of required) {
    if (!loc[field]?.trim())
      errors.push(`locations.json "${loc.slug}": missing ${field}.`);
  }
  if (!loc.rebates?.length)
    errors.push(`locations.json "${loc.slug}": no rebates listed — the page has nothing local to say.`);
}

for (const city of cities) {
  for (const field of required) {
    if (!city[field]?.trim())
      errors.push(`cities.json "${city.slug}": missing ${field}.`);
  }
  if (!locations.some((l) => l.slug === city.state))
    errors.push(`cities.json "${city.slug}": state "${city.state}" is not in locations.json.`);
}

// Identical prose across two locations means one of them is a doorway page.
const allPlaces = [
  ...locations.map((l) => ({ id: `locations/${l.slug}`, ...l })),
  ...cities.map((c) => ({ id: `cities/${c.slug}`, ...c })),
];

for (const field of ["intro", "localNotes"]) {
  const seen = new Map();
  for (const place of allPlaces) {
    const value = (place[field] ?? "").trim();
    if (!value) continue;
    if (seen.has(value)) {
      errors.push(
        `Duplicate ${field}: "${place.id}" is identical to "${seen.get(value)}". Location pages must carry genuinely different content, not the same text with the place name swapped.`
      );
    }
    seen.set(value, place.id);
  }
}

// ── 2b. Rebate content staleness ─────────────────────────────────────────────
/*
 * Rebate schemes change, and stale rebate copy is worse than none — a customer
 * who reads about an incentive that no longer exists arrives expecting a
 * discount you cannot give them. (Solar Victoria's battery loan is exactly this
 * case: it was discontinued, and the copy said otherwise until it was caught by
 * a human rather than by the build.)
 *
 * Each location carries a `lastReviewed` date. Older than six months and the
 * build says so, so the check happens on a schedule rather than by luck.
 */
const STALE_AFTER_DAYS = 182;
const today = new Date();

for (const loc of locations) {
  if (!loc.lastReviewed) {
    errors.push(
      `locations.json "${loc.slug}": no lastReviewed date. Rebate content must carry the date it was last verified.`
    );
    continue;
  }
  const reviewed = new Date(loc.lastReviewed);
  if (Number.isNaN(reviewed.getTime())) {
    errors.push(`locations.json "${loc.slug}": lastReviewed "${loc.lastReviewed}" is not a valid YYYY-MM-DD date.`);
    continue;
  }
  const days = Math.floor((today - reviewed) / 86_400_000);
  if (days > STALE_AFTER_DAYS) {
    warnings.push(
      `locations.json "${loc.slug}": rebate content last verified ${days} days ago (${loc.lastReviewed}). ` +
        `Re-check the scheme against the program's own website, then bump lastReviewed.`
    );
  }
}

// ── 3. Meta quality ──────────────────────────────────────────────────────────
const metaOwners = [
  ...services.map((s) => ({ id: `services/${s.slug}`, ...s })),
  ...brands.map((b) => ({ id: `brands/${b.slug}`, ...b })),
  ...articles.map((a) => ({ id: `articles/${a.slug}`, ...a })),
  ...allPlaces,
];

for (const item of metaOwners) {
  if (!item.metaTitle?.trim()) errors.push(`${item.id}: missing metaTitle.`);
  if (!item.metaDescription?.trim()) errors.push(`${item.id}: missing metaDescription.`);

  const len = item.metaDescription?.length ?? 0;
  if (len && (len < 70 || len > 165))
    warnings.push(`${item.id}: metaDescription is ${len} chars — aim for 70–165 so it is not truncated or padded.`);

  const titleLen = item.metaTitle?.length ?? 0;
  if (titleLen > 65)
    warnings.push(`${item.id}: metaTitle is ${titleLen} chars — likely truncated in results above ~60.`);
}

// ── 4. Redirect sanity ───────────────────────────────────────────────────────
const rules = Object.entries(redirects).filter(([from]) => !from.startsWith("_"));

const knownRoutes = new Set([
  "/",
  "/services/",
  "/products/",
  "/locations/",
  "/resources/",
  "/about/",
  "/contact/",
  "/quote/",
  "/privacy/",
  "/terms/",
  ...services.map((s) => `/services/${s.slug}/`),
  ...brands.map((b) => `/brands/${b.slug}/`),
  ...articles.map((a) => `/resources/${a.slug}/`),
  ...locations.map((l) => `/locations/${l.slug}/`),
  ...cities.map((c) => `/locations/${c.state}/${c.slug}/`),
  "/products/panels/",
  "/products/inverters/",
  "/products/batteries/",
  "/products/ev-chargers/",
]);

for (const [from, to] of rules) {
  if (!knownRoutes.has(to))
    errors.push(`redirects.json: "${from}" points to "${to}", which is not a route this site builds.`);
  if (knownRoutes.has(from))
    errors.push(`redirects.json: "${from}" is both a redirect source and a real page — the redirect would shadow the page.`);
}

// Every brand's consolidated old URLs must actually be in the redirect map,
// otherwise the consolidation loses those URLs' ranking signal.
const sources = new Set(rules.map(([from]) => from));
for (const brand of brands) {
  for (const old of brand.consolidatedFrom ?? []) {
    if (!sources.has(old))
      errors.push(`brands.json "${brand.slug}" lists "${old}" as consolidated, but redirects.json has no rule for it — that URL would 404.`);
  }
}

// ── Report ───────────────────────────────────────────────────────────────────
for (const n of notes) console.log(`  note  ${n}`);
for (const w of warnings) console.warn(`  warn  ${w}`);
for (const e of errors) console.error(`  FAIL  ${e}`);

console.log(
  `\ncheck:content — ${errors.length} error(s), ${warnings.length} warning(s), ${notes.length} note(s).`
);

if (errors.length) {
  console.error(
    "\nThe site builds, but it is not ready to publish while these remain.\n"
  );
  process.exit(1);
}
