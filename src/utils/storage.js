const fs = require('fs').promises;
const path = require('path');

/**
 * Clean local file deletion helper.
 */
async function removeLocalFile(filePath) {
  if (!filePath) return false;
  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  removeLocalFile,
};
