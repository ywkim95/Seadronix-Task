const { spawn } = require('child_process');
const WebSocket = require('ws');
const { buildFfmpegCommand } = require('./ffmpegArgsFactory');

const JPEG_START = Buffer.from([0xff, 0xd8]);
const JPEG_END = Buffer.from([0xff, 0xd9]);

class StreamManager {
  constructor({ videoRepository, maxBufferedAmountBytes }) {
    this.videoRepository = videoRepository;
    this.maxBufferedAmountBytes = maxBufferedAmountBytes;
    this.currentProcess = null;
  }

  send(ws, payload) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    ws.send(JSON.stringify(payload));
  }

  stop() {
    if (!this.currentProcess) {
      return;
    }

    const processToStop = this.currentProcess;
    this.currentProcess = null;

    try {
      if (processToStop.stdin && !processToStop.stdin.destroyed) {
        processToStop.stdin.write('q');
        processToStop.stdin.end();
      }

      if (!processToStop.killed) {
        processToStop.kill('SIGTERM');
        setTimeout(() => {
          if (!processToStop.killed) {
            processToStop.kill('SIGKILL');
          }
        }, 1000);
      }
    } catch (error) {
      console.error('[stream] Failed to stop FFmpeg process:', error.message);
    }
  }

  start(ws, streamConfig) {
    this.stop();

    let ffmpegCommand;
    try {
      ffmpegCommand = buildFfmpegCommand({
        ...streamConfig,
        videoRepository: this.videoRepository,
      });
    } catch (error) {
      this.send(ws, { type: 'error', message: error.message });
      return;
    }

    const ffmpegProcess = spawn('ffmpeg', ffmpegCommand.args);
    this.currentProcess = ffmpegProcess;

    this.bindStreamOutput(ws, ffmpegProcess);
    this.bindProcessEvents(ws, ffmpegProcess, ffmpegCommand.inputSource);
  }

  bindStreamOutput(ws, ffmpegProcess) {
    let frameBuffer = Buffer.alloc(0);
    let frameCount = 0;
    let droppedFrames = 0;

    ffmpegProcess.stdout.on('data', (chunk) => {
      frameBuffer = Buffer.concat([frameBuffer, chunk]);

      let startIndex = frameBuffer.indexOf(JPEG_START);
      let endIndex = frameBuffer.indexOf(JPEG_END);

      while (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        const frame = frameBuffer.slice(startIndex, endIndex + 2);
        frameBuffer = frameBuffer.slice(endIndex + 2);
        startIndex = frameBuffer.indexOf(JPEG_START);
        endIndex = frameBuffer.indexOf(JPEG_END);

        if (ws.readyState !== WebSocket.OPEN) {
          continue;
        }

        if (ws.bufferedAmount > this.maxBufferedAmountBytes) {
          droppedFrames += 1;
          continue;
        }

        this.send(ws, {
          type: 'frame',
          data: frame.toString('base64'),
          timestamp: Date.now(),
        });

        frameCount += 1;
        if (frameCount % 100 === 0) {
          console.log(`[stream] sent=${frameCount}, dropped=${droppedFrames}, wsBuffer=${ws.bufferedAmount}`);
        }
      }

      if (frameBuffer.length > 10 * 1024 * 1024) {
        console.warn('[stream] Frame buffer exceeded 10MB. Resetting buffered data.');
        frameBuffer = Buffer.alloc(0);
      }
    });
  }

  bindProcessEvents(ws, ffmpegProcess, inputSource) {
    ffmpegProcess.stderr.on('data', (data) => {
      const message = data.toString();
      if (message.includes('frame=') || message.toLowerCase().includes('error')) {
        console.log('[ffmpeg]', message.trim());
      }
    });

    setTimeout(() => {
      if (this.currentProcess === ffmpegProcess && !ffmpegProcess.killed) {
        this.send(ws, { type: 'started', source: inputSource });
      }
    }, 500);

    ffmpegProcess.on('close', (code) => {
      if (this.currentProcess === ffmpegProcess) {
        this.currentProcess = null;
      }

      console.log(`[stream] FFmpeg exited with code ${code}`);
      this.send(ws, { type: 'ended' });
    });

    ffmpegProcess.on('error', (error) => {
      if (this.currentProcess === ffmpegProcess) {
        this.currentProcess = null;
      }

      console.error('[stream] FFmpeg process error:', error.message);
      this.send(ws, {
        type: 'error',
        message: `FFmpeg 오류: ${error.message}. FFmpeg 설치 상태를 확인해주세요.`,
      });
    });
  }
}

module.exports = StreamManager;
