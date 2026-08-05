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

const [business, testimonials, locations, cities, services, brands, articles, redirects, home] =
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

if (ownPhotos && missingPhotos.length) {
  errors.push(
    `business.photos.own is true, but ${missingPhotos.length} photo slot(s) are still empty ` +
      `(${missingPhotos.join(", ")}). With the flag on, captions and alt text say this business ` +
      `installed what is shown — a claim it cannot make over a placeholder. Add the photos, or set ` +
      `photos.own back to false.`
  );
} else if (!ownPhotos) {
  const filled = uniqueSlots.length - missingPhotos.length;
  warnings.push(
    `business.photos.own is false — every caption and alt text stays neutral, so stock and the interim ` +
      `illustrations are safe to use. ${filled}/${uniqueSlots.length} slots hold a real photograph` +
      (missingPhotos.length
        ? `; the rest fall back to illustrations (${missingPhotos.join(", ")})`
        : "") +
      `. Once all of them are this business's own work, set it to true.`
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
