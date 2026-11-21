import React from "react";
import { createRoot } from "react-dom/client";
import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap";
import { Container } from "react-bootstrap";
import { isOsAndroid } from "@/platform/browser-info";
import { CurrentTabProvider } from "@/shared/ui/current-tab-provider";
import { ExtensionOptionsProvider } from "@/shared/ui/extension-options-provider";
import ServersTabs from "./components/servers-tabs";

const container = document.getElementById("root");
// biome-ignore lint/style/noNonNullAssertion: We are sure the container exists
const root = createRoot(container!);

const width = (await isOsAndroid()) ? "100%" : "576px";

root.render(
  <React.StrictMode>
    <Container
      style={{
        width: `${width}`,
      }}
      className="p-3"
      fluid
    >
      <ExtensionOptionsProvider>
        <CurrentTabProvider>
          <ServersTabs />
        </CurrentTabProvider>
      </ExtensionOptionsProvider>
    </Container>
  </React.StrictMode>,
);
