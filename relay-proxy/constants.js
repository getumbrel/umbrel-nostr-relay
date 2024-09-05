export const LOCAL_RELAY_URL = (process.env.RELAY_HOST && process.env.RELAY_PORT) 
  ? `ws://${process.env.RELAY_HOST}:${process.env.RELAY_PORT}` 
  : "ws://localhost:3000";
export const STORE = process.env.RELAY_DATA_STORE || "./data/store.json";
export const DISCOVERY_STATUS = {
  DISCOVERING_RELAYS: "discovering relays",
  IDLE: "idle",
};
