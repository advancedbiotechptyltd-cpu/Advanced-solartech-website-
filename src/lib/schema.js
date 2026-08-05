/**
 * JSON-LD builders.
 *
 * Every fact emitted here comes from `src/data` — nothing is written inline in
 * a template. That is what keeps the structured data and the visible page in
 * agreement, which is the thing both Google and AI crawlers check for.
 */
import { business, services, locations, absoluteUrl, getAggregateRating } from "./site.js";

const ORG_ID = `${business.url}/#organisation`;

/** Site-wide LocalBusiness. Emitted once per page from BaseLayout. */
export function localBusinessSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": ORG_ID,
    name: business.name,
    description: business.description,
    url: business.url,
    telephone: business.phone,
    email: business.email,
    /*
     * The states served directly, as structured places. National reach through
     * partner installers is real and is stated in the page copy, but marking it
     * up as areaServed would tell Google this business installs in Perth — it
     * does not, and a local-pack result there would be a false signal.
     */
    areaServed: locations
      .filter((l) => l.serviced)
      .map((l) => ({ "@type": "State", name: l.state })),
    sameAs: business.social,
  };

  if (business.logo?.src) schema.logo = business.logo.src;

  /*
   * The services this business offers, read from services.json so the markup
   * cannot drift from the pages. Without this the LocalBusiness entity says
   * nothing about what is actually sold, and a service added to the site would
   * be invisible to anything reading the structured data.
   *
   * No `price` on any offer: we do not publish fixed prices, and inventing one
   * to win a rich result is a misrepresentation.
   */
  if (services.length) {
    schema.hasOfferCatalog = {
      "@type": "OfferCatalog",
      name: `${business.name} services`,
      itemListElement: services.map((service) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: service.title,
          description: service.summary,
          url: absoluteUrl(`/services/${service.slug}/`),
        },
      })),
    };
  }

  // Only ever present when the rating is real and sourced — see site.js.
  const rating = getAggregateRating();
  if (rating) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: rating.ratingValue,
      reviewCount: rating.reviewCount,
    };
  }

  return schema;
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${business.url}/#website`,
    url: business.url,
    name: business.name,
    publisher: { "@id": ORG_ID },
  };
}

/** Service pages. `areaServed` narrows for location-scoped service pages. */
export function serviceSchema(service, areaServed = business.areaServed) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.summary,
    serviceType: service.title,
    areaServed,
    provider: { "@id": ORG_ID },
    url: absoluteUrl(`/services/${service.slug}/`),
  };
}

/** Brand pages describe a product line, not a specific SKU with a price. */
export function productSchema(brand) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${brand.name} ${brand.productTypes?.[0] ?? "products"}`,
    description: brand.summary,
    brand: { "@type": "Brand", name: brand.name },
    category: brand.category,
    url: absoluteUrl(`/brands/${brand.slug}/`),
    // No `offers` block: we do not publish a fixed price, and inventing one to
    // win a rich result is a misrepresentation.
  };
}

export function articleSchema(article) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.published,
    dateModified: article.updated ?? article.published,
    author: { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
    mainEntityOfPage: absoluteUrl(`/resources/${article.slug}/`),
  };
}

/** FAQPage — only valid when the same Q&A is visible on the page. */
export function faqSchema(faqs) {
  if (!faqs?.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

/** BreadcrumbList for every page below the root. */
export function breadcrumbSchema(crumbs) {
  if (!crumbs?.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: absoluteUrl(c.href),
    })),
  };
}

/** Location pages: the business, scoped to the area that page covers. */
export function localAreaSchema(location) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: `${business.name} — ${location.state ?? location.name}`,
    description: location.metaDescription,
    url: business.url,
    telephone: business.phone,
    email: business.email,
    parentOrganization: { "@id": ORG_ID },
    areaServed: {
      "@type": location.state && !location.name ? "State" : "Place",
      name: location.name ?? location.state,
    },
  };
}
