import React, { useEffect, useId, useState } from "react";
import { createRoot } from "react-dom/client";
import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap";
import "./popup.css";
import { Container, Tab, Tabs } from "react-bootstrap";
import i18n from "@/i18n";
import ExtensionOptions from "@/models/extension-options";
import { applyTheme } from "@/models/theme";
import ServerTab from "@/popup/components/server-tab";

const container = document.getElementById("root");
// biome-ignore lint/style/noNonNullAssertion: We are sure the container exists
const root = createRoot(container!);

function Servers() {
  const [extensionOptions, setExtensionOptions] = useState(new ExtensionOptions());
  const [activeTab, setActiveTab] = useState("");

  const tabServersId = useId();

  useEffect(() => {
    ExtensionOptions.fromStorage().then((result) => {
      setExtensionOptions(result);
      setActiveTab(Object.keys(result.servers)[0] ?? "");
    });
  }, []);

  applyTheme(extensionOptions.theme);

  if (Object.keys(extensionOptions.servers).length === 0) {
    return (
      <div className="text-center">
        {i18n("popupNoServerFound1")} <br />
        {i18n("popupNoServerFound2")}
      </div>
    );
  }

  return (
    <Tabs id={tabServersId} defaultActiveKey="" activeKey={activeTab} onSelect={(k) => setActiveTab(k ?? "")} className="mb-3">
      {Object.entries(extensionOptions.servers).map(([id, server]) => (
        <Tab key={`tab-${id}`} eventKey={id} title={server.name}>
          <ServerTab key={`server-${id}`} setExtensionOptions={setExtensionOptions} extensionOptions={extensionOptions} server={server} />
        </Tab>
      ))}
    </Tabs>
  );
}

root.render(
  <React.StrictMode>
    <Container className="p-3" fluid>
      <Servers />
    </Container>
  </React.StrictMode>,
);
