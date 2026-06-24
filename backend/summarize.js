// backend/summarize.js

const { classifyThirdParty } = require('./trustScore');

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

/**
 * Builds the prompt sent to the AI model.
 * Kept in its own function so it's easy to tweak the wording later
 * without touching the API logic.
 */
function buildPrompt(text) {
  return `You are a privacy policy analyst. Read the following Terms & Conditions or Privacy Policy text and return a structured JSON analysis.

CRITICAL: Respond with ONLY a valid JSON object. No markdown, no backticks, no explanation, no preamble. Start your response with { and end with }.

Return this exact JSON structure:
{
  "dataSummary": "2-3 sentence plain-English summary of what data this service collects and how it is used",
  "thirdParties": [
    {
      "name": "Third-party service name",
      "purpose": "What this service does with user data",
      "trustLevel": "trusted OR caution OR unknown"
    }
  ],
  "redFlags": [
    "Specific concerning clause or practice found in the text"
  ],
  "riskScore": "Low OR Medium OR High"
}

Trust level rules — apply these exactly:
- "trusted":  Google Analytics, Stripe, AWS, Cloudflare, Razorpay
- "caution":  Facebook Pixel, TikTok Pixel, Hotjar, DoubleClick, Mixpanel
- "unknown":  any service not listed above

Risk score rules — apply strictly. Do NOT let "we don't sell data" language lower the score:
- "Low":    minimal data collection, no advertising, no cross-company sharing, standard infrastructure analytics only
- "Medium": behavioral tracking, targeted ads, shares data with specific named third-party services
- "High":   ANY ONE of the following is enough to score High →
            • shares data across corporate subsidiaries or affiliated companies
            • shares with vague unnamed "partners", "integrated partners", or "third-party networks"
            • uses data for advertising based on sensitive attributes (age, gender, interests, location)
            • retains data indefinitely or for unspecified periods
            • no clear opt-out from data sharing
            • behavioral profiling across multiple platforms or services

If no third parties are mentioned, return "thirdParties": []
If no red flags are found, return "redFlags": []

Text to analyze:
${text}`;
}

/**
 * Calls the Groq API to summarize a T&C / Privacy Policy text.
 * Uses native Node.js fetch (requires Node v18+).
 *
 * @param {string} text - The extracted and sanitized page text (max 15,000 chars).
 * @returns {Promise<Object>} Parsed result: { dataSummary, thirdParties, redFlags, riskScore }
 */
async function summarize(text) {
  // Safety check — catch missing env var early with a clear error
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set in .env");
  }

  // Call the Groq API
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      temperature: 0.1, // Low = more consistent, predictable JSON output
      messages: [
        {
          role: "user",
          content: buildPrompt(text)
        }
      ]
    })
  });

  // Handle HTTP-level errors (429 rate limit, 401 bad key, 500 server error, etc.)
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq API error: ${response.status} — ${errorBody}`);
  }

  const data = await response.json();

  // Pull out the text content from the response
  const rawText = data.choices?.[0]?.message?.content?.trim();
  if (!rawText) {
    throw new Error("Groq returned an empty response.");
  }

  // Strip markdown code fences if the model added them despite instructions
  // e.g. ```json { ... } ``` → { ... }
  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  // Parse the JSON
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    // Log the raw response so you can debug what went wrong
    console.error("Failed to parse Groq response as JSON. Raw response:", rawText);
    throw new Error("Groq returned invalid JSON. Check backend logs for the raw response.");
  }

  // Validate all required keys are present
  const requiredKeys = ["dataSummary", "thirdParties", "redFlags", "riskScore"];
  for (const key of requiredKeys) {
    if (!(key in parsed)) {
      console.error(`Missing key "${key}" in parsed response:`, parsed);
      throw new Error(`Groq response is missing required field: "${key}"`);
    }
  }

  // Normalize riskScore — if the model returns something unexpected, default to Medium
  const validRiskScores = ["Low", "Medium", "High"];
  if (!validRiskScores.includes(parsed.riskScore)) {
    console.warn(`Unexpected riskScore value: "${parsed.riskScore}". Defaulting to "Medium".`);
    parsed.riskScore = "Medium";
  }

  // Override AI's trustLevel with deterministic classification from trustScore.js.
  // If we recognise the service → our list wins (more reliable than AI guessing).
  // If we don't recognise it → keep whatever the AI said as a fallback.
  if (Array.isArray(parsed.thirdParties)) {
    parsed.thirdParties = parsed.thirdParties.map(tp => {
      const deterministic = classifyThirdParty(tp.name);
      return {
        ...tp,
        trustLevel: deterministic !== 'unknown' ? deterministic : (tp.trustLevel || 'unknown')
      };
    });
  }

  return parsed;
}

module.exports = { summarize };
