import express from "express";
import asyncHandler from "express-async-handler";

const router = express.Router();

router.get('/', (request, response) => {
  response.json({message: "Pura Vida!"})
})

router.get("/connectionStatus", asyncHandler(async (request, response) => {
  const relayManager = request.app.get("relayManager");
  const status = relayManager.getConnectionStatus();

  response.send(status);
}));

router.post("/identifier", asyncHandler(async (request, response) => {
  const relayManager = request.app.get("relayManager");
  const identifier = request.body.identifier;
  await relayManager.addIdentifier(identifier);

  response.json({success: true})
}));

router.delete("/identifier", asyncHandler(async (request, response) => {
  const relayManager = request.app.get("relayManager");
  // the identifier to stop syncing; if none is given, all accounts are removed
  const identifier = request.body?.identifier;
  await relayManager.removeIdentifier(identifier);

  response.json({ success: true });
}));

export const routes = router;
