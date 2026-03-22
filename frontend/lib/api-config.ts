/**
 * API Config -- Custom Domain Detection
 *
 * Detects whether the app is running on a custom domain vs Adverant infrastructure.
 * On custom domains, auth API calls route through same-origin proxy to avoid CORS.
 *
 * CUSTOMIZE: Add your first-party product domains to FIRST_PARTY_PRODUCT_DOMAINS
 */

// CUSTOMIZE: Add your plugin's standalone domain (e.g., 'your-plugin.com')
const FIRST_PARTY_PRODUCT_DOMAINS: string[] = [
  // 'your-plugin-domain.com',
  // 'www.your-plugin-domain.com',
];

/** Returns true if the app is running on a custom (white-label) domain */
export function isCustomDomain(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  if (FIRST_PARTY_PRODUCT_DOMAINS.includes(host)) return false;
  return (
    !host.endsWith('.adverant.ai') &&
    host !== 'localhost' &&
    host !== '127.0.0.1' &&
    !host.startsWith('192.168.') &&
    !host.startsWith('10.')
  );
}

/** Returns true if running on a first-party product domain */
export function isProductDomain(): boolean {
  if (typeof window === 'undefined') return false;
  return FIRST_PARTY_PRODUCT_DOMAINS.includes(window.location.hostname);
}

/** Returns the base URL for auth API calls */
export function getAuthApiBase(): string {
  if (isCustomDomain()) return '/nexus-auth';
  return process.env.NEXT_PUBLIC_API_URL || 'https://api.adverant.ai';
}

/** Returns the base URL for data API calls */
export function getDataApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'https://api.adverant.ai';
}
