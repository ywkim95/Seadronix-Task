export function getDomRefs() {
  const canvas = document.getElementById('video-canvas');

  return {
    canvas,
    canvasContext: canvas.getContext('2d'),
    noStream: document.getElementById('no-stream'),
    status: document.getElementById('status'),
    startButton: document.getElementById('start-btn'),
    stopButton: document.getElementById('stop-btn'),
    fileSourceRadio: document.getElementById('file-source'),
    httpSourceRadio: document.getElementById('http-source'),
    webcamSourceRadio: document.getElementById('webcam-source'),
    fileConfig: document.getElementById('file-config'),
    httpConfig: document.getElementById('http-config'),
    webcamConfig: document.getElementById('webcam-config'),
    videoUpload: document.getElementById('video-upload'),
    fileName: document.getElementById('file-name'),
    videoList: document.getElementById('video-list'),
    httpUrl: document.getElementById('http-url'),
    realFps: document.getElementById('real-fps'),
    realLatency: document.getElementById('real-latency'),
    realResolution: document.getElementById('real-resolution'),
    realFrames: document.getElementById('real-frames'),
  };
}
