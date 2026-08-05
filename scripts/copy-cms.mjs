/**
 * Copies the Sveltia CMS bundle into dist/admin/ at build time.
 *
 * Self-hosted rather than pulled from a CDN. The CMS is the tool that edits the
 * entire site — putting a third-party CDN in front of it means an outage there
 * locks staff out of their own content, and it hands a third party the ability
 * to change what runs on that page. Copying ~1MB at build time avoids both.
 *
 * The version is pinned by package.json, so an upstream release cannot change
 * the editor under staff without a deliberate `npm update`.
 */
import { copyFile, mkdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "node_modules/@sveltia/cms/dist/sveltia-cms.js");
const targetDir = resolve(root, "dist/admin");
const target = resolve(targetDir, "sveltia-cms.js");

try {
  await stat(source);
} catch {
  console.error(
    "[cms] @sveltia/cms is not installed — run `npm install`.\n" +
      "      Skipping: the site will build, but /admin/ will show its fallback message."
  );
  process.exit(0);
}

await mkdir(targetDir, { recursive: true });
await copyFile(source, target);

const kb = ((await stat(target)).size / 1024).toFixed(0);
console.log(`[cms] Copied editor bundle to dist/admin/sveltia-cms.js (${kb} KB).`);
