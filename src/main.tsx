import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GamePage } from "./pages/GamePage";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GamePage />
  </StrictMode>,
);
