// background/service-worker.js
 
// ─── CONFIG ──────────────────────────────────────────────────────────────────
// Change BACKEND_URL to your Railway/Render URL before deploying
const BACKEND_URL = "http://localhost:3000";
const CACHE_TTL   = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const DAILY_LIMIT = 10;                   // Max unique domains per day
 
// ─── HELPERS ─────────────────────────────────────────────────────────────────
 
/**
 * Returns today's date as a YYYY-M-D string for daily usage tracking.
 */
function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
 
/**
 * Reads the daily usage record, resets it if it's a new day,
 * adds the domain if not already counted, and saves it back.
 * @returns {Promise<{count: number, limit: number}>}
 */
async function checkUsageLimit(domain) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['usageData'], (result) => {
      let usageData = result.usageData || { date: getTodayString(), domains: [] };

      if (usageData.date !== getTodayString()) {
        usageData = { date: getTodayString(), domains: [] };
      }

      const alreadyCounted = usageData.domains.includes(domain);
      const atLimit = usageData.domains.length >= DAILY_LIMIT;

      // New domain that would exceed the limit — flag it but don't add it
      const blocked = !alreadyCounted && atLimit;

      if (!alreadyCounted && !atLimit) {
        usageData.domains.push(domain);
      }

      chrome.storage.local.set({ usageData }, () => {
        resolve({
          count: usageData.domains.length,
          limit: DAILY_LIMIT,
          blocked // true only when a NEW domain is rejected
        });
      });
    });
  });
}
 
// ─── MESSAGE LISTENER ────────────────────────────────────────────────────────
 
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
 
  // ── Triggered by content.js when a T&C page is detected ──────────────────
  if (message.action === "process_tc_text") {
    const { text, domain } = message;
 
    chrome.storage.local.get([domain], async (result) => {
      const cached = result[domain];
      const now = Date.now();
 
      // Cache hit — valid result already stored, nothing to do
      if (
        cached &&
        cached.status === 'success' &&
        cached.timestamp &&
        now - cached.timestamp < CACHE_TTL
      ) {
        console.log(`[PrivacyLens] Cache hit for ${domain}`);
        await checkUsageLimit(domain); // Still track usage for counter display
        return;
      }
 
      // Cache miss — check daily limit before calling backend
      const usage = await checkUsageLimit(domain);
      if (usage.blocked ) {
        console.log(`[PrivacyLens] Daily limit reached. Skipping ${domain}.`);
        chrome.storage.local.set({
          [domain]: { status: 'limit_reached', timestamp: now }
        });
        return;
      }
 
      // Mark as processing immediately so popup can show a loading state
      // if the user opens it before the backend responds
      chrome.storage.local.set({
        [domain]: { status: 'processing', timestamp: now }
      });
 
      // Call the backend
      try {
        console.log(`[PrivacyLens] Sending ${domain} to backend...`);
 
        const response = await fetch(`${BACKEND_URL}/api/summarize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, domain })
        });
 
        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`Backend returned ${response.status}: ${errBody}`);
        }
 
        const data = await response.json();
 
        // Store successful result in cache
        chrome.storage.local.set({
          [domain]: { status: 'success', data, timestamp: now }
        });
 
        console.log(`[PrivacyLens] Analysis complete for ${domain}`);
 
      } catch (err) {
        console.error(`[PrivacyLens] Backend call failed for ${domain}:`, err);
 
        // Store error so popup can show a meaningful message instead of spinning
        chrome.storage.local.set({
          [domain]: { status: 'error', error: err.message, timestamp: now }
        });
      }
    });
  }
 
  // ── Triggered by popup.js when the user clicks the extension icon ─────────
  if (message.action === "analyzePage") {
    const url = new URL(message.url);
    const domain = url.hostname;
 
    chrome.storage.local.get([domain, 'usageData'], (result) => {
      const cached   = result[domain];
      const usageData = result.usageData || { date: getTodayString(), domains: [] };
 
      // Reset usage count if it's a new day
      const count = usageData.date === getTodayString()
        ? usageData.domains.length
        : 0;
 
      const usage = { count, limit: DAILY_LIMIT };
 
      if (!cached) {
        // Content script never ran on this page — not a T&C page
        // FIX: include usage so counter shows correctly even on non-T&C pages
        sendResponse({ status: 'not_tc_page', usage });
 
      } else if (cached.status === 'processing') {
        // Backend call is in progress
        sendResponse({ status: 'loading', usage });
 
      } else if (cached.status === 'limit_reached') {
        sendResponse({ status: 'limit_reached', usage });
 
      } else if (cached.status === 'error') {
        sendResponse({ status: 'error', error: cached.error, usage });
 
      } else if (cached.status === 'success') {
        // FIX: always show cached data regardless of usage count.
        // The limit should only block NEW analyses, not hide results the
        // user has already paid (quota-wise) to get.
        const status = usage.count >= 8 ? 'limit_warning' : 'success';
        sendResponse({ status, data: cached.data, usage });
 
      } else {
        sendResponse({ status: 'error', error: 'Unknown cached state.', usage });
      }
    });
 
    return true; // Keep the message channel open for the async sendResponse
  }
 
});