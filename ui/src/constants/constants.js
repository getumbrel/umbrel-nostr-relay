const PORT = window.location.port || (window.location.protocol === 'https:' ? 443 : 80);

export const HTTP_RELAY_URL = `${window.location.protocol}//${window.location.host}`;
export const RELAY_PROXY_URL = `${HTTP_RELAY_URL}/relay-proxy`;
export const WEB_SOCKET_RELAY_URL = HTTP_RELAY_URL.replace(/^http/, 'ws');
