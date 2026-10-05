import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import App from "./App";
import "./styles.css";
const convex = new ConvexReactClient(import.meta.env.EXPO_PUBLIC_CONVEX_URL as string);
createRoot(document.getElementById("root")!).render(
  <ConvexProvider client={convex}><BrowserRouter><App /></BrowserRouter></ConvexProvider>
);
