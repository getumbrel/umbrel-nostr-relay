import { getEventHash, validateEvent, verifySignature } from "nostr-tools";
import ReconnectingSocket from "./ReconnectingSocket.js";
import { readIdentifierFromFile, writeIdentifierToFile, deleteStoreFile, getPublicKeyAndRelaysFromIdentifier } from "./helpers.js";
import { LOCAL_RELAY_URL, DISCOVERY_STATUS } from "./constants.js";

export function normalizeRelayUrl(value) {
  try {
    const url = new URL(value);
    // Preserve the existing policy of excluding unencrypted/local relay addresses.
    if (url.protocol !== "wss:" || url.username || url.password) return null;
    url.hash = "";
    return url.toString();
  } catch { return null; }
}

function normalizeRelays(relays) {
  return [...new Set(relays.map(normalizeRelayUrl).filter(Boolean))];
}

export default class RelayManager {
  constructor({ createSocket = (url, options) => new ReconnectingSocket(url, options) } = {}) {
    this.createSocket = createSocket;
    this.generation = 0;
    this.resetState();
    this.localRelay = this.createSocket(LOCAL_RELAY_URL, {
      onOpen: () => {
        this.subscribeToLocalMetadata();
        // Fetch history again after a local outage, covering events we could not save.
        for (const url of Object.keys(this.relays)) {
          this.closeRelay(url);
          this.connectAndSubscribeToRelay(url);
        }
      },
      onMessage: message => {
        if (message[0] === "EVENT" && message[1] === "relay-metadata") {
          this.handleEvent(message[2], { local: true });
        }
      },
    });
    this.discoverAndConnectToRelays();
  }

  resetState() {
    this.relays = {};
    this.seedRelays = [];
    this.latestRelays = null;
    this.identifier = null;
    this.pubkey = null;
    this.status = DISCOVERY_STATUS.IDLE;
    this.firstEventReceived = false;
    clearInterval(this.cleanUpRelaysInterval);
    clearTimeout(this.discoveryTimer);
  }

  async discoverAndConnectToRelays() {
    const generation = ++this.generation;
    clearTimeout(this.discoveryTimer);
    clearInterval(this.cleanUpRelaysInterval);
    try {
      const identifierData = await readIdentifierFromFile();
      if (generation !== this.generation || !identifierData) return;
      this.identifier = identifierData.identifier;
      this.status = DISCOVERY_STATUS.DISCOVERING_RELAYS;
      const { pubkey, relays } = await getPublicKeyAndRelaysFromIdentifier(this.identifier);
      if (generation !== this.generation) return;
      this.pubkey = pubkey;
      this.seedRelays = normalizeRelays(relays);
      for (const url of this.seedRelays) this.connectAndSubscribeToRelay(url);
      this.subscribeToLocalMetadata();
      this.cleanUpRelaysInterval = setInterval(() => this.removeOutdatedRelays(), 60 * 60 * 1000);
    } catch (error) {
      if (generation !== this.generation) return;
      console.error("Could not discover relays:", error.message);
      this.discoveryTimer = setTimeout(() => this.discoverAndConnectToRelays(), 30000);
    }
  }

  subscribeToLocalMetadata() {
    if (this.pubkey) {
      this.localRelay.send(["REQ", "relay-metadata", { authors: [this.pubkey], kinds: [3, 10002] }]);
    }
  }

  connectAndSubscribeToRelay(value) {
    const url = normalizeRelayUrl(value);
    if (!url || this.relays[url] || !this.pubkey) return;
    const pubkey = this.pubkey;
    const generation = this.generation;
    this.relays[url] = this.createSocket(url, {
      onOpen: socket => socket.send(["REQ", "backup", { authors: [pubkey] }]),
      onMessage: message => {
        if (generation === this.generation && message[0] === "EVENT" && message[1] === "backup") {
          this.handleEvent(message[2]);
        }
      },
    });
  }

  handleEvent(event, { local = false } = {}) {
    try {
      if (!validateEvent(event) || event.pubkey !== this.pubkey || event.id !== getEventHash(event) || !verifySignature(event)) return;
    } catch { return; }
    this.updateRelayList(event);
    if (local) return;
    this.status = DISCOVERY_STATUS.IDLE;
    this.firstEventReceived = true;
    this.localRelay.send(["EVENT", event]);
  }

  updateRelayList(event) {
    if (event.kind !== 3 && event.kind !== 10002) return;
    const previous = this.latestRelays;
    // NIP-65 is authoritative once available. Legacy contact lists remain a fallback.
    if (previous?.kind === 10002 && event.kind === 3) return;
    if (previous?.kind === event.kind && (event.created_at < previous.timestamp ||
      (event.created_at === previous.timestamp && event.id >= previous.id))) return;

    let relays;
    if (event.kind === 10002) {
      // Back up the author's posts from write relays, including unmarked read/write relays.
      relays = event.tags.filter(tag => tag[0] === "r" && (tag[2] === undefined || tag[2] === "write"))
        .map(tag => tag[1]);
    } else {
      try {
        const list = JSON.parse(event.content);
        if (!list || typeof list !== "object" || Array.isArray(list)) return;
        relays = Object.keys(list).filter(url => list[url]?.write !== false);
      } catch { return; }
    }
    relays = normalizeRelays(relays);
    this.latestRelays = { relays, timestamp: event.created_at, id: event.id, kind: event.kind };
    for (const url of this.desiredRelays()) this.connectAndSubscribeToRelay(url);
  }

  desiredRelays() {
    // Keep discovery possible when an account has an empty or unusable relay list.
    return this.latestRelays?.relays.length ? this.latestRelays.relays : this.seedRelays;
  }

  removeOutdatedRelays() {
    const wanted = new Set(this.desiredRelays());
    for (const url of Object.keys(this.relays)) {
      if (!wanted.has(url)) this.closeRelay(url);
    }
  }

  closeRelay(url) {
    this.relays[url]?.close();
    delete this.relays[url];
  }

  getConnectionStatus() {
    const relayStates = Object.values(this.relays).map(relay => ({ url: relay.url, readyState: relay.status }));
    return { identifier: this.identifier, status: this.status, firstEventReceived: this.firstEventReceived, relayStates };
  }

  async addIdentifier(identifier) {
    await writeIdentifierToFile(identifier);
    await this.discoverAndConnectToRelays();
  }

  async removeIdentifier() {
    await deleteStoreFile();
    ++this.generation;
    for (const url of Object.keys(this.relays)) this.closeRelay(url);
    this.localRelay.send(["CLOSE", "relay-metadata"]);
    this.resetState();
  }

  close() {
    ++this.generation;
    clearTimeout(this.discoveryTimer);
    clearInterval(this.cleanUpRelaysInterval);
    for (const url of Object.keys(this.relays)) this.closeRelay(url);
    this.localRelay.close();
  }
}
