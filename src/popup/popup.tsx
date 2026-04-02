import React from "react";
import { createRoot } from "react-dom/client";
import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap";
import "./popup.css";
import { Container } from "react-bootstrap";
import { CurrentTabProvider } from "@/current-tab-provider";
import { ExtensionOptionsProvider } from "@/extension-options-provider";
import ServersTabs from "./components/servers-tabs";

const container = document.getElementById("root");
// biome-ignore lint/style/noNonNullAssertion: We are sure the container exists
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <Container className="p-3" fluid>
      <ExtensionOptionsProvider>
        <CurrentTabProvider>
          <ServersTabs />
        </CurrentTabProvider>
      </ExtensionOptionsProvider>
    </Container>
  </React.StrictMode>,
);
