# 영상 스트리밍 시스템 - SEADRONIX 과제 2

실시간 영상 스트리밍을 지원하는 웹 애플리케이션입니다. FFmpeg를 활용하여 다양한 소스(로컬 파일, HTTP 스트림, 웹캠)로부터 영상을 스트리밍하고, 실시간 프레임 표시 및 성능 지표를 측정합니다.

## 주요 기능

### 1. 영상 스트리밍 기능 (로컬 파일)
- **다양한 비디오 포맷 지원**: MP4, AVI, MOV, MKV, WebM
- **파일 업로드**: 최대 500MB까지 업로드 가능
- **자동 목록 관리**: 업로드된 파일 자동 선택 및 재사용
- **무한 루프 재생**: `-stream_loop` 옵션으로 연속 재생

### 2. HTTP 스트리밍
- **HLS 지원**: `.m3u8` 형식의 라이브 스트림
- **일반 비디오**: MP4, WebM 등 HTTP를 통한 비디오 재생
- **실시간 스트림**: HTTP 기반 라이브 스트리밍

### 3. 웹캠 스트리밍 (FFmpeg 활용)
- **자동 카메라 감지**: 시스템에 연결된 모든 카메라 자동 검색
- **우선순위 설정**: 내장 카메라 우선, 없으면 외부 USB 웹캠 사용
- **크로스 플랫폼**: Windows (DirectShow), macOS (AVFoundation), Linux (V4L2) 지원
- **실시간 스트리밍**: 웹캠을 통한 라이브 영상 전송

### 4. 실시간 성능 모니터링
- **FPS (Frames Per Second)**: 실시간 프레임 레이트 측정
- **지연시간 (Latency)**: 네트워크 지연 시간 측정 (이동 평균)
- **해상도 (Resolution)**: 실시간 영상 해상도 표시
- **수신 프레임 수**: 총 전송된 프레임 카운트

## 기술 스택

### 백엔드
- **Node.js**: 서버 런타임
- **Express**: HTTP 서버 프레임워크 (타임아웃 10분)
- **WebSocket (ws)**: 실시간 양방향 통신
- **child_process**: FFmpeg 프로세스 직접 제어
- **Multer**: 파일 업로드 처리 (500MB 제한)

### 프론트엔드
- **Vanilla JavaScript**: 프레임워크 없는 순수 JavaScript
- **HTML5 Canvas**: 비디오 프레임 렌더링
- **WebSocket API**: 서버와 실시간 통신
- **CSS3**: 반응형 UI 디자인

### FFmpeg
- **비디오 디코딩**: 다양한 입력 소스 처리
- **MJPEG 인코딩**: 실시간 프레임 추출
- **해상도 조정**: 자동 다운스케일 (최대 960px)
- **프레임 레이트 제어**: 25 FPS 출력

## 설치 및 실행

### 1. 필수 요구사항

#### Node.js 설치
- Node.js 14.x 이상 필요
- [Node.js 다운로드](https://nodejs.org/)

#### FFmpeg 설치

**Windows:**
```bash
# Chocolatey 사용
choco install ffmpeg

# 또는 직접 다운로드
# https://ffmpeg.org/download.html 에서 다운로드 후 PATH 추가
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install ffmpeg
```

**설치 확인:**
```bash
ffmpeg -version
```

### 2. 프로젝트 설치

```bash
# 의존성 설치
npm install
```

### 3. 서버 실행

```bash
# 프로덕션 모드
npm start

# 개발 모드 (파일 변경 시 자동 재시작)
npm run dev
```

서버가 시작되면 브라우저에서 다음 주소로 접속:
```
http://localhost:3000
```

## 사용 방법

### 1. 로컬 비디오 파일 스트리밍

1. **"1. 영상 스트리밍 기능"** 옵션 선택
2. "비디오 파일 선택" 버튼 클릭하여 파일 업로드
   - 지원 형식: MP4, AVI, MOV, MKV, WebM
   - 최대 크기: 500MB
3. 또는 드롭다운에서 기존 업로드된 파일 선택
4. "스트리밍 시작" 버튼 클릭
5. 영상이 무한 루프로 재생됩니다

### 2. HTTP 스트리밍

1. **"2. HTTP 스트리밍"** 옵션 선택
2. HTTP 스트림 URL 입력
3. "스트리밍 시작" 버튼 클릭

**테스트용 공개 HTTP 스트림 예시:**

HLS (라이브 스트림):
```
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8
https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8
```

일반 비디오:
```
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4
```

### 3. 웹캠 스트리밍

1. **"3. FFmpeg 활용"** 옵션 선택
2. "스트리밍 시작" 버튼 클릭
3. 시스템이 자동으로 카메라를 감지합니다:
   - 내장 카메라가 있으면 우선 사용
   - 없으면 USB 웹캠 등 첫 번째 카메라 사용
4. 서버 로그에서 선택된 카메라 확인 가능

**웹캠 자동 감지 로그 예시:**
```
Detecting available webcam...
Found video device: HD Pro Webcam C920
Using first available camera: HD Pro Webcam C920
```

## 프로젝트 구조

```
task-2/
├── server.js              # Node.js 백엔드 서버
│   ├── 웹캠 자동 감지 함수
│   ├── FFmpeg 프로세스 관리
│   ├── WebSocket 버퍼 관리
│   └── 파일 업로드 처리
├── package.json           # 프로젝트 설정 및 의존성
├── public/                # 프론트엔드 정적 파일
│   ├── index.html        # 메인 페이지
│   ├── styles.css        # 스타일시트
│   └── app.js            # 클라이언트 로직
│       ├── WebSocket 연결 관리
│       ├── 프레임 큐 시스템
│       ├── FPS 제한 (30 FPS)
│       └── 통계 계산
├── videos/               # 업로드된 비디오 저장 폴더
└── README.md             # 이 파일
```

## 아키텍처

### 시스템 흐름

```
[비디오 소스] → [FFmpeg] → [프레임 추출] → [MJPEG 인코딩]
                                                  ↓
                                         [Base64 인코딩]
                                                  ↓
                                    [WebSocket 버퍼 체크]
                                          (100KB 제한)
                                                  ↓
[브라우저] ← [WebSocket] ← [프레임 전송] ← [서버]
     ↓
[프레임 큐] → [속도 제한] → [Canvas 렌더링] → [통계 계산]
  (최신만)     (30 FPS)
```

### 주요 컴포넌트

#### 1. 서버 (server.js)

**FFmpeg 프로세스 관리:**
- 다양한 입력 소스 처리 (파일, HTTP, 웹캠)
- 실시간 속도 제어 (`-re` 옵션)
- 해상도 자동 조정 (최대 960px)
- MJPEG 인코딩 (품질 10, 25 FPS)

**WebSocket 버퍼 관리:**
- 전송 큐 크기 모니터링 (`ws.bufferedAmount`)
- 100KB 초과 시 프레임 드롭
- 드롭된 프레임 수 로깅

**웹캠 자동 감지:**
- Windows: DirectShow 디바이스 목록 조회
- macOS: AVFoundation 디바이스 조회
- Linux: /dev/video* 디바이스 검색
- 내장 카메라 우선순위

#### 2. 클라이언트 (app.js)

**프레임 큐 관리:**
- 최신 프레임만 유지 (이전 대기 프레임 자동 버림)
- 동시 렌더링 방지 (`isRendering` 플래그)
- `requestAnimationFrame`으로 부드러운 렌더링

**속도 제한:**
- 최소 프레임 간격: 33ms (30 FPS)
- 렌더링 타이밍 제어
- 빠른 재생 방지

**지연 시간 측정:**
- 수신 시점의 타임스탬프 저장
- 네트워크 지연만 측정 (렌더링 대기 시간 제외)
- 이동 평균 (최근 30 프레임)

#### 3. FFmpeg 처리

**입력 소스별 설정:**

로컬 파일:
```bash
ffmpeg -re -stream_loop -1 -i video.mp4 \
  -vf scale='min(960,iw)':-2 \
  -f image2pipe -vcodec mjpeg -q:v 10 -r 25 -
```

HTTP 스트림:
```bash
ffmpeg -re -i https://example.com/stream.m3u8 \
  -vf scale='min(960,iw)':-2 \
  -f image2pipe -vcodec mjpeg -q:v 10 -r 25 -
```

웹캠:
```bash
# Windows
ffmpeg -f dshow -i video="HD Pro Webcam C920" \
  -vf scale='min(960,iw)':-2 \
  -f image2pipe -vcodec mjpeg -q:v 10 -r 25 -
```

## 성능 최적화

### 서버 측
- **WebSocket 버퍼 관리**: 100KB 제한으로 메모리 오버플로우 방지
- **프레임 드롭**: 네트워크 혼잡 시 자동 프레임 스킵
- **FFmpeg 최적화**: 해상도/품질 자동 조정으로 대역폭 절감
- **타임아웃 설정**: 큰 파일 업로드를 위한 10분 타임아웃

### 클라이언트 측
- **프레임 큐 시스템**: 최신 프레임만 유지하여 메모리 절약
- **FPS 제한**: 30 FPS로 제한하여 CPU 사용량 감소
- **지연 시간 최적화**: 수신 시점 타임스탬프로 정확한 측정
- **렌더링 최적화**: `requestAnimationFrame` 사용

### 네트워크 최적화
- **해상도 다운스케일**: 최대 960px (약 70% 대역폭 절감)
- **MJPEG 품질 조정**: q:v 10 (적절한 품질/크기 균형)
- **프레임 레이트 제한**: 25 FPS (충분한 품질 유지)

## 테스트용 리소스

### HTTP 스트림 URL
**MP4 (온디맨드):**
```
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4
```

## 개발자 정보

- **과제**: SEADRONIX 입사 과제 2
- **목적**: 영상 스트리밍 기능을 수행하는 최소 지원 사이트 설계
- **주요 구현 사항**:
  1. 영상 스트리밍 기능 (로컬 파일 업로드 및 재생)
  2. HTTP 스트리밍 데이터 표시
  3. FFmpeg 활용 (웹캠 자동 감지)

## 기술적 하이라이트

### 1. 웹캠 자동 감지
- 크로스 플랫폼 디바이스 감지
- 내장 카메라 우선순위 알고리즘
- 에러 핸들링 및 폴백 메커니즘

### 2. 프레임 큐 관리
- 메모리 효율적인 최신 프레임 유지
- 렌더링 속도 제한 (30 FPS)
- `requestAnimationFrame` 활용

### 3. WebSocket 버퍼 관리
- `bufferedAmount` 모니터링
- 동적 프레임 드롭
- 네트워크 혼잡 제어

### 4. 정확한 지연 시간 측정
- 수신 시점 타임스탬프 캡처
- 렌더링 대기 시간 제외
- 이동 평균으로 안정화

## 참고 자료

- [FFmpeg 공식 문서](https://ffmpeg.org/documentation.html)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [HTML5 Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Node.js child_process](https://nodejs.org/api/child_process.html)
- [DirectShow (Windows)](https://learn.microsoft.com/en-us/windows/win32/directshow/directshow)
- [AVFoundation (macOS)](https://developer.apple.com/av-foundation/)