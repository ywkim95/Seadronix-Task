const multer = require('multer');

function createUploadMiddleware({ videoRepository, maxUploadSizeBytes }) {
  const storage = multer.diskStorage({
    destination(req, file, callback) {
      videoRepository.ensureDirectoryExists();
      callback(null, videoRepository.videosDir);
    },
    filename(req, file, callback) {
      try {
        const filename = videoRepository.createStoredFilename(file.originalname);
        callback(null, filename);
      } catch (error) {
        callback(error);
      }
    },
  });

  return multer({
    storage,
    limits: {
      fileSize: maxUploadSizeBytes,
    },
    fileFilter(req, file, callback) {
      if (videoRepository.isSupportedExtension(file.originalname)) {
        callback(null, true);
        return;
      }

      callback(new Error('지원하지 않는 파일 형식입니다. MP4, AVI, MOV, MKV, WEBM 파일만 업로드할 수 있습니다.'));
    },
  });
}

module.exports = {
  createUploadMiddleware,
};
