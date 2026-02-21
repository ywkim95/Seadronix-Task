const multer = require('multer');

function registerVideoRoutes(app, { upload, videoRepository }) {
  app.get('/api/videos', (req, res, next) => {
    try {
      const videos = videoRepository.listVideos();
      res.json(videos);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/upload', (req, res) => {
    upload.single('video')(req, res, (error) => {
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({
            error: '파일 크기가 너무 큽니다. 최대 500MB까지 업로드할 수 있습니다.',
          });
          return;
        }

        res.status(400).json({ error: `업로드 오류: ${error.message}` });
        return;
      }

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: '파일이 선택되지 않았습니다.' });
        return;
      }

      res.json({
        message: 'File uploaded successfully',
        filename: req.file.filename,
        path: `/videos/${req.file.filename}`,
      });
    });
  });
}

module.exports = registerVideoRoutes;
