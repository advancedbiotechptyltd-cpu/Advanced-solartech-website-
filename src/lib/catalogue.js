/**
 * The product catalogue — brands, products and the documents that go with them.
 *
 * Everything under /products and /brands is generated from
 * `src/data/catalogue.json`. Adding a row there creates a product page and a
 * card on its brand page; nothing is hand-written per product.
 *
 * That file is deliberately the PUBLIC catalogue: brand, model, specs and links
 * to manufacturer documents. It carries no supplier codes and no prices, and
 * nothing here should ever start reading them — this repository is public.
 */
import catalogueFile from "../data/catalogue.json";
import brands from "../data/brands.json";
import { PRODUCT_CATEGORIES } from "./site.js";

/*
 * The catalogue labels categories the way a person says them ("EV charger");
 * the site routes them as slugs ("ev-chargers"). One map, so a mismatch is a
 * build failure here rather than a silently empty page later.
 */
/* The file wraps the list in an object so the content editor can map fields
   to it; everything below works with the list. */
const catalogue = catalogueFile.products;

const CATEGORY_SLUG = {
  Panel: "panels",
  Inverter: "inverters",
  Battery: "batteries",
  "EV charger": "ev-chargers",
};

const unknownCategories = [...new Set(catalogue.map((p) => p.category))].filter(
  (c) => !CATEGORY_SLUG[c]
);
if (unknownCategories.length) {
  throw new Error(
    `catalogue.json uses categories with no route: ${unknownCategories.join(", ")}. ` +
      `Add them to CATEGORY_SLUG in src/lib/catalogue.js and to PRODUCT_CATEGORIES in site.js.`
  );
}

/** A product's own page. */
export const productPath = (p) => `/products/${p.categorySlug}/${p.slug}/`;

export const products = catalogue.map((p) => ({
  ...p,
  categorySlug: CATEGORY_SLUG[p.category],
  name: `${p.brand} ${p.model}`,
  available: p.availability === "available",
  /*
   * Documents are only ever rendered from these. An empty URL means "not
   * supplied yet" and must never become a link — a download button that 404s
   * is worse than one that is honestly absent.
   */
  documents: [
    { label: "Datasheet", url: p.datasheet_url },
    { label: "Installation manual", url: p.manual_url },
    { label: "Warranty document", url: p.warranty_url },
  ].filter((d) => d.url),
}));

const bySlug = new Map(products.map((p) => [`${p.categorySlug}/${p.slug}`, p]));
export const getProduct = (categorySlug, slug) => bySlug.get(`${categorySlug}/${slug}`);

export const getProductsByCategory = (categorySlug) =>
  products.filter((p) => p.categorySlug === categorySlug);

export const getProductsByBrand = (brandSlug) =>
  products.filter((p) => p.brand_slug === brandSlug);

/*
 * Brands come from two places and have to agree.
 *
 * brands.json holds hand-written marketing copy for a handful of them; the
 * catalogue knows all 51 and which categories each actually sells into. A brand
 * page uses the richer copy when it exists and a plain heading otherwise —
 * writing strengths and trade-offs for 45 brands we have no view on would be
 * inventing content, which the honesty gate exists to prevent.
 */
const marketingBySlug = new Map(brands.map((b) => [b.slug, b]));

export const catalogueBrands = [...new Set(products.map((p) => p.brand_slug))]
  .map((slug) => {
    const items = getProductsByBrand(slug);
    const marketing = marketingBySlug.get(slug);
    const categorySlugs = [...new Set(items.map((p) => p.categorySlug))];
    return {
      slug,
      name: items[0].brand,
      categorySlugs,
      // A brand's primary category is wherever it sells the most.
      category:
        marketing?.category ??
        categorySlugs
          .map((c) => [c, items.filter((p) => p.categorySlug === c).length])
          .sort((a, b) => b[1] - a[1])[0][0],
      productCount: items.length,
      availableCount: items.filter((p) => p.available).length,
      marketing,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name, "en"));

/*
 * Every brand that needs a page: those in the catalogue, plus any in
 * brands.json that no longer appear in it. Dropping the latter would 404 a URL
 * that is already indexed and linked from the redirect map.
 */
export const allBrandSlugs = [
  ...new Set([...catalogueBrands.map((b) => b.slug), ...brands.map((b) => b.slug)]),
];

export function getBrand(slug) {
  const fromCatalogue = catalogueBrands.find((b) => b.slug === slug);
  if (fromCatalogue) return fromCatalogue;

  // In brands.json but no longer stocked — the page stays, with no product list.
  const marketing = marketingBySlug.get(slug);
  if (!marketing) return null;
  return {
    slug,
    name: marketing.name,
    categorySlugs: [marketing.category],
    category: marketing.category,
    productCount: 0,
    availableCount: 0,
    marketing,
  };
}

export const brandsForCategory = (categorySlug) =>
  catalogueBrands.filter((b) => b.categorySlugs.includes(categorySlug));

export const categoryTitle = (categorySlug) =>
  PRODUCT_CATEGORIES.find((c) => c.slug === categorySlug)?.title ?? categorySlug;

/*
 * Category nouns for running prose, singular and plural.
 *
 * Both spelled out rather than adding "s" to the singular — that turns
 * "battery" into "batterys", which shipped into a meta description before this
 * table existed.
 */
const NOUNS = {
  panels: ["solar panel", "solar panels"],
  inverters: ["inverter", "inverters"],
  batteries: ["battery", "batteries"],
  "ev-chargers": ["EV charger", "EV chargers"],
};

export const categoryNoun = (categorySlug) => NOUNS[categorySlug]?.[0] ?? categorySlug;
export const categoryNounPlural = (categorySlug) => NOUNS[categorySlug]?.[1] ?? categorySlug;

/*
 * The illustration a product falls back to when it has no photograph of its
 * own. Panels, batteries and EV chargers reuse their service illustration —
 * the subject is identical and a second copy would just be a second file to
 * keep in step.
 */
const CATEGORY_ILLUSTRATION = {
  panels: "service-solar-panels",
  inverters: "category-inverters",
  batteries: "service-battery-storage",
  "ev-chargers": "service-ev-chargers",
};

export const categoryIllustration = (categorySlug) => CATEGORY_ILLUSTRATION[categorySlug];

/**
 * A brand's products grouped into category sections, largest group first.
 *
 * Fronius sells inverters, batteries and EV chargers. Listing all 28 in one
 * run put batteries above inverters purely because "batteries" sorts before
 * "inverters" — so somebody browsing inverters clicked through to a page whose
 * first items were not inverters at all. Sections make the grouping explicit
 * and give each one an anchor to link into.
 */
export function brandProductGroups(brandSlug) {
  const items = getProductsByBrand(brandSlug);
  return [...new Set(items.map((p) => p.categorySlug))]
    .map((categorySlug) => ({
      categorySlug,
      title: categoryTitle(categorySlug),
      noun: categoryNounPlural(categorySlug),
      items: items.filter((p) => p.categorySlug === categorySlug),
    }))
    .sort((a, b) => b.items.length - a.items.length);
}
