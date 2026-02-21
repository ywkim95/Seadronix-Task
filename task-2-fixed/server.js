const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const {
  PORT,
  SERVER_TIMEOUT_MS,
  PUBLIC_DIR,
  VIDEOS_DIR,
  SUPPORTED_VIDEO_EXTENSIONS,
  MAX_UPLOAD_SIZE_BYTES,
  MAX_WS_BUFFER_BYTES,
} = require('./src/config/constants');
const VideoRepository = require('./src/services/videoRepository');
const StreamManager = require('./src/services/streamManager');
const { createUploadMiddleware } = require('./src/middleware/upload');
const registerVideoRoutes = require('./src/routes/videoRoutes');
const registerWsHandlers = require('./src/ws/registerWsHandlers');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

server.timeout = SERVER_TIMEOUT_MS;
server.keepAliveTimeout = SERVER_TIMEOUT_MS;
server.headersTimeout = SERVER_TIMEOUT_MS;

const videoRepository = new VideoRepository({
  videosDir: VIDEOS_DIR,
  supportedExtensions: SUPPORTED_VIDEO_EXTENSIONS,
});
videoRepository.ensureDirectoryExists();

const upload = createUploadMiddleware({
  videoRepository,
  maxUploadSizeBytes: MAX_UPLOAD_SIZE_BYTES,
});

const streamManager = new StreamManager({
  videoRepository,
  maxBufferedAmountBytes: MAX_WS_BUFFER_BYTES,
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(PUBLIC_DIR));
app.use('/videos', express.static(VIDEOS_DIR));

registerVideoRoutes(app, { upload, videoRepository });
registerWsHandlers(wss, streamManager);

app.use((error, req, res, next) => {
  console.error('[server] Unhandled error:', error);

  if (res.headersSent) {
    next(error);
    return;
  }

  res.status(500).json({
    error: '서버 오류가 발생했습니다.',
  });
});

server.on('error', (error) => {
  console.error('[server] Startup error:', error.message);

  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Server timeout: ${SERVER_TIMEOUT_MS}ms`);
  console.log('FFmpeg must be installed and available in PATH.');
});
