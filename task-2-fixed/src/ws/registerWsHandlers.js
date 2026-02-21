function registerWsHandlers(wss, streamManager) {
  wss.on('connection', (ws) => {
    console.log('[ws] Client connected');

    ws.on('message', (rawMessage) => {
      let payload;

      try {
        payload = JSON.parse(rawMessage);
      } catch (error) {
        streamManager.send(ws, {
          type: 'error',
          message: '요청 본문(JSON) 형식이 올바르지 않습니다.',
        });
        return;
      }

      if (payload.type === 'start') {
        streamManager.start(ws, payload);
        return;
      }

      if (payload.type === 'stop') {
        streamManager.stop();
        streamManager.send(ws, { type: 'stopped' });
        return;
      }

      streamManager.send(ws, {
        type: 'error',
        message: `지원하지 않는 메시지 타입입니다: ${payload.type}`,
      });
    });

    ws.on('close', () => {
      console.log('[ws] Client disconnected');
      streamManager.stop();
    });
  });
}

module.exports = registerWsHandlers;
