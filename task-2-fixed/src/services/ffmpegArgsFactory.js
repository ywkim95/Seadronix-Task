const fs = require('fs');
const { detectWebcamSource } = require('./webcamDetector');

const DEFAULT_OUTPUT_ARGS = [
  '-vf',
  "scale='min(960,iw)':-2",
  '-f',
  'image2pipe',
  '-vcodec',
  'mjpeg',
  '-q:v',
  '10',
  '-r',
  '25',
  '-',
];

function validateHttpUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

function buildWebcamArgs(platform, source) {
  if (platform === 'win32') {
    return ['-f', 'dshow', '-i', source, ...DEFAULT_OUTPUT_ARGS];
  }

  if (platform === 'darwin') {
    return ['-f', 'avfoundation', '-i', source, ...DEFAULT_OUTPUT_ARGS];
  }

  return ['-f', 'v4l2', '-i', source, ...DEFAULT_OUTPUT_ARGS];
}

function buildFileCommand({ filePath, videoRepository }) {
  const resolvedPath = videoRepository.resolveFromPublicPath(filePath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`파일을 찾을 수 없습니다: ${filePath}`);
  }

  return {
    inputSource: resolvedPath,
    args: ['-re', '-stream_loop', '-1', '-i', resolvedPath, ...DEFAULT_OUTPUT_ARGS],
  };
}

function buildHttpCommand({ url }) {
  if (!validateHttpUrl(url)) {
    throw new Error('유효한 HTTP/HTTPS 스트림 URL을 입력해주세요.');
  }

  return {
    inputSource: url,
    args: ['-re', '-i', url, ...DEFAULT_OUTPUT_ARGS],
  };
}

function buildWebcamCommand({ platform }) {
  const source = detectWebcamSource(platform);

  return {
    inputSource: source,
    args: buildWebcamArgs(platform, source),
  };
}

function buildFfmpegCommand({ sourceType, url, filePath, videoRepository, platform = process.platform }) {
  if (sourceType === 'file') {
    return buildFileCommand({ filePath, videoRepository });
  }

  if (sourceType === 'http') {
    return buildHttpCommand({ url });
  }

  if (sourceType === 'webcam') {
    return buildWebcamCommand({ platform });
  }

  throw new Error('지원하지 않는 스트리밍 소스 타입입니다.');
}

module.exports = {
  buildFfmpegCommand,
};
