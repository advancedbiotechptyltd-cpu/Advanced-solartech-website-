/**
 * Built-output gate — runs against dist/ after a build.
 *
 * Checks the §8 definition-of-done items that can be verified without a
 * browser: one h1 per page, unique title and description on every page, a
 * canonical, valid JSON-LD, alt text on every image, no broken internal links,
 * and heading order that does not skip levels.
 *
 * Deliberately regex-based rather than pulling in a DOM parser: the assertions
 * are simple and structural, and a build gate should not need a dependency tree
 * of its own.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join, relative } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, "..", "dist");

const errors = [];
const warnings = [];

/*
 * Base path awareness.
 *
 * Astro prefixes bundled assets with `base`, but hand-written internal links
 * are prefixed by the href() helper in src/lib/site.js — which means a link
 * added without that helper would silently point at the domain root and 404
 * on a subfolder deploy. Pass --base=/new to assert that every internal link
 * and asset in dist/ actually starts with the base.
 */
const baseArg = process.argv.find((a) => a.startsWith("--base="));
const BASE = (baseArg ? baseArg.split("=")[1] : "").replace(/\/+$/, "");
if (BASE) console.log(`check:html — asserting every internal path starts with "${BASE}"\n`);

/*
 * The content editor at /admin/ is a staff tool, not a page of the website. It
 * has no canonical, no JSON-LD and no h1 by design, and it is noindexed — so
 * holding it to the public-page rules would produce nine false failures and
 * teach everyone to ignore this check.
 */
const NON_PAGE_DIRS = ["admin"];

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (NON_PAGE_DIRS.includes(entry.name) && dirname(full) === dist) continue;
      out.push(...(await walk(full)));
    } else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

let files;
try {
  files = await walk(dist);
} catch {
  console.error("check:html — dist/ not found. Run `npm run build` first.");
  process.exit(1);
}

if (!files.length) {
  console.error("check:html — no HTML files in dist/.");
  process.exit(1);
}

const titles = new Map();
const descriptions = new Map();
const routes = new Set();

// Map every built file to the URL path it serves, including the base prefix.
for (const file of files) {
  const rel = relative(dist, file).replace(/\\/g, "/");
  routes.add(BASE + "/" + rel.replace(/index\.html$/, "").replace(/\.html$/, "/"));
}

for (const file of files) {
  const rel = "/" + relative(dist, file).replace(/\\/g, "/");
  const html = await readFile(file, "utf8");
  const fail = (msg) => errors.push(`${rel}: ${msg}`);
  const warn = (msg) => warnings.push(`${rel}: ${msg}`);

  // ── Title ────────────────────────────────────────────────────────────────
  const title = html.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim();
  if (!title) fail("no <title>");
  else {
    if (title.length > 65) warn(`title is ${title.length} chars — likely truncated in results`);
    if (titles.has(title)) fail(`duplicate <title> — also used by ${titles.get(title)}`);
    titles.set(title, rel);
  }

  // ── Meta description ─────────────────────────────────────────────────────
  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  if (!desc?.trim()) fail("no meta description");
  else {
    if (descriptions.has(desc)) fail(`duplicate meta description — also used by ${descriptions.get(desc)}`);
    descriptions.set(desc, rel);
    if (desc.length < 70 || desc.length > 165)
      warn(`meta description is ${desc.length} chars — aim for 70–165`);
  }

  // ── Canonical ────────────────────────────────────────────────────────────
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  if (!canonical) fail("no canonical link");
  else if (!/^https?:\/\//.test(canonical)) fail(`canonical is not absolute: ${canonical}`);

  // ── Open Graph ───────────────────────────────────────────────────────────
  for (const prop of ["og:title", "og:description", "og:url", "og:image", "og:type"]) {
    if (!html.includes(`property="${prop}"`)) fail(`missing ${prop}`);
  }
  if (!html.includes('name="twitter:card"')) fail("missing twitter:card");

  // ── Exactly one h1 ───────────────────────────────────────────────────────
  const h1s = html.match(/<h1[\s>]/g) ?? [];
  if (h1s.length === 0) fail("no <h1>");
  if (h1s.length > 1) fail(`${h1s.length} <h1> elements — there must be exactly one`);

  // ── Heading order ────────────────────────────────────────────────────────
  const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  let previous = 0;
  for (const level of levels) {
    if (previous && level > previous + 1)
      warn(`heading order jumps from h${previous} to h${level}`);
    previous = level;
  }

  // ── Images ───────────────────────────────────────────────────────────────
  for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\balt=/.test(tag)) fail(`<img> without alt: ${tag.slice(0, 90)}`);
    if (!/\bwidth=/.test(tag) || !/\bheight=/.test(tag))
      warn(`<img> without width/height (risks layout shift): ${tag.slice(0, 90)}`);
  }

  // ── JSON-LD ──────────────────────────────────────────────────────────────
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (!blocks.length) fail("no JSON-LD");
  for (const [, body] of blocks) {
    try {
      const parsed = JSON.parse(body);
      if (!parsed["@context"] || !parsed["@type"]) fail("JSON-LD block missing @context or @type");
    } catch (e) {
      fail(`invalid JSON-LD: ${e.message}`);
    }
  }

  // ── Language ─────────────────────────────────────────────────────────────
  if (!/<html[^>]*\blang=/.test(html)) fail("<html> has no lang attribute");

  // ── Every internal path sits under the base ──────────────────────────────
  // Covers href, src and content= (the OG/canonical URLs are checked above).
  if (BASE) {
    for (const [, attr, value] of html.matchAll(/\b(href|src)="(\/[^"]*)"/g)) {
      if (!value.startsWith(`${BASE}/`)) {
        fail(`${attr}="${value}" is not under the base "${BASE}" — it would 404 on a subfolder deploy`);
      }
    }
  }

  // ── Internal links resolve ───────────────────────────────────────────────
  for (const [, link] of html.matchAll(/href="(\/[^"#?]*)"/g)) {
    const target = link.endsWith("/") ? link : `${link}/`;
    const isAsset = /\.[a-z0-9]{2,5}$/i.test(link);
    if (isAsset) continue;
    if (!routes.has(target)) fail(`internal link to a page that does not exist: ${link}`);
  }

  // ── Page weight ──────────────────────────────────────────────────────────
  const bytes = (await stat(file)).size;
  if (bytes > 120_000) warn(`HTML is ${(bytes / 1024).toFixed(0)}KB — large for a static page`);
}

// ── Required output files ──────────────────────────────────────────────────
const required = ["robots.txt", "llms.txt", "sitemap-index.xml", "_redirects", "redirects.apache.conf"];
if (BASE) required.push(".htaccess");
for (const name of required) {
  try {
    await stat(resolve(dist, name));
  } catch {
    errors.push(`dist/${name} is missing`);
  }
}

// ── Staging must be noindex on every page, with no way to opt out ──────────
if (BASE) {
  for (const file of files) {
    const html = await readFile(file, "utf8");
    const rel = "/" + relative(dist, file).replace(/\\/g, "/");
    if (!/<meta name="robots" content="noindex, nofollow"/.test(html)) {
      errors.push(`${rel}: staging page is missing <meta name="robots" content="noindex, nofollow">`);
    }
  }
  // Sitemap URLs must also carry the base, or they advertise dead links.
  try {
    const sm = await readFile(resolve(dist, "sitemap-0.xml"), "utf8");
    const locs = [...sm.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
    const offBase = locs.filter((u) => !u.includes(`${BASE}/`));
    if (offBase.length) errors.push(`sitemap has ${offBase.length} URL(s) outside the base, e.g. ${offBase[0]}`);
  } catch {
    errors.push("dist/sitemap-0.xml is missing");
  }
}

// ── Report ─────────────────────────────────────────────────────────────────
for (const w of warnings) console.warn(`  warn  ${w}`);
for (const e of errors) console.error(`  FAIL  ${e}`);

console.log(
  `\ncheck:html — ${files.length} pages, ${errors.length} error(s), ${warnings.length} warning(s).`
);

if (errors.length) process.exit(1);
