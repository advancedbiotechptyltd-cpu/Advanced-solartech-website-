import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import business from "./src/data/business.json" with { type: "json" };

/*
 * `base` is env-driven rather than hard-coded, so the same source tree builds
 * both the production site (domain root) and the staging copy (/new) without a
 * file edit between them:
 *
 *   npm run build           → served at https://advancedsolartec.com.au/
 *   npm run build:staging   → served at https://advancedsolartec.com.au/new/
 *
 * Astro prefixes bundled assets with `base` automatically. Hand-written
 * internal links are prefixed by the `href()` helper in src/lib/site.js, and
 * `npm run check:html` fails the build if anything in dist/ escapes the base.
 */
const BASE = process.env.SITE_BASE || "/";
const IS_STAGING = process.env.PUBLIC_STAGING === "true";

// `site` is always the production origin: canonical URLs, OG tags and the
// sitemap are built from it plus the base.
export default defineConfig({
  site: business.url,
  base: BASE,
  trailingSlash: "always",
  build: {
    format: "directory",
    // One stylesheet rather than per-page <style> blocks, so CSS is cached
    // across navigations instead of re-downloaded per page.
    inlineStylesheets: "never",
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes("/404"),
      changefreq: "monthly",
      lastmod: new Date(),
    }),
  ],
  compressHTML: true,
  devToolbar: { enabled: false },
  vite: {
    define: {
      // Surfaced to components as import.meta.env.PUBLIC_STAGING.
      "import.meta.env.PUBLIC_STAGING": JSON.stringify(String(IS_STAGING)),
    },
  },
});
