/**
 * Staging build — produces dist/ configured for a /new subfolder, plus a zip
 * ready to upload and extract in cPanel.
 *
 * Env vars are set here rather than inline in the npm script so the command
 * works the same on Windows, where `FOO=bar npm run …` is not valid shell.
 *
 * Run: npm run build:staging
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { rmSync, existsSync, statSync } from "node:fs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const BASE = "/new";
const env = {
  ...process.env,
  SITE_BASE: BASE,
  PUBLIC_STAGING: "true",
};

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", env, shell: false, ...opts });
  if (r.status !== 0) {
    console.error(`\n[staging] FAILED: ${cmd} ${args.join(" ")}`);
    process.exit(r.status ?? 1);
  }
}

// A stale dist from a root build would leave root-based HTML behind, and the
// zip would ship a mix of both.
rmSync(resolve(root, "dist"), { recursive: true, force: true });

console.log(`[staging] Building with base="${BASE}", PUBLIC_STAGING=true\n`);
run("npx", ["astro", "build"]);
run("node", ["scripts/emit-redirects.mjs"]);
run("node", ["scripts/staging-assets.mjs"]);
// The content editor must ship with the staging build too, or /admin/
// renders its "could not load" fallback on the preview site.
run("node", ["scripts/copy-cms.mjs"]);

// ── Zip the CONTENTS of dist, not the dist folder itself ─────────────────────
// `cd dist && zip -r ../out.zip .` stores paths as "index.html", not
// "dist/index.html", so extracting inside /new puts index.html directly there
// rather than in a nested /new/dist/ folder. That nesting is the single most
// common way a subfolder upload ends up 404ing.
const zipName = "advanced-solar-tech-staging-new.zip";
const zipPath = resolve(root, zipName);
rmSync(zipPath, { force: true });

// The Netlify/nginx artifacts do nothing on Apache/cPanel — leaving them in a
// public folder is just confusing clutter. redirects.apache.conf DOES stay:
// it is the file whose contents go into the domain-root .htaccess at go-live,
// and the zip is how it reaches whoever does that. It maps old URLs to new
// ones and contains nothing sensitive.
const zipped = spawnSync(
  "zip",
  [
    "-r", "-q", "-X", zipPath, ".",
    "-x", ".DS_Store",
    "-x", "_redirects",
    "-x", "redirects.json",
    "-x", "redirects.nginx.conf",
  ],
  { cwd: resolve(root, "dist"), stdio: "inherit" }
);

if (zipped.status !== 0 || !existsSync(zipPath)) {
  console.warn(
    `\n[staging] Build succeeded but zipping failed (is the 'zip' command installed?).\n` +
      `          dist/ is ready — archive its CONTENTS manually, not the folder itself.`
  );
  process.exit(0);
}

const kb = (statSync(zipPath).size / 1024).toFixed(0);
console.log(`\n[staging] ${zipName} (${kb} KB)`);
console.log(`[staging] Upload to public_html/new/ and Extract there.`);
console.log(`[staging] index.html must end up at public_html/new/index.html — no nested folder.`);
