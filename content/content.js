// content/content.js

/**
 * Checks if the current page is likely a Terms & Conditions or Privacy Policy page.
 * @returns {boolean} True if it's a T&C page, false otherwise.
 */
function isTermsOrPrivacyPage() {
  const keywords = ['privacy', 'terms', 'policy', 'tos', 'legal', 'gdpr'];
  
  // Check URL
  const url = window.location.href.toLowerCase();
  const urlMatches = keywords.some(kw => url.includes(kw));
  if (urlMatches) return true;

  // Check headings
  const headings = document.querySelectorAll('h1, h2');
  for (let h of headings) {
    const text = h.textContent.toLowerCase();
    if (keywords.some(kw => text.includes(kw))) {
      return true;
    }
  }

  return false;
}

/**
 * Extracts visible body text, ignoring navigation, footers, scripts, and styles.
 * @returns {string} Extracted text (up to 15,000 chars)
 */
function extractPageText() {
  // Clone the document body to avoid mutating the actual page
  const clone = document.body.cloneNode(true);

  // Remove unwanted elements
  const selectorsToRemove = ['nav', 'footer', 'script', 'style', 'noscript', 'iframe', 'header', 'aside'];
  selectorsToRemove.forEach(selector => {
    const elements = clone.querySelectorAll(selector);
    elements.forEach(el => el.remove());
  });

  // Extract text and clean up whitespace
  let text = clone.innerText || clone.textContent;
  text = text.replace(/\s+/g, ' ').trim();

  // Limit to 30,000 characters
  if (text.length > 30000) {
    text = text.substring(0, 30000);
  }

  return text;
}

// Main execution
if (isTermsOrPrivacyPage()) {
  console.log("PrivacyLens: T&C / Privacy Policy page detected.");
  
  const extractedText = extractPageText();
  const domain = window.location.hostname;

  // Store the extracted text directly in local storage
  // This way the service worker can pick it up even if it was inactive
  chrome.storage.local.set({
    [`pending_${domain}`]: {
      text: extractedText,
      domain: domain,
      timestamp: Date.now()
    }
  }, () => {
    console.log(`PrivacyLens: Text saved for ${domain}, notifying service worker.`);
    
    // Now notify the service worker
    chrome.runtime.sendMessage({
      action: "process_tc_text",
      text: extractedText,
      domain: domain
    }).catch(() => {
      // Service worker was inactive — that's ok, popup will trigger processing
      console.log("PrivacyLens: Service worker inactive, text saved to storage.");
    });
  });
}