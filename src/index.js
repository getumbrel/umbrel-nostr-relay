import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  // Disable strict mode to prevent duplicate
  // websocket connection during development
  // https://github.com/facebook/create-react-app/issues/10387
  // <React.StrictMode>
  <App />,
  // </React.StrictMode>,
);
