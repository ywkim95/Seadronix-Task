const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../..');

const PORT = Number(process.env.PORT) || 3000;
const SERVER_TIMEOUT_MS = 600000;

const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const VIDEOS_DIR = path.join(ROOT_DIR, 'videos');

const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mov', '.mkv', '.webm'];
const MAX_UPLOAD_SIZE_BYTES = 500 * 1024 * 1024;
const MAX_WS_BUFFER_BYTES = 100 * 1024;

module.exports = {
  PORT,
  SERVER_TIMEOUT_MS,
  PUBLIC_DIR,
  VIDEOS_DIR,
  SUPPORTED_VIDEO_EXTENSIONS,
  MAX_UPLOAD_SIZE_BYTES,
  MAX_WS_BUFFER_BYTES,
};
