import WebSocket from "ws";

// One socket and one retry timer per relay, including while a handshake is pending.
export default class ReconnectingSocket {
  constructor(url, { onOpen = () => {}, onMessage = () => {}, onClose = () => {}, retryDelay = 1000, maxRetryDelay = 60000, heartbeatInterval = 30000 } = {}) {
    Object.assign(this, { url, onOpen, onMessage, onClose, retryDelay, maxRetryDelay, heartbeatInterval });
    this.delay = retryDelay;
    this.stopped = false;
    this.connect();
  }

  get status() {
    return this.socket?.readyState ?? WebSocket.CLOSED;
  }

  connect() {
    if (this.stopped) return;
    const socket = this.socket = new WebSocket(this.url, { handshakeTimeout: 10000, maxPayload: 1024 * 1024 });
    socket.on("open", () => {
      if (this.stopped) return socket.terminate();
      this.delay = this.retryDelay;
      this.alive = true;
      this.heartbeat = setInterval(() => {
        if (!this.alive) return socket.terminate();
        this.alive = false;
        socket.ping();
      }, this.heartbeatInterval);
      this.onOpen(this);
    });
    socket.on("pong", () => { this.alive = true; });
    socket.on("message", data => {
      let message;
      try { message = JSON.parse(data.toString()); } catch { return; }
      if (!this.stopped && Array.isArray(message)) this.onMessage(message, this);
    });
    // ws emits close after an error, including failed handshakes. Retry in one place.
    socket.on("error", () => {});
    socket.on("close", () => {
      clearInterval(this.heartbeat);
      if (this.stopped) return;
      this.onClose(this);
      this.timer = setTimeout(() => this.connect(), this.delay);
      this.delay = Math.min(this.delay * 2, this.maxRetryDelay);
    });
  }

  send(message) {
    if (this.status !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify(message));
    return true;
  }

  close() {
    this.stopped = true;
    clearTimeout(this.timer);
    clearInterval(this.heartbeat);
    if (this.socket?.readyState !== WebSocket.CLOSED) this.socket?.terminate();
  }
}
