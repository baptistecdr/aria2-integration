import "bootstrap/dist/css/bootstrap.css";
import "bootstrap";
import React, { useId, useState } from "react";
import { Container, Tab, Tabs } from "react-bootstrap";
import { createRoot } from "react-dom/client";
import { ExtensionOptions } from "@/domain/extension-options";
import { Server } from "@/domain/server";
import ExtensionOptionsTab from "@/options/components/extension-options-tab";
import ServerOptionsTab from "@/options/components/server-options-tab";
import i18n from "@/platform/i18n";
import { ExtensionOptionsProvider, useExtensionOptions } from "@/shared/ui/extension-options-provider";

const ADD_SERVER_TAB = "add-server";
const EXTENSION_OPTIONS_TAB = "extension-options";

function Options() {
  const tabsId = useId();

  const [activeTab, setActiveTab] = useState(EXTENSION_OPTIONS_TAB);
  const { extensionOptions, updateExtensionOptions } = useExtensionOptions();

  const addServer = async () => {
    const server = Server.create();
    await updateExtensionOptions((options) => ExtensionOptions.withServer(options, server));
    setActiveTab(server.uuid);
  };

  const deleteServer = async (server: Server) => {
    const newExtensionOptions = await updateExtensionOptions((options) => ExtensionOptions.withoutServer(options, server));
    const serverKeys = Object.keys(newExtensionOptions.servers);
    const newActiveTab = serverKeys.length === 0 ? EXTENSION_OPTIONS_TAB : serverKeys[0];
    setActiveTab(newActiveTab);
  };

  const handleTabSelect = async (selectedTab: string | null) => {
    if (selectedTab === ADD_SERVER_TAB) {
      await addServer();
    } else {
      setActiveTab(selectedTab ?? EXTENSION_OPTIONS_TAB);
    }
  };

  const renderServerTabs = () =>
    Object.entries(extensionOptions.servers).map(([id, server]) => (
      <Tab key={`tab-${id}`} eventKey={id} title={server.name}>
        <ServerOptionsTab key={`server-${id}`} server={server} deleteServer={deleteServer} />
      </Tab>
    ));

  return (
    <Tabs id={tabsId} defaultActiveKey={EXTENSION_OPTIONS_TAB} activeKey={activeTab} onSelect={handleTabSelect}>
      {renderServerTabs()}
      <Tab eventKey={ADD_SERVER_TAB} title="+" />
      <Tab eventKey={EXTENSION_OPTIONS_TAB} title={i18n("extensionOptionsTitle")}>
        <ExtensionOptionsTab />
      </Tab>
    </Tabs>
  );
}

const container = document.getElementById("root");
// biome-ignore lint/style/noNonNullAssertion: We are sure the container exists
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <Container className="p-3" fluid>
      <ExtensionOptionsProvider>
        <Options />
      </ExtensionOptionsProvider>
    </Container>
  </React.StrictMode>,
);
