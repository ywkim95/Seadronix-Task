const fs = require('fs');
const path = require('path');

class VideoRepository {
  constructor({ videosDir, supportedExtensions }) {
    this.videosDir = videosDir;
    this.supportedExtensions = new Set(supportedExtensions.map((ext) => ext.toLowerCase()));
  }

  ensureDirectoryExists() {
    if (!fs.existsSync(this.videosDir)) {
      fs.mkdirSync(this.videosDir, { recursive: true });
    }
  }

  isSupportedExtension(fileName) {
    const extension = path.extname(fileName).toLowerCase();
    return this.supportedExtensions.has(extension);
  }

  listVideos() {
    this.ensureDirectoryExists();

    return fs
      .readdirSync(this.videosDir)
      .filter((fileName) => this.isSupportedExtension(fileName))
      .sort((a, b) => a.localeCompare(b))
      .map((fileName) => ({
        name: fileName,
        path: `/videos/${fileName}`,
      }));
  }

  resolveFromPublicPath(publicPath) {
    if (typeof publicPath !== 'string' || !publicPath.startsWith('/videos/')) {
      throw new Error('유효한 비디오 파일 경로가 아닙니다.');
    }

    const fileName = path.basename(publicPath);
    const resolvedPath = path.join(this.videosDir, fileName);

    if (path.dirname(resolvedPath) !== this.videosDir) {
      throw new Error('비디오 파일 경로가 안전하지 않습니다.');
    }

    return resolvedPath;
  }

  createStoredFilename(originalName) {
    const extension = path.extname(originalName).toLowerCase();

    if (!this.supportedExtensions.has(extension)) {
      throw new Error('지원하지 않는 파일 형식입니다.');
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`;
  }
}

module.exports = VideoRepository;
