import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { GamePage } from "./pages/GamePage";

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <GamePage />
    </StrictMode>,
  );
}
