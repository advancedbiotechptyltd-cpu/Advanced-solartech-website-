/**
 * What the catalogue is still missing, ordered by how much it would help.
 *
 * Run: npm run gaps
 *
 * 245 products is too many to research blind, and the effort is not evenly
 * worthwhile: a logo for Jinko covers a dozen product pages, a logo for a
 * one-product brand covers one. This ranks the work so the first hour does the
 * most good, and writes a CSV that can be handed to whoever fills it in.
 *
 * It reads the catalogue and the files actually present in src/images/ — it
 * never fetches anything. Nothing here writes to the catalogue either; the gaps
 * are for a person to close from the manufacturer's own site.
 */
import { readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { products } = JSON.parse(await readFile(resolve(root, "src/data/catalogue.json"), "utf8"));

const stems = async (dir) => {
  const full = resolve(root, dir);
  if (!existsSync(full)) return new Set();
  const entries = await readdir(full, { withFileTypes: true });
  return new Set(
    entries.filter((e) => e.isFile()).map((e) => e.name.replace(/\.[^.]+$/, ""))
  );
};

const brandLogos = await stems("src/images/brands");
const productImages = await stems("src/images/products");

const brands = new Map();
for (const p of products) {
  const b = brands.get(p.brand_slug) ?? {
    slug: p.brand_slug,
    name: p.brand,
    count: 0,
    categories: new Set(),
    missingSpecs: 0,
    missingDatasheet: 0,
    missingImage: 0,
  };
  b.count += 1;
  b.categories.add(p.category);
  if (!p.specs?.trim()) b.missingSpecs += 1;
  if (!p.datasheet_url) b.missingDatasheet += 1;
  if (!productImages.has(`product-${p.slug}`)) b.missingImage += 1;
  brands.set(p.brand_slug, b);
}

const ranked = [...brands.values()]
  .map((b) => ({ ...b, hasLogo: brandLogos.has(b.slug) }))
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "en"));

const total = products.length;
const logosMissing = ranked.filter((b) => !b.hasLogo);
const pagesCoveredByMissingLogos = logosMissing.reduce((n, b) => n + b.count, 0);

console.log(`\nCatalogue: ${total} products, ${ranked.length} brands\n`);

console.log(`Brand logos      ${ranked.length - logosMissing.length}/${ranked.length} present`);
console.log(`Product images   ${total - ranked.reduce((n, b) => n + b.missingImage, 0)}/${total}`);
console.log(`Specifications   ${total - ranked.reduce((n, b) => n + b.missingSpecs, 0)}/${total}`);
console.log(`Datasheets       ${total - ranked.reduce((n, b) => n + b.missingDatasheet, 0)}/${total}\n`);

if (logosMissing.length) {
  console.log(`Logos worth getting first — the top 10 cover ${
    logosMissing.slice(0, 10).reduce((n, b) => n + b.count, 0)
  } of the ${pagesCoveredByMissingLogos} pages waiting on one:\n`);
  for (const b of logosMissing.slice(0, 10)) {
    console.log(
      `  ${String(b.count).padStart(3)} pages  ${b.name.padEnd(18)} ` +
        `src/images/brands/${b.slug}.svg`
    );
  }
  console.log();
}

const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/*
 * Every image slot on the site in one file — page photos, accreditation marks,
 * brand logos and product shots. "Where do I put a photo of X" is the question
 * that keeps coming up, and answering it once in a spreadsheet beats answering
 * it per section forever.
 */
const home = JSON.parse(await readFile(resolve(root, "src/data/home.json"), "utf8"));
const businessData = JSON.parse(await readFile(resolve(root, "src/data/business.json"), "utf8"));
const services = JSON.parse(await readFile(resolve(root, "src/data/services.json"), "utf8"));
const siteImages = await stems("src/images");
const accredImages = await stems("src/images/accreditations");

const slotRows = [
  ["where_it_appears", "folder", "filename", "have_it"],
  ["Home page hero", "src/images/", `${home.hero.image}.jpg`, siteImages.has(home.hero.image) ? "yes" : ""],
  ["Home 'how it works' + About page", "src/images/", `${home.processSection.image}.jpg`, siteImages.has(home.processSection.image) ? "yes" : ""],
  ...home.workSection.items.map((it, i) => [
    `Home work gallery ${i + 1} (${it.label})`,
    "src/images/",
    `${it.image}.jpg`,
    siteImages.has(it.image) ? "yes" : "",
  ]),
  ...services.map((sv) => [
    `${sv.title} page + home card`,
    "src/images/",
    `service-${sv.slug}.jpg`,
    siteImages.has(`service-${sv.slug}`) ? "yes" : "",
  ]),
  ...(businessData.accreditations?.items ?? []).map((a) => [
    `Accreditation badge — ${a.title}`,
    "src/images/accreditations/",
    `${a.logo}.png`,
    accredImages.has(a.logo) ? "yes" : "",
  ]),
  ...ranked.map((b) => [
    `Brand logo — ${b.name} (${b.count} product pages)`,
    "src/images/brands/",
    `${b.slug}.svg`,
    b.hasLogo ? "yes" : "",
  ]),
  ...products.map((p) => [
    `Product photo — ${p.brand} ${p.model}`,
    "src/images/products/",
    `product-${p.slug}.jpg`,
    productImages.has(`product-${p.slug}`) ? "yes" : "",
  ]),
];

await writeFile(
  resolve(root, "image-slots.csv"),
  slotRows.map((r) => r.map(esc).join(",")).join("\n") + "\n",
  "utf8"
);
console.log(`Every image slot listed in image-slots.csv (${slotRows.length - 1} rows).`);

const rows = [
  ["brand", "model", "category", "page", "needs_image", "needs_specs", "needs_datasheet", "needs_manual", "needs_warranty"],
  ...products.map((p) => [
    p.brand,
    p.model,
    p.category,
    `/products/${{ Panel: "panels", Inverter: "inverters", Battery: "batteries", "EV charger": "ev-chargers" }[p.category]}/${p.slug}/`,
    productImages.has(`product-${p.slug}`) ? "" : "yes",
    p.specs?.trim() ? "" : "yes",
    p.datasheet_url ? "" : "yes",
    p.manual_url ? "" : "yes",
    p.warranty_url ? "" : "yes",
  ]),
].map((r) => r.map(esc).join(","));

const out = resolve(root, "catalogue-gaps.csv");
await writeFile(out, rows.join("\n") + "\n", "utf8");
console.log(`Per-product worklist written to catalogue-gaps.csv (${products.length} rows).`);
console.log(`Filenames: logos → src/images/brands/{brand_slug}.svg`);
console.log(`           photos → src/images/products/product-{slug}.jpg\n`);
