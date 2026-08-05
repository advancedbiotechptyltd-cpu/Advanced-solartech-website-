/**
 * Generates host-specific redirect files from src/data/redirects.json.
 *
 * One source, several output formats, because the host is not decided here and
 * hand-maintaining three redirect files is how one of them ends up stale.
 *
 * Outputs into dist/:
 *   redirects.apache.conf Apache / cPanel — paste into the domain-root .htaccess
 *   _redirects            Netlify / Cloudflare Pages
 *   redirects.nginx.conf  nginx  (include from a server block)
 *   redirects.json        the raw map, for any other host
 *
 * Apache is the format that actually matters today: the site is deployed to
 * cPanel, which reads .htaccess and ignores the other two entirely.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const raw = JSON.parse(await readFile(resolve(root, "src/data/redirects.json"), "utf8"));

// Keys starting with `_` are documentation, not rules.
const rules = Object.entries(raw).filter(([from]) => !from.startsWith("_"));

if (rules.length === 0) {
  console.warn("[redirects] No rules found — nothing emitted.");
  process.exit(0);
}

const duplicates = rules.map(([f]) => f).filter((f, i, arr) => arr.indexOf(f) !== i);
if (duplicates.length) {
  console.error(`[redirects] Duplicate source paths: ${duplicates.join(", ")}`);
  process.exit(1);
}

const netlify = [
  "# Generated from src/data/redirects.json — do not edit by hand.",
  "# 301 = permanent, which is what transfers ranking signal to the new URL.",
  "",
  ...rules.map(([from, to]) => `${from}  ${to}  301!`),
  "",
].join("\n");

const nginx = [
  "# Generated from src/data/redirects.json — do not edit by hand.",
  "# include this file from inside a server { } block.",
  "",
  ...rules.map(([from, to]) => `rewrite ^${from}$ ${to} permanent;`),
  "",
].join("\n");

/*
 * RedirectMatch rather than Redirect: `Redirect /a /b` also matches /a/anything
 * and appends the remainder, so /solaredge/ would happily capture
 * /solaredge/foo and send it to /brands/solaredge/foo — a page that does not
 * exist. Anchoring with ^…$ keeps each rule to the one URL it names.
 *
 * Sources are escaped because RedirectMatch takes a regex, and an unescaped
 * "." in a legacy WordPress URL would match any character.
 */
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const apache = [
  "# Generated from src/data/redirects.json — do not edit by hand.",
  "# Apache / cPanel. Paste into the .htaccess at the DOMAIN ROOT (public_html),",
  "# not the one inside /new — these are the old WordPress URLs, which live at",
  "# the root. Requires mod_alias, which cPanel enables by default.",
  "#",
  "# 301 = permanent, which is what transfers ranking signal to the new URL.",
  "",
  "<IfModule mod_alias.c>",
  ...rules.map(([from, to]) => `  RedirectMatch 301 ^${escapeRe(from)}$ ${to}`),
  "</IfModule>",
  "",
].join("\n");

const dist = resolve(root, "dist");

await Promise.all([
  writeFile(resolve(dist, "redirects.apache.conf"), apache, "utf8"),
  writeFile(resolve(dist, "_redirects"), netlify, "utf8"),
  writeFile(resolve(dist, "redirects.nginx.conf"), nginx, "utf8"),
  writeFile(
    resolve(dist, "redirects.json"),
    JSON.stringify(Object.fromEntries(rules), null, 2),
    "utf8"
  ),
]);

console.log(`[redirects] Emitted ${rules.length} rules (apache, _redirects, nginx, json).`);
