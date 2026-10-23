// Restore the subscription after relay restarts or a temporary network interruption.
export function subscribeToRelay(
  url,
  {
    onOpen,
    onMessage,
    onClose,
    retryDelay = 1000,
    maxRetryDelay = 30000,
    WebSocketClass = WebSocket,
  },
) {
  let stopped = false;
  let socket;
  let retryTimer;
  let handshakeTimer;
  let delay = retryDelay;

  function connect() {
    if (stopped) return;
    socket = new WebSocketClass(url);
    const current = socket;
    handshakeTimer = setTimeout(() => current.close(), 10000);
    current.onopen = () => {
      clearTimeout(handshakeTimer);
      if (stopped) return current.close();
      delay = retryDelay;
      onOpen(current);
    };
    current.onmessage = (message) => {
      if (stopped) return;
      let data;
      try {
        data = JSON.parse(message.data);
      } catch {
        return;
      }
      if (Array.isArray(data)) onMessage(data);
    };
    current.onerror = () => current.close();
    current.onclose = () => {
      clearTimeout(handshakeTimer);
      if (stopped) return;
      onClose();
      retryTimer = setTimeout(connect, delay);
      delay = Math.min(delay * 2, maxRetryDelay);
    };
  }
  connect();
  return () => {
    stopped = true;
    clearTimeout(retryTimer);
    clearTimeout(handshakeTimer);
    socket.close();
  };
}
