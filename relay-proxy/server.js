import { createServer } from "node:http";
import express from "express";

import { routes } from "./routes.js";
import RelayManager from "./RelayManager.js";

const app = express();
const server = createServer(app);
const port = process.env.RELAY_PROXY_PORT || 80;

app.use(express.json());

// when this is instantiated, it connects to the user's local nostr-rs-relay and the relays discovered from Kind 3 Contact List Events
const relayManager = new RelayManager();
app.set("relayManager", relayManager);

// Middleware for logging requests
app.use((req, res, next) => {
  console.log(`Request received at ${req.method} ${req.originalUrl}`);
  next();
});

app.use("/relay-proxy", routes);

// Middleware for handling errors
app.use((error, request, response, next) => {
  console.error(error.stack);
  response.status(500).json({ error: error.message });
});

server.listen(port, () => console.log(`Nostr relay-proxy server is listening on port ${port}`));
