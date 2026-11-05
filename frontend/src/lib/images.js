/**
 * Static image resolver and fallback helper for LICHT Signature Souvenirs.
 * Ensures pictures always load directly from the frontend without depending
 * on external databases or storage folders.
 */

const KNOWN_PRODUCTS = new Set([
  'the-signature-keepsake-box',
  'monogrammed-ring-dish',
  'personalised-soy-candle',
  'hand-thrown-keepsake-cups',
  'initial-pendant-necklace',
  'engraved-celebration-bracelet',
  'leather-travel-pouch',
  'linen-notebook-pen-set',
  'canvas-event-tote',
  'artisan-chocolate-favour-box',
  'the-botanical-ritual-box',
  'pressed-bloom-keepsake-frame',
]);

const KNOWN_CATEGORIES = new Set([
  'wedding-souvenirs',
  'birthday-gifts',
  'corporate-gifts',
  'personalised-gifts',
  'gift-boxes',
]);

export function getProductFallback(slug) {
  if (slug && KNOWN_PRODUCTS.has(slug)) {
    return `/images/products/${slug}.svg`;
  }
  return '/images/products/default.svg';
}

export function getCategoryFallback(slug) {
  if (slug && KNOWN_CATEGORIES.has(slug)) {
    return `/images/categories/${slug}.svg`;
  }
  return '/images/products/default.svg';
}

export function resolveProductImage(url, slug) {
  if (!url || typeof url !== 'string' || url.trim() === '' || url.includes('localhost')) {
    return getProductFallback(slug);
  }
  return url;
}

export function resolveCategoryImage(url, slug) {
  if (!url || typeof url !== 'string' || url.trim() === '' || url.includes('localhost')) {
    return getCategoryFallback(slug);
  }
  return url;
}

