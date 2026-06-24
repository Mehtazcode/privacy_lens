// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { summarize } = require('./summarize');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for extension
app.use(cors({
  origin: '*' // In production, restrict to 'chrome-extension://<your-extension-id>'
}));

// Parse JSON bodies
app.use(express.json({ limit: '2mb' }));

// In-memory rate limiting (max 10 requests per minute per IP)
const rateLimits = new Map();

function rateLimiter(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxReq = 10;

  if (!rateLimits.has(ip)) {
    rateLimits.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }

  const limitData = rateLimits.get(ip);
  if (now > limitData.resetTime) {
    // Reset window
    limitData.count = 1;
    limitData.resetTime = now + windowMs;
    return next();
  }

  if (limitData.count >= maxReq) {
    return res.status(429).json({ error: 'Too many requests, please try again later.' });
  }

  limitData.count++;
  next();
}

// Simple HTML sanitizer (strips all tags)
function stripHtmlTags(str) {
  if ((str===null) || (str==='')) return false;
  else str = str.toString();
  return str.replace(/<[^>]*>/g, '');
}

// Routes
app.post('/api/summarize', rateLimiter, async (req, res) => {
  const { text, domain } = req.body;

  // Validate
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid text.' });
  }
  
  let processedText = text;
  if (processedText.length > 30000) {
    processedText = processedText.substring(0, 30000);
  }

  // Sanitize
  processedText = stripHtmlTags(processedText);

  // Log request (not the text itself)
  console.log(`[${new Date().toISOString()}] Summarize request for domain: ${domain}, text length: ${processedText.length}`);

  try {
    const result = await summarize(processedText);
    res.json(result);
  } catch (err) {
    console.error('Error in summarization:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`PrivacyLens backend running on port ${PORT}`);
});
