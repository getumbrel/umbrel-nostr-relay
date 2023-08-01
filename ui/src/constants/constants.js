export const PORT = window.location.port;
// export const PORT = 3000;
export const WEB_SOCKET_RELAY_URL = `${
  window.location.protocol === "https:" ? "wss:" : "ws:"
}//${window.location.hostname}:${PORT}`;
export const HTTP_RELAY_URL = `${window.location.protocol}//${window.location.hostname}:${PORT}`;
export const RELAY_PROXY_URL = `${window.location.protocol}//${window.location.hostname}:${PORT}/relay-proxy`;
