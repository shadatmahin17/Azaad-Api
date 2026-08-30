const { CATEGORY_OPTIONS } = require('../config/env');

function normalizeCategory(value) {
  const raw = String(value || '').trim().toLowerCase();
  const match = CATEGORY_OPTIONS.find((item) => item.toLowerCase() === raw);
  return match || 'Other';
}

module.exports = { normalizeCategory };
