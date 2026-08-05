/**
 * Fetches the business's real Google reviews and writes them into
 * src/data/testimonials.json, which the site renders.
 *
 * Run: npm run reviews    (needs GOOGLE_MAPS_API_KEY in the environment)
 *
 * ── Why at build time ────────────────────────────────────────────────────────
 * The site is static files on cPanel with no server-side runtime, so there is
 * nothing to call an API at request time. Baking the reviews into the build is
 * also faster and more private for visitors than a browser-side fetch, which
 * would put the API key in front-end code where anyone could take it.
 *
 * ── Why the result is committed ──────────────────────────────────────────────
 * So a build never depends on the API being up. If Google is unreachable, or a
 * quota is exhausted, or the key is rotated, the last good snapshot still
 * builds and the site still shows real reviews. The scheduled workflow refreshes
 * it — see .github/workflows/refresh-reviews.yml.
 *
 * Google Maps Platform terms allow caching this content for up to 30 days
 * (Place IDs indefinitely). The refresh runs weekly, well inside that, and
 * check-content warns if a snapshot ever goes stale.
 *
 * ── What it will not do ──────────────────────────────────────────────────────
 * Nothing here writes review text that did not come from the API. On any
 * failure it exits without touching the file, so a bad run degrades to the
 * previous real reviews rather than to invented ones.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(root, "src/data/testimonials.json");
const configPath = resolve(root, "src/data/business.json");

const KEY = process.env.GOOGLE_MAPS_API_KEY;

/*
 * The Place ID is the one piece of this that must never drift: there is a
 * similarly-named company in Perth, and pointing at it would publish another
 * business's reviews as ours. It lives in business.json next to the address it
 * is supposed to match, and the fetch below re-verifies both every run.
 */
const business = JSON.parse(await readFile(configPath, "utf8"));
const profile = business.googleProfile ?? {};
const PLACE_ID = profile.placeId;

function bail(message, { fatal = false } = {}) {
  console[fatal ? "error" : "warn"](`[reviews] ${message}`);
  process.exit(fatal ? 1 : 0);
}

if (!PLACE_ID) bail("business.json has no googleProfile.placeId — nothing to fetch.", { fatal: true });

if (!KEY) {
  bail(
    "GOOGLE_MAPS_API_KEY is not set — keeping the existing reviews.\n" +
      "        This is expected on a local build. CI sets it from the repository secret."
  );
}

const FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "rating",
  "userRatingCount",
  "googleMapsUri",
  "reviews",
].join(",");

let place;
try {
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(PLACE_ID)}`, {
    headers: { "X-Goog-Api-Key": KEY, "X-Goog-FieldMask": FIELDS },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    // The body can echo the key back in an error message — do not print it.
    bail(`Places API returned ${res.status}. Keeping the existing reviews.`);
  }
  place = await res.json();
} catch (err) {
  bail(`Could not reach the Places API (${err.name}). Keeping the existing reviews.`);
}

/*
 * Identity check, every run. A typo'd Place ID, or a listing merged into
 * another by Google, would otherwise silently swap in a different company's
 * reviews — and nobody reads a diff of testimonial text closely enough to catch
 * that. Refusing to write is the safe failure.
 */
const gotName = place.displayName?.text ?? "";
const gotAddress = place.formattedAddress ?? "";
const expectAddress = profile.expectAddressContains;

if (expectAddress && !gotAddress.toLowerCase().includes(expectAddress.toLowerCase())) {
  console.error(
    `[reviews] REFUSING TO WRITE — the listing does not match.\n` +
      `        expected the address to contain: ${expectAddress}\n` +
      `        got: ${gotName} — ${gotAddress}\n` +
      `        Check googleProfile.placeId in business.json.`
  );
  process.exit(1);
}

const reviews = (place.reviews ?? [])
  .map((r) => ({
    // Verbatim. No trimming, no tidying, no "…" — an edited review is not the
    // review that was left.
    quote: r.originalText?.text ?? r.text?.text ?? "",
    author: r.authorAttribution?.displayName ?? "Google reviewer",
    rating: r.rating,
    date: (r.publishTime ?? "").slice(0, 10),
    relative: r.relativePublishTimeDescription ?? "",
    source: "Google",
  }))
  .filter((r) => r.quote && r.rating);

if (!reviews.length) bail("The API returned no reviews. Keeping the existing file.");

const payload = {
  _generated:
    "GENERATED FILE — do not edit by hand. Written by scripts/fetch-google-reviews.mjs " +
    "from the business's Google Business Profile. Hand edits are overwritten on the next " +
    "refresh, and editing a customer's words would misrepresent them in any case.",
  placeholder: false,
  source: "Google Business Profile",
  placeId: place.id,
  businessName: gotName,
  businessAddress: gotAddress,
  /*
   * The canonical place_id form rather than the googleMapsUri the API returns:
   * that one carries a cid and a request-specific tracking parameter, so it
   * would change on every fetch and produce a diff that looks like the profile
   * moved. This form is stable and resolves to the same listing.
   */
  profileUrl: `https://www.google.com/maps/place/?q=place_id:${place.id}`,
  reviewsUrl: `https://search.google.com/local/reviews?placeid=${place.id}`,
  rating: place.rating ?? null,
  reviewCount: place.userRatingCount ?? null,
  fetchedAt: new Date().toISOString().slice(0, 10),
  items: reviews,
};

const previous = await readFile(target, "utf8").catch(() => "");
const next = JSON.stringify(payload, null, 2) + "\n";

// Compare without the timestamp, so a refresh that found nothing new does not
// produce a commit that says something changed.
const strip = (s) => s.replace(/^\s*"fetchedAt".*$/m, "");
if (strip(previous) === strip(next)) {
  console.log(`[reviews] No change — ${reviews.length} reviews, ${payload.rating}★ from ${payload.reviewCount}.`);
  process.exit(0);
}

await writeFile(target, next, "utf8");
console.log(
  `[reviews] Wrote ${reviews.length} reviews for "${gotName}" (${gotAddress})\n` +
    `          ${payload.rating}★ from ${payload.reviewCount} ratings.`
);
