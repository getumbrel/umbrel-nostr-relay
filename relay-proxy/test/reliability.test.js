import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { mkdtemp, mkdir, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import WebSocket, { WebSocketServer } from "ws";
import { generatePrivateKey, getPublicKey, getEventHash, getSignature } from "nostr-tools";
import ReconnectingSocket from "../ReconnectingSocket.js";
import RelayManager from "../RelayManager.js";

async function waitFor(check) {
  for (let n = 0; n < 200; n++) {
    if (await check()) return;
    await delay(10);
  }
  throw new Error("Timed out waiting for fixture");
}

async function server(t, options = {}) {
  const sockets = new WebSocketServer({ host: "127.0.0.1", port: 0, ...options });
  await once(sockets, "listening");
  t.after(async () => {
    for (const client of sockets.clients) client.terminate();
    await new Promise(resolve => sockets.close(resolve));
  });
  return sockets;
}

function signed(secret, kind, content, tags = [], created_at = 100) {
  const event = { pubkey: getPublicKey(secret), kind, content, tags, created_at };
  event.id = getEventHash(event);
  event.sig = getSignature(event, secret);
  return event;
}

test("repeated disconnects resubscribe without accumulating listeners; stop cancels retries", async t => {
  const sockets = await server(t);
  const requests = [];
  sockets.on("connection", socket => socket.on("message", data => requests.push(JSON.parse(data))));
  const connection = new ReconnectingSocket(`ws://127.0.0.1:${sockets.address().port}`, {
    retryDelay: 5, maxRetryDelay: 10,
    onOpen: socket => socket.send(["REQ", "backup", { authors: ["test"] }]),
  });
  t.after(() => connection.close());
  for (let n = 1; n <= 12; n++) {
    await waitFor(() => requests.length === n);
    assert.equal(connection.socket.listenerCount("error"), 1);
    assert.equal(connection.socket.listenerCount("message"), 1);
    for (const socket of sockets.clients) socket.terminate();
  }
  await waitFor(() => requests.length === 13);
  connection.close();
  await delay(50);
  assert.equal(requests.length, 13);
  assert.equal(connection.status, WebSocket.CLOSED);
});

test("pending handshakes can be cancelled without leaving a connection or retry behind", async t => {
  const http = createServer();
  let accepted = 0;
  const connections = new Set();
  http.on("connection", socket => {
    accepted++;
    connections.add(socket);
    socket.on("close", () => connections.delete(socket));
  });
  http.on("upgrade", () => {}); // Deliberately leave the handshake unanswered.
  http.listen(0, "127.0.0.1");
  await once(http, "listening");
  t.after(async () => {
    for (const socket of connections) socket.destroy();
    await new Promise(resolve => http.close(resolve));
  });
  const connection = new ReconnectingSocket(`ws://127.0.0.1:${http.address().port}`, { retryDelay: 5 });
  t.after(() => connection.close());
  await waitFor(() => accepted === 1);
  assert.equal(connection.status, WebSocket.CONNECTING);
  connection.close();
  await waitFor(() => connection.status === WebSocket.CLOSED);
  await delay(40);
  assert.equal(accepted, 1);
});

test("failed handshakes retry and recover", async t => {
  const http = createServer();
  const sockets = new WebSocketServer({ noServer: true });
  let attempts = 0;
  http.on("upgrade", (request, socket, head) => {
    if (++attempts < 4) socket.end("HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n");
    else sockets.handleUpgrade(request, socket, head, ws => sockets.emit("connection", ws));
  });
  http.listen(0, "127.0.0.1");
  await once(http, "listening");
  const connection = new ReconnectingSocket(`ws://127.0.0.1:${http.address().port}`, { retryDelay: 5, maxRetryDelay: 10 });
  t.after(async () => {
    connection.close();
    for (const socket of sockets.clients) socket.terminate();
    await new Promise(resolve => sockets.close(resolve));
    await new Promise(resolve => http.close(resolve));
  });
  await waitFor(() => connection.status === WebSocket.OPEN);
  assert.equal(attempts, 4);
});

test("relay discovery handles legacy lists, NIP-65, invalid events and local recovery", async t => {
  const cwd = process.cwd();
  const directory = await mkdtemp(join(tmpdir(), "nostr-discovery-test-"));
  process.chdir(directory);
  await mkdir("data");
  const made = [];
  const manager = new RelayManager({ createSocket: (url, options) => {
    const socket = { url, options, sent: [], status: 0, send(message) { this.sent.push(message); return true; }, close() { this.closed = true; } };
    made.push(socket);
    return socket;
  }});
  t.after(async () => {
    manager.close();
    process.chdir(cwd);
    await rm(directory, { recursive: true, force: true });
  });
  await delay(20); // Let the empty store discovery finish.
  const secret = generatePrivateKey();
  manager.pubkey = getPublicKey(secret);
  manager.seedRelays = ["wss://seed.test/"];
  manager.connectAndSubscribeToRelay("wss://seed.test");
  await t.test("default relay cleanup and empty contact lists do not throw", () => {
    assert.doesNotThrow(() => manager.removeOutdatedRelays());
    assert.ok(manager.relays["wss://seed.test/"]);
    for (const content of ["", "{", "null", "[]"]) manager.handleEvent(signed(secret, 3, content));
    assert.equal(manager.latestRelays, null);
    assert.equal(manager.localRelay.sent.filter(m => m[0] === "EVENT").length, 4);
    assert.equal(manager.getConnectionStatus().relayStates[0].readyState, 0);
  });
  await t.test("legacy relay lists work until NIP-65 is available", () => {
    manager.handleEvent(signed(secret, 3, JSON.stringify({ "wss://legacy.test": { write: true } })));
    assert.deepEqual(manager.desiredRelays(), ["wss://legacy.test/"]);
    manager.handleEvent(signed(secret, 10002, "", [
      ["r", "wss://write.test", "write"], ["r", "wss://both.test"],
      ["r", "wss://read.test", "read"], ["r", "ws://local.test"],
      ["r", "https://invalid.test"], ["r", "wss://write.test/"], ["r", "invalid"],
    ], 50));
    assert.deepEqual(manager.desiredRelays(), ["wss://write.test/", "wss://both.test/"]);
    manager.handleEvent(signed(secret, 3, '{"wss://legacy.test":{}}', [], 999));
    manager.handleEvent(signed(secret, 10002, "", [["r", "wss://stale.test"]], 49));
    assert.deepEqual(manager.desiredRelays(), ["wss://write.test/", "wss://both.test/"]);
    manager.removeOutdatedRelays();
    assert.deepEqual(Object.keys(manager.relays), ["wss://write.test/", "wss://both.test/"]);
    assert.ok(made.find(s => s.url === "wss://legacy.test/").closed);
  });
  await t.test("forged and unrelated events cannot change discovery or be backed up", () => {
    const count = manager.localRelay.sent.length;
    manager.handleEvent(signed(generatePrivateKey(), 10002, "", [["r", "wss://other.test"]], 9999));
    const forged = signed(secret, 10002, "", [["r", "wss://forged.test"]], 9999);
    forged.content = "tampered";
    manager.handleEvent(forged);
    const wrongId = signed(secret, 1, "wrong event id");
    wrongId.id = "0".repeat(64);
    manager.handleEvent(wrongId);
    assert.equal(manager.localRelay.sent.length, count);
    assert.deepEqual(manager.desiredRelays(), ["wss://write.test/", "wss://both.test/"]);
  });
  await t.test("local recovery reopens public subscriptions to recover missed history", () => {
    const old = Object.values(manager.relays);
    manager.localRelay.options.onOpen();
    assert.ok(old.every(socket => socket.closed));
    for (const socket of Object.values(manager.relays)) {
      socket.options.onOpen(socket);
      assert.deepEqual(socket.sent[0], ["REQ", "backup", { authors: [manager.pubkey] }]);
    }
    assert.deepEqual(manager.localRelay.sent.at(-1), ["REQ", "relay-metadata", { authors: [manager.pubkey], kinds: [3, 10002] }]);
  });
  await t.test("removing an identifier stops old callbacks and connections", async () => {
    const old = Object.values(manager.relays);
    await manager.removeIdentifier();
    const count = manager.localRelay.sent.length;
    old[0].options.onMessage(["EVENT", "backup", signed(secret, 1, "late event")]);
    assert.equal(manager.localRelay.sent.length, count);
    assert.ok(old.every(socket => socket.closed));
    assert.deepEqual(manager.getConnectionStatus().relayStates, []);
    assert.equal(manager.identifier, null);
  });
});

test("dashboard subscription reconnects and stops after disposal", async t => {
  // Test the browser helper with the real WebSocket protocol, without a DOM mock.
  let source;
  try { source = await readFile(new URL("../../ui/src/subscribeToRelay.js", import.meta.url), "utf8"); }
  catch (error) { if (error.code === "ENOENT") { t.skip("UI source is outside the proxy image"); return; } throw error; }
  const { subscribeToRelay } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  const sockets = await server(t);
  let received = 0;
  let opens = 0;
  let closes = 0;
  sockets.on("connection", socket => socket.on("message", () => socket.send('["EOSE","dashboard"]')));
  const stop = subscribeToRelay(`ws://127.0.0.1:${sockets.address().port}`, {
    WebSocketClass: WebSocket, retryDelay: 5, maxRetryDelay: 10,
    onOpen: socket => { opens++; socket.send('["REQ","dashboard",{"limit":3000}]'); },
    onMessage: () => received++, onClose: () => closes++,
  });
  t.after(stop);
  await waitFor(() => received === 1);
  for (const socket of sockets.clients) socket.terminate();
  await waitFor(() => received === 2);
  assert.equal(opens, 2);
  assert.equal(closes, 1);
  stop();
  await delay(40);
  assert.equal(opens, 2);
});


test("oversized relay messages are rejected and the connection recovers", async t => {
  const sockets = await server(t);
  let attempts = 0;
  let received = 0;
  sockets.on("connection", socket => {
    if (++attempts === 1) socket.send("x".repeat(1024 * 1024 + 1));
    else socket.send('["EOSE","backup"]');
  });
  const connection = new ReconnectingSocket(`ws://127.0.0.1:${sockets.address().port}`, {
    retryDelay: 5, onMessage: () => received++,
  });
  t.after(() => connection.close());
  await waitFor(() => received === 1);
  assert.equal(attempts, 2);
});
