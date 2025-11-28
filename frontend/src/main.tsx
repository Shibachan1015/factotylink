import React from "react";
import ReactDOM from "react-dom/client";
import { AppProvider } from "@shopify/polaris";
import "@shopify/polaris/build/esm/styles.css";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProvider i18n={{}}>
        <App />
      </AppProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);

