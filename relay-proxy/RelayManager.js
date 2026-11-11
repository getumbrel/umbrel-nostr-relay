import { relayInit } from "nostr-tools";
import "websocket-polyfill"; // polyfill for relayInit in nodejs
import pRetry from "p-retry";

import {
  readIdentifiersFromFile,
  writeIdentifiersToFile,
  validateIdentifier,
  getPublicKeyAndRelaysFromIdentifier,
} from "./helpers.js";
import { LOCAL_RELAY_URL, DISCOVERY_STATUS } from "./constants.js";

const RECONNECT_DELAY_MS = 10 * 1000;

/*
Relay discovery and connection logic is as follows:
1. Await connection to local nostr-rs-relay
2. For each account (NIP-05 or npub) the user has added, connect to relays from its NIP-05, or from a list of popular relays if only an npub is provided
  - retry connection attempts indefinitely, with exponential backoff to max timeout of 1 hour
3. Subscribe to events from all accounts on every connected relay
  - if a connected relay disconnects, reconnect and resubscribe
  - Publish events to local nostr-rs-relay
  - If a Kind 3 Contact List event is received, connect to any new relays in that list that we are not already connected to and subscribe to events from those relays
  - Periodically close any relays that are not in the most recent Kind 3 Contact List Event of any account
*/

class RelayManager {
  constructor() {
    this.resetState();
    this.establishRelayConnections();
  }

  resetState() {
    this.relays = {}; // { [url]: relay }
    this.subscriptions = {}; // { [url]: sub }
    // accounts tracks each identifier the user is syncing, keyed by the identifier as entered:
    // { [identifier]: { pubkey, latestRelays, firstEventReceived } }
    // latestRelays tracks relays from the account's most recent Kind 3 Contact List Event
    // (or default relays if no Kind 3 Contact List Events have been received): { relays: [url], timestamp }
    this.accounts = {};
    // identifiers saved in the store, including any whose relays are still being looked up
    this.savedIdentifiers = [];
    this.status = DISCOVERY_STATUS.IDLE;
    this.firstEventReceived = false;
    if (this.cleanUpRelaysInterval) {
      clearInterval(this.cleanUpRelaysInterval);
      this.cleanUpRelaysInterval = null;
    }
  }

  // hex formatted pubkeys of all accounts being synced
  get pubkeys() {
    return Object.values(this.accounts).map(account => account.pubkey);
  }

  getAccountByPubkey(pubkey) {
    return Object.values(this.accounts).find(account => account.pubkey === pubkey);
  }

  // ===============================
  // Connection Methods
  // ===============================

  async establishRelayConnections() {
    // We await successful connection to local nostr-rs-relay or else events from public relays will not be published to the local relay
    try {
      await this.connectToLocalRelay();
    } catch (error) {
      console.log(error?.message); // thrown by initializeRelay after all retry attempts have failed
      return;
    }
    // Connect to public relays discovered from each saved NIP-05 or npub
    this.discoverAndConnectToRelays();
  }

  async connectToLocalRelay() {
    const localRelay = await this.initializeRelay(LOCAL_RELAY_URL, { isPrivate: true });
    this.localRelay = localRelay;
    // nostr-tools does not reconnect by itself, so we reconnect if the local relay restarts
    localRelay.on("disconnect", () => {
      if (this.localRelay !== localRelay) return;
      console.log(`Disconnected from local relay. Reconnecting in ${RECONNECT_DELAY_MS / 1000} seconds.`);
      setTimeout(() => {
        this.connectToLocalRelay().catch(error => console.log(error?.message));
      }, RECONNECT_DELAY_MS);
    });
  }

  async initializeRelay(url, options = {}) {
    const isPrivate = options.isPrivate || false;

    const relay = relayInit(url);

    // we only add a relay to the this.relays object if it is not the user's local nostr-rs-relay
    // this is done before we return the connectionPromise so that we can check if the relay is already being initialized when new Kind 3 Contact List events are received, even if the relay is not yet connected
    if (!isPrivate) {
      this.relays[url] = relay;
    }

    relay.on("connect", () => console.log(`Connected to ${relay.url}`));

    // connectRelay returns a promise that resolves when the relay connects or rejects when the relay fails to connect
    // so that we can use p-retry to retry connection attempts with exponential backoff.
    const connectRelay = () => {
      // error objects do not seem to ever be passed to relay.connect or the on error event handler
      return new Promise((resolve, reject) => {
        relay.connect()
        .then(resolve)
        .catch(error => {
            reject(error || new Error(`Connection to ${relay.url} failed without an error object.`));
          });

        relay.on('error', error => {
          reject(error || new Error(`Error event from ${relay.url} without an error object.`));
        });
      });
    };

    // abortController is used to abort the p-retry connection attempts if the relay is removed from this.relays object while the connection attempt is in progress
    // this would occur if cleanup of old relays occured while a connection attempt was in progress
    const abortController = new AbortController();

    try {
      await pRetry(connectRelay, {
        forever: true, // retry forever or until abortController.abort is called
        maxTimeout: 1000 * 60 * 60, // max timeout between retries is 1 hour
        signal: abortController.signal,
        onFailedAttempt: error => {
          console.log (`Attempt ${error.attemptNumber} to connect to ${relay.url} failed.`);

          // we do not abort for our local relay
          if (!isPrivate && this.relays[url] !== relay) {
            abortController.abort(`Additional connection attempts to ${relay.url} aborted because relay is no longer in any account's Kind 3 Contact List.`);
          }

        },
      });
    } catch (error) {
      console.log(error.message);
      throw new Error(`All attempts to connect to ${relay.url} have failed. No further attempts will be made.`);
    }

    return relay;
  }

  async discoverAndConnectToRelays() {
    const identifiers = await readIdentifiersFromFile();
    this.savedIdentifiers = identifiers;
    // we return early if there are no identifiers set
    if (identifiers.length === 0) return;

    this.status = DISCOVERY_STATUS.DISCOVERING_RELAYS;

    for (const identifier of identifiers) {
      // We keep retrying in the background if a NIP-05 lookup fails (e.g. no internet yet), so one account cannot block the others
      pRetry(() => this.loadAccount(identifier), {
        forever: true,
        maxTimeout: 1000 * 60 * 60,
        onFailedAttempt: error => {
          console.log(`Attempt ${error.attemptNumber} to look up ${identifier} failed: ${error.message}`);
        },
      }).catch(error => console.error(error?.message));
    }

    this.startCleanUpInterval();
  }

  // Resolves an identifier's pubkey and relays, adds it to this.accounts and connects to its relays
  async loadAccount(identifier) {
    // the account may already be loaded if it was added while we were connecting to the local relay
    if (this.accounts[identifier]) return this.accounts[identifier];

    console.log(`NIP-05/NIP-19 Identifier: ${identifier}`);
    const { pubkey, relays } = await getPublicKeyAndRelaysFromIdentifier(identifier);

    // the user may have removed this account while we were looking it up
    const identifiers = await readIdentifiersFromFile();
    if (!identifiers.includes(identifier)) return null;

    const account = { pubkey, latestRelays: { relays, timestamp: 0 }, firstEventReceived: false };
    this.accounts[identifier] = account;

    // relays that are already connected need to be resubscribed so they also send this account's events
    this.resubscribeAllRelays();
    for (const url of relays) {
      this.connectAndSubscribeToRelay(url);
    }

    return account;
  }

  async connectAndSubscribeToRelay(url) {
    // We ignore all unencrypted relays (beginning with 'ws://') as a way to filter out
    // a user's local nostr-rs-relay, which could be added to their clients or NIP-05.
    // This is a provisional measure, given the vast array of URLs that might be used,
    // including Tailscale magicDNS, local network domain name, IP address, etc.
    // This approach caters to the majority of use cases.
    if (url.startsWith("ws://")) return;

    // we return early if the relay is currently being, or already is, initialized
    if (this.relays[url]) return;

    try {
      const relay = await this.initializeRelay(url);
      // the relay may have been closed while we were connecting
      if (relay && this.relays[url] === relay) {
        relay.on("disconnect", () => this.handleRelayDisconnect(url, relay));
        this.subscribeToRelay(url, relay);
      }
    } catch (error) {
      console.error(error?.message);
    }
  }

  // Public relays often drop idle connections, and nostr-tools does not reconnect by itself.
  // We replace the relay with a new connection and subscription, unless it was closed on purpose.
  handleRelayDisconnect(url, relay) {
    if (this.relays[url] !== relay) return;
    console.log(`Disconnected from ${url}. Reconnecting in ${RECONNECT_DELAY_MS / 1000} seconds.`);
    delete this.relays[url];
    delete this.subscriptions[url];
    setTimeout(() => {
      // only reconnect if an account still uses this relay and nothing else has reconnected it
      const stillWanted = Object.values(this.accounts).some(account => account.latestRelays.relays.includes(url));
      if (stillWanted) {
        this.connectAndSubscribeToRelay(url);
      }
    }, RECONNECT_DELAY_MS);
  }

  // Subscribes to events from all accounts, replacing any existing subscription on this relay
  subscribeToRelay(url, relay) {
    this.unsubscribeFromRelay(url);

    const pubkeys = this.pubkeys;
    if (pubkeys.length === 0) return;

    const sub = relay.sub([{ authors: pubkeys }]);
    sub.on('event', event => this.handleEvent(event, relay));
    this.subscriptions[url] = sub;
  }

  unsubscribeFromRelay(url) {
    const sub = this.subscriptions[url];
    if (!sub) return;
    try {
      sub.unsub();
    } catch (error) {
      console.log(`Error unsubscribing from ${url}`);
    }
    delete this.subscriptions[url];
  }

  // Called when accounts are added or removed, so every connected relay sends events for the current list of accounts.
  // Relays that are still connecting are skipped; they subscribe with the current list once connected.
  resubscribeAllRelays() {
    for (const [url, relay] of Object.entries(this.relays)) {
      if (this.subscriptions[url]) {
        this.subscribeToRelay(url, relay);
      }
    }
  }

  // ===============================
  // Event Handling Methods
  // ===============================

  handleEvent(event, relay) {
    if (this.status === DISCOVERY_STATUS.DISCOVERING_RELAYS) {
      this.status = DISCOVERY_STATUS.IDLE;
    }

    // we set firstEventReceived to true after receiving the first event from a public relay so that we can show the SyncConfirmationModal ASAP in the UI
    if (!this.firstEventReceived) {
      this.firstEventReceived = true;
    }

    const account = this.getAccountByPubkey(event.pubkey);
    if (account && !account.firstEventReceived) {
      account.firstEventReceived = true;
    }

    // If a Kind 3 Contact List event is received with a newer created_at timestamp, we connect to any new relays in that list
    // that we are not already connected to and subscribe to events from those relays
    if (event.kind === 3 && account && event.created_at > account.latestRelays.timestamp) {
      const newRelays = parseKind3Relays(event.content);
      // Many clients now publish relays in a Kind 10002 event and leave the Kind 3 content empty, in which case we keep the current relays
      if (newRelays.length > 0) {
        console.log(`A more recent Kind 3 event was received from ${relay.url} with date: ${event.created_at}`);
        account.latestRelays = { relays: newRelays, timestamp: event.created_at };
        for (const url of newRelays) {
          this.connectAndSubscribeToRelay(url);
        }
      }
    }

    try {
      this.localRelay.publish(event);
    } catch (error) {
      console.error('Error publishing to local relay:', error);
    }
  }

  // =====================
  // Relay Management Methods
  // =====================

  startCleanUpInterval() {
    if (this.cleanUpRelaysInterval) return;
    // Clean up relays that are not in the most recent Kind 3 Contact List Event of any account every hour
    this.cleanUpRelaysInterval = setInterval(() => {
      this.removeOutdatedRelays();
    }, 60 * 60 * 1000);
  }

  removeOutdatedRelays() {
    const latestRelays = new Set(
      Object.values(this.accounts).flatMap(account => account.latestRelays.relays),
    );
    const relaysToRemove = Object.keys(this.relays).filter(url => !latestRelays.has(url));
    if (relaysToRemove.length > 0) {
      console.log(`Removing outdated relays: ${relaysToRemove}`);
    }

    for (const url of relaysToRemove) {
      this.closeRelay(url);
    }
  }

  closeRelay(url) {
    const relay = this.relays[url];
    this.unsubscribeFromRelay(url);
    // removed before closing so handleRelayDisconnect does not reconnect it
    delete this.relays[url];
    try {
      relay.close();
      console.log(`${url} connection closed`);
    } catch (error) {
      console.log(`Error closing ${url}`);
    }
  }

  getConnectionStatus() {
    /*
    'web socket readyState values are:
      - 0: CONNECTING
      - 1: OPEN
      - 2: CLOSING
      - 3: CLOSED
    */

    // we map relayStates to an array of objects with url and readyState properties, while filtering out relays that may cause errors.
    const relayStates = Object.entries(this.relays).map(([key, relay]) => {
      if (relay.url && relay.status) {
        return {
          url: relay.url,
          readyState: relay.status, // this is a getter
        };
      } else {
        return null;
      }
    }).filter(state => state !== null);

    const identifiers = this.savedIdentifiers.map(identifier => ({
      identifier,
      firstEventReceived: this.accounts[identifier]?.firstEventReceived || false,
    }));

    return { identifiers, status: this.status, firstEventReceived: this.firstEventReceived, relayStates };
  }

  // ==========================
  // NIP-05/NIP-19 Identifier Management Methods
  // ==========================

  async addIdentifier(identifier) {
    identifier = (identifier || "").trim();
    if (!identifier) {
      throw new Error("Enter a NIP-05 or npub address");
    }

    const identifiers = await readIdentifiersFromFile();
    if (identifiers.includes(identifier)) {
      throw new Error(`${identifier} is already being synced`);
    }

    await validateIdentifier(identifier);

    // the same account could be entered as both its NIP-05 and its npub
    const { pubkey } = await getPublicKeyAndRelaysFromIdentifier(identifier);
    if (this.getAccountByPubkey(pubkey)) {
      throw new Error("This account is already being synced");
    }

    await writeIdentifiersToFile([...identifiers, identifier]);
    this.savedIdentifiers = [...identifiers, identifier];

    // If we are still connecting to the local relay, the account is loaded with the others once connected
    if (!this.localRelay) return;

    this.status = DISCOVERY_STATUS.DISCOVERING_RELAYS;
    await this.loadAccount(identifier);
    this.startCleanUpInterval();
  }

  async removeIdentifier(identifier) {
    const identifiers = await readIdentifiersFromFile();
    // older clients send no identifier, which removes all accounts
    const remaining = identifier ? identifiers.filter(id => id !== identifier) : [];
    await writeIdentifiersToFile(remaining);
    this.savedIdentifiers = remaining;

    if (remaining.length === 0) {
      for (const url of Object.keys(this.relays)) {
        this.closeRelay(url);
      }
      this.resetState();
      return;
    }

    delete this.accounts[identifier];
    this.firstEventReceived = Object.values(this.accounts).some(account => account.firstEventReceived);
    this.resubscribeAllRelays();
    // close relays that only the removed account was using
    this.removeOutdatedRelays();
  }
}

// Kind 3 content is a JSON object keyed by relay URL, but it may be empty or invalid
function parseKind3Relays(content) {
  try {
    const relays = JSON.parse(content);
    if (relays && typeof relays === "object" && !Array.isArray(relays)) {
      return Object.keys(relays);
    }
  } catch {}
  return [];
}

export default RelayManager;
