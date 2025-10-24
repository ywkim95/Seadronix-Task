const express = require('express');
const WebSocket = require('ws');
const { spawn, execSync } = require('child_process');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http');

const app = express();
const PORT = 3000;

// 웹캠 감지 함수
function detectWebcam() {
  try {
    if (process.platform === 'win32') {
      // Windows: DirectShow 디바이스 목록 조회
      console.log('Running FFmpeg to detect devices...');

      let output;
      try {
        // stderr를 stdout으로 리다이렉트
        output = execSync('ffmpeg -list_devices true -f dshow -i dummy 2>&1', {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
      } catch (error) {
        // FFmpeg는 항상 에러를 반환하므로 stdout을 사용
        output = error.stdout || error.stderr || '';
      }

      // 비디오 디바이스 추출
      const videoDevices = [];
      const lines = output.split('\n');

      for (const line of lines) {
        // (video) 태그가 있는 라인에서 디바이스 이름 추출
        if (line.includes('(video)') && line.includes('"')) {
          const match = line.match(/"([^"]+)"/);
          if (match) {
            const deviceName = match[1];
            console.log('Found video device:', deviceName);
            videoDevices.push(deviceName);
          }
        }
      }

      console.log('Total cameras detected:', videoDevices.length);
      console.log('Camera list:', videoDevices);

      // 내장 카메라 우선 검색
      const integratedCamera = videoDevices.find(name =>
        name.toLowerCase().includes('integrated') ||
        name.toLowerCase().includes('built-in') ||
        name.toLowerCase().includes('webcam')
      );

      if (integratedCamera) {
        console.log('Using integrated camera:', integratedCamera);
        return `video=${integratedCamera}`;
      }

      // 내장 카메라가 없으면 첫 번째 카메라 사용
      if (videoDevices.length > 0) {
        console.log('Using first available camera:', videoDevices[0]);
        return `video=${videoDevices[0]}`;
      }

      throw new Error('No camera found');

    } else if (process.platform === 'darwin') {
      // macOS: AVFoundation 디바이스 목록 조회
      const output = execSync('ffmpeg -f avfoundation -list_devices true -i "" 2>&1', { encoding: 'utf-8' });

      const lines = output.split('\n');
      const videoDevices = [];

      for (const line of lines) {
        const match = line.match(/\[(\d+)\] (.+)/);
        if (match && !line.toLowerCase().includes('audio')) {
          videoDevices.push({ index: match[1], name: match[2] });
        }
      }

      console.log('Available cameras:', videoDevices);

      // 내장 카메라 우선 검색
      const integratedCamera = videoDevices.find(device =>
        device.name.toLowerCase().includes('facetime') ||
        device.name.toLowerCase().includes('built-in') ||
        device.name.toLowerCase().includes('isight')
      );

      if (integratedCamera) {
        console.log('Using integrated camera:', integratedCamera.name);
        return integratedCamera.index;
      }

      // 첫 번째 카메라 사용
      if (videoDevices.length > 0) {
        console.log('Using first available camera:', videoDevices[0].name);
        return videoDevices[0].index;
      }

      throw new Error('No camera found');

    } else {
      // Linux: v4l2 디바이스 검색
      const devices = fs.readdirSync('/dev').filter(file => file.startsWith('video'));

      if (devices.length > 0) {
        const devicePath = `/dev/${devices[0]}`;
        console.log('Using camera:', devicePath);
        return devicePath;
      }

      throw new Error('No camera found');
    }
  } catch (error) {
    console.error('Error detecting webcam:', error.message);
    // 기본값 반환
    if (process.platform === 'win32') {
      return 'video=Integrated Camera';
    } else if (process.platform === 'darwin') {
      return '0';
    } else {
      return '/dev/video0';
    }
  }
}

// HTTP 서버 생성
const server = http.createServer(app);

// 서버 타임아웃 설정 (큰 파일 업로드를 위해)
server.timeout = 600000; // 10분
server.keepAliveTimeout = 600000;
server.headersTimeout = 600000;

// WebSocket 서버 생성
const wss = new WebSocket.Server({ server });

// Body parser 설정 (JSON 요청용)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 정적 파일 제공
app.use(express.static('public'));
app.use('/videos', express.static('videos'));

// 파일 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './videos';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB 제한
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.mp4', '.avi', '.mov', '.mkv', '.webm'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('지원하지 않는 파일 형식입니다. MP4, AVI, MOV, MKV, WEBM 파일만 업로드할 수 있습니다.'));
    }
  }
});

// 업로드된 비디오 파일 목록
app.get('/api/videos', (req, res) => {
  const videosDir = './videos';
  if (!fs.existsSync(videosDir)) {
    return res.json([]);
  }

  const files = fs.readdirSync(videosDir)
    .filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.mp4', '.avi', '.mov', '.mkv', '.webm'].includes(ext);
    })
    .map(file => ({
      name: file,
      path: `/videos/${file}`
    }));

  res.json(files);
});

// 비디오 파일 업로드
app.post('/api/upload', (req, res) => {
  console.log('Upload request received');
  console.log('Content-Type:', req.headers['content-type']);

  upload.single('video')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer 에러 (파일 크기 초과 등)
      console.error('Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: '파일 크기가 너무 큽니다. 최대 500MB까지 업로드할 수 있습니다.' });
      }
      return res.status(400).json({ error: `업로드 오류: ${err.message}` });
    } else if (err) {
      // 기타 에러 (파일 형식 등)
      console.error('Upload error:', err);
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      console.error('No file received in request');
      return res.status(400).json({ error: '파일이 선택되지 않았습니다.' });
    }

    console.log(`File uploaded successfully: ${req.file.filename} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`);
    res.json({
      message: 'File uploaded successfully',
      filename: req.file.filename,
      path: `/videos/${req.file.filename}`
    });
  });
});

// 현재 스트리밍 중인 FFmpeg 프로세스
let currentStream = null;

// 스트림 중지 함수
function stopStream() {
  if (currentStream) {
    console.log('Stopping FFmpeg process...');

    // 프로세스 참조 저장 (setTimeout에서 사용하기 위해)
    const streamToStop = currentStream;
    currentStream = null;

    try {
      // FFmpeg를 안전하게 종료하기 위해 'q' 명령 전송
      if (streamToStop.stdin && !streamToStop.stdin.destroyed) {
        streamToStop.stdin.write('q');
        streamToStop.stdin.end();
      }

      // 프로세스 종료 시그널 전송
      if (!streamToStop.killed) {
        streamToStop.kill('SIGTERM');

        // 1초 후에도 종료되지 않으면 강제 종료
        setTimeout(() => {
          if (streamToStop && !streamToStop.killed) {
            console.log('Force killing FFmpeg process...');
            streamToStop.kill('SIGKILL');
          }
        }, 1000);
      }

      console.log('FFmpeg process stop signal sent');
    } catch (error) {
      console.error('Error stopping stream:', error);
    }
  }
}

// WebSocket 연결 처리
wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'start') {
        // 기존 스트림이 있으면 종료
        if (currentStream) {
          stopStream();
        }

        startStreaming(ws, data);
      } else if (data.type === 'stop') {
        stopStream();
        ws.send(JSON.stringify({ type: 'stopped' }));
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    stopStream();
  });
});

// 스트리밍 시작 함수
function startStreaming(ws, config) {
  const { sourceType, url, filePath } = config;

  let inputSource;
  let ffmpegArgs = [];

  // 입력 소스 결정
  if (sourceType === 'file') {
    // 파일 경로 정규화
    inputSource = path.join(__dirname, `.${filePath}`);

    // 파일 존재 확인
    if (!fs.existsSync(inputSource)) {
      console.error(`File not found: ${inputSource}`);
      ws.send(JSON.stringify({
        type: 'error',
        message: `파일을 찾을 수 없습니다: ${filePath}`
      }));
      return;
    }

    ffmpegArgs = [
      // 실시간 속도로 읽기 (입력 옵션)
      '-re',

      // 무한 루프 옵션
      '-stream_loop', '-1',

      // 입력
      '-i', inputSource,

      // 비디오 필터: 해상도 다운스케일 (더 작게)
      '-vf', 'scale=\'min(960,iw)\':-2',

      // 출력 설정
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg',
      '-q:v', '10',  // 품질 낮춤 (파일 크기 감소)
      '-r', '25',    // FPS 낮춤
      '-'
    ];
  } else if (sourceType === 'http') {
    inputSource = url;
    ffmpegArgs = [
      // 실시간 속도로 읽기 (입력 옵션)
      '-re',

      // 입력
      '-i', inputSource,

      // 비디오 필터: 해상도 다운스케일
      '-vf', 'scale=\'min(960,iw)\':-2',

      // 출력 설정
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg',
      '-q:v', '10',
      '-r', '25',
      '-'
    ];
  } else if (sourceType === 'webcam') {
    // 웹캠 자동 감지
    console.log('Detecting available webcam...');
    inputSource = detectWebcam();
    console.log('Selected webcam:', inputSource);

    // 웹캠 설정
    if (process.platform === 'win32') {
      ffmpegArgs = [
        '-f', 'dshow',
        '-i', inputSource,
        '-vf', 'scale=\'min(960,iw)\':-2',
        '-f', 'image2pipe',
        '-vcodec', 'mjpeg',
        '-q:v', '10',
        '-r', '25',
        '-'
      ];
    } else if (process.platform === 'darwin') {
      ffmpegArgs = [
        '-f', 'avfoundation',
        '-i', inputSource,
        '-vf', 'scale=\'min(960,iw)\':-2',
        '-f', 'image2pipe',
        '-vcodec', 'mjpeg',
        '-q:v', '10',
        '-r', '25',
        '-'
      ];
    } else {
      ffmpegArgs = [
        '-f', 'v4l2',
        '-i', inputSource,
        '-vf', 'scale=\'min(960,iw)\':-2',
        '-f', 'image2pipe',
        '-vcodec', 'mjpeg',
        '-q:v', '10',
        '-r', '25',
        '-'
      ];
    }
  }

  console.log(`Starting stream from: ${inputSource}`);
  console.log(`FFmpeg command: ffmpeg ${ffmpegArgs.join(' ')}`);

  // FFmpeg 프로세스 시작
  const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

  let frameBuffer = Buffer.alloc(0);
  const JPEG_START = Buffer.from([0xFF, 0xD8]);
  const JPEG_END = Buffer.from([0xFF, 0xD9]);
  let frameCount = 0;
  let droppedFrames = 0;

  // WebSocket 전송 큐 크기 제한 (100KB)
  const MAX_BUFFER_SIZE = 100 * 1024;

  // stdout으로부터 데이터 수신
  ffmpegProcess.stdout.on('data', (chunk) => {
    frameBuffer = Buffer.concat([frameBuffer, chunk]);

    // JPEG 프레임 추출
    let startIdx = frameBuffer.indexOf(JPEG_START);
    let endIdx = frameBuffer.indexOf(JPEG_END);

    while (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      // 완전한 JPEG 프레임 추출
      const frame = frameBuffer.slice(startIdx, endIdx + 2);

      // Base64로 인코딩하여 전송
      const base64Frame = frame.toString('base64');
      const timestamp = Date.now();

      // WebSocket 전송 큐 체크
      if (ws.readyState === WebSocket.OPEN) {
        // 전송 큐가 너무 크면 프레임 스킵
        if (ws.bufferedAmount > MAX_BUFFER_SIZE) {
          droppedFrames++;
          if (droppedFrames % 10 === 0) {
            console.log(`Dropped ${droppedFrames} frames (WebSocket buffer: ${ws.bufferedAmount} bytes)`);
          }
        } else {
          ws.send(JSON.stringify({
            type: 'frame',
            data: base64Frame,
            timestamp: timestamp
          }));
          frameCount++;

          if (frameCount % 100 === 0) {
            console.log(`Sent ${frameCount} frames, Dropped: ${droppedFrames}, Buffer: ${ws.bufferedAmount} bytes`);
          }
        }
      }

      // 처리된 프레임 제거
      frameBuffer = frameBuffer.slice(endIdx + 2);
      startIdx = frameBuffer.indexOf(JPEG_START);
      endIdx = frameBuffer.indexOf(JPEG_END);
    }

    // 버퍼가 너무 크면 초기화 (메모리 관리)
    if (frameBuffer.length > 10 * 1024 * 1024) {
      console.warn('Frame buffer too large, resetting');
      frameBuffer = Buffer.alloc(0);
    }
  });

  // stderr로부터 로그 수신 (FFmpeg 출력)
  ffmpegProcess.stderr.on('data', (data) => {
    const message = data.toString();
    // FFmpeg의 진행 상황만 로그 (verbose 출력 제외)
    if (message.includes('frame=') || message.includes('Error')) {
      console.log('FFmpeg:', message.trim());
    }
  });

  // 프로세스 시작 알림
  setTimeout(() => {
    if (ffmpegProcess && !ffmpegProcess.killed) {
      ws.send(JSON.stringify({
        type: 'started',
        source: inputSource
      }));
    }
  }, 500);

  // 프로세스 종료 처리
  ffmpegProcess.on('close', (code) => {
    console.log(`FFmpeg process exited with code ${code}`);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ended' }));
    }
  });

  // 에러 처리
  ffmpegProcess.on('error', (err) => {
    console.error('FFmpeg error:', err);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'error',
        message: `FFmpeg 오류: ${err.message}. FFmpeg가 설치되어 있는지 확인하세요.`
      }));
    }
  });

  currentStream = ffmpegProcess;
}

// 전역 에러 핸들러
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 서버 에러 핸들링 (listen 전에 설정)
server.on('error', (error) => {
  console.error('='.repeat(50));
  console.error('Server error:', error.message);
  console.error('='.repeat(50));

  if (error.code === 'EADDRINUSE') {
    console.error(`\n⚠️  Port ${PORT} is already in use!`);
    console.error('\nPlease do one of the following:');
    console.error('1. Close the other application using port 3000');
    console.error('2. Find and kill the process:');
    console.error('   - Windows: netstat -ano | findstr :3000');
    console.error('             taskkill /PID <PID> /F');
    console.error('   - Linux/Mac: lsof -i :3000');
    console.error('                kill -9 <PID>');
    console.error('3. Change the PORT in server.js to a different port\n');
    process.exit(1);
  }
});

// 서버 시작
server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`Server timeout: ${server.timeout}ms`);
  console.log('Make sure FFmpeg is installed on your system');
  console.log('='.repeat(50));
});
