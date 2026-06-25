// backend/trustScore.test.js
const { classifyThirdParty } = require('./trustScore');

// ─── TRUSTED SERVICES ────────────────────────────────────────────────────────

describe('trusted services', () => {

  test.each([
    ['Google Analytics'],
    ['Google Tag Manager'],
    ['Google Cloud'],
    ['Firebase'],
    ['Google'],
    ['Stripe'],
    ['Razorpay'],
    ['PayPal'],
    ['Braintree'],
    ['AWS'],
    ['Amazon Web Services'],
    ['Cloudflare'],
    ['Fastly'],
    ['Akamai'],
    ['Apple'],
    ['Apple Pay'],
    ['Apple Sign In'],
    ['GitHub'],
    ['Twilio'],
    ['SendGrid'],
    ['Zendesk'],
  ])('classifies "%s" as trusted', (name) => {
    expect(classifyThirdParty(name)).toBe('trusted');
  });

});

// ─── CAUTION SERVICES ────────────────────────────────────────────────────────

describe('caution services', () => {

  test.each([
    ['Facebook'],
    ['Facebook Pixel'],
    ['Meta Pixel'],
    ['Meta Ads'],
    ['Instagram'],
    ['WhatsApp'],
    ['TikTok'],
    ['TikTok Pixel'],
    ['Twitter'],
    ['X Corp'],
    ['Google Ads'],
    ['Google AdSense'],
    ['DoubleClick'],
    ['LinkedIn'],
    ['LinkedIn Ads'],
    ['LinkedIn Pixel'],
    ['Snapchat'],
    ['Pinterest'],
    ['Pinterest Tag'],
    ['Hotjar'],
    ['FullStory'],
    ['Mouseflow'],
    ['Microsoft Clarity'],
    ['Mixpanel'],
    ['Amplitude'],
    ['Heap'],
    ['Segment'],
    ['HubSpot'],
    ['Mailchimp'],
    ['Optimizely'],
    ['Taboola'],
    ['Outbrain'],
    ['Criteo'],
    ['Amazon Advertising'],
  ])('classifies "%s" as caution', (name) => {
    expect(classifyThirdParty(name)).toBe('caution');
  });

});

// ─── CRITICAL: CAUTION-BEFORE-TRUSTED ORDERING ───────────────────────────────
// These tests verify the most important logic decision in trustScore.js:
// caution is checked BEFORE trusted so that specific ad/tracking services
// are not accidentally classified as trusted just because their parent
// company appears in the trusted list.

describe('caution-before-trusted ordering (critical)', () => {

  test('Google Ads → caution, not trusted (contains "google" which is trusted)', () => {
    expect(classifyThirdParty('Google Ads')).toBe('caution');
  });

  test('Google AdSense → caution, not trusted', () => {
    expect(classifyThirdParty('Google AdSense')).toBe('caution');
  });

  test('DoubleClick → caution, not trusted (Google-owned ad network)', () => {
    expect(classifyThirdParty('DoubleClick')).toBe('caution');
  });

  test('Amazon Advertising → caution, not trusted (contains "amazon" which is trusted)', () => {
    expect(classifyThirdParty('Amazon Advertising')).toBe('caution');
  });

  test('Facebook Pixel → caution (not unknown)', () => {
    expect(classifyThirdParty('Facebook Pixel')).toBe('caution');
  });

  test('Instagram → caution (Meta property, even without "facebook" in the name)', () => {
    expect(classifyThirdParty('Instagram')).toBe('caution');
  });

  test('WhatsApp → caution (Meta property)', () => {
    expect(classifyThirdParty('WhatsApp')).toBe('caution');
  });

  test('Microsoft Clarity → caution (session recording tool, not general Microsoft)', () => {
    expect(classifyThirdParty('Microsoft Clarity')).toBe('caution');
  });

});

// ─── UNKNOWN SERVICES ────────────────────────────────────────────────────────

describe('unknown services', () => {

  test.each([
    ['RandomSDK'],
    ['Acme Analytics'],
    ['SomeTracker'],
    ['Integrated partners'],
    ['Vendors and service providers'],
    ['External researchers'],
    ['Third-party applications'],
  ])('classifies "%s" as unknown', (name) => {
    expect(classifyThirdParty(name)).toBe('unknown');
  });

});

// ─── CASE INSENSITIVITY ──────────────────────────────────────────────────────
// The function lowercases input before matching, so casing should not matter.

describe('case insensitivity', () => {

  test('STRIPE → trusted', () => {
    expect(classifyThirdParty('STRIPE')).toBe('trusted');
  });

  test('stripe → trusted', () => {
    expect(classifyThirdParty('stripe')).toBe('trusted');
  });

  test('FACEBOOK PIXEL → caution', () => {
    expect(classifyThirdParty('FACEBOOK PIXEL')).toBe('caution');
  });

  test('Google ANALYTICS → trusted', () => {
    expect(classifyThirdParty('Google ANALYTICS')).toBe('trusted');
  });

  test('GOOGLE ADS → caution, not trusted', () => {
    expect(classifyThirdParty('GOOGLE ADS')).toBe('caution');
  });

});

// ─── EDGE CASES ──────────────────────────────────────────────────────────────

describe('edge cases', () => {

  test('empty string → unknown', () => {
    expect(classifyThirdParty('')).toBe('unknown');
  });

  test('null → unknown', () => {
    expect(classifyThirdParty(null)).toBe('unknown');
  });

  test('undefined → unknown', () => {
    expect(classifyThirdParty(undefined)).toBe('unknown');
  });

  test('whitespace only → unknown', () => {
    expect(classifyThirdParty('   ')).toBe('unknown');
  });

  test('number passed as string → unknown', () => {
    expect(classifyThirdParty('12345')).toBe('unknown');
  });

});
