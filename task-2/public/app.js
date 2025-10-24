// WebSocket 연결
let ws = null;
let isStreaming = false;
let isFirstFrame = true;

// 통계 변수
let frameCount = 0;
let fpsCounter = 0;
let lastFpsUpdate = Date.now();
let latencies = [];
const MAX_LATENCY_SAMPLES = 30;

// 프레임 큐 관리
let pendingFrame = null;
let isRendering = false;
let lastRenderTime = 0;
const MIN_FRAME_INTERVAL = 1000 / 30; // 30 FPS (33ms per frame)

// DOM 요소
const canvas = document.getElementById('video-canvas');
const ctx = canvas.getContext('2d');
const noStream = document.getElementById('no-stream');
const statusDiv = document.getElementById('status');

const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');

const fileSourceRadio = document.getElementById('file-source');
const httpSourceRadio = document.getElementById('http-source');
const webcamSourceRadio = document.getElementById('webcam-source');

const fileConfig = document.getElementById('file-config');
const httpConfig = document.getElementById('http-config');
const webcamConfig = document.getElementById('webcam-config');

const videoUpload = document.getElementById('video-upload');
const fileName = document.getElementById('file-name');
const videoList = document.getElementById('video-list');
const httpUrl = document.getElementById('http-url');

// 이벤트 리스너
fileSourceRadio.addEventListener('change', () => showConfig('file'));
httpSourceRadio.addEventListener('change', () => showConfig('http'));
webcamSourceRadio.addEventListener('change', () => showConfig('webcam'));

videoUpload.addEventListener('change', handleFileUpload);
startBtn.addEventListener('click', startStreaming);
stopBtn.addEventListener('click', stopStreaming);

// 초기화
init();

function init() {
    loadVideoList();
    connectWebSocket();
}

// WebSocket 연결
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('WebSocket connected');
        showStatus('서버에 연결되었습니다', 'success');
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        // console.log('WebSocket message received:', data.type);
        handleWebSocketMessage(data);
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        showStatus('WebSocket 연결 오류가 발생했습니다', 'error');
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        if (isStreaming) {
            showStatus('서버와의 연결이 끊어졌습니다. 재연결 시도 중...', 'error');
            setTimeout(connectWebSocket, 3000);
        }
    };
}

// WebSocket 메시지 처리
function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'frame':
            // console.log('Calling renderFrame, isStreaming:', isStreaming);
            renderFrame(data.data, data.timestamp);
            break;
        case 'started':
            showStatus(`스트리밍 시작: ${data.source}`, 'success');
            break;
        case 'stopped':
            showStatus('스트리밍이 중지되었습니다', 'info');
            resetStream();
            break;
        case 'ended':
            showStatus('스트리밍이 종료되었습니다', 'info');
            resetStream();
            break;
        case 'error':
            showStatus(`오류: ${data.message}`, 'error');
            resetStream();
            break;
    }
}

// 프레임 렌더링
function renderFrame(base64Data, timestamp) {
    // 스트리밍이 중지된 경우 프레임 무시
    if (!isStreaming) {
        return;
    }

    // 수신 시점의 클라이언트 타임스탬프 저장 (지연 시간 계산용)
    const receivedAt = Date.now();
    const latency = receivedAt - timestamp;

    // 최신 프레임만 저장 (이전 대기 중인 프레임은 버림)
    pendingFrame = { base64Data, timestamp, receivedAt, latency };

    // 현재 렌더링 중이 아니면 즉시 렌더링 시작
    if (!isRendering) {
        processNextFrame();
    }
}

// 다음 프레임 처리
function processNextFrame() {
    if (!pendingFrame || !isStreaming) {
        isRendering = false;
        return;
    }

    // 프레임 속도 제한 (최소 간격 체크)
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime;

    if (timeSinceLastRender < MIN_FRAME_INTERVAL) {
        // 아직 충분한 시간이 지나지 않았으면 다음 프레임으로 스킵
        const waitTime = MIN_FRAME_INTERVAL - timeSinceLastRender;
        setTimeout(processNextFrame, waitTime);
        return;
    }

    isRendering = true;
    lastRenderTime = now;
    const { base64Data, timestamp, receivedAt, latency } = pendingFrame;
    pendingFrame = null;

    const img = new Image();

    img.onload = () => {
        // 이미지 로드 중에 스트리밍이 중지된 경우
        if (!isStreaming) {
            isRendering = false;
            return;
        }

        // Canvas 크기 설정 (첫 프레임 또는 기본 크기일 때)
        if (isFirstFrame || canvas.width === 0 || canvas.height === 0 || canvas.width === 300) {
            canvas.width = img.width;
            canvas.height = img.height;
            updateResolution(img.width, img.height);
            isFirstFrame = false;
        }

        // 이미지 그리기
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // 통계 업데이트 (수신 시점의 지연 시간 사용)
        updateStats(timestamp, latency);

        // Canvas 표시
        const computedDisplay = window.getComputedStyle(canvas).display;
        if (computedDisplay === 'none') {
            canvas.style.display = 'block';
            noStream.style.display = 'none';
        }

        // 다음 프레임 처리 (requestAnimationFrame으로 부드럽게)
        isRendering = false;
        if (pendingFrame) {
            requestAnimationFrame(processNextFrame);
        }
    };

    img.onerror = (error) => {
        console.error('Image loading failed:', error);
        isRendering = false;
        // 다음 프레임으로 진행
        if (pendingFrame) {
            processNextFrame();
        }
    };

    img.src = 'data:image/jpeg;base64,' + base64Data;
}

// 통계 업데이트
function updateStats(serverTimestamp, latency) {
    frameCount++;
    fpsCounter++;

    // 지연시간 저장 (수신 시점의 지연시간 사용)
    latencies.push(latency);

    if (latencies.length > MAX_LATENCY_SAMPLES) {
        latencies.shift();
    }

    // 평균 지연시간
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    document.getElementById('real-latency').textContent = `${Math.round(avgLatency)} ms`;

    // FPS 계산 (1초마다)
    const now = Date.now();
    const elapsed = now - lastFpsUpdate;

    if (elapsed >= 1000) {
        const fps = Math.round((fpsCounter * 1000) / elapsed);
        document.getElementById('real-fps').textContent = fps;
        fpsCounter = 0;
        lastFpsUpdate = now;
    }

    // 총 프레임 수
    document.getElementById('real-frames').textContent = frameCount;
}

// 해상도 업데이트
function updateResolution(width, height) {
    document.getElementById('real-resolution').textContent = `${width} x ${height}`;
}

// 설정 표시
function showConfig(type) {
    fileConfig.style.display = 'none';
    httpConfig.style.display = 'none';
    webcamConfig.style.display = 'none';

    if (type === 'file') {
        fileConfig.style.display = 'block';
    } else if (type === 'http') {
        httpConfig.style.display = 'block';
    } else if (type === 'webcam') {
        webcamConfig.style.display = 'block';
    }
}

// 파일 업로드
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 파일 크기 체크 (클라이언트 측에서 먼저 확인)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
        fileName.textContent = '';
        showStatus('파일 크기가 너무 큽니다. 최대 500MB까지 업로드할 수 있습니다.', 'error');
        videoUpload.value = ''; // 파일 선택 초기화
        return;
    }

    fileName.textContent = `업로드 중: ${file.name}`;
    showStatus('파일을 업로드하는 중입니다...', 'info');

    const formData = new FormData();
    formData.append('video', file);

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        // 응답 텍스트를 먼저 읽기
        const responseText = await response.text();

        // JSON 파싱 시도
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            console.error('JSON parsing error:', e);
            console.error('Response text:', responseText);
            throw new Error('서버 응답을 처리할 수 없습니다. 서버 로그를 확인해주세요.');
        }

        if (response.ok) {
            fileName.textContent = `업로드 완료: ${file.name}`;
            showStatus('파일이 성공적으로 업로드되었습니다', 'success');

            // 비디오 목록 새로고침
            await loadVideoList();

            // 업로드한 파일 자동 선택
            videoList.value = result.path;
        } else {
            fileName.textContent = '';
            showStatus(`업로드 실패: ${result.error || '알 수 없는 오류'}`, 'error');
            videoUpload.value = ''; // 파일 선택 초기화
        }
    } catch (error) {
        console.error('Upload error:', error);
        fileName.textContent = '';
        showStatus(`업로드 오류: ${error.message}`, 'error');
        videoUpload.value = ''; // 파일 선택 초기화
    }
}

// 비디오 목록 로드
async function loadVideoList() {
    try {
        const response = await fetch('/api/videos');
        const videos = await response.json();

        videoList.innerHTML = '<option value="">기존 비디오 선택...</option>';

        videos.forEach(video => {
            const option = document.createElement('option');
            option.value = video.path;
            option.textContent = video.name;
            videoList.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading video list:', error);
    }
}

// 스트리밍 시작
function startStreaming() {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        showStatus('서버에 연결되어 있지 않습니다', 'error');
        return;
    }

    const sourceType = document.querySelector('input[name="source"]:checked').value;
    let config = {
        type: 'start',
        sourceType: sourceType
    };

    // 소스별 설정
    if (sourceType === 'file') {
        const selectedVideo = videoList.value;
        if (!selectedVideo) {
            showStatus('비디오 파일을 선택하거나 업로드해주세요', 'error');
            return;
        }
        config.filePath = selectedVideo;
    } else if (sourceType === 'http') {
        const url = httpUrl.value.trim();
        if (!url) {
            showStatus('HTTP 스트림 URL을 입력해주세요', 'error');
            return;
        }
        config.url = url;
    }

    // 상태 초기화
    frameCount = 0;
    fpsCounter = 0;
    latencies = [];
    lastFpsUpdate = Date.now();
    lastRenderTime = 0;
    isFirstFrame = true;

    // UI 업데이트 (서버에 요청 보내기 전에 설정)
    isStreaming = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    showStatus('스트리밍을 시작합니다...', 'info');

    // 서버에 스트리밍 시작 요청 전송
    ws.send(JSON.stringify(config));
}

// 스트리밍 중지
function stopStreaming() {
    // 즉시 플래그를 false로 설정하여 새로운 프레임 무시
    isStreaming = false;

    // 서버에 중지 요청 전송
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'stop' }));
    }

    // UI 리셋
    resetStream();
}

// 스트림 리셋
function resetStream() {
    isStreaming = false;
    isFirstFrame = true;
    isRendering = false;
    pendingFrame = null;
    lastRenderTime = 0;
    startBtn.disabled = false;
    stopBtn.disabled = true;

    // Canvas 숨기기
    canvas.style.display = 'none';
    noStream.style.display = 'block';

    // Canvas 초기화
    canvas.width = 0;
    canvas.height = 0;

    // 통계 리셋
    document.getElementById('real-fps').textContent = '0';
    document.getElementById('real-latency').textContent = '0 ms';
    document.getElementById('real-resolution').textContent = '-';
    document.getElementById('real-frames').textContent = '0';
}

// 상태 메시지 표시
function showStatus(message, type = 'info') {
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
    statusDiv.style.display = 'block';

    // 5초 후 자동 숨김 (에러나 성공 메시지만)
    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            if (statusDiv.textContent === message) {
                statusDiv.style.display = 'none';
            }
        }, 5000);
    }
}
