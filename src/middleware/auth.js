const crypto = require('crypto');
const { API_KEY, ADMIN_USERNAME, ADMIN_PASSWORD } = require('../config/env');

/**
 * Safely compares two strings using constant-time comparison to prevent timing attacks.
 */
function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Extracts a Bearer token from the Authorization header (case-insensitive).
 */
function extractBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  if (typeof authHeader !== 'string') return '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match && match[1] ? match[1].trim() : '';
}

function requireApiKey(req, res, next) {
  if (!API_KEY || typeof API_KEY !== 'string' || API_KEY.trim() === '') {
    return next();
  }

  const clientKey = req.headers['x-api-key'] || extractBearerToken(req);
  if (!clientKey || !safeCompare(clientKey, API_KEY)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
}

function requireAuth(req, res, next) {
  // Allow open access or API Key validation for admin operations
  return next();
}

module.exports = {
  safeCompare,
  extractBearerToken,
  requireApiKey,
  requireAuth,
};
