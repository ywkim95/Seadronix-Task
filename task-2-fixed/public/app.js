import { getDomRefs } from './js/dom.js';
import { showConfig, showStatus, setStreamingButtons } from './js/ui.js';
import { MAX_UPLOAD_SIZE_BYTES, listVideos, uploadVideo } from './js/videoApi.js';
import { FrameRenderer } from './js/frameRenderer.js';
import { StreamingSocket } from './js/socketClient.js';

const refs = getDomRefs();
const renderer = new FrameRenderer(refs);

const state = {
  isStreaming: false,
  reconnectTimer: null,
  lastStartConfig: null,
};

const socket = new StreamingSocket({
  onOpen() {
    if (state.isStreaming && state.lastStartConfig) {
      showStatus(refs, '서버와 재연결되었습니다. 스트리밍을 복구합니다...', 'info');
      socket.start(state.lastStartConfig);
      return;
    }

    showStatus(refs, '서버에 연결되었습니다', 'success');
  },
  onClose() {
    if (state.isStreaming) {
      showStatus(refs, '서버 연결이 끊어졌습니다. 3초 후 재연결합니다...', 'error');
      scheduleReconnect();
    }
  },
  onError(error) {
    console.error('[socket] error', error);
    showStatus(refs, 'WebSocket 연결 오류가 발생했습니다', 'error');
  },
  onMessage(payload) {
    handleSocketMessage(payload);
  },
});

function init() {
  bindEvents();
  showConfig(refs, 'file');
  refreshVideoList();
  socket.connect();
}

function bindEvents() {
  refs.fileSourceRadio.addEventListener('change', () => showConfig(refs, 'file'));
  refs.httpSourceRadio.addEventListener('change', () => showConfig(refs, 'http'));
  refs.webcamSourceRadio.addEventListener('change', () => showConfig(refs, 'webcam'));

  refs.videoUpload.addEventListener('change', handleFileUpload);
  refs.startButton.addEventListener('click', startStreaming);
  refs.stopButton.addEventListener('click', stopStreaming);
}

function scheduleReconnect() {
  if (state.reconnectTimer) {
    return;
  }

  state.reconnectTimer = setTimeout(() => {
    state.reconnectTimer = null;
    socket.connect();
  }, 3000);
}

function clearReconnectTimer() {
  if (!state.reconnectTimer) {
    return;
  }

  clearTimeout(state.reconnectTimer);
  state.reconnectTimer = null;
}

function updateVideoSelect(videos) {
  refs.videoList.innerHTML = '<option value="">기존 비디오 선택...</option>';

  videos.forEach((video) => {
    const option = document.createElement('option');
    option.value = video.path;
    option.textContent = video.name;
    refs.videoList.appendChild(option);
  });
}

async function refreshVideoList() {
  try {
    const videos = await listVideos();
    updateVideoSelect(videos);
  } catch (error) {
    console.error('[video] list load failed:', error);
    showStatus(refs, error.message, 'error');
  }
}

async function handleFileUpload(event) {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    refs.fileName.textContent = '';
    refs.videoUpload.value = '';
    showStatus(refs, '파일 크기가 너무 큽니다. 최대 500MB까지 업로드할 수 있습니다.', 'error');
    return;
  }

  refs.fileName.textContent = `업로드 중: ${file.name}`;
  showStatus(refs, '파일을 업로드하는 중입니다...', 'info');

  try {
    const result = await uploadVideo(file);
    refs.fileName.textContent = `업로드 완료: ${file.name}`;
    showStatus(refs, '파일이 성공적으로 업로드되었습니다', 'success');

    await refreshVideoList();
    refs.videoList.value = result.path;
  } catch (error) {
    refs.fileName.textContent = '';
    refs.videoUpload.value = '';
    showStatus(refs, `업로드 실패: ${error.message}`, 'error');
  }
}

function getSourceType() {
  const selected = document.querySelector('input[name="source"]:checked');
  return selected ? selected.value : 'file';
}

function buildStartConfig(sourceType) {
  if (sourceType === 'file') {
    const selectedVideoPath = refs.videoList.value;
    if (!selectedVideoPath) {
      showStatus(refs, '비디오 파일을 선택하거나 업로드해주세요', 'error');
      return null;
    }

    return {
      sourceType,
      filePath: selectedVideoPath,
    };
  }

  if (sourceType === 'http') {
    const url = refs.httpUrl.value.trim();
    if (!url) {
      showStatus(refs, 'HTTP 스트림 URL을 입력해주세요', 'error');
      return null;
    }

    return {
      sourceType,
      url,
    };
  }

  return {
    sourceType: 'webcam',
  };
}

function startStreaming() {
  if (!socket.isConnected()) {
    showStatus(refs, '서버에 연결되어 있지 않습니다. 잠시 후 다시 시도해주세요.', 'error');
    return;
  }

  const sourceType = getSourceType();
  const config = buildStartConfig(sourceType);
  if (!config) {
    return;
  }

  clearReconnectTimer();
  state.isStreaming = true;
  state.lastStartConfig = config;

  renderer.start();
  setStreamingButtons(refs, true);
  showStatus(refs, '스트리밍을 시작합니다...', 'info');

  socket.start(config);
}

function stopStreaming() {
  clearReconnectTimer();
  state.isStreaming = false;
  state.lastStartConfig = null;

  renderer.stop();
  setStreamingButtons(refs, false);

  socket.stop();
  showStatus(refs, '스트리밍 중지 요청을 전송했습니다', 'info');
}

function applyStreamStoppedStatus(message, type) {
  clearReconnectTimer();
  state.isStreaming = false;
  state.lastStartConfig = null;

  renderer.stop();
  setStreamingButtons(refs, false);
  showStatus(refs, message, type);
}

function handleSocketMessage(payload) {
  switch (payload.type) {
    case 'frame':
      renderer.enqueueFrame(payload.data, payload.timestamp);
      break;
    case 'started':
      showStatus(refs, `스트리밍 시작: ${payload.source}`, 'success');
      break;
    case 'stopped':
      applyStreamStoppedStatus('스트리밍이 중지되었습니다', 'info');
      break;
    case 'ended':
      applyStreamStoppedStatus('스트리밍이 종료되었습니다', 'info');
      break;
    case 'error':
      applyStreamStoppedStatus(`오류: ${payload.message}`, 'error');
      break;
    default:
      showStatus(refs, `알 수 없는 서버 이벤트: ${payload.type}`, 'error');
      break;
  }
}

init();
