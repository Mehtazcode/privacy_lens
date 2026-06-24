// backend/trustScore.js

// ─── TRUSTED ────────────────────────────────────────────────────────────────
// Infrastructure, payments, CDNs, and services with strong privacy practices.
const trustedList = [
  // Google (infrastructure / analytics — NOT advertising)
  'google analytics', 'google tag manager', 'google fonts',
  'google apis', 'google cloud', 'firebase', 'google',

  // Payments
  'stripe', 'razorpay', 'paypal', 'braintree', 'square', 'paytm',

  // Cloud infrastructure / CDN
  'aws', 'amazon web services', 'cloudflare', 'fastly', 'akamai',

  // Apple (strong privacy stance)
  'apple', 'apple sign in', 'apple pay',

  // Dev tools / communications (not advertising)
  'github', 'twilio', 'sendgrid', 'mailgun', 'postmark',

  // Support tools that don't do behavioral tracking
  'zendesk',
];

// ─── CAUTION ────────────────────────────────────────────────────────────────
// Advertising networks, social pixels, behavioral tracking, session recording.
// NOTE: Check this list BEFORE trusted — more specific entries take priority.
// e.g. "Google Ads" should be caution, not trusted just because it has "google".
const cautionList = [
  // Meta / Facebook
  'facebook', 'facebook pixel', 'meta pixel', 'meta ads', 'instagram','whatsapp', 'messenger',

  // TikTok / ByteDance
  'tiktok', 'tiktok pixel',

  // Twitter / X
  'twitter', 'x corp', 'x pixel',

  // Google Advertising (separate from Google Analytics)
  'google ads', 'google adsense', 'doubleclick', 'google ad',

  // LinkedIn
  'linkedin', 'linkedin pixel', 'linkedin ads',

  // Snapchat
  'snapchat', 'snap pixel', 'snap inc',

  // Pinterest
  'pinterest', 'pinterest tag', 'pinterest pixel',

  // Advertising networks
  'taboola', 'outbrain', 'criteo', 'amazon advertising', 'amazon ads',

  // Session recording (captures user behaviour — mouse moves, clicks, scrolls)
  'hotjar', 'fullstory', 'mouseflow', 'lucky orange', 'microsoft clarity',
  'clarity',

  // Behavioral analytics (tracks user journeys and events)
  'mixpanel', 'amplitude', 'heap', 'segment',

  // Marketing automation
  'hubspot', 'marketo', 'mailchimp',

  // A/B testing tools (track users across variants)
  'optimizely', 'vwo', 'ab tasty',
];

/**
 * Deterministically classifies a third-party service name into a trust level.
 *
 * Caution is checked FIRST so that specific entries like "Google Ads" are
 * caught before the broader "Google" entry in the trusted list.
 *
 * @param {string} name - The name of the third-party service (from AI output).
 * @returns {string} 'trusted', 'caution', or 'unknown'
 */
function classifyThirdParty(name) {
  if (!name) return 'unknown';

  const lowerName = name.toLowerCase().trim();

  // Caution check first — catches specific ad/tracking services
  // before broader trusted parent companies match
  if (cautionList.some(item => lowerName.includes(item))) {
    return 'caution';
  }

  if (trustedList.some(item => lowerName.includes(item))) {
    return 'trusted';
  }

  return 'unknown';
}

module.exports = { classifyThirdParty };
