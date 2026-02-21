export class FrameRenderer {
  constructor(refs, { targetFps = 30, maxLatencySamples = 30 } = {}) {
    this.refs = refs;
    this.targetFps = targetFps;
    this.minFrameInterval = 1000 / this.targetFps;
    this.maxLatencySamples = maxLatencySamples;

    this.isStreaming = false;
    this.isRendering = false;
    this.isFirstFrame = true;
    this.pendingFrame = null;
    this.lastRenderTime = 0;

    this.frameCount = 0;
    this.fpsCounter = 0;
    this.lastFpsUpdate = Date.now();
    this.latencies = [];
  }

  start() {
    this.isStreaming = true;
    this.isRendering = false;
    this.isFirstFrame = true;
    this.pendingFrame = null;
    this.lastRenderTime = 0;

    this.frameCount = 0;
    this.fpsCounter = 0;
    this.lastFpsUpdate = Date.now();
    this.latencies = [];

    this.refs.canvas.width = 0;
    this.refs.canvas.height = 0;
    this.refs.realFps.textContent = '0';
    this.refs.realLatency.textContent = '0 ms';
    this.refs.realResolution.textContent = '-';
    this.refs.realFrames.textContent = '0';
  }

  stop() {
    this.isStreaming = false;
    this.isRendering = false;
    this.pendingFrame = null;
    this.lastRenderTime = 0;
    this.isFirstFrame = true;

    this.refs.canvas.width = 0;
    this.refs.canvas.height = 0;
    this.refs.canvas.style.display = 'none';
    this.refs.noStream.style.display = 'block';

    this.refs.realFps.textContent = '0';
    this.refs.realLatency.textContent = '0 ms';
    this.refs.realResolution.textContent = '-';
    this.refs.realFrames.textContent = '0';
  }

  enqueueFrame(base64Data, serverTimestamp) {
    if (!this.isStreaming) {
      return;
    }

    const latency = Date.now() - serverTimestamp;
    this.pendingFrame = {
      base64Data,
      latency,
    };

    if (!this.isRendering) {
      this.processNextFrame();
    }
  }

  processNextFrame() {
    if (!this.pendingFrame || !this.isStreaming) {
      this.isRendering = false;
      return;
    }

    const now = Date.now();
    const elapsed = now - this.lastRenderTime;

    if (elapsed < this.minFrameInterval) {
      const wait = this.minFrameInterval - elapsed;
      setTimeout(() => this.processNextFrame(), wait);
      return;
    }

    this.isRendering = true;
    this.lastRenderTime = now;

    const { base64Data, latency } = this.pendingFrame;
    this.pendingFrame = null;

    const image = new Image();

    image.onload = () => {
      if (!this.isStreaming) {
        this.isRendering = false;
        return;
      }

      if (this.isFirstFrame || this.refs.canvas.width === 0 || this.refs.canvas.height === 0) {
        this.refs.canvas.width = image.width;
        this.refs.canvas.height = image.height;
        this.refs.realResolution.textContent = `${image.width} x ${image.height}`;
        this.isFirstFrame = false;
      }

      this.refs.canvasContext.drawImage(
        image,
        0,
        0,
        this.refs.canvas.width,
        this.refs.canvas.height,
      );

      this.refs.canvas.style.display = 'block';
      this.refs.noStream.style.display = 'none';

      this.updateStats(latency);

      this.isRendering = false;
      if (this.pendingFrame) {
        requestAnimationFrame(() => this.processNextFrame());
      }
    };

    image.onerror = () => {
      this.isRendering = false;
      if (this.pendingFrame) {
        this.processNextFrame();
      }
    };

    image.src = `data:image/jpeg;base64,${base64Data}`;
  }

  updateStats(latency) {
    this.frameCount += 1;
    this.fpsCounter += 1;

    this.latencies.push(latency);
    if (this.latencies.length > this.maxLatencySamples) {
      this.latencies.shift();
    }

    const averageLatency =
      this.latencies.reduce((total, value) => total + value, 0) / this.latencies.length;
    this.refs.realLatency.textContent = `${Math.round(averageLatency)} ms`;

    const now = Date.now();
    const elapsed = now - this.lastFpsUpdate;
    if (elapsed >= 1000) {
      const fps = Math.round((this.fpsCounter * 1000) / elapsed);
      this.refs.realFps.textContent = String(fps);
      this.fpsCounter = 0;
      this.lastFpsUpdate = now;
    }

    this.refs.realFrames.textContent = String(this.frameCount);
  }
}
