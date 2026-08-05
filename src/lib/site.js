/**
 * Data access helpers.
 *
 * Templates import from here rather than reaching into `src/data` directly, so
 * a change to how content is stored (JSON today, a CMS later) touches one file.
 */
import business from "../data/business.json" with { type: "json" };
import nav from "../data/nav.json" with { type: "json" };
import services from "../data/services.json" with { type: "json" };
import brands from "../data/brands.json" with { type: "json" };
import locations from "../data/locations.json" with { type: "json" };
import cities from "../data/cities.json" with { type: "json" };
import faqs from "../data/faqs.json" with { type: "json" };
import testimonials from "../data/testimonials.json" with { type: "json" };
import processes from "../data/process.json" with { type: "json" };
import articles from "../data/articles.json" with { type: "json" };

export { business, nav, services, brands, locations, cities, articles, processes };

export const PRODUCT_CATEGORIES = [
  {
    slug: "panels",
    title: "Solar Panels",
    summary: "The modules themselves — efficiency, degradation rate and warranty terms are what separate them.",
    metaDescription:
      "The solar panel brands Advanced Solar Tech supplies and installs in Victoria, with the trade-offs of each set out rather than only the strengths.",
  },
  {
    slug: "inverters",
    title: "Inverters",
    summary: "The component that converts DC to AC, and the one most likely to need replacing within the system's life.",
    metaDescription:
      "Solar inverter brands we install in Victoria — string, hybrid and DC-optimised — and which type actually suits your roof.",
  },
  {
    slug: "batteries",
    title: "Batteries",
    summary: "Storage systems that hold daytime generation for use through the evening peak.",
    metaDescription:
      "Home battery brands we supply and install in Victoria, with compatibility confirmed against your inverter before we quote.",
  },
  {
    slug: "heat-pumps",
    title: "Heat Pumps",
    summary: "Hot water heat pumps — around a third the running cost of a resistive element, and timable onto your solar.",
    metaDescription:
      "Heat pump hot water units we supply and install in Victoria, sized and sited so they run on your daytime solar generation.",
  },
  {
    slug: "ev-chargers",
    title: "EV Chargers",
    summary: "Home and workplace charging hardware, including units that follow your solar generation.",
    metaDescription:
      "Home and workplace EV chargers we install in Victoria, including solar-aware units that charge the car from your own generation.",
  },
];

/** Resolve an array of FAQ ids to full FAQ objects, dropping unknown ids. */
export function getFaqs(ids = []) {
  return ids.map((id) => faqs.find((f) => f.id === id)).filter(Boolean);
}

export function getService(slug) {
  return services.find((s) => s.slug === slug);
}

export function getBrand(slug) {
  return brands.find((b) => b.slug === slug);
}

export function getBrandsByCategory(category) {
  return brands.filter((b) => b.category === category);
}

export function getLocation(slug) {
  return locations.find((l) => l.slug === slug);
}

export function getCitiesForState(stateSlug) {
  return cities.filter((c) => c.state === stateSlug);
}

export function getArticle(slug) {
  return articles.find((a) => a.slug === slug);
}

export function getProcess(key) {
  return processes[key];
}

/**
 * Testimonials are withheld while they are placeholders, so sample text cannot
 * reach a production build even if someone forgets to run the content check.
 */
export function getTestimonials() {
  return testimonials.placeholder ? [] : testimonials.items;
}

/**
 * The Google profile the reviews came from — rating, count and links.
 * Returns null while testimonials are placeholders, so nothing claims a rating
 * the business has not actually got.
 */
export function getReviewProfile() {
  if (testimonials.placeholder) return null;
  const { rating, reviewCount, profileUrl, reviewsUrl, source, fetchedAt } = testimonials;
  if (!rating || !reviewCount) return null;
  return { rating, reviewCount, profileUrl, reviewsUrl, source, fetchedAt };
}

export function testimonialsArePlaceholder() {
  return Boolean(testimonials.placeholder);
}

/** Accreditation and stats claims are suppressed until marked non-placeholder. */
/*
 * Whether the photographs on this site are the business's own work.
 *
 * Governs alt text and captions, not just visible headings — an alt of "an
 * Advanced Solar Tech installer" over a stock photo is the same false claim as
 * a heading that says so, and it is the version nobody proofreads.
 */
export function usingOwnPhotos() {
  return business.photos?.own === true;
}

/** Pick between an ownership-claiming string and a neutral one. */
export function photoAlt(neutral, own) {
  return usingOwnPhotos() && own ? own : neutral;
}

export function getAccreditations() {
  return business.accreditations?.placeholder ? [] : business.accreditations?.items ?? [];
}

/*
 * How coverage is described. Leads are accepted from every state; only the
 * fulfilment message differs, so this returns the wording rather than a
 * yes/no — a page that treats "not direct" as "not served" would turn away
 * business we do take.
 */
export function getCoverage() {
  return business.coverage ?? {};
}

/** The "who does the work" line. Suppressed with the rest while placeholder. */
export function getInstallerStatement() {
  const a = business.accreditations;
  return a?.placeholder ? null : a?.installerStatement ?? null;
}

export function getStats() {
  return business.stats?.placeholder ? [] : business.stats?.items ?? [];
}

/** Only real, sourced ratings become AggregateRating markup. */
export function getAggregateRating() {
  /*
   * Sourced from the fetched Google data, not from a number typed into
   * business.json. A hand-maintained copy drifts from the profile it claims to
   * quote, and a rating in structured data that disagrees with the visible page
   * is exactly what earns a manual action.
   */
  const p = getReviewProfile();
  if (p) return { ratingValue: p.rating, reviewCount: p.reviewCount };

  const r = business.reviews;
  if (!r || r.placeholder || !r.ratingValue || !r.reviewCount) return null;
  return { ratingValue: r.ratingValue, reviewCount: r.reviewCount };
}

/** `tel:` needs the number without spaces. */
export function telHref() {
  return `tel:${business.phone.replace(/\s+/g, "")}`;
}

// ── Base path ────────────────────────────────────────────────────────────────
/*
 * Astro's `base` prefixes bundled assets (/_astro/…) automatically, but it does
 * NOT rewrite hand-written hrefs — those are opaque strings to the compiler.
 * So every internal link is stored as a canonical root path ("/services/") and
 * prefixed here at render time.
 *
 * Doing it in one helper, called from the handful of components that actually
 * render links, means a base change is a config flag rather than a find-and-
 * replace across fifty call sites. `npm run check:html` then fails the build if
 * anything in dist/ escapes the base, so a missed spot cannot ship silently.
 *
 * BASE is "" at the domain root and "/new" for the staging subfolder.
 */
const RAW_BASE = import.meta.env.BASE_URL ?? "/";
export const BASE = RAW_BASE.replace(/\/+$/, "");

/** Prefix an internal root-absolute path with the configured base. */
export function href(path) {
  if (!path) return `${BASE}/`;
  // External, mail, phone and in-page links pass through untouched.
  if (/^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(path)) return path;
  if (!path.startsWith("/")) return path;
  if (BASE && path.startsWith(`${BASE}/`)) return path; // already prefixed
  return `${BASE}${path}`;
}

/** Absolute URL for canonicals, OG tags and JSON-LD `@id` values. */
export function absoluteUrl(path) {
  const origin = business.url.replace(/\/$/, "");
  if (!path || path === "/") return `${origin}${BASE}/`;
  return `${origin}${href(path.startsWith("/") ? path : `/${path}`)}`;
}
