import * as nostr from "nostr-tools";
import fse from "fs-extra";

import { STORE } from "./constants.js";

// asyncHandlers will catch thrown errors and pass to error-handling middleware.

async function readJsonFile(filePath) {
  try {
    const data = await fse.readJson(filePath);
    return data;
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log("No store.json file created yet");
    } else {
      console.error(error.message);
    }
    return undefined;
  }
}

async function writeJsonFile(path, data) {
  await fse.writeJson(path, data, { spaces: 2 });
}

export async function deleteStoreFile() {
  try {
    await fse.remove(STORE);
    console.log(`${STORE} successfully deleted.`);
  } catch (error) {
    console.error(`Error deleting file at ${STORE}: ${error.message}`);
  }
}

export async function readIdentifierFromFile() {
  const data = await readJsonFile(STORE);

  return data;
}

export async function writeIdentifierToFile(identifier) {
  const fileContents = await readJsonFile(STORE);
  if (fileContents?.identifier !== undefined) {
    throw new Error("NIP-05 or npub address is already set");
  }

  // if starts with npub then it is a nip19
  if (identifier.startsWith("npub")) {
    try {
      nostr.nip19.decode(identifier); // throws error if invalid
    } catch {
      throw new Error("Invalid npub address");
    }
  } else {
    // if it doesn't start with npub then we assume the user has entered a nip05
    // this will also run for hex formatted pubkeys, so we include advice for that case in the error message
    const nip05 = await nostr.nip05.queryProfile(formatNip05Identifier(identifier));
    if (nip05 === null) {
      throw new Error('Invalid NIP-05. If you were trying to enter an npub address, make sure it starts with "npub"');
    }
  }

  await writeJsonFile(STORE, { identifier });
}

export async function getPublicKeyAndRelaysFromIdentifier(identifier) {
  // we seed the relays with top unpaid relays from https://stats.nostr.band/#relay_users when user enters an npub address
  const defaultNip19Relays = ["wss://relay.damus.io", "wss://relay.current.fyi", "wss://relay.snort.social", "wss://nos.lol"];
  let pubkey, relays;

  // if identifier starts with npub then return hex-formatted pubkey and default relays
  if (identifier.startsWith("npub")) {
    const nip19 = nostr.nip19.decode(identifier);
    pubkey = nip19.data;
    relays = defaultNip19Relays;
  // if identifier doesn't start with npub then it is a nip05
  // we return the hex-formatted pubkey and relays from the nip05 json
  } else {
    const formattedIdentifer = formatNip05Identifier(identifier);
    ({ pubkey, relays } = await nostr.nip05.queryProfile(formattedIdentifer));
  }

  // check if nip05 has relays. If not, we use the default relays
  relays = (relays && relays.length > 0) ? relays : defaultNip19Relays;

  return { pubkey, relays };
}


function formatNip05Identifier(identifier) {
  // nostr-tools nip05.queryProfile() already handles the case where an identifier is missing "_@",
  // but it doesn't handle the case where an identifier starts with "@" and is missing "_", so we check formatting here
  return identifier.startsWith("@") ? "_" + identifier : identifier;
}
