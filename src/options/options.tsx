import "bootstrap/dist/css/bootstrap.css";
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Container, Tab, Tabs } from "react-bootstrap";
import i18n from "@/i18n";
import ExtensionOptions from "@/models/extension-options";
import Server from "@/models/server";
import { applyTheme } from "@/models/theme";
import ExtensionOptionsTab from "@/options/components/extension-options-tab";
import ServerOptionsTab from "@/options/components/server-options-tab";
import "bootstrap";

const container = document.getElementById("root");
const root = createRoot(container!);

const ADD_SERVER_TAB = "add-server";
const EXTENSION_OPTIONS_TAB = "extension-options";

function Options() {
  const defaultActiveTab = EXTENSION_OPTIONS_TAB;
  const [activeTab, setActiveTab] = useState(defaultActiveTab);
  const [extensionOptions, setExtensionOptions] = useState(new ExtensionOptions());

  useEffect(() => {
    ExtensionOptions.fromStorage().then((result) => {
      setExtensionOptions(result);
    });
  }, []);

  useEffect(() => {
    applyTheme(extensionOptions.theme);
  }, [extensionOptions.theme]);

  async function addServer() {
    const server = new Server();
    const newExtensionOptions = await extensionOptions.addServer(server);
    setExtensionOptions(newExtensionOptions);
    setActiveTab(server.uuid);
  }

  const deleteServer = async (server: Server) => {
    let newExtensionOptions = await extensionOptions.deleteServer(server);
    const serversKeys = Object.keys(newExtensionOptions.servers);
    let newActiveTab = EXTENSION_OPTIONS_TAB;
    if (serversKeys.length === 0) {
      newExtensionOptions = await new ExtensionOptions(
        newExtensionOptions.servers,
        "",
        false,
        extensionOptions.minFileSizeInBytes,
        newExtensionOptions.excludedProtocols,
        newExtensionOptions.excludedSites,
        newExtensionOptions.excludedFileTypes,
      ).toStorage();
    } else {
      [newActiveTab] = serversKeys;
    }
    setExtensionOptions(newExtensionOptions);
    setActiveTab(newActiveTab);
  };

  return (
    <Tabs
      id="tabs-servers-options"
      defaultActiveKey={defaultActiveTab}
      activeKey={activeTab}
      onSelect={async (selectedTab) => {
        if (selectedTab === ADD_SERVER_TAB) {
          await addServer();
        } else {
          setActiveTab(selectedTab ?? defaultActiveTab);
        }
      }}
    >
      {Object.entries(extensionOptions.servers).map(([id, server]) => (
        <Tab key={`tab-${id}`} eventKey={id} title={server.name}>
          <ServerOptionsTab
            key={`server-${id}`}
            extensionOptions={extensionOptions}
            setExtensionOptions={setExtensionOptions}
            server={server}
            deleteServer={deleteServer}
          />
        </Tab>
      ))}
      <Tab eventKey={ADD_SERVER_TAB} title="+" />
      <Tab eventKey={EXTENSION_OPTIONS_TAB} title={i18n("extensionOptionsTitle")}>
        <ExtensionOptionsTab extensionOptions={extensionOptions} setExtensionOptions={setExtensionOptions} />
      </Tab>
    </Tabs>
  );
}

root.render(
  <React.StrictMode>
    <Container className="p-3" fluid>
      <Options />
    </Container>
  </React.StrictMode>,
);
