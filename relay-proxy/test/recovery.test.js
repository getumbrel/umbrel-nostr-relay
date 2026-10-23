import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { WebSocketServer } from "ws";
import { generatePrivateKey, getPublicKey, getEventHash, getSignature } from "nostr-tools";

async function waitFor(check) {
  for (let n = 0; n < 200; n++) {
    if (check()) return;
    await delay(10);
  }
  throw new Error("Timed out waiting for recovery");
}

test("local and public relay outages recover missed backups and widgets without duplicates", async t => {
  const cwd = process.cwd();
  const directory = await mkdtemp(join(tmpdir(), "nostr-recovery-test-"));
  process.chdir(directory);
  await mkdir("data");
  const local = new WebSocketServer({ host: "127.0.0.1", port: 0 });
  const remote = new WebSocketServer({ host: "127.0.0.1", port: 0 });
  await Promise.all([once(local, "listening"), once(remote, "listening")]);
  process.env.RELAY_HOST = "127.0.0.1";
  process.env.RELAY_PORT = String(local.address().port);
  const { default: RelayManager } = await import("../RelayManager.js");
  const { default: ReconnectingSocket } = await import("../ReconnectingSocket.js");
  const widgets = await import("../widgets.js");
  let manager;
  t.after(async () => {
    manager?.close();
    widgets.widgetSocket.close();
    for (const server of [local, remote]) {
      for (const socket of server.clients) socket.terminate();
      await new Promise(resolve => server.close(resolve));
    }
    process.chdir(cwd);
    await rm(directory, { recursive: true, force: true });
  });
  const saved = new Map();
  const history = [];
  let subscriptions = 0;
  local.on("connection", socket => socket.on("message", raw => {
    const [type, id, filter] = JSON.parse(raw);
    if (type === "REQ" && id === "widgets") {
      socket.widget = true;
      for (const event of saved.values()) socket.send(JSON.stringify(["EVENT", id, event]));
    } else if (type === "EVENT") {
      saved.set(id.id, id);
      for (const client of local.clients) {
        if (client.widget) client.send(JSON.stringify(["EVENT", "widgets", id]));
      }
      socket.send(JSON.stringify(["OK", id.id, true, ""]));
    }
  }));
  remote.on("connection", socket => socket.on("message", raw => {
    const [type] = JSON.parse(raw);
    if (type === "REQ") {
      subscriptions++;
      for (const event of history) socket.send(JSON.stringify(["EVENT", "backup", event]));
    }
  }));
  manager = new RelayManager({ createSocket: (url, options) => new ReconnectingSocket(
    url.startsWith("wss:") ? `ws://127.0.0.1:${remote.address().port}` : url,
    { ...options, retryDelay: 20, maxRetryDelay: 40 },
  ) });
  await waitFor(() => manager.localRelay.status === 1 && widgets.widgetSocket.status === 1);
  const secret = generatePrivateKey();
  manager.pubkey = getPublicKey(secret);
  function addEvent(content, kind = 1) {
    const event = { kind, pubkey: manager.pubkey, created_at: history.length + 1, tags: [], content };
    event.id = getEventHash(event);
    event.sig = getSignature(event, secret);
    history.push(event);
    return event;
  }
  addEvent("before outage");
  manager.connectAndSubscribeToRelay("wss://public.test");
  await waitFor(() => saved.size === 1);
  for (const socket of remote.clients) socket.terminate();
  addEvent("during public outage");
  await waitFor(() => saved.size === 2);
  const previousSubscriptions = subscriptions;
  for (const socket of local.clients) socket.terminate();
  await waitFor(() => manager.localRelay.status !== 1);
  const missed = addEvent("during local outage");
  for (const socket of remote.clients) socket.send(JSON.stringify(["EVENT", "backup", missed]));
  await waitFor(() => saved.has(missed.id) && subscriptions > previousSubscriptions);
  await waitFor(() => widgets.getLatestEvents().count === "3");
  assert.deepEqual(widgets.getLatestKind1().items.map(item => item.text), ["during local outage", "during public outage", "before outage"]);
  assert.equal(widgets.getLatestEvents().count, "3");
  // Unknown and modern kinds are stored; the new labels describe modern activity.
  const article = addEvent("An article", 30023);
  for (const socket of remote.clients) socket.send(JSON.stringify(["EVENT", "backup", article]));
  await waitFor(() => widgets.getLatestEvents().count === "4");
  assert.equal(widgets.getLatestEvents().items[0].text, "Article");
});
