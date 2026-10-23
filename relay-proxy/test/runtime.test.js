import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { brotliCompressSync } from "node:zlib";
import test from "node:test";
import { WebSocketServer } from "ws";

async function waitFor(check) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (check()) return;
    await delay(20);
  }
  throw new Error("Timed out waiting for the local relay fixture");
}

test("identifier storage and relay synchronization work on the supported Node runtime", async (t) => {
  const originalDirectory = process.cwd();
  const directory = await mkdtemp(join(tmpdir(), "nostr-runtime-test-"));
  const originalFetch = globalThis.fetch;
  const originalHost = process.env.RELAY_HOST;
  const originalPort = process.env.RELAY_PORT;
  const sockets = new WebSocketServer({ host: "127.0.0.1", port: 0 });
  const requests = [];
  const published = [];
  let malformedResponse = false;
  let profile;
  let event;
  let manager;

  const http = createServer((request, response) => {
    requests.push(new URL(request.url, "http://fixture"));
    response.writeHead(200, { "content-type": "application/json", "content-encoding": "br" });
    response.end(malformedResponse ? Buffer.from("invalid brotli") : brotliCompressSync(JSON.stringify(profile)));
  });

  t.after(async () => {
    manager?.close();
    for (const client of sockets.clients) client.terminate();
    await new Promise(resolve => sockets.close(resolve));
    http.closeAllConnections();
    await new Promise(resolve => http.close(resolve));
    globalThis.fetch = originalFetch;
    if (originalHost === undefined) delete process.env.RELAY_HOST;
    else process.env.RELAY_HOST = originalHost;
    if (originalPort === undefined) delete process.env.RELAY_PORT;
    else process.env.RELAY_PORT = originalPort;
    process.chdir(originalDirectory);
    await rm(directory, { recursive: true, force: true });
  });

  await once(sockets, "listening");
  http.listen(0, "127.0.0.1");
  await once(http, "listening");
  process.chdir(directory);
  await mkdir("data");
  process.env.RELAY_HOST = "127.0.0.1";
  process.env.RELAY_PORT = String(sockets.address().port);

  // Keep NIP-05 requests local while exercising Node's real HTTP/Brotli decoder.
  globalThis.fetch = (input, options) => {
    const url = new URL(input);
    assert.equal(url.origin, "https://nip05.test");
    return originalFetch(`http://127.0.0.1:${http.address().port}${url.pathname}${url.search}`, options);
  };

  const nostr = await import("nostr-tools");
  const helpers = await import("../helpers.js");
  const { default: RelayManager } = await import("../RelayManager.js");
  const secret = nostr.generatePrivateKey();
  const pubkey = nostr.getPublicKey(secret);
  profile = { names: { alice: pubkey, _: pubkey }, relays: { [pubkey]: ["wss://relay.test"] } };
  event = { kind: 1, created_at: Math.floor(Date.now() / 1000), tags: [], content: "Local runtime migration test", pubkey };
  event.id = nostr.getEventHash(event);
  event.sig = nostr.getSignature(event, secret);

  sockets.on("connection", socket => socket.on("message", message => {
    const [type, value] = JSON.parse(message.toString());
    if (type === "REQ") {
      socket.send(JSON.stringify(["EVENT", value, event]));
      socket.send(JSON.stringify(["EOSE", value]));
    } else if (type === "EVENT") {
      published.push(value);
      socket.send(JSON.stringify(["OK", value.id, true, ""]));
    }
  }));

  await t.test("NIP-05 accepts a Brotli response and preserves the configured identifier", async () => {
    await helpers.writeIdentifierToFile("alice@nip05.test");
    assert.deepEqual(await helpers.readIdentifierFromFile(), { identifier: "alice@nip05.test" });
    assert.deepEqual(await helpers.getPublicKeyAndRelaysFromIdentifier("alice@nip05.test"), {
      pubkey, relays: ["wss://relay.test"],
    });
    assert.equal(requests[0].pathname, "/.well-known/nostr.json");
    assert.equal(requests[0].searchParams.get("name"), "alice");
    await assert.rejects(helpers.writeIdentifierToFile("alice@nip05.test"), /already set/);
    await helpers.deleteStoreFile();
    await helpers.writeIdentifierToFile("@nip05.test");
    assert.equal(requests.at(-1).searchParams.get("name"), "_");
    await helpers.deleteStoreFile();
  });

  await t.test("invalid compressed NIP-05 data is rejected without saving an identifier", async () => {
    malformedResponse = true;
    await assert.rejects(helpers.writeIdentifierToFile("alice@nip05.test"), /Invalid NIP-05/);
    assert.equal(await helpers.readIdentifierFromFile(), undefined);
    malformedResponse = false;
  });

  await t.test("npub validation and storage remain compatible", async () => {
    const npub = nostr.nip19.npubEncode(pubkey);
    await helpers.writeIdentifierToFile(npub);
    assert.deepEqual(await helpers.readIdentifierFromFile(), { identifier: npub });
    assert.equal((await helpers.getPublicKeyAndRelaysFromIdentifier(npub)).pubkey, pubkey);
    await helpers.deleteStoreFile();
    await assert.rejects(helpers.writeIdentifierToFile("npub-invalid"), /Invalid npub/);
  });

  await t.test("the proxy subscribes and forwards signed events", async () => {
    const { default: ReconnectingSocket } = await import("../ReconnectingSocket.js");
    manager = new RelayManager({
      createSocket: (url, options) => new ReconnectingSocket(`ws://127.0.0.1:${sockets.address().port}`, options),
    });
    await waitFor(() => manager.localRelay?.status === 1);
    manager.pubkey = pubkey;
    manager.connectAndSubscribeToRelay("wss://relay.test");
    await waitFor(() => published.some(received => received.id === event.id));
    assert.deepEqual(published[0], event);
    assert.equal(manager.getConnectionStatus().firstEventReceived, true);
  });
});
