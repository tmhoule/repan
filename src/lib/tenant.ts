/**
 * Subdomain-based multi-tenant resolution.
 *
 * Reads the Host header to extract a tenant slug from the subdomain.
 * e.g. acme.velo.hermes-tv.com → slug "acme"
 *
 * APP_BASE_DOMAIN env var defines the base (e.g. "velo.hermes-tv.com").
 * Anything before the base domain is the tenant subdomain.
 */

const BASE_DOMAIN = process.env.APP_BASE_DOMAIN ?? "";

/**
 * Extract tenant subdomain from a hostname.
 * Returns null if no subdomain or if hostname IS the base domain.
 */
export function extractSubdomain(host: string | null): string | null {
  if (!host || !BASE_DOMAIN) return null;

  // Strip port
  const hostname = host.split(":")[0].toLowerCase();
  const base = BASE_DOMAIN.toLowerCase();

  // Must end with base domain and have something before it
  if (!hostname.endsWith(`.${base}`)) return null;

  const sub = hostname.slice(0, -(base.length + 1));
  // Only single-level subdomains (no dots)
  if (!sub || sub.includes(".")) return null;

  return sub;
}

/**
 * Generate a URL-safe slug from a team name.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
