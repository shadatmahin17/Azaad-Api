const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { AUDIO_DIR, COVER_DIR } = require('../config/env');

// Ensure destination directories exist
[AUDIO_DIR, COVER_DIR].forEach((dir) => {
  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Allowed MIME types and extensions
const ALLOWED_AUDIO_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/aac',
  'audio/flac',
  'audio/x-m4a',
  'audio/mp4',
]);

const ALLOWED_AUDIO_EXTENSIONS = new Set([
  '.mp3',
  '.wav',
  '.ogg',
  '.aac',
  '.flac',
  '.m4a',
]);

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const ALLOWED_IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'audio') return cb(null, AUDIO_DIR);
    if (file.fieldname === 'cover') return cb(null, COVER_DIR);
    return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueId = crypto.randomUUID();
    cb(null, `${Date.now()}-${uniqueId}${ext}`);
  },
});

/**
 * Filter for audio and song cover uploads.
 */
function songFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();

  if (file.fieldname === 'audio') {
    if (ALLOWED_AUDIO_TYPES.has(file.mimetype) && ALLOWED_AUDIO_EXTENSIONS.has(ext)) {
      return cb(null, true);
    }
    return cb(
      new Error(
        'Invalid audio format. Allowed formats: MP3, WAV, OGG, AAC, FLAC, M4A'
      ),
      false
    );
  }

  if (file.fieldname === 'cover') {
    if (ALLOWED_IMAGE_TYPES.has(file.mimetype) && ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
      return cb(null, true);
    }
    return cb(
      new Error(
        'Invalid cover image format. Allowed formats: JPEG, PNG, WEBP, GIF'
      ),
      false
    );
  }

  return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname), false);
}

/**
 * Filter for user avatar uploads.
 */
function avatarFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();

  if (ALLOWED_IMAGE_TYPES.has(file.mimetype) && ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    return cb(null, true);
  }

  return cb(
    new Error('Invalid avatar format. Allowed formats: JPEG, PNG, WEBP, GIF'),
    false
  );
}

const upload = multer({
  storage,
  fileFilter: songFileFilter,
  limits: {
    files: 2,
    fileSize: 100 * 1024 * 1024, // 100MB maximum for audio files
  },
});

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: avatarFileFilter,
  limits: {
    files: 1,
    fileSize: 5 * 1024 * 1024, // 5MB maximum for avatar images
  },
});

module.exports = { upload, avatarUpload };
