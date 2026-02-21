export function showConfig(refs, sourceType) {
  refs.fileConfig.style.display = 'none';
  refs.httpConfig.style.display = 'none';
  refs.webcamConfig.style.display = 'none';

  if (sourceType === 'file') {
    refs.fileConfig.style.display = 'block';
    return;
  }

  if (sourceType === 'http') {
    refs.httpConfig.style.display = 'block';
    return;
  }

  refs.webcamConfig.style.display = 'block';
}

export function showStatus(refs, message, type = 'info') {
  refs.status.textContent = message;
  refs.status.className = `status-message ${type}`;
  refs.status.style.display = 'block';

  if (type === 'success' || type === 'error') {
    setTimeout(() => {
      if (refs.status.textContent === message) {
        refs.status.style.display = 'none';
      }
    }, 5000);
  }
}

export function setStreamingButtons(refs, isStreaming) {
  refs.startButton.disabled = isStreaming;
  refs.stopButton.disabled = !isStreaming;
}

export function resetStatView(refs) {
  refs.realFps.textContent = '0';
  refs.realLatency.textContent = '0 ms';
  refs.realResolution.textContent = '-';
  refs.realFrames.textContent = '0';
}

export function showCanvas(refs, enabled) {
  refs.canvas.style.display = enabled ? 'block' : 'none';
  refs.noStream.style.display = enabled ? 'none' : 'block';
}
