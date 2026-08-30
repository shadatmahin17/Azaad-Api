/**
 * Checks if a string is a valid absolute HTTP or HTTPS URL.
 *
 * @param {string} value
 * @returns {boolean}
 */
function isHttpUrl(value) {
  if (!value || typeof value !== 'string') return false;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (_err) {
    return false;
  }
}

/**
 * Checks if a string is a valid S3 URI (s3://bucket/key).
 *
 * @param {string} value
 * @returns {boolean}
 */
function isS3Url(value) {
  if (!value || typeof value !== 'string') return false;
  return /^s3:\/\/[a-z0-9.\-_]+\/.+/i.test(value.trim());
}

/**
 * Checks if a string is a relative media path (e.g., /uploads/audio/track.mp3).
 *
 * @param {string} value
 * @returns {boolean}
 */
function isRelativeMediaPath(value) {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.startsWith('/') && !trimmed.startsWith('//');
}

/**
 * Validates if the given value is an allowed media URL (HTTP/HTTPS, S3, or relative path).
 *
 * @param {string} value
 * @returns {boolean}
 */
function isAllowedMediaUrl(value) {
  return isHttpUrl(value) || isS3Url(value) || isRelativeMediaPath(value);
}

/**
 * Converts an S3 URI (s3://bucket/path/to/file.mp3) into an HTTPS S3 URL.
 * Encodes path segments correctly to handle spaces, hashes, and special characters.
 *
 * @param {string} value - S3 URI
 * @returns {string} HTTP(S) URL or original value if invalid
 */
function normalizeS3Url(value) {
  if (!isS3Url(value)) return value;

  const trimmed = value.trim();
  const withoutProtocol = trimmed.slice(5); // Remove 's3://'
  const slashIndex = withoutProtocol.indexOf('/');
  if (slashIndex === -1) return value;

  const bucket = withoutProtocol.slice(0, slashIndex).trim();
  const rawKey = withoutProtocol.slice(slashIndex + 1).trim();

  // Strip any accidental leading slashes from key
  const cleanKey = rawKey.replace(/^\/+/, '');
  if (!bucket || !cleanKey) return value;

  // Correctly encode each path segment to preserve '/' while safely encoding '#', '?', '&', spaces, etc.
  const encodedKey = cleanKey
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  const region = (
    process.env.AWS_REGION ||
    process.env.AWS_DEFAULT_REGION ||
    process.env.S3_REGION ||
    ''
  ).trim();

  if (region && region !== 'us-east-1') {
    return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
  }

  return `https://${bucket}.s3.amazonaws.com/${encodedKey}`;
}

/**
 * Normalizes any media URL (converts S3 URIs to HTTPS URLs, trims whitespace).
 *
 * @param {string} value
 * @returns {string}
 */
function normalizeMediaUrl(value) {
  if (!value || typeof value !== 'string') return value;
  if (isS3Url(value)) return normalizeS3Url(value);
  return value.trim();
}

module.exports = {
  isHttpUrl,
  isS3Url,
  isRelativeMediaPath,
  isAllowedMediaUrl,
  normalizeS3Url,
  normalizeMediaUrl,
};
