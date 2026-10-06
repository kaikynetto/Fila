import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist";
import "@fontsource/faustina/300.css";
import "@fontsource/faustina/400.css";
import App from "./App";
import "./styles.css";
import "./creation.css";
import "./functional.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
