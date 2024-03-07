import express from "express";
import asyncHandler from "express-async-handler";

import { getLatestEvents, getLatestKind1 } from "./widgets.js";

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
  await relayManager.removeIdentifier();

  response.json({ success: true });
}));

// TODO: consider moving widget routes to a separate file/router
router.get("/widgets/latest-events", asyncHandler(async (request, response) => {
  const widgetData = getLatestEvents();

  response.json(widgetData);
}));

router.get("/widgets/latest-kind1", asyncHandler(async (request, response) => {
  const widgetData = getLatestKind1();

  response.json(widgetData);
}
));

export const routes = router;
