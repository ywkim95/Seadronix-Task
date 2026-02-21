export class StreamingSocket {
  constructor({ onOpen, onClose, onError, onMessage }) {
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.onError = onError;
    this.onMessage = onMessage;
    this.ws = null;
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      if (this.onOpen) {
        this.onOpen();
      }
    };

    this.ws.onclose = () => {
      if (this.onClose) {
        this.onClose();
      }
    };

    this.ws.onerror = (error) => {
      if (this.onError) {
        this.onError(error);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (this.onMessage) {
          this.onMessage(payload);
        }
      } catch (error) {
        if (this.onError) {
          this.onError(error);
        }
      }
    };
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  send(payload) {
    if (!this.isConnected()) {
      return false;
    }

    this.ws.send(JSON.stringify(payload));
    return true;
  }

  start(config) {
    return this.send({ type: 'start', ...config });
  }

  stop() {
    return this.send({ type: 'stop' });
  }
}
